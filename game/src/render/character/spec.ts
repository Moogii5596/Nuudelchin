/**
 * Дүрийн төрх (`CharacterSpec`) ба `data/characters.json`-ийн шалгагч — docs/character-design.md §4.3.
 * Дүр хооронд ялгаатай бүх тоо, өнгө энд; `parts/*` зөвхөн spec-ээс уншина (хатуу тоо нь зөвхөн хэлбэрийн муруй).
 * Preset `base`-ээр өвлөнө: объект гүн нийлнэ, массив, энгийн утга солигдоно.
 */
import charactersJson from '../../../../data/characters.json';
import { visualStyle, type OutfitBody, type OutfitHat } from '../style';

export interface BootPalette { shaft: number; tan: number; sole: number; teal: number; gold: number; pattern: number }
export interface BodyForm { thickness: number; skirt: number }
export interface ToortsogLook { felt: number; ink: number }
export interface FoxHatLook { fur: number; furTint: number; silk: number; trim: number; gold: number; stem: number; knot: number; ribbon: number }

export interface CharacterSpec {
  skin: { base: number; shade: number; nail: number };
  hair: { color: number };
  legs: number;
  deel: { color: number; hem: number; button: number; furTrim: number; winterTrim: number; terlegLighten: number };
  sash: { color: number; fold: number };
  vest: { color: number; lining: number; fur: number };
  boots: BootPalette;
  bodies: Record<OutfitBody, BodyForm>;
  hats: { toortsog: ToortsogLook; fox: FoxHatLook };
  pose: { elbowRest: [number, number] };
  props: { uurga: number; sack: number };
}

export interface CharactersData {
  presets: Record<string, CharacterSpec>;
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

const SPEC_KEYS = ['base', 'skin', 'hair', 'legs', 'deel', 'sash', 'vest', 'boots', 'bodies', 'hats', 'pose', 'props'] as const;

/** Бүрэн нийлүүлсэн (base шийдсэн) түүхий утгыг төрөлжүүлнэ */
function parseSpec(raw: Obj, path: string): CharacterSpec {
  const r = group(raw, path, SPEC_KEYS);
  const deelKeys = ['color', 'hem', 'button', 'furTrim', 'winterTrim'] as const;
  const deel = group(r.deel, `${path}.deel`, [...deelKeys, 'terlegLighten']);
  const bodies = group(r.bodies, `${path}.bodies`, OUTFIT_BODIES);
  const hats = group(r.hats, `${path}.hats`, OUTFIT_HATS);
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
    skin: colors(r.skin, `${path}.skin`, ['base', 'shade', 'nail']),
    hair: colors(r.hair, `${path}.hair`, ['color']),
    legs: color(r.legs, `${path}.legs`),
    deel: { ...colors(deel, `${path}.deel`, deelKeys, ['terlegLighten']), terlegLighten: num(deel.terlegLighten, `${path}.deel.terlegLighten`, 0, 0.6) },
    sash: colors(r.sash, `${path}.sash`, ['color', 'fold']),
    vest: colors(r.vest, `${path}.vest`, ['color', 'lining', 'fur']),
    boots: colors(r.boots, `${path}.boots`, ['shaft', 'tan', 'sole', 'teal', 'gold', 'pattern']),
    bodies: parsedBodies,
    hats: {
      toortsog: colors(hats.toortsog, `${path}.hats.toortsog`, ['felt', 'ink']),
      fox: colors(hats.fox, `${path}.hats.fox`, ['fur', 'furTint', 'silk', 'trim', 'gold', 'stem', 'knot', 'ribbon']),
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

/**
 * R5 хүртэл хуучин загвартай (characters.ts `makeHerder`) хуваалцдаг утгууд visuals.json-д үлдэнэ —
 * characters.json-д заагаагүй бол эндээс авна (давхардуулахгүй).
 */
export function visualDefaults(): Obj {
  const o = visualStyle.outfits;
  return { deel: { color: o.player.deel, hem: o.player.hem, winterTrim: o.collarFur, terlegLighten: o.terlegLighten } };
}

/** characters.json-ийг шалгаж, preset бүрийг base-тэй нь нийлүүлнэ. Алдаатай бол зам заасан Error шиднэ */
export function validateCharacters(json: unknown, defaults: Obj = visualDefaults()): CharactersData {
  const root = group(json, '(root)', ['presets', 'player']);
  const presetsRaw = group(root.presets, 'presets', Object.keys(isObj(root.presets) ? root.presets : {}));
  const resolved = new Map<string, Obj>();
  const resolve = (raw: unknown, path: string, stack: string[]): Obj => {
    if (!isObj(raw)) return fail(path, 'объект байх ёстой');
    const base = raw.base;
    let merged: Obj = defaults;
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
    presets[name] = parseSpec(resolvePreset(name, [name]), `presets.${name}`);
  }
  const player = parseSpec(resolve(root.player, 'player', ['player']), 'player');
  return { presets, player };
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
