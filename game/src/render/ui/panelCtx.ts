/** Цонхнуудын нийтлэг төрөл, төлөв (panels.ts-ийн хуваалт, T-25) */
import type { SleepPanel } from './sleepPanel';
import { SPECIES, type GameConfig, type Species } from '../../sim/config';
import type { Animal, GameState, ProductId, VehicleId } from '../../sim/state';
import type { Command, CommandResult } from '../../sim/commands';
import type { DayReport } from '../../sim/sim';
import { playerOwned } from '../../sim/systems/helpers';
import { speciesEmoji, stageName } from './names';
import type { Msg } from '../../sim/msg';

export type Kind = 'storage' | 'cargo' | 'shop' | 'lot' | 'town' | 'arrive' | 'report' | 'dogs' | 'camps' | 'cheat' | 'teahouse' | 'helpers' | 'milestones' | 'ceremony' | 'trader' | 'log';

/** Туслахуудын цонхны дэд хэсэг: жагсаалт, отор явуулах, малаар цалинжуулах */
export interface HelperView {
  mode: 'list' | 'otor' | 'pay';
  helper: number;
  camp: string;
  counts: Record<string, number>;
}

export interface Draft {
  vehicle: VehicleId | null;    // ачих тээвэр (null = гартаа/морьтой)
  /** Тэрэг/машины дэргэд нээсэн: зөвхөн тэрэгт ачих, буулгах, сум руу явуулах (гарт авах хэсэггүй) */
  atVehicle?: boolean;
  take: Partial<Record<ProductId, number>>;   // агуулахаас гартаа
  sell: Partial<Record<ProductId, number>>;   // ачих (хотонд) эсвэл зарах (сумын төвд)
  sellGroups: Record<string, number>;
  buyAnimals: Record<string, number>;
  buyItems: Set<string>;
  hay: number;                   // авах боодол өвс (M5.5)
}

/** Мэдэгдлийн текстийг HTML-д аюулгүй болгоно */
export const esc = (x: string): string => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface UiHooks {
  dispatch: (cmd: Command) => CommandResult;
  toast: (msg: string | Msg, kind?: '' | 'good' | 'bad') => void;
  /** Хамгаалалтын бүс харуулах (Z) — cheat цэснээс */
  toggleZones?: () => boolean;
  /** FPS/draw/tris самбар (анхдагчаар нуугдсан) — cheat цэснээс асаана/унтраана */
  perf?: { on: () => boolean; toggle: () => void };
}

export interface PanelCtx {
  readonly cfg: GameConfig;
  readonly state: GameState;
  readonly hooks: UiHooks;
  draft: Draft | null;
  tr: { sell: Partial<Record<ProductId, number>>; hay: number };
  hv: HelperView;
  bankAmt: number;
  arriveCamp: string;
  logTab: 'notes' | 'report';
  logIdx: number;
  report: DayReport | null;
  readonly sleep: SleepPanel;
}

// ======================= сумын төв =======================
export function animalGroups(pn: PanelCtx, src: Animal[] = pn.state.animals): { key: string; label: string; list: Animal[] }[] {
  const groups = new Map<string, { key: string; label: string; list: Animal[] }>();
  for (const a of src) {
    if (a.riding || !playerOwned(a)) continue;   // туслахын малыг тоглогч зарж, ачиж чадахгүй
    const label = stageName(pn.cfg, a.species, a.sex, a.age);
    const key = `${a.species}|${a.sex}|${label}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, label: `${speciesEmoji(a.species)} ${label}`, list: [] };
      groups.set(key, g);
    }
    g.list.push(a);
  }
  const order = (k: string) => SPECIES.indexOf(k.split('|')[0] as Species);
  return [...groups.values()].sort((a, b) => order(a.key) - order(b.key) || a.label.localeCompare(b.label));
}


export function selectedAnimals(pn: PanelCtx, groups: { key: string; list: Animal[] }[]): Animal[] {
  const d = pn.draft!;
  const out: Animal[] = [];
  for (const g of groups) out.push(...g.list.slice().sort((a, b) => b.age - a.age).slice(0, d.sellGroups[g.key] ?? 0));
  return out;
}
