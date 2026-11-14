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
});
