/**
 * Шилжүүлэх кодын нийтлэг хэсэг (M6.4): клиент (persist/transfer.ts) ба сервер (api/transfer.ts) хоёуланд. DOM, Node-гүй.
 * Код = 8 тэмдэгт, төөрөгдөм тэмдэгтгүй (0/O, 1/I/L, U байхгүй): `K7M2-9QXA`. ≈ 30⁸ = 6.5·10¹¹ боломж, 24 цагийн TTL, нэг удаагийн.
 */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';   // 30 тэмдэгт
export const CODE_LENGTH = 8;
/** Код хүчинтэй хугацаа (сек) */
export const TTL_SECONDS = 24 * 3600;
/** Илгээх файлын дээд хэмжээ (gzip .nuudel, байт). Redis-д base64 (×4/3) болж хадгалагдах тул Upstash-ийн 1 MB хүсэлтийн хязгаарт багтахаар */
export const MAX_BYTES = 700_000;
export const API_PATH = '/api/transfer';

/** Санамсаргүй код (crypto.getRandomValues; rejection sampling — тэгш хуваарилалт) */
export function newCode(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const base = CODE_ALPHABET.length, limit = 256 - (256 % base);
  let out = '';
  while (out.length < CODE_LENGTH) {
    for (const b of random(CODE_LENGTH * 2)) {
      if (b < limit && out.length < CODE_LENGTH) out += CODE_ALPHABET[b % base];
    }
  }
  return out;
}

/** Хэрэглэгчийн оруулсан текстийг (жижиг үсэг, зай, зураас) каноник 8 тэмдэгт болгоно. Буруу бол null */
export function normalizeCode(input: string): string | null {
  const s = input.toUpperCase().replace(/[\s\-_.]/g, '');
  if (s.length !== CODE_LENGTH) return null;
  for (const ch of s) if (!CODE_ALPHABET.includes(ch)) return null;
  return s;
}

/** Оруулах талбар бичих явцад: том үсэг, буруу тэмдэгтийг хасна, 8 хүртэл, 4-ийн дараа `-` автоматаар (K7M2-9QXA) */
export function formatCodeInput(input: string): string {
  let s = '';
  for (const ch of input.toUpperCase()) if (CODE_ALPHABET.includes(ch) && s.length < CODE_LENGTH) s += ch;
  return s.length > 4 ? `${s.slice(0, 4)}-${s.slice(4)}` : s;
}

/** Харуулах хэлбэр: K7M2-9QXA */
export function formatCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export type TransferErrorKind = 'offline' | 'network' | 'not_configured' | 'rate_limited' | 'too_large' | 'not_found' | 'bad_code' | 'bad_file' | 'server';
