/**
 * Тээвэр (M4.5, хэрэглэгчийн дүрэм 2026-11-14): морин тэрэг, Портер, Амжиргаа цагаан.
 * Эзэмшиж буй тээвэр майхны дэргэдэх зогсоолдоо харагдана. Сумын төв рүү явахад
 * зогсоолоосоо замаар явж бууцны захын толгойг давж алга болно, буцахдаа мөн замаар ирнэ (sim/systems/trip.ts → tripPose).
 * Сумын төвийн шороон зам ч энд зурагдана.
 */
import * as THREE from 'three';
import type { GameConfig } from '../sim/config';
import { VEHICLES, type GameState, type VehicleId } from '../sim/state';
import { parkingSpot, tripPose } from '../sim/systems/trip';
import { angDiff, mat, meshBox } from './util';

interface VehicleRig {
  root: THREE.Group;
  wheels: THREE.Object3D[];
  legs: THREE.Group[];     // тэрэгний морины хөл
  seat: THREE.Vector3;     // малчин суух цэг (тэрэг) — машинд кабин дотор тул харагдахгүй
}

function wheel(r: number, w: number, color: number, x: number, y: number, z: number, parent: THREE.Object3D): THREE.Object3D {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 12), mat(color));
  m.rotation.z = Math.PI / 2;
  m.castShadow = true;
  g.add(m);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.35, r * 0.35, w + 0.02, 6), mat(0x9a9a9a));
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  parent.add(g);
  return g;
}

/** Морин тэрэг: модон тэвш, хоёр том дугуй, аралтай, урд нь морь */
function makeCart(): VehicleRig {
  const g = new THREE.Group();
  const wood = 0x8a6a42, dark = 0x5a4026;
  meshBox(1.5, 0.12, 2.4, wood, 0, 0.95, -0.4, g);                       // тэвш
  for (const sx of [-1, 1]) meshBox(0.08, 0.4, 2.4, dark, sx * 0.72, 1.2, -0.4, g);   // хажуу банз
  meshBox(1.5, 0.4, 0.08, dark, 0, 1.2, -1.6, g);
  for (const sx of [-1, 1]) meshBox(0.08, 0.08, 2.6, dark, sx * 0.35, 1.05, 1.9, g); // арал
  meshBox(0.5, 0.35, 0.4, 0xb89a6a, -0.3, 1.2, -0.9, g);                  // ачаа (уут)
  meshBox(0.45, 0.3, 0.35, 0xe8e0c8, 0.3, 1.18, -1.1, g);
  const wheels = [wheel(0.62, 0.12, 0x4a3420, -0.85, 0.62, -0.4, g), wheel(0.62, 0.12, 0x4a3420, 0.85, 0.62, -0.4, g)];
  // Морь (хазаартай, эмээлгүй)
  const c = 0x6b4a2e, dk = 0x2a1c12;
  const horse = new THREE.Group();
  horse.position.set(0, 0, 3.6);
  g.add(horse);
  meshBox(0.55, 0.65, 1.4, c, 0, 1.25, 0, horse);
  meshBox(0.3, 0.75, 0.34, c, 0, 1.68, 0.66, horse).rotation.x = 0.55;
  meshBox(0.28, 0.3, 0.58, c, 0, 2.0, 1.04, horse);
  meshBox(0.08, 0.5, 0.38, dk, 0, 1.88, 0.58, horse).rotation.x = 0.55;
  meshBox(0.12, 0.75, 0.12, dk, 0, 1.1, -0.8, horse).rotation.x = 0.35;
  meshBox(0.7, 0.18, 0.3, 0x3a2a1a, 0, 1.6, 0.45, horse);                 // хомуут
  const legs: THREE.Group[] = [];
  for (const [x, z] of [[-0.18, 0.55], [0.18, 0.55], [-0.18, -0.55], [0.18, -0.55]] as const) {
    const p = new THREE.Group();
    p.position.set(x, 0.92, z);
    meshBox(0.13, 0.92, 0.13, c, 0, -0.46, 0, p);
    horse.add(p);
    legs.push(p);
  }
  return { root: g, wheels, legs, seat: new THREE.Vector3(0, 1.05, 0.6) };
}

/**
 * Кабинтай жижиг ачааны машин. cab = кабины өнгө, len = тэвшний урт (даацаар).
 * Портер — урт тэвштэй цэнхэр кабин; Амжиргаа цагаан — богино тэвштэй цагаан.
 */
function makeTruck(cab: number, len: number, bedColor: number): VehicleRig {
  const g = new THREE.Group();
  const black = 0x222222;
  const fz = 1.6;                                                          // кабины төв (урд)
  meshBox(1.8, 1.5, 1.4, cab, 0, 1.55, fz, g);                             // кабин
  meshBox(1.82, 0.55, 0.06, 0x223344, 0, 1.85, fz + 0.71, g);              // салхины шил
  for (const sx of [-1, 1]) meshBox(0.04, 0.45, 0.8, 0x223344, sx * 0.91, 1.85, fz + 0.1, g);
  meshBox(1.8, 0.25, 0.08, 0xd8d8d8, 0, 0.95, fz + 0.72, g);              // бампер
  for (const sx of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.04), new THREE.MeshBasicMaterial({ color: 0xfff2c0 }));
    l.position.set(sx * 0.65, 1.12, fz + 0.73);
    g.add(l);
  }
  meshBox(1.7, 0.18, len + 1.4, black, 0, 0.72, fz - (len + 1.4) / 2 + 0.6, g);   // явах эд анги
  const bz = fz - 0.75 - len / 2;
  meshBox(1.9, 0.12, len, bedColor, 0, 1.0, bz, g);                        // тэвш
  for (const sx of [-1, 1]) meshBox(0.06, 0.45, len, bedColor, sx * 0.93, 1.28, bz, g);
  meshBox(1.9, 0.45, 0.06, bedColor, 0, 1.28, bz - len / 2, g);
  meshBox(1.9, 0.6, 0.06, 0x888888, 0, 1.35, bz + len / 2, g);
  const wheels = [
    wheel(0.42, 0.28, black, -0.85, 0.42, fz, g),
    wheel(0.42, 0.28, black, 0.85, 0.42, fz, g),
    wheel(0.42, 0.28, black, -0.85, 0.42, bz - len * 0.15, g),
    wheel(0.42, 0.28, black, 0.85, 0.42, bz - len * 0.15, g),
  ];
  return { root: g, wheels, legs: [], seat: new THREE.Vector3(0, 1.3, fz) };
}

export class VehiclesView {
  readonly group = new THREE.Group();
  private rigs = new Map<VehicleId, VehicleRig>();
  private pos = new Map<VehicleId, { x: number; z: number; h: number; init: boolean; phase: number }>();
  private road: THREE.Mesh | null = null;
  private roadCamp = '';

  constructor(private cfg: GameConfig) {}

  private rig(id: VehicleId): VehicleRig {
    let r = this.rigs.get(id);
    if (!r) {
      r = id === 'horseCart' ? makeCart() : id === 'porter' ? makeTruck(0x2f62b8, 3.2, 0x8a8f96) : makeTruck(0xf2f2ee, 2.0, 0xc8c8c4);
      this.rigs.set(id, r);
      this.group.add(r.root);
    }
    return r;
  }

  /** Шороон зам: газрын гадаргууг дагасан тууз */
  private buildRoad(heightAt: (x: number, z: number) => number): void {
    if (this.road) this.group.remove(this.road);
    const r = this.cfg.vehicles.road;
    const pts: { x: number; z: number }[] = [];
    // Зогсоолуудаас замын эхлэл хүртэл, тэндээс захын толгод хүртэл
    const steps = Math.ceil(r.length / 2);
    for (let i = 0; i <= steps; i++) pts.push({ x: r.start.x + r.dir.x * (i * r.length) / steps, z: r.start.z + r.dir.z * (i * r.length) / steps });
    const w = 1.6;
    const nx = -r.dir.z, nz = r.dir.x;
    const pos: number[] = [];
    const idx: number[] = [];
    pts.forEach((p, i) => {
      for (const s of [-1, 1]) {
        const x = p.x + nx * w * s, z = p.z + nz * w * s;
        pos.push(x, heightAt(x, z) + 0.12, z);
      }
      if (i > 0) {
        const a = (i - 1) * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x9a8566, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.receiveShadow = true;
    this.road = m;
    this.group.add(m);
  }

  /** Аялалд явж буй тээврийн малчин суух цэг (дэлхийн координат), харагдахгүй бол null */
  seatOf(state: GameState): { x: number; y: number; z: number; h: number; inCab: boolean } | null {
    const t = state.trip;
    if (!t) return null;
    const p = this.pos.get(t.vehicle);
    const r = this.rigs.get(t.vehicle);
    if (!p || !r || !r.root.visible) return null;
    const v = r.seat.clone().applyMatrix4(r.root.matrixWorld);
    return { x: v.x, y: v.y, z: v.z, h: p.h, inCab: t.vehicle !== 'horseCart' };
  }

  /**
   * Камер юуг дагах вэ (аялалд): машин харагдаж байвал түүнийг, газрын зургаас гадуур бол хотыг.
   * Аялалгүй бол null (малчныг дагана).
   */
  cameraFocus(state: GameState): { x: number; z: number } | null {
    const t = state.trip;
    if (!t) return null;
    const p = this.pos.get(t.vehicle);
    const r = this.rigs.get(t.vehicle);
    if (p && r?.root.visible) return { x: p.x, z: p.z };
    return { x: this.cfg.camps.home.x + 6, z: this.cfg.camps.home.z };
  }

  /** alpha — sim алхам хоорондын хувь (0–1): аялж буй тээврийг алхам хооронд жигд зөөлрүүлнэ */
  update(state: GameState, heightAt: (x: number, z: number) => number, dt: number, alpha = 1): void {
    if (this.roadCamp !== state.campId) {
      this.roadCamp = state.campId;
      this.buildRoad(heightAt);
    }
    for (const id of VEHICLES) {
      const owned = state.vehicles.includes(id);
      if (!owned) {
        const r = this.rigs.get(id);
        if (r) r.root.visible = false;
        continue;
      }
      const r = this.rig(id);
      let tx: number, tz: number, th: number, visible = true;
      const trip = state.trip?.vehicle === id ? state.trip : null;
      if (trip) {
        // Өмнөх алхмаас одоогийн алхам хүртэл (мал шиг) — үсрэлтгүй
        const pose = tripPose(this.cfg, { vehicle: id, total: trip.total, elapsed: Math.max(0, trip.elapsed - 1 + alpha) });
        tx = pose.x;
        tz = pose.z;
        th = pose.heading;
        visible = pose.visible;
      } else {
        const p = parkingSpot(this.cfg, id);
        tx = p.x;
        tz = p.z;
        th = p.heading;
      }
      let s = this.pos.get(id);
      if (!s || !s.init || !r.root.visible) s = { x: tx, z: tz, h: th, init: true, phase: s?.phase ?? 0 };
      const moved = Math.hypot(tx - s.x, tz - s.z);
      s.x = tx;
      s.z = tz;
      s.h += angDiff(th, s.h) * Math.min(1, dt * 4);
      if (moved < 5) s.phase += moved;
      this.pos.set(id, s);
      r.root.visible = visible;
      r.root.position.set(s.x, heightAt(s.x, s.z), s.z);
      r.root.rotation.y = s.h;
      // Налууг дагаж бага зэрэг хазайна
      const ahead = heightAt(s.x + Math.sin(s.h) * 2, s.z + Math.cos(s.h) * 2) - heightAt(s.x - Math.sin(s.h) * 2, s.z - Math.cos(s.h) * 2);
      r.root.rotation.x = -Math.atan2(ahead, 4);
      for (const w of r.wheels) w.rotation.x = s.phase * 1.6;
      // Тэрэгний морины хөл: хурдаар савлана
      const speed = dt > 0 ? moved / dt : 0;
      const sw = speed > 0.3 ? Math.sin(s.phase * 1.8) * 0.6 : 0;
      r.legs.forEach((l, i) => (l.rotation.x = i === 0 || i === 3 ? sw : -sw));
      r.root.updateMatrixWorld(true);
    }
  }
}

