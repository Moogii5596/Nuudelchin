/**
 * Газарт унасан бүтээгдэхүүн (mvp-spec.md §4.1): сав сүү, ноос, ноолуур.
 * Сүү хуучрах тусам шаргалтаж (тараг), малчны түүх зайд байгаа нь дээш доош хөвнө.
 */
import * as THREE from 'three';
import type { GameConfig } from '../sim/config';
import type { GameState } from '../sim/state';
import { merge } from './util';

const MAX = 3000;

function canGeo(): THREE.BufferGeometry {
  const body = new THREE.CylinderGeometry(0.17, 0.19, 0.42, 8);
  body.translate(0, 0.21, 0);
  const neck = new THREE.CylinderGeometry(0.09, 0.15, 0.1, 8);
  neck.translate(0, 0.47, 0);
  const lid = new THREE.CylinderGeometry(0.1, 0.1, 0.06, 8);
  lid.translate(0, 0.55, 0);
  return merge([body, neck, lid]);
}

function fiberGeo(): THREE.BufferGeometry {
  const a = new THREE.IcosahedronGeometry(0.26, 0);
  a.scale(1.3, 0.6, 1);
  a.translate(0, 0.16, 0);
  const b = new THREE.IcosahedronGeometry(0.18, 0);
  b.translate(0.18, 0.22, 0.08);
  return merge([a, b]);
}

const MILK = new THREE.Color(0xf4f6f8);
const SOUR = new THREE.Color(0xe8d48a);
const TARAG_OLD = new THREE.Color(0xb8a060);
const WOOL = new THREE.Color(0xeee6d2);
const CASHMERE = new THREE.Color(0xc7a77c);

export class ItemsView {
  readonly group = new THREE.Group();
  private cans: THREE.InstancedMesh;
  private fibers: THREE.InstancedMesh;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private p = new THREE.Vector3();
  private s = new THREE.Vector3(1, 1, 1);
  private c = new THREE.Color();
  private y = new THREE.Vector3(0, 1, 0);
  private t = 0;

  constructor(private cfg: GameConfig) {
    const mk = (g: THREE.BufferGeometry): THREE.InstancedMesh => {
      const mesh = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), MAX);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.setColorAt(0, this.c.set(0xffffff));
      mesh.count = 0;
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      return mesh;
    };
    this.cans = mk(canGeo());
    this.fibers = mk(fiberGeo());
  }

  update(state: GameState, heightAt: (x: number, z: number) => number, dt: number): void {
    this.t += dt;
    const g = this.cfg.products.ground;
    const sourMin = g.milkSourHours * 60, spoilMin = (g.milkSourHours + g.taragSpoilHours) * 60;
    const p = state.player;
    const near = this.cfg.products.pickupRadius;
    let nc = 0, nf = 0;
    for (const it of state.items) {
      const isCan = it.product === 'milk' || it.product === 'tarag';
      const mesh = isCan ? this.cans : this.fibers;
      const i = isCan ? nc : nf;
      if (i >= MAX) continue;
      const close = !p.away && Math.hypot(it.x - p.x, it.z - p.z) <= near * 1.6;
      const lift = close ? 0.15 + Math.sin(this.t * 6 + it.id) * 0.1 : 0;
      this.p.set(it.x, heightAt(it.x, it.z) + lift, it.z);
      this.q.setFromAxisAngle(this.y, (it.id * 1.3) % 6.28);
      const k = it.product === 'cashmere' ? 0.6 : 1;
      this.s.set(k, k, k);
      this.m.compose(this.p, this.q, this.s);
      mesh.setMatrixAt(i, this.m);
      if (it.product === 'milk') this.c.copy(MILK).lerp(SOUR, Math.min(1, it.age / sourMin) * 0.5);
      else if (it.product === 'tarag') this.c.copy(SOUR).lerp(TARAG_OLD, Math.min(1, (it.age - sourMin) / (spoilMin - sourMin)));
      else this.c.copy(it.product === 'wool' ? WOOL : CASHMERE);
      mesh.setColorAt(i, this.c);
      if (isCan) nc++;
      else nf++;
    }
    for (const [mesh, n] of [[this.cans, nc], [this.fibers, nf]] as const) {
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
}
