/** Хаалганы хээ ба дотор талын атлас (canvas). Хувилбар бүрт нэг удаа үүснэ; document байхгүй (тест) үед null. */
import * as THREE from 'three';
import { GER } from './config';

export interface AtlasMaps { map: THREE.Texture | null; emissiveMap: THREE.Texture | null }
const _atlasCache = new Map<number, AtlasMaps>();
const hasDom = (): boolean => typeof document !== 'undefined';
export function doorAtlas(variant: number): AtlasMaps {
  const hit = _atlasCache.get(variant);
  if (hit) return hit;
  if (!hasDom()) return { map: null, emissiveMap: null };
  const D = GER.doors[variant]!, P = GER.palette, S = GER.atlas.size;
  const mk = (): HTMLCanvasElement => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
  const cm = mk(), ce = mk(), g = cm.getContext('2d')!, e = ce.getContext('2d')!;

  g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);                    // vertex color хэсгүүд энд заана
  g.fillStyle = P.interior; g.fillRect(160, 128, 96, 128);         // тооны дотор тал
  g.lineJoin = 'miter'; g.lineCap = 'butt';

  const panel = (x: number, y: number, w: number, h: number) => { g.strokeStyle = D.accent; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2); };
  const meander = (x: number, y: number, w: number, h: number) => { // алхан хээ
    const n = Math.max(2, Math.round(w / h)), u = w / n;
    g.strokeStyle = D.line; g.lineWidth = 3; g.beginPath();
    for (let k = 0; k < n; k++) {
      const x0 = x + k * u;
      g.moveTo(x0, y + h); g.lineTo(x0, y); g.lineTo(x0 + u * 0.78, y); g.lineTo(x0 + u * 0.78, y + h * 0.68);
      g.lineTo(x0 + u * 0.36, y + h * 0.68); g.lineTo(x0 + u * 0.36, y + h * 0.36);
    }
    g.moveTo(x, y + h); g.lineTo(x + w, y + h); g.stroke();
  };
  const ulzii = (cx: number, cy: number, s: number) => { // хялбаршуулсан өлзий
    g.save(); g.translate(cx, cy); g.rotate(Math.PI / 4); g.strokeStyle = D.line; g.lineWidth = 3.2;
    g.strokeRect(-s, -s / 3, 2 * s, 2 * s / 3); g.strokeRect(-s / 3, -s, 2 * s / 3, 2 * s); g.strokeRect(-s * 0.66, -s * 0.66, s * 1.32, s * 1.32);
    g.restore();
  };
  const khorol = (cx: number, cy: number, s: number) => { // дугуй хээ
    g.strokeStyle = D.line; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, s, 0, 7); g.stroke();
    g.fillStyle = D.accent; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; g.beginPath(); g.arc(cx + Math.cos(a) * s * 0.5, cy + Math.sin(a) * s * 0.5, s * 0.24, 0, 7); g.fill(); }
    g.fillStyle = D.line; g.beginPath(); g.arc(cx, cy, s * 0.2, 0, 7); g.fill();
  };
  const nuden = (cx: number, cy: number, s: number) => { // нүдэн хээ
    g.strokeStyle = D.line; g.lineWidth = 3;
    for (const k of [1, 0.58]) { g.beginPath(); g.moveTo(cx, cy - s * 1.25 * k); g.lineTo(cx + s * k, cy); g.lineTo(cx, cy + s * 1.25 * k); g.lineTo(cx - s * k, cy); g.closePath(); g.stroke(); }
    g.fillStyle = D.accent; g.beginPath(); g.arc(cx, cy, s * 0.2, 0, 7); g.fill();
  };
  /* Үүлэн хээтэй хаалга: хоёр хатавч (хажуугийн босоо мод) + цагаан шугаман хүрээтэй нэг хавтас */
  const drawCloudDoor = () => {
    const WHITE = '#FFF6E0', INK = '#1E1510', PINK = '#D8388A', GREEN = '#2E9A4A', YEL = '#F2C12E', BLUE = '#2F62C8';
    g.fillStyle = D.base; g.fillRect(0, 0, 256, 256);
    const curl = (cx: number, cy: number, r: number, col: string, flip: number, lw: number) => { g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath();
      for (let t = 0; t <= 9.6; t += 0.3) { const q = r * (1 - t / 11), x = cx + flip * Math.cos(t) * q, y = cy + Math.sin(t) * q; t ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
    const cloud = (cx: number, cy: number, w: number, h: number, col: string, n = 4) => {      // босоо үүлэн хээ: тэгш хэмтэй угалзууд, цагаан хүрээтэй, хоёр үзүүр шовх
      for (const [c2, lw] of [[WHITE, 5.5], [col, 3]] as [string, number][]) for (let i = 0; i < n; i++) { const t = (i + 0.5) / n - 0.5, r = w * (0.5 - 0.2 * Math.abs(t) * 2);
        curl(cx - r * 0.5, cy + t * h, r * 0.55, c2, 1, lw); curl(cx + r * 0.5, cy + t * h, r * 0.55, c2, -1, lw); }
      for (const sy of [-1, 1]) { g.fillStyle = col; g.beginPath(); g.moveTo(cx, cy + sy * (h / 2 + 6)); g.lineTo(cx - 4, cy + sy * (h / 2 - 2)); g.lineTo(cx + 4, cy + sy * (h / 2 - 2)); g.fill(); } };
    const band = (cx: number, cy: number, w: number, cols: string[]) => cols.forEach((col, i) => { const x = cx - w / 2 + (i + 0.5) * w / cols.length, f = i < cols.length / 2 ? 1 : -1;
      curl(x, cy, w / cols.length * 0.5, WHITE, f, 4.5); curl(x, cy, w / cols.length * 0.5, col, f, 2.5); });
    const frame2 = (x: number, y: number, w: number, h: number) => { g.strokeStyle = WHITE; g.lineWidth = 1.3; g.strokeRect(x, y, w, h); g.strokeRect(x + 3.5, y + 3.5, w - 7, h - 7); };
    const tri = (x: number, y: number) => { g.fillStyle = INK; g.beginPath(); g.moveTo(x - 4, y - 3); g.lineTo(x + 4, y - 3); g.lineTo(x, y + 4); g.fill(); };
    for (const sx of [0, 212]) { const cx = sx + 22;                                              // хатавч
      g.strokeStyle = 'rgba(120,40,0,.5)'; g.lineWidth = 2; g.strokeRect(sx + 8, 14, 28, 228);
      curl(cx - 4, 36, 7, BLUE, 1, 2.5); curl(cx + 4, 42, 7, PINK, -1, 2.5); curl(cx, 28, 5, YEL, 1, 2);
      cloud(cx, 128, 22, 70, BLUE, 3); curl(cx, 84, 7, YEL, 1, 2.5); curl(cx, 172, 7, YEL, -1, 2.5);
      curl(cx - 4, 222, 7, PINK, 1, 2.5); curl(cx + 4, 216, 7, GREEN, -1, 2.5);
      g.strokeStyle = INK; g.lineWidth = 2; for (const y of [48, 128, 208]) { g.beginPath(); g.arc(sx === 0 ? 6 : 250, y, 3.5, 0, 7); g.stroke(); } }
    g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(46, 0, 2, 256); g.fillRect(208, 0, 2, 256);
    frame2(54, 12, 148, 232);                                                                     // хавтас
    frame2(64, 24, 128, 34); band(128, 41, 112, [YEL, BLUE, PINK, PINK, BLUE, YEL]);
    frame2(64, 198, 128, 34); band(128, 215, 112, [PINK, GREEN, YEL, YEL, GREEN, PINK]);
    frame2(64, 68, 36, 120); cloud(82, 128, 24, 88, PINK);
    frame2(156, 68, 36, 120); cloud(174, 128, 24, 88, PINK);
    frame2(108, 68, 40, 56); cloud(128, 96, 22, 30, GREEN, 2);
    frame2(108, 132, 40, 56); cloud(128, 160, 22, 30, YEL, 2);
    for (const [x, y] of [[128, 62], [128, 194], [103, 128], [153, 128], [59, 62], [197, 62], [59, 194], [197, 194]] as [number, number][]) tri(x, y);
  };
  g.save(); g.translate(256, 0);                                    // хаалганы талбай: 256×256 (баруун дээд)
  if (D.motif === 'cloud') drawCloudDoor();
  else {
  g.scale(2, 1); g.fillStyle = D.base; g.fillRect(0, 0, 128, 256);
  const motif = { ulzii, khorol, nuden }[D.motif] || (() => {});
  for (const x of [7, 67]) {       // хоёр хавтас
    panel(x, 8, 54, 52); motif(x + 27, 34, 15);
    panel(x, 68, 54, 118); motif(x + 27, 127, 20);
    panel(x, 194, 54, 54); if (D.motif !== 'plain') { meander(x + 7, 206, 40, 13); meander(x + 7, 226, 40, 13); }
  }
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(63, 0, 2, 256);     // хавтасны зааг
  }
  g.restore();

  { let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;   // эсгийн ширхэг (гол дүрийн малгайн feltTex-тэй ижил арга)
    for (let n = 0; n < 9000; n++) { const x = rnd() * S, y = 262 + rnd() * 244, w = 1 + rnd() * 2.2, h = 1 + rnd() * 2.2;
      g.fillStyle = `rgba(${rnd() < 0.5 ? '90,80,60' : '255,255,255'},${0.02 + rnd() * 0.045})`; g.fillRect(x, y, w, h); g.fillRect(x - S, y, w, h); } }
  e.fillStyle = '#000'; e.fillRect(0, 0, S, S);
  e.fillStyle = P.fire; e.fillRect(160, 128, 96, 128);            // тооноор гарах гэрэл
  e.save(); e.translate(256, 0);
  e.fillStyle = 'rgba(255,179,92,.10)'; e.fillRect(0, 0, 256, 256);
  e.shadowColor = P.fire; e.shadowBlur = 7; e.fillStyle = P.fire;                                  // заадас, босгоор гарах гэрэл
  if (D.motif === 'cloud') { e.fillRect(46, 6, 3, 246); e.fillRect(207, 6, 3, 246); e.fillRect(48, 250, 160, 3); }
  else { e.fillRect(126, 4, 4, 248); e.fillRect(6, 250, 244, 3); e.fillRect(6, 3, 244, 2); }
  e.restore();

  const tex = (c: HTMLCanvasElement): THREE.CanvasTexture => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
  const out = { map: tex(cm), emissiveMap: tex(ce) };
  _atlasCache.set(variant, out);
  return out;
}

let _inTex: THREE.CanvasTexture | null = null;
/* Дотор талын атлас 512²: 0–64 цагаан · 64–256 будмал хавтан (A авдар, B орны хавтан, C хормой, D орны толгой) · 256–512 ханын сараалж */
export const IN_RECT: Record<'leather' | 'chest' | 'bedPanel' | 'apron' | 'bedEnd', [number, number, number, number]> = { leather: [256, 208, 448, 256], chest: [0, 64, 256, 256], bedPanel: [256, 64, 448, 160], apron: [256, 160, 448, 208], bedEnd: [448, 64, 512, 256] };
export function interiorAtlas(): THREE.CanvasTexture | null {
  if (_inTex) return _inTex;
  if (!hasDom()) return null;
  const I = GER.interior, c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d')!;
  const BLUE = '#3B7FC4', PINK = '#E77C93', GREEN = '#4FA36A', GOLD = '#E0B040', WHITE = '#FBF6EA', DARK = '#2A221C';
  g.fillStyle = '#fff'; g.fillRect(0, 0, 512, 256);
  const curl = (cx: number, cy: number, r: number, col: string, flip: number, lw = 3) => { g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath();
    for (let t = 0; t <= 9.6; t += 0.3) { const q = r * (1 - t / 11), x = cx + flip * Math.cos(t) * q, y = cy + Math.sin(t) * q; t ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
  const rosette = (cx: number, cy: number, r: number) => { g.fillStyle = GOLD; for (let k = 0; k < 8; k++) { g.beginPath(); g.arc(cx + Math.cos(k * Math.PI / 4) * r, cy + Math.sin(k * Math.PI / 4) * r, r * 0.42, 0, 7); g.fill(); }
    g.fillStyle = '#B8791F'; g.beginPath(); g.arc(cx, cy, r * 0.8, 0, 7); g.fill(); g.fillStyle = GOLD; g.beginPath(); g.arc(cx, cy, r * 0.42, 0, 7); g.fill(); };
  const frame = (x: number, y: number, w: number, h: number, bg: string) => { g.fillStyle = bg; g.fillRect(x, y, w, h); g.fillStyle = DARK; g.fillRect(x + 4, y + 4, w - 8, h - 8);
    g.strokeStyle = I.gold; g.lineWidth = 1.5; g.strokeRect(x + 5.5, y + 5.5, w - 11, h - 11); g.strokeRect(x + 11.5, y + 11.5, w - 23, h - 23);
    g.fillStyle = bg; g.fillRect(x + 13, y + 13, w - 26, h - 26); };

  { // A — авдрын нүүр: алхан хүрээ, голд өлзий, үүлэн хээ
    const [X, Y] = IN_RECT.chest, W = 256, H = 192;
    g.fillStyle = I.chestCol; g.fillRect(X, Y, W, H);
    g.strokeStyle = '#C63B5A'; g.lineWidth = 3; g.strokeRect(X + 5, Y + 5, W - 10, H - 10);
    g.fillStyle = '#C9A545'; g.fillRect(X + 10, Y + 10, W - 20, H - 20); g.fillStyle = I.chestCol; g.fillRect(X + 28, Y + 28, W - 56, H - 56);
    g.strokeStyle = '#4A6B3A'; g.lineWidth = 2; g.lineCap = 'butt'; g.beginPath();
    for (const yb of [Y + 10, Y + H - 28]) for (let x = X + 15; x < X + W - 24; x += 16) { g.moveTo(x, yb + 14); g.lineTo(x, yb + 4); g.lineTo(x + 10, yb + 4); g.lineTo(x + 10, yb + 10); g.lineTo(x + 5, yb + 10); }
    for (const xb of [X + 10, X + W - 28]) for (let y = Y + 32; y < Y + H - 40; y += 16) { g.moveTo(xb + 14, y); g.lineTo(xb + 4, y); g.lineTo(xb + 4, y + 10); g.lineTo(xb + 10, y + 10); g.lineTo(xb + 10, y + 5); }
    g.stroke();
    g.strokeStyle = '#2E9E8E'; g.lineWidth = 2; g.strokeRect(X + 31, Y + 31, W - 62, H - 62);
    for (const [col, lw] of [[DARK, 7.5], [GOLD, 4]] as [string, number][]) { g.save(); g.translate(X + 128, Y + 96); g.scale(1.55, 1); g.rotate(Math.PI / 4); g.strokeStyle = col; g.lineWidth = lw; const q = 27;
      g.strokeRect(-q, -q / 3, 2 * q, 2 * q / 3); g.strokeRect(-q / 3, -q, 2 * q / 3, 2 * q); g.strokeRect(-q * 0.66, -q * 0.66, q * 1.32, q * 1.32); g.restore(); }
    for (const fx of [1, -1]) { const m = X + 128;
      curl(m - fx * 78, Y + 96, 17, BLUE, fx, 4); curl(m - fx * 78, Y + 96, 9, WHITE, -fx, 2);
      curl(m - fx * 70, Y + 56, 12, PINK, fx); curl(m - fx * 70, Y + 136, 12, PINK, fx);
      curl(m - fx * 40, Y + 50, 9, GREEN, -fx); curl(m - fx * 40, Y + 142, 9, GREEN, -fx);
      curl(m - fx * 14, Y + 46, 8, BLUE, fx, 2.5); curl(m - fx * 14, Y + 146, 8, BLUE, fx, 2.5); }
  }
  { // B — орны хэвтээ хавтан: хар алтан хүрээ, голд цэцэг, цагаан эвэр угалз
    const [X, Y] = IN_RECT.bedPanel, W = 192, H = 96; frame(X, Y, W, H, I.bedRed); rosette(X + W / 2, Y + H / 2, 15);
    for (const fx of [1, -1]) { curl(X + W / 2 - fx * 46, Y + 34, 12, WHITE, fx, 2.6); curl(X + W / 2 - fx * 46, Y + 62, 12, WHITE, fx, 2.6); curl(X + W / 2 - fx * 68, Y + 48, 8, GOLD, -fx, 2.2); }
  }
  { // D — орны толгойн босоо хавтан
    const [X, Y] = IN_RECT.bedEnd, W = 64, H = 192; frame(X, Y, W, H, I.bedRed); rosette(X + W / 2, Y + H / 2, 11);
    for (const fy of [1, -1]) { curl(X + 23, Y + H / 2 - fy * 44, 9, WHITE, 1, 2.4); curl(X + 41, Y + H / 2 - fy * 44, 9, WHITE, -1, 2.4); curl(X + 32, Y + H / 2 - fy * 68, 7, GOLD, fy, 2); }
  }
  { // C — авдрын суурийн өнгөт хормой
    const [X, Y] = IN_RECT.apron, W = 192; g.fillStyle = I.chestCol; g.fillRect(X, Y, W, 48);
    const cols = [BLUE, PINK, GREEN, GOLD, '#8B5FBF'];
    for (let k = 0; k < 16; k++) { g.fillStyle = cols[k % cols.length]!; g.beginPath(); g.arc(X + 6 + k * 12, Y + 12, 7, 0, Math.PI); g.fill(); g.fillStyle = WHITE; g.beginPath(); g.arc(X + 6 + k * 12, Y + 12, 3, 0, Math.PI); g.fill(); }
    g.fillStyle = '#C9A545'; g.fillRect(X, Y + 6, W, 5);
  }
  { // арьс (хөхүүр): x = уутны өндөр (зүүн = ёроол), y = хөндлөн. Толбо, үрчлээ, захын оёдол
    const [X, Y] = IN_RECT.leather, W = 192, H = 48;
    const gx = g.createLinearGradient(X, 0, X + W, 0); gx.addColorStop(0, '#8E6230'); gx.addColorStop(0.3, '#C3924F'); gx.addColorStop(0.7, '#CFA060'); gx.addColorStop(1, '#A87A40');
    g.fillStyle = gx; g.fillRect(X, Y, W, H);
    const gy = g.createLinearGradient(0, Y, 0, Y + H); gy.addColorStop(0, 'rgba(70,40,10,.42)'); gy.addColorStop(0.22, 'rgba(70,40,10,0)'); gy.addColorStop(0.5, 'rgba(255,235,190,.16)'); gy.addColorStop(0.78, 'rgba(70,40,10,0)'); gy.addColorStop(1, 'rgba(70,40,10,.42)');
    g.fillStyle = gy; g.fillRect(X, Y, W, H);
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    g.save(); g.beginPath(); g.rect(X, Y, W, H); g.clip();
    for (let n = 0; n < 70; n++) { g.fillStyle = `rgba(${rnd() < 0.6 ? '80,48,16' : '255,230,180'},${0.04 + rnd() * 0.08})`; g.beginPath(); g.ellipse(X + rnd() * W, Y + rnd() * H, 3 + rnd() * 12, 2 + rnd() * 5, rnd() * 3, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(80,45,15,.3)'; g.lineWidth = 1; for (let n = 0; n < 9; n++) { const x = X + 20 + rnd() * 150, y = Y + 8 + rnd() * 32; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 4, y + 6, x + 1 + rnd() * 6, y + 10 + rnd() * 8); g.stroke(); }
    g.restore();
    g.strokeStyle = 'rgba(70,40,12,.75)'; g.lineWidth = 1.2; for (const y of [Y + 5.5, Y + H - 5.5]) { g.beginPath(); g.moveTo(X, y); g.lineTo(X + W, y); g.stroke(); }
    g.fillStyle = '#F1DFB6'; for (let x = X + 3; x < X + W; x += 7) { g.fillRect(x, Y + 4.5, 3.5, 2); g.fillRect(x, Y + H - 6.5, 3.5, 2); }
  }
  g.fillStyle = I.feltIn; g.fillRect(0, 256, 512, 256);                       // ханын сараалж
  g.save(); g.beginPath(); g.rect(0, 256, 512, 256); g.clip(); g.strokeStyle = I.lattice; g.lineWidth = 5.2; g.lineCap = 'butt'; g.beginPath();
  for (let k = -3; k < 8; k++) { g.moveTo(0, 256 + k * 60); g.lineTo(512, 376 + k * 60); g.moveTo(0, 256 + k * 60); g.lineTo(512, 136 + k * 60); }
  g.stroke(); g.restore();
  _inTex = new THREE.CanvasTexture(c); _inTex.colorSpace = THREE.SRGBColorSpace; _inTex.wrapS = THREE.RepeatWrapping; _inTex.anisotropy = 8;
  return _inTex;
}
