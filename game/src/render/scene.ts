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
  heatmap = false;
  private sun: THREE.DirectionalLight;
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
    this.scene.add(new THREE.HemisphereLight(0xdfeeff, 0x6b5a3a, 1.1));
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
    this.scene.add(this.terrain.group, this.animals.group, this.characters.group, this.items.group);
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

    const p = state.player;
    const ty = this.heightAt(p.x, p.z) + (p.mounted ? 2.4 : 1.6);
    this.cam.update(p.x, p.z, ty, this.heightAt);
    // Сүүдрийн хайрцаг малчныг дагана
    this.sun.position.set(p.x + 60, 95, p.z + 35);
    this.sun.target.position.set(p.x, 0, p.z);
    this.renderer.render(this.scene, this.cam.camera);
  }

  /** Гүйцэтгэлийн мэдээлэл (HUD) */
  get drawCalls(): number {
    return this.renderer.info.render.calls;
  }
}
