/**
 * `buildCharacter(spec)` — хэсгүүдийг (parts/*) угсарч, үе мөчний бүлгүүдийг (яс) байрлуулж, bakeSkinned хийнэ.
 * Тоглогч, туслах, сумын оршин суугч бүгд энэ нэг функцээр (docs/character-design.md §4).
 */
import * as THREE from 'three';
import { visualStyle, type OutfitBody } from '../style';
import type { Season } from '../../sim/config';
import { addOutline, bakeSkinned } from './bake';
import { EMOTIONS, type Emotion, type FacePainter } from './face';
import { makeKit } from './geom';
import { cuff, lighten, sleeve, smooth } from './materials';
import { buildArm, type Curl } from './parts/arm';
import { HATS } from './parts/hats';
import { buildHead } from './parts/head';
import { buildLeg } from './parts/leg';
import { buildBodies } from './parts/torso';
import type { CharacterSpec } from './spec';

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
  /** нүүр зурагч (амьд canvas) */
  face: FacePainter;
  anim: { phase: number; time: number; run: number; blinkT: number; blinkP: number; emo: Emotion };
}

export interface BuildOptions {
  /** нарийвчлал: 1 = үндсэн дүр, бага = олон хүн (хуваалт цөөн) */
  lod?: number;
}

/** Толгойн төв, хүзүү, бэлхүүсний өндөр (м) — нийт өндрийг R4-т ясаар масштаблана */
const HY = 2.1, NECK_Y = 1.78, WAIST_Y = 1.08;

export function buildCharacter(spec: CharacterSpec, opts: BuildOptions = {}): CharacterRig {
  const kit = makeKit(opts.lod ?? 1);
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
  for (const build of Object.values(HATS)) g.add(build(spec, kit, HY));
  const neck = new THREE.Group();          // хүзүү: толгой, малгай хамт эргэнэ
  neck.position.y = NECK_Y;
  for (const c of g.children.slice(headStart)) { neck.add(c); c.position.y -= NECK_Y; }
  g.add(neck);
  // Бэлхүүс: цээж, гар, хүзүү, уут — бүсний түвшнээс эргэнэ
  const waist = new THREE.Group();
  waist.position.y = WAIST_Y;
  for (const c of [...bodies, ...arms, neck, sack]) { waist.add(c); c.position.y -= WAIST_Y; }
  g.add(waist);

  bakeSkinned(g, [sleeveMat]);
  addOutline(g);
  const terleg = lighten(deel, spec.deel.terlegLighten);
  const rig: CharacterRig = {
    root: g, legs: [legL.hip, legR.hip], arms, knees: [legL.knee, legR.knee], neck, bodies, waist, armY: arms[0].position.y, neckY: neck.position.y,
    sleeveMat, sleeveColors: { terleg, deel, winter: deel },
    elbows: [armL.elbow, armR.elbow], elbowRest: [rest0, rest1], wrists: [armL.wrist, armR.wrist], curls: [armL.curl, armR.curl],
    face,
    anim: { phase: 0, time: 0, run: 0, blinkT: 1.5, blinkP: 1, emo: { ...EMOTIONS.neutral } },
  };
  dressCharacter(rig, 'autumn');
  return rig;
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
  showOutfit(rig.root, look.body, look.hat);
  rig.sleeveMat.color.setHex(rig.sleeveColors[look.body]);
}
