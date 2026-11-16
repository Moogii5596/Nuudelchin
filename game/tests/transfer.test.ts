/**
 * M6.4 Шилжүүлэх код: api/transfer.ts-ийг Redis-ийг дуурайлгасан Store-оор (TTL, GETDEL, INCR), клиент persist/transfer.ts-ийг
 * API-тай шууд холбож (fetch → handler) шалгана. Бодит Upstash-гүй.
 */
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { cfg, newSim, steps } from './helpers';
import { createHandlers, LIMITS } from '../api/transfer';
import { UpstashStore, redisConfigFromEnv, type Store } from '../api/_redis';
import { CODE_ALPHABET, CODE_LENGTH, MAX_BYTES, TTL_SECONDS, formatCode, newCode, normalizeCode } from '../src/persist/transferCode';
import { TransferError, createTransfer, redeemTransfer } from '../src/persist/transfer';
import { exportBytes } from '../src/persist/file';
import { serialize } from '../src/sim/save';
import { readFileSync } from 'node:fs';

/** Санах ойн Redis: TTL (хуурамч цагтай), SET NX, GETDEL, INCR */
class MemStore implements Store {
  now = 0;
  data = new Map<string, { v: string; exp: number }>();
  private live(k: string): { v: string; exp: number } | undefined {
    const e = this.data.get(k);
    if (e && e.exp <= this.now) { this.data.delete(k); return undefined; }
    return e;
  }
  async setnx(k: string, v: string, ttl: number): Promise<boolean> {
    if (this.live(k)) return false;
    this.data.set(k, { v, exp: this.now + ttl });
    return true;
  }
  async getdel(k: string): Promise<string | null> {
    const e = this.live(k);
    this.data.delete(k);
    return e ? e.v : null;
  }
  async incr(k: string, ttl: number): Promise<number> {
    const e = this.live(k);
    const n = e ? Number(e.v) + 1 : 1;
    this.data.set(k, { v: String(n), exp: e ? e.exp : this.now + ttl });
    return n;
  }
  keys(prefix: string): string[] { return [...this.data.keys()].filter((k) => k.startsWith(prefix)); }
}

const req = (method: string, url: string, body?: Uint8Array, ip = '1.1.1.1'): Request =>
  new Request('http://localhost' + url, { method, body: body as BodyInit | undefined, headers: { 'x-forwarded-for': ip } });

async function saveBytes(seed = 1, days = 1): Promise<Uint8Array> {
  const sim = newSim(seed);
  steps(sim, days * 100);
  return exportBytes(sim.state);
}

describe('Код', () => {
  it('newCode: 8 тэмдэгт, зөвхөн цагаан толгойн тэмдэгт, normalize/format', () => {
    for (let i = 0; i < 200; i++) {
      const c = newCode();
      expect(c).toHaveLength(CODE_LENGTH);
      for (const ch of c) expect(CODE_ALPHABET).toContain(ch);
      expect(normalizeCode(formatCode(c).toLowerCase())).toBe(c);
    }
    expect(normalizeCode('k7m2 9qxa')).toBe('K7M29QXA');
    expect(normalizeCode('K7M2-9QX')).toBeNull();     // богино
    expect(normalizeCode('K7M2-9QXO')).toBeNull();    // O байхгүй
    expect(normalizeCode('')).toBeNull();
  });
});

describe('api/transfer (Redis дуурайлга)', () => {
  it('POST → код; GET → ижил байт; дахин GET → 404 (код устсан)', async () => {
    const store = new MemStore();
    const h = createHandlers({ store });
    const body = await saveBytes();
    const post = await h.POST(req('POST', '/api/transfer', body));
    expect(post.status).toBe(200);
    const { code, expiresIn } = (await post.json()) as { code: string; expiresIn: number };
    expect(expiresIn).toBe(TTL_SECONDS);
    expect(normalizeCode(code)).toBe(code);
    expect(store.keys('nuudel:t:')).toHaveLength(1);
    const get = await h.GET(req('GET', `/api/transfer?code=${formatCode(code).toLowerCase()}`));
    expect(get.status).toBe(200);
    expect(new Uint8Array(await get.arrayBuffer())).toEqual(body);
    expect(store.keys('nuudel:t:')).toHaveLength(0);          // амжилттай татсны дараа устсан
    const again = await h.GET(req('GET', `/api/transfer?code=${code}`));
    expect(again.status).toBe(404);
    expect(((await again.json()) as { error: string }).error).toBe('not_found');
  });

  it('24 цагийн дараа 404; Redis-д TTL = 24 цаг', async () => {
    const store = new MemStore();
    const h = createHandlers({ store });
    const { code } = (await (await h.POST(req('POST', '/api/transfer', await saveBytes()))).json()) as { code: string };
    expect(store.data.get(`nuudel:t:${code}`)!.exp).toBe(TTL_SECONDS);
    store.now = TTL_SECONDS + 1;
    expect((await h.GET(req('GET', `/api/transfer?code=${code}`))).status).toBe(404);
  });

  it('хэтэрсэн хэмжээ 413, gzip биш/өөр файл 400, буруу код 400', async () => {
    const h = createHandlers({ store: new MemStore() });
    expect((await h.POST(req('POST', '/api/transfer', new Uint8Array(MAX_BYTES + 1)))).status).toBe(413);
    const junk = await h.POST(req('POST', '/api/transfer', new TextEncoder().encode('hello hello hello hello hello')));
    expect(junk.status).toBe(400);
    expect(((await junk.json()) as { error: string }).error).toBe('bad_file');
    const otherGz = gzipSync(Buffer.from('{"format":"something-else","padding":"xxxxxxxxxxxxxxxxxxxx"}'));
    expect((await h.POST(req('POST', '/api/transfer', new Uint8Array(otherGz)))).status).toBe(400);
    expect((await h.GET(req('GET', '/api/transfer?code=ABC'))).status).toBe(400);
    expect((await h.GET(req('GET', '/api/transfer'))).status).toBe(400);
  });

  it('IP хязгаар: POST цаг тутамд LIMITS.postPerHour, GET таах оролдлого LIMITS.getPerHour; өөр IP-д нөлөөлөхгүй; цаг өнгөрвөл сэргэнэ', async () => {
    const store = new MemStore();
    const h = createHandlers({ store });
    const body = await saveBytes();
    for (let i = 0; i < LIMITS.postPerHour; i++) expect((await h.POST(req('POST', '/api/transfer', body))).status, `post ${i}`).toBe(200);
    const limited = await h.POST(req('POST', '/api/transfer', body));
    expect(limited.status).toBe(429);
    expect(((await limited.json()) as { error: string }).error).toBe('rate_limited');
    expect((await h.POST(req('POST', '/api/transfer', body, '2.2.2.2'))).status).toBe(200);
    for (let i = 0; i < LIMITS.getPerHour; i++) expect((await h.GET(req('GET', '/api/transfer?code=K7M29QXA'))).status).toBe(404);
    expect((await h.GET(req('GET', '/api/transfer?code=K7M29QXA'))).status).toBe(429);
    store.now = 3601;
    expect((await h.POST(req('POST', '/api/transfer', body))).status).toBe(200);
  });

  it('код давхцвал дарахгүй: дахин сонгоно', async () => {
    const store = new MemStore();
    const fixed = new Uint8Array(16).fill(5);
    let n = 0;
    const h = createHandlers({ store, random: () => (n++ === 0 ? fixed : new Uint8Array(16).fill(9)) });
    const first = (await (await h.POST(req('POST', '/api/transfer', await saveBytes(), '3.3.3.3'))).json()) as { code: string };
    n = 0;   // дараагийн POST ижил (давхцах) код санал болгоно
    const second = (await (await h.POST(req('POST', '/api/transfer', await saveBytes(2), '4.4.4.4'))).json()) as { code: string };
    expect(second.code).not.toBe(first.code);
    expect(store.keys('nuudel:t:')).toHaveLength(2);
  });

  it('Redis тохируулаагүй бол 503 not_configured (ойлгомжтой мессеж)', async () => {
    const h = createHandlers({ store: null });
    const r = await h.POST(req('POST', '/api/transfer', await saveBytes()));
    expect(r.status).toBe(503);
    const j = (await r.json()) as { error: string; message: string };
    expect(j.error).toBe('not_configured');
    expect(j.message).toMatch(/UPSTASH_REDIS_REST_URL/);
    expect((await h.GET(req('GET', '/api/transfer?code=K7M29QXA'))).status).toBe(503);
    expect(redisConfigFromEnv({})).toBeNull();
    expect(redisConfigFromEnv({ UPSTASH_REDIS_REST_URL: 'https://x.upstash.io/', UPSTASH_REDIS_REST_TOKEN: 't' })).toEqual({ url: 'https://x.upstash.io', token: 't' });
    expect(redisConfigFromEnv({ KV_REST_API_URL: 'https://y', KV_REST_API_TOKEN: 'u' })).toEqual({ url: 'https://y', token: 'u' });
  });

  it('Redis алдаа → 500 server (оролт хадгалагдаагүй)', async () => {
    const broken: Store = { setnx: async () => { throw new Error('boom'); }, getdel: async () => { throw new Error('boom'); }, incr: async () => 1 };
    const h = createHandlers({ store: broken });
    const r = await h.POST(req('POST', '/api/transfer', await saveBytes()));
    expect(r.status).toBe(500);
    expect((await h.GET(req('GET', '/api/transfer?code=K7M29QXA'))).status).toBe(500);
  });
});

describe('UpstashStore (REST командын хэлбэр)', () => {
  it('SET NX EX, GETDEL, INCR+EXPIRE командуудыг Bearer токентой илгээнэ', async () => {
    const calls: { url: string; auth: string; cmd: unknown[] }[] = [];
    const results: Record<string, unknown> = { SET: 'OK', GETDEL: 'abc', INCR: 1, EXPIRE: 1 };
    const fake = async (url: string, init: { headers: Record<string, string>; body: string }) => {
      const cmd = JSON.parse(init.body) as unknown[];
      calls.push({ url, auth: init.headers.Authorization ?? '', cmd });
      return { ok: true, status: 200, json: async () => ({ result: results[String(cmd[0])] }) };
    };
    const s = new UpstashStore({ url: 'https://r.upstash.io', token: 'TOK' }, fake as never);
    expect(await s.setnx('k', 'v', 60)).toBe(true);
    expect(await s.getdel('k')).toBe('abc');
    expect(await s.incr('c', 3600)).toBe(1);
    expect(calls.map((c) => c.cmd)).toEqual([['SET', 'k', 'v', 'EX', 60, 'NX'], ['GETDEL', 'k'], ['INCR', 'c'], ['EXPIRE', 'c', 3600]]);
    expect(calls.every((c) => c.auth === 'Bearer TOK' && c.url === 'https://r.upstash.io')).toBe(true);
    results.SET = null;
    expect(await s.setnx('k', 'v', 60)).toBe(false);
    results.INCR = 5;
    await s.incr('c', 3600);
    expect(calls.filter((c) => c.cmd[0] === 'EXPIRE')).toHaveLength(1);   // анхны INCR дээр л TTL
    const bad = new UpstashStore({ url: 'u', token: 't' }, (async () => ({ ok: false, status: 401, json: async () => ({ error: 'WRONGPASS' }) })) as never);
    await expect(bad.getdel('k')).rejects.toThrow(/WRONGPASS/);
  });
});

describe('Клиент persist/transfer.ts (API-тай шууд холбосон)', () => {
  function wired(store: Store | null = new MemStore()): typeof fetch {
    const h = createHandlers({ store });
    return (async (url: string, init?: RequestInit) => {
      const u = new URL(url, 'http://localhost');
      const rq = new Request(u, { ...init, headers: { 'x-forwarded-for': '9.9.9.9', ...((init?.headers as Record<string, string>) ?? {}) } });
      return init?.method === 'POST' ? h.POST(rq) : h.GET(rq);
    }) as typeof fetch;
  }

  it('үүсгэх → кодоор татах = анхны state; дахин татахад not_found', async () => {
    const sim = newSim(7);
    steps(sim, 400);
    const f = wired();
    const { code, display } = await createTransfer(sim.state, { fetch: f });
    expect(display).toBe(formatCode(code));
    const got = await redeemTransfer(cfg, display.toLowerCase(), { fetch: f });
    expect(JSON.stringify(got)).toBe(JSON.stringify(sim.state));
    expect(serialize(got)).toBe(serialize(sim.state));
    await expect(redeemTransfer(cfg, code, { fetch: f })).rejects.toMatchObject({ kind: 'not_found' });
  });

  it('интернетгүй: offline алдаа, fetch дуудагдахгүй', async () => {
    let called = 0;
    const f = (async () => { called++; return new Response(); }) as typeof fetch;
    const sim = newSim(1);
    await expect(createTransfer(sim.state, { fetch: f, online: false })).rejects.toMatchObject({ kind: 'offline' });
    await expect(redeemTransfer(cfg, 'K7M29QXA', { fetch: f, online: false })).rejects.toMatchObject({ kind: 'offline' });
    expect(called).toBe(0);
  });

  it('буруу код → сүлжээгүйгээр bad_code; тохируулаагүй сервер → not_configured; сүлжээний алдаа → network', async () => {
    let called = 0;
    const counting = (async () => { called++; return new Response('{}', { status: 500 }); }) as typeof fetch;
    await expect(redeemTransfer(cfg, 'xx', { fetch: counting })).rejects.toBeInstanceOf(TransferError);
    expect(called).toBe(0);
    const sim = newSim(1);
    await expect(createTransfer(sim.state, { fetch: wired(null) })).rejects.toMatchObject({ kind: 'not_configured' });
    await expect(redeemTransfer(cfg, 'K7M29QXA', { fetch: wired(null) })).rejects.toMatchObject({ kind: 'not_configured' });
    const down = (async () => { throw new TypeError('Failed to fetch'); }) as typeof fetch;
    await expect(createTransfer(sim.state, { fetch: down })).rejects.toMatchObject({ kind: 'network' });
    // API байхгүй dev сервер (404 HTML)
    const html404 = (async () => new Response('<html>', { status: 404 })) as typeof fetch;
    await expect(redeemTransfer(cfg, 'K7M29QXA', { fetch: html404 })).rejects.toMatchObject({ kind: 'not_found' });
  });

  it('хэт том хадгалалт илгээхээс өмнө татгалзана', async () => {
    const sim = newSim(1);
    sim.command({ type: 'debugAddAnimals', n: 1 });
    let called = 0;
    // MAX_BYTES-ээс том болгохын тулд тоолуураар хуурамч: хэт олон мал нэмнэ
    const big = structuredClone(sim.state);
    for (let i = 0; i < 20000; i++) big.animals.push({ ...big.animals[0]!, id: 100000 + i, x: Math.random() * 1e6, z: Math.random() * 1e6 });
    await expect(createTransfer(big, { fetch: (async () => { called++; return new Response(); }) as typeof fetch })).rejects.toMatchObject({ kind: 'too_large' });
    expect(called).toBe(0);
  }, 60_000);
});

describe('Service worker', () => {
  it('sw-template.js /api/* хүсэлтийг кэшлэхгүй (respondWith хийхгүй)', () => {
    const sw = readFileSync(new URL('../sw-template.js', import.meta.url), 'utf8');
    const iApi = sw.indexOf("pathname.startsWith('/api/')");
    const iRespond = sw.indexOf('e.respondWith');
    expect(iApi).toBeGreaterThan(0);
    expect(iApi).toBeLessThan(iRespond);
  });

  it('жирийн хадгалалт MAX_BYTES-д багтана (өдөр 3, 13 мал)', async () => {
    const sim = newSim(1);
    steps(sim, 3 * 1440);
    expect((await exportBytes(sim.state)).length).toBeLessThan(MAX_BYTES);
  }, 30_000);
});
