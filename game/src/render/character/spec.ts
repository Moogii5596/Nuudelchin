/**
 * Дүрийн төрх (`CharacterSpec`) ба `data/characters.json`-ийн шалгагч — docs/character-design.md §4.3.
 * Дүр хооронд ялгаатай бүх тоо, өнгө энд; `parts/*` зөвхөн spec-ээс уншина (хатуу тоо нь зөвхөн хэлбэрийн муруй).
 * Preset `base`-ээр өвлөнө: объект гүн нийлнэ, массив, энгийн утга солигдоно.
 */
import charactersJson from '../../../../data/characters.json';
import { visualStyle, type HelperRole, type HerderEmotion, type OutfitBody, type OutfitHat } from '../style';
import type { Season } from '../../sim/config';

export interface BootPalette { shaft: number; tan: number; sole: number; teal: number; gold: number; pattern: number }
export interface BodyForm { thickness: number; skirt: number }
export interface ToortsogLook { felt: number; ink: number }
export interface FoxHatLook { fur: number; furTint: number; silk: number; trim: number; gold: number; stem: number; knot: number; ribbon: number }

export type HairStyle = 'short' | 'bald' | 'bun' | 'braids' | 'braid';
export const HAIR_STYLES: readonly HairStyle[] = ['short', 'bald', 'bun', 'braids', 'braid'];
export type Beard = 'none' | 'mustache' | 'goatee' | 'full';
export const BEARDS: readonly Beard[] = ['none', 'mustache', 'goatee', 'full'];
export type EyeShape = 'oval' | 'dot' | 'line' | 'slant';
export const EYE_SHAPES: readonly EyeShape[] = ['oval', 'dot', 'line', 'slant'];
export type BrowShape = 'straight' | 'arch' | 'slant';
export const BROW_SHAPES: readonly BrowShape[] = ['straight', 'arch', 'slant'];
/** Бүх малгай, толгойн өмсгөл: style.ts-ийн улирлын хоёр (toortsog, fox) + эмэгтэй, охидын (scarf, shawl, ribbon) */
export type CharacterHat = OutfitHat | 'scarf' | 'shawl' | 'ribbon';
export const CHARACTER_HATS: readonly CharacterHat[] = ['toortsog', 'fox', 'scarf', 'shawl', 'ribbon'];
const SEASONS: readonly Season[] = ['summer', 'autumn', 'winter', 'spring'];
/** Толгойн цилиндрийн хэлбэр: width/height — харьцаа, round — дээд/доод захын бөөрөнхийлөлт (0 = тоглогчийнх) */
export interface HeadShape { width: number; height: number; round: number }
/** Алчуур: knot — эрүүн доогуур (chin) эсвэл араар (back) зангидсан */
export interface ScarfLook { color: number; knot: 'chin' | 'back' }

/** Бие галбир — угсарсны дараа, bake-ийн өмнө ясаар (бүлгүүдээр) масштаблана; 1/0 бол өөрчлөхгүй */
export interface Figure {
  /** нийт өндөр (1 = насанд хүрсэн эр) */
  stature: number;
  /** хөлийн урт (бүх өндрөөс гадна) */
  legs: number;
  /** цээж, мөрний өргөн */
  build: number;
  /** толгойн харьцаа (хүүхэд том) */
  head: number;
  /** бөгтөр: цээжийг бэлхүүсээр урагш хазайлгах өнцөг, рад */
  hunch: number;
}
/** Зурмал нүүрний параметр (2048×1024 зургийн координатаар) */
export interface FaceLook {
  /** y — босоо шилжилт (+ доош) */
  eyes: { shape: EyeShape; w: number; h: number; spacing: number; y: number };
  /** color — null бол бэх (хар) */
  brows: { shape: BrowShape; thickness: number; length: number; lift: number; tilt: number; color: number | null };
  /** y — босоо шилжилт, smile — амны булан (+ инээмсэглэл, − доошоо) */
  mouth: { width: number; y: number; smile: number };
  beard: Beard;
  wrinkles: number;
  blush: number;
  lashes: boolean;
  freckles: number;
  /** мэнгэ: нүүрний төвөөс [x, y] px (2048×1024) */
  moles: Array<[number, number]>;
  glasses: boolean;
}
export interface NpcDetail { lod: number; shadowParts: number }

export interface CharacterSpec {
  skin: { base: number; shade: number; nail: number };
  /** strands — ширхэгийн [бараан, цайвар] өнгө */
  hair: { color: number; strands: [number, number]; style: HairStyle };
  figure: Figure;
  headShape: HeadShape;
  face: FaceLook;
  legs: number;
  deel: { color: number; hem: number; button: number; furTrim: number; winterTrim: number; terlegLighten: number };
  sash: { color: number; fold: number };
  /** worn — өвлийн дээлийн гадуур хантааз өмсөх эсэх (false — зөвхөн зузаан дээл) */
  vest: { color: number; lining: number; fur: number; worn: boolean };
  boots: BootPalette;
  bodies: Record<OutfitBody, BodyForm>;
  hats: { toortsog: ToortsogLook; fox: FoxHatLook; scarf: ScarfLook; shawl: ScarfLook; ribbon: { color: number } };
  /** улирал бүрийн толгойн өмсгөл (байхгүй бол visuals.json outfits.seasons) */
  wear: Record<Season, CharacterHat | 'none'> | null;
  pose: { elbowRest: [number, number] };
  props: { uurga: number; sack: number };
}

/** Туслахын үүрэг (render/style.ts HelperRole) + хүүхэд туслах */
export type RoleKey = 'herd' | 'horse' | 'drive' | 'otor' | 'collect' | 'child';
export const ROLE_KEYS: readonly RoleKey[] = ['herd', 'horse', 'drive', 'otor', 'collect', 'child'];
/** Сумын оршин суугчийн төрх: preset × бие × малгай */
export interface CrowdLookSpec { preset: string; body: OutfitBody; hat: CharacterHat | 'none' }

export type TalkEventName = 'sell' | 'buy' | 'wolfSeen';
export const TALK_EVENTS: readonly TalkEventName[] = ['sell', 'buy', 'wolfSeen'];
/** Сэтгэл хөдлөлийн дараалал [[сэтгэл хөдлөл, сек], ...] */
export type EmotionSeq = Array<[HerderEmotion, number]>;
/** Ярилцлага, NPC-ийн сэтгэл хөдлөл (V4.5 R7) */
export interface TalkConfig { partnerR: number; turnRate: number; stillSpeed: number; wolfSeeR: number; events: Record<TalkEventName, EmotionSeq> }
const EMOTION_NAMES: readonly HerderEmotion[] = ['neutral', 'happy', 'angry', 'sad', 'surprised'];

export interface CharactersData {
  detail: { npc: NpcDetail };
  presets: Record<string, CharacterSpec>;
  /** бэлэн дүрүүд — өөр preset-ийн base болдоггүй (лабораторийн эгнээ, тест) */
  ready: string[];
  roles: Record<RoleKey, Record<'m' | 'f', string>>;
  crowd: { lod: number; shadowParts: number; looks: CrowdLookSpec[] };
  talk: TalkConfig;
  player: CharacterSpec;
}

/** Дээл, хормой, малгайн өнгө (хуучин `HerderModelColors`-той нийцтэй; `hat` шинэ загварт хэрэглэгдэхгүй) */
export interface CharacterColors { deel: number; hem: number; hat: number }

export const OUTFIT_BODIES: readonly OutfitBody[] = ['terleg', 'deel', 'winter'];
export const OUTFIT_HATS: readonly OutfitHat[] = ['toortsog', 'fox'];

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function fail(path: string, why: string): never {
  throw new Error(`data/characters.json: ${path} — ${why}`);
}
/** Объект эсэх, үл мэдэгдэх түлхүүргүй эсэхийг шалгана (`_doc` зэрэг `_`-ээр эхэлсэн түлхүүрийг алгасна) */
function group(v: unknown, path: string, keys: readonly string[]): Obj {
  if (!isObj(v)) return fail(path, 'объект байх ёстой');
  for (const k of Object.keys(v)) if (!k.startsWith('_') && !keys.includes(k)) fail(`${path}.${k}`, 'үл мэдэгдэх түлхүүр');
  return v;
}
function color(v: unknown, path: string): number {
  if (typeof v !== 'string' || !/^#[0-9a-f]{6}$/i.test(v)) return fail(path, '#rrggbb өнгө байх ёстой');
  return parseInt(v.slice(1), 16);
}
function num(v: unknown, path: string, lo: number, hi: number): number {
  if (typeof v !== 'number' || !(v >= lo && v <= hi)) return fail(path, `${lo}–${hi} хооронд тоо байх ёстой`);
  return v;
}
function colors<K extends string>(v: unknown, path: string, keys: readonly K[], extra: readonly string[] = []): Record<K, number> {
  const o = group(v, path, [...keys, ...extra]);
  const out = {} as Record<K, number>;
  for (const k of keys) out[k] = color(o[k], `${path}.${k}`);
  return out;
}

function oneOf<T extends string>(v: unknown, path: string, values: readonly T[]): T {
  if (typeof v !== 'string' || !values.includes(v as T)) return fail(path, `${values.join(' | ')} байх ёстой`);
  return v as T;
}
function pair(v: unknown, path: string): [number, number] {
  if (!Array.isArray(v) || v.length !== 2) return fail(path, '2 өнгөтэй массив байх ёстой');
  return [color(v[0], `${path}[0]`), color(v[1], `${path}[1]`)];
}
function parseFigure(v: unknown, path: string): Figure {
  const f = group(v, path, ['stature', 'legs', 'build', 'head', 'hunch']);
  return {
    stature: num(f.stature, `${path}.stature`, 0.5, 1.2), legs: num(f.legs, `${path}.legs`, 0.7, 1.2),
    build: num(f.build, `${path}.build`, 0.7, 1.3), head: num(f.head, `${path}.head`, 0.8, 1.4), hunch: num(f.hunch, `${path}.hunch`, 0, 0.4),
  };
}
const bool = (v: unknown, path: string): boolean => (typeof v === 'boolean' ? v : fail(path, 'true/false байх ёстой'));
function parseFace(v: unknown, path: string): FaceLook {
  const f = group(v, path, ['eyes', 'brows', 'mouth', 'beard', 'wrinkles', 'blush', 'lashes', 'freckles', 'moles', 'glasses']);
  const e = group(f.eyes, `${path}.eyes`, ['shape', 'w', 'h', 'spacing', 'y']);
  const b = group(f.brows, `${path}.brows`, ['shape', 'thickness', 'length', 'lift', 'tilt', 'color']);
  const m = group(f.mouth, `${path}.mouth`, ['width', 'y', 'smile']);
  if (!Array.isArray(f.moles)) fail(`${path}.moles`, '[[x, y], ...] массив байх ёстой');
  const moles = (f.moles as unknown[]).map((p, i): [number, number] => {
    if (!Array.isArray(p) || p.length !== 2) return fail(`${path}.moles[${i}]`, '[x, y] байх ёстой');
    return [num(p[0], `${path}.moles[${i}][0]`, -400, 400), num(p[1], `${path}.moles[${i}][1]`, -500, 500)];
  });
  return {
    eyes: { shape: oneOf(e.shape, `${path}.eyes.shape`, EYE_SHAPES), w: num(e.w, `${path}.eyes.w`, 10, 50), h: num(e.h, `${path}.eyes.h`, 10, 60), spacing: num(e.spacing, `${path}.eyes.spacing`, 60, 140), y: num(e.y, `${path}.eyes.y`, -60, 60) },
    brows: {
      shape: oneOf(b.shape, `${path}.brows.shape`, BROW_SHAPES), thickness: num(b.thickness, `${path}.brows.thickness`, 4, 30), length: num(b.length, `${path}.brows.length`, 0.5, 1.6),
      lift: num(b.lift, `${path}.brows.lift`, -40, 40), tilt: num(b.tilt, `${path}.brows.tilt`, -0.5, 0.5), color: b.color === undefined ? null : color(b.color, `${path}.brows.color`),
    },
    mouth: { width: num(m.width, `${path}.mouth.width`, 30, 110), y: num(m.y, `${path}.mouth.y`, -60, 60), smile: num(m.smile, `${path}.mouth.smile`, -1, 1) },
    beard: oneOf(f.beard, `${path}.beard`, BEARDS),
    wrinkles: num(f.wrinkles, `${path}.wrinkles`, 0, 1), blush: num(f.blush, `${path}.blush`, 0, 1), lashes: bool(f.lashes, `${path}.lashes`),
    freckles: num(f.freckles, `${path}.freckles`, 0, 1), moles, glasses: bool(f.glasses, `${path}.glasses`),
  };
}
function parseScarf(v: unknown, path: string): ScarfLook {
  const o = group(v, path, ['color', 'knot']);
  return { color: color(o.color, `${path}.color`), knot: oneOf(o.knot, `${path}.knot`, ['chin', 'back'] as const) };
}
function parseWear(v: unknown, path: string): CharacterSpec['wear'] {
  if (v === undefined) return null;
  const o = group(v, path, SEASONS);
  const out = {} as Record<Season, CharacterHat | 'none'>;
  for (const s of SEASONS) out[s] = oneOf(o[s], `${path}.${s}`, [...CHARACTER_HATS, 'none'] as const);
  return out;
}
type Skins = Record<string, CharacterSpec['skin']>;

const SPEC_KEYS = ['base', 'skin', 'hair', 'figure', 'headShape', 'face', 'wear', 'legs', 'deel', 'sash', 'vest', 'boots', 'bodies', 'hats', 'pose', 'props'] as const;

/** Бүрэн нийлүүлсэн (base шийдсэн) түүхий утгыг төрөлжүүлнэ */
function parseSpec(raw: Obj, path: string, skins: Skins): CharacterSpec {
  const r = group(raw, path, SPEC_KEYS);
  const deelKeys = ['color', 'hem', 'button', 'furTrim', 'winterTrim'] as const;
  const deel = group(r.deel, `${path}.deel`, [...deelKeys, 'terlegLighten']);
  const bodies = group(r.bodies, `${path}.bodies`, OUTFIT_BODIES);
  const hats = group(r.hats, `${path}.hats`, CHARACTER_HATS);
  const hs = group(r.headShape, `${path}.headShape`, ['width', 'height', 'round']);
  const skin = typeof r.skin === 'string' ? (skins[r.skin] ?? fail(`${path}.skin`, `"${r.skin}" skins-д алга`)) : colors(r.skin, `${path}.skin`, ['base', 'shade', 'nail']);
  const pose = group(r.pose, `${path}.pose`, ['elbowRest']);
  const rest = pose.elbowRest;
  if (!Array.isArray(rest) || rest.length !== 2) fail(`${path}.pose.elbowRest`, '2 тоотой массив байх ёстой');
  const elbowRest = (rest as unknown[]).map((x, i) => num(x, `${path}.pose.elbowRest[${i}]`, -2.5, 0.5)) as [number, number];
  const parsedBodies = {} as Record<OutfitBody, BodyForm>;
  for (const b of OUTFIT_BODIES) {
    const f = group(bodies[b], `${path}.bodies.${b}`, ['thickness', 'skirt']);
    parsedBodies[b] = { thickness: num(f.thickness, `${path}.bodies.${b}.thickness`, 0.5, 1.6), skirt: num(f.skirt, `${path}.bodies.${b}.skirt`, 0.2, 1) };
  }
  return {
    skin,
    hair: { ...colors(r.hair, `${path}.hair`, ['color'], ['style', 'strands']), strands: pair((r.hair as Obj).strands, `${path}.hair.strands`), style: oneOf((r.hair as Obj).style, `${path}.hair.style`, HAIR_STYLES) },
    figure: parseFigure(r.figure, `${path}.figure`),
    headShape: { width: num(hs.width, `${path}.headShape.width`, 0.8, 1.2), height: num(hs.height, `${path}.headShape.height`, 0.8, 1.2), round: num(hs.round, `${path}.headShape.round`, -0.5, 1) },
    wear: parseWear(r.wear, `${path}.wear`),
    face: parseFace(r.face, `${path}.face`),
    legs: color(r.legs, `${path}.legs`),
    deel: { ...colors(deel, `${path}.deel`, deelKeys, ['terlegLighten']), terlegLighten: num(deel.terlegLighten, `${path}.deel.terlegLighten`, 0, 0.6) },
    sash: colors(r.sash, `${path}.sash`, ['color', 'fold']),
    vest: { ...colors(r.vest, `${path}.vest`, ['color', 'lining', 'fur'], ['worn']), worn: bool((r.vest as Obj).worn, `${path}.vest.worn`) },
    boots: colors(r.boots, `${path}.boots`, ['shaft', 'tan', 'sole', 'teal', 'gold', 'pattern']),
    bodies: parsedBodies,
    hats: {
      toortsog: colors(hats.toortsog, `${path}.hats.toortsog`, ['felt', 'ink']),
      fox: colors(hats.fox, `${path}.hats.fox`, ['fur', 'furTint', 'silk', 'trim', 'gold', 'stem', 'knot', 'ribbon']),
      scarf: parseScarf(hats.scarf, `${path}.hats.scarf`),
      shawl: parseScarf(hats.shawl, `${path}.hats.shawl`),
      ribbon: colors(hats.ribbon, `${path}.hats.ribbon`, ['color']),
    },
    pose: { elbowRest },
    props: colors(r.props, `${path}.props`, ['uurga', 'sack']),
  };
}

function merge(a: Obj, b: Obj): Obj {
  const out: Obj = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = isObj(v) && isObj(out[k]) ? merge(out[k] as Obj, v) : v;
  return out;
}

/** characters.json-ийг шалгаж, preset бүрийг base-тэй нь нийлүүлнэ. Алдаатай бол зам заасан Error шиднэ */
export function validateCharacters(json: unknown): CharactersData {
  const root = group(json, '(root)', ['detail', 'skins', 'presets', 'player', 'roles', 'crowd', 'talk']);
  const skins: Skins = {};
  for (const [k, v] of Object.entries(group(root.skins, 'skins', Object.keys(isObj(root.skins) ? root.skins : {})))) if (!k.startsWith('_')) skins[k] = colors(v, `skins.${k}`, ['base', 'shade', 'nail']);
  const npc = group(group(root.detail, 'detail', ['npc']).npc, 'detail.npc', ['lod', 'shadowParts']);
  const detail = { npc: { lod: num(npc.lod, 'detail.npc.lod', 0.3, 1), shadowParts: num(npc.shadowParts, 'detail.npc.shadowParts', 0, 20) } };
  const presetsRaw = group(root.presets, 'presets', Object.keys(isObj(root.presets) ? root.presets : {}));
  const resolved = new Map<string, Obj>();
  const resolve = (raw: unknown, path: string, stack: string[]): Obj => {
    if (!isObj(raw)) return fail(path, 'объект байх ёстой');
    const base = raw.base;
    let merged: Obj = {};
    if (base !== undefined) {
      if (typeof base !== 'string' || !(base in presetsRaw)) return fail(`${path}.base`, `"${String(base)}" preset алга`);
      if (stack.includes(base)) return fail(`${path}.base`, `тойрог: ${[...stack, base].join(' → ')}`);
      merged = resolvePreset(base, [...stack, base]);
    }
    const own: Obj = { ...raw };
    delete own.base;
    return merge(merged, own);
  };
  const resolvePreset = (name: string, stack: string[]): Obj => {
    const hit = resolved.get(name);
    if (hit) return hit;
    const r = resolve(presetsRaw[name], `presets.${name}`, stack);
    resolved.set(name, r);
    return r;
  };
  const presets: Record<string, CharacterSpec> = {};
  for (const name of Object.keys(presetsRaw)) {
    if (name.startsWith('_')) continue;
    presets[name] = parseSpec(resolvePreset(name, [name]), `presets.${name}`, skins);
  }
  const player = parseSpec(resolve(root.player, 'player', ['player']), 'player', skins);
  const known = (v: unknown, path: string): string => (typeof v === 'string' && v in presets ? v : fail(path, `"${String(v)}" preset алга`));
  const bases = new Set(Object.values(presetsRaw).map((p) => (isObj(p) ? p.base : undefined)));
  const ready = Object.keys(presets).filter((n) => !bases.has(n));
  const rolesRaw = group(root.roles, 'roles', ROLE_KEYS);
  const roles = {} as CharactersData['roles'];
  for (const k of ROLE_KEYS) {
    const r = group(rolesRaw[k], `roles.${k}`, ['m', 'f']);
    roles[k] = { m: known(r.m, `roles.${k}.m`), f: known(r.f, `roles.${k}.f`) };
  }
  const c = group(root.crowd, 'crowd', ['lod', 'shadowParts', 'looks']);
  if (!Array.isArray(c.looks) || c.looks.length === 0 || c.looks.length > 8) fail('crowd.looks', '1–8 төрх байх ёстой');
  const crowd = {
    lod: num(c.lod, 'crowd.lod', 0.2, 1), shadowParts: num(c.shadowParts, 'crowd.shadowParts', 0, 20),
    looks: (c.looks as unknown[]).map((l, i): CrowdLookSpec => {
      const o = group(l, `crowd.looks[${i}]`, ['preset', 'body', 'hat']);
      return { preset: known(o.preset, `crowd.looks[${i}].preset`), body: oneOf(o.body, `crowd.looks[${i}].body`, OUTFIT_BODIES), hat: oneOf(o.hat, `crowd.looks[${i}].hat`, [...CHARACTER_HATS, 'none'] as const) };
    }),
  };
  const t = group(root.talk, 'talk', ['partnerR', 'turnRate', 'stillSpeed', 'wolfSeeR', 'events']);
  const ev = group(t.events, 'talk.events', TALK_EVENTS);
  const events = {} as Record<TalkEventName, EmotionSeq>;
  for (const k of TALK_EVENTS) {
    const seq = ev[k];
    if (!Array.isArray(seq) || seq.length === 0) fail(`talk.events.${k}`, '[[сэтгэл хөдлөл, сек], ...] байх ёстой');
    events[k] = (seq as unknown[]).map((st, i): [HerderEmotion, number] => {
      if (!Array.isArray(st) || st.length !== 2) return fail(`talk.events.${k}[${i}]`, '[сэтгэл хөдлөл, сек] байх ёстой');
      return [oneOf(st[0], `talk.events.${k}[${i}][0]`, EMOTION_NAMES), num(st[1], `talk.events.${k}[${i}][1]`, 0.05, 30)];
    });
  }
  const talk: TalkConfig = {
    partnerR: num(t.partnerR, 'talk.partnerR', 1, 30), turnRate: num(t.turnRate, 'talk.turnRate', 0.5, 30),
    stillSpeed: num(t.stillSpeed, 'talk.stillSpeed', 0, 3), wolfSeeR: num(t.wolfSeeR, 'talk.wolfSeeR', 1, 200), events,
  };
  return { detail, presets, player, ready, roles, crowd, talk };
}

export const characters: CharactersData = validateCharacters(charactersJson);

/** Нэрээр нь бүрэн spec (`player` эсвэл preset-ийн нэр) */
export function characterSpec(name: string): CharacterSpec {
  const s = name === 'player' ? characters.player : characters.presets[name];
  if (!s) throw new Error(`characterSpec: "${name}" preset алга (data/characters.json)`);
  return s;
}

/** Дээл, хормойн өнгийг сольсон хуулбар (туслах, сумын оршин суугчийн өнгө) */
export function withColors(spec: CharacterSpec, c: Pick<CharacterColors, 'deel' | 'hem'>): CharacterSpec {
  return { ...spec, deel: { ...spec.deel, color: c.deel, hem: c.hem } };
}

/**
 * Туслахын төрх (R5): characters.json roles — үүрэг × хүйс (хүүхэд туслах — child); дээлийн өнгө нь үүргийн өнгө
 * (visuals.json outfits.helperRoles — хэн ямар ажилтай нь холоос танигдана).
 */
export function helperSpec(role: HelperRole, sex: 'm' | 'f', child: boolean): CharacterSpec {
  const deel = parseInt(visualStyle.outfits.helperRoles[role].slice(1), 16);
  return withColors(characterSpec(characters.roles[child ? 'child' : role][sex]), { deel, hem: deel });
}
