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
      [(j) => { ((j.skins as Record<string, Record<string, unknown>>).medium!).base = 'red'; }, /skins.medium.base/],
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

describe('Ялгаатай төрх (V4.5 R4)', () => {
  beforeAll(loadLab);
  const SEASONS = ['summer', 'autumn', 'winter', 'spring'] as const;
  const vertices = (root: THREE.Object3D): number => {
    let n = 0;
    root.traverse((o) => { if ((o as THREE.Mesh).isMesh && !(o as THREE.InstancedMesh).isInstancedMesh) n += (o as THREE.Mesh).geometry.attributes.position!.count; });
    return n;
  };
  /** сүүдэргүй draw call + сүүдэр тусгах харагдах mesh */
  const callsWithShadow = (root: THREE.Object3D): number => {
    let n = 0;
    const shown = (o: THREE.Object3D): boolean => { for (let q: THREE.Object3D | null = o; q; q = q.parent) if (!q.visible) return false; return true; };
    root.traverse((o) => { if ((o as THREE.Mesh).isMesh && shown(o)) n += o.castShadow ? 2 : 1; });
    return n;
  };

  it('preset бүр A, B хувилбартай, base-ээс зөв өвлөнө', () => {
    const NAMES = ['woman_braids', 'woman_plait', 'boy_shorthair', 'boy_shaved', 'girl_braids', 'girl_bun', 'elder_goatee', 'elder_beard', 'granny_bun', 'granny_plait', 'teacher_glasses'];
    for (const n of NAMES) expect(characters.presets[n], n).toBeDefined();
    const girl = characterSpec('girl_braids'), granny = characterSpec('granny_bun');
    expect(girl.figure.head).toBe(characterSpec('boy').figure.head);      // boy → girl
    expect(girl.hair.style).toBe('braids');
    expect(granny.hair.style).toBe('bun');                                  // woman-ий braids-ийг дарна
    expect(granny.face.lashes).toBe(false);
    expect(characterSpec('elder_beard').face.beard).toBe('full');
    expect(characterSpec('player').figure).toEqual({ stature: 1, legs: 1, build: 1, head: 1, hunch: 0 });
  });

  it('R4-ийн буруу утгыг барина', () => {
    const cases: Array<[(j: Record<string, unknown>) => void, RegExp]> = [
      [(j) => { (preset(j).hair as Record<string, unknown>).style = 'mohawk'; }, /hair\.style/],
      [(j) => { (preset(j).hair as Record<string, unknown>).strands = ['#000000']; }, /hair\.strands/],
      [(j) => { (preset(j).figure as Record<string, unknown>).stature = 2; }, /figure\.stature/],
      [(j) => { (preset(j).face as Record<string, unknown>).beard = 'long'; }, /face\.beard/],
      [(j) => { ((preset(j).face as Record<string, unknown>).eyes as Record<string, unknown>).w = 0; }, /face\.eyes\.w/],
      [(j) => { (j.detail as Record<string, Record<string, unknown>>).npc!.lod = 2; }, /detail\.npc\.lod/],
    ];
    for (const [mutate, re] of cases) {
      const j = clone();
      mutate(j);
      expect(() => validateCharacters(j)).toThrow(re);
    }
  });

  it('бие галбир ясаар: хүүхэд намхан, толгой харьцангуй том; өвгөн бөгтөр', () => {
    const neckAt = (name: string): THREE.Vector3 => {
      const rig = lab.buildCharacter(characterSpec(name), { detail: 'npc' });
      rig.root.updateMatrixWorld(true);
      return rig.neck.getWorldPosition(new THREE.Vector3());
    };
    const man = neckAt('player'), boy = neckAt('boy_shorthair'), woman = neckAt('woman_braids'), elder = neckAt('elder_goatee');
    expect(boy.y).toBeLessThan(man.y * 0.7);
    expect(woman.y).toBeLessThan(man.y);
    expect(woman.y).toBeGreaterThan(boy.y);
    expect(elder.z).toBeGreaterThan(man.z + 0.05);        // хүзүү урагш
    const kid = lab.buildCharacter(characterSpec('boy_shorthair'), { detail: 'npc' });
    expect(kid.neck.scale.x).toBeCloseTo(characterSpec('boy_shorthair').figure.head, 5);          // толгой (нийт өндөр нь бэлхүүсэнд)
    expect(kid.waist.scale.x).toBeCloseTo(characterSpec('boy_shorthair').figure.stature, 5);
  });

  it('үсний загвар: гэзэг, боодол нэмэлт геометртэй, халзан оройгүй', () => {
    const base = characterSpec('woman_braids');
    const v = (style: 'short' | 'bald' | 'bun' | 'braids' | 'braid'): number => vertices(lab.buildCharacter({ ...base, hair: { ...base.hair, style } }, { detail: 'npc' }).root);
    const short = v('short');
    expect(v('braids')).toBeGreaterThan(v('braid'));
    expect(v('braid')).toBeGreaterThan(short);
    expect(v('bun')).toBeGreaterThan(short);
    expect(v('bald')).toBeLessThan(short);
  });

  it('npc нүүр атласаас: сэтгэл хөдлөлөөр зөвхөн UV шилжинэ, зураг хуваалцана', async () => {
    const { atlasCount } = await import('../src/render/character/face');
    const a = lab.buildCharacter(characterSpec('woman_braids'), { detail: 'npc' }), b = lab.buildCharacter(characterSpec('woman_braids'), { detail: 'npc' });
    expect(a.face.material).not.toBe(b.face.material);
    expect(a.face.material.map!.source).toBe(b.face.material.map!.source);
    const n = atlasCount();
    lab.buildCharacter(characterSpec('woman_braids'), { detail: 'npc' });
    expect(atlasCount()).toBe(n);
    const before = a.face.material.map!.offset.clone();
    const pose = { dt: 1 / 60, speed: 0, mode: 'foot', raise: false, uurga: false, talk: false, emotion: 'angry' } as const;
    for (let i = 0; i < 20; i++) lab.animateCharacter(a, pose);
    expect(a.face.material.map!.offset.equals(before)).toBe(false);
    expect(a.face.material.map!.repeat.x).toBeCloseTo(1 / 6);
  });

  it('8 npc дүр зэрэг < +200 draw call (сүүдэртэй), улирал бүрт', () => {
    const names = ['woman_braids', 'woman_plait', 'boy_shorthair', 'boy_shaved', 'girl_braids', 'girl_bun', 'elder_goatee', 'granny_bun'];
    const rigs = names.map((n) => lab.buildCharacter(characterSpec(n), { detail: 'npc' }));
    for (const season of SEASONS) {
      for (const r of rigs) lab.dressCharacter(r, season);
      const total = rigs.reduce((s, r) => s + callsWithShadow(r.root), 0);
      expect(total, season).toBeLessThan(200);
    }
    // npc нь full-ээс хөнгөн
    const full = lab.buildCharacter(characterSpec('player')), npc = lab.buildCharacter(characterSpec('player'), { detail: 'npc' });
    expect(vertices(npc.root)).toBeLessThan(vertices(full.root) * 0.6);
    expect(drawCalls(npc.root)).toBeLessThan(drawCalls(full.root));
  });
});

describe('Хүн бүр өөр (V4.5 R4 — арьс, толгой, царай, алчуур)', () => {
  beforeAll(loadLab);
  const ready = Object.keys(characters.presets).filter((n) => n.includes('_'));
  const names = (root: THREE.Object3D): string[] => { const out: string[] = []; root.traverse((o) => { if (o.name.startsWith('hat:')) out.push(o.name); }); return out; };

  it('арьсны палитр нэрээр; тоглогч хуучин утгаараа', () => {
    const p = characterSpec('player');
    expect(p.skin).toEqual({ base: 0xe0b48a, shade: 0xd6a67c, nail: 0xe6c3aa });
    expect(p.headShape).toEqual({ width: 1, height: 1, round: 0 });
    expect(p.face.eyes).toEqual({ shape: 'oval', w: 21, h: 31, spacing: 92, y: 0 });
    expect(p.face.brows.color).toBeNull();
    expect(p.wear).toBeNull();
    expect(new Set(ready.map((n) => characterSpec(n).skin.base)).size).toBe(4);
  });

  it('бэлэн дүр бүрийн царай, толгой, үс, бүсний хослол давхцахгүй', () => {
    const sig = (n: string): string => { const s = characterSpec(n); return JSON.stringify([s.skin, s.headShape, s.face, s.hair]); };
    expect(new Set(ready.map(sig)).size).toBe(ready.length);
    expect(new Set(ready.map((n) => characterSpec(n).sash.color)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(ready.map((n) => characterSpec(n).boots.shaft)).size).toBeGreaterThanOrEqual(3);
    expect(ready.filter((n) => characterSpec(n).face.glasses).length).toBeGreaterThanOrEqual(2);
  });

  it('эмэгтэй алчууртай, охин туузтай, зөвхөн өмсдөг малгайгаа угсарна; эрэгтэйд өөрчлөлтгүй', () => {
    const woman = lab.buildCharacter(characterSpec('woman_braids'), { detail: 'npc' });
    expect(names(woman.root).sort()).toEqual(['hat:fox', 'hat:scarf']);
    const shownHat = (rig: typeof woman): string[] => { const out: string[] = []; rig.root.traverse((o) => { if (o.name.startsWith('hat:') && o.visible) out.push(o.name); }); return out; };
    lab.dressCharacter(woman, 'summer');
    expect(shownHat(woman)).toEqual([]);                     // зун толгой нүцгэн
    lab.dressCharacter(woman, 'autumn');
    expect(shownHat(woman)).toEqual(['hat:scarf']);
    const girl = lab.buildCharacter(characterSpec('girl_bun'), { detail: 'npc' });
    lab.dressCharacter(girl, 'spring');
    expect(shownHat(girl)).toEqual(['hat:ribbon']);
    const granny = lab.buildCharacter(characterSpec('granny_plait'), { detail: 'npc' });
    lab.dressCharacter(granny, 'winter');
    expect(shownHat(granny)).toEqual(['hat:shawl']);
    expect(names(lab.buildCharacter(characterSpec('player')).root)).toEqual(['hat:toortsog', 'hat:fox']);
  });

  it('толгойн хэлбэр: өргөн/урт толгой геометрт, малгай нь толгойд таарна', () => {
    const headBox = (n: string): THREE.Vector3 => {
      const rig = lab.buildCharacter(characterSpec(n));   // full: толгой нэртэй үлдэнэ
      const head = rig.root.getObjectByName('head') as THREE.Mesh;
      head.geometry.computeBoundingBox();
      return head.geometry.boundingBox!.getSize(new THREE.Vector3());
    };
    const base = headBox('player'), wide = headBox('elder_beard'), tall = headBox('teacher_glasses');
    expect(wide.x / wide.y).toBeGreaterThan(base.x / base.y * 1.1);
    expect(tall.y / tall.x).toBeGreaterThan(base.y / base.x * 1.1);
  });

  it('R4 шинэ утгын алдааг барина', () => {
    const cases: Array<[(j: Record<string, unknown>) => void, RegExp]> = [
      [(j) => { preset(j).skin = 'green'; }, /presets\.man\.skin.*green/],
      [(j) => { ((preset(j).face as Record<string, unknown>).eyes as Record<string, unknown>).shape = 'star'; }, /eyes\.shape/],
      [(j) => { ((preset(j).face as Record<string, unknown>).brows as Record<string, unknown>).color = 'gray'; }, /brows\.color/],
      [(j) => { (preset(j).face as Record<string, unknown>).moles = [[0]]; }, /moles\[0\]/],
      [(j) => { (preset(j).headShape as Record<string, unknown>).width = 2; }, /headShape\.width/],
      [(j) => { preset(j).wear = { summer: 'crown', autumn: 'none', winter: 'fox', spring: 'none' }; }, /wear\.summer/],
      [(j) => { ((preset(j).hats as Record<string, unknown>).scarf as Record<string, unknown>).knot = 'side'; }, /scarf\.knot/],
    ];
    for (const [mutate, re] of cases) {
      const j = clone();
      mutate(j);
      expect(() => validateCharacters(j)).toThrow(re);
    }
  });
});
