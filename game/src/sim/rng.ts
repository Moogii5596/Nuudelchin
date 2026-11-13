/**
 * Seed-тэй санамсаргүй тооны генератор (mulberry32).
 * sim/ дотор Math.random() хэрэглэхгүй: нэг seed → яг ижил тоглолт.
 * Төлөв нь нэг тоо тул GameState-д хадгалж, ачаалахад үргэлжилнэ.
 */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** Одоогийн төлөв (хадгалахад) */
  get state(): number {
    return this.s;
  }

  static fromState(state: number): Rng {
    return new Rng(state);
  }

  /** [0, 1) */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** [a, b) */
  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }

  /** [a, b] бүхэл тоо */
  int(a: number, b: number): number {
    return Math.floor(this.range(a, b + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('Rng.pick: хоосон массив');
    return arr[Math.floor(this.next() * arr.length)] as T;
  }
}
