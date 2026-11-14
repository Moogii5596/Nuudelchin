/**
 * Сумын төвийн 3D (M4.6, хэрэглэгчийн шийдвэр 2026-11-14). Тоглогч морьтой эсвэл тэрэг/машинаараа газрын
 * зургаас орж ирнэ. Худалдаачны дэлгүүрийн дэргэд (E / T) арилжаа хийнэ. Захын хязгаарт хүрвэл газрын зураг руу.
 * Монгол сумын төвийн төрх: өнгөлөг дээвэртэй нэг давхар байшингууд, хашаан доторх гэрүүд, шороон гудамж.
 */
import * as THREE from 'three';
import type { GameConfig } from '../sim/config';
import { sumHeightAt } from '../sim/terrain';
import { batchStatic, mat, VisualRng } from './util';
import { paletteHex } from './style';

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
  c.font = 'bold 70px system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, 256, 68);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) }));
  return m;
}

/** Нэг давхар байшин: хана, налуу дээвэр, цонх, хаалга */
function house(g: THREE.Group, x: number, z: number, w: number, d: number, wall: number, roof: number, rotY: number): THREE.Group {
  const h = new THREE.Group();
  h.position.set(x, sumHeightAt(x, z), z);
  h.rotation.y = rotY;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, 2.8, d), mat(wall));
  body.position.y = 1.4;
  body.castShadow = true;
  h.add(body);
  // Налуу дээвэр (призм)
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 - 0.3, 0);
  shape.lineTo(w / 2 + 0.3, 0);
  shape.lineTo(0, 1.4);
  shape.closePath();
  const rg = new THREE.ExtrudeGeometry(shape, { depth: d + 0.6, bevelEnabled: false });
  rg.translate(0, 2.8, -(d + 0.6) / 2);
  const r = new THREE.Mesh(rg, mat(roof));
  r.castShadow = true;
  h.add(r);
  for (const sx of [-w / 4, w / 4]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.06), mat(0x4a6a8a));
    win.position.set(sx, 1.7, d / 2 + 0.02);
    h.add(win);
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.9, 0.06), mat(0x6b4a2e));
  door.position.set(0, 0.95, d / 2 + 0.03);
  h.add(door);
  g.add(h);
  return h;
}

/** Хашаа (банзан) ба доторх гэр */
function yardWithGer(g: THREE.Group, x: number, z: number, s: number, rng: VisualRng): void {
  const y = sumHeightAt(x, z);
  const fence = mat(0x8a6a42);
  for (const [dx, dz, w, d] of [[0, -s, s * 2, 0.15], [0, s, s * 2, 0.15], [-s, 0, 0.15, s * 2], [s, 0, 0.15, s * 2]] as const) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, 1.6, d), fence);
    f.position.set(x + dx, y + 0.8, z + dz);
    f.castShadow = true;
    g.add(f);
  }
  const gx = x + rng.range(-s * 0.3, s * 0.3), gz = z + rng.range(-s * 0.3, s * 0.3);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 1.6, 14), mat(0xece6d6));
  wall.position.set(gx, sumHeightAt(gx, gz) + 0.8, gz);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.1, 14), mat(0xdcd4c0));
  roof.position.set(gx, sumHeightAt(gx, gz) + 2.15, gz);
  wall.castShadow = roof.castShadow = true;
  g.add(wall, roof);
}

function resident(g: THREE.Group, x: number, z: number, deel: number, hat: number, heading: number): void {
  const person = new THREE.Group();
  person.position.set(x, sumHeightAt(x, z), z);
  person.rotation.y = heading;
  for (const sx of [-0.13, 0.13]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.62, 0.16), mat(paletteHex('woodDark')));
    leg.position.set(sx, 0.36, 0);
    person.add(leg);
  }
  const coat = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.9, 0.36), mat(deel));
  coat.position.y = 1.08;
  person.add(coat);
  for (const sx of [-0.38, 0.38]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.68, 0.18), mat(deel));
    arm.position.set(sx, 1.15, 0);
    person.add(arm);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 5), mat(0xc99a6e));
  head.position.y = 1.72;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.3, 6), mat(hat));
  cap.position.y = 1.98;
  person.add(head, cap);
  g.add(person);
}

export class SumCenterView {
  readonly group = new THREE.Group();
  readonly ground: THREE.Mesh;

  constructor(private cfg: GameConfig) {
    const S = 400, N = 120;
    const geo = new THREE.PlaneGeometry(S, S, N, N);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const col: number[] = [];
    const grass = new THREE.Color(0x8aa65a), dirt = new THREE.Color(0xa89270), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, sumHeightAt(x, z));
      const r = Math.hypot(x, z);
      const t = Math.min(1, Math.max(0, (r - 55) / 50));
      c.copy(dirt).lerp(grass, t);
      col.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    this.ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    this.ground.receiveShadow = true;
    this.group.add(this.ground);

    const st = new THREE.Group();
    const rng = new VisualRng(777);
    // Гол гудамж: газрын зургаас орж ирэх замаас төв рүү
    const e = cfg.worldmap.sum3d.entry;
    const road = (ax: number, az: number, bx: number, bz: number, w: number): void => {
      const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 3);
      const nx = -(bz - az) / L, nz = (bx - ax) / L;
      const p: number[] = [], idx: number[] = [];
      for (let i = 0; i <= n; i++) {
        const x = ax + ((bx - ax) * i) / n, z = az + ((bz - az) * i) / n;
        for (const s of [-1, 1]) p.push(x + nx * w * s, sumHeightAt(x + nx * w * s, z + nz * w * s) + 0.08, z + nz * w * s);
        if (i > 0) {
          const a = (i - 1) * 2;
          idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x8c7a62, side: THREE.DoubleSide }));
      m.receiveShadow = true;
      this.group.add(m);
    };
    road(e.x * 1.15, e.z * 1.15, 0, 0, 3);
    road(-90, 0, 90, 0, 2.6);
    road(0, -70, 0, 70, 2.6);

    // Байшингууд гудамжны дагуу (Худалдаачны талбайг чөлөөтэй үлдээнэ)
    const roofs = [0xb03a2e, 0x2f7a4a, 0x2a5f9e, 0xc0782a, 0x7a3a8a];
    const walls = [0xefe8d8, 0xe6dcc6, 0xf2efe6, 0xd8cdb4];
    const shop = cfg.worldmap.sum3d.shop;
    const tea = cfg.worldmap.sum3d.teahouse;
    const spots: [number, number, number][] = [];
    for (let i = -4; i <= 4; i++) {
      if (i === 0) continue;
      spots.push([i * 18, -11, 0], [i * 18, 11, Math.PI]);
      spots.push([-11, i * 15, Math.PI / 2], [11, i * 15, -Math.PI / 2]);
    }
    for (const [x, z, r] of spots) {
      if (Math.hypot(x - shop.x, z - shop.z) < 16) continue;
      if (Math.hypot(x - tea.x, z - tea.z) < 16) continue;
      if (Math.hypot(x, z) < 12) continue;
      house(st, x + rng.range(-1.5, 1.5), z + rng.range(-1, 1), rng.range(6, 9), rng.range(5, 7), walls[Math.floor(rng.next() * walls.length)]!, roofs[Math.floor(rng.next() * roofs.length)]!, r);
    }
    // Гэр хорооллын хашаанууд
    for (let k = 0; k < 14; k++) {
      const a = rng.range(0, Math.PI * 2), r = rng.range(48, 85);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.abs(x) < 8 || Math.abs(z) < 8) continue;
      yardWithGer(st, x, z, rng.range(6, 8), rng);
    }
    // Шатахуун түгээх газар
    const fx = 34, fz = 14;
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 5), mat(0xd23a2a));
    canopy.position.set(fx, sumHeightAt(fx, fz) + 3.6, fz);
    st.add(canopy);
    for (const dx of [-3, 3]) {
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.6, 0.25), mat(0xdddddd));
      pole.position.set(fx + dx, sumHeightAt(fx, fz) + 1.8, fz);
      st.add(pole);
    }
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.6), mat(0x2a6ad2));
    pump.position.set(fx, sumHeightAt(fx, fz) + 0.7, fz);
    st.add(pump);
    // Хэдэн мод
    for (let k = 0; k < 24; k++) {
      const x = rng.range(-100, 100), z = rng.range(-100, 100);
      if (Math.abs(x) < 14 || Math.abs(z) < 14) continue;
      const t = new THREE.Mesh(new THREE.ConeGeometry(1.4, 4, 6), mat(0x3f6b3a));
      t.position.set(x, sumHeightAt(x, z) + 2.4, z);
      t.castShadow = true;
      st.add(t);
    }
    const poleXs = [-100, -50, 0, 50, 100];
    const poleZ = 92;
    for (const x of poleXs) {
      const y = sumHeightAt(x, poleZ);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 7, 5), mat(paletteHex('woodDark')));
      pole.position.set(x, y + 3.5, poleZ);
      const crossbar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.12), mat(paletteHex('wood')));
      crossbar.position.set(x, y + 6.7, poleZ);
      st.add(pole, crossbar);
    }
    for (const offset of [-0.45, 0.45]) {
      const wirePoints = poleXs.map((x) => new THREE.Vector3(x, sumHeightAt(x, poleZ) + 6.8, poleZ + offset));
      const wire = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wirePoints), 48, 0.025, 4, false),
        mat(paletteHex('woodDark')),
      );
      st.add(wire);
    }
    resident(st, shop.x + 10, shop.z + 7, 0x2f5d9b, 0x8a3a2a, 0.2);
    resident(st, tea.x - 9, tea.z + 6, 0x7b4b2b, 0x3d5d3d, -0.5);
    resident(st, 12, 72, 0x6a3b54, 0x4b362b, Math.PI);
    this.group.add(batchStatic(st));

    // ===== Худалдаачны дэлгүүр =====
    const sh = new THREE.Group();
    const sy = sumHeightAt(shop.x, shop.z);
    sh.position.set(shop.x, sy, shop.z - 4);
    house(sh, 0, 0, 11, 7, 0xf3e3b8, 0x1f5fa8, 0);
    sh.children[0]!.position.set(0, 0, 0);
    const sign = label('ХУДАЛДААЧИН', '#1f5fa8', '#ffe9a8', 7, 1.6);
    sign.position.set(0, 3.05, 4.05);
    sh.add(sign);
    // Хаалганы өмнөх саравч, бараа
    const awn = new THREE.Mesh(new THREE.BoxGeometry(6, 0.15, 2.4), mat(0xc0402a));
    awn.position.set(0, 2.25, 4.9);
    awn.rotation.x = 0.18;
    sh.add(awn);
    const crate = mat(0x9a7444), sack = mat(0xd8c8a0);
    for (const [x, z, m, s] of [[-2.5, 5.2, crate, 0.8], [-1.6, 5.6, sack, 0.6], [2.4, 5.3, crate, 0.9], [3.2, 5.8, sack, 0.6], [1.6, 5.9, crate, 0.5]] as const) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), m);
      b.position.set(x, s / 2, z);
      b.castShadow = true;
      sh.add(b);
    }
    this.group.add(sh);
    // Дэлгүүрийн арилжааны тойрог (газар дээр)
    const ring = new THREE.Mesh(new THREE.RingGeometry(shop.r - 0.35, shop.r, 48), new THREE.MeshBasicMaterial({ color: 0xffd34a, transparent: true, opacity: 0.45 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(shop.x, sy + 0.12, shop.z);
    this.group.add(ring);
    // ===== Цайны газар (M5) — туслах малчин хөлслөх =====
    const th = new THREE.Group();
    const ty = sumHeightAt(tea.x, tea.z);
    th.position.set(tea.x, ty, tea.z - 4);
    house(th, 0, 0, 10, 7, 0xe8d8c0, 0x8a3a1a, 0);
    th.children[0]!.position.set(0, 0, 0);
    const tsign = label('ЦАЙНЫ ГАЗАР', '#8a3a1a', '#fff1d0', 6.4, 1.5);
    tsign.position.set(0, 3.05, 4.05);
    th.add(tsign);
    // Гадаа ширээ, сандал, уясан морь
    for (const dx of [-2.6, 2.6]) {
      const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.08, 10), mat(0x7a5a3a));
      tb.position.set(dx, 0.8, 5.6);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 6), mat(0x5a3a22));
      leg.position.set(dx, 0.4, 5.6);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.14, 8), mat(0xf2f2ee));
      cup.position.set(dx + 0.2, 0.9, 5.5);
      th.add(tb, leg, cup);
    }
    const post = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 0.1), mat(0x6b4a2e));
    post.position.set(-4.5, 1.2, 6.5);
    th.add(post);
    this.group.add(th);
    const tring = new THREE.Mesh(new THREE.RingGeometry(tea.r - 0.35, tea.r, 48), new THREE.MeshBasicMaterial({ color: 0x7ad0ff, transparent: true, opacity: 0.5 }));
    tring.rotation.x = -Math.PI / 2;
    tring.position.set(tea.x, ty + 0.12, tea.z);
    this.group.add(tring);
    // Алсын уулс
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * Math.PI * 2, r = 230 + rng.range(-20, 30), h = rng.range(20, 45);
      const m = new THREE.Mesh(new THREE.ConeGeometry(rng.range(35, 60), h, 6), mat(0x7a8a6a));
      m.position.set(Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r);
      this.group.add(m);
    }
  }

  heightAt = (x: number, z: number): number => sumHeightAt(x, z);

  /** Худалдаачны дэлгүүрийн дэргэд байгаа эсэх */
  nearShop(x: number, z: number): boolean {
    const s = this.cfg.worldmap.sum3d.shop;
    return Math.hypot(x - s.x, z - s.z) <= s.r;
  }
}
