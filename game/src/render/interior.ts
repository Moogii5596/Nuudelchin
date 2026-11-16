/**
 * V6.1: барилгын дотор тал — тусдаа жижиг дүр зураг. Ороход л үүсгэнэ, гарахад бүгдийг чөлөөлнө.
 * Одоохондоо хоосон өрөө: шал, хана, хаалга, гэрэл. Тавилга V6.2-т (`data/interiors.json` rooms.*.spots-д цэгүүд бэлэн).
 * GameState-ийг зөвхөн уншина; logic байхгүй.
 *
 * Ханыг нэг талт (дотогш харсан) гадаргуугаар хийсэн тул камер өрөөнөөс гадуур байхад ойр хана харагдахгүй.
 */
import * as THREE from 'three';
import type { GameConfig } from '../sim/config';
import type { GameState } from '../sim/state';
import { roomGerSize, roomSpec, type RoomSpec } from '../sim/systems/interior';
import type { NpcView } from './npcs';
import { GER } from './ger/config';
import { makeGer } from './ger/ger';
import { makeGerInterior } from './ger/gerInterior';
import { makeBuildingMaterials, makeInterior } from './building';

const GOLD = 0xf2c14e;

export class InteriorView {
  readonly scene = new THREE.Scene();
  /** Шал — дарж явахад (pickGround) */
  ground: THREE.Mesh | null = null;
  private homeSize = '';
  private root: THREE.Group | null = null;
  private key = '';
  private ring: THREE.Mesh | null = null;
  private lamp: THREE.PointLight | null = null;
  private readonly hemi = new THREE.HemisphereLight(0xfff2dc, 0x3a2e22, 0.9);
  /** Малчны загвар үндсэн дүр зурагт харьяалагддаг — дотор түр шилжүүлнэ */
  private adopted: { obj: THREE.Object3D; parent: THREE.Object3D | null } | null = null;
  private t = 0;
  /** Гэрийн загварын материал, геометрийг чөлөөлөх */
  private disposers: (() => void)[] = [];

  constructor(private cfg: GameConfig) {
    this.scene.background = new THREE.Color(0x14100c);
    this.scene.add(this.hemi);
  }

  get active(): boolean {
    return this.root !== null;
  }

  /** Өрөөг үүсгэнэ (аль хэдийн тэр өрөө байвал юу ч хийхгүй) */
  show(roomId: string, doorId: string, herder: THREE.Object3D, homeSize: string = this.cfg.ger.home.size): void {
    const key = `${roomId}|${doorId}|${homeSize}`;
    if (this.root && this.key === key) return;
    this.hide();
    const room = roomSpec(this.cfg, roomId, homeSize);
    if (!room) return;
    this.key = key;
    this.homeSize = homeSize;
    this.root = this.build(room);
    this.scene.add(this.root);
    this.adopted = { obj: herder, parent: herder.parent };
    this.scene.add(herder);
  }

  /** Бүх зүйлийг чөлөөлж, малчныг буцаана */
  hide(): void {
    if (this.adopted) {
      this.adopted.parent?.add(this.adopted.obj);
      this.adopted = null;
    }
    if (this.root) {
      this.scene.remove(this.root);
      this.root.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
    }
    for (const d of this.disposers) d();
    this.disposers = [];
    if (this.lamp) this.scene.remove(this.lamp);
    this.root = this.ground = this.ring = this.lamp = null;
    this.key = '';
  }

  /** V6.3: орсон барилгын NPC-үүдийг өрөөнд байрлуулна (render/npcs.ts); ярьж буй NPC-ийн байрлалыг буцаана */
  placeNpcs(npcs: NpcView, state: GameState, dt: number, building: string, px: number, pz: number, speed: number): { x: number; z: number } | null {
    npcs.hideOutdoor();
    return npcs.updateIndoor(state, dt, this.scene, building, px, pz, speed);
  }

  /** Дотроос гарахад NPC-үүдийг гаднах бүлэгт буцаана */
  releaseNpcs(npcs: NpcView): void {
    npcs.leaveIndoor();
  }

  /** Өдрийн гэрэл 0–1: цонхгүй өрөөнд бага зэрэг нөлөөлнө */
  update(dt: number, daylight: number): void {
    this.t += dt;
    this.hemi.intensity = 0.7 + daylight * 0.35;
    if (this.ring) {
      const k = 1 + Math.sin(this.t * 3) * 0.08;
      this.ring.scale.set(k, k, 1);
    }
  }

  // ======================= Үүсгэх =======================

  /**
   * Гэр төрлийн өрөө: render/ger — гадна бүрээсийг дотроос (нэг талт: ойр тал нь харагдахгүй), дотор өнгө, тавилга.
   * Тавилгыг нэвт алхахгүй (саад — sim/systems/gerLayout, өрөөний obstacles).
   */
  private buildGer(room: RoomSpec, sizeKey: string): THREE.Group {
    const g = new THREE.Group();
    const helper = room.gerSize === 'helper';
    const doorVariant = helper ? Math.max(0, GER.doors.findIndex((d) => d.motif === GER.helper.doorMotif)) : 0;
    const shell = makeGer(sizeKey, { interior: true, outline: false, doorVariant, doorOpen: 1, ...(helper ? { coverColor: GER.helper.coverColor, belts: GER.helper.belts } : {}) });
    // Гаднах бүрээс: дотогш харсан тал л зурагдана (камер дээрээс, гаднаас харахад ойр тал, дээвэр нь харагдахгүй)
    shell.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.name === 'ger:body') { const mat = (m.material as THREE.MeshLambertMaterial).clone(); mat.side = THREE.BackSide; m.material = mat; this.disposers.push(() => mat.dispose()); }
    });
    g.add(shell.group);
    this.disposers.push(() => shell.dispose());
    const inner = makeGerInterior(sizeKey, { outline: true });
    g.add(inner.group);
    this.disposers.push(() => inner.dispose());
    // дарж явах шал (харагдахгүй)
    const floor = new THREE.Mesh(new THREE.CircleGeometry(room.r ?? 2.2, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ visible: false }));
    floor.name = 'ground';
    g.add(floor);
    this.ground = floor;
    const topH = shell.dims.topH;
    const lamp = new THREE.PointLight(new THREE.Color(room.light.color), room.light.intensity, (room.r ?? 2.2) * 4.5, 1.2);
    lamp.position.set(0.35, topH * 0.62, 0.4);
    this.scene.add(lamp);
    this.lamp = lamp;
    this.hemi.color.set(room.light.color).lerp(new THREE.Color(0xffffff), 0.6);
    return g;
  }

  /**
   * V3.5 хашаа байшин: лабораторийн makeInterior (хана, шал, тааз, хуваалт, пийшин, тавилга, амбаар) — нэг Geo + атлас, ороход л ачаална.
   * Хана нь дотогш харсан нэг талт тул камерын талын хана харагдахгүй. Тавилгын саад — sim/systems/houseLayout (room.blockers, room.walk).
   */
  private buildHouse(room: RoomSpec): THREE.Group {
    const g = new THREE.Group();
    const it = makeInterior(room.house!);
    if (!it) throw new Error(`house interior "${room.house}" алга`);
    const mats = makeBuildingMaterials();
    mats.setGlow(0);
    const geometry = it.geo.build();
    this.disposers.push(() => { geometry.dispose(); mats.dispose(); });
    const body = new THREE.Mesh(geometry, mats.mat);
    body.castShadow = false; body.receiveShadow = false; body.name = 'house:interior';
    g.add(body);
    g.position.y = -it.floorY;   // шал нь өрөөний y = 0
    // дарж явах шал (харагдахгүй)
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [a, b, c, d] of room.walk ?? []) { x0 = Math.min(x0, a); z0 = Math.min(z0, b); x1 = Math.max(x1, c); z1 = Math.max(z1, d); }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 2, z1 - z0 + 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ visible: false }));
    floor.name = 'ground';
    floor.position.set((x0 + x1) / 2, it.floorY, (z0 + z1) / 2);
    g.add(floor);
    this.ground = floor;
    // лангуу: E дарах газар (зарах байшинд — авах цонх, хамаатанд — айлчлал)
    if (room.counter) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.85 }));
      ring.position.set(room.counter[0], it.floorY + 0.03, room.counter[1]);
      g.add(ring);
      this.ring = ring;
    }
    // гэрэл: шилэн чийдэн бүрт
    const lights = it.lights.map((v) => {
      const l = new THREE.PointLight(new THREE.Color(room.light.color), room.light.intensity, 9, 1.2);
      l.position.set(v.x, v.y - it.floorY, v.z);
      this.scene.add(l);
      this.disposers.push(() => this.scene.remove(l));
      return l;
    });
    this.lamp = lights[0] ?? null;
    this.hemi.color.set(room.light.color).lerp(new THREE.Color(0xffffff), 0.6);
    return g;
  }

  private build(room: RoomSpec): THREE.Group {
    const gerSize = roomGerSize(this.cfg, room, this.homeSize);
    if (gerSize) return this.buildGer(room, gerSize);
    if (room.house) return this.buildHouse(room);
    const g = new THREE.Group();
    const I = this.cfg.interiors;
    const mat = (c: string, side: THREE.Side = THREE.FrontSide): THREE.MeshLambertMaterial => new THREE.MeshLambertMaterial({ color: new THREE.Color(c), side });
    const round = room.shape === 'round';
    const rr = room.r ?? 3, w = room.w ?? 6, d = room.d ?? 6;
    const doorW = I.door.w;
    const doorH = round ? Math.min(I.door.h, room.h) : Math.min(I.door.h, room.h - 0.3);

    // --- шал ---
    const floorGeo = round ? new THREE.CircleGeometry(rr, 40) : new THREE.PlaneGeometry(w, d);
    floorGeo.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(floorGeo, mat(room.floor));
    floor.name = 'ground';
    g.add(floor);
    this.ground = floor;

    // --- хана ---
    if (round) {
      const half = Math.asin(Math.min(0.95, doorW / 2 / rr));
      const start = half, len = Math.PI * 2 - half * 2;
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, room.h, 40, 1, true, start, len), mat(room.wall, THREE.BackSide));
      wall.position.y = room.h / 2;
      g.add(wall);
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(rr * 0.996, rr * 0.996, 0.28, 40, 1, true, start, len), mat(room.trim, THREE.BackSide));
      skirt.position.y = 0.14;
      g.add(skirt);
      const belt = new THREE.Mesh(new THREE.CylinderGeometry(rr * 0.996, rr * 0.996, 0.16, 40, 1, true, start, len), mat(room.trim, THREE.BackSide));
      belt.position.y = room.h - 0.2;
      g.add(belt);
      // дээвэр: оройд нь тооно (утааны нүх); гаднаас харахад ойр тал нь харагдахгүй
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(rr * 0.2, rr * 1.03, room.roofH ?? 1.6, 40, 1, true), mat(room.roof ?? room.wall, THREE.BackSide));
      roof.position.y = room.h + (room.roofH ?? 1.6) / 2;
      g.add(roof);
      const rug = new THREE.Mesh(new THREE.CircleGeometry(rr * 0.58, 32).rotateX(-Math.PI / 2), mat(room.trim));
      rug.position.y = 0.01;
      g.add(rug);
    } else {
      const wallPlane = (len: number, hgt: number, x: number, y: number, z: number, rotY: number, color: string): void => {
        if (len <= 0.001 || hgt <= 0.001) return;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(len, hgt), mat(color));
        m.position.set(x, y, z);
        m.rotation.y = rotY;
        g.add(m);
      };
      // дотогш харсан: хойд (+z), зүүн x+ (−x), баруун x− (+x), урд (−z, хаалгатай)
      const sideWall = (len: number, x: number, z: number, rotY: number): void => {
        wallPlane(len, room.h, x, room.h / 2, z, rotY, room.wall);
        wallPlane(len, 0.28, x + Math.sin(rotY) * 0.012, 0.14, z + Math.cos(rotY) * 0.012, rotY, room.trim);
      };
      sideWall(w, 0, -d / 2, 0);
      sideWall(d, w / 2, 0, -Math.PI / 2);
      sideWall(d, -w / 2, 0, Math.PI / 2);
      const seg = (w - doorW) / 2;
      sideWall(seg, -(doorW / 2 + seg / 2), d / 2, Math.PI);
      sideWall(seg, doorW / 2 + seg / 2, d / 2, Math.PI);
      wallPlane(doorW, room.h - doorH, 0, doorH + (room.h - doorH) / 2, d / 2, Math.PI, room.wall);
    }

    // --- хаалганы хүрээ (хоёр талаас харагдана) ---
    const doorZ = round ? rr : d / 2;
    const frameMat = mat(room.trim);
    const post = (x: number): void => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, doorH, 0.2), frameMat);
      m.position.set(x, doorH / 2, doorZ);
      g.add(m);
    };
    post(-doorW / 2 - 0.07);
    post(doorW / 2 + 0.07);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.28, 0.14, 0.2), frameMat);
    beam.position.set(0, doorH + 0.07, doorZ);
    g.add(beam);
    // босго, гарах дэвсгэр
    const mat2 = new THREE.Mesh(new THREE.PlaneGeometry(doorW, 0.9).rotateX(-Math.PI / 2), mat(room.trim));
    mat2.position.set(room.exit[0], 0.015, room.exit[1] - 0.45);
    g.add(mat2);

    // --- лангууны тэмдэг: E дарах газар ---
    if (room.counter) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.85 }));
      ring.position.set(room.counter[0], 0.03, room.counter[1]);
      g.add(ring);
      this.ring = ring;
    }

    // --- гэрэл ---
    const lamp = new THREE.PointLight(new THREE.Color(room.light.color), room.light.intensity, Math.max(rr * 2, w, d) * 2.2, 1.2);
    lamp.position.set(0, (round ? room.h + (room.roofH ?? 1.6) * 0.5 : room.h) - 0.4, 0);
    this.scene.add(lamp);
    this.lamp = lamp;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(room.light.color) }));
    bulb.position.copy(lamp.position);
    g.add(bulb);
    this.hemi.color.set(room.light.color).lerp(new THREE.Color(0xffffff), 0.6);
    return g;
  }
}
