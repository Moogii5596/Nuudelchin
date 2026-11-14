/**
 * Three.js дүрслэл. GameState-ийг уншиж зурна, өөрчлөхгүй (architecture.md §3.1).
 * M2: прототип v1.2-ын газар нутаг, малчин, морь, чоно, камер; мал InstancedMesh; бэлчээрийн өнгө.
 */
import * as THREE from 'three';
import type { GameConfig, Season } from '../sim/config';
import type { GameState } from '../sim/state';
import { TerrainView } from './terrain';
import { AnimalsView } from './animals';
import { CharactersView } from './characters';
import { FollowCamera } from './camera';
import { ItemsView } from './items';
import { ZonesView } from './zones';
import { VehiclesView } from './vehicles';
import { angDiff, VisualRng } from './util';
import { SumCenterView } from './sumcenter';
import { WorldMapView } from './worldmap';
import { StaffView } from './staff';
import { seasonLook, seasonOf } from '../sim/systems/seasons';
import { paletteHex, visualStyle, type TimeVisual } from './style';
import { Q, quality as activeQuality, type Quality, type QualitySpec } from '../device';

/** Цасны ширхгийн дугуй бүдэг бараг (canvas) */
function flakeTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.5, 'rgba(255,255,255,0.8)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

/** Бэлчээрийн өнгийг хэр олон удаа шинэчлэх (бодит секунд) */
const GRASS_REFRESH_SEC = 0.4;

export class GameView {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly cam: FollowCamera;
  readonly terrain: TerrainView;
  readonly animals: AnimalsView;
  readonly characters: CharactersView;
  readonly items: ItemsView;
  readonly zones: ZonesView;
  readonly vehicles: VehiclesView;
  readonly sum: SumCenterView;
  readonly map: WorldMapView;
  readonly staff = new StaffView();
  private daylight = 1;
  heatmap = false;
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private homeLight: THREE.PointLight;
  private skyCol = new THREE.Color();
  private skyDome: THREE.Mesh;
  private skyUniforms: { top: { value: THREE.Color }; horizon: { value: THREE.Color }; ground: { value: THREE.Color }; sunDir: { value: THREE.Vector3 }; sunGlow: { value: number } };
  private stars: THREE.Points;
  private sunDisc: THREE.Mesh;
  private moonDisc: THREE.Mesh;
  private sunDirection = new THREE.Vector3();
  private homePos: { x: number; z: number };
  private grassT = 0;
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private cfg: GameConfig;
  private flakes: THREE.Points;
  private flakeVel: Float32Array;

  constructor(container: HTMLElement, cfg: GameConfig, state: GameState) {
    this.cfg = cfg;
    container.setAttribute('data-quality', activeQuality);
    // Графикийн чанар (device.ts): утсанд нягтрал бага, сүүдэргүй
    this.renderer = new THREE.WebGLRenderer({ antialias: Q.antialias, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, Q.maxDpr));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = Q.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.tabIndex = 0;
    container.appendChild(this.renderer.domElement);

    const sky = 0x8cc4f0;
    this.scene.background = new THREE.Color(sky);
    this.scene.fog = new THREE.Fog(sky, 90, 300);
    this.skyUniforms = {
      top: { value: new THREE.Color(sky) },
      horizon: { value: new THREE.Color(0xcfe6f5) },
      ground: { value: new THREE.Color(0x74805c) },
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      sunGlow: { value: 0 },
    };
    this.skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(800, 32, 20),
      new THREE.ShaderMaterial({
        uniforms: this.skyUniforms,
        vertexShader: `
          varying vec3 vDirection;
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vDirection = normalize(worldPosition.xyz - cameraPosition);
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 top;
          uniform vec3 horizon;
          uniform vec3 ground;
          uniform vec3 sunDir;
          uniform float sunGlow;
          varying vec3 vDirection;
          void main() {
            vec3 dir = normalize(vDirection);
            float h = clamp(dir.y, -0.15, 1.0);
            vec3 color = mix(ground, horizon, smoothstep(-0.15, 0.18, h));
            color = mix(color, top, smoothstep(0.12, 0.92, h));
            float sun = pow(max(dot(dir, normalize(sunDir)), 0.0), 24.0);
            color += vec3(1.0, 0.66, 0.38) * sun * sunGlow;
            gl_FragColor = vec4(color, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
      }),
    );
    this.skyDome.renderOrder = -1000;
    this.scene.add(this.skyDome);
    const starPositions = new Float32Array(420 * 3);
    const starRng = new VisualRng(20261114);
    for (let i = 0; i < 420; i++) {
      const y = starRng.range(0.06, 1);
      const a = starRng.range(0, Math.PI * 2);
      const r = Math.sqrt(1 - y * y) * 790;
      starPositions[i * 3] = Math.cos(a) * r;
      starPositions[i * 3 + 1] = y * 790;
      starPositions[i * 3 + 2] = Math.sin(a) * r;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xe7eeff, size: 1.1, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false });
    this.stars = new THREE.Points(starGeo, starMat);
    this.stars.frustumCulled = false;
    this.stars.renderOrder = -999;
    this.scene.add(this.stars);
    this.sunDisc = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffe6b8, toneMapped: false }));
    this.moonDisc = new THREE.Mesh(new THREE.SphereGeometry(2, 10, 8), new THREE.MeshBasicMaterial({ color: paletteHex('moonlight'), toneMapped: false }));
    this.scene.add(this.sunDisc, this.moonDisc);
    this.hemi = new THREE.HemisphereLight(0xdfeeff, 0x6b5a3a, 1.1);
    this.scene.add(this.hemi);
    // Шөнө гэр/майхны дулаан гэрэл (M4.5)
    this.homePos = { x: cfg.camps.home.x, z: cfg.camps.home.z };
    this.homeLight = new THREE.PointLight(paletteHex('firelight'), 0, 26, 1.6);
    this.scene.add(this.homeLight);
    this.sun = new THREE.DirectionalLight(0xfff1d6, 1.9);
    this.sun.castShadow = Q.shadows;
    this.sun.shadow.mapSize.set(Q.shadowMap, Q.shadowMap);
    const sc = this.sun.shadow.camera;
    sc.left = -45;
    sc.right = 45;
    sc.top = 45;
    sc.bottom = -45;
    sc.near = 1;
    sc.far = 260;
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun, this.sun.target);

    this.cam = new FollowCamera(this.renderer.domElement, container.clientWidth / container.clientHeight);
    this.terrain = new TerrainView(cfg);
    this.animals = new AnimalsView(cfg);
    this.characters = new CharactersView();
    this.items = new ItemsView(cfg);
    this.zones = new ZonesView(cfg);
    this.vehicles = new VehiclesView(cfg);
    this.sum = new SumCenterView(cfg);
    this.map = new WorldMapView(cfg);
    this.map.resize(container.clientWidth / container.clientHeight);
    this.scene.add(this.terrain.group, this.animals.group, this.characters.group, this.items.group, this.zones.group, this.vehicles.group, this.sum.group, this.staff.group);
    this.terrain.sync(state);
    this.terrain.updateGrass(state, this.heatmap);
    // Цас орох (M5.5): камерын эргэн тойронд унах ширхэгүүд
    const NF = Q.flakes;
    const flakeRng = new VisualRng(state.seed ^ 0x43534554);
    const fp = new Float32Array(NF * 3);
    this.flakeVel = new Float32Array(NF);
    for (let i = 0; i < NF; i++) {
      fp[i * 3] = (flakeRng.next() - 0.5) * 90;
      fp[i * 3 + 1] = flakeRng.next() * 40;
      fp[i * 3 + 2] = (flakeRng.next() - 0.5) * 90;
      this.flakeVel[i] = 1.6 + flakeRng.next() * 1.4;
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    this.flakes = new THREE.Points(fg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.13, map: flakeTexture(), alphaTest: 0.02, transparent: true, opacity: 0.9, depthWrite: false }));
    this.flakes.frustumCulled = false;
    this.flakes.visible = false;
    this.scene.add(this.flakes);

    window.addEventListener('resize', () => {
      this.cam.resize(container.clientWidth / container.clientHeight);
      this.map.resize(container.clientWidth / container.clientHeight);
      this.renderer.setSize(container.clientWidth, container.clientHeight);
    });
  }

  /** Графикийн чанарыг тоглолтын явцад солих (antialias дараагийн ачаалалтаас) */
  applyQuality(q: QualitySpec, tier: Quality, state: GameState): void {
    const r = this.renderer;
    r.domElement.parentElement?.setAttribute('data-quality', tier);
    r.setPixelRatio(Math.min(window.devicePixelRatio, q.maxDpr));
    r.setSize(r.domElement.clientWidth, r.domElement.clientHeight, false);
    if (r.shadowMap.enabled !== q.shadows || this.sun.shadow.mapSize.x !== q.shadowMap) {
      r.shadowMap.enabled = q.shadows;
      this.sun.castShadow = q.shadows;
      this.sun.shadow.mapSize.set(q.shadowMap, q.shadowMap);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
      // Сүүдэр асах/унтрахад материалуудыг дахин бэлтгэнэ
      const mark = (o: THREE.Object3D): void => {
        const m = (o as THREE.Mesh).material;
        if (Array.isArray(m)) m.forEach((x) => (x.needsUpdate = true));
        else if (m) m.needsUpdate = true;
      };
      this.scene.traverse(mark);
      this.map.scene.traverse(mark);
    }
    this.terrain.setQuality(tier, state, this.heatmap);
    this.animals.setQuality(tier);
  }

  /** Одоогийн 3D газрын өндөр (бууц эсвэл сумын төв) */
  private place: 'camp' | 'sum' | 'map' = 'camp';
  heightAt = (x: number, z: number): number => (this.place === 'sum' ? this.sum.heightAt(x, z) : this.terrain.heightAt(x, z));

  /** Sim алхмын өмнө (interpolation) */
  snapshot(state: GameState): void {
    this.animals.snapshot(state);
    this.map.snapshot(state);
  }

  /** Дэлгэцийн цэгээс газрын байрлал */
  pickGround(ndcX: number, ndcY: number): { x: number; z: number } | null {
    this.ndc.set(ndcX, ndcY);
    this.ray.setFromCamera(this.ndc, this.cam.camera);
    const hit = this.ray.intersectObject(this.place === 'sum' ? this.sum.ground : this.terrain.ground, false)[0];
    return hit ? { x: hit.point.x, z: hit.point.z } : null;
  }

  toggleHeatmap(state: GameState): void {
    this.heatmap = !this.heatmap;
    this.terrain.updateGrass(state, this.heatmap);
  }

  /** Нэг кадр. alpha — sim алхам хоорондын хувь, stepSec — нэг алхмын бодит секунд (0 = зогссон) */
  frame(state: GameState, alpha: number, dt: number, stepSec: number): void {
    const p = state.player;
    this.place = p.place;
    const look = seasonLook(this.cfg, state);
    const season = seasonOf(this.cfg, state.time.day);
    this.applyDaylight(state.time.minute, season, p.x, p.z);
    // Газрын зураг: өөрийн scene, камертай (M4.6)
    if (p.place === 'map') {
      this.cam.mapMode = true;
      this.map.zoom = Math.min(2.2, Math.max(0.45, this.cam.dist / 18));   // хулганы дугуйгаар томруулах
      this.map.yaw = this.cam.mapYaw;
      this.map.pitch = this.cam.mapPitch;
      this.map.update(state, dt, this.daylight, alpha);
      this.renderer.render(this.map.scene, this.map.camera);
      return;
    }
    this.cam.mapMode = false;
    const camp = p.place === 'camp';
    this.terrain.group.visible = this.animals.group.visible = this.items.group.visible = this.zones.group.visible = this.staff.group.visible = camp;
    this.sum.group.visible = !camp;
    this.homeLight.visible = camp;
    if (camp) {
      if (this.terrain.sync(state)) {
        this.animals.reset();
        this.grassT = 0;
      }
      this.grassT -= dt;
      if (this.grassT <= 0) {
        this.grassT = GRASS_REFRESH_SEC;
        this.terrain.updateGrass(state, this.heatmap);
      }
      this.animals.update(state, this.heightAt, alpha, dt, stepSec);
      this.items.update(state, this.heightAt, dt);
      this.zones.update(state, this.heightAt);
      this.staff.update(state, this.heightAt, dt);
    }
    this.characters.update(state, this.heightAt, dt);
    this.vehicles.update(state, this.heightAt, dt);
    this.terrain.updateVisualTime(dt, state.time.minute);
    if (p.driving) this.characters.seatHerder(this.vehicles.seatOf(state));

    // Жолоодож байхад камер аажмаар тээврийн ард эргэнэ
    if (p.driving) this.cam.yaw += angDiff(p.heading + Math.PI, this.cam.yaw) * Math.min(1, dt * 1.5);
    // Малчныг (жолоодож байвал тээврийг) дагана — байрлал кадр бүр бодит цагаар шинэчлэгддэг тул жигд
    const cx = p.x, cz = p.z;
    const ty = this.heightAt(cx, cz) + (p.mounted || p.driving ? 2.4 : 1.6);
    this.cam.update(cx, cz, ty, this.heightAt);
    this.skyDome.position.copy(this.cam.camera.position);
    this.stars.position.copy(this.cam.camera.position);
    this.updateFlakes(look.snowing && p.place === 'camp', cx, ty, cz, dt);
    this.renderer.render(this.scene, this.cam.camera);
  }

  /**
   * Өдөр, шөнийн гэрэл (M4.5). Зуны Монгол: нар ~05:30-д мандаж ~21:30-д жаргана.
   * Шөнө тэнгэр хар хөх, сарны цайвар гэрэл, гэрийн цонхоор дулаан гэрэл гэрэлтэнэ.
   */
  private applyDaylight(minute: number, season: Season, cx: number, cz: number): void {
    const m = ((minute % 1440) + 1440) % 1440;
    const keys = visualStyle.timeOfDay;
    let index = 0;
    while (index < keys.length - 1 && keys[index + 1]!.minute < m) index++;
    const a = keys[index]!;
    const b = keys[Math.min(index + 1, keys.length - 1)]!;
    const span = Math.max(1, b.minute - a.minute);
    const t = Math.min(1, Math.max(0, (m - a.minute) / span));
    const lerp = (x: number, y: number): number => x + (y - x) * t;
    const color = (x: string, y: string): THREE.Color => new THREE.Color(x).lerp(new THREE.Color(y), t);
    const sample: TimeVisual = {
      minute: m,
      skyTop: color(a.skyTop, b.skyTop).getStyle(),
      skyHorizon: color(a.skyHorizon, b.skyHorizon).getStyle(),
      ground: color(a.ground, b.ground).getStyle(),
      sun: color(a.sun, b.sun).getStyle(),
      sunIntensity: lerp(a.sunIntensity, b.sunIntensity),
      hemiIntensity: lerp(a.hemiIntensity, b.hemiIntensity),
      fogDistance: lerp(a.fogDistance, b.fogDistance),
      exposure: lerp(a.exposure, b.exposure),
    };
    const day = Math.max(0, Math.min(1, sample.sunIntensity / 1.65));
    this.daylight = day;
    const seasonStyle = visualStyle.seasons[season];
    const tint = new THREE.Color(seasonStyle.skyTint);
    const top = new THREE.Color(sample.skyTop).lerp(tint, season === 'summer' ? 0 : 0.2);
    const horizon = new THREE.Color(sample.skyHorizon).lerp(tint, season === 'summer' ? 0 : 0.15);
    this.skyUniforms.top.value.copy(top);
    this.skyUniforms.horizon.value.copy(horizon);
    this.skyUniforms.ground.value.set(sample.ground).lerp(tint, season === 'summer' ? 0 : 0.12);
    this.skyCol.copy(horizon);
    (this.scene.background as THREE.Color).copy(this.skyCol);
    const fog = this.scene.fog as THREE.Fog;
    fog.color.copy(this.skyCol);
    fog.far = sample.fogDistance * seasonStyle.fogScale;
    this.renderer.toneMappingExposure = sample.exposure * seasonStyle.exposureScale;
    this.hemi.intensity = sample.hemiIntensity;
    this.hemi.color.copy(horizon);
    this.hemi.groundColor.copy(this.skyUniforms.ground.value);
    this.sun.intensity = sample.sunIntensity * seasonStyle.sunScale;
    this.sun.color.set(sample.sun);
    const daylightStart = 320, daylightEnd = 1310;
    const progress = Math.min(1, Math.max(0, (m - daylightStart) / (daylightEnd - daylightStart)));
    const angle = Math.PI * progress;
    this.sunDirection.set(-Math.cos(angle), Math.max(0.04, Math.sin(angle)), -0.22).normalize();
    this.skyUniforms.sunDir.value.copy(this.sunDirection);
    this.skyUniforms.sunGlow.value = Math.max(0.08, this.sun.intensity);
    this.sun.position.set(cx + this.sunDirection.x * 140, this.sunDirection.y * 140, cz + this.sunDirection.z * 140);
    this.sun.target.position.set(cx, 0, cz);
    this.sunDisc.position.set(cx + this.sunDirection.x * 500, this.sunDirection.y * 500, cz + this.sunDirection.z * 500);
    this.sunDisc.visible = day > 0.22;
    this.moonDisc.position.set(cx - this.sunDirection.x * 420, Math.max(24, 420 * this.sunDirection.y), cz - this.sunDirection.z * 420);
    this.moonDisc.visible = day < 0.28;
    (this.stars.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - day * 3.8);
    this.homeLight.intensity = (1 - day) * 9;
    this.homeLight.position.set(this.homePos.x + 1.5, 2.2, this.homePos.z + 2.5);
  }

  /** Цас орох ширхэгүүд камерын эргэн тойронд (бодит цагаар) */
  private updateFlakes(on: boolean, cx: number, cy: number, cz: number, dt: number): void {
    this.flakes.visible = on;
    if (!on) return;
    const pos = this.flakes.geometry.attributes.position as THREE.BufferAttribute;
    const a = pos.array as Float32Array;
    const t = performance.now() / 1000;
    for (let i = 0; i < this.flakeVel.length; i++) {
      a[i * 3 + 1] = a[i * 3 + 1]! - this.flakeVel[i]! * dt;
      a[i * 3] = a[i * 3]! + Math.sin(t * 0.7 + i) * 0.3 * dt;
      if (a[i * 3 + 1]! < -8) a[i * 3 + 1] = 32;
    }
    pos.needsUpdate = true;
    this.flakes.position.set(cx, cy - 6, cz);
  }

  /** Гүйцэтгэлийн мэдээлэл (HUD) */
  get drawCalls(): number {
    return this.renderer.info.render.calls;
  }

  get triangleCount(): number {
    return this.renderer.info.render.triangles;
  }
}
