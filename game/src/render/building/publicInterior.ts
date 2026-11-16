// @ts-nocheck — лабораторийн (tools/character-lab/furniture.html, S2, батлагдсан сургуулийн анги, дуган, ЗДТГ, банк, сүү/ноос хүлээн авах цэг) нийтийн барилгын дотор талын кодыг өөрчлөлтгүй хуулсан. Тоо зөвхөн data/buildings.json interior.public, spot data/interiors.json-оос.
import * as THREE from 'three';
import { Geo, rgb, mix } from '../ger/geo';
import { BUILDING_CONFIG as BC } from './config';
import { px2uv, sc, panel, signRect } from './core';

const lth = (G, o) => G.lathe({ ...o, profile: o.profile.map(([r, y]) => [r, y + (o.cy || 0)]) });

const appendY = (G, q, phi, x, z, y = 0) => { if (y) for (let i = 1; i < q.p.length; i += 3) q.p[i] += y; G.append(q, phi, x, z); };

function discZ(g, x, y, z, profile, colorAt, segs = 16, dir = 1) {   // dir: +1 — нүүр +Z (хойд хананд), −1 — нүүр −Z (урд хананд)
  const q = new Geo(px2uv(...BC.atlas.white)); q.lathe({ segs, smooth: false, profile, colorAt, color: colorAt ? undefined : [1, 1, 1] });
  for (let i = 0; i < q.p.length; i += 3) { const yy = q.p[i + 1], zz = q.p[i + 2], ny = q.n[i + 1], nz = q.n[i + 2]; q.p[i + 1] = -zz * dir; q.p[i + 2] = yy * dir; q.n[i + 1] = -nz * dir; q.n[i + 2] = ny * dir; }
  appendY(g, q, 0, x, z, y);
}

const MN_SHAPE = [[0.02, 0.62], [0.1, 0.8], [0.22, 0.9], [0.34, 0.86], [0.46, 0.94], [0.56, 0.86], [0.66, 0.88], [0.78, 0.8], [0.9, 0.74], [0.98, 0.6], [0.92, 0.48], [0.8, 0.44], [0.7, 0.3], [0.56, 0.12], [0.42, 0.1], [0.3, 0.2], [0.16, 0.34], [0.06, 0.44]];

export function makePublicInterior(kind, room) {
  const PI = BC.interior.public, T = PI[kind]; if (!T) return null;
  const S = PI.style, A = BC.atlas, white = px2uv(...A.white), shell = new Geo(white), g = new Geo(white);
  const hw = room.w / 2, hd = room.d / 2, H = room.h, up = rgb(room.wall), low = mix(room.wall, room.trim, S.lowMix), trim = rgb(room.trim);
  const B = (x0, y0, z0, x1, y1, z1, c, G = g) => G.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, c);
  // ---- хана: доор тос будаг, дээр шохой, заагт хүрээ (makeInterior-ийн wall-тэй ижил); нормал дотогш
  const wall = (a, b, n, y0, y1) => { const q = (p, y) => [p[0], y, p[1]], m = Math.max(y0, Math.min(y1, S.lowH));
    if (m > y0) shell.quad([q(a, y0), q(b, y0), q(b, m), q(a, m)], n, low); if (y1 > m) shell.quad([q(a, m), q(b, m), q(b, y1), q(a, y1)], n, up);
    if (S.lowH > y0 && S.lowH < y1) { const o = 0.01; shell.quad([[a[0] + n[0] * o, S.lowH - 0.03, a[1] + n[2] * o], [b[0] + n[0] * o, S.lowH - 0.03, b[1] + n[2] * o], [b[0] + n[0] * o, S.lowH + 0.03, b[1] + n[2] * o], [a[0] + n[0] * o, S.lowH + 0.03, a[1] + n[2] * o]], n, trim); } };
  // нүхтэй хана: holes [{a0, a1, y0, y1}] — a нь ханын дагуух координат
  const wallHoles = (P0, P1, n, holes) => { const L2 = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]), at = t => [P0[0] + (P1[0] - P0[0]) * t / L2, P0[1] + (P1[1] - P0[1]) * t / L2];
    const xs = [...new Set([0, L2, ...holes.flatMap(h => [h.a0, h.a1])])].sort((a, b) => a - b);
    for (let i = 0; i < xs.length - 1; i++) { const a = xs[i], b = xs[i + 1], m = (a + b) / 2, hs = holes.filter(h => m > h.a0 && m < h.a1).sort((p, q) => p.y0 - q.y0); let y = 0;
      for (const h of hs) { if (h.y0 > y) wall(at(a), at(b), n, y, h.y0); y = h.y1; } if (y < H) wall(at(a), at(b), n, y, H); } };
  const D = T.door, W = T.windows, tr = rgb(BC.palette.trim, 0.7), sill = rgb('#F4F1EA');
  wallHoles([-hw, -hd], [hw, -hd], [0, 0, 1], []);                                                                       // хойд (самбар)
  wallHoles([-hw, hd], [hw, hd], [0, 0, -1], [{ a0: hw + D.x - D.w / 2, a1: hw + D.x + D.w / 2, y0: 0, y1: D.h }]);        // урд: хаалга
  const sides = W.sides ?? [W.side], winHoles = W.z.map(z => ({ a0: hd + z - W.w / 2, a1: hd + z + W.w / 2, y0: W.sill, y1: W.sill + W.h }));
  for (const sx of [1, -1]) wallHoles([sx * hw, -hd], [sx * hw, hd], [-sx, 0, 0], sides.includes(sx) ? winHoles : []);
  for (const sx of sides) for (const z of W.z) { const wx = sx * hw;
    panel(shell, [wx, W.sill + W.h / 2, z], [-sx, 0, 0], W.w / 2, W.h / 2, 0.03, A.window, tr);                         // цонх (атлас), тавцан
    B(Math.min(wx, wx - sx * 0.22), W.sill - 0.04, z - W.w / 2 - 0.06, Math.max(wx, wx - sx * 0.22), W.sill, z + W.w / 2 + 0.06, sill, shell); }
  panel(shell, [D.x, D.h / 2, hd], [0, 0, -1], D.w / 2, D.h / 2, 0.03, A[D.atlas ?? 'door'], tr);                        // хаалга (атлас)
  // шал (банз), тааз, хормой
  shell.quad([[-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd]], [0, 1, 0], rgb(room.floor));
  for (let k = 1; k < 14; k++) { const x = -hw + k * room.w / 14; shell.quad([[x - 0.01, 0.002, -hd], [x + 0.01, 0.002, -hd], [x + 0.01, 0.002, hd], [x - 0.01, 0.002, hd]], [0, 1, 0], sc(rgb(room.floor), 0.78)); }
  const ceil = new Geo(white); ceil.quad([[-hw, H, hd], [hw, H, hd], [hw, H, -hd], [-hw, H, -hd]], [0, -1, 0], rgb(S.ceil));
  const lu = px2uv(...A.lamp), lights = [];
  for (const [lx, lz] of T.lamps) { B(lx - 0.62, H - 0.08, lz - 0.09, lx + 0.62, H - 0.02, lz + 0.09, rgb('#D8D4CA'), ceil);
    ceil.box(lx, H - 0.09, lz, 1.18, 0.02, 0.12, [1, 1, 1]); for (let i = ceil.u.length - 72; i < ceil.u.length; i += 2) { ceil.u[i] = lu[0]; ceil.u[i + 1] = lu[1]; }   // гэрэлтэх хэсэг: атласын чийдэн (шөнө гэрэлтэнэ)
    lights.push(new THREE.Vector3(lx, H - 0.3, lz)); }
  const work = T.work.map(w => ({ ...w }));
  const glass = new Geo(white);   // шил (банкны касс): тунгалаг тусдаа mesh
  const placed = { school: furnishSchool, temple: furnishTemple, admin: furnishAdmin, bank: furnishBank, milk: furnishMilk }[kind](g, T, room, B, glass);
  return { shell, ceil, furn: g, glass, lights, work, placed, floorY: 0, ceilY: H };
}

function furnishSchool(g, T, room, B) {
  const hw = room.w / 2, hd = room.d / 2, placed = [], C = c => rgb(c), spot = id => room.spots.find(s => s.id === id);
  // самбар: хойд хананд (spot board-ын x), модон хүрээ, бараан ногоон хавтан, шохойн тавиур, шохойн бичиг
  { const s = spot('board'), Bd = T.board, x = s.x, z = -hd, fr = C(Bd.frame), y0 = Bd.y, y1 = Bd.y + Bd.h;
    B(x - Bd.w / 2 - 0.06, y0 - 0.06, z, x + Bd.w / 2 + 0.06, y1 + 0.06, z + 0.04, fr);
    B(x - Bd.w / 2, y0, z + 0.04, x + Bd.w / 2, y1, z + 0.05, C(Bd.slate));
    B(x - Bd.w / 2 - 0.04, y0 - 0.1, z, x + Bd.w / 2 + 0.04, y0 - 0.07, z + 0.12, fr);                               // шохойн тавиур
    B(x + 0.9, y0 - 0.07, z + 0.05, x + 1.0, y0 - 0.04, z + 0.09, C('#F4F1EA')); B(x - 1.2, y0 - 0.07, z + 0.05, x - 0.98, y0 - 0.03, z + 0.1, C('#5A4632'));   // шохой, арчуур
    const ch = C(Bd.chalk), line = (a, b, yy) => B(x + a, yy - 0.012, z + 0.05, x + b, yy + 0.012, z + 0.056, ch);
    line(-1.4, -0.4, y1 - 0.18); line(-1.4, 0.6, y1 - 0.36); line(-1.4, 0.1, y1 - 0.54); line(-1.4, -0.7, y1 - 0.72);   // бичвэрийн мөр
    for (let i = 0; i < 4; i++) line(0.75 + i * 0.16, 0.85 + i * 0.16, y1 - 0.9);                                      // жишээ: 2 + 3 = 5
    // хөрөг (самбарын дээр) — хүрээ, дэвсгэр, хүний дүр
    const py = Math.min(room.h - 0.38, y1 + 0.4);
    B(x - 0.24, py - 0.3, z, x + 0.24, py + 0.3, z + 0.03, C('#C9A24E')); B(x - 0.19, py - 0.25, z + 0.03, x + 0.19, py + 0.25, z + 0.035, C('#E9DFC6'));
    B(x - 0.14, py - 0.25, z + 0.035, x + 0.14, py - 0.05, z + 0.04, C('#2F5D9B')); B(x - 0.07, py - 0.06, z + 0.035, x + 0.07, py + 0.13, z + 0.04, C('#E2B890')); B(x - 0.08, py + 0.11, z + 0.035, x + 0.08, py + 0.18, z + 0.042, C('#3A2C22'));
    placed.push({ ...s, note: 'хойд хананд' }); }
  // багшийн ширээ: тавцан, шургуулгатай тавиур, урд хаалт; дээр нь ном, бөмбөрцөг; ард нь сандал
  { const s = spot('teacher_desk'), K = T.teacherDesk, x = s.x, z = s.z, w = C(K.color), dk = sc(w, 0.7);
    B(x - K.w / 2, K.h - 0.04, z - K.d / 2, x + K.w / 2, K.h, z + K.d / 2, w);
    B(x + K.w / 2 - 0.42, 0, z - K.d / 2 + 0.02, x + K.w / 2 - 0.02, K.h - 0.04, z + K.d / 2 - 0.02, dk);              // шургуулгатай тавиур
    for (let k = 0; k < 3; k++) B(x + K.w / 2 - 0.38, 0.08 + k * 0.22, z - K.d / 2 + 0.01, x + K.w / 2 - 0.06, 0.26 + k * 0.22, z - K.d / 2 + 0.02, sc(w, 0.85));
    B(x - K.w / 2 + 0.02, 0, z - K.d / 2 + 0.02, x - K.w / 2 + 0.06, K.h - 0.04, z + K.d / 2 - 0.02, dk);
    B(x - K.w / 2 + 0.02, 0.25, z + K.d / 2 - 0.04, x + K.w / 2 - 0.42, K.h - 0.06, z + K.d / 2 - 0.02, dk);           // урд хаалт (сурагчид тал)
    B(x - 0.4, K.h, z - 0.05, x - 0.12, K.h + 0.06, z + 0.15, C('#9A3B2E')); B(x - 0.38, K.h + 0.06, z - 0.04, x - 0.14, K.h + 0.1, z + 0.12, C('#2E5E9E'));   // ном
    g.lathe({ segs: 8, cx: x + 0.35, cz: z + 0.1, profile: [[0.06, K.h], [0.06, K.h + 0.02], [0.012, K.h + 0.03], [0.012, K.h + 0.08]], color: C('#5A4632') });
    g.lathe({ segs: 8, cx: x + 0.35, cz: z + 0.1, profile: [[0, K.h + 0.08], [0.09, K.h + 0.17], [0.1, K.h + 0.26], [0.07, K.h + 0.33], [0, K.h + 0.36]], color: C('#4F8FC0') });   // бөмбөрцөг
    chair(g, x, z - 0.55, Math.PI, C('#9A6A42'));                                                                     // багшийн сандал (сурагчид руу харна)
    placed.push(s); }
  // сурагчдын ширээ 3 × 4 (хоёр хүний), тус бүр хоёр сандал — сурагчид самбар руу (−Z) харна
  const Dk = T.desks; let n = 0;
  for (const z of Dk.rows) for (const x of Dk.cols) { n++;
    const id = 'desk_' + n, s = room.spots.find(p => p.kind === 'desk' && Math.abs(p.x - x) < 0.05 && Math.abs(p.z - z) < 0.05);
    studentDesk(g, x, z, Dk); for (const sx of [-0.3, 0.3]) chair(g, x + sx, z + 0.42, 0, C(Dk.chair));
    placed.push(s ? { ...s } : { id, kind: 'desk', x, z, rot: 0, proposed: true }); }
  // цонхны доорх радиатор
  for (const z of T.windows.z) { const x = T.windows.side * hw - T.windows.side * 0.06, r = C(T.radiator);
    for (let k = -5; k <= 5; k++) B(x - 0.04, 0.15, z + k * 0.07 - 0.025, x + 0.04, 0.72, z + k * 0.07 + 0.025, r); B(x - 0.03, 0.12, z - 0.4, x + 0.03, 0.15, z + 0.4, sc(r, 0.8)); }
  // номын шүүгээ (баруун хананд, хаалганы ойр): хүрээ, 4 тавиур, ном
  { const K = T.bookcase, x0 = K.x, z = K.z, w = C('#9A6A42');
    B(x0 - 0.2, 0, z - K.w / 2, x0 + 0.2, 1.8, z - K.w / 2 + 0.03, w); B(x0 - 0.2, 0, z + K.w / 2 - 0.03, x0 + 0.2, 1.8, z + K.w / 2, w); B(x0 - 0.2, 0, z - K.w / 2, x0 - 0.18, 1.8, z + K.w / 2, sc(w, 0.75));
    const cols = ['#9A3B2E', '#2E5E9E', '#4E6B3A', '#D8A93A', '#7A3E6E', '#E8DCC0'];
    for (let k = 0; k < 5; k++) { const y = 0.02 + k * 0.44; B(x0 - 0.2, y, z - K.w / 2, x0 + 0.2, y + 0.025, z + K.w / 2, w);
      if (k < 4) { let zz = z - K.w / 2 + 0.06, i = k * 3; while (zz < z + K.w / 2 - 0.12) { const t = 0.04 + (i % 3) * 0.015, h = 0.26 + (i % 4) * 0.03; B(x0 - 0.16, y + 0.025, zz, x0 + 0.12, y + 0.025 + h, zz + t, C(cols[i % cols.length])); zz += t + 0.006; i++; } } }
    placed.push({ id: 'bookcase', kind: 'shelf', x: x0, z, rot: Math.PI / 2, proposed: true }); }
  // газрын зураг (баруун хананд): хүрээ, тэнгэр/хил, Монгол улсын хэлбэр, аймгийн хил
  { const M = T.map, x = -hw + 0.02, z = M.z, y = 1.55, fr = C('#6E4A2E');
    B(x, y - M.h / 2 - 0.04, z - M.w / 2 - 0.04, x + 0.03, y + M.h / 2 + 0.04, z + M.w / 2 + 0.04, fr); B(x + 0.03, y - M.h / 2, z - M.w / 2, x + 0.035, y + M.h / 2, z + M.w / 2, C('#DCE8E4'));
    const pt = ([u, v]) => [x + 0.038, y - M.h / 2 + 0.08 + v * (M.h - 0.16), z + M.w / 2 - 0.08 - u * (M.w - 0.16)], nrm = [1, 0, 0], land = C('#D8C08A');
    const cx = MN_SHAPE.reduce((a, p) => [a[0] + p[0] / MN_SHAPE.length, a[1] + p[1] / MN_SHAPE.length], [0, 0]);
    for (let i = 0; i < MN_SHAPE.length; i++) { const a = MN_SHAPE[i], b = MN_SHAPE[(i + 1) % MN_SHAPE.length]; g.tri(pt(cx), pt(a), pt(b), nrm, nrm, nrm, land, land, land); }
    const ln = C('#9A3B2E'); for (const [a, b] of [[[0.3, 0.2], [0.34, 0.86]], [[0.56, 0.12], [0.56, 0.86]], [[0.06, 0.44], [0.92, 0.48]]]) { const p = pt(a), q = pt(b); g.beam([p[0] + 0.002, p[1], p[2]], [q[0] + 0.002, q[1], q[2]], 0.008, 0.004, ln); }
    const cap = pt([0.6, 0.52]); B(cap[0], cap[1] - 0.025, cap[2] - 0.025, cap[0] + 0.01, cap[1] + 0.025, cap[2] + 0.025, C('#B5402A'));   // Улаанбаатар
    placed.push({ id: 'map', kind: 'map', x: -hw, z, rot: Math.PI / 2, proposed: true }); }
  // хувцасны дэгээ (хаалганы баруун талд), цаг (хаалганы дээр)
  { const z = hd - 0.02; B(-2.6, 1.55, z - 0.04, -1.0, 1.65, z, C('#9A6A42')); for (let k = 0; k < 6; k++) B(-2.5 + k * 0.28, 1.5, z - 0.1, -2.47 + k * 0.28, 1.58, z - 0.04, C('#4A4640'));
    { const q = new Geo(px2uv(...BC.atlas.white)); q.lathe({ segs: 10, smooth: false, profile: [[0.16, 0], [0.16, 0.03], [0, 0.03]], color: C('#F4F1EA') });   // цагийн нүүр: босоо lathe-ийг хананд наах (y → −z)
      for (let i = 0; i < q.p.length; i += 3) { const yy = q.p[i + 1], zz = q.p[i + 2], ny = q.n[i + 1], nz = q.n[i + 2]; q.p[i + 1] = zz; q.p[i + 2] = -yy; q.n[i + 1] = nz; q.n[i + 2] = -ny; }
      appendY(g, q, 0, 0, z, 2.45); }
    B(-0.005, 2.45, z - 0.055, 0.005, 2.56, z - 0.045, C('#2A2622')); B(-0.005, 2.445, z - 0.055, 0.07, 2.455, z - 0.045, C('#2A2622')); }
  return placed;
}

function chair(g, x, z, rot, col) {
  const q = new Geo(px2uv(...BC.atlas.white)), lg = sc(col, 0.6);
  q.box(0, 0.44, 0, 0.4, 0.035, 0.38, col); q.box(0, 0.72, 0.18, 0.38, 0.28, 0.025, col);
  for (const [lx, lz] of [[-0.17, -0.16], [0.17, -0.16], [-0.17, 0.17], [0.17, 0.17]]) q.box(lx, (lz > 0 ? 0.86 : 0.44) / 2, lz, 0.03, lz > 0 ? 0.86 : 0.44, 0.03, lg);
  g.append(q, rot, x, z);
}

function studentDesk(g, x, z, K) {
  const top = rgb(K.top), fr = rgb(K.frame);
  g.box(x, K.h - 0.015, z, K.w, 0.03, K.d, top); g.box(x, K.h - 0.16, z - 0.03, K.w - 0.08, 0.02, K.d - 0.12, sc(top, 0.85));   // тавцан, номын тавиур
  g.box(x, K.h - 0.1, z - K.d / 2 + 0.03, K.w - 0.06, 0.12, 0.02, sc(top, 0.8));
  for (const sx of [-1, 1]) { const lx = x + sx * (K.w / 2 - 0.04); g.box(lx, (K.h - 0.03) / 2, z, 0.03, K.h - 0.03, 0.03, fr); g.box(lx, 0.02, z, 0.04, 0.04, K.d - 0.04, fr); g.box(lx, K.h - 0.05, z, 0.03, 0.03, K.d - 0.06, fr); }
  g.box(x, 0.18, z, K.w - 0.08, 0.025, 0.025, fr);
}

function furnishTemple(g, T, room, B) {
  const pan = (c, n, hx, hy, out, r, side) => panel(g, c, n, hx, hy, out, r, side ?? rgb(T.gold));   // panel: хажуугийн өнгө алт
  const hw = room.w / 2, hd = room.d / 2, H = room.h, A = BC.atlas, C = rgb, spot = id => room.spots.find(s => s.id === id), placed = [];
  const gold = C(T.gold), red = C(T.red), maroon = C(T.maroon), yellow = C(T.yellow), blue = C(T.blue), green = C(T.green), silk = C(T.silk), lu = px2uv(...A.lamp);
  const W = px2uv(...A.white), sub = () => new Geo(W);
  const flame = (q, x, y, z) => { const n0 = q.u.length; lth(q, { segs: 5, cx: x, cz: z, cy: y, color: C('#FFB35C'), profile: [[0.012, 0], [0.018, 0.025], [0, 0.06]] }); for (let i = n0; i < q.u.length; i += 2) { q.u[i] = lu[0]; q.u[i + 1] = lu[1]; } };   // гал: атласын чийдэн (шөнө гэрэлтэнэ)
  const zul = (q, x, y, z) => { lth(q, { segs: 6, cx: x, cz: z, cy: y, color: gold, smooth: false, profile: [[0.04, 0], [0.025, 0.02], [0.012, 0.07], [0.045, 0.1], [0.05, 0.13], [0, 0.125]] }); flame(q, x, y + 0.125, z); };
  // ===== тахил (хойд хананд, spot altar-ын x): хоёр шат, хээтэй нүүр, ар хөшиг, гэрэлт хүрээ, бурхан, тахилын эд =====
  { const s = spot('altar'), Al = T.altar, ax = s.x, bz = -hd;
    B(ax - Al.w / 2, 0, bz, ax + Al.w / 2, Al.h1, bz + Al.d, maroon);
    for (let k = 0; k < 4; k++) pan([ax - Al.w / 2 + Al.w * (k + 0.5) / 4, Al.h1 / 2, bz + Al.d], [0, 0, 1], Al.w / 8 - 0.05, Al.h1 / 2 - 0.06, 0.005, A.ornament);
    B(ax - Al.w / 2 - 0.02, Al.h1, bz, ax + Al.w / 2 + 0.02, Al.h1 + 0.03, bz + Al.d + 0.02, gold);
    B(ax - Al.w2 / 2, Al.h1, bz, ax + Al.w2 / 2, Al.h2, bz + Al.d2, red);
    for (let k = 0; k < 3; k++) pan([ax - Al.w2 / 2 + Al.w2 * (k + 0.5) / 3, (Al.h1 + Al.h2) / 2, bz + Al.d2], [0, 0, 1], Al.w2 / 6 - 0.05, (Al.h2 - Al.h1) / 2 - 0.05, 0.005, A.ornament);
    B(ax - Al.w2 / 2 - 0.02, Al.h2, bz, ax + Al.w2 / 2 + 0.02, Al.h2 + 0.03, bz + Al.d2 + 0.02, gold);
    // ар хөшиг: бараан улаан хавтан, алтан хүрээ, дээд талын хээтэй хөндлөвч
    B(ax - Al.w / 2, Al.h1, bz, ax + Al.w / 2, Al.backH, bz + 0.05, C('#5A1A16')); B(ax - Al.w / 2 - 0.05, Al.backH, bz, ax + Al.w / 2 + 0.05, Al.backH + 0.2, bz + 0.1, gold);
    pan([ax, Al.backH + 0.1, bz + 0.1], [0, 0, 1], Al.w / 2, 0.08, 0.005, A.ornament);
    for (const sx of [-1, 1]) B(ax + sx * Al.w / 2 - 0.06, Al.h1, bz, ax + sx * Al.w / 2 + 0.06, Al.backH, bz + 0.1, gold);
    // гэрэлт хүрээ (бие, толгой): өнгөт цагиргууд
    const sy = Al.h2 + 0.03, cz = bz + 0.36;
    discZ(g, ax, sy + 0.62, bz + 0.07, [[0.82, 0], [0.82, 0.015], [0.7, 0.015], [0.58, 0.015], [0, 0.015]], i => [gold, gold, C('#4F8FC0'), green][i] ?? green, 20);
    discZ(g, ax, sy + 1.12, bz + 0.09, [[0.3, 0], [0.3, 0.015], [0.22, 0.015], [0, 0.015]], i => [gold, gold, C('#E07A3A')][i], 16);
    // бурхан: дэлбээт суурь, завилсан хөл, бие, толгой (хөх үс, оройн товойлт), өвөр дээрх гар
    const q = sub(), st = C(T.statue), stD = sc(st, 0.82);
    lth(q, { segs: 12, profile: [[0.5, 0], [0.55, 0.05], [0.5, 0.1], [0.42, 0.16], [0.36, 0.18]], colorAt: i => (i % 2 ? C('#D9707A') : gold) });   // дэлбээт суурь
    lth(q, { segs: 12, profile: [[0.42, 0.18], [0.47, 0.24], [0.4, 0.33], [0.2, 0.36], [0, 0.36]], color: stD });   // хөл
    lth(q, { segs: 12, profile: [[0.24, 0.32], [0.27, 0.45], [0.24, 0.62], [0.16, 0.74], [0.08, 0.79]], color: st });   // бие
    lth(q, { segs: 12, profile: [[0.08, 0.78], [0.12, 0.84], [0.135, 0.92], [0.12, 0.99], [0.1, 1.01], [0.06, 1.05], [0.065, 1.08], [0, 1.12]], colorAt: i => (i >= 3 ? C('#2E4A8E') : st) });   // толгой
    q.box(0, 0.4, 0.2, 0.26, 0.06, 0.12, st); q.box(0, 0.37, 0.27, 0.34, 0.02, 0.1, silk);                                    // гар, өвөр дээрх хадаг
    for (let i = 0; i < q.p.length; i += 3) { q.p[i + 2] *= 0.72; }
    appendY(g, q, 0, ax, cz, sy);
    // тахилын эд: доод шатанд долоон аяга, хоёр талд зул; дунд шатанд цэцэгтэй ваар, жимсний таваг, хүж; хадаг унжина
    const fz = bz + Al.d - 0.18;
    for (let k = 0; k < 7; k++) lth(g, { segs: 7, cx: ax - 0.78 + k * 0.26, cz: fz, cy: Al.h1 + 0.03, color: gold, smooth: false, profile: [[0.035, 0], [0.06, 0.055], [0.052, 0.055], [0, 0.048]] });
    for (const x of [-1.45, -1.22, 1.22, 1.45]) zul(g, ax + x, Al.h1 + 0.03, fz);
    for (const sx of [-1, 1]) { const vx = ax + sx * 1.0, vz = bz + Al.d2 - 0.2;
      lth(g, { segs: 8, cx: vx, cz: vz, cy: Al.h2 + 0.03, color: C('#4F8FC0'), profile: [[0.06, 0], [0.09, 0.08], [0.05, 0.18], [0.04, 0.22], [0.06, 0.25], [0, 0.25]] });
      for (let k = 0; k < 5; k++) { const a = k * 1.256; g.box(vx + Math.sin(a) * 0.07, Al.h2 + 0.33 + (k % 2) * 0.04, vz + Math.cos(a) * 0.07, 0.07, 0.06, 0.07, [C('#E05A6A'), yellow, C('#F4F1EA')][k % 3]); }
      lth(g, { segs: 8, cx: ax + sx * 0.62, cz: vz + 0.08, cy: Al.h2 + 0.03, color: gold, smooth: false, profile: [[0.13, 0], [0.14, 0.03], [0, 0.03]] });
      for (let k = 0; k < 3; k++) g.box(ax + sx * 0.62 + (k - 1) * 0.06, Al.h2 + 0.08, vz + 0.08, 0.06, 0.06, 0.06, [C('#D9622B'), C('#B5402A'), yellow][k]);
      g.beam([ax + sx * 0.55, Al.h2 + 0.02, bz + Al.d2 + 0.01], [ax + sx * 0.6, Al.h1 + 0.06, bz + Al.d2 + 0.03], 0.13, 0.008, silk);   // унжсан хадаг
      zul(g, ax + sx * 1.22, Al.h2 + 0.03, bz + Al.d2 - 0.12); }
    lth(g, { segs: 7, cx: ax, cz: bz + Al.d - 0.05, cy: Al.h1 + 0.03, color: C('#8A6A3A'), profile: [[0.07, 0], [0.08, 0.08], [0, 0.08]] });
    for (let k = 0; k < 3; k++) g.beam([ax - 0.02 + k * 0.02, Al.h1 + 0.1, bz + Al.d - 0.05], [ax - 0.05 + k * 0.05, Al.h1 + 0.36, bz + Al.d - 0.08], 0.006, 0.006, C('#B5402A'));   // хүж
    placed.push({ ...s, note: 'хойд хананд' }); }
  // ===== хандивын хайрцаг (spot donation, мөргөлчний E цэг) =====
  { const s = spot('donation'), x = s.x, z = s.z;
    B(x - 0.28, 0, z - 0.2, x + 0.28, 0.5, z + 0.2, red); B(x - 0.3, 0.5, z - 0.22, x + 0.3, 0.54, z + 0.22, gold); B(x - 0.1, 0.54, z - 0.015, x + 0.1, 0.545, z + 0.015, C('#1A130D'));
    pan([x, 0.27, z + 0.2], [0, 0, 1], 0.22, 0.17, 0.005, A.ornament); placed.push(s); }
  // ===== олбог суудлын эгнээ: тавцан, олбог (хоёр лам), өмнө нь намхан ширээ, судар — төв зам руу харна =====
  const R = T.rows;
  for (const s of room.spots.filter(p => p.kind === 'seat')) { const x = s.x, z0 = s.z, f = x < 0 ? 1 : -1;   // f: харах тал (+X баруун эгнээ)
    B(x - 0.38, 0, z0 - R.len / 2, x + 0.38, 0.1, z0 + R.len / 2, maroon);
    for (const dz of [-R.len / 4, R.len / 4]) { const z = z0 + dz;
      B(x - R.cushion / 2, 0.1, z - 0.36, x + R.cushion / 2, 0.2, z + 0.36, yellow); B(x - R.cushion / 2 + 0.03, 0.2, z - 0.33, x + R.cushion / 2 - 0.03, 0.205, z + 0.33, C('#C9402A'));
      const tx = x + f * R.tableOff;   // ширээ
      B(tx - 0.2, 0.3, z - 0.32, tx + 0.2, 0.36, z + 0.32, red); for (const sz of [-1, 1]) B(tx - 0.18, 0, z + sz * 0.28 - 0.025, tx + 0.18, 0.3, z + sz * 0.28 + 0.025, sc(red, 0.75));
      pan([tx + f * 0.2, 0.17, z], [f, 0, 0], 0.26, 0.11, 0.004, A.ornament);
      B(tx - 0.06, 0.36, z - 0.16, tx + 0.06, 0.42, z + 0.16, yellow); B(tx - 0.065, 0.39, z - 0.17, tx + 0.065, 0.4, z + 0.17, C('#B5402A')); }   // судар (боодолтой)
    placed.push(s); }
  // ===== ширээт ламын өндөр суудал (баруун эгнээний толгойд), эсрэг талд хэнгэрэг =====
  { const w = T.work.find(p => p.id === 'lama_head'), x = w.x, z = w.z;
    B(x - 0.42, 0, z - 0.42, x + 0.42, 0.45, z + 0.42, maroon); pan([x + 0.42, 0.22, z], [1, 0, 0], 0.36, 0.17, 0.005, A.ornament);
    B(x - 0.4, 0.45, z - 0.4, x + 0.4, 0.55, z + 0.4, yellow); B(x - 0.48, 0.45, z - 0.44, x - 0.38, 1.25, z + 0.44, red); B(x - 0.5, 1.25, z - 0.46, x - 0.36, 1.3, z + 0.46, gold);
    B(x + 0.62, 0.4, z - 0.3, x + 1.0, 0.48, z + 0.3, red); for (const sz of [-1, 1]) B(x + 0.64, 0, z + sz * 0.26 - 0.02, x + 0.98, 0.4, z + sz * 0.26 + 0.02, sc(red, 0.75));
    B(x + 0.75, 0.48, z - 0.12, x + 0.87, 0.53, z + 0.12, yellow); lth(g, { segs: 6, cx: x + 0.82, cz: z + 0.22, cy: 0.48, color: gold, profile: [[0.03, 0], [0.04, 0.08], [0, 0.1]] });   // судар, хонх
    placed.push({ id: w.id, kind: 'seat', x, z, rot: w.rot, proposed: true }); }
  { const w = T.work.find(p => p.id === 'lama_drum'), x = w.x + -0.95, z = w.z, dr = 0.36;   // хэнгэрэг: хоёр шон, хөндлөвч, өлгөөтэй бөмбөр (лам руу харна)
    for (const sz of [-1, 1]) B(x - 0.03, 0, z + sz * (dr + 0.1) - 0.03, x + 0.03, 1.3, z + sz * (dr + 0.1) + 0.03, red);
    B(x - 0.03, 1.3, z - dr - 0.13, x + 0.03, 1.36, z + dr + 0.13, gold);
    const q = sub(); lth(q, { segs: 14, smooth: false, profile: [[dr, -0.11], [dr + 0.02, -0.1], [dr + 0.02, 0.1], [dr, 0.11], [0, 0.11]], colorAt: i => (i === 1 ? red : i === 4 ? C('#E8DCC0') : gold) });
    lth(q, { segs: 14, smooth: false, profile: [[0, -0.11], [dr, -0.11]], color: C('#E8DCC0') });
    for (let i = 0; i < q.p.length; i += 3) { const px = q.p[i], py = q.p[i + 1], nx = q.n[i], ny = q.n[i + 1]; q.p[i] = py; q.p[i + 1] = -px; q.n[i] = ny; q.n[i + 1] = -nx; }   // тэнхлэг X
    appendY(g, q, 0, x, z, 0.9); g.beam([x, 1.3, z], [x, 0.9 + dr, z], 0.02, 0.02, C('#3A2618'));
    g.beam([x + 0.5, 0.25, z + 0.3], [x + 0.2, 0.75, z + 0.1], 0.02, 0.02, C('#C9A24E'));   // цохиур
    placed.push({ id: 'drum', kind: 'drum', x, z, rot: -Math.PI / 2, proposed: true }); }
  // ===== 4 багана: суурь, улаан бие, хөх-ногоон толгой, алтан хээ, хадаг уясан; дээр нь хөндлөн дам нуруу, унжсан ялгаа =====
  const Pl = T.pillars;
  for (const sx of [-1, 1]) { const x = sx * Pl.x, s2 = Pl.size / 2;
    for (const z of Pl.z) { B(x - s2 - 0.05, 0, z - s2 - 0.05, x + s2 + 0.05, 0.12, z + s2 + 0.05, C('#8C8478')); B(x - s2, 0.12, z - s2, x + s2, H - 0.45, z + s2, red);
      B(x - s2 - 0.02, H - 0.62, z - s2 - 0.02, x + s2 + 0.02, H - 0.52, z + s2 + 0.02, gold); B(x - s2 - 0.06, H - 0.52, z - s2 - 0.06, x + s2 + 0.06, H - 0.45, z + s2 + 0.06, green);
      B(x - 0.35, H - 0.45, z - s2 - 0.04, x + 0.35, H - 0.32, z + s2 + 0.04, blue);
      B(x - s2 - 0.012, 1.45, z - s2 - 0.012, x + s2 + 0.012, 1.55, z + s2 + 0.012, silk); g.beam([x + sx * (s2 + 0.01), 1.5, z + s2], [x + sx * (s2 + 0.02), 0.95, z + s2 + 0.05], 0.1, 0.006, silk); }
    B(x - 0.1, H - 0.32, -hd, x + 0.1, H - 0.1, hd, red); B(x - 0.105, H - 0.26, -hd, x + 0.105, H - 0.2, hd, gold);   // дам нуруу
    { const bz = (Pl.z[0] + Pl.z[1]) / 2, top = H - 0.32, cols = [yellow, red, blue, green, C('#F4F1EA')];   // ялгаа: давхар өнгөт цилиндр
      lth(g, { segs: 10, cx: x, cz: bz, cy: 0, profile: [[0, top - 1.02], [0.2, top - 1.0], [0.23, top - 0.82], [0.21, top - 0.8], [0.21, top - 0.54], [0.19, top - 0.52], [0.19, top - 0.3], [0.17, top - 0.28], [0.17, top - 0.04], [0.02, top]], colorAt: i => cols[(8 - i) % cols.length], smooth: false });   /* доороос дээш (нормал гадагш) */ } }
  // ===== улаан хивс (төв зам) =====
  B(-0.8, 0.002, -hd + T.altar.d + 0.15, 0.8, 0.012, hd - 0.5, C('#8A2A2E')); for (const sx of [-1, 1]) B(sx * 0.8 - 0.06, 0.003, -hd + T.altar.d + 0.15, sx * 0.8, 0.014, hd - 0.5, gold);
  // ===== танка (хажуу хананд, цонхны хооронд): торгон хүрээ, зураг (атласын niche) =====
  for (const sx of [-1, 1]) { const x = sx * hw - sx * 0.02, z = (T.windows.z[0] + T.windows.z[1]) / 2, y = 1.75;
    B(Math.min(x, x - sx * 0.02), y - 0.75, z - 0.45, Math.max(x, x - sx * 0.02), y + 0.75, z + 0.45, blue); B(Math.min(x, x - sx * 0.03), y - 0.62, z - 0.36, Math.max(x, x - sx * 0.03), y + 0.62, z + 0.36, yellow);
    pan([x - sx * 0.03, y + 0.03, z], [-sx, 0, 0], 0.3, 0.52, 0.005, A.niche); g.beam([x - sx * 0.04, y + 0.8, z - 0.5], [x - sx * 0.04, y + 0.8, z + 0.5], 0.03, 0.03, C('#3A2618')); }
  // ===== хүрд (хаалганы дэргэд): тавцан, хүрээ, бичигтэй цилиндр (атласын wheelBand), алтан таг =====
  { const K = T.wheel, x = K.x, z = K.z, r = K.r, h = K.h, v0 = 1 - (A.wheelBand[1] - 1) / A.h, v1 = 1 - (A.wheelBand[0] + 1) / A.h;
    B(x - 0.5, 0, z - 0.5, x + 0.5, 0.12, z + 0.5, C('#8C8478'));
    const bh = K.bandH, a = (h - bh) / 2, e = 0.0005, bandLen = (A.size * bh) / (A.wheelBand[1] - A.wheelBand[0]), ku = Math.min(1, (2 * Math.PI * r) / bandLen), wu = px2uv(...A.white);
    lth(g, { segs: 14, cx: x, cz: z, cy: 0.22, smooth: false, profile: [[r, 0], [r, a], [r, a + e], [r, a + bh], [r, a + bh + e], [r, h]],   // доор/дээр улаан, голд бичгийн зурвас (харьцаа хадгална)
      colorAt: i => (i === 2 ? [1, 1, 1] : i === 0 || i === 4 ? red : gold), uvAt: (pi, f) => (pi === 2 ? [f * ku, v0] : pi === 3 ? [f * ku, v1] : wu) });
    lth(g, { segs: 14, cx: x, cz: z, cy: 0.12, color: gold, smooth: false, profile: [[r + 0.03, 0], [r + 0.03, 0.1], [0, 0.1]] });
    lth(g, { segs: 14, cx: x, cz: z, cy: 0.22 + h, color: gold, smooth: false, profile: [[r + 0.03, 0], [r + 0.03, 0.08], [r * 0.5, 0.18], [0.04, 0.24], [0, 0.3]] });
    for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B(x + px * 0.44 - 0.03, 0.12, z + pz * 0.44 - 0.03, x + px * 0.44 + 0.03, h + 0.62, z + pz * 0.44 + 0.03, red);
    B(x - 0.5, h + 0.62, z - 0.5, x + 0.5, h + 0.7, z + 0.5, gold); placed.push({ id: 'prayer_wheel', kind: 'wheel', x, z, rot: 0, proposed: true }); }
  return placed;
}

// ===== V6.2: ЗДТГ, банк, сүү/ноос хүлээн авах цэг (furniture.html-ээс өөрчлөлтгүй) =====
const OF = { metal: '#8A9096', metalD: '#3E4247', screen: '#1E3448', paper: '#F4F1EA', seat: '#2F4A6A', leather: '#3A2418', red: '#C0392B', blue: '#2E5E9E', gold: '#D9A93A' };
const wuv = () => px2uv(...BC.atlas.white);
/** Эргэдэг сандал (таван хөл, суудал, түшлэг); rot = 0 → суугч +Z руу харна (түшлэг −Z талд) */
function swivel(g, x, z, rot, seatHex, high = false) {
  const q = new Geo(wuv()), m = rgb(OF.metalD), c = rgb(seatHex);
  q.box(0, 0.04, 0, 0.56, 0.04, 0.07, m); q.box(0, 0.04, 0, 0.07, 0.04, 0.56, m); q.box(0, 0.27, 0, 0.05, 0.42, 0.05, m);
  q.box(0, 0.5, 0, 0.48, 0.08, 0.46, c); q.box(0, high ? 0.98 : 0.8, -0.21, 0.44, high ? 0.9 : 0.5, 0.07, c);
  for (const sx of [-1, 1]) q.box(sx * 0.25, 0.66, 0, 0.04, 0.04, 0.36, m);
  appendY(g, q, rot, x, z);
}
/** Монитор + гар (локал: дэлгэц −Z тал руу харна, ажилтан −Z талд) */
function monitor(q, x, y, z) { const m = rgb(OF.metalD); q.box(x, y + 0.01, z, 0.22, 0.02, 0.16, m); q.box(x, y + 0.12, z, 0.04, 0.2, 0.04, m); q.box(x, y + 0.32, z, 0.52, 0.32, 0.03, m); q.box(x, y + 0.32, z - 0.017, 0.48, 0.28, 0.005, rgb(OF.screen)); q.box(x, y + 0.012, z - 0.25, 0.42, 0.02, 0.14, rgb('#D8D4CA')); }
/** Ширээ (локал: ажилтан −Z талд суугаад +Z руу харна): тавцан, шургуулгатай тавиур, хажуу, урд хаалт */
function officeDesk(g, x, z, rot, K, items = []) {
  const q = new Geo(wuv()), w = rgb(K.color), dk = sc(w, 0.72), W = K.w, D = K.d, H = K.h;
  q.box(0, H - 0.02, 0, W, 0.04, D, w);
  q.box(W / 2 - 0.22, (H - 0.04) / 2, 0, 0.4, H - 0.04, D - 0.04, dk); for (let k = 0; k < 3; k++) q.box(W / 2 - 0.22, 0.12 + k * 0.22, -D / 2 + 0.015, 0.36, 0.18, 0.01, sc(w, 0.9));
  q.box(-W / 2 + 0.03, (H - 0.04) / 2, 0, 0.04, H - 0.04, D - 0.04, dk); q.box(0, 0.45, D / 2 - 0.03, W - 0.06, 0.55, 0.02, dk);
  for (const it of items) it(q, H);
  appendY(g, q, rot, x, z);
}
/** Шүүгээ (нүүр +Z): их бие, шургуулга/хаалганы хавтан, бариул */
function cabinet(g, x, z, rot, K) {
  const q = new Geo(wuv()), c = rgb(K.color), h = rgb(OF.metal);
  q.box(0, K.h / 2, 0, K.w, K.h, K.d, sc(c, 0.85));
  for (let k = 0; k < 4; k++) { const y = 0.1 + k * (K.h - 0.15) / 4, hh = (K.h - 0.15) / 4 - 0.03; q.box(0, y + hh / 2, K.d / 2 + 0.005, K.w - 0.06, hh, 0.012, c); q.box(0, y + hh * 0.7, K.d / 2 + 0.02, 0.16, 0.025, 0.02, h); }
  appendY(g, q, rot, x, z);
}
/** Хүлээлгийн сандлын эгнээ: төмөр хөндлөвч, n суудал (нүүр −Z, тоолуур/лангуу руу) */
function waitRow(g, x, z, n, rot = 0) {
  const q = new Geo(wuv()), m = rgb(OF.metalD), s = rgb(OF.seat), L2 = n * 0.52;
  q.box(0, 0.36, 0, L2, 0.05, 0.06, m);
  for (const e of [-1, 1]) { q.box(e * (L2 / 2 - 0.05), 0.18, 0, 0.05, 0.36, 0.05, m); q.box(e * (L2 / 2 - 0.05), 0.02, 0, 0.06, 0.04, 0.5, m); }
  for (let i = 0; i < n; i++) { const sx = -L2 / 2 + 0.26 + i * 0.52; q.box(sx, 0.43, -0.02, 0.46, 0.06, 0.44, s); q.box(sx, 0.7, 0.2, 0.44, 0.44, 0.05, s); q.box(sx, 0.43, 0.18, 0.04, 0.1, 0.06, m); }
  appendY(g, q, rot, x, z);
}
/** Монгол улсын төрийн далбаа индэр дээр (туг): суурь, шон, жад, гурван зурвас, соёмбо */
function flagMN(g, x, z, rot = 0) {
  const q = new Geo(wuv()), gold = rgb(OF.gold);
  lth(q, { segs: 10, profile: [[0.2, 0], [0.2, 0.05], [0.06, 0.08], [0, 0.08]], color: rgb(OF.metalD) });
  q.box(0, 1.2, 0, 0.035, 2.3, 0.035, rgb('#C9C4B8')); lth(q, { segs: 6, cy: 2.35, profile: [[0.04, 0], [0.025, 0.08], [0, 0.18]], color: gold });
  const fw = 0.3, fy = 1.9, fh = 0.62;
  [[OF.red, 0], [OF.blue, 1], [OF.red, 2]].forEach(([c, k]) => q.box(0.04 + fw / 2 + k * fw, fy, 0, fw, fh, 0.012, rgb(c)));
  for (const [dy, w2, h2] of [[0.2, 0.05, 0.05], [0.12, 0.09, 0.025], [0.03, 0.06, 0.06], [-0.07, 0.09, 0.025], [-0.15, 0.09, 0.025]]) q.box(0.04 + fw / 2, fy + dy, 0.008, w2, h2, 0.006, gold);   // соёмбо (хялбаршуулсан)
  for (const e of [-1, 1]) q.box(0.04 + fw / 2 + e * 0.07, fy + 0.0, 0.008, 0.02, 0.32, 0.006, gold);
  appendY(g, q, rot, x, z);
}
/** Төрийн сүлд (хананд, нүүр +Z): алтан хүрээтэй хөх дугуй, цагаан дотор, алтан соёмбо */
function emblem(g, x, y, z) {
  discZ(g, x, y, z, [[0.36, 0], [0.36, 0.03], [0.3, 0.03], [0.2, 0.03], [0, 0.03]], i => [rgb(OF.gold), rgb(OF.gold), rgb(OF.blue), rgb('#F4F1EA')][i], 20);
  const gold = rgb(OF.gold); for (const [dy, w2, h2] of [[0.1, 0.04, 0.04], [0.04, 0.08, 0.02], [-0.03, 0.05, 0.05], [-0.1, 0.08, 0.02]]) g.box(x, y + dy, z + 0.035, w2, h2, 0.008, gold);
}
/** Атласын хаягийн самбар (buildings: signRect) хананд, нүүр +Z */
function signBoard(g, key, x, y, z, w) { const r = signRect(key), h = w * (r[3] - r[1]) / (r[2] - r[0]); panel(g, [x, y, z], [0, 0, 1], w / 2, h / 2, 0.03, r, rgb('#3A3A3A')); }
/** Савтай мод (булан) */
function plant(g, x, z) { lth(g, { segs: 8, cx: x, cz: z, profile: [[0.16, 0], [0.2, 0.36], [0.17, 0.36], [0, 0.34]], color: rgb('#B5633F') });
  lth(g, { segs: 8, cx: x, cz: z, profile: [[0.02, 0.34], [0.03, 0.6], [0.24, 0.75], [0.3, 1.0], [0.2, 1.25], [0, 1.32]], color: rgb('#4E7A3A') }); }

/* ---------- ЗДТГ ---------- */
function furnishAdmin(g, T, room, B) {
  const hw = room.w / 2, hd = room.d / 2, spot = id => room.spots.find(s => s.id === id), placed = [], C = rgb;
  // засаг даргын ширээ: том бараан ширээ, арьсан өндөр сандал, ширээн дээр монитор, утас, бичиг, жижиг туг; ард нь туг, ханан дээр сүлд
  { const s = spot('desk_w'), K = T.govDesk;
    officeDesk(g, s.x, s.z, 0, K, [(q, H) => monitor(q, -0.35, H, 0.05), (q, H) => { q.box(0.1, H + 0.01, -0.1, 0.42, 0.02, 0.3, C(OF.paper)); q.box(0.45, H + 0.03, 0.05, 0.18, 0.06, 0.2, C('#2A2622')); q.box(0.2, H + 0.05, 0.3, 0.32, 0.1, 0.03, C('#C9A24E')); }]);
    swivel(g, s.x, s.z - 0.62, 0, OF.leather, true);
    flagMN(g, s.x - 1.35, -hd + 0.45, 0); emblem(g, s.x, 2.1, -hd + 0.01);
    placed.push({ ...s, note: 'засаг даргын ширээ' }); }
  // зээлийн лангуу: хөх нүүр, цайвар тавцан, монитор, тамга, бичиг; ард нь шүүгээ; дээр нь хаяг (ЗДТГ)
  { const s = spot('counter'), K = T.counter, x = s.x, z = s.z, fr = C(K.front), tp = C(K.top);
    B(x - K.w / 2, 0, z - K.d / 2, x + K.w / 2, K.h - 0.04, z + K.d / 2, fr); B(x - K.w / 2 - 0.03, K.h - 0.04, z - K.d / 2 - 0.02, x + K.w / 2 + 0.03, K.h, z + K.d / 2 + 0.05, tp);
    B(x - K.w / 2 + 0.1, 0.1, z + K.d / 2, x + K.w / 2 - 0.1, 0.14, z + K.d / 2 + 0.01, C(OF.gold)); B(x - K.w / 2, 0, z + K.d / 2 - 0.01, x + K.w / 2, 0.08, z + K.d / 2 + 0.01, sc(fr, 0.7));
    B(x - K.w / 2, 0.72, z - K.d / 2 - 0.25, x + K.w / 2, 0.75, z - K.d / 2, tp);                                       // ажилтны доод тавцан
    const q = new Geo(wuv()); monitor(q, -0.5, 0.75, 0.0); appendY(g, q, 0, x, z - K.d / 2 - 0.12);
    B(x + 0.4, K.h, z - 0.1, x + 0.8, K.h + 0.01, z + 0.15, C(OF.paper)); g.box(x + 0.95, K.h + 0.05, z, 0.05, 0.1, 0.05, C('#2A2622')); g.box(x + 0.95, K.h + 0.015, z, 0.08, 0.03, 0.08, C(OF.red));   // бичиг, тамга
    swivel(g, x - 0.5, z - 0.62, 0, OF.seat);
    for (const cx of T.cabinets) cabinet(g, x + cx, -hd + T.cabinet.d / 2 + 0.02, 0, T.cabinet);
    signBoard(g, 'zdtg', x, 2.45, -hd + 0.01, 2.8);
    placed.push(s); }
  // цагдаагийн жижиг ширээ: саарал төмөр, урд нь «ЦАГДАА» хаяг, дээр нь малгай, рац
  { const s = spot('desk_e'), K = T.policeDesk;
    officeDesk(g, s.x, s.z, 0, K, [(q, H) => { lth(q, { segs: 10, cx: -0.25, cz: 0.05, cy: H, profile: [[0.14, 0], [0.15, 0.02], [0.11, 0.05], [0.12, 0.11], [0, 0.12]], colorAt: i => (i >= 2 ? rgb('#2A3A5A') : rgb('#1A1A1A')) });
      q.box(0.25, H + 0.06, 0.05, 0.07, 0.12, 0.04, rgb('#2A2622')); q.box(0.05, H + 0.01, -0.1, 0.3, 0.02, 0.22, rgb(OF.paper)); }]);
    signBoard(g, 'police', s.x, 0.5, s.z + K.d / 2 + 0.002, 0.9);
    swivel(g, s.x, s.z - 0.55, 0, '#2A3A5A'); placed.push({ ...s, note: 'цагдаагийн ширээ' }); }
  // хүлээлгийн сандал (4 суудал), булангийн мод, зарын самбар (урд хананд)
  for (const id of ['bench_w', 'bench_e']) { const s = spot(id); waitRow(g, s.x, s.z, 4, 0); placed.push(s); }
  plant(g, -hw + 0.4, hd - 0.4); plant(g, hw - 0.4, hd - 0.4);
  { const x = 3.2, z = hd - 0.02; B(x - 0.7, 1.05, z - 0.03, x + 0.7, 1.95, z, C('#B08A5E')); B(x - 0.64, 1.11, z - 0.035, x + 0.64, 1.89, z - 0.03, C('#C9A27A'));
    [[-0.4, 1.7, '#F4F1EA'], [0.05, 1.65, '#E8D890'], [0.42, 1.72, '#F4F1EA'], [-0.25, 1.3, '#D8E8F0'], [0.3, 1.28, '#F4F1EA']].forEach(([dx, y, c]) => B(x + dx - 0.14, y - 0.17, z - 0.04, x + dx + 0.14, y + 0.17, z - 0.035, C(c)));
    placed.push({ id: 'notice', kind: 'board', x, z, rot: Math.PI, proposed: true }); }
  placed.push({ id: 'flag', kind: 'flag', x: spot('desk_w').x - 1.35, z: -hd + 0.45, rot: 0, proposed: true });
  return placed;
}
/* ---------- Банк ---------- */
function furnishBank(g, T, room, B, glass) {
  const hw = room.w / 2, hd = room.d / 2, spot = id => room.spots.find(s => s.id === id), placed = [], C = rgb;
  // шилэн кассын лангуу: ногоон нүүр, тавцан, хүрээ (шон, дээд хөндлөвч), шил (тунгалаг тусдаа mesh), мөнгө дамжуулах цонх, дугаар
  { const s = spot('counter'), K = T.counter, x = s.x, z = s.z, fr = C(K.front), tp = C(K.top), m = C(OF.metal);
    B(x - K.w / 2, 0, z - K.d / 2, x + K.w / 2, K.h - 0.04, z + K.d / 2, fr); B(x - K.w / 2 - 0.03, K.h - 0.04, z - K.d / 2 - 0.02, x + K.w / 2 + 0.03, K.h, z + K.d / 2 + 0.06, tp);
    B(x - K.w / 2, 0, z + K.d / 2 - 0.01, x + K.w / 2, 0.08, z + K.d / 2 + 0.01, sc(fr, 0.7)); B(x - K.w / 2, 0.72, z - K.d / 2 - 0.25, x + K.w / 2, 0.75, z - K.d / 2, tp);
    const gy0 = K.h + K.slot, gz = z;
    for (const px of [-K.w / 2, ...K.windows.map(w => w - 0.62), ...K.windows.map(w => w + 0.62), K.w / 2]) B(x + px - 0.025, K.h, gz - 0.025, x + px + 0.025, K.glassTop, gz + 0.025, m);
    B(x - K.w / 2, K.glassTop, gz - 0.04, x + K.w / 2, K.glassTop + 0.12, gz + 0.04, m); B(x - K.w / 2, gy0 - 0.03, gz - 0.02, x + K.w / 2, gy0, gz + 0.02, m);
    glass.box(x, (gy0 + K.glassTop) / 2, gz, K.w - 0.02, K.glassTop - gy0, 0.012, C('#CFE6F0'));                   // шил
    for (const [i, wx] of K.windows.entries()) { B(x + wx - 0.18, K.h, gz - 0.12, x + wx + 0.18, K.h + 0.015, gz + 0.12, sc(m, 0.7));   // мөнгөний тавиур
      B(x + wx - 0.11, K.glassTop + 0.02, gz + 0.04, x + wx + 0.11, K.glassTop + 0.1, gz + 0.05, C('#16302A'));                       // дугаарын самбар
      for (let k = 0; k <= i; k++) B(x + wx - 0.015 + (k - i / 2) * 0.04, K.glassTop + 0.035, gz + 0.051, x + wx + 0.015 + (k - i / 2) * 0.04, K.glassTop + 0.085, gz + 0.055, C('#7CF2A0'));   // «1», «2»
      const q = new Geo(wuv()); monitor(q, 0, 0.75, 0); appendY(g, q, 0, x + wx + 0.3, z - K.d / 2 - 0.12);
      swivel(g, x + wx, z - 0.65, 0, OF.seat); }
    signBoard(g, 'bank', x, 2.45, -hd + 0.01, 2.4);
    placed.push(s); }
  // сейф: арын ба зүүн хананд тулсан ган хайрцаг, хаалга, бариул, дугуй цоож, нугас
  { const s = spot('safe'), K = T.safe, x = Math.min(s.x, hw - K.w / 2 - 0.05), z = -hd + K.d / 2 + 0.02, st = C(K.color), dk = sc(st, 0.7);
    B(x - K.w / 2, 0.06, z - K.d / 2, x + K.w / 2, K.h, z + K.d / 2, st); for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B(x + lx * (K.w / 2 - 0.06) - 0.04, 0, z + lz * (K.d / 2 - 0.06) - 0.04, x + lx * (K.w / 2 - 0.06) + 0.04, 0.06, z + lz * (K.d / 2 - 0.06) + 0.04, dk);
    B(x - K.w / 2 + 0.06, 0.14, z + K.d / 2, x + K.w / 2 - 0.06, K.h - 0.08, z + K.d / 2 + 0.03, sc(st, 1.1));
    discZ(g, x, K.h * 0.62, z + K.d / 2 + 0.03, [[0.1, 0], [0.1, 0.03], [0.07, 0.03], [0, 0.04]], i => [C('#C9C4B8'), C('#C9C4B8'), C('#2A2622')][i], 14);
    for (const a of [0, 1.57, 3.14, 4.71]) g.beam([x + 0.2, K.h * 0.45, z + K.d / 2 + 0.04], [x + 0.2 + Math.cos(a) * 0.1, K.h * 0.45 + Math.sin(a) * 0.1, z + K.d / 2 + 0.06], 0.02, 0.02, C('#C9C4B8'));
    for (const y of [0.35, K.h - 0.3]) B(x - K.w / 2 + 0.02, y, z + K.d / 2, x - K.w / 2 + 0.06, y + 0.14, z + K.d / 2 + 0.05, dk);
    placed.push({ ...s, note: `${x.toFixed(2)}, ${z.toFixed(2)} (хананд)` }); }
  // хүлээлгийн сандал (3), дараалал (зогсоолын шон, улаан туузан хашлага), маягт бөглөх ширээ, мод
  for (const id of ['bench_w', 'bench_e']) { const s = spot(id); waitRow(g, s.x, s.z, 3, 0); placed.push(s); }
  { const posts = [[-0.9, -1.0], [-0.9, 0.2], [0.9, 0.2], [0.9, -1.0]].map(([px, pz]) => [px, pz + 0.0]);
    for (const [px, pz] of posts) lth(g, { segs: 8, cx: px, cz: pz, profile: [[0.14, 0], [0.14, 0.03], [0.025, 0.05], [0.025, 0.95], [0.04, 0.98], [0, 1.0]], color: C('#B9BBB7') });
    for (let i = 0; i < posts.length - 1; i++) { const a = posts[i], b = posts[i + 1]; g.beam([a[0], 0.9, a[1]], [b[0], 0.86, b[1]], 0.03, 0.03, C('#B5402A')); }
    placed.push({ id: 'queue', kind: 'queue', x: 0, z: -0.4, rot: 0, proposed: true }); }
  { const x = -hw + 0.35, z = -1.6; B(x - 0.3, 1.02, z - 0.6, x + 0.3, 1.06, z + 0.6, C('#C9A27A')); B(x - 0.04, 0, z - 0.04, x + 0.04, 1.02, z + 0.04, C(OF.metalD)); B(x - 0.25, 0, z - 0.25, x + 0.25, 0.03, z + 0.25, C(OF.metalD));
    for (const dz of [-0.3, 0.05, 0.35]) B(x - 0.12, 1.06, z + dz - 0.1, x + 0.12, 1.065, z + dz + 0.1, C(OF.paper));
    placed.push({ id: 'form_desk', kind: 'desk', x, z, rot: Math.PI / 2, proposed: true }); }
  plant(g, hw - 0.4, hd - 0.4); plant(g, -hw + 0.4, hd - 0.4);
  return placed;
}
/* Сүү, ноос хүлээн авах цэг: хүлээн авагчийн лангуу (циферблаттай жин, хэмжүүр, дэвтэр, сампин), ард нь сүүний сав, үнийн самбар;
 * баруун талд ноосны шалны жин, шуудайн овоо; зүүн хананд сүүтэй бидон, шүүх ширээ */
/** Хөнгөн цагаан бидон (сүүний сав): бие, хүзүү, таг, хоёр бариул */
function milkCan(g, x, z, lid = true) {
  const alu = rgb('#B9BBB7'), dk = rgb('#4E4F4C');
  lth(g, { segs: 10, cx: x, cz: z, profile: lid ? [[0.15, 0.01], [0.16, 0.04], [0.16, 0.36], [0.115, 0.45], [0.115, 0.52], [0.13, 0.53], [0.13, 0.555], [0, 0.565]] : [[0.15, 0.01], [0.16, 0.04], [0.16, 0.36], [0.115, 0.45], [0.115, 0.52], [0.1, 0.52], [0.1, 0.46], [0, 0.46]],
    colorAt: i => (i === 0 || i === 3 ? dk : (!lid && i >= 5) ? rgb('#F6F2E6') : alu) });
  for (const sx of [1, -1]) g.box(x + sx * 0.14, 0.47, z, 0.05, 0.035, 0.07, dk);
}
/** Ноосны шуудай (боосон оройтой, дөрвөлжиндүү), lie — хэвтүүлсэн */
function woolSack(g, x, z, K, lie = false) {
  const q = new Geo(wuv()), c = rgb(K.color);   // buildings Geo-д loft байхгүй: 8 талт lathe-ийг гүнээр шахна (дөрвөлжиндүү шуудай)
  q.lathe({ segs: 8, a0: Math.PI / 8, a1: Math.PI * 2 + Math.PI / 8, color: c, profile: [[0, 0], [K.w * 0.9, 0], [K.w, 0.08], [K.w * 0.97, K.h * 0.8], [K.w * 0.55, K.h * 0.93], [0.05, K.h], [0, K.h]] });
  for (let i = 0; i < q.p.length; i += 3) q.p[i + 2] *= K.d / K.w;
  q.lathe({ segs: 8, smooth: false, color: rgb('#8A6A3A'), profile: [[K.w * 0.5, K.h * 0.9], [K.w * 0.5, K.h * 0.93], [0, K.h * 0.93]] });   // уясан олс
  q.box(0, K.h * 0.5, K.d * 0.93, 0.2, 0.12, 0.012, rgb('#2E5E9E'));   // хэвлэсэн тэмдэг
  if (lie) for (let i = 0; i < q.p.length; i += 3) { const y = q.p[i + 1], z2 = q.p[i + 2], ny = q.n[i + 1], nz = q.n[i + 2]; q.p[i + 1] = z2 + K.d; q.p[i + 2] = -y + K.h / 2; q.n[i + 1] = nz; q.n[i + 2] = -ny; }
  appendY(g, q, lie ? Math.PI / 2 : 0, x, z);
}
/* ---------- Сүү, ноос хүлээн авах ---------- */
function furnishMilk(g, T, room, B) {
  const hw = room.w / 2, hd = room.d / 2, placed = [], C = rgb;
  // лангуу: хөх нүүр, цайвар тавцан, ажилтны тавцан; дээр нь циферблаттай жин, хэмжүүр, дэвтэр, сампин, мөнгөний хайрцаг
  { const K = T.counter, x = K.x, z = K.z, fr = C(K.front), tp = C(K.top);
    B(x - K.w / 2, 0, z - K.d / 2, x + K.w / 2, K.h - 0.04, z + K.d / 2, fr); B(x - K.w / 2 - 0.03, K.h - 0.04, z - K.d / 2 - 0.02, x + K.w / 2 + 0.03, K.h, z + K.d / 2 + 0.05, tp);
    B(x - K.w / 2, 0, z + K.d / 2 - 0.01, x + K.w / 2, 0.08, z + K.d / 2 + 0.01, sc(fr, 0.7)); B(x - K.w / 2, 0.72, z - K.d / 2 - 0.22, x + K.w / 2, 0.75, z - K.d / 2, tp);
    const sx = x + 0.75, H = K.h;   // жин: суурь, тавгийн шон, тавиур, циферблат (худалдагч руу)
    B(sx - 0.17, H, z - 0.12, sx + 0.17, H + 0.06, z + 0.12, C('#E8E2D4')); B(sx - 0.03, H + 0.06, z - 0.03, sx + 0.03, H + 0.14, z + 0.03, C('#9AA3A8'));
    lth(g, { segs: 12, cx: sx, cz: z, cy: H + 0.14, smooth: false, profile: [[0.16, 0], [0.17, 0.02], [0.16, 0.035], [0, 0.03]], color: C('#B9BBB7') });
    B(sx - 0.13, H + 0.06, z + 0.1, sx + 0.13, H + 0.3, z + 0.14, C('#E8E2D4'));
    discZ(g, sx, H + 0.21, z + 0.14, [[0.09, 0], [0.09, 0.012], [0.075, 0.012], [0, 0.012]], i => [C('#2A2622'), C('#2A2622'), C('#F4F1EA')][i], 14);
    g.beam([sx, H + 0.21, z + 0.157], [sx + 0.05, H + 0.27, z + 0.158], 0.006, 0.004, C('#B5402A'));
    lth(g, { segs: 10, cx: x + 0.28, cz: z - 0.05, cy: H, profile: [[0.07, 0], [0.08, 0.2], [0.09, 0.22], [0.075, 0.22], [0, 0.21]], colorAt: i => (i >= 3 ? C('#F6F2E6') : C('#B9BBB7')) });   // литрийн хэмжүүр (сүүтэй)
    g.beam([x + 0.36, H + 0.17, z - 0.05], [x + 0.42, H + 0.07, z - 0.05], 0.02, 0.02, C('#B9BBB7'));
    B(x - 0.55, H, z - 0.18, x - 0.15, H + 0.03, z + 0.1, C('#2E4A6A')); B(x - 0.53, H + 0.03, z - 0.16, x - 0.17, H + 0.032, z + 0.08, C('#F4F1EA'));   // дэвтэр
    { const ax = x - 0.95, az = z, w2 = 0.34, d2 = 0.2, fr2 = C('#6E4A2E');   // сампин (хэвтээ): хүрээ, саваа, бөмбөлөг
      for (const e of [-1, 1]) { B(ax - w2 / 2, H, az + e * d2 / 2 - 0.012, ax + w2 / 2, H + 0.03, az + e * d2 / 2 + 0.012, fr2); B(ax + e * w2 / 2 - 0.012, H, az - d2 / 2, ax + e * w2 / 2 + 0.012, H + 0.03, az + d2 / 2, fr2); }
      for (let r = 0; r < 7; r++) { const rx = ax - w2 / 2 + 0.03 + r * (w2 - 0.06) / 6; g.beam([rx, H + 0.02, az - d2 / 2], [rx, H + 0.02, az + d2 / 2], 0.006, 0.006, fr2);
        for (let b = 0; b < 3; b++) g.box(rx, H + 0.02, az - 0.06 + b * 0.035 + (r % 2) * 0.02, 0.03, 0.025, 0.028, C(b === 0 ? '#B5402A' : '#2A2622')); } }
    B(x - 1.2, H, z - 0.22, x - 1.0, H + 0.08, z - 0.06, C('#7A5A3A'));   // мөнгөний хайрцаг
    swivel(g, x, z - 0.62, 0, OF.seat);
    placed.push({ id: 'counter', kind: 'counter', x, z, rot: 0, proposed: true }); }
  // үнийн самбар (арын хананд): цагаан хавтан, гарчиг, мөр; дээр нь атласын хаяг
  { const x = -0.6, y = 1.75, z = -hd + 0.01; B(x - 0.75, y - 0.45, z, x + 0.75, y + 0.45, z + 0.03, C('#6E4A2E')); B(x - 0.7, y - 0.4, z + 0.03, x + 0.7, y + 0.4, z + 0.035, C('#F4F1EA'));
    for (const [dy, w2, c] of [[0.28, 0.5, '#2E5E9E'], [0.14, 1.0, '#3A3A3A'], [0.03, 0.85, '#3A3A3A'], [-0.08, 0.5, '#B5402A'], [-0.2, 0.95, '#3A3A3A'], [-0.3, 0.7, '#3A3A3A']]) B(x - 0.62, y + dy - 0.02, z + 0.035, x - 0.62 + w2, y + dy + 0.02, z + 0.04, C(c));
    signBoard(g, 'milkOffice', 0, 2.65, -hd + 0.01, 2.6);
    placed.push({ id: 'price_board', kind: 'board', x, z: -hd, rot: 0, proposed: true }); }
  // сүүний сав (ган, хөлтэй, таг, цорго) — арын баруун буланд
  { const V = T.vat, st = C(V.color), dk = sc(st, 0.6);
    for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.5; g.beam([V.x + Math.sin(a) * V.r * 0.8, 0, V.z + Math.cos(a) * V.r * 0.8], [V.x + Math.sin(a) * V.r * 0.7, V.legH + 0.05, V.z + Math.cos(a) * V.r * 0.7], 0.04, 0.04, dk); }
    lth(g, { segs: 14, cx: V.x, cz: V.z, cy: V.legH, profile: [[0, 0], [V.r * 0.9, 0.02], [V.r, 0.08], [V.r, V.h], [V.r * 0.92, V.h + 0.06], [0, V.h + 0.08]], color: st });
    lth(g, { segs: 10, cx: V.x, cz: V.z, cy: V.legH + V.h + 0.06, smooth: false, profile: [[0.15, 0], [0.15, 0.05], [0, 0.05]], color: dk });
    B(V.x - 0.04, V.legH + 0.12, V.z + V.r - 0.02, V.x + 0.04, V.legH + 0.2, V.z + V.r + 0.12, dk); B(V.x - 0.06, V.legH + 0.2, V.z + V.r + 0.06, V.x + 0.06, V.legH + 0.24, V.z + V.r + 0.1, C(OF.red));   // цорго
    lth(g, { segs: 10, cx: V.x, cz: V.z + V.r + 0.12, profile: [[0.1, 0], [0.12, 0.22], [0, 0.22]], color: C('#B9BBB7') });   // доор нь хувин
    placed.push({ id: 'milk_vat', kind: 'vat', x: V.x, z: V.z, rot: 0, proposed: true }); }
  // ноосны шалны жин: тавцан, шон, циферблат; дээр нь шуудай
  { const F = T.floorScale, x = F.x, z = F.z, m = C('#4E5257');
    B(x - F.w / 2, 0, z - F.d / 2, x + F.w / 2, 0.08, z + F.d / 2, m); B(x - F.w / 2 + 0.04, 0.08, z - F.d / 2 + 0.04, x + F.w / 2 - 0.04, 0.09, z + F.d / 2 - 0.04, C('#8A9096'));
    B(x - 0.04, 0.08, z - F.d / 2 - 0.08, x + 0.04, F.post, z - F.d / 2, m);
    B(x - 0.2, F.post, z - F.d / 2 - 0.1, x + 0.2, F.post + 0.34, z - F.d / 2 + 0.02, C('#E8E2D4'));
    discZ(g, x, F.post + 0.17, z - F.d / 2 + 0.02, [[0.14, 0], [0.14, 0.012], [0.12, 0.012], [0, 0.012]], i => [C('#2A2622'), C('#2A2622'), C('#F4F1EA')][i], 16);
    g.beam([x, F.post + 0.17, z - F.d / 2 + 0.035], [x + 0.07, F.post + 0.26, z - F.d / 2 + 0.036], 0.008, 0.004, C('#B5402A'));
    const q = new Geo(wuv()); woolSack(q, 0, 0, T.sack); appendY(g, q, 0.3, x, z, 0.09);
    placed.push({ id: 'wool_scale', kind: 'scale', x, z, rot: 0, proposed: true }); }
  // ноосны шуудайн овоо (баруун хананд), хаалганы дэргэд задгай ноос
  for (const [x, z, lie] of T.sacks) woolSack(g, x, z, T.sack, !!lie);
  for (const [x, z, r] of [[1.35, 2.1, 0.22], [1.55, 2.3, 0.18], [1.2, 2.35, 0.16]]) lth(g, { segs: 9, cx: x, cz: z, profile: [[0, 0], [r, 0.02], [r * 1.05, r * 0.45], [r * 0.6, r * 0.8], [0, r * 0.85]], color: C('#EEE6D2') });
  placed.push({ id: 'wool_pile', kind: 'pile', x: 2.6, z: 1.9, rot: 0, proposed: true });
  // бидон (зүүн хананд эгнээ, нэг нь тагаа авсан), сүү шүүх ширээ (хувин, шүүлтүүр, юүлүүр)
  T.cans.z.forEach((z, i) => milkCan(g, T.cans.x, z, i !== 2));
  { const S = T.strainer, x = S.x, z = S.z, w = C('#9A6A42');
    B(x - 0.35, 0.72, z - 0.3, x + 0.35, 0.76, z + 0.3, w); for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B(x + lx * 0.3 - 0.02, 0, z + lz * 0.25 - 0.02, x + lx * 0.3 + 0.02, 0.72, z + lz * 0.25 + 0.02, sc(w, 0.7));
    lth(g, { segs: 10, cx: x - 0.1, cz: z, cy: 0.76, profile: [[0.1, 0], [0.13, 0.24], [0.12, 0.24], [0, 0.22]], colorAt: i => (i >= 2 ? C('#F6F2E6') : C('#B9BBB7')) });
    lth(g, { segs: 10, cx: x + 0.18, cz: z, cy: 0.76, smooth: false, profile: [[0.02, 0], [0.02, 0.06], [0.1, 0.16], [0.09, 0.16], [0.015, 0.07]], color: C('#B9BBB7') });   // юүлүүр
    placed.push({ id: 'strainer', kind: 'table', x, z, rot: 0, proposed: true }); }
  waitRow(g, -1.85, hd - 0.35, 2, 0);
  placed.push({ id: 'bench', kind: 'bench', x: -1.85, z: hd - 0.35, rot: 0, proposed: true });
  return placed;
}
