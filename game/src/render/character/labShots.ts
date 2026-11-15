/**
 * Лабораторийн тогтмол зургууд (`lab.html?shot=<нэр>`): өмнө/дараа пикселээр харьцуулахад — санамсаргүй зүйлгүй
 * (анивчих 1.5 с-ийн дараа эхэлдэг тул нийт хугацаа < 1.5 с). Дүрийн API-г дамжуулж өгнө (хуучин/шинэ хувилбар).
 */
import * as THREE from 'three';
import type { Season } from '../../sim/config';
import type { CharacterPose } from './animate';
import type { CharacterRig } from './rig';

export interface ShotApi {
  make(): CharacterRig;
  dress(rig: CharacterRig, season: Season): void;
  animate(rig: CharacterRig, pose: CharacterPose): number;
}
interface Shot { season: Season; cam: [number, number, number]; target?: [number, number, number]; pose?: Partial<CharacterPose>; frames?: number }

const STAND: CharacterPose = { dt: 1 / 60, speed: 0, mode: 'foot', raise: false, uurga: false, talk: false, emotion: 'neutral' };
export const SHOTS: Record<string, Shot> = {
  autumn: { season: 'autumn', cam: [1.3, 2.15, 3.0] },
  summer: { season: 'summer', cam: [1.3, 2.15, 3.0] },
  winter: { season: 'winter', cam: [1.3, 2.15, 3.0] },
  spring: { season: 'spring', cam: [-1.3, 2.15, 3.0] },
  back: { season: 'winter', cam: [-1.4, 2.0, -3.0] },
  face: { season: 'autumn', cam: [0.35, 2.25, 1.25], target: [0, 2.05, 0] },
  walk: { season: 'autumn', cam: [2.6, 1.8, 2.0], pose: { speed: 1.6, uurga: true }, frames: 40 },
  uurga: { season: 'autumn', cam: [1.6, 1.9, 2.2], pose: { uurga: true }, frames: 20 },
  walkFree: { season: 'autumn', cam: [2.6, 1.8, 2.0], pose: { speed: 1.6 }, frames: 40 },
  run: { season: 'summer', cam: [2.6, 1.8, 2.0], pose: { speed: 5.5 }, frames: 60 },
  mounted: { season: 'winter', cam: [1.6, 2.0, 2.6], pose: { mode: 'mounted' }, frames: 10 },
  seated: { season: 'spring', cam: [1.6, 2.0, 2.6], pose: { mode: 'seated' }, frames: 10 },
  shout: { season: 'autumn', cam: [0.8, 2.2, 2.4], pose: { raise: true, talk: true, emotion: 'happy' }, frames: 50 },
  angry: { season: 'winter', cam: [0.35, 2.25, 1.25], target: [0, 2.05, 0], pose: { emotion: 'angry', talk: true }, frames: 30 },
};

/** Лабораторийн тайз (tools/character-lab/herder.html-ийнхтэй ижил гэрэл, газар) */
export function labScene(): { scene: THREE.Scene; sun: THREE.DirectionalLight } {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fc8e8);
  scene.fog = new THREE.Fog(0x9fc8e8, 12, 34);
  scene.add(new THREE.HemisphereLight(0xdfeeff, 0x6b5a3a, 1.0));
  const sun = new THREE.DirectionalLight(0xffe2b8, 1.6);
  sun.position.set(3, 5, 4); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(14, 24), new THREE.MeshLambertMaterial({ color: 0x7fa650, flatShading: true }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);
  return { scene, sun };
}
export function labRenderer(w: number, h: number, preserve = false): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: preserve });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  return renderer;
}

export interface ShotResult { name: string; pixels: Uint8Array; calls: number; callsNoShadow: number; triangles: number }

/** Нэг зургийг шинэ тайзнаас зурж пикселийг уншина (renderer preserveDrawingBuffer: true) */
export function renderShot(api: ShotApi, name: string, renderer: THREE.WebGLRenderer): ShotResult {
  const s = SHOTS[name];
  if (!s) throw new Error(`labShots: "${name}" зураг алга`);
  const { scene } = labScene();
  const rig = api.make();
  api.dress(rig, s.season);
  scene.add(rig.root);
  const pose: CharacterPose = { ...STAND, ...s.pose };
  let bob = 0;
  for (let i = 0; i < (s.frames ?? 1); i++) bob = api.animate(rig, pose);
  rig.root.position.y = bob;
  const size = renderer.getSize(new THREE.Vector2());
  const camera = new THREE.PerspectiveCamera(32, size.x / size.y, 0.1, 200);
  camera.position.set(...s.cam);
  camera.lookAt(new THREE.Vector3(...(s.target ?? [0, 1.6, 0])));
  renderer.shadowMap.enabled = false;
  renderer.render(scene, camera);
  const callsNoShadow = renderer.info.render.calls - 1;   // газар
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);
  const gl = renderer.getContext();
  const pixels = new Uint8Array(size.x * size.y * 4);
  gl.readPixels(0, 0, size.x, size.y, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  return { name, pixels, calls: renderer.info.render.calls, callsNoShadow, triangles: renderer.info.render.triangles };
}

/** FNV-1a — пикселийн хурдан хэш */
export function hashPixels(p: Uint8Array): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < p.length; i++) { h ^= p[i]!; h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
