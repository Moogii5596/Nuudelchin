/**
 * Зурмал нүүр (C-1–C-4): цилиндр толгойн гадаргуу дээр canvas-аар нүд, хөмсөг, ам зурна (хавтгай, сүүдэргүй).
 * Царайны параметр (`FaceLook`: нүд, хөмсөг, ам, сахал, үрчлээ, хацрын туяа, сормуус) characters.json-оос.
 * - `liveFace` — тоглогч (`full`): амьд canvas, төлөв өөрчлөгдсөн үед л дахин зурна.
 * - `atlasFace` — NPC: сэтгэл хөдлөл × ам × анивчилтыг урьдчилан зурсан атлас; NPC бүр текстурын хуулбартай (зураг нэг,
 *   GPU руу нэг удаа), кадр бүр зөвхөн UV шилжилт солигдоно.
 * - `staticFaceMat` — хөдөлгөөнгүй олон хүн.
 */
import * as THREE from 'three';
import type { HerderEmotion } from '../style';
import { css } from './materials';
import type { CharacterSpec, FaceLook } from './spec';

export interface Emotion { tilt: number; lift: number; eye: number; smile: number; open: number }
/** blink: 0..1 (аниагүй → аньсан), gaze: -1..1 (харц), mouth: 0..1 (ам ангайлт) */
export interface FaceState { blink: number; gaze: number; mouth: number; emo: Emotion }
export interface FacePainter { material: THREE.MeshLambertMaterial; paint(st: FaceState): void }
/** Нүүр зурахад хэрэгтэй spec-ийн хэсэг */
export type FaceSpec = Pick<CharacterSpec, 'face' | 'skin' | 'hair'>;

/** Сэтгэл хөдлөл: хөмсөгний налуу/өндөр, нүдний нээлт, амны булан, ам ангайлт */
export const EMOTIONS: Readonly<Record<HerderEmotion, Readonly<Emotion>>> = {
  neutral: { tilt: 0, lift: 0, eye: 1, smile: 0.15, open: 0 },
  happy: { tilt: -0.08, lift: -8, eye: 0.7, smile: 1, open: 0.25 },
  angry: { tilt: 0.32, lift: 10, eye: 0.8, smile: -0.6, open: 0 },
  sad: { tilt: -0.3, lift: -4, eye: 0.85, smile: -0.85, open: 0 },
  surprised: { tilt: -0.05, lift: -26, eye: 1.35, smile: 0, open: 0.7 },
};
const EMOTION_NAMES = Object.keys(EMOTIONS) as HerderEmotion[];
const NEUTRAL: FaceState = { blink: 0, gaze: 0, mouth: 0, emo: EMOTIONS.neutral };

/** Зургийн хэмжээ (2048×1024 координатаар зурж, canvas-ийн хэмжээнд жижгэрүүлнэ) */
const W = 2048, H = 1024, CANVAS_W = 512, CANVAS_H = 256;
/** Атлас: 5 сэтгэл хөдлөл × 3 ам × 2 анивчилт = 30 нүд (6 × 5), нүд бүр 256×128 */
const A_COLS = 6, A_ROWS = 5, CELL_W = 256, CELL_H = 128;
/** Зургийн төвийг толгойн урд талд тааруулах шилжилт: seg — толгойн тойргийн хуваалт */
export const faceOffset = (seg: number): number => 1 / (2 * seg);

/**
 * Цилиндр толгойн энгийн нүүр: сүүдэр, хамар, уруулгүй — хавтгай зурсан нүд, хөмсөг, ам
 * (+ хацрын туяа, сэвх, мэнгэ, үрчлээ, сахал, нүдний шил). Анхдагч утга (oval/straight, шилжилтгүй) нь тоглогчийн зурагтай
 * яг ижил үйлдлүүд — нэмэлт зүйл зөвхөн утга нь тэг биш үед зурагдана.
 */
function drawFace(c: CanvasRenderingContext2D, st: FaceState, s: FaceSpec): void {
  const F: FaceLook = s.face, E = F.eyes, B = F.brows, M = F.mouth;
  c.fillStyle = css(s.skin.base); c.fillRect(0, 0, W, H);
  const cx = W / 2, yOf = (v: number): number => (1 - v) * H;
  const yEye = yOf(0.54) + E.y, yMouth = yOf(0.4) + M.y, INK = '#22160f';
  if (F.blush > 0) {                                                   // хацрын туяа
    for (const sx of [-1, 1]) {
      const gx = cx + sx * 200, gy = yEye + 95, gr = c.createRadialGradient(gx, gy, 4, gx, gy, 80);
      gr.addColorStop(0, `rgba(226,120,110,${0.55 * F.blush})`); gr.addColorStop(1, 'rgba(226,120,110,0)');
      c.fillStyle = gr; c.fillRect(gx - 90, gy - 90, 180, 180);
    }
  }
  if (F.freckles > 0) {                                                // сэвх: хамрын хоёр талд (тогтмол seed)
    let seed = 5;
    const rnd = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
    c.fillStyle = `rgba(140,72,44,${0.35 + 0.35 * F.freckles})`;
    for (const sx of [-1, 1]) for (let n = 0; n < Math.round(18 * F.freckles); n++) {
      c.beginPath(); c.arc(cx + sx * (70 + rnd() * 150), yEye + 55 + rnd() * 80, 4 + rnd() * 4, 0, Math.PI * 2); c.fill();
    }
  }
  for (const [mx, my] of F.moles) { c.fillStyle = '#3e2416'; c.beginPath(); c.arc(cx + mx, yEye + my, 9, 0, Math.PI * 2); c.fill(); }
  const o = Math.max(0.08, Math.min(1.25, st.emo.eye) * (1 - 0.94 * st.blink));
  for (const sx of [-1, 1]) {
    const ex = cx + sx * E.spacing + st.gaze * 10;
    c.fillStyle = INK;
    if (E.shape === 'line') {                                       // нарийн зураас (инээмсэглэсэн нүд)
      c.strokeStyle = INK; c.lineWidth = E.h * 0.45; c.lineCap = 'round';
      c.beginPath(); c.moveTo(ex - E.w, yEye + 4); c.quadraticCurveTo(ex, yEye - 14 * Math.min(1, o), ex + E.w, yEye + 4); c.stroke();
    } else {                                                        // oval: босоо зууван; dot: дугуй; slant: гадна булан дээш
      const ry = (E.shape === 'dot' ? E.w : E.h) * o, rot = E.shape === 'slant' ? sx * -0.38 : 0;
      c.beginPath(); c.ellipse(ex, yEye, E.w, ry, rot, 0, Math.PI * 2); c.fill();
    }
    if (F.lashes && o > 0.3 && E.shape !== 'line') {               // сормуус: гадна дээд буланд хоёр зураас
      c.strokeStyle = INK; c.lineWidth = 6; c.lineCap = 'round';
      const ty = yEye - E.h * o * 0.8;
      c.beginPath(); c.moveTo(ex + sx * E.w * 0.55, ty); c.lineTo(ex + sx * (E.w + 14), ty - 14); c.stroke();
      c.beginPath(); c.moveTo(ex + sx * E.w * 0.85, ty + 8); c.lineTo(ex + sx * (E.w + 18), ty + 2); c.stroke();
    }
    c.save();                                                       // хөмсөг
    c.translate(cx + sx * (E.spacing + 4), yEye - 66 + B.lift + st.emo.lift * 0.8); c.scale(sx, 1); c.rotate(-st.emo.tilt * 1.2 + B.tilt);
    c.strokeStyle = B.color === null ? INK : css(B.color); c.lineWidth = B.thickness; c.lineCap = 'round';
    c.beginPath();
    if (B.shape === 'arch') { c.moveTo(-36 * B.length, 10); c.quadraticCurveTo(0, -30, 38 * B.length, 6); }
    else if (B.shape === 'slant') { c.moveTo(-34 * B.length, 14); c.lineTo(36 * B.length, -10); }
    else { c.moveTo(-34 * B.length, 3); c.quadraticCurveTo(0, -7, 36 * B.length, 2); }
    c.stroke();
    c.restore();
  }
  if (F.glasses) {                                                  // нүдний шил: дугуй хүрээ, гүүр
    c.strokeStyle = '#2a201a'; c.lineWidth = 9;
    const R = Math.max(E.w, E.h) + 26;
    for (const sx of [-1, 1]) { c.beginPath(); c.arc(cx + sx * E.spacing, yEye, R, 0, Math.PI * 2); c.stroke(); }
    c.beginPath(); c.moveTo(cx - E.spacing + R, yEye - 6); c.quadraticCurveTo(cx, yEye - 18, cx + E.spacing - R, yEye - 6); c.stroke();
    for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(cx + sx * (E.spacing + R), yEye - 4); c.lineTo(cx + sx * (E.spacing + R + 120), yEye - 14); c.stroke(); }
  }
  const w = M.width, k = (st.emo.smile + M.smile) * 30, open = Math.min(1, st.mouth + st.emo.open) * 46;   // ам
  if (F.wrinkles > 0) {                                             // үрчлээ: дух, нүдний булан, хамрын хажуу
    c.strokeStyle = `rgba(70,40,24,${0.45 * F.wrinkles})`; c.lineWidth = 6; c.lineCap = 'round';
    for (const dy of [0, 34]) { c.beginPath(); c.moveTo(cx - 150, yEye - 128 - dy + 8); c.quadraticCurveTo(cx, yEye - 128 - dy - 8, cx + 150, yEye - 128 - dy + 8); c.stroke(); }
    for (const sx of [-1, 1]) {
      const x0 = cx + sx * (E.spacing + E.w + 12);
      for (const dy of [-12, 10]) { c.beginPath(); c.moveTo(x0, yEye + dy * 0.3); c.lineTo(x0 + sx * 34, yEye + dy); c.stroke(); }
      c.beginPath(); c.moveTo(cx + sx * 58, yEye + 62); c.quadraticCurveTo(cx + sx * (w + 18), yMouth - 30, cx + sx * (w + 16), yMouth + 14); c.stroke();
    }
  }
  if (F.beard !== 'none') {                                         // сахал (үсний өнгөөр)
    c.fillStyle = css(s.hair.color);
    if (F.beard === 'full') {
      c.beginPath(); c.moveTo(cx - 290, yMouth - 50);
      c.quadraticCurveTo(cx - 290, H - 40, cx, H - 10); c.quadraticCurveTo(cx + 290, H - 40, cx + 290, yMouth - 50);
      c.lineTo(cx + w + 26, yMouth - 6); c.quadraticCurveTo(cx, yMouth + 96, cx - w - 26, yMouth - 6); c.closePath(); c.fill();
    }
    if (F.beard === 'goatee' || F.beard === 'full') { c.beginPath(); c.ellipse(cx, yMouth + 92, w * 0.55, 56, 0, 0, Math.PI * 2); c.fill(); }
    if (F.beard === 'mustache' || F.beard === 'full') {
      c.beginPath(); c.moveTo(cx - w - 12, yMouth - 2); c.quadraticCurveTo(cx, yMouth - 64, cx + w + 12, yMouth - 2);
      c.quadraticCurveTo(cx, yMouth - 26, cx - w - 12, yMouth - 2); c.fill();
    }
  }
  c.save(); c.translate(cx, yMouth);
  if (open > 4) {
    c.beginPath(); c.moveTo(-w, -k * 0.5); c.quadraticCurveTo(0, k * 0.4, w, -k * 0.5); c.quadraticCurveTo(0, k + open * 2, -w, -k * 0.5); c.closePath();
    c.fillStyle = '#3a1512'; c.fill(); c.save(); c.clip();
    c.fillStyle = '#b5584f'; c.beginPath(); c.ellipse(0, k * 0.5 + open * 0.95, 40, 20, 0, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  c.strokeStyle = INK; c.lineWidth = 11; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-w, -k * 0.5); c.quadraticCurveTo(0, k * (open > 4 ? 0.4 : 1), w, -k * 0.5); c.stroke();
  c.restore();
}

function faceCanvas(w: number, h: number): { ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture } {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d')!;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return { ctx, tex };
}
const keyOf = (s: FaceSpec): string => JSON.stringify([s.face, s.skin.base, s.hair.color]);

const lives = new Map<string, FacePainter>();
/**
 * Амьд нүүр (`full` — тоглогч): 512×256 canvas (2048×1024-ийг кадр бүр GPU руу хуулах нь гацаалт үүсгэдэг тул 4 дахин жижиг).
 * Царай бүрд нэг canvas — ижил царайтай `full` дүрүүд хуваалцана. seg — толгойн хуваалт.
 */
export function liveFace(s: FaceSpec, seg: number): FacePainter {
  const id = keyOf(s) + seg;
  const hit = lives.get(id);
  if (hit) return hit;
  const { ctx, tex } = faceCanvas(CANVAS_W, CANVAS_H);
  ctx.setTransform(CANVAS_W / W, 0, 0, CANVAS_H / H, 0, 0);
  tex.offset.x = faceOffset(seg);
  let key = '';
  const paint = (st: FaceState): void => {
    const e = st.emo;
    const k = [st.blink * 4, st.gaze * 3, st.mouth * 6, e.tilt * 40, e.lift, e.eye * 20, e.smile * 12, e.open * 10].map(Math.round).join('|');
    if (k === key) return;
    key = k;
    drawFace(ctx, st, s);
    tex.needsUpdate = true;
  };
  paint(NEUTRAL);
  const painter = { material: new THREE.MeshLambertMaterial({ color: 0xffffff, map: tex }), paint };
  lives.set(id, painter);
  return painter;
}

const atlases = new Map<string, THREE.CanvasTexture>();
/** Царайн атлас: нүд (сэтгэл хөдлөл e, ам m 0..2, анивчилт b 0..1) → index e·6 + m·2 + b */
function atlasTexture(s: FaceSpec): THREE.CanvasTexture {
  const id = keyOf(s);
  let tex = atlases.get(id);
  if (tex) return tex;
  const made = faceCanvas(A_COLS * CELL_W, A_ROWS * CELL_H);
  tex = made.tex;
  EMOTION_NAMES.forEach((name, e) => {
    for (let m = 0; m < 3; m++) for (let b = 0; b < 2; b++) {
      const i = e * 6 + m * 2 + b, col = i % A_COLS, row = Math.floor(i / A_COLS);
      made.ctx.save();
      made.ctx.beginPath(); made.ctx.rect(col * CELL_W, row * CELL_H, CELL_W, CELL_H); made.ctx.clip();
      made.ctx.setTransform(CELL_W / W, 0, 0, CELL_H / H, col * CELL_W, row * CELL_H);
      drawFace(made.ctx, { blink: b, gaze: 0, mouth: m / 2, emo: EMOTIONS[name] }, s);
      made.ctx.restore();
    }
  });
  tex.repeat.set(1 / A_COLS, 1 / A_ROWS);
  atlases.set(id, tex);
  return tex;
}
/** Атласын текстурын тоо (тест, лаборатори) */
export const atlasCount = (): number => atlases.size;

/** NPC нүүр: атласаас — paint нь хамгийн ойр сэтгэл хөдлөл, амны түвшин, анивчилтын нүдийг сонгоно (дахин зурахгүй) */
export function atlasFace(s: FaceSpec, seg: number): FacePainter {
  const tex = atlasTexture(s).clone();   // source хуваалцана — GPU-д нэг зураг
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff, map: tex });
  const du = faceOffset(seg) / A_COLS;
  let cell = -1;
  const paint = (st: FaceState): void => {
    let best = 0, bestD = Infinity;
    EMOTION_NAMES.forEach((name, e) => {
      const t = EMOTIONS[name], q = st.emo;
      const d = (t.tilt - q.tilt) ** 2 + ((t.lift - q.lift) / 26) ** 2 + (t.eye - q.eye) ** 2 + (t.smile - q.smile) ** 2 + (t.open - q.open) ** 2;
      if (d < bestD) { bestD = d; best = e; }
    });
    const i = best * 6 + Math.round(Math.min(1, Math.max(0, st.mouth)) * 2) * 2 + (st.blink > 0.5 ? 1 : 0);
    if (i === cell) return;
    cell = i;
    const col = i % A_COLS, row = Math.floor(i / A_COLS);
    tex.offset.set(col / A_COLS + du, 1 - (row + 1) / A_ROWS);   // canvas-ийн дээд мөр = v-ийн дээд хэсэг (flipY)
  };
  paint(NEUTRAL);
  return { material, paint };
}

const statics = new Map<string, THREE.MeshLambertMaterial>();
/** Хөдөлгөөнгүй олон хүнд: тогтмол нүүр (царай × толгойн хуваалтаар кэштэй) */
export function staticFaceMat(s: FaceSpec, seg: number): THREE.MeshLambertMaterial {
  const key = keyOf(s) + '|' + seg;
  let m = statics.get(key);
  if (!m) {
    const { ctx, tex } = faceCanvas(CANVAS_W, CANVAS_H);
    ctx.setTransform(CANVAS_W / W, 0, 0, CANVAS_H / H, 0, 0);
    drawFace(ctx, NEUTRAL, s);
    tex.offset.set(faceOffset(seg), 0);
    m = new THREE.MeshLambertMaterial({ color: 0xffffff, map: tex });
    statics.set(key, m);
  }
  return m;
}
