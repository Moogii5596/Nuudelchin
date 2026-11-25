/**
 * Утасны HUD 2-ын «юу ойрхон байна» логик (цэвэр функц: DOM, Three.js үгүй; тест tests/hud2Context.test.ts).
 * Алтан контекст товч: ойрхон байгаа зүйлсийн жагсаалт (хамгийн ойрх нь эхэнд). Horse товч: дуудах / унах / буух.
 * Зай, босго бүгд тоглоомын тохиргооноос (player.mountRange, vehicles.road.enterRange, interiors.enterR, products.pickupRadius).
 */
import type { GameConfig } from '../../sim/config';
import type { GameState } from '../../sim/state';
import { horseInScene, ridingHorse } from '../../sim/systems/herder';
import { nearestVehicle } from '../../sim/systems/travel';
import { atExit, interiorService, nearEnterDoor } from '../../sim/systems/interior';
import { nearLotSlot, nearTradeDoor } from '../../sim/systems/sumtown';
import { nearTownDoor } from '../../sim/systems/town';
import { nearTeahouse } from '../../sim/systems/helpers';
import { nearTrader } from '../../sim/systems/trader';
import { driverSendTarget } from '../controller';
import { huntingWolves } from '../../sim/systems/wolves';

export type TargetKind =
  | 'scare' | 'mount' | 'cart' | 'exitCart' | 'send' | 'enter' | 'exit' | 'service' | 'pickup' | 'deposit' | 'trade' | 'gallop' | 'fast';

export interface Target {
  kind: TargetKind;
  /** Тоглогчоос зай (м); дарж байх үйлдэл (давхих) үргэлж эхэнд (-1) */
  d: number;
  /** Объект дээрх тэмдгийн байрлал (байхгүй бол тэмдэггүй) */
  at?: { x: number; z: number; h: number };
  /** Дарж байх хугацаанд үйлчилнэ (давхих, зураг дээр хурдлах) */
  hold?: boolean;
  /** Нэмэлт нэр (тээврийн id, хаалганы id) — шошгонд */
  ref?: string;
}

export type HorseMode = 'none' | 'call' | 'coming' | 'mount' | 'dismount';

const dist = (a: { x: number; z: number }, b: { x: number; z: number }): number => Math.hypot(a.x - b.x, a.z - b.z);

/** Horse товчны төлөв: хол → дуудах, ойр → унах, унасан → буух */
export function horseMode(cfg: GameConfig, st: GameState): HorseMode {
  const p = st.player;
  if (p.place === 'map' || st.move || p.driving || p.interior) return 'none';
  const horse = ridingHorse(st);
  if (!horse) return 'none';
  if (p.mounted) return 'dismount';
  if (!horseInScene(st)) return 'none';
  if (dist(horse, p) <= cfg.player.mountRange) return 'mount';
  return p.horseCalled ? 'coming' : 'call';
}

/** Сумын төвд худалдаа/үйлчилгээний цэгийн дэргэд байна уу (цонх нээх) */
function tradeSpot(cfg: GameConfig, st: GameState): { x: number; z: number } | true | null {
  const door = nearTradeDoor(cfg, st);
  if (door) return { x: door.x, z: door.z };
  return nearTownDoor(cfg, st) || nearTrader(cfg, st) || nearLotSlot(cfg, st) || nearTeahouse(cfg, st) ? true : null;
}

/** Чоно ойртсон: мал хөөж байгаа, эсвэл үргээх зайд чоно байна (хуучин утасны «Үргээх» товчны нөхцөл) */
export function wolfNear(cfg: GameConfig, st: GameState): boolean {
  const p = st.player;
  if (p.place !== 'camp' || p.away || p.driving || p.interior || st.move) return false;
  const r = cfg.wolves.scareRadius[p.mounted ? 'mounted' : 'onFoot'];
  return huntingWolves(st).length > 0 || st.wolves.list.some((w) => w.mode !== 'flee' && dist(w, p) <= r);
}

/** Алтан товчны жагсаалт: ойрхон байгаа зүйлс, хамгийн ойрх нь эхэнд. Хоосон бол товч бүдэг */
export function contextTargets(cfg: GameConfig, st: GameState, pickupReach: number): Target[] {
  const p = st.player;
  if (st.move) return [];
  if (p.place === 'map') return [{ kind: 'fast', d: -1, hold: true }];
  if (p.interior) {
    const out: Target[] = [];
    if (atExit(cfg, st)) out.push({ kind: 'exit', d: 0 });
    if (interiorService(cfg, st)) out.push({ kind: 'service', d: 0.1 });
    return out;
  }
  const out: Target[] = [];
  if (wolfNear(cfg, st)) out.push({ kind: 'scare', d: -2 });   // аюул: бүхнээс түрүүлнэ (морьтой үед ч)
  const sumTrade = (): void => {
    if (p.place !== 'sum') return;
    const s = tradeSpot(cfg, st);
    if (s === true) out.push({ kind: 'trade', d: 0 });
    else if (s) out.push({ kind: 'trade', d: dist(s, p), at: { ...s, h: 2.6 } });
  };
  if (p.driving) {
    out.push({ kind: 'exitCart', d: 0, ref: p.driving });
    sumTrade();
    return out.sort((a, b) => a.d - b.d);
  }
  if (p.mounted) {
    out.push({ kind: 'gallop', d: -1, hold: true });
    sumTrade();
    return out.sort((a, b) => a.d - b.d);
  }
  const horse = ridingHorse(st);
  if (horse && horseInScene(st) && dist(horse, p) <= cfg.player.mountRange) {
    out.push({ kind: 'mount', d: dist(horse, p), at: { x: horse.x, z: horse.z, h: 2.5 } });
  }
  const v = nearestVehicle(cfg, st, cfg.vehicles.road.enterRange);
  if (v) {
    out.push({ kind: 'cart', d: dist(v, p), at: { x: v.x, z: v.z, h: 2.4 }, ref: v.id });
    if (driverSendTarget(cfg, st)) out.push({ kind: 'send', d: dist(v, p) + 0.01, ref: v.id });
  }
  const door = p.place === 'sum' && nearLotSlot(cfg, st) ? null : nearEnterDoor(cfg, st);
  if (door) out.push({ kind: 'enter', d: dist(door, p), at: { x: door.x, z: door.z, h: 2.6 }, ref: door.id });
  if (p.place === 'camp' && !p.away) {
    const R = cfg.products.pickupRadius * pickupReach;
    let best: { x: number; z: number } | null = null, bd = R;
    for (const it of st.items) {
      const d = dist(it, p);
      if (d <= bd) { bd = d; best = it; }
    }
    if (best) out.push({ kind: 'pickup', d: bd, at: { x: best.x, z: best.z, h: 0.9 } });
    const home = cfg.camps.home;
    if (p.carry.length && dist(home, p) <= home.storageRadius) out.push({ kind: 'deposit', d: dist(home, p) });
  }
  sumTrade();
  return out.sort((a, b) => a.d - b.d);
}
