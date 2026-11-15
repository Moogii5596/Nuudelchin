import { dressHerder, helperColors, makeHerder } from '../src/render/characters';
import { describe, expect, it } from 'vitest';
import visualsJson from '../../data/visuals.json';
import { validateVisualStyle } from '../src/render/style';

describe('visual style configuration', () => {
  it('accepts the checked-in palette and daily/seasonal curves', () => {
    const style = validateVisualStyle(visualsJson);
    expect(style.timeOfDay[0]!.minute).toBe(0);
    expect(style.timeOfDay.at(-1)!.minute).toBe(1440);
    expect(Object.keys(style.seasons)).toHaveLength(4);
  });

  it('rejects invalid palette colors and unordered time keys', () => {
    const badPalette: Record<string, unknown> = JSON.parse(JSON.stringify(visualsJson));
    (badPalette.palette as Record<string, unknown>).summerGrass = 'green';
    expect(() => validateVisualStyle(badPalette)).toThrow(/палитрын өнгө/);

    const badTimes: Record<string, unknown> = JSON.parse(JSON.stringify(visualsJson));
    const keys = badTimes.timeOfDay as { minute: number }[];
    keys[1]!.minute = 0;
    expect(() => validateVisualStyle(badTimes)).toThrow(/өсөх дарааллаар/);
  });

  it('rejects excessive grass counts and invalid quality geometry counts', () => {
    type GrassInput = {
      grass: { bladesPerTuft: Record<string, unknown> };
      quality: Record<string, Record<string, unknown>>;
    };
    const tooManyTufts = JSON.parse(JSON.stringify(visualsJson)) as GrassInput;
    tooManyTufts.quality.low!.grassTufts = 15_001;
    expect(() => validateVisualStyle(tooManyTufts)).toThrow(/quality.low/);

    const tooManyBlades = JSON.parse(JSON.stringify(visualsJson)) as GrassInput;
    tooManyBlades.grass.bladesPerTuft.low = 17;
    expect(() => validateVisualStyle(tooManyBlades)).toThrow(/bladesPerTuft.low/);

    const tooFewGerSegments = JSON.parse(JSON.stringify(visualsJson)) as GrassInput;
    tooFewGerSegments.quality.low!.gerSegments = 7;
    expect(() => validateVisualStyle(tooFewGerSegments)).toThrow(/quality.low/);
  });

  it('validates pasture colors, water opacity, and cooking intervals', () => {
    type ExtendedInput = {
      grass: { pastureColors: Record<string, unknown> };
      water: { opacity: unknown };
      smoke: { cookingMinutes: unknown };
    };
    const badPastureColor = JSON.parse(JSON.stringify(visualsJson)) as ExtendedInput;
    badPastureColor.grass.pastureColors.camp = 'green';
    expect(() => validateVisualStyle(badPastureColor)).toThrow(/pastureColors.camp/);

    const badWaterOpacity = JSON.parse(JSON.stringify(visualsJson)) as ExtendedInput;
    badWaterOpacity.water.opacity = 1.1;
    expect(() => validateVisualStyle(badWaterOpacity)).toThrow(/water тохиргоо/);

    const overlappingCookingIntervals = JSON.parse(JSON.stringify(visualsJson)) as ExtendedInput;
    overlappingCookingIntervals.smoke.cookingMinutes = [[300, 600], [510, 1200]];
    expect(() => validateVisualStyle(overlappingCookingIntervals)).toThrow(/cookingMinutes/);
  });

  it('validates cloud shadows, seasonal flowers, and layered mountains', () => {
    const style = validateVisualStyle(visualsJson);
    expect(style.quality.low!.flowers).toBe(0);
    expect(style.quality.high!.flowers).toBeGreaterThan(0);
    expect(style.mountains.layers).toHaveLength(3);
    expect(style.cloudShadow.skyOpacity).toBeGreaterThan(0);

    const badCloud: Record<string, unknown> = JSON.parse(JSON.stringify(visualsJson));
    (badCloud.cloudShadow as Record<string, unknown>).opacity = 1.1;
    expect(() => validateVisualStyle(badCloud)).toThrow(/cloudShadow/);

    const badFlowers: Record<string, unknown> = JSON.parse(JSON.stringify(visualsJson));
    (badFlowers.flowers as Record<string, unknown>).colors = ['blue'];
    expect(() => validateVisualStyle(badFlowers)).toThrow(/flowers өнгө/);

    const badMountains: Record<string, unknown> = JSON.parse(JSON.stringify(visualsJson));
    (badMountains.mountains as { layers: unknown[] }).layers.splice(1);
    expect(() => validateVisualStyle(badMountains)).toThrow(/2–3 давхар/);
  });

  it('validates herder animation and face reactions', () => {
    const style = validateVisualStyle(visualsJson);
    expect(style.herderAnim.runFull).toBeGreaterThan(style.herderAnim.runFrom);
    for (const steps of Object.values(style.herderAnim.events)) {
      expect(steps.length).toBeGreaterThan(0);
      for (const [, seconds] of steps) expect(seconds).toBeGreaterThan(0);
    }
    const bad: Record<string, unknown> = JSON.parse(JSON.stringify(visualsJson));
    ((bad.herderAnim as Record<string, unknown>).events as Record<string, unknown>).wolf = [['furious', 1]];
    expect(() => validateVisualStyle(bad)).toThrow(/herderAnim/);
    const slow: Record<string, unknown> = JSON.parse(JSON.stringify(visualsJson));
    (slow.herderAnim as Record<string, unknown>).runFull = 1;
    expect(() => validateVisualStyle(slow)).toThrow(/herderAnim/);
  });

  it('validates sum-center resident crowd settings', () => {
    const style = validateVisualStyle(visualsJson);
    expect(style.sumResidents.looks.length).toBeGreaterThan(0);
    expect(style.sumResidents.lod).toBeGreaterThanOrEqual(0.2);
    const bad: Record<string, unknown> = JSON.parse(JSON.stringify(visualsJson));
    ((bad.sumResidents as Record<string, unknown>).looks as Array<Record<string, unknown>>)[0]!.hatType = 'crown';
    expect(() => validateVisualStyle(bad)).toThrow(/sumResidents/);
    const heavy: Record<string, unknown> = JSON.parse(JSON.stringify(visualsJson));
    (heavy.sumResidents as Record<string, unknown>).lod = 3;
    expect(() => validateVisualStyle(heavy)).toThrow(/sumResidents/);
  });

  it('validates dog rest pose settings (V3.2)', () => {
    const style = validateVisualStyle(visualsJson);
    expect(style.dogRest.lieAfterSec).toBeGreaterThan(0);
    expect(style.dogRest.townDogChance).toBeGreaterThanOrEqual(0);
    expect(style.dogRest.townDogChance).toBeLessThanOrEqual(1);
    const bad: Record<string, unknown> = JSON.parse(JSON.stringify(visualsJson));
    (bad.dogRest as Record<string, unknown>).townDogChance = 1.5;
    expect(() => validateVisualStyle(bad)).toThrow(/dogRest/);
    const deep: Record<string, unknown> = JSON.parse(JSON.stringify(visualsJson));
    (deep.dogRest as Record<string, unknown>).bodyDrop = 0.9;
    expect(() => validateVisualStyle(deep)).toThrow(/dogRest/);
  });

  it('dresses herders by season and colors helpers by role (V4.1)', () => {
    const style = validateVisualStyle(visualsJson);
    expect(style.outfits.seasons.winter.hat).toBe('fox');
    const rig = makeHerder(helperColors('horse', 'f'));
    const shown = (prefix: string): string[] =>
      rig.root.children.filter((c) => c.name.startsWith(prefix) && c.visible).map((c) => c.name);
    for (const season of ['summer', 'autumn', 'winter', 'spring'] as const) {
      dressHerder(rig, season);
      expect(shown('body:')).toEqual([`body:${style.outfits.seasons[season].body}`]);
      expect(shown('hat:')).toEqual([`hat:${style.outfits.seasons[season].hat}`]);
    }
    expect(helperColors('drive', 'm').deel).not.toBe(helperColors('herd', 'm').deel);
    const bad: Record<string, unknown> = JSON.parse(JSON.stringify(visualsJson));
    ((bad.outfits as Record<string, Record<string, unknown>>).seasons!).winter = { body: 'parka', hat: 'fox' };
    expect(() => validateVisualStyle(bad)).toThrow(/outfits\.seasons\.winter/);
  });

  it('validates vehicle dust and night lights (V4.2)', async () => {
    const style = validateVisualStyle(visualsJson);
    expect(style.vehicleFx.lights.nightFull).toBeLessThan(style.vehicleFx.lights.nightBelow);
    const { nightFactor } = await import('../src/render/vehicles');
    expect(nightFactor(1)).toBe(0);
    expect(nightFactor(0)).toBe(1);
    expect(nightFactor((style.vehicleFx.lights.nightBelow + style.vehicleFx.lights.nightFull) / 2)).toBeCloseTo(0.5);
    const bad: Record<string, unknown> = JSON.parse(JSON.stringify(visualsJson));
    ((bad.vehicleFx as Record<string, Record<string, unknown>>).lights!).nightFull = 0.9;
    expect(() => validateVisualStyle(bad)).toThrow(/vehicleFx\.lights/);
    const bad2: Record<string, unknown> = JSON.parse(JSON.stringify(visualsJson));
    ((bad2.vehicleFx as Record<string, Record<string, unknown>>).dust!).count = 0;
    expect(() => validateVisualStyle(bad2)).toThrow(/vehicleFx\.dust\.count/);
    const bad3: Record<string, unknown> = JSON.parse(JSON.stringify(visualsJson));
    ((bad3.vehicleFx as Record<string, Record<string, unknown>>).dust!).nightLight = 1.5;
    expect(() => validateVisualStyle(bad3)).toThrow(/vehicleFx\.dust\.nightLight/);
  });
  it('builds a tileable procedural map paper (V5.3)', async () => {
    const style = validateVisualStyle(visualsJson);
    const { paperPixels } = await import('../src/render/worldmap');
    const p = { ...style.mapPaper, texture: 64 };
    const a = paperPixels(64, p), b = paperPixels(64, p);
    expect(a.length).toBe(64 * 64 * 4);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
    let sum = 0;
    for (let i = 0; i < a.length; i += 4) sum += a[i]!;
    const mean = sum / (64 * 64) / 255;
    expect(mean).toBeGreaterThan(0.8);
    expect(mean).toBeLessThan(1);
    const bad: Record<string, unknown> = JSON.parse(JSON.stringify(visualsJson));
    (bad.mapPaper as Record<string, unknown>).texture = 300;
    expect(() => validateVisualStyle(bad)).toThrow(/mapPaper\.texture/);
    const bad2: Record<string, unknown> = JSON.parse(JSON.stringify(visualsJson));
    (bad2.mapPaper as Record<string, unknown>).edgeDarken = 2;
    expect(() => validateVisualStyle(bad2)).toThrow(/mapPaper\.edgeDarken/);
  });
});
