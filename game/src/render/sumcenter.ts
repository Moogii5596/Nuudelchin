/**
 * Сумын төвийн 3D (M4.6 → V3.3 Могод сум, хэрэглэгчийн шийдвэр 2026-11-15). Байршил `data/sumcenter.json`,
 * бүтээгч `render/sumlayout.ts`. Тоглогч газрын зургаас цэцэрлэгийн зүүн талын замаар орж ирнэ. Дэлгүүр бүр өөр
 * үүрэгтэй (sim/systems/sumtown.ts): хаалганы шар тойрогт E — тухайн дэлгүүрийн цонх; машин худалдааны талбай дээр
 * машин руу очиж E — үнэ, «Худалдан авах», авсны дараа шууд унана. Захын хязгаарт хүрвэл газрын зураг руу.
 */
import * as THREE from 'three';
import type { GameConfig } from '../sim/config';
import type { VehicleId } from '../sim/state';
import { allBuildings, facingOf, lotSlots, sumDoors, type SumBuildingSpec } from '../sim/systems/sumtown';
import { buildSumCenter, type SumCenterBuild } from './sumlayout';
import { mat, VisualRng } from './util';
import { visualStyle } from './style';
import { makeDog, poseDogLying } from './characters';
import { t } from '../i18n/i18n';

function label(text: string, bg: string, fg: string, w = 4.2, h = 1): THREE.Mesh {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 128;
  const c = cv.getContext('2d')!;
  c.fillStyle = bg;
  c.fillRect(0, 0, 512, 128);
  c.strokeStyle = fg;
  c.lineWidth = 8;
  c.strokeRect(6, 6, 500, 116);
  c.fillStyle = fg;
  const size = text.length > 14 ? 46 : text.length > 9 ? 58 : 70;
  c.font = `bold ${size}px system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, 256, 68);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) }));
}

/** Оршин суугч (хөдөлгөөнгүй) */
function resident(g: THREE.Group, x: number, y: number, z: number, deel: number, hat: number, heading: number): void {
  const person = new THREE.Group();
  person.position.set(x, y, z);
  person.rotation.y = heading;
  for (const sx of [-0.13, 0.13]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.62, 0.16), mat(0x3a2c20));
    leg.position.set(sx, 0.36, 0);
    person.add(leg);
  }
  const coat = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.9, 0.36), mat(deel));
  coat.position.y = 1.08;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 5), mat(0xc99a6e));
  head.position.y = 1.72;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.3, 6), mat(hat));
  cap.position.y = 1.98;
  person.add(coat, head, cap);
  g.add(person);
}

const FACING_YAW = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 } as const;

export class SumCenterView {
  readonly group = new THREE.Group();
  readonly ground: THREE.Mesh;
  private built: SumCenterBuild;
  private lotVehicles: { id: VehicleId; mesh: THREE.Object3D }[] = [];

  constructor(cfg: GameConfig) {
    const L = cfg.sumcenter;
    this.built = buildSumCenter(L, { seed: 7 });
    this.ground = this.built.ground;
    this.group.add(this.built.group);
    const H = this.built.heightAt;

    // Шошго: үүрэгтэй, орж болох барилгын нүүрэн дээр
    const byId = new Map<string, SumBuildingSpec>(allBuildings(L).map((b) => [b.id, b]));
    const signColor: Record<string, [string, string]> = {
      teahouse: ['#8a3a1a', '#fff1d0'],
      bank: ['#1f4f7a', '#f4ead6'],
      livestock: ['#6b4a2e', '#ffe9a8'],
    };
    for (const d of sumDoors(cfg)) {
      const b = byId.get(d.id);
      const [bg, fg] = signColor[d.role] ?? (d.role ? ['#1f5fa8', '#ffe9a8'] : ['#526d82', '#f4ead6']);
      const text = t(`sum3d.${d.id}`);
      const s = label(text, bg, fg, b ? Math.min(7, Math.max(3.4, b.w * 0.7)) : 6, b ? 0.9 : 1.2);
      const face = b ? facingOf(b) : 's';
      const yaw = FACING_YAW[face];
      // Хаалганы гаднах цэгээс хана руу 1.85 м буцаж, хананаас 0.12 м гадна
      const back = 2 - 0.12;
      const fx = d.x - Math.sin(yaw) * back, fz = d.z - Math.cos(yaw) * back;
      const y = H(fx, fz) + (b ? Math.min(b.h ?? b.floors * L.floorHeight, L.floorHeight) + 0.5 + 0.6 : 3.2);
      s.position.set(fx, y, fz);
      s.rotation.y = yaw;
      this.group.add(s);
    }

    // Арилжааны дэлгүүрийн шар тойрог, цайны газрын цэнхэр тойрог (E)
    const ringAt = (x: number, z: number, r: number, color: number): void => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.35, r, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45 }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, H(x, z) + 0.15, z);
      this.group.add(ring);
    };
    const S = cfg.worldmap.sum3d;
    for (const d of sumDoors(cfg)) {
      if (d.role === 'teahouse') ringAt(d.x, d.z, S.shopR, 0x7ad0ff);
      else if (d.role && d.role !== 'grocery' && d.role !== 'fuel' && d.role !== 'bank') ringAt(d.x, d.z, S.shopR, 0xffd34a);
    }
    for (const s of lotSlots(cfg)) ringAt(s.x, s.z, S.lotR, 0x9be37a);

    // Худалдаанд байгаа тээвэр (зарагдсан нь нуугдана — syncLot)
    for (const s of lotSlots(cfg)) {
      const mesh = this.built.vehicles.get(s.id);
      if (mesh) this.lotVehicles.push({ id: s.vehicle as VehicleId, mesh });
    }

    // Оршин суугчид: дэлгүүр, цайны газрын үүдэнд
    const rng = new VisualRng(777);
    const deels = [0x2f5d9b, 0x7b4b2b, 0x8a3a2a, 0x3d5d3d, 0x6b3f7a], hats = [0x8a3a2a, 0x3d5d3d, 0x2b2b2b];
    const people = new THREE.Group();
    for (const d of sumDoors(cfg)) {
      if (!d.role || rng.next() < 0.35) continue;
      const x = d.x + rng.range(-3, 3), z = d.z + rng.range(0.5, 3);
      resident(people, x, H(x, z), z, deels[Math.floor(rng.next() * deels.length)]!, hats[Math.floor(rng.next() * hats.length)]!, rng.range(-Math.PI, Math.PI));
    }
    this.group.add(people);

    // V3.2: айлын үүдэнд хэвтэх нохой (байрлалын хэш)
    for (const h of this.built.homes) {
      const hash = (k: number): number => {
        const v = Math.sin(h.x * 12.9898 + h.z * 78.233 + k * 37.719) * 43758.5453;
        return v - Math.floor(v);
      };
      if (hash(1) >= visualStyle.dogRest.townDogChance) continue;
      const dog = makeDog();
      poseDogLying(dog, 1);
      const side = hash(2) < 0.5 ? -1 : 1;
      dog.root.position.set(h.x + side * (1.2 + hash(3) * 0.8), h.y - 0.4 + dog.root.position.y, h.z - 1.2);
      dog.root.rotation.y = side * (Math.PI / 2) + (hash(4) - 0.5) * 0.8;
      this.group.add(dog.root);
    }

    // Алсын уулс (3D-ийн хязгаараас цааш)
    const R = S.radius;
    for (let k = 0; k < 22; k++) {
      const a = (k / 22) * Math.PI * 2, r = R + 160 + rng.range(-20, 60), h = rng.range(30, 70);
      const m = new THREE.Mesh(new THREE.ConeGeometry(rng.range(60, 110), h, 6), mat(0x7a8a6a));
      m.position.set(Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r);
      this.group.add(m);
    }
  }

  heightAt = (x: number, z: number): number => this.built.heightAt(x, z);

  /** Худалдаж авсан тээврийг талбайгаас нууна */
  syncLot(owned: readonly string[]): void {
    for (const v of this.lotVehicles) v.mesh.visible = !owned.includes(v.id);
  }
}
