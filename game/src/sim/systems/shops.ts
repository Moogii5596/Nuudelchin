/**
 * Дэлгүүр, үйлчилгээний ажлын цаг — `data/shops.json`. Three.js-гүй, цэвэр функцүүд.
 * Хаалттай үед худалдаа/үйлчилгээний цонх нээгдэхгүй; автомат аялал нээгдэх хүртэл хүлээнэ.
 * `minuteOfDay` нь тоглоомын minute (360 = 06:00 … 1800 = дараа өглөөний 06:00); 24 цагаас хойших цагийг 0–24-д буулгана.
 */
import type { GameConfig } from '../config';
import type { SumDoor } from './sumtown';
import { sumDoors } from './sumtown';
import type { Msg } from '../msg';
import { m } from '../msg';

export interface ShopHours {
  open: number;    // цаг (0–24)
  close: number;
}

export interface ShopsConfig {
  default: ShopHours;
  byRole: Record<string, ShopHours>;
  byId: Record<string, ShopHours>;
}

/** Хаалганы id/үүргээр ажлын цагийг олно */
export function shopHours(cfg: GameConfig, shopId: string): ShopHours {
  const S = cfg.shops;
  const byId = S.byId[shopId];
  if (byId) return byId;
  const role = sumDoors(cfg).find((d) => d.id === shopId)?.role ?? shopId;
  return S.byRole[role] ?? S.default;
}

function hourOf(minuteOfDay: number): number {
  return (((minuteOfDay / 60) % 24) + 24) % 24;
}

/** Энэ минутад дэлгүүр нээлттэй эсэх (цэвэр функц) */
export function isOpen(cfg: GameConfig, shopId: string, minuteOfDay: number): boolean {
  const h = shopHours(cfg, shopId);
  const x = hourOf(minuteOfDay);
  return x >= h.open && x < h.close;
}

/** Дараагийн нээгдэх хүртэлх минут (нээлттэй бол 0) */
export function minutesUntilOpen(cfg: GameConfig, shopId: string, minuteOfDay: number): number {
  if (isOpen(cfg, shopId, minuteOfDay)) return 0;
  const h = shopHours(cfg, shopId);
  const x = hourOf(minuteOfDay) * 60;
  const o = h.open * 60;
  return Math.ceil(o > x ? o - x : o + 1440 - x);
}

export function fmtHour(h: number): string {
  return `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
}

/** «Хаалттай — 09:00-д нээнэ» */
export function closedMsg(cfg: GameConfig, shopId: string): Msg {
  return m('sim.shop_closed', { time: fmtHour(shopHours(cfg, shopId).open) });
}

/** Худалдааны төлөвлөгөөнд хэрэгтэй үүргүүд (автомат аялал: бүгд нээлттэй байх ёстой) */
export function tradeDoorOf(cfg: GameConfig, role: string): SumDoor | undefined {
  return sumDoors(cfg).find((d) => d.role === role);
}

export function validateShops(S: ShopsConfig): void {
  const all = [S.default, ...Object.values(S.byRole), ...Object.values(S.byId)];
  for (const h of all) {
    if (!(h.open >= 0 && h.close <= 24 && h.open < h.close)) throw new Error(`shops.json: буруу цаг ${JSON.stringify(h)}`);
  }
}
