/**
 * Чоно (mvp-spec.md §8, prototype-rules.md §6).
 * M2: бууц бүрийн 3 үүр, нутагтаа тэнэнэ, малчны «Чоно үргээх» (Q) командаар үүр лүүгээ зугтана.
 * M4: нутагтаа орж ирсэн, хамгаалалтын бүсээс гадна байгаа малд өдөр дайрна:
 *     анзаарах → хөөх → барих → үүр лүүгээ чирэх → fedMinutes хугацаанд цадна.
 *     Мал чоноос айж үргэнэ: ойртсон чоноос тарж зугтаж, ойрын мал дагаж цугтана (spookAnimals).
 *     Мал хамгаалалтын бүсэд орох, нутгаас хэт холдох, чоно үргээх үед ангаа орхино.
 *     Чоно хамгаалалтын бүс рүү орж чадахгүй.
 *
 * M4.5: шөнө (21:00) улирал, бууцны чонын түвшнээс хамаарсан магадлалтай 1 (өвөл, хавар 2 хүртэл) чоно
 *     хот руу дөхөж, хамгаалалтын бүсээс гадна хоносон малд дайрна (nightRaid). Бүх чоно нэг дор ирэхгүй.
 *
 * B6 (хэрэглэгчийн дүрэм 2026-11-14): чоно өлсдөг (hunger = өлссөн хоног).
 *   цадсан — үүрэндээ орж гарч ирэхгүй, нутагтаа орсон малд дайрахгүй (mode 'den');
 *   өлссөн — үүрнээсээ гарч нутагтаа орсон малд дайрна;
 *   маш өлссөн — үүрнээс үүр рүү аялж, замдаа таарсан малд шууд дайрна (travel).
 *   Барьсан малын мах үүрний нөөцөд (den.food, кг) орж, тэр үүрний чоно тэнцүү хувааж иднэ —
 *   том мал барьвал олон хоног өл даана. Шөнийн дайралтад зөвхөн өлссөн чоно гарна.
 *
 * B7: чоно үрждэг — хавар эр, эм чонотой үүрэнд гөлөг гарна, гөлөг үүрэндээ өснө, чоно хөгширч үхнэ.
 * B8 (dogs.ts): нохой чонотой тулалдана. B9: бүх чоно үхвэл 2 чоно өөр газраас ирнэ (wolvesDaily).
 *
 * Чонын хөдөлгөөн өөрийн seed-тэй генератортой (state.wolves.rngState) тул
 * бэлчээрлэлт, төллөлтийн санамсаргүй дарааллыг өөрчлөхгүй.
 */
import { seasonOf } from './seasons';
import { safeFleeTarget } from './safety';
import { gerRadiusFor } from './gerLayout';
import type { GameConfig, Species } from '../config';
import { Rng } from '../rng';
import type { Animal, GameState } from '../state';
import { waterDistance } from '../terrain';
import { flockKey } from './herds';
import { guardingHelpers, helperGuardRadius } from './helpers';
import { liveWeightKg } from './animals';

export interface Den {
  x: number;
  z: number;
  r: number;             // чонын нутгийн радиус
  food?: number;         // үүрний махны нөөц, кг (B6) — үүрний чоно тэнцүү хувааж иднэ
}

export type WolfMode = 'roam' | 'flee' | 'hunt' | 'drag' | 'den';   // den — цадсан, үүрэндээ (B6)

export interface Wolf {
  id: number;
  den: number;
  x: number;
  z: number;
  tx: number;
  tz: number;
  heading: number;
  mode: WolfMode;
  scared: number;        // үлдсэн айдас (тоглоомын минут)
  targetId: number;      // хөөж буй мал (0 = үгүй)
  fed: number;           // дахин ан хийх хүртэлх минут (цадсан / ангаа алдсан)
  forced?: boolean;      // туршилтын цэсээр дайруулсан: нутгийн хязгаарыг үл тооно
  raid?: boolean;        // шөнө хот руу дөхөж буй чоно (M4.5): нутгийн хязгааргүй
  hunger?: number;       // өлссөн хоног (B6)
  sex?: 'm' | 'f';       // B7
  age?: number;          // нас (жил; 1 жил = time.animalYearDays өдөр)
  life?: number;         // насалж үхэх нас
  travel?: number;       // маш өлссөн: очиж буй үүрний индекс (B6)
}

/** Гөлөг (B7): үүрэндээ байж нөөцөөс иднэ, ан хийхгүй */
export function isPup(cfg: GameConfig, o: Wolf): boolean {
  return (o.age ?? 9) * cfg.time.animalYearDays < cfg.wolves.breeding.pupDays;
}

/** Чонын өлсгөлөнгийн шат (B6) */
export function hungerStage(cfg: GameConfig, o: Wolf): 'fed' | 'hungry' | 'starving' {
  const h = cfg.wolves.hunger;
  const v = o.hunger ?? h.hungryAtDays;
  return v >= h.starvingAtDays ? 'starving' : v >= h.hungryAtDays ? 'hungry' : 'fed';
}

export interface WolfState {
  campId: string;
  rngState: number;
  dens: Den[];
  list: Wolf[];
  peaceful: boolean;     // туршилтын цэс: дайралт унтраасан
  bredYear?: number;     // B7: сүүлд гөлөг гарсан жил
  maxId?: number;        // B7: чонын дараагийн id
}

/** Хамгаалалтын бүс: чоно орохгүй, доторх малд дайрахгүй */
export interface Zone {
  kind: 'pen' | 'yard' | 'home' | 'herder' | 'helper' | 'horse' | 'stallion' | 'dog';
  x: number;
  z: number;
  r: number;
}

export type WolfEvent =
  | { type: 'wolfPups'; den: number; n: number }        // B7: гөлөг гарлаа
  | { type: 'wolfDied'; cause: 'old' | 'starve'; n: number }
  | { type: 'wolfArrive'; n: number }                    // B9: шинэ чоно ирлээ
  | { type: 'dogFight'; dog: string; result: 'wolfKilled' | 'dogKilled' | 'bothDied'; x: number; z: number }   // B8
  | { type: 'wolfHunt'; species: Species; animalId: number; x: number; z: number }
  | { type: 'wolfKill'; species: Species; animalId: number; x: number; z: number }
  | { type: 'wolfGiveUp'; species: Species; animalId: number; x: number; z: number }
  | { type: 'wolfRaid'; n: number };   // шөнө хот руу дөхөж буй чонын тоо (M4.5)

/** seed ба бууцны нэрээс тогтмол тоо: нэг бууцны үүр үргэлж нэг газар байна */
function campSeed(seed: number, campId: string): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (let i = 0; i < campId.length; i++) h = Math.imul(h ^ campId.charCodeAt(i), 16777619) >>> 0;
  return h;
}

export function spawnWolves(cfg: GameConfig, seed: number, campId: string): WolfState {
  const w = cfg.wolves;
  const camp = cfg.camps.camps[campId];
  const rng = new Rng(campSeed(seed, campId));
  const dens: Den[] = [];
  for (let tries = 0; dens.length < w.densPerCamp && tries < 400; tries++) {
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(w.denDistance[0]!, w.denDistance[1]!);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (camp && waterDistance(camp.waterShape, x, z) < 16) continue;
    if (dens.some((d) => Math.hypot(d.x - x, d.z - z) < 80)) continue;
    dens.push({ x, z, r: rng.range(w.territoryRadius[0]!, w.territoryRadius[1]!), food: 0 });
  }
  const list: Wolf[] = [];
  dens.forEach((d, i) => {
    const n = rng.int(w.wolvesPerDen[0]!, w.wolvesPerDen[1]!);
    for (let k = 0; k < n; k++) {
      const x = d.x + rng.range(-3, 3), z = d.z + rng.range(-3, 3);
      const B = w.breeding;
      list.push({ id: list.length + 1, den: i, x, z, tx: x, tz: z, heading: rng.range(0, Math.PI * 2), mode: 'roam', scared: 0, targetId: 0, fed: 0, hunger: rng.range(w.hunger.startDays[0]!, w.hunger.startDays[1]!), sex: k % 2 ? 'm' : 'f', age: rng.range(B.startAge[0]!, B.startAge[1]!), life: rng.range(B.lifespan[0]!, B.lifespan[1]!) });
    }
  });
  return { campId, rngState: rng.state, dens, list, peaceful: false };
}

/** Одоогийн хамгаалалтын бүсүүд (prototype-rules.md §6) */
export function protectionZones(cfg: GameConfig, state: GameState): Zone[] {
  const pr = cfg.wolves.protectRadius;
  const home = cfg.camps.home;
  const zones: Zone[] = [
    { kind: 'pen', x: home.pen.x, z: home.pen.z, r: home.pen.r + pr.pen },
    { kind: 'yard', x: home.cowYard.x, z: home.cowYard.z, r: home.cowYard.r + pr.pen },   // үхрийн хэвтэр (M4.5)
    { kind: 'home', x: home.x, z: home.z, r: state.home === 'ger' ? gerRadiusFor(cfg.ger, pr.ger, state.homeSize) : pr.tent },
  ];
  for (const g of state.extraGers) zones.push({ kind: 'home', x: g.x, z: g.z, r: gerRadiusFor(cfg.ger, pr.ger, g.size) });   // M6.13 нэмэлт гэр
  const p = state.player;
  if (!p.away) zones.push({ kind: 'herder', x: p.x, z: p.z, r: p.mounted ? pr.herderMounted : pr.herder });
  const adult = cfg.animals.species.horse.adultAge;
  for (const a of state.animals) {
    if (a.riding) {
      if (!p.mounted) zones.push({ kind: 'horse', x: a.x, z: a.z, r: pr.ridingHorse });
    } else if (a.species === 'horse' && a.sex === 'm' && a.age >= adult) {
      zones.push({ kind: 'stallion', x: a.x, z: a.z, r: pr.stallion });
    }
  }
  for (const d of state.dogs) zones.push({ kind: 'dog', x: d.x, z: d.z, r: pr.dog });
  for (const h of guardingHelpers(state)) zones.push({ kind: 'helper', x: h.x, z: h.z, r: helperGuardRadius(cfg, h) });
  return zones;
}

export function isProtected(zones: Zone[], x: number, z: number): boolean {
  for (const c of zones) {
    const dx = x - c.x, dz = z - c.z;
    if (dx * dx + dz * dz <= c.r * c.r) return true;
  }
  return false;
}

function moveToward(o: Wolf, speed: number): boolean {
  const dx = o.tx - o.x, dz = o.tz - o.z;
  const d = Math.hypot(dx, dz);
  if (d <= speed) {
    o.x = o.tx;
    o.z = o.tz;
    return true;
  }
  o.x += (dx / d) * speed;
  o.z += (dz / d) * speed;
  o.heading = Math.atan2(dx, dz);
  return false;
}

/** Чоно бүс рүү орохгүй: бүс дотор орчихвол захад нь гаргана */
function pushOut(o: Wolf, zones: Zone[]): void {
  for (const c of zones) {
    const dx = o.x - c.x, dz = o.z - c.z;
    const d = Math.hypot(dx, dz);
    if (d >= c.r) continue;
    const ux = d > 0.01 ? dx / d : 1, uz = d > 0.01 ? dz / d : 0;
    o.x = c.x + ux * (c.r + 0.05);
    o.z = c.z + uz * (c.r + 0.05);
  }
}

/**
 * Мал чоноос айж үргэнэ (хэрэглэгчийн дүрэм 2026-11-13): дайрч буй чоно ойртвол мал эсрэг зүг рүү
 * санамсаргүй хазайж (сүрэг тарж) гүйнэ, ойрын мал дагаж цугтана. Тэнэж яваа чоно сэм дөхдөг тул
 * зөвхөн ойрхон (roamMult) ирэхэд л үргэнэ.
 * Хамгаалалтын бүс доторх мал, азарга айхгүй. Айж зугтаж буй чоноос үргэхгүй.
 * Тоо (тест, тэнцвэрт): үргэсэн малын тоо.
 */
export function spookAnimals(cfg: GameConfig, state: GameState, zones: Zone[], rng: Rng): number {
  const f = cfg.wolves.fear;
  const sense = f.senseRadius as Record<string, number>;
  const maxR = Math.max(...Object.values(sense));
  const adultHorse = cfg.animals.species.horse.adultAge;
  const scary = state.wolves.list.filter((o) => o.mode !== 'flee' && o.mode !== 'den');
  if (!scary.length) return 0;
  const fled: Animal[] = [];
  const flee = (a: Animal, fromX: number, fromZ: number, extraSpread: number): void => {
    let ang = Math.atan2(a.x - fromX, a.z - fromZ);
    ang += rng.range(-1, 1) * (f.spread + extraSpread);
    const d = rng.range(f.fleeDistance[0]!, f.fleeDistance[1]!);
    a.mode = 'flee';
    const t = safeFleeTarget(cfg, state, a.x, a.z, ang, d);   // M6.8: чонын үүр, гүн ус руу гүйхгүй (RNG-д хүрэхгүй)
    a.tx = t.tx;
    a.tz = t.tz;
    fled.push(a);
  };
  const brave = (a: Animal): boolean => a.riding || (a.species === 'horse' && a.sex === 'm' && a.age >= adultHorse);

  for (const a of state.animals) {
    if (brave(a)) continue;
    let near: Wolf | undefined, nd = Infinity;
    for (const o of scary) {
      const dx = a.x - o.x, dz = a.z - o.z;
      if (Math.abs(dx) > maxR || Math.abs(dz) > maxR) continue;
      const d = Math.hypot(dx, dz);
      const R = (sense[a.species] ?? 15) * (o.mode === 'hunt' ? 1 : f.roamMult);
      if (d < R && d < nd) {
        nd = d;
        near = o;
      }
    }
    if (!near) continue;
    // Аль хэдийн зугтаж байгаа бол чоно хэт ойртоогүй л бол зорилтоо солихгүй
    if (a.mode === 'flee' && nd > (sense[a.species] ?? 15) * 0.5) continue;
    if (isProtected(zones, a.x, a.z)) continue;
    flee(a, near.x, near.z, 0);
  }
  // Цугтах: зугтсан малын ойрын сүргийн мал дагаж гүйнэ (нэг давхар)
  if (fled.length) {
    const C = f.contagion;
    const first = fled.slice();
    for (const a of state.animals) {
      if (a.mode === 'flee' || brave(a)) continue;
      const key = flockKey(a.species);
      const src = first.find((b) => flockKey(b.species) === key && Math.abs(b.x - a.x) < C && Math.abs(b.z - a.z) < C && Math.hypot(b.x - a.x, b.z - a.z) < C);
      if (!src || !rng.chance(f.contagionChance)) continue;
      if (isProtected(zones, a.x, a.z)) continue;
      // Зугтаж буй хөршийнхөө гүйж буй зүг рүү, илүү тарж
      flee(a, a.x - (src.tx - src.x), a.z - (src.tz - src.z), 0.4);
    }
  }
  return fled.length;
}

/** Чоныг айлгаж үүр лүү нь буцаана (малчин, нохой) */
export function scareWolf(cfg: GameConfig, o: Wolf): void {
  o.mode = 'flee';
  o.targetId = 0;
  o.forced = false;
  o.scared = cfg.wolves.scaredMinutes;   // тоглоомын минут (sim бодит цагаас хамааралгүй, M6.11)
}

/** Нэг тоглоомын минут. Ан, барьсан мал зэрэг үйл явдлыг буцаана */
export function wolvesStep(cfg: GameConfig, state: GameState): WolfEvent[] {
  const ws = state.wolves;
  const events: WolfEvent[] = [];
  if (!ws.list.length) return events;
  const w = cfg.wolves;
  const at = w.attack;
  const rng = Rng.fromState(ws.rngState);
  const zones = protectionZones(cfg, state);
  const level = cfg.camps.camps[state.campId]?.wolfLevel ?? 'medium';
  const notice = (at.noticeChance as Record<string, number>)[level] ?? 0;
  const dif = state.settings.difficulty;   // M6.10: чоно ×0–1.5, мал чонод үхэх
  const attacks = Boolean(at.enabled) && !ws.peaceful && dif.wolves > 0;
  const vul = at.vulnerability as unknown as Record<string, number>;
  const vulnerability = (a: Animal): number => (a.age < 1 ? vul.young ?? 1 : vul[a.species] ?? 1);
  let byId: Map<number, Animal> | null = null;
  const animalById = (id: number): Animal | undefined => (byId ??= new Map(state.animals.map((a) => [a.id, a]))).get(id);
  const killed = new Set<number>();
  const H = w.hunger;
  const perMin = 1 / 1440;   // өлсгөлөн: бодит хоног = 24 цаг (тоглоомын минутаар)

  // Үүрний нөөц муудна; үүр бүрт хэдэн чоно хооллох вэ (тэнцүү хуваах, B6)
  const eaters = new Map<number, number>();
  for (const o of ws.list) {
    const den = ws.dens[o.den];
    if (den && (o.hunger ?? 0) > 0 && (den.food ?? 0) > 0 && Math.hypot(o.x - den.x, o.z - den.z) <= den.r && o.mode !== 'hunt') eaters.set(o.den, (eaters.get(o.den) ?? 0) + 1);
  }
  for (const d of ws.dens) if ((d.food ?? 0) > 0) d.food = Math.max(0, d.food! * (1 - H.spoilPerDay * perMin));

  for (const o of ws.list) {
    const den = ws.dens[o.den];
    if (!den) continue;
    if (o.scared > 0) o.scared -= 1;
    if (o.fed > 0) o.fed -= 1;

    // Өлсгөлөн ба хооллолт (B6): үүрэндээ байгаа чоно нөөцийг тэнцүү хувааж иднэ
    o.hunger = Math.min(H.maxDays, (o.hunger ?? H.hungryAtDays) + perMin * dif.wolves);
    const k = eaters.get(o.den);
    if (k && (den.food ?? 0) > 0 && o.hunger > 0 && o.mode !== 'hunt' && Math.hypot(o.x - den.x, o.z - den.z) <= den.r) {
      const eat = Math.min(H.eatKgPerMinute, o.hunger * H.dailyKg, den.food! / k);
      den.food = den.food! - eat;
      o.hunger = Math.max(0, o.hunger - eat / H.dailyKg);
    }
    // Зэрлэг ан (тарвага г.м.): өлссөн чоно заримдаа өөрөө олз олно
    if (hungerStage(cfg, o) !== 'fed' && rng.chance(H.wildPrey.chancePerDay * perMin)) o.hunger = Math.max(0, o.hunger - H.wildPrey.kg / H.dailyKg);   // газар дээр нь идэнэ

    if (o.mode === 'flee') {
      o.tx = den.x;
      o.tz = den.z;
      if (moveToward(o, w.speed.flee)) {
        o.mode = 'roam';
        o.travel = undefined;
        pushOut(o, zones);   // үүрний дэргэд нохой/малчин байвал бүсэд нь үлдэхгүй
      }
      continue;
    }

    if (o.mode === 'drag') {
      o.tx = den.x;
      o.tz = den.z;
      if (moveToward(o, w.speed.drag)) o.mode = 'roam';   // олзоо үүртээ авчирлаа — нөөц нь аль хэдийн үүрэнд
    } else if (o.mode === 'hunt') {
      const a = animalById(o.targetId);
      if (!a || killed.has(a.id) || !attacks) {
        o.mode = 'roam';
        o.targetId = 0;
      } else if (isProtected(zones, a.x, a.z) || (!o.forced && !o.raid && o.travel === undefined && Math.hypot(a.x - den.x, a.z - den.z) > den.r + at.chaseRange)) {
        // Мал хамгаалалтад орсон эсвэл нутгаас хэт холдсон — ангаа орхино
        events.push({ type: 'wolfGiveUp', species: a.species, animalId: a.id, x: a.x, z: a.z });
        o.mode = 'roam';
        o.targetId = 0;
        o.forced = false;
        o.fed = at.giveUpCooldown;
      } else {
        o.tx = a.x;
        o.tz = a.z;
        moveToward(o, w.speed.hunt);
        if (Math.hypot(a.x - o.x, a.z - o.z) <= at.killRange && !dif.animalsDie) {
          // «Мал чонод үхэхгүй»: чоно малыг айлгаж тараана, барихгүй — ангаа орхино
          const ang = Math.atan2(a.x - o.x, a.z - o.z);
          a.mode = 'flee';
          a.tx = a.x + Math.sin(ang) * cfg.wolves.fear.fleeDistance[1]!;
          a.tz = a.z + Math.cos(ang) * cfg.wolves.fear.fleeDistance[1]!;
          events.push({ type: 'wolfGiveUp', species: a.species, animalId: a.id, x: a.x, z: a.z });
          o.mode = 'roam';
          o.targetId = 0;
          o.forced = false;
          o.raid = false;
          o.fed = at.giveUpCooldown;
        } else if (Math.hypot(a.x - o.x, a.z - o.z) <= at.killRange) {
          killed.add(a.id);
          state.today.wolfKills[a.species] = (state.today.wolfKills[a.species] ?? 0) + 1;
          noteKillPlace(cfg, state, a.x, a.z);
          // Олзны мах үүрний нөөцөд — үүрний чоно тэнцүү хувааж олон хоног иднэ (B6)
          den.food = (den.food ?? 0) + liveWeightKg(a, cfg.animals) * H.carcassShare;
          o.travel = undefined;
          events.push({ type: 'wolfKill', species: a.species, animalId: a.id, x: a.x, z: a.z });
          o.mode = 'drag';
          o.targetId = 0;
          o.forced = false;
          o.raid = false;   // шөнийн дайрагч мал барьвал үүр лүүгээ буцна
        }
      }
    } else {
      const stage = hungerStage(cfg, o);
      // Цадсан (B6): үүрэндээ орж гарч ирэхгүй, нутагтаа орсон малд ч дайрахгүй
      if ((stage === 'fed' || isPup(cfg, o)) && !o.raid && !o.forced) {
        o.travel = undefined;
        o.tx = den.x;
        o.tz = den.z;
        if (moveToward(o, w.speed.roam * 1.5)) o.mode = 'den';
        else if (o.mode === 'den') o.mode = 'roam';
        pushOut(o, zones);
        continue;
      }
      if (o.mode === 'den') o.mode = 'roam';
      // Маш өлссөн (B6): үүрнээс үүр рүү аялна, замдаа таарсан хамгаалалтгүй малд шууд дайрна
      if (stage === 'starving' && !o.raid && ws.dens.length > 1 && o.scared <= 0) {
        if (o.travel === undefined || !ws.dens[o.travel]) o.travel = nextDen(ws.dens.length, o.travel ?? o.den, o.den, rng);
        const td = ws.dens[o.travel]!;
        if (attacks && (state.step + o.id) % at.checkEverySteps === 0) {
          const prey = nearestPrey(state, o, H.travelSense, zones, killed, vulnerability);
          if (prey) {
            o.mode = 'hunt';
            o.targetId = prey.id;
            events.push({ type: 'wolfHunt', species: prey.species, animalId: prey.id, x: prey.x, z: prey.z });
            pushOut(o, zones);
            continue;
          }
        }
        // Хүн, хотоос зайдуу: хотыг тойрсон нумаар (үүрнүүдийн радиусаар) явна, ойртвол шууд үүр лүү
        const home = cfg.camps.home;
        const ringR = Math.hypot(td.x - home.x, td.z - home.z);
        const aNow = Math.atan2(o.z - home.z, o.x - home.x), aTo = Math.atan2(td.z - home.z, td.x - home.x);
        let da = aTo - aNow;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) > H.travelRingStep) {
          const a2 = aNow + Math.sign(da) * H.travelRingStep;
          o.tx = home.x + Math.cos(a2) * ringR;
          o.tz = home.z + Math.sin(a2) * ringR;
          moveToward(o, H.travelSpeed);
        } else {
          o.tx = td.x;
          o.tz = td.z;
          if (moveToward(o, H.travelSpeed)) o.travel = nextDen(ws.dens.length, o.travel, o.den, rng);
        }
        pushOut(o, zones);
        continue;
      }
      o.travel = undefined;
      // Өлссөн: нутагтаа тэнэж, нутагт нь орсон хамгаалалтгүй малыг анзаарч магадгүй
      let started = false;
      if (o.raid && attacks && o.scared <= 0) {
        started = raidStep(cfg, state, o, zones, rng, killed, vulnerability, events);
      } else if (attacks && o.fed <= 0 && o.scared <= 0 && (state.step + o.id) % at.checkEverySteps === 0) {
        const R = den.r + at.territoryMargin;
        // Хамгийн ойр, эмзэг малыг сонгоно (зай / эмзэг байдал)
        let best: Animal | undefined, bd = Infinity;
        for (const a of state.animals) {
          if (a.riding || killed.has(a.id)) continue;
          const dx = a.x - den.x, dz = a.z - den.z;
          if (Math.abs(dx) > R || Math.abs(dz) > R || dx * dx + dz * dz > R * R) continue;
          if (isProtected(zones, a.x, a.z)) continue;
          if (ws.list.some((x) => x !== o && x.targetId === a.id)) continue;
          const v = vulnerability(a);
          if (v <= 0) continue;
          const d = Math.hypot(a.x - o.x, a.z - o.z) / v;
          if (d < bd) {
            bd = d;
            best = a;
          }
        }
        if (best && rng.chance(notice * vulnerability(best))) {
          o.mode = 'hunt';
          o.targetId = best.id;
          started = true;
          events.push({ type: 'wolfHunt', species: best.species, animalId: best.id, x: best.x, z: best.z });
        }
      }
      if (!started && o.raid && attacks) {
        // Хот руу дөхнө: хотоос approachDistance зайд, үүрнийхээ зүгээс тойрон тэнэнэ
        if ((state.step + o.id * 5) % w.roamEverySteps === 0) {
          const home = cfg.camps.home;
          const base = Math.atan2(den.z - home.z, den.x - home.x);
          const ang = base + rng.range(-0.9, 0.9);
          const r = cfg.wolves.night.approachDistance * rng.range(0.8, 1.2);
          o.tx = home.x + Math.cos(ang) * r;
          o.tz = home.z + Math.sin(ang) * r;
        }
        moveToward(o, w.speed.roam * 2);
      } else if (!started) {
        if ((state.step + o.id * 5) % w.roamEverySteps === 0) {
          const a = rng.range(0, Math.PI * 2), r = rng.range(0, den.r * 0.8);
          o.tx = den.x + Math.cos(a) * r;
          o.tz = den.z + Math.sin(a) * r;
        }
        moveToward(o, w.speed.roam);
      }
    }
    pushOut(o, zones);
  }
  if (killed.size) state.animals = state.animals.filter((a) => !killed.has(a.id));
  if (state.step % cfg.wolves.fear.everySteps === 0) spookAnimals(cfg, state, zones, rng);
  ws.rngState = rng.state;
  return events;
}

/** Маш өлссөн чоно дараагийн аль үүр рүү явах вэ: одоогийнхоос өөр санамсаргүй үүр */
function nextDen(n: number, current: number, own: number, rng: Rng): number {
  void own;
  if (n <= 1) return current;
  let k = Math.floor(rng.next() * (n - 1));
  if (k >= current) k++;
  return k;
}

/** Чонын R м доторх хамгийн ойр, эмзэг хамгаалалтгүй мал (маш өлссөн чоно шууд дайрна) */
function nearestPrey(state: GameState, o: Wolf, R: number, zones: Zone[], killed: Set<number>, vulnerability: (a: Animal) => number): Animal | undefined {
  let best: Animal | undefined, bd = Infinity;
  for (const a of state.animals) {
    if (a.riding || killed.has(a.id)) continue;
    const dx = a.x - o.x, dz = a.z - o.z;
    if (Math.abs(dx) > R || Math.abs(dz) > R) continue;
    const d0 = Math.hypot(dx, dz);
    if (d0 > R || isProtected(zones, a.x, a.z)) continue;
    if (state.wolves.list.some((x) => x !== o && x.targetId === a.id)) continue;
    const v = vulnerability(a);
    if (v <= 0) continue;
    if (d0 / v < bd) {
      bd = d0 / v;
      best = a;
    }
  }
  return best;
}

/** Шөнийн дайрагч: хотын ойр (raidRadius) хамгаалалтгүй малыг анзаарвал ан хийж эхэлнэ */
function raidStep(
  cfg: GameConfig,
  state: GameState,
  o: Wolf,
  zones: Zone[],
  rng: Rng,
  killed: Set<number>,
  vulnerability: (a: Animal) => number,
  events: WolfEvent[],
): boolean {
  const n = cfg.wolves.night;
  if ((state.step + o.id) % cfg.wolves.attack.checkEverySteps !== 0) return false;
  const home = cfg.camps.home;
  let best: Animal | undefined, bd = Infinity;
  for (const a of state.animals) {
    if (a.riding || killed.has(a.id)) continue;
    if (Math.abs(a.x - home.x) > n.raidRadius || Math.abs(a.z - home.z) > n.raidRadius) continue;
    if (Math.hypot(a.x - home.x, a.z - home.z) > n.raidRadius) continue;
    if (isProtected(zones, a.x, a.z)) continue;
    if (state.wolves.list.some((x) => x !== o && x.targetId === a.id)) continue;
    const v = vulnerability(a);
    if (v <= 0) continue;
    const d = Math.hypot(a.x - o.x, a.z - o.z) / v;
    if (d < bd) {
      bd = d;
      best = a;
    }
  }
  if (!best || !rng.chance(n.noticeChance * vulnerability(best))) return false;
  o.mode = 'hunt';
  o.targetId = best.id;
  events.push({ type: 'wolfHunt', species: best.species, animalId: best.id, x: best.x, z: best.z });
  return true;
}

/**
 * 21:00: энэ шөнө хот руу дөхөх чоныг сонгоно (хэрэглэгчийн дүрэм 2026-11-14: зун цөөн, өвөл хавар олон).
 * Сонгогдсон чонын тоог буцаана.
 */
export function nightRaid(cfg: GameConfig, state: GameState): number {
  const ws = state.wolves;
  const n = cfg.wolves.night;
  if (!ws.list.length || ws.peaceful || !cfg.wolves.attack.enabled || state.settings.difficulty.wolves <= 0) return 0;
  const season = seasonOf(cfg, state.time.day);
  const level = cfg.camps.camps[state.campId]?.wolfLevel ?? 'medium';
  const p = Math.min(1, ((n.raidChance as Record<string, number>)[season] ?? 0) * ((n.levelMult as Record<string, number>)[level] ?? 1) * state.settings.difficulty.wolves);
  const max = (n.maxRaiders as Record<string, number>)[season] ?? 1;
  const rng = Rng.fromState(ws.rngState);
  let count = 0;
  for (let k = 0; k < max; k++) if (rng.chance(k === 0 ? p : p * 0.5)) count++;
  // Зөвхөн өлссөн чоно шөнө хот руу дөхнө (B6); цадсан чоно үүрэндээ
  const free = ws.list.filter((o) => (o.mode === 'roam' || o.mode === 'den') && o.fed <= 0 && hungerStage(cfg, o) !== 'fed' && !isPup(cfg, o));
  let picked = 0;
  for (let k = 0; k < count && free.length; k++) {
    const i = Math.floor(rng.next() * free.length);
    const o = free.splice(i, 1)[0]!;
    o.raid = true;
    if (o.mode === 'den') o.mode = 'roam';
    picked++;
  }
  ws.rngState = rng.state;
  return picked;
}

/**
 * Өглөө бүр (B7, B9): нас ахих, хөгширч/гөлөг өлсөж үхэх, хаврын эхэнд гөлөг гаргах,
 * бүх чоно үхсэн бол өөр газраас хос чоно ирэх.
 */
export function wolvesDaily(cfg: GameConfig, state: GameState): WolfEvent[] {
  const ws = state.wolves;
  const B = cfg.wolves.breeding;
  const ev: WolfEvent[] = [];
  if (!ws.dens.length) return ev;
  const rng = Rng.fromState(ws.rngState);
  const yearDays = cfg.time.animalYearDays;
  const nextId = (): number => ws.list.reduce((m, o) => Math.max(m, o.id), ws.maxId ?? 0) + 1;
  const make = (den: number, sex: 'm' | 'f', age: number, hunger: number): Wolf => {
    const d = ws.dens[den]!;
    const id = nextId();
    ws.maxId = id;
    return { id, den, x: d.x + rng.range(-2, 2), z: d.z + rng.range(-2, 2), tx: d.x, tz: d.z, heading: rng.range(0, Math.PI * 2), mode: 'den', scared: 0, targetId: 0, fed: 0, hunger, sex, age, life: rng.range(B.lifespan[0]!, B.lifespan[1]!) };
  };
  // Нас ахих, үхэх
  let old = 0, starved = 0;
  ws.list = ws.list.filter((o) => {
    o.age = (o.age ?? 3) + 1 / yearDays;
    if (o.age >= (o.life ?? 10)) {
      old++;
      return false;
    }
    if (isPup(cfg, o) && (o.hunger ?? 0) >= B.pupStarveDays) {
      starved++;
      return false;
    }
    return true;
  });
  if (old) ev.push({ type: 'wolfDied', cause: 'old', n: old });
  if (starved) ev.push({ type: 'wolfDied', cause: 'starve', n: starved });
  // Хаврын эхэнд гөлөг (жилд нэг удаа)
  const year = Math.floor((state.time.day - 1) / yearDays);
  if (seasonOf(cfg, state.time.day) === 'spring' && ws.bredYear !== year) {
    ws.bredYear = year;
    ws.dens.forEach((_d, i) => {
      const pack = ws.list.filter((o) => o.den === i);
      const adult = (sx: 'm' | 'f') => pack.some((o) => o.sex === sx && (o.age ?? 0) >= B.adultAge);
      if (!adult('m') || !adult('f') || !rng.chance(B.chance)) return;
      const n = Math.min(rng.int(B.litter[0]!, B.litter[1]!), B.maxPerDen - pack.length);
      for (let k = 0; k < n; k++) ws.list.push(make(i, rng.chance(0.5) ? 'm' : 'f', 0, 0));
      if (n > 0) ev.push({ type: 'wolfPups', den: i, n });
    });
  }
  // Бүх чоно үхсэн бол өөр газраас хос ирнэ (B9)
  if (!ws.list.length && B.immigrants > 0) {
    const den = Math.floor(rng.next() * ws.dens.length);
    for (let k = 0; k < B.immigrants; k++) ws.list.push(make(den, k % 2 ? 'm' : 'f', rng.range(B.adultAge, B.adultAge + 2), cfg.wolves.hunger.hungryAtDays + rng.range(0, 1)));
    ev.push({ type: 'wolfArrive', n: B.immigrants });
  }
  ws.rngState = rng.state;
  return ev;
}

/** Нохой чонотой тулалдсанд чоныг устгана (B8) */
export function killWolf(state: GameState, id: number): void {
  state.wolves.list = state.wolves.list.filter((o) => o.id !== id);
}

/** 06:00: шөнийн дайралт дуусна — чоно үүр лүүгээ буцна */
export function endRaid(state: GameState): void {
  for (const o of state.wolves.list) {
    if (!o.raid) continue;
    o.raid = false;
    if (o.mode === 'hunt') {
      o.mode = 'roam';
      o.targetId = 0;
    }
  }
}

/** «Чоно үргээх»: малчны ойрын чоно айж үүр лүүгээ гүйнэ. Үргээсэн чонын тоо */
export function scareWolves(cfg: GameConfig, state: GameState): number {
  const p = state.player;
  const R = p.mounted ? cfg.wolves.scareRadius.mounted : cfg.wolves.scareRadius.onFoot;
  let n = 0;
  for (const o of state.wolves.list) {
    if (Math.hypot(o.x - p.x, o.z - p.z) > R) continue;
    scareWolf(cfg, o);
    n++;
  }
  return n;
}

/** Тайланд: мал хаана барьдсан — хотон (хашаа/хэвтэр/гэрийн бүс), чонын нутаг (үүрний радиус), эсвэл бэлчээр */
export function noteKillPlace(cfg: GameConfig, state: GameState, x: number, z: number): void {
  const fixed = protectionZones(cfg, state).filter((c) => c.kind === 'pen' || c.kind === 'yard' || c.kind === 'home');
  const where = isProtected(fixed, x, z) ? 'pen' : state.wolves.dens.some((d) => Math.hypot(x - d.x, z - d.z) <= d.r) ? 'den' : 'pasture';
  const w = (state.today.wolfWhere ??= {});
  w[where] = (w[where] ?? 0) + 1;
}

/** Ангуучилж буй чоно (HUD-ийн сануулга) */
export function huntingWolves(state: GameState): Wolf[] {
  return state.wolves.list.filter((o) => o.mode === 'hunt');
}
