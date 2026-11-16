import * as THREE from 'three';
import { beforeAll, describe, expect, it } from 'vitest';
import charactersJson from '../../data/characters.json';
import visualsJson from '../../data/visuals.json';
import { characters, characterSpec, helperSpec, validateCharacters, withColors } from '../src/render/character/spec';

/** Canvas-гүй орчинд (node) дүрийг угсрахад хангалттай хуурамч 2D context: бүх дуудлага өөрийгөө буцаана */
function stubCanvas(): void {
  const ctx: unknown = new Proxy(function () {}, { get: (_t, k) => (k === 'measureText' ? () => ({ width: 100 }) : ctx), apply: () => ctx, set: () => true });
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
    expect(p.deel.color).toBe(0x2f5d9b);                     // V4.4-ийн тоглогчийн өнгө (visuals.json-оос шилжсэн, R5)
    expect(p.deel.terlegLighten).toBe(0.22);
    expect(p.deel.winterTrim).toBe(0xe6dccb);
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

  it('animateCharacter: зогсохдоо зөөлөн (хурдын шуугиан босго дээр сэгсрэхгүй)', () => {
    const rig = lab.buildCharacter(characterSpec('player'));
    const pose = { dt: 1 / 60, speed: 6, mode: 'foot', raise: false, uurga: false, talk: false, emotion: 'neutral' } as const;
    for (let i = 0; i < 60; i++) lab.animateCharacter(rig, pose);
    // зогсонги: хурд 0 → нэг кадрт хөл тэг рүү үсрэхгүй
    let prev = rig.legs[0].rotation.x, maxStep = 0, flips = 0, wasMoving = rig.anim.moving;
    for (let i = 0; i < 90; i++) {
      lab.animateCharacter(rig, { ...pose, speed: i < 3 ? 0.2 : 0 });
      maxStep = Math.max(maxStep, Math.abs(rig.legs[0].rotation.x - prev));
      prev = rig.legs[0].rotation.x;
      if (rig.anim.moving !== wasMoving) { flips++; wasMoving = rig.anim.moving; }
    }
    expect(maxStep).toBeLessThan(0.35);
    expect(flips).toBe(1);
    expect(rig.legs[0].rotation.x).toBeCloseTo(0, 5);
    // босго орчмын шуугиантай хурд → алхаа/зогсолт хооронд давхар шилжихгүй
    const rig2 = lab.buildCharacter(characterSpec('player'));
    let flips2 = 0, was = false;
    for (let i = 0; i < 120; i++) {
      lab.animateCharacter(rig2, { ...pose, speed: i % 2 ? 0.1 : 0.55 });
      if (rig2.anim.moving !== was) { flips2++; was = rig2.anim.moving; }
    }
    expect(flips2).toBeLessThanOrEqual(1);
  });

  it('animateCharacter: зогсоход толгой/мөрний өндөр кадр бүрт < 2 мм алхмаар, эргэлтгүй (алхаа 20 кадр; гүйлтийн сүүл тогтвортой)', () => {
    for (const speed of [2.2, 6]) {
      const rig = lab.buildCharacter(characterSpec('player'));
      const pose = { dt: 1 / 60, speed, mode: 'foot', raise: false, uurga: false, talk: false, emotion: 'neutral' } as const;
      for (let i = 0; i < 120; i++) rig.root.position.y = lab.animateCharacter(rig, pose);
      const v = new THREE.Vector3(), ys: number[][] = [];
      for (let i = 0; i < 60; i++) {
        rig.root.position.y = lab.animateCharacter(rig, { ...pose, speed: 0 });
        rig.root.updateMatrixWorld(true);
        ys.push([rig.neck.getWorldPosition(v).y * 1000, rig.arms[0].getWorldPosition(v).y * 1000]);
      }
      // алхаа: эхний 20 кадр; гүйлт: тоормослолтын 15 кадрын дараа (тэр хүртэл гүйлтийн дэвхцэл өөрөө)
      const from = speed > 4 ? 15 : 1, to = speed > 4 ? 60 : 20;
      for (let k = 0; k < 2; k++) {
        let dir = 0;
        for (let i = from; i < to; i++) {
          const d = ys[i]![k]! - ys[i - 1]![k]!;
          expect(Math.abs(d)).toBeLessThan(2);
          if (Math.abs(d) > 0.6) { if (dir) expect(Math.sign(d)).toBe(dir); dir = Math.sign(d); }   // чиглэл эргэхгүй
        }
      }
      expect(Math.abs(ys[59]![0]! - ys[58]![0]!)).toBeLessThan(0.1);   // ~1 сек орчимд тогтсон
    }
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
    const look = { preset: 'elder_goatee', body: 'deel' as const, hat: 'toortsog' as const };
    const parts = lab.makeCrowdParts(look);
    expect(lab.makeCrowdParts({ ...look })).toBe(parts);
    expect(parts.length).toBeGreaterThan(3);
    expect(parts.length).toBeLessThanOrEqual(12);
    expect(parts.filter((p) => p.castShadow).length).toBeLessThanOrEqual(3);
    expect(lab.makeCrowdParts({ ...look, hat: 'none' })).not.toBe(parts);
    // эмэгтэйн алчуур өмсгөлгүй ч угсрагдана (hats)
    const scarf = lab.makeCrowdParts({ preset: 'teacher_glasses', body: 'deel', hat: 'scarf' });
    expect(scarf.length).toBeGreaterThan(3);
  });

  it('сумын төвийн олон хүн: draw call өмнөхөөс (4 төрх × 10 хэсэг + 2 сүүдэр) өсөхгүй (R5)', () => {
    let calls = 0;
    for (const look of characters.crowd.looks) {
      const parts = lab.makeCrowdParts(look);
      calls += parts.length + parts.filter((p) => p.castShadow).length;
    }
    expect(calls).toBeLessThanOrEqual(4 * 12);
  });

  it('crowd far: төрх бүр 1 хэсэг (оройн өнгө, сүүдэргүй, бэхэн хүрээгүй), кэштэй', () => {
    for (const look of characters.crowd.looks) {
      const far = lab.makeCrowdFar(look);
      expect(lab.makeCrowdFar({ ...look })).toBe(far);
      expect(far.castShadow).toBe(false);
      expect((far.material as THREE.MeshLambertMaterial).vertexColors).toBe(true);
      expect(far.geometry.attributes.color!.count).toBe(far.geometry.attributes.position!.count);
      const near = lab.makeCrowdParts(look).filter((p) => (p.material as THREE.Material).side !== THREE.BackSide);
      expect(far.geometry.attributes.position!.count).toBe(near.reduce((n, p) => n + p.geometry.attributes.position!.count, 0));
    }
  });

  it('bakeStatic: материалаар нэгтгэж ертөнцийн байрлалд шингээнэ, swap null хасна', async () => {
    const { bakeStatic } = await import('../src/render/character/bake');
    const a = new THREE.MeshLambertMaterial(), b = new THREE.MeshLambertMaterial();
    const root = (x: number, m: THREE.Material): THREE.Object3D => { const g = new THREE.Group(); g.position.x = x; g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), m)); return g; };
    const hidden = root(9, a); hidden.children[0]!.visible = false;
    const parts = bakeStatic([root(0, a), root(10, a), root(20, b), hidden]);
    expect(parts.length).toBe(2);
    const pa = parts.find((p) => p.material === a)!;
    pa.geometry.computeBoundingBox();
    expect(pa.geometry.boundingBox!.min.x).toBeCloseTo(-0.5);
    expect(pa.geometry.boundingBox!.max.x).toBeCloseTo(10.5);
    expect(pa.geometry.attributes.position!.count).toBe(72);
    expect(bakeStatic([root(0, a), root(5, b)], { swap: (_m, m) => (m === b ? null : m) }).length).toBe(1);
    // ижил тохиргоотой өөр материалууд key-ээр нэг хэсэг болно
    expect(bakeStatic([root(0, a), root(5, b)], { key: (m) => m.type }).length).toBe(1);
  });

  it('LabelAtlas: олон самбар 1 mesh, бичгийг UV-ээр солино', async () => {
    const { LabelAtlas } = await import('../src/render/labelAtlas');
    const at = new LabelAtlas(), A = { text: 'A', bg: '#000000', fg: '#ffffff' }, B = { text: 'B', bg: '#000000', fg: '#ffffff' };
    at.cell(B);
    const q = at.add(A, 2, 1, 0, 0, 0, 0);
    at.add(A, 2, 1, 5, 0, 0, Math.PI / 2);
    const mesh = at.build()!;
    expect(mesh.geometry.attributes.position!.count).toBe(8);
    const uv = mesh.geometry.attributes.uv!, u0 = uv.getX(0);
    at.setText(q, B);
    expect(uv.getX(0)).not.toBeCloseTo(u0);
    expect(uv.getX(4)).toBeCloseTo(u0);   // нөгөө самбар хэвээр
    expect(() => at.setText(q, { text: 'C', bg: '#000000', fg: '#ffffff' })).toThrow(/C/);
  });

  it('туслах: үүрэг × хүйс → preset, дээл үүргийн өнгөөр, улирлаар хувцаслана (R5)', () => {
    const roles = (visualsJson as { outfits: { helperRoles: Record<string, string> } }).outfits.helperRoles;
    const herder = helperSpec('herd', 'm', false);
    expect(herder.face).toEqual(characterSpec(characters.roles.herd.m).face);
    expect(herder.deel.color).toBe(parseInt(roles.herd!.slice(1), 16));
    expect(helperSpec('drive', 'm', false).deel.color).not.toBe(herder.deel.color);
    expect(helperSpec('collect', 'f', true).figure).toEqual(characterSpec(characters.roles.child.f).figure);
    expect(helperSpec('herd', 'f', false).wear?.autumn).toBe('scarf');      // айлын эхнэр алчууртай
    const rig = lab.buildCharacter(helperSpec('horse', 'm', false), { detail: 'npc' });
    const shown = (prefix: string): string[] => { const out: string[] = []; rig.root.traverse((o) => { if (o.name.startsWith(prefix) && o.visible && !out.includes(o.name)) out.push(o.name); }); return out; };
    const seasons = (visualsJson as { outfits: { seasons: Record<string, { body: string; hat: string }> } }).outfits.seasons;
    for (const season of ['summer', 'autumn', 'winter', 'spring'] as const) {
      lab.dressCharacter(rig, season);
      expect(shown('body:')).toEqual([`body:${seasons[season]!.body}`]);
      expect(shown('hat:')).toEqual([`hat:${seasons[season]!.hat}`]);
    }
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

  it('хүний өндөр 1.65–1.75 м (толгойн төв ≈ 1.47), тоглогч, туслах, NPC бүгд нэг стандарт', () => {
    // өндөр = малгайгүй биеийн орой (малгай 0.1–0.25 м нэмнэ)
    const top = (rig: ReturnType<typeof lab.buildCharacter>): number => {
      rig.root.updateMatrixWorld(true);
      let y = 0;
      rig.root.traverse((o) => {
        if (!(o as THREE.Mesh).isMesh) return;
        for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.name.startsWith('hat:') || !q.visible) return;
        y = Math.max(y, new THREE.Box3().setFromObject(o).max.y);
      });
      return y;
    };
    for (const rig of [lab.buildCharacter(characterSpec('player')), lab.buildCharacter(helperSpec('horse', 'm', false), { detail: 'npc' }), lab.buildCharacter(characterSpec('man'), { detail: 'npc' })]) {
      const h = top(rig);
      expect(h).toBeGreaterThanOrEqual(1.65); expect(h).toBeLessThanOrEqual(1.75);
    }
    expect(characters.scale).toBeCloseTo(0.7, 2);
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
  const ready = characters.ready;
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
    const base = headBox('player'), wide = headBox('elder_beard'), tall = headBox('elder_goatee');
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

describe('npc гурвалжин (V4.5 R4)', () => {
  beforeAll(loadLab);
  it('npc нэг дүр ≤ 8 000 гурвалжин, улирал бүрт', () => {
    const tris = (root: THREE.Object3D): number => {
      let n = 0;
      const shown = (o: THREE.Object3D): boolean => { for (let q: THREE.Object3D | null = o; q; q = q.parent) if (!q.visible) return false; return true; };
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !shown(m)) return;
        n += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position!.count) / 3 * ((m as THREE.InstancedMesh).count ?? 1);
      });
      return n;
    };
    for (const name of characters.ready) {
      const rig = lab.buildCharacter(characterSpec(name), { detail: 'npc' });
      for (const season of ['summer', 'autumn', 'winter', 'spring'] as const) {
        lab.dressCharacter(rig, season);
        expect(tris(rig.root), `${name} ${season}`).toBeLessThanOrEqual(8000);
      }
    }
  });
});

describe('Ярилцлага, NPC сэтгэл хөдлөл (V4.5 R7)', () => {
  it('EmotionQueue: үйл явдлын дараалал дуусаад idle руу буцна', async () => {
    const { EmotionQueue } = await import('../src/render/character/talk');
    const q = new EmotionQueue();
    expect(q.step(0.1)).toBe('neutral');
    q.playEvent('sell');
    const seq = characters.talk.events.sell;
    expect(q.step(0.01)).toBe(seq[0]![0]);
    let t = 0, last = '';
    while (q.busy && t < 60) { last = q.step(0.1); t += 0.1; }
    expect(last).toBe(seq.at(-1)![0]);
    expect(q.step(0.1, 'happy')).toBe('happy');
    expect(characters.talk.events.buy[0]![0]).toBe('sad');
    expect(characters.talk.events.wolfSeen[0]![0]).toBe('surprised');
  });

  it('turnToward: богино замаар эргэнэ, хэтрэхгүй', async () => {
    const { turnToward } = await import('../src/render/character/talk');
    expect(turnToward(3, -3, 100, 1)).toBeCloseTo(3 + (2 * Math.PI - 6), 5);   // π-г дайрч богино зам
    expect(Math.abs(turnToward(0, 1, 2, 0.1) - 0.2)).toBeLessThan(1e-9);
  });

  it('talk тохиргооны алдааг барина', () => {
    const cases: Array<[(j: Record<string, unknown>) => void, RegExp]> = [
      [(j) => { ((j.talk as Record<string, unknown>).events as Record<string, unknown>).sell = [['joy', 1]]; }, /talk\.events\.sell\[0\]\[0\]/],
      [(j) => { (j.talk as Record<string, unknown>).partnerR = 0; }, /talk\.partnerR/],
      [(j) => { (j.crowd as Record<string, unknown>).nearR = -1; }, /crowd\.nearR/],
      [(j) => { (j.crowd as Record<string, unknown>).liveShadow = 'yes'; }, /crowd\.liveShadow/],
      [(j) => { delete ((j.talk as Record<string, unknown>).events as Record<string, unknown>).wolfSeen; }, /talk\.events\.wolfSeen/],
    ];
    for (const [mutate, re] of cases) {
      const j = clone();
      mutate(j);
      expect(() => validateCharacters(j)).toThrow(re);
    }
  });
});
