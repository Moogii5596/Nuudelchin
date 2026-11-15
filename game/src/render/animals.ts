/**
 * Малыг sim-ийн GameState-ээс InstancedMesh-ээр зурна (architecture.md §5).
 * Төрөл бүр хэдэн хэсэгтэй (их бие, толгой, эвэр, хөл) бөгөөд хэсэг бүр нэг InstancedMesh:
 * 300 мал ≈ 20 draw call. Хөлийг алхаж буй хурдаар савлуулж, бэлчиж байхад толгой доошилно.
 *
 * Sim алхам (1 тоглоомын минут) хооронд байрлалыг зөөлрүүлнэ (interpolation):
 * snapshot() — алхмын өмнөх байрлал, update(alpha) — өмнөх ба одоогийн хооронд.
 */
import * as THREE from 'three';
import type { GameConfig, Species } from '../sim/config';
import { SPECIES } from '../sim/config';
import type { Animal, GameState } from '../sim/state';
import { frameKg } from '../sim/systems/animals';
import { angDiff, boxGeo, clamp, merge } from './util';
import { paletteHex, visualStyle } from './style';
import { quality as activeQuality, type Quality } from '../device';

type Frame = 'body' | 'head' | 'leg' | 'tail';

interface PartDef {
  geo: THREE.BufferGeometry;
  frame: Frame;
  color: 'body' | number;
  only?: (a: Animal) => boolean;
  scale?: (a: Animal) => number;   // зөвхөн энэ хэсгийн хэмжээ (эвэр)
}

interface SpeciesDef {
  parts: PartDef[];
  headPivot: [number, number, number];
  tailPivot: [number, number, number];
  grazeHead: number;               // бэлчих үеийн толгойн налуу (рад)
  legs: [number, number][];        // [x, z] — урд зүүн, урд баруун, хойд зүүн, хойд баруун
  legTop: number;                  // хөлийн дээд үзүүрийн өндөр
  palette: number[];
  stride: number;                  // нэг алхамын урт (м) — хөлийн давтамж
}

const LEG_DARK = 0x3a2a20;

function legGeo(w: number, h: number): THREE.BufferGeometry {
  return boxGeo(w, h, w, 0, -h / 2, 0);
}

function helperMark(width: number, length: number, y: number, z: number): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 6, 4);
  g.scale(width, 0.045, length);
  g.translate(0, y, z);
  return g;
}

function sheepDef(): SpeciesDef {
  const body = new THREE.IcosahedronGeometry(0.5, 0);
  body.scale(1, 0.92, 1.35);
  body.translate(0, 0.78, 0);
  const tail = new THREE.SphereGeometry(0.26, 6, 5);
  tail.scale(1.1, 0.8, 0.7);
  tail.translate(0, 0.68, -0.66);
  const horns: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    const h = new THREE.TorusGeometry(0.11, 0.045, 4, 8, Math.PI * 1.5);
    h.rotateY((s * Math.PI) / 2);
    h.translate(s * 0.19, 0.11, 0.11);
    horns.push(h);
  }
  return {
    parts: [
      { geo: body, frame: 'body', color: 'body' },
      { geo: tail, frame: 'tail', color: 'body', scale: (a) => 0.65 + 0.9 * a.condition },
      { geo: merge([boxGeo(0.3, 0.32, 0.42, 0, 0.03, 0.17), boxGeo(0.34, 0.08, 0.1, 0, 0.13, 0.05)]), frame: 'head', color: 0x3a2a20 },
      { geo: merge(horns), frame: 'head', color: 0xcdbf9e, only: (a) => a.sex === 'm' && a.age >= 1 },
      { geo: helperMark(0.24, 0.38, 1.17, -0.08), frame: 'body', color: paletteHex('bluePattern'), only: (a) => a.ownerId !== undefined },
      { geo: legGeo(0.11, 0.5), frame: 'leg', color: LEG_DARK },
    ],
    headPivot: [0, 0.95, 0.55],
    tailPivot: [0, 0.68, -0.72],
    grazeHead: 0.85,
    legs: [[-0.2, 0.38], [0.2, 0.38], [-0.2, -0.38], [0.2, -0.38]],
    legTop: 0.5,
    palette: [0xf1ece0, 0xebe4d2, 0xf4f0e6, 0xe2d9c4],
    stride: 0.9,
  };
}

function goatDef(): SpeciesDef {
  const horns: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    const h = new THREE.ConeGeometry(0.045, 0.4, 4);
    h.rotateX(-0.7);
    h.translate(s * 0.08, 0.32, 0.02);
    horns.push(h);
  }
  return {
    parts: [
      { geo: merge([boxGeo(0.42, 0.48, 0.95, 0, 0.8, 0), boxGeo(0.07, 0.2, 0.07, 0, 1.04, -0.5, -0.6)]), frame: 'body', color: 'body' },
      { geo: merge([boxGeo(0.24, 0.28, 0.4, 0, 0.08, 0.16), boxGeo(0.08, 0.16, 0.08, 0, -0.1, 0.34)]), frame: 'head', color: 'body' },
      { geo: boxGeo(0.12, 0.18, 0.1, 0, -0.2, 0.34), frame: 'head', color: LEG_DARK },
      { geo: boxGeo(0.08, 0.38, 0.08, 0, 1.05, -0.5, -0.35), frame: 'tail', color: LEG_DARK },
      { geo: merge(horns), frame: 'head', color: 0x8a7a60, only: (a) => a.age >= 0.5, scale: (a) => (a.sex === 'm' ? 1.3 : 0.85) },
      { geo: helperMark(0.28, 0.48, 1.0, -0.05), frame: 'body', color: paletteHex('bluePattern'), only: (a) => a.ownerId !== undefined },
      { geo: legGeo(0.09, 0.56), frame: 'leg', color: LEG_DARK },
    ],
    headPivot: [0, 1.0, 0.42],
    tailPivot: [0, 1.05, -0.5],
    grazeHead: 0.9,
    legs: [[-0.14, 0.33], [0.14, 0.33], [-0.14, -0.33], [0.14, -0.33]],
    legTop: 0.56,
    palette: [0xe8e2d4, 0x6b4a2e, 0x2a2420, 0x8a847c, 0xb89a70],
    stride: 0.9,
  };
}

function cowDef(): SpeciesDef {
  const horns: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    const h = new THREE.ConeGeometry(0.07, 0.4, 5);
    h.rotateZ(-s * 0.9);
    h.translate(s * 0.3, 0.27, 0.15);
    horns.push(h);
  }
  return {
    parts: [
      { geo: boxGeo(0.9, 0.85, 1.75, 0, 1.08, 0), frame: 'body', color: 'body' },
      { geo: boxGeo(0.08, 0.75, 0.08, 0, 1.0, -0.92, 0.2), frame: 'tail', color: LEG_DARK },
      { geo: merge([boxGeo(0.46, 0.48, 0.6, 0, -0.05, 0.25)]), frame: 'head', color: 'body' },
      { geo: boxGeo(0.3, 0.28, 0.12, 0, -0.08, 0.57), frame: 'head', color: 0xf2ece2 },
      { geo: merge(horns), frame: 'head', color: 0xe8dcc0, only: (a) => a.age >= 1, scale: (a) => (a.sex === 'm' ? 1.3 : 0.9) },
      { geo: boxGeo(0.35, 0.2, 0.3, 0, 0.62, -0.45), frame: 'body', color: 0xe6a9a0, only: (a) => a.sex === 'f' && a.age >= 2 },
      { geo: helperMark(0.38, 0.68, 1.5, -0.05), frame: 'body', color: paletteHex('bluePattern'), only: (a) => a.ownerId !== undefined },
      { geo: legGeo(0.17, 0.66), frame: 'leg', color: 0x2a201a },
    ],
    headPivot: [0, 1.32, 0.85],
    tailPivot: [0, 1.0, -0.92],
    grazeHead: 0.75,
    legs: [[-0.3, 0.62], [0.3, 0.62], [-0.3, -0.62], [0.3, -0.62]],
    legTop: 0.66,
    palette: [0x5a3a22, 0x2a2522, 0x8a5a35, 0x6e4a2c, 0xa07a52],
    stride: 1.3,
  };
}

function horseDef(): SpeciesDef {
  return {
    parts: [
      { geo: boxGeo(0.6, 0.7, 1.5, 0, 1.3, 0), frame: 'body', color: 'body' },
      { geo: boxGeo(0.14, 0.8, 0.14, 0, 1.15, -0.85, 0.35), frame: 'tail', color: 0x2a1c12 },
      { geo: merge([boxGeo(0.32, 0.8, 0.36, 0, 0.28, 0.14, 0.55), boxGeo(0.3, 0.32, 0.62, 0, 0.6, 0.52)]), frame: 'head', color: 'body' },
      { geo: boxGeo(0.08, 0.55, 0.4, 0, 0.42, 0.02, 0.55), frame: 'head', color: 0x2a1c12 },
      { geo: helperMark(0.3, 0.62, 1.65, -0.05), frame: 'body', color: paletteHex('bluePattern'), only: (a) => a.ownerId !== undefined },
      { geo: legGeo(0.14, 0.95), frame: 'leg', color: 'body' },
    ],
    headPivot: [0, 1.48, 0.58],
    tailPivot: [0, 1.15, -0.85],
    grazeHead: 1.05,
    legs: [[-0.2, 0.58], [0.2, 0.58], [-0.2, -0.58], [0.2, -0.58]],
    legTop: 0.95,
    palette: [0x7a4a26, 0x9a5a2a, 0x2a2420, 0xcfc8bc, 0xb08a52, 0x5a3a22],
    stride: 1.8,
  };
}

/** Мал бүрийн дүрслэлийн төлөв (sim-д хадгалахгүй) */
interface Viz {
  px: number;   // өмнөх алхмын байрлал
  pz: number;
  h: number;    // харагдаж буй чиглэл
  phase: number;
  head: number;
  seen: number;
}

interface SpeciesMeshes {
  def: SpeciesDef;
  meshes: THREE.InstancedMesh[];
}

const MAX_PER_SPECIES = 3000;

export class AnimalsView {
  readonly group = new THREE.Group();
  private quality: Quality = activeQuality;
  private species = new Map<Species, SpeciesMeshes>();
  private viz = new Map<number, Viz>();
  private frameNo = 0;
  private mBase = new THREE.Matrix4();
  private mHead = new THREE.Matrix4();
  private mTmp = new THREE.Matrix4();
  private mRot = new THREE.Matrix4();
  private mScale = new THREE.Matrix4();
  private mPivot = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private p = new THREE.Vector3();
  private s = new THREE.Vector3();
  private c = new THREE.Color();
  private yAxis = new THREE.Vector3(0, 1, 0);

  constructor(private cfg: GameConfig) {
    const defs: Record<Species, SpeciesDef> = { sheep: sheepDef(), goat: goatDef(), cow: cowDef(), horse: horseDef() };
    for (const sp of SPECIES) {
      const def = defs[sp];
      const meshes = def.parts.map((part) => {
        const n = part.frame === 'leg' ? MAX_PER_SPECIES * 4 : MAX_PER_SPECIES;
        const m = new THREE.InstancedMesh(part.geo, new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), n);
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        m.setColorAt(0, this.c.set(0xffffff)); // instanceColor-ийг үүсгэнэ
        m.count = 0;
        m.castShadow = true;
        m.frustumCulled = false; // инстанцууд газар даяар тархсан
        this.group.add(m);
        return m;
      });
      this.species.set(sp, { def, meshes });
    }
  }

  setQuality(quality: Quality): void {
    this.quality = quality;
  }

  /** Sim алхмын өмнө дуудна: одоогийн байрлал «өмнөх» болно */
  snapshot(state: GameState): void {
    for (const a of state.animals) {
      const v = this.viz.get(a.id);
      if (v) {
        v.px = a.x;
        v.pz = a.z;
      }
    }
  }

  /**
   * alpha — өмнөх ба одоогийн алхмын хооронд (0–1), dt — бодит секунд,
   * stepSec — нэг sim алхам бодитоор хэдэн секунд (хурдаас хамаарна; 0 = зогссон)
   */
  update(state: GameState, heightAt: (x: number, z: number) => number, alpha: number, dt: number, stepSec: number): void {
    if (dt > 0) this.frameNo++;
    const counts = new Map<THREE.InstancedMesh, number>();
    const animals = this.cfg.animals;

    for (const a of state.animals) {
      if (a.riding) continue; // унаа морийг characters.ts зурна
      const sm = this.species.get(a.species);
      if (!sm) continue;
      const def = sm.def;
      let v = this.viz.get(a.id);
      if (!v) {
        v = { px: a.x, pz: a.z, h: a.heading, phase: (a.id * 1.7) % 6.28, head: 0, seen: 0 };
        this.viz.set(a.id, v);
      }
      v.seen = this.frameNo;
      const x = v.px + (a.x - v.px) * alpha;
      const z = v.pz + (a.z - v.pz) * alpha;
      const moved = Math.hypot(a.x - v.px, a.z - v.pz);
      const speed = stepSec > 0 ? moved / stepSec : 0; // м/сек (бодит)

      // Чиглэл: хөдөлж байвал хөдлөх зүг рүү, үгүй бол sim-ийн чиглэл рүү зөөлөн эргэнэ
      const target = moved > 0.02 ? Math.atan2(a.x - v.px, a.z - v.pz) : a.heading;
      v.h += angDiff(target, v.h) * Math.min(1, dt * 6);

      // Хөлийн савлалт
      const distance = Math.hypot(x - state.player.x, z - state.player.z);
      const walk = distance <= visualStyle.quality[this.quality].animalAnimationDistance ? Math.min(1, speed / 1.2) : 0;
      v.phase += (dt * speed * Math.PI) / def.stride;
      const swing = Math.sin(v.phase) * 0.65 * walk;

      // Толгой: бэлчиж байхад доош, хэвтэж хивэх үед бага зэрэг
      const grazing = a.mode === 'graze' && speed < 1.5;
      const drinking = a.mode === 'drink';
      const headTarget = grazing ? def.grazeHead + Math.sin(this.frameNo * 0.05 + a.id) * 0.08 :
        drinking ? def.grazeHead * 0.72 + Math.sin(this.frameNo * 0.16 + a.id) * 0.035 :
          a.mode === 'rest' || a.mode === 'sleep' ? 0.15 : 0;
      v.head += (headTarget - v.head) * Math.min(1, dt * 3);

      // Хэмжээ: насаар (жингийн шоо язгуур), таргаар өргөн
      const mature = animals.species[a.species].matureKg[a.sex];
      const sc = Math.max(0.35, Math.cbrt(frameKg(a, animals) / mature));
      const fat = 0.85 + 0.3 * a.condition;
      const resting = a.mode === 'rest' || a.mode === 'sleep';
      const y = heightAt(x, z) + (resting ? -def.legTop * 0.55 * sc : Math.abs(Math.sin(v.phase)) * 0.04 * walk);
      const breathing = resting ? Math.sin(this.frameNo * 0.045 + a.id) * 0.006 : 0;

      this.p.set(x, y, z);
      this.q.setFromAxisAngle(this.yAxis, v.h);
      this.s.set(sc * fat * (1 + breathing), sc * (1 - breathing), sc * fat * (1 + breathing));
      this.mBase.compose(this.p, this.q, this.s);
      this.mRot.makeRotationX(v.head);
      const headSize = clamp(1.22 - sc * 0.22, 1, 1.22);
      this.mHead.makeTranslation(def.headPivot[0], def.headPivot[1], def.headPivot[2])
        .multiply(this.mRot)
        .multiply(this.mScale.makeScale(headSize, headSize, headSize));
      this.mHead.premultiply(this.mBase);

      let bodyCol = def.palette[(a.id * 7 + 3) % def.palette.length] ?? def.palette[0]!;
      def.parts.forEach((part, pi) => {
        if (part.only && !part.only(a)) return;
        const mesh = sm.meshes[pi]!;
        let i = counts.get(mesh) ?? 0;
        this.c.setHex(part.color === 'body' ? bodyCol : part.color);
        if (part.frame === 'tail') {
          const [tx, ty, tz] = def.tailPivot;
          const flick = Math.sin(v.phase * 0.9 + a.id * 0.73) * (resting ? 0.07 : 0.15);
          const tailScale = part.scale?.(a) ?? 1;
          this.mTmp.makeTranslation(tx, ty, tz)
            .multiply(this.mRot.makeRotationX(flick))
            .multiply(this.mScale.makeScale(tailScale, tailScale, tailScale))
            .multiply(this.mPivot.makeTranslation(-tx, -ty, -tz))
            .premultiply(this.mBase);
          mesh.setMatrixAt(i, this.mTmp);
          mesh.setColorAt(i, this.c);
          i++;
        } else if (part.frame === 'leg') {
          def.legs.forEach(([lx, lz], li) => {
            const sw = resting ? -1.35 : li === 0 || li === 3 ? swing : -swing;
            this.mTmp.makeTranslation(lx, def.legTop, lz).multiply(this.mRot.makeRotationX(sw));
            this.mTmp.premultiply(this.mBase);
            mesh.setMatrixAt(i, this.mTmp);
            mesh.setColorAt(i, this.c);
            i++;
          });
        } else {
          const m = part.frame === 'head' ? this.mHead : this.mBase;
          if (part.scale) {
            const k = part.scale(a);
            this.mTmp.makeScale(k, k, k).premultiply(m);
            mesh.setMatrixAt(i, this.mTmp);
          } else mesh.setMatrixAt(i, m);
          mesh.setColorAt(i, this.c);
          i++;
        }
        counts.set(mesh, i);
      });
    }

    for (const { meshes } of this.species.values()) {
      for (const m of meshes) {
        m.count = counts.get(m) ?? 0;
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }
    }
    // Үхсэн, зарагдсан малын төлөвийг цэвэрлэнэ
    if (this.frameNo % 120 === 0) for (const [id, v] of this.viz) if (v.seen !== this.frameNo) this.viz.delete(id);
  }

  /** Бууц солигдоход (мал шинэ газарт гарч ирнэ) зөөлрүүлэлтийг тэглэнэ */
  reset(): void {
    this.viz.clear();
  }
}
