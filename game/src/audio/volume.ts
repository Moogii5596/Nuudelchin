/**
 * Дууны түвшин (⚙ Settings → Sound): 0–100, төхөөрөмжид хадгалагдана (localStorage). Анхдагч — data/audio.json.
 * MVP-д дуу оруулаагүй (audio/bus.ts): дуу залгах код `getVolume()`-ийг уншиж, `onVolume()`-оор өөрчлөлтийг сонсоно.
 */
import audioJson from '../../../data/audio.json';

export const VOLUME_KEY = 'nuudel.volume';
export const VOLUME_STEP: number = audioJson.step;

/** Цэвэр: хадгалсан текст → 0–100 бүхэл; буруу/хоосон бол анхдагч */
export function parseVolume(stored: string | null, fallback: number = audioJson.defaultVolume): number {
  if (stored === null || stored.trim() === '') return fallback;
  const v = Number(stored);
  return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : fallback;
}

let volume: number | null = null;
const listeners: ((v: number) => void)[] = [];

export function getVolume(): number {
  if (volume === null) {
    let stored: string | null = null;
    try { stored = typeof localStorage !== 'undefined' ? localStorage.getItem(VOLUME_KEY) : null; } catch { /* хадгалалт хаалттай */ }
    volume = parseVolume(stored);
  }
  return volume;
}

export function setVolume(v: number): void {
  volume = parseVolume(String(v));
  try { localStorage.setItem(VOLUME_KEY, String(volume)); } catch { /* энэ удаад л үйлчилнэ */ }
  for (const f of listeners.slice()) f(volume);
}

/** Түвшин өөрчлөгдөхөд дуудна. Буцаах функц = салгах */
export function onVolume(f: (v: number) => void): () => void {
  listeners.push(f);
  return () => { const i = listeners.indexOf(f); if (i >= 0) listeners.splice(i, 1); };
}
