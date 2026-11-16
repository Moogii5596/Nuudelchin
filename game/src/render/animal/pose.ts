/**
 * Малын хөдөлгөөн: нэг араг (rig) — root, body, shape, neck, head, tail, 4 хөл {up, knee, low} — хоёр хувилбарт (хөнгөн,
 * дэлгэрэнгүй) нийтлэг. `poseAnimal` нь sim-ийн одоогийн төлөвөөс (үйлдэл, хурд, нас, тарга) rig-ийн булчин бүрийн эргэлт,
 * масштабыг тооцно; дараа нь node-ийн matrixWorld-ийг InstancedMesh-д өгнө (lod.ts). Лабораторийн poseAnimal-ийн батлагдсан
 * хөдөлгөөн: зогсох, алхах (өвдөг/шагай нугарна), бэлчих (хагас алхам), хэвтэх (хөл биеийн доор), ямааны бут зулгаах.
 */
import * as THREE from 'three';
import type { LookSpecies, SpeciesLook } from './config';
import { animalLook } from './config';
import { hockKnee, legLens } from './legs';

export type Action = 'stand' | 'walk' | 'graze' | 'lie' | 'browse';

export interface LegNode { g: THREE.Group; up: THREE.Group; knee: THREE.Group; low: THREE.Group; sx: number }
/** Мал бүрийн хөдөлгөөний төлөв (sim-д хадгалагдахгүй) */
export interface PoseState {
  ph: number; t: number;
  c: { walk: number; graze: number; lie: number; browse: number };
  stepU: number; stepT: number; stepV: number;
  brOn: boolean; brT: number;
}
export interface Rig {
  species: LookSpecies; look: SpeciesLook;
  root: THREE.Group; body: THREE.Group; shape: THREE.Group; neck: THREE.Group; head: THREE.Group; tail: THREE.Group; legs: LegNode[];
  st: PoseState;
}
export interface PoseInput {
  action: Action;
  /** газар дээрх хурд, м/с (бодит) — алхалтын давтамж */
  speed: number;
  /** айж гүйх (flee) — том далайц */
  fast: boolean;
  /** 0–1, насаар (root масштаб = sc); young — нярайн харьцаа */
  sc: number;
  old: boolean;
  fat: number;
  /** бэлчих үеийн хагас алхам хийхгүй (уух) */
  noStep?: boolean;
}

const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
export const newState = (): PoseState => ({ ph: Math.random() * 6, t: Math.random() * 40, c: { walk: 0, graze: 0, lie: 0, browse: 0 }, stepU: -2, stepT: 0, stepV: 0, brOn: false, brT: rnd(5, 9) });

const group = (parent: THREE.Object3D | null, x = 0, y = 0, z = 0): THREE.Group => { const g = new THREE.Group(); g.position.set(x, y, z); parent?.add(g); return g; };

export function makeRig(species: LookSpecies): Rig {
  const look = animalLook.species[species], d = look.d;
  const root = new THREE.Group(), body = group(root), shape = group(body, 0, d.bodyY, 0), neck = group(body, ...d.neckAt), head = group(neck, ...d.headAt);
  const legs = ([[1, 1], [-1, 1], [1, -1], [-1, -1]] as const).map(([sx, sz]): LegNode => {
    const g = group(body, sx * d.legX, d.legY, sz * d.legZ), up = group(g), knee = group(g), low = group(knee);
    return { g, up, knee, low, sx };
  });
  const tail = group(body, ...d.tailAt);
  return { species, look, root, body, shape, neck, head, tail, legs, st: newState() };
}

/** Хөдөлгөөнийг rig-д тавина (dt = бодит секунд). Дараа нь rig.root.updateMatrixWorld(true) */
export function poseAnimal(S: Rig, dt0: number, o: PoseInput): void {
  const dt = dt0 > 0 ? Math.min(dt0, 0.25) : 0;   // сөрөг/том dt үйлдлийн жинг тархааж болохгүй
  const d = S.look.d, mo = S.look.motion, M = animalLook.motion, A_ = animalLook.age, st = S.st, c = st.c, k = 1 - Math.exp(-dt * 5);
  const action: Action = o.action === 'browse' && !mo.browse ? 'graze' : o.action;
  if (mo.browse && dt > 0) { st.brT -= dt; if (st.brT < 0) { st.brOn = !st.brOn; st.brT = st.brOn ? rnd(4, 7) : rnd(6, 12); } }   // бэлчих дундаа үе үе бут зулгаана
  const tgt = { walk: action === 'walk' ? 1 : 0, lie: action === 'lie' ? 1 : 0, graze: 0, browse: 0 };
  if (action === 'browse' || (action === 'graze' && mo.browse && st.brOn)) tgt.browse = 1;
  else if (action === 'graze') tgt.graze = 1;
  c.walk += (tgt.walk - c.walk) * k; c.lie += (tgt.lie - c.lie) * k; c.graze += (tgt.graze - c.graze) * k; c.browse += (tgt.browse - c.browse) * k;
  st.t += dt;
  const lie = c.lie, mv = c.walk * (1 - lie), gz = c.graze * (1 - lie), br = c.browse * (1 - lie);
  // алхалтын фаз = газар дээрх хурдтай уялдсан (нэг бүтэн мөчлөг = stride м)
  st.ph += (dt * Math.PI * 2 * Math.max(0, o.speed)) / S.look.stride * Math.min(1, mv * 3);
  const sc = o.sc, young = Math.min(A_.young.max, 1 - sc), old = o.old ? 1 : 0, f = o.fat;
  const fe = f + A_.old.fat * old;
  const gx = mo.fatX[0] + mo.fatX[1] * fe, gy = mo.fatY[0] + mo.fatY[1] * fe;
  const legK = 1 + young * A_.young.legK, zS = 1 - young * A_.young.bodyShort;
  S.root.scale.setScalar(sc);

  const pG = mo.pitch * gz, pitch = pG + (mo.browsePitch ?? 0) * br, sPg = Math.sin(pG), cPg = Math.cos(pG), sP = Math.sin(pitch);
  const H = d.legY * legK, lz = d.legZ * zS;
  const frontScale = Math.max(0.45, (H * cPg - 2 * lz * sPg) / H);
  if (gz > 0.9 && st.stepU === -2) { st.stepU = -1; st.stepT = rnd(...M.stepGap); }
  st.stepV = 0;
  if (gz > 0.9 && st.stepU < 0 && !o.noStep) { st.stepT -= dt; if (st.stepT < 0) { st.stepU = 0; st.stepT = rnd(...M.stepRepeat); } }
  if (st.stepU >= 0) {
    st.stepU += dt / M.stepDur;
    if (st.stepU >= 1) st.stepU = -1; else st.stepV = M.stepLen * Math.sin(Math.PI * st.stepU);
  }
  const sw = (u0: number): number => (st.stepU >= 0 ? Math.sin(Math.PI * Math.min(1, Math.max(0, (st.stepU - u0) / 0.4))) : 0);
  const stepSwing = [-0.45 * sw(0), -0.45 * sw(0.15), -0.3 * sw(0.35), -0.3 * sw(0.5)];

  const sinP = Math.sin(st.ph), A = (o.fast ? M.fleeAmp : M.walkAmp) * mv;
  const wk = [sinP, -sinP, -sinP, sinP], wkD = [Math.cos(st.ph), -Math.cos(st.ph), -Math.cos(st.ph), Math.cos(st.ph)];
  const { lu } = legLens(d), hr = d.hock, hrK = hockKnee(d);
  const drop = d.bodyY - d.body.R * gy - 0.02, hipLie = d.legY - drop;
  S.legs.forEach((L, i) => {
    const front = i < 2, extraG = i === 0 ? 0.3 * gz : 0, extra = extraG + (front ? (mo.browseLeg ?? 0) * br * (i === 0 ? 1 : 0.85) : 0);
    const walkAng = (A * wk[i]! + stepSwing[i]!) * (1 - lie);
    L.g.position.x = L.sx * d.legX * gx;
    L.g.position.z = (front ? 1 : -1) * lz;
    const fs = front ? 1 + (frontScale - 1) * gz : 1, sy = (legK * fs) / Math.cos(extraG);
    L.up.scale.set(1, sy, 1); L.low.scale.set(1, sy, 1); L.knee.position.y = -lu * sy;
    /* өвдөг/шагай: урд = урагш цухуйж доод хэсэг хойш нугарна (+), хойд шагай хойш цухуйж доод хэсэг урагш нугарна (−) */
    const flex = Math.max(0, -wkD[i]!) * mv * M.kneeWalk;
    const kb = front ? flex + (mo.browseKnee ?? 0) * br : hrK - flex;
    /* хэвтэх: хөл биеийн доор нугалагдана — дээд хэсэг өвдөг/шагайг газарт хүргэж, доод хэсэг хэвтээ биеийн доогуур */
    const th = Math.acos(Math.min(1, Math.max(0, hipLie / (lu * legK)))), uL = front ? -th : th, lL = front ? 1.45 : -1.45;
    L.g.rotation.x = (walkAng - pitch - extra + (front ? 0 : hr)) * (1 - lie) + uL * lie;
    L.knee.rotation.x = kb * (1 - lie) + (lL - uL) * lie;
  });
  const lift = d.legLen * (legK - 1);
  S.body.position.y = lift * (1 - lie) - drop * lie - lz * sP + Math.abs(sinP) * 0.012 * mv;
  S.body.rotation.x = pitch;
  S.shape.scale.set(gx, gy * (1 + 0.01 * Math.sin(st.t * 2.2)), zS);
  /* Хүзүү: дэлхийн тэнхлэгээр доош/дээш, толгой хошуугаараа; зулгаах хөдөлгөөн */
  const chew = Math.sin(st.t * M.chewHz), nodWalk = sinP * M.headNod * 1.33 * mv;
  S.neck.position.set(0, d.neckAt[1] - 0.03 * gz, d.neckAt[2] * zS);
  S.neck.rotation.x = d.neckRest + (mo.neckGraze - pitch - d.neckRest) * gz + ((mo.neckBrowse ?? 0) - pitch - d.neckRest) * br + nodWalk + A_.old.neckDown * old + 0.06 * chew * gz;
  S.head.position.set(0, 0, d.headAt[2] - 0.06 * gz);
  S.head.rotation.x = Math.sin(st.t * 0.8) * M.headNod + gz * (mo.headGraze - mo.neckGraze - d.headTilt) + br * ((mo.headBrowse ?? 0) - (mo.neckBrowse ?? 0) - d.headTilt) + A_.old.headDown * old + 0.1 * chew * gz * Math.max(0, Math.sin(st.t * 1.1));
  S.head.rotation.y = Math.sin(st.t * 1.3 + 1.7) * 0.3 * gz + Math.sin(st.t * 0.9) * 0.25 * br;
  S.head.scale.setScalar(1 + young * A_.young.headGrow);
  S.neck.scale.set(gx, 1, 1);
  S.tail.position.z = d.tailAt[2] * zS;
  S.tail.rotation.x = d.tailRaise + Math.sin(st.t * 2.4) * d.wag * (1 + mv);
  S.tail.scale.set(0.75 + 0.5 * f, 0.8 + 0.35 * f, 1);
}

/** Тайван төлөвийг шууд тавина (хол мал, кэш): үйлдлийн жин нэг дор гүйцэнэ, цаг тоологдохгүй */
export function settle(S: Rig, action: Action, o: Omit<PoseInput, 'action'>): void {
  const c = S.st.c;
  c.walk = 0; c.lie = action === 'lie' ? 1 : 0; c.graze = action === 'graze' ? 1 : 0; c.browse = action === 'browse' ? 1 : 0;
  poseAnimal(S, 0, { ...o, action });
  S.root.updateMatrixWorld(true);
}
