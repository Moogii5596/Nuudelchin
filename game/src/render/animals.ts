/**
 * Малыг sim-ийн GameState-ээс зурна (architecture.md §5). V4.6: бүх төрөл (хонь, ямаа, үхэр, адуу) — render/animal/ шинэ загвар:
 * хөнгөн сүргийн хувилбар, ойрын N малд дэлгэрэнгүй, хоёр үетэй хөл, насны/хүйсийн/зүсний ялгаа, туслахын тэмдэг.
 * Энэ файл нь зөвхөн sim-ийн төлөвөөс (байрлал, чиглэл, хурд) `Placed` бэлтгэнэ; геометр, хөдөлгөөн нь render/animal/-д.
 *
 * Sim алхам (1 тоглоомын минут) хооронд байрлалыг зөөлрүүлнэ (interpolation):
 * snapshot() — алхмын өмнөх байрлал, update(alpha) — өмнөх ба одоогийн хооронд.
 */
import * as THREE from 'three';
import type { GameConfig } from '../sim/config';
import type { GameState } from '../sim/state';
import { angDiff } from './util';
import { visualStyle } from './style';
import { quality as activeQuality, type Quality } from '../device';
import { hasModel, ModelAnimals, placedOf } from './animal/view';

/** Мал бүрийн дүрслэлийн төлөв (sim-д хадгалахгүй) */
interface Viz {
  px: number;   // өмнөх алхмын байрлал
  pz: number;
  h: number;    // харагдаж буй чиглэл
  seen: number;
}

export class AnimalsView {
  readonly group = new THREE.Group();
  private quality: Quality = activeQuality;
  /** Бүх төрлийн загвар (render/animal/) */
  readonly models: ModelAnimals;
  private viz = new Map<number, Viz>();
  private frameNo = 0;

  constructor(private cfg: GameConfig) {
    this.models = new ModelAnimals(this.group, this.quality, true);
  }

  setQuality(quality: Quality): void {
    this.quality = quality;
    this.models.setQuality(quality);
  }

  /** Sim алхмын өмнө дуудна: одоогийн байрлал «өмнөх» болно */
  snapshot(state: GameState): void {
    for (const a of state.animals) {
      const v = this.viz.get(a.id);
      if (v) {
        v.px = a.x;
        v.pz = a.z;
      }
    }
  }

  /**
   * alpha — өмнөх ба одоогийн алхмын хооронд (0–1), dt — бодит секунд,
   * stepSec — нэг sim алхам бодитоор хэдэн секунд (хурдаас хамаарна; 0 = зогссон)
   */
  update(state: GameState, heightAt: (x: number, z: number) => number, alpha: number, dt: number, stepSec: number): void {
    if (dt > 0) this.frameNo++;
    for (const a of state.animals) {
      if (a.riding) continue; // унаа морийг characters.ts зурна
      if (!hasModel(a.species)) continue;
      let v = this.viz.get(a.id);
      if (!v) {
        v = { px: a.x, pz: a.z, h: a.heading, seen: 0 };
        this.viz.set(a.id, v);
      }
      v.seen = this.frameNo;
      const x = v.px + (a.x - v.px) * alpha;
      const z = v.pz + (a.z - v.pz) * alpha;
      const moved = Math.hypot(a.x - v.px, a.z - v.pz);
      const speed = stepSec > 0 ? moved / stepSec : 0; // м/сек (бодит)
      // Чиглэл: хөдөлж байвал хөдлөх зүг рүү, үгүй бол sim-ийн чиглэл рүү зөөлөн эргэнэ
      const target = moved > 0.02 ? Math.atan2(a.x - v.px, a.z - v.pz) : a.heading;
      v.h += angDiff(target, v.h) * Math.min(1, dt * 6);
      this.models.add(placedOf(a, this.cfg, { x, y: heightAt(x, z), z, heading: v.h, speed, dist: Math.hypot(x - state.player.x, z - state.player.z) }));
    }
    this.models.flush(dt, visualStyle.quality[this.quality].animalAnimationDistance);
    // Үхсэн, зарагдсан малын төлөвийг цэвэрлэнэ
    if (this.frameNo % 120 === 0) for (const [id, v] of this.viz) if (v.seen !== this.frameNo) this.viz.delete(id);
  }

  /** Бууц солигдоход (мал шинэ газарт гарч ирнэ) зөөлрүүлэлтийг тэглэнэ */
  reset(): void {
    this.viz.clear();
    this.models.reset();
  }
}
