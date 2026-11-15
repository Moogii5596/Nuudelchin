/**
 * Хөл: гөлгөр гуя, шилбэ (өвдгөөр нугарна); монгол гутал — өргөн түрий (оюу өлзий хээтэй), шаргал зулаг,
 * ээтэн хоншоор, оюу хөвөө, цагаан ул (C-8).
 */
import * as THREE from 'three';
import { noOut, type Kit, type Section } from '../geom';
import { bootShaft, doubleSided, outline, smooth } from '../materials';
import type { CharacterSpec } from '../spec';

/** Зулгийн ёроол (доор нь хөвөө + 1.6 см ул) */
const FB = -0.5175;
/** Зулаг: [z, ёроолын өндөр, хагас өргөн, хагас өндөр] → [z, төвийн өндөр, rx, ry] */
const FOOT: readonly Section[] = ([
  [-0.147, FB, 0.02, 0.058], [-0.141, FB, 0.04, 0.06], [-0.126, FB, 0.068, 0.061], [-0.1, FB, 0.094, 0.062], [-0.06, FB, 0.117, 0.062],   // өсгий: түрийтэй ижил дугуйралттай эгц хана
  [0, FB, 0.127, 0.062], [0.08, FB, 0.127, 0.06], [0.13, FB, 0.122, 0.054],
  [0.185, FB, 0.108, 0.048], [0.24, FB + 0.004, 0.086, 0.042], [0.283, FB + 0.02, 0.06, 0.035],                                               // урд хэсэг: ул тэгш хэвээр
  [0.31, FB + 0.056, 0.036, 0.026], [0.317, FB + 0.098, 0.02, 0.017], [0.309, FB + 0.126, 0.009, 0.009],                                      // хоншоор: огцом дээш, хойшоо ээтийнэ
] as Section[]).map(([z, bot, rx, ry]): Section => [z, bot + ry, rx, ry]);

/** Нэг хөл (ташаанаас) — x: хажуугийн байрлал. Буцаана: { hip, knee } */
export function buildLeg(spec: CharacterSpec, kit: Kit, x: number): { hip: THREE.Group; knee: THREE.Group } {
  const B = spec.boots, legM = smooth(spec.legs), INK = outline();
  const hip = new THREE.Group();
  hip.position.set(x, 0.85, 0);
  kit.cyl(0.13, 0.12, 0.33, legM, 0, -0.165, 0, hip);                        // гуя
  const knee = new THREE.Group();                                          // өвдөг
  knee.position.y = -0.31;
  hip.add(knee);
  kit.sball(0.122, legM, 0, 0, 0, knee);
  kit.cyl(0.12, 0.11, 0.31, legM, 0, -0.155, 0, knee);                     // шилбэ
  kit.lathe([[0.124, -0.185], [0.132, 0.0], [0.15, 0.175]], 1.16, bootShaft(B), 0, -0.245, 0, knee);       // түрий (-0.43 … -0.07)
  kit.lathe([[0.15, -0.03], [0.154, 0.03]], 1.16, smooth(B.tan), 0, -0.1, 0, knee);                         // амсрын шаргал эмжээр
  noOut(kit.lathe([[0.1, -0.006], [0.152, 0.0]], 1.16, doubleSided(B.shaft), 0, -0.073, 0, knee));          // амсрын таг: дээрээс хөндий харагдахгүй
  noOut(kit.lathe([[0.155, -0.012], [0.156, 0.012]], 1.16, smooth(B.shaft), 0, -0.1, 0, knee));             // эмжээрийн дундах хар зурвас
  noOut(kit.lathe([[0.152, -0.005], [0.153, 0.005]], 1.16, smooth(B.gold), 0, -0.137, 0, knee));            // алтлаг хөвөө
  // Өсгий: зулгийг ар тал руу нь нарийсгахгүй — түрийтэй ижил дугуй огтлолтой шаргал савхин аяга, зулаг түүнээс урагш гарна
  noOut(kit.lathe([[0.1275, -0.062], [0.1295, -0.01], [0.1285, 0.04], [0.121, 0.062]], 1.16, smooth(B.tan), 0, FB + 0.062, 0, knee, { rows: 8 }));
  noOut(kit.lathe([[0.14, -0.07], [0.142, -0.01], [0.141, 0.045], [0.128, 0.074]], 1.16, INK, 0, FB + 0.062, 0, knee, { rows: 8 }));   // өсгийн хар хүрээ
  noOut(kit.loft(FOOT.slice(5), smooth(B.tan), knee, [2, 5]));   // өсгийн аяган дотроос эхэлнэ — заадал харагдахгүй
  noOut(kit.lathe([[0.128, -0.005], [0.128, 0.005]], 1.16, smooth(B.teal), 0, FB + 0.119, 0, knee));        // түрий-зулгийн заадлын оюу хөвөө
  // Зулгийн хажуугийн хар хээтэй дэвсгэр: доод хагасыг тойрсон хар зурвас, дээд ирмэгээрээ алтлаг хөвөөтэй
  const panel = (grow: number, hk: number): Section[] => ([[-0.01, -0.012], [0.01, grow], [0.07, grow], [0.13, grow], [0.15, -0.012]] as const).map(([z, gr]): Section => {
    const a = FOOT.findIndex((f) => f[0] >= z), f0 = FOOT[Math.max(0, a - 1)]!, f1 = FOOT[a]!, t = (z - f0[0]) / (f1[0] - f0[0]);
    const rx = f0[2] + (f1[2] - f0[2]) * t, ry = f0[3] + (f1[3] - f0[3]) * t, yc = f0[1] + (f1[1] - f0[1]) * t;
    return [z, yc - ry * (1 - hk) + 0.002, rx + gr, ry * hk];
  });
  noOut(kit.loft(panel(0.0035, 0.6), smooth(B.gold), knee, [6, 5]));
  noOut(kit.loft(panel(0.005, 0.52), smooth(B.shaft), knee, [6, 5]));
  // Зулаг → оюу хөвөө → цагаан ул: шат шатаар бага зэрэг өргөсөж нягт давхарлана
  const WELT = FOOT.map(([z, y, rx, ry]): Section => [z * 1.012, y - ry - 0.002, rx + 0.004, 0.0045]);
  const SOLE = FOOT.map(([z, y, rx, ry]): Section => [z * 1.024, y - ry - 0.0135, rx + 0.008, 0.008]);
  noOut(kit.loft(WELT, smooth(B.teal), knee, [6, 6]));
  noOut(kit.loft(SOLE, smooth(B.sole), knee, [6, 6]));
  noOut(kit.loft(SOLE.map(([z, y, rx]): Section => [z * 1.002, y - 0.0055, rx + 0.0012, 0.0028]), smooth(B.shaft), knee, [6, 6]));   // улны доод бараан ирмэг
  // Хар хүрээ: огтлолыг жигд зузаатгаж гаргана
  const hull = FOOT.map(([z, y, rx, ry], n): Section => [z + (n < 3 ? -0.008 : n === FOOT.length - 1 ? 0.004 : 0), y - 0.008, rx + 0.012, ry + 0.012]);
  noOut(kit.loft(hull.slice(5).map((h0, n): Section => (n === 0 ? [h0[0], h0[1], h0[2] - 0.03, h0[3] - 0.02] : h0)), INK, knee, [2, 5]));
  // Хоншоорын зүйдэл: зулгийн нурууг дагасан оюу хөвөө — үзүүрээс өмнө дуусна
  kit.tube(FOOT.slice(7, 12).map(([z, y, , ry]) => new THREE.Vector3(0, y + ry - 0.001, z)), 0.0045, smooth(B.teal), knee);
  return { hip, knee };
}
