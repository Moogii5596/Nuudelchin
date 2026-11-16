/**
 * Туух ба амьд мал (M6.9, A5 + B3). Three.js-гүй.
 *  - Татах (HA1): уураггүй алхахад `follow.radius` м доторх мал малчныг дагана.
 *  - Сүргийн удирдагч: сүрэг (хонь+ямаа, үхэр, адуу) бүрт ахмад эм мал; туухад бусад нь удирдагчийн зорилтыг дагана. Удирдагч үхэх/зарагдахад солигдоно.
 *  - Унаа морь: буухад уяагүй бол буусан газраасаа `horseGraze.radius` м дотор бэлчинэ; H-аар дуудахад ирнэ (herder.ts).
 *  - Нохой мал хариулахгүй, зөвхөн хамгаална (dogs.ts: мал руу зорилт өгөхгүй — тест барина).
 * Тоо `data/player.json → follow, horseGraze`. RNG-д хүрэхгүй (тэнцвэр, хадгалалтын үргэлжлэл).
 */
import type { GameConfig, Species } from '../config';
import type { Animal, GameState } from '../state';
import { flockKey } from './herds';
import { isNight } from '../clock';

const FLOCKS: Species[] = ['sheep', 'cow', 'horse'];
const FREE = new Set<Animal['mode']>(['graze', 'driven', 'trek', 'drink', 'rest']);

/** Сүргийн бүх (туслахынх биш, унаа биш) мал */
const flockOf = (state: GameState, key: Species): Animal[] => state.animals.filter((a) => !a.riding && a.ownerId === undefined && flockKey(a.species) === key);

/** Ахмад эм мал (нас их, тэнцвэл id бага); эм мал байхгүй бол ахмад мал */
function pickLeader(list: Animal[], adultAge: number): Animal | undefined {
  const better = (a: Animal, b: Animal): boolean => (a.age !== b.age ? a.age > b.age : a.id < b.id);
  let best: Animal | undefined, bestF: Animal | undefined;
  for (const a of list) {
    if (a.age < adultAge) continue;
    if (!best || better(a, best)) best = a;
    if (a.sex === 'f' && (!bestF || better(a, bestF))) bestF = a;
  }
  return bestF ?? best;
}

/** Удирдагчид хүчинтэй эсэхийг шалгаж, алга/зарагдсан/үхсэн бол дахин сонгоно. Өөрчлөгдсөн сүргийн тоог буцаана */
export function refreshLeaders(cfg: GameConfig, state: GameState): number {
  let changed = 0;
  for (const key of FLOCKS) {
    const list = flockOf(state, key);
    const cur = state.leaders[key];
    if (cur !== undefined && list.some((a) => a.id === cur)) continue;
    const lead = pickLeader(list, cfg.animals.species[key].adultAge);
    if (lead) { state.leaders[key] = lead.id; changed++; }
    else if (cur !== undefined) { delete state.leaders[key]; changed++; }
  }
  return changed;
}

export const leaderOf = (state: GameState, species: Species): Animal | undefined => {
  const id = state.leaders[flockKey(species)];
  return id === undefined ? undefined : state.animals.find((a) => a.id === id);
};

/**
 * Туугдаж буй сүргийн дагагчид удирдагчийн зорилтыг (өөрийн бөөгнөрлийн офсетоор) дагана. Удирдагч өөрөө эхэлж хөдөлнө:
 * удирдагч туугдаагүй бол дагагчдын зорилтыг өөрчлөхгүй.
 */
export function followLeaders(cfg: GameConfig, state: GameState): void {
  const spread = cfg.player.follow.leaderSpread, range = cfg.player.follow.leaderRange;
  for (const key of FLOCKS) {
    const lead = leaderOf(state, key);
    if (!lead || lead.mode !== 'driven') continue;
    for (const a of state.animals) {
      if (a === lead || a.riding || a.ownerId !== undefined || a.mode !== 'driven' || flockKey(a.species) !== key) continue;
      if (Math.abs(a.x - lead.x) > range || Math.abs(a.z - lead.z) > range) continue;
      a.tx = lead.tx + (a.x - lead.x) * spread;
      a.tz = lead.tz + (a.z - lead.z) * spread;
    }
  }
}

/** Малчин алхаж байхад уураггүй бол ойрын мал дагана («татах»). `moved` = энэ алхамд малчин хөдөлсөн зай */
export function followHerder(cfg: GameConfig, state: GameState, moved: number): number {
  const p = state.player, F = cfg.player.follow;
  if (p.away || p.mounted || p.holdingUurga || moved < F.minMove || isNight(state.time, cfg.time)) return 0;   // шөнө мал унтана
  const bx = p.x - Math.sin(p.heading) * F.behind, bz = p.z - Math.cos(p.heading) * F.behind;
  let n = 0;
  for (const a of state.animals) {
    if (a.riding || a.ownerId !== undefined || !FREE.has(a.mode)) continue;
    if (Math.abs(a.x - p.x) > F.radius || Math.abs(a.z - p.z) > F.radius) continue;
    if (Math.hypot(a.x - p.x, a.z - p.z) > F.radius) continue;
    a.mode = 'driven';   // туугдсантай ижил хөдөлгөөн (herds.ts: туугдсан газраа хэсэг үлдэнэ)
    a.tx = bx + (a.x - p.x) * F.spread;
    a.tz = bz + (a.z - p.z) * F.spread;
    n++;
  }
  return n;
}

/** Хүн-бус санамсаргүй (RNG-гүй, тогтмол): (алхам, id)-аас [-1, 1] */
const hash = (a: number, b: number): number => {
  let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 2147483648 - 1;
};

/** Уяагүй унаа морь (буусан): буусан газраасаа radius м дотор алхаж бэлчинэ */
export function horseGrazeStep(cfg: GameConfig, state: GameState, horse: Animal): void {
  const G = cfg.player.horseGraze;
  if (horse.hx === undefined || horse.hz === undefined) { horse.hx = horse.x; horse.hz = horse.z; }
  if ((state.step + horse.id) % G.every === 0) {
    const ang = hash(state.step, horse.id) * Math.PI, r = Math.abs(hash(horse.id, state.step)) * G.radius;
    horse.tx = horse.hx + Math.sin(ang) * r;
    horse.tz = horse.hz + Math.cos(ang) * r;
  }
  const dx = horse.tx - horse.x, dz = horse.tz - horse.z, d = Math.hypot(dx, dz);
  if (d < 1e-6) return;
  const s = Math.min(G.speed, d);
  horse.x += (dx / d) * s;
  horse.z += (dz / d) * s;
  horse.heading = Math.atan2(dx, dz);
}
