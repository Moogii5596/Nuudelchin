/**
 * Зурмал нүүр (C-1–C-4): цилиндр толгойн гадаргуу дээр canvas-аар нүд, хөмсөг, ам зурна.
 * Тоглогч — амьд canvas (`liveFace`, төлөв өөрчлөгдсөн үед л дахин зурна); хөдөлгөөнгүй олон хүн — тогтмол нүүр
 * (`staticFaceMat`). NPC-ийн атлас → V4.5 R4.
 */
import * as THREE from 'three';
import type { HerderEmotion } from '../style';
import { css } from './materials';

export interface Emotion { tilt: number; lift: number; eye: number; smile: number; open: number }
/** blink: 0..1 (аниагүй → аньсан), gaze: -1..1 (харц), mouth: 0..1 (ам ангайлт) */
export interface FaceState { blink: number; gaze: number; mouth: number; emo: Emotion }
export interface FacePainter { material: THREE.MeshLambertMaterial; paint(st: FaceState): void }

/** Сэтгэл хөдлөл: хөмсөгний налуу/өндөр, нүдний нээлт, амны булан, ам ангайлт */
export const EMOTIONS: Readonly<Record<HerderEmotion, Readonly<Emotion>>> = {
  neutral: { tilt: 0, lift: 0, eye: 1, smile: 0.15, open: 0 },
  happy: { tilt: -0.08, lift: -8, eye: 0.7, smile: 1, open: 0.25 },
  angry: { tilt: 0.32, lift: 10, eye: 0.8, smile: -0.6, open: 0 },
  sad: { tilt: -0.3, lift: -4, eye: 0.85, smile: -0.85, open: 0 },
  surprised: { tilt: -0.05, lift: -26, eye: 1.35, smile: 0, open: 0.7 },
};
const NEUTRAL: FaceState = { blink: 0, gaze: 0, mouth: 0, emo: EMOTIONS.neutral };

/** Зургийн хэмжээ (2048×1024 координатаар зурж, canvas-ийн хэмжээнд жижгэрүүлнэ) */
const W = 2048, H = 1024, CANVAS_W = 512, CANVAS_H = 256;
/** Зургийн төвийг толгойн урд талд тааруулах шилжилт: seg — толгойн тойргийн хуваалт */
export const faceOffset = (seg: number): number => 1 / (2 * seg);

/** Цилиндр толгойн энгийн нүүр: сүүдэр, хамар, уруулгүй — зөвхөн хавтгай зурсан нүд, хөмсөг, ам */
function drawFace(c: CanvasRenderingContext2D, st: FaceState, skin: string): void {
  c.fillStyle = skin; c.fillRect(0, 0, W, H);
  const cx = W / 2, yOf = (v: number): number => (1 - v) * H;
  const yEye = yOf(0.54), yMouth = yOf(0.4), INK = '#22160f';
  const o = Math.max(0.08, Math.min(1.25, st.emo.eye) * (1 - 0.94 * st.blink));
  for (const sx of [-1, 1]) {
    const ex = cx + sx * 92 + st.gaze * 10;
    c.fillStyle = INK;                                              // нүд: босоо зууван, анивчихад хавтгайрна
    c.beginPath(); c.ellipse(ex, yEye, 21, 31 * o, 0, 0, Math.PI * 2); c.fill();
    c.save();                                                       // хөмсөг: богино зураас
    c.translate(cx + sx * 96, yEye - 66 + st.emo.lift * 0.8); c.scale(sx, 1); c.rotate(-st.emo.tilt * 1.2);
    c.strokeStyle = INK; c.lineWidth = 13; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-34, 3); c.quadraticCurveTo(0, -7, 36, 2); c.stroke();
    c.restore();
  }
  const w = 78, k = st.emo.smile * 30, open = Math.min(1, st.mouth + st.emo.open) * 46;   // ам
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

function faceCanvas(): { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture } {
  // тоглоомд 2048×1024-ийг кадр бүр GPU руу хуулах нь гацаалт үүсгэдэг тул 4 дахин жижиг
  const cv = document.createElement('canvas');
  cv.width = CANVAS_W; cv.height = CANVAS_H;
  const ctx = cv.getContext('2d')!;
  ctx.setTransform(CANVAS_W / W, 0, 0, CANVAS_H / H, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return { cv, ctx, tex };
}

let live: FacePainter | null = null;
/**
 * Амьд нүүр — одоо бүх `full` дүрд НЭГ canvas (зөвхөн тоглогч хэрэглэдэг; NPC-д атлас R4).
 * seg — толгойн хуваалт (зургийн төвийг урд талд тааруулна).
 */
export function liveFace(skin: number, seg: number): FacePainter {
  if (live) return live;
  const { ctx, tex } = faceCanvas();
  tex.offset.x = faceOffset(seg);
  const skinCss = css(skin);
  let key = '';
  const paint = (st: FaceState): void => {
    const e = st.emo;
    const k = [st.blink * 4, st.gaze * 3, st.mouth * 6, e.tilt * 40, e.lift, e.eye * 20, e.smile * 12, e.open * 10].map(Math.round).join('|');
    if (k === key) return;
    key = k;
    drawFace(ctx, st, skinCss);
    tex.needsUpdate = true;
  };
  paint(NEUTRAL);
  live = { material: new THREE.MeshLambertMaterial({ color: 0xffffff, map: tex }), paint };
  return live;
}

const statics = new Map<string, THREE.MeshLambertMaterial>();
/** Хөдөлгөөнгүй олон хүнд: энгийн царайтай тогтмол нүүр (арьс × толгойн хуваалтаар кэштэй) */
export function staticFaceMat(skin: number, seg: number): THREE.MeshLambertMaterial {
  const key = `${skin}|${seg}`;
  let m = statics.get(key);
  if (!m) {
    const { ctx, tex } = faceCanvas();
    drawFace(ctx, NEUTRAL, css(skin));
    tex.offset.set(faceOffset(seg), 0);
    m = new THREE.MeshLambertMaterial({ color: 0xffffff, map: tex });
    statics.set(key, m);
  }
  return m;
}
