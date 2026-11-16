/**
 * Сумын төвийн 3D (M4.6 → V3.3 Могод сум, хэрэглэгчийн шийдвэр 2026-11-15). Байршил `data/sumcenter.json`,
 * бүтээгч `render/sumlayout.ts`. Тоглогч газрын зургаас цэцэрлэгийн зүүн талын замаар орж ирнэ. Дэлгүүр бүр өөр
 * үүрэгтэй (sim/systems/sumtown.ts): хаалганы шар тойрогт E — тухайн дэлгүүрийн цонх; машин худалдааны талбай дээр
 * машин руу очиж E — үнэ, «Худалдан авах», авсны дараа шууд унана. Захын хязгаарт хүрвэл газрын зураг руу.
 */
import * as THREE from 'three';
import type { GameConfig } from '../sim/config';
import type { VehicleId } from '../sim/state';
import { allBuildings, facingOf, lotSlots, nearTradeDoor, sumDoors, TRADE_ROLES, type SumBuildingSpec } from '../sim/systems/sumtown';
import { buildSumCenter, type SumCenterBuild } from './sumlayout';
import { nearTownDoor, plotDoors } from '../sim/systems/town';
import { nearTeahouse } from '../sim/systems/helpers';
import type { GameState } from '../sim/state';
import { mat, VisualRng } from './util';
import { visualStyle } from './style';
import { makeDog, poseDogLying } from './characters';
import { makeCrowdFar, makeCrowdParts } from './character/crowd';
import { bakeStatic, staticMeshes } from './character/bake';
import { GER } from './ger/config';
import { makeGer, type GerBuilt } from './ger/ger';
import type { CamSolids } from './camclip';
import { seasonOf } from '../sim/systems/seasons';
import { LabelAtlas, type LabelStyle } from './labelAtlas';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { characters, characterSpec } from './character/spec';
import { animateCharacter } from './character/animate';
import { buildCharacter, showOutfit, type CharacterRig } from './character/rig';
import { EmotionQueue, postTalkEvent, talkBus, turnToward } from './character/talk';
import { t } from '../i18n/i18n';
import { NpcView } from './npcs';

/**
 * Оршин суугчид (хөдөлгөөнгүй): render/character-ийн `crowd` хэлбэр — төрх (data/characters.json crowd.looks: preset ×
 * бие × малгай) бүр хэсэг бүрээрээ нэг InstancedMesh, хүн бүр өөрийн байрлал, чиглэл, өндөртэй (docs/character-design.md §4).
 */
interface Resident { x: number; y: number; z: number; heading: number; scale: number; look: number; slot: number }
/** Төрх бүрийн InstancedMesh-үүд: near — ойрын бүрэн дүр (хэсэг бүр, хүн солигдоно), far — холын хялбаршуулсан (1 mesh) */
interface LookMeshes { members: Resident[]; near: THREE.InstancedMesh[]; far: THREE.InstancedMesh }
const residentMatrix = (p: Resident, hidden = false): THREE.Matrix4 => {
  const k = hidden ? 0 : p.scale;
  return new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y, p.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.heading), new THREE.Vector3(k, k, k));
};
function residents(g: THREE.Group, people: Resident[]): (LookMeshes | null)[] {
  return characters.crowd.looks.map((look, li) => {
    const members = people.filter((p) => p.look === li);
    if (!members.length) return null;
    members.forEach((p, i) => { p.slot = i; });
    const fp = makeCrowdFar(look);
    const far = new THREE.InstancedMesh(fp.geometry, fp.material, members.length);
    members.forEach((p) => far.setMatrixAt(p.slot, residentMatrix(p)));
    far.castShadow = false;
    far.receiveShadow = true;
    const near = makeCrowdParts(look).map((part) => {
      const inst = new THREE.InstancedMesh(part.geometry, part.material, members.length);
      inst.count = 0;
      inst.visible = false;
      inst.castShadow = part.castShadow;
      return inst;
    });
    g.add(far, ...near);
    return { members, near, far };
  });
}

const SALE: LabelStyle = { text: 'ЗАРНА', bg: '#e0c23a', fg: '#2b2620' }, MINE: LabelStyle = { text: 'ТАНЫХ', bg: '#3f7a4a', fg: '#ffffff' };
const FACING_YAW = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 } as const;

export class SumCenterView {
  readonly group = new THREE.Group();
  readonly ground: THREE.Mesh;
  private built: SumCenterBuild;
  private lotVehicles: { id: VehicleId; mesh: THREE.Object3D }[] = [];
  /** Зарах байшингийн «ЗАРНА» / «ТАНЫХ» шошго */
  private houseSigns: { plot: string; quad: number; own: boolean }[] = [];
  /** R7: оршин суугчид (instanced) ба ярилцлагын үед амьд дүрээр солигдох нэг нь */
  private readonly cfg: GameConfig;
  private people: Resident[] = [];
  private peopleMeshes: (LookMeshes | null)[] = [];
  /** ойрын/нуусан оршин суугчдын түлхүүр — өөрчлөгдвөл л InstancedMesh-ийг шинэчилнэ */
  private crowdKey = '';
  private labels = new LabelAtlas();
  /** V3.5: айлын гэрүүд (makeGer → bakeStatic, бүгд нэг mesh + бэхэн хүрээ); улирал солигдоход дахин угсарна */
  private gerMeshes: THREE.Mesh[] = [];
  private gerWinter: boolean | null = null;
  /** V6.3: хуваарьтай NPC-үүд (гадаа; дотор нь render/interior.ts-ээр) */
  readonly npcs: NpcView;
  private liveRigs = new Map<number, CharacterRig>();
  private live: { idx: number; rig: CharacterRig; yaw: number; emo: EmotionQueue } | null = null;
  private talkClock = 0;
  private talkPrev = { x: 0, z: 0 };
  private talkMoney = NaN;

  constructor(cfg: GameConfig) {
    this.cfg = cfg;
    const L = cfg.sumcenter;
    this.built = buildSumCenter(L, { seed: 7 });
    this.ground = this.built.ground;
    this.group.add(this.built.group);
    const H = this.built.heightAt;

    const signs: { style: LabelStyle; w: number; h: number; x: number; y: number; z: number; yaw: number }[] = [];
    // Шошго: үүрэгтэй, орж болох барилгын нүүрэн дээр
    const byId = new Map<string, SumBuildingSpec>(allBuildings(L).map((b) => [b.id, b]));
    const signColor: Record<string, [string, string]> = {
      teahouse: ['#8a3a1a', '#fff1d0'],
      bank: ['#1f4f7a', '#f4ead6'],
      livestock: ['#6b4a2e', '#ffe9a8'],
    };
    for (const d of sumDoors(cfg)) {
      const b = byId.get(d.id);
      const [bg, fg] = signColor[d.role] ?? (d.role ? ['#1f5fa8', '#ffe9a8'] : ['#526d82', '#f4ead6']);
      const text = t(`sum3d.${d.id}`);
      const face = b ? facingOf(b) : 's';
      const yaw = FACING_YAW[face];
      // Хаалганы гаднах цэгээс хана руу 1.85 м буцаж, хананаас 0.12 м гадна
      const back = 2 - 0.12;
      const fx = d.x - Math.sin(yaw) * back, fz = d.z - Math.cos(yaw) * back;
      const y = H(fx, fz) + (b ? Math.min(b.h ?? b.floors * L.floorHeight, L.floorHeight) + 0.5 + 0.6 : 3.2);
      signs.push({ style: { text, bg, fg }, w: b ? Math.min(7, Math.max(3.4, b.w * 0.7)) : 6, h: b ? 0.9 : 1.2, x: fx, y, z: fz, yaw });
    }

    // Арилжааны дэлгүүрийн шар тойрог, цайны газрын цэнхэр тойрог (E)
    // бүх тойрог нэг mesh (оройн өнгө) — 1 draw call
    const rings: THREE.BufferGeometry[] = [];
    const ringAt = (x: number, z: number, r: number, color: number): void => {
      const g = new THREE.RingGeometry(r - 0.35, r, 40);
      g.rotateX(-Math.PI / 2);
      g.translate(x, H(x, z) + 0.15, z);
      const c = new THREE.Color(color), n = g.attributes.position!.count;
      g.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: n * 3 }, (_, i) => [c.r, c.g, c.b][i % 3]!), 3));
      rings.push(g);
    };
    const S = cfg.worldmap.sum3d;
    for (const d of sumDoors(cfg)) {
      if (d.role === 'teahouse') ringAt(d.x, d.z, S.shopR, 0x7ad0ff);
      else if ((TRADE_ROLES as readonly string[]).includes(d.role)) ringAt(d.x, d.z, S.shopR, 0xffd34a);
      else if (d.role === 'temple' || d.role === 'zdtg' || d.role === 'bank') ringAt(d.x, d.z, S.shopR, 0xd08cff);
    }
    for (const s of lotSlots(cfg)) ringAt(s.x, s.z, S.lotR, 0x9be37a);
    // V3.4: зарах байшин, хамаатан айл — ягаан тойрог, шошго
    for (const d of plotDoors(cfg)) {
      ringAt(d.x, d.z, S.shopR, 0xd08cff);
      const y = H(d.x, d.z) + 4.4;
      if (d.role === 'house') {
        this.labels.cell(MINE);
        this.houseSigns.push({ plot: d.id, quad: this.labels.add(SALE, 3.2, 0.8, d.x, y, d.z - 1.88, 0), own: false });
      } else signs.push({ style: { text: 'ХАМААТАН', bg: '#3f7a4a', fg: '#ffffff' }, w: 3.6, h: 0.8, x: d.x, y, z: d.z - 1.88, yaw: 0 });
    }
    for (const sg of signs) this.labels.add(sg.style, sg.w, sg.h, sg.x, sg.y, sg.z, sg.yaw);
    const labelMesh = this.labels.build();
    if (labelMesh) this.group.add(labelMesh);
    if (rings.length) {
      const rm = new THREE.Mesh(mergeGeometries(rings, false)!, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.45 }));
      rm.name = 'rings';
      rings.forEach((g) => g.dispose());
      this.group.add(rm);
    }

    // Худалдаанд байгаа тээвэр (зарагдсан нь нуугдана — syncLot)
    for (const s of lotSlots(cfg)) {
      const mesh = this.built.vehicles.get(s.id);
      if (mesh) this.lotVehicles.push({ id: s.vehicle as VehicleId, mesh });
    }

    // Оршин суугчид: дэлгүүр, цайны газрын үүдэнд
    const rng = new VisualRng(777);
    const RS = visualStyle.sumResidents;
    const crowd: Resident[] = [];
    for (const d of sumDoors(cfg)) {
      if (!d.role) continue;
      for (let k = 0; k < RS.perDoor; k++) {
        if (rng.next() >= RS.doorChance * (k === 0 ? 1 : 0.5)) continue;
        const x = d.x + rng.range(-RS.spread, RS.spread), z = d.z + rng.range(RS.ahead[0], RS.ahead[1]);
        if (crowd.some((p) => Math.hypot(p.x - x, p.z - z) < 1)) continue;   // бие биендээ шигдэхгүй
        // ихэнх нь хаалга руу эсвэл бие бие рүүгээ хандсан — санамсаргүй ч гудамж руу нуруугаа харуулахгүй
        const heading = Math.PI + rng.range(-1.2, 1.2);
        crowd.push({ x, y: H(x, z), z, heading, scale: rng.range(RS.stature[0], RS.stature[1]), look: Math.floor(rng.next() * characters.crowd.looks.length), slot: 0 });
      }
    }
    const people = new THREE.Group();
    people.userData.sumPeople = crowd.length;
    this.peopleMeshes = residents(people, crowd);
    this.people = crowd;
    this.syncCrowd(Infinity, Infinity);
    this.group.add(people);
    this.npcs = new NpcView(cfg);
    this.group.add(this.npcs.group);

    // V3.2: айлын үүдэнд хэвтэх нохой (байрлалын хэш) — хөдөлгөөнгүй тул бүгдийг материалаар нь нэгтгэнэ (bakeStatic)
    const dogs: THREE.Object3D[] = [];
    for (const h of this.built.homes) {
      const hash = (k: number): number => {
        const v = Math.sin(h.x * 12.9898 + h.z * 78.233 + k * 37.719) * 43758.5453;
        return v - Math.floor(v);
      };
      if (hash(1) >= visualStyle.dogRest.townDogChance) continue;
      const dog = makeDog();
      poseDogLying(dog, 1);
      const side = hash(2) < 0.5 ? -1 : 1;
      dog.root.position.set(h.x + side * (1.2 + hash(3) * 0.8), h.y - 0.4 + dog.root.position.y, h.z - 1.2);
      dog.root.rotation.y = side * (Math.PI / 2) + (hash(4) - 0.5) * 0.8;
      dogs.push(dog.root);
    }
    for (const m of staticMeshes(bakeStatic(dogs))) { m.name = 'town-dogs'; this.group.add(m); }

    // Алсын уулс (3D-ийн хязгаараас цааш) — нэг mesh
    const R = S.radius, hills: THREE.Object3D[] = [];
    for (let k = 0; k < 22; k++) {
      const a = (k / 22) * Math.PI * 2, r = R + 160 + rng.range(-20, 60), h = rng.range(30, 70);
      const m = new THREE.Mesh(new THREE.ConeGeometry(rng.range(60, 110), h, 6), mat(0x7a8a6a));
      m.position.set(Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r);
      hills.push(m);
    }
    for (const m of staticMeshes(bakeStatic(hills), false)) { m.name = 'hills'; this.group.add(m); }
  }

  heightAt = (x: number, z: number): number => this.built.heightAt(x, z);
  /** Камерын мөргөлдөөний саад (барилга, гэр) */
  get solids(): CamSolids { return this.built.solids; }

  /** V3.4: худалдаж авсан байшингийн шошго (R7: сумын төвд кадр бүр дуудагддаг тул ярилцлагыг ч эндээс) */
  syncTown(state: GameState): void {
    const winter = seasonOf(this.cfg, state.time.day) === 'winter';
    if (winter !== this.gerWinter) this.buildGers(winter);
    this.syncTalk(state);
    for (const s of this.houseSigns) {
      const own = !!state.town.houses[s.plot];
      if (own !== s.own) { this.labels.setText(s.quad, own ? MINE : SALE); s.own = own; }
    }
  }

  /**
   * Сумын айлын гэр (sumlayout-ийн байрлал, хана r → хамгийн ойрын GER.sizes диаметр, бүрээсийн өнгө): хэмжээ × өнгө бүрд
   * makeGer нэг удаа, байрлал бүрд хуулбар → bakeStatic (ижил тохиргоотой материалыг түлхүүрээр нэгтгэнэ). Хаалга урагшаа.
   * Draw call: бие 1 + бэхэн хүрээ 1 (+ сүүдэр 1), гэрийн тооноос үл хамаарна.
   */
  private buildGers(winter: boolean): void {
    this.gerWinter = winter;
    for (const m of this.gerMeshes) { this.group.remove(m); m.geometry.dispose(); }
    this.gerMeshes = [];
    const list = this.built.gers;
    if (!list.length) return;
    const season = winter ? 'winter' : 'summer', sizes = Object.entries(GER.sizes);
    const protos = new Map<string, GerBuilt>(), roots: THREE.Object3D[] = [];
    for (const g of list) {
      const size = sizes.reduce((a, b) => (Math.abs(b[1].diameter - 2 * g.r) < Math.abs(a[1].diameter - 2 * g.r) ? b : a))[0];
      const key = size + '|' + g.color;
      let b = protos.get(key);
      if (!b) { b = makeGer(size, { season, coverColor: g.color }); protos.set(key, b); }
      const holder = new THREE.Group();
      holder.position.set(g.x, g.y, g.z);
      for (const c of b.group.children) holder.add(c.clone());
      roots.push(holder);
    }
    const matKey = (m: THREE.Material): string => {
      const x = m as THREE.MeshLambertMaterial;
      return `${m.type}|${x.map?.uuid ?? ''}|${x.emissiveMap?.uuid ?? ''}|${m.side}|${x.color?.getHexString() ?? ''}`;
    };
    const parts = bakeStatic(roots, { key: matKey });
    const used = new Set(parts.map((p) => p.material));
    for (const b of protos.values()) b.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.geometry.dispose();
      if (!used.has(m.material as THREE.Material)) (m.material as THREE.Material).dispose();
    });
    for (const m of staticMeshes(parts)) { m.name = 'gers'; this.group.add(m); this.gerMeshes.push(m); }
  }

  /**
   * R7 ярилцлага: тоглогч дэлгүүр, үйлчилгээний хаалганы тойрогт (цонх нээгддэг газар) зогсож байхад хамгийн ойрын оршин
   * суугч амьд дүр болж (instanced хувийг нууна) тоглогч руу эргэж ярина; ярилцлагын үед мөнгө өсвөл баярлах, буурвал
   * гуниглах (character/talk.ts-ээр тоглогчид дамжина). scene.ts-д dt өгдөггүй тул цагийг өөрөө хэмжинэ.
   */
  private syncTalk(state: GameState): void {
    const now = performance.now();
    const dt = this.talkClock ? Math.min(0.1, (now - this.talkClock) / 1000) : 0;
    this.talkClock = now;
    const p = state.player, T = characters.talk;
    const speed = dt > 0 ? Math.hypot(p.x - this.talkPrev.x, p.z - this.talkPrev.z) / dt : 0;
    this.talkPrev = { x: p.x, z: p.z };
    // V6.3: хуваарьтай NPC — хамгийн ойрын нь ярина (оршин суугчийн ярианаас түрүүлнэ)
    const npcP = p.place === 'sum' && !p.interior ? this.npcs.updateOutdoor(state, dt, this.built.heightAt, p.x, p.z, speed) : (this.npcs.hideOutdoor(), null);
    const trade = nearTradeDoor(this.cfg, state);
    const atDoor = p.place === 'sum' && !p.interior && (trade !== null || nearTownDoor(this.cfg, state) !== null || nearTeahouse(this.cfg, state));
    const active = !npcP && atDoor && speed < T.stillSpeed;
    let idx = -1;
    if (active) {
      let bd = T.partnerR;
      this.people.forEach((r, i) => { const d = Math.hypot(r.x - p.x, r.z - p.z); if (d < bd) { bd = d; idx = i; } });
    }
    if (!active || idx !== this.live?.idx) this.releaseLive();
    if (active && idx >= 0 && !this.live) this.takeLive(idx);
    const r = this.live ? this.people[this.live.idx]! : null;
    talkBus.partner = npcP ?? (!active ? null : r ? { x: r.x, z: r.z } : trade ? { x: trade.x, z: trade.z } : null);
    // наймаа: ярилцлагын үеэр мөнгө өөрчлөгдвөл
    if (active && !Number.isNaN(this.talkMoney) && state.money !== this.talkMoney) {
      const e = state.money > this.talkMoney ? 'sell' : 'buy';
      postTalkEvent(e);
      this.live?.emo.playEvent(e);
    }
    this.talkMoney = active ? state.money : NaN;
    this.syncCrowd(p.x, p.z);
    if (this.live && r) {
      const L = this.live;
      L.yaw = turnToward(L.yaw, Math.atan2(p.x - r.x, p.z - r.z), T.turnRate, dt);
      L.rig.root.rotation.y = L.yaw;
      L.rig.root.position.y = r.y + animateCharacter(L.rig, { dt, speed: 0, mode: 'foot', raise: false, uurga: false, talk: true, emotion: L.emo.step(dt) });
    }
  }

  /**
   * Оршин суугчдын LOD: тоглогчоос crowd.nearR дотор — бүрэн дүр (хэсэг бүр InstancedMesh, сүүдэртэй), цааш — хялбаршуулсан
   * (төрх бүр 1 draw call, сүүдэргүй); ярилцлагын амьд дүр болсон хүн хоёуланд нуугдана. Өөрчлөгдсөн үед л шинэчилнэ.
   */
  private syncCrowd(px: number, pz: number): void {
    const R = characters.crowd.nearR, liveIdx = this.live?.idx ?? -1;
    const near = this.people.map((r, i) => i !== liveIdx && Math.hypot(r.x - px, r.z - pz) < R);
    const key = liveIdx + ':' + near.map((b) => (b ? 1 : 0)).join('');
    if (key === this.crowdKey) return;
    this.crowdKey = key;
    for (const L of this.peopleMeshes) {
      if (!L) continue;
      const close = L.members.filter((r) => near[this.people.indexOf(r)]);
      for (const m of L.near) {
        close.forEach((r, j) => m.setMatrixAt(j, residentMatrix(r)));
        m.count = close.length;
        m.visible = close.length > 0;
        m.instanceMatrix.needsUpdate = true;
        m.boundingSphere = null;
      }
      for (const r of L.members) {
        const i = this.people.indexOf(r);
        L.far.setMatrixAt(r.slot, residentMatrix(r, near[i]! || i === liveIdx));
      }
      L.far.instanceMatrix.needsUpdate = true;
      L.far.boundingSphere = null;
    }
  }

  private takeLive(idx: number): void {
    const r = this.people[idx]!, look = characters.crowd.looks[r.look]!;
    let rig = this.liveRigs.get(r.look);
    if (!rig) {
      rig = buildCharacter(characterSpec(look.preset), { detail: 'npc', hats: look.hat === 'none' ? [] : [look.hat] });
      showOutfit(rig.root, look.body, look.hat);
      if (!characters.crowd.liveShadow) rig.root.traverse((o) => { o.castShadow = false; });
      this.liveRigs.set(r.look, rig);
      this.group.add(rig.root);
    }
    rig.root.visible = true;
    rig.root.position.set(r.x, r.y, r.z);
    rig.root.scale.setScalar(r.scale);
    rig.root.rotation.y = r.heading;
    this.live = { idx, rig, yaw: r.heading, emo: new EmotionQueue() };
  }

  private releaseLive(): void {
    if (!this.live) return;
    this.live.rig.root.visible = false;
    this.live = null;
  }

  /** Худалдаж авсан тээврийг талбайгаас нууна */
  syncLot(owned: readonly string[]): void {
    for (const v of this.lotVehicles) v.mesh.visible = !owned.includes(v.id);
  }
}
