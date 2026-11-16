/**
 * Барилгын загварын тохиргоо (`data/buildings.json`) ба шалгагч. Эх: tools/character-lab/buildings/index.html (хэрэглэгч баталсан).
 * Бүх урт метрээр, барилгын нүүр +Z. `render/building/*` хатуу тоогүй, зөвхөн эндээс уншина.
 * `town` хэсэг = сумын төвийн барилга (sumcenter.json-ийн id) → лабораторийн төрөл, байрлал (`sim/systems/buildingSize.ts` мөн уншина).
 */
import buildingsJson from '../../../../data/buildings.json';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const HEX = /^#[0-9a-fA-F]{6}$/;

/** Лабораторийн тохиргооны бүтэц олон давхар, тул геометрийн код `any`-аар уншина; шалгагч нь шаардлагатай түлхүүр, тоо, өнгийг баталгаажуулна. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BuildingConfig = any;

export interface TownEntry {
  /** 'public' (public.kinds) | 'shop' (shop.types) | 'milkWool' | 'carDealer' | 'fuel' | 'temple' | 'market' | 'stadium' | 'wrestle' */
  type: string;
  /** public.kinds / shop.types түлхүүр (type=public|shop үед) */
  kind?: string;
  /** Эргүүлэлт (градус, нүүр +Z-ээс цагийн зүүний эсрэг биш — render-ийн Geo.append phi = rot·π/180) */
  /** public: тоглоомын гол үүд — entrances-ийн индекс (анхдагч 0) */
  entrance?: number;
  rot?: number;
  /** Орон нутгийн төвөөс (x, z) зөөх (м) — нийлмэл талбайн голыг барилгын цэгт тааруулах */
  dx?: number;
  dz?: number;
  /** Дээврийн өнгө (roofColors түлхүүр эсвэл hex) */
  roofColor?: string;
}
export interface TownConfig {
  byId: Record<string, TownEntry>;
  /** compound id / field id / prop kind → нийлмэл талбайн загвар */
  compounds: Record<string, TownEntry>;
  fields: Record<string, TownEntry>;
  props: Record<string, TownEntry>;
  /** Тусгай хашаа (specialPlots id) → гол байшин */
  plots: Record<string, { house: string; roofColor?: string }>;
  /** Зурахгүй барилгын id (нийлмэл загварт орсон) */
  skip: string[];
  /** Сумын төвийн айлын хашаанд ашиглах байшингийн төрлүүд (түлхүүр → houseA|houseB|houseC) */
  plotHouses: string[];
}

const TOWN_TYPES = ['public', 'shop', 'woolStore', 'milkWool', 'carDealer', 'fuel', 'temple', 'market', 'stadium', 'wrestle'];

function collectErrors(c: unknown): string[] {
  const errs: string[] = [];
  if (!isObj(c)) return ['хоосон эсвэл объект биш'];
  for (const k of ['palette', 'roofColors', 'house', 'special', 'shop', 'public', 'temple', 'market', 'stadium', 'wrestle', 'khashaa', 'toilet', 'atlas', 'shade', 'town', 'ground', 'path', 'porter', 'milkWool', 'carDealer', 'fuel', 'woodshed', 'animalShed', 'greenhouse', 'kennel', 'tree', 'bush', 'plaque'])
    if (!isObj(c[k])) errs.push(`${k}: объект байх ёстой`);
  if (errs.length) return errs;
  const walk = (v: unknown, path: string): void => {
    if (typeof v === 'number') { if (!Number.isFinite(v)) errs.push(`${path}: тоо биш`); }
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (isObj(v)) for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
    else if (typeof v === 'string' && /color|^hex$|^wall$|^trim$|^roof$|^fence$|^gate$|^ground$|^grass$|^line$|^film$|^rib$|^crown|^bare$|^trunk$/i.test(path.split('.').pop() ?? '') && v.startsWith('#') && !HEX.test(v)) errs.push(`${path}: өнгө буруу "${v}"`);
  };
  walk(c, '');
  const P = c.palette as Obj;
  for (const k of ['wall', 'plinth', 'trim', 'casing', 'wood', 'woodDark', 'fence', 'gable', 'brick', 'iron', 'glass', 'snow', 'snowShade', 'fire', 'outline'])
    if (typeof P[k] !== 'string' || !HEX.test(P[k] as string)) errs.push(`palette.${k}: hex өнгө байх ёстой`);
  const roofColors = c.roofColors as Record<string, { hex?: unknown }>;
  for (const [k, v] of Object.entries(roofColors)) if (typeof v?.hex !== 'string' || !HEX.test(v.hex)) errs.push(`roofColors.${k}.hex буруу`);
  const A = c.atlas as Obj;
  const rects = ['window', 'door', 'gateLeaf', 'wicket', 'shopWin', 'shopDoor', 'pubDoor', 'niche', 'ornament', 'wheelScript', 'pylon', 'firewood'];
  for (const k of rects) {
    const r = A[k];
    if (!Array.isArray(r) || r.length !== 4 || r.some((n) => typeof n !== 'number') || (r[2] as number) <= (r[0] as number) || (r[3] as number) <= (r[1] as number)) errs.push(`atlas.${k}: [x0,y0,x1,y1] байх ёстой`);
    else if ((r[2] as number) > (A.size as number) || (r[3] as number) > (A.h as number)) errs.push(`atlas.${k}: атласаас гарсан`);
  }
  // дэлгүүр: хаягийн самбар бүр атласт багтах
  const shop = c.shop as { types: Obj; extraSigns: Obj; order: string[] };
  const nSigns = Object.keys(shop.types).length + Object.keys(shop.extraSigns).length;
  if ((A.signY as number) + nSigns * (A.signH as number) > (A.h as number)) errs.push('atlas: хаягийн самбар атласт багтахгүй');
  for (const k of shop.order) if (!isObj(shop.types[k])) errs.push(`shop.order: "${k}" shop.types-д алга`);
  for (const [k, t] of Object.entries(shop.types)) { const T = t as Obj; for (const f of ['sign', 'signColor', 'signText', 'roof', 'wall']) if (typeof T[f] !== 'string') errs.push(`shop.types.${k}.${f} алга`); }
  const pub = (c.public as { kinds: Record<string, Obj> }).kinds;
  for (const [k, K] of Object.entries(pub)) { for (const f of ['w', 'd', 'floors']) if (typeof K[f] !== 'number') errs.push(`public.kinds.${k}.${f} тоо байх ёстой`); if (!Array.isArray(K.entrances) || K.entrances.length === 0) errs.push(`public.kinds.${k}.entrances хоосон`); }
  const special = c.special as Record<string, { base?: string }>;
  for (const [k, s] of Object.entries(special)) if (!(s.base === 'gerYard' || isObj((c.house as Obj)[s.base ?? '']))) errs.push(`special.${k}.base "${s.base}" буруу`);
  // сумын төв
  const town = c.town as unknown as TownConfig;
  if (!isObj(town.byId) || Object.keys(town.byId).length === 0) errs.push('town.byId хоосон');
  else for (const [id, e] of Object.entries(town.byId)) {
    const ok = TOWN_TYPES;
    if (!ok.includes(e.type)) errs.push(`town.byId.${id}.type "${e.type}" буруу`);
    else if (e.type === 'public' && !pub[e.kind ?? '']) errs.push(`town.byId.${id}.kind "${e.kind}" public.kinds-д алга`);
    else if (e.type === 'shop' && !isObj(shop.types[e.kind ?? ''])) errs.push(`town.byId.${id}.kind "${e.kind}" shop.types-д алга`);
    if (e.type === 'public' && pub[e.kind ?? ''] && e.entrance !== undefined && !(Number.isInteger(e.entrance) && e.entrance >= 0 && e.entrance < (pub[e.kind!]!.entrances as unknown[]).length)) errs.push(`town.byId.${id}.entrance буруу`);
    if (e.roofColor !== undefined && !roofColors[e.roofColor] && !HEX.test(e.roofColor)) errs.push(`town.byId.${id}.roofColor буруу`);
  }
  for (const grp of ['compounds', 'fields', 'props'] as const) for (const [id, e] of Object.entries(town[grp] ?? {})) if (!TOWN_TYPES.includes(e.type)) errs.push(`town.${grp}.${id}.type "${e.type}" буруу`);
  for (const [id, p] of Object.entries(town.plots ?? {})) if (!isObj((c.house as Obj)[p.house]) || (p.roofColor !== undefined && !roofColors[p.roofColor] && !HEX.test(p.roofColor))) errs.push(`town.plots.${id} буруу`);
  if (!Array.isArray(town.plotHouses) || town.plotHouses.length === 0 || town.plotHouses.some((k) => !isObj((c.house as Obj)[k]))) errs.push('town.plotHouses: house түлхүүрүүд байх ёстой');
  return errs;
}

export function buildingConfigErrors(c: unknown): string[] { return collectErrors(c); }

export function validateBuildingData(c: unknown): BuildingConfig {
  const errs = collectErrors(c);
  if (errs.length) throw new Error(`data/buildings.json буруу:\n - ${errs.join('\n - ')}`);
  return c as BuildingConfig;
}

export const BUILDING_CONFIG: BuildingConfig = validateBuildingData(buildingsJson);
export const TOWN: TownConfig = (BUILDING_CONFIG as { town: TownConfig }).town;
