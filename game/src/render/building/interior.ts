// @ts-nocheck — лабораторийн (tools/character-lab/buildings/index.html makeInterior) хэрэглэгчийн баталсан кодыг өөрчлөлтгүй хуулсан; зөвхөн толин тусгал (mirror) ба гаралтын боодол нэмсэн.
import * as THREE from 'three';
import { Geo, rgb } from '../ger/geo';
import { BUILDING_CONFIG } from './config';
import { px2uv, sc, panel, rot } from './core';

export function buildInterior(K, T) {
  const C = BUILDING_CONFIG, IN = C.interior;
  const A = C.atlas, P = C.palette, g = new Geo(px2uv(...A.white)), hw = K.w / 2, hd = K.d / 2, xi = hw - IN.inset, zi = hd - IN.inset;
  const F = K.plinthH + 0.02, Cy = K.wallH - 0.04, low = rgb(IN.wallLow), up = rgb(IN.wallUp), trim = rgb(IN.trim), wood = rgb('#B98A56'), dark = rgb('#6E4A2E');
  // тоглоомын өгөгдөл: colliders (саад: box/circle, байшингийн локал xz), npcSpots (NPC-ийн ажлын байр), interact (тоглогчийн E цэг)
  const colliders = [], pColliders = [], npcSpots = [], interact = [];
  const B = (x0, y0, z0, x1, y1, z1, c, G = g) => { G.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, c);
    if (y0 <= (G === g ? F : 0.12) + 0.01 && y1 - y0 >= 0.3 && (x1 - x0) * (z1 - z0) > 0.012) (G === g ? colliders : pColliders).push({ type: 'box', x0, z0, x1, z1 }); };
  const circle = (x, z, r, list = colliders) => list.push({ type: 'circle', x, z, r });
  const spot = (role, name, x, z, fx, fz) => npcSpots.push({ role, name, position: new THREE.Vector3(x, F, z), facing: new THREE.Vector3(fx, 0, fz).normalize() });
  const act = (action, name, x, z, r = 0.7) => interact.push({ action, name, key: 'E', position: new THREE.Vector3(x, F, z), radius: r });
  const wall = (a, b, n, y0 = F, y1 = Cy) => { const q = (P2, y) => [P2[0], y, P2[1]], m = Math.min(y1, F + IN.lowH);
    g.quad([q(a, y0), q(b, y0), q(b, m), q(a, m)], n, low); if (y1 > m) g.quad([q(a, m), q(b, m), q(b, y1), q(a, y1)], n, up);
    const o = 0.01; g.quad([[a[0] + n[0] * o, m - 0.03, a[1] + n[2] * o], [b[0] + n[0] * o, m - 0.03, b[1] + n[2] * o], [b[0] + n[0] * o, m + 0.03, b[1] + n[2] * o], [a[0] + n[0] * o, m + 0.03, a[1] + n[2] * o]], n, trim); };
  wall([-xi, zi], [xi, zi], [0, 0, -1]); wall([xi, -zi], [-xi, -zi], [0, 0, 1]); wall([xi, zi], [xi, -zi], [-1, 0, 0]); wall([-xi, -zi], [-xi, zi], [1, 0, 0]);
  const WT = 0.15; colliders.push({ type: 'box', x0: -xi - WT, z0: zi, x1: xi + WT, z1: zi + WT, wall: true }, { type: 'box', x0: -xi - WT, z0: -zi - WT, x1: xi + WT, z1: -zi, wall: true },
    { type: 'box', x0: xi, z0: -zi, x1: xi + WT, z1: zi, wall: true }, { type: 'box', x0: -xi - WT, z0: -zi, x1: -xi, z1: zi, wall: true });   // гадна хана (хаалганы нүхийг door-оор нээнэ)
  g.quad([[-xi, F, -zi], [xi, F, -zi], [xi, F, zi], [-xi, F, zi]], [0, 1, 0], rgb(IN.floor));
  for (let k = 1; k < 9; k++) { const x = -xi + k * 2 * xi / 9; g.quad([[x - 0.01, F + 0.002, -zi], [x + 0.01, F + 0.002, -zi], [x + 0.01, F + 0.002, zi], [x - 0.01, F + 0.002, zi]], [0, 1, 0], sc(rgb(IN.floor), 0.75)); }
  g.quad([[-xi, Cy, zi], [xi, Cy, zi], [xi, Cy, -zi], [-xi, Cy, -zi]], [0, -1, 0], rgb(IN.ceil));
  const Pt = T.partition, px = Pt.x, pt = 0.06;
  wall([px - pt, -zi], [px - pt, Pt.z1], [-1, 0, 0]); wall([px + pt, Pt.z1], [px + pt, -zi], [1, 0, 0]);
  g.quad([[px - pt, F, Pt.z1], [px + pt, F, Pt.z1], [px + pt, Cy, Pt.z1], [px - pt, Cy, Pt.z1]], [0, 0, 1], up);
  colliders.push({ type: 'box', x0: px - pt, z0: -zi, x1: px + pt, z1: Pt.z1, wall: true });   // хуваалт
  // цонх, хаалга
  const Q = K.porch, W = K.window, wy = W.sill + W.h / 2, tr = rgb(P.trim, 0.7), sill = rgb('#F4F1EA'), D = K.door;
  const frontWin = W.front.filter(x => Q.side !== 'front' || Math.abs(x - Q.x) > Q.w / 2 + W.w / 2 + 0.1);
  const sideWin = []; for (const sx of [1, -1]) for (const z of W.side) if (!(Q.side === (sx > 0 ? 'east' : 'west') && Math.abs(z - Q.z) < Q.w / 2 + W.w / 2 + 0.1)) sideWin.push([sx, z]);
  for (const x of frontWin) { panel(g, [x, wy, zi], [0, 0, -1], W.w / 2, W.h / 2, 0.03, A.window, tr); B(x - W.w / 2 - 0.05, W.sill - 0.04, zi - 0.18, x + W.w / 2 + 0.05, W.sill, zi, sill); }
  for (const [sx, z] of sideWin) { panel(g, [sx * xi, wy, z], [-sx, 0, 0], W.w / 2, W.h / 2, 0.03, A.window, tr); B(sx * xi - (sx > 0 ? 0.18 : 0), W.sill - 0.04, z - W.w / 2 - 0.05, sx * xi + (sx < 0 ? 0.18 : 0), W.sill, z + W.w / 2 + 0.05, sill); }
  const door = Q.side === 'front' ? { c: [Q.x, zi], n: [0, 0, -1] } : Q.side === 'east' ? { c: [xi, Q.z], n: [-1, 0, 0] } : { c: [-xi, Q.z], n: [1, 0, 0] };
  panel(g, [door.c[0], F + D.h / 2, door.c[1]], door.n, D.w / 2, D.h / 2, 0.03, A.door, tr);
  const doorGap = { x: door.c[0], z: door.c[1], w: D.w, n: new THREE.Vector3(...door.n) };   // гадна хананы саад энэ хэсэгт нээлттэй
  act('exit', 'Гарах', door.c[0] + door.n[0] * 0.6, door.c[1] + door.n[2] * 0.6, 0.6);
  { const wi = door.n[2] === -1 ? 0 : door.n[0] === -1 ? 2 : 3, w0 = colliders[wi], h2 = D.w / 2 + 0.05;   // хаалганы хэсэгт хананы саадыг тасална
    if (wi === 0) colliders.splice(wi, 1, { ...w0, x1: door.c[0] - h2 }, { ...w0, x0: door.c[0] + h2 }); else colliders.splice(wi, 1, { ...w0, z1: door.c[1] - h2 }, { ...w0, z0: door.c[1] + h2 }); }
  // пийшин
  const S = T.stove, sw = rgb('#E8E2D4'), iron = rgb(P.iron), cs = T.cookSide, cx0 = S.x + cs * S.w / 2, cx1 = cx0 + cs * S.cook;
  B(S.x - S.w / 2, F, S.z - S.d / 2, S.x + S.w / 2, F + S.h, S.z + S.d / 2, sw); B(S.x - 0.25, F + S.h, S.z - 0.25, S.x + 0.25, Cy, S.z + 0.25, sw);
  B(Math.min(cx0, cx1), F, S.z - S.d / 2, Math.max(cx0, cx1), F + 0.78, S.z + S.d / 2, sw);
  B(Math.min(cx0, cx1) - 0.01, F + 0.78, S.z - S.d / 2, Math.max(cx0, cx1) + 0.01, F + 0.82, S.z + S.d / 2, iron);
  B(Math.min(cx1, cx1 + cs * 0.02), F + 0.22, S.z - 0.18, Math.max(cx1, cx1 + cs * 0.02), F + 0.5, S.z + 0.18, iron);
  B(Math.min(S.x - cs * S.w / 2, S.x - cs * (S.w / 2 + 0.02)), F + 0.5, S.z - 0.2, Math.max(S.x - cs * S.w / 2, S.x - cs * (S.w / 2 + 0.02)), F + 1.1, S.z + 0.2, rgb('#C9B99A'));
  act('stove', 'Пийшинд түлш хийх', cx1 + cs * 0.6, S.z); if (!T.empty) spot('cook', 'Хоол хийх', cx1 + cs * 0.55, S.z, -cs, 0);
  if (!T.empty) g.lathe({ segs: 8, cx: (cx0 + cx1) / 2, cz: S.z, profile: [[0.16, F + 0.82], [0.2, F + 0.95], [0.18, F + 1.02], [0, F + 1.03]], color: rgb('#9AA3A8') });
  if (!T.empty) {
    const Kc = T.kitchen, ex0 = px + pt, cup = rgb('#D9C49A'), top2 = rgb('#C9C4B8');   // ===== зүүн (их) өрөө =====
    B(xi - 1.9, F, -zi, xi, F + 0.85, -zi + 0.55, cup); B(xi - 1.92, F + 0.85, -zi, xi, F + 0.89, -zi + 0.58, top2);
    for (let k = 0; k < 3; k++) B(xi - 1.85 + k * 0.62, F + 0.12, -zi + 0.551, xi - 1.3 + k * 0.62, F + 0.78, -zi + 0.56, sc(cup, 0.9));
    B(xi - 1.9, F + 1.5, -zi, xi, F + 2.1, -zi + 0.32, cup);
    g.lathe({ segs: 8, cx: xi - 1.4, cz: -zi + 0.28, profile: [[0.16, F + 0.89], [0.16, F + 1.02], [0.03, F + 1.12], [0, F + 1.12]], color: rgb('#D9622B') });
    B(xi - 0.75, F + 0.89, -zi + 0.1, xi - 0.25, F + 1.25, -zi + 0.45, rgb('#F4F1EA'));
    const [bx2, bz2] = Kc.barrel; circle(xi + bx2, bz2 < 0 ? zi + bz2 : bz2, 0.3); act('water', 'Ус авах', xi + bx2 - 0.6, bz2 < 0 ? zi + bz2 : bz2, 0.5);
    g.lathe({ segs: 8, cx: xi + bx2, cz: bz2 < 0 ? zi + bz2 : bz2, profile: [[0.26, F], [0.28, F + 0.7], [0.26, F + 0.74], [0, F + 0.75]], color: rgb('#2E5E9E') });
    B(xi - 0.25, F + 0.95, Kc.basinZ - 0.3, xi, F + 1.45, Kc.basinZ + 0.3, rgb('#9AA3A8')); B(xi - 0.45, F + 0.75, Kc.basinZ - 0.28, xi, F + 0.85, Kc.basinZ + 0.28, rgb('#F4F1EA'));
    const [tx, tz] = Kc.table; B(tx - 0.6, F + 0.68, tz - 0.38, tx + 0.6, F + 0.73, tz + 0.38, wood); colliders.push({ type: 'box', x0: tx - 0.6, z0: tz - 0.38, x1: tx + 0.6, z1: tz + 0.38 });
    for (const [sx2, sz2] of [[-0.35, -0.65], [0.35, -0.65], [-0.35, 0.65], [0.35, 0.65]]) spot('sit', 'Ширээнд суух', tx + sx2, tz + sz2, 0, -Math.sign(sz2));
    act('table', 'Цай уух', tx, tz + 1.15);
    for (const [lx, lz] of [[-0.52, -0.32], [0.52, -0.32], [-0.52, 0.32], [0.52, 0.32]]) B(tx + lx - 0.025, F, tz + lz - 0.025, tx + lx + 0.025, F + 0.68, tz + lz + 0.025, dark);
    for (const [sx2, sz2] of [[-0.35, -0.65], [0.35, -0.65], [-0.35, 0.65], [0.35, 0.65]]) { B(tx + sx2 - 0.17, F + 0.42, tz + sz2 - 0.17, tx + sx2 + 0.17, F + 0.46, tz + sz2 + 0.17, wood); B(tx + sx2 - 0.14, F, tz + sz2 - 0.14, tx + sx2 + 0.14, F + 0.42, tz + sz2 + 0.14, sc(dark, 1.1)); }
    B(tx - 0.3, F + 0.73, tz - 0.12, tx + 0.3, F + 0.735, tz + 0.12, rgb('#F4EEDF')); g.lathe({ segs: 7, cx: tx, cz: tz, profile: [[0.05, F + 0.735], [0.09, F + 0.8], [0, F + 0.8]], color: rgb('#F4F1EA') });
    const tvx = Kc.tv; B(tvx - 0.65, F, -zi, tvx + 0.65, F + 0.55, -zi + 0.45, rgb('#8A5A3A')); B(tvx - 0.35, F + 0.55, -zi + 0.12, tvx + 0.35, F + 1.0, -zi + 0.2, rgb('#1E1E22'));
    { const ax = ex0 + 0.22, az = Kc.chestZ != null ? Kc.chestZ : 0.05; B(ax - 0.21, F, az - 0.42, ax + 0.21, F + 0.56, az + 0.42, rgb('#E8702A'));
      B(ax + 0.21, F + 0.12, az - 0.38, ax + 0.215, F + 0.52, az + 0.38, rgb('#C9A545')); B(ax + 0.215, F + 0.18, az - 0.32, ax + 0.22, F + 0.46, az + 0.32, rgb('#E8702A')); B(ax + 0.22, F + 0.26, az - 0.08, ax + 0.225, F + 0.38, az + 0.08, rgb('#2E5E9E'));
      g.box(ax, F + 0.58, az, 0.45, 0.04, 0.88, rgb('#D9622B')); act('chest', 'Авдар нээх', ax + 0.75, az); }
    if (Kc.sofa) { const sx0 = 2.0, sz0 = zi - 0.5, sc2 = rgb('#7A3E2E');   // буйдан (урд хананы дагуу), өмнө нь жижиг ширээ
      B(sx0 - 1.0, F, sz0 - 0.4, sx0 + 1.0, F + 0.42, sz0 + 0.4, sc2); B(sx0 - 1.0, F + 0.42, sz0 + 0.2, sx0 + 1.0, F + 0.85, sz0 + 0.4, sc2);
      for (const e of [-1, 1]) B(sx0 + e * 1.0 - 0.12, F, sz0 - 0.4, sx0 + e * 1.0 + 0.12, F + 0.62, sz0 + 0.4, sc(sc2, 0.85));
      B(sx0 - 0.5, F + 0.42, sz0 - 0.35, sx0 + 0.5, F + 0.48, sz0 + 0.1, rgb('#9A3B2E')); B(sx0 - 0.4, F, sz0 - 1.15, sx0 + 0.4, F + 0.45, sz0 - 0.75, wood); }
    const mt = Kc.mat === 'front' ? [door.c[0] - 0.45, zi - 1.0, door.c[0] + 0.45, zi - 0.03] : [xi - 1.0, door.c[1] - 0.5, xi - 0.03, door.c[1] + 0.5];
    B(mt[0], F, mt[1], mt[2], F + 0.02, mt[3], rgb('#9A3B2E'));
    // ===== баруун өрөө: унтлагын =====
    const bed = (z0, z1, pil) => { const x0 = -xi, x1 = -xi + 0.9; B(x0, F, z0, x1, F + 0.42, z1, rgb('#9A3B2E')); B(x0 + 0.03, F + 0.42, z0 + 0.03, x1 - 0.03, F + 0.5, z1 - 0.03, rgb('#2E5E9E'));
      B(x0 + 0.1, F + 0.5, pil ? z1 - 0.45 : z0 + 0.08, x1 - 0.1, F + 0.6, pil ? z1 - 0.08 : z0 + 0.45, rgb('#F4EEDF')); B(x0, F, pil ? z1 - 0.06 : z0, x1, F + 0.9, pil ? z1 : z0 + 0.06, rgb('#9A3B2E')); };
    const sw0 = Math.max(...W.side.map(z => Math.abs(z))) > 0.5 ? W.side : [0], gapL = Math.min(...sw0) - W.w / 2 - 0.15, gapH = Math.max(...sw0) + W.w / 2 + 0.15;
    const b1 = [-zi + 0.05, Math.min(-0.75, -zi + 2.05)], b2 = [Math.max(0.75, zi - 2.05), zi - 0.05]; bed(...b1, false); bed(...b2, true);
    for (const [z0, z1] of [b1, b2]) { spot('sleep', 'Унтах', -xi + 0.45, (z0 + z1) / 2, 1, 0); act('bed', 'Унтах', -xi + 1.35, (z0 + z1) / 2); }
    B(-xi, F + 0.75, -zi + 0.3, -xi + 0.02, F + 1.95, -0.95, rgb('#C9A24E')); B(-xi + 0.02, F + 0.82, -zi + 0.37, -xi + 0.03, F + 1.88, -1.02, rgb('#9A3B2E'));
    B(-xi + 0.03, F + 1.0, -zi + 0.7, -xi + 0.035, F + 1.7, -1.42, rgb('#C9A24E'));
    B(-xi + 0.1, F, -0.25, -xi + 0.55, F + 0.55, 0.2, wood); g.lathe({ segs: 7, cx: -xi + 0.32, cz: -0.02, profile: [[0.1, F + 0.55], [0.06, F + 0.8], [0.16, F + 0.85], [0.12, F + 1.0], [0, F + 1.0]], color: rgb('#D8A93A') });
    const wx0 = Math.max(-xi + 1.1, px - pt - 0.6); B(wx0 - 0.55 + 0.0, F, -zi, wx0, F + 1.9, -zi + 0.55, rgb('#B98A56')); B(wx0 - 0.28, F + 0.1, -zi + 0.551, wx0 - 0.27, F + 1.8, -zi + 0.556, dark);
    B(-xi + 1.0, F, 0.5, -xi + 1.6, F + 0.01, 2.0, rgb('#C9A24E'));
  }
  // ===== үүдний амбаар: локал координатад (хананаас +Z), дараа нь pose-оор байрлуулна =====
  const pg = new Geo(px2uv(...A.white)), qw = Q.w / 2 - 0.05, qd = Q.d - 0.05, pf = 0.1, pw = sc(rgb(P.wood), 0.85);
  pg.quad([[-qw, pf, 0.02], [qw, pf, 0.02], [qw, pf, qd], [-qw, pf, qd]], [0, 1, 0], rgb('#9A7A55'));
  for (const [a, b2, n] of [[[-qw, qd], [-qw, 0.02], [1, 0, 0]], [[qw, 0.02], [qw, qd], [-1, 0, 0]], [[qw, qd], [-qw, qd], [0, 0, -1]]]) pg.quad([[a[0], pf, a[1]], [b2[0], pf, b2[1]], [b2[0], Q.hFront - 0.05, b2[1]], [a[0], Q.hFront - 0.05, a[1]]], n, pw);
  pg.quad([[-qw, Q.hFront - 0.06, qd], [qw, Q.hFront - 0.06, qd], [qw, Q.hFront - 0.06, 0.02], [-qw, Q.hFront - 0.06, 0.02]], [0, -1, 0], sc(pw, 0.9));
  panel(pg, [0, D.sill + D.h / 2, 0.005], [0, 0, 1], D.w / 2, D.h / 2, 0.02, A.door, tr);
  if (Q.doorFace === 'out') panel(pg, [0, D.sill + D.h / 2, qd], [0, 0, -1], D.w / 2, D.h / 2, 0.02, A.door, tr);
  else { const sx = Q.doorFace === 'right' ? 1 : -1; panel(pg, [sx * qw, D.sill + D.h / 2, Q.d / 2], [-sx, 0, 0], D.w / 2, D.h / 2, 0.02, A.door, tr); }
  if (!T.empty) { const os = Q.doorFace === 'left' ? 1 : -1;   // гаднах хаалганаас эсрэг хананд
    B(os * qw - (os > 0 ? 0.35 : 0), pf, 0.2, os * qw + (os < 0 ? 0.35 : 0), pf + 0.5, Math.min(1.1, qd - 0.1), wood, pg);
    pg.lathe({ segs: 7, cx: -os * (qw - 0.25), cz: 0.3, profile: [[0.17, pf], [0.2, pf + 0.38], [0, pf + 0.39]], color: iron });
    pg.lathe({ segs: 7, cx: os * (qw - 0.3), cz: qd - 0.35, profile: [[0.22, pf], [0.24, pf + 0.62], [0, pf + 0.63]], color: rgb('#B9BBB7') });
    for (let k = 0; k < 3; k++) B(os * qw - 0.06, 1.55, 0.3 + k * 0.3, os * qw + 0.06, 1.6, 0.34 + k * 0.3, iron, pg);
    B(os * (qw - 0.08) - 0.06, 1.0, 0.25, os * (qw - 0.08) + 0.06, 1.55, 0.5, rgb('#2F5D9B'), pg); }
  const pose = { front: [0, Q.x, hd], east: [Math.PI / 2, hw, Q.z], west: [-Math.PI / 2, -hw, Q.z] }[Q.side];
  g.append(pg, ...pose);
  for (const c of pColliders) { const a = rot(c.x0, c.z0, pose[0], pose[1], pose[2]), b2 = rot(c.x1, c.z1, pose[0], pose[1], pose[2]);
    colliders.push({ type: 'box', x0: Math.min(a[0], b2[0]), z0: Math.min(a[1], b2[1]), x1: Math.max(a[0], b2[0]), z1: Math.max(a[1], b2[1]) }); }
  const lu = px2uv(...A.lamp), lights = [];
  for (const [bx, bz] of T.bulbs) { g.lathe({ segs: 6, cx: bx, cz: bz, profile: [[0.02, Cy], [0.02, Cy - 0.3], [0.09, Cy - 0.34], [0, Cy - 0.46]], color: [1, 1, 1], uv: lu }); lights.push(new THREE.Vector3(bx, Cy - 0.5, bz)); }
  const viewX = (px + pt + xi) / 2;
  return { geo: g, lights, view: new THREE.Vector3(viewX + 0.4, F + 1.55, 0.9), floorY: F, ceilY: Cy, empty: !!T.empty, colliders, npcSpots, interact, doorGap,
    rooms: [ { name: T.empty ? 'Их өрөө' : 'Гал тогоо, зочны өрөө', x0: Math.min(px, 0) < px ? px + pt : -xi, x1: xi, z0: -zi, z1: zi }, { name: T.empty ? 'Бага өрөө' : 'Унтлагын өрөө', x0: -xi, x1: px - pt, z0: -zi, z1: zi }, { name: 'Үүдний амбаар', pose, w: Q.w, d: Q.d } ] };
}

/** Байшингийн мэдэгдэх (mirror) хувилбарт: Б байшинг А-ийн зохион байгуулалтаар толин тусгалаар — хэмжээ, цонх, амбаарын байрлалыг x-ээр эргүүлнэ */
export function mirroredHouse(K) {
  return { ...K, window: { ...K.window, front: K.window.front.map(x => -x), side: K.window.side }, porch: { ...K.porch, x: K.porch.x != null ? -K.porch.x : K.porch.x } };
}
/** Geo-г x тэнхлэгээр толин тусгалаар (гурвалжны эрэмбийг сэлгэнэ) */
export function mirrorGeoX(g) {
  for (let i = 0; i < g.p.length; i += 9) {
    for (let k = 0; k < 9; k += 3) { g.p[i + k] = -g.p[i + k]; g.n[i + k] = -g.n[i + k]; }
    for (const arr of [g.p, g.n, g.c]) for (let d = 0; d < 3; d++) { const t = arr[i + 3 + d]; arr[i + 3 + d] = arr[i + 6 + d]; arr[i + 6 + d] = t; }
    const u = i / 9 * 6; for (let d = 0; d < 2; d++) { const t = g.u[u + 2 + d]; g.u[u + 2 + d] = g.u[u + 4 + d]; g.u[u + 4 + d] = t; }
  }
}
/** makeInterior(key): key = data/buildings.json interior.houseA|houseB|houseC|houseBf. → { geo, lights, floorY, ceilY, empty, view } */
export function makeInterior(key) {
  const C = BUILDING_CONFIG, V = C.interior[key]; if (!V || typeof V !== 'object') return null;
  const base = V.base || key, K0 = C.house[base], T = V.layout ? C.interior[V.layout] : V; if (!K0 || !T) return null;
  const mirror = !!V.mirror, r = buildInterior(mirror ? mirroredHouse(K0) : K0, T);
  if (mirror) {   // геометр, гэрэл, саад, цэгүүд x-ээр толин тусгал
    const fv = v => new THREE.Vector3(-v.x, v.y, v.z);
    mirrorGeoX(r.geo); r.lights = r.lights.map(fv); r.view = fv(r.view);
    r.colliders = r.colliders.map(c => c.type === 'circle' ? { ...c, x: -c.x } : { ...c, x0: -c.x1, x1: -c.x0 });
    r.npcSpots = r.npcSpots.map(s => ({ ...s, position: fv(s.position), facing: fv(s.facing) }));
    r.interact = r.interact.map(s => ({ ...s, position: fv(s.position) }));
    r.doorGap = { ...r.doorGap, x: -r.doorGap.x, n: fv(r.doorGap.n) };
  }
  return r;
}
