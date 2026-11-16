/**
 * Гэрийн дотор талын тавилгын байрлал (Three.js-гүй). `render/ger/gerInterior.ts` тавилгыг эндээс байрлуулж,
 * `sim/systems/interior.ts` ижил хайрцгуудыг саад болгон ашиглана — тавилгыг нэвт алхахгүй. Тоо бүгд `data/ger.json`-оос.
 */

/** Локал хайрцаг: төв (x, z), хагас хэмжээ (hw — локал x, hd — локал z), phi — Y тэнхлэгээр эргэлт (render-ийн append-тэй ижил) */
export interface LayoutBox { x: number; z: number; hw: number; hd: number; phi: number; /** хананд тулсан тавилга */ wall?: boolean }

/** `data/ger.json` → "ger"-ийн хэрэгтэй хэсэг (бүтцээрээ тохирно) */
export interface GerLayoutSource {
  sizes: Record<string, { walls: number; diameter: number; uni: number; doorW: number; wallH: number; topH: number; tonoD: number; price: number; storage: number; moveMult: number }>;
  /** Томсгохдоо одоогийн гэрийг буцаан тооцох хувь */
  upgrade: { tradeIn: number; sellRatio: number };
  /** Эхлэлийн (анхдагч) гэрийн хэмжээ */
  home: { size: string };
  shape: { frameOut: number; doorStandOff: number; chimneyOffR: number; chimneySector: number; spokes: number; tonoRingW: number; hayavchOut: number };
  winter: { extraR: number; hayavchOut: number };
  interior: {
    linerGap: number; stoveFacing: number;
    stove: { w: number; d: number; backW: number; backD: number };
    layout: { bedAt: number; chestStep: number; shelfAt: number; khukhuurAt: number; canAt: number };
    bed: { w: number; l: number };
    chest: { w: number; d: number };
    khukhuur: { postX: number };
  };
}

/** GameConfig.ger: layout-д хэрэгтэй хэсэг + бууцны гэр, туслахын гэрийн хэмжээний түлхүүр */
export interface GerSimConfig extends GerLayoutSource {
  home: { size: string };
  helper: { size: string };
}

/** Гол замын тэмдгийн гэрийн нөхцөл: өөрийн гэр (майхан биш) ба ханын тоо ≥ `goalWalls` (mvp-spec §10.2 — «том гэр, 5 ханат») */
export function goalGerReached(cfg: { ger: GerLayoutSource; economy: { goalGerWalls: number } }, state: { home: string; homeSize: string }): boolean {
  return state.home === 'ger' && (cfg.ger.sizes[state.homeSize]?.walls ?? 0) >= cfg.economy.goalGerWalls;
}

/** Гэрийн хэмжээний шат (бага → их): data/ger.json sizes-ийн бичигдсэн дараалал — нэг эх сурвалж */
export function gerLadder(g: GerLayoutSource): string[] {
  return Object.keys(g.sizes);
}

/** Одоогийн гэрээс (null = гэргүй, майхан) `next` хэмжээнд шилжих үнэ: шинэ үнэ − одоогийнх × tradeIn. Томсгох биш бол Infinity */
export function gerUpgradePrice(g: GerLayoutSource, current: string | null, next: string): number {
  const ladder = gerLadder(g), to = ladder.indexOf(next), from = current === null ? -1 : ladder.indexOf(current);
  if (to < 0 || to <= from) return Infinity;
  const cur = current === null ? 0 : Math.round(g.sizes[current]!.price * g.upgrade.tradeIn);
  return g.sizes[next]!.price - cur;
}

/** Гэрийн бууцны хамгаалалт, алхах цагирагийн радиус: анхны (бага 4 ханат) радиусыг гэрийн ханын өргөнөөр тохируулна */
export function gerRadiusFor(g: GerLayoutSource, baseRadius: number, sizeKey: string): number {
  return baseRadius + gerOuterRadius(g, sizeKey) - gerOuterRadius(g, g.home.size);
}

/** Гэрийн хананы радиус (өвөл зузаарна) */
export function gerWallRadius(g: GerLayoutSource, sizeKey: string, winter = false): number {
  const z = g.sizes[sizeKey];
  if (!z) throw new Error(`ger size "${sizeKey}" алга`);
  return z.diameter / 2 + (winter ? g.winter.extraR : 0);
}

/** Гэрийн гаднах хаалганы цэг хананы төвөөс (хаалга +Z чигт) хэр хол: хүрээ + зогсох зай */
export function gerDoorOffset(g: GerLayoutSource, sizeKey: string, winter = false): number {
  return gerWallRadius(g, sizeKey, winter) + g.shape.frameOut + g.shape.doorStandOff;
}

/** Гэрийн гаднах хэмжээ: ханын радиус + өвлийн хаяавч цухуйлт (хамгаалалтын бүс, мөргөлдөөнд) */
export function gerOuterRadius(g: GerLayoutSource, sizeKey: string): number {
  return gerWallRadius(g, sizeKey, true) + g.winter.hayavchOut;
}

/** Дотор талын ханын радиус */
export function gerInnerRadius(g: GerLayoutSource, sizeKey: string): number {
  return gerWallRadius(g, sizeKey) - g.interior.linerGap;
}

/** Хананд тулсан тавилга: theta — хаалганаас (0) зүүн тийш (+) өнцөг; render-ийн put()-тай ижил */
export function placeOnWall(Ri: number, theta: number, backFromWall: number, halfW: number, depth: number): { x: number; z: number; phi: number } {
  const r = Math.sqrt(Ri * Ri - halfW * halfW) - depth / 2 - backFromWall;
  return { x: Math.sin(theta) * r, z: Math.cos(theta) * r, phi: theta + Math.PI };
}

/** Хайрцгийг локалаас өрөөний координат руу (render-ийн Geo.append-тай ижил эргэлт) */
export function boxFrom(local: { x: number; z: number; hw: number; hd: number }, phi: number, tx: number, tz: number): LayoutBox {
  const cs = Math.cos(phi), sn = Math.sin(phi);
  return { x: local.x * cs + local.z * sn + tx, z: -local.x * sn + local.z * cs + tz, hw: local.hw, hd: local.hd, phi };
}

/** Гэр доторх бүх саад (ор, авдар, тавиур, хөхүүр, бидон, зуух, ширээ, сандал, багана) */
export function gerBoxes(g: GerLayoutSource, sizeKey: string): LayoutBox[] {
  const I = g.interior, S = g.shape, Z = g.sizes[sizeKey]!, Ri = gerInnerRadius(g, sizeKey), aK = 2.165 / Ri;
  const out: LayoutBox[] = [];
  const wall = (theta: number, back: number, halfW: number, depth: number): void => {
    const p = placeOnWall(Ri, theta, back, halfW, depth);
    out.push({ x: p.x, z: p.z, hw: halfW, hd: depth / 2, phi: p.phi, wall: true });
  };
  wall(I.layout.bedAt, 0.02, I.bed.l / 2, I.bed.w + 0.02);
  wall(-I.layout.bedAt, 0.02, I.bed.l / 2, I.bed.w + 0.02);
  for (const k of [0, 1, -1]) wall(Math.PI + k * I.layout.chestStep * aK, 0.02, I.chest.w / 2, I.chest.d + 0.03);
  wall(I.layout.shelfAt * aK, 0.02, 0.3, 0.3);
  wall(-I.layout.khukhuurAt * aK, 0.04, I.khukhuur.postX + 0.14, 0.42);
  const t = -I.layout.canAt * aK, rc = Ri - 0.3;   // сүүний бидон
  out.push({ x: Math.sin(t) * rc, z: Math.cos(t) * rc, hw: 0.17, hd: 0.17, phi: 0 });
  out.push({ x: 0, z: -0.8, hw: 0.35, hd: 0.21, phi: 0 });   // ширээ
  for (const sx of [1, -1]) out.push({ x: sx * 0.72, z: -0.5, hw: 0.15, hd: 0.15, phi: 0 });   // сандал
  const ri = Z.tonoD / 2 - S.tonoRingW * 0.4;
  for (const sx of [1, -1]) out.push({ x: sx * ri, z: 0, hw: 0.05, hd: 0.05, phi: 0 });   // багана
  // зуух: яндангийн суурийг тойрч эргэнэ
  const chA = S.chimneySector * 2 * Math.PI / S.spokes, ox = Math.sin(chA) * S.chimneyOffR, oz = Math.cos(chA) * S.chimneyOffR;
  const V = I.stove, zb = V.backD / 2, zm = zb + V.d / 2;
  out.push(boxFrom({ x: 0, z: zm, hw: V.w / 2, hd: V.d / 2 }, I.stoveFacing, ox, oz));
  out.push(boxFrom({ x: 0, z: 0, hw: V.backW / 2, hd: V.backD / 2 }, I.stoveFacing, ox, oz));
  return out;
}

/**
 * Мөргөлдөөнд зориулсан саад: хананд тулсан тавилгыг хана руу сунгана (тавилга ба ханын хоорондох жижиг завсар руу орохгүй,
 * тавилгын өрөөний тал руу түлхэгдэнэ). Нүцгэн хэлбэр нь gerBoxes.
 */
export function gerBlockers(g: GerLayoutSource, sizeKey: string): LayoutBox[] {
  const ext = 0.8;
  return gerBoxes(g, sizeKey).map((b) => {
    if (!b.wall) return b;
    const l = Math.hypot(b.x, b.z) || 1;
    return { ...b, x: b.x + (b.x / l) * ext, z: b.z + (b.z / l) * ext, hd: b.hd + ext };
  });
}

/** Тойргийг (x, z, r) хайрцгаас түлхэж гаргана. Хайрцаг дотор нь байвал хамгийн ойр ирмэг рүү. */
export function pushOutOfBox(b: LayoutBox, x: number, z: number, r: number): { x: number; z: number } {
  const cs = Math.cos(b.phi), sn = Math.sin(b.phi);
  const dx = x - b.x, dz = z - b.z;
  const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;   // локал координат (boxFrom-ийн урвуу)
  const cx = Math.max(-b.hw, Math.min(b.hw, lx)), cz = Math.max(-b.hd, Math.min(b.hd, lz));
  const nx = lx - cx, nz = lz - cz, d = Math.hypot(nx, nz);
  let px: number, pz: number;
  if (d > 1e-9) {
    if (d >= r) return { x, z };
    px = cx + (nx / d) * r;
    pz = cz + (nz / d) * r;
  } else {   // төв нь хайрцаг дотор: ойрхон ирмэгээр гаргана
    const gx = b.hw - Math.abs(lx), gz = b.hd - Math.abs(lz);
    if (gx < gz) { px = Math.sign(lx || 1) * (b.hw + r); pz = lz; } else { px = lx; pz = Math.sign(lz || 1) * (b.hd + r); }
  }
  return { x: b.x + px * cs + pz * sn, z: b.z - px * sn + pz * cs };
}
