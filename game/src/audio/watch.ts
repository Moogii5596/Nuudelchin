/**
 * GameState-ийн өөрчлөлтөөс дууны үйл явдал гаргана (render/main давхарга; sim/-д хүрэхгүй). Кадр бүр `watch(state)` дуудна.
 *  sale — өнөөдрийн орлогын нийлбэр нэмэгдсэн · birth — өнөөдрийн төл нэмэгдсэн · wolfHowl — ан хийж буй чоно нэмэгдсэн
 *  dogBark — нохой хуцаж эхэлсэн · dusk/dawn — шөнө эхэлсэн / өглөө болсон (цагийн фаз).
 * Сонсогч байхгүй бол юу ч тооцохгүй.
 */
import type { GameState } from '../sim/state';
import type { AudioBus } from './bus';

interface Snap {
  income: number;
  births: number;
  day: number;
  hunters: number;
  barking: Set<number>;
  night: boolean | null;
}

const sumIncome = (s: GameState): number => {
  let t = 0;
  // Зээл, түрээс борлуулалт биш — «sale» дуу гаргахгүй
  for (const [k, v] of Object.entries(s.today.income)) if (k !== 'loan' && k !== 'rent') t += v ?? 0;
  return t;
};

/** Цэвэр: өмнөх болон одоогийн агшнаас үйл явдлын жагсаалт */
export function diffEvents(prev: Snap | null, cur: Snap): { event: Parameters<AudioBus['emit']>[0]; payload?: { amount?: number; count?: number; id?: number } }[] {
  const out: ReturnType<typeof diffEvents> = [];
  if (!prev) return out;
  const newDay = cur.day !== prev.day;
  const dInc = cur.income - (newDay ? 0 : prev.income);
  if (dInc > 0) out.push({ event: 'sale', payload: { amount: dInc } });
  const dB = cur.births - (newDay ? 0 : prev.births);
  if (dB > 0) out.push({ event: 'birth', payload: { count: dB } });
  if (cur.hunters > prev.hunters) out.push({ event: 'wolfHowl', payload: { count: cur.hunters } });
  for (const id of cur.barking) if (!prev.barking.has(id)) { out.push({ event: 'dogBark', payload: { id } }); break; }
  if (prev.night !== null && cur.night !== null && cur.night !== prev.night) out.push({ event: cur.night ? 'dusk' : 'dawn' });
  return out;
}

export function snapshot(s: GameState, nightStartMinute: number, dayStartMinute: number): Snap {
  const barking = new Set<number>();
  for (const d of s.dogs ?? []) if (d.barkT > 0) barking.add(d.id);
  const m = s.time.minute;
  return {
    income: sumIncome(s),
    births: s.today.births,
    day: s.time.day,
    hunters: s.wolves.list.filter((w) => w.mode === 'hunt').length,
    barking,
    night: m >= nightStartMinute || m < dayStartMinute,
  };
}

export class AudioWatcher {
  private prev: Snap | null = null;
  constructor(private readonly bus: AudioBus, private readonly nightStart: number, private readonly dayStart: number) {}

  watch(s: GameState): void {
    if (!this.bus.hasListeners) { this.prev = null; return; }
    const cur = snapshot(s, this.nightStart, this.dayStart);
    for (const e of diffEvents(this.prev, cur)) this.bus.emit(e.event, e.payload);
    this.prev = cur;
  }
}
