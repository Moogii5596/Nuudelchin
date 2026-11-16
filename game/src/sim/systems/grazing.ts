/**
 * Малын бэлчээрлэлт (нэг алхам = 1 тоглоомын минут).
 * grazing-livestock.md §1.3, §3.2–3.3, water-horses-transport.md §1, mvp-spec.md §2.
 *
 * - Мал 10 алхам тутам ойролцоох цэгүүдээс хамгийн өндөр оноотойг сонгоно:
 *     оноо = чанар^1.5 × идэж болох өвс − сүргээс холдсон торгууль
 * - Бэлчээрлэх горимд мал минут бүр байгаа нүднээсээ идэж, зорилт руу аажим алхана.
 * - Гэдэс дүүрвэл (өдрийн тааз) хэвтэж хивнэ.
 * - M4: ус руу явах, шинэ бэлчээр рүү нүүх шийдвэрийг сүрэг гаргана (herds.ts).
 *   Энд зөвхөн уснаас ойр байгаа мал ганцаараа очиж ууна.
 */
import type { GameConfig, Species } from '../config';
import { inBounds, isWalkable, nearestWalkable, waterDepthAt } from './safety';
import type { Rng } from '../rng';
import type { Animal, GameState } from '../state';
import { absBiomass, cellIndex, grassHeightCm, typeIdOf } from './pasture';
import { sheepUnits } from './animals';
import { drinkPoint, type FlockCenter } from './herds';

export type { FlockCenter };
import { waterDistance } from '../terrain';
import { activeDayMinutes, isNight } from '../clock';

export function flockCenters(state: GameState): Partial<Record<Species, FlockCenter>> {
  const acc: Partial<Record<Species, FlockCenter>> = {};
  for (const a of state.animals) {
    if (a.riding) continue;
    // Хонь ямаа нэг сүрэг
    const key: Species = a.species === 'goat' ? 'sheep' : a.species;
    const c = (acc[key] ??= { x: 0, z: 0, n: 0 });
    c.x += a.x;
    c.z += a.z;
    c.n++;
  }
  for (const c of Object.values(acc)) {
    if (c && c.n) {
      c.x /= c.n;
      c.z /= c.n;
    }
  }
  return acc;
}

function flockKey(sp: Species): Species {
  return sp === 'goat' ? 'sheep' : sp;
}

/** Зорилтот цэг сонгох (10 алхам тутам, мал бүр өөр алхамд) */
function decide(cfg: GameConfig, state: GameState, rng: Rng, a: Animal, quality: Record<string, number>, centers: Map<number, FlockCenter>): void {
  const g = cfg.pasture.grazing;
  const th = cfg.animals.thirst;
  const camp = cfg.camps.camps[state.campId];

  // Туугдаж, нүүж, ус руу явж буй мал зорилтдоо хүртлээ шийдэхгүй
  if (a.mode === 'driven' || a.mode === 'trek' || a.mode === 'drink' || a.mode === 'flee' || a.mode === 'home' || a.mode === 'sleep') return;

  // Уснаас ойрхон бол нэг нэгээрээ очиж ууна. Хол бол сүрэг хамтдаа шийднэ (herds.ts)
  if (a.thirst >= (th.seekWaterAt ?? 50) && camp && waterDistance(camp.waterShape, a.x, a.z) <= g.herd.nearWaterDistance) {
    const w = drinkPoint(cfg, camp.waterShape, a.x, a.z);
    a.mode = 'drink';
    a.tx = w.x;
    a.tz = w.z;
    return;
  }
  if (a.gutFill >= 1) {
    a.mode = 'rest';
    a.tx = a.x;
    a.tz = a.z;
    return;
  }

  a.mode = 'graze';
  const center = centers.get(a.id);
  const radius = g.sampleRadius[a.species];
  // Сүргийн өргөн малын тоогоор (B11): 300 хонь 14 м-т бөөгнөрч «хадуур шиг» зурвас гаргахгүй, мал бүрт areaPerAnimal м² зай
  const spread = Math.max(g.maxFlockSpread[a.species], 2 * Math.sqrt(((center?.n ?? 1) * (g.areaPerAnimal?.[a.species] ?? 0)) / Math.PI));
  const cohesion = g.cohesion[a.species];
  let best = scoreAt(cfg, state, a, a.x, a.z, quality, center, spread, cohesion);
  let bx = a.x, bz = a.z;
  // Хол газар хайх нь сүргийн шийдвэр (herds.ts). Энд зөвхөн ойрын цэгүүд
  for (let k = 0; k < g.samples; k++) {
    const ang = rng.range(0, Math.PI * 2);
    const r = rng.range(radius * 0.3, radius);
    const x = a.x + Math.cos(ang) * r;
    const z = a.z + Math.sin(ang) * r;
    // Мал бүр өөр өөр сонголттой (B11): бүгд яг нэг «шинэ» зурвас руу урагшлахгүй, бэлчээрийг хэсэг хэсгээр иднэ
    const s = scoreAt(cfg, state, a, x, z, quality, center, spread, cohesion) * (1 + (g.choiceNoise ?? 0) * rng.range(-1, 1));
    if (s > best) {
      best = s;
      bx = x;
      bz = z;
    }
  }
  a.tx = bx;
  a.tz = bz;
}

function scoreAt(
  cfg: GameConfig,
  state: GameState,
  a: Animal,
  x: number,
  z: number,
  quality: Record<string, number>,
  center: FlockCenter | undefined,
  spread: number,
  cohesion: number,
): number {
  const gr = state.grass;
  const i = cellIndex(gr, x, z);
  if (i < 0) return -1e9;
  // Гол, булаг дотор бэлчихгүй
  const w = cfg.camps.camps[state.campId]?.waterShape;
  if (w && waterDistance(w, x, z) < (w.kind === 'lineZ' ? cfg.pasture.grazing.herd.drinkBankOffset - 0.7 : w.r)) return -1e9;
  const minH = cfg.animals.species[a.species].minGrassCm;
  const b = absBiomass(cfg, gr, i);
  const edible = grassHeightCm(cfg, gr, i) >= minH ? b : 0;
  const q = quality[typeIdOf(gr, i)] ?? 0;
  let s = Math.pow(q, cfg.pasture.grazing.qualityExponent) * edible;
  if (center && center.n > 1) {
    const d = Math.hypot(x - center.x, z - center.z);
    if (d > spread / 2) s -= cohesion * (d - spread / 2);
  }
  // Үхэр хотоосоо хол явдаггүй (herd.maxHomeDistance)
  const maxD = cfg.pasture.grazing.herd.maxHomeDistance[a.species];
  const hd = Math.hypot(x, z);
  if (maxD && hd > maxD) s -= (hd - maxD) * 0.05;
  return s;
}

/** Алхмын чиглэлийг гүн ус, хилээс (ok) зайлуулж тойруулна (±0.7, ±1.4 рад); бүх чиглэл хаалттай бол байрандаа (гацалт илрүүлэгч шийднэ) */
function moveToward(a: Animal, speed: number, ok?: (x: number, z: number) => boolean): boolean {
  const dx = a.tx - a.x, dz = a.tz - a.z;
  const d = Math.hypot(dx, dz);
  if (d <= speed) {
    a.x = a.tx;
    a.z = a.tz;
    return true;
  }
  let ang = Math.atan2(dx, dz);
  if (ok && !ok(a.x + Math.sin(ang) * speed, a.z + Math.cos(ang) * speed)) {
    let found = false;
    for (const t of [0.7, -0.7, 1.4, -1.4]) {
      if (ok(a.x + Math.sin(ang + t) * speed, a.z + Math.cos(ang + t) * speed)) { ang += t; found = true; break; }
    }
    if (!found) return false;
  }
  a.x += Math.sin(ang) * speed;
  a.z += Math.cos(ang) * speed;
  a.heading = ang;
  return false;
}

/** Нэг минут: хөдлөх, идэх, цангах, ус уух */
export function grazingStep(
  cfg: GameConfig,
  state: GameState,
  rng: Rng,
  quality: Record<string, number>,
  centers: Map<number, FlockCenter>,
): void {
  const g = cfg.pasture.grazing;
  const th = cfg.animals.thirst;
  const minutesPerDay = activeDayMinutes(cfg.time);
  const grid = state.grass;
  const night = isNight(state.time, cfg.time);
  const ok = (x: number, z: number): boolean => inBounds(cfg, x, z);   // M6.8: хилээс гарахгүй (голыг гатлан алхаж болно)
  const okFlee = (x: number, z: number): boolean => isWalkable(cfg, state, x, z);   // айсан мал гүн усыг тойрно

  for (const a of state.animals) {
    if (a.riding) continue; // унаа морь уяан дээр (тэжээгдсэн гэж үзнэ)

    if (night) {
      // Шөнө (M4.5): идэхгүй, цангахгүй. Туугдаж, зугтаж дууссан мал хүрсэн газраа унтана
      if (a.mode === 'driven' || a.mode === 'flee') {
        a.drivenAt = state.step;
        if (moveToward(a, a.mode === 'flee' ? cfg.wolves.fear.speed : g.travelSpeed, a.mode === 'flee' ? okFlee : ok)) a.mode = 'sleep';
      } else if (a.mode !== 'sleep') {
        a.mode = 'sleep';
        a.tx = a.x;
        a.tz = a.z;
      }
      continue;
    }

    // Цангалт
    const sp = cfg.animals.species[a.species];
    a.thirst = Math.min(100, a.thirst + 100 / (sp.thirstDaysToFull * minutesPerDay));
    if (a.thirst >= 100) a.thirstMaxedToday = true;

    if ((state.step + a.id) % g.decisionEverySteps === 0) decide(cfg, state, rng, a, quality, centers);

    switch (a.mode) {
      case 'driven': {
        a.drivenAt = state.step;
        if (moveToward(a, g.travelSpeed, ok)) a.mode = 'graze';
        break;
      }
      case 'flee': {
        // Чоноос айж гүйнэ (туугдсантай адил: зугтсан газраа хэсэг үлдэнэ)
        a.drivenAt = state.step;
        const fx = a.x, fz = a.z;
        // Ус ууж байгаад гүн усанд айсан мал: гүехэн тал руугаа гатлан гарна (гүн рүү орохгүй) — эс бөгөөс зам хаагдаж гацна
        const d0 = okFlee(fx, fz) ? -1 : waterDepthAt(cfg, state.campId, fx, fz);
        const okWade = d0 < 0 ? okFlee : (x: number, z: number): boolean => okFlee(x, z) || (inBounds(cfg, x, z) && waterDepthAt(cfg, state.campId, x, z) < d0);
        if (moveToward(a, cfg.wolves.fear.speed, okWade)) a.mode = 'graze';
        else if (a.x === fx && a.z === fz) {   // M6.8: зам хаагдсан (гүн ус) — зугтахаа зогсооно; гүн усанд байвал ойрын эрэгт гаргана
          if (!okFlee(a.x, a.z)) {
            const p = nearestWalkable(cfg, state, a.x, a.z);
            a.x = p.x;
            a.z = p.z;
            state.stuckEvents++;
          }
          a.mode = 'graze';
          a.tx = a.x;
          a.tz = a.z;
        }
        break;
      }
      case 'trek': {
        if (moveToward(a, g.herd.trekSpeed, ok)) a.mode = 'graze';
        break;
      }
      case 'drink': {
        moveToward(a, g.travelSpeed, ok);
        if (Math.hypot(a.x - a.tx, a.z - a.tz) <= g.drinkRadius || waterDepthAt(cfg, state.campId, a.x, a.z) >= g.stuck.drinkDepth) {   // M6.8: эрэгт хүрмэгц ууна, гүн рүү орохгүй
          a.thirst = 0;
          a.mode = 'graze';
        }
        break;
      }
      case 'home': {
        // Орой хотондоо харьж байна (night.ts) — хүрээд хэвтэнэ
        if (moveToward(a, g.travelSpeed, ok)) a.mode = 'sleep';
        break;
      }
      case 'rest':
      case 'sleep':
        break;
      case 'graze': {
        const dist = Math.hypot(a.tx - a.x, a.tz - a.z);
        moveToward(a, dist > g.sampleRadius[a.species] ? g.roamSpeed : g.grazeSpeed, ok);
        eat(cfg, grid, a, quality, th);
        break;
      }
    }
  }
}

function eat(cfg: GameConfig, grid: GameState['grass'], a: Animal, quality: Record<string, number>, th: Record<string, number>): void {
  if (a.gutFill >= 1) return;
  const i = cellIndex(grid, a.x, a.z);
  if (i < 0) return;
  if (grassHeightCm(cfg, grid, i) < cfg.animals.species[a.species].minGrassCm) return;
  const g = cfg.pasture.grazing;
  const b = absBiomass(cfg, grid, i);
  let intake = g.imaxPerMinute * (b / (b + cfg.pasture.intakeHalfBiomass));
  if (a.thirst >= (th.eatSlowAt ?? 75)) intake *= th.eatSlowMult ?? 0.7;
  intake = Math.min(intake, 1 - a.gutFill);
  if (intake <= 0) return;
  a.gutFill += intake;
  a.dietSum += intake * (quality[typeIdOf(grid, i)] ?? 0);
  // Нүднээс өвс хасах: biomassPerGut = 1 хонин толгой бүтэн цадахад идэх бодит өвс (үхэр 6 дахин их иднэ)
  const maxB = cfg.pasture.types[typeIdOf(grid, i)]?.maxBiomass ?? 1;
  const removed = (intake * g.biomassPerGut * sheepUnits(a, cfg.animals)) / Math.max(maxB, 0.05);
  grid.biomass[i] = Math.max(0, (grid.biomass[i] ?? 0) - removed);
}

/** «Хөөе!» / туух: тухайн төрлийн малыг (x, z) руу туух */
export function driveFlock(_cfg: GameConfig, state: GameState, rng: Rng, species: Species, x: number, z: number): number {
  const key = flockKey(species);
  let n = 0;
  for (const a of state.animals) {
    if (a.riding || flockKey(a.species) !== key) continue;
    a.mode = 'driven';
    a.tx = x + rng.range(-4, 4);
    a.tz = z + rng.range(-4, 4);
    n++;
  }
  return n;
}
