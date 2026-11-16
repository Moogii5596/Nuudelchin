/**
 * `.nuudel` файл экспорт/импорт (M6.2): sim/save.ts-ийн JSON-г gzip-ээр шахсан. Нүцгэн JSON (шахаагүй) файлыг ч уншина.
 * Хөтөч ба Node 18+-д байдаг CompressionStream/DecompressionStream ашиглана.
 */
import { deserialize, saveMeta, serialize } from '../sim/save';
import type { GameConfig } from '../sim/config';
import type { GameState } from '../sim/state';

export const FILE_EXT = '.nuudel';

async function pipe(bytes: Uint8Array, ts: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(ts as unknown as ReadableWritablePair<Uint8Array, Uint8Array>);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** state → gzip байт */
export async function exportBytes(state: GameState): Promise<Uint8Array> {
  return pipe(new TextEncoder().encode(serialize(state)), new CompressionStream('gzip'));
}

/** gzip (эсвэл нүцгэн JSON) байт → state. Эвдэрсэн бол SaveError */
export async function importBytes(cfg: GameConfig, bytes: Uint8Array): Promise<GameState> {
  const gz = bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  let raw = bytes;
  if (gz) {
    try {
      raw = await pipe(bytes, new DecompressionStream('gzip'));
    } catch (e) {
      throw new Error(`файлыг задалж чадсангүй: ${(e as Error).message}`);
    }
  }
  return deserialize(cfg, new TextDecoder().decode(raw));
}

/** Файлын нэр: nuudel-өдөр12-seed20261113.nuudel */
export function fileName(state: GameState): string {
  const m = saveMeta(state);
  return `nuudel-day${m.day}-seed${m.seed}${FILE_EXT}`;
}

/** Хөтөчөөр татуулна (M6.3 цэс дуудна) */
export async function downloadFile(state: GameState): Promise<void> {
  const blob = new Blob([(await exportBytes(state)) as BlobPart], { type: 'application/gzip' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName(state);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

/** <input type=file>-ээс уншина (M6.3 цэс дуудна) */
export async function readFile(cfg: GameConfig, file: File): Promise<GameState> {
  return importBytes(cfg, new Uint8Array(await file.arrayBuffer()));
}
