import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import lookJson from '../../data/animals-look.json';
import { animalLook, parseAnimalLook } from '../src/render/animal/config';
import { AnimalSet, RestPoses, trisOf } from '../src/render/animal/lod';
import { ageIdxOf } from '../src/render/animal/model';
import { goatModel } from '../src/render/animal/goat';
import { sheepModel } from '../src/render/animal/sheep';
import { makeRig, poseAnimal, settle } from '../src/render/animal/pose';

const clone = (): Record<string, any> => JSON.parse(JSON.stringify(lookJson));

describe('data/animals-look.json — шалгагч', () => {
  it('анхдагч тохиргоо зөв; хоёр төрөл, 5 зүс', () => {
    expect(animalLook.species.sheep.variants.length).toBe(5);
    expect(animalLook.species.goat.variants.length).toBe(5);
    expect(animalLook.species.goat.head.horn?.pts.length).toBeGreaterThan(3);
    expect(animalLook.species.sheep.head.horn).toBeUndefined();
    expect(animalLook.quality.high.detail).toBe(6);
    expect(animalLook.quality.mid.detail).toBe(3);
    expect(animalLook.quality.low.detail).toBe(0);
  });

  it('алдаатай утгыг замтай нь хамт илрүүлнэ', () => {
    const a = clone(); a.species.sheep.d.legLen = -1;
    expect(() => parseAnimalLook(a)).toThrow(/species\.sheep\.d\.legLen/);
    const b = clone(); b.palette.hoof = 'red';
    expect(() => parseAnimalLook(b)).toThrow(/palette\.hoof/);
    const c = clone(); c.species.goat.variants = [];
    expect(() => parseAnimalLook(c)).toThrow(/variants/);
    const d = clone(); delete c.species; delete d.species.goat;
    expect(() => parseAnimalLook(d)).toThrow(/goat/);
    const e = clone(); e.quality.high.detail = 1000;
    expect(() => parseAnimalLook(e)).toThrow(/quality\.high\.detail/);
  });
});

describe('render/animal — хөнгөн, дэлгэрэнгүй хэсгүүд', () => {
  const group = new THREE.Group();
  for (const [name, model] of [['хонь', sheepModel], ['ямаа', goatModel]] as const) {
    it(`${name}: хөнгөн ≤ 800 гурвалжин, draw call ≤ 6, дэлгэрэнгүй илүү нарийн`, () => {
      const light = model.parts('light'), detail = model.parts('detail');
      expect(trisOf(light)).toBeLessThanOrEqual(800);
      expect(light.length).toBeLessThanOrEqual(6);
      expect(detail.length).toBe(light.length);              // ижил бүтэц: кэш хоёуланд таарна
      expect(trisOf(detail)).toBeGreaterThan(trisOf(light) * 5);
      for (const p of [...light, ...detail]) {
        for (const a of ['position', 'normal', 'color', 'aSlot']) expect(p.geo.attributes[a], `${p.name}.${a}`).toBeDefined();
      }
    });
  }

  it('AnimalSet: instance-ийн тоо, эвэртэй/эвэргүй толгойн сонголт, кэш', () => {
    const set = new AnimalSet(goatModel.parts('light'), group, 50);
    const rig = makeRig('goat'); rig.root.position.set(3, 0, 4);
    poseAnimal(rig, 0.016, { action: 'stand', speed: 0, fast: false, sc: 1, old: false, fat: 0.6 });
    rig.root.updateMatrixWorld(true);
    const cols = goatModel.colors(0, false);
    set.begin();
    set.push(rig, { male: true, ageIdx: 4, patch: false, mark: false }, cols);     // азарга: ♂ толгой
    set.push(rig, { male: false, ageIdx: 4, patch: false, mark: true }, cols);     // эм: ♀ толгой
    set.push(rig, { male: true, ageIdx: 0, patch: true, mark: false }, cols);      // ишиг: ♀ толгой
    set.end();
    const byName = (n: string): THREE.InstancedMesh => set.meshes[set.parts.findIndex((p) => p.name.startsWith(n))]!;
    expect(byName('бие').count).toBe(3);
    expect(byName('толгой ♂').count).toBe(1);
    expect(byName('толгой ♀').count).toBe(2);
    expect(byName('хөл дээд').count).toBe(12);
    const mark = byName('бие').geometry.attributes.iMark as THREE.BufferAttribute;
    expect([mark.getX(0), mark.getX(1), mark.getX(2)]).toEqual([0, 1, 0]);
    // кэшлэсэн байрлал: матриц бүрэн, root-оор шилжинэ
    const rest = new RestPoses('goat', set.parts), m = rest.get('graze');
    expect(m.length).toBe(set.parts.length);
    expect(rest.get('graze')).toBe(m);
    set.begin();
    set.pushRest(new THREE.Matrix4().makeTranslation(10, 0, 0), m, { male: false, ageIdx: 3, patch: false, mark: false }, cols);
    set.end();
    const bm = new THREE.Matrix4(); byName('бие').getMatrixAt(0, bm);
    expect(bm.elements[12]).toBeCloseTo(10, 5);
    set.dispose();
  });
});

describe('render/animal — хөдөлгөөн', () => {
  it('хэвтэхэд бие газарт ойртоно, бэлчихэд толгой доошилно, алхахад өвдөг нугарна', () => {
    const rig = makeRig('sheep'), base = { speed: 0, fast: false, sc: 1, old: false, fat: 0.6 };
    settle(rig, 'stand', base);
    const yStand = rig.body.position.y, headStand = rig.head.rotation.x + rig.neck.rotation.x;
    settle(rig, 'lie', base);
    expect(rig.body.position.y).toBeLessThan(yStand);
    settle(rig, 'graze', base);
    expect(rig.neck.rotation.x + rig.head.rotation.x).toBeGreaterThan(headStand + 0.5);
    settle(rig, 'stand', base);
    let maxKnee = 0;
    for (let i = 0; i < 120; i++) { poseAnimal(rig, 0.03, { ...base, action: 'walk', speed: 1.0 }); maxKnee = Math.max(maxKnee, rig.legs[0]!.knee.rotation.x); }
    expect(maxKnee).toBeGreaterThan(0.3);                    // урд өвдөг нугарна
  });

  it('ямаа бут зулгаахдаа өндийж (бие дээш), хонь зулгаахгүй', () => {
    const goat = makeRig('goat'), sheep = makeRig('sheep'), o = { speed: 0, fast: false, sc: 1, old: false, fat: 0.6 };
    settle(goat, 'browse', o); settle(sheep, 'graze', o);
    expect(goat.body.rotation.x).toBeLessThan(-0.3);          // нус дээш
    expect(sheep.body.rotation.x).toBeGreaterThan(0);          // хонь бэлчихдээ бөхийнө
  });

  it('нас: хурга хөл урт, бие богино; хөгшин туранхай', () => {
    const rig = makeRig('sheep'), o = { speed: 0, fast: false, old: false, fat: 0.6 };
    settle(rig, 'stand', { ...o, sc: 1 });
    const adultLeg = rig.legs[0]!.up.scale.y, adultZ = rig.shape.scale.z;
    settle(rig, 'stand', { ...o, sc: 0.5 });
    expect(rig.legs[0]!.up.scale.y).toBeGreaterThan(adultLeg * 1.3);
    expect(rig.shape.scale.z).toBeLessThan(adultZ);
    expect(rig.root.scale.x).toBeCloseTo(0.5, 5);
    expect(ageIdxOf(0.3, false)).toBe(0);
    expect(ageIdxOf(9, true)).toBe(5);
  });

  it('зүс: id-аас тогтмол, 5 зүс бүгд гарч ирнэ; алаг нь зөвхөн ямаанд', () => {
    const seen = new Set<number>();
    for (let id = 1; id <= 400; id++) { expect(goatModel.variantOf(id)).toBe(goatModel.variantOf(id)); seen.add(goatModel.variantOf(id)); }
    expect(seen.size).toBe(5);
    expect(goatModel.isPatched(3)).toBe(true);
    expect([0, 1, 2, 3, 4].some((v) => sheepModel.isPatched(v))).toBe(false);
    expect(goatModel.colors(0, true).wool).not.toBe(goatModel.colors(0, false).wool);   // хөгшин бүдэг
  });
});
