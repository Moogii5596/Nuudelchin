/**
 * V6.3 Сумын төвийн NPC-ийн дүрслэл. Байрлал, үйлдэл нь sim/systems/npc.ts `npcAt` (цаг, өдрөөс тогтмол) — энд зөвхөн зурна.
 * Гадаа (сумын төв): ойр (crowd.nearR) хамгийн ойрын K хүн амьд дүр (алхаа, ам хөдлөх), бусад нь холын хялбаршуулсан
 * (хүн бүр 1 mesh, сүүдэргүй). Барилга дотор: тухайн барилгын NPC өрөөний байрлалд (render/interior.ts-ийн дүр зурагт).
 * Ярилцлага: хамгийн ойр NPC (talk.partnerR) тоглогч руу эргэж, ам хөдөлгөж, өөрийн 3 мөр үгийг ээлжлэн хэлнэ (i18n/npcStrings).
 * Тавилга (V6.2) ирэхээр өрөөний байрлал `inside` нь spot-оор солигдоно.
 */
import * as THREE from 'three';
import type { GameConfig } from '../sim/config';
import type { GameState } from '../sim/state';
import { allBuildings, doorPoint, facingOf } from '../sim/systems/sumtown';
import { npcAt, awayBuildings, type NpcDef, type NpcNow } from '../sim/systems/npc';
import { seasonOf } from '../sim/systems/seasons';
import { pushOut, type WalkSolids } from '../sim/systems/sumwalk';
import { buildCharacter, showOutfit, type CharacterRig } from './character/rig';
import { animateCharacter } from './character/animate';
import { makeCrowdFar, type CrowdLook } from './character/crowd';
import { characters, characterSpec, withColors, type CharacterSpec } from './character/spec';
import { talkBus, turnToward } from './character/talk';
import { visualStyle } from './style';
import { npcLine, npcText } from '../i18n/npcStrings';
import { quality } from '../device';

/** Амьд дүрийн дээд тоо (чанараар; нэг амьд дүр ≈ 12 draw call, сүүдэртэй 24 — high ≤ 200, low ≤ 120 төсөв): бусад нь холын хялбаршуулсан */
const MAX_LIVE: Record<string, number> = { high: 4, mid: 3, low: 2 };
const LINE_SECONDS = 6;
const FACING_YAW = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 } as const;
const hex = (s: string): number => parseInt(s.slice(1), 16);

interface Entry {
  def: NpcDef;
  rig: CharacterRig | null;
  far: THREE.Mesh | null;
  yaw: number;
  px: number; pz: number; speed: number;
  placed: boolean;
  lineNo: number;
  scale: number;
  /** тоглогчийг тойрох зөөлөн шилжилт (м) */
  ox: number; oz: number;
}

export class NpcView {
  readonly group = new THREE.Group();
  private entries: Entry[];
  private season = '';
  private awaySign: THREE.Mesh | null = null;
  private talkWith: { e: Entry; t: number; line: number } | null = null;
  private speech: HTMLDivElement | null = null;
  private readonly maxLive = MAX_LIVE[quality] ?? 5;
  /** Камерын байрлал (scene тавина): камер дүрийн биед орвол тэр дүрийг нууна */
  camera: THREE.Vector3 | null = null;
  /** Алхалтын саад (сумын төв) — гаднах NPC-ийг барилга, хашаанаас түлхэнэ */
  walk: WalkSolids | null = null;
  /** Одоогийн sim минутын дотор өнгөрсөн хувь 0–1 (scene.frame-ийн alpha) */
  minuteFrac = 0;

  constructor(private readonly cfg: GameConfig) {
    this.group.name = 'npcs';
    this.entries = cfg.npcs.npcs.map((def) => ({ def, rig: null, far: null, yaw: 0, px: 0, pz: 0, speed: 0, placed: false, lineNo: 0, scale: def.look.figure?.stature ?? 1, ox: 0, oz: 0 }));
  }

  // ---------- төрх ----------
  private spec(e: Entry): CharacterSpec {
    const s = characterSpec(e.def.look.preset), c = e.def.look.colors;
    return c?.deel && c.hem ? withColors(s, { deel: hex(c.deel), hem: hex(c.hem) }) : s;
  }
  /** Улирлын төрх: бие (terleg|deel|winter), малгай — preset-ийн wear, байхгүй бол visuals.json outfits */
  private look(e: Entry): { body: CrowdLook['body']; hat: CrowdLook['hat'] } {
    const sv = visualStyle.outfits.seasons[this.season as keyof typeof visualStyle.outfits.seasons], sp = characterSpec(e.def.look.preset);
    return { body: sv.body, hat: sp.wear?.[this.season as keyof typeof visualStyle.outfits.seasons] ?? sv.hat };
  }
  private ensureRig(e: Entry): CharacterRig {
    if (e.rig) return e.rig;
    const { body, hat } = this.look(e);
    const rig = buildCharacter(this.spec(e), { detail: 'npc', hats: hat === 'none' ? [] : [hat] });
    showOutfit(rig.root, body, hat);
    if (!characters.crowd.liveShadow) rig.root.traverse((o) => { o.castShadow = false; });
    rig.root.scale.setScalar(e.scale);
    e.rig = rig;
    return rig;
  }
  private ensureFar(e: Entry): THREE.Mesh {
    if (e.far) return e.far;
    const { body, hat } = this.look(e), c = e.def.look.colors;
    const part = makeCrowdFar({ preset: e.def.look.preset, body, hat, ...(c?.deel && c.hem ? { colors: { deel: hex(c.deel), hem: hex(c.hem) } } : {}) });
    const m = new THREE.Mesh(part.geometry, part.material);
    m.castShadow = false;
    m.scale.setScalar(e.scale);
    e.far = m;
    this.group.add(m);
    return m;
  }
  private syncSeason(state: GameState): void {
    const s = seasonOf(this.cfg, state.time.day);
    if (s === this.season) return;
    this.season = s;
    for (const e of this.entries) {            // улирал солигдвол хувцсыг дахин угсарна
      if (e.rig) { e.rig.root.removeFromParent(); e.rig.root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); }); e.rig = null; }
      if (e.far) { e.far.removeFromParent(); e.far = null; }
    }
  }

  // ---------- нийтлэг ----------
  private now(state: GameState): NpcNow[] {
    // sim минутаар алхдаг (3 м/с × 0.33 с = 1 м үсрэлт) — кадрын хувиар (minuteFrac) минут доторх байрлалыг зөөлрүүлнэ
    return this.entries.map((e) => npcAt(this.cfg, e.def, state.time.day, state.time.minute + this.minuteFrac));
  }
  private measure(e: Entry, x: number, z: number, dt: number): void {
    if (!e.placed) { e.placed = true; e.px = x; e.pz = z; e.speed = 0; return; }
    const d = Math.hypot(x - e.px, z - e.pz);
    const v = dt > 0 && d < 6 ? d / dt : 0;
    e.speed += (Math.min(5, v) - e.speed) * Math.min(1, dt * 8);
    e.px = x; e.pz = z;
  }
  private drive(e: Entry, n: NpcNow, x: number, y: number, z: number, dt: number, playerX: number, playerZ: number, talking: boolean): void {
    const rig = this.ensureRig(e);
    if (!e.yaw && !e.placed) e.yaw = n.heading;
    // тоглогчийн биеэс (1.15 м) түлхэгдэж зөөлөн тойрно — тоглогчийн дэргэд, биед нь зогсохгүй
    const dx = x - playerX, dz = z - playerZ, d = Math.hypot(dx, dz), MINP = 1.15;
    let tx = 0, tz = 0;
    if (d < MINP) { const nx = d > 1e-3 ? dx / d : Math.cos(n.heading + Math.PI / 2), nz = d > 1e-3 ? dz / d : -Math.sin(n.heading + Math.PI / 2); tx = nx * MINP - dx; tz = nz * MINP - dz; }
    const kk = Math.min(1, dt * 7);
    e.ox += (tx - e.ox) * kk; e.oz += (tz - e.oz) * kk;
    x += e.ox; z += e.oz;
    if (this.walk) { const q = pushOut(this.walk, x, z, this.cfg.worldmap.sum3d.walk.npcR); x = q.x; z = q.z; }   // барилга, хашааг нэвтлэхгүй
    this.measure(e, x, z, dt);
    const target = talking ? Math.atan2(playerX - x, playerZ - z) : n.heading;
    e.yaw = turnToward(e.yaw, target, talking ? characters.talk.turnRate : 8, dt);
    rig.root.position.set(x, y, z);
    rig.root.rotation.y = e.yaw;
    const bob = animateCharacter(rig, { dt, speed: talking ? 0 : e.speed, mode: 'foot', raise: false, uurga: false, talk: talking, emotion: 'neutral' });
    rig.root.position.y = y + bob * e.scale;
    if (this.camera && Math.hypot(this.camera.x - x, this.camera.y - (rig.root.position.y + 0.62 * e.scale), this.camera.z - z) < 1.5 * e.scale) rig.root.visible = false;   // камер биед орвол нууна
  }

  /** Ярилцлага: хамгийн ойр, зогсож буй NPC (амьд дүр) руу; тоглогч бас зогсож байх ёстой */
  private pickTalk(cands: { e: Entry; d: number }[], active: boolean, dt: number): Entry | null {
    const T = characters.talk;
    let best: { e: Entry; d: number } | null = null;
    for (const c of cands) if (c.d < T.partnerR && c.e.speed < T.stillSpeed && (!best || c.d < best.d)) best = c;
    if (!active || !best) { this.talkWith = null; this.showSpeech(null); return null; }
    if (!this.talkWith || this.talkWith.e !== best.e) {
      best.e.lineNo++;
      this.talkWith = { e: best.e, t: 0, line: best.e.lineNo };
    } else {
      this.talkWith.t += dt;
      if (this.talkWith.t >= LINE_SECONDS) { this.talkWith.t = 0; best.e.lineNo++; this.talkWith.line = best.e.lineNo; }
    }
    this.showSpeech(`${best.e.def.name}: «${npcLine(best.e.def.id, this.talkWith.line)}»`);
    return best.e;
  }
  private showSpeech(text: string | null): void {
    if (text === null) { if (this.speech) this.speech.style.display = 'none'; return; }
    if (!this.speech) {
      const d = document.createElement('div');
      d.setAttribute('data-npc-speech', '');
      d.style.cssText = 'position:fixed;left:50%;bottom:112px;transform:translateX(-50%);max-width:min(92vw,560px);padding:8px 14px;background:rgba(20,16,12,.8);color:#fff4dc;border-radius:10px;font:15px/1.35 system-ui,sans-serif;text-align:center;pointer-events:none;z-index:20;display:none;box-shadow:0 2px 10px rgba(0,0,0,.4)';
      document.body.appendChild(d);
      this.speech = d;
    }
    if (this.speech.textContent !== text) this.speech.textContent = text;
    this.speech.style.display = 'block';
  }

  // ---------- гаднах (сумын төв) ----------
  /** Буцаах нь ярилцаж буй NPC-ийн байрлал (talkBus.partner), эсвэл null */
  updateOutdoor(state: GameState, dt: number, heightAt: (x: number, z: number) => number, px: number, pz: number, pspeed: number): { x: number; z: number } | null {
    this.group.visible = true;
    this.syncSeason(state);
    this.syncAwaySign(state, heightAt);
    const nows = this.now(state), R = characters.crowd.nearR;
    const cand: { e: Entry; n: NpcNow; d: number }[] = [];
    this.entries.forEach((e, i) => {
      const n = nows[i]!;
      if (n.mode !== 'out') { this.hideEntry(e); return; }
      cand.push({ e, n, d: Math.hypot(n.x - px, n.z - pz) });
    });
    cand.sort((a, b) => a.d - b.d);
    const live = cand.filter((c, i) => c.d < R && i < this.maxLive);
    const liveSet = new Set(live.map((c) => c.e));
    // ярилцлага: ойрын амьд дүрүүдээс
    const talker = this.pickTalk(live.map((c) => ({ e: c.e, d: c.d })), pspeed < characters.talk.stillSpeed, dt);
    for (const c of cand) {
      const y = heightAt(c.n.x, c.n.z);
      if (liveSet.has(c.e)) {
        const rig = this.ensureRig(c.e);
        if (rig.root.parent !== this.group) this.group.add(rig.root);
        if (c.e.far) c.e.far.visible = false;
        rig.root.visible = true;
        this.drive(c.e, c.n, c.n.x, y, c.n.z, dt, px, pz, talker === c.e);
      } else {
        if (c.e.rig) c.e.rig.root.visible = false;
        const f = this.ensureFar(c.e);
        this.measure(c.e, c.n.x, c.n.z, dt);
        c.e.yaw = c.n.heading;
        f.visible = true;
        f.position.set(c.n.x, y, c.n.z);
        f.rotation.y = c.n.heading;
      }
    }
    return talker ? { x: talker.px, z: talker.pz } : null;
  }

  private hideEntry(e: Entry): void {
    if (e.far) e.far.visible = false;
    if (e.rig) e.rig.root.visible = false;
    e.placed = false;
    e.speed = 0;
  }

  /** Тоглогч сумын төвөөс гадна/барилга дотор: гаднах NPC-үүдийг нууна */
  hideOutdoor(): void {
    this.group.visible = false;
    for (const e of this.entries) if (e.rig && e.rig.root.parent === this.group) e.rig.root.visible = false;
    this.talkWith = null;
    this.showSpeech(null);
  }

  // ---------- барилга дотор ----------
  /** Орсон барилгын (door id) NPC-үүд өрөөний байрлалд. parent — дотор дүр зураг; өрөөнийх нь координат */
  updateIndoor(state: GameState, dt: number, parent: THREE.Object3D, building: string, px: number, pz: number, pspeed: number): { x: number; z: number } | null {
    this.syncSeason(state);
    const nows = this.now(state), cand: { e: Entry; n: NpcNow; d: number }[] = [];
    this.entries.forEach((e, i) => {
      const n = nows[i]!;
      if (n.mode === 'in' && n.building === building) cand.push({ e, n, d: Math.hypot(n.x - px, n.z - pz) });
      else if (e.rig && e.rig.root.parent === parent) { e.rig.root.removeFromParent(); this.hideEntry(e); }
    });
    cand.sort((a, b) => a.d - b.d);
    for (const c of cand.splice(this.maxLive + 3)) if (c.e.rig) { c.e.rig.root.visible = false; c.e.speed = 0; }   // өрөөнд харагдах амьд дүрийн дээд тоо (draw call төсөв)
    for (const c of cand) {
      const rig = c.e.rig ?? this.ensureRig(c.e);
      if (rig.root.parent !== parent) parent.add(rig.root);
      rig.root.visible = true;
      c.e.speed = 0; c.e.placed = true;
    }
    const talker = this.pickTalk(cand.map((c) => ({ e: c.e, d: c.d })), pspeed < characters.talk.stillSpeed, dt);
    for (const c of cand) this.drive(c.e, c.n, c.n.x, 0, c.n.z, dt, px, pz, talker === c.e);
    const tn = talker ? cand.find((c) => c.e === talker) : undefined;
    talkBus.partner = tn ? { x: tn.n.x, z: tn.n.z } : null;
    return talkBus.partner;
  }

  /** Дотроос гарсан: NPC-үүдийг гаднах бүлэгт буцаана (нуугдсан) */
  leaveIndoor(): void {
    for (const e of this.entries) if (e.rig) { this.group.add(e.rig.root); e.rig.root.visible = false; e.placed = false; }
    this.talkWith = null;
    this.showSpeech(null);
    talkBus.partner = null;
  }

  // ---------- «Айлд явсан» шошго ----------
  private syncAwaySign(state: GameState, heightAt: (x: number, z: number) => number): void {
    const away = awayBuildings(this.cfg, state.time.day, state.time.minute);
    if (!this.awaySign) {
      const id = this.cfg.npcs.npcs.find((n) => n.away)?.away;
      const b = id ? allBuildings(this.cfg.sumcenter).find((x) => x.id === id) : undefined;
      if (!b) return;
      const cv = document.createElement('canvas');
      cv.width = 512; cv.height = 128;
      const c = cv.getContext('2d')!;
      c.fillStyle = '#7a2a1a'; c.fillRect(0, 0, 512, 128);
      c.strokeStyle = '#ffe9a8'; c.lineWidth = 8; c.strokeRect(6, 6, 500, 116);
      c.fillStyle = '#ffe9a8'; c.font = 'bold 58px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(npcText('npc.away'), 256, 68);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) }));
      const yaw = FACING_YAW[facingOf(b)], d = doorPoint(b), back = 2 - 0.12;
      const fx = d.x - Math.sin(yaw) * back, fz = d.z - Math.cos(yaw) * back;
      m.position.set(fx, heightAt(fx, fz) + 2.8, fz);
      m.rotation.y = yaw;
      m.name = 'npc-away';
      this.group.add(m);
      this.awaySign = m;
      this.awayBuilding = b.id;
    }
    this.awaySign.visible = away.has(this.awayBuilding);
  }
  private awayBuilding = '';
}
