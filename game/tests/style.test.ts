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
});
