/**
 * Redis-ийн хамгийн бага интерфейс (M6.4) + Upstash REST хэрэгжилт. `api/transfer.ts` зөвхөн `Store`-оос хамаарна —
 * тест санах ойн хуурамч Store-оор ажиллана. Файл нэр `_`-ээр эхэлсэн тул Vercel үүнийг тусдаа function болгохгүй.
 */
export interface Store {
  /** key байхгүй бол ttl секундээр хадгална (SET NX EX). Хадгалсан бол true, key аль хэдийн байвал false */
  setnx(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  /** Уншаад нэн даруй устгана (нэг удаагийн). Байхгүй бол null */
  getdel(key: string): Promise<string | null>;
  /** Тоолуурыг нэмж утгыг буцаана; анх үүсэхэд ttl тавина */
  incr(key: string, ttlSeconds: number): Promise<number>;
}

type Env = Record<string, string | undefined>;
type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** Upstash Redis (Vercel Marketplace) орчны хувьсагч: UPSTASH_REDIS_REST_URL/TOKEN эсвэл хуучин KV_REST_API_URL/TOKEN */
export function redisConfigFromEnv(env: Env): { url: string; token: string } | null {
  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

/** Upstash REST: `POST <url>` биед `["COMMAND", ...args]` → `{ result }` | `{ error }` */
export class UpstashStore implements Store {
  constructor(private readonly cfg: { url: string; token: string }, private readonly fetchImpl: FetchLike = fetch as unknown as FetchLike) {}

  private async cmd(args: (string | number)[]): Promise<unknown> {
    const res = await this.fetchImpl(this.cfg.url, { method: 'POST', headers: { Authorization: `Bearer ${this.cfg.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
    const j = (await res.json().catch(() => ({}))) as { result?: unknown; error?: string };
    if (!res.ok || j.error) throw new Error(`Redis ${String(args[0])}: ${j.error ?? res.status}`);
    return j.result;
  }

  async setnx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    return (await this.cmd(['SET', key, value, 'EX', ttlSeconds, 'NX'])) === 'OK';
  }

  async getdel(key: string): Promise<string | null> {
    const r = await this.cmd(['GETDEL', key]);
    return typeof r === 'string' ? r : null;
  }

  async incr(key: string, ttlSeconds: number): Promise<number> {
    const n = Number(await this.cmd(['INCR', key]));
    if (n === 1) await this.cmd(['EXPIRE', key, ttlSeconds]);
    return n;
  }
}
