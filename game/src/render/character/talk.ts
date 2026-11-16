/**
 * Ярилцлага, NPC-ийн сэтгэл хөдлөл (V4.5 R7, docs/character-design.md §4.5): render талын зуучлагч — sim, scene.ts-д хүрэхгүй.
 * `sumcenter.ts` (хаалга, ойрын оршин суугч, мөнгөний өөрчлөлт) бичнэ; тоглогчийн `CharactersView` уншина.
 * Тоо хэмжээ → data/characters.json `talk`.
 */
import type { HerderEmotion } from '../style';
import { characters, type EmotionSeq, type TalkEventName } from './spec';

export interface TalkBus {
  /** ярилцаж буй хүний (эсвэл хаалганы) байрлал; null — ярилцлагагүй */
  partner: { x: number; z: number } | null;
  /** сүүлийн үйл явдал ба дугаар (дугаар өсвөл шинэ үйл явдал) */
  event: TalkEventName | null;
  seq: number;
}
export const talkBus: TalkBus = { partner: null, event: null, seq: 0 };

export function postTalkEvent(e: TalkEventName): void {
  talkBus.event = e;
  talkBus.seq++;
}

/** Сэтгэл хөдлөлийн дараалал: play(seq) — эхлүүлэх, step(dt) — одоогийн сэтгэл хөдлөл */
export class EmotionQueue {
  private q: EmotionSeq = [];
  play(seq: EmotionSeq): void { this.q = seq.map(([e, s]) => [e, s]); }
  playEvent(e: TalkEventName): void { this.play(characters.talk.events[e]); }
  get busy(): boolean { return this.q.length > 0; }
  step(dt: number, idle: HerderEmotion = 'neutral'): HerderEmotion {
    const head = this.q[0];
    if (!head) return idle;
    head[1] -= dt;
    if (head[1] <= 0) this.q.shift();
    return head[0];
  }
}

/**
 * Тоглогчийн жигдрүүлсэн хурд (EMA, talk.speedRate): кадр бүрийн шуугианаар «зогсож байна» босго орчим анивчихгүй.
 * Сумын гадна (sumcenter.ts) болон барилга дотор (scene.ts → NpcView.updateIndoor) нэг механизм. still() — hysteresis: ярилцаж
 * байгаа үед босго talk.exitScale дахин томорно.
 */
export class SpeedSmoother {
  private prev: { x: number; z: number } | null = null;
  speed = 0;
  /** Шинэ байрлал; dt <= 0 бол хурд өөрчлөгдөхгүй. Жигдрүүлсэн хурдыг буцаана */
  step(x: number, z: number, dt: number): number {
    const raw = this.prev && dt > 0 ? Math.min(9, Math.hypot(x - this.prev.x, z - this.prev.z) / dt) : 0;
    this.speed += (raw - this.speed) * Math.min(1, dt * characters.talk.speedRate);
    this.prev = { x, z };
    return this.speed;
  }
  /** Орчин солигдоход (гадна ↔ дотор) өмнөх байрлалыг март — үсрэлт хурд болохгүй */
  reset(): void { this.prev = null; this.speed = 0; }
  still(talking: boolean): boolean { return this.speed < characters.talk.stillSpeed * (talking ? characters.talk.exitScale : 1); }
}

/** Өнцгийг зорилт руу жигд эргүүлнэ (рад/с хурдтай харьцаа) */
export function turnToward(cur: number, target: number, rate: number, dt: number): number {
  let d = target - cur;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return cur + d * Math.min(1, rate * dt);
}
