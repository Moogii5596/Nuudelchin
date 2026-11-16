// @ts-nocheck — лабораторийн (tools/character-lab/furniture.html, S2, батлагдсан сургуулийн анги ба дуган) нийтийн барилгын дотор талын кодыг өөрчлөлтгүй хуулсан. Тоо зөвхөн data/buildings.json interior.public, spot data/interiors.json-оос.
import * as THREE from 'three';
import { Geo, rgb, mix } from '../ger/geo';
import { BUILDING_CONFIG as BC } from './config';
import { px2uv, sc, panel } from './core';

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
  const placed = { school: furnishSchool, temple: furnishTemple }[kind](g, T, room, B, glass);
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
