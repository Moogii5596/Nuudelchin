/**
 * Сумын төвийн алхалтын мөргөлдөөн (Three.js-гүй): барилга, хашааны хана, гэрийн тойрог.
 * Тоглогч (input/controller.ts) ба гаднах NPC-ийн дүрслэл (render/npcs.ts) нэг функцээр түлхэж гаргана.
 * Нарийн navmesh биш — тойрог/AABB-ийг шахаж гаргана. Тоон утга: data/worldmap.json sum3d.walk.
 */
export interface WalkBox { x: number; z: number; hw: number; hd: number }
export interface WalkCyl { x: number; z: number; r: number }
/** Хаалгатай хашаа (wallRing-ийн бүртгэл): NPC хаалгаар орж гарахад зам заана. off — хаалганы нүхийн төвөөс зөөлт, gw — нүхний өргөн */
export interface WalkYard { x: number; z: number; w: number; d: number; gate: 'n' | 's' | 'e' | 'w'; off: number; gw: number }
export interface WalkSolids { boxes: WalkBox[]; cyls: WalkCyl[]; yards?: WalkYard[] }

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
  /** Ханыг налуу шахахад ханын дагуух хурд (хүссэн хурдны хувь) энэ хэмжээнээс буурахгүй (0–1) */ slideMin: number;
  /** slideMin бүрэн үйлчлэх налуугийн босго: ханын дагуух бүрэлдэхүүн / хурд (0–1); бага бол шууд шахалтад удаан */ slideAngle: number;
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

/**
 * Хөдөлгөөн: (px, pz) → (x, z) хүссэн байрлал. pushOut нь зөвхөн хананд ЦОГЦ бүрэлдэхүүнийг арилгадаг тул налуу шахахад
 * ханын дагуух хурд нь cos(өнцөг)-өөр буурна. Энд тангенциал хурдыг хадгалж (хүссэн хурдны ≥ slideMin хувь, налуу өнцөг
 * босгоос бага үед пропорциональ), дахин саадаас гаргана. Шууд (перпендикуляр) шахалтад гулсахгүй.
 */
export function slideMove(s: WalkSolids, px: number, pz: number, x: number, z: number, r: number, cfg: Pick<WalkConfig, 'slideMin' | 'slideAngle'>): Pushed {
  const q = pushOut(s, x, z, r);
  if (!q.hit) return q;
  const dx = x - px, dz = z - pz, dl = Math.hypot(dx, dz);
  const cx = q.x - x, cz = q.z - z, cl = Math.hypot(cx, cz);
  if (dl < 1e-9 || cl < 1e-9) return q;
  const nx = cx / cl, nz = cz / cl, dn = dx * nx + dz * nz;     // нормал (хананаас гадагш), хүссэн хөдөлгөөний нормал бүрэлдэхүүн
  const tx = dx - dn * nx, tz = dz - dn * nz, tl = Math.hypot(tx, tz);
  if (tl < 1e-9) return q;
  const want = Math.max(tl, cfg.slideMin * dl * Math.min(1, tl / (cfg.slideAngle * dl)));
  if (want <= tl * 1.0001) return q;
  const k = want / tl;
  const r2 = pushOut(s, px + tx * k, pz + tz * k, r);
  return { x: r2.x, z: r2.z, hit: true };
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

// ======================= Хашааны хаалгаар дамжуулах (render) =======================
const GATE_N: Record<WalkYard['gate'], { x: number; z: number }> = { n: { x: 0, z: -1 }, s: { x: 0, z: 1 }, w: { x: -1, z: 0 }, e: { x: 1, z: 0 } };

/** Хашааны доторх эсэх (хананы төв шугамаар) */
export const inYard = (y: WalkYard, x: number, z: number): boolean => Math.abs(x - y.x) < y.w / 2 && Math.abs(z - y.z) < y.d / 2;

/** Хаалганы нүхний гаднах ба дотоох цэг (хананаас `reach` метр), хананд перпендикуляр зай (nrm, + гадагш), хаалганы төвөөс хажуугийн зай (lat) */
export function yardGate(y: WalkYard, reach: number): { out: { x: number; z: number }; in: { x: number; z: number }; nrm: (x: number, z: number) => number; lat: (x: number, z: number) => number } {
  const n = GATE_N[y.gate], horiz = y.gate === 'n' || y.gate === 's', half = horiz ? y.d / 2 : y.w / 2;
  const cx = y.x + (horiz ? y.off : 0) + n.x * half, cz = y.z + (horiz ? 0 : y.off) + n.z * half;   // хаалганы төв (ханан дээр)
  return {
    out: { x: cx + n.x * reach, z: cz + n.z * reach },
    in: { x: cx - n.x * reach, z: cz - n.z * reach },
    nrm: (x, z) => (x - cx) * n.x + (z - cz) * n.z,
    lat: (x, z) => (horiz ? x - cx : z - cz),
  };
}

/**
 * `from` → `to` шулуун хашааны хана огтлох (нэг тал хашааны дотор, нөгөө тал гадна) бол хаалганы дундуур орох дараагийн цэг; үгүй бол null.
 * Төлөвгүй: хаалганы нүхний зэрэгцээ бүсэд байвал шууд нөгөө талын цэг рүү, үгүй бол ойрын талын цэг рүү.
 */
export function yardWaypoint(yards: WalkYard[] | undefined, from: { x: number; z: number }, to: { x: number; z: number }, reach = 1.2): { x: number; z: number } | null {
  if (!yards) return null;
  for (const y of yards) {
    const fi = inYard(y, from.x, from.z), ti = inYard(y, to.x, to.z);
    if (fi === ti) continue;
    const g = yardGate(y, reach), nr = g.nrm(from.x, from.z), lt = Math.abs(g.lat(from.x, from.z)), okLat = lt < Math.max(0.2, y.gw / 2 - 0.45);
    if (!fi) return okLat && nr > -0.4 && nr < reach + 0.6 ? g.in : g.out;
    return okLat && nr < 0.4 && nr > -(reach + 0.6) ? g.out : g.in;
  }
  return null;
}

/** NPC-ийн харуулах байрлал `p` нь sim-ийн зорилт `to` руу хашааны хаалгаар дамжин хөөнө (алхам ≤ maxStep). Хол зөрвөл шууд очино */
export function chaseVia(yards: WalkYard[] | undefined, p: { x: number; z: number }, to: { x: number; z: number }, maxStep: number, snapDist = 40): { x: number; z: number } {
  if (Math.hypot(to.x - p.x, to.z - p.z) > snapDist) return { x: to.x, z: to.z };
  const wp = yardWaypoint(yards, p, to) ?? yardDetour(yards, p, to), g = wp ?? to, dx = g.x - p.x, dz = g.z - p.z, d = Math.hypot(dx, dz);
  if (!wp && d <= maxStep) return { x: to.x, z: to.z };
  if (d <= maxStep || d < 1e-6) return { x: g.x, z: g.z };
  return { x: p.x + (dx / d) * maxStep, z: p.z + (dz / d) * maxStep };
}

/** a→b шулуун тэгш өнцөгтийг (hw, hd, төв cx, cz) огтлох эсэх (slab) */
function segHitsRect(a: { x: number; z: number }, b: { x: number; z: number }, cx: number, cz: number, hw: number, hd: number): boolean {
  let t0 = 0, t1 = 1;
  for (const [p, q, c, h] of [[a.x, b.x, cx, hw], [a.z, b.z, cz, hd]] as const) {
    const d = q - p, lo = c - h - p, hi = c + h - p;
    if (Math.abs(d) < 1e-9) { if (lo > 0 || hi < 0) return false; continue; }
    let u0 = lo / d, u1 = hi / d;
    if (u0 > u1) [u0, u1] = [u1, u0];
    t0 = Math.max(t0, u0); t1 = Math.min(t1, u1);
    if (t0 > t1) return false;
  }
  return true;
}

/** Хоёр цэг хоёулаа хашааны гадна, гэвч шулуун нь хашааг хөндлөн гатлах бол хашааны булангаар тойрох дараагийн цэг; үгүй бол null */
export function yardDetour(yards: WalkYard[] | undefined, from: { x: number; z: number }, to: { x: number; z: number }, margin = 0.9): { x: number; z: number } | null {
  if (!yards) return null;
  for (const y of yards) {
    const hw = y.w / 2 + margin, hd = y.d / 2 + margin;
    if (Math.abs(from.x - y.x) < hw && Math.abs(from.z - y.z) < hd) continue;
    if (Math.abs(to.x - y.x) < hw && Math.abs(to.z - y.z) < hd) continue;
    if (!segHitsRect(from, to, y.x, y.z, hw - 0.05, hd - 0.05)) continue;
    let best: { x: number; z: number } | null = null, bestC = Infinity;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const c = { x: y.x + sx * hw, z: y.z + sz * hd };
      if (segHitsRect(from, c, y.x, y.z, hw - 0.05, hd - 0.05)) continue;
      const cost = Math.hypot(c.x - from.x, c.z - from.z) + Math.hypot(to.x - c.x, to.z - c.z) + (segHitsRect(c, to, y.x, y.z, hw - 0.05, hd - 0.05) ? 1000 : 0);
      if (cost < bestC) { bestC = cost; best = c; }
    }
    if (best) return best;
  }
  return null;
}
