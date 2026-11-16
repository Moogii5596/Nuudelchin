/**
 * Замын тэмдэг, олон давхар сэдэл (M6.5, mvp-spec §10.2). Шахахгүй, «амжаагүй» сануулгагүй. Тоо, нөхцөл `data/milestones.json`.
 * Өдрийн 20:00-д (sim.ts endDay) `checkMilestones` шалгаж, шинээр хүрсэнийг `state.milestones.reached`-д (өдрөөр) тэмдэглэнэ;
 * ёслолтой (ceremony) үе шат бол `state.milestones.ceremony`-д хүлээлгэнэ → UI баярын мөч → `ackCeremony` команд.
 */
import type { GameConfig } from '../config';
import type { GameState } from '../state';
import { herdSheepUnits } from './animals';
import { goalGerReached } from './gerLayout';
import { seasonOf } from './seasons';

export interface Stats {
  /** Худалдаанаас (бүтээгдэхүүн, мал) нийт орлого */
  salesIncome: number;
  income: number;
  expenses: number;
  births: number;
  deaths: number;
  /** Чонод алдсан мал */
  wolfLost: number;
  /** Дууссан бууц нүүдэл */
  moves: number;
  /** Өдөр бүрийн мөнгө, хонин толгой (график) */
  daily: { day: number; money: number; sheepUnits: number }[];
}

export interface MilestoneState {
  /** id → хүрсэн өдөр */
  reached: Record<string, number>;
  /** Баярын мөч хүлээгдэж байгаа (хэрэглэгч «Үргэлжлүүлэх» дарах хүртэл) */
  ceremony: { id: string; day: number } | null;
}

export function newStats(): Stats {
  return { salesIncome: 0, income: 0, expenses: 0, births: 0, deaths: 0, wolfLost: 0, moves: 0, daily: [] };
}
export function newMilestones(): MilestoneState {
  return { reached: {}, ceremony: null };
}

export interface MilestoneDef {
  id: string;
  cond: Record<string, unknown>;
  ceremony?: boolean;
}
export interface MilestonesConfig {
  stages: MilestoneDef[];
  firsts: MilestoneDef[];
  seasonGoals: Record<string, { hay?: number; shed?: boolean; births?: number }>;
  dailyHistoryMax: number;
}

/** "economy.goalSheepUnits" мэт заалтыг тоо болгоно */
function num(cfg: GameConfig, v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.startsWith('economy.')) return Number((cfg.economy as unknown as Record<string, number>)[v.slice(8)]);
  return Number.NaN;
}

const SPECIES_KINDS = (state: GameState): number => new Set(state.animals.filter((a) => !a.riding && a.ownerId === undefined).map((a) => a.species)).size;

/** Нөхцөл бүр биелсэн эсэх (хоосон нөхцөл = үргэлж) */
export function conditionMet(cfg: GameConfig, state: GameState, cond: Record<string, unknown>): boolean {
  for (const [k, v] of Object.entries(cond)) {
    switch (k) {
      case 'sheepUnits': if (!(herdSheepUnits(state, cfg.animals) >= num(cfg, v))) return false; break;
      case 'gerWalls': if (!(goalGerReached({ ger: cfg.ger, economy: { goalGerWalls: num(cfg, v) } }, state))) return false; break;
      case 'speciesKinds': if (!(SPECIES_KINDS(state) >= Number(v))) return false; break;
      case 'helpers': if (!(state.helpers.list.length >= Number(v))) return false; break;
      case 'animals': if (!(state.animals.length >= Number(v))) return false; break;
      case 'vehicle': if (!state.vehicles.includes(v as never)) return false; break;
      case 'stat': {
        const s = v as { name: keyof Stats; min: number };
        if (!(Number(state.stats[s.name]) >= s.min)) return false;
        break;
      }
      case 'winterPassed': {
        // эхний жилийн өвөл өнгөрсөн: улирлын дарааллын «winter»-ийн дараах өдөр
        const order = cfg.seasons.order, days = cfg.seasons.days;
        let end = 0;
        for (const sn of order) { end += days[sn]; if (sn === 'winter') break; }
        if (!(state.time.day > end)) return false;
        break;
      }
      default: return false;
    }
  }
  return true;
}

export interface Reached { id: string; kind: 'stage' | 'first'; ceremony: boolean }

/** Өдрийн 20:00-д дуудна. Шинээр хүрсэн замын тэмдгүүдийг тэмдэглэж буцаана (нэг тэмдэг нэг л удаа) */
export function checkMilestones(cfg: GameConfig, state: GameState, day: number): Reached[] {
  const M = cfg.milestones, out: Reached[] = [];
  const ms = state.milestones;
  for (const [kind, defs] of [['stage', M.stages], ['first', M.firsts]] as const) {
    for (const d of defs) {
      if (ms.reached[d.id] !== undefined || !conditionMet(cfg, state, d.cond)) continue;
      ms.reached[d.id] = day;
      out.push({ id: d.id, kind, ceremony: !!d.ceremony });
      if (d.ceremony && !ms.ceremony) ms.ceremony = { id: d.id, day };
    }
  }
  return out;
}

/** Өдөр бүрийн статистик (график, ёслолын мэдээлэл) */
export function recordDay(cfg: GameConfig, state: GameState, day: number, sheepUnits: number): void {
  const d = state.stats.daily;
  d.push({ day, money: Math.round(state.money), sheepUnits: Math.round(sheepUnits * 10) / 10 });
  while (d.length > cfg.milestones.dailyHistoryMax) d.shift();
}

export interface GoalProgress { key: string; have: number; need: number; done: boolean }

/** Улирлын зөөлөн зорилт (заавал биш, өвөө эмээгийн зөвлөгөө): одоогийн улирлын жагсаалт, байхгүй бол null */
export function seasonGoal(cfg: GameConfig, state: GameState): { season: string; items: GoalProgress[] } | null {
  const season = seasonOf(cfg, state.time.day);
  const g = cfg.milestones.seasonGoals[season];
  if (!g) return null;
  const camp = state.camps[state.campId];
  const items: GoalProgress[] = [];
  if (g.hay !== undefined) items.push({ key: 'hay', have: Math.floor(camp?.hay ?? 0), need: g.hay, done: (camp?.hay ?? 0) >= g.hay });
  if (g.shed) { const sh = cfg.camps.camps[state.campId]?.shed ? 1 : 0; items.push({ key: 'shed', have: sh, need: 1, done: sh === 1 }); }
  if (g.births !== undefined) items.push({ key: 'births', have: Math.min(state.stats.births, g.births), need: g.births, done: state.stats.births >= g.births });
  return { season, items };
}

/** HUD: урт замын одоогийн үе шатны хөгжил — дараагийн (хараахан хүрээгүй) эхний үе шат ба нөхцлийн хувь */
export function nextStage(cfg: GameConfig, state: GameState): { id: string; parts: GoalProgress[] } | null {
  for (const d of cfg.milestones.stages) {
    if (state.milestones.reached[d.id] !== undefined) continue;
    const parts: GoalProgress[] = [];
    for (const [k, v] of Object.entries(d.cond)) {
      if (k === 'sheepUnits') { const have = herdSheepUnits(state, cfg.animals), need = num(cfg, v); parts.push({ key: 'sheep', have: Math.floor(have), need, done: have >= need }); }
      else if (k === 'gerWalls') { const need = num(cfg, v), have = state.home === 'ger' ? cfg.ger.sizes[state.homeSize]?.walls ?? 0 : 0; parts.push({ key: 'ger', have, need, done: have >= need }); }
      else if (k === 'speciesKinds') { const have = SPECIES_KINDS(state); parts.push({ key: 'kinds', have, need: Number(v), done: have >= Number(v) }); }
      else if (k === 'helpers') { const have = state.helpers.list.length; parts.push({ key: 'helpers', have, need: Number(v), done: have >= Number(v) }); }
      else if (k === 'animals') { const have = state.animals.length; parts.push({ key: 'animals', have, need: Number(v), done: have >= Number(v) }); }
    }
    return { id: d.id, parts };
  }
  return null;
}

const KNOWN = ['sheepUnits', 'gerWalls', 'speciesKinds', 'helpers', 'animals', 'vehicle', 'stat', 'winterPassed'];

/** data/milestones.json шалгагч */
export function validateMilestones(cfg: GameConfig): string[] {
  const e: string[] = [];
  const M = cfg.milestones;
  if (!M || !Array.isArray(M.stages) || !Array.isArray(M.firsts)) return ['milestones: stages, firsts массив байх ёстой'];
  const seen = new Set<string>();
  for (const [grp, defs] of [['stages', M.stages], ['firsts', M.firsts]] as const) {
    for (const d of defs) {
      if (!d.id || seen.has(d.id)) e.push(`milestones.${grp}: id "${d.id}" давхардсан/хоосон`);
      seen.add(d.id);
      for (const [k, v] of Object.entries(d.cond ?? {})) {
        if (!KNOWN.includes(k)) e.push(`milestones.${d.id}: мэдэгдэхгүй нөхцөл "${k}"`);
        if ((k === 'sheepUnits' || k === 'gerWalls') && Number.isNaN(num(cfg, v))) e.push(`milestones.${d.id}.${k}: тоо эсвэл "economy.<түлхүүр>" байх ёстой`);
        if (k === 'stat' && !(v as { name?: string }).name) e.push(`milestones.${d.id}.stat: name, min`);
      }
    }
  }
  if (!(M.dailyHistoryMax > 0)) e.push('milestones.dailyHistoryMax > 0');
  return e;
}
