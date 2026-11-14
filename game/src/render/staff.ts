/**
 * Туслах малчид (M5): малчин морьтой, хүүхэд явган; айлын гэр, туслахын майхан/гэр хотын ойролцоо.
 * Байрлалыг sim-ээс уншиж (алхам бүрт шинэчлэгддэг) кадр бүр зөөлрүүлнэ.
 */
import * as THREE from 'three';
import type { GameState } from '../sim/state';
import type { Dwelling, Helper } from '../sim/systems/helpers';
import { makeHerder, makeHorse, swingLegs, type Rig } from './characters';
import { angDiff, mat, meshBox } from './util';

const DEEL = [0x8a2a2a, 0x2a7a4a, 0x7a4a9a, 0xb07a2a, 0x2a6a8a, 0x5a5a5a];

function smallGer(scale: number): THREE.Group {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.65, 1.7, 16), mat(0xf2efe6));
  wall.position.y = 0.85;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.85, 1.1, 16), mat(0xe8e1cf));
  roof.position.y = 2.25;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(2.63, 2.63, 0.16, 16), mat(0x8a3b1a));
  band.position.y = 1.5;
  wall.castShadow = roof.castShadow = true;
  g.add(wall, roof, band);
  meshBox(0.8, 1.3, 0.12, 0xd2691e, 0, 0.65, 2.62, g);
  g.scale.setScalar(scale);
  return g;
}

function smallTent(): THREE.Group {
  const g = new THREE.Group();
  const sh = new THREE.Shape();
  sh.moveTo(-1.2, 0);
  sh.lineTo(1.2, 0);
  sh.lineTo(0, 1.6);
  sh.lineTo(-1.2, 0);
  const tg = new THREE.ExtrudeGeometry(sh, { depth: 2.6, bevelEnabled: false });
  tg.translate(0, 0, -1.3);
  const t = new THREE.Mesh(tg, mat(0xb8ab84));
  t.castShadow = true;
  g.add(t);
  return g;
}

interface HelperView {
  rig: Rig;
  horse: Rig | null;
  root: THREE.Group;
  x: number;
  z: number;
  h: number;
  phase: number;
}

export class StaffView {
  readonly group = new THREE.Group();
  private views = new Map<number, HelperView>();
  private dwellings = new Map<string, THREE.Object3D>();

  update(state: GameState, heightAt: (x: number, z: number) => number, dt: number): void {
    this.syncDwellings(state.helpers.dwellings, heightAt);
    const alive = new Set<number>();
    for (const h of state.helpers.list as Helper[]) {
      alive.add(h.id);
      let v = this.views.get(h.id);
      if (!v) {
        const deel = DEEL[h.id % DEEL.length]!;
        const rig = makeHerder(deel, deel, h.sex === 'f' ? 0x2a6a8a : 0x6b3d1e);
        const root = new THREE.Group();
        let horse: Rig | null = null;
        if (h.kind === 'adult') {
          horse = makeHorse(h.id % 2 ? 0x5a3a22 : 0x9a6a3a);
          root.add(horse.root);
          rig.root.position.y = 1.05;
          rig.legs[0]!.rotation.set(-0.9, 0, -0.5);
          rig.legs[1]!.rotation.set(-0.9, 0, 0.5);
        } else rig.root.scale.setScalar(0.68);
        root.add(rig.root);
        this.group.add(root);
        v = { rig, horse, root, x: h.x, z: h.z, h: h.heading, phase: 0 };
        this.views.set(h.id, v);
      }
      const visible = h.mode !== 'away' && state.player.place === 'camp' && !state.move;
      v.root.visible = visible;
      if (!visible) continue;
      if (Math.hypot(h.x - v.x, h.z - v.z) > 30) {
        v.x = h.x;
        v.z = h.z;
      }
      const k = Math.min(1, dt * 7);
      const nx = v.x + (h.x - v.x) * k, nz = v.z + (h.z - v.z) * k;
      const sp = dt > 0 ? Math.hypot(nx - v.x, nz - v.z) / dt : 0;
      if (sp > 0.2) v.h += angDiff(Math.atan2(nx - v.x, nz - v.z), v.h) * Math.min(1, dt * 6);
      v.x = nx;
      v.z = nz;
      v.phase += dt * sp * (v.horse ? 0.9 : 2.6);
      const sw = sp > 0.3 ? Math.sin(v.phase) * 0.7 : 0;
      if (v.horse) swingLegs(v.horse, sw);
      else {
        v.rig.legs[0]!.rotation.x = sw;
        v.rig.legs[1]!.rotation.x = -sw;
      }
      // Унтаж байхад хэвтэнэ (хүүхэд, малчин гэртээ)
      v.root.rotation.z = h.mode === 'sleep' && !v.horse ? Math.PI / 2 : 0;
      v.root.position.set(v.x, heightAt(v.x, v.z) + (h.mode === 'sleep' && !v.horse ? 0.3 : 0), v.z);
      v.root.rotation.y = v.h;
    }
    for (const [id, v] of this.views) if (!alive.has(id)) {
      this.group.remove(v.root);
      this.views.delete(id);
    }
  }

  private syncDwellings(list: Dwelling[], heightAt: (x: number, z: number) => number): void {
    const keys = new Set<string>();
    for (const d of list) {
      const key = `${d.kind}|${d.x}|${d.z}`;
      keys.add(key);
      let o = this.dwellings.get(key);
      if (!o) {
        o = d.kind === 'helperTent' ? smallTent() : smallGer(d.kind === 'helperGer' ? 0.85 : 1);
        o.rotation.y = Math.atan2(-d.x, -d.z);   // хаалга хот руу
        this.group.add(o);
        this.dwellings.set(key, o);
      }
      o.position.set(d.x, heightAt(d.x, d.z), d.z);
    }
    for (const [k, o] of this.dwellings) if (!keys.has(k)) {
      this.group.remove(o);
      this.dwellings.delete(k);
    }
  }
}
