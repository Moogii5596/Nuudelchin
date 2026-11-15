import * as THREE from 'three';
import { beforeAll, describe, expect, it } from 'vitest';
import charactersJson from '../../data/characters.json';
import { characters, characterSpec, validateCharacters, visualDefaults, withColors } from '../src/render/character/spec';

/** Canvas-гүй орчинд (node) дүрийг угсрахад хангалттай хуурамч 2D context: бүх дуудлага өөрийгөө буцаана */
function stubCanvas(): void {
  const ctx: unknown = new Proxy(function () {}, { get: () => ctx, apply: () => ctx, set: () => true });
  (globalThis as { document?: unknown }).document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
}
type Lab = typeof import('../src/render/character/rig') & typeof import('../src/render/character/animate') & typeof import('../src/render/character/crowd') & typeof import('../src/render/character/materials');
let lab: Lab;
async function loadLab(): Promise<void> {
  stubCanvas();
  lab = { ...(await import('../src/render/character/rig')), ...(await import('../src/render/character/animate')), ...(await import('../src/render/character/crowd')), ...(await import('../src/render/character/materials')) };
}

const clone = (): Record<string, unknown> => JSON.parse(JSON.stringify(charactersJson));
const preset = (j: Record<string, unknown>, name = 'man'): Record<string, unknown> => (j.presets as Record<string, Record<string, unknown>>)[name]!;

/** Харагдах mesh бүр = 1 draw call (сүүдэргүй) */
function drawCalls(root: THREE.Object3D): number {
  let n = 0;
  const shown = (o: THREE.Object3D): boolean => { for (let q: THREE.Object3D | null = o; q; q = q.parent) if (!q.visible) return false; return true; };
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh && shown(o)) n++; });
  return n;
}
function textures(roots: THREE.Object3D[]): Set<THREE.Texture> {
  const s = new Set<THREE.Texture>();
  for (const r of roots) r.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshLambertMaterial | undefined; if (m?.map) s.add(m.map); });
  return s;
}

describe('Дүрийн тохиргоо (data/characters.json, V4.5 R3)', () => {
  it('тоглогч preset-ээс өвлөж, visuals.json-ийн хуваалцсан утгаар нөхөгдөнө', () => {
    const p = characterSpec('player');
    expect(p).toEqual(characters.presets.man);
    const d = visualDefaults() as { deel: { color: string; terlegLighten: number } };
    expect(p.deel.color).toBe(parseInt(d.deel.color.slice(1), 16));
    expect(p.deel.terlegLighten).toBe(d.deel.terlegLighten);
    expect(p.pose.elbowRest).toEqual([-0.25, -0.6]);
    expect(withColors(p, { deel: 0x123456, hem: 0x654321 }).deel).toMatchObject({ color: 0x123456, hem: 0x654321, button: p.deel.button });
    expect(() => characterSpec('ghost')).toThrow(/ghost/);
  });

  it('base гүн нийлнэ: хүүхэд preset зөвхөн ялгаатай утгаа бичнэ', () => {
    const j = clone();
    (j.presets as Record<string, unknown>).kid = { base: 'man', hair: { color: '#111111' }, bodies: { deel: { skirt: 0.4 } } };
    (j.presets as Record<string, unknown>).kid2 = { base: 'kid', legs: '#222222' };
    const r = validateCharacters(j);
    expect(r.presets.kid!.hair.color).toBe(0x111111);
    expect(r.presets.kid!.bodies.deel).toEqual({ thickness: 1, skirt: 0.4 });
    expect(r.presets.kid!.boots).toEqual(r.presets.man!.boots);
    expect(r.presets.kid2!.bodies.deel.skirt).toBe(0.4);
    expect(r.presets.kid2!.legs).toBe(0x222222);
  });

  it('буруу утгыг замтай нь барина', () => {
    const cases: Array<[(j: Record<string, unknown>) => void, RegExp]> = [
      [(j) => { (preset(j).skin as Record<string, unknown>).base = 'red'; }, /presets\.man\.skin\.base/],
      [(j) => { (preset(j).bodies as Record<string, Record<string, unknown>>).winter!.skirt = 3; }, /bodies\.winter\.skirt/],
      [(j) => { delete (preset(j).hats as Record<string, unknown>).fox; }, /hats\.fox/],
      [(j) => { (preset(j).boots as Record<string, unknown>).lace = '#ffffff'; }, /boots\.lace.*үл мэдэгдэх/],
      [(j) => { (preset(j).pose as Record<string, unknown>).elbowRest = [0]; }, /elbowRest/],
      [(j) => { (j.player as Record<string, unknown>).base = 'ghost'; }, /player\.base.*ghost/],
      [(j) => { preset(j).base = 'man'; }, /тойрог/],
      [(j) => { (preset(j).deel as Record<string, unknown>).terlegLighten = 0.9; }, /terlegLighten/],
    ];
    for (const [mutate, re] of cases) {
      const j = clone();
      mutate(j);
      expect(() => validateCharacters(j)).toThrow(re);
    }
  });
});

describe('Дүрийн сан (render/character, V4.5 R1–R2)', () => {
  beforeAll(loadLab);

  it('тоглогчийг угсарч улирлаар хувцаслана; draw call ≤ 39', () => {
    const rig = lab.buildCharacter(characterSpec('player'));
    const shown = (prefix: string): string[] => {
      const out: string[] = [];
      rig.root.traverse((o) => { if (o.name.startsWith(prefix) && o.visible && !out.includes(o.name)) out.push(o.name); });
      return out;
    };
    for (const season of ['summer', 'autumn', 'winter', 'spring'] as const) {
      lab.dressCharacter(rig, season);
      expect(shown('hat:')).toHaveLength(1);
      expect(shown('body:')).toHaveLength(1);
      expect(drawCalls(rig.root)).toBeLessThanOrEqual(39);
    }
    lab.dressCharacter(rig, 'summer');
    expect(rig.sleeveMat.color.getHex()).toBe(rig.sleeveColors.terleg);
    expect(rig.sleeveColors.terleg).toBe(lab.lighten(rig.sleeveColors.deel, characterSpec('player').deel.terlegLighten));
  });

  it('10 дүр угсрахад текстур, хуваалцсан материалын тоо өсөхгүй (R2)', () => {
    const first = lab.buildCharacter(characterSpec('player'));
    const tex1 = textures([first.root]).size, lib1 = lab.libraryStats();
    const rigs = Array.from({ length: 10 }, (_, i) => lab.buildCharacter(withColors(characterSpec('man'), { deel: i % 2 ? 0x8a2a2a : 0x2f5d9b, hem: 0x2a528a })));
    expect(textures([first.root, ...rigs.map((r) => r.root)]).size).toBe(tex1);
    expect(lab.libraryStats().textures).toBe(lib1.textures);
    // ханцуй дүр бүрд өөр (улирлаар өнгө солигддог), текстур нь нэг
    expect(new Set(rigs.map((r) => r.sleeveMat)).size).toBe(10);
    expect(new Set(rigs.map((r) => r.sleeveMat.map)).size).toBe(1);
  });

  it('animateCharacter: алхаа, морь, суух байрлал ба дэвхцэлт', () => {
    const rig = lab.buildCharacter(characterSpec('player'));
    const pose = { dt: 1 / 60, speed: 1.6, mode: 'foot', raise: false, uurga: false, talk: false, emotion: 'happy' } as const;
    let bob = 0;
    for (let i = 0; i < 30; i++) bob = Math.max(bob, lab.animateCharacter(rig, pose));
    expect(bob).toBeGreaterThan(0);
    expect(rig.legs[0].rotation.x).not.toBe(rig.legs[1].rotation.x);
    expect(rig.anim.emo.smile).toBeGreaterThan(0.5);
    expect(lab.animateCharacter(rig, { ...pose, mode: 'mounted' })).toBe(0);
    expect(rig.knees[0].rotation.x).toBeCloseTo(0.9);
    lab.animateCharacter(rig, { ...pose, mode: 'seated' });
    expect(rig.legs[1].rotation.x).toBeCloseTo(-1.4);
  });

  it('crowd: нэг төрх кэштэй, тогтмол нүүртэй, сүүдэр цөөн хэсэгт', () => {
    const look = { colors: { deel: 0x7a3b2a, hem: 0x5a2a1a, hat: 0 }, body: 'deel' as const, hat: 'toortsog' };
    const parts = lab.makeCrowdParts(look);
    expect(lab.makeCrowdParts({ ...look })).toBe(parts);
    expect(parts.length).toBeGreaterThan(3);
    expect(parts.length).toBeLessThanOrEqual(12);
    expect(parts.filter((p) => p.castShadow).length).toBeLessThanOrEqual(3);
    expect(lab.makeCrowdParts({ ...look, hat: 'none' })).not.toBe(parts);
  });
});
