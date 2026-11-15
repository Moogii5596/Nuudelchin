/**
 * Дүрийн лаборатори (V4.5 R6, `game/lab.html`, зөвхөн dev — build-д орохгүй): тоглоомын `render/character/*`-ийг
 * шууд импортолно — «лабораторид засаад хуулах» алхамгүй, нэг эх сурвалж. Preset, дээлийн өнгө, улирал, малгай,
 * сэтгэл хөдлөл, хөдөлгөөний самбартай. `?shot=<нэр>` — тогтмол зураг (өмнө/дараа пикселээр харьцуулах, labShots.ts).
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Season } from '../../sim/config';
import type { HerderEmotion, OutfitBody } from '../style';
import { animateCharacter, type CharacterPose } from './animate';
import { makeCrowdParts } from './crowd';
import { EMOTIONS } from './face';
import { css, libraryStats } from './materials';
import { buildCharacter, dressCharacter, showOutfit, type CharacterRig } from './rig';
import { characters, characterSpec, OUTFIT_BODIES, OUTFIT_HATS, withColors } from './spec';
import { hashPixels, labRenderer, labScene, renderShot, SHOTS } from './labShots';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const params = new URLSearchParams(location.search);
const shot = params.get('shot');

if (shot) {
  // Тогтмол зураг: 640×480, нэг кадр; үр дүн window.__shot ба #out-д
  const renderer = labRenderer(640, 480, true);
  document.body.appendChild(renderer.domElement);
  const api = { make: () => buildCharacter(characterSpec(params.get('preset') ?? 'player')), dress: dressCharacter, animate: animateCharacter };
  const r = renderShot(api, shot, renderer);
  const info = { name: r.name, hash: hashPixels(r.pixels), calls: r.calls, callsNoShadow: r.callsNoShadow, triangles: r.triangles };
  (window as unknown as { __shot: unknown }).__shot = info;
  $('out').textContent = JSON.stringify(info);
} else {
  startLab();
}

function startLab(): void {
  $('panel').hidden = false;
  const renderer = labRenderer(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  $('wrap').appendChild(renderer.domElement);
  const { scene } = labScene();
  const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(1.3, 2.15, 3.0);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.6, 0);
  controls.enableDamping = true;
  controls.minDistance = 1.5; controls.maxDistance = 12;

  // --- самбар ---
  const presetSel = $<HTMLSelectElement>('preset'), seasonSel = $<HTMLSelectElement>('season');
  const bodySel = $<HTMLSelectElement>('body'), hatSel = $<HTMLSelectElement>('hat'), emoSel = $<HTMLSelectElement>('emo');
  const modeSel = $<HTMLSelectElement>('mode'), speed = $<HTMLInputElement>('speed'), deelIn = $<HTMLInputElement>('deel'), hemIn = $<HTMLInputElement>('hem');
  const opt = (sel: HTMLSelectElement, values: readonly string[]): void => { for (const v of values) sel.add(new Option(v, v)); };
  opt(presetSel, ['player', ...Object.keys(characters.presets)]);
  opt(bodySel, OUTFIT_BODIES); opt(hatSel, [...OUTFIT_HATS, 'none']); opt(emoSel, Object.keys(EMOTIONS));
  for (const s of Object.keys(SHOTS)) $<HTMLSelectElement>('shots').add(new Option(s, s));
  const checked = (id: string): boolean => $<HTMLInputElement>(id).checked;

  let rig: CharacterRig | null = null;
  let crowd: THREE.Group | null = null;
  const resetColors = (): void => {
    const s = characterSpec(presetSel.value);
    deelIn.value = css(s.deel.color); hemIn.value = css(s.deel.hem);
  };
  const colors = (): { deel: number; hem: number; hat: number } => ({ deel: parseInt(deelIn.value.slice(1), 16), hem: parseInt(hemIn.value.slice(1), 16), hat: 0 });
  const rebuild = (): void => {
    for (const o of [rig?.root, crowd]) if (o) scene.remove(o);
    rig = null; crowd = null;
    if (checked('crowd')) {
      // `crowd` нарийвчлал: хөдөлгөөнгүй, нэгтгэсэн хэсгүүд (сумын оршин суугч)
      const parts = makeCrowdParts({ colors: colors(), body: bodySel.value as OutfitBody, hat: hatSel.value, preset: presetSel.value === 'player' ? 'man' : presetSel.value });
      crowd = new THREE.Group();
      for (const p of parts) { const m = new THREE.Mesh(p.geometry, p.material); m.castShadow = p.castShadow; crowd.add(m); }
      scene.add(crowd);
    } else {
      rig = buildCharacter(withColors(characterSpec(presetSel.value), colors()));
      scene.add(rig.root);
      dress();
    }
  };
  const dress = (): void => {
    if (!rig) { rebuild(); return; }
    if (seasonSel.value === 'manual') {
      showOutfit(rig.root, bodySel.value as OutfitBody, hatSel.value);
      rig.sleeveMat.color.setHex(rig.sleeveColors[bodySel.value as OutfitBody]);
    } else dressCharacter(rig, seasonSel.value as Season);
  };
  presetSel.onchange = () => { resetColors(); rebuild(); };
  deelIn.oninput = hemIn.oninput = rebuild;
  $('crowd').onchange = rebuild;
  seasonSel.onchange = bodySel.onchange = hatSel.onchange = () => { if (crowd) rebuild(); else dress(); };
  $('shots').onchange = (e) => { const v = (e.target as HTMLSelectElement).value; if (v) location.search = `?shot=${v}&preset=${presetSel.value}`; };
  resetColors();
  rebuild();

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  const clock = new THREE.Clock();
  const stats = $('stats');
  let frame = 0;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (rig) {
      const pose: CharacterPose = {
        dt, speed: modeSel.value === 'foot' ? Number(speed.value) : 0, mode: modeSel.value as CharacterPose['mode'],
        raise: checked('raise'), uurga: checked('uurga'), talk: checked('talk'), emotion: emoSel.value as HerderEmotion,
      };
      rig.root.position.y = animateCharacter(rig, pose);
      rig.root.getObjectByName('uurga')!.visible = pose.uurga;
    }
    controls.update();
    renderer.render(scene, camera);
    if (++frame % 30 === 0) {
      const i = renderer.info, lib = libraryStats();
      stats.textContent = `draw call ${i.render.calls} (сүүдэртэй) · гурвалжин ${(i.render.triangles / 1000).toFixed(0)}k · текстур ${i.memory.textures} · геометр ${i.memory.geometries} · сан: ${lib.materials} материал, ${lib.textures} текстур`;
    }
  });
}
