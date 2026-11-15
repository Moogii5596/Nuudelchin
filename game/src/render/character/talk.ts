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

/** Өнцгийг зорилт руу жигд эргүүлнэ (рад/с хурдтай харьцаа) */
export function turnToward(cur: number, target: number, rate: number, dt: number): number {
  let d = target - cur;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return cur + d * Math.min(1, rate * dt);
}
