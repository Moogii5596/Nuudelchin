/**
 * Газрын зураг (M4.6, Mount & Blade маяг). Дээрээс харсан жижиг 3D: тал хээр, гол, уулс, ой, 3 бууц,
 * сумын төв, тоглогчийн дүрс (морьтой эсвэл тэрэг/машин). Хулганаар газар эсвэл байршил дээр дарахад тийш явна.
 * Өөрийн Scene ба камертай — 3D бууц/сумын төвтэй холилдохгүй.
 */
import * as THREE from 'three';
import type { GameConfig } from '../sim/config';
import type { GameState } from '../sim/state';
import { mat, VisualRng } from './util';
import { makeHerder, makeHorse } from './characters';
import { makeVehicleModel } from './vehicles';
import { t } from '../i18n/i18n';

const U = 6;   // 1 км = 6 нэгж

function textSprite(text: string, color = '#fff8e8', bg = 'rgba(30,24,16,0.72)'): THREE.Sprite {
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d')!;
  ctx.font = 'bold 40px system-ui, sans-serif';
  const w = Math.ceil(ctx.measureText(text).width) + 40;
  cv.width = w;
  cv.height = 64;
  const c = cv.getContext('2d')!;
  c.fillStyle = bg;
  c.beginPath();
  c.roundRect(0, 0, w, 64, 18);
  c.fill();
  c.fillStyle = color;
  c.font = 'bold 40px system-ui, sans-serif';
  c.textBaseline = 'middle';
  c.fillText(text, 20, 34);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true }));
  sp.scale.set((w / 64) * 4.2, 4.2, 1);
  sp.renderOrder = 20;
  return sp;
}

export class WorldMapView {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(45, 1, 1, 2000);
  private ground: THREE.Mesh;
  private party = new THREE.Group();
  private partyModels = new Map<string, THREE.Object3D>();
  private target: THREE.Mesh;
  private line: THREE.Line;
  private labels = new Map<string, THREE.Sprite>();
  private homeId = '';
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private camPos = new THREE.Vector3();
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  zoom = 1;

  constructor(private cfg: GameConfig) {
    const wm = cfg.worldmap;
    const b = wm.bounds;
    this.scene.background = new THREE.Color(0x9cc8e8);
    this.hemi = new THREE.HemisphereLight(0xeaf2ff, 0x6b5a3a, 1.2);
    this.sun = new THREE.DirectionalLight(0xfff1d6, 1.4);
    this.sun.position.set(60, 120, 40);
    this.scene.add(this.hemi, this.sun);

    // Газар: тал хээр, уулын бэл рүү бор, голын дагуу ногоон
    const W = (b.maxX - b.minX + 16) * U, D = (b.maxZ - b.minZ + 16) * U;
    const geo = new THREE.PlaneGeometry(W, D, 140, 120);
    geo.rotateX(-Math.PI / 2);
    geo.translate(((b.minX + b.maxX) / 2) * U, 0, ((b.minZ + b.maxZ) / 2) * U);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const col: number[] = [];
    const steppe = new THREE.Color(0x9fb466), meadow = new THREE.Color(0x6f9a4a), hill = new THREE.Color(0xa8946a), c = new THREE.Color();
    const riverD = (x: number, z: number): number => {
      let best = Infinity;
      for (let i = 1; i < wm.river.length; i++) best = Math.min(best, segDist(x, z, wm.river[i - 1]!, wm.river[i]!));
      return best;
    };
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / U, z = pos.getZ(i) / U;
      let h = Math.sin(x * 0.35) * 0.25 + Math.cos(z * 0.3) * 0.25;
      let hillT = 0;
      for (const [mx, mz, r] of wm.mountains) {
        const d = Math.hypot(x - mx, z - mz);
        const k = Math.max(0, 1 - d / (r * 1.8));
        h += k * k * r * 1.1;
        hillT = Math.max(hillT, k);
      }
      const rd = riverD(x, z);
      if (rd < 0.6) h -= (0.6 - rd) * 0.8;
      pos.setY(i, h * U * 0.35);
      c.copy(steppe).lerp(hill, Math.min(1, hillT * 1.4)).lerp(meadow, Math.max(0, 1 - rd / 2.5) * 0.8);
      col.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    this.ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    this.scene.add(this.ground);

    // Гол
    const rp: number[] = [], ri: number[] = [];
    wm.river.forEach(([x, z], i) => {
      const [nx, nz] = wm.river[Math.min(i + 1, wm.river.length - 1)]!, [px, pz] = wm.river[Math.max(0, i - 1)]!;
      const dx = nx - px, dz = nz - pz, l = Math.hypot(dx, dz) || 1;
      const ox = (-dz / l) * 0.35, oz = (dx / l) * 0.35;
      for (const s of [-1, 1]) rp.push((x + ox * s) * U, this.heightAt(x, z) + 0.25, (z + oz * s) * U);
      if (i > 0) {
        const a = (i - 1) * 2;
        ri.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    });
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
    rg.setIndex(ri);
    this.scene.add(new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0x3f7fc0, side: THREE.DoubleSide })));

    // Ой
    const rng = new VisualRng(4242);
    for (const [fx, fz, r] of wm.forests) {
      for (let k = 0; k < r * 14; k++) {
        const a = rng.range(0, Math.PI * 2), d = Math.sqrt(rng.next()) * r;
        const x = fx + Math.cos(a) * d, z = fz + Math.sin(a) * d;
        const tr = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.6, 5), mat(0x2f5a2e));
        tr.position.set(x * U, this.heightAt(x, z) + 1.2, z * U);
        this.scene.add(tr);
      }
    }
    // Уулын оройн цас
    for (const [mx, mz, r] of wm.mountains) {
      const top = new THREE.Mesh(new THREE.ConeGeometry(r * 1.2, r * 0.9, 7), mat(0xf2f2ee));
      top.position.set(mx * U, this.heightAt(mx, mz) - r * 0.2, mz * U);
      this.scene.add(top);
    }

    // Байршлууд ба тэднийг сумын төвтэй холбосон шороон зам
    const sumLoc = Object.entries(wm.locations).find(([, l]) => l.kind === 'sum');
    for (const [id, l] of Object.entries(wm.locations)) {
      if (l.kind === 'sum') this.addSum(l.x, l.z, rng);
      else this.addCamp(l.x, l.z);
      if (sumLoc && l.kind === 'camp') this.addPath(l.x, l.z, sumLoc[1].x, sumLoc[1].z);
      const sp = textSprite(l.kind === 'sum' ? '🏘 Сумын төв · Худалдаачин' : t('camp.' + id));
      sp.position.set(l.x * U, this.heightAt(l.x, l.z) + 12, l.z * U);
      this.labels.set(id, sp);
      this.scene.add(sp);
    }

    // Тоглогч ба очих газар
    this.scene.add(this.party);
    this.target = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.7, 24), new THREE.MeshBasicMaterial({ color: 0xffd34a, side: THREE.DoubleSide }));
    this.target.rotation.x = -Math.PI / 2;
    this.scene.add(this.target);
    this.line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineDashedMaterial({ color: 0xffd34a, dashSize: 1.5, gapSize: 1 }));
    this.scene.add(this.line);
  }

  /** Газрын зургийн өндөр (км координатаар өгөхөд нэгжээр буцаана) */
  heightAt(x: number, z: number): number {
    let h = Math.sin(x * 0.35) * 0.25 + Math.cos(z * 0.3) * 0.25;
    for (const [mx, mz, r] of this.cfg.worldmap.mountains) {
      const k = Math.max(0, 1 - Math.hypot(x - mx, z - mz) / (r * 1.8));
      h += k * k * r * 1.1;
    }
    return h * U * 0.35;
  }

  private addCamp(x: number, z: number): void {
    const y = this.heightAt(x, z);
    const g = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 1, 12), mat(0xf2ede0));
    g.position.set(x * U, y + 0.5, z * U);
    const r = new THREE.Mesh(new THREE.ConeGeometry(1.55, 0.8, 12), mat(0xe2d8c2));
    r.position.set(x * U, y + 1.4, z * U);
    const fence = new THREE.Mesh(new THREE.TorusGeometry(3, 0.12, 4, 20), mat(0x7a5a36));
    fence.rotation.x = Math.PI / 2;
    fence.position.set(x * U + 3.6, y + 0.3, z * U + 0.8);
    this.scene.add(g, r, fence);
  }

  private addSum(x: number, z: number, rng: VisualRng): void {
    const roofs = [0xb03a2e, 0x2f7a4a, 0x2a5f9e, 0xc0782a];
    for (let k = 0; k < 14; k++) {
      const hx = x + rng.range(-1.1, 1.1), hz = z + rng.range(-0.9, 0.9);
      const y = this.heightAt(hx, hz);
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 1.2), mat(0xefe8d8));
      b.position.set(hx * U, y + 0.55, hz * U);
      const r = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.7, 4), mat(roofs[k % roofs.length]!));
      r.rotation.y = Math.PI / 4;
      r.position.set(hx * U, y + 1.45, hz * U);
      this.scene.add(b, r);
    }
  }

  private addPath(ax: number, az: number, bx: number, bz: number): void {
    const pts: THREE.Vector3[] = [];
    const n = 40;
    for (let i = 0; i <= n; i++) {
      const x = ax + ((bx - ax) * i) / n, z = az + ((bz - az) * i) / n;
      pts.push(new THREE.Vector3(x * U, this.heightAt(x, z) + 0.15, z * U));
    }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0x7a5a36, dashSize: 2, gapSize: 1.2 }));
    l.computeLineDistances();
    this.scene.add(l);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Тоглогчийн дүрс: морьтой эсвэл тээвэр */
  private partyModel(state: GameState): THREE.Object3D {
    const key = state.player.driving ?? 'horse';
    let m = this.partyModels.get(key);
    if (!m) {
      if (key === 'horse') {
        const g = new THREE.Group();
        const h = makeHorse(0x7a4a26);
        const r = makeHerder();
        r.root.position.y = 1.05;
        r.legs[0]!.rotation.set(-0.9, 0, -0.5);
        r.legs[1]!.rotation.set(-0.9, 0, 0.5);
        g.add(h.root, r.root);
        m = g;
      } else m = makeVehicleModel(key);
      m.scale.setScalar(1.6);
      this.partyModels.set(key, m);
      this.party.add(m);
    }
    for (const [k, o] of this.partyModels) o.visible = k === key;
    return m;
  }

  private bob = 0;

  update(state: GameState, dt: number, daylight: number): void {
    const m = state.map;
    // Гэрийн бууцны нэр «(таны бууц)»
    if (this.homeId !== state.campId) {
      const old = this.labels.get(this.homeId);
      if (old) this.replaceLabel(this.homeId, t('camp.' + this.homeId));
      this.homeId = state.campId;
      this.replaceLabel(state.campId, `🏠 ${t('camp.' + state.campId)} — таны бууц`);
    }
    const model = this.partyModel(state);
    const moving = Math.hypot(m.tx - m.x, m.tz - m.z) > 1e-3 || m.dest !== null;
    this.bob += dt * (moving ? 8 : 0);
    const y = this.heightAt(m.x, m.z);
    this.party.position.set(m.x * U, y + (moving ? Math.abs(Math.sin(this.bob)) * 0.15 : 0), m.z * U);
    if (moving) this.party.rotation.y = Math.atan2(m.tx - m.x, m.tz - m.z);
    model.visible = true;
    // Очих газар
    this.target.visible = this.line.visible = moving;
    if (moving) {
      this.target.position.set(m.tx * U, this.heightAt(m.tx, m.tz) + 0.3, m.tz * U);
      (this.line.geometry as THREE.BufferGeometry).setFromPoints([this.party.position.clone().setY(y + 0.4), this.target.position]);
      this.line.computeLineDistances();
    }
    // Камер дагана
    const goal = new THREE.Vector3(m.x * U, y + 120 * this.zoom, m.z * U + 85 * this.zoom);
    if (this.camPos.lengthSq() === 0) this.camPos.copy(goal);
    this.camPos.lerp(goal, Math.min(1, dt * 4));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camPos.x, this.camPos.y - 120 * this.zoom, this.camPos.z - 85 * this.zoom);
    // Өдөр, шөнө
    const bg = new THREE.Color(0x1a2440).lerp(new THREE.Color(0x9cc8e8), daylight);
    (this.scene.background as THREE.Color).copy(bg);
    this.hemi.intensity = 0.55 + 0.65 * daylight;
    this.sun.intensity = 0.4 + 1.0 * daylight;
  }

  private replaceLabel(id: string, text: string): void {
    const old = this.labels.get(id);
    const l = this.cfg.worldmap.locations[id];
    if (!l) return;
    if (old) this.scene.remove(old);
    const sp = textSprite(text, id === this.homeId || text.startsWith('🏠') ? '#ffe9a8' : '#fff8e8');
    sp.position.set(l.x * U, this.heightAt(l.x, l.z) + 12, l.z * U);
    this.labels.set(id, sp);
    this.scene.add(sp);
  }

  /**
   * Хулганаар дарсан цэг: байршлын ойролцоо бол тэр байршил (dest), үгүй бол зураг дээрх цэг (км).
   */
  pick(ndcX: number, ndcY: number): { x: number; z: number; dest: string | null } | null {
    this.ndc.set(ndcX, ndcY);
    this.ray.setFromCamera(this.ndc, this.camera);
    const hit = this.ray.intersectObject(this.ground, false)[0];
    if (!hit) return null;
    const x = hit.point.x / U, z = hit.point.z / U;
    let dest: string | null = null, bd = 1.6;
    for (const [id, l] of Object.entries(this.cfg.worldmap.locations)) {
      const d = Math.hypot(l.x - x, l.z - z);
      if (d < bd) {
        bd = d;
        dest = id;
      }
    }
    return { x, z, dest };
  }
}

function segDist(x: number, z: number, a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const l2 = dx * dx + dz * dz || 1;
  const k = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2));
  return Math.hypot(x - a[0] - k * dx, z - a[1] - k * dz);
}
