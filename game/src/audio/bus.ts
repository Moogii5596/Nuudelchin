/**
 * Дууны суурь (T-12, D9): үйл явдлын шугам. Дуу ОРУУЛААГҮЙ — дараа нь `on(...)`-оор залгахад код өөрчлөгдөхгүй.
 * Sim-д хүрэхгүй: `audio/watch.ts` (render/main давхарга) GameState-ийн өөрчлөлтөөс emit хийнэ.
 * Сонсогч байхгүй үед emit нь нэг Map.get — зардал ≈ 0.
 */
export type AudioEvent = 'sale' | 'birth' | 'wolfHowl' | 'dogBark' | 'dusk' | 'dawn';
export type AudioPayload = { amount?: number; count?: number; id?: number } | undefined;
export type AudioListener = (payload?: AudioPayload) => void;

export class AudioBus {
  private listeners = new Map<AudioEvent, AudioListener[]>();

  /** Сонсогч залгана. Буцаах функц = салгах */
  on(event: AudioEvent, fn: AudioListener): () => void {
    const l = this.listeners.get(event);
    if (l) l.push(fn); else this.listeners.set(event, [fn]);
    return () => this.off(event, fn);
  }

  off(event: AudioEvent, fn: AudioListener): void {
    const l = this.listeners.get(event);
    if (!l) return;
    const rest = l.filter((f) => f !== fn);
    if (rest.length) this.listeners.set(event, rest); else this.listeners.delete(event);
  }

  emit(event: AudioEvent, payload?: AudioPayload): void {
    const l = this.listeners.get(event);
    if (!l) return;
    for (const fn of l.slice()) {
      try { fn(payload); } catch (e) { console.error('[audio]', event, e); }   // нэг сонсогчийн алдаа бусдыг зогсоохгүй
    }
  }

  get hasListeners(): boolean {
    return this.listeners.size > 0;
  }
}

/** Нэгдсэн bus (main, туршилт) */
export const audio = new AudioBus();
export const emit = (event: AudioEvent, payload?: AudioPayload): void => audio.emit(event, payload);
export const on = (event: AudioEvent, fn: AudioListener): (() => void) => audio.on(event, fn);
