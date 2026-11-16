/**
 * Бууцны газар нутаг (прототип v1.2-оос): газрын гадаргуу, ус, мод, чулуу, уул, хашаа, уяа, майхан/гэр, чонын үүр.
 * Бэлчээрийн торыг газрын өнгө ба өвсний бутаар харуулна (architecture.md §5):
 *   сайн бэлчээр ногоон, идэгдсэн нүд шаргал-хүрэн, бууцны доройтол бүх газрыг шаргалтуулна.
 * GameState-ийг зөвхөн уншина.
 */
import * as THREE from 'three';
import type { CampConfig, GameConfig, Season } from '../sim/config';
import type { GameState } from '../sim/state';
import { heightAt, riverZ, waterDistance, waterLevel, smoothstep } from '../sim/terrain';
import { cellIndex, type GrassGrid } from '../sim/systems/pasture';
import { seasonLook, seasonOf } from '../sim/systems/seasons';
import type { Den } from '../sim/systems/wolves';
import { VisualRng, angDiff, batchStatic, clamp, mat, meshBox, strSeed } from './util';
import { isTouch, quality as activeQuality, type Quality } from '../device';
import { paletteHex, visualStyle } from './style';
import { GER, TENT } from './ger/config';
import { makeGer, type GerBuilt } from './ger/ger';
import { makeTent } from './ger/tent';

/** Бэлчээрийн төрлийн өнгө; утсанд цайвар (мал тод харагдана) — data/visuals.json grass.touch */
function pastureColor(typeId: string): THREE.Color {
  const c = new THREE.Color(visualStyle.grass.pastureColors[typeId] ?? visualStyle.palette.summerGrass);
  const k = visualStyle.grass.touch;
  return isTouch ? c.lerp(new THREE.Color(k.lightenTo), k.lighten) : c;
}
const BARE = new THREE.Color(visualStyle.palette.dryGrass);
const DRY = new THREE.Color(visualStyle.palette.autumnGrass);
const ROCK = new THREE.Color(visualStyle.palette.rock);
const SNOW = new THREE.Color(visualStyle.palette.snow);
const DIRT = new THREE.Color(visualStyle.palette.dirt);
const BANK = new THREE.Color(visualStyle.palette.summerGrass);
const STRAW = new THREE.Color(visualStyle.palette.autumnGrass);
const SNOW_GROUND = new THREE.Color(visualStyle.palette.snow);
/** Ойтой бэлчээрт модны доор цас нимгэн (seasons.json → forestTypeMult-тай адил санаа) */
const SNOW_TYPE_MULT: Record<string, number> = { northSlope: 0.55 };
const typeLookup = (ids: string[], uniformName: string): string =>
  ids.map((_, i) => `if (typeIndex < ${i + 0.5}) return ${uniformName}[${i}];`).join('\n');

interface GrassUniforms {
  uGrassGrid: { value: THREE.DataTexture };
  uGrassHeight: { value: THREE.DataTexture };
  uCenter: { value: THREE.Vector2 };
  uRadius: { value: number };
  uTile: { value: number };
  uGridHalf: { value: number };
  uFadeStart: { value: number };
  uMaxHeight: { value: number };
  uBladeHeight: { value: number };
  uTuftK: { value: number };
  uDryK: { value: number };
  uStrawK: { value: number };
  uSnowK: { value: number };
  uHeatmap: { value: number };
  uWindTime: { value: number };
  uSwayX: { value: number };
  uSwayZ: { value: number };
  uFreqX: { value: number };
  uFreqZ: { value: number };
  uColorJitter: { value: number };
  uTypeLush: { value: THREE.Vector3[] };
  uTypeTall: { value: number[] };
  uDryColor: { value: THREE.Color };
  uStrawColor: { value: THREE.Color };
  uSnowColor: { value: THREE.Color };
}

function grassClumpGeometry(bladeCount: number, bladeHeight: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const colorAt = (factor: number): void => {
    colors.push(factor * 0.9, factor, factor * 0.74);
  };
  for (let i = 0; i < bladeCount; i++) {
    const angle = (i / bladeCount) * Math.PI * 2 + (i % 2) * 0.18;
    const dx = Math.cos(angle), dz = Math.sin(angle);
    const sx = -dz, sz = dx;
    const height = bladeHeight * (0.68 + (i % 4) * 0.1);
    const lean = 0.3 + (i % 3) * 0.07;
    const width = 0.095 + (i % 3) * 0.02;
    const baseX = dx * 0.018, baseZ = dz * 0.018;
    const tipX = dx * lean, tipZ = dz * lean;
    const start = positions.length / 3;
    positions.push(
      baseX - sx * width * 0.5, 0, baseZ - sz * width * 0.5,
      baseX + sx * width * 0.5, 0, baseZ + sz * width * 0.5,
      tipX, height, tipZ,
    );
    colorAt(0.68 + (i % 3) * 0.035);
    colorAt(0.68 + (i % 3) * 0.035);
    colorAt(1.12);
    indices.push(start, start + 2, start + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function flowerGeometry(height: number, radius: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const addTriangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, color: THREE.Color): void => {
    const start = positions.length / 3;
    for (const point of [a, b, c]) {
      positions.push(point.x, point.y, point.z);
      colors.push(color.r, color.g, color.b);
    }
    indices.push(start, start + 1, start + 2);
  };
  const stem = new THREE.Color(visualStyle.palette.larchSummer);
  const petal = new THREE.Color(0xffffff);
  const center = new THREE.Color(visualStyle.flowers.colors[0]!);
  const halfStem = 0.012;
  addTriangle(
    new THREE.Vector3(-halfStem, 0, 0),
    new THREE.Vector3(halfStem, 0, 0),
    new THREE.Vector3(0, height, 0),
    stem,
  );
  const headY = height * 0.92;
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const dx = Math.cos(angle), dz = Math.sin(angle);
    const sx = -dz * radius * 0.24, sz = dx * radius * 0.24;
    const inner = new THREE.Vector3(dx * radius * 0.12, headY, dz * radius * 0.12);
    const left = new THREE.Vector3(dx * radius * 0.42 + sx, headY, dz * radius * 0.42 + sz);
    const tip = new THREE.Vector3(dx * radius, headY * 0.98, dz * radius);
    const right = new THREE.Vector3(dx * radius * 0.42 - sx, headY, dz * radius * 0.42 - sz);
    addTriangle(inner, left, tip, petal);
    addTriangle(inner, tip, right, petal);
    addTriangle(
      new THREE.Vector3(dx * radius * 0.08, headY + 0.004, dz * radius * 0.08),
      new THREE.Vector3(dx * radius * 0.22, headY + 0.004, dz * radius * 0.22),
      new THREE.Vector3(dx * radius * 0.1 - dz * radius * 0.1, headY + 0.004, dz * radius * 0.1 + dx * radius * 0.1),
      center,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export class TerrainView {
  readonly group = new THREE.Group();
  ground!: THREE.Mesh;
  private camp!: CampConfig;
  campId = '';
  private homeKind = '';
  /** M6.13: өөрийн гэрийн хэмжээ (state.homeSize) — өөрчлөгдвөл гэрийг дахин барина */
  private homeSizeKey: string = GER.home.size;
  /** M6.13: нэмэлт гэрүүд (хотын сул цэгт, хаалга бууцны төв рүү) */
  private extraBuilt: GerBuilt[] = [];
  private extraKey = '';
  /** Гэр/майхны загвар (render/ger): өвөл/зун солигдоход дахин барина */
  private homeBuilt: GerBuilt | null = null;
  private homeWinter = false;
  private smokeOrigin = new THREE.Vector3(0, 4.55, 0);
  private homeGroup: THREE.Group | null = null;
  private hayGroup: THREE.Group | null = null;
  private hayShown = -1;
  private vSnowK!: Float32Array;        // орой бүрийн цасан бүрхүүлийн хүч (ой — бага)
  // Оройн өнгө тооцох өгөгдөл
  private vCells!: Int32Array;          // орой бүрт 4 нүд (-1 = гадна)
  private vLush!: Float32Array;         // RGB: бүрэн өвстэй өнгө (өндөр, голын эрэг, шуугиан орсон)
  private vBare!: Float32Array;         // RGB: нүцгэн газрын өнгө
  private vFixed!: Uint8Array;          // 1 = бэлчээрээс хамаарахгүй (хад, бууцны төв)
  // Өвсний бут
  private tufts: THREE.InstancedMesh | null = null;
  private tuftMaterial: THREE.MeshLambertMaterial | null = null;
  private grassGridTexture: THREE.DataTexture | null = null;
  private grassHeightTexture: THREE.DataTexture | null = null;
  private grassGridPixels: Uint8Array | null = null;
  private grassUniforms: GrassUniforms | null = null;
  private grassRadius = 0;
  private cloudUniform: { value: number } | null = null;
  private cloudTime = 0;
  private flowers: THREE.InstancedMesh | null = null;
  private flowerMaterial: THREE.MeshLambertMaterial | null = null;
  private mountains: THREE.Group | null = null;
  private mountainGeometries: THREE.BufferGeometry[] = [];
  private mountainMaterials: THREE.Material[] = [];
  private waterUniforms: {
    time: { value: number };
    sky: { value: THREE.Color };
    ice: { value: number };
  } | null = null;
  private buildMaterials: THREE.Material[] = [];
  private windTime = 0;
  private quality: Quality = activeQuality;
  private tuftSeed = 0;
  private smoke: THREE.Points | null = null;
  private smokePositions: Float32Array | null = null;
  private smokeTime = 0;
  private currentSeason: Season | null = null;
  private larchMaterials: [THREE.MeshLambertMaterial, THREE.MeshLambertMaterial] = [
    new THREE.MeshLambertMaterial({ color: paletteHex('larchSummer'), flatShading: true }),
    new THREE.MeshLambertMaterial({ color: paletteHex('larchSummer'), flatShading: true }),
  ];
  private waterTime = 0;
  private waterMaterial: THREE.MeshLambertMaterial | null = null;
  private tmpM = new THREE.Matrix4();
  private tmpQ = new THREE.Quaternion();
  private tmpS = new THREE.Vector3();
  private tmpP = new THREE.Vector3();
  private yAxis = new THREE.Vector3(0, 1, 0);

  constructor(private cfg: GameConfig) {}

  heightAt(x: number, z: number): number {
    return heightAt(this.camp, x, z);
  }

  /** Бууц солигдох эсвэл гэр авахад дахин барина */
  sync(state: GameState): boolean {
    this.updateSeason(state);
    if (state.campId !== this.campId) {
      this.build(state);
      return true;
    }
    if (state.home !== this.homeKind || state.homeSize !== this.homeSizeKey || this.currentSeason === 'winter' !== this.homeWinter) {
      this.homeSizeKey = state.homeSize;
      this.buildHome(state.home);
    }
    this.syncExtraGers(state);
    this.syncHay(state);
    return false;
  }

  /** Нэмэлт гэрүүдийг (state.extraGers) байрлуулна; жагсаалт, улирал өөрчлөгдвөл дахин барина */
  private syncExtraGers(state: GameState): void {
    const season = this.currentSeason === 'winter' ? 'winter' : 'summer';
    const key = season + '|' + state.extraGers.map((g) => g.size + g.x + ',' + g.z).join(';');
    if (key === this.extraKey) return;
    this.extraKey = key;
    for (const b of this.extraBuilt) {
      this.group.remove(b.group);
      b.dispose();
    }
    this.extraBuilt = state.extraGers.map((g, i) => {
      const b = makeGer(g.size, { season, doorVariant: (i + 1) % GER.doors.length });
      b.group.position.set(g.x, this.heightAt(g.x, g.z), g.z);
      b.group.rotation.y = Math.atan2(-g.x, -g.z);   // хаалга (+z) бууцны төв рүү (sim/systems/interior.ts campEnterDoors-той ижил)
      this.group.add(b.group);
      return b;
    });
  }

  private updateSeason(state: GameState): void {
    const season = seasonOf(this.cfg, state.time.day);
    if (this.flowers) this.flowers.visible = season === 'spring' || season === 'summer';
    if (season === this.currentSeason) return;
    this.currentSeason = season;
    const color = paletteHex(season === 'autumn' ? 'larchAutumn' : season === 'winter' ? 'larchWinter' : season === 'spring' ? 'larchSpring' : 'larchSummer');
    this.larchMaterials[0].color.setHex(color);
    this.larchMaterials[1].color.setHex(color).multiplyScalar(0.82);
  }

  private build(state: GameState): void {
    this.dispose();
    this.campId = state.campId;
    this.tuftSeed = strSeed(state.campId) ^ state.seed ^ 0x4d4f4e47;
    this.camp = this.cfg.camps.camps[state.campId]!;
    const rng = new VisualRng(strSeed(state.campId) ^ state.seed);
    this.buildGround(state.grass, rng);
    this.buildWater();
    this.buildTufts(state.grass, new VisualRng(this.tuftSeed));
    this.buildFlowers(state.grass, new VisualRng(this.tuftSeed ^ 0x464c4f57));
    // Хөдөлгөөнгүй чимэглэлийг материалаар нь нэгтгэж draw call-ийг цөөлнө
    const decor = new THREE.Group();
    this.buildDecor(rng, decor);
    this.buildCampStructures(decor);
    this.buildDens(state.wolves.dens, rng, decor);
    this.group.add(batchStatic(decor));
    this.buildMountains(new VisualRng(this.tuftSeed ^ 0x4d4f554e));
    this.homeKind = '';
    this.homeSizeKey = state.homeSize;
    this.extraBuilt = [];   // бууц солигдоход бүлэг шинээр бүтэх тул нэмэлт гэрүүдийг дахин барина
    this.extraKey = '';
    this.buildHome(state.home);
    this.syncExtraGers(state);
    this.hayShown = -1;
    this.syncHay(state);
  }

  dispose(): void {
    if (this.tufts) {
      this.tufts.removeFromParent();
      this.tufts.geometry.dispose();
      this.tuftMaterial?.dispose();
    }
    this.clearFlowers();
    this.clearMountains();
    this.clearSmoke();
    this.waterMaterial?.dispose();
    this.disposeGeometries(this.group);
    for (const material of this.buildMaterials) material.dispose();
    this.buildMaterials.length = 0;
    this.group.clear();
    this.grassGridTexture?.dispose();
    this.grassHeightTexture?.dispose();
    this.homeGroup = null;
    this.hayGroup = null;
    this.tufts = null;
    this.tuftMaterial = null;
    this.grassGridTexture = null;
    this.grassHeightTexture = null;
    this.grassGridPixels = null;
    this.grassUniforms = null;
    this.grassRadius = 0;
    this.cloudUniform = null;
    this.smoke = null;
    this.smokePositions = null;
    this.waterUniforms = null;
    this.waterMaterial = null;
  }

  private clearSmoke(): void {
    if (!this.smoke) return;
    this.smoke.removeFromParent();
    this.smoke.geometry.dispose();
    const material = this.smoke.material;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material.dispose();
    this.smoke = null;
    this.smokePositions = null;
  }

  private clearFlowers(): void {
    if (!this.flowers) return;
    this.flowers.removeFromParent();
    this.flowers.geometry.dispose();
    this.flowerMaterial?.dispose();
    this.flowers = null;
    this.flowerMaterial = null;
  }

  private clearMountains(): void {
    if (this.mountains) this.group.remove(this.mountains);
    for (const geometry of this.mountainGeometries) geometry.dispose();
    for (const material of this.mountainMaterials) material.dispose();
    this.mountainGeometries.length = 0;
    this.mountainMaterials.length = 0;
    this.mountains = null;
  }

  private disposeGeometries(root: THREE.Object3D): void {
    root.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Line) o.geometry.dispose();
    });
  }

  setQuality(quality: Quality, state: GameState, heatmap: boolean): void {
    if (this.quality === quality || !this.ground) return;
    this.quality = quality;
    if (this.tufts) {
      this.group.remove(this.tufts);
      this.tufts.geometry.dispose();
      this.tuftMaterial?.dispose();
    }
    this.clearFlowers();
    this.buildTufts(state.grass, new VisualRng(this.tuftSeed));
    this.buildFlowers(state.grass, new VisualRng(this.tuftSeed ^ 0x464c4f57));
    this.clearMountains();
    this.buildMountains(new VisualRng(this.tuftSeed ^ 0x4d4f554e));
    this.updateGrass(state, heatmap);
    if (state.home === 'ger') this.buildHome(state.home);
  }

  /** night: 0 — өдөр … 1 — шөнө (гэр, майхны гэрэл) */
  updateVisualTime(dt: number, minute: number, skyColor: THREE.Color, waterIce: number, night = 0): void {
    this.homeBuilt?.setGlow(night);
    for (const b of this.extraBuilt) b.setGlow(night);
    this.windTime += Math.max(0, dt);
    if (this.grassUniforms) this.grassUniforms.uWindTime.value = this.windTime;
    this.cloudTime += Math.max(0, dt);
    if (this.cloudUniform) this.cloudUniform.value = this.cloudTime;
    this.waterTime += Math.max(0, dt);
    if (this.waterUniforms) {
      this.waterUniforms.time.value = this.waterTime;
      this.waterUniforms.sky.value.copy(skyColor);
      this.waterUniforms.ice.value = clamp(waterIce, 0, 1);
    }
    if (!this.smoke || !this.smokePositions) return;
    this.smokeTime += Math.max(0, dt);
    const cooking = visualStyle.smoke.cookingMinutes.some(([start, end]) => minute >= start && minute <= end);
    this.smoke.visible = cooking;
    if (!cooking) return;
    const positions = this.smoke.geometry.attributes.position as THREE.BufferAttribute;
    const values = positions.array as Float32Array;
    for (let i = 0; i < this.smokePositions.length / 3; i++) {
      const phase = (this.smokeTime * 0.55 + i * 0.17) % 2.4;
      values[i * 3] = this.smokeOrigin.x + Math.sin(this.smokeTime * 0.45 + i * 1.7) * (0.08 + phase * 0.045);
      values[i * 3 + 1] = this.smokeOrigin.y + phase;
      values[i * 3 + 2] = this.smokeOrigin.z + Math.cos(this.smokeTime * 0.4 + i * 1.3) * (0.08 + phase * 0.045);
    }
    positions.needsUpdate = true;
  }

  // ---------- газар ----------
  private buildGround(grid: GrassGrid, rng: VisualRng): void {
    const size = grid.n * grid.cell;
    const g = new THREE.PlaneGeometry(size, size, grid.n, grid.n);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const n = pos.count;
    this.vCells = new Int32Array(n * 4);
    this.vLush = new Float32Array(n * 3);
    this.vBare = new Float32Array(n * 3);
    this.vFixed = new Uint8Array(n);
    this.vSnowK = new Float32Array(n);
    const hc = grid.cell / 2;
    const c = new THREE.Color(), b = new THREE.Color();
    const pen = this.cfg.camps.home.pen;
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const y = this.heightAt(x, z);
      pos.setY(i, y);
      this.vCells[i * 4] = cellIndex(grid, x - hc, z - hc);
      this.vCells[i * 4 + 1] = cellIndex(grid, x + hc, z - hc);
      this.vCells[i * 4 + 2] = cellIndex(grid, x - hc, z + hc);
      this.vCells[i * 4 + 3] = cellIndex(grid, x + hc, z + hc);
      const ci = Math.max(this.vCells[i * 4]!, this.vCells[i * 4 + 3]!);
      const typeId = ci >= 0 ? grid.typeIds[grid.type[ci] ?? 0] ?? 'steppe' : 'steppe';
      this.vSnowK[i] = SNOW_TYPE_MULT[typeId] ?? 1;
      c.copy(pastureColor(typeId));
      b.copy(BARE);
      // Голын эрэг ногоон, өндөрт хад, оргилд цас
      const wd = waterDistance(this.camp.waterShape, x, z);
      if (wd < 10) c.lerp(BANK, 0.5 * (1 - wd / 10));
      let fixed = 0;
      if (y > 10) {
        const k = smoothstep(10, 26, y) * 0.75;
        c.lerp(ROCK, k);
        b.lerp(ROCK, k);
      }
      if (y > 34) {
        const k = smoothstep(34, 44, y);
        c.lerp(SNOW, k);
        b.lerp(SNOW, k);
        if (k > 0.5) fixed = 1;
      }
      const r = Math.hypot(x, z);
      if (r < 5 || Math.hypot(x - pen.x, z - pen.z) < pen.r) {
        c.lerp(DIRT, 0.45);
        b.lerp(DIRT, 0.45);
      }
      const v = (rng.next() - 0.5) * 0.06 + Math.sin(x * 0.31) * Math.cos(z * 0.27) * 0.03;
      this.vLush.set([c.r + v, c.g + v, c.b + v * 0.8], i * 3);
      this.vBare.set([b.r + v, b.g + v, b.b + v * 0.8], i * 3);
      this.vFixed[i] = fixed;
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    g.computeVertexNormals();
    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    const cloud = visualStyle.cloudShadow;
    material.onBeforeCompile = (shader) => {
      const timeUniform = { value: this.cloudTime };
      this.cloudUniform = timeUniform;
      shader.uniforms.uCloudTime = timeUniform;
      shader.uniforms.uCloudScale = { value: cloud.scale };
      shader.uniforms.uCloudSpeed = { value: new THREE.Vector2(cloud.speedX, cloud.speedZ) };
      shader.uniforms.uCloudOpacity = { value: cloud.opacity };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vCloudWorldXZ;')
        .replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvCloudWorldXZ = position.xz;',
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uCloudTime;
          uniform float uCloudScale;
          uniform vec2 uCloudSpeed;
          uniform float uCloudOpacity;
          varying vec2 vCloudWorldXZ;`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          vec2 cloudPoint = vCloudWorldXZ * uCloudScale + uCloudTime * uCloudSpeed;
          float cloudField = sin(cloudPoint.x + sin(cloudPoint.y * 0.73)) * cos(cloudPoint.y * 0.82 - sin(cloudPoint.x * 0.61));
          cloudField += 0.18 * sin((cloudPoint.x + cloudPoint.y) * 1.7);
          float cloudMask = smoothstep(-0.2, 0.55, cloudField);
          diffuseColor.rgb *= 1.0 - cloudMask * uCloudOpacity;`,
        );
    };
    material.customProgramCacheKey = () => `nuudel-ground-cloud-v1-${cloud.scale}-${cloud.speedX}-${cloud.speedZ}-${cloud.opacity}`;
    this.buildMaterials.push(material);
    this.ground = new THREE.Mesh(g, material);
    this.ground.receiveShadow = true;
    this.ground.name = 'ground';
    this.group.add(this.ground);
  }

  private buildWater(): void {
    const w = this.camp.waterShape;
    const level = waterLevel(this.camp);
    const water = visualStyle.water;
    const wave = water.wave;
    const m = new THREE.MeshLambertMaterial({
      color: new THREE.Color(water.color),
      transparent: true,
      opacity: water.opacity,
    });
    this.waterMaterial = m;
    const uniforms = {
      time: { value: this.waterTime },
      sky: { value: new THREE.Color(visualStyle.palette.mapWater) },
      ice: { value: 0 },
    };
    this.waterUniforms = uniforms;
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uWaterTime = uniforms.time;
      shader.uniforms.uWaterSkyColor = uniforms.sky;
      shader.uniforms.uWaterIce = uniforms.ice;
      shader.uniforms.uWaterIceColor = { value: new THREE.Color(water.iceColor) };
      shader.uniforms.uWaterReflectionStrength = { value: water.reflectionStrength };
      shader.uniforms.uWaterFresnelPower = { value: water.fresnelPower };
      shader.uniforms.uWaterIceOpacity = { value: water.iceOpacity };
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uWaterTime;
          uniform float uWaterIce;
          varying float vWaterViewCos;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          transformed.y += sin(position.x * ${wave.xFrequency} + position.z * ${wave.zFrequency} + uWaterTime * ${wave.timeFrequency}) * ${wave.amplitude} * (1.0 - uWaterIce * 0.92);
          vec4 waterViewPosition = modelViewMatrix * vec4(transformed, 1.0);
          vWaterViewCos = clamp(normalize(-waterViewPosition.xyz).y, 0.0, 1.0);`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform vec3 uWaterSkyColor;
          uniform vec3 uWaterIceColor;
          uniform float uWaterIce;
          uniform float uWaterReflectionStrength;
          uniform float uWaterFresnelPower;
          uniform float uWaterIceOpacity;
          varying float vWaterViewCos;`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          float waterFresnel = pow(1.0 - vWaterViewCos, uWaterFresnelPower);
          vec3 waterReflection = mix(diffuseColor.rgb, uWaterSkyColor, clamp(waterFresnel * uWaterReflectionStrength, 0.0, 0.85));
          diffuseColor.rgb = mix(waterReflection, uWaterIceColor, uWaterIce * uWaterIceOpacity);
          diffuseColor.a = mix(diffuseColor.a, 1.0, uWaterIce * uWaterIceOpacity);`,
        );
    };
    m.customProgramCacheKey = () => `nuudel-water-v2-${wave.xFrequency}-${wave.zFrequency}-${wave.timeFrequency}-${wave.amplitude}-${water.reflectionStrength}-${water.fresnelPower}`;
    if (w.kind === 'lineZ') {
      const width = w.width ?? 13;
      const g = new THREE.PlaneGeometry(400, width, 160, 1);
      g.rotateX(-Math.PI / 2);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        p.setZ(i, p.getZ(i) + riverZ(w, p.getX(i)));
        p.setY(i, level);
      }
      this.group.add(new THREE.Mesh(g, m));
    } else {
      const g = new THREE.CircleGeometry(w.r * 1.6, 20);
      g.rotateX(-Math.PI / 2);
      const pond = new THREE.Mesh(g, m);
      pond.position.set(w.x, level, w.z);
      this.group.add(pond);
    }
  }

  // ---------- өвсний бут ----------
  private buildGrassTextures(grid: GrassGrid): void {
    const count = grid.n * grid.n;
    const pixels = new Uint8Array(count * 4);
    const heights = new Uint16Array(count * 4);
    const pen = this.cfg.camps.home.pen;
    for (let iz = 0; iz < grid.n; iz++) {
      for (let ix = 0; ix < grid.n; ix++) {
        const i = iz * grid.n + ix;
        const offset = i * 4;
        const x = -grid.half + (ix + 0.5) * grid.cell;
        const z = -grid.half + (iz + 0.5) * grid.cell;
        const typeIndex = grid.type[i] ?? 0;
        const typeId = grid.typeIds[typeIndex] ?? 'steppe';
        const type = this.cfg.pasture.types[typeId];
        const height = this.heightAt(x, z);
        const allowed = Math.hypot(x, z) >= 9 &&
          waterDistance(this.camp.waterShape, x, z) >= 6.5 &&
          Math.hypot(x - pen.x, z - pen.z) >= pen.r + 1 &&
          height <= 24 &&
          clamp((type?.heightCm ?? 0) / 20, 0, 1.4) >= 0.1;
        pixels[offset] = Math.round(clamp(grid.biomass[i] ?? 0, 0, 1) * 255);
        pixels[offset + 1] = typeIndex;
        pixels[offset + 2] = Math.round(clamp((type?.maxBiomass ?? 0) * (grid.biomass[i] ?? 0), 0, 1) * 255);
        pixels[offset + 3] = allowed ? 255 : 0;
        const halfHeight = THREE.DataUtils.toHalfFloat(height);
        heights[offset] = halfHeight;
        heights[offset + 1] = halfHeight;
        heights[offset + 2] = halfHeight;
        heights[offset + 3] = halfHeight;
      }
    }

    const gridTexture = new THREE.DataTexture(pixels, grid.n, grid.n, THREE.RGBAFormat, THREE.UnsignedByteType);
    gridTexture.magFilter = THREE.LinearFilter;
    gridTexture.minFilter = THREE.LinearFilter;
    gridTexture.generateMipmaps = false;
    gridTexture.needsUpdate = true;
    const heightTexture = new THREE.DataTexture(heights, grid.n, grid.n, THREE.RGBAFormat, THREE.HalfFloatType);
    heightTexture.magFilter = THREE.LinearFilter;
    heightTexture.minFilter = THREE.LinearFilter;
    heightTexture.generateMipmaps = false;
    heightTexture.needsUpdate = true;
    this.grassGridPixels = pixels;
    this.grassGridTexture = gridTexture;
    this.grassHeightTexture = heightTexture;
  }

  private buildTufts(grid: GrassGrid, rng: VisualRng): void {
    const grass = visualStyle.grass;
    const { grassTufts, grassRadius } = visualStyle.quality[this.quality];
    const count = Math.max(1, Math.round(grassTufts * (isTouch ? grass.touch.density : 1)));
    if (!this.grassGridTexture || !this.grassHeightTexture) this.buildGrassTextures(grid);
    const geo = grassClumpGeometry(grass.bladesPerTuft[this.quality], grass.bladeHeight);
    const offsets = new Float32Array(count * 2);
    const tile = Math.min(grassRadius, grid.half) * 2;
    const columns = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / columns);
    for (let i = 0; i < count; i++) {
      const x = i % columns;
      const z = Math.floor(i / columns);
      offsets[i * 2] = ((x + rng.next()) / columns) * tile;
      offsets[i * 2 + 1] = ((z + rng.next()) / rows) * tile;
    }
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 2));
    const lushColors = grid.typeIds.map((id) => {
      const color = pastureColor(id);
      return new THREE.Vector3(color.r, color.g, color.b);
    });
    const typeHeights = grid.typeIds.map((id) => clamp((this.cfg.pasture.types[id]?.heightCm ?? 10) / 20, 0, 1.4));
    const uniforms: GrassUniforms = {
      uGrassGrid: { value: this.grassGridTexture! },
      uGrassHeight: { value: this.grassHeightTexture! },
      uCenter: { value: new THREE.Vector2() },
      uRadius: { value: Math.min(grassRadius, grid.half) },
      uTile: { value: tile },
      uGridHalf: { value: grid.half },
      uFadeStart: { value: grass.fadeStart },
      uMaxHeight: { value: grass.maxHeight },
      uBladeHeight: { value: grass.bladeHeight },
      uTuftK: { value: 1 },
      uDryK: { value: 0 },
      uStrawK: { value: 0 },
      uSnowK: { value: 0 },
      uHeatmap: { value: 0 },
      uWindTime: { value: this.windTime },
      uSwayX: { value: grass.wind.swayX },
      uSwayZ: { value: grass.wind.swayZ },
      uFreqX: { value: grass.wind.freqX },
      uFreqZ: { value: grass.wind.freqZ },
      uColorJitter: { value: grass.colorJitter },
      uTypeLush: { value: lushColors },
      uTypeTall: { value: typeHeights },
      uDryColor: { value: new THREE.Color(visualStyle.palette.autumnGrass) },
      uStrawColor: { value: new THREE.Color(visualStyle.palette.autumnGrass) },
      uSnowColor: { value: new THREE.Color(visualStyle.palette.snow) },
    };
    this.grassUniforms = uniforms;
    this.grassRadius = Math.min(grassRadius, grid.half);
    const material = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, side: THREE.DoubleSide });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          uniform sampler2D uGrassGrid;
          uniform sampler2D uGrassHeight;
          uniform vec2 uCenter;
          uniform float uRadius;
          uniform float uTile;
          uniform float uGridHalf;
          uniform float uFadeStart;
          uniform float uMaxHeight;
          uniform float uBladeHeight;
          uniform float uTuftK;
          uniform float uDryK;
          uniform float uStrawK;
          uniform float uSnowK;
          uniform float uHeatmap;
          uniform float uWindTime;
          uniform float uSwayX;
          uniform float uSwayZ;
          uniform float uFreqX;
          uniform float uFreqZ;
          uniform float uColorJitter;
          uniform vec3 uTypeLush[${grid.typeIds.length}];
          uniform float uTypeTall[${grid.typeIds.length}];
          uniform vec3 uDryColor;
          uniform vec3 uStrawColor;
          uniform vec3 uSnowColor;
          attribute vec2 aOffset;
          float grassTypeIndex(float typeIndex) {
            ${typeLookup(grid.typeIds, 'uTypeTall')}
            return uTypeTall[${grid.typeIds.length - 1}];
          }
          vec3 grassTypeColor(float typeIndex) {
            ${typeLookup(grid.typeIds, 'uTypeLush')}
            return uTypeLush[${grid.typeIds.length - 1}];
          }`)
        .replace(
          '#include <color_vertex>',
          `#include <color_vertex>
          vec2 grassAnchor = aOffset + uTile * floor((uCenter - aOffset) / uTile + 0.5);
          vec2 grassUv = (grassAnchor + vec2(uGridHalf)) / (2.0 * uGridHalf);
          float grassInside = step(0.0, grassUv.x) * step(grassUv.x, 1.0) * step(0.0, grassUv.y) * step(grassUv.y, 1.0);
          vec4 grassData = texture2D(uGrassGrid, grassUv);
          float grassDist = length(grassAnchor - uCenter);
          float grassFade = 1.0 - smoothstep(uRadius * uFadeStart, uRadius, grassDist);
          float grassType = floor(grassData.g * 255.0 + 0.5);
          float grassScale = (0.2 + 0.95 * grassData.r) * uTuftK * max(grassTypeIndex(grassType), 0.3);
          grassScale *= step(0.12, grassData.r) * smoothstep(0.25, 0.75, grassData.a) * grassInside * grassFade;
          float instanceScaleY = length(instanceMatrix[1].xyz);
          grassScale = min(grassScale, uMaxHeight / (uBladeHeight * max(instanceScaleY, 0.001)));
          float grassLushness = smoothstep(0.1, 0.9, grassData.r);
          vec3 grassColor = grassTypeColor(grassType);
          grassColor = mix(grassColor, uDryColor, clamp(uDryK + (1.0 - grassLushness) * 0.6, 0.0, 1.0));
          grassColor = mix(grassColor, uStrawColor, uStrawK);
          grassColor = mix(grassColor, uSnowColor, uSnowK * 0.6);
          grassColor = mix(grassColor, vec3(1.0 - grassData.b, 0.3 + 0.6 * grassData.b, 0.15), uHeatmap);
          float grassJitter = (fract(sin(dot(grassAnchor, vec2(12.9898, 78.233))) * 43758.5453) * 2.0 - 1.0) * uColorJitter;
          vColor.rgb *= grassColor * (1.0 + grassJitter);`,
        )
        .replace(
          '#include <beginnormal_vertex>',
          `#include <beginnormal_vertex>
          objectNormal.y /= max(grassScale, 0.001);`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float instanceScaleX = length(instanceMatrix[0].xyz);
          float yawCos = instanceMatrix[0].x / max(instanceScaleX, 0.001);
          float yawSin = instanceMatrix[2].x / max(instanceScaleX, 0.001);
          vec2 localAnchor = vec2(yawCos * grassAnchor.x - yawSin * grassAnchor.y, yawSin * grassAnchor.x + yawCos * grassAnchor.y) / max(instanceScaleX, 0.001);
          float grassGroundY = texture2D(uGrassHeight, grassUv).r;
          float windPhase = uWindTime + grassAnchor.x * uFreqX + grassAnchor.y * uFreqZ;
          transformed.x += sin(windPhase) * uSwayX * position.y;
          transformed.z += cos(windPhase * 0.8) * uSwayZ * position.y;
          transformed.x += localAnchor.x;
          transformed.z += localAnchor.y;
          transformed.y = (grassGroundY + transformed.y * grassScale) / max(instanceScaleY, 0.001);`,
        );
    };
    material.customProgramCacheKey = () => `nuudel-grass-gpu-v1-${grid.typeIds.join('-')}-${this.quality}`;
    const mesh = new THREE.InstancedMesh(geo, material, count);
    this.tuftMaterial = material;
    for (let i = 0; i < count; i++) {
      this.tmpP.set(0, 0, 0);
      this.tmpQ.setFromAxisAngle(this.yAxis, rng.range(0, Math.PI * 2));
      const width = rng.range(0.8, 1.1);
      this.tmpS.set(width, rng.range(0.75, 1.25), width);
      this.tmpM.compose(this.tmpP, this.tmpQ, this.tmpS);
      mesh.setMatrixAt(i, this.tmpM);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = count;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    this.tufts = mesh;
    this.group.add(mesh);
  }

  private buildFlowers(grid: GrassGrid, rng: VisualRng): void {
    const count = visualStyle.quality[this.quality].flowers;
    const settings = visualStyle.flowers;
    const pixels = this.grassGridPixels;
    if (count === 0 || !pixels) return;
    const candidates: number[] = [];
    for (let i = 0; i < grid.n * grid.n; i++) {
      const typeId = grid.typeIds[grid.type[i] ?? 0] ?? 'steppe';
      if (typeId !== 'meadow' || (grid.biomass[i] ?? 0) < settings.biomassThreshold || pixels[i * 4 + 3] === 0) continue;
      candidates.push(i);
    }
    if (candidates.length === 0) return;
    const actualCount = Math.min(count, candidates.length);
    const geometry = flowerGeometry(settings.height, settings.radius);
    const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const mesh = new THREE.InstancedMesh(geometry, material, actualCount);
    const colors = settings.colors.map((color) => new THREE.Color(color));
    for (let i = 0; i < actualCount; i++) {
      const selected = i + Math.floor(rng.next() * (candidates.length - i));
      [candidates[i], candidates[selected]] = [candidates[selected]!, candidates[i]!];
      const cell = candidates[i]!;
      const ix = cell % grid.n, iz = Math.floor(cell / grid.n);
      const x = -grid.half + (ix + 0.5 + rng.range(-0.3, 0.3)) * grid.cell;
      const z = -grid.half + (iz + 0.5 + rng.range(-0.3, 0.3)) * grid.cell;
      this.tmpP.set(x, this.heightAt(x, z), z);
      this.tmpQ.setFromAxisAngle(this.yAxis, rng.range(0, Math.PI * 2));
      const size = rng.range(0.75, 1.25);
      this.tmpS.set(size, size, size);
      this.tmpM.compose(this.tmpP, this.tmpQ, this.tmpS);
      mesh.setMatrixAt(i, this.tmpM);
      mesh.setColorAt(i, colors[Math.floor(rng.next() * colors.length)]!);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.visible = this.currentSeason === null || this.currentSeason === 'spring' || this.currentSeason === 'summer';
    mesh.name = 'meadow-flowers';
    this.flowers = mesh;
    this.flowerMaterial = material;
    this.group.add(mesh);
  }

  /**
   * Бэлчээрийн торноос газрын өнгө, бутны өндрийг шинэчилнэ.
   * heatmap = туршилтын горим: идэж болох өвсийг улаан (0) → ногоон (их) өнгөөр.
   */
  private blurA: Float32Array | null = null;
  private blurB: Float32Array | null = null;

  /** Тусгаарлагдах хайрцган шүүлтүүр (радиус r нүд): бэлчээрийн өнгө, бутанд зөөлөн шилжилт */
  private smoothBiomass(src: number[], n: number, r: number): Float32Array {
    const N = n * n;
    if (!this.blurA || this.blurA.length !== N) {
      this.blurA = new Float32Array(N);
      this.blurB = new Float32Array(N);
    }
    const a = this.blurA, b = this.blurB!;
    for (let z = 0; z < n; z++) {
      const row = z * n;
      for (let x = 0; x < n; x++) {
        let s = 0, c = 0;
        for (let k = Math.max(0, x - r); k <= Math.min(n - 1, x + r); k++) {
          s += src[row + k] ?? 0;
          c++;
        }
        a[row + x] = s / c;
      }
    }
    for (let x = 0; x < n; x++) {
      for (let z = 0; z < n; z++) {
        let s = 0, c = 0;
        for (let k = Math.max(0, z - r); k <= Math.min(n - 1, z + r); k++) {
          s += a[k * n + x]!;
          c++;
        }
        b[z * n + x] = s / c;
      }
    }
    return b;
  }

  updateGrass(state: GameState, heatmap: boolean): void {
    if (!this.ground) return;
    const grid = state.grass;
    // Зурвас (сүрэг хадуур шиг) харагдахгүй байхаар өвсний харагдацыг ойр орчмоор нь зөөлрүүлнэ (зөвхөн дүрслэл)
    const bio = this.smoothBiomass(grid.biomass as number[], grid.n, 2);
    const degrade = state.camps[state.campId]?.degrade ?? 0;
    const col = (this.ground.geometry.attributes.color as THREE.BufferAttribute).array as Float32Array;
    const n = this.vFixed.length;
    const types = this.cfg.pasture.types;
    const maxB = grid.typeIds.map((id) => types[id]?.maxBiomass ?? 0);
    // Доройтол: бууцны газар шаргалтаж (M4: илүү тод), бут намсна
    const dryK = Math.min(0.9, 0.95 * degrade);
    // M5.5: намар шаргалтаж, өвөл хатсан өвс, цас бүрхэнэ
    const look = seasonLook(this.cfg, state);
    const strawK = look.straw * 0.85;
    const snowK = look.snow;
    const tuftK = (1 - 0.55 * degrade) * (1 - 0.9 * snowK);
    for (let i = 0; i < n; i++) {
      let s = 0, m = 0, abs = 0;
      for (let k = 0; k < 4; k++) {
        const ci = this.vCells[i * 4 + k]!;
        if (ci < 0) continue;
        const b = bio[ci] ?? 0;
        s += b;
        abs += b * (maxB[grid.type[ci] ?? 0] ?? 0);
        m++;
      }
      const b = m ? s / m : 1;
      const o = i * 3;
      if (heatmap) {
        const a = clamp(m ? abs / m : 0, 0, 1);
        col[o] = 1 - a;
        col[o + 1] = 0.25 + 0.7 * a;
        col[o + 2] = 0.15;
        continue;
      }
      if (this.vFixed[i]) {
        col[o] = this.vLush[o]!;
        col[o + 1] = this.vLush[o + 1]!;
        col[o + 2] = this.vLush[o + 2]!;
        continue;
      }
      // lush: 1 = бүрэн өвстэй, 0 = идэгдэж дууссан
      const lush = smoothstep(0.08, 0.9, b);
      for (let ch = 0; ch < 3; ch++) {
        const L = this.vLush[o + ch]!;
        const dryCh = ch === 0 ? DRY.r : ch === 1 ? DRY.g : DRY.b;
        const lushC = L + (dryCh - L) * dryK;
        const bare = this.vBare[o + ch]!;
        let v = bare + (lushC - bare) * lush;
        const st = ch === 0 ? STRAW.r : ch === 1 ? STRAW.g : STRAW.b;
        v += (st - v) * strawK * (0.4 + 0.6 * lush);
        const sk = snowK * this.vSnowK[i]!;
        if (sk > 0) {
          const sn = ch === 0 ? SNOW_GROUND.r : ch === 1 ? SNOW_GROUND.g : SNOW_GROUND.b;
          v += (sn - v) * Math.min(1, sk * (0.85 + 0.15 * Math.sin(i * 1.7)));
        }
        col[o + ch] = v;
      }
    }
    this.ground.geometry.attributes.color!.needsUpdate = true;

    const grassPixels = this.grassGridPixels;
    const grassTexture = this.grassGridTexture;
    const uniforms = this.grassUniforms;
    if (grassPixels && grassTexture && uniforms) {
      for (let i = 0; i < grid.n * grid.n; i++) {
        const typeIndex = grid.type[i] ?? 0;
        const typeId = grid.typeIds[typeIndex] ?? 'steppe';
        const offset = i * 4;
        const biomass = bio[i] ?? 0;
        grassPixels[offset] = Math.round(clamp(biomass, 0, 1) * 255);
        grassPixels[offset + 2] = Math.round(clamp(
          biomass * (types[typeId]?.maxBiomass ?? 0),
          0,
          1,
        ) * 255);
      }
      grassTexture.needsUpdate = true;
      uniforms.uTuftK.value = tuftK;
      uniforms.uDryK.value = dryK;
      uniforms.uStrawK.value = strawK;
      uniforms.uSnowK.value = snowK;
      uniforms.uHeatmap.value = heatmap ? 1 : 0;
      uniforms.uDryColor.value.copy(DRY);
      uniforms.uStrawColor.value.copy(STRAW);
      uniforms.uSnowColor.value.copy(SNOW_GROUND);
    }
  }

  updateGrassCenter(x: number, z: number, fogFar: number): void {
    const uniforms = this.grassUniforms;
    if (!uniforms) return;
    uniforms.uCenter.value.set(x, z);
    uniforms.uRadius.value = Math.max(1, Math.min(this.grassRadius, fogFar - 5));
  }

  // ---------- чимэглэл ----------
  private buildDecor(rng: VisualRng, out: THREE.Group): void {
    const w = this.camp.waterShape;
    const trunk = new THREE.CylinderGeometry(0.18, 0.25, 1.4, 5);
    const cone1 = new THREE.ConeGeometry(1.5, 2.8, 6), cone2 = new THREE.ConeGeometry(1.1, 2.2, 6);
    const crown = new THREE.IcosahedronGeometry(1.5, 0);
    const addPine = (x: number, z: number, s: number): void => {
      const t = new THREE.Group();
      const tr = new THREE.Mesh(trunk, mat(paletteHex('woodDark')));
      tr.position.y = 0.7;
      t.add(tr);
      const c1 = new THREE.Mesh(cone1, this.larchMaterials[0]);
      c1.position.y = 2.4;
      c1.castShadow = true;
      t.add(c1);
      const c2 = new THREE.Mesh(cone2, this.larchMaterials[1]);
      c2.position.y = 3.7;
      c2.castShadow = true;
      t.add(c2);
      t.position.set(x, this.heightAt(x, z) - 0.2, z);
      t.scale.setScalar(s);
      out.add(t);
    };
    const addLeafy = (x: number, z: number, s: number): void => {
      const t = new THREE.Group();
      const tr = new THREE.Mesh(trunk, mat(paletteHex('wood')));
      tr.position.y = 0.7;
      t.add(tr);
      const cr = new THREE.Mesh(crown, mat(paletteHex('larchSummer')));
      cr.position.y = 2.3;
      cr.scale.y = 1.2;
      cr.castShadow = true;
      t.add(cr);
      t.position.set(x, this.heightAt(x, z), z);
      t.scale.setScalar(s);
      out.add(t);
    };
    const t = this.camp.terrain;
    if (w.kind === 'lineZ') {
      // Голын эргийн бургас
      for (let i = 0; i < 40; i++) {
        const x = rng.range(-160, 160);
        addLeafy(x, riverZ(w, x) + (rng.next() < 0.5 ? -1 : 1) * rng.range(7, 12), rng.range(0.8, 1.3));
      }
    } else {
      // Булаг/горхины дэргэдэх мод
      for (let i = 0; i < 8; i++) {
        const a = rng.range(0, 6.28), r = rng.range(w.r * 2.5, w.r * 5);
        addLeafy(w.x + Math.cos(a) * r, w.z + Math.sin(a) * r, rng.range(0.8, 1.2));
      }
    }
    if (t.tilt && t.forest) {
      // Уулын арын ой (налуу өгсөх зүгт)
      for (let i = 0; i < 140; i++) {
        const x = rng.range(-170, 170), along = rng.range(t.tilt.start + 12, 175);
        const z = along * t.tilt.dirZ + x * t.tilt.dirX;
        const xx = t.tilt.dirZ !== 0 ? x : along * t.tilt.dirX;
        if (Math.hypot(xx, z) > 185) continue;
        addPine(xx, z, rng.range(0.8, 1.6));
      }
    } else if (t.open) {
      // Хөндийн хоёр хажуугийн нарс
      for (let i = 0; i < 60; i++) {
        const a = rng.range(-Math.PI, Math.PI);
        const dir = Math.atan2(t.open.dirX, t.open.dirZ);
        if (Math.abs(angDiff(a, dir)) < 0.9) continue;
        const r = rng.range(70, 140);
        addPine(Math.sin(a) * r, Math.cos(a) * r, rng.range(0.9, 1.5));
      }
    }
    // Чулуу
    for (let i = 0; i < 30; i++) {
      const r = rng.range(30, 150), a = rng.range(0, Math.PI * 2), x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (waterDistance(w, x, z) < 8) continue;
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(rng.range(0.5, 1.8), 0), mat(paletteHex('rock')));
      m.position.set(x, this.heightAt(x, z) + 0.2, z);
      m.rotation.set(rng.range(0, 3), rng.range(0, 3), 0);
      m.scale.y = rng.range(0.5, 0.9);
      m.castShadow = true;
      out.add(m);
    }
    this.buildOvoo(out);
  }

  private buildMountains(rng: VisualRng): void {
    const layers = visualStyle.mountains.layers.slice(0, visualStyle.quality[this.quality].mountainLayers);
    if (layers.length === 0) return;
    const group = new THREE.Group();
    group.name = 'distant-mountain-layers';
    const cone = new THREE.ConeGeometry(1, 1, 5);
    const snowMaterial = new THREE.MeshLambertMaterial({ color: paletteHex('snow'), flatShading: true });
    this.mountainGeometries.push(cone);
    this.mountainMaterials.push(snowMaterial);
    const tilt = this.camp.terrain.tilt;
    for (const layer of layers) {
      const material = new THREE.MeshLambertMaterial({ color: layer.color, flatShading: true });
      this.mountainMaterials.push(material);
      const peaks = new THREE.InstancedMesh(cone, material, layer.count);
      const caps = new THREE.InstancedMesh(cone, snowMaterial, layer.count);
      let capCount = 0;
      for (let i = 0; i < layer.count; i++) {
        const angle = (i / layer.count) * Math.PI * 2 + rng.range(-0.06, 0.06);
        const distance = rng.range(layer.radiusMin, layer.radiusMax);
        let height = rng.range(layer.heightMin, layer.heightMax) * layer.heightScale;
        if (tilt && Math.cos(angle) * tilt.dirX + Math.sin(angle) * tilt.dirZ > 0.3) height *= 1.35;
        const radius = height * rng.range(0.62, 0.9);
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        const baseY = -6 + Math.max(0, this.heightAt(Math.cos(angle) * 170, Math.sin(angle) * 170) * 0.6);
        this.tmpP.set(x, baseY + height * 0.5, z);
        this.tmpQ.setFromAxisAngle(this.yAxis, rng.range(0, Math.PI * 2));
        this.tmpS.set(radius, height, radius * rng.range(0.75, 1.25));
        peaks.setMatrixAt(i, this.tmpM.compose(this.tmpP, this.tmpQ, this.tmpS));
        if (height > 45) {
          const capHeight = height * 0.28;
          this.tmpP.y = baseY + height - capHeight * 0.5 + 0.3;
          this.tmpS.set(radius * 0.3, capHeight, radius * 0.3);
          caps.setMatrixAt(capCount++, this.tmpM.compose(this.tmpP, this.tmpQ, this.tmpS));
        }
      }
      peaks.instanceMatrix.needsUpdate = true;
      peaks.frustumCulled = false;
      group.add(peaks);
      if (capCount > 0) {
        caps.count = capCount;
        caps.instanceMatrix.needsUpdate = true;
        caps.frustumCulled = false;
        group.add(caps);
      }
    }
    this.mountains = group;
    this.group.add(group);
  }

  private buildOvoo(out: THREE.Group): void {
    let bestX = 0, bestZ = 0, bestScore = -Infinity;
    for (let z = -140; z <= 140; z += 10) {
      for (let x = -140; x <= 140; x += 10) {
        const distance = Math.hypot(x, z);
        if (distance < 45 || distance > 140 || waterDistance(this.camp.waterShape, x, z) < 20) continue;
        const score = this.heightAt(x, z) - Math.abs(distance - 90) * 0.01;
        if (score > bestScore) {
          bestScore = score;
          bestX = x;
          bestZ = z;
        }
      }
    }
    if (!Number.isFinite(bestScore)) return;
    const baseY = this.heightAt(bestX, bestZ);
    const ovoo = new THREE.Group();
    const stoneGeometry = new THREE.DodecahedronGeometry(0.75, 0);
    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2;
      const size = 0.7 + (i % 3) * 0.16;
      const stone = new THREE.Mesh(stoneGeometry, mat(i % 2 ? paletteHex('rock') : paletteHex('stoneWarm')));
      stone.position.set(Math.cos(angle) * 0.75, 0.25 + (i % 2) * 0.12, Math.sin(angle) * 0.75);
      stone.scale.set(size, size * 0.8, size);
      ovoo.add(stone);
    }
    const cairn = new THREE.Mesh(new THREE.DodecahedronGeometry(0.82, 0), mat(paletteHex('stoneWarm')));
    cairn.position.y = 0.9;
    cairn.scale.set(0.9, 1.25, 0.9);
    ovoo.add(cairn);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 2.2, 5), mat(paletteHex('woodDark')));
    pole.position.set(0, 2.1, 0);
    ovoo.add(pole);
    const flagColors = [paletteHex('bluePattern'), paletteHex('snow'), paletteHex('gerOrange')];
    for (let i = 0; i < flagColors.length; i++) {
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 0.035), mat(flagColors[i]!));
      flag.position.set(0.2, 2.85 - i * 0.16, 0);
      flag.rotation.z = -0.08;
      ovoo.add(flag);
    }
    ovoo.position.set(bestX, baseY, bestZ);
    out.add(ovoo);
  }

  /** Хашаа (хаалга нь майхны эсрэг талд), морины уяа, галын чулуу */
  private buildCampStructures(out: THREE.Group): void {
    const { pen, post } = this.cfg.camps.home;
    const gateA = Math.atan2(pen.z, pen.x);
    const gapHalf = 0.27;
    if (this.camp.shed) this.buildShed(out, gateA, gapHalf);
    else this.buildPostFence(out, gateA, gapHalf);
    this.buildPostAndFire(out, post);
  }

  /** Энгийн хашаа: шон, хоёр хөндлөвч */
  private buildPostFence(out: THREE.Group, gateA: number, gapHalf: number): void {
    const { pen } = this.cfg.camps.home;
    const postGeo = new THREE.CylinderGeometry(0.08, 0.11, 1.4, 5);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 24) {
      if (Math.abs(angDiff(a, gateA)) < gapHalf) continue;
      const x = pen.x + Math.cos(a) * pen.r, z = pen.z + Math.sin(a) * pen.r;
      const p = new THREE.Mesh(postGeo, mat(paletteHex('wood')));
      p.position.set(x, this.heightAt(x, z) + 0.6, z);
      p.castShadow = true;
      out.add(p);
    }
    // Хашааны хөндлөвч: газрын өндрийг дагасан шугам
    for (const yOff of [0.55, 1.1]) {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 96; k++) {
        const a = gateA + gapHalf + (k / 96) * (Math.PI * 2 - gapHalf * 2);
        const x = pen.x + Math.cos(a) * pen.r, z = pen.z + Math.sin(a) * pen.r;
        pts.push(new THREE.Vector3(x, this.heightAt(x, z) + yOff, z));
      }
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, 0.045, 3), mat(paletteHex('woodLight')));
      out.add(tube);
    }
  }

  /**
   * Саравчтай монгол дулаан бууц (M5.5, хэрэглэгчийн зургаас): банзан бүтэн хашаа,
   * хойд талдаа хаалттай, өмнө зүг рүүгээ нээлттэй дээвэртэй саравч, хашаан доторх бууц (аргал).
   */
  private buildShed(out: THREE.Group, gateA: number, gapHalf: number): void {
    const { pen } = this.cfg.camps.home;
    const plank = new THREE.BoxGeometry(1, 1, 1);
    const wood = [paletteHex('woodLight'), paletteHex('wood'), paletteHex('woodWarm')];
    const N = 120;
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2;
      if (Math.abs(angDiff(a, gateA)) < gapHalf) continue;
      const x = pen.x + Math.cos(a) * pen.r, z = pen.z + Math.sin(a) * pen.r;
      const h = 1.55 + ((k * 7) % 5) * 0.04;
      const b = new THREE.Mesh(plank, mat(wood[k % 3]!));
      b.scale.set(0.12, h, (Math.PI * 2 * pen.r) / N - 0.05);
      b.position.set(x, this.heightAt(x, z) + h / 2 - 0.05, z);
      b.rotation.y = -a;
      b.castShadow = true;
      out.add(b);
    }
    // Хаалганы хоёр шон
    for (const s of [-1, 1]) {
      const a = gateA + s * gapHalf;
      const x = pen.x + Math.cos(a) * pen.r, z = pen.z + Math.sin(a) * pen.r;
      const g = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 2.1, 6), mat(paletteHex('woodDark')));
      g.position.set(x, this.heightAt(x, z) + 1.05, z);
      out.add(g);
    }
    // Саравч: хашааны хойд (−z) хэсэгт, хана хойш, нээлттэй тал урагш
    const W = 12, Dp = 5, back = 2.6, front = 2.0;
    const cx = pen.x, cz = pen.z - pen.r + 1.2 + Dp / 2;
    const y0 = this.heightAt(cx, cz);
    const wall = new THREE.Mesh(plank, mat(paletteHex('wood')));
    wall.scale.set(W, back, 0.2);
    wall.position.set(cx, y0 + back / 2, cz - Dp / 2);
    wall.castShadow = true;
    out.add(wall);
    for (const sx of [-1, 1]) {
      const side = new THREE.Mesh(plank, mat(paletteHex('woodLight')));
      side.scale.set(0.2, back, Dp);
      side.position.set(cx + (sx * W) / 2, y0 + back / 2, cz);
      out.add(side);
    }
    for (let i = 0; i <= 4; i++) {
      const px = cx - W / 2 + (i / 4) * W;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, front, 5), mat(paletteHex('woodDark')));
      post.position.set(px, y0 + front / 2, cz + Dp / 2);
      out.add(post);
    }
    const roof = new THREE.Mesh(plank, mat(paletteHex('woodRoof')));
    const slope = Math.atan2(back - front, Dp);
    roof.scale.set(W + 0.8, 0.18, Math.hypot(Dp, back - front) + 0.6);
    roof.position.set(cx, y0 + (back + front) / 2 + 0.1, cz);
    roof.rotation.x = slope;
    roof.castShadow = true;
    out.add(roof);
    // Дээвэр дээрх өвс, шороо (зурган дээрх шиг бараан)
    const top = new THREE.Mesh(plank, mat(paletteHex('woodRoofCover')));
    top.scale.set(W, 0.12, Dp * 0.9);
    top.position.set(cx, y0 + (back + front) / 2 + 0.25, cz);
    top.rotation.x = slope;
    out.add(top);
    // Хашаан доторх бууц (хатсан аргал)
    const dung = new THREE.Mesh(new THREE.CylinderGeometry(pen.r * 0.55, pen.r * 0.6, 0.08, 20), mat(paletteHex('dung')));
    dung.position.set(pen.x, this.heightAt(pen.x, pen.z) + 0.02, pen.z);
    out.add(dung);
    const pile = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 0), mat(paletteHex('manure')));
    pile.scale.set(1.4, 0.45, 1.1);
    pile.position.set(pen.x + pen.r + 3, this.heightAt(pen.x + pen.r + 3, pen.z + 8) + 0.3, pen.z + 8);
    out.add(pile);
  }

  /** Морины уяа, галын чулуу */
  private buildPostAndFire(out: THREE.Group, post: { x: number; z: number }): void {
    // Уяа
    const py = this.heightAt(post.x, post.z);
    for (const dx of [-1.3, 1.3]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.7, 5), mat(paletteHex('wood')));
      p.position.set(post.x + dx, py + 0.85, post.z);
      p.castShadow = true;
      out.add(p);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.8, 5), mat(paletteHex('woodAccent')));
    bar.rotation.z = Math.PI / 2;
    bar.position.set(post.x, py + 1.55, post.z);
    out.add(bar);
    // Галын чулуу
    const rng = new VisualRng(7);
    for (let i = 0; i < 7; i++) {
      const a = rng.range(0, 6.28), r = rng.range(0.2, 1.1);
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(rng.range(0.25, 0.4), 0), mat(paletteHex('stoneWarm')));
      m.position.set(-5 + Math.cos(a) * r, this.heightAt(-5, -3) + 0.2, -3 + Math.sin(a) * r);
      out.add(m);
    }
  }

  /** Бууцны өвсний овоо (боодол өвс, M5.5): тоо өөрчлөгдөхөд дахин барина */
  private syncHay(state: GameState): void {
    const hay = Math.ceil(state.camps[state.campId]?.hay ?? 0);
    const shown = Math.min(hay, 48);
    if (shown === this.hayShown) return;
    this.hayShown = shown;
    if (this.hayGroup) this.group.remove(this.hayGroup);
    this.hayGroup = null;
    if (!shown) return;
    const pen = this.cfg.camps.home.pen;
    const g = new THREE.Group();
    const geo = new THREE.BoxGeometry(1.1, 0.55, 0.6);
    const cols = [0xc9b06a, 0xbfa35c, 0xd2bb78];
    for (let i = 0; i < shown; i++) {
      const layer = Math.floor(i / 12), j = i % 12;
      const m = new THREE.Mesh(geo, mat(cols[i % 3]!));
      m.position.set((j % 4) * 1.15 - 1.7 + (layer % 2) * 0.3, 0.28 + layer * 0.55, Math.floor(j / 4) * 0.65 - 0.65);
      m.castShadow = true;
      g.add(m);
    }
    const x = pen.x + pen.r + 4, z = pen.z - 4;
    g.position.set(x, this.heightAt(x, z), z);
    this.hayGroup = g;
    this.group.add(g);
  }

  /** Чонын үүр (чулуу, нүх, яс) ба нутгийн улаан хил */
  private buildDens(dens: Den[], rng: VisualRng, out: THREE.Group): void {
    const lineMat = new THREE.LineDashedMaterial({ color: 0xc0392b, dashSize: 1.6, gapSize: 1.2, transparent: true, opacity: 0.7 });
    this.buildMaterials.push(lineMat);
    for (const d of dens) {
      const y = this.heightAt(d.x, d.z);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + rng.range(-0.3, 0.3), r = rng.range(1.8, 2.8);
        const x = d.x + Math.cos(a) * r, z = d.z + Math.sin(a) * r;
        const m = new THREE.Mesh(new THREE.DodecahedronGeometry(rng.range(0.5, 1.1), 0), mat(0x5b544b));
        m.position.set(x, this.heightAt(x, z) + 0.2, z);
        m.rotation.set(rng.range(0, 3), rng.range(0, 3), 0);
        m.castShadow = true;
        out.add(m);
      }
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 0.25, 8), mat(0x2a2420));
      hole.position.set(d.x, y + 0.05, d.z);
      out.add(hole);
      for (let i = 0; i < 4; i++) {
        const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 4), mat(0xece6d6));
        const x = d.x + rng.range(-4, 4), z = d.z + rng.range(-4, 4);
        bone.rotation.set(Math.PI / 2, 0, rng.range(0, 3));
        bone.position.set(x, this.heightAt(x, z) + 0.1, z);
        out.add(bone);
      }
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 64; k++) {
        const a = (k / 64) * Math.PI * 2;
        const x = d.x + Math.cos(a) * d.r, z = d.z + Math.sin(a) * d.r;
        pts.push(new THREE.Vector3(x, this.heightAt(x, z) + 0.25, z));
      }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat);
      line.computeLineDistances();
      out.add(line);
    }
  }

  /** Майхан эсвэл гэр (бууцны төвд): render/ger — лабораторийн баталсан загвар (data/ger.json) */
  private buildHome(kind: string): void {
    this.clearSmoke();
    if (this.homeGroup) {
      this.group.remove(this.homeGroup);
      this.disposeGeometries(this.homeGroup);
    }
    this.homeBuilt?.dispose();
    this.homeBuilt = null;
    this.homeKind = kind;
    this.homeWinter = this.currentSeason === 'winter';
    const season = this.homeWinter ? 'winter' : 'summer';
    const g = new THREE.Group();
    if (kind === 'ger') {
      const built = makeGer(this.homeSizeKey, { season });
      this.homeBuilt = built;
      g.add(built.group);
      // Хаалганы өмнөх сав суулга: хаалганаас хажуу тийш, ханын гадна
      const doorZ = built.door.position.z - GER.shape.doorStandOff + 0.4;
      const props = new THREE.Group();
      const milkCan = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.23, 0.52, 8), mat(paletteHex('snowShadow')));
      milkCan.position.set(-1.35, 0.28, doorZ);
      props.add(milkCan);
      const canNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.14, 8), mat(paletteHex('snowShadow')));
      canNeck.position.set(-1.35, 0.61, doorZ);
      props.add(canNeck);
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.2, 8), mat(paletteHex('woodDark')));
      pot.position.set(1.25, 0.12, doorZ);
      props.add(pot);
      const potRim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.025, 5, 10), mat(paletteHex('woodAccent')));
      potRim.rotation.x = Math.PI / 2;
      potRim.position.set(1.25, 0.23, doorZ);
      props.add(potRim);
      g.add(batchStatic(props));   // сав суулга нэг draw call
      const top = built.chimneyTop!;
      this.smokeOrigin.set(top.x, top.y, top.z);
      const smokeCount = 28;
      const smokeGeo = new THREE.BufferGeometry();
      this.smokePositions = new Float32Array(smokeCount * 3);
      for (let i = 0; i < smokeCount; i++) {
        this.smokePositions[i * 3] = top.x + Math.sin(i * 2.1) * 0.12;
        this.smokePositions[i * 3 + 1] = top.y + (i % 12) * 0.18;
        this.smokePositions[i * 3 + 2] = top.z + Math.cos(i * 1.7) * 0.12;
      }
      smokeGeo.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3));
      this.smoke = new THREE.Points(smokeGeo, new THREE.PointsMaterial({ color: 0xe7e2d8, size: 0.75, transparent: true, opacity: 0.26, depthWrite: false }));
      this.smoke.frustumCulled = false;
      this.smoke.visible = false;
      g.add(this.smoke);
    } else {
      const built = makeTent('start', { season });
      this.homeBuilt = built;
      g.add(built.group);
      // Агуулах (сав суулга) майхны хажууд
      const sideX = TENT.kinds.start!.W / 2 + TENT.ropeOut + 0.5;
      const props = new THREE.Group();
      meshBox(0.7, 0.6, 0.5, paletteHex('woodAccent'), sideX, 0.3, -0.8, props);
      meshBox(0.5, 0.5, 0.5, paletteHex('wood'), sideX + 0.1, 0.25, 0.1, props);
      g.add(batchStatic(props));
    }
    g.position.set(0, this.heightAt(0, 0), 0);
    this.homeGroup = g;
    this.group.add(g);
  }
}
