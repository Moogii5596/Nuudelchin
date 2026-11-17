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

/** Манангийн ойрын зах: near = min(nearMax, far × nearFarRatio) — near < far үргэлж (scene.ts applyDaylight) */
export interface FogVisual {
  nearMax: number;
  nearFarRatio: number;
  /** Шалгалт: улирал бүрийн хамгийн богино far нь near-аас дор хаяж ийм дахин хол */
  minFarOverNear: number;
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
  /** Утас: өвс сийрэг, цайвар; малын сүүдэр/LOD хөнгөн (terrain.ts, animal/view.ts) */
  touch: { density: number; lighten: number; lightenTo: string; lodShadows: boolean; herderShadowParts: number };
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

/** Үндсэн дүрийн хөдөлгөөн, нүүрний сэтгэл хөдлөл (docs/character-design.md) */
export type HerderEmotion = 'neutral' | 'happy' | 'angry' | 'sad' | 'surprised';
export type HerderEvent = 'birth' | 'loss' | 'wolf' | 'shout' | 'scare' | 'call';
export interface HerderAnimVisual {
  moveMin: number;
  /** hysteresis: алхаа эхлэх босго moveMin, зогсох босго moveStop (< moveMin) */
  moveStop: number;
  /** зөөлрүүлсэн хурд энэ хэмээс бага бол тэг (м/с) */
  deadzone: number;
  /** хурдын EMA (1/с) */
  speedSmooth: number;
  /** алхаа↔зогсолтын жинг зөөлөн өөрчлөх хурд (1/с) */
  gaitRate: number;
  /** зогсохдоо алхааны фазыг хөлүүд огтлолцох (бөөрөнхий) байрлал руу эргүүлэх хурд (1/с) — дэвхцэл тэг рүү зөөлөн */
  settleRate: number;
  /** энэ хурдаас (м/с) бага болоход алхааны жин 0 рүү уруудна */
  gaitFade: number;
  /** амьсгалын давтамж (рад/с): зогсонги, гүйлт */
  breathIdle: number;
  breathRun: number;
  runFrom: number;
  runFull: number;
  strideWalk: number;
  strideRun: number;
  threat: HerderEmotion;
  events: Record<HerderEvent, Array<[HerderEmotion, number]>>;
}

/** Сумын төвийн оршин суугчид (docs/character-design.md §4 crowd) */
export interface SumResidentsVisual {
  doorChance: number;
  perDoor: number;
  spread: number;
  ahead: [number, number];
  stature: [number, number];
}

/** V4.1: улирлын хувцас */
export type OutfitBody = 'terleg' | 'deel' | 'winter';
export type OutfitHat = 'toortsog' | 'fox';
export type HelperRole = 'herd' | 'horse' | 'drive' | 'otor' | 'collect';
export interface OutfitsVisual {
  seasons: Record<Season, { body: OutfitBody; hat: OutfitHat }>;
  helperRoles: Record<HelperRole, string>;
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

/** Шөнийн тэнгэр: сар (диск + хөхөвтөр чиглэлт гэрэл), шөнийн доод гэрэл; сумын төвийн гудамжны гэрэл */
export interface NightVisual {
  moon: { discRadius: number; discDistance: number; color: string; lightColor: string; lightIntensity: number; peakElevation: number; minElevation: number; starOpacity: number };
  /** шөнийн хамгийн бага hemi гэрэл (тас харанхуй болохгүй) */
  hemiFloor: number;
  streetLamp: {
    color: string; bulbRadius: number; glowSize: number; glowOpacity: number;
    lightIntensity: number; lightDistance: number; lightDecay: number; lightHeight: number;
    /** чанарын түвшин тус бүрт PointLight-ийн тоо (low=0: зөвхөн glow sprite) ба glow-той шонгийн дээд тоо */
    pointLights: Record<Quality, number>; glowCount: Record<Quality, number>;
  };
  /** V3.5 цэнгэлдэх, бөхийн талбайн прожектор: чанар тус бүрт PointLight-ийн тоо (≤ 4) */
  floodlight: { color: string; intensity: number; distance: number; decay: number; pointLights: Record<Quality, number> };
  /** V3.5 хүрд товшиход эргэх: эхний хурд (рад/с), зогсох хүртэлх хугацаа (с), чиглэл ±1 */
  wheelSpin: { speed: number; seconds: number; dir: number };
}

export interface VisualStyle {
  night: NightVisual;
  palette: VisualPalette;
  timeOfDay: TimeVisual[];
  seasons: Record<Season, SeasonVisual>;
  fog: FogVisual;
  grass: GrassVisual;
  water: WaterVisual;
  smoke: SmokeVisual;
  dogRest: DogRestVisual;
  herderAnim: HerderAnimVisual;
  sumResidents: SumResidentsVisual;
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

const herderEmotions: HerderEmotion[] = ['neutral', 'happy', 'angry', 'sad', 'surprised'];
const herderEvents: HerderEvent[] = ['birth', 'loss', 'wolf', 'shout', 'scare', 'call'];
function parseHerderAnim(h: Record<string, unknown>): HerderAnimVisual {
  const bad = (what: string): never => {
    throw new Error(`data/visuals.json: herderAnim.${what} буруу`);
  };
  const isEmotion = (v: unknown): v is HerderEmotion => herderEmotions.includes(v as HerderEmotion);
  if (!isPositive(h.moveMin)) bad('moveMin');
  if (!isPositive(h.moveStop) || (h.moveStop as number) >= (h.moveMin as number)) bad('moveStop');
  if (!isPositive(h.deadzone) || !isPositive(h.speedSmooth) || !isPositive(h.gaitRate) || !isPositive(h.settleRate) || !isPositive(h.gaitFade) || !isPositive(h.breathIdle) || !isPositive(h.breathRun)) bad('deadzone/speedSmooth/gaitRate/settleRate/breath');
  if (!isPositive(h.runFrom) || !isPositive(h.runFull) || (h.runFull as number) <= (h.runFrom as number)) bad('runFrom/runFull');
  if (!isPositive(h.strideWalk) || !isPositive(h.strideRun)) bad('stride');
  if (!isEmotion(h.threat)) bad('threat');
  if (!isRecord(h.events)) bad('events');
  const src = h.events as Record<string, unknown>;
  const events = {} as Record<HerderEvent, Array<[HerderEmotion, number]>>;
  for (const name of herderEvents) {
    const steps = src[name];
    if (!Array.isArray(steps) || steps.length === 0) bad(`events.${name}`);
    events[name] = (steps as unknown[]).map((step) => {
      if (!Array.isArray(step) || step.length !== 2 || !isEmotion(step[0]) || !isPositive(step[1])) bad(`events.${name}`);
      const [emotion, seconds] = step as [HerderEmotion, number];
      return [emotion, seconds];
    });
  }
  return {
    moveMin: h.moveMin as number, moveStop: h.moveStop as number, deadzone: h.deadzone as number, speedSmooth: h.speedSmooth as number, gaitRate: h.gaitRate as number, settleRate: h.settleRate as number, gaitFade: h.gaitFade as number, breathIdle: h.breathIdle as number, breathRun: h.breathRun as number, runFrom: h.runFrom as number, runFull: h.runFull as number,
    strideWalk: h.strideWalk as number, strideRun: h.strideRun as number, threat: h.threat as HerderEmotion, events,
  };
}

function parseSumResidents(r: Record<string, unknown>): SumResidentsVisual {
  const bad = (what: string): never => {
    throw new Error(`data/visuals.json: sumResidents.${what} буруу`);
  };
  const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const range = (v: unknown, what: string): [number, number] => {
    if (!Array.isArray(v) || v.length !== 2 || !isPositive(v[0]) || !isPositive(v[1]) || v[1] < v[0]) bad(what);
    return [(v as number[])[0]!, (v as number[])[1]!];
  };
  if (!isNum(r.doorChance) || r.doorChance < 0 || r.doorChance > 1) bad('doorChance');
  if (!Number.isInteger(r.perDoor) || (r.perDoor as number) < 1 || (r.perDoor as number) > 6) bad('perDoor');
  if (!isPositive(r.spread)) bad('spread');
  return {
    doorChance: r.doorChance as number, perDoor: r.perDoor as number, spread: r.spread as number,
    ahead: range(r.ahead, 'ahead'), stature: range(r.stature, 'stature'),
  };
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
    helperRoles: colors(o.helperRoles, ['herd', 'horse', 'drive', 'otor', 'collect'] as const, 'helperRoles'),
  };
}

function parseNight(n: Record<string, unknown>): NightVisual {
  const fail = (what: string): never => { throw new Error(`data/visuals.json: night.${what} буруу`); };
  const m = n.moon, l = n.streetLamp;
  if (!isRecord(m) || !isRecord(l)) return fail('moon/streetLamp');
  for (const k of ['discRadius', 'discDistance', 'lightIntensity'] as const) if (!isPositive(m[k])) fail(`moon.${k}`);
  for (const k of ['peakElevation', 'minElevation', 'starOpacity'] as const) {
    if (typeof m[k] !== 'number' || (m[k] as number) < 0 || (m[k] as number) > 1) fail(`moon.${k}`);
  }
  if (!isColor(m.color) || !isColor(m.lightColor)) fail('moon.color');
  if (typeof n.hemiFloor !== 'number' || n.hemiFloor < 0 || n.hemiFloor > 2) fail('hemiFloor');
  if (!isColor(l.color)) fail('streetLamp.color');
  for (const k of ['bulbRadius', 'glowSize', 'lightIntensity', 'lightDistance', 'lightDecay', 'lightHeight'] as const) if (!isPositive(l[k])) fail(`streetLamp.${k}`);
  if (typeof l.glowOpacity !== 'number' || l.glowOpacity < 0 || l.glowOpacity > 1) fail('streetLamp.glowOpacity');
  const f = n.floodlight, ws = n.wheelSpin;
  if (!isRecord(f) || !isRecord(ws)) return fail('floodlight/wheelSpin');
  if (!isColor(f.color)) fail('floodlight.color');
  for (const k of ['intensity', 'distance', 'decay'] as const) if (!isPositive(f[k])) fail(`floodlight.${k}`);
  for (const k of ['speed', 'seconds'] as const) if (!isPositive(ws[k])) fail(`wheelSpin.${k}`);
  if (ws.dir !== 1 && ws.dir !== -1) fail('wheelSpin.dir');
  const perTier = (key: 'pointLights' | 'glowCount', src: Record<string, unknown> = l): Record<Quality, number> => {
    const r = src[key];
    const out = {} as Record<Quality, number>;
    for (const q of ['low', 'mid', 'high'] as const) {
      const v = isRecord(r) ? r[q] : undefined;
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 64) fail(`${src === l ? 'streetLamp' : 'floodlight'}.${key}.${q}`);
      out[q] = v as number;
    }
    return out;
  };
  return {
    moon: m as unknown as NightVisual['moon'],
    hemiFloor: n.hemiFloor as number,
    streetLamp: { ...(l as unknown as NightVisual['streetLamp']), pointLights: perTier('pointLights'), glowCount: perTier('glowCount') },
    floodlight: { color: f.color as string, intensity: f.intensity as number, distance: f.distance as number, decay: f.decay as number, pointLights: perTier('pointLights', f) },
    wheelSpin: { speed: ws.speed as number, seconds: ws.seconds as number, dir: ws.dir as number },
  };
}

function fogRangeFor(fog: FogVisual, fogDistance: number, fogScale: number): { near: number; far: number } {
  const far = fogDistance * fogScale;
  return { near: Math.min(fog.nearMax, far * fog.nearFarRatio), far };
}

export function validateVisualStyle(value: unknown): VisualStyle {
  if (
    !isRecord(value) || !isRecord(value.palette) || !isRecord(value.seasons) ||
    !isRecord(value.grass) || !isRecord(value.water) || !isRecord(value.smoke) || !isRecord(value.dogRest) || !isRecord(value.herderAnim) || !isRecord(value.sumResidents) || !isRecord(value.outfits) || !isRecord(value.vehicleFx) || !isRecord(value.mapPaper) ||
    !isRecord(value.cloudShadow) || !isRecord(value.flowers) || !isRecord(value.mountains) ||
    !isRecord(value.quality) || !Array.isArray(value.timeOfDay) || !isRecord(value.night)
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
  const fogValue = value.fog;
  if (
    !isRecord(fogValue) || !isPositive(fogValue.nearMax) || !isPositive(fogValue.nearFarRatio) ||
    !isPositive(fogValue.minFarOverNear) || fogValue.minFarOverNear <= 1
  ) {
    throw new Error('data/visuals.json: fog тохиргоо буруу');
  }
  const fog: FogVisual = { nearMax: fogValue.nearMax, nearFarRatio: fogValue.nearFarRatio, minFarOverNear: fogValue.minFarOverNear };
  const minFogDistance = Math.min(...timeOfDay.map((key) => key.fogDistance));
  for (const season of seasons) {
    const range = fogRangeFor(fog, minFogDistance, seasonVisuals[season].fogScale);
    if (!(range.far > fog.minFarOverNear * range.near)) {
      throw new Error(`data/visuals.json: seasons.${season} манан far (${range.far}) нь near (${range.near}) × ${fog.minFarOverNear}-аас их байх ёстой`);
    }
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
  const touch = grassValue.touch;
  if (
    !isRecord(touch) || typeof touch.density !== 'number' || !(touch.density > 0 && touch.density <= 1) ||
    typeof touch.lighten !== 'number' || !(touch.lighten >= 0 && touch.lighten <= 1) || !isColor(touch.lightenTo) || typeof touch.lodShadows !== 'boolean' ||
    typeof touch.herderShadowParts !== 'number' || !Number.isInteger(touch.herderShadowParts) || touch.herderShadowParts < 0
  ) {
    throw new Error('data/visuals.json: grass.touch (density 0–1, lighten 0–1, lightenTo өнгө, lodShadows, herderShadowParts) буруу');
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
    touch: { density: touch.density, lighten: touch.lighten, lightenTo: touch.lightenTo, lodShadows: touch.lodShadows, herderShadowParts: touch.herderShadowParts },
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
  const herderAnim = parseHerderAnim(value.herderAnim as Record<string, unknown>);
  const sumResidents = parseSumResidents(value.sumResidents as Record<string, unknown>);
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
    fog,
    grass,
    water,
    smoke,
    dogRest,
    herderAnim,
    sumResidents,
    outfits,
    vehicleFx,
    mapPaper,
    cloudShadow,
    flowers,
    mountains,
    quality: qualityVisuals,
    night: parseNight(value.night),
  };
}

export const visualStyle = validateVisualStyle(visualsJson);

/** Манангийн муж: тухайн цагийн fogDistance ба улирлын fogScale-ээс. near < far үргэлж. */
export function fogRange(fogDistance: number, season: Season, style: VisualStyle = visualStyle): { near: number; far: number } {
  return fogRangeFor(style.fog, fogDistance, style.seasons[season].fogScale);
}

/** Тухайн минутын fogDistance (timeOfDay түлхүүрүүдийн хооронд шугаман) */
export function fogDistanceAt(minute: number, style: VisualStyle = visualStyle): number {
  const m = ((minute % 1440) + 1440) % 1440;
  const keys = style.timeOfDay;
  let index = 0;
  while (index < keys.length - 1 && keys[index + 1]!.minute < m) index++;
  const a = keys[index]!;
  const b = keys[Math.min(index + 1, keys.length - 1)]!;
  const t = Math.min(1, Math.max(0, (m - a.minute) / Math.max(1, b.minute - a.minute)));
  return a.fogDistance + (b.fogDistance - a.fogDistance) * t;
}

export function paletteHex(name: keyof VisualPalette): number {
  return Number.parseInt(visualStyle.palette[name].slice(1), 16);
}
