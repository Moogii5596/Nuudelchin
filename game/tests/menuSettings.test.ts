/**
 * UI handoff 1 (docs/ui/handoff-1-menu-settings.md): шилжүүлэх кодын талбарын формат, дууны түвшин, хос хэлтэй шошго.
 */
import { describe, expect, it } from 'vitest';
import { formatCodeInput, normalizeCode } from '../src/persist/transferCode';
import { parseVolume } from '../src/audio/volume';
import { tIn } from '../src/i18n/i18n';
import audio from '../../data/audio.json';

describe('шилжүүлэх кодын оруулах талбар', () => {
  it('том үсэг болгож, 4-ийн дараа зураас автоматаар тавина', () => {
    expect(formatCodeInput('k7m2')).toBe('K7M2');
    expect(formatCodeInput('k7m29')).toBe('K7M2-9');
    expect(formatCodeInput('k7m2 9qxa')).toBe('K7M2-9QXA');
  });
  it('төөрөгдөм/буруу тэмдэгт (0, O, 1, I, L, U, тэмдэг)-ийг хасаж, 8-аас илүүг авахгүй', () => {
    expect(formatCodeInput('0O1ILU-k7')).toBe('K7');
    expect(formatCodeInput('K7M2-9QXA-ZZZ')).toBe('K7M2-9QXA');
  });
  it('бүрэн болсон код normalizeCode-оор хүчинтэй (Apply идэвхжинэ), дутуу нь хүчингүй', () => {
    expect(normalizeCode(formatCodeInput('k7m29qxa'))).toBe('K7M29QXA');
    expect(normalizeCode(formatCodeInput('k7m29qx'))).toBeNull();
  });
});

describe('дууны түвшин', () => {
  it('анхдагч data/audio.json-оос, 0–100-д хязгаарлагдана', () => {
    expect(parseVolume(null)).toBe(audio.defaultVolume);
    expect(parseVolume('')).toBe(audio.defaultVolume);
    expect(parseVolume('abc')).toBe(audio.defaultVolume);
    expect(parseVolume('35')).toBe(35);
    expect(parseVolume('0')).toBe(0);
    expect(parseVolume('140')).toBe(100);
    expect(parseVolume('-3')).toBe(0);
  });
});

describe('хос хэлтэй шошго', () => {
  it('tIn нь одоогийн хэлээс үл хамааран заасан хэлээр буцаана', () => {
    expect(tIn('en', 'menu.settings')).toBe('Settings');
    expect(tIn('mn', 'menu.settings')).not.toBe('Settings');
    expect(tIn('en', 'hud.day', { day: 3 })).toBe('Day 3');
  });
});
