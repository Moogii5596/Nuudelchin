/**
 * Төхөөрөмж хоорондын шилжүүлэх код (M6.4). Vercel Function (Node), Web Standard handler.
 *
 *   POST /api/transfer   body = gzip .nuudel (≤ MAX_BYTES)  → 200 { code, expiresIn }
 *   GET  /api/transfer?code=K7M2-9QXA                       → 200 gzip байт (КОД УСТНА — нэг удаа), 404 { error: 'not_found' }
 *
 * Алдаа бүгд JSON `{ error: <төрөл>, message }` (төрөл нь persist/transferCode.ts → TransferErrorKind): not_configured (503),
 * rate_limited (429), too_large (413), bad_file (400), bad_code (400), not_found (404), server (500).
 * Redis: Vercel → Storage → Upstash Redis → env `UPSTASH_REDIS_REST_URL`/`_TOKEN` (эсвэл `KV_REST_API_URL`/`_TOKEN`).
 * Хадгалалт: base64 тэмдэгт мөр, TTL 24 цаг. Redis-д хэрэглэгчийн IP хадгалахгүй — тоолуурын түлхүүрт IP-ийн хэш.
 */
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { API_PATH, MAX_BYTES, TTL_SECONDS, newCode, normalizeCode, type TransferErrorKind } from '../src/persist/transferCode';
import { UpstashStore, redisConfigFromEnv, type Store } from './_redis';

export interface Limits {
  /** IP тутамд цаг тутамд илгээх (POST) дээд тоо */
  postPerHour: number;
  /** IP тутамд цаг тутамд кодоор татах оролдлогын (GET) дээд тоо — кодыг таах халдлагаас */
  getPerHour: number;
}
export const LIMITS: Limits = { postPerHour: 10, getPerHour: 30 };

export interface Deps {
  /** null = Redis тохируулаагүй */
  store: Store | null;
  limits?: Limits;
  random?: (n: number) => Uint8Array;
}

const MESSAGES: Record<string, string> = {
  not_configured: 'Шилжүүлэх үйлчилгээ тохируулагдаагүй байна (Upstash Redis холбогдоогүй — UPSTASH_REDIS_REST_URL/TOKEN). Файлаар шилжүүлнэ үү.',
  rate_limited: 'Хэт олон оролдлого. Нэг цагийн дараа дахин оролдоно уу.',
  too_large: `Хадгалалт хэт том (${Math.round(MAX_BYTES / 1000)} KB-аас бага байх ёстой). Файлаар шилжүүлнэ үү.`,
  bad_file: 'Файл буруу: gzip хэлбэртэй Нүүдэлчин хадгалалт биш байна.',
  bad_code: 'Код буруу: 8 тэмдэгт (жишээ K7M2-9QXA) байх ёстой.',
  not_found: 'Код олдсонгүй: хугацаа дууссан (24 цаг), аль хэдийн ашигласан, эсвэл буруу байна.',
  server: 'Серверийн алдаа. Дахин оролдоно уу.',
};

const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const fail = (status: number, error: TransferErrorKind): Response => json(status, { error, message: MESSAGES[error] });

function clientKey(req: Request): string {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  return createHash('sha256').update(ip).digest('hex').slice(0, 24);   // түүхий IP-г Redis-д бичихгүй
}

/** Хадгалалтын gzip бүрэн, ЗӨВ ТӨРЛИЙН файл эсэх (zip bomb-оос 16 MB-аар хамгаална) */
function looksLikeSave(bytes: Uint8Array): boolean {
  if (bytes.length < 20 || bytes[0] !== 0x1f || bytes[1] !== 0x8b) return false;
  try {
    const text = gunzipSync(bytes, { maxOutputLength: 16 * 1024 * 1024 }).subarray(0, 64).toString('utf8');
    return text.startsWith('{"format":"nuudelchin-save"');
  } catch {
    return false;
  }
}

export function createHandlers(deps: Deps): { GET: (req: Request) => Promise<Response>; POST: (req: Request) => Promise<Response> } {
  const limits = deps.limits ?? LIMITS;

  const POST = async (req: Request): Promise<Response> => {
    const store = deps.store;
    if (!store) return fail(503, 'not_configured');
    try {
      const declared = Number(req.headers.get('content-length') ?? 0);
      if (declared > MAX_BYTES) return fail(413, 'too_large');
      const body = new Uint8Array(await req.arrayBuffer());
      if (body.length > MAX_BYTES) return fail(413, 'too_large');
      if (!looksLikeSave(body)) return fail(400, 'bad_file');
      if ((await store.incr(`nuudel:rl:post:${clientKey(req)}`, 3600)) > limits.postPerHour) return fail(429, 'rate_limited');
      const b64 = Buffer.from(body).toString('base64');
      for (let tries = 0; tries < 5; tries++) {
        const code = newCode(deps.random);
        // Давхцал ховор (6·10¹¹), гэхдээ өөр хүний кодыг дарахгүйн тулд NX-ээр (байхгүй бол л) бичнэ
        if (await store.setnx(`nuudel:t:${code}`, b64, TTL_SECONDS)) return json(200, { code, expiresIn: TTL_SECONDS });
      }
      return fail(500, 'server');
    } catch (e) {
      console.error('transfer POST', e);
      return fail(500, 'server');
    }
  };

  const GET = async (req: Request): Promise<Response> => {
    const store = deps.store;
    if (!store) return fail(503, 'not_configured');
    try {
      const code = normalizeCode(new URL(req.url, 'http://x').searchParams.get('code') ?? '');
      if (!code) return fail(400, 'bad_code');
      if ((await store.incr(`nuudel:rl:get:${clientKey(req)}`, 3600)) > limits.getPerHour) return fail(429, 'rate_limited');
      const b64 = await store.getdel(`nuudel:t:${code}`);   // татсан даруйдаа устна
      if (b64 === null) return fail(404, 'not_found');
      return new Response(Buffer.from(b64, 'base64'), { status: 200, headers: { 'Content-Type': 'application/gzip', 'Cache-Control': 'no-store' } });
    } catch (e) {
      console.error('transfer GET', e);
      return fail(500, 'server');
    }
  };

  return { GET, POST };
}

// Vercel: бодит Redis-ээр. Env байхгүй бол store = null → 503 not_configured (ойлгомжтой алдаа)
const cfgEnv = redisConfigFromEnv(process.env);
const live = createHandlers({ store: cfgEnv ? new UpstashStore(cfgEnv) : null });
export const GET = live.GET;
export const POST = live.POST;
export { API_PATH };
