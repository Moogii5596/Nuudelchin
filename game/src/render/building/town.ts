/**
 * Сумын төвийн барилгыг нэг mesh-д угсрах (V3.5). sumlayout.ts барилга бүрийг `TownBuilder.add`-аар бүртгэж, улирал (зун/өвөл) бүрт
 * `build(season)` нэг Geo (+ эргэдэг хүрд) болгоно — нийт 2 draw call (бие + бэхэн хүрээ), дуганы хүрд тус тусдаа.
 */
import { Geo } from '../ger/geo';
import { BUILDING_CONFIG, emptyGeo, makeBuilding, type BuiltBuilding, type BuildingWheel } from './index';
import { buildWoolStore } from './shops';
import type { TownEntry } from '../../sim/systems/buildingSize';

export type Season = 'summer' | 'winter';
export interface TownWheel { geo: Geo; x: number; y: number; z: number; yaw: number; style: string }
export interface TownPart { geo: Geo; wheels: TownWheel[] }
type Job = (season: Season, out: Geo, wheels: TownWheel[]) => void;

export class TownBuilder {
  private jobs: Job[] = [];
  add(job: Job): void { this.jobs.push(job); }
  get count(): number { return this.jobs.length; }
  build(season: Season): TownPart {
    const geo = emptyGeo(), wheels: TownWheel[] = [];
    for (const j of this.jobs) j(season, geo, wheels);
    return { geo, wheels };
  }
}

export interface LabModel { geo: Geo; dims: { w: number; d: number; ridgeH: number }; wheels?: BuildingWheel[] }
/** town.byId / compounds / fields / props-ийн бичлэгээс загвар */
export function labModel(e: TownEntry, season: Season): LabModel {
  if (e.type === 'woolStore') return buildWoolStore({ season }) as LabModel;
  const kind = e.type === 'public' || e.type === 'shop' ? e.kind! : e.type;
  const m: BuiltBuilding = makeBuilding(kind, { season, roofColor: e.roofColor });
  return { geo: m.geo, dims: m.dims, wheels: m.wheels };
}

/** Хашааны ger суудлын байрлал (хашааны локал) — khashaa.gerSlot, R = гэрийн радиус */
export function gerSlotLocal(plotW: number, plotD: number, R: number): { x: number; z: number } {
  const K = BUILDING_CONFIG.khashaa;
  return { x: -(plotW / 2 - R - K.gerGap), z: -plotD / 2 + R + K.gerGap + 0.6 };
}
