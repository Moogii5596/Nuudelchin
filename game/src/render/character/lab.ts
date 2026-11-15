/**
 * Дүрийн лаборатори (V4.5 R6, `game/lab.html`, зөвхөн dev — build-д орохгүй): тоглоомын `render/character/*`-ийг
 * шууд импортолно — «лабораторид засаад хуулах» алхамгүй, нэг эх сурвалж. Preset, дээлийн өнгө, улирал, малгай,
 * сэтгэл хөдлөл, хөдөлгөөний самбартай. `?shot=<нэр>` — тогтмол зураг (өмнө/дараа пикселээр харьцуулах, labShots.ts).
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Season } from '../../sim/config';
import { visualStyle, type HerderEmotion, type OutfitBody } from '../style';
import { animateCharacter, type CharacterPose } from './animate';
import { makeCrowdParts, type CrowdLook } from './crowd';
import { EMOTIONS } from './face';
import { css, libraryStats } from './materials';
import { buildCharacter, dressCharacter, showOutfit, type CharacterRig } from './rig';
import { CHARACTER_HATS, characters, characterSpec, OUTFIT_BODIES, OUTFIT_HATS, withColors, type CharacterSpec } from './spec';
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
  if (params.has('lineup')) startLineup(); else startLab();
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
      const parts = makeCrowdParts({ colors: colors(), body: bodySel.value as OutfitBody, hat: hatSel.value as CrowdLook['hat'], preset: presetSel.value === 'player' ? 'man' : presetSel.value });
      crowd = new THREE.Group();
      for (const p of parts) { const m = new THREE.Mesh(p.geometry, p.material); m.castShadow = p.castShadow; crowd.add(m); }
      scene.add(crowd);
    } else {
      rig = buildCharacter(withColors(characterSpec(presetSel.value), colors()), { detail: checked('npc') ? 'npc' : 'full' });
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
  $('crowd').onchange = $('npc').onchange = rebuild;
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

/**
 * Эгнээ (R4, `lab.html?lineup`): тоглогч (full, npc) ба бүх бэлэн preset (characters.ready, npc) нэг эгнээнд.
 * - `&hat=none|toortsog|…` — бүгдэд нэг малгай; `&season=winter` — улирал; `&at=<дугаар>&span=<тоо>` — ойроос
 * - `&faces` — царайг ойроос 2 эгнээнд (дэлгэцийн дээд/доод хагас)
 * - `&side` — бүгд хажуу тийш харсан (бөгтөр, бие галбир)
 * - `&gray` — бүх дээл саарал (царай, бие галбир, үс, бүс, гутлаар ялгагдаж буйг шалгах)
 * - `&measure` — draw call: тоглогч ганцаараа ба + 8 npc, улирал бүрээр (#out)
 */
function startLineup(): void {
  $('panel').hidden = false;
  for (const id of ['preset', 'deel', 'hem', 'body', 'npc', 'crowd', 'shots']) ($(id).closest('label') as HTMLElement).hidden = true;
  const renderer = labRenderer(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  $('wrap').appendChild(renderer.domElement);
  const { scene } = labScene();
  const names = characters.ready;
  const gray = params.has('gray'), faces = params.has('faces');
  const look = (name: string): CharacterSpec => (gray ? withColors(characterSpec(name), { deel: 0x8a8a8a, hem: 0x6e6e6e }) : characterSpec(name));
  const GAP = 0.95, width = (names.length + 1) * GAP;
  const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(width / 2, 2.2, 16);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(width / 2, 1.05, 0);
  controls.enableDamping = true;
  const seasonSel = $<HTMLSelectElement>('season'), emoSel = $<HTMLSelectElement>('emo'), modeSel = $<HTMLSelectElement>('mode'), speed = $<HTMLInputElement>('speed');
  for (const v of Object.keys(EMOTIONS)) emoSel.add(new Option(v, v));
  const checked = (id: string): boolean => $<HTMLInputElement>(id).checked;

  interface Placed { rig: CharacterRig; label: HTMLElement }
  const placed: Placed[] = [];
  const labels = document.createElement('div');
  document.body.appendChild(labels);
  const place = (rig: CharacterRig, text: string): void => {
    rig.root.position.set(placed.length * GAP, 0, 0);
    scene.add(rig.root);
    const label = document.createElement('div');
    label.textContent = text;
    label.style.cssText = 'position:absolute;transform:translate(-50%,0);padding:2px 6px;border-radius:6px;background:rgba(20,16,12,.6);color:#f4ead6;font:12px system-ui;pointer-events:none;white-space:nowrap';
    labels.appendChild(label);
    placed.push({ rig, label });
  };
  place(buildCharacter(look('player')), 'тоглогч (full)');
  place(buildCharacter(look('player'), { detail: 'npc' }), 'тоглогч (npc)');
  for (const n of names) place(buildCharacter(look(n), { detail: 'npc' }), n);
  if (params.has('side')) for (const p of placed) p.rig.root.rotation.y = Math.PI / 2;   // хажуугаас (бөгтөр, бие галбир)

  const hatSel = $<HTMLSelectElement>('hat');
  hatSel.add(new Option('улирлаар', 'season'), 0);
  for (const h of [...CHARACTER_HATS, 'none']) hatSel.add(new Option(h, h));
  hatSel.value = params.get('hat') ?? 'season';
  seasonSel.value = params.get('season') ?? seasonSel.value;
  const dressAll = (): void => {
    const season = (seasonSel.value === 'manual' ? 'autumn' : seasonSel.value) as Season;
    for (const p of placed) {
      dressCharacter(p.rig, season);
      if (hatSel.value !== 'season') showOutfit(p.rig.root, visualStyle.outfits.seasons[season].body, hatSel.value);
    }
  };
  seasonSel.onchange = hatSel.onchange = dressAll;
  const at = params.get('at');
  if (at !== null) {
    const span = Number(params.get('span') ?? 4), x = (Number(at) + (span - 1) / 2) * GAP;
    camera.position.set(x, 1.75, span * 1.15 + 1.2); controls.target.set(x, 1.45, 0);
  }
  // царай ойроос: 2 эгнээ — дүрүүдийн эхний хагас дээд хагас дэлгэцэнд, үлдсэн нь доод хагаст
  const half = Math.ceil(placed.length / 2);
  const rows = [placed.slice(0, half), placed.slice(half)].map((list) => {
    const cam = new THREE.PerspectiveCamera(32, innerWidth / (innerHeight / 2), 0.1, 100);
    const x0 = list[0]!.rig.root.position.x, x1 = list[list.length - 1]!.rig.root.position.x, cx = (x0 + x1) / 2;
    const dist = ((x1 - x0) / 2 + 0.6) / (Math.tan((16 * Math.PI) / 180) * cam.aspect);
    cam.position.set(cx, 1.85, Math.max(2.8, dist * 1.25)); cam.lookAt(cx, 1.58, 0);
    return { list, cam };
  });

  if (params.has('measure')) {
    const out: Record<string, unknown> = {};
    const npcs = placed.slice(2, 10);
    for (const season of ['summer', 'autumn', 'winter', 'spring'] as Season[]) {
      for (const p of placed) dressCharacter(p.rig, season);
      const calls = (shown: Placed[]): [number, number] => {
        for (const p of placed) p.rig.root.visible = shown.includes(p);
        renderer.shadowMap.enabled = false; renderer.render(scene, camera); const a = renderer.info.render.calls;
        renderer.shadowMap.enabled = true; renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera);
        return [a, renderer.info.render.calls];
      };
      const solo = calls([placed[0]!]), all = calls([placed[0]!, ...npcs]);
      // npc нэг дүрийн гурвалжин (сүүдэргүй, газаргүй): preset бүрээр
      const tris: number[] = [];
      for (const p of placed.slice(1)) {
        for (const q of placed) q.rig.root.visible = q === p;
        renderer.shadowMap.enabled = false; renderer.render(scene, camera);
        tris.push(renderer.info.render.triangles - 24);
      }
      renderer.shadowMap.enabled = true;
      out[season] = { player: solo, withNpc: all, addedNoShadow: all[0] - solo[0], added: all[1] - solo[1], npcTriangles: { min: Math.min(...tris), max: Math.max(...tris), avg: Math.round(tris.reduce((a, b) => a + b, 0) / tris.length) } };
    }
    for (const p of placed) p.rig.root.visible = true;
    $('out').textContent = JSON.stringify(out);
  }
  dressAll();

  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  const clock = new THREE.Clock(), stats = $('stats'), v = new THREE.Vector3();
  let frame = 0;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const pose: CharacterPose = {
      dt, speed: modeSel.value === 'foot' ? Number(speed.value) : 0, mode: modeSel.value as CharacterPose['mode'],
      raise: checked('raise'), uurga: checked('uurga'), talk: checked('talk'), emotion: emoSel.value as HerderEmotion,
    };
    for (const { rig } of placed) {
      rig.root.position.y = animateCharacter(rig, pose);
      rig.root.getObjectByName('uurga')!.visible = pose.uurga;
    }
    if (faces) {
      const H2 = innerHeight / 2;
      renderer.setScissorTest(true);
      rows.forEach(({ list, cam }, r) => {
        renderer.setViewport(0, (1 - r) * H2, innerWidth, H2); renderer.setScissor(0, (1 - r) * H2, innerWidth, H2);
        renderer.render(scene, cam);
        for (const { rig, label } of list) {
          v.set(rig.root.position.x, 1.5, 0).project(cam);
          label.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`;
          label.style.top = `${(r + 1) * H2 - (r ? 62 : 26)}px`;   // мөрийн доод хэсэгт (доод мөрөнд самбарын дээгүүр)
        }
      });
      renderer.setScissorTest(false);
    } else {
      controls.update();
      renderer.render(scene, camera);
      for (const { rig, label } of placed) {
        v.set(rig.root.position.x, -0.15, rig.root.position.z).project(camera);
        label.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`;
        label.style.top = `${(-v.y * 0.5 + 0.5) * innerHeight}px`;
      }
    }
    if (++frame % 30 === 0) {
      const i = renderer.info;
      stats.textContent = `${placed.length} дүр (1 full + ${placed.length - 1} npc) · draw call ${i.render.calls} · гурвалжин ${(i.render.triangles / 1000).toFixed(0)}k · текстур ${i.memory.textures}`;
    }
  });
}
