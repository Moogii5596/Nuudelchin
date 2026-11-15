/**
 * Малгай (C-7): нэр бүр нэг функц (`hat:<нэр>` бүлэг, улирлаар харагдана). Шинэ малгай = энд нэг функц + `HATS`-д нэр
 * (style.ts `OutfitHat`, characters.json `hats.<нэр>`).
 */
import * as THREE from 'three';
import type { OutfitHat } from '../../style';
import { noOut, profile, type Kit, type Pt } from '../geom';
import { cap, felt, fur, silk, smooth } from '../materials';
import type { CharacterSpec } from '../spec';

/** Тоорцог: эсгий бөмбөгөр орой, хар судал, алхан хээтэй орой, сампин, 4 далбаа; арагш далийлгаж өмссөн. hy — толгойн өндөр */
function toortsog(spec: CharacterSpec, kit: Kit, hy: number): THREE.Group {
  const L = spec.hats.toortsog, ink = smooth(L.ink), feltM = felt(L.felt), feltM2 = felt(L.felt, true);
  const hat = new THREE.Group();
  hat.name = 'hat:toortsog';
  hat.position.y = 0.09;   // духны тал хүртэл дээш өмссөн
  {   // далийлгаж өмссөн: урд хүрээг байранд нь үлдээж (эргэлтийн тэнхлэг), ар талыг шил рүү буулгана
    const A = -0.17, Py = hy + 0.03, Pz = 0.28;
    hat.rotation.x = A;
    hat.position.y += Py - (Py * Math.cos(A) - Pz * Math.sin(A));
    hat.position.z = Pz - (Py * Math.sin(A) + Pz * Math.cos(A));
  }
  const DOME: readonly Pt[] = [[0.285, 0.03], [0.287, 0.12], [0.262, 0.22], [0.19, 0.295], [0.09, 0.335], [0, 0.348]];
  const domePts = profile(DOME, 20);
  const domeR = (y: number): number => {
    for (let n = 1; n < domePts.length; n++) {
      const a = domePts[n - 1]!, b = domePts[n]!;
      if (y <= b.y) return a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y || 1);
    }
    return 0;
  };
  kit.lathe(DOME, 1, feltM, 0, hy, 0, hat, { rows: 20 });
  // Хар судлууд: доод хос, хар оройн доорх хос
  const band = (y0: number, y1: number): THREE.Mesh => noOut(kit.lathe([[domeR(y0) + 0.004, y0], [domeR(y1) + 0.004, y1]], 1, ink, 0, hy, 0, hat));
  band(0.1, 0.118); band(0.136, 0.147);
  band(0.218, 0.231); band(0.246, 0.256);
  noOut(kit.lathe([[domeR(0.275) + 0.005, 0.275], [domeR(0.312) + 0.005, 0.312], [domeR(0.338) + 0.005, 0.338], [0, 0.355]], 1, cap(L.ink), 0, hy, 0, hat, { rows: 12 }));   // алхан хээтэй хар орой
  // Сампин: иш + мушгисан зангилаа
  kit.cyl(0.016, 0.024, 0.05, ink, 0, hy + 0.372, 0, hat);
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.03, 0.014, 64, 8, 2, 3), ink);
  knot.position.y = hy + 0.42; knot.rotation.x = Math.PI / 2; knot.castShadow = true;
  hat.add(knot);
  // Далбаа: орой нь бараг тэгш, үзүүр рүүгээ огцом намсдаг бөөрөнхий дэлбээ; аяга шиг гадагш дэлгэрнэ
  const flap = (center: number, half: number, H: number, flare: number, round: number): void => {
    const nu = 24, nv = 8, pos: number[] = [], uv: number[] = [], idx: number[] = [], edge: THREE.Vector3[] = [], inner: THREE.Vector3[] = [];
    for (let a = 0; a <= nu; a++) {
      const s01 = (a / nu) * 2 - 1, phi = center + s01 * half;
      const f = Math.pow(Math.cos((s01 * Math.PI) / 2), round);          // 0 (үзүүр) … 1 (дунд)
      for (let b = 0; b <= nv; b++) {
        const t = b / nv;
        const r = 0.29 + flare * (Math.sin((t * Math.PI) / 2) + 0.18 * t * t * t) * (0.4 + 0.6 * f);   // орой нь бага зэрэг гадагш эргэнэ
        const v = new THREE.Vector3(r * Math.sin(phi), 0.03 + H * f * t, r * Math.cos(phi));
        pos.push(v.x, v.y, v.z);
        uv.push((a / nu) * 0.6, t * 0.5);
        if (b === nv) edge.push(v);
        if (b === nv - 2) inner.push(v.clone().multiply(new THREE.Vector3(1.012, 1, 1.012)));
      }
    }
    for (let a = 0; a < nu; a++) for (let b = 0; b < nv; b++) {
      const p0 = a * (nv + 1) + b, p1 = p0 + nv + 1;
      idx.push(p0, p1, p0 + 1, p1, p1 + 1, p0 + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = noOut(new THREE.Mesh(geo, feltM2));
    m.position.y = hy; m.castShadow = true;
    hat.add(m);
    for (const [pts, rad] of [[edge, 0.014], [inner, 0.006]] as const) {      // хар хөвөө + дотор талын нарийн шугам
      const tube = noOut(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), kit.q(48, 10), rad, kit.q(6, 4)), ink));
      tube.position.y = hy;
      hat.add(tube);
    }
  };
  for (let q = 0; q < 4; q++) flap((q * Math.PI) / 2, 0.72, 0.125, 0.085, 0.32);   // урд, хойд, хоёр хажуу
  noOut(kit.lathe([[0.29, 0.012], [0.294, 0.045]], 1, ink, 0, hy, 0, hat));   // доод хар хүрээ
  return hat;
}

/**
 * Үстэй монгол малгай: дээшээ дэлбээлсэн зузаан үсэн хүрээ, дотроос нь хээтэй торгон шовгор орой, сампин;
 * ар талд хоёр улаан залаа. Арагш суулгаж, доош дарж өмссөн.
 */
function fox(spec: CharacterSpec, kit: Kit, hy: number): THREE.Group {
  const L = spec.hats.fox;
  const hat = new THREE.Group();
  hat.name = 'hat:fox';
  const fh = new THREE.Group();
  fh.position.set(0, hy + 0.05, -0.03);   // дух ил, ар тал нь шил рүү буусан
  fh.rotation.x = -0.24;                  // духан дээр намхан, ар тал руугаа өргөгдсөн
  hat.add(fh);
  const FUR: readonly Pt[] = [[0.236, 0.0], [0.286, 0.004], [0.322, 0.065], [0.342, 0.14], [0.345, 0.2], [0.325, 0.242], [0.28, 0.256], [0.24, 0.238]];   // бөөрөнхий, зузаан
  kit.lathe(FUR, 1.02, fur(L.fur, L.furTint), 0, 0, 0, fh, { rows: 28, segs: 48 });
  const crown = new THREE.Group();
  crown.position.set(0, 0.226, 0);
  fh.add(crown);
  kit.lathe([[0.246, -0.09], [0.246, 0.015], [0.212, 0.07], [0.145, 0.125], [0.065, 0.168], [0.014, 0.185]], 1, silk(L.silk), 0, 0, 0, crown, { rows: 22, segs: 48 });
  noOut(kit.lathe([[0.25, 0.012], [0.243, 0.04]], 1, smooth(L.trim), 0, 0, 0, crown, { segs: 48 }));   // ёроолын хар хөх эмжээр
  noOut(kit.lathe([[0.241, 0.046], [0.237, 0.056]], 1, smooth(L.gold), 0, 0, 0, crown, { segs: 48 }));  // алтлаг зураас
  kit.cyl(0.012, 0.016, 0.03, smooth(L.stem), 0, 0.195, 0, crown);                                       // сампингийн иш
  kit.sball(0.034, smooth(L.knot), 0, 0.232, 0, crown);                                                  // сампин
  const red = smooth(L.ribbon);
  for (const sx of [-1, 1]) {                                                                            // залаа
    const rb = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.012), red);
    rb.geometry.translate(0, -0.17, 0);
    rb.position.set(sx * 0.05, 0.03, -0.268);
    rb.rotation.set(0.1, 0, sx * 0.14);
    rb.castShadow = true;
    fh.add(rb);
  }
  kit.sball(0.036, red, 0, 0.03, -0.275, fh).scale.set(1.5, 0.8, 0.6);
  return hat;
}

export type HatBuilder = (spec: CharacterSpec, kit: Kit, hy: number) => THREE.Group;
export const HATS: Readonly<Record<OutfitHat, HatBuilder>> = { toortsog, fox };
