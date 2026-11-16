// @ts-nocheck — лабораторийн (tools/character-lab/buildings/index.html) хэрэглэгчийн баталсан геометрийн кодыг өөрчлөлтгүй хуулсан. Тоо, өнгө зөвхөн data/buildings.json-оос.
import * as THREE from 'three';
import { Geo, rgb, mix } from '../ger/geo';
import { BUILDING_CONFIG } from './config';


export const sc = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
export const px2uv = (x, y) => [x / BUILDING_CONFIG.atlas.size, 1 - y / BUILDING_CONFIG.atlas.h];   // атлас 512 × 1408: 512-оос доош хаягийн самбар (12), дэлгүүрийн цонх, хаалга
export const rot = (x, z, phi, tx = 0, tz = 0) => [x * Math.cos(phi) + z * Math.sin(phi) + tx, -x * Math.sin(phi) + z * Math.cos(phi) + tz];   // Geo.append, Object3D.rotation.y-тэй ижил

/* =====================================================================
   Барилгын атлас — бүх барилгад НЭГ canvas (өнгө + шөнийн гэрлийн зураг)
   ===================================================================== */
let _atlas = null;
export function buildingAtlas() {
  if (_atlas) return _atlas;
  const P = BUILDING_CONFIG.palette, A = BUILDING_CONFIG.atlas, S = A.size;
  const mk = () => { const c = document.createElement('canvas'); c.width = S; c.height = A.h; return c; };
  const cm = mk(), ce = mk(), g = cm.getContext('2d'), e = ce.getContext('2d');
  let seed = 17; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.fillStyle = '#fff'; g.fillRect(0, 0, S, A.h); e.fillStyle = '#000'; e.fillRect(0, 0, S, A.h);

  { // цонх
    const [X, Y, X1, Y1] = A.window, W = X1 - X, H = Y1 - Y;
    g.fillStyle = P.trim; g.fillRect(X, Y, W, H);
    g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(X, Y, W, 5);
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(X, Y1 - 9, W, 9);
    g.fillStyle = P.casing; g.fillRect(X + 12, Y + 12, W - 24, H - 26);
    for (const [px, py, pw, ph] of [[18, 18, 41, 26], [69, 18, 41, 26], [18, 50, 41, 58], [69, 50, 41, 58]]) {
      g.fillStyle = P.glass; g.fillRect(X + px, Y + py, pw, ph);
      g.fillStyle = 'rgba(255,255,255,.17)'; g.beginPath(); g.moveTo(X + px + 3, Y + py + ph); g.lineTo(X + px + pw * 0.55, Y + py); g.lineTo(X + px + pw * 0.85, Y + py); g.lineTo(X + px + pw * 0.33, Y + py + ph); g.fill();
      e.fillStyle = P.fire; e.fillRect(X + px, Y + py, pw, ph);
    }
    for (const [x0, dir] of [[X + 18, 1], [X + 110, -1]]) for (const [ctx, col] of [[g, 'rgba(244,238,223,.6)'], [e, 'rgba(255,244,220,.55)']]) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0, Y + 50); ctx.lineTo(x0 + dir * 30, Y + 50); ctx.quadraticCurveTo(x0 + dir * 8, Y + 72, x0, Y + 108); ctx.fill(); }
  }
  { // байшингийн хаалга
    const [X, Y, X1, Y1] = A.door, W = X1 - X, H = Y1 - Y;
    g.fillStyle = P.trim; g.fillRect(X, Y, W, H);
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 3; g.strokeRect(X + 1.5, Y + 1.5, W - 3, H - 3);
    for (const [py, ph] of [[10, 44], [62, 56]]) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.strokeRect(X + 9, Y + py, W - 18, ph);
      g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1.5; g.strokeRect(X + 12, Y + py + 3, W - 24, ph - 6); }
    g.fillStyle = '#D9A93A'; g.beginPath(); g.arc(X + W - 9, Y + 66, 3.2, 0, 7); g.fill();
    e.fillStyle = P.fire; e.fillRect(X + 3, Y1 - 3, W - 6, 2);
  }
  { // түлээний үзүүр (новны амбаарын овоолго)
    const [X, Y, X1, Y1] = A.firewood; g.fillStyle = '#3A2C22'; g.fillRect(X, Y, X1 - X, Y1 - Y);
    for (let row = 0; row < 9; row++) for (let col = 0; col < 19; col++) { const r = 3 + rnd() * 1.4, cx = X + 4 + col * 6.5 + (row % 2) * 3 + (rnd() - 0.5) * 1.5, cy = Y + 4 + row * 6.8 + (rnd() - 0.5) * 1.5;
      if (cx + r > X1) continue; const v = 170 + Math.floor(rnd() * 60);
      g.fillStyle = `rgb(${v},${Math.floor(v * 0.78)},${Math.floor(v * 0.52)})`; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
      g.strokeStyle = 'rgba(90,55,25,.6)'; g.lineWidth = 0.8; g.beginPath(); g.arc(cx, cy, r * 0.5, 0, 7); g.stroke(); }
  }
  { // хашааны хаалга, жорлонгийн хаалга: босоо банз, хөндлөвч, ташуу тулаас (цагаан суурь)
    const X = A.gateLeaf[0], W = A.wicket[2] - X;
    for (let x = 0; x < W; x += 12) { const v = 212 + Math.floor(rnd() * 43); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(X + x, 0, 12, 128); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(X + x, 0, 1.5, 128); }
    for (const y of [14, 104]) { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(X, y, W, 11); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(X, y + 11, W, 2); }
    g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 9; g.lineCap = 'butt';
    for (const x0 of [0, 96]) { g.save(); g.beginPath(); g.rect(X + x0, 0, 96, 128); g.clip(); g.beginPath(); g.moveTo(X + x0 + 4, 106); g.lineTo(X + x0 + 92, 22); g.stroke(); g.restore(); }
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(X + 95, 0, 2, 128);
    g.fillStyle = 'rgba(0,0,0,.6)'; g.beginPath(); g.arc(X + 96 + 84, 66, 3.5, 0, 7); g.fill();
  }
  { // атираат төмөр дээвэр
    const [y0, y1] = A.roof, Y = y0 - 2, H = y1 - y0 + 4;
    g.fillStyle = '#EDEDED'; g.fillRect(0, Y, S, H);
    for (let x = 0; x < S; x += 16) { g.fillStyle = 'rgba(0,0,0,.24)'; g.fillRect(x, Y, 2.5, H); g.fillStyle = '#fff'; g.fillRect(x + 2.5, Y, 3.5, H); }
    g.fillStyle = 'rgba(0,0,0,.13)'; g.fillRect(0, Y + H / 2, S, 2);
    for (let n = 0; n < 50; n++) { const x = rnd() * S, y = Y + rnd() * H, w = 6 + rnd() * 26; g.fillStyle = `rgba(80,50,25,${0.03 + rnd() * 0.05})`; g.fillRect(x, y, w, 3 + rnd() * 10); g.fillRect(x - S, y, w, 6); }
  }
  { // шохойдсон хана
    const [y0, y1] = A.plaster, Y = y0 - 2, H = y1 - y0 + 4;
    for (let n = 0; n < 90; n++) { const x = rnd() * S, y = Y + rnd() * H, rx = 8 + rnd() * 30, ry = 3 + rnd() * 9;
      g.fillStyle = `rgba(120,100,70,${0.025 + rnd() * 0.04})`; for (const dx of [0, -S, S]) { g.beginPath(); g.ellipse(x + dx, y, rx, ry, 0, 0, 7); g.fill(); } }
    const gr = g.createLinearGradient(0, Y + H - 22, 0, Y + H); gr.addColorStop(0, 'rgba(110,90,60,0)'); gr.addColorStop(1, 'rgba(110,90,60,.26)'); g.fillStyle = gr; g.fillRect(0, Y + H - 22, S, 22);
    g.strokeStyle = 'rgba(90,75,55,.28)'; g.lineWidth = 1;
    for (let n = 0; n < 6; n++) { let x = 20 + rnd() * (S - 40), y = Y + 6 + rnd() * 20; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (rnd() - 0.5) * 12; y += 5 + rnd() * 6; g.lineTo(x, y); } g.stroke(); }
  }
  const planks = (y0, y1, dark, rails) => { // босоо банз
    const Y = y0 - 2, H = y1 - y0 + 4;
    for (let x = 0; x < S;) { const w = Math.min(S - x, 20 + Math.floor(rnd() * 11)), v = Math.floor((198 + rnd() * 57) * dark);
      g.fillStyle = `rgb(${v},${v},${Math.floor(v * 0.98)})`; g.fillRect(x, Y, w, H);
      g.fillStyle = 'rgba(0,0,0,.07)'; for (let k = 0; k < 2; k++) g.fillRect(x + 4 + rnd() * (w - 8), Y, 1, H);
      g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x, Y, 2, H);
      if (!rails) { g.fillStyle = 'rgba(0,0,0,.55)'; for (const yy of [0.2, 0.78]) g.fillRect(x + w / 2 - 1, Y + H * yy, 2, 2); }
      if (rnd() < 0.3) { g.fillStyle = 'rgba(60,40,20,.3)'; g.beginPath(); g.ellipse(x + w / 2, Y + rnd() * H, 3, 4, 0, 0, 7); g.fill(); }
      x += w; }
    if (rails) for (const yy of [0.18, 0.74]) { g.fillStyle = '#E6E0D6'; g.fillRect(0, Y + H * yy, S, 6); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, Y + H * yy + 6, S, 2); }
  };
  planks(...A.planksOut, 1, false); planks(...A.planksIn, 0.86, true);
  { // дүнз: canvas-ын x = өндөр (давтагдана). Дүнз бүр дугуй сүүдэртэй, хооронд нь хар завсар (хөвд)
    const [y0, y1] = A.logs, Y = y0 - 2, H = y1 - y0 + 4, n = 12, lw = S / n;
    for (let k = 0; k < n; k++) { const x = k * lw, gr = g.createLinearGradient(x, 0, x + lw, 0);
      gr.addColorStop(0, '#8A8A8A'); gr.addColorStop(0.18, '#E4E4E4'); gr.addColorStop(0.55, '#FFFFFF'); gr.addColorStop(0.9, '#B4B4B4'); gr.addColorStop(1, '#6E6E6E');
      g.fillStyle = gr; g.fillRect(x, Y, lw, H); g.fillStyle = 'rgba(40,28,15,.75)'; g.fillRect(x, Y, 3, H);
      g.fillStyle = 'rgba(70,45,20,.12)'; for (let q = 0; q < 3; q++) g.fillRect(x + 6 + rnd() * (lw - 12), Y, 1.2, H);
      if (rnd() < 0.6) { g.fillStyle = 'rgba(70,45,20,.35)'; g.beginPath(); g.ellipse(x + lw * 0.5, Y + rnd() * H, 4, 2.5, 0, 0, 7); g.fill(); } }
  }
  { // хэвтээ банз (давхарласан): доод ирмэг нь дараагийн банзан дээр сүүдэр тусгана
    const [y0, y1] = A.siding, Y = y0 - 2, H = y1 - y0 + 4, n = 16, bw = S / n;
    for (let k = 0; k < n; k++) { const x = k * bw, gr = g.createLinearGradient(x, 0, x + bw, 0);
      gr.addColorStop(0, '#9A9A9A'); gr.addColorStop(0.22, '#F2F2F2'); gr.addColorStop(1, '#FFFFFF');
      g.fillStyle = gr; g.fillRect(x, Y, bw, H); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x + bw - 2, Y, 2, H); }
    for (let n2 = 0; n2 < 30; n2++) { g.fillStyle = `rgba(90,80,60,${0.03 + rnd() * 0.05})`; g.fillRect(rnd() * S, Y + rnd() * H, 4 + rnd() * 20, 3 + rnd() * 8); }
  }

  { // дэлгүүрийн хаягийн самбар: төрөл бүрт 512 × 64 зурвас (өнгө, хүрээ, бичиг, доороо алхан хээ). Шөнө бичиг нь гэрэлтэнэ
    const SH = BUILDING_CONFIG.shop;
    SIGN_KEYS().forEach((k, i) => { const T = signDef(k), y = A.signY + i * A.signH, H = A.signH;
      g.fillStyle = T.signColor; g.fillRect(0, y, S, H);
      g.strokeStyle = P.casing; g.lineWidth = 3; g.strokeRect(3, y + 3, S - 6, H - 6);
      g.strokeStyle = T.signText; g.globalAlpha = 0.55; g.lineWidth = 2; g.beginPath();
      for (let x = 14; x < S - 24; x += 16) { const yb = y + H - 10; g.moveTo(x, yb + 4); g.lineTo(x, yb - 2); g.lineTo(x + 10, yb - 2); g.lineTo(x + 10, yb + 2); g.lineTo(x + 5, yb + 2); }
      g.stroke(); g.globalAlpha = 1;
      let fs = Math.round(H * 0.5); const font = n => `700 ${n}px "Noto Sans", "Montserrat", "Segoe UI", sans-serif`; g.font = font(fs);
      while (g.measureText(T.sign).width > S - 70 && fs > 14) g.font = font(--fs);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = T.signText; g.fillText(T.sign, S / 2, y + H / 2 - 4);
      e.fillStyle = 'rgba(255,179,92,.12)'; e.fillRect(0, y, S, H); e.font = g.font; e.textAlign = 'center'; e.textBaseline = 'middle'; e.fillStyle = '#FFE7C2'; e.fillText(T.sign, S / 2, y + H / 2 - 4); });
  }
  { // дэлгүүрийн том цонх: мөнгөлөг хүрээ, шил, дотор лангуун дээрх бараа
    const [X, Y, X1, Y1] = A.shopWin, W = X1 - X, H = Y1 - Y;
    g.fillStyle = '#B9BBB7'; g.fillRect(X, Y, W, H); g.fillStyle = P.glass; g.fillRect(X + 7, Y + 7, W - 14, H - 14);
    const cols = ['#D9622B', '#2E5E9E', '#D8A93A', '#4E6B3A', '#F4EEDF', '#9A3B2E'];
    for (const sy of [40, 76, 108]) { g.fillStyle = 'rgba(200,190,170,.5)'; g.fillRect(X + 9, Y + sy, W - 18, 3); e.fillStyle = '#FFE2B0'; e.fillRect(X + 7, Y + sy - 30, W - 14, 33);
      for (let x = X + 12; x < X1 - 16; x += 9 + Math.floor(rnd() * 5)) { const h = 8 + rnd() * 16; g.fillStyle = cols[Math.floor(rnd() * cols.length)]; g.globalAlpha = 0.7; g.fillRect(x, Y + sy - h, 7, h); g.globalAlpha = 1; } }
    g.fillStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.moveTo(X + 14, Y1 - 8); g.lineTo(X + 70, Y + 8); g.lineTo(X + 92, Y + 8); g.lineTo(X + 36, Y1 - 8); g.fill();
    g.fillStyle = '#9A9C98'; g.fillRect(X + W / 2 - 2, Y, 4, H);
  }
  { // дэлгүүрийн хаалга: хоёр хавтас, шилэн, мөнгөлөг хүрээ
    const [X, Y, X1, Y1] = A.shopDoor, W = X1 - X, H = Y1 - Y;
    g.fillStyle = '#B9BBB7'; g.fillRect(X, Y, W, H);
    for (const x0 of [X + 6, X + W / 2 + 3]) { g.fillStyle = P.glass; g.fillRect(x0, Y + 8, W / 2 - 9, H - 36); e.fillStyle = '#FFD9A0'; e.fillRect(x0, Y + 8, W / 2 - 9, H - 36);
      g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(x0 + 4, Y + 12, 6, H - 46); }
    g.fillStyle = '#6E706C'; g.fillRect(X + W / 2 - 1.5, Y, 3, H); g.fillRect(X + W / 2 - 9, Y + 60, 4, 18); g.fillRect(X + W / 2 + 5, Y + 60, 4, 18);
  }

  { // олон нийтийн барилгын хаалга: хоёр хавтастай модон, дээрээ шилтэй
    const [X, Y, X1, Y1] = A.pubDoor, W = X1 - X, H = Y1 - Y;
    g.fillStyle = '#6E4A2E'; g.fillRect(X, Y, W, H); g.fillStyle = '#F4EEDF'; g.fillRect(X, Y, W, 6); g.fillRect(X, Y, 5, H); g.fillRect(X1 - 5, Y, 5, H);
    g.fillStyle = P.glass; g.fillRect(X + 8, Y + 10, W - 16, 22); e.fillStyle = P.fire; e.fillRect(X + 8, Y + 10, W - 16, 22);
    for (const x0 of [X + 8, X + W / 2 + 2]) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.strokeRect(x0, Y + 38, W / 2 - 10, 38); g.strokeRect(x0, Y + 82, W / 2 - 10, 38); }
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(X + W / 2 - 1, Y + 34, 2, H - 34); g.fillStyle = '#D9A93A'; g.fillRect(X + W / 2 - 7, Y + 76, 3, 12); g.fillRect(X + W / 2 + 4, Y + 76, 3, 12);
  }
  { // давхрын цонхны зурвас: 4 хэсэг (нэг хэсэг = нэг bay), цагаан суурьтай тул ханын өнгөөр будагдана. Шөнө зарим цонх гэрэлтэй
    const [y0, y1] = A.winBand, H = y1 - y0;
    for (let k = 0; k < 4; k++) { const X = k * 128, wx = X + 34, ww = 60, wy = y0 + 30, wh = 66;
      g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(wx - 6, wy + wh, ww + 12, 6);
      g.fillStyle = '#FFFFFF'; g.fillRect(wx - 5, wy - 5, ww + 10, wh + 10); g.fillStyle = 'rgba(0,0,0,.25)'; g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1.5; g.strokeRect(wx - 5, wy - 5, ww + 10, wh + 10);
      g.fillStyle = P.glass; g.fillRect(wx, wy, ww, wh); g.fillStyle = '#F4F1EA'; g.fillRect(wx + ww / 2 - 2, wy, 4, wh); g.fillRect(wx, wy + 20, ww, 4);
      g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(wx + 4, wy + 26, 8, wh - 30);
      if (k % 2 === 0 || k === 3) { e.fillStyle = k === 3 ? '#C98A40' : P.fire; e.fillRect(wx, wy, ww, wh); e.fillStyle = '#000'; e.fillRect(wx + ww / 2 - 2, wy, 4, wh); e.fillRect(wx, wy + 20, ww, 4); }
      for (let n = 0; n < 6; n++) { g.fillStyle = `rgba(120,100,70,${0.03 + rnd() * 0.04})`; g.beginPath(); g.ellipse(X + rnd() * 128, y0 + rnd() * H, 6 + rnd() * 16, 3 + rnd() * 6, 0, 0, 7); g.fill(); } }
  }
  { e.fillStyle = '#FFF4D8'; e.fillRect(72, 8, 48, 48); }   // гэрлийн толгойн тусгал (lamp) — энэ хэсэг шөнө гэрэлтэнэ
  { // дуганы будмал дам нуруу: 64 px давтагдах хээ (хөх суурь, ногоон/улаан хавтан, алтан дугуй), дээд доод улаан зураас
    const [y0, y1] = A.templeBeam, H = y1 - y0;
    for (let x = 0; x < S; x += 64) { g.fillStyle = '#2E5E9E'; g.fillRect(x, y0, 64, H);
      g.fillStyle = '#4E8A3A'; g.fillRect(x + 4, y0 + 10, 22, H - 20); g.fillStyle = '#B03A22'; g.fillRect(x + 38, y0 + 10, 22, H - 20);
      g.strokeStyle = '#F4EEDF'; g.lineWidth = 2; g.strokeRect(x + 4, y0 + 10, 22, H - 20); g.strokeRect(x + 38, y0 + 10, 22, H - 20);
      g.fillStyle = '#D8A93A'; g.beginPath(); g.arc(x + 32, y0 + H / 2, 7, 0, 7); g.fill(); g.fillStyle = '#B03A22'; g.beginPath(); g.arc(x + 32, y0 + H / 2, 3, 0, 7); g.fill();
      g.fillStyle = '#F4EEDF'; g.beginPath(); g.arc(x + 15, y0 + H / 2, 4, 0, 7); g.fill(); g.beginPath(); g.arc(x + 49, y0 + H / 2, 4, 0, 7); g.fill(); }
    g.fillStyle = '#B03A22'; g.fillRect(0, y0, S, 6); g.fillRect(0, y1 - 6, S, 6); g.fillStyle = '#D8A93A'; g.fillRect(0, y0 + 6, S, 2); g.fillRect(0, y1 - 8, S, 2);
  }
  { // хүрдний гадаргуу: алтан суурь, улаан хүрээ, давтагдах дэлбээ хээ (бичиггүй)
    const [y0, y1] = A.wheelBand, H = y1 - y0;
    g.fillStyle = '#D8A93A'; g.fillRect(0, y0, S, H); g.fillStyle = '#B03A22'; g.fillRect(0, y0, S, 7); g.fillRect(0, y1 - 7, S, 7);
    for (let x = 0; x < S; x += 32) { g.fillStyle = '#B03A22'; g.beginPath(); g.ellipse(x + 16, y0 + H / 2, 7, 12, 0, 0, 7); g.fill();
      g.fillStyle = '#F4EEDF'; g.beginPath(); g.ellipse(x + 16, y0 + H / 2, 3, 6, 0, 0, 7); g.fill(); g.fillStyle = '#2E5E9E'; g.fillRect(x, y0 + H / 2 - 1, 3, 3); }
  }
  { // сувргын тахилын нүх: алтан нуман хүрээ, улаан/хөх дотор, алтан бадам цэцэг (дүрсгүй)
    const [X, Y, X1, Y1] = A.niche, W = X1 - X, H = Y1 - Y;
    g.fillStyle = '#D8A93A'; g.fillRect(X, Y, W, H); g.fillStyle = '#B03A22'; g.beginPath(); g.moveTo(X + 6, Y1 - 6); g.lineTo(X + 6, Y + 40); g.quadraticCurveTo(X + W / 2, Y - 6, X1 - 6, Y + 40); g.lineTo(X1 - 6, Y1 - 6); g.fill();
    g.fillStyle = '#2E5E9E'; g.beginPath(); g.moveTo(X + 13, Y1 - 13); g.lineTo(X + 13, Y + 46); g.quadraticCurveTo(X + W / 2, Y + 8, X1 - 13, Y + 46); g.lineTo(X1 - 13, Y1 - 13); g.fill();
    g.fillStyle = '#D8A93A'; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(X + W / 2 + (k - 2) * 7, Y1 - 30, 4, 11, (k - 2) * 0.35, 0, 7); g.fill(); }
    g.beginPath(); g.arc(X + W / 2, Y + 58, 9, 0, 7); g.fill(); e.fillStyle = 'rgba(255,200,120,.25)'; e.fillRect(X + 13, Y + 20, W - 26, H - 33);
  }
  { // алтан хээтэй хавтан (суварганы давхарга): эргэлдсэн угалз, дугуй
    const [X, Y, X1, Y1] = A.ornament, W = X1 - X, H = Y1 - Y;
    g.fillStyle = '#E8C46A'; g.fillRect(X, Y, W, H); g.strokeStyle = '#9A6A1E'; g.lineWidth = 2; g.strokeRect(X + 2, Y + 2, W - 4, H - 4);
    for (const cx of [X + 22, X + 64, X + 106]) { g.strokeStyle = '#9A6A1E'; g.lineWidth = 2.5; g.beginPath();
      for (let t = 0; t <= 9.4; t += 0.3) { const q = 16 * (1 - t / 11), x = cx + Math.cos(t) * q, y = Y + H / 2 + Math.sin(t) * q * 0.8; t ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      g.fillStyle = cx === X + 64 ? '#2E9A4A' : '#B03A22'; g.beginPath(); g.arc(cx, Y + H / 2, 5, 0, 7); g.fill(); }
  }
  { // цагаан хүрдний гадаргуу: цагаан суурь, алтан чимэг тэмдэг (бичиг биш), улбар шар хүрээ
    const [X, Y, X1, Y1] = A.wheelScript, W = X1 - X, H = Y1 - Y;
    g.fillStyle = '#FFFFFF'; g.fillRect(X, Y, W, H); g.fillStyle = '#D9622B'; g.fillRect(X, Y, W, 5); g.fillRect(X, Y1 - 5, W, 5);
    g.strokeStyle = '#C9972E'; g.lineWidth = 3; g.lineCap = 'round';
    for (const cx of [X + 32, X + 96]) { g.beginPath(); g.arc(cx, Y + H / 2 - 4, 9, Math.PI * 0.2, Math.PI * 1.6); g.stroke(); g.beginPath(); g.moveTo(cx + 2, Y + H / 2 + 6); g.quadraticCurveTo(cx + 14, Y + H / 2 + 14, cx + 4, Y + H / 2 + 18); g.stroke();
      g.beginPath(); g.moveTo(cx - 8, Y + 14); g.lineTo(cx + 10, Y + 14); g.stroke(); g.fillStyle = '#C9972E'; g.beginPath(); g.arc(cx + 1, Y + 9, 2.5, 0, 7); g.fill(); }
  }
  { // колонкийн үнийн самбар: 128 × 512 босоо зургийг 90° эргүүлж 512 × 128 зурвас руу хийнэ
    const Y = BUILDING_CONFIG.fuel.pylon, [X0, Y0] = A.pylon, mkp = () => { const c = document.createElement('canvas'); c.width = 128; c.height = 512; return c; };
    const pc = mkp(), pe = mkp(), q = pc.getContext('2d'), qe = pe.getContext('2d'), F = n => `700 ${n}px "Noto Sans", "Montserrat", sans-serif`;
    q.fillStyle = Y.front; q.fillRect(0, 0, 128, 512); qe.fillStyle = '#000'; qe.fillRect(0, 0, 128, 512);
    q.fillStyle = 'rgba(255,255,255,.12)'; q.fillRect(0, 0, 6, 512); q.fillStyle = 'rgba(0,0,0,.15)'; q.fillRect(118, 0, 10, 512);
    q.fillStyle = '#FFFFFF'; q.beginPath(); q.arc(64, 44, 26, 0, 7); q.fill();                                                         // энгийн дусал тэмдэг
    q.fillStyle = Y.side; q.beginPath(); q.moveTo(64, 24); q.quadraticCurveTo(82, 48, 78, 56); q.arc(64, 54, 14, 0.15, Math.PI - 0.15); q.quadraticCurveTo(46, 48, 64, 24); q.fill();
    q.fillStyle = '#FFFFFF'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.font = F(30); q.fillText(Y.name, 64, 98);
    qe.fillStyle = 'rgba(255,220,170,.35)'; qe.beginPath(); qe.arc(64, 44, 26, 0, 7); qe.fill(); qe.textAlign = 'center'; qe.textBaseline = 'middle'; qe.font = F(30); qe.fillStyle = '#FFE7C2'; qe.fillText(Y.name, 64, 98);
    q.fillStyle = '#1E1A18'; q.fillRect(8, 122, 112, 212);
    Y.prices.forEach(([lab, col, val], i) => { const y = 128 + i * 51;
      q.fillStyle = col; q.fillRect(14, y + 6, 36, 38); q.fillStyle = '#FFFFFF'; q.font = F(lab.length > 2 ? 18 : 22); q.fillText(lab, 32, y + 26);
      const sold = isNaN(+val); q.fillStyle = sold ? '#E6E0D6' : '#FFFFFF'; q.font = F(sold ? 14 : 22); q.textAlign = 'right'; q.fillText(val, 114, y + 26); q.textAlign = 'center';
      qe.fillStyle = col; qe.globalAlpha = 0.6; qe.fillRect(14, y + 6, 36, 38); qe.globalAlpha = 1; qe.fillStyle = '#FFFFFF'; qe.font = F(lab.length > 2 ? 18 : 22); qe.fillText(lab, 32, y + 26);
      qe.fillStyle = sold ? '#C8C0B0' : '#FFF4D8'; qe.font = F(sold ? 14 : 22); qe.textAlign = 'right'; qe.fillText(val, 114, y + 26); qe.textAlign = 'center'; });
    for (let k = 0; k < 3; k++) { const x = 14 + k * 38; q.fillStyle = '#FFFFFF'; q.fillRect(x, 346, 30, 30); q.fillStyle = Y.side;   // гурван дүрс
      if (k === 0) { q.beginPath(); q.arc(x + 15, 361, 9, 0, 7); q.fill(); q.fillStyle = '#FFFFFF'; q.font = F(11); q.fillText('24', x + 15, 362); }
      if (k === 1) { q.fillRect(x + 9, 352, 10, 16); q.fillRect(x + 19, 356, 3, 8); }
      if (k === 2) { q.beginPath(); q.moveTo(x + 15, 351); q.quadraticCurveTo(x + 25, 364, x + 15, 371); q.quadraticCurveTo(x + 5, 364, x + 15, 351); q.fill(); } }
    q.fillStyle = '#FFFFFF'; q.fillRect(10, 390, 108, 30); q.fillStyle = '#2A221C'; q.font = F(10); const nw = q.measureText(Y.note).width; if (nw > 100) q.font = F(Math.floor(10 * 100 / nw)); q.fillText(Y.note, 64, 405);
    q.fillStyle = 'rgba(0,0,0,.12)'; q.fillRect(0, 440, 128, 72);
    for (const [ctx, src] of [[g, pc], [e, pe]]) { ctx.save(); ctx.translate(X0, Y0 + 128); ctx.rotate(-Math.PI / 2); ctx.drawImage(src, 0, 0); ctx.restore(); }
  }

  const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
  return (_atlas = { map: tex(cm), emissiveMap: tex(ce) });
}

/* =====================================================================
   Хавтгай хэлбэрийн туслахууд (Geo g руу бичнэ)
   ===================================================================== */
export const bandV = (r, t) => 1 - (r[1] + (r[0] - r[1]) * Math.min(1, Math.max(0, t))) / BUILDING_CONFIG.atlas.h;   // r = [дээд px, доод px], t: 0 доод … 1 дээд
// босоо хана a → b. mat: { r: зурвас, span, vh } — босоо зурвас (шохой, банз) эсвэл { r, h: true } — хэвтээ (дүнз, хэвтээ банз: u нь өндөр)
export function wallQuad(g, a, b, y0, y1a, n, col, mat, y1b = y1a) {
  const A = BUILDING_CONFIG.atlas, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const uv = mat.h ? (s, y) => [y / A.hSpan, bandV(mat.r, 0.05 + 0.9 * s)]
                   : (s, y) => [s * len / mat.span, bandV(mat.r, y / mat.vh)];
  g.quad([[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1b, b[1]], [a[0], y1a, a[1]]], n, col, [uv(0, y0), uv(1, y0), uv(1, y1b), uv(0, y1a)]);
}
// налуу хавтан (дээвэр, цас): дээд ирмэг (zH, yH) → доод ирмэг (zL, yL), x0…x1, зузаан t
export function slab(g, x0, x1, zH, yH, zL, yL, t, o) {
  const dz = zL - zH, dy = yL - yH, l = Math.hypot(dz, dy), n = [0, Math.abs(dz) / l, -dy * Math.sign(dz) / l], sg = Math.sign(dz);
  const a = [x0, yH, zH], b = [x1, yH, zH], c = [x1, yL, zL], e = [x0, yL, zL], dn = q => [q[0], q[1] - t, q[2]];
  g.quad([a, b, c, e], n, o.top, o.uv ? [[x0 / o.span, bandV(o.uv, 1)], [x1 / o.span, bandV(o.uv, 1)], [x1 / o.span, bandV(o.uv, 0)], [x0 / o.span, bandV(o.uv, 0)]] : null);
  if (o.under) g.quad([dn(a), dn(b), dn(c), dn(e)], [0, -n[1], -n[2]], o.under);
  g.quad([e, c, dn(c), dn(e)], [0, 0, sg], o.edge);
  g.quad([a, e, dn(e), dn(a)], [-1, 0, 0], o.edge); g.quad([b, c, dn(c), dn(b)], [1, 0, 0], o.edge);
  if (o.high) g.quad([a, b, dn(b), dn(a)], [0, 0, -sg], o.edge);
}
// хананд наасан зурагтай хавтан (цонх, хаалга): c = хананы цэг, n = гадагш чиглэл
export function panel(g, c, n, hx, hy, out, r, side, col = [1, 1, 1]) {
  const u = [n[2], 0, -n[0]], pt = (a, b, k) => [c[0] + u[0] * a * hx + n[0] * k, c[1] + b * hy, c[2] + u[2] * a * hx + n[2] * k];
  g.quad([pt(-1, -1, out), pt(1, -1, out), pt(1, 1, out), pt(-1, 1, out)], n, col,
    [px2uv(r[0] + 1, r[3] - 1), px2uv(r[2] - 1, r[3] - 1), px2uv(r[2] - 1, r[1] + 1), px2uv(r[0] + 1, r[1] + 1)]);
  g.quad([pt(-1, 1, 0), pt(1, 1, 0), pt(1, 1, out), pt(-1, 1, out)], [0, 1, 0], side);
  g.quad([pt(-1, -1, 0), pt(1, -1, 0), pt(1, -1, out), pt(-1, -1, out)], [0, -1, 0], side);
  for (const s of [1, -1]) g.quad([pt(s, -1, 0), pt(s, 1, 0), pt(s, 1, out), pt(s, -1, out)], [u[0] * s, 0, u[2] * s], side);
}
export const shadeDown = (g, top, from = 0) => { const k0 = BUILDING_CONFIG.shade.bottom;   // дээрээсээ доош бараантах зөөлөн шилжилт
  for (let i = from; i < g.p.length; i += 3) { const y = g.p[i + 1]; if (y < top) { const k = k0 + (1 - k0) * Math.max(0, y / top); g.c[i] *= k; g.c[i + 1] *= k; g.c[i + 2] *= k; } } };

export const SIGN_KEYS = () => [...Object.keys(BUILDING_CONFIG.shop.types), ...Object.keys(BUILDING_CONFIG.shop.extraSigns)];
export const signDef = k => BUILDING_CONFIG.shop.types[k] || BUILDING_CONFIG.shop.extraSigns[k];
export const signRect = k => { const A = BUILDING_CONFIG.atlas, i = SIGN_KEYS().indexOf(k); return [0, A.signY + i * A.signH, A.size, A.signY + (i + 1) * A.signH]; };
export function hCyl(g, cx, cy, cz, r, L, segs, col) {   // X тэнхлэгийн дагуух хэвтээ цилиндр (сав, өнхрүүш)
  const n = segs, pt = (k, x) => { const a = k / n * Math.PI * 2; return [cx + x, cy + Math.sin(a) * r, cz + Math.cos(a) * r]; };
  for (let k = 0; k < n; k++) { const a = (k + 0.5) / n * Math.PI * 2; g.quad([pt(k, -L / 2), pt(k + 1, -L / 2), pt(k + 1, L / 2), pt(k, L / 2)], [0, Math.sin(a), Math.cos(a)], col);
    for (const sx of [1, -1]) g.tri([cx + sx * L / 2, cy, cz], pt(k, sx * L / 2), pt(k + 1, sx * L / 2), [sx, 0, 0], [sx, 0, 0], [sx, 0, 0], sc(col, 0.92), sc(col, 0.92), sc(col, 0.92)); }
}
export const groundQuad = (g, x0, z0, x1, z1, col, y = 0.01) => g.quad([[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]], [0, 1, 0], col);
export const pt3 = (v, phi, tx, tz) => { const [x, z] = rot(v.x, v.z, phi, tx, tz); return new THREE.Vector3(x, 0, z); };
export const dirRot = (v, phi) => { const [x, z] = rot(v.x, v.z, phi); return new THREE.Vector3(x, 0, z); };
