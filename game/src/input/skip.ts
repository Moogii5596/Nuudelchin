/**
 * Цаг алгасах (⏭ «Орой болтол» / «Маргааш өглөө»). Цагийг үсрүүлэхгүй: симуляцийг жинхэнээр нь хурдан гүйлгэнэ —
 * мал хотондоо орох, сүү/ноос үлдэх, чоно бүгд энгийн алхмаар тооцогдоно. Three.js, DOM-гүй (тестлэгдэнэ).
 * Автомат зогсолт: чоно халдах/дөхөх, шөнө мал хамгаалалтын бүсээс гарах, жолооч/туслахын мэдэгдэл, өөр газар хүрэх.
 * Тоо: data/time.json → skip.
 */
import type { GameConfig } from '../sim/config';
import type { Sim, SimEvent } from '../sim/sim';
import type { TimeState } from '../sim/clock';
import { isNight } from '../sim/clock';
import { huntingWolves, isProtected, protectionZones } from '../sim/systems/wolves';

export type SkipTarget = 'evening' | 'morning';
/** Зогссон шалтгаан: done = зорилтот цагт хүрсэн, user = «Зогсоох» дарсан, бусад нь автомат зогсолт */
export type SkipStop = 'done' | 'user' | 'wolf' | 'zone' | 'driver' | 'helper' | 'arrived';

export interface SkipGoal {
  day: number;
  minute: number;
}

/** Зорилтот цаг; орой аль хэдийн болсон бол null (товч идэвхгүй) */
export function skipGoal(cfg: GameConfig, time: TimeState, target: SkipTarget): SkipGoal | null {
  const k = cfg.time.skip;
  if (target === 'evening') return time.minute < k.eveningMinute ? { day: time.day, minute: k.eveningMinute } : null;
  return { day: time.day + 1, minute: k.morningMinute };   // өдөр 06:00-д солигдоно → «маргааш өглөө» үргэлж дараагийн өдрийн дугаар
}

const reached = (t: TimeState, g: SkipGoal): boolean => t.day > g.day || (t.day === g.day && t.minute >= g.minute);

export class SkipRun {
  readonly goal: SkipGoal;
  /** null = үргэлжилж байна */
  stop: SkipStop | null = null;
  private off: () => void;
  /** Хот/гэрийн (хөдөлдөггүй) бүсэд хоноглож буй малын id */
  private penned = new Set<number>();
  private zoneT = 0;

  constructor(private sim: Sim, readonly target: SkipTarget) {
    const g = skipGoal(sim.cfg, sim.state.time, target);
    this.goal = g ?? { day: sim.state.time.day, minute: sim.state.time.minute };
    this.off = sim.on((e) => this.onEvent(e));
    this.checkZones();
    if (huntingWolves(sim.state).length) this.stop = 'wolf';
    else if (!g) this.stop = 'done';
  }

  private onEvent(e: SimEvent): void {
    if (this.stop) return;
    if (e.type === 'wolfHunt' || e.type === 'wolfKill' || e.type === 'wolfRaid' || e.type === 'dogFight') this.stop = 'wolf';
    else if (e.type === 'helperTrip') this.stop = 'driver';
    else if (e.type === 'helperQuit' || e.type === 'helperWarn' || e.type === 'otorLoss') this.stop = 'helper';
    else if (e.type === 'arrived' || e.type === 'arriveCamp') this.stop = 'arrived';
  }

  /**
   * Шөнө хот/гэрийн бүсэд байсан мал ямар ч хамгаалалтгүй газар гарсан уу. Нохой, азарга, туслахын бүс хөдөлдөг тул
   * «дотор байсан»-ыг зөвхөн хөдөлдөггүй бүсээр (хашаа, хэвтэр, гэр) тооцно — эс бөгөөс нохой холдоход л зогсоно.
   */
  private checkZones(): boolean {
    const { cfg, state } = this.sim;
    const zones = protectionZones(cfg, state);
    const fixed = zones.filter((z) => z.kind === 'pen' || z.kind === 'yard' || z.kind === 'home');
    const night = isNight(state.time, cfg.time);
    let left = false;
    const now = new Set<number>();
    for (const a of state.animals) {
      if (a.riding) continue;
      if (isProtected(fixed, a.x, a.z)) now.add(a.id);
      else if (night && this.penned.has(a.id) && !isProtected(zones, a.x, a.z)) left = true;
    }
    this.penned = now;
    return left;
  }

  /** Нэг алхам (1 тоглоомын минут). false = зогссон — цааш алхахгүй */
  step(): boolean {
    if (this.stop) return false;
    const { cfg, state } = this.sim;
    this.sim.step();
    if (this.stop) return false;
    if (huntingWolves(state).length) this.stop = 'wolf';
    else if (reached(state.time, this.goal)) this.stop = 'done';
    else if (++this.zoneT >= cfg.time.skip.zoneCheckMinutes) {
      this.zoneT = 0;
      if (this.checkZones()) this.stop = 'zone';
    }
    return !this.stop;
  }

  /** «Зогсоох» товч */
  cancel(): void {
    if (!this.stop) this.stop = 'user';
  }

  dispose(): void {
    this.off();
  }
}
