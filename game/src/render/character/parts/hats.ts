/**
 * Малгай (C-7): нэр бүр нэг функц (`hat:<нэр>` бүлэг, улирлаар харагдана). Шинэ малгай = энд нэг функц + `HATS`-д нэр
 * (spec.ts `CharacterHat`, characters.json `hats.<нэр>`). Дүр зөвхөн өмсдөг малгайгаа угсарна (rig.ts, `wear`).
 */
import * as THREE from 'three';
import { headProfile, profileRadius } from './head';
import { noOut, profile, type Kit, type Pt } from '../geom';
import { cap, darken, felt, fur, lighten, silk, smooth } from '../materials';
import type { CharacterHat, CharacterSpec } from '../spec';

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
  kit.lathe(DOME, 1, kit.detail === 'npc' ? feltM2 : feltM, 0, hy, 0, hat, { rows: 20 });   // npc: далбаатай нэг материал (draw call)
  // Хар судлууд: доод хос, хар оройн доорх хос
  const band = (y0: number, y1: number): THREE.Mesh => noOut(kit.lathe([[domeR(y0) + 0.004, y0], [domeR(y1) + 0.004, y1]], 1, ink, 0, hy, 0, hat));
  band(0.1, 0.118); band(0.136, 0.147);
  band(0.218, 0.231); band(0.246, 0.256);
  noOut(kit.lathe([[domeR(0.275) + 0.005, 0.275], [domeR(0.312) + 0.005, 0.312], [domeR(0.338) + 0.005, 0.338], [0, 0.355]], 1, cap(L.ink), 0, hy, 0, hat, { rows: 12 }));   // алхан хээтэй хар орой
  // Сампин: иш + мушгисан зангилаа
  kit.cyl(0.016, 0.024, 0.05, ink, 0, hy + 0.372, 0, hat);
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.03, 0.014, kit.q(64, 16), kit.q(8, 4), 2, 3), ink);
  knot.position.y = hy + 0.42; knot.rotation.x = Math.PI / 2; knot.castShadow = true;
  hat.add(knot);
  // Далбаа: орой нь бараг тэгш, үзүүр рүүгээ огцом намсдаг бөөрөнхий дэлбээ; аяга шиг гадагш дэлгэрнэ
  const flap = (center: number, half: number, H: number, flare: number, round: number): void => {
    const nu = kit.q(24, 8), nv = kit.q(8, 3), pos: number[] = [], uv: number[] = [], idx: number[] = [], edge: THREE.Vector3[] = [], inner: THREE.Vector3[] = [];
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
    for (const [pts, rad] of (kit.detail === 'npc' ? [[edge, 0.014]] : [[edge, 0.014], [inner, 0.006]]) as Array<[THREE.Vector3[], number]>) {      // хар хөвөө + дотор талын нарийн шугам (npc: зөвхөн хөвөө)
      const tube = noOut(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), kit.tq(48, 10), rad, kit.tq(6, 3)), ink));
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

/**
 * Алчуур (R4, эмэгтэйчүүд): толгойд наалдсан нимгэн даавуу — орой, ар, хажуу, духны дээд хэсэг; дух, нүүр ил; араар (back)
 * эсвэл эрүүн доогуур (chin) зангидсан. thick — өвлийн зузаан алчуур (эсгий). Геометр толгойн төвөөс (бэхэн хүрээ зөв томорно).
 */
function scarfHat(name: 'scarf' | 'shawl', thick: boolean): HatBuilder {
  return (spec, kit, hy) => {
    const L = spec.hats[name], { width: hw, height: hh } = spec.headShape;
    const R = profileRadius(headProfile(spec.headShape));
    const hat = new THREE.Group();
    hat.name = 'hat:' + name;
    const cloth = thick ? felt(L.color, true) : silk(L.color, true), trim = smooth(darken(L.color, thick ? 0.7 : 0.82));
    // толгойд наалдсан: үсний бүрхүүлээс (≈1.6–2.6 см) бага зэрэг гадна; ар тал руугаа арай зузаан
    const FRONT = 2.3, TOP = 0.262, BROW = 0.17;
    const off = (d: number): number => (thick ? 0.045 : 0.03) + 0.008 * Math.max(0, Math.cos(d));
    // доод ирмэг: ар талд шил хүртэл, урд руугаа чамархай хүртэл өгсөнө (chin — эрүүн доогуур)
    const low = (d: number): number => {
      const t = (Math.abs(d) / FRONT) ** 1.5;
      return L.knot === 'chin' ? -0.3 : -0.2 + t * 0.24;   // ар: шил; урд: чамархай (хацар ил)
    };
    const at = (d: number, y: number): THREE.Vector3 => {   // толгойн төвөөс (хүрээ толгойн төвөөр томорно)
      const r = Math.max(R(y), y < 0 ? 0.2 : 0) + off(d), phi = Math.PI + d;
      return new THREE.Vector3(r * Math.sin(phi) * hw, y * hh, r * Math.cos(phi) * hw);
    };
    const NU = kit.q(40, 12), NV = kit.q(14, 6), pos: number[] = [], uv: number[] = [], idx: number[] = [];
    // ар/хажуугийн бүрхүүл (d ∈ [−FRONT, FRONT]) + духны тууз (урд талын нарийн зурвас — дух ил)
    for (let a = 0; a <= NU; a++) {
      const d = -FRONT + (a / NU) * FRONT * 2, lo = low(d);
      for (let b = 0; b <= NV; b++) {
        const t = b / NV, p = at(d, lo + (TOP - lo) * Math.sin((t * Math.PI) / 2));
        pos.push(p.x, p.y, p.z); uv.push((a / NU) * 3, t * 2);
      }
    }
    for (let a = 0; a < NU; a++) for (let b = 0; b < NV; b++) {
      const p0 = a * (NV + 1) + b, p1 = p0 + NV + 1;
      idx.push(p0, p1, p0 + 1, p1, p1 + 1, p0 + 1);
    }
    const n0 = pos.length / 3;
    for (let a = 0; a <= NU; a++) {
      const d = FRONT + (a / NU) * 2 * (Math.PI - FRONT);   // урд талын шаантаг (FRONT … 2π − FRONT)
      for (let b = 0; b <= NV; b++) {
        const t = b / NV, p = at(d, BROW + (TOP - BROW) * t);
        pos.push(p.x, p.y, p.z); uv.push((a / NU) * 1, t * 0.6);
      }
    }
    for (let a = 0; a < NU; a++) for (let b = 0; b < NV; b++) {
      const p0 = n0 + a * (NV + 1) + b, p1 = p0 + NV + 1;
      idx.push(p0, p1, p0 + 1, p1, p1 + 1, p0 + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const shell = new THREE.Mesh(geo, cloth);
    shell.position.y = hy; shell.castShadow = true;
    if (!thick) noOut(shell);   // нимгэн даавуу: бэхэн хүрээ нь зузаан дуулга шиг харагдуулна
    hat.add(shell);
    // Хөвөө: духны ирмэг, хажуугийн ирмэг, доод ирмэг (нарийн)
    const edge = new THREE.Group();
    edge.position.y = hy;
    hat.add(edge);
    const rad = thick ? 0.012 : 0.006;
    kit.tube(Array.from({ length: 13 }, (_, k) => at(Math.PI + (k / 12 - 0.5) * 2 * (Math.PI - FRONT), BROW)), rad, trim, edge);
    for (const sd of [-1, 1]) kit.tube(Array.from({ length: 7 }, (_, k) => at(sd * FRONT, low(sd * FRONT) + (BROW - low(sd * FRONT)) * (k / 6))), rad, trim, edge);
    kit.tube(Array.from({ length: 21 }, (_, k) => { const d = -FRONT + (k / 20) * FRONT * 2; return at(d, low(d)); }), rad, trim, edge);
    // Зангилаа ба хоёр үзүүр
    const knot = L.knot === 'chin' ? new THREE.Vector3(0, -0.33 * hh, 0.15 * hw) : at(0, -0.17);
    noOut(kit.sball(thick ? 0.045 : 0.032, cloth, knot.x, knot.y, knot.z, edge)).scale.set(1.3, 0.8, 0.7);
    for (const sx of [-1, 1]) {
      const tail = noOut(kit.lathe([[0.004, -0.15], [0.026, -0.1], [0.022, 0]], 0.3, cloth, knot.x + sx * 0.03, knot.y - 0.01, knot.z + (L.knot === 'chin' ? 0.01 : -0.012), edge, { rows: 6 }));
      tail.rotation.z = sx * 0.3;
    }
    return hat;
  };
}

/**
 * Өвлийн зузаан алчуур (shawl): толгойн хэлбэрийг дагасан бөөрөнхий, зөөлөн бүрхүүл — нүүрний нээлт зууван (эрүүнээс
 * дух хүртэл), эрүүн доогуур бүтэн ороож, эрүүн доор зангидсан. Геометр толгойн төвөөс; ирмэг нь зөөлөн зузаан хоолой.
 */
function shawl(spec: CharacterSpec, kit: Kit, hy: number): THREE.Group {
  const L = spec.hats.shawl, { width: hw, height: hh } = spec.headShape;
  const R = profileRadius(headProfile(spec.headShape));
  const hat = new THREE.Group();
  hat.name = 'hat:shawl';
  const cloth = felt(L.color, true), rim = smooth(lighten(L.color, 0.12));
  // нүүрний зууван нээлт: төв YC, хагас өндөр RY, урдаас хэмжсэн хагас өнцөг A0 (хацар ил)
  const YC = -0.03, RY = 0.215, A0 = 0.78, TOP = 0.262, LOW = -0.36, OFF = 0.045;
  const open = (y: number): number => { const t = (y - YC) / RY; return Math.abs(t) >= 1 ? 0 : A0 * Math.sqrt(1 - t * t); };
  const at = (d: number, y: number, extra = 0): THREE.Vector3 => {
    // эрүүнээс доош хүзүүг тойрч зөөлөн бөөрөнхий (хүзүүнд наалдахгүй)
    const neck = y < -0.2 ? 0.2 + 0.06 * Math.min(1, (-0.2 - y) / 0.12) : 0;
    const r = Math.max(R(y), neck) + OFF + extra, phi = Math.PI + d;
    return new THREE.Vector3(r * Math.sin(phi) * hw, y * hh, r * Math.cos(phi) * hw);
  };
  const NU = kit.q(44, 14), NV = kit.q(18, 7), pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let b = 0; b <= NV; b++) {
    const t = b / NV, y = LOW + (TOP - LOW) * (1 - Math.cos((t * Math.PI) / 2));   // орой руугаа нягт
    const span = Math.PI - open(y);
    for (let a = 0; a <= NU; a++) {
      const p = at(-span + (a / NU) * span * 2, y);
      pos.push(p.x, p.y, p.z); uv.push((a / NU) * 3, t * 2);
    }
  }
  for (let b = 0; b < NV; b++) for (let a = 0; a < NU; a++) {
    const p0 = b * (NU + 1) + a, p1 = p0 + NU + 1;
    idx.push(p0, p0 + 1, p1, p0 + 1, p1 + 1, p1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const shell = new THREE.Mesh(geo, cloth);
  shell.position.y = hy; shell.castShadow = true;
  hat.add(shell);
  const g = new THREE.Group();
  g.position.y = hy;
  hat.add(g);
  // нүүрийг тойрсон зөөлөн зузаан ирмэг (зууван гогцоо) ба доод ирмэг
  const ring: THREE.Vector3[] = [];
  for (let k = 0; k <= 12; k++) { const y = YC - RY + (2 * RY * k) / 12; ring.push(at(Math.PI - open(y), y, 0.012)); }        // нэг тал: доороос дээш
  for (let k = 12; k >= 0; k--) { const y = YC - RY + (2 * RY * k) / 12; ring.push(at(-(Math.PI - open(y)), y, 0.012)); }   // нөгөө тал: дээрээс доош
  kit.tube(ring, 0.026, rim, g, 0.5);
  kit.tube(Array.from({ length: 25 }, (_, k) => at(-Math.PI + (k / 24) * Math.PI * 2, LOW, 0.004)), 0.02, rim, g, 0.5);
  // эрүүн доорх зангилаа, хоёр богино үзүүр
  const knot = at(Math.PI, YC - RY - 0.06, 0.03);
  noOut(kit.sball(0.05, cloth, knot.x, knot.y, knot.z, g)).scale.set(1.2, 0.85, 0.85);
  for (const sx of [-1, 1]) {
    const tail = noOut(kit.lathe([[0.004, -0.13], [0.03, -0.09], [0.026, 0]], 0.35, cloth, knot.x + sx * 0.035, knot.y - 0.01, knot.z + 0.01, g, { rows: 6 }));
    tail.rotation.z = sx * 0.25;
  }
  return hat;
}

/** Охидын тууз: духны дээгүүр толгойг тойрсон тууз, хажуудаа зангидсан нум */
function ribbon(spec: CharacterSpec, kit: Kit, hy: number): THREE.Group {
  const { width: hw, height: hh } = spec.headShape, R = profileRadius(headProfile(spec.headShape));
  const hat = new THREE.Group();
  hat.name = 'hat:ribbon';
  const m = smooth(spec.hats.ribbon.color), y0 = 0.12;
  const band = kit.lathe([[R(y0 - 0.025) + 0.018, -0.025 * hh], [R(y0 + 0.025) + 0.018, 0.025 * hh]], 1, m, 0, hy + y0 * hh, 0, hat, { segs: 32 });
  band.scale.x = hw; band.scale.z = hw;
  const bx = -(R(y0) + 0.02) * hw * 0.72, bz = -(R(y0) + 0.02) * hw * 0.72, by = hy + y0 * hh;   // нум: зүүн хойд талд
  for (const s of [-1, 1]) noOut(kit.sball(0.05, m, bx + s * 0.045, by + 0.02, bz - s * 0.045, hat)).scale.set(1, 0.6, 0.45);
  noOut(kit.sball(0.022, m, bx, by, bz, hat));
  return hat;
}

export type HatBuilder = (spec: CharacterSpec, kit: Kit, hy: number) => THREE.Group;
/** Бүртгэлийн дараалал = угсрах дараалал (тоглогчийнх toortsog, fox) */
export const HATS: Readonly<Record<CharacterHat, HatBuilder>> = { toortsog, fox, scarf: scarfHat('scarf', false), shawl, ribbon };
