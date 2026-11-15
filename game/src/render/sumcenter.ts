/**
 * Сумын төвийн 3D (M4.6 → V3.3 Могод сум, хэрэглэгчийн шийдвэр 2026-11-15). Байршил `data/sumcenter.json`,
 * бүтээгч `render/sumlayout.ts`. Тоглогч газрын зургаас цэцэрлэгийн зүүн талын замаар орж ирнэ. Дэлгүүр бүр өөр
 * үүрэгтэй (sim/systems/sumtown.ts): хаалганы шар тойрогт E — тухайн дэлгүүрийн цонх; машин худалдааны талбай дээр
 * машин руу очиж E — үнэ, «Худалдан авах», авсны дараа шууд унана. Захын хязгаарт хүрвэл газрын зураг руу.
 */
import * as THREE from 'three';
import type { GameConfig } from '../sim/config';
import type { VehicleId } from '../sim/state';
import { allBuildings, facingOf, lotSlots, sumDoors, TRADE_ROLES, type SumBuildingSpec } from '../sim/systems/sumtown';
import { buildSumCenter, type SumCenterBuild } from './sumlayout';
import { plotDoors } from '../sim/systems/town';
import type { GameState } from '../sim/state';
import { mat, VisualRng } from './util';
import { visualStyle } from './style';
import { makeDog, poseDogLying } from './characters';
import { makeCrowdParts } from './character/crowd';
import { characters } from './character/spec';
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

/**
 * Оршин суугчид (хөдөлгөөнгүй): render/character-ийн `crowd` хэлбэр — төрх (data/characters.json crowd.looks: preset ×
 * бие × малгай) бүр хэсэг бүрээрээ нэг InstancedMesh, хүн бүр өөрийн байрлал, чиглэл, өндөртэй (docs/character-design.md §4).
 */
function residents(g: THREE.Group, people: Array<{ x: number; y: number; z: number; heading: number; scale: number; look: number }>): void {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  characters.crowd.looks.forEach((look, li) => {
    const mine = people.filter((p) => p.look === li);
    if (!mine.length) return;
    const parts = makeCrowdParts(look);
    for (const part of parts) {
      const inst = new THREE.InstancedMesh(part.geometry, part.material, mine.length);
      mine.forEach((p, i) => {
        q.setFromAxisAngle(up, p.heading);
        inst.setMatrixAt(i, m.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.scale, p.scale, p.scale)));
      });
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingSphere();
      inst.castShadow = part.castShadow;
      g.add(inst);
    }
  });
}

const FACING_YAW = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 } as const;

export class SumCenterView {
  readonly group = new THREE.Group();
  readonly ground: THREE.Mesh;
  private built: SumCenterBuild;
  private lotVehicles: { id: VehicleId; mesh: THREE.Object3D }[] = [];
  /** Зарах байшингийн «ЗАРНА» / «ТАНЫХ» шошго */
  private houseSigns: { plot: string; sale: THREE.Object3D; mine: THREE.Object3D }[] = [];

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
      else if ((TRADE_ROLES as readonly string[]).includes(d.role)) ringAt(d.x, d.z, S.shopR, 0xffd34a);
      else if (d.role === 'temple' || d.role === 'zdtg' || d.role === 'bank') ringAt(d.x, d.z, S.shopR, 0xd08cff);
    }
    for (const s of lotSlots(cfg)) ringAt(s.x, s.z, S.lotR, 0x9be37a);
    // V3.4: зарах байшин, хамаатан айл — ягаан тойрог, шошго
    for (const d of plotDoors(cfg)) {
      ringAt(d.x, d.z, S.shopR, 0xd08cff);
      const y = H(d.x, d.z) + 4.4;
      if (d.role === 'house') {
        const sale = label('ЗАРНА', '#e0c23a', '#2b2620', 3.2, 0.8), mine = label('ТАНЫХ', '#3f7a4a', '#ffffff', 3.2, 0.8);
        for (const m of [sale, mine]) {
          m.position.set(d.x, y, d.z - 1.88);
          this.group.add(m);
        }
        mine.visible = false;
        this.houseSigns.push({ plot: d.id, sale, mine });
      } else {
        const m = label('ХАМААТАН', '#3f7a4a', '#ffffff', 3.6, 0.8);
        m.position.set(d.x, y, d.z - 1.88);
        this.group.add(m);
      }
    }

    // Худалдаанд байгаа тээвэр (зарагдсан нь нуугдана — syncLot)
    for (const s of lotSlots(cfg)) {
      const mesh = this.built.vehicles.get(s.id);
      if (mesh) this.lotVehicles.push({ id: s.vehicle as VehicleId, mesh });
    }

    // Оршин суугчид: дэлгүүр, цайны газрын үүдэнд
    const rng = new VisualRng(777);
    const RS = visualStyle.sumResidents;
    const crowd: Array<{ x: number; y: number; z: number; heading: number; scale: number; look: number }> = [];
    for (const d of sumDoors(cfg)) {
      if (!d.role) continue;
      for (let k = 0; k < RS.perDoor; k++) {
        if (rng.next() >= RS.doorChance * (k === 0 ? 1 : 0.5)) continue;
        const x = d.x + rng.range(-RS.spread, RS.spread), z = d.z + rng.range(RS.ahead[0], RS.ahead[1]);
        if (crowd.some((p) => Math.hypot(p.x - x, p.z - z) < 1)) continue;   // бие биендээ шигдэхгүй
        // ихэнх нь хаалга руу эсвэл бие бие рүүгээ хандсан — санамсаргүй ч гудамж руу нуруугаа харуулахгүй
        const heading = Math.PI + rng.range(-1.2, 1.2);
        crowd.push({ x, y: H(x, z), z, heading, scale: rng.range(RS.stature[0], RS.stature[1]), look: Math.floor(rng.next() * characters.crowd.looks.length) });
      }
    }
    const people = new THREE.Group();
    people.userData.sumPeople = crowd.length;
    residents(people, crowd);
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

  /** V3.4: худалдаж авсан байшингийн шошго */
  syncTown(state: GameState): void {
    for (const s of this.houseSigns) {
      const own = !!state.town.houses[s.plot];
      s.sale.visible = !own;
      s.mine.visible = own;
    }
  }

  /** Худалдаж авсан тээврийг талбайгаас нууна */
  syncLot(owned: readonly string[]): void {
    for (const v of this.lotVehicles) v.mesh.visible = !owned.includes(v.id);
  }
}
