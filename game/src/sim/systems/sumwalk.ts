/**
 * Сумын төвийн алхалтын мөргөлдөөн (Three.js-гүй): барилга, хашааны хана, гэрийн тойрог.
 * Тоглогч (input/controller.ts) ба гаднах NPC-ийн дүрслэл (render/npcs.ts) нэг функцээр түлхэж гаргана.
 * Нарийн navmesh биш — тойрог/AABB-ийг шахаж гаргана. Тоон утга: data/worldmap.json sum3d.walk.
 */
export interface WalkBox { x: number; z: number; hw: number; hd: number }
export interface WalkCyl { x: number; z: number; r: number }
/** Хаалгатай хашаа (wallRing-ийн бүртгэл): NPC хаалгаар орж гарахад зам заана. off — хаалганы нүхийн төвөөс зөөлт, gw — нүхний өргөн */
export interface WalkYard { x: number; z: number; w: number; d: number; gate: 'n' | 's' | 'e' | 'w'; off: number; gw: number; /** хашаан доторх гол байшин/гэрийн үүд (чиглэлтэй) */ door?: { x: number; z: number; dx: number; dz: number } }
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

// ======================= Хашаа, зам: NPC-ийн гудамжны зам (render) =======================
// Зарчим: NPC-ийн нэг алхалтыг (sim-ийн шулуун/торлосон зам) дээжлэж аваад, барилга, хашааны хана, хаалгыг мэддэг
// «явган замын торон» дээр хаалгаар дамжуулан шулуунасан, булан нь дугуйрсан зам болгоно (нэг алхалтад нэг удаа).
// NPC энэ зам дээр sim-ийн хугацаатай нийцүүлэн явна — хаалга руу огцом эргэх, ханыг нэвтлэх, байшинд ойртоод алга болох үгүй.
export interface Pt { x: number; z: number }
/** Байшин/гэр/барилгын үүд: гаднах цэг ба гадагш чиглэх нэгж вектор */
export interface Anchor { x: number; z: number; dx: number; dz: number }

/** data/npcs.json render.route */
export interface RouteCfg {
  /** Явган замын торны нүдний хэмжээ (м) */ cell: number;
  /** Ханаас барих зай (м), том нь түрүүлж оролдоно — явах зай олдохгүй бол дараагийнх */ clearances: number[];
  /** Булан дугуйлах радиус (м) */ turnR: number;
  /** Үүднээс шулуун гарах/орох зай (м) */ doorReach: number;
  /** Алхалтыг дээжлэх алхам (тоглоомын мин) */ sampleMin: number;
  /** Зам sim-ийнхээс урт бол хурдсах дээд коэффициент */ catchUp: number;
  /** Үүдэнд хүрэхэд саадыг үл тооцох радиус (м) */ doorTol: number;
}

export interface Poly { pts: Pt[]; cum: number[]; len: number }
export function polyOf(pts: Pt[]): Poly {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.z - pts[i - 1]!.z));
  return { pts, cum, len: cum[cum.length - 1]! };
}
/** Зам дээрх `s` метрийн цэг ба чиглэл (heading = atan2(dx, dz)) */
export function polyAt(p: Poly, s: number): { x: number; z: number; heading: number } {
  const n = p.pts.length;
  if (n === 1) return { ...p.pts[0]!, heading: 0 };
  const d = Math.min(p.len, Math.max(0, s));
  let k = 1;
  while (k < n - 1 && p.cum[k]! < d) k++;
  const a = p.pts[k - 1]!, b = p.pts[k]!, span = Math.max(1e-9, p.cum[k]! - p.cum[k - 1]!), u = Math.min(1, Math.max(0, (d - p.cum[k - 1]!) / span));
  return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, heading: Math.atan2(b.x - a.x, b.z - a.z) };
}

/** Хашааны доторх эсэх (хананы төв шугамаар) */
export const inYard = (y: WalkYard, x: number, z: number): boolean => Math.abs(x - y.x) < y.w / 2 && Math.abs(z - y.z) < y.d / 2;

/** Явган замын тор: саад (хайрцаг, тойрог)-ыг clearance-ээр зузаалсан нүдний давхарга бүрээр A* */
export class NavMap {
  readonly x0: number; readonly z0: number; readonly nx: number; readonly nz: number;
  private readonly layers = new Map<number, Uint8Array>();
  private readonly g: Float32Array; private readonly prev: Int32Array; private readonly mark: Uint32Array; private gen = 0;
  constructor(private readonly s: WalkSolids, readonly cell = 0.5, pad = 6) {
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    for (const k of s.boxes) { a = Math.min(a, k.x - k.hw); c = Math.max(c, k.x + k.hw); b = Math.min(b, k.z - k.hd); d = Math.max(d, k.z + k.hd); }
    for (const k of s.cyls) { a = Math.min(a, k.x - k.r); c = Math.max(c, k.x + k.r); b = Math.min(b, k.z - k.r); d = Math.max(d, k.z + k.r); }
    if (!isFinite(a)) { a = b = 0; c = d = 1; }
    this.x0 = a - pad; this.z0 = b - pad;
    this.nx = Math.ceil((c + pad - this.x0) / cell); this.nz = Math.ceil((d + pad - this.z0) / cell);
    const N = this.nx * this.nz;
    this.g = new Float32Array(N); this.prev = new Int32Array(N); this.mark = new Uint32Array(N);
  }
  /** clearance-ийн давхарга (хайрцаг/тойргоос c метрээс ойр нүд = 1) */
  layer(c: number): Uint8Array {
    const hit = this.layers.get(c);
    if (hit) return hit;
    const { nx, nz, cell, x0, z0 } = this, L = new Uint8Array(nx * nz);
    const rng = (lo: number, hi: number, o: number, n: number): [number, number] => [Math.max(0, Math.floor((lo - c - o) / cell)), Math.min(n - 1, Math.ceil((hi + c - o) / cell))];
    for (const b of this.s.boxes) {
      const [i0, i1] = rng(b.x - b.hw, b.x + b.hw, x0, nx), [j0, j1] = rng(b.z - b.hd, b.z + b.hd, z0, nz);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const dx = Math.max(Math.abs(x0 + (i + 0.5) * cell - b.x) - b.hw, 0), dz = Math.max(Math.abs(z0 + (j + 0.5) * cell - b.z) - b.hd, 0);
        if (dx * dx + dz * dz < c * c) L[j * nx + i] = 1;
      }
    }
    for (const k of this.s.cyls) {
      const [i0, i1] = rng(k.x - k.r, k.x + k.r, x0, nx), [j0, j1] = rng(k.z - k.r, k.z + k.r, z0, nz);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (Math.hypot(x0 + (i + 0.5) * cell - k.x, z0 + (j + 0.5) * cell - k.z) < k.r + c) L[j * nx + i] = 1;
    }
    this.layers.set(c, L);
    return L;
  }
  /** (x, z) нүд c зайтай чөлөөтэй эсэх */
  free(c: number, p: Pt): boolean { return !this.blockedAt(this.layer(c), p.x, p.z); }
  private blockedAt(L: Uint8Array, x: number, z: number): boolean {
    const i = Math.floor((x - this.x0) / this.cell), j = Math.floor((z - this.z0) / this.cell);
    return i >= 0 && j >= 0 && i < this.nx && j < this.nz && L[j * this.nx + i] === 1;
  }
  /** a→b шулуун c зайтай чөлөөтэй эсэх; a-ийн `tolA`, b-ийн `tolB` радиус дахь саадыг үл тооцно (үүд ханын дэргэд байдаг) */
  clear(c: number, a: Pt, b: Pt, tolA = 0, tolB = 0): boolean {
    const L = this.layer(c), len = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(len / (this.cell * 0.5)));
    for (let k = 0; k <= n; k++) {
      const x = a.x + ((b.x - a.x) * k) / n, z = a.z + ((b.z - a.z) * k) / n;
      if ((tolA > 0 && Math.hypot(x - a.x, z - a.z) < tolA) || (tolB > 0 && Math.hypot(x - b.x, z - b.z) < tolB)) continue;
      if (this.blockedAt(L, x, z)) return false;
    }
    return true;
  }
  private snap(L: Uint8Array, p: Pt): number {
    const ci = Math.min(this.nx - 1, Math.max(0, Math.floor((p.x - this.x0) / this.cell))), cj = Math.min(this.nz - 1, Math.max(0, Math.floor((p.z - this.z0) / this.cell)));
    if (!L[cj * this.nx + ci]) return cj * this.nx + ci;
    for (let r = 1; r <= 12; r++) {
      let best = -1, bd = Infinity;
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const i = ci + di, j = cj + dj;
        if (i < 0 || j < 0 || i >= this.nx || j >= this.nz || L[j * this.nx + i]) continue;
        const d = di * di + dj * dj;
        if (d < bd) { bd = d; best = j * this.nx + i; }
      }
      if (best >= 0) return best;
    }
    return -1;
  }
  /** A*: a→b чөлөөт нүднүүдийн төвүүд (a, b өөрсдийгөө оруулахгүй); зам олдохгүй бол null */
  astar(c: number, a: Pt, b: Pt, maxNodes = 600000): Pt[] | null {
    const L = this.layer(c), { nx, nz, cell, x0, z0 } = this, si = this.snap(L, a), gi = this.snap(L, b);
    if (si < 0 || gi < 0) return null;
    const gen = ++this.gen, { g, prev, mark } = this, gx = gi % nx, gz = (gi - gx) / nx;
    const open: [number, number][] = [];
    const push = (f: number, id: number): void => { open.push([f, id]); let q = open.length - 1; while (q > 0) { const p = (q - 1) >> 1; if (open[p]![0] <= open[q]![0]) break; [open[p], open[q]] = [open[q]!, open[p]!]; q = p; } };
    const pop = (): number => { const top = open[0]!, last = open.pop()!; if (open.length) { open[0] = last; let q = 0; for (;;) { const l = 2 * q + 1, r = l + 1; let m = q; if (l < open.length && open[l]![0] < open[m]![0]) m = l; if (r < open.length && open[r]![0] < open[m]![0]) m = r; if (m === q) break; [open[m], open[q]] = [open[q]!, open[m]!]; q = m; } } return top[1]; };
    const h = (i: number, j: number): number => { const dx = Math.abs(i - gx), dz = Math.abs(j - gz); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    mark[si] = gen; g[si] = 0; prev[si] = -1; push(h(si % nx, Math.floor(si / nx)), si);
    const closed = new Set<number>();
    let found = false, nodes = 0;
    while (open.length && nodes++ < maxNodes) {
      const cur = pop();
      if (closed.has(cur)) continue;
      closed.add(cur);
      if (cur === gi) { found = true; break; }
      const ci = cur % nx, cj = (cur - ci) / nx;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di, nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= nx || nj >= nz || L[nj * nx + ni]) continue;
        if (di && dj && (L[cj * nx + ni] || L[nj * nx + ci])) continue;   // булан огтлохгүй
        const id = nj * nx + ni, cost = g[cur]! + (di && dj ? 1.414 : 1);
        if (mark[id] !== gen || cost < g[id]!) { mark[id] = gen; g[id] = cost; prev[id] = cur; push(cost + h(ni, nj), id); }
      }
    }
    if (!found) return null;
    const out: Pt[] = [];
    for (let k = gi; k >= 0; k = prev[k]!) out.push({ x: x0 + ((k % nx) + 0.5) * cell, z: z0 + (Math.floor(k / nx) + 0.5) * cell });
    return out.reverse();
  }
}

/** Sim-ийн нэг алхалт (хөдөлж эхлэхээс зогсох хүртэл): цаг (render-ийн минут) ба дээжилсэн цэгүүд */
export interface LegSample { t0: number; t1: number; pts: Pt[]; simLen: number }
export interface LegProbe { moving: boolean; out: boolean; x: number; z: number }

/** minute `m`-д алхаж байгаа NPC-ийн алхалтыг олно (хөдөлгөөн эхэлсэн/зогссон мөчийг хоёртын хайлтаар), үгүй бол null */
export function findLeg(probe: (m: number) => LegProbe, m: number, step: number, span = 300): LegSample | null {
  const walking = (t: number): boolean => { const p = probe(t); return p.out && p.moving; };
  if (!walking(m)) return null;
  const edge = (dir: 1 | -1): number => {
    let ok = m, bad: number | null = null;
    for (let k = 1; k * step <= span; k++) { const t = m + dir * k * step; if (walking(t)) ok = t; else { bad = t; break; } }
    if (bad === null) return ok;
    let lo = ok, hi: number = bad;
    for (let i = 0; i < 18; i++) { const mid: number = (lo + hi) / 2; if (walking(mid)) lo = mid; else hi = mid; }
    ok = lo;
    return ok;
  };
  const t0 = edge(-1), t1 = edge(1);
  const pts: Pt[] = [], n = Math.max(1, Math.ceil((t1 - t0) / step));
  for (let k = 0; k <= n; k++) { const p = probe(t0 + (k * (t1 - t0)) / n); pts.push({ x: p.x, z: p.z }); }
  let simLen = 0;
  for (let i = 1; i < pts.length; i++) simLen += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.z - pts[i - 1]!.z);
  return { t0, t1, pts, simLen };
}

export interface LegPlanOpts {
  anchors: Anchor[];
  /** NPC-ийн гэрийн цэг (sim), гэрийн үүд: алхалт тэр цэгээс эхэлж/тэнд дуусвал үүднээс эхлүүлж/үүдэнд дуусгана */
  home?: { pt: Pt; door: Anchor } | null;
}

const near = (a: Pt, b: Pt, r: number): boolean => Math.hypot(a.x - b.x, a.z - b.z) < r;
const anchorAt = (list: Anchor[], p: Pt, r = 0.6): Anchor | null => { let best: Anchor | null = null, bd = r; for (const a of list) { const d = Math.hypot(a.x - p.x, a.z - p.z); if (d < bd) { bd = d; best = a; } } return best; };

/** Шулуун замын булан дугуйлах (квадрат Безье): радиус R, хоёр талын хагасаас хэтрэхгүй */
export function fillet(pts: Pt[], R: number): Pt[] {
  if (R <= 0 || pts.length < 3) return pts;
  const out: Pt[] = [pts[0]!];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1]!, p = pts[i]!, b = pts[i + 1]!;
    const l1 = Math.hypot(p.x - a.x, p.z - a.z), l2 = Math.hypot(b.x - p.x, b.z - p.z);
    if (l1 < 1e-6 || l2 < 1e-6) continue;
    const ux = (p.x - a.x) / l1, uz = (p.z - a.z) / l1, vx = (b.x - p.x) / l2, vz = (b.z - p.z) / l2;
    const turn = Math.acos(Math.max(-1, Math.min(1, ux * vx + uz * vz)));
    if (turn < 0.03) { out.push(p); continue; }
    const d = Math.min(R, l1 / 2, l2 / 2), s = { x: p.x - ux * d, z: p.z - uz * d }, e = { x: p.x + vx * d, z: p.z + vz * d }, k = Math.max(3, Math.ceil(turn * 5));
    for (let q = 0; q <= k; q++) { const t = q / k, w0 = (1 - t) * (1 - t), w1 = 2 * t * (1 - t), w2 = t * t; out.push({ x: w0 * s.x + w1 * p.x + w2 * e.x, z: w0 * s.z + w1 * p.z + w2 * e.z }); }
  }
  out.push(pts[pts.length - 1]!);
  return out;
}

/**
 * NPC-ийн нэг алхалтын явган зам: барилга, хашааны хана, хаалгыг тойрсон, үүднээс шулуун гарч/орсон, булан нь дугуйрсан.
 * Хашаанаас гарч өөр хашаанд орох (хоёр хаалга) зам нэг дор шийдэгдэнэ.
 */
export function planLegPath(nav: NavMap, solids: WalkSolids, leg: LegSample, o: LegPlanOpts, cfg: RouteCfg, npcR: number): Poly {
  let S = leg.pts.slice();
  let aS = anchorAt(o.anchors, S[0]!), aE = anchorAt(o.anchors, S[S.length - 1]!);
  if (o.home) {
    if (near(S[0]!, o.home.pt, 1)) { S = [o.home.door, ...S.slice(1)]; aS = o.home.door; }
    if (near(S[S.length - 1]!, o.home.pt, 1)) { S = [...S.slice(0, -1), o.home.door]; aE = o.home.door; }
  }
  const start = S[0]!, end = S[S.length - 1]!, tol = cfg.doorTol;
  // үүдэнд ойртох/гарах шулуун хэсэг: тухайн талаас (урд тал) ирж яваа бол л; саад (хана) байвал богиносгоно
  const ahead = (a: Anchor, p: Pt, pts: Pt[]): boolean => {
    const ref = pts.find((q) => Math.hypot(q.x - p.x, q.z - p.z) >= 4) ?? pts[pts.length - 1]!, d = Math.hypot(ref.x - p.x, ref.z - p.z);
    return d > 0.5 && ((ref.x - p.x) * a.dx + (ref.z - p.z) * a.dz) / d > 0.35;
  };
  const useS = aS !== null && ahead(aS, start, S.slice(1)), useE = aE !== null && ahead(aE, end, S.slice(0, -1).reverse());
  const reach = (a: Anchor, p: Pt, c: number): Pt | null => {
    for (const k of [1, 0.7, 0.5]) { const q = { x: p.x + a.dx * cfg.doorReach * k, z: p.z + a.dz * cfg.doorReach * k }; if (nav.free(c, q) && nav.clear(c, p, q, tol, 0)) return q; }
    return null;
  };
  const valid = (poly: Pt[]): boolean => poly.every((p) => near(p, start, tol) || near(p, end, tol) || !pushOut(solids, p.x, p.z, npcR - 0.06).hit);
  const mids = S.slice(1, -1);
  let fallback: Pt[] = [start, ...mids, end];
  for (const c of cfg.clearances) {
    const preS = useS ? reach(aS!, start, c) : null, preE = useE ? reach(aE!, end, c) : null, base = preS ?? start, goal = preE ?? end;
    // 1) саадтай хэсгийг A*-аар тойруулна
    const chain: Pt[] = [base];
    let prev = base, ok = true;
    const targets = [...mids, goal];
    for (let k = 0; k < targets.length; k++) {
      const t = targets[k]!, tolA = prev === base ? tol : 0, tolB = k === targets.length - 1 ? tol : 0;
      if (!nav.clear(c, prev, t, tolA, tolB)) {
        const d = nav.astar(c, prev, t);
        if (!d) { ok = false; break; }
        chain.push(...d);
      }
      chain.push(t); prev = t;
    }
    if (!ok) continue;
    // 2) шулуунасан зам: хамгийн хол харагдах цэг рүү
    const body: Pt[] = [chain[0]!];
    let i = 0;
    while (i < chain.length - 1) {
      let j = chain.length - 1;
      while (j > i + 1 && !nav.clear(c, chain[i]!, chain[j]!, i === 0 ? tol : 0, j === chain.length - 1 ? tol : 0)) j--;
      body.push(chain[j]!); i = j;
    }
    const path = [...(preS ? [start] : []), ...body, ...(preE ? [end] : [])].filter((p, k, arr) => k === 0 || !near(p, arr[k - 1]!, 1e-3));
    fallback = path;
    // 3) булан дугуйлах (шалгалтад унавал радиусыг багасгана)
    for (const R of [cfg.turnR, cfg.turnR / 3, 0]) {
      const dense = fillet(path, R);
      if (valid(dense)) return polyOf(dense);
    }
  }
  return polyOf(fallback);
}
