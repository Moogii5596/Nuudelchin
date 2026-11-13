/**
 * Чоно (M2): бууц бүрийн 3 үүр, нутагтаа тэнэнэ, малчны «Чоно үргээх» (Q) командаар үүр лүүгээ зугтана.
 * Мал руу дайрах, хамгаалалтын бүс нь M4-т (mvp-spec.md §8, prototype-rules.md §6).
 *
 * Чонын хөдөлгөөн өөрийн seed-тэй генератортой (state.wolves.rngState) тул
 * бэлчээрлэлт, төллөлтийн санамсаргүй дарааллыг өөрчлөхгүй (тэнцвэрийн дүн хэвээр).
 */
import type { GameConfig } from '../config';
import { Rng } from '../rng';
import type { GameState } from '../state';
import { waterDistance } from '../terrain';
import { realSecondsPerMinute } from '../clock';

export interface Den {
  x: number;
  z: number;
  r: number;             // чонын нутгийн радиус
}

export interface Wolf {
  id: number;
  den: number;
  x: number;
  z: number;
  tx: number;
  tz: number;
  heading: number;
  mode: 'roam' | 'flee';
  scared: number;        // үлдсэн айдас (тоглоомын минут)
}

export interface WolfState {
  campId: string;
  rngState: number;
  dens: Den[];
  list: Wolf[];
}

/** seed ба бууцны нэрээс тогтмол тоо: нэг бууцны үүр үргэлж нэг газар байна */
function campSeed(seed: number, campId: string): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (let i = 0; i < campId.length; i++) h = Math.imul(h ^ campId.charCodeAt(i), 16777619) >>> 0;
  return h;
}

export function spawnWolves(cfg: GameConfig, seed: number, campId: string): WolfState {
  const w = cfg.wolves;
  const camp = cfg.camps.camps[campId];
  const rng = new Rng(campSeed(seed, campId));
  const dens: Den[] = [];
  for (let tries = 0; dens.length < w.densPerCamp && tries < 400; tries++) {
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(w.denDistance[0]!, w.denDistance[1]!);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (camp && waterDistance(camp.waterShape, x, z) < 16) continue;
    if (dens.some((d) => Math.hypot(d.x - x, d.z - z) < 80)) continue;
    dens.push({ x, z, r: rng.range(w.territoryRadius[0]!, w.territoryRadius[1]!) });
  }
  const list: Wolf[] = [];
  dens.forEach((d, i) => {
    const n = rng.int(w.wolvesPerDen[0]!, w.wolvesPerDen[1]!);
    for (let k = 0; k < n; k++) {
      const x = d.x + rng.range(-3, 3), z = d.z + rng.range(-3, 3);
      list.push({ id: list.length + 1, den: i, x, z, tx: x, tz: z, heading: rng.range(0, Math.PI * 2), mode: 'roam', scared: 0 });
    }
  });
  return { campId, rngState: rng.state, dens, list };
}

function moveToward(o: Wolf, speed: number): boolean {
  const dx = o.tx - o.x, dz = o.tz - o.z;
  const d = Math.hypot(dx, dz);
  if (d <= speed) {
    o.x = o.tx;
    o.z = o.tz;
    return true;
  }
  o.x += (dx / d) * speed;
  o.z += (dz / d) * speed;
  o.heading = Math.atan2(dx, dz);
  return false;
}

/** Нэг тоглоомын минут */
export function wolvesStep(cfg: GameConfig, state: GameState): void {
  const ws = state.wolves;
  if (!ws.list.length) return;
  const w = cfg.wolves;
  const rng = Rng.fromState(ws.rngState);
  for (const o of ws.list) {
    const den = ws.dens[o.den];
    if (!den) continue;
    if (o.scared > 0) o.scared -= 1;
    if (o.mode === 'flee') {
      o.tx = den.x;
      o.tz = den.z;
      if (moveToward(o, w.speed.flee)) o.mode = 'roam';
      continue;
    }
    if ((state.step + o.id * 5) % w.roamEverySteps === 0) {
      const a = rng.range(0, Math.PI * 2), r = rng.range(0, den.r * 0.8);
      o.tx = den.x + Math.cos(a) * r;
      o.tz = den.z + Math.sin(a) * r;
    }
    moveToward(o, w.speed.roam);
  }
  ws.rngState = rng.state;
}

/** «Чоно үргээх»: малчны ойрын чоно айж үүр лүүгээ гүйнэ. Үргээсэн чонын тоо */
export function scareWolves(cfg: GameConfig, state: GameState): number {
  const p = state.player;
  const R = p.mounted ? cfg.wolves.scareRadius.mounted : cfg.wolves.scareRadius.onFoot;
  const minutes = cfg.wolves.scaredSeconds / realSecondsPerMinute(cfg.time);
  let n = 0;
  for (const o of state.wolves.list) {
    if (Math.hypot(o.x - p.x, o.z - p.z) > R) continue;
    o.mode = 'flee';
    o.scared = minutes;
    n++;
  }
  return n;
}
