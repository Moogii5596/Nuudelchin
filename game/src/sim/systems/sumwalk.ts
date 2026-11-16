/**
 * Сумын төвийн алхалтын мөргөлдөөн (Three.js-гүй): барилга, хашааны хана, гэрийн тойрог.
 * Тоглогч (input/controller.ts) ба гаднах NPC-ийн дүрслэл (render/npcs.ts) нэг функцээр түлхэж гаргана.
 * Нарийн navmesh биш — тойрог/AABB-ийг шахаж гаргана. Тоон утга: data/worldmap.json sum3d.walk.
 */
export interface WalkBox { x: number; z: number; hw: number; hd: number }
export interface WalkCyl { x: number; z: number; r: number }
export interface WalkSolids { boxes: WalkBox[]; cyls: WalkCyl[] }

export interface WalkConfig {
  /** Явган хүний биеийн радиус (м) */ bodyR: number;
  /** Тэрэг/машины радиус (м) */ vehicleR: number;
  /** Морьтой/тээвэртэй үеийн радиус (м) */ mountedR: number;
  /** Гаднах NPC-ийн радиус (м) */ npcR: number;
  /** Айлын хашааны хаалганы нүхний өргөн (м) */ plotGateW: number;
  /** Хашааны хананы зузаан (м) */ fenceT: number;
  /** Хөдөлгөөн хүссэн мөртлөө N сек нүүхгүй бол гацсан гэж үзнэ */ stuckSec: number;
  /** Нэг кадрт энэ зайгаас бага шилжвэл «хөдлөөгүй» (м/с) */ stuckSpeed: number;
  /** Гацсан үед түлхэх зай (м) */ unstickStep: number;
}

export interface Pushed { x: number; z: number; hit: boolean }

/** (x, z) дахь r радиустай тойргийг саадаас гаргана (хэд хэдэн давталт — булан) */
export function pushOut(s: WalkSolids, x: number, z: number, r: number): Pushed {
  let hit = false;
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (const b of s.boxes) {
      const dx = x - b.x, dz = z - b.z, ex = b.hw + r, ez = b.hd + r;
      if (Math.abs(dx) >= ex || Math.abs(dz) >= ez) continue;
      const cx = Math.max(-b.hw, Math.min(b.hw, dx)), cz = Math.max(-b.hd, Math.min(b.hd, dz));
      const ox = dx - cx, oz = dz - cz, d2 = ox * ox + oz * oz;
      if (d2 > 1e-10) {                       // гадна талаас (булан/ирмэг)
        if (d2 >= r * r) continue;
        const d = Math.sqrt(d2), k = (r - d) / d;
        x += ox * k; z += oz * k;
      } else {                                // төв нь хайрцагт — хамгийн ойрын талаар гаргана
        const px = ex - Math.abs(dx), pz = ez - Math.abs(dz);
        if (px < pz) x += (dx >= 0 ? 1 : -1) * px; else z += (dz >= 0 ? 1 : -1) * pz;
      }
      moved = hit = true;
    }
    for (const c of s.cyls) {
      const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
      if (d >= m) continue;
      if (d < 1e-6) { x += m; } else { x += (dx / d) * (m - d); z += (dz / d) * (m - d); }
      moved = hit = true;
    }
    if (!moved) break;
  }
  return { x, z, hit };
}

/** Хашааны хана — 4 талын тусдаа хайрцаг; gateSide талд хаалганы нүх (gateOff — төвөөс зөөлт). fence()-тэй ижил томьёо */
export function wallRing(out: WalkBox[], x: number, z: number, w: number, d: number, gateSide: 'n' | 's' | 'e' | 'w', gate: number, gateOff: number, t: number): void {
  const ht = t / 2;
  const side = (sx: number, sz: number, len: number, horiz: boolean, hasGate: boolean): void => {
    if (!hasGate) { out.push({ x: sx, z: sz, hw: horiz ? len / 2 : ht, hd: horiz ? ht : len / 2 }); return; }
    const a = (len - gate) / 2 + gateOff, b = (len - gate) / 2 - gateOff;
    const ca = -len / 2 + a / 2, cb = len / 2 - b / 2;
    if (horiz) { if (a > 0) out.push({ x: sx + ca, z: sz, hw: a / 2, hd: ht }); if (b > 0) out.push({ x: sx + cb, z: sz, hw: b / 2, hd: ht }); }
    else { if (a > 0) out.push({ x: sx, z: sz + ca, hw: ht, hd: a / 2 }); if (b > 0) out.push({ x: sx, z: sz + cb, hw: ht, hd: b / 2 }); }
  };
  side(x, z - d / 2, w, true, gateSide === 'n');
  side(x, z + d / 2, w, true, gateSide === 's');
  side(x - w / 2, z, d, false, gateSide === 'w');
  side(x + w / 2, z, d, false, gateSide === 'e');
}

/** Гацалт илрүүлэгч: хөдөлгөөн хүссэн мөртлөө N сек нүүхгүй бол true (контроллерын төлөв) */
export interface StuckState { t: number }
export function stuckStep(st: StuckState, wantMove: boolean, movedSpeed: number, dt: number, cfg: Pick<WalkConfig, 'stuckSec' | 'stuckSpeed'>): boolean {
  if (!wantMove || movedSpeed > cfg.stuckSpeed) { st.t = 0; return false; }
  st.t += dt;
  if (st.t < cfg.stuckSec) return false;
  st.t = 0;
  return true;
}

/** Гацсан цэгээс хамгийн ойрын чөлөөт цэг (спираль хайлт). Олдохгүй бол анхны цэгээ буцаана */
export function nearestFreeSpot(s: WalkSolids, x: number, z: number, r: number, step: number): { x: number; z: number } {
  for (let ring = 1; ring <= 8; ring++) {
    for (let k = 0; k < 8 * ring; k++) {
      const a = (k / (8 * ring)) * Math.PI * 2, px = x + Math.cos(a) * step * ring, pz = z + Math.sin(a) * step * ring;
      if (!pushOut(s, px, pz, r).hit) return { x: px, z: pz };
    }
  }
  return { x, z };
}
