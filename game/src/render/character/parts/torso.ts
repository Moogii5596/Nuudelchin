/**
 * Бие: улирлын 3 хувилбар (`body:terleg|deel|winter`) — цээж (торгон хээтэй), энгэр, товч, босоо зах, бүс,
 * нугалаатай хормой; өвөл хантааз, үслэг зах, хормойн үс (C-8). Бүлэг бүр нэрээрээ улирлаар харагдана.
 */
import * as THREE from 'three';
import type { OutfitBody } from '../../style';
import { foldK, noOut, ring, type Kit, type Pt } from '../geom';
import { darken, doubleSided, fabric, felt, fur, lighten, smooth } from '../materials';
import type { CharacterSpec } from '../spec';

/** Цээжний профайл (бэлхүүсийн 1.42-оос): доод хэсэг нь бүсний дотуур шургасан, бүсний дээр сул товойж, мөр налуу */
const CHEST: readonly Pt[] = [[0.225, -0.45], [0.24, -0.36], [0.25, -0.3], [0.293, -0.245], [0.3, -0.1],
  [0.318, 0.08], [0.335, 0.18], [0.315, 0.255], [0.2, 0.3], [0.135, 0.315]];
/** Хантааз (+ жийргэвч PAD) */
const VEST: readonly Pt[] = [[0.338, -0.52], [0.322, -0.4], [0.308, -0.27], [0.322, -0.2], [0.326, -0.08], [0.343, 0.08], [0.358, 0.18], [0.335, 0.255], [0.235, 0.3]];
const CHEST_Y = 1.42, TOP = 1.0;

const chestR = (yRel: number): number => {   // цээжний радиус тухайн өндөрт (шугаман интерполяц)
  for (let n = 1; n < CHEST.length; n++) {
    const [r0, y0] = CHEST[n - 1]!, [r1, y1] = CHEST[n]!;
    if (yRel <= y1) return r0 + ((r1 - r0) * Math.max(0, yRel - y0)) / (y1 - y0);
  }
  return CHEST[CHEST.length - 1]![0];
};

interface Variant { c: number; hc: number; trim: number; k: number; skirtH: number; winter: boolean }

/** Нэг хувилбар: b — бэлхүүсээс доош (бүс, хормой), u — дээш (бэлхүүсээр эргэнэ). Хоёуланг g-д нэмж u-г буцаана */
function buildBody(spec: CharacterSpec, kit: Kit, g: THREE.Group, name: OutfitBody, v: Variant): THREE.Group {
  const { c, hc, trim, k, skirtH } = v;
  const sash = smooth(spec.sash.color);
  const b = new THREE.Group();
  b.name = 'body:' + name;
  const u = new THREE.Group();
  u.name = 'body:' + name;
  kit.lathe(CHEST.map(([r, y]): Pt => [r * k, y]), 0.62, fabric(c), 0, CHEST_Y, 0, u, { grad: [1, 0.84], rows: 16 });
  const onChest = (px: number, py: number, lift: number): THREE.Vector3 => {
    const r = chestR(py - CHEST_Y) * k;
    return new THREE.Vector3(px, py, Math.sqrt(Math.max(0.0004, r * r - px * px)) * 0.62 + lift);
  };
  // Энгэр: захнаас хэвтээ чигтээ мөр рүү гарч, булан эргээд суга, хажуугаар бүс хүртэл бууна
  const LAPEL: readonly Pt[] = [[0, 1.692], [-0.05, 1.672], [-0.12, 1.662], [-0.19 * k, 1.656], [-0.222 * k, 1.635], [-0.232 * k, 1.58], [-0.24 * k, 1.5], [-0.262 * k, 1.42], [-0.27 * k, 1.3]];
  const button = smooth(spec.deel.button);
  const edgeM = smooth(darken(c, 0.4));                                // эмжээр: дээлийн өнгөний бараан тон
  kit.tube(LAPEL.map(([px, py]) => onChest(px, py, 0.001)), 0.016, edgeM, u, 0.12);
  kit.tube(LAPEL.map(([px, py]) => onChest(px + 0.021, py - 0.02, 0.005)), 0.0045, sash, u, 0.12);   // дотор талын нарийн алтлаг хөвөө
  // Товч: энгэрийн хэвтээ шугам дээр 3 товч; шилбэ нь хөвөөг хөндлөн дайрч босоо доош унжина
  for (const bx of [-0.105, -0.145, -0.185]) {
    const q = onChest(bx * k, 1.662, 0.014), q2 = onChest(bx * k, 1.627, 0.009);
    noOut(kit.sball(0.013, button, q.x, q.y, q.z, u));
    noOut(kit.cyl(0.0045, 0.0045, 0.062, edgeM, q2.x, q2.y, q2.z, u)).rotation.x = -0.12;
  }
  {   // Босоо зах: бараг эгц, урд талдаа нарийн завсартай; дээд ирмэгээрээ алтлаг + бараан хөвөө; товчлоогүй
    const CY = 1.74, colR = (dy: number): number => 0.136 - dy * 0.12;
    const GAP = 0.2;                                                 // урд талын завсрын хагас өнцөг (рад)
    const open = { phiStart: GAP, phiLength: Math.PI * 2 - GAP * 2 };
    kit.lathe([[colR(-0.055), -0.055], [colR(0), 0], [colR(0.06), 0.06]], 0.9, doubleSided(c), 0, CY, 0, u, open);                    // захны бие
    noOut(kit.lathe([[colR(-0.05) - 0.006, -0.05], [colR(0.055) - 0.006, 0.055]], 0.9, doubleSided(darken(c, 0.6)), 0, CY, 0, u, open));   // доторлогоо
    noOut(kit.lathe([[colR(0.03) + 0.004, 0.03], [colR(0.06) + 0.005, 0.062], [colR(0.068) - 0.003, 0.068]], 0.9, doubleSided(darken(c, 0.4)), 0, CY, 0, u, open));   // дээд ирмэгийн бараан эмжээр
    noOut(kit.lathe([[colR(0.018) + 0.004, 0.018], [colR(0.026) + 0.004, 0.026]], 0.9, sash, 0, CY, 0, u, open));        // нарийн алтлаг хөвөө
    noOut(kit.lathe([[colR(-0.055) + 0.004, -0.058], [colR(-0.045) + 0.004, -0.045]], 0.9, edgeM, 0, CY, 0, u, open));   // захны суурийн шугам
    const onCollar = (px: number, dy: number, lift: number): THREE.Vector3 => new THREE.Vector3(px, CY + dy, Math.sqrt(Math.max(0.0004, colR(dy) ** 2 - px * px)) * 0.9 + lift);
    for (const sxc of [-1, 1]) {
      const ex = (dy: number): number => Math.sin(GAP) * colR(dy);        // урд ирмэг: дээд булан нь бөөрөнхий, эгц доош
      const edge = ([[0.03, 0.066], [0.008, 0.06], [0, 0.04], [0, 0], [0, -0.055]] as const).map(([off, dy]) => onCollar(sxc * (ex(dy) + off), dy, 0.003));
      kit.tube(edge, 0.008, edgeM, u, 0.2);
      // нэг үзүүрт бөмбөлөг товч, нөгөөд нь хоосон шилбэ (гогцоо) — хоорондоо холбогдоогүй
      const q2 = onCollar(sxc * 0.068, -0.036, 0.006);
      noOut(kit.cyl(0.004, 0.004, 0.04, edgeM, q2.x, q2.y, q2.z, u)).rotation.z = Math.PI / 2;      // захад хадсан оосор
      const q = onCollar(sxc * 0.043, -0.036, 0.011);
      if (sxc < 0) noOut(kit.sball(0.012, button, q.x, q.y, q.z, u));
      else {
        const loop = noOut(new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0035, kit.q(6, 3), kit.q(16, 6)), edgeM)); // сул унжсан гогцоо
        loop.position.set(q.x - 0.004, q.y - 0.006, q.z + 0.002);
        loop.rotation.set(0.25, 0.3, 0);
        u.add(loop);
      }
    }
  }
  // Бүс: нарийн (13 см) хавтгай ороолт, нугалааны зураастай; зангилаа хажуудаа, богино үзүүртэй
  kit.lathe([[0.262 * k, -0.065], [0.273 * k, -0.035], [0.273 * k, 0.035], [0.262 * k, 0.065]], 0.72, sash, 0, 1.08, 0, b);
  for (const dy of [-0.022, 0.022]) noOut(kit.lathe([[0.2745 * k, dy - 0.003], [0.2745 * k, dy + 0.003]], 0.72, smooth(spec.sash.fold), 0, 1.08, 0, b));
  kit.sball(0.045, sash, 0.262 * k, 1.08, -0.04, b).scale.set(0.55, 1.0, 1);
  kit.cyl(0.02, 0.027, 0.15, sash, 0.275 * k, 0.985, -0.05, b).rotation.z = -0.06;
  // Хормой: шилбэний дунд хүртэл, доошоо нугалаатай дэлгэрнэ; захаараа эмжээр, хөвөө; урд талын давхцлын зах
  kit.lathe([[0.4 * k, -skirtH], [0.355 * k, -skirtH * 0.6], [0.295 * k, -0.15], [0.262 * k, 0]], 0.7, fabric(c), 0, TOP, 0, b,
    { grad: [1, 0.7], capBottom: true, folds: skirtH, phiStart: Math.PI, rows: 14 });
  const band = v.winter ? 0.075 : 0.028;
  kit.lathe([[0.408 * k, -skirtH - 0.004], [0.404 * k, -skirtH + band]], 0.7, smooth(trim), 0, TOP, 0, b, { folds: skirtH, phiStart: Math.PI });
  noOut(kit.lathe([[0.405 * k, -skirtH + band + 0.002], [0.404 * k, -skirtH + band + 0.012]], 0.7, sash, 0, TOP, 0, b, { folds: skirtH, phiStart: Math.PI }));
  const skirtR = (t: number): number => (0.262 + (0.4 - 0.262) * Math.pow(t, 0.85)) * k + 0.006;   // хормойн радиус (t: 0 бүс … 1 зах)
  const slitLine = (phi: number, rad: number, material: THREE.Material): void => {
    const pts: THREE.Vector3[] = [];
    for (let n = 0; n <= 10; n++) {
      const t = n / 10, r = skirtR(t) * foldK(phi, t);
      pts.push(new THREE.Vector3(r * Math.sin(phi), TOP - skirtH * t, r * Math.cos(phi) * 0.7));
    }
    kit.tube(pts, rad, material, b);
  };
  slitLine(-0.8, 0.009, smooth(hc));       // давхцлын зах: өмсөгчийн баруун урд
  slitLine(-0.74, 0.005, sash);
  if (v.winter && spec.vest.worn) buildVest(spec, kit, u, b, k, skirtH);
  else if (v.winter) winterHem(spec, kit, b, k, skirtH);   // хантаазгүй: зөвхөн хормойн үс
  g.add(b, u);
  return u;
}

/**
 * Өвлийн хантааз: гадна ноосон даавуу, дотроо хонины арьсан доторлогоо; энгэр, хормой, хүзүүгээр сэвсгэр цагаан үс.
 * Мөрнөөс ташаа хүртэл нэг цул, цээжтэйгээ хамт хөдөлнө. Дээлийн хормойн зах — цайвар үс.
 */
function buildVest(spec: CharacterSpec, kit: Kit, u: THREE.Group, b: THREE.Group, k: number, skirtH: number): void {
  const VK = 0.7, G = 0.12, PAD = 0.03;                           // зузааны харьцаа, урд завсрын хагас өнцөг, жийргэвчийн зузаан
  const sash = smooth(spec.sash.color), whiteFur = fur(spec.vest.fur);
  const open = { phiStart: G, phiLength: Math.PI * 2 - G * 2, rows: 20 };
  const V = VEST.map(([r, y]): Pt => [r + PAD, y]);
  kit.lathe(V.map(([r, y]): Pt => [r * k, y]), VK, felt(spec.vest.color, true), 0, CHEST_Y, 0, u, open);
  noOut(kit.lathe(V.map(([r, y]): Pt => [(r - PAD + 0.004) * k, y]), VK, fur(spec.vest.lining, 0xffffff, true), 0, CHEST_Y, 0, u, open));   // доторлогоо
  const vestR = (y: number): number => {
    for (let n = 1; n < V.length; n++) if (y - CHEST_Y <= V[n]![1]) {
      const [r0, y0] = V[n - 1]!, [r1, y1] = V[n]!;
      return (r0 + ((r1 - r0) * Math.max(0, y - CHEST_Y - y0)) / (y1 - y0)) * k;
    }
    return V[V.length - 1]![0] * k;
  };
  const line = (phi: number, y0: number, y1: number, lift: number, n = 12): THREE.Vector3[] => Array.from({ length: n + 1 }, (_, q) => {
    const y = y0 + ((y1 - y0) * q) / n, r = vestR(y) + lift;
    return new THREE.Vector3(r * Math.sin(phi), y, r * Math.cos(phi) * VK);
  });
  for (const sxv of [-1, 1]) {
    kit.fluff(line(sxv * (G + 0.045), 1.72, 0.9, -0.005), 0.046, whiteFur, u, 5 + sxv);   // энгэрийн цагаан сэвсгэр үс
    kit.tube(line(sxv * (G + 0.27), 1.64, 0.97, 0.004), 0.006, sash, u);                 // дотуур нь алтлаг хөвөө
  }
  const hemR = vestR(0.9), neckR = 0.265 * k;
  kit.fluff(ring(0, 0.9, 0, 1, 'y', 60, G, Math.PI * 2 - G).map((p) => new THREE.Vector3(p.x * hemR, p.y, p.z * hemR * VK)), 0.046, whiteFur, u, 13);   // хормойн хүрээ
  // Үслэг зах: хоолойг битүү хааж эрүү хүртэл босно
  kit.fluff(ring(0, 1.725, 0, 1, 'y', 40).map((p) => new THREE.Vector3(p.x * neckR * 0.86, p.y, p.z * neckR * 0.86 * VK)), 0.05, whiteFur, u, 17);
  kit.fluff(ring(0, 1.775, 0.004, 0.158, 'y', 30), 0.055, whiteFur, u, 19);
  noOut(kit.lathe([[(0.338 + PAD) * k + 0.004, 0.06], [(0.336 + PAD) * k + 0.004, 0.072]], VK, sash, 0, 0.9, 0, u, open));   // хормойн алтлаг хөвөө
  winterHem(spec, kit, b, k, skirtH);
}

/** Өвлийн дээлийн хормойн зах — цайвар сэвсгэр үс */
function winterHem(spec: CharacterSpec, kit: Kit, b: THREE.Group, k: number, skirtH: number): void {
  const hr = (phi: number): number => 0.405 * k * foldK(phi, 1);
  kit.fluff(Array.from({ length: 73 }, (_, q) => {
    const phi = (q / 72) * Math.PI * 2;
    return new THREE.Vector3(hr(phi) * Math.sin(phi), TOP - skirtH + 0.02, hr(phi) * Math.cos(phi) * 0.7);
  }), 0.045, fur(spec.deel.furTrim), b, 21);
}

/** Гурван улирлын биеийг g-д нэмнэ; дээд хэсгүүдийг (амьсгалаар томорно) буцаана */
export function buildBodies(spec: CharacterSpec, kit: Kit, g: THREE.Group): THREE.Group[] {
  const d = spec.deel, F = spec.bodies;
  const tl = (c: number): number => lighten(c, d.terlegLighten);
  return [
    buildBody(spec, kit, g, 'terleg', { c: tl(d.color), hc: tl(d.hem), trim: tl(d.hem), k: F.terleg.thickness, skirtH: F.terleg.skirt, winter: false }),
    buildBody(spec, kit, g, 'deel', { c: d.color, hc: d.hem, trim: d.hem, k: F.deel.thickness, skirtH: F.deel.skirt, winter: false }),
    buildBody(spec, kit, g, 'winter', { c: d.color, hc: d.hem, trim: d.winterTrim, k: F.winter.thickness, skirtH: F.winter.skirt, winter: true }),
  ];
}
