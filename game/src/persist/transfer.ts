/**
 * Шилжүүлэх код — клиент (M6.4). `POST /api/transfer` → код; `GET /api/transfer?code=` → хадгалалт (код устна).
 * Сервер: `game/api/transfer.ts`. Интернетгүй бол (`navigator.onLine` false) сүлжээнд хандахгүй `offline` алдаа.
 */
import type { GameConfig } from '../sim/config';
import type { GameState } from '../sim/state';
import { exportBytes, importBytes } from './file';
import { API_PATH, MAX_BYTES, TTL_SECONDS, formatCode, normalizeCode, type TransferErrorKind } from './transferCode';

export class TransferError extends Error {
  constructor(readonly kind: TransferErrorKind, message: string) {
    super(message);
    this.name = 'TransferError';
  }
}

export interface TransferOptions {
  fetch?: typeof fetch;
  /** Тест: интернеттэй эсэх (анхдагч navigator.onLine) */
  online?: boolean;
}

const isOnline = (o: TransferOptions): boolean => o.online ?? (typeof navigator === 'undefined' || navigator.onLine !== false);
const KINDS: TransferErrorKind[] = ['offline', 'network', 'not_configured', 'rate_limited', 'too_large', 'not_found', 'bad_code', 'bad_file', 'server'];

async function failFrom(res: Response): Promise<TransferError> {
  let kind: TransferErrorKind = res.status === 404 ? 'not_found' : res.status === 429 ? 'rate_limited' : res.status === 413 ? 'too_large' : res.status === 503 ? 'not_configured' : 'server';
  let msg = '';
  try {
    const j = (await res.json()) as { error?: string; message?: string };
    if (j.error && (KINDS as string[]).includes(j.error)) kind = j.error as TransferErrorKind;
    msg = j.message ?? '';
  } catch { /* JSON биш (жишээ нь 404 хуудас — API байхгүй dev сервер) */ }
  return new TransferError(kind, msg || `HTTP ${res.status}`);
}

/** Хадгалалтыг илгээж 8 тэмдэгтийн код авна (24 цаг, нэг удаа). Код `K7M2-9QXA` хэлбэрээр */
export async function createTransfer(state: GameState, o: TransferOptions = {}): Promise<{ code: string; display: string; expiresIn: number }> {
  if (!isOnline(o)) throw new TransferError('offline', 'Интернет хэрэгтэй');
  const bytes = await exportBytes(state);
  if (bytes.length > MAX_BYTES) throw new TransferError('too_large', `Хадгалалт хэт том (${Math.round(bytes.length / 1000)} KB)`);
  let res: Response;
  try {
    res = await (o.fetch ?? fetch)(API_PATH, { method: 'POST', headers: { 'Content-Type': 'application/gzip' }, body: bytes as BodyInit });
  } catch (e) {
    throw new TransferError('network', (e as Error).message);
  }
  if (!res.ok) throw await failFrom(res);
  const j = (await res.json().catch(() => null)) as { code?: string; expiresIn?: number } | null;
  const code = j?.code && normalizeCode(j.code);
  if (!code) throw new TransferError('server', 'Серверийн хариу буруу');
  return { code, display: formatCode(code), expiresIn: j?.expiresIn ?? TTL_SECONDS };
}

/** Кодоор хадгалалтыг татна (сервер кодыг устгана). Код хэлбэр буруу бол сүлжээнд хандахгүй `bad_code` */
export async function redeemTransfer(cfg: GameConfig, input: string, o: TransferOptions = {}): Promise<GameState> {
  const code = normalizeCode(input);
  if (!code) throw new TransferError('bad_code', 'Код 8 тэмдэгт байх ёстой');
  if (!isOnline(o)) throw new TransferError('offline', 'Интернет хэрэгтэй');
  let res: Response;
  try {
    res = await (o.fetch ?? fetch)(`${API_PATH}?code=${code}`, { method: 'GET', cache: 'no-store' });
  } catch (e) {
    throw new TransferError('network', (e as Error).message);
  }
  if (!res.ok) throw await failFrom(res);
  try {
    return await importBytes(cfg, new Uint8Array(await res.arrayBuffer()));
  } catch (e) {
    throw new TransferError('bad_file', (e as Error).message.split('\n')[0] ?? '');
  }
}
