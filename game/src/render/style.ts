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
}

export interface VisualStyle {
  palette: VisualPalette;
  timeOfDay: TimeVisual[];
  seasons: Record<Season, SeasonVisual>;
  quality: Record<Quality, { grassTufts: number; grassRadius: number; animalAnimationDistance: number }>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isColor = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const isPositive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;
const seasons: Season[] = ['summer', 'autumn', 'winter', 'spring'];

export function validateVisualStyle(value: unknown): VisualStyle {
  if (!isRecord(value) || !isRecord(value.palette) || !isRecord(value.seasons) || !isRecord(value.quality) || !Array.isArray(value.timeOfDay)) {
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
  const qualityVisuals = {} as VisualStyle['quality'];
  for (const quality of ['low', 'mid', 'high'] as const) {
    const entry = value.quality[quality];
    if (
      !isRecord(entry) || !isPositive(entry.grassTufts) || !Number.isInteger(entry.grassTufts) ||
      !isPositive(entry.grassRadius) || !isPositive(entry.animalAnimationDistance)
    ) {
      throw new Error(`data/visuals.json: quality.${quality} талбар буруу`);
    }
    qualityVisuals[quality] = {
      grassTufts: entry.grassTufts,
      grassRadius: entry.grassRadius,
      animalAnimationDistance: entry.animalAnimationDistance,
    };
  }
  return {
    palette: parsedPalette,
    timeOfDay,
    seasons: seasonVisuals,
    quality: qualityVisuals,
  };
}

export const visualStyle = validateVisualStyle(visualsJson);

export function paletteHex(name: keyof VisualPalette): number {
  return Number.parseInt(visualStyle.palette[name].slice(1), 16);
}
