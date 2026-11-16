/**
 * Гэр, майхны загварын тохиргоо (`data/ger.json`) ба шалгагч. Эх: tools/character-lab/ger.html (хэрэглэгч баталсан).
 * Бүх урт метрээр. Хаалга +Z (өмнө зүг) рүү харна. `render/ger/*` хатуу тоогүй, зөвхөн эндээс уншина.
 */
import gerJson from '../../../../data/ger.json';

export interface GerSize { label: string; price: number; storage: number; moveMult: number; walls: number; diameter: number; wallH: number; topH: number; tonoD: number; uni: number; belts: number; doorW: number; doorH: number }
export interface DoorVariant { label: string; base: string; frame: string; line: string; accent: string; motif: string; stile?: number }
export interface GerShape {
  puff: number; roofPuff: number; beltPinch: number; eaveDrop: number; shoulderIn: number; shoulderUp: number; hayavchH: number; hayavchOut: number;
  beltOut: number; beltH: number; beltAt: number[]; tonoRingW: number; tonoRingH: number; tonoRise: number; tonoProud: number; spokes: number; spokeT: number;
  urkhOut: number; urkhRopeLean: number; chimneyR: number; chimneyH: number; chimneyOffR: number; chimneySector: number;
  doorSill: number; jambW: number; lintelH: number; frameOut: number; leafT: number; doorStandOff: number; doorSwing: number; knob: string; outlineW: number;
}
export interface GerWinter { extraR: number; hayavchH: number; hayavchOut: number; puff: number; roofPuff: number; shoulderUp: number; bankW: number; bankH: number; roofSnowTo: number }
export interface GerPalette { cover: string; felt: string; hayavch: string; rope: string; tono: string; iron: string; snow: string; snowShade: string; fire: string; interior: string; outline: string }
export interface TentPalette { canvas: string; canvasOld: string; trim: string; pole: string; rope: string; stake: string; uurga: string; snow: string }
export interface GerInteriorColors { feltIn: string; lattice: string; uni: string; floor: string; wood: string; woodDark: string; blue: string; blanket: string; chestCol: string; bedRed: string; gold: string; cloth: string; rug: string; rugIn: string; iron: string; tin: string; glass: string; standWood: string; leather: string; paleWood: string; alu: string; aluDark: string; steel: string; steelDark: string; steelLight: string }
export interface GerInterior extends GerInteriorColors {
  linerGap: number; latticeTile: number; stoveFacing: number; uniW: number; uniTip: number;
  khukhuur: { postX: number; height: number; barY: number; crease: number; bag: [number, number, number, number][] };
  stove: { w: number; d: number; h: number; legH: number; backW: number; backD: number; backH: number; plateR: number };
  layout: { bedAt: number; chestStep: number; shelfAt: number; khukhuurAt: number; canAt: number };
  bed: { w: number; l: number; seatH: number; railH: number; endH: number; endD: number };
  chest: { w: number; d: number; h: number; baseH: number };
}
export interface GerAtlas { size: number; door: [number, number, number, number]; white: [number, number]; glow: [number, number]; felt: [number, number]; feltRepeat: number; feltSpan: number }
export interface GerConfig {
  palette: GerPalette;
  sizes: Record<string, GerSize>;
  shape: GerShape;
  winter: GerWinter;
  doors: DoorVariant[];
  interior: GerInterior;
  atlas: GerAtlas;
  shade: { wallBottom: number; furnitureBottom: number; furnitureTop: number };
  /** Тоглогчийн гэрийн хэмжээ (хэмжээний шат M6.13-д sim-ээс) */
  home: { size: string };
  /** Гэр сольж томсгох: одоогийн гэрийг буцаан тооцох хувь (M6.13) */
  upgrade: { tradeIn: number; sellRatio: number };
  /** Туслахын гэр: хуучирсан бүрээс, 2 бүслүүр, энгийн модон хаалга */
  helper: { size: string; coverColor: string; belts: number; doorMotif: string };
}
export interface TentKind { label: string; L: number; W: number; H: number; wall: number; doorW: number; trim: boolean; uurga?: boolean; old?: boolean }
export interface TentConfig {
  palette: TentPalette;
  kinds: Record<string, TentKind>;
  ropeOut: number; trimW: number; doorStandOff: number; outlineW: number;
}
export interface GerData { ger: GerConfig; tent: TentConfig }

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const HEX = /^#[0-9a-fA-F]{6}$/;

function check(errs: string[], root: unknown, path: string, kind: 'num' | 'hex' | 'str' | 'bool'): void {
  let v: unknown = root;
  for (const k of path.split('.')) v = isObj(v) ? v[k] : undefined;
  const ok = kind === 'num' ? typeof v === 'number' && Number.isFinite(v)
    : kind === 'hex' ? typeof v === 'string' && HEX.test(v)
      : kind === 'str' ? typeof v === 'string' : typeof v === 'boolean';
  if (!ok) errs.push(`${path}: ${kind === 'num' ? 'тоо' : kind === 'hex' ? '#rrggbb өнгө' : kind === 'str' ? 'текст' : 'true/false'} байх ёстой`);
}

const SHAPE_NUM = ['puff', 'roofPuff', 'beltPinch', 'eaveDrop', 'shoulderIn', 'shoulderUp', 'hayavchH', 'hayavchOut', 'beltOut', 'beltH', 'tonoRingW', 'tonoRingH', 'tonoRise', 'tonoProud', 'spokes', 'spokeT',
  'urkhOut', 'urkhRopeLean', 'chimneyR', 'chimneyH', 'chimneyOffR', 'chimneySector', 'doorSill', 'jambW', 'lintelH', 'frameOut', 'leafT', 'doorStandOff', 'doorSwing', 'outlineW'];
const WINTER_NUM = ['extraR', 'hayavchH', 'hayavchOut', 'puff', 'roofPuff', 'shoulderUp', 'bankW', 'bankH', 'roofSnowTo'];
const SIZE_NUM = ['price', 'storage', 'moveMult', 'walls', 'diameter', 'wallH', 'topH', 'tonoD', 'uni', 'belts', 'doorW', 'doorH'];
const TENT_NUM = ['L', 'W', 'H', 'wall', 'doorW'];

/** Тохиргооны алдааны жагсаалт (хоосон бол зөв) */
export function gerConfigErrors(data: unknown): string[] {
  const errs: string[] = [];
  if (!isObj(data) || !isObj(data.ger) || !isObj(data.tent)) return ['ger/tent бүлэг байх ёстой'];
  const g = data.ger, t = data.tent;
  for (const k of ['cover', 'felt', 'hayavch', 'rope', 'tono', 'iron', 'snow', 'snowShade', 'fire', 'interior', 'outline']) check(errs, g, `palette.${k}`, 'hex');
  for (const k of SHAPE_NUM) check(errs, g, `shape.${k}`, 'num');
  check(errs, g, 'shape.knob', 'hex');
  for (const k of WINTER_NUM) check(errs, g, `winter.${k}`, 'num');
  for (const k of ['wallBottom', 'furnitureBottom', 'furnitureTop']) check(errs, g, `shade.${k}`, 'num');
  for (const k of ['size', 'feltRepeat', 'feltSpan']) check(errs, g, `atlas.${k}`, 'num');
  for (const k of ['door', 'white', 'glow', 'felt']) {
    const a = isObj(g.atlas) ? g.atlas[k] : undefined;
    if (!Array.isArray(a) || !a.every((x) => typeof x === 'number')) errs.push(`atlas.${k}: тооны массив байх ёстой`);
  }
  for (const k of ['linerGap', 'latticeTile', 'stoveFacing', 'uniW', 'uniTip']) check(errs, g, `interior.${k}`, 'num');
  if (isObj(g.interior)) for (const [k, v] of Object.entries(g.interior)) if (typeof v === 'string') check(errs, g, `interior.${k}`, 'hex');
  const groups: [string, string[]][] = [['stove', ['w', 'd', 'h', 'legH', 'backW', 'backD', 'backH', 'plateR']], ['layout', ['bedAt', 'chestStep', 'shelfAt', 'khukhuurAt', 'canAt']],
    ['bed', ['w', 'l', 'seatH', 'railH', 'endH', 'endD']], ['chest', ['w', 'd', 'h', 'baseH']], ['khukhuur', ['postX', 'height', 'barY', 'crease']]];
  for (const [grp, keys] of groups) for (const k of keys) check(errs, g, `interior.${grp}.${k}`, 'num');
  if (!Array.isArray(g.doors) || g.doors.length === 0) errs.push('doors: хоосон биш массив байх ёстой');
  else g.doors.forEach((d, i) => {
    for (const k of ['base', 'frame', 'line', 'accent']) check(errs, d, k, 'hex');
    if (!isObj(d) || typeof d.motif !== 'string') errs.push(`doors[${i}].motif: текст байх ёстой`);
  });
  if (!isObj(g.sizes) || Object.keys(g.sizes).length === 0) errs.push('sizes: хоосон биш объект байх ёстой');
  else for (const k of Object.keys(g.sizes)) for (const f of SIZE_NUM) check(errs, g.sizes, `${k}.${f}`, 'num');
  check(errs, g, 'home.size', 'str');
  check(errs, g, 'upgrade.tradeIn', 'num');
  check(errs, g, 'upgrade.sellRatio', 'num');
  if (isObj(g.sizes) && isObj(g.home) && typeof g.home.size === 'string' && !(g.home.size in g.sizes)) errs.push(`home.size "${g.home.size}" sizes-д алга`);
  check(errs, g, 'helper.coverColor', 'hex');
  check(errs, g, 'helper.size', 'str');
  if (isObj(g.sizes) && isObj(g.helper) && typeof g.helper.size === 'string' && !(g.helper.size in g.sizes)) errs.push(`helper.size "${g.helper.size}" sizes-д алга`);
  check(errs, g, 'helper.belts', 'num');
  if (Array.isArray(g.doors) && isObj(g.helper) && !g.doors.some((d) => isObj(d) && d.motif === (g.helper as Obj).doorMotif)) errs.push(`helper.doorMotif "${String(g.helper.doorMotif)}" doors-д алга`);
  for (const k of ['canvas', 'canvasOld', 'trim', 'pole', 'rope', 'stake', 'uurga', 'snow']) check(errs, t, `palette.${k}`, 'hex');
  for (const k of ['ropeOut', 'trimW', 'doorStandOff', 'outlineW']) check(errs, t, k, 'num');
  if (!isObj(t.kinds) || Object.keys(t.kinds).length === 0) errs.push('tent.kinds: хоосон биш объект байх ёстой');
  else for (const k of Object.keys(t.kinds)) { for (const f of TENT_NUM) check(errs, t.kinds, `${k}.${f}`, 'num'); check(errs, t.kinds, `${k}.trim`, 'bool'); }
  return errs;
}

export function validateGerData(data: unknown): GerData {
  const errs = gerConfigErrors(data);
  if (errs.length) throw new Error(`data/ger.json буруу:\n - ${errs.join('\n - ')}`);
  return data as GerData;
}

const loaded = validateGerData(gerJson);
export const GER: GerConfig = loaded.ger;
export const TENT: TentConfig = loaded.tent;

/** Хэмжээний түлхүүр (home.size г.м.) → GerSize */
export function gerSize(key: string): GerSize {
  const z = GER.sizes[key];
  if (!z) throw new Error(`ger size "${key}" алга`);
  return z;
}
