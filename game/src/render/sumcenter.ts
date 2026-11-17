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
import { buildSumCenter, type GateView, type SumCenterBuild } from './sumlayout';
import { BUILDING_CONFIG, makeBuildingMaterials, type BuildingMaterials } from './building';
import { nearTownDoor, plotDoors } from '../sim/systems/town';
import { nearTeahouse } from '../sim/systems/helpers';
import type { GameState } from '../sim/state';
import { mat, VisualRng } from './util';
import { visualStyle } from './style';
import { quality } from '../device';
import { makeDog, poseDogLying } from './characters';
import { makeCrowdFar, makeCrowdParts } from './character/crowd';
import { bakeStatic, staticMeshes } from './character/bake';
import { GER } from './ger/config';
import { makeGer, type GerBuilt } from './ger/ger';
import type { CamSolids } from './camclip';
import { seasonLook, seasonOf } from '../sim/systems/seasons';
import { LabelAtlas, type LabelStyle } from './labelAtlas';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { characters, characterSpec } from './character/spec';
import { animateCharacter } from './character/animate';
import { buildCharacter, showOutfit, type CharacterRig } from './character/rig';
import { EmotionQueue, postTalkEvent, SpeedSmoother, talkBus, turnToward } from './character/talk';
import { HomeLightsView, homeLights } from './homeLights';
import { t } from '../i18n/i18n';
import { NpcView } from './npcs';
import { gatePush, playerSolids, type WalkSolids } from '../sim/systems/sumwalk';

/**
 * Оршин суугчид (хөдөлгөөнгүй): render/character-ийн `crowd` хэлбэр — төрх (data/characters.json crowd.looks: preset ×
 * бие × малгай) бүр хэсэг бүрээрээ нэг InstancedMesh, хүн бүр өөрийн байрлал, чиглэл, өндөртэй (docs/character-design.md §4).
 */
interface Resident { x: number; y: number; z: number; heading: number; scale: number; look: number; slot: number; /** [0,1) тогтмол — шөнийн нуугдах цагийн хазайлт */ u: number }
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

/**
 * Сумын төвийн барилгын материал: цонхны (atlas.window) шөнийн emissive-ийг арилгасан хувилбар — айлын цонхны гэрлийг
 * айл бүрээр нь homeLights.ts асаана (атласын цонх бүх айлд нэг тул хамт гэрэлтэх байсан). Атлас бусад (дотор, лабораторийн)
 * материалд нийтэд тул emissive зургийг хуулж, зөвхөн сумын төвийн материалд сольно. Дэлгүүрийн цонх, самбар, шон хэвээр.
 */
function darkWindowMaterials(): BuildingMaterials {
  const m = makeBuildingMaterials(), src = m.mat.emissiveMap?.image as HTMLCanvasElement | undefined;
  if (!src || typeof document === 'undefined') return m;
  const cv = document.createElement('canvas');
  cv.width = src.width; cv.height = src.height;
  const g = cv.getContext('2d');
  if (!g) return m;
  g.drawImage(src, 0, 0);
  const [x0, y0, x1, y1] = BUILDING_CONFIG.atlas.window as [number, number, number, number];
  g.fillStyle = '#000';
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = m.mat.emissiveMap!.colorSpace;
  tex.wrapS = m.mat.emissiveMap!.wrapS;
  tex.anisotropy = m.mat.emissiveMap!.anisotropy;
  m.mat.emissiveMap = tex;
  m.mat.needsUpdate = true;
  return m;
}

const SALE: LabelStyle = { text: 'ЗАРНА', bg: '#e0c23a', fg: '#2b2620' }, MINE: LabelStyle = { text: 'ТАНЫХ', bg: '#3f7a4a', fg: '#ffffff' };
const FACING_YAW = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 } as const;

export class SumCenterView {
  readonly group = new THREE.Group();
  readonly ground: THREE.Mesh;
  private built: SumCenterBuild;
  /** Айлын хаалганы төлөв: ang — навчны эргэлт (рад), dir — түлхэгдсэн чиглэл (+ дотогш) */
  private gateAnims: { g: GateView; ang: number; dir: number; c: number; s: number }[] = [];
  private gateMesh: THREE.InstancedMesh | null = null;
  private gateClock = 0;
  private playerWalkCache: WalkSolids | null = null;
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
  /** V3.5: лабораторийн барилгууд — бие + бэхэн хүрээ (2 draw call) ба дуганы хүрд; улирал солигдоход дахин угсарна */
  private townObjs: THREE.Mesh[] = [];
  private townWinter: boolean | null = null;
  private townMats: BuildingMaterials | null = null;
  private lampGlow: THREE.Points | null = null;
  private lampLights: THREE.PointLight[] = [];
  /** V3.5 цэнгэлдэх, бөхийн талбайн прожекторын PointLight (чанараар; low=0) */
  private floodLights: THREE.PointLight[] = [];
  /** V3.5 эргэдэг хүрд: mesh бүрийн суурь yaw, одоогийн өнцөг, үлдсэн хугацаа (с) */
  private wheelSpins: { mesh: THREE.Mesh; base: number; angle: number; left: number }[] = [];
  /** V6.3: хуваарьтай NPC-үүд (гадаа; дотор нь render/interior.ts-ээр) */
  readonly npcs: NpcView;
  private liveRigs = new Map<number, CharacterRig>();
  private live: { idx: number; rig: CharacterRig; yaw: number; emo: EmotionQueue } | null = null;
  private talkClock = 0;
  private talkSpeed = new SpeedSmoother();   // тоглогчийн жигдрүүлсэн хурд (барилга доторх ярианд ч нэг ижил — scene.ts)
  private homeLit: HomeLightsView | null = null;
  /** шөнө нуугдсан оршин суугчид (crowdKey-д орно) */
  private hiddenPeople: boolean[] = [];
  private talkOn = false;
  private talkMoney = NaN;

  constructor(cfg: GameConfig) {
    this.cfg = cfg;
    const L = cfg.sumcenter;
    this.built = buildSumCenter(L, { seed: 7, walk: cfg.worldmap.sum3d.walk });
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
        crowd.push({ x, y: H(x, z), z, heading, scale: rng.range(RS.stature[0], RS.stature[1]), look: Math.floor(rng.next() * characters.crowd.looks.length), slot: 0, u: rng.next() });
      }
    }
    const people = new THREE.Group();
    people.userData.sumPeople = crowd.length;
    this.peopleMeshes = residents(people, crowd);
    this.people = crowd;
    this.syncCrowd(Infinity, Infinity);
    this.group.add(people);
    this.homeLit = new HomeLightsView(cfg, this.built.homes);
    this.group.add(this.homeLit.group);
    this.npcs = new NpcView(cfg);
    this.npcs.walk = this.built.walk;
    this.buildGates();
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
    this.buildLamps();
    this.buildFloodLights();
  }

  private buildFloodLights(): void {
    const F = visualStyle.night.floodlight;
    for (let i = 0; i < Math.min(F.pointLights[quality], this.built.floodLamps.length); i++) {
      const l = new THREE.PointLight(F.color, 0, F.distance, F.decay);
      this.floodLights.push(l);
      this.group.add(l);
    }
  }

  /** Шөнө (0–1): камерт хамгийн ойрын прожекторууд PointLight авна (нийт ≤ floodlight.pointLights[чанар]) */
  private syncFloodLights(night: number, cam: THREE.Vector3): void {
    if (this.floodLights.length === 0) return;
    const F = visualStyle.night.floodlight;
    for (const l of this.floodLights) l.intensity = 0;
    if (night <= 0.02) return;
    const d2 = (p: { x: number; z: number }): number => (p.x - cam.x) ** 2 + (p.z - cam.z) ** 2;
    const near = this.built.floodLamps.slice().sort((a, b) => d2(a) - d2(b));
    this.floodLights.forEach((l, i) => {
      const p = near[i];
      if (!p) return;
      l.position.set(p.x, p.y, p.z);
      l.intensity = F.intensity * night;
    });
  }

  /** Хүрдийг товшсон ray-ээр эргүүлнэ (ray-д ойр, хамгийн ойрхон хүрд). Олдвол true */
  spinWheelAt(ray: THREE.Raycaster): boolean {
    let best: (typeof this.wheelSpins)[number] | null = null, bestD = 0.8 * 0.8;
    const c = new THREE.Vector3();
    for (const w of this.wheelSpins) {
      c.copy(w.mesh.position); c.y += 0.3;
      const d = ray.ray.distanceSqToPoint(c);
      if (d < bestD && c.distanceToSquared(ray.ray.origin) < 60 * 60) { best = w; bestD = d; }
    }
    if (!best) return false;
    best.left = visualStyle.night.wheelSpin.seconds;
    return true;
  }

  /** Эргэж буй хүрд: хурд 0 хүртэл шугаман удааширна; бусад үед статик */
  updateWheels(dt: number): void {
    const W = visualStyle.night.wheelSpin;
    for (const w of this.wheelSpins) {
      if (w.left <= 0) continue;
      const step = Math.min(dt, w.left);
      const omega0 = W.speed * (w.left / W.seconds), omega1 = W.speed * ((w.left - step) / W.seconds);
      w.angle += W.dir * 0.5 * (omega0 + omega1) * step;
      w.left -= step;
      w.mesh.rotation.y = w.base + w.angle;
    }
  }

  /** Шөнийн гудамжны гэрэл: камерт ойрын N шонд glow (1 draw call, Points) + чанараар хязгаарлагдсан цөөн PointLight (low=0) */
  private buildLamps(): void {
    const NL = visualStyle.night.streetLamp;
    const n = Math.min(this.built.lamps.length, NL.glowCount[quality]);
    if (n === 0 || typeof document === 'undefined') return;
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    if (g) {
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.lampGlow = new THREE.Points(geo, new THREE.PointsMaterial({
      color: NL.color, map: new THREE.CanvasTexture(cv), size: NL.glowSize, sizeAttenuation: true,
      transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    }));
    this.lampGlow.frustumCulled = false;
    this.lampGlow.visible = false;
    this.lampGlow.name = 'lamp-glow';
    this.group.add(this.lampGlow);
    for (let i = 0; i < NL.pointLights[quality]; i++) {
      const l = new THREE.PointLight(NL.color, 0, NL.lightDistance, NL.lightDecay);
      this.lampLights.push(l);
      this.group.add(l);
    }
  }

  /** Шөнө (0–1) ба камерын байрлалаар ойрын шонгуудыг асаана */
  syncLamps(night: number, cam: THREE.Vector3): void {
    this.syncFloodLights(night, cam);
    const glow = this.lampGlow;
    if (!glow) return;
    const NL = visualStyle.night.streetLamp;
    const on = night > 0.02;
    glow.visible = on;
    for (const l of this.lampLights) l.intensity = 0;
    if (!on) return;
    const lamps = this.built.lamps;
    const d2 = (p: { x: number; z: number }): number => (p.x - cam.x) ** 2 + (p.z - cam.z) ** 2;
    const near = lamps.slice().sort((a, b) => d2(a) - d2(b));
    const pos = glow.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const p = near[i]!;
      pos.setXYZ(i, p.x, p.y + NL.lightHeight, p.z);
    }
    pos.needsUpdate = true;
    (glow.material as THREE.PointsMaterial).opacity = NL.glowOpacity * night;
    this.lampLights.forEach((l, i) => {
      const p = near[i];
      if (!p) return;
      l.position.set(p.x, p.y + NL.lightHeight, p.z);
      l.intensity = NL.lightIntensity * night;
    });
  }

  heightAt = (x: number, z: number): number => this.built.heightAt(x, z);
  /** Камерын мөргөлдөөний саад (барилга, гэр) */
  get solids(): CamSolids { return this.built.solids; }
  /** Алхалтын саад (барилга, хашаа, гэр) — тоглогч ба NPC-ийн мөргөлдөөн */
  get walk(): WalkSolids { return this.built.walk; }
  /** Тоглогч/тээврийн саад: walk + орж болдоггүй айлын хаалттай хаалгууд (NPC-д нөлөөлөхгүй) */
  get playerWalk(): WalkSolids { return (this.playerWalkCache ??= playerSolids(this.built.walk)); }

  /** Айлын хашааны хаалганы 2 навч — нэг InstancedMesh (1 draw call), нугас дээр эргэнэ. Навчийг building/yard.ts noLeaves-ээр хашаанаас салгасан */
  private buildGates(): void {
    const G = this.built.gates;
    if (!G.length) return;
    const g0 = G[0]!, h = g0.h - g0.lift, geo = new THREE.BoxGeometry(g0.leafW, h, 0.05);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), G.length * 2);
    im.frustumCulled = false;   // instance-ууд хол тархсан — bounding sphere тохирохгүй
    const col = new THREE.Color();
    G.forEach((g, i) => {
      im.setColorAt(i * 2, col.set(g.color)); im.setColorAt(i * 2 + 1, col);
      this.gateAnims.push({ g, ang: 0, dir: 0, c: Math.cos(g.phi), s: Math.sin(g.phi) });
      this.setLeaves(im, i, 0);
    });
    im.instanceMatrix.needsUpdate = true;
    this.gateMesh = im;
    this.group.add(im);
  }
  private readonly gDummy = new THREE.Object3D();
  private readonly gLocal = new THREE.Matrix4();
  private setLeaves(im: THREE.InstancedMesh, i: number, ang: number): void {
    const { g } = this.gateAnims[i]!, h = g.h - g.lift;
    const put = (idx: number, hinge: { x: number; y: number; z: number }, dir: 1 | -1, rot: number): void => {
      const d = this.gDummy;
      d.position.set(hinge.x, hinge.y, hinge.z); d.rotation.set(0, rot, 0); d.updateMatrix();
      im.setMatrixAt(idx, d.matrix.multiply(this.gLocal.makeTranslation(dir * g.leafW / 2, g.lift + h / 2, 0)));
    };
    put(i * 2, g.hingeL, 1, g.phi + ang);       // зүүн навч: +ang → локал −Z (дотогш)
    put(i * 2 + 1, g.hingeR, -1, g.phi - ang);
  }

  private readonly gActors: { x: number; z: number }[] = [];
  /**
   * Хаалга биеэр түлхэгдэж онгойно (цаг биш): тоглогч/NPC навчны тойрогт орвол хаалганы хавтгайд ойртох тусам навч түлхэгдэнэ.
   * Гаднаас орвол дотогш, дотроос гарвал гадагш. Бие холдвол навч хаагдана. Тоглогч зөвхөн орж болох айлын хаалгыг түлхэнэ.
   */
  private syncGates(state: GameState): void {
    const im = this.gateMesh;
    if (!im) return;
    const now = performance.now(), dt = this.gateClock ? Math.min(0.1, (now - this.gateClock) / 1000) : 0;
    this.gateClock = now;
    const W = this.cfg.worldmap.sum3d.walk, p = state.player, A = this.gActors;
    A.length = 0;
    this.npcs.forEachPlaced((x, z) => A.push({ x, z }));
    const nNpc = A.length;
    if (p.place === 'sum' && !p.interior) A.push({ x: p.x, z: p.z });
    const maxAng = (Math.PI / 2) * 0.96, k = 1 - Math.exp(-dt / Math.max(W.gateOpenSec / 3, 1e-3));   // gateOpenSec — бүрэн шилжилтийн хугацаа
    let dirty = false;
    this.gateAnims.forEach((a, i) => {
      const g = a.g;
      let push = 0, side = 0;
      for (let j = 0; j < A.length; j++) {
        if (j >= nNpc && !g.enterable) break;   // тоглогч хаалттай айлын хаалгыг түлхэхгүй
        const dx = A[j]!.x - g.x, dz = A[j]!.z - g.z;
        if (Math.abs(dx) > 4 || Math.abs(dz) > 4) continue;
        const lz = dx * a.s + dz * a.c, q = gatePush(dx * a.c - dz * a.s, lz, g.leafW, W.bodyR);
        if (q > push) { push = q; side = lz >= 0 ? 1 : -1; }
      }
      if (push > 0 && a.dir === 0) a.dir = side;   // эхэлсэн чиглэлээ барина (биеийг дайрч эргэхгүй)
      const target = a.dir * push * maxAng, next = a.ang + (target - a.ang) * k;
      if (push === 0 && Math.abs(next) < 0.01) { if (a.ang !== 0) { a.ang = 0; a.dir = 0; this.setLeaves(im, i, 0); dirty = true; } return; }
      if (Math.abs(next - a.ang) < 1e-4) return;
      a.ang = next; this.setLeaves(im, i, next); dirty = true;
    });
    if (dirty) im.instanceMatrix.needsUpdate = true;
  }

  /** V3.4: худалдаж авсан байшингийн шошго (R7: сумын төвд кадр бүр дуудагддаг тул ярилцлагыг ч эндээс) */
  syncTown(state: GameState, night = 0): void {
    const winter = seasonOf(this.cfg, state.time.day) === 'winter';
    if (winter !== this.gerWinter) this.buildGers(winter);
    if (winter !== this.townWinter) this.buildTown(winter);
    const look = seasonLook(this.cfg, state);   // газар, зам, цөөрөм: бууцны terrain-тай ижил улирлын палитр
    this.built.setLook(look.season, look.straw, look.winter);
    this.townMats?.setGlow(night * homeLights.civicGlow * 1.6);   // шөнө барилгын цонх, хаягийн самбар, гэрлийн шон; айл бүрийн гэрэл homeLit-д
    const p = state.player;
    this.homeLit?.update(state, night, p.x, p.z);
    this.syncTalk(state);
    this.syncGates(state);
    for (const s of this.houseSigns) {
      const own = !!state.town.houses[s.plot];
      if (own !== s.own) { this.labels.setText(s.quad, own ? MINE : SALE); s.own = own; }
    }
  }

  /** V3.5: сумын төвийн бүх барилга, хашаа байшин, жорлон — нэг Geo (атлас + vertex color) + бэхэн хүрээ. Хүрд тусдаа mesh */
  private buildTown(winter: boolean): void {
    this.townWinter = winter;
    for (const m of this.townObjs) { this.group.remove(m); if (m.userData.own) m.geometry.dispose(); }
    this.townObjs = [];
    this.wheelSpins = [];
    const part = this.built.town.build(winter ? 'winter' : 'summer');
    const mats = (this.townMats ??= darkWindowMaterials());
    const geometry = part.geo.build();
    geometry.computeBoundingSphere();
    const body = new THREE.Mesh(geometry, mats.mat), outline = new THREE.Mesh(geometry, mats.outlineMat);
    body.name = 'town:buildings'; outline.name = 'town:outline';
    body.castShadow = true; body.receiveShadow = true; body.userData.own = true;
    this.townObjs.push(body, outline);
    for (const w of part.wheels) {
      const m = new THREE.Mesh(w.geo.build(), mats.mat);
      m.name = 'town:wheel'; m.position.set(w.x, w.y, w.z); m.rotation.y = w.yaw; m.castShadow = true; m.userData.own = true;
      this.townObjs.push(m);
      this.wheelSpins.push({ mesh: m, base: w.yaw, angle: 0, left: 0 });
    }
    for (const m of this.townObjs) this.group.add(m);
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
    const speed = this.talkSpeed.step(p.x, p.z, dt);
    this.syncNight(state);
    // V6.3: хуваарьтай NPC — хамгийн ойрын нь ярина (оршин суугчийн ярианаас түрүүлнэ)
    const npcP = p.place === 'sum' && !p.interior ? this.npcs.updateOutdoor(state, dt, this.built.heightAt, p.x, p.z, speed) : (this.npcs.hideOutdoor(), null);
    const trade = nearTradeDoor(this.cfg, state);
    const atDoor = p.place === 'sum' && !p.interior && (trade !== null || nearTownDoor(this.cfg, state) !== null || nearTeahouse(this.cfg, state));
    const active = !npcP && atDoor && this.talkSpeed.still(this.talkOn);
    this.talkOn = active;
    let idx = -1;
    if (active) {
      let bd = T.partnerR;
      this.people.forEach((r, i) => { const d = Math.hypot(r.x - p.x, r.z - p.z); if (d < bd && !this.hiddenPeople[i]) { bd = d; idx = i; } });
      const L0 = this.live ? this.people[this.live.idx] : null;   // одоогийн ярилцагч томорсон гарах босгоор хадгалагдана
      if (L0 && !this.hiddenPeople[this.live!.idx] && Math.hypot(L0.x - p.x, L0.z - p.z) < T.partnerR * T.exitScale) idx = this.live!.idx;
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
   * Оршин суугчид шөнө (characters.json crowd.night: from–to өдрийн минут) нуугдаж, өглөө дахин гарна; хүн бүр id-аас
   * (Resident.u) jitterMin хүртэл хазайна. Өдөр дэлгүүрийн үүдэнд хэвээр. Өөрчлөгдсөн үед л syncCrowd-ийн түлхүүр солигдоно.
   */
  private syncNight(state: GameState): void {
    const N = characters.crowd.night, m = ((state.time.minute % 1440) + 1440) % 1440;
    this.people.forEach((r, i) => {
      const a = (N.from + r.u * N.jitterMin) % 1440, b = (N.to + (1 - r.u) * N.jitterMin) % 1440;
      this.hiddenPeople[i] = a <= b ? m >= a && m < b : m >= a || m < b;
    });
  }

  /**
   * Оршин суугчдын LOD: тоглогчоос crowd.nearR дотор — бүрэн дүр (хэсэг бүр InstancedMesh, сүүдэртэй), цааш — хялбаршуулсан
   * (төрх бүр 1 draw call, сүүдэргүй); ярилцлагын амьд дүр болсон хүн хоёуланд нуугдана. Өөрчлөгдсөн үед л шинэчилнэ.
   */
  private syncCrowd(px: number, pz: number): void {
    const R = characters.crowd.nearR, liveIdx = this.live?.idx ?? -1;
    const hid = this.hiddenPeople;
    const near = this.people.map((r, i) => i !== liveIdx && !hid[i] && Math.hypot(r.x - px, r.z - pz) < R);
    const key = liveIdx + ':' + near.map((b, i) => (hid[i] ? 2 : b ? 1 : 0)).join('');
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
        L.far.setMatrixAt(r.slot, residentMatrix(r, near[i]! || i === liveIdx || !!hid[i]));
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
