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

export type Action = 'stand' | 'walk' | 'graze' | 'lie' | 'browse' | 'trot' | 'gallop' | 'run' | 'stalk' | 'bark' | 'howl' | 'catch';
const KEYS = ['walk', 'trot', 'gallop', 'run', 'stalk', 'graze', 'lie', 'browse', 'bark', 'howl', 'catch'] as const;
type Weights = Record<(typeof KEYS)[number], number>;

export interface LegNode { g: THREE.Group; up: THREE.Group; knee: THREE.Group; low: THREE.Group; sx: number }
/** Мал бүрийн хөдөлгөөний төлөв (sim-д хадгалагдахгүй) */
export interface PoseState {
  ph: number; t: number;
  c: Weights; pg: Record<string, number>;
  stepU: number; stepT: number; stepV: number;
  brOn: boolean; brT: number;
}
export interface Rig {
  species: LookSpecies; look: SpeciesLook;
  root: THREE.Group; body: THREE.Group; shape: THREE.Group; neck: THREE.Group; head: THREE.Group; tail: THREE.Group; legs: LegNode[];
  /** хормой (shape-ийн хүүхэд), эмээл (body-ийн хүүхэд) */
  skirt: THREE.Group; saddle: THREE.Group;
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
  /** эмээлтэй (унаа морь) */
  saddled?: boolean;
}

const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
export const newState = (): PoseState => ({ ph: Math.random() * 6, t: Math.random() * 40, c: { walk: 0, trot: 0, gallop: 0, run: 0, stalk: 0, graze: 0, lie: 0, browse: 0, bark: 0, howl: 0, catch: 0 }, pg: {}, stepU: -2, stepT: 0, stepV: 0, brOn: false, brT: rnd(5, 9) });

const group = (parent: THREE.Object3D | null, x = 0, y = 0, z = 0): THREE.Group => { const g = new THREE.Group(); g.position.set(x, y, z); parent?.add(g); return g; };

export function makeRig(species: LookSpecies): Rig {
  const look = animalLook.species[species], d = look.d;
  const root = new THREE.Group(), body = group(root), shape = group(body, 0, d.bodyY, 0), neck = group(body, ...d.neckAt), head = group(neck, ...d.headAt);
  const legs = ([[1, 1], [-1, 1], [1, -1], [-1, -1]] as const).map(([sx, sz]): LegNode => {
    const g = group(body, sx * d.legX, d.legY, sz * d.legZ), up = group(g), knee = group(g), low = group(knee);
    return { g, up, knee, low, sx };
  });
  const tail = group(body, ...d.tailAt), skirt = group(shape), saddle = group(body);
  return { species, look, root, body, shape, neck, head, tail, legs, skirt, saddle, st: newState() };
}

/** Төрөл бүрийн боломжит үйлдэл (data: species.actions; байхгүй бол туурайтан) */
export function actionsOf(look: SpeciesLook): string[] {
  return look.actions ?? ['stand', 'walk', 'graze', 'lie', ...(look.motion.browse ? ['browse'] : []), ...(look.motion.gaits ? ['trot', 'gallop'] : [])];
}
/** Боломжгүй үйлдлийг ойр байгаагаар сольно (жишээ нь нохойд graze → stand, ямаанд gallop → walk) */
export function fitAction(look: SpeciesLook, action: Action): Action {
  const acts = actionsOf(look);
  if (action === 'browse' && !look.motion.browse) action = 'graze';
  if (acts.includes(action)) return action;
  if (action === 'trot' || action === 'gallop' || action === 'run' || action === 'stalk') {
    if (action !== 'stalk' && action !== 'gallop' && acts.includes('run')) return 'run';
    if (action === 'run' && acts.includes('gallop')) return 'gallop';
    if (action === 'gallop' && acts.includes('run')) return 'run';
    if (action === 'trot' && acts.includes('gallop')) return 'trot';
    return acts.includes('walk') ? 'walk' : 'stand';
  }
  return action === 'browse' || action === 'graze' ? (acts.includes('graze') ? 'graze' : 'stand') : 'stand';
}

/** Газар дээрх хурдаар явдал сонгоно (адуу: алхах, хатирах, давхих; нохой, чоно: алхах, гүйх). Хурдны завсар = ойрын хоёр жишиг хурдны дундаж */
export function gaitFor(look: SpeciesLook, speed: number): Action {
  const sp = look.motion.speeds;
  if (!look.motion.gaits || !sp) return speed > 0.3 ? 'walk' : 'stand';
  if (speed <= 0.3) return 'stand';
  const g = Object.entries(sp).filter(([k]) => k !== 'stalk').sort((a, b) => a[1] - b[1]);
  for (let i = 0; i < g.length - 1; i++) if (speed <= (g[i]![1] + g[i + 1]![1]) / 2) return g[i]![0] as Action;
  return g[g.length - 1]![0] as Action;
}

/** Хөдөлгөөнийг rig-д тавина (dt = бодит секунд). Дараа нь rig.root.updateMatrixWorld(true) */
export function poseAnimal(S: Rig, dt0: number, o: PoseInput): void {
  const dt = dt0 > 0 ? Math.min(dt0, 0.25) : 0;   // сөрөг/том dt үйлдлийн жинг тархааж болохгүй
  const d = S.look.d, mo = S.look.motion, M = animalLook.motion, A_ = animalLook.age, st = S.st, c = st.c, k = 1 - Math.exp(-dt * 5);
  const action = fitAction(S.look, o.action);
  if (mo.browse && dt > 0) { st.brT -= dt; if (st.brT < 0) { st.brOn = !st.brOn; st.brT = st.brOn ? rnd(4, 7) : rnd(6, 12); } }   // бэлчих дундаа үе үе бут зулгаана
  for (const key of KEYS) {
    let t = key === action && key !== 'graze' && key !== 'browse' ? 1 : 0;
    if (key === 'browse' && (action === 'browse' || (action === 'graze' && mo.browse && st.brOn))) t = 1;
    else if (key === 'graze' && action === 'graze' && !(mo.browse && st.brOn)) t = 1;
    c[key] += (t - c[key]) * k;
  }
  st.t += dt;
  const lie = c.lie, mv = (c.walk + c.trot + c.gallop + c.run + c.stalk) * (1 - lie), bark = c.bark * (1 - lie), howl = c.howl * (1 - lie);
  const stk = c.stalk * (1 - lie), cat = c.catch * (1 - lie), gz = c.graze * (1 - lie), br = c.browse * (1 - lie);
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
  /* Явдал (адуу, нохой, чоно): явдал бүр өөрийн фаз; хөл бүрийн өнцөг, өвдөгний нугаралт, биеийн хэлбэлзлийг жингээр нь нийлүүлнэ.
   * Давтамж газар дээрх хурдтай уялдана (hz × хурд / жишиг хурд) */
  let gAng: number[] | null = null, gKnee: number[] | null = null;
  const gSt = [0, 0, 0, 0];
  let gBob = 0, gRock = 0, gNod = 0;
  if (mo.gaits) {
    gAng = [0, 0, 0, 0]; gKnee = [0, 0, 0, 0];
    for (const [gk, G] of Object.entries(mo.gaits)) {
      const w = (c[gk as keyof Weights] ?? 0) * (1 - lie), ref = mo.speeds?.[gk] ?? 0;
      st.pg[gk] = (st.pg[gk] ?? Math.random()) + dt * G.hz * (ref > 0 && o.speed > 0.05 ? Math.min(1.8, Math.max(0.4, o.speed / ref)) : 1);
      if (w < 0.002) continue;
      const P = st.pg[gk]! * Math.PI * 2;
      for (let i = 0; i < 4; i++) {   // фаз < duty — тулах (туурай газарт, хөл урдаас хойш), бусад — дүүжлэх (өвдөг нугарч хөл урагш)
        const ph = (((st.pg[gk]! + G.off[i]!) % 1) + 1) % 1, D = G.duty;
        if (ph < D) { gAng[i]! += w * -G.amp * Math.cos((Math.PI * ph) / D); gSt[i]! += w; }
        else { const u = (ph - D) / (1 - D); gAng[i]! += w * G.amp * Math.cos(Math.PI * u); gKnee[i]! += w * G.knee * Math.sin(Math.PI * u); }
      }
      gBob += w * G.bob * (0.5 + 0.5 * Math.cos(G.beats * P)); gRock += w * (G.rock ?? 0) * Math.sin(P); gNod += w * (G.nod ?? 0) * Math.sin(G.beats * P);
    }
  }
  const wk = [sinP, -sinP, -sinP, sinP];
  const { lu, ll } = legLens(d), hr = d.hock, hrK = hockKnee(d);
  const wkD = [Math.cos(st.ph), -Math.cos(st.ph), -Math.cos(st.ph), Math.cos(st.ph)];
  const drop = d.bodyY - d.body.R * gy - 0.02, hipLie = d.legY - drop;
  void ll; void hr;
  const lunge = cat * (0.5 + 0.5 * Math.sin(st.t * 3.2)), cr = stk * (mo.crouch ?? 0);   // барих: урагш шүүрэх; сэм дөхөх: бөхийх
  S.legs.forEach((L, i) => {
    const front = i < 2, extraG = i === 0 ? 0.3 * gz : 0, extra = extraG + (front ? (mo.browseLeg ?? 0) * br * (i === 0 ? 1 : 0.85) : 0);
    const walkAng = ((gAng ? gAng[i]! : A * wk[i]!) + stepSwing[i]!) * (1 - lie);
    L.g.position.x = L.sx * d.legX * gx;
    L.g.position.z = (front ? 1 : -1) * lz;
    // тулах үед хөл сунаж туурай газарт үлдэнэ
    const fs = front ? 1 + (frontScale - 1) * gz : 1, sy = ((legK * fs) / Math.cos(extraG)) * (1 + Math.min(1, gSt[i]!) * (1 / Math.cos(walkAng) - 1));
    L.up.scale.set(1, sy, 1); L.low.scale.set(1, sy, 1); L.knee.position.y = -lu * sy;
    /* өвдөг/шагай: урд = урагш цухуйж доод хэсэг хойш нугарна (+), хойд шагай хойш цухуйж доод хэсэг урагш нугарна (−) */
    const flex = gKnee ? gKnee[i]! : Math.max(0, -wkD[i]!) * mv * M.kneeWalk;
    let kb = front ? flex + (mo.browseKnee ?? 0) * br : hrK - flex;
    /* хэвтэх: хөл биеийн доор нугалагдана */
    const th = Math.acos(Math.min(1, Math.max(0, hipLie / (lu * legK)))), uL = front ? -th : th, lL = front ? 1.45 : -1.45;
    kb += front ? 0.9 * stk : -0.9 * stk;
    const pose = front ? -0.45 * stk - 0.95 * lunge : 0.45 * stk + 0.5 * lunge;
    if (mo.lieFront === 'forward' && front) { L.g.rotation.x = (walkAng - pitch - extra + pose) * (1 - lie) - 1.45 * lie; L.knee.rotation.x = kb * (1 - lie); }   // нохой: урд хөл урагш сунгана
    else { L.g.rotation.x = (walkAng - pitch - extra + pose + (front ? 0 : hr)) * (1 - lie) + uL * lie; L.knee.rotation.x = kb * (1 - lie) + (lL - uL) * lie; }
  });
  if (d.skirt) S.skirt.scale.y = 1 - (1 - d.skirt.lieK) * lie;       // хэвтэхэд хормой дээш шахагдана
  const lift = d.legLen * (legK - 1);
  S.body.position.y = lift * (1 - lie) - drop * lie - lz * sP + (gAng ? gBob : Math.abs(sinP) * 0.012 * mv) - cr;
  S.body.position.z = 0.16 * lunge;
  S.body.rotation.x = pitch + gRock + 0.12 * lunge;
  S.saddle.visible = !!o.saddled;
  if (d.saddle) S.saddle.position.set(0, d.bodyY + d.body.R * gy, d.saddle.z * zS);
  S.shape.scale.set(gx, gy * (1 + 0.01 * Math.sin(st.t * 2.2)), zS);
  /* Хүзүү: дэлхийн тэнхлэгээр доош/дээш, толгой хошуугаараа; зулгаах, улих, хуцах хөдөлгөөн */
  const chew = Math.sin(st.t * M.chewHz);
  const nodWalk = gAng ? gNod + (mo.gallopNeck ?? 0) * c.gallop * (1 - lie) : sinP * M.headNod * 1.33 * mv;
  S.neck.position.set(0, d.neckAt[1] - 0.03 * gz, d.neckAt[2] * zS);
  S.neck.rotation.x = d.neckRest + ((mo.stalkNeck ?? 0.12) - d.neckRest) * stk + (0.35 - d.neckRest) * cat - 0.28 * bark * Math.max(0, Math.sin(st.t * 8)) + (-1.15 - d.neckRest) * howl + (mo.neckGraze - pitch - d.neckRest) * gz + ((mo.neckBrowse ?? 0) - pitch - d.neckRest) * br + nodWalk + A_.old.neckDown * old + 0.06 * chew * gz;
  S.head.position.set(0, 0, d.headAt[2] - 0.06 * gz);
  S.head.rotation.x = Math.sin(st.t * 0.8) * M.headNod * (1 - stk) - 0.75 * howl - 0.25 * bark * Math.max(0, Math.sin(st.t * 8 + 0.6)) + 0.35 * cat * Math.max(0, Math.sin(st.t * 9)) + gz * (mo.headGraze - mo.neckGraze - d.headTilt) + br * ((mo.headBrowse ?? 0) - (mo.neckBrowse ?? 0) - d.headTilt) + A_.old.headDown * old + 0.1 * chew * gz * Math.max(0, Math.sin(st.t * 1.1));
  S.head.rotation.y = Math.sin(st.t * 1.3 + 1.7) * 0.3 * gz + Math.sin(st.t * 0.9) * 0.25 * br;
  S.head.scale.setScalar(1 + young * A_.young.headGrow);
  S.neck.scale.set(gx, 1, 1);
  S.tail.position.z = d.tailAt[2] * zS;
  S.tail.rotation.x = d.tailRaise + Math.sin(st.t * 2.4) * d.wag * (1 + mv) + (mo.gallopTail ?? 0) * c.gallop * (1 - lie) - 0.25 * bark + (d.tailStalk ?? 0.35) * stk;
  S.tail.rotation.y = Math.sin(st.t * 9) * 0.35 * bark;
  if (d.tailLong || d.tailHorse || d.tailBushy) S.tail.scale.set(1, 1, 1); else S.tail.scale.set(0.75 + 0.5 * f, 0.8 + 0.35 * f, 1);
}

/** Тайван төлөвийг шууд тавина (хол мал, кэш): үйлдлийн жин нэг дор гүйцэнэ, цаг тоологдохгүй */
export function settle(S: Rig, action: Action, o: Omit<PoseInput, 'action'>): void {
  const c = S.st.c;
  for (const k of KEYS) c[k] = 0;
  if (action === 'lie' || action === 'graze' || action === 'browse') c[action] = 1;
  poseAnimal(S, 0, { ...o, action });
  S.root.updateMatrixWorld(true);
}
