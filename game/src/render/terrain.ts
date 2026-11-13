/**
 * Бууцны газар нутаг (прототип v1.2-оос): газрын гадаргуу, ус, мод, чулуу, уул, хашаа, уяа, майхан/гэр, чонын үүр.
 * Бэлчээрийн торыг газрын өнгө ба өвсний бутаар харуулна (architecture.md §5):
 *   сайн бэлчээр ногоон, идэгдсэн нүд шаргал-хүрэн, бууцны доройтол бүх газрыг шаргалтуулна.
 * GameState-ийг зөвхөн уншина.
 */
import * as THREE from 'three';
import type { CampConfig, GameConfig } from '../sim/config';
import type { GameState } from '../sim/state';
import { heightAt, riverZ, waterDistance, waterLevel, smoothstep } from '../sim/terrain';
import { cellIndex, type GrassGrid } from '../sim/systems/pasture';
import type { Den } from '../sim/systems/wolves';
import { VisualRng, angDiff, batchStatic, clamp, mat, meshBox, strSeed } from './util';

/** Бэлчээрийн төрлийн «бүрэн өвстэй» өнгө */
const TYPE_LUSH: Record<string, number> = {
  camp: 0x8a7a4e,
  steppe: 0x8f9a52,
  meadow: 0x4f9a3a,
  southSlope: 0x93954f,
  foothill: 0x5f9440,
  northSlope: 0x3a7a36,
};
const BARE = new THREE.Color(0x9c8458);     // идэгдсэн, нүцгэн газар
const DRY = new THREE.Color(0xb59d5c);      // доройтсон бэлчээрийн шаргал
const ROCK = new THREE.Color(0x8d8778);
const SNOW = new THREE.Color(0xe4eaef);
const DIRT = new THREE.Color(0x8a6f4a);
const BANK = new THREE.Color(0x4c8a3a);

export class TerrainView {
  readonly group = new THREE.Group();
  ground!: THREE.Mesh;
  private camp!: CampConfig;
  campId = '';
  private homeKind = '';
  private homeGroup: THREE.Group | null = null;
  // Оройн өнгө тооцох өгөгдөл
  private vCells!: Int32Array;          // орой бүрт 4 нүд (-1 = гадна)
  private vLush!: Float32Array;         // RGB: бүрэн өвстэй өнгө (өндөр, голын эрэг, шуугиан орсон)
  private vBare!: Float32Array;         // RGB: нүцгэн газрын өнгө
  private vFixed!: Uint8Array;          // 1 = бэлчээрээс хамаарахгүй (хад, бууцны төв)
  // Өвсний бут
  private tufts: THREE.InstancedMesh | null = null;
  private tuftCell!: Int32Array;
  private tuftPos!: Float32Array;       // x, y, z, scale, rotY
  private tuftLush!: Float32Array;      // RGB
  private tmpM = new THREE.Matrix4();
  private tmpQ = new THREE.Quaternion();
  private tmpS = new THREE.Vector3();
  private tmpP = new THREE.Vector3();
  private tmpC = new THREE.Color();
  private yAxis = new THREE.Vector3(0, 1, 0);

  constructor(private cfg: GameConfig) {}

  heightAt(x: number, z: number): number {
    return heightAt(this.camp, x, z);
  }

  /** Бууц солигдох эсвэл гэр авахад дахин барина */
  sync(state: GameState): boolean {
    if (state.campId !== this.campId) {
      this.build(state);
      return true;
    }
    if (state.home !== this.homeKind) this.buildHome(state.home);
    return false;
  }

  private build(state: GameState): void {
    this.dispose();
    this.campId = state.campId;
    this.camp = this.cfg.camps.camps[state.campId]!;
    const rng = new VisualRng(strSeed(state.campId) ^ state.seed);
    this.buildGround(state.grass, rng);
    this.buildWater();
    this.buildTufts(state.grass, rng);
    // Хөдөлгөөнгүй чимэглэлийг материалаар нь нэгтгэж draw call-ийг цөөлнө
    const decor = new THREE.Group();
    this.buildDecor(rng, decor);
    this.buildCampStructures(decor);
    this.buildDens(state.wolves.dens, rng, decor);
    this.group.add(batchStatic(decor));
    this.homeKind = '';
    this.buildHome(state.home);
  }

  dispose(): void {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.InstancedMesh || o instanceof THREE.Line) o.geometry.dispose();
    });
    this.group.clear();
    this.homeGroup = null;
    this.tufts = null;
  }

  // ---------- газар ----------
  private buildGround(grid: GrassGrid, rng: VisualRng): void {
    const size = grid.n * grid.cell;
    const g = new THREE.PlaneGeometry(size, size, grid.n, grid.n);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const n = pos.count;
    this.vCells = new Int32Array(n * 4);
    this.vLush = new Float32Array(n * 3);
    this.vBare = new Float32Array(n * 3);
    this.vFixed = new Uint8Array(n);
    const hc = grid.cell / 2;
    const c = new THREE.Color(), b = new THREE.Color();
    const pen = this.cfg.camps.home.pen;
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const y = this.heightAt(x, z);
      pos.setY(i, y);
      this.vCells[i * 4] = cellIndex(grid, x - hc, z - hc);
      this.vCells[i * 4 + 1] = cellIndex(grid, x + hc, z - hc);
      this.vCells[i * 4 + 2] = cellIndex(grid, x - hc, z + hc);
      this.vCells[i * 4 + 3] = cellIndex(grid, x + hc, z + hc);
      const ci = Math.max(this.vCells[i * 4]!, this.vCells[i * 4 + 3]!);
      const typeId = ci >= 0 ? grid.typeIds[grid.type[ci] ?? 0] ?? 'steppe' : 'steppe';
      c.setHex(TYPE_LUSH[typeId] ?? 0x7f9a4a);
      b.copy(BARE);
      // Голын эрэг ногоон, өндөрт хад, оргилд цас
      const wd = waterDistance(this.camp.waterShape, x, z);
      if (wd < 10) c.lerp(BANK, 0.5 * (1 - wd / 10));
      let fixed = 0;
      if (y > 10) {
        const k = smoothstep(10, 26, y) * 0.75;
        c.lerp(ROCK, k);
        b.lerp(ROCK, k);
      }
      if (y > 34) {
        const k = smoothstep(34, 44, y);
        c.lerp(SNOW, k);
        b.lerp(SNOW, k);
        if (k > 0.5) fixed = 1;
      }
      const r = Math.hypot(x, z);
      if (r < 5 || Math.hypot(x - pen.x, z - pen.z) < pen.r) {
        c.lerp(DIRT, 0.45);
        b.lerp(DIRT, 0.45);
      }
      const v = (rng.next() - 0.5) * 0.06 + Math.sin(x * 0.31) * Math.cos(z * 0.27) * 0.03;
      this.vLush.set([c.r + v, c.g + v, c.b + v * 0.8], i * 3);
      this.vBare.set([b.r + v, b.g + v, b.b + v * 0.8], i * 3);
      this.vFixed[i] = fixed;
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    g.computeVertexNormals();
    this.ground = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
    this.ground.receiveShadow = true;
    this.ground.name = 'ground';
    this.group.add(this.ground);
  }

  private buildWater(): void {
    const w = this.camp.waterShape;
    const level = waterLevel(this.camp);
    const m = new THREE.MeshLambertMaterial({ color: 0x4f8fbf, transparent: true, opacity: 0.86 });
    if (w.kind === 'lineZ') {
      const width = w.width ?? 13;
      const g = new THREE.PlaneGeometry(400, width, 160, 1);
      g.rotateX(-Math.PI / 2);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        p.setZ(i, p.getZ(i) + riverZ(w, p.getX(i)));
        p.setY(i, level);
      }
      this.group.add(new THREE.Mesh(g, m));
    } else {
      const g = new THREE.CircleGeometry(w.r * 1.6, 20);
      g.rotateX(-Math.PI / 2);
      const pond = new THREE.Mesh(g, m);
      pond.position.set(w.x, level, w.z);
      this.group.add(pond);
    }
  }

  // ---------- өвсний бут ----------
  private buildTufts(grid: GrassGrid, rng: VisualRng): void {
    const N = 6000;
    const geo = new THREE.ConeGeometry(0.14, 0.55, 3);
    geo.translate(0, 0.25, 0);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff }), N);
    this.tuftCell = new Int32Array(N);
    this.tuftPos = new Float32Array(N * 5);
    this.tuftLush = new Float32Array(N * 3);
    const pen = this.cfg.camps.home.pen;
    const c = new THREE.Color();
    let k = 0;
    for (let tries = 0; k < N && tries < N * 4; tries++) {
      const r = Math.sqrt(rng.next()) * 150, a = rng.range(0, Math.PI * 2);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (r < 9 || waterDistance(this.camp.waterShape, x, z) < 6.5 || Math.hypot(x - pen.x, z - pen.z) < pen.r + 1) continue;
      const y = this.heightAt(x, z);
      if (y > 24) continue;
      const ci = cellIndex(grid, x, z);
      if (ci < 0) continue;
      const typeId = grid.typeIds[grid.type[ci] ?? 0] ?? 'steppe';
      // Бутны өндөр бэлчээрийн төрлийн өвсний өндрөөс (нуга өндөр, тал намхан, бууц бараг үгүй)
      const tall = clamp((this.cfg.pasture.types[typeId]?.heightCm ?? 10) / 20, 0, 1.4);
      if (tall < 0.3) continue;
      this.tuftCell[k] = ci;
      this.tuftPos.set([x, y, z, rng.range(0.6, 1.5) * tall, rng.range(0, 6.28)], k * 5);
      c.setHex(TYPE_LUSH[typeId] ?? 0x5f9a3e).offsetHSL(0, 0.05, 0.04 + rng.range(-0.03, 0.03));
      this.tuftLush.set([c.r, c.g, c.b], k * 3);
      mesh.setColorAt(k, c);
      k++;
    }
    mesh.count = k;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    this.tufts = mesh;
    this.group.add(mesh);
  }

  /**
   * Бэлчээрийн торноос газрын өнгө, бутны өндрийг шинэчилнэ.
   * heatmap = туршилтын горим: идэж болох өвсийг улаан (0) → ногоон (их) өнгөөр.
   */
  updateGrass(state: GameState, heatmap: boolean): void {
    if (!this.ground) return;
    const grid = state.grass;
    const bio = grid.biomass;
    const degrade = state.camps[state.campId]?.degrade ?? 0;
    const col = (this.ground.geometry.attributes.color as THREE.BufferAttribute).array as Float32Array;
    const n = this.vFixed.length;
    const types = this.cfg.pasture.types;
    const maxB = grid.typeIds.map((id) => types[id]?.maxBiomass ?? 0);
    const dryK = 0.55 * degrade;
    for (let i = 0; i < n; i++) {
      let s = 0, m = 0, abs = 0;
      for (let k = 0; k < 4; k++) {
        const ci = this.vCells[i * 4 + k]!;
        if (ci < 0) continue;
        const b = bio[ci] ?? 0;
        s += b;
        abs += b * (maxB[grid.type[ci] ?? 0] ?? 0);
        m++;
      }
      const b = m ? s / m : 1;
      const o = i * 3;
      if (heatmap) {
        const a = clamp(m ? abs / m : 0, 0, 1);
        col[o] = 1 - a;
        col[o + 1] = 0.25 + 0.7 * a;
        col[o + 2] = 0.15;
        continue;
      }
      if (this.vFixed[i]) {
        col[o] = this.vLush[o]!;
        col[o + 1] = this.vLush[o + 1]!;
        col[o + 2] = this.vLush[o + 2]!;
        continue;
      }
      // lush: 1 = бүрэн өвстэй, 0 = идэгдэж дууссан
      const lush = smoothstep(0.08, 0.9, b);
      for (let ch = 0; ch < 3; ch++) {
        const L = this.vLush[o + ch]!;
        const dryCh = ch === 0 ? DRY.r : ch === 1 ? DRY.g : DRY.b;
        const lushC = L + (dryCh - L) * dryK;
        const bare = this.vBare[o + ch]!;
        col[o + ch] = bare + (lushC - bare) * lush;
      }
    }
    this.ground.geometry.attributes.color!.needsUpdate = true;

    // Бут: өвс ихтэй газар өндөр, идэгдсэн газар намхан/алга
    const t = this.tufts;
    if (!t) return;
    const c = this.tmpC;
    for (let k = 0; k < t.count; k++) {
      const b = bio[this.tuftCell[k]!] ?? 0;
      const o = k * 5;
      const s = this.tuftPos[o + 3]!;
      const hs = b < 0.12 ? 0 : s * (0.2 + 0.95 * b);
      const w = Math.min(s, 1.1);
      this.tmpP.set(this.tuftPos[o]!, this.tuftPos[o + 1]!, this.tuftPos[o + 2]!);
      this.tmpQ.setFromAxisAngle(this.yAxis, this.tuftPos[o + 4]!);
      this.tmpS.set(hs ? w : 0, hs, hs ? w : 0);
      this.tmpM.compose(this.tmpP, this.tmpQ, this.tmpS);
      t.setMatrixAt(k, this.tmpM);
      const lush = smoothstep(0.1, 0.9, b);
      c.setRGB(this.tuftLush[k * 3]!, this.tuftLush[k * 3 + 1]!, this.tuftLush[k * 3 + 2]!);
      c.lerp(DRY, clamp(dryK + (1 - lush) * 0.6, 0, 1));
      if (heatmap) c.setRGB(1 - b, 0.3 + 0.6 * b, 0.15);
      t.setColorAt(k, c);
    }
    t.instanceMatrix.needsUpdate = true;
    if (t.instanceColor) t.instanceColor.needsUpdate = true;
  }

  // ---------- чимэглэл ----------
  private buildDecor(rng: VisualRng, out: THREE.Group): void {
    const w = this.camp.waterShape;
    const trunk = new THREE.CylinderGeometry(0.18, 0.25, 1.4, 5);
    const cone1 = new THREE.ConeGeometry(1.5, 2.8, 6), cone2 = new THREE.ConeGeometry(1.1, 2.2, 6);
    const crown = new THREE.IcosahedronGeometry(1.5, 0);
    const addPine = (x: number, z: number, s: number): void => {
      const t = new THREE.Group();
      const tr = new THREE.Mesh(trunk, mat(0x5b3b22));
      tr.position.y = 0.7;
      t.add(tr);
      const c1 = new THREE.Mesh(cone1, mat(0x2f5a3a));
      c1.position.y = 2.4;
      c1.castShadow = true;
      t.add(c1);
      const c2 = new THREE.Mesh(cone2, mat(0x356544));
      c2.position.y = 3.7;
      c2.castShadow = true;
      t.add(c2);
      t.position.set(x, this.heightAt(x, z) - 0.2, z);
      t.scale.setScalar(s);
      out.add(t);
    };
    const addLeafy = (x: number, z: number, s: number): void => {
      const t = new THREE.Group();
      const tr = new THREE.Mesh(trunk, mat(0x6b4a2e));
      tr.position.y = 0.7;
      t.add(tr);
      const cr = new THREE.Mesh(crown, mat(0x5c8a3a));
      cr.position.y = 2.3;
      cr.scale.y = 1.2;
      cr.castShadow = true;
      t.add(cr);
      t.position.set(x, this.heightAt(x, z), z);
      t.scale.setScalar(s);
      out.add(t);
    };
    const t = this.camp.terrain;
    if (w.kind === 'lineZ') {
      // Голын эргийн бургас
      for (let i = 0; i < 40; i++) {
        const x = rng.range(-160, 160);
        addLeafy(x, riverZ(w, x) + (rng.next() < 0.5 ? -1 : 1) * rng.range(7, 12), rng.range(0.8, 1.3));
      }
    } else {
      // Булаг/горхины дэргэдэх мод
      for (let i = 0; i < 8; i++) {
        const a = rng.range(0, 6.28), r = rng.range(w.r * 2.5, w.r * 5);
        addLeafy(w.x + Math.cos(a) * r, w.z + Math.sin(a) * r, rng.range(0.8, 1.2));
      }
    }
    if (t.tilt) {
      // Уулын арын ой (налуу өгсөх зүгт)
      for (let i = 0; i < 140; i++) {
        const x = rng.range(-170, 170), along = rng.range(t.tilt.start + 12, 175);
        const z = along * t.tilt.dirZ + x * t.tilt.dirX;
        const xx = t.tilt.dirZ !== 0 ? x : along * t.tilt.dirX;
        if (Math.hypot(xx, z) > 185) continue;
        addPine(xx, z, rng.range(0.8, 1.6));
      }
    } else if (t.open) {
      // Хөндийн хоёр хажуугийн нарс
      for (let i = 0; i < 60; i++) {
        const a = rng.range(-Math.PI, Math.PI);
        const dir = Math.atan2(t.open.dirX, t.open.dirZ);
        if (Math.abs(angDiff(a, dir)) < 0.9) continue;
        const r = rng.range(70, 140);
        addPine(Math.sin(a) * r, Math.cos(a) * r, rng.range(0.9, 1.5));
      }
    }
    // Чулуу
    for (let i = 0; i < 30; i++) {
      const r = rng.range(30, 150), a = rng.range(0, Math.PI * 2), x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (waterDistance(w, x, z) < 8) continue;
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(rng.range(0.5, 1.8), 0), mat(0x8a857a));
      m.position.set(x, this.heightAt(x, z) + 0.2, z);
      m.rotation.set(rng.range(0, 3), rng.range(0, 3), 0);
      m.scale.y = rng.range(0.5, 0.9);
      m.castShadow = true;
      out.add(m);
    }
    // Алсын уулс
    const peakMat = new THREE.MeshLambertMaterial({ color: 0x7b8f9c, flatShading: true });
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + rng.range(-0.05, 0.05), r = rng.range(195, 250);
      let h = rng.range(25, 60);
      if (t.tilt && Math.cos(a) * t.tilt.dirX + Math.sin(a) * t.tilt.dirZ > 0.3) h *= 1.7;
      const radius = rng.range(35, 60);
      const p = new THREE.Mesh(new THREE.ConeGeometry(radius, h, 5), peakMat);
      p.position.set(Math.cos(a) * r, h / 2 - 6 + Math.max(0, this.heightAt(Math.cos(a) * 170, Math.sin(a) * 170) * 0.6), Math.sin(a) * r);
      p.rotation.y = rng.range(0, 3);
      out.add(p);
      if (h > 45) {
        const cap = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.28, h * 0.28, 5), mat(0xf2f5f8));
        cap.position.y = h / 2 - h * 0.14 + 0.3;
        p.add(cap);
      }
    }
  }

  /** Хашаа (хаалга нь майхны эсрэг талд), морины уяа, галын чулуу */
  private buildCampStructures(out: THREE.Group): void {
    const { pen, post } = this.cfg.camps.home;
    const gateA = Math.atan2(pen.z, pen.x);
    const gapHalf = 0.27;
    const postGeo = new THREE.CylinderGeometry(0.08, 0.11, 1.4, 5);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 24) {
      if (Math.abs(angDiff(a, gateA)) < gapHalf) continue;
      const x = pen.x + Math.cos(a) * pen.r, z = pen.z + Math.sin(a) * pen.r;
      const p = new THREE.Mesh(postGeo, mat(0x6b4a2e));
      p.position.set(x, this.heightAt(x, z) + 0.6, z);
      p.castShadow = true;
      out.add(p);
    }
    // Хашааны хөндлөвч: газрын өндрийг дагасан шугам
    for (const yOff of [0.55, 1.1]) {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 96; k++) {
        const a = gateA + gapHalf + (k / 96) * (Math.PI * 2 - gapHalf * 2);
        const x = pen.x + Math.cos(a) * pen.r, z = pen.z + Math.sin(a) * pen.r;
        pts.push(new THREE.Vector3(x, this.heightAt(x, z) + yOff, z));
      }
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, 0.045, 3), mat(0x7a5634));
      out.add(tube);
    }
    // Уяа
    const py = this.heightAt(post.x, post.z);
    for (const dx of [-1.3, 1.3]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.7, 5), mat(0x6b4a2e));
      p.position.set(post.x + dx, py + 0.85, post.z);
      p.castShadow = true;
      out.add(p);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.8, 5), mat(0x8a6a44));
    bar.rotation.z = Math.PI / 2;
    bar.position.set(post.x, py + 1.55, post.z);
    out.add(bar);
    // Галын чулуу
    const rng = new VisualRng(7);
    for (let i = 0; i < 7; i++) {
      const a = rng.range(0, 6.28), r = rng.range(0.2, 1.1);
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(rng.range(0.25, 0.4), 0), mat(0x6e5a3e));
      m.position.set(-5 + Math.cos(a) * r, this.heightAt(-5, -3) + 0.2, -3 + Math.sin(a) * r);
      out.add(m);
    }
  }

  /** Чонын үүр (чулуу, нүх, яс) ба нутгийн улаан хил */
  private buildDens(dens: Den[], rng: VisualRng, out: THREE.Group): void {
    const lineMat = new THREE.LineDashedMaterial({ color: 0xc0392b, dashSize: 1.6, gapSize: 1.2, transparent: true, opacity: 0.7 });
    for (const d of dens) {
      const y = this.heightAt(d.x, d.z);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + rng.range(-0.3, 0.3), r = rng.range(1.8, 2.8);
        const x = d.x + Math.cos(a) * r, z = d.z + Math.sin(a) * r;
        const m = new THREE.Mesh(new THREE.DodecahedronGeometry(rng.range(0.5, 1.1), 0), mat(0x5b544b));
        m.position.set(x, this.heightAt(x, z) + 0.2, z);
        m.rotation.set(rng.range(0, 3), rng.range(0, 3), 0);
        m.castShadow = true;
        out.add(m);
      }
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 0.25, 8), mat(0x2a2420));
      hole.position.set(d.x, y + 0.05, d.z);
      out.add(hole);
      for (let i = 0; i < 4; i++) {
        const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 4), mat(0xece6d6));
        const x = d.x + rng.range(-4, 4), z = d.z + rng.range(-4, 4);
        bone.rotation.set(Math.PI / 2, 0, rng.range(0, 3));
        bone.position.set(x, this.heightAt(x, z) + 0.1, z);
        out.add(bone);
      }
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 64; k++) {
        const a = (k / 64) * Math.PI * 2;
        const x = d.x + Math.cos(a) * d.r, z = d.z + Math.sin(a) * d.r;
        pts.push(new THREE.Vector3(x, this.heightAt(x, z) + 0.25, z));
      }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat);
      line.computeLineDistances();
      out.add(line);
    }
  }

  /** Майхан эсвэл гэр (бууцны төвд) */
  private buildHome(kind: string): void {
    if (this.homeGroup) this.group.remove(this.homeGroup);
    this.homeKind = kind;
    const g = new THREE.Group();
    if (kind === 'ger') {
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.55, 2.1, 18), mat(0xf2efe6));
      wall.position.y = 1.05;
      wall.castShadow = wall.receiveShadow = true;
      g.add(wall);
      for (const [y, r] of [[1.85, 3.53], [0.25, 3.57]] as const) {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.2, 18), mat(0x8a3b1a));
        band.position.y = y;
        g.add(band);
      }
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 1.45, 18), mat(0xe8e1cf));
      roof.position.y = 2.82;
      roof.castShadow = true;
      g.add(roof);
      const toono = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.28, 12), mat(0xb5651d));
      toono.position.y = 3.5;
      g.add(toono);
      meshBox(1.0, 1.55, 0.15, 0xd2691e, 0, 0.8, 3.5, g);
      meshBox(0.12, 1.6, 0.18, 0x1f3b73, -0.55, 0.8, 3.5, g);
      meshBox(0.12, 1.6, 0.18, 0x1f3b73, 0.55, 0.8, 3.5, g);
    } else {
      const sh = new THREE.Shape();
      sh.moveTo(-1.6, 0);
      sh.lineTo(1.6, 0);
      sh.lineTo(0, 2.0);
      sh.lineTo(-1.6, 0);
      const tg = new THREE.ExtrudeGeometry(sh, { depth: 3.4, bevelEnabled: false });
      tg.translate(0, 0, -1.7);
      const tent = new THREE.Mesh(tg, mat(0xcfc29a));
      tent.castShadow = true;
      g.add(tent);
      const dsh = new THREE.Shape();
      dsh.moveTo(-0.6, 0);
      dsh.lineTo(0.6, 0);
      dsh.lineTo(0, 1.3);
      dsh.lineTo(-0.6, 0);
      const door = new THREE.Mesh(new THREE.ShapeGeometry(dsh), mat(0x3a2e22));
      door.position.z = 1.72;
      g.add(door);
      // Агуулах (сав суулга) майхны хажууд
      meshBox(0.7, 0.6, 0.5, 0x8a6a44, 2.4, 0.3, -0.8, g);
      meshBox(0.5, 0.5, 0.5, 0x6b4a2e, 2.5, 0.25, 0.1, g);
    }
    g.position.set(0, this.heightAt(0, 0), 0);
    this.homeGroup = g;
    this.group.add(g);
  }
}
