/**
 * Хонь, ямааны дүрслэлийн тохиргоо (data/animals-look.json): төрөл, шалгагч. Лаборатори (tools/character-lab/animals.html)-ийн
 * батлагдсан LAB, SHEEP, GOAT-тай ижил тоо. Өнгө "#rrggbb" → тоо болгож шалгана. Алдаа — ойлгомжтой мессежтэй Error.
 */
import lookJson from '../../../../data/animals-look.json';

export type LookSpecies = 'sheep' | 'goat';
export type V3 = [number, number, number];
export type Pair = [number, number];

export interface BodyLook { L: number; R: number; wide: number; p: number }
export interface SkirtLook { lieK: number; hair: number; amp: number; attach: number; knee: number; off: number; flare: number }
export interface DLook {
  body: BodyLook; bodyY: number; neckAt: V3; neckRest: number; neckLen: number; neckR: number; headAt: V3; headTilt: number;
  legLen: number; legY: number; legR0: number; legR1: number; legX: number; legZ: number; legSplit: number; hock: number; hoofH?: number; hoofK?: number;
  tail: { w: number; h: number; d: number }; tailAt: V3; tailRaise: number; wag: number; skirt?: SkirtLook;
}
export interface HornLook { len: number; r0: number; t: number; phi: number; fk: number; pts: V3[] }
export interface HeadLook {
  L: number; r: number; rn: number; bridge: number; eyeT: number; ea: number; eb: number; hx: number; zb: number;
  pupil?: Pair; pupilFwd?: number; eyeC?: number; tip?: number;
  ear: { l: number; w: number; droop: number };
  horn?: HornLook; beard?: { len: number; w: number; t: number };
}
export interface MotionLook {
  fatX: Pair; fatY: Pair; pitch: number; neckGraze: number; headGraze: number;
  browse?: boolean; browsePitch?: number; neckBrowse?: number; headBrowse?: number; browseLeg?: number; browseKnee?: number;
}
export interface VariantLook { wool: number; head: number; patch?: boolean; weight: number }
export interface SpeciesLook {
  stride: number; d: DLook; head: HeadLook; motion: MotionLook;
  light: { bodySeg: number; bodyRows: number; tail: Pair; neck: Pair; skirt?: Pair };
  detail: { bodySeg: number; bodyRows: number; tail: Pair; neck: Pair; skirt?: Pair };
  patchMask?: boolean; variants: VariantLook[];
}
export interface AnimalLook {
  lightCap: number;
  age: {
    growth: number[]; oldSize: number; young: { legK: number; bodyShort: number; headGrow: number; max: number };
    old: { fat: number; sag: number; neckDown: number; headDown: number; woolTo: number; woolK: number; headTo: number; headK: number };
    hornK: number[]; adultIdx: number;
  };
  palette: Record<'hair' | 'hoof' | 'eyeWhite' | 'eyeInk' | 'nose' | 'earInner' | 'muzzleTip' | 'horn' | 'patch' | 'mark', number>;
  motion: { kneeWalk: number; walkAmp: number; fleeAmp: number; stepLen: number; stepGap: Pair; stepRepeat: Pair; stepDur: number; headNod: number; chewHz: number; walkFollow: number };
  quality: Record<'high' | 'mid' | 'low', { detail: number; detailR: number }>;
  species: Record<LookSpecies, SpeciesLook>;
}

type Obj = Record<string, unknown>;
const fail = (path: string, msg: string): never => { throw new Error(`data/animals-look.json: ${path} — ${msg}`); };
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const obj = (v: unknown, path: string): Obj => (isObj(v) ? v : fail(path, 'объект байх ёстой'));
const num = (v: unknown, path: string, lo = -1e6, hi = 1e6): number => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : fail(path, `${lo}–${hi} хооронд тоо байх ёстой`));
const opt = <T>(v: unknown, f: (x: unknown) => T): T | undefined => (v === undefined ? undefined : f(v));
const hex = (v: unknown, path: string): number => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? parseInt(v.slice(1), 16) : fail(path, '#rrggbb өнгө байх ёстой'));
const tup = (v: unknown, path: string, n: number, lo = -1e3, hi = 1e3): number[] => (Array.isArray(v) && v.length === n ? v.map((x, i) => num(x, `${path}[${i}]`, lo, hi)) : fail(path, `${n} тоотой массив байх ёстой`));
const pair = (v: unknown, path: string, lo?: number, hi?: number): Pair => tup(v, path, 2, lo, hi) as Pair;
const v3 = (v: unknown, path: string): V3 => tup(v, path, 3) as V3;

function parseD(raw: unknown, path: string): DLook {
  const r = obj(raw, path), b = obj(r.body, `${path}.body`), t = obj(r.tail, `${path}.tail`);
  const sk = opt(r.skirt, (x) => { const s = obj(x, `${path}.skirt`); return { lieK: num(s.lieK, `${path}.skirt.lieK`, 0, 1), hair: num(s.hair, `${path}.skirt.hair`, 0, 1), amp: num(s.amp, `${path}.skirt.amp`, 0, 0.5), attach: num(s.attach, `${path}.skirt.attach`, -3, 3), knee: num(s.knee, `${path}.skirt.knee`, -3, 3), off: num(s.off, `${path}.skirt.off`, 0, 1), flare: num(s.flare, `${path}.skirt.flare`, 0, 1) }; });
  const d: DLook = {
    body: { L: num(b.L, `${path}.body.L`, 0.2, 3), R: num(b.R, `${path}.body.R`, 0.05, 1), wide: num(b.wide, `${path}.body.wide`, 0.5, 1.5), p: num(b.p, `${path}.body.p`, 1.5, 6) },
    bodyY: num(r.bodyY, `${path}.bodyY`, 0.1, 2), neckAt: v3(r.neckAt, `${path}.neckAt`), neckRest: num(r.neckRest, `${path}.neckRest`, -2, 2), neckLen: num(r.neckLen, `${path}.neckLen`, 0.05, 1.5),
    neckR: num(r.neckR, `${path}.neckR`, 0.3, 3), headAt: v3(r.headAt, `${path}.headAt`), headTilt: num(r.headTilt, `${path}.headTilt`, -1, 2),
    legLen: num(r.legLen, `${path}.legLen`, 0.1, 1.5), legY: num(r.legY, `${path}.legY`, 0.1, 1.5), legR0: num(r.legR0, `${path}.legR0`, 0.01, 0.3), legR1: num(r.legR1, `${path}.legR1`, 0.01, 0.3),
    legX: num(r.legX, `${path}.legX`, 0.01, 0.6), legZ: num(r.legZ, `${path}.legZ`, 0.05, 1), legSplit: num(r.legSplit, `${path}.legSplit`, 0.2, 0.8), hock: num(r.hock, `${path}.hock`, 0, 0.6),
    tail: { w: num(t.w, `${path}.tail.w`, 0, 1), h: num(t.h, `${path}.tail.h`, 0, 1), d: num(t.d, `${path}.tail.d`, 0, 1) },
    tailAt: v3(r.tailAt, `${path}.tailAt`), tailRaise: num(r.tailRaise, `${path}.tailRaise`, -4, 4), wag: num(r.wag, `${path}.wag`, 0, 1),
  };
  const hh = opt(r.hoofH, (x) => num(x, `${path}.hoofH`, 0.01, 0.2)), hk = opt(r.hoofK, (x) => num(x, `${path}.hoofK`, 0.5, 3));
  if (hh !== undefined) d.hoofH = hh;
  if (hk !== undefined) d.hoofK = hk;
  if (sk) d.skirt = sk;
  return d;
}

function parseHead(raw: unknown, path: string): HeadLook {
  const r = obj(raw, path), e = obj(r.ear, `${path}.ear`);
  const h: HeadLook = {
    L: num(r.L, `${path}.L`, 0.05, 1), r: num(r.r, `${path}.r`, 0.01, 0.4), rn: num(r.rn, `${path}.rn`, 0.01, 0.4), bridge: num(r.bridge, `${path}.bridge`, 0, 0.1),
    eyeT: num(r.eyeT, `${path}.eyeT`, 0.1, 0.8), ea: num(r.ea, `${path}.ea`, 0.002, 0.1), eb: num(r.eb, `${path}.eb`, 0.002, 0.1), hx: num(r.hx, `${path}.hx`, 0.5, 1.5), zb: num(r.zb, `${path}.zb`, 0, 1),
    ear: { l: num(e.l, `${path}.ear.l`, 0.02, 0.5), w: num(e.w, `${path}.ear.w`, 0.02, 0.5), droop: num(e.droop, `${path}.ear.droop`, -1, 2) },
  };
  const pu = opt(r.pupil, (x) => pair(x, `${path}.pupil`, 0.05, 2)), pf = opt(r.pupilFwd, (x) => num(x, `${path}.pupilFwd`, -1, 1)), ec = opt(r.eyeC, (x) => hex(x, `${path}.eyeC`)), tp = opt(r.tip, (x) => hex(x, `${path}.tip`));
  if (pu) h.pupil = pu;
  if (pf !== undefined) h.pupilFwd = pf;
  if (ec !== undefined) h.eyeC = ec;
  if (tp !== undefined) h.tip = tp;
  const horn = opt(r.horn, (x) => {
    const q = obj(x, `${path}.horn`);
    if (!Array.isArray(q.pts) || q.pts.length < 3) fail(`${path}.horn.pts`, 'дор хаяж 3 цэг');
    return { len: num(q.len, `${path}.horn.len`, 0.01, 1), r0: num(q.r0, `${path}.horn.r0`, 0.002, 0.1), t: num(q.t, `${path}.horn.t`, 0, 1), phi: num(q.phi, `${path}.horn.phi`, -3, 3), fk: num(q.fk, `${path}.horn.fk`, 0, 1.5), pts: (q.pts as unknown[]).map((p, i) => v3(p, `${path}.horn.pts[${i}]`)) };
  });
  if (horn) h.horn = horn;
  const beard = opt(r.beard, (x) => { const q = obj(x, `${path}.beard`); return { len: num(q.len, `${path}.beard.len`, 0.01, 0.5), w: num(q.w, `${path}.beard.w`, 0.002, 0.1), t: num(q.t, `${path}.beard.t`, 0, 1) }; });
  if (beard) h.beard = beard;
  return h;
}

function parseMotion(raw: unknown, path: string): MotionLook {
  const r = obj(raw, path);
  const m: MotionLook = { fatX: pair(r.fatX, `${path}.fatX`, 0, 3), fatY: pair(r.fatY, `${path}.fatY`, 0, 3), pitch: num(r.pitch, `${path}.pitch`, 0, 1), neckGraze: num(r.neckGraze, `${path}.neckGraze`, 0, 2), headGraze: num(r.headGraze, `${path}.headGraze`, 0, 2) };
  if (r.browse === true) {
    m.browse = true;
    m.browsePitch = num(r.browsePitch, `${path}.browsePitch`, -1, 0); m.neckBrowse = num(r.neckBrowse, `${path}.neckBrowse`, -2, 2); m.headBrowse = num(r.headBrowse, `${path}.headBrowse`, -2, 2);
    m.browseLeg = num(r.browseLeg, `${path}.browseLeg`, 0, 2); m.browseKnee = num(r.browseKnee, `${path}.browseKnee`, 0, 2);
  }
  return m;
}

function parseSpecies(raw: unknown, path: string): SpeciesLook {
  const r = obj(raw, path), l = obj(r.light, `${path}.light`), dt = obj(r.detail, `${path}.detail`);
  const geo = (g: Obj, p: string, withSkirt: boolean): SpeciesLook['light'] => ({
    bodySeg: num(g.bodySeg, `${p}.bodySeg`, 6, 128), bodyRows: num(g.bodyRows, `${p}.bodyRows`, 3, 128), tail: pair(g.tail, `${p}.tail`, 2, 64), neck: pair(g.neck, `${p}.neck`, 2, 64),
    ...(withSkirt ? { skirt: pair(g.skirt, `${p}.skirt`, 2, 64) } : {}),
  });
  const hasSkirt = obj(r.d, `${path}.d`).skirt !== undefined;
  if (!Array.isArray(r.variants) || !r.variants.length) fail(`${path}.variants`, 'дор хаяж 1 зүс');
  const variants = (r.variants as unknown[]).map((x, i) => {
    const q = obj(x, `${path}.variants[${i}]`);
    return { wool: hex(q.wool, `${path}.variants[${i}].wool`), head: hex(q.head, `${path}.variants[${i}].head`), ...(q.patch === true ? { patch: true } : {}), weight: num(q.weight, `${path}.variants[${i}].weight`, 0, 100) };
  });
  if (!variants.some((v) => v.weight > 0)) fail(`${path}.variants`, 'weight-ийн нийлбэр > 0');
  const s: SpeciesLook = { stride: num(r.stride, `${path}.stride`, 0.2, 5), d: parseD(r.d, `${path}.d`), head: parseHead(r.head, `${path}.head`), motion: parseMotion(r.motion, `${path}.motion`), light: geo(l, `${path}.light`, hasSkirt), detail: geo(dt, `${path}.detail`, hasSkirt), variants };
  if (r.patchMask === true) s.patchMask = true;
  return s;
}

export function parseAnimalLook(raw: unknown): AnimalLook {
  const r = obj(raw, 'root'), a = obj(r.age, 'age'), y = obj(a.young, 'age.young'), o = obj(a.old, 'age.old'), p = obj(r.palette, 'palette'), m = obj(r.motion, 'motion'), q = obj(r.quality, 'quality'), sp = obj(r.species, 'species');
  const growth = tup(a.growth, 'age.growth', 5, 0.1, 1.5);
  const pal = {} as AnimalLook['palette'];
  for (const k of ['hair', 'hoof', 'eyeWhite', 'eyeInk', 'nose', 'earInner', 'muzzleTip', 'horn', 'patch', 'mark'] as const) pal[k] = hex(p[k], `palette.${k}`);
  const quality = {} as AnimalLook['quality'];
  for (const k of ['high', 'mid', 'low'] as const) { const e = obj(q[k], `quality.${k}`); quality[k] = { detail: num(e.detail, `quality.${k}.detail`, 0, 64), detailR: num(e.detailR, `quality.${k}.detailR`, 0, 500) }; }
  return {
    lightCap: num(r.lightCap, 'lightCap', 100, 20000),
    age: {
      growth, oldSize: num(a.oldSize, 'age.oldSize', 0.5, 1.5),
      young: { legK: num(y.legK, 'age.young.legK', 0, 3), bodyShort: num(y.bodyShort, 'age.young.bodyShort', 0, 0.8), headGrow: num(y.headGrow, 'age.young.headGrow', 0, 3), max: num(y.max, 'age.young.max', 0.1, 0.9) },
      old: { fat: num(o.fat, 'age.old.fat', -1, 1), sag: num(o.sag, 'age.old.sag', 0, 0.2), neckDown: num(o.neckDown, 'age.old.neckDown', 0, 1), headDown: num(o.headDown, 'age.old.headDown', 0, 1), woolTo: hex(o.woolTo, 'age.old.woolTo'), woolK: num(o.woolK, 'age.old.woolK', 0, 1), headTo: hex(o.headTo, 'age.old.headTo'), headK: num(o.headK, 'age.old.headK', 0, 1) },
      hornK: tup(a.hornK, 'age.hornK', 6, 0, 1.5), adultIdx: num(a.adultIdx, 'age.adultIdx', 0, 5),
    },
    palette: pal,
    motion: {
      kneeWalk: num(m.kneeWalk, 'motion.kneeWalk', 0, 2), walkAmp: num(m.walkAmp, 'motion.walkAmp', 0, 2), fleeAmp: num(m.fleeAmp, 'motion.fleeAmp', 0, 2), stepLen: num(m.stepLen, 'motion.stepLen', 0, 1),
      stepGap: pair(m.stepGap, 'motion.stepGap', 0.1, 60), stepRepeat: pair(m.stepRepeat, 'motion.stepRepeat', 0.1, 60), stepDur: num(m.stepDur, 'motion.stepDur', 0.1, 5),
      headNod: num(m.headNod, 'motion.headNod', 0, 1), chewHz: num(m.chewHz, 'motion.chewHz', 0, 20), walkFollow: num(m.walkFollow, 'motion.walkFollow', 0.5, 30),
    },
    quality,
    species: { sheep: parseSpecies(sp.sheep, 'species.sheep'), goat: parseSpecies(sp.goat, 'species.goat') },
  };
}

export const animalLook: AnimalLook = parseAnimalLook(lookJson);
