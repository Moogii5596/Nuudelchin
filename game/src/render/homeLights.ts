/**
 * Сумын төвийн айл бүрийн гэрэл ба яндангийн утаа. Нэг айл = нэг id (sumlayout HomeDoor.id); гэрэл тухайн айлд хүн байх үед л
 * асна, асах/унтрах цаг id-аас тогтмол хазайна (бүх айл нэг зэрэг биш). Утаа: хоолны цагт (smoke.cookingMinutes) эсвэл өвөл,
 * дотор нь хүнтэй үед. Бүх тоо `data/visuals.json` homeLights. Нийт 2 draw call (цонхны гэрэл Points, утаа instanced).
 *
 * Хүн байгаа эсэх: `getHomeState` — NPC-ийн айл (data/npcs.json home: "plot:<id>") бол NPC-ийн цагаас (npcAt, гэртээ байх үед);
 * бусад айлд түр stub (homeLights.stub.awakeMinutes). Агент 2-ын жинхэнэ getHomeState(plotId) нэгтгэгдэхэд зөвхөн энэ
 * функцийн биеийг сольно — хазайлт, гэрэл, утаа хэвээр.
 */
import * as THREE from 'three';
import visualsJson from '../../../data/visuals.json';
import type { GameConfig } from '../sim/config';
import type { GameState } from '../sim/state';
import { npcAt } from '../sim/systems/npc';
import { seasonOf } from '../sim/systems/seasons';
import { visualStyle } from './style';
import type { HomeDoor } from './sumlayout';

export interface HomeLightsConfig {
  jitterMin: number; minNight: number; fadeSec: number; civicGlow: number;
  stub: { awakeMinutes: [number, number][] };
  window: { color: string; size: number; opacity: number; gerHeight: number };
  smoke: { puffs: number; rise: number; drift: number; periodSec: number; size: [number, number]; opacity: number; color: string; gerHeight: number; farR: number };
}

function parse(json: unknown): HomeLightsConfig {
  const bad = (what: string): never => { throw new Error(`data/visuals.json: homeLights.${what} буруу`); };
  const rec = (v: unknown, what: string): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : bad(what));
  const num = (v: unknown, what: string, lo: number, hi: number): number => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : bad(what));
  const col = (v: unknown, what: string): string => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : bad(what));
  const pair = (v: unknown, what: string, lo: number, hi: number): [number, number] =>
    Array.isArray(v) && v.length === 2 ? [num(v[0], what, lo, hi), num(v[1], what, lo, hi)] : bad(what);
  const h = rec(rec(json, '(root)').homeLights, '(root)');
  const st = rec(h.stub, 'stub'), w = rec(h.window, 'window'), sm = rec(h.smoke, 'smoke');
  if (!Array.isArray(st.awakeMinutes) || st.awakeMinutes.length === 0) bad('stub.awakeMinutes');
  return {
    jitterMin: num(h.jitterMin, 'jitterMin', 0, 240), minNight: num(h.minNight, 'minNight', 0, 1), fadeSec: num(h.fadeSec, 'fadeSec', 0.05, 30), civicGlow: num(h.civicGlow, 'civicGlow', 0, 4),
    stub: { awakeMinutes: (st.awakeMinutes as unknown[]).map((p, i) => pair(p, `stub.awakeMinutes[${i}]`, 0, 1440)) },
    window: { color: col(w.color, 'window.color'), size: num(w.size, 'window.size', 0.2, 20), opacity: num(w.opacity, 'window.opacity', 0, 1), gerHeight: num(w.gerHeight, 'window.gerHeight', 0, 6) },
    smoke: {
      puffs: Math.round(num(sm.puffs, 'smoke.puffs', 1, 12)), rise: num(sm.rise, 'smoke.rise', 0.5, 40), drift: num(sm.drift, 'smoke.drift', 0, 20), periodSec: num(sm.periodSec, 'smoke.periodSec', 1, 60),
      size: pair(sm.size, 'smoke.size', 0.1, 20), opacity: num(sm.opacity, 'smoke.opacity', 0, 1), color: col(sm.color, 'smoke.color'), gerHeight: num(sm.gerHeight, 'smoke.gerHeight', 0, 8), farR: num(sm.farR, 'smoke.farR', 10, 1000),
    },
  };
}
export const homeLights: HomeLightsConfig = parse(visualsJson);

/** id-аас тогтмол [0,1) утга (FNV-1a); salt — ижил id-ийн өөр хазайлт */
export function idHash(id: string, salt = 0): number {
  let h = 2166136261 ^ (salt * 16777619);
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}
const dayMinute = (m: number): number => ((m % 1440) + 1440) % 1440;
const inRanges = (m: number, ranges: readonly (readonly [number, number])[]): boolean => ranges.some(([a, b]) => (a <= b ? m >= a && m < b : m >= a || m < b));

/** Айл бүрийн хүн байгаа эсэх (minute — sim-ийн минут, хазайлт хийгдсэн). known — NPC-ийн цагаас, үгүй бол stub */
export function getHomeState(cfg: GameConfig, day: number, minute: number, id: string): { occupied: boolean; known: boolean } {
  const defs = cfg.npcs.npcs.filter((n) => n.home === `plot:${id}`);
  if (defs.length) return { occupied: defs.some((n) => npcAt(cfg, n, day, minute).mode === 'hidden'), known: true };
  return { occupied: inRanges(dayMinute(minute), homeLights.stub.awakeMinutes), known: false };
}

interface Home { id: string; x: number; z: number; delay: number; level: number; smoke: number; win: [number, number]; pup: [number, number] }

const SMOKE_VERT = /* glsl */ `
attribute vec3 aBase; attribute float aPhase; attribute float aLevel;
uniform float uTime, uPeriod, uRise, uDrift, uSizeA, uSizeB;
varying vec2 vUv; varying float vAlpha;
void main() {
  float t = fract(uTime / uPeriod + aPhase);
  vec3 c = aBase + vec3(uDrift * t, uRise * t, uDrift * 0.4 * t);
  vec4 mv = modelViewMatrix * vec4(c, 1.0);
  mv.xy += position.xy * mix(uSizeA, uSizeB, t);
  gl_Position = projectionMatrix * mv;
  vUv = position.xy * 2.0;
  vAlpha = aLevel * smoothstep(0.0, 0.12, t) * (1.0 - t);
}`;
const SMOKE_FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uOpacity;
varying vec2 vUv; varying float vAlpha;
void main() {
  float a = (1.0 - smoothstep(0.35, 1.0, length(vUv))) * vAlpha * uOpacity;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor, a);
}`;

export class HomeLightsView {
  readonly group = new THREE.Group();
  private homes: Home[] = [];
  private cfg: GameConfig;
  private glow: THREE.Points | null = null;
  private smoke: THREE.Mesh | null = null;
  private clock = 0;
  private colors = new Float32Array(0);
  private levels = new Float32Array(0);
  private warm = new THREE.Color(homeLights.window.color);

  constructor(cfg: GameConfig, homes: readonly HomeDoor[]) {
    this.cfg = cfg;
    const W = homeLights.window, S = homeLights.smoke;
    const wpos: number[] = [], base: number[] = [], phases: number[] = [];
    for (const hd of homes) {
      if (!hd.id) continue;
      const w0 = wpos.length / 3, p0 = base.length / 3;
      for (const w of hd.windows ?? []) wpos.push(w.x + w.nx * 0.45, w.y + (hd.ger ? W.gerHeight : 0), w.z + w.nz * 0.45);
      if (hd.chimney) for (let k = 0; k < S.puffs; k++) { base.push(hd.chimney.x, hd.chimney.y + (hd.ger ? S.gerHeight : 0), hd.chimney.z); phases.push((k + idHash(hd.id, 9)) / S.puffs); }
      this.homes.push({ id: hd.id, x: hd.x, z: hd.z, delay: idHash(hd.id, 1) * homeLights.jitterMin, level: 0, smoke: 0, win: [w0, wpos.length / 3], pup: [p0, base.length / 3] });
    }
    const n = wpos.length / 3;
    if (n) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(wpos), 3));
      this.colors = new Float32Array(n * 3);
      geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
      this.glow = new THREE.Points(geo, new THREE.PointsMaterial({
        size: W.size, sizeAttenuation: true, vertexColors: true, map: glowTexture(), transparent: true, opacity: W.opacity,
        depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      }));
      this.glow.frustumCulled = false;
      this.glow.name = 'home-glow';
      this.group.add(this.glow);
    }
    const m = base.length / 3;
    if (m) {
      const quad = new THREE.PlaneGeometry(1, 1);
      const geo = new THREE.InstancedBufferGeometry();
      geo.index = quad.index;
      geo.setAttribute('position', quad.getAttribute('position'));
      geo.instanceCount = m;
      geo.setAttribute('aBase', new THREE.InstancedBufferAttribute(new Float32Array(base), 3));
      geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(new Float32Array(phases), 1));
      this.levels = new Float32Array(m);
      geo.setAttribute('aLevel', new THREE.InstancedBufferAttribute(this.levels, 1));
      const mat = new THREE.ShaderMaterial({
        vertexShader: SMOKE_VERT, fragmentShader: SMOKE_FRAG, transparent: true, depthWrite: false,
        uniforms: {
          uTime: { value: 0 }, uPeriod: { value: S.periodSec }, uRise: { value: S.rise }, uDrift: { value: S.drift },
          uSizeA: { value: S.size[0] }, uSizeB: { value: S.size[1] }, uColor: { value: new THREE.Color(S.color) }, uOpacity: { value: S.opacity },
        },
      });
      this.smoke = new THREE.Mesh(geo, mat);
      this.smoke.frustumCulled = false;
      this.smoke.name = 'home-smoke';
      this.group.add(this.smoke);
    }
  }

  /** night 0–1; (px, pz) — тоглогч (алс айлын утааг хасна). Кадр бүр дуудна, цагийг өөрөө хэмжинэ */
  update(state: GameState, night: number, px: number, pz: number): void {
    const now = performance.now();
    const dt = this.clock ? Math.min(0.1, (now - this.clock) / 1000) : 0;
    this.clock = now;
    const winter = seasonOf(this.cfg, state.time.day) === 'winter', cook = visualStyle.smoke.cookingMinutes;
    const k = Math.min(1, dt / homeLights.fadeSec), dark = night > homeLights.minNight ? 1 : 0, farR2 = homeLights.smoke.farR ** 2;
    let dirtyC = false, dirtyS = false;
    for (const h of this.homes) {
      const m = state.time.minute - h.delay;
      const occ = getHomeState(this.cfg, state.time.day, m, h.id).occupied;
      const prev = h.level;
      h.level += ((occ ? dark : 0) - h.level) * k;
      if (Math.abs(h.level - prev) > 1e-4 || dt === 0) {
        const v = h.level < 0.003 ? 0 : h.level;
        for (let i = h.win[0]; i < h.win[1]; i++) { this.colors[i * 3] = this.warm.r * v; this.colors[i * 3 + 1] = this.warm.g * v; this.colors[i * 3 + 2] = this.warm.b * v; }
        dirtyC = true;
      }
      if (h.pup[1] > h.pup[0]) {
        const mm = dayMinute(m), burn = occ && (winter || cook.some((r) => mm >= r[0] && mm < r[1]));
        const near = (px - h.x) ** 2 + (pz - h.z) ** 2 < farR2;
        const ps = h.smoke;
        h.smoke += ((burn && near ? 1 : 0) - h.smoke) * k;
        if (h.smoke < 0.003) h.smoke = 0;
        if (h.smoke !== ps || dt === 0) { this.levels.fill(h.smoke, h.pup[0], h.pup[1]); dirtyS = true; }
      }
    }
    if (dirtyC && this.glow) (this.glow.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    if (this.smoke) {
      if (dirtyS) (this.smoke.geometry.getAttribute('aLevel') as THREE.BufferAttribute).needsUpdate = true;
      const u = (this.smoke.material as THREE.ShaderMaterial).uniforms;
      u.uTime!.value = now / 1000;
      (u.uColor!.value as THREE.Color).set(homeLights.smoke.color).multiplyScalar(1 - 0.6 * night);
    }
  }

  dispose(): void {
    if (this.glow) { this.glow.geometry.dispose(); const m = this.glow.material as THREE.PointsMaterial; m.map?.dispose(); m.dispose(); }
    if (this.smoke) { this.smoke.geometry.dispose(); (this.smoke.material as THREE.Material).dispose(); }
  }
}

function glowTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  if (!g) return null;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.3, 'rgba(255,255,255,0.5)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}
