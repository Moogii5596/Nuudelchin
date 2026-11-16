/**
 * Газрын зураг дээрх жолоочийн машин (M6.12 «жолооч харагдах»): гэрийн бууцнаас сумын төв рүү явж буцах нь харагдана.
 * Хугацааны эхний хагас = явах, хоёр дахь хагас = буцах (HelperTrip.remaining/total). Байрлал км-ээр (worldmap.locations).
 */
import type { GameConfig } from '../config';
import type { GameState, VehicleId } from '../state';
import { sumId } from './travel';

export interface DriverOnMap {
  helperId: number;
  vehicle: VehicleId;
  /** км (газрын зургийн координат) */
  x: number;
  z: number;
  /** Явж буй чиглэлийн төгсгөл (радианаар: atan2(dx, dz)) */
  heading: number;
  toSum: boolean;
}

export function driversOnMap(cfg: GameConfig, state: GameState): DriverOnMap[] {
  const home = cfg.worldmap.locations[state.campId], sum = cfg.worldmap.locations[sumId(cfg)];
  if (!home || !sum) return [];
  const out: DriverOnMap[] = [];
  for (const h of state.helpers.list) {
    const tr = h.trip;
    if (!tr || tr.total <= 0) continue;
    const t = Math.min(1, Math.max(0, 1 - tr.remaining / tr.total));   // 0 → 1
    const toSum = t < 0.5;
    const f = toSum ? t * 2 : 2 - t * 2;   // гэр → сум → гэр
    const x = home.x + (sum.x - home.x) * f, z = home.z + (sum.z - home.z) * f;
    const dx = toSum ? sum.x - home.x : home.x - sum.x, dz = toSum ? sum.z - home.z : home.z - sum.z;
    out.push({ helperId: h.id, vehicle: tr.vehicle, x, z, heading: Math.atan2(dx, dz), toSum });
  }
  return out;
}
