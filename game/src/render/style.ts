import visualsJson from '../../../data/visuals.json';
import type { Season } from '../sim/config';
import type { Quality } from '../device';

export interface TimeVisual {
  minute: number;
  skyTop: string;
  skyHorizon: string;
  ground: string;
  sun: string;
  sunIntensity: number;
  hemiIntensity: number;
  fogDistance: number;
  exposure: number;
}

export interface SeasonVisual {
  skyTint: string;
  fogScale: number;
  exposureScale: number;
  sunScale: number;
}

export interface GrassVisual {
  bladesPerTuft: Record<Quality, number>;
  bladeHeight: number;
  maxHeight: number;
  fadeStart: number;
  updateSeconds: number;
  colorJitter: number;
  wind: { swayX: number; swayZ: number; freqX: number; freqZ: number };
  pastureColors: Record<string, string>;
}

export interface WaterVisual {
  color: string;
  opacity: number;
  reflectionStrength: number;
  fresnelPower: number;
  iceColor: string;
  iceOpacity: number;
  wave: { xFrequency: number; zFrequency: number; timeFrequency: number; amplitude: number };
}

export interface SmokeVisual {
  cookingMinutes: [number, number][];
}

/** V3.2: хөдлөхгүй нохой хэвтэх, сумын төвийн айлын нохой */
export interface DogRestVisual {
  lieAfterSec: number;
  blendPerSec: number;
  bodyDrop: number;
  headDown: number;
  tailFlat: number;
  townDogChance: number;
}

/** V4.1: улирлын хувцас */
export type OutfitBody = 'terleg' | 'deel' | 'winter';
export type OutfitHat = 'toortsog' | 'fox';
export type HelperRole = 'herd' | 'horse' | 'drive' | 'otor' | 'collect';
export interface OutfitsVisual {
  seasons: Record<Season, { body: OutfitBody; hat: OutfitHat }>;
  terlegLighten: number;
  foxFur: string;
  collarFur: string;
  player: { deel: string; hem: string; hat: string };
  helperRoles: Record<HelperRole, string>;
  helperHat: Record<'m' | 'f', string>;
}

/** V5.3: газрын зургийн цаасан төрх */
export interface MapPaperVisual {
  texture: number; repeat: number; grain: number; fibers: number; stains: number; stainStrength: number;
  edgeDarken: number; edgeWidth: number; bankOffset: number; contours: number; contourWobble: number;
  campRing: number; frameInset: number; frameGap: number;
}

/** V4.2: тээврийн тоос, гэрэл */
export interface VehicleFxVisual {
  dust: {
    count: number; minSpeed: number; perSecPerSpeed: number; life: number; rise: number; spread: number;
    size: number; opacity: number; nightLight: number; color: string; snowColor: string;
  };
  lights: {
    nightBelow: number; nightFull: number; beamLength: number; beamWidth: number; beamOpacity: number; beamLift: number;
    head: string; tail: string; lantern: string;
  };
}

export interface CloudShadowVisual {
  scale: number;
  speedX: number;
  speedZ: number;
  opacity: number;
  skyScale: number;
  skyOpacity: number;
}

export interface FlowersVisual {
  height: number;
  radius: number;
  biomassThreshold: number;
  colors: string[];
}

export interface MountainLayerVisual {
  count: number;
  radiusMin: number;
  radiusMax: number;
  heightMin: number;
  heightMax: number;
  heightScale: number;
  color: string;
}

export interface VisualPalette {
  summerGrass: string;
  dryGrass: string;
  autumnGrass: string;
  dirt: string;
  rock: string;
  distantMountain: string;
  felt: string;
  gerOrange: string;
  bluePattern: string;
  snow: string;
  snowShadow: string;
  larchSummer: string;
  larchAutumn: string;
  larchSpring: string;
  larchWinter: string;
  moonlight: string;
  firelight: string;
  mapPaper: string;
  mapInk: string;
  mapWater: string;
  woodDark: string;
  wood: string;
  woodLight: string;
  woodWarm: string;
  woodAccent: string;
  woodRoof: string;
  woodRoofCover: string;
  manure: string;
  dung: string;
  stoneWarm: string;
}

export interface VisualStyle {
  palette: VisualPalette;
  timeOfDay: TimeVisual[];
  seasons: Record<Season, SeasonVisual>;
  grass: GrassVisual;
  water: WaterVisual;
  smoke: SmokeVisual;
  dogRest: DogRestVisual;
  outfits: OutfitsVisual;
  vehicleFx: VehicleFxVisual;
  mapPaper: MapPaperVisual;
  cloudShadow: CloudShadowVisual;
  flowers: FlowersVisual;
  mountains: { layers: MountainLayerVisual[] };
  quality: Record<Quality, {
    grassTufts: number;
    grassRadius: number;
    gerSegments: number;
    flowers: number;
    mountainLayers: number;
    animalAnimationDistance: number;
  }>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isColor = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const isPositive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;
const seasons: Season[] = ['summer', 'autumn', 'winter', 'spring'];

function parseMapPaper(p: Record<string, unknown>): MapPaperVisual {
  const fail = (what: string): never => {
    throw new Error(`data/visuals.json: mapPaper.${what} буруу`);
  };
  const inRange = (k: string, lo: number, hi: number): void => {
    const v = p[k];
    if (!(typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi)) fail(k);
  };
  const tex = p.texture;
  if (!(Number.isInteger(tex) && (tex as number) >= 64 && (tex as number) <= 1024 && ((tex as number) & ((tex as number) - 1)) === 0)) fail('texture');
  for (const k of ['repeat', 'edgeWidth', 'bankOffset', 'campRing', 'frameInset', 'frameGap'] as const) if (!isPositive(p[k])) fail(k);
  for (const k of ['fibers', 'stains', 'contours'] as const) if (!(Number.isInteger(p[k]) && (p[k] as number) >= 0 && (p[k] as number) <= 2000)) fail(k);
  inRange('grain', 0, 0.3);
  inRange('stainStrength', 0, 0.5);
  inRange('edgeDarken', 0, 1);
  inRange('contourWobble', 0, 0.3);
  return p as unknown as MapPaperVisual;
}

function parseVehicleFx(v: Record<string, unknown>): VehicleFxVisual {
  const fail = (what: string): never => {
    throw new Error(`data/visuals.json: vehicleFx.${what} буруу`);
  };
  const d = v.dust, l = v.lights;
  if (!isRecord(d) || !isRecord(l)) return fail('dust/lights');
  for (const k of ['minSpeed', 'perSecPerSpeed', 'life', 'rise', 'spread', 'size'] as const) if (!isPositive(d[k])) fail(`dust.${k}`);
  if (!(Number.isInteger(d.count) && (d.count as number) > 0 && (d.count as number) <= 512)) fail('dust.count');
  if (!(typeof d.opacity === 'number' && d.opacity > 0 && d.opacity <= 1)) fail('dust.opacity');
  if (!(typeof d.nightLight === 'number' && d.nightLight >= 0 && d.nightLight <= 1)) fail('dust.nightLight');
  if (!isColor(d.color) || !isColor(d.snowColor)) fail('dust.color');
  for (const k of ['beamLength', 'beamWidth', 'beamOpacity', 'beamLift'] as const) if (!isPositive(l[k])) fail(`lights.${k}`);
  if (!(typeof l.nightBelow === 'number' && typeof l.nightFull === 'number' && l.nightFull >= 0 && l.nightFull < l.nightBelow && l.nightBelow <= 1)) {
    fail('lights.nightBelow/nightFull');
  }
  if (!isColor(l.head) || !isColor(l.tail) || !isColor(l.lantern)) fail('lights өнгө');
  return { dust: d as unknown as VehicleFxVisual['dust'], lights: l as unknown as VehicleFxVisual['lights'] };
}

function parseOutfits(o: Record<string, unknown>): OutfitsVisual {
  const fail = (what: string): never => {
    throw new Error(`data/visuals.json: outfits.${what} буруу`);
  };
  const bodies: OutfitBody[] = ['terleg', 'deel', 'winter'];
  const hats: OutfitHat[] = ['toortsog', 'fox'];
  if (!isRecord(o.seasons)) fail('seasons');
  const sv = o.seasons as Record<string, unknown>;
  const parsedSeasons = {} as OutfitsVisual['seasons'];
  for (const season of seasons) {
    const e = sv[season];
    if (!isRecord(e) || !bodies.includes(e.body as OutfitBody) || !hats.includes(e.hat as OutfitHat)) fail(`seasons.${season}`);
    parsedSeasons[season] = { body: (e as Record<string, unknown>).body as OutfitBody, hat: (e as Record<string, unknown>).hat as OutfitHat };
  }
  if (typeof o.terlegLighten !== 'number' || !(o.terlegLighten >= 0 && o.terlegLighten <= 0.6)) fail('terlegLighten');
  if (!isColor(o.foxFur) || !isColor(o.collarFur)) fail('foxFur/collarFur');
  const colors = <K extends string>(v: unknown, keys: readonly K[], what: string): Record<K, string> => {
    if (!isRecord(v)) return fail(what);
    const out = {} as Record<K, string>;
    for (const k of keys) {
      const c = v[k];
      if (!isColor(c)) return fail(`${what}.${k}`);
      out[k] = c;
    }
    return out;
  };
  return {
    seasons: parsedSeasons,
    terlegLighten: o.terlegLighten as number,
    foxFur: o.foxFur as string,
    collarFur: o.collarFur as string,
    player: colors(o.player, ['deel', 'hem', 'hat'] as const, 'player'),
    helperRoles: colors(o.helperRoles, ['herd', 'horse', 'drive', 'otor', 'collect'] as const, 'helperRoles'),
    helperHat: colors(o.helperHat, ['m', 'f'] as const, 'helperHat'),
  };
}

export function validateVisualStyle(value: unknown): VisualStyle {
  if (
    !isRecord(value) || !isRecord(value.palette) || !isRecord(value.seasons) ||
    !isRecord(value.grass) || !isRecord(value.water) || !isRecord(value.smoke) || !isRecord(value.dogRest) || !isRecord(value.outfits) || !isRecord(value.vehicleFx) || !isRecord(value.mapPaper) ||
    !isRecord(value.cloudShadow) || !isRecord(value.flowers) || !isRecord(value.mountains) ||
    !isRecord(value.quality) || !Array.isArray(value.timeOfDay)
  ) {
    throw new Error('data/visuals.json: буруу үндсэн бүтэц');
  }
  const palette = value.palette;
  if (Object.values(palette).some((color) => !isColor(color))) {
    throw new Error('data/visuals.json: палитрын өнгө #RRGGBB байх ёстой');
  }
  const colorAt = (name: keyof VisualPalette): string => {
    const color = palette[name];
    if (!isColor(color)) throw new Error(`data/visuals.json: palette.${name} дутуу эсвэл буруу`);
    return color;
  };
  const parsedPalette: VisualPalette = {
    summerGrass: colorAt('summerGrass'),
    dryGrass: colorAt('dryGrass'),
    autumnGrass: colorAt('autumnGrass'),
    dirt: colorAt('dirt'),
    rock: colorAt('rock'),
    distantMountain: colorAt('distantMountain'),
    felt: colorAt('felt'),
    gerOrange: colorAt('gerOrange'),
    bluePattern: colorAt('bluePattern'),
    snow: colorAt('snow'),
    snowShadow: colorAt('snowShadow'),
    larchSummer: colorAt('larchSummer'),
    larchAutumn: colorAt('larchAutumn'),
    larchSpring: colorAt('larchSpring'),
    larchWinter: colorAt('larchWinter'),
    moonlight: colorAt('moonlight'),
    firelight: colorAt('firelight'),
    mapPaper: colorAt('mapPaper'),
    mapInk: colorAt('mapInk'),
    mapWater: colorAt('mapWater'),
    woodDark: colorAt('woodDark'),
    wood: colorAt('wood'),
    woodLight: colorAt('woodLight'),
    woodWarm: colorAt('woodWarm'),
    woodAccent: colorAt('woodAccent'),
    woodRoof: colorAt('woodRoof'),
    woodRoofCover: colorAt('woodRoofCover'),
    manure: colorAt('manure'),
    dung: colorAt('dung'),
    stoneWarm: colorAt('stoneWarm'),
  };
  const timeOfDay = value.timeOfDay.map((entry, index): TimeVisual => {
    if (!isRecord(entry)) throw new Error(`data/visuals.json: timeOfDay[${index}] буруу`);
    const { minute, skyTop, skyHorizon, ground, sun, sunIntensity, hemiIntensity, fogDistance, exposure } = entry;
    if (
      typeof minute !== 'number' || !Number.isInteger(minute) || minute < 0 || minute > 1440 ||
      !isColor(skyTop) || !isColor(skyHorizon) || !isColor(ground) || !isColor(sun) ||
      typeof sunIntensity !== 'number' || !Number.isFinite(sunIntensity) || sunIntensity < 0 ||
      !isPositive(hemiIntensity) || !isPositive(fogDistance) || !isPositive(exposure)
    ) {
      throw new Error(`data/visuals.json: timeOfDay[${index}] талбар буруу`);
    }
    return { minute, skyTop, skyHorizon, ground, sun, sunIntensity, hemiIntensity, fogDistance, exposure };
  });
  if (timeOfDay.length < 2 || timeOfDay.some((key, index) => index > 0 && key.minute <= timeOfDay[index - 1]!.minute)) {
    throw new Error('data/visuals.json: timeOfDay минут өсөх дарааллаар байх ёстой');
  }
  const seasonVisuals = {} as Record<Season, SeasonVisual>;
  for (const season of seasons) {
    const entry = value.seasons[season];
    if (
      !isRecord(entry) || !isColor(entry.skyTint) ||
      !isPositive(entry.fogScale) || !isPositive(entry.exposureScale) || !isPositive(entry.sunScale)
    ) {
      throw new Error(`data/visuals.json: seasons.${season} талбар буруу`);
    }
    seasonVisuals[season] = {
      skyTint: entry.skyTint,
      fogScale: entry.fogScale,
      exposureScale: entry.exposureScale,
      sunScale: entry.sunScale,
    };
  }
  const grassValue = value.grass;
  const wind = grassValue.wind;
  if (!isRecord(grassValue.bladesPerTuft) || !isRecord(wind) || !isRecord(grassValue.pastureColors)) {
    throw new Error('data/visuals.json: grass тохиргоо буруу');
  }
  const bladesPerTuft = {} as Record<Quality, number>;
  for (const quality of ['low', 'mid', 'high'] as const) {
    const blades = grassValue.bladesPerTuft[quality];
    if (typeof blades !== 'number' || !Number.isInteger(blades) || blades < 3 || blades > 16) {
      throw new Error(`data/visuals.json: grass.bladesPerTuft.${quality} нь 3–16 бүхэл тоо байх ёстой`);
    }
    bladesPerTuft[quality] = blades;
  }
  const pastureColors: Record<string, string> = {};
  for (const [type, color] of Object.entries(grassValue.pastureColors)) {
    if (!isColor(color)) throw new Error(`data/visuals.json: grass.pastureColors.${type} өнгө буруу`);
    pastureColors[type] = color;
  }
  if (Object.keys(pastureColors).length === 0) throw new Error('data/visuals.json: grass.pastureColors хоосон байна');
  if (
    !isPositive(grassValue.bladeHeight) || !isPositive(grassValue.maxHeight) ||
    typeof grassValue.fadeStart !== 'number' || !Number.isFinite(grassValue.fadeStart) || grassValue.fadeStart <= 0 || grassValue.fadeStart >= 1 ||
    !isPositive(grassValue.updateSeconds) ||
    typeof grassValue.colorJitter !== 'number' || !Number.isFinite(grassValue.colorJitter) || grassValue.colorJitter < 0 || grassValue.colorJitter > 1 ||
    !isPositive(wind.swayX) || !isPositive(wind.swayZ) || !isPositive(wind.freqX) || !isPositive(wind.freqZ)
  ) {
    throw new Error('data/visuals.json: grass-ийн хэмжээ, fade, jitter эсвэл салхины тохиргоо буруу');
  }
  const grass: GrassVisual = {
    bladesPerTuft,
    bladeHeight: grassValue.bladeHeight,
    maxHeight: grassValue.maxHeight,
    fadeStart: grassValue.fadeStart,
    updateSeconds: grassValue.updateSeconds,
    colorJitter: grassValue.colorJitter,
    wind: {
      swayX: wind.swayX,
      swayZ: wind.swayZ,
      freqX: wind.freqX,
      freqZ: wind.freqZ,
    },
    pastureColors,
  };
  const waterValue = value.water;
  const wave = waterValue.wave;
  if (
    !isColor(waterValue.color) || !isColor(waterValue.iceColor) || !isRecord(wave) ||
    typeof waterValue.opacity !== 'number' || !Number.isFinite(waterValue.opacity) || waterValue.opacity < 0 || waterValue.opacity > 1 ||
    typeof waterValue.iceOpacity !== 'number' || !Number.isFinite(waterValue.iceOpacity) || waterValue.iceOpacity < 0 || waterValue.iceOpacity > 1 ||
    typeof waterValue.reflectionStrength !== 'number' || !Number.isFinite(waterValue.reflectionStrength) || waterValue.reflectionStrength < 0 || waterValue.reflectionStrength > 1 ||
    !isPositive(waterValue.fresnelPower) ||
    !isPositive(wave.xFrequency) || !isPositive(wave.zFrequency) ||
    !isPositive(wave.timeFrequency) || !isPositive(wave.amplitude)
  ) {
    throw new Error('data/visuals.json: water тохиргоо буруу');
  }
  const water: WaterVisual = {
    color: waterValue.color,
    opacity: waterValue.opacity,
    reflectionStrength: waterValue.reflectionStrength,
    fresnelPower: waterValue.fresnelPower,
    iceColor: waterValue.iceColor,
    iceOpacity: waterValue.iceOpacity,
    wave: {
      xFrequency: wave.xFrequency,
      zFrequency: wave.zFrequency,
      timeFrequency: wave.timeFrequency,
      amplitude: wave.amplitude,
    },
  };
  const smokeValue = value.smoke;
  if (!Array.isArray(smokeValue.cookingMinutes)) throw new Error('data/visuals.json: smoke.cookingMinutes буруу');
  const cookingMinutes: [number, number][] = [];
  for (let i = 0; i < smokeValue.cookingMinutes.length; i++) {
    const interval = smokeValue.cookingMinutes[i];
    if (
      !Array.isArray(interval) || interval.length !== 2 ||
      typeof interval[0] !== 'number' || !Number.isInteger(interval[0]) || interval[0] < 0 || interval[0] > 1440 ||
      typeof interval[1] !== 'number' || !Number.isInteger(interval[1]) || interval[1] < interval[0] || interval[1] > 1440 ||
      (i > 0 && interval[0] <= cookingMinutes[i - 1]![1])
    ) {
      throw new Error(`data/visuals.json: smoke.cookingMinutes[${i}] буруу`);
    }
    cookingMinutes.push([interval[0], interval[1]]);
  }
  const smoke: SmokeVisual = { cookingMinutes };
  const dr = value.dogRest as Record<string, unknown>;
  const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  if (
    !isPositive(dr.lieAfterSec) || !isPositive(dr.blendPerSec) || !isPositive(dr.bodyDrop) || (dr.bodyDrop as number) > 0.6 ||
    !isNum(dr.headDown) || !isNum(dr.tailFlat) || !isNum(dr.townDogChance) || dr.townDogChance < 0 || dr.townDogChance > 1
  ) {
    throw new Error('data/visuals.json: dogRest тохиргоо буруу');
  }
  const outfits = parseOutfits(value.outfits as Record<string, unknown>);
  const vehicleFx = parseVehicleFx(value.vehicleFx as Record<string, unknown>);
  const mapPaper = parseMapPaper(value.mapPaper as Record<string, unknown>);
  const dogRest: DogRestVisual = {
    lieAfterSec: dr.lieAfterSec, blendPerSec: dr.blendPerSec, bodyDrop: dr.bodyDrop as number,
    headDown: dr.headDown, tailFlat: dr.tailFlat, townDogChance: dr.townDogChance,
  };
  const cloudValue = value.cloudShadow;
  if (
    !isPositive(cloudValue.scale) ||
    typeof cloudValue.speedX !== 'number' || !Number.isFinite(cloudValue.speedX) || cloudValue.speedX < 0 ||
    typeof cloudValue.speedZ !== 'number' || !Number.isFinite(cloudValue.speedZ) || cloudValue.speedZ < 0 ||
    typeof cloudValue.opacity !== 'number' || !Number.isFinite(cloudValue.opacity) || cloudValue.opacity < 0 || cloudValue.opacity > 1 ||
    !isPositive(cloudValue.skyScale) ||
    typeof cloudValue.skyOpacity !== 'number' || !Number.isFinite(cloudValue.skyOpacity) || cloudValue.skyOpacity < 0 || cloudValue.skyOpacity > 1
  ) {
    throw new Error('data/visuals.json: cloudShadow тохиргоо буруу');
  }
  const cloudShadow: CloudShadowVisual = {
    scale: cloudValue.scale,
    speedX: cloudValue.speedX,
    speedZ: cloudValue.speedZ,
    opacity: cloudValue.opacity,
    skyScale: cloudValue.skyScale,
    skyOpacity: cloudValue.skyOpacity,
  };
  const flowersValue = value.flowers;
  if (
    !isPositive(flowersValue.height) || !isPositive(flowersValue.radius) ||
    typeof flowersValue.biomassThreshold !== 'number' || !Number.isFinite(flowersValue.biomassThreshold) ||
    flowersValue.biomassThreshold < 0 || flowersValue.biomassThreshold > 1 ||
    !Array.isArray(flowersValue.colors) || flowersValue.colors.length === 0
  ) {
    throw new Error('data/visuals.json: flowers тохиргоо буруу');
  }
  const flowerColors: string[] = [];
  for (const color of flowersValue.colors) {
    if (!isColor(color)) throw new Error('data/visuals.json: flowers өнгө буруу');
    flowerColors.push(color);
  }
  const flowers: FlowersVisual = {
    height: flowersValue.height,
    radius: flowersValue.radius,
    biomassThreshold: flowersValue.biomassThreshold,
    colors: flowerColors,
  };
  const mountainsValue = value.mountains;
  if (!Array.isArray(mountainsValue.layers) || mountainsValue.layers.length < 2 || mountainsValue.layers.length > 3) {
    throw new Error('data/visuals.json: mountains.layers 2–3 давхар байх ёстой');
  }
  const mountainLayers: MountainLayerVisual[] = mountainsValue.layers.map((entry, index) => {
    if (
      !isRecord(entry) || !Number.isInteger(entry.count) || typeof entry.count !== 'number' || entry.count < 1 || entry.count > 100 ||
      !isPositive(entry.radiusMin) || !isPositive(entry.radiusMax) || entry.radiusMax <= entry.radiusMin ||
      !isPositive(entry.heightMin) || !isPositive(entry.heightMax) || entry.heightMax < entry.heightMin ||
      !isPositive(entry.heightScale) || !isColor(entry.color)
    ) {
      throw new Error(`data/visuals.json: mountains.layers[${index}] буруу`);
    }
    return {
      count: entry.count,
      radiusMin: entry.radiusMin,
      radiusMax: entry.radiusMax,
      heightMin: entry.heightMin,
      heightMax: entry.heightMax,
      heightScale: entry.heightScale,
      color: entry.color,
    };
  });
  const mountains = { layers: mountainLayers };
  const qualityVisuals = {} as VisualStyle['quality'];
  const maxGrassTufts: Record<Quality, number> = { low: 15_000, mid: 40_000, high: 100_000 };
  for (const quality of ['low', 'mid', 'high'] as const) {
    const entry = value.quality[quality];
    if (
      !isRecord(entry) || !isPositive(entry.grassTufts) || !Number.isInteger(entry.grassTufts) ||
      entry.grassTufts > maxGrassTufts[quality] ||
      !isPositive(entry.grassRadius) || typeof entry.gerSegments !== 'number' ||
      !Number.isInteger(entry.gerSegments) ||
      entry.gerSegments < 8 || entry.gerSegments > 32 ||
      typeof entry.flowers !== 'number' || !Number.isInteger(entry.flowers) || entry.flowers < 0 || entry.flowers > 10_000 ||
      typeof entry.mountainLayers !== 'number' || !Number.isInteger(entry.mountainLayers) ||
      entry.mountainLayers < 2 || entry.mountainLayers > mountainLayers.length ||
      !isPositive(entry.animalAnimationDistance)
    ) {
      throw new Error(`data/visuals.json: quality.${quality} талбар буруу`);
    }
    qualityVisuals[quality] = {
      grassTufts: entry.grassTufts,
      grassRadius: entry.grassRadius,
      gerSegments: entry.gerSegments,
      flowers: entry.flowers,
      mountainLayers: entry.mountainLayers,
      animalAnimationDistance: entry.animalAnimationDistance,
    };
  }
  return {
    palette: parsedPalette,
    timeOfDay,
    seasons: seasonVisuals,
    grass,
    water,
    smoke,
    dogRest,
    outfits,
    vehicleFx,
    mapPaper,
    cloudShadow,
    flowers,
    mountains,
    quality: qualityVisuals,
  };
}

export const visualStyle = validateVisualStyle(visualsJson);

export function paletteHex(name: keyof VisualPalette): number {
  return Number.parseInt(visualStyle.palette[name].slice(1), 16);
}
