/**
 * `buildCharacter(spec)` — хэсгүүдийг (parts/*) угсарч, үе мөчний бүлгүүдийг (яс) байрлуулж, bakeSkinned хийнэ.
 * Тоглогч, туслах, сумын оршин суугч бүгд энэ нэг функцээр (docs/character-design.md §4).
 */
import * as THREE from 'three';
import { visualStyle, type OutfitBody } from '../style';
import type { Season } from '../../sim/config';
import { addOutline, bakeSkinned } from './bake';
import { EMOTIONS, type Emotion, type FacePainter } from './face';
import { makeKit, type Detail } from './geom';
import { cuff, lighten, sleeve, smooth } from './materials';
import { buildArm, type Curl } from './parts/arm';
import { HATS } from './parts/hats';
import { buildHead } from './parts/head';
import { buildLeg } from './parts/leg';
import { buildBodies } from './parts/torso';
import { characters, CHARACTER_HATS, type CharacterHat, type CharacterSpec, type Figure } from './spec';

/** [зүүн, баруун] */
export type Pair<T> = [T, T];

export interface CharacterRig {
  root: THREE.Group;
  legs: Pair<THREE.Group>;
  arms: Pair<THREE.Group>;
  knees: Pair<THREE.Group>;
  elbows: Pair<THREE.Group>;
  wrists: Pair<THREE.Group>;
  neck: THREE.Group;
  waist: THREE.Group;
  bodies: THREE.Group[];
  curls: Pair<Curl>;
  elbowRest: Pair<number>;
  armY: number;
  neckY: number;
  sleeveMat: THREE.MeshLambertMaterial;
  sleeveColors: Record<OutfitBody, number>;
  /** цээжний өргөн (анимацийн амьсгал үүнийг үржүүлнэ) */
  build: number;
  /** нүүр зурагч (амьд canvas эсвэл атлас) */
  face: FacePainter;
  /** улирал бүрийн толгойн өмсгөл */
  wear: Record<Season, CharacterHat | 'none'>;
  anim: { phase: number; time: number; run: number; blinkT: number; blinkP: number; emo: Emotion };
}

export interface BuildOptions {
  /** full — тоглогч; npc — туслах, ойрын NPC (characters.json detail.npc: хуваалт, сүүдэр, атлас нүүр, бээлий гар) */
  detail?: Detail;
  /** нарийвчлал (хуваалтын харьцаа); байхгүй бол full = 1, npc = detail.npc.lod. Олон хүн (crowd) өөрөө өгнө */
  lod?: number;
  /** өмсгөлөөс (wear) гадна заавал угсрах малгай (олон хүний тогтмол төрх) */
  hats?: readonly CharacterHat[];
}

/** Толгойн төв, хүзүү, бэлхүүсний өндөр (м) — нийт өндрийг R4-т ясаар масштаблана */
const HY = 2.1, NECK_Y = 1.78, WAIST_Y = 1.08;

export function buildCharacter(spec: CharacterSpec, opts: BuildOptions = {}): CharacterRig {
  const detail = opts.detail ?? 'full', npc = characters.detail.npc;
  const kit = makeKit(opts.lod ?? (detail === 'npc' ? npc.lod : 1), detail);
  const g = new THREE.Group();
  const sack = kit.box(0.5, 0.6, 0.3, spec.props.sack, 0, 1.35, -0.42, g);
  sack.name = 'sack'; sack.visible = false;

  const legL = buildLeg(spec, kit, -0.15);
  g.add(legL.hip);
  const legR = buildLeg(spec, kit, 0.15);
  g.add(legR.hip);
  const bodies = buildBodies(spec, kit, g);

  const deel = spec.deel.color;
  const sleeveMat = sleeve(deel), cuffMat = cuff(spec.deel.hem);
  const [rest0, rest1] = spec.pose.elbowRest;
  const armL = buildArm(spec, kit, -1, rest0, sleeveMat, cuffMat);
  g.add(armL.shoulder);
  const armR = buildArm(spec, kit, 1, rest1, sleeveMat, cuffMat);
  g.add(armR.shoulder);
  const arms: Pair<THREE.Group> = [armL.shoulder, armR.shoulder];

  const uurga = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 2.0, 10), smooth(spec.props.uurga));
  uurga.name = 'uurga';
  uurga.position.set(-0.024, -0.126, 0.55);   // иш алганд тулж, атгасан хуруунуудын яг дотуур
  uurga.rotation.x = Math.PI / 2;             // бугуйн тэнхлэгт перпендикуляр, урагш чиглэсэн
  uurga.castShadow = true;
  uurga.visible = false;
  armR.wrist.add(uurga);

  const headStart = g.children.length;   // эндээс хойш нэмэгдсэн бүхэн (толгой, малгай) хүзүүний бүлэгт орно
  const face = buildHead(spec, kit, g, HY);
  const wear = wearOf(spec);
  const { width: hw, height: hh } = spec.headShape;
  for (const name of CHARACTER_HATS) {
    if (!Object.values(wear).includes(name) && !opts.hats?.includes(name)) continue;   // зөвхөн өмсдөг (эсвэл заасан) малгайгаа угсарна
    const hat = HATS[name](spec, kit, HY);
    if ((name === 'toortsog' || name === 'fox') && (hw !== 1 || hh !== 1)) {
      // толгойн хэлбэрт: толгойн төвөөр жигд масштаблаж, оройд нь суулгана (алчуур, тууз хэлбэрээ өөрөө дагана)
      const fit = new THREE.Group();
      fit.scale.setScalar(hw);
      fit.position.y = HY * (1 - hw) + 0.26 * (hh - hw);
      fit.add(hat);
      g.add(fit);
    } else g.add(hat);
  }
  const neck = new THREE.Group();          // хүзүү: толгой, малгай хамт эргэнэ
  neck.position.y = NECK_Y;
  for (const c of g.children.slice(headStart)) { neck.add(c); c.position.y -= NECK_Y; }
  g.add(neck);
  // Бэлхүүс: цээж, гар, хүзүү, уут — бүсний түвшнээс эргэнэ
  const waist = new THREE.Group();
  waist.position.y = WAIST_Y;
  for (const c of [...bodies, ...arms, neck, sack]) { waist.add(c); c.position.y -= WAIST_Y; }
  g.add(waist);
  applyFigure(spec.figure, g, { hips: [legL.hip, legR.hip], uppers: bodies, arms, neck, sack });

  bakeSkinned(g, detail === 'npc' ? { liveMats: [sleeveMat], mergeByName: true, doubleSided: true, shadowParts: npc.shadowParts } : { liveMats: [sleeveMat] });
  addOutline(g);
  const terleg = lighten(deel, spec.deel.terlegLighten);
  const rig: CharacterRig = {
    root: g, legs: [legL.hip, legR.hip], arms, knees: [legL.knee, legR.knee], neck, bodies, waist, armY: arms[0].position.y, neckY: neck.position.y,
    sleeveMat, sleeveColors: { terleg, deel, winter: deel },
    elbows: [armL.elbow, armR.elbow], elbowRest: [rest0, rest1], wrists: [armL.wrist, armR.wrist], curls: [armL.curl, armR.curl],
    face, build: spec.figure.build, wear,
    anim: { phase: 0, time: 0, run: 0, blinkT: 1.5, blinkP: 1, emo: { ...EMOTIONS.neutral } },
  };
  dressCharacter(rig, 'autumn');
  return rig;
}

const HIP_Y = 0.85;
/**
 * Бие галбир (R4): угсарсан дүрийн бүлгүүдийг (яс) bake-ээс өмнө масштаблана — геометр, анимац өөрчлөгдөхгүй.
 * Утга нь 1/0 бол юу ч хийхгүй (тоглогч пикселээр хэвээр). Дараалал: хөл → өргөн → толгой → бөгтөр → нийт өндөр.
 */
function applyFigure(f: Figure, g: THREE.Group, p: { hips: THREE.Group[]; uppers: THREE.Group[]; arms: THREE.Group[]; neck: THREE.Group; sack: THREE.Object3D }): void {
  const above = g.children.filter((c) => !p.hips.includes(c as THREE.Group));   // ташаанаас дээш (хормой, бэлхүүс)
  if (f.legs !== 1) {
    for (const h of p.hips) { h.scale.setScalar(f.legs); h.position.y = HIP_Y * f.legs; }
    for (const c of above) c.position.y -= HIP_Y * (1 - f.legs);
  }
  if (f.build !== 1) {
    for (const c of [...above.filter((c) => c.name.startsWith('body:')), ...p.uppers]) { c.scale.x *= f.build; c.scale.z *= f.build; }
    for (const c of [...p.arms, ...p.hips]) c.position.x *= f.build;
  }
  if (f.head !== 1) p.neck.scale.setScalar(f.head);
  if (f.hunch !== 0) {   // цээж бэлхүүсээр урагш хазайна; гар, хүзүү байрлалаараа дагана, толгой босоо хэвээр
    const X = new THREE.Vector3(1, 0, 0);
    for (const c of [...p.uppers, ...p.arms, p.neck, p.sack]) c.position.applyAxisAngle(X, f.hunch);
    for (const c of [...p.uppers, p.sack]) c.rotation.x += f.hunch;
  }
  if (f.stature !== 1) for (const c of g.children) { c.position.multiplyScalar(f.stature); c.scale.multiplyScalar(f.stature); }
}

/** Улирал бүрийн толгойн өмсгөл: spec.wear эсвэл visuals.json outfits.seasons */
export function wearOf(spec: CharacterSpec): Record<Season, CharacterHat | 'none'> {
  if (spec.wear) return spec.wear;
  const S = visualStyle.outfits.seasons;
  return { summer: S.summer.hat, autumn: S.autumn.hat, winter: S.winter.hat, spring: S.spring.hat };
}

/** Давхаргуудыг харуулна: body — биеийн хувилбар, hat — малгайн нэр эсвэл 'none' */
export function showOutfit(root: THREE.Object3D, body: OutfitBody, hat: string): void {
  root.traverse((child) => {
    const [kind, id] = child.name.split(':');
    if (kind === 'body') child.visible = id === body;
    else if (kind === 'hat') child.visible = id === hat;
  });
}

/** Улирлын хувцас (`visuals.json` outfits.seasons) */
export function dressCharacter(rig: CharacterRig, season: Season): void {
  const look = visualStyle.outfits.seasons[season];
  showOutfit(rig.root, look.body, rig.wear[season]);
  rig.sleeveMat.color.setHex(rig.sleeveColors[look.body]);
}
