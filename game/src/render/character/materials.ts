/**
 * Дүрийн материал, текстурын сан (V4.5 R2): өнгө, хээгээр кэштэй — олон дүр угсрахад текстурын тоо өсөхгүй.
 * Canvas текстур эхний хэрэглээнд л үүснэ (sim, тест DOM шаардахгүй). Текстурын доторх зураасны өнгө нь
 * хээний хэлбэр (дүр хооронд ялгаагүй); суурь өнгө нь spec-ээс ирнэ.
 */
import * as THREE from 'three';
import type { BootPalette } from './spec';

export const css = (c: number): string => '#' + c.toString(16).padStart(6, '0');
export const darken = (c: number, k: number): number =>
  ((((c >> 16) & 255) * k) | 0) << 16 | ((((c >> 8) & 255) * k) | 0) << 8 | ((c & 255) * k) | 0;
export function lighten(c: number, k: number): number {
  const ch = (sh: number): number => { const v = (c >> sh) & 255; return Math.round(v + (255 - v) * k) << sh; };
  return ch(16) | ch(8) | ch(0);
}

const mats = new Map<string, THREE.Material>();
const texs = new Map<string, THREE.Texture>();
function memo<T extends THREE.Material>(key: string, make: () => T): T {
  let m = mats.get(key) as T | undefined;
  if (!m) { m = make(); mats.set(key, m); }
  return m;
}
function memoTex(key: string, make: () => THREE.Texture): THREE.Texture {
  let t = texs.get(key);
  if (!t) { t = make(); texs.set(key, t); }
  return t;
}
/** Сангийн хэмжээ (тест, лаборатори) */
export const libraryStats = (): { materials: number; textures: number } => ({ materials: mats.size, textures: texs.size });

type Draw = (c: CanvasRenderingContext2D, w: number, h: number) => void;
export function canvasTex(w: number, h: number, draw: Draw, rx = 1, ry = 1): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}
const lcg = (seed: number) => (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;

/* ---------- Өнгөт материалууд ---------- */
/** Ink-outline: mesh бүрийн ард томруулсан арын тал */
export const outline = (): THREE.MeshBasicMaterial => memo('outline', () => new THREE.MeshBasicMaterial({ color: 0x1a130d, side: THREE.BackSide }));
/** Талст (flat shading) — уут зэрэг энгийн хайрцаг */
export const flat = (c: number): THREE.MeshLambertMaterial => memo('flat' + c, () => new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
/** Гөлгөр Lambert */
export const smooth = (c: number): THREE.MeshLambertMaterial => memo('sm' + c, () => new THREE.MeshLambertMaterial({ color: c }));
/** Хоёр талаасаа харагдах гөлгөр (нээлттэй хавтас) */
export const doubleSided = (c: number): THREE.MeshLambertMaterial => memo('ds' + c, () => new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide }));
/** bakeSkinned: нэг өнгийн материалуудыг оройн өнгө болгон нийлүүлэх материал */
export const vertexColored = (flatShading: boolean, side: THREE.Side): THREE.MeshLambertMaterial =>
  memo(`vc${flatShading}|${side}`, () => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading, side }));

/* ---------- Текстурууд ---------- */
const feltTex = (): THREE.Texture => memoTex('felt', () => canvasTex(128, 128, (c, w, h) => {
  c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
  const rnd = lcg(7);
  for (let n = 0; n < 2600; n++) {
    c.fillStyle = `rgba(${rnd() < 0.5 ? '90,80,60' : '255,255,255'},${0.05 + rnd() * 0.1})`;
    c.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
  }
}, 5, 3));
/** Тоорцгийн оройн алхан хээ: ink — дэвсгэр */
const meanderTex = (ink: number): THREE.Texture => memoTex('meander' + ink, () => canvasTex(512, 128, (c, w, h) => {
  c.fillStyle = css(ink); c.fillRect(0, 0, w, h);
  c.strokeStyle = '#7a7168'; c.lineWidth = 5; c.lineJoin = 'miter';
  for (const y of [12, h - 12]) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  for (let x = 0; x < w; x += 64) {     // алхан хээний нэг нүд
    c.beginPath();
    c.moveTo(x, 100); c.lineTo(x, 30); c.lineTo(x + 50, 30); c.lineTo(x + 50, 84);
    c.lineTo(x + 18, 84); c.lineTo(x + 18, 54); c.lineTo(x + 34, 54);
    c.moveTo(x, 100); c.lineTo(x + 64, 100);
    c.stroke();
  }
}, 2, 1));
// Торгон дээлийн дугуй хээ: өнгийг үржүүлдэг тул ямар ч өнгийн дээлд тохирно
const drawBrocade: Draw = (c, w, h) => {
  c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
  const medal = (cx: number, cy: number): void => {
    c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 5;
    for (const r of [42, 24]) { c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke(); }
    for (let q = 0; q < 4; q++) {
      const a = (q * Math.PI) / 2;
      c.beginPath(); c.arc(cx + Math.cos(a) * 33, cy + Math.sin(a) * 33, 7, 0, Math.PI * 2); c.stroke();
    }
    c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.arc(cx, cy, 8, 0, Math.PI * 2); c.fill();
  };
  medal(64, 64); medal(192, 192);
  c.fillStyle = 'rgba(0,0,0,0.14)';
  for (const [dx, dy] of [[192, 64], [64, 192]] as const) { c.beginPath(); c.arc(dx, dy, 9, 0, Math.PI * 2); c.fill(); }
};
const brocadeTex = (): THREE.Texture => memoTex('brocade', () => canvasTex(256, 256, drawBrocade, 4, 2));
const brocadeSleeveTex = (): THREE.Texture => memoTex('brocadeSleeve', () => canvasTex(256, 256, drawBrocade, 2, 1));
/** Үс: богино ширхэгүүд, base — суурь өнгө */
const furTex = (base: number): THREE.Texture => memoTex('fur' + base, () => canvasTex(128, 128, (c, w, h) => {
  c.fillStyle = css(base); c.fillRect(0, 0, w, h);
  const rnd = lcg(11);
  for (let n = 0; n < 900; n++) {
    const x = rnd() * w, y = rnd() * h, v = rnd();
    c.strokeStyle = v < 0.5 ? `rgba(30,20,14,${0.3 + rnd() * 0.35})` : `rgba(255,245,230,${0.25 + rnd() * 0.35})`;
    c.lineWidth = 1 + rnd() * 1.5;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + (rnd() - 0.5) * 6, y + 5 + rnd() * 8); c.stroke();
  }
}, 2, 2));
/** Толгойн үсний ширхэг: суурь дээр босоо нарийн судал */
const hairTex = (base: number): THREE.Texture => memoTex('hair' + base, () => canvasTex(256, 128, (c, w, h) => {
  c.fillStyle = css(base); c.fillRect(0, 0, w, h);
  const rnd = lcg(23);
  for (let n = 0; n < 420; n++) {
    const x = rnd() * w;
    c.strokeStyle = rnd() < 0.5 ? `rgba(12,8,6,${0.35 + rnd() * 0.4})` : `rgba(132,100,76,${0.25 + rnd() * 0.35})`;
    c.lineWidth = 0.8 + rnd() * 1.4;
    c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + (rnd() - 0.5) * 8, h * 0.33, x + (rnd() - 0.5) * 8, h * 0.66, x + (rnd() - 0.5) * 6, h); c.stroke();
  }
}, 3, 1));
/** Дугуй өлзий хээ: алтлаг гадна хүрээ, оюу дотор хүрээ, дундаа оюу сүлжээ зангилаа */
function drawKnot(c: CanvasRenderingContext2D, cx: number, cy: number, R: number, gold: string, teal: string): void {
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = gold; c.lineWidth = R * 0.09;
  c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = teal; c.lineWidth = R * 0.1;
  c.beginPath(); c.arc(cx, cy, R * 0.8, 0, Math.PI * 2); c.stroke();
  const q = R * 0.19;
  c.lineWidth = R * 0.085;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {            // дөрвөн гогцоо
    c.beginPath(); c.arc(cx + dx * q * 1.55, cy + dy * q * 1.55, q, 0, Math.PI * 2); c.stroke();
  }
  c.strokeRect(cx - q * 1.55, cy - q * 1.55, q * 3.1, q * 3.1);            // гогцоонуудыг холбосон дөрвөлжин
  c.save(); c.translate(cx, cy); c.rotate(Math.PI / 4); c.strokeRect(-q * 1.2, -q * 1.2, q * 2.4, q * 2.4); c.restore();
  c.fillStyle = gold; c.beginPath(); c.arc(cx, cy, R * 0.07, 0, Math.PI * 2); c.fill();   // голын алтлаг цэг
}
const bootShaftTex = (b: BootPalette): THREE.Texture => memoTex(`boot${b.shaft}|${b.gold}|${b.pattern}`, () => canvasTex(512, 256, (c, w, h) => {
  const gold = css(b.gold), teal = css(b.pattern);
  c.fillStyle = css(b.shaft); c.fillRect(0, 0, w, h);
  for (const cx of [w * 0.25, w * 0.75]) drawKnot(c, cx, h * 0.6, 52, gold, teal);    // хоёр хажууд том өлзий
  for (const cx of [0, w * 0.5, w]) {                                                // урд, ард: жижиг эвэр угалз
    c.strokeStyle = teal; c.lineWidth = 5; c.lineCap = 'round';
    for (const sgn of [-1, 1]) { c.beginPath(); c.arc(cx + sgn * 14, h * 0.6, 12, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = gold; c.beginPath(); c.arc(cx, h * 0.6 - 22, 5, 0, Math.PI * 2); c.fill();
  }
  c.strokeStyle = gold; c.lineWidth = 5;                              // доод ирмэг: алтлаг шугам, дээр нь оюу шугам
  c.beginPath(); c.moveTo(0, h - 30); c.lineTo(w, h - 30); c.stroke();
  c.strokeStyle = teal; c.lineWidth = 7;
  c.beginPath(); c.moveTo(0, h - 17); c.lineTo(w, h - 17); c.stroke();
}));

/* ---------- Хээтэй / зурагтай материалууд ---------- */
/** Дээлийн торго: хээ + оройн gradient */
export const fabric = (c: number): THREE.MeshLambertMaterial => memo('fab' + c, () => new THREE.MeshLambertMaterial({ color: c, vertexColors: true, map: brocadeTex() }));
/** Ханцуй: улирлаар өнгө нь солигддог тул дүр бүрд ШИНЭ (текстур нь хуваалцна) */
export const sleeve = (c: number): THREE.MeshLambertMaterial => new THREE.MeshLambertMaterial({ color: c, map: brocadeSleeveTex() });
/** Нударга: өөр өнгийн хээтэй торго */
export const cuff = (c: number): THREE.MeshLambertMaterial => memo('cuff' + c, () => new THREE.MeshLambertMaterial({ color: c, map: brocadeSleeveTex() }));
/** Хээтэй торго (малгайн орой) */
export const silk = (c: number): THREE.MeshLambertMaterial => memo('silk' + c, () => new THREE.MeshLambertMaterial({ color: c, map: brocadeTex() }));
/** Сэвсгэр үс: base — ширхэгийн суурь, tint — материалын өнгө */
export const fur = (base: number, tint = 0xffffff, double = false): THREE.MeshLambertMaterial =>
  memo(`fur${base}|${tint}|${double}`, () => new THREE.MeshLambertMaterial({ color: tint, map: furTex(base), ...(double ? { side: THREE.DoubleSide } : {}) }));
/** Эсгий (тоорцог), ноосон даавуу (хантааз) */
export const felt = (c: number, double = false): THREE.MeshLambertMaterial =>
  memo(`felt${c}|${double}`, () => new THREE.MeshLambertMaterial({ color: c, map: feltTex(), ...(double ? { side: THREE.DoubleSide } : {}) }));
export const cap = (ink: number): THREE.MeshLambertMaterial => memo('cap' + ink, () => new THREE.MeshLambertMaterial({ color: 0xffffff, map: meanderTex(ink) }));
export const hair = (c: number): THREE.MeshLambertMaterial =>
  memo('hair' + c, () => new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide, map: hairTex(c) }));
export const bootShaft = (b: BootPalette): THREE.MeshLambertMaterial =>
  memo(`boot${b.shaft}|${b.gold}|${b.pattern}`, () => new THREE.MeshLambertMaterial({ color: 0xffffff, map: bootShaftTex(b) }));
