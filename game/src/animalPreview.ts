/**
 * Хөгжүүлэлтийн хуудас (зөвхөн dev): render/animal/ загварыг цэвэр дэвсгэр дээр шалгана — /animal-preview.html
 * Параметр: ?sp=cow,horse&action=graze&male=1&age=4&view=side|front|top&detail=1&saddle=1&n=1&speed=1.2
 */
import * as THREE from 'three';
import { LOOK_SPECIES, type LookSpecies } from './render/animal/config';
import { ModelAnimals, type Placed } from './render/animal/view';
import type { Action } from './render/animal/pose';

const q = new URLSearchParams(location.search);
const species = (q.get('sp') ?? 'sheep,goat,cow,horse,dog,wolf').split(',').filter((s): s is LookSpecies => (LOOK_SPECIES as readonly string[]).includes(s));
const action = (q.get('action') ?? 'stand') as Action, male = q.get('male') !== '0', age = Number(q.get('age') ?? 4), view = q.get('view') ?? 'side';
const detail = q.get('detail') !== '0', saddled = q.get('saddle') === '1', speed = Number(q.get('speed') ?? 0), fat = Number(q.get('fat') ?? 0.6), mark = q.get('mark') === '1';
const sc = Number(q.get('sc') ?? (age >= 4 ? 1 : [0.5, 0.72, 0.86, 0.95, 1][Math.max(0, age)]!)), n = Number(q.get('n') ?? 1), idBase = Number(q.get('id') ?? 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(1); renderer.setSize(innerWidth, innerHeight); renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xaec6d4);
const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48), new THREE.MeshLambertMaterial({ color: 0x7fa650 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x6a7a4a, 1.1));
const sun = new THREE.DirectionalLight(0xffe2b8, 1.8); sun.position.set(6, 10, 8); sun.castShadow = true; scene.add(sun);
const group = new THREE.Group(); scene.add(group);
const view3 = new ModelAnimals(group, (q.get('q') as 'low' | 'mid' | 'high') ?? 'high');
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 200);
const span = species.length * 2.6 + (n - 1) * 2.2;
const cx = 0, tgt = new THREE.Vector3(cx, 0.55, 0), d = Math.max(4.2, span * 1.15);
camera.position.set(view === 'front' ? 0.01 : view === 'top' ? 0 : 0, view === 'top' ? d : 1.1 + d * 0.12, view === 'front' ? d : view === 'top' ? 0.01 : d);
if (view === 'side') camera.position.set(0.0001, 1.2 + d * 0.1, d);
camera.lookAt(tgt);

let t0 = performance.now();
function frame(): void {
  const now = performance.now(), dt = (now - t0) / 1000; t0 = now;
  let i = 0;
  const total = species.length * n;
  for (const sp of species) for (let k = 0; k < n; k++, i++) {
    const p: Placed = {
      id: idBase + k * 5, species: sp, male, age, old: age >= 6, sc, fat, mark, action, speed, fast: q.get('fast') === '1', saddled,
      x: (i - (total - 1) / 2) * 2.6, y: 0, z: 0, heading: view === 'front' ? 0 : Math.PI / 2 * (q.get('flip') === '1' ? -1 : 1), dist: detail ? 1 : 100,
    };
    view3.add(p);
  }
  view3.flush(dt, 200);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();
(window as unknown as { __ready: boolean }).__ready = true;
