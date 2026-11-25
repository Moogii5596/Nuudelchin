/**
 * Мал гацахгүй, аюул руу гүйхгүй (M6.8, A1). Three.js-гүй.
 *  - `isWalkable`: мал гүн ус, дэлхийн хилээс гадуур орохгүй (голын эрэг/булаг ойролцоо л тооцно — алс цэг дээр үнэ төлбөргүй)
 *  - `safeFleeTarget`: үргэсэн мал чонын үүр, гүн ус руу гүйхгүй — чиглэлийг эргүүлж аюулгүй цэг сонгоно (санамсаргүй тоо зарцуулахгүй)
 *  - `detectStuck`: зорилготой мал N алхам < minMove м хөдлөөгүй бол ойрын чөлөөтэй цэг рүү шилжүүлж `state.stuckEvents`-д бүртгэнэ
 * Тоо `data/pasture.json → grazing.stuck`.
 */
import { gerRadiusFor } from './gerLayout';
import type { GameConfig } from '../config';
import type { Animal, GameState } from '../state';
import { heightAt, waterDistance, waterLevel } from '../terrain';

export interface StuckConfig {
  /** Хэдэн алхам (тоглоомын минут) хөдлөөгүй бол гацсан гэх */
  steps: number;
  /** Энэ зайнаас бага хөдөлсөн бол «хөдлөөгүй» (м) */
  minMove: number;
  /** Зорилго хүртэлх зай энэ хэмжээнээс бага бол гацаагүй (бэлчиж байна) */
  minGoal: number;
  /** Мал энэ гүнд (м) хүрмэгц уугаад цангаа тайлна */
  drinkDepth: number;
  /** Усны гүн (м) — үүнээс гүн бол АЙСАН (зугтаж буй) мал ордоггүй; ердийн үед гатлан алхаж болно */
  deepWater: number;
  /** Ойрын чөлөөтэй цэг хайх алхам, дээд зай (м) */
  searchStep: number;
  searchMax: number;
  /** Зугтах чиглэлийг эргүүлэх оролдлого (радиан) */
  fleeTurns: number[];
  /** Чонын үүрнээс энэ зайд (үүрний радиус дээр нэмж) зугтахгүй */
  denMargin: number;
}

export const stuckCfg = (cfg: GameConfig): StuckConfig => cfg.pasture.grazing.stuck;

/** Усны гүн (м): усны гадаргуугаас газрын өндрийг хасна. Эрэг дээр сөрөг/тэг */
export function waterDepthAt(cfg: GameConfig, campId: string, x: number, z: number): number {
  const camp = cfg.camps.camps[campId];
  if (!camp) return 0;
  const w = camp.waterShape;
  // Хурдан татгалзалт: ус хүртэлх зай голын эрэг/булагийн нөлөөллөөс их бол гүн ус биш
  const reach = w.kind === 'lineZ' ? camp.terrain.riverBank ?? 8 : w.r * 3;
  if (waterDistance(w, x, z) > reach) return 0;
  return Math.max(0, waterLevel(camp) - heightAt(camp, x, z));
}

/** Дэлхийн хилийн дотор уу (мал хилээс гарахгүй) */
export function inBounds(cfg: GameConfig, x: number, z: number): boolean {
  return Math.sqrt((x) * (x) + (z) * (z)) <= cfg.player.worldRadius - 4;
}

/**
 * Аюулгүй цэг: хилийн дотор БА гүн усгүй. Мал голыг гатлан алхаж болно (бэлчээр, хотлох) — гүн усыг зөвхөн ЗУГТАХ үед (safeFleeTarget,
 * flee хөдөлгөөн) тойрно, учир нь айсан мал голд шумбаж болохгүй.
 */
export function isWalkable(cfg: GameConfig, state: GameState, x: number, z: number): boolean {
  return inBounds(cfg, x, z) && waterDepthAt(cfg, state.campId, x, z) <= stuckCfg(cfg).deepWater;
}

/** Чонын үүрний нутаг (радиус + margin) дотор уу */
export function nearDen(cfg: GameConfig, state: GameState, x: number, z: number): boolean {
  const m = stuckCfg(cfg).denMargin;
  for (const d of state.wolves.dens) if (Math.sqrt((x - d.x) * (x - d.x) + (z - d.z) * (z - d.z)) < d.r + m) return true;
  return false;
}

/** Ойрын чөлөөтэй (гүн усгүй, хилийн дотор) цэг: өөрөөс нь тойрог хэлбэрээр өргөжүүлж хайна */
export function nearestWalkable(cfg: GameConfig, state: GameState, x: number, z: number): { x: number; z: number } {
  if (isWalkable(cfg, state, x, z)) return { x, z };
  const c = stuckCfg(cfg);
  for (let r = c.searchStep; r <= c.searchMax; r += c.searchStep) {
    const n = Math.max(8, Math.round((2 * Math.PI * r) / c.searchStep));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * Math.PI, px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r;
      if (isWalkable(cfg, state, px, pz)) return { x: px, z: pz };
    }
  }
  return { x: 0, z: 0 };   // бууцны төв — ямагт чөлөөтэй
}

/**
 * Зугтах зорилтот цэг: (x, z)-ээс `ang` чиглэлд `d` м. Төгсгөл, дундаж цэг нь чөлөөтэй (гүн усгүй) ба чонын үүрнээс хол биш бол
 * чиглэлийг fleeTurns-ээр эргүүлнэ; бүгд аюултай бол хамгийн сайн нь (богиносгож). RNG-д хүрэхгүй: тэнцвэр, анхны чиглэл хэвээр.
 */
export function safeFleeTarget(cfg: GameConfig, state: GameState, x: number, z: number, ang: number, d: number): { tx: number; tz: number } {
  const turns = stuckCfg(cfg).fleeTurns;
  const ok = (a: number, dist: number): { tx: number; tz: number } | null => {
    const tx = x + Math.sin(a) * dist, tz = z + Math.cos(a) * dist;
    const n = Math.max(2, Math.ceil(dist / 3));   // зам дагуу 3 м тутамд: гүн усны туузыг гатлахгүй
    for (let k = 1; k <= n; k++) if (!isWalkable(cfg, state, x + Math.sin(a) * dist * (k / n), z + Math.cos(a) * dist * (k / n))) return null;
    return !nearDen(cfg, state, tx, tz) ? { tx, tz } : null;
  };
  for (const t of turns) {
    const r = ok(ang + t, d);
    if (r) return r;
  }
  for (const k of [0.6, 0.35]) for (const t of turns) {   // богино зайд
    const r = ok(ang + t, d * k);
    if (r) return r;
  }
  return { tx: x, tz: z };   // аюулгүй зам алга — байрандаа (дараа нь гацалт илрүүлэгч, сүргийн шийдвэр)
}

const MOVING = new Set<Animal['mode']>(['graze', 'driven', 'flee', 'trek', 'drink', 'home']);

/**
 * Гацалт илрүүлэгч (алхам бүр). Зорилго нь minGoal-оос хол ч N алхам < minMove м хөдөлсөн мал → ойрын чөлөөтэй цэгт шилжүүлнэ.
 * Буцаах: энэ алхамд шилжүүлсэн малын тоо (state.stuckEvents-д нэмэгдэнэ).
 */
export function detectStuck(cfg: GameConfig, state: GameState): number {
  const c = stuckCfg(cfg);
  let n = 0;
  for (const a of state.animals) {
    if (a.riding || !MOVING.has(a.mode)) { if (a.sn) a.sn = 0; continue; }
    const gx = a.tx - a.x, gz = a.tz - a.z;
    if (gx * gx + gz * gz <= c.minGoal * c.minGoal) { a.sn = 0; a.sx = a.x; a.sz = a.z; continue; }
    if (a.sx === undefined || a.sz === undefined || (a.x - a.sx) * (a.x - a.sx) + (a.z - a.sz) * (a.z - a.sz) >= c.minMove * c.minMove) {
      a.sx = a.x; a.sz = a.z; a.sn = 0;
      continue;
    }
    a.sn = (a.sn ?? 0) + 1;
    if (a.sn >= c.steps) {
      const p = nearestWalkable(cfg, state, a.x, a.z);
      a.x = p.x; a.z = p.z; a.tx = p.x; a.tz = p.z;
      a.mode = 'graze';
      a.sn = 0; a.sx = p.x; a.sz = p.z;
      state.stuckEvents++;
      n++;
    }
  }
  return n;
}

// ======================= T-18: бууцны саад (гэр, майхан, туслахын байр) =======================

export interface CampObstacle { x: number; z: number; r: number }

/**
 * Гэрийн бууцны хатуу саадууд (тойрог): тоглогчийн гэр/майхан, нэмэлт гэрүүд, туслахын гэр/майхан, адуучны майхан.
 * Малчин, жолоодож буй тээвэр эдгээрийг нэвтлэхгүй (input/controller.ts); малыг зурахдаа тойруулна (render/animals.ts).
 * Sim-ийн малын хөдөлгөөн өөрчлөгдөхгүй (тэнцвэр, seed хэвээр).
 */
export function campObstacles(cfg: GameConfig, state: GameState): CampObstacle[] {
  const home = cfg.camps.home, I = cfg.interiors;
  const out: CampObstacle[] = [];
  out.push({ x: home.x, z: home.z, r: state.home === 'ger' ? gerRadiusFor(cfg.ger, home.gerRadius, state.homeSize) : home.tentRadius });
  for (const g of state.extraGers) out.push({ x: g.x, z: g.z, r: gerRadiusFor(cfg.ger, home.gerRadius, g.size) });
  for (const d of state.helpers.dwellings) {
    const scale = I.dwellingScale[d.kind];
    out.push({ x: d.x, z: d.z, r: scale !== undefined ? I.dwellingBaseRadius * scale : home.tentRadius });
  }
  return out;
}

/** (x, z)-г саадуудаас гадагш түлхэнэ (саадын радиус + margin). Төвд яг давхцвал +z тийш. hit = түлхэгдсэн эсэх */
export function pushOutOfObstacles(obs: readonly CampObstacle[], x: number, z: number, margin: number): { x: number; z: number; hit: boolean } {
  let hit = false;
  for (let pass = 0; pass < 2; pass++) {   // зэргэлдээ хоёр гэрийн завсарт нэг дахин
    for (const o of obs) {
      const r = o.r + margin, dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz);
      if (d >= r) continue;
      hit = true;
      if (d < 1e-6) { z = o.z + r; x = o.x; } else { x = o.x + (dx / d) * r; z = o.z + (dz / d) * r; }
    }
  }
  return { x, z, hit };
}

