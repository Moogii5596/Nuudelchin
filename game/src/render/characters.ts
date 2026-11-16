/**
 * Малчин (render/character — нэг кодын сан), унаа морь, чоно, нохой (V4.6: render/animal/ — H2 морь эмээлтэй, D1 нохой, W1 чоно).
 * Байрлалыг GameState-ээс уншина; малчныг input бодит цагаар хөдөлгөдөг тул шууд,
 * морь, нохой, чоныг алхам хооронд зөөлрүүлнэ. Малчин морин дээр эмээлийн өндөрт, хөл нь дөрөөнд (animate.ts seat).
 */
import * as THREE from 'three';
import type { GameState } from '../sim/state';
import { ridingHorse } from '../sim/systems/herder';
import type { Wolf } from '../sim/systems/wolves';
import type { Dog } from '../sim/systems/dogs';
import { visualStyle, type HerderEmotion, type HerderEvent } from './style';
import { animateCharacter } from './character/animate';
import { buildCharacter, dressCharacter } from './character/rig';
import { characters, characterSpec } from './character/spec';
import { talkBus, turnToward } from './character/talk';
import type { Season } from '../sim/config';
import { angDiff } from './util';
import { isTouch, quality as activeQuality, type Quality } from '../device';
import { animalLook } from './animal/config';
import { ageIdxOf } from './animal/model';
import { gaitFor, type Action } from './animal/pose';
import { horseShown, riderSeat } from './animal/ride';
import { saddleDims } from './animal/shapes';
import { bakeAnimal } from './animal/static';
import { ModelAnimals } from './animal/view';

let dogSeq = 0;
/** Сумын төвийн үүдэнд хэвтсэн нохой (sumcenter.ts дуудна): D1 загвар, хэвтсэн позоор шахсан ганц Mesh */
export function makeDog(): { root: THREE.Object3D } {
  return { root: bakeAnimal('dog', { action: 'lie', id: ++dogSeq }).mesh };
}
/** makeDog аль хэдийн хэвтсэн — нийцтэй байлгахын тулд хоосон */
export function poseDogLying(_r: unknown, _t?: number, _baseY?: number): void {}

/** Толгой дээрх «Хөөе!», «Хуу-хай!» бичиг */
function makeBubble(text: string): THREE.Sprite {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 96;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = 'rgba(255,250,235,0.92)';
  ctx.beginPath();
  ctx.roundRect(8, 8, 240, 70, 18);
  ctx.fill();
  ctx.fillStyle = '#5a2a10';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 45);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false, transparent: true }));
  sp.scale.set(2.4, 0.9, 1);
  sp.visible = false;
  sp.renderOrder = 10;
  return sp;
}

const SADDLE = saddleDims(animalLook.species.horse.d);
/** Малчны ташааны өндөр үндэснээс (render/character/parts/leg.ts hip.y) */
const HERDER_HIP = 0.85;   // rig-ийн дотоод м; H.k-аар үржүүлнэ

export class CharactersView {
  readonly group = new THREE.Group();
  /** Чоно, нохой — зөвхөн гэрийн бууцанд харагдана (M4.6) */
  private campGroup = new THREE.Group();
  /** Үндсэн дүр: render/character (data/characters.json player) */
  private herder = buildCharacter(characterSpec('player'));
  /** Унаа морь, нохой, чоно — render/animal/ (бүгд нэг ModelAnimals: хөнгөн/дэлгэрэнгүй, instance) */
  private models: ModelAnimals;
  private quality: Quality = activeQuality;
  private wolves = new Map<number, { x: number; z: number; h: number; phase: number }>();
  private dogs = new Map<number, { x: number; z: number; h: number; phase: number; bark: THREE.Sprite; still: number }>();
  /** Эмээлийн суудлын дэлхийн байрлал (poseAnimal-ийн дараа): малчин энд суудаг */
  private seat: { x: number; y: number; z: number } | null = null;
  private horseSpeed = 0;
  private wolfCamp = '';
  private horsePos = { x: 0, z: 0, h: 0, init: false };
  private lastPlayer = { x: 0, z: 0 };
  private bubbles: Record<'shout' | 'scare' | 'call', { sprite: THREE.Sprite; t: number }>;
  private actionT = 0;   // гараа өргөх хугацаа
  /** Нүүрний сэтгэл хөдлөл: үйл явдлын дараалал [сэтгэл хөдлөл, үлдсэн сек] */
  private emoQueue: Array<[HerderEmotion, number]> = [];
  private seen = { births: 0, losses: 0, threat: false };
  /** R7: ярилцлага — сүүлд уншсан үйл явдлын дугаар, тоглогчийн харах чиглэл (зөвхөн дүрслэл, sim-ийн heading өөрчлөгдөхгүй) */
  private talkSeq = 0;
  private faceYaw: number | null = null;

  /**
   * Утас (data/visuals.json grass.touch): малчны зөвхөн хамгийн том хэсгүүд сүүдэр тусгана — жижиг хэсэг бүрийн сүүдэр
   * тусдаа draw call, жижиг дэлгэцэд харагдахгүй. Загварт хүрэхгүй, зөвхөн сүүдрийн туг.
   */
  private liteShadows(): void {
    const k = visualStyle.grass.touch;
    if (!isTouch || !k.lodShadows) return;
    const casters: THREE.Mesh[] = [];
    this.herder.root.traverse((o) => { if (o instanceof THREE.Mesh && o.castShadow) casters.push(o); });
    casters.sort((a, b) => (b.geometry.attributes.position?.count ?? 0) - (a.geometry.attributes.position?.count ?? 0));
    casters.forEach((m, i) => { if (i >= k.herderShadowParts) m.castShadow = false; });
  }

  constructor() {
    this.liteShadows();
    this.models = new ModelAnimals(this.group, this.quality);
    this.group.add(this.herder.root, this.campGroup);
    this.bubbles = {
      shout: { sprite: makeBubble('Хөөе!'), t: 0 },
      scare: { sprite: makeBubble('Хуу-хай!'), t: 0 },
      call: { sprite: makeBubble('Чүү, нааш!'), t: 0 },
    };
    for (const b of Object.values(this.bubbles)) this.group.add(b.sprite);
  }

  setQuality(quality: Quality): void {
    this.quality = quality;
    this.models.setQuality(quality);
  }

  /** Малчны үйлдлийн дүрслэл (бичиг, гар өргөх) */
  say(kind: 'shout' | 'scare' | 'call'): void {
    for (const [k, b] of Object.entries(this.bubbles)) b.t = k === kind ? 1.2 : 0;
    this.actionT = 0.9;
    this.react(kind);
  }

  /** Үйл явдалд нүүрээр хариу үзүүлнэ (data/visuals.json herderAnim.events) */
  react(event: HerderEvent): void {
    this.emoQueue = visualStyle.herderAnim.events[event].map(([e, sec]) => [e, sec]);
  }

  /** Өдрийн тоо (төл, хорогдол) ба чонын аюулаас сэтгэл хөдлөлийг гаргана; одоогийн сэтгэл хөдлөлийг буцаана */
  private emotion(state: GameState, dt: number): HerderEmotion {
    const d = state.today;
    const losses = d.deaths + Object.values(d.wolfKills).reduce((t, n) => t + n, 0);
    if (d.births > this.seen.births) this.react('birth');
    if (losses > this.seen.losses) this.react('loss');
    const threat = state.player.place === 'camp' && (state.wolves.list as Wolf[]).some((w) => w.mode === 'hunt' || w.mode === 'drag');
    if (threat && !this.seen.threat) this.react('wolf');
    this.seen = { births: d.births, losses, threat };
    const step = this.emoQueue[0];
    if (step) {
      step[1] -= dt;
      if (step[1] <= 0) this.emoQueue.shift();
      return step[0];
    }
    return threat ? visualStyle.herderAnim.threat : 'neutral';
  }

  /** Аялалд малчин тэрэг дээр сууна (M4.5). seat = null бол харагдахгүй (машины кабинд эсвэл газрын зургаас гадуур) */
  seatHerder(seat: { x: number; y: number; z: number; h: number; inCab: boolean } | null): void {
    const H = this.herder;
    if (!seat || seat.inCab) {
      H.root.visible = false;
      return;
    }
    H.root.visible = true;
    H.root.position.set(seat.x, seat.y - 0.75 * H.k, seat.z);
    H.root.rotation.y = seat.h;   // суусан поз → update() (mode 'seated')
  }

  private season: Season | null = null;
  /** Улирал солигдоход малчны хувцас (V4.1) */
  setSeason(season: Season): void {
    if (season === this.season) return;
    this.season = season;
    dressCharacter(this.herder, season);
    this.liteShadows();
  }

  get herderObject(): THREE.Object3D {
    return this.herder.root;
  }

  update(state: GameState, heightAt: (x: number, z: number) => number, dt: number): void {
    const p = state.player;
    // ---- малчин ----
    const moved = Math.hypot(p.x - this.lastPlayer.x, p.z - this.lastPlayer.z);
    const speed = dt > 0 ? Math.min(moved / dt, 30) : 0;
    this.lastPlayer = { x: p.x, z: p.z };
    const y = heightAt(p.x, p.z);
    // M4.6: сумын төвд малчин (морьтой бол морь) харагдана, газрын зураг дээр 3D-д юу ч үгүй
    const shown = p.place !== 'map' && !state.move;
    this.herder.root.visible = shown;
    this.stepAnimals(state, heightAt, dt, speed, shown);
    this.campGroup.visible = p.place === 'camp';
    this.actionT = Math.max(0, this.actionT - dt);
    const H = this.herder;
    if (p.mounted) {
      const s = this.seat;   // эмээлийн суудал (ташааны эх цэг = суудлын орой); ташаа үндэснээс HIP м дээр
      if (s) H.root.position.set(s.x, s.y - HERDER_HIP * H.k, s.z);
      else H.root.position.set(p.x, y + 0.5, p.z);
    } else {
      H.root.position.set(p.x, y, p.z);
    }
    // R7: сумын төвийн хаалганы дэргэд зогсоход ярилцагч руу харж ярина (character/talk.ts — sumcenter бичнэ)
    const partner = p.place === 'sum' && !p.mounted && !p.driving && speed < characters.talk.stillSpeed ? talkBus.partner : null;
    if (talkBus.seq !== this.talkSeq) {
      this.talkSeq = talkBus.seq;
      if (talkBus.event) this.emoQueue = characters.talk.events[talkBus.event].map(([e, sec]) => [e, sec]);
    }
    const talking = Object.values(this.bubbles).some((b) => b.t > 0) || partner !== null;
    const bob = animateCharacter(H, {
      dt,
      speed,
      mode: p.driving ? 'seated' : p.mounted ? 'mounted' : 'foot',
      raise: this.actionT > 0,
      uurga: p.holdingUurga,
      talk: talking,
      emotion: this.emotion(state, dt),
      ...(p.mounted ? { seat: riderSeat() } : {}),
    });
    if (!p.mounted) H.root.position.y += bob;
    if (partner) {
      this.faceYaw = turnToward(this.faceYaw ?? p.heading, Math.atan2(partner.x - p.x, partner.z - p.z), characters.talk.turnRate, dt);
      H.root.rotation.y = this.faceYaw;
    } else {
      this.faceYaw = null;
      H.root.rotation.y = p.heading;
    }
    const uurga = H.root.getObjectByName('uurga');
    if (uurga) uurga.visible = p.holdingUurga;
    const carried = p.carry.reduce((t, c) => t + c.amount, 0);
    const sack = H.root.getObjectByName('sack');
    if (sack) {
      sack.visible = carried > 0;
      const k = 0.5 + Math.min(1, carried / 10) * 0.7;
      sack.scale.set(k, k, k);
    }

    // ---- бичиг ----
    for (const b of Object.values(this.bubbles)) {
      b.t = Math.max(0, b.t - dt);
      b.sprite.visible = b.t > 0 && p.place !== 'map';
      b.sprite.position.set(p.x, y + (p.mounted ? 3.3 : 2.2) + (1.2 - b.t) * 0.3, p.z);
    }

  }

  /**
   * Унаа морь, нохой, чоно: байрлалыг бэлтгэж render/animal/-д өгч (add), кадрын төгсгөлд нэг дор зурна (flush).
   * Морь эмээлтэй; poseAnimal-ийн дараа эмээлийн суудлын байрлалыг `seat`-д хадгална — update() малчныг тэнд суулгана.
   */
  private stepAnimals(state: GameState, heightAt: (x: number, z: number) => number, dt: number, speed: number, shown: boolean): void {
    const p = state.player, look = animalLook.species;
    this.seat = null;
    const rh = ridingHorse(state);
    if (rh && horseShown(p.place, p.mounted, shown)) {
      if (p.mounted) {
        this.horsePos = { x: p.x, z: p.z, h: p.heading, init: true };
        this.horseSpeed = speed;
      } else {   // уяанаас гэр рүү ойртож ирнэ, малчин дагуулж яваа үед
        if (!this.horsePos.init) this.horsePos = { x: rh.x, z: rh.z, h: rh.heading, init: true };
        const k = Math.min(1, dt * 8);
        const hx = this.horsePos.x + (rh.x - this.horsePos.x) * k, hz = this.horsePos.z + (rh.z - this.horsePos.z) * k;
        this.horseSpeed = dt > 0 ? Math.hypot(hx - this.horsePos.x, hz - this.horsePos.z) / dt : 0;
        this.horsePos.h += angDiff(rh.heading, this.horsePos.h) * Math.min(1, dt * 6);
        this.horsePos.x = hx;
        this.horsePos.z = hz;
      }
      const hp = this.horsePos, sp = Math.min(this.horseSpeed, 20), v = new THREE.Vector3();
      this.models.add({
        id: rh.id, species: 'horse', male: rh.sex === 'm', age: Math.max(4, rh.age), old: false, sc: 1, fat: rh.condition, mark: false,
        action: gaitFor(look.horse, sp), speed: sp, fast: sp > 5.3, saddled: true,
        x: hp.x, y: heightAt(hp.x, hp.z), z: hp.z, heading: hp.h, dist: 0,
        onPose: (rig) => { rig.saddle.localToWorld(v.set(0, SADDLE.seat, 0)); this.seat = { x: v.x, y: v.y, z: v.z }; },
      });
    }
    if (p.place === 'camp') {
      this.updateDogs(state, heightAt, dt);
      this.updateWolves(state, heightAt, dt);
    }
    this.models.flush(dt, visualStyle.quality[this.quality].animalAnimationDistance);
  }

  private updateDogs(state: GameState, heightAt: (x: number, z: number) => number, dt: number): void {
    const alive = new Set<number>();
    const pl = state.player, dl = animalLook.species.dog;
    for (const d of state.dogs as Dog[]) {
      alive.add(d.id);
      let v = this.dogs.get(d.id);
      if (!v) {
        v = { x: d.x, z: d.z, h: d.heading, phase: 0, bark: makeBubble('Хав хав!'), still: 0 };
        v.bark.scale.set(1.8, 0.7, 1);
        this.campGroup.add(v.bark);
        this.dogs.set(d.id, v);
      }
      // Нүүх үед шууд шинэ байрлал руу
      if (Math.hypot(d.x - v.x, d.z - v.z) > 25) {
        v.x = d.x;
        v.z = d.z;
      }
      const k = Math.min(1, dt * (d.mode === 'chase' ? 10 : 6));
      const nx = v.x + (d.x - v.x) * k, nz = v.z + (d.z - v.z) * k;
      const sp = dt > 0 ? Math.hypot(nx - v.x, nz - v.z) / dt : 0;
      if (sp > 0.15) v.h += angDiff(Math.atan2(nx - v.x, nz - v.z), v.h) * Math.min(1, dt * 8);
      v.x = nx;
      v.z = nz;
      v.phase += dt * sp * 3;
      // V3.2: удаан хөдлөхгүй (хуцахгүй, хөөхгүй) бол хэвтэнэ
      const dr = visualStyle.dogRest;
      v.still = sp > 0.15 || d.barkT > 0 || d.mode === 'chase' ? 0 : v.still + dt;
      const y = heightAt(v.x, v.z);
      const action: Action = v.still > dr.lieAfterSec ? 'lie' : d.barkT > 0 ? 'bark' : sp > 0.15 ? gaitFor(dl, sp) : 'stand';
      this.models.add({
        id: d.id, species: 'dog', male: true, age: 4, old: false, sc: 1, fat: 0.6, mark: false, action, speed: Math.min(sp, 12), fast: d.mode === 'chase',
        x: v.x, y, z: v.z, heading: v.h, dist: Math.hypot(v.x - pl.x, v.z - pl.z),
      });
      v.bark.visible = d.barkT > 0;
      v.bark.position.set(v.x, y + 1.6 + Math.sin(v.phase * 2) * 0.05, v.z);
    }
    for (const [id, v] of this.dogs) if (!alive.has(id)) {
      this.campGroup.remove(v.bark);
      this.dogs.delete(id);
    }
  }

  private updateWolves(state: GameState, heightAt: (x: number, z: number) => number, dt: number): void {
    const ws = state.wolves, pl = state.player, wl = animalLook.species.wolf;
    if (ws.campId !== this.wolfCamp) {
      this.wolves.clear();
      this.wolfCamp = ws.campId;
    }
    const hour = (state.time.minute / 60) % 24, night = hour < 5 || hour >= 21;
    const alive = new Set<number>();
    for (const w of ws.list as Wolf[]) {
      alive.add(w.id);
      let v = this.wolves.get(w.id);
      if (!v) {
        v = { x: w.x, z: w.z, h: w.heading, phase: 0 };
        this.wolves.set(w.id, v);
      }
      const k = Math.min(1, dt * (w.mode === 'flee' || w.mode === 'hunt' ? 10 : 5));
      const nx = v.x + (w.x - v.x) * k, nz = v.z + (w.z - v.z) * k;
      const sp = dt > 0 ? Math.hypot(nx - v.x, nz - v.z) / dt : 0;
      if (sp > 0.2) v.h += angDiff(Math.atan2(nx - v.x, nz - v.z), v.h) * Math.min(1, dt * 7);
      v.x = nx;
      v.z = nz;
      v.phase += dt * 1;
      if (w.mode === 'den') continue;   // цадсан чоно үүрэндээ (B6) — харагдахгүй
      // Үйлдэл: сэм дөхөх (удаан), хөөх (хурдан), барих (зогсоод шүүрэх), чирэх (алхах), айж зугтах (гүйх), шөнө тайван улих
      let action: Action;
      if (w.mode === 'flee') action = 'run';
      else if (w.mode === 'hunt') action = sp > 2.5 ? 'run' : sp > 0.12 ? 'stalk' : 'catch';
      else if (w.mode === 'drag') action = 'walk';
      else if (sp > 0.2) action = gaitFor(wl, sp);
      else action = night && Math.sin(v.phase * 0.12 + w.id * 2.3) > 0.55 ? 'howl' : 'stand';
      const y = heightAt(v.x, v.z), dist = Math.hypot(v.x - pl.x, v.z - pl.z);
      this.models.add({
        id: w.id, species: 'wolf', male: w.sex !== 'f', age: w.age ?? 4, old: false, sc: animalLook.age.growth[ageIdxOf(w.age ?? 4, false)] ?? 1, fat: 0.5,
        mark: false, action, speed: Math.min(sp, 14), fast: w.mode === 'flee', x: v.x, y, z: v.z, heading: v.h, dist,
      });
      if (w.mode === 'drag') {   // барьсан мал (үүр лүүгээ чирэх): чоночны урд хэвтэнэ
        const fx = v.x + Math.sin(v.h) * 1.15, fz = v.z + Math.cos(v.h) * 1.15;
        this.models.add({ id: 900000 + w.id, species: 'sheep', male: false, age: 3, old: false, sc: 0.8, fat: 0.5, mark: false, action: 'lie', speed: 0, fast: false, x: fx, y: heightAt(fx, fz), z: fz, heading: v.h + 0.9, dist });
      }
    }
    for (const id of this.wolves.keys()) if (!alive.has(id)) this.wolves.delete(id);
  }
}
