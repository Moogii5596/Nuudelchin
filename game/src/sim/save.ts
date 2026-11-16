/**
 * Хадгалалтын цөм (M6.1): GameState → текст → GameState. Three.js, DOM, IndexedDB-гүй (хадгалах газар M6.2 persist/).
 *
 * Дүрэм: тоглоомын БҮХ төлөв `GameState`-д (энгийн JSON). Sim-ийн дотор үлдэх зүйл зөвхөн `cfg`-ээс гарах кэш
 * (бэлчээрийн чанар, өрөөний тодорхойлолт). Шинэ механик state-д талбар нэмбэл `SAVE_VERSION`-г ахиулж,
 * `state.ts → MIGRATIONS`-д алхам нэмнэ; `tests/save.test.ts`-ийн «15 + хадгалах + ачаалах + 15» тест нуугдмал төлөвийг барина.
 */
import { SPECIES, type GameConfig } from './config';
import { difficultyProblems } from './systems/difficulty';
import { MIGRATIONS, MIN_SAVE_VERSION, PRODUCTS, SAVE_VERSION, VEHICLES, migrateState, type GameState } from './state';

export const SAVE_FORMAT = 'nuudelchin-save';

/** Хадгалалтын жагсаалтад (слот сонгох) харуулах товч мэдээлэл — state-ээс гарна */
export interface SaveMeta {
  version: number;
  seed: number;
  day: number;
  money: number;
  animals: number;
  home: 'tent' | 'ger';
  campId: string;
}

export interface SaveFile {
  format: typeof SAVE_FORMAT;
  version: number;
  meta: SaveMeta;
  state: GameState;
}

export class SaveError extends Error {
  constructor(message: string, readonly problems: string[] = []) {
    super(problems.length ? `${message}:\n - ${problems.slice(0, 12).join('\n - ')}${problems.length > 12 ? `\n - … (+${problems.length - 12})` : ''}` : message);
    this.name = 'SaveError';
  }
}

export function saveMeta(s: GameState): SaveMeta {
  return { version: s.version, seed: s.seed, day: s.time.day, money: s.money, animals: s.animals.length, home: s.home, campId: s.campId };
}

/** GameState → JSON текст. Хуулбар үүсгэхгүй: JSON.stringify нь дуудсан агшны төлөвийг авна (sim зогссон үед дуудна) */
export function serialize(state: GameState): string {
  const file: SaveFile = { format: SAVE_FORMAT, version: state.version, meta: saveMeta(state), state };
  return JSON.stringify(file);
}

/**
 * Текст → GameState: задлах → хувилбар шалгах → `migrate` → `validateState`. Алдаатай бол `SaveError` (тоглоомыг эвдэхгүй,
 * дуудагч «хадгалалт эвдэрсэн» гэж харуулна). Хуучин хувилбарыг ачаалахад шинэ талбарууд нөхөгдөнө.
 */
export function deserialize(cfg: GameConfig, text: string): GameState {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new SaveError(`хадгалалтыг уншиж чадсангүй (JSON буруу): ${(e as Error).message}`);
  }
  if (!isObj(raw)) throw new SaveError('хадгалалтын файл объект биш');
  // Боодолтой (SaveFile) эсвэл нүцгэн GameState хоёуланг хүлээн авна
  const state: unknown = raw.format === SAVE_FORMAT ? raw.state : raw;
  if (!isObj(state)) throw new SaveError('хадгалалтад state алга');
  const v = state.version;
  if (typeof v !== 'number' || !Number.isInteger(v)) throw new SaveError('хадгалалтын version тоо биш');
  if (v > SAVE_VERSION) throw new SaveError(`хадгалалт шинэ хувилбарынх (${v} > ${SAVE_VERSION}) — тоглоомоо шинэчилнэ үү`);
  if (v < MIN_SAVE_VERSION) throw new SaveError(`хадгалалтын хувилбар ${v} хэт хуучин (хамгийн багадаа ${MIN_SAVE_VERSION})`);
  if (!isObj(state.player)) throw new SaveError('хадгалалтад player алга');
  let migrated: GameState;
  try {
    migrated = migrateState(state);
  } catch (e) {
    throw new SaveError(`шилжүүлж чадсангүй: ${(e as Error).message}`);
  }
  const problems = validateState(cfg, migrated);
  if (problems.length) throw new SaveError('хадгалалт эвдэрсэн', problems);
  return migrated;
}

/** Шилжүүлэх алхмууд дараалан бүрэн эсэх (тест, эхлэлд) */
export function migrationChainComplete(): boolean {
  for (let v = MIN_SAVE_VERSION; v < SAVE_VERSION; v++) if (!MIGRATIONS[v]) return false;
  return true;
}

// ----------------------------------------------------------------------------------------------------------------
// Шалгалт

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const u32 = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 0xffffffff;
const PLACES = ['camp', 'sum', 'map'];
const MODES = ['graze', 'drink', 'rest', 'driven', 'trek', 'flee', 'home', 'sleep'];

/** state-ийн бүтэц, утгын зөв эсэх. Хоосон жагсаалт = зөв. Тоглоомын дүрмийн шалгалт биш — зөвхөн ачаалахад sim унагах зүйлийг барина */
export function validateState(cfg: GameConfig, s: GameState): string[] {
  const e: string[] = [];
  const need = (ok: boolean, msg: string): boolean => { if (!ok) e.push(msg); return ok; };
  if (!isObj(s)) return ['state объект биш'];
  const o = s as unknown as Obj;
  need(s.version === SAVE_VERSION, `version ${String(s.version)} ≠ ${SAVE_VERSION}`);
  need(u32(s.seed), 'seed: 0…2³²−1 бүхэл тоо байх ёстой');
  need(u32(s.rngState), 'rngState: 0…2³²−1 бүхэл тоо байх ёстой');
  need(Number.isInteger(s.step) && s.step >= 0, 'step: сөрөггүй бүхэл тоо');
  if (need(isObj(s.time), 'time алга')) {
    need(Number.isInteger(s.time.day) && s.time.day >= 1, 'time.day: ≥ 1 бүхэл тоо');
    need(fin(s.time.minute) && s.time.minute >= cfg.time.dayStartMinute && s.time.minute <= cfg.time.nightEndMinute, `time.minute: ${cfg.time.dayStartMinute}…${cfg.time.nightEndMinute}`);
  }
  need(fin(s.money), 'money: тоо байх ёстой (NaN/Infinity биш)');
  need(s.home === 'tent' || s.home === 'ger', `home: "tent"|"ger" (${String(s.home)})`);
  need(typeof s.homeSize === 'string' && s.homeSize in cfg.ger.sizes, `homeSize: data/ger.json sizes-ийн түлхүүр (${String(s.homeSize)})`);
  need(Array.isArray(s.extraGers) && s.extraGers.every((g) => isObj(g) && typeof g.size === 'string' && g.size in cfg.ger.sizes && fin(g.x) && fin(g.z)), 'extraGers: [{size, x, z}]');
  need(isObj(s.leaders) && Object.values(s.leaders).every((v) => Number.isInteger(v)), 'leaders: {сүрэг: малын id}');
  need(Number.isInteger(s.stuckEvents) && s.stuckEvents >= 0, 'stuckEvents: сөрөггүй бүхэл тоо');
  need(fin(s.dayStartMoney ?? 0), 'dayStartMoney: тоо эсвэл null');
  need(Array.isArray(s.flockCenters) && s.flockCenters.every((c) => Array.isArray(c) && fin(c[0]) && isObj(c[1]) && fin(c[1].x) && fin(c[1].z) && fin(c[1].n)), 'flockCenters: [id, {x,z,n}][]');

  // бууц
  const campIds = Object.keys(cfg.camps.camps);
  need(campIds.includes(s.campId), `campId "${s.campId}" data/camps.json-д алга`);
  if (need(isObj(s.camps), 'camps алга')) {
    for (const id of campIds) {
      const c = s.camps[id]!;
      if (!need(isObj(c), `camps.${id} алга`)) continue;
      for (const k of ['degrade', 'daysSpent', 'snow', 'grass', 'hay'] as const) need(fin(c[k]), `camps.${id}.${k}: тоо`);
    }
    for (const id of Object.keys(s.camps)) need(campIds.includes(id), `camps.${id}: data/camps.json-д алга`);
  }

  // өвсний тор (36 100 = 190²)
  const g = s.grass;
  if (need(isObj(g), 'grass алга')) {
    const cells = cfg.pasture.grid.cells;
    need(g.n === cells, `grass.n ${String(g.n)} ≠ ${cells}`);
    need(Array.isArray(g.type) && g.type.length === cells * cells, `grass.type урт ${g.type?.length} ≠ ${cells * cells}`);
    need(Array.isArray(g.biomass) && g.biomass.length === cells * cells, `grass.biomass урт ${g.biomass?.length} ≠ ${cells * cells}`);
    need(g.access === undefined || (Array.isArray(g.access) && g.access.length === g.typeIds?.length), 'grass.access урт ≠ typeIds');
    if (Array.isArray(g.biomass) && g.biomass.length === cells * cells) {
      let bad = -1;
      for (let i = 0; i < g.biomass.length; i++) if (!fin(g.biomass[i])) { bad = i; break; }
      need(bad < 0, `grass.biomass[${bad}] тоо биш`);
    }
    need(Array.isArray(g.typeIds) && g.typeIds.length === Object.keys(cfg.pasture.types).length, 'grass.typeIds ≠ data/pasture.json-ийн төрлүүд');
  }

  // мал
  need(Number.isInteger(s.nextId) && s.nextId >= 1, 'nextId: ≥ 1 бүхэл тоо');
  if (need(Array.isArray(s.animals), 'animals массив биш')) {
    const seen = new Set<number>();
    for (const a of s.animals) {
      const tag = `animals[id=${String((a as { id?: unknown })?.id)}]`;
      if (!need(isObj(a), `${tag} объект биш`)) continue;
      need(Number.isInteger(a.id) && a.id >= 1 && a.id < s.nextId, `${tag}: id ≥ 1 ба < nextId`);
      need(!seen.has(a.id), `${tag}: id давхардсан`);
      seen.add(a.id);
      need((SPECIES as readonly string[]).includes(a.species), `${tag}: species "${String(a.species)}"`);
      need(a.sex === 'm' || a.sex === 'f', `${tag}: sex`);
      need(MODES.includes(a.mode), `${tag}: mode "${String(a.mode)}"`);
      for (const k of ['sn', 'sx', 'sz'] as const) need(a[k] === undefined || fin(a[k]), `${tag}.${k}: тоо`);
      for (const k of ['age', 'condition', 'health', 'gutFill', 'lastGut', 'dietSum', 'thirst', 'cycleOffset', 'milkTimer', 'fiberDays', 'drivenAt', 'x', 'z', 'tx', 'tz', 'heading'] as const) need(fin(a[k]), `${tag}.${k}: тоо`);
    }
  }
  if (need(Array.isArray(s.items), 'items массив биш')) for (const it of s.items) need(isObj(it) && (PRODUCTS as readonly string[]).includes(it.product) && fin(it.amount) && fin(it.x) && fin(it.z) && fin(it.age), `items[${String(it?.id)}] буруу`);
  if (need(Array.isArray(s.storage), 'storage массив биш')) for (const b of s.storage) need(isObj(b) && (PRODUCTS as readonly string[]).includes(b.product) && fin(b.amount) && fin(b.ageDays), 'storage-д буруу багц');
  need(Number.isInteger(s.storageLevel) && s.storageLevel >= 0, 'storageLevel');
  need(Array.isArray(s.processors) && s.processors.every((p) => isObj(p) && fin(p.remaining) && isObj(p.pending)), 'processors буруу');

  // тээвэр, газрын зураг
  need(Array.isArray(s.vehicles) && s.vehicles.every((v) => (VEHICLES as readonly string[]).includes(v)), 'vehicles: мэдэгдэхгүй тээвэр');
  if (need(Array.isArray(s.fleet), 'fleet массив биш')) for (const f of s.fleet) {
    need(isObj(f) && (VEHICLES as readonly string[]).includes(f.id) && PLACES.includes(f.place) && fin(f.x) && fin(f.z) && fin(f.heading) && isObj(f.cargo) && Array.isArray(f.animals) && Array.isArray(f.orders), `fleet[${String(f?.id)}] буруу`);
  }
  if (need(isObj(s.map), 'map алга')) {
    for (const k of ['x', 'z', 'tx', 'tz'] as const) need(fin(s.map[k]), `map.${k}: тоо`);
    need(s.map.dest === null || typeof s.map.dest === 'string', 'map.dest: текст эсвэл null');
  }
  need(s.move === null || (isObj(s.move) && typeof s.move.to === 'string' && fin(s.move.remaining) && campIds.includes(s.move.to)), 'move: null эсвэл {to: бууцны id, remaining}');

  // тоглогч
  if (need(isObj(s.player), 'player алга')) {
    const p = s.player;
    for (const k of ['x', 'z', 'heading'] as const) need(fin(p[k]), `player.${k}: тоо`);
    need(PLACES.includes(p.place), `player.place "${String(p.place)}"`);
    need(p.driving === null || (VEHICLES as readonly string[]).includes(p.driving), 'player.driving');
    need(Array.isArray(p.carry) && p.carry.every((c) => isObj(c) && (PRODUCTS as readonly string[]).includes(c.product) && fin(c.amount) && fin(c.age)), 'player.carry буруу');
    need(Array.isArray(p.drove) && Array.isArray(p.orders), 'player.drove/orders массив биш');
    need(p.interior === null || (isObj(p.interior) && typeof p.interior.door === 'string' && typeof p.interior.room === 'string' && fin(p.interior.x) && fin(p.interior.z) && fin(p.interior.heading)), 'player.interior: null эсвэл {door, room, x, z, heading}');
  }

  // чоно, нохой, туслах, сум
  if (need(isObj(s.wolves), 'wolves алга')) {
    need(u32(s.wolves.rngState), 'wolves.rngState: 0…2³²−1 бүхэл тоо');
    need(campIds.includes(s.wolves.campId), `wolves.campId "${s.wolves.campId}" алга`);
    need(Array.isArray(s.wolves.list) && Array.isArray(s.wolves.dens), 'wolves.list/dens массив биш');
  }
  need(Array.isArray(s.dogs), 'dogs массив биш');
  if (need(isObj(s.helpers), 'helpers алга')) {
    for (const k of ['list', 'candidates', 'otor', 'dwellings'] as const) need(Array.isArray(s.helpers[k]), `helpers.${k} массив биш`);
    need(Number.isInteger(s.helpers.nextId) && s.helpers.nextId >= 1, 'helpers.nextId');
  }
  if (need(isObj(s.town), 'town алга')) {
    need(fin(s.town.reputation), 'town.reputation: тоо');
    need(isObj(s.town.houses) && isObj(s.town.relatives) && Array.isArray(s.town.summerKids), 'town.houses/relatives/summerKids буруу');
  }
  need(isObj(s.today), 'today алга');
  if (need(isObj(s.settings), 'settings алга')) {
    e.push(...difficultyProblems(cfg, s.settings.difficulty));
    need(typeof s.settings.showMilestones === 'boolean', 'settings.showMilestones: true/false');
  }
  if (need(isObj(s.stats), 'stats алга')) {
    for (const k of ['salesIncome', 'income', 'expenses', 'births', 'deaths', 'wolfLost', 'moves'] as const) need(fin(s.stats[k]), `stats.${k}: тоо`);
    need(Array.isArray(s.stats.daily) && s.stats.daily.every((d) => isObj(d) && fin(d.day) && fin(d.money) && fin(d.sheepUnits)), 'stats.daily буруу');
  }
  if (need(isObj(s.milestones), 'milestones алга')) {
    need(isObj(s.milestones.reached) && Object.values(s.milestones.reached).every(fin), 'milestones.reached: {id: өдөр}');
    need(s.milestones.ceremony === null || (isObj(s.milestones.ceremony) && typeof s.milestones.ceremony.id === 'string' && fin(s.milestones.ceremony.day)), 'milestones.ceremony');
  }
  need(s.goalReachedDay === null || fin(s.goalReachedDay), 'goalReachedDay: тоо эсвэл null');
  void o;
  return e;
}
