/**
 * Малчин (render/character — нэг кодын сан), унаа морь, чоно, нохой (прототип v1.2-ын загварууд, энгийн Mesh).
 * Байрлалыг GameState-ээс уншина; малчныг input бодит цагаар хөдөлгөдөг тул шууд,
 * морь ба чоныг алхам хооронд зөөлрүүлнэ.
 */
import * as THREE from 'three';
import type { GameState } from '../sim/state';
import { ridingHorse } from '../sim/systems/herder';
import type { Wolf } from '../sim/systems/wolves';
import type { Dog } from '../sim/systems/dogs';
import { visualStyle, type HerderEmotion, type HerderEvent } from './style';
import { animateCharacter } from './character/animate';
import { buildCharacter, dressCharacter } from './character/rig';
import { characterSpec } from './character/spec';
import type { Season } from '../sim/config';
import { angDiff, limb, meshBox, mat } from './util';

export interface Rig {
  root: THREE.Group;
  legs: THREE.Group[];
  arms: THREE.Group[];
  head?: THREE.Group;
  tail?: THREE.Object3D;
}

export function makeHorse(color: number): Rig {
  const g = new THREE.Group();
  const dk = 0x2a1c12;
  meshBox(0.6, 0.7, 1.5, color, 0, 1.3, 0, g);
  meshBox(0.32, 0.8, 0.36, color, 0, 1.75, 0.72, g).rotation.x = 0.55;
  meshBox(0.3, 0.32, 0.62, color, 0, 2.08, 1.12, g);
  meshBox(0.08, 0.55, 0.4, dk, 0, 1.95, 0.62, g).rotation.x = 0.55;
  const tail = meshBox(0.14, 0.8, 0.14, dk, 0, 1.15, -0.85, g);
  tail.name = 'tail';
  tail.rotation.x = 0.35;
  meshBox(0.66, 0.12, 0.6, 0x8b2e2e, 0, 1.7, 0, g);   // эмээлийн гөлөм
  meshBox(0.18, 0.2, 0.6, 0x5a3a20, 0, 1.82, 0, g);   // эмээл
  const legs = ([[-0.2, 0.58], [0.2, 0.58], [-0.2, -0.58], [0.2, -0.58]] as const).map(([x, z]) => limb(0.14, 0.95, color, x, 0.95, z, g));
  return { root: g, legs, arms: [], tail };
}

function makeWolf(): Rig {
  const g = new THREE.Group();
  const c = 0x77716a, dk = 0x4a4540;
  meshBox(0.42, 0.5, 1.15, c, 0, 0.78, 0, g);
  meshBox(0.46, 0.42, 0.4, 0x8a847c, 0, 0.86, 0.42, g);
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 1.0, 0.72);
  g.add(head);
  meshBox(0.34, 0.32, 0.4, c, 0, 0, 0.05, head);
  meshBox(0.18, 0.16, 0.3, dk, 0, -0.06, 0.35, head);
  const eye = new THREE.MeshBasicMaterial({ color: 0xffd34a });
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 4), mat(dk));
    ear.position.set(sx * 0.11, 0.22, -0.02);
    head.add(ear);
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), eye);
    e.position.set(sx * 0.09, 0.06, 0.26);
    head.add(e);
  }
  const tail = meshBox(0.14, 0.14, 0.6, dk, 0, 0.72, -0.78, g);
  tail.name = 'tail';
  tail.rotation.x = 0.6;
  const legs = ([[-0.14, 0.4], [0.14, 0.4], [-0.14, -0.4], [0.14, -0.4]] as const).map(([x, z]) => limb(0.12, 0.56, dk, x, 0.56, z, g));
  // Барьсан мал (үүр лүүгээ чирэх үед)
  const prey = meshBox(0.5, 0.35, 0.8, 0xe8e2d4, 0.25, 0.35, 1.1, g);
  prey.name = 'prey';
  prey.rotation.y = 0.9;
  prey.visible = false;
  return { root: g, legs, arms: [], head, tail };
}

/** Монгол банхар: хар, хүрэн хацартай */
export function makeDog(): Rig {
  const g = new THREE.Group();
  const c = 0x231d19, tan = 0x9a6634;
  meshBox(0.34, 0.4, 0.85, c, 0, 0.62, 0, g);
  meshBox(0.36, 0.34, 0.3, tan, 0, 0.58, 0.32, g);   // цээж
  const head = new THREE.Group();
  head.position.set(0, 0.86, 0.52);
  g.add(head);
  meshBox(0.3, 0.28, 0.32, c, 0, 0, 0, head);
  meshBox(0.16, 0.13, 0.22, tan, 0, -0.05, 0.25, head);
  for (const sx of [-1, 1]) {
    meshBox(0.08, 0.14, 0.05, c, sx * 0.1, 0.18, -0.05, head);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), mat(tan));   // «дөрвөн нүдтэй» хүрэн толбо
    brow.position.set(sx * 0.08, 0.08, 0.165);
    head.add(brow);
  }
  const tail = meshBox(0.1, 0.1, 0.45, c, 0, 0.78, -0.55, g);
  tail.name = 'tail';
  tail.rotation.x = -0.7;   // сүүл (дээш эргэсэн)
  const legs = ([[-0.11, 0.3], [0.11, 0.3], [-0.11, -0.3], [0.11, -0.3]] as const).map(([x, z]) => limb(0.1, 0.45, c, x, 0.45, z, g));
  head.name = 'head';
  return { root: g, legs, arms: [], head, tail };
}

/**
 * V3.2: нохойн хэвтэх поз. t = 0 (зогссон) … 1 (хэвтсэн). Бие доошилж, урд хөл урагш,
 * хойд хөл хойш сунаж, толгой доош, сүүл газарт тэгшэрнэ. Хэмжээ → data/visuals.json dogRest.
 */
export function poseDogLying(r: Rig, t: number, baseY = 0): void {
  const dr = visualStyle.dogRest;
  r.root.position.y = baseY - dr.bodyDrop * t;
  const L = r.legs;
  if (L.length === 4) {
    const fold = (Math.PI / 2) * t;
    L[0]!.rotation.x = L[1]!.rotation.x = -fold;   // урд хөл урагш
    L[2]!.rotation.x = L[3]!.rotation.x = fold;    // хойд хөл хойш
  }
  if (r.head) r.head.rotation.x = dr.headDown * t;
  if (r.tail) r.tail.rotation.x = -0.7 + (dr.tailFlat + 0.7) * t;
}

export function swingLegs(r: Rig, sw: number): void {
  const L = r.legs;
  if (L.length === 4) {
    L[0]!.rotation.x = sw;
    L[1]!.rotation.x = -sw;
    L[2]!.rotation.x = -sw;
    L[3]!.rotation.x = sw;
  }
}

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

export class CharactersView {
  readonly group = new THREE.Group();
  /** Чоно, нохой — зөвхөн гэрийн бууцанд харагдана (M4.6) */
  private campGroup = new THREE.Group();
  /** Үндсэн дүр: render/character (data/characters.json player) */
  private herder = buildCharacter(characterSpec('player'));
  private horse = makeHorse(0x7a4a26);
  private wolves = new Map<number, { rig: Rig; x: number; z: number; h: number; phase: number }>();
  private dogs = new Map<number, { rig: Rig; x: number; z: number; h: number; phase: number; bark: THREE.Sprite; still: number; lie: number }>();
  private wolfCamp = '';
  private horsePhase = 0;
  private horsePos = { x: 0, z: 0, h: 0, init: false };
  private lastPlayer = { x: 0, z: 0 };
  private bubbles: Record<'shout' | 'scare' | 'call', { sprite: THREE.Sprite; t: number }>;
  private actionT = 0;   // гараа өргөх хугацаа
  /** Нүүрний сэтгэл хөдлөл: үйл явдлын дараалал [сэтгэл хөдлөл, үлдсэн сек] */
  private emoQueue: Array<[HerderEmotion, number]> = [];
  private seen = { births: 0, losses: 0, threat: false };

  constructor() {
    this.group.add(this.herder.root, this.horse.root, this.campGroup);
    this.bubbles = {
      shout: { sprite: makeBubble('Хөөе!'), t: 0 },
      scare: { sprite: makeBubble('Хуу-хай!'), t: 0 },
      call: { sprite: makeBubble('Чүү, нааш!'), t: 0 },
    };
    for (const b of Object.values(this.bubbles)) this.group.add(b.sprite);
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
    H.root.position.set(seat.x, seat.y - 0.75, seat.z);
    H.root.rotation.y = seat.h;   // суусан поз → update() (mode 'seated')
  }

  private season: Season | null = null;
  /** Улирал солигдоход малчны хувцас (V4.1) */
  setSeason(season: Season): void {
    if (season === this.season) return;
    this.season = season;
    dressCharacter(this.herder, season);
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
    this.horse.root.visible = shown && Boolean(ridingHorse(state)) && (p.place === 'camp' || p.mounted);
    this.campGroup.visible = p.place === 'camp';
    this.actionT = Math.max(0, this.actionT - dt);
    const H = this.herder;
    if (p.mounted) {
      this.horsePhase += dt * speed * 0.9;
      this.horsePos = { x: p.x, z: p.z, h: p.heading, init: true };
      H.root.position.set(p.x, y + 1.05 + (speed > 0.5 ? Math.abs(Math.sin(this.horsePhase)) * 0.12 : 0), p.z);
    } else {
      H.root.position.set(p.x, y, p.z);
    }
    const talking = Object.values(this.bubbles).some((b) => b.t > 0);
    const bob = animateCharacter(H, {
      dt,
      speed,
      mode: p.driving ? 'seated' : p.mounted ? 'mounted' : 'foot',
      raise: this.actionT > 0,
      uurga: p.holdingUurga,
      talk: talking,
      emotion: this.emotion(state, dt),
    });
    if (!p.mounted) H.root.position.y += bob;
    H.root.rotation.y = p.heading;
    const uurga = H.root.getObjectByName('uurga');
    if (uurga) uurga.visible = p.holdingUurga;
    const carried = p.carry.reduce((t, c) => t + c.amount, 0);
    const sack = H.root.getObjectByName('sack');
    if (sack) {
      sack.visible = carried > 0;
      const k = 0.5 + Math.min(1, carried / 10) * 0.7;
      sack.scale.set(k, k, k);
    }

    // ---- унаа морь ----
    const rh = ridingHorse(state);
    if (rh) {
      if (!p.mounted) {
        if (!this.horsePos.init) this.horsePos = { x: rh.x, z: rh.z, h: rh.heading, init: true };
        const k = Math.min(1, dt * 8);
        const hx = this.horsePos.x + (rh.x - this.horsePos.x) * k;
        const hz = this.horsePos.z + (rh.z - this.horsePos.z) * k;
        const hs = dt > 0 ? Math.hypot(hx - this.horsePos.x, hz - this.horsePos.z) / dt : 0;
        this.horsePhase += dt * hs * 0.9;
        this.horsePos.h += angDiff(rh.heading, this.horsePos.h) * Math.min(1, dt * 6);
        this.horsePos.x = hx;
        this.horsePos.z = hz;
        swingLegs(this.horse, hs > 0.5 ? Math.sin(this.horsePhase) * 0.7 : 0);
      } else {
        swingLegs(this.horse, speed > 0.5 ? Math.sin(this.horsePhase) * 0.7 : 0);
      }
      this.horse.root.position.set(this.horsePos.x, heightAt(this.horsePos.x, this.horsePos.z), this.horsePos.z);
      this.horse.root.rotation.y = this.horsePos.h;
      if (this.horse.tail) this.horse.tail.rotation.x = 0.35 + Math.sin(this.horsePhase * 0.65) * 0.12;
    }

    // ---- бичиг ----
    for (const b of Object.values(this.bubbles)) {
      b.t = Math.max(0, b.t - dt);
      b.sprite.visible = b.t > 0 && p.place !== 'map';
      b.sprite.position.set(p.x, y + (p.mounted ? 4.2 : 3.1) + (1.2 - b.t) * 0.3, p.z);
    }

    this.updateWolves(state, heightAt, dt);
    this.updateDogs(state, heightAt, dt);
  }

  private updateDogs(state: GameState, heightAt: (x: number, z: number) => number, dt: number): void {
    const alive = new Set<number>();
    for (const d of state.dogs as Dog[]) {
      alive.add(d.id);
      let v = this.dogs.get(d.id);
      if (!v) {
        v = { rig: makeDog(), x: d.x, z: d.z, h: d.heading, phase: 0, bark: makeBubble('Хав хав!'), still: 0, lie: 0 };
        v.bark.scale.set(1.8, 0.7, 1);
        this.campGroup.add(v.rig.root, v.bark);
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
      const lieTarget = v.still > dr.lieAfterSec ? 1 : 0;
      v.lie += Math.sign(lieTarget - v.lie) * Math.min(Math.abs(lieTarget - v.lie), dt * dr.blendPerSec * (lieTarget ? 1 : 3));
      const y = heightAt(v.x, v.z);
      v.rig.root.rotation.y = v.h;
      if (v.lie > 0.001) {
        poseDogLying(v.rig, v.lie, y);
        v.rig.root.position.x = v.x;
        v.rig.root.position.z = v.z;
        if (v.rig.tail) v.rig.tail.rotation.x += Math.sin(v.phase * 0.7 + d.id) * 0.05;
      } else {
        swingLegs(v.rig, sp > 0.15 ? Math.sin(v.phase) * 0.8 : 0);
        v.rig.root.position.set(v.x, y + (sp > 0.2 ? Math.abs(Math.sin(v.phase)) * 0.045 : 0), v.z);
        if (v.rig.head) v.rig.head.rotation.x = d.barkT > 0 ? -0.38 + Math.sin(v.phase * 2) * 0.06 : Math.sin(v.phase * 0.4) * 0.035;
        if (v.rig.tail) v.rig.tail.rotation.x = -0.7 + Math.sin(v.phase * 0.7 + d.id) * 0.18;
      }
      v.bark.visible = d.barkT > 0;
      v.bark.position.set(v.x, y + 1.9 + Math.sin(v.phase * 2) * 0.05, v.z);
    }
    for (const [id, v] of this.dogs) if (!alive.has(id)) {
      this.campGroup.remove(v.rig.root, v.bark);
      this.dogs.delete(id);
    }
  }

  private updateWolves(state: GameState, heightAt: (x: number, z: number) => number, dt: number): void {
    const ws = state.wolves;
    if (ws.campId !== this.wolfCamp) {
      for (const w of this.wolves.values()) this.campGroup.remove(w.rig.root);
      this.wolves.clear();
      this.wolfCamp = ws.campId;
    }
    const alive = new Set<number>();
    for (const w of ws.list as Wolf[]) {
      alive.add(w.id);
      let v = this.wolves.get(w.id);
      if (!v) {
        v = { rig: makeWolf(), x: w.x, z: w.z, h: w.heading, phase: 0 };
        this.campGroup.add(v.rig.root);
        this.wolves.set(w.id, v);
      }
      const k = Math.min(1, dt * (w.mode === 'flee' || w.mode === 'hunt' ? 10 : 5));
      const prey = v.rig.root.getObjectByName('prey');
      if (prey) prey.visible = w.mode === 'drag';
      const nx = v.x + (w.x - v.x) * k, nz = v.z + (w.z - v.z) * k;
      const sp = dt > 0 ? Math.hypot(nx - v.x, nz - v.z) / dt : 0;
      if (sp > 0.2) v.h += angDiff(Math.atan2(nx - v.x, nz - v.z), v.h) * Math.min(1, dt * 7);
      v.x = nx;
      v.z = nz;
      v.phase += dt * sp * 2.2;
      swingLegs(v.rig, sp > 0.2 ? Math.sin(v.phase) * 0.7 : 0);
      const stalking = w.mode === 'hunt';
      v.rig.root.position.set(v.x, heightAt(v.x, v.z) + (sp > 0.2 ? Math.abs(Math.sin(v.phase)) * 0.045 : 0) - (stalking ? 0.1 : 0), v.z);
      v.rig.root.rotation.y = v.h;
      if (v.rig.head) v.rig.head.rotation.x = stalking ? -0.24 : w.mode === 'drag' ? 0.12 : Math.sin(v.phase * 0.4) * 0.04;
      if (v.rig.tail) v.rig.tail.rotation.x = (w.mode === 'flee' ? 1 : 0.6) + Math.sin(v.phase * 0.65 + w.id) * 0.16;
      v.rig.root.visible = w.mode !== 'den';   // цадсан чоно үүрэндээ (B6) — харагдахгүй
    }
    for (const [id, v] of this.wolves) if (!alive.has(id)) {
      this.campGroup.remove(v.rig.root);
      this.wolves.delete(id);
    }
  }
}
