/**
 * Тээвэр (M4.5–M4.6, хэрэглэгчийн дүрэм 2026-11-14): морин тэрэг, Портер, Амжиргаа цагаан.
 * Тээвэр бүр state.fleet-д байрлалтай (зогсоол, эсвэл тоглогч орхисон газар). Тоглогч жолоодоход
 * байрлал кадр бүр шинэчлэгдэнэ (input/controller.ts). Гэрийн бууцны шороон зам (camps.json → road) энд зурагдана.
 */
import * as THREE from 'three';
import type { GameConfig } from '../sim/config';
import type { GameState, VehicleId } from '../sim/state';
import type { Season } from '../sim/config';
import { visualStyle } from './style';
import { mat, meshBox, VisualRng } from './util';

interface VehicleRig {
  root: THREE.Group;
  wheels: THREE.Object3D[];
  legs: THREE.Group[];     // тэрэгний морины хөл
  seat: THREE.Vector3;     // малчин суух цэг (тэрэг) — машинд кабин дотор тул харагдахгүй
  /** V4.2: шөнө асах гэрэл (урд гэрэл / дэнлүү), арын гэрэл, урд туяа, тоос гарах цэгүүд (локал) */
  heads: THREE.MeshBasicMaterial[];
  tails: THREE.MeshBasicMaterial[];
  beam: THREE.Mesh | null;  // дэлхийн координатад (газрын гадаргууг дагана), root-д биш
  beamZ: number;             // туяа эхлэх локал z (урд бампер)
  dustFrom: THREE.Vector3[];
}

const fxColor = (hex: string): THREE.Color => new THREE.Color(hex);

/** Шөнийн гэрлийн хувь (0 — өдөр, 1 — бүрэн шөнө) */
export function nightFactor(daylight: number): number {
  const l = visualStyle.vehicleFx.lights;
  return Math.min(1, Math.max(0, (l.nightBelow - daylight) / (l.nightBelow - l.nightFull)));
}

const BEAM_ROWS = 7;

/** Урд гэрлийн туяа: газрын гадаргууг дагасан, урагш өргөсөх тууз (additive). Оройн байрлалыг `placeBeam` кадр бүрт тавина. */
function makeBeam(): THREE.Mesh {
  const l = visualStyle.vehicleFx.lights;
  const geo = new THREE.BufferGeometry();
  const uv: number[] = [], index: number[] = [];
  for (let i = 0; i < BEAM_ROWS; i++) {
    const t = i / (BEAM_ROWS - 1);
    uv.push(0, t, 1, t);
    if (i > 0) {
      const a = (i - 1) * 2;
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BEAM_ROWS * 2 * 3), 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  const m = new THREE.ShaderMaterial({
    uniforms: { color: { value: fxColor(l.head) }, opacity: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader:
      'uniform vec3 color; uniform float opacity; varying vec2 vUv;' +
      'void main() { float side = 1.0 - abs(vUv.x * 2.0 - 1.0); float a = opacity * (1.0 - vUv.y) * smoothstep(0.0, 0.5, side); gl_FragColor = vec4(color * a, a);' +
      '\n#include <colorspace_fragment>\n}',
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(geo, m);
  beam.visible = false;
  beam.frustumCulled = false;
  return beam;
}

/** Туяаг тээврийн байрлал, чиглэлээс газрын гадаргуу дагуу байрлуулна */
function placeBeam(beam: THREE.Mesh, x: number, z: number, heading: number, z0: number, heightAt: (x: number, z: number) => number): void {
  const l = visualStyle.vehicleFx.lights;
  const fx = Math.sin(heading), fz = Math.cos(heading);   // локал +z → дэлхий
  const rx = fz, rz = -fx;                                // локал +x → дэлхий
  const pos = beam.geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < BEAM_ROWS; i++) {
    const t = i / (BEAM_ROWS - 1);
    const d = z0 + l.beamLength * t, w = (1.5 + (l.beamWidth - 1.5) * t) / 2;
    const cx = x + fx * d, cz = z + fz * d;
    for (const [k, sgn] of [[0, -1], [1, 1]] as const) {
      const px = cx + rx * w * sgn, pz = cz + rz * w * sgn;
      pos.setXYZ(i * 2 + k, px, heightAt(px, pz) + l.beamLift, pz);
    }
  }
  pos.needsUpdate = true;
}

function lamp(w: number, h: number, d: number, color: string, x: number, y: number, z: number, parent: THREE.Object3D): THREE.MeshBasicMaterial {
  const material = new THREE.MeshBasicMaterial({ color: fxColor(color).multiplyScalar(0.45) });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  parent.add(m);
  return material;
}

/** V4.2: шороон/цасан тоос — нэг Points, бөөм бүр өөрийн тунгалагтай */
class DustFx {
  readonly points: THREE.Points;
  private pos: Float32Array;
  private alpha: Float32Array;
  private vel: Float32Array;
  private age: Float32Array;
  private next = 0;
  private carry = 0;
  private rng = new VisualRng(7177);
  private material: THREE.ShaderMaterial;

  constructor() {
    const d = visualStyle.vehicleFx.dust;
    this.pos = new Float32Array(d.count * 3);
    this.alpha = new Float32Array(d.count);
    this.vel = new Float32Array(d.count * 3);
    this.age = new Float32Array(d.count).fill(d.life);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    this.material = new THREE.ShaderMaterial({
      uniforms: { color: { value: fxColor(d.color) }, size: { value: d.size } },
      vertexShader:
        'attribute float alpha; varying float vA; uniform float size;' +
        'void main() { vA = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * 420.0 / max(1.0, -mv.z); gl_Position = projectionMatrix * mv; }',
      fragmentShader:
        'uniform vec3 color; varying float vA;' +
        'void main() { vec2 c = gl_PointCoord - 0.5; float r = dot(c, c) * 4.0; if (r > 1.0) discard; gl_FragColor = vec4(color, vA * (1.0 - r));' +
        '\n#include <colorspace_fragment>\n}',
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
  }

  /** Өнгө: улирлаар (шороо/цас), гэрэлтэлт: өдрийн гэрлээр (shader гэрэлгүй тул шөнө бараан болгоно) */
  setAmbient(season: Season, daylight: number): void {
    const d = visualStyle.vehicleFx.dust;
    const k = d.nightLight + (1 - d.nightLight) * Math.min(1, Math.max(0, daylight));
    (this.material.uniforms.color!.value as THREE.Color).set(season === 'winter' ? d.snowColor : d.color).multiplyScalar(k);
  }

  /** speed м/с хурдтай явж буй тээврийн арын цэгүүдээс тоос гаргана */
  emit(from: THREE.Vector3[], speed: number, dt: number): void {
    const d = visualStyle.vehicleFx.dust;
    if (speed < d.minSpeed || from.length === 0) return;
    this.carry += d.perSecPerSpeed * speed * dt;
    while (this.carry >= 1) {
      this.carry -= 1;
      const i = this.next;
      this.next = (this.next + 1) % d.count;
      const p = from[Math.floor(this.rng.next() * from.length)]!;
      this.pos.set([p.x + this.rng.range(-0.3, 0.3), p.y + 0.2, p.z + this.rng.range(-0.3, 0.3)], i * 3);
      this.vel.set([this.rng.range(-d.spread, d.spread), d.rise * this.rng.range(0.6, 1.2), this.rng.range(-d.spread, d.spread)], i * 3);
      this.age[i] = 0;
    }
  }

  update(dt: number): void {
    const d = visualStyle.vehicleFx.dust;
    let any = false;
    for (let i = 0; i < d.count; i++) {
      const a = (this.age[i]! += dt);
      if (a >= d.life) {
        this.alpha[i] = 0;
        continue;
      }
      any = true;
      const k = a / d.life;
      for (let j = 0; j < 3; j++) this.pos[i * 3 + j]! += this.vel[i * 3 + j]! * dt;
      this.alpha[i] = d.opacity * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85);
    }
    this.points.visible = any;
    if (!any) return;
    this.points.geometry.attributes.position!.needsUpdate = true;
    this.points.geometry.attributes.alpha!.needsUpdate = true;
  }
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
  // V4.2: аралын үзүүрт дэнлүү, дугуйны ард тоос
  const lantern = lamp(0.16, 0.22, 0.16, visualStyle.vehicleFx.lights.lantern, 0.35, 1.32, 3.0, g);
  const dustFrom = [new THREE.Vector3(-0.85, 0, -0.9), new THREE.Vector3(0.85, 0, -0.9), new THREE.Vector3(0, 0, 3.0)];
  return { root: g, wheels, legs, seat: new THREE.Vector3(0, 1.05, 0.6), heads: [lantern], tails: [], beam: null, beamZ: 0, dustFrom };
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
  const lights = visualStyle.vehicleFx.lights;
  const heads = [-1, 1].map((sx) => lamp(0.25, 0.15, 0.04, lights.head, sx * 0.65, 1.12, fz + 0.73, g));
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
  const rearZ = bz - len / 2 - 0.05;
  const tails = [-1, 1].map((sx) => lamp(0.18, 0.12, 0.04, lights.tail, sx * 0.8, 1.05, rearZ, g));
  const beam = makeBeam();
  const dustFrom = [new THREE.Vector3(-0.85, 0, bz - len * 0.15 - 0.5), new THREE.Vector3(0.85, 0, bz - len * 0.15 - 0.5)];
  return { root: g, wheels, legs: [], seat: new THREE.Vector3(0, 1.3, fz), heads, tails, beam, beamZ: fz + 0.8, dustFrom };
}

/** Газрын зураг дээрх дүрсэнд: тээврийн загвар */
export function makeVehicleModel(id: VehicleId): THREE.Group {
  return (id === 'horseCart' ? makeCart() : id === 'porter' ? makeTruck(0x2f62b8, 3.2, 0x8a8f96) : makeTruck(0xf2f2ee, 2.0, 0xc8c8c4)).root;
}

export class VehiclesView {
  readonly group = new THREE.Group();
  private rigs = new Map<VehicleId, VehicleRig>();
  private pos = new Map<VehicleId, { x: number; z: number; phase: number; speed: number; active: number }>();
  private road: THREE.Mesh | null = null;
  private roadCamp = '';
  private dust = new DustFx();
  private daylight = 1;
  private season: Season | null = null;
  private tmp = new THREE.Vector3();
  private emitAt: THREE.Vector3[] = [];

  constructor(private cfg: GameConfig) {
    this.group.add(this.dust.points);
  }

  /** V4.2: гэрэл (өдрийн гэрлээр), тоосны өнгө (улирлаар) */
  setAmbient(daylight: number, season: Season): void {
    if (season !== this.season || Math.abs(daylight - this.daylight) > 0.01) {
      this.season = season;
      this.daylight = daylight;
      this.dust.setAmbient(season, daylight);
    }
  }

  /** Гэрлийн төлөв: on = шөнө явж/жолоодож байна */
  private applyLights(r: VehicleRig, on: number): void {
    const l = visualStyle.vehicleFx.lights;
    for (const m of r.heads) m.color.set(r.beam ? l.head : l.lantern).multiplyScalar(0.45 + 0.75 * on);
    for (const m of r.tails) m.color.set(l.tail).multiplyScalar(0.4 + 0.8 * on);
    if (r.beam) {
      r.beam.visible = on > 0.01;
      (r.beam.material as THREE.ShaderMaterial).uniforms.opacity!.value = l.beamOpacity * on;
    }
  }

  private rig(id: VehicleId): VehicleRig {
    let r = this.rigs.get(id);
    if (!r) {
      r = id === 'horseCart' ? makeCart() : id === 'porter' ? makeTruck(0x2f62b8, 3.2, 0x8a8f96) : makeTruck(0xf2f2ee, 2.0, 0xc8c8c4);
      this.rigs.set(id, r);
      this.group.add(r.root);
      if (r.beam) this.group.add(r.beam);
    }
    return r;
  }

  /** Гэрийн бууцны шороон зам: газрын гадаргууг дагасан тууз (camps.json → road) */
  private buildRoad(campId: string, heightAt: (x: number, z: number) => number): void {
    if (this.road) this.group.remove(this.road);
    const road = this.cfg.camps.camps[campId]?.road ?? [];
    const pts: { x: number; z: number }[] = [];
    for (let i = 1; i < road.length; i++) {
      const [ax, az] = road[i - 1]!, [bx, bz] = road[i]!;
      const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 2);
      for (let k = i === 1 ? 0 : 1; k <= n; k++) pts.push({ x: ax + ((bx - ax) * k) / n, z: az + ((bz - az) * k) / n });
    }
    const w = 1.6;
    const pos: number[] = [];
    const idx: number[] = [];
    pts.forEach((p, i) => {
      const q = pts[Math.min(i + 1, pts.length - 1)]!, o = pts[Math.max(0, i - 1)]!;
      const dx = q.x - o.x, dz = q.z - o.z, l = Math.hypot(dx, dz) || 1;
      const nx = -dz / l, nz = dx / l;
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
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x9a8566, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.receiveShadow = true;
    this.road = m;
    this.group.add(m);
  }

  /** Жолоодож буй тээвэрт малчин суух цэг (тэрэг) — машинд кабин дотор тул null биш ч inCab */
  seatOf(state: GameState): { x: number; y: number; z: number; h: number; inCab: boolean } | null {
    const id = state.player.driving;
    if (!id) return null;
    const r = this.rigs.get(id);
    if (!r || !r.root.visible) return null;
    const v = r.seat.clone().applyMatrix4(r.root.matrixWorld);
    return { x: v.x, y: v.y, z: v.z, h: r.root.rotation.y, inCab: id !== 'horseCart' };
  }

  update(state: GameState, heightAt: (x: number, z: number) => number, dt: number): void {
    const place = state.player.place;
    if (this.road) this.road.visible = place === 'camp';
    if (place === 'camp' && this.roadCamp !== state.campId) {
      this.roadCamp = state.campId;
      this.buildRoad(state.campId, heightAt);
    }
    for (const [id, r] of this.rigs) {
      if (state.fleet.some((f) => f.id === id)) continue;
      r.root.visible = false;
      if (r.beam) r.beam.visible = false;
    }
    for (const f of state.fleet) {
      const r = this.rig(f.id);
      const visible = f.place === place && place !== 'map' && !state.move;
      r.root.visible = visible;
      if (!visible) {
        if (r.beam) r.beam.visible = false;
        continue;
      }
      let s = this.pos.get(f.id);
      if (!s) {
        s = { x: f.x, z: f.z, phase: 0, speed: 0, active: 0 };
        this.pos.set(f.id, s);
      }
      const moved = Math.hypot(f.x - s.x, f.z - s.z);
      s.x = f.x;
      s.z = f.z;
      if (moved < 5) s.phase += moved;
      r.root.position.set(s.x, heightAt(s.x, s.z), s.z);
      r.root.rotation.y = f.heading;
      // Налууг дагаж бага зэрэг хазайна
      const h = f.heading;
      const ahead = heightAt(s.x + Math.sin(h) * 2, s.z + Math.cos(h) * 2) - heightAt(s.x - Math.sin(h) * 2, s.z - Math.cos(h) * 2);
      r.root.rotation.x = -Math.atan2(ahead, 4);
      for (const w of r.wheels) w.rotation.x = s.phase * 1.6;
      const speed = dt > 0 ? moved / dt : 0;
      const sw = speed > 0.3 ? Math.sin(s.phase * 1.8) * 0.6 : 0;
      r.legs.forEach((l, i) => (l.rotation.x = i === 0 || i === 3 ? sw : -sw));
      r.root.updateMatrixWorld(true);
      // V4.2: хурдыг зөөлрүүлж (жолоочийн байрлал алхам тутам үсэрдэг) тоос, гэрэл
      if (dt > 0 && moved < 5) s.speed += (speed - s.speed) * Math.min(1, dt * 4);
      s.active = s.speed > 0.3 ? 3 : Math.max(0, s.active - dt);
      const driven = state.player.driving === f.id;
      this.applyLights(r, (driven || s.active > 0 ? 1 : 0) * nightFactor(this.daylight));
      if (r.beam?.visible) placeBeam(r.beam, s.x, s.z, f.heading, r.beamZ, heightAt);
      if (s.speed >= visualStyle.vehicleFx.dust.minSpeed) {
        while (this.emitAt.length < r.dustFrom.length) this.emitAt.push(new THREE.Vector3());
        r.dustFrom.forEach((p, i) => {
          this.tmp.copy(p).applyMatrix4(r.root.matrixWorld);
          this.emitAt[i]!.set(this.tmp.x, heightAt(this.tmp.x, this.tmp.z), this.tmp.z);
        });
        this.dust.emit(this.emitAt.slice(0, r.dustFrom.length), s.speed, dt);
      }
    }
    this.dust.update(dt);
  }
}
