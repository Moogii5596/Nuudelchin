/**
 * Three.js дүрслэл. GameState-ийг уншиж зурна, өөрчлөхгүй (architecture.md §3.1).
 * M0: газар (бууцны бэлчээрийн бүсүүд өнгөөр), мал (InstancedMesh), камер.
 * M2-д прототипын газар нутаг, малчин, морь, анимац шилжинэ.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { GameConfig, Species } from '../sim/config';
import { SPECIES } from '../sim/config';
import type { GameState } from '../sim/state';
import { frameKg } from '../sim/systems/animals';

const TYPE_COLORS: Record<string, number> = {
  camp: 0x977c54,
  steppe: 0x8f9a5c,
  meadow: 0x5a9440,
  southSlope: 0x9a9a5a,
  foothill: 0x6f9a48,
  northSlope: 0x3f7a3a,
};

const SPECIES_STYLE: Record<Species, { color: number; size: [number, number, number] }> = {
  sheep: { color: 0xf1ece0, size: [0.7, 0.7, 1.0] },
  goat: { color: 0x8a847c, size: [0.5, 0.7, 0.9] },
  cow: { color: 0x5a3a22, size: [0.9, 1.1, 1.8] },
  horse: { color: 0x9a6b3a, size: [0.6, 1.4, 1.5] },
};

export class GameView {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private herds = new Map<Species, THREE.InstancedMesh>();
  private tmp = new THREE.Object3D();

  constructor(container: HTMLElement, private cfg: GameConfig, state: GameState) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x9fcbee);
    this.scene.fog = new THREE.Fog(0x9fcbee, 120, 320);
    this.scene.add(new THREE.HemisphereLight(0xdfeeff, 0x6b5a3a, 0.9));
    const sun = new THREE.DirectionalLight(0xfff1d6, 1.4);
    sun.position.set(60, 90, 40);
    this.scene.add(sun);

    this.camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.3, 900);
    this.camera.position.set(40, 45, 70);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(10, 0, 0);
    this.controls.maxPolarAngle = Math.PI * 0.47;
    this.controls.update();

    this.buildGround(state.campId);
    this.buildTent();
    this.buildHerds(state);

    window.addEventListener('resize', () => {
      this.camera.aspect = container.clientWidth / container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(container.clientWidth, container.clientHeight);
    });
  }

  /** Бууцны бэлчээрийн бүсүүдийг (camps.json → rings) төвөөс цагираг хэлбэрээр будна */
  private buildGround(campId: string): void {
    const camp = this.cfg.camps.camps[campId];
    if (!camp) return;
    let inner = 0;
    for (const [outer, typeId] of camp.rings) {
      const r = Math.min(outer, 190);
      const geo = new THREE.RingGeometry(inner, r, 64, 1);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: TYPE_COLORS[typeId] ?? 0x888888 }));
      mesh.position.y = -0.01 * inner * 0.001;
      this.scene.add(mesh);
      inner = r;
    }
  }

  private buildTent(): void {
    const tent = new THREE.Mesh(new THREE.ConeGeometry(2, 2.2, 4), new THREE.MeshLambertMaterial({ color: 0xcfc29a }));
    tent.position.set(0, 1.1, 0);
    tent.rotation.y = Math.PI / 4;
    this.scene.add(tent);
  }

  private buildHerds(state: GameState): void {
    for (const sp of SPECIES) {
      const style = SPECIES_STYLE[sp];
      const geo = new THREE.BoxGeometry(...style.size);
      geo.translate(0, style.size[1] / 2, 0);
      const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: style.color }), 2000);
      mesh.count = 0;
      this.herds.set(sp, mesh);
      this.scene.add(mesh);
    }
    this.syncAnimals(state);
  }

  /** Малын байрлал, хэмжээг GameState-ээс шинэчилнэ */
  syncAnimals(state: GameState): void {
    const counts = new Map<Species, number>();
    for (const a of state.animals) {
      const mesh = this.herds.get(a.species);
      if (!mesh) continue;
      const i = counts.get(a.species) ?? 0;
      const mature = this.cfg.animals.species[a.species].matureKg[a.sex];
      const scale = Math.cbrt(frameKg(a, this.cfg.animals) / mature);
      this.tmp.position.set(a.x, 0, a.z);
      this.tmp.rotation.set(0, a.heading, 0);
      this.tmp.scale.set(scale * (0.85 + 0.3 * a.condition), scale, scale);
      this.tmp.updateMatrix();
      mesh.setMatrixAt(i, this.tmp.matrix);
      counts.set(a.species, i + 1);
    }
    for (const [sp, mesh] of this.herds) {
      mesh.count = counts.get(sp) ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  render(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
