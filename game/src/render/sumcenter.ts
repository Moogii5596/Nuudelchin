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

/** Нэг давхар байшингийн дахин ашиглах загвар */
function houseModel(w: number, d: number, wall: number, roof: number): THREE.Group {
  const h = new THREE.Group();
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
  return h;
}

/** Нэг давхар байшин: хана, налуу дээвэр, цонх, хаалга */
function house(g: THREE.Group, x: number, z: number, w: number, d: number, wall: number, roof: number, rotY: number): THREE.Group {
  const h = houseModel(w, d, wall, roof);
  h.position.set(x, sumHeightAt(x, z), z);
  h.rotation.y = rotY;
  g.add(h);
  return h;
}

function terrainFence(
  group: THREE.Group,
  width: number,
  depth: number,
  angle: number,
  material: THREE.Material,
  gateWidth = 3.4,
  height = 1.25,
): void {
  const rootX = group.position.x, rootY = group.position.y, rootZ = group.position.z;
  const c = Math.cos(angle), s = Math.sin(angle);
  const world = (x: number, z: number): [number, number] => [rootX + x * c - z * s, rootZ + x * s + z * c];
  const posts = new Set<string>();
  const segment = (ax: number, az: number, bx: number, bz: number): void => {
    const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz);
    const pieces = Math.ceil(length / 2.5);
    for (let i = 0; i < pieces; i++) {
      const t0 = i / pieces, t1 = (i + 1) / pieces;
      const x0 = ax + dx * t0, z0 = az + dz * t0;
      const x1 = ax + dx * t1, z1 = az + dz * t1;
      const [wx0, wz0] = world(x0, z0), [wx1, wz1] = world(x1, z1);
      const y0 = sumHeightAt(wx0, wz0), y1 = sumHeightAt(wx1, wz1);
      const span = length / pieces;
      const fence = new THREE.Mesh(new THREE.BoxGeometry(span, height, 0.16), material);
      fence.position.set((x0 + x1) / 2, (y0 + y1) / 2 - rootY + height / 2, (z0 + z1) / 2);
      fence.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      fence.castShadow = true;
      group.add(fence);
      post(x0, z0);
    }
    post(bx, bz);
  };
  const post = (x: number, z: number): void => {
    const key = `${x},${z}`;
    if (posts.has(key)) return;
    posts.add(key);
    const [wx, wz] = world(x, z);
    const fencePost = new THREE.Mesh(new THREE.BoxGeometry(0.22, height + 0.18, 0.22), material);
    fencePost.position.set(x, sumHeightAt(wx, wz) - rootY + (height + 0.18) / 2, z);
    group.add(fencePost);
  };

  segment(-width / 2, -depth / 2, width / 2, -depth / 2);
  segment(-width / 2, -depth / 2, -width / 2, depth / 2);
  segment(width / 2, -depth / 2, width / 2, depth / 2);
  segment(-width / 2, depth / 2, -gateWidth / 2, depth / 2);
  segment(gateWidth / 2, depth / 2, width / 2, depth / 2);
  for (const x of [-width / 2, width / 2]) {
    for (const z of [-depth / 2, depth / 2]) post(x, z);
  }
  post(-gateWidth / 2, depth / 2);
  post(gateWidth / 2, depth / 2);
}

function residentialPlot(g: THREE.Group, x: number, z: number, angle: number, rng: VisualRng): void {
  const width = rng.range(18, 22), depth = rng.range(15, 19);
  const plot = new THREE.Group();
  plot.position.set(x, sumHeightAt(x, z), z);
  plot.rotation.y = angle;

  const ground = new THREE.Mesh(new THREE.BoxGeometry(width - 0.8, 0.06, depth - 0.8), mat(0x9b8669));
  ground.position.y = 0.04;
  plot.add(ground);

  const fence = mat(0x796044);
  terrainFence(plot, width, depth, angle, fence);

  const roofs = [0x9c4337, 0x426b86, 0x74804d, 0x8c704e];
  const walls = [0xe8dfce, 0xd8cbb4, 0xe9e5d9, 0xcfc4b0];
  const homeX = rng.range(-2.2, 2.2), homeZ = -2.5;
  let homeRoofY = 4.1, homeWidth = 7;
  if (rng.next() < 0.58) {
    homeWidth = rng.range(6, 8.2);
    const home = houseModel(homeWidth, rng.range(5, 6.8), walls[Math.floor(rng.next() * walls.length)]!, roofs[Math.floor(rng.next() * roofs.length)]!);
    home.position.set(homeX, 0.08, homeZ);
    plot.add(home);
  } else {
    homeRoofY = 2.65;
    homeWidth = 4.5;
    const ger = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.15, 1.45, 12), mat(0xe4ddcc));
    wall.position.y = 0.8;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.05, 12), mat(0xb7aa91));
    roof.position.y = 2.05;
    ger.add(wall, roof);
    ger.position.set(homeX, 0.08, homeZ);
    plot.add(ger);
  }

  if (rng.next() < 0.78) {
    const shedWidth = rng.range(3.2, 4.5), shedDepth = rng.range(3, 4);
    const shed = houseModel(shedWidth, shedDepth, 0x9a8b73, roofs[Math.floor(rng.next() * roofs.length)]!);
    const shedX = homeX >= 0 ? -width / 2 + shedWidth / 2 + 0.7 : width / 2 - shedWidth / 2 - 0.7;
    shed.position.set(shedX, 0.08, depth / 2 - shedDepth / 2 - 0.7);
    shed.scale.y = 0.72;
    plot.add(shed);
  }

  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 1.15, 8), mat(0x71818a));
  tank.position.set(homeX >= 0 ? -width / 2 + 1 : width / 2 - 1, 0.64, -depth / 2 + 1.2);
  plot.add(tank);

  const poleX = 2.1, poleZ = depth / 2 - 0.8;
  const poleWorldX = x + poleX * Math.cos(angle) - poleZ * Math.sin(angle);
  const poleWorldZ = z + poleX * Math.sin(angle) + poleZ * Math.cos(angle);
  const poleBaseY = sumHeightAt(poleWorldX, poleWorldZ) - plot.position.y;
  const servicePole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 5.5, 5), mat(paletteHex('woodDark')));
  servicePole.position.set(poleX, poleBaseY + 2.75, poleZ);
  const serviceArm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.11, 0.11), mat(paletteHex('wood')));
  serviceArm.position.set(poleX, poleBaseY + 5.3, poleZ);
  plot.add(servicePole, serviceArm);
  const meter = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.48, 0.2), mat(0x59666a));
  meter.position.set(homeX + homeWidth / 2 + 0.12, 1.35, homeZ);
  plot.add(meter);
  const wireGroundX = x + poleX * Math.cos(angle) - (depth / 2 + 3.5) * Math.sin(angle);
  const wireGroundZ = z + poleX * Math.sin(angle) + (depth / 2 + 3.5) * Math.cos(angle);
  const wire = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(poleX, sumHeightAt(wireGroundX, wireGroundZ) - plot.position.y + 7, depth / 2 + 3.5),
        new THREE.Vector3(poleX, poleBaseY + 5.4, poleZ),
        new THREE.Vector3(homeX + homeWidth / 2, homeRoofY, homeZ),
      ]),
      12,
      0.022,
      4,
      false,
    ),
    mat(0x302a22),
  );
  plot.add(wire);
  g.add(plot);
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
    const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x8c7a62, side: THREE.DoubleSide });
    // Сумын зам, хашааны тэнхлэгийг бага зэрэг ташуулж байрлуулна.
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
      const m = new THREE.Mesh(g, roadMaterial);
      m.receiveShadow = true;
      st.add(m);
    };
    const gridAngle = 0.18, cos = Math.cos(gridAngle), sin = Math.sin(gridAngle);
    const local = (u: number, v: number): [number, number] => [u * cos - v * sin, u * sin + v * cos];
    const roadLocal = (a: [number, number], b: [number, number], width: number): void => {
      const [ax, az] = local(a[0], a[1]), [bx, bz] = local(b[0], b[1]);
      road(ax, az, bx, bz, width);
    };
    const powerMaterial = mat(0x302a22);
    const addPole = (u: number, v: number, yaw: number): void => {
      const [x, z] = local(u, v), y = sumHeightAt(x, z);
      const mast = new THREE.Group();
      mast.position.set(x, y, z);
      mast.rotation.y = yaw;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 7, 5), mat(paletteHex('woodDark')));
      pole.position.y = 3.5;
      const crossbar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.12), mat(paletteHex('wood')));
      crossbar.position.y = 6.7;
      mast.add(pole, crossbar);
      st.add(mast);
    };
    const addStreetLamp = (u: number, v: number, yaw: number): void => {
      const [x, z] = local(u, v), y = sumHeightAt(x, z);
      const mast = new THREE.Group();
      mast.position.set(x, y, z);
      mast.rotation.y = yaw;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 7, 6), mat(paletteHex('woodDark')));
      pole.position.y = 3.5;
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.12, 0.16), mat(paletteHex('wood')));
      arm.position.set(0.55, 6.4, 0);
      const shade = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.38), mat(0x4b463d));
      shade.position.set(1.1, 6.25, 0);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), mat(0xe2c783));
      bulb.position.set(1.1, 6.08, 0);
      mast.add(pole, arm, shade, bulb);
      st.add(mast);
    };
    const addStreetWire = (points: [number, number][], poleYaw: number): void => {
      const segmentLengths = points.slice(1).map(([u, v], i) => Math.hypot(u - points[i]![0], v - points[i]![1]));
      const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);
      const clearance = 9;
      let travelled = 0;
      let run: THREE.Vector3[] = [];
      let lastLocal: [number, number] | undefined;
      let needsStartSupport = false;
      const addRun = (supportEnds: boolean): void => {
        if (run.length > 1) {
          st.add(new THREE.Mesh(
            new THREE.TubeGeometry(new THREE.CatmullRomCurve3(run), Math.max(12, run.length * 2), 0.022, 4, false),
            powerMaterial,
          ));
          if (supportEnds && lastLocal) addPole(lastLocal[0], lastLocal[1], poleYaw);
        }
        run = [];
        lastLocal = undefined;
        needsStartSupport = supportEnds;
      };
      for (let i = 1; i < points.length; i++) {
        const [au, av] = points[i - 1]!, [bu, bv] = points[i]!;
        const length = segmentLengths[i - 1]!;
        const steps = Math.max(1, Math.ceil(length / 3));
        for (let j = 0; j <= steps; j++) {
          if (i > 1 && j === 0) continue;
          const t = j / steps, u = au + (bu - au) * t, v = av + (bv - av) * t;
          const [x, z] = local(u, v);
          const distance = travelled + length * t;
          const sag = Math.sin((distance / totalLength) * Math.PI) * 0.9;
          if (distanceToArterial(x, z) < clearance) {
            addRun(true);
            continue;
          }
          if (run.length === 0 && needsStartSupport) {
            addPole(u, v, poleYaw);
            needsStartSupport = false;
          }
          run.push(new THREE.Vector3(x, sumHeightAt(x, z) + 7.1 - sag, z));
          lastLocal = [u, v];
        }
        travelled += length;
      }
      addRun(false);
    };

    // Гол зам төвөөр нэвтэрч, орцны чиглэлтэй нийлэн хотын зах руу үргэлжилнэ.
    const arterial: [number, number][] = [[e.x, e.z], [140, -3], [82, -8], [20, -14], [-55, -22], [-125, -36]];
    const distanceToArterial = (x: number, z: number): number => {
      let closest = Infinity;
      for (let i = 1; i < arterial.length; i++) {
        const [ax, az] = arterial[i - 1]!, [bx, bz] = arterial[i]!;
        const dx = bx - ax, dz = bz - az;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
        closest = Math.min(closest, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
      }
      return closest;
    };
    for (let i = 1; i < arterial.length; i++) road(arterial[i - 1]![0], arterial[i - 1]![1], arterial[i]![0], arterial[i]![1], 5.2);

    // Хорооллын хөндлөн гудамжууд. Төвийн худалдааны талбайг гол замд нээлттэй үлдээнэ.
    for (let u = -108; u <= 132; u += 24) roadLocal([u, -88], [u, 88], 1.55);
    for (const v of [-84, -60, -36, 36, 60, 84]) roadLocal([-120, v], [132, v], 1.55);
    for (let u = -108; u <= 132; u += 24) {
      addStreetLamp(u, 0, gridAngle);
      addPole(u, -72, gridAngle);
      addPole(u, 72, gridAngle);
      addStreetWire([[-88, 0], [-72, 0], [-36, 0], [0, 0], [36, 0], [72, 0], [88, 0]].map(([v]) => [u, v] as [number, number]), gridAngle);
    }
    for (const v of [-84, -60, -36, 36, 60, 84]) {
      addStreetLamp(0, v, gridAngle + Math.PI / 2);
      for (const u of [-108, -60, -12, 36, 84, 132]) addPole(u, v, gridAngle + Math.PI / 2);
      addStreetWire([[-120, v], [-108, v], [-60, v], [-12, v], [36, v], [84, v], [132, v]].map(([u]) => [u, v] as [number, number]), gridAngle + Math.PI / 2);
    }
    addStreetLamp(80, -8, gridAngle);

    const shop = cfg.worldmap.sum3d.shop;
    const tea = cfg.worldmap.sum3d.teahouse;
    const shopPlot = { x: shop.x, z: shop.z - 4 }, teaPlot = { x: tea.x, z: tea.z - 4 };
    const school = local(66, 48);
    const bank = local(20, 36);
    for (const u of [-96, -72, -48, -24, 0, 24, 48, 72, 96, 120]) {
      for (const v of [-72, -48, 24, 48, 72]) {
        if ((Math.abs(u) >= 96 || Math.abs(v) >= 72) && rng.next() < 0.45) continue;
        const [x, z] = local(u, v);
        if (Math.hypot(x - shopPlot.x, z - shopPlot.z) < 22 || Math.hypot(x - teaPlot.x, z - teaPlot.z) < 22) continue;
        if (Math.hypot(x - school[0], z - school[1]) < 52) continue;
        if (Math.hypot(x - bank[0], z - bank[1]) < 17) continue;
        residentialPlot(st, x, z, gridAngle, rng);
      }
    }

    const bankGroup = new THREE.Group();
    bankGroup.position.set(bank[0], sumHeightAt(bank[0], bank[1]), bank[1]);
    bankGroup.rotation.y = gridAngle;
    const bankPad = new THREE.Mesh(new THREE.BoxGeometry(15, 0.08, 12), mat(0xa08c70));
    bankPad.position.y = 0.06;
    bankGroup.add(bankPad);
    const bankHouse = houseModel(9, 6, 0xe7e2d7, 0x426b86);
    bankHouse.position.y = 0.1;
    bankGroup.add(bankHouse);
    const bankSign = label('БАНК', '#426b86', '#f4ead6', 3.2, 0.8);
    bankSign.position.set(0, 3.8, 3.2);
    bankGroup.add(bankSign);
    st.add(bankGroup);

    // Сургууль, цэцэрлэг, захиргаа, цагдаа нэг хашаанд байрлана.
    const schoolGroup = new THREE.Group();
    schoolGroup.position.set(school[0], sumHeightAt(school[0], school[1]), school[1]);
    schoolGroup.rotation.y = gridAngle;
    terrainFence(schoolGroup, 72, 60, gridAngle, mat(0x796044), 6, 1.4);
    const campusBuildings = [
      { title: 'СУРГУУЛЬ', x: -19, z: -13, w: 16, d: 8, roof: 0x526d82 },
      { title: 'ЦЭЦЭРЛЭГ', x: 2, z: -13, w: 11, d: 7, roof: 0x74804d },
      { title: 'ЗАХИРГАА', x: -19, z: 12, w: 11, d: 7, roof: 0x8c704e },
      { title: 'ЦАГДАА', x: 2, z: 12, w: 10, d: 7, roof: 0x426b86 },
    ] as const;
    for (const building of campusBuildings) {
      const buildingModel = houseModel(building.w, building.d, 0xe5dfcf, building.roof);
      const worldX = school[0] + building.x * cos - building.z * sin;
      const worldZ = school[1] + building.x * sin + building.z * cos;
      buildingModel.position.set(building.x, sumHeightAt(worldX, worldZ) - schoolGroup.position.y + 0.08, building.z);
      schoolGroup.add(buildingModel);
      const sign = label(building.title, '#526d82', '#f4ead6', 5.4, 0.8);
      sign.position.set(building.x, buildingModel.position.y + 3.55, building.z + building.d / 2 + 0.1);
      schoolGroup.add(sign);
    }
    const fieldX = 25, fieldZ = 0;
    const fieldWorldX = school[0] + fieldX * cos - fieldZ * sin;
    const fieldWorldZ = school[1] + fieldX * sin + fieldZ * cos;
    const field = new THREE.Mesh(new THREE.BoxGeometry(14, 0.1, 16), mat(0x75875b));
    field.position.set(fieldX, sumHeightAt(fieldWorldX, fieldWorldZ) - schoolGroup.position.y + 0.06, fieldZ);
    schoolGroup.add(field);
    st.add(schoolGroup);

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
