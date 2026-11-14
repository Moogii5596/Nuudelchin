/**
 * Three.js дүрслэл. GameState-ийг уншиж зурна, өөрчлөхгүй (architecture.md §3.1).
 * M2: прототип v1.2-ын газар нутаг, малчин, морь, чоно, камер; мал InstancedMesh; бэлчээрийн өнгө.
 */
import * as THREE from 'three';
import type { GameConfig } from '../sim/config';
import type { GameState } from '../sim/state';
import { TerrainView } from './terrain';
import { AnimalsView } from './animals';
import { CharactersView } from './characters';
import { FollowCamera } from './camera';
import { ItemsView } from './items';
import { ZonesView } from './zones';
import { VehiclesView } from './vehicles';
import { angDiff } from './util';
import { SumCenterView } from './sumcenter';
import { WorldMapView } from './worldmap';
import { StaffView } from './staff';
import { seasonLook } from '../sim/systems/seasons';
import { Q, type QualitySpec } from '../device';

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
  private homePos: { x: number; z: number };
  private grassT = 0;
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private cfg: GameConfig;
  private flakes: THREE.Points;
  private flakeVel: Float32Array;
  private winterK = 0;

  constructor(container: HTMLElement, cfg: GameConfig, state: GameState) {
    this.cfg = cfg;
    // Графикийн чанар (device.ts): утсанд нягтрал бага, сүүдэргүй
    this.renderer = new THREE.WebGLRenderer({ antialias: Q.antialias, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, Q.maxDpr));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = Q.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.tabIndex = 0;
    container.appendChild(this.renderer.domElement);

    const sky = 0x8cc4f0;
    this.scene.background = new THREE.Color(sky);
    this.scene.fog = new THREE.Fog(sky, 90, 300);
    this.hemi = new THREE.HemisphereLight(0xdfeeff, 0x6b5a3a, 1.1);
    this.scene.add(this.hemi);
    // Шөнө гэр/майхны дулаан гэрэл (M4.5)
    this.homePos = { x: cfg.camps.home.x, z: cfg.camps.home.z };
    this.homeLight = new THREE.PointLight(0xffb060, 0, 26, 1.6);
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
    const fp = new Float32Array(NF * 3);
    this.flakeVel = new Float32Array(NF);
    for (let i = 0; i < NF; i++) {
      fp[i * 3] = (Math.random() - 0.5) * 90;
      fp[i * 3 + 1] = Math.random() * 40;
      fp[i * 3 + 2] = (Math.random() - 0.5) * 90;
      this.flakeVel[i] = 1.6 + Math.random() * 1.4;
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
  applyQuality(q: QualitySpec): void {
    const r = this.renderer;
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
    this.winterK = look.winter;
    this.applyDaylight(state.time.minute);
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
    if (p.driving) this.characters.seatHerder(this.vehicles.seatOf(state));

    // Жолоодож байхад камер аажмаар тээврийн ард эргэнэ
    if (p.driving) this.cam.yaw += angDiff(p.heading + Math.PI, this.cam.yaw) * Math.min(1, dt * 1.5);
    // Малчныг (жолоодож байвал тээврийг) дагана — байрлал кадр бүр бодит цагаар шинэчлэгддэг тул жигд
    const cx = p.x, cz = p.z;
    const ty = this.heightAt(cx, cz) + (p.mounted || p.driving ? 2.4 : 1.6);
    this.cam.update(cx, cz, ty, this.heightAt);
    // Сүүдрийн хайрцаг малчныг дагана
    this.sun.position.set(cx + 60, 95, cz + 35);
    this.sun.target.position.set(cx, 0, cz);
    this.updateFlakes(look.snowing && p.place === 'camp', cx, ty, cz, dt);
    this.renderer.render(this.scene, this.cam.camera);
  }

  /**
   * Өдөр, шөнийн гэрэл (M4.5). Зуны Монгол: нар ~05:30-д мандаж ~21:30-д жаргана.
   * Шөнө тэнгэр хар хөх, сарны цайвар гэрэл, гэрийн цонхоор дулаан гэрэл гэрэлтэнэ.
   */
  private applyDaylight(minute: number): void {
    const m = ((minute % 1440) + 1440) % 1440;
    const ramp = (a: number, b: number, x: number): number => Math.min(1, Math.max(0, (x - a) / (b - a)));
    const day = m < 720 ? ramp(320, 420, m) : 1 - ramp(1230, 1310, m);   // 0 = шөнө, 1 = өдөр
    this.daylight = day;
    const dusk = Math.max(0, 1 - Math.abs(day - 0.5) * 2) * (m > 900 || m < 500 ? 1 : 0);  // үүр, бүрэнхий
    const DAY = 0x8cc4f0, NIGHT = 0x0b1430, DUSK = 0xe89a6a;
    // Өвөл тэнгэр саарал цэнхэр (M5.5)
    const dayCol = new THREE.Color(DAY).lerp(new THREE.Color(0xbac7d3), this.winterK * 0.8);
    this.skyCol.set(NIGHT).lerp(dayCol, day).lerp(new THREE.Color(DUSK), dusk * 0.55);
    (this.scene.background as THREE.Color).copy(this.skyCol);
    const fog = this.scene.fog as THREE.Fog;
    fog.color.copy(this.skyCol);
    fog.far = (140 + 160 * day) * (1 - 0.3 * this.winterK);
    this.hemi.intensity = 0.28 + 0.82 * day;
    this.hemi.color.set(0x8090c0).lerp(new THREE.Color(0xdfeeff), day);
    this.sun.intensity = 0.35 + 1.55 * day;
    this.sun.color.set(0x9fb4ff).lerp(new THREE.Color(0xfff1d6), day).lerp(new THREE.Color(0xffb07a), dusk * 0.5);
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
}
