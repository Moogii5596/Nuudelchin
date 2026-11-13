/**
 * Хамгаалалтын бүс (Z товч): чоно орохгүй, доторх малд дайрахгүй газрууд (wolves.ts → protectionZones).
 * Малчин, нохой, азарга хөдөлдөг тул кадр бүр шинэчилнэ. Ангуучилж буй чонын зам улаан шугамаар.
 */
import * as THREE from 'three';
import type { GameConfig } from '../sim/config';
import type { GameState } from '../sim/state';
import { protectionZones, type Zone } from '../sim/systems/wolves';

const SEG = 48;
const COLOR: Record<Zone['kind'], number> = {
  pen: 0x3fbf5f,
  home: 0x3fbf5f,
  herder: 0x3d8bff,
  horse: 0x9a7bff,
  stallion: 0xff9d2e,
  dog: 0xffd23f,
};

export class ZonesView {
  readonly group = new THREE.Group();
  private rings: THREE.LineLoop[] = [];
  private huntLines: THREE.Line[] = [];
  visible = false;

  constructor(private cfg: GameConfig) {
    this.group.visible = false;
  }

  toggle(): boolean {
    this.visible = !this.visible;
    this.group.visible = this.visible;
    return this.visible;
  }

  private ring(i: number): THREE.LineLoop {
    let r = this.rings[i];
    if (!r) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SEG * 3), 3));
      r = new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthTest: false }));
      r.renderOrder = 5;
      this.rings.push(r);
      this.group.add(r);
    }
    return r;
  }

  private line(i: number): THREE.Line {
    let l = this.huntLines[i];
    if (!l) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xe0302a, depthTest: false }));
      l.renderOrder = 6;
      this.huntLines.push(l);
      this.group.add(l);
    }
    return l;
  }

  update(state: GameState, heightAt: (x: number, z: number) => number): void {
    if (!this.visible) return;
    const zones = protectionZones(this.cfg, state);
    zones.forEach((z, i) => {
      const r = this.ring(i);
      r.visible = true;
      (r.material as THREE.LineBasicMaterial).color.setHex(COLOR[z.kind]);
      const pos = r.geometry.attributes.position as THREE.BufferAttribute;
      const a = pos.array as Float32Array;
      for (let k = 0; k < SEG; k++) {
        const t = (k / SEG) * Math.PI * 2;
        const x = z.x + Math.cos(t) * z.r, zz = z.z + Math.sin(t) * z.r;
        a[k * 3] = x;
        a[k * 3 + 1] = heightAt(x, zz) + 0.3;
        a[k * 3 + 2] = zz;
      }
      pos.needsUpdate = true;
      r.geometry.computeBoundingSphere();
    });
    for (let i = zones.length; i < this.rings.length; i++) this.rings[i]!.visible = false;

    // Ангуучилж буй чоно → бай
    let n = 0;
    for (const w of state.wolves.list) {
      if (w.mode !== 'hunt') continue;
      const a = state.animals.find((x) => x.id === w.targetId);
      if (!a) continue;
      const l = this.line(n++);
      l.visible = true;
      const arr = (l.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      arr.set([w.x, heightAt(w.x, w.z) + 0.8, w.z, a.x, heightAt(a.x, a.z) + 0.8, a.z]);
      l.geometry.attributes.position!.needsUpdate = true;
      l.geometry.computeBoundingSphere();
    }
    for (let i = n; i < this.huntLines.length; i++) this.huntLines[i]!.visible = false;
  }
}
