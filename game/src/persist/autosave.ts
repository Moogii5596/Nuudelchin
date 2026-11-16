/**
 * Автомат хадгалалт (M6.2). Sim-ийн алхмын ДУНД хадгалахгүй: `dayReport`, `arrived` г.м. үйл явдал алхмын дотор гардаг тул
 * зөвхөн «хүсэлт» тэмдэглээд, `flush()`-г үндсэн давталт алхмуудын ДАРАА дуудна (тэр үед state бүтэн, `rngState` шинэ).
 * Хуудас нуугдах/хаагдахад (visibilitychange/pagehide) тэр дор нь текстийг нэг мөр гаргаж бичнэ.
 */
import { saveMeta, serialize } from '../sim/save';
import type { GameState } from '../sim/state';
import type { Sim, SimEvent } from '../sim/sim';
import { SaveStore, requestPersistence } from './idb';

export type SaveReason = 'dayEnd' | 'move' | 'map' | 'sum' | 'hidden' | 'manual';

export interface AutosaveDeps {
  store: SaveStore;
  state: () => GameState;
  slot: () => number;
  /** Амжилттай бичсэний дараа (HUD «💾 хадгаллаа») */
  onSaved?: (reason: SaveReason) => void;
  onError?: (err: unknown) => void;
  /** Тест: бодит цаг */
  now?: () => number;
  /** Хоёр автомат хадгалалтын хоорондох хамгийн бага бодит хугацаа (мс); hidden/manual үүнийг алгасна */
  minGapMs?: number;
}

export class Autosave {
  private pending: SaveReason | null = null;
  private chain: Promise<void> = Promise.resolve();
  private lastAt = -Infinity;
  private asked = false;
  /** Бичсэн, амжилтгүй болсон тоо (тест, оношлогоо) */
  saves = 0;
  failures = 0;

  constructor(private readonly d: AutosaveDeps) {}

  /** Алхмын дунд ч дуудаж болно: хадгалалтыг дараагийн `flush()`-д хойшлуулна */
  request(reason: SaveReason): void {
    this.pending = this.pending === 'hidden' || this.pending === 'manual' ? this.pending : reason;
  }

  /** Хүлээгдэж буй хүсэлт байвал хадгална. Sim-ийн алхмуудын хооронд дуудна */
  flush(): Promise<void> {
    const reason = this.pending;
    if (!reason) return this.chain;
    const now = (this.d.now ?? Date.now)();
    const forced = reason === 'hidden' || reason === 'manual';
    if (!forced && now - this.lastAt < (this.d.minGapMs ?? 4000)) return this.chain;
    this.pending = null;
    return this.saveNow(reason);
  }

  /** Тэр дор нь хадгална (хуудас хаагдах үед): state-ийг одоо текст болгож, бичилтийг дараалалд оруулна */
  saveNow(reason: SaveReason): Promise<void> {
    const state = this.d.state();
    let text: string;
    try {
      text = serialize(state);
    } catch (e) {
      this.failures++;
      this.d.onError?.(e);
      return this.chain;
    }
    const meta = saveMeta(state), slot = this.d.slot(), now = (this.d.now ?? Date.now)();
    this.lastAt = now;
    this.chain = this.chain.then(async () => {
      try {
        if (!this.asked) { this.asked = true; void requestPersistence(); }
        await this.d.store.write(slot, text, meta, now);
        this.saves++;
        this.d.onSaved?.(reason);
      } catch (e) {
        this.failures++;
        this.d.onError?.(e);
      }
    });
    return this.chain;
  }

  /** Бүх бичилт дуустал */
  idle(): Promise<void> {
    return this.chain;
  }
}

/** Sim-ийн үйл явдлыг хадгалалтын хүсэлт болгоно. Буцаах функц = салгах */
export function attachSimEvents(sim: Sim, a: Autosave): () => void {
  return sim.on((e: SimEvent) => {
    if (e.type === 'dayReport') a.request('dayEnd');                 // 20:00
    else if (e.type === 'leftToMap') a.request('map');                // газрын зураг руу гарлаа
    else if (e.type === 'arrived') a.request(e.place === 'sum' ? 'sum' : e.place === 'camp' ? 'move' : 'map');   // сумын төвд ирлээ / бууц солилоо
  });
}

/** Хуудас нуугдах/хаагдахад тэр дор хадгална. `win`-д window, `doc`-д document (тестэд хуурамч) */
export function attachPageEvents(a: Autosave, win: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>, doc: Pick<Document, 'addEventListener' | 'removeEventListener' | 'visibilityState'>): () => void {
  const hide = (): void => { void a.saveNow('hidden'); };
  const vis = (): void => { if (doc.visibilityState === 'hidden') hide(); };
  doc.addEventListener('visibilitychange', vis);
  win.addEventListener('pagehide', hide);
  return () => { doc.removeEventListener('visibilitychange', vis); win.removeEventListener('pagehide', hide); };
}
