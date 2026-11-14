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
  heatmap = false;
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private homeLight: THREE.PointLight;
  private skyCol = new THREE.Color();
  private homePos: { x: number; z: number };
  private camPos: { x: number; z: number } | null = null;
  private grassT = 0;
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();

  constructor(container: HTMLElement, cfg: GameConfig, state: GameState) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
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
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
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
    this.scene.add(this.terrain.group, this.animals.group, this.characters.group, this.items.group, this.zones.group, this.vehicles.group);
    this.terrain.sync(state);
    this.terrain.updateGrass(state, this.heatmap);

    window.addEventListener('resize', () => {
      this.cam.resize(container.clientWidth / container.clientHeight);
      this.renderer.setSize(container.clientWidth, container.clientHeight);
    });
  }

  heightAt = (x: number, z: number): number => this.terrain.heightAt(x, z);

  /** Sim алхмын өмнө (interpolation) */
  snapshot(state: GameState): void {
    this.animals.snapshot(state);
  }

  /** Дэлгэцийн цэгээс газрын байрлал */
  pickGround(ndcX: number, ndcY: number): { x: number; z: number } | null {
    this.ndc.set(ndcX, ndcY);
    this.ray.setFromCamera(this.ndc, this.cam.camera);
    const hit = this.ray.intersectObject(this.terrain.ground, false)[0];
    return hit ? { x: hit.point.x, z: hit.point.z } : null;
  }

  toggleHeatmap(state: GameState): void {
    this.heatmap = !this.heatmap;
    this.terrain.updateGrass(state, this.heatmap);
  }

  /** Нэг кадр. alpha — sim алхам хоорондын хувь, stepSec — нэг алхмын бодит секунд (0 = зогссон) */
  frame(state: GameState, alpha: number, dt: number, stepSec: number): void {
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
    this.characters.update(state, this.heightAt, dt);
    this.items.update(state, this.heightAt, dt);
    this.zones.update(state, this.heightAt);
    this.vehicles.update(state, this.heightAt, dt, alpha);
    if (state.trip) this.characters.seatHerder(this.vehicles.seatOf(state));
    this.applyDaylight(state.time.minute);

    const p = state.player;
    // Аялалд камер машиныг жигд дагана (малчны sim байрлал алхам бүрт үсэрдэг), газрын зургаас гарвал хот руу эргэнэ
    const focus = this.vehicles.cameraFocus(state);
    const goal = focus ?? { x: p.x, z: p.z };
    if (!this.camPos || !focus) this.camPos = { x: goal.x, z: goal.z };
    else {
      const k = Math.hypot(goal.x - this.camPos.x, goal.z - this.camPos.z) > 40 ? Math.min(1, dt * 2.5) : 1;
      this.camPos.x += (goal.x - this.camPos.x) * k;
      this.camPos.z += (goal.z - this.camPos.z) * k;
    }
    const cx = this.camPos.x, cz = this.camPos.z;
    const ty = this.heightAt(cx, cz) + (p.mounted && !focus ? 2.4 : 1.6);
    this.cam.update(cx, cz, ty, this.heightAt);
    // Сүүдрийн хайрцаг малчныг дагана
    this.sun.position.set(cx + 60, 95, cz + 35);
    this.sun.target.position.set(cx, 0, cz);
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
    const dusk = Math.max(0, 1 - Math.abs(day - 0.5) * 2) * (m > 900 || m < 500 ? 1 : 0);  // үүр, бүрэнхий
    const DAY = 0x8cc4f0, NIGHT = 0x0b1430, DUSK = 0xe89a6a;
    this.skyCol.set(NIGHT).lerp(new THREE.Color(DAY), day).lerp(new THREE.Color(DUSK), dusk * 0.55);
    (this.scene.background as THREE.Color).copy(this.skyCol);
    const fog = this.scene.fog as THREE.Fog;
    fog.color.copy(this.skyCol);
    fog.far = 140 + 160 * day;
    this.hemi.intensity = 0.28 + 0.82 * day;
    this.hemi.color.set(0x8090c0).lerp(new THREE.Color(0xdfeeff), day);
    this.sun.intensity = 0.35 + 1.55 * day;
    this.sun.color.set(0x9fb4ff).lerp(new THREE.Color(0xfff1d6), day).lerp(new THREE.Color(0xffb07a), dusk * 0.5);
    this.homeLight.intensity = (1 - day) * 9;
    this.homeLight.position.set(this.homePos.x + 1.5, 2.2, this.homePos.z + 2.5);
  }

  /** Гүйцэтгэлийн мэдээлэл (HUD) */
  get drawCalls(): number {
    return this.renderer.info.render.calls;
  }
}
