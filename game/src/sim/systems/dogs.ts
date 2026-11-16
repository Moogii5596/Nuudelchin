/**
 * Нохой (M4). prototype-rules.md §7 + хэрэглэгчийн дүрэм (2026-11-13): нохойд команд өгнө.
 *
 * Командууд:
 *   follow     — «Намайг дага»: малчны араас дагана (малчин сумын төв явсан бол хотоо манана)
 *   stay       — «Энд зогс»: малчны одоо байгаа газар хэвтэж манана
 *   patrol     — «Энд сэлгүүц»: малчны одоо байгаа газрын орчимд чөлөөтэй сэлгүүцнэ
 *   patrolCamp — «Хот орчимд сэлгүүц»: майхан, хашааны орчимд чөлөөтэй сэлгүүцнэ (шинэ нохойн анхдагч)
 *   guardHerd  — «Сүргийг хамгаал»: сонгосон сүргийнхээ (хонь ямаа / үхэр / адуу) дэргэд сэлгүүцнэ
 *
 * Хэрэглэгчийн дүрэм (2026-11-14, B4): нохой хотыг тойрог дагуу эргэлддэггүй. Сэлгүүцэх үед
 * радиус дотроос санамсаргүй цэг сонгож очоод, хэсэг хэвтэж/үнэрлэж байгаад дараагийн цэг рүү явна.
 *
 * Нохой бүр 10 м хамгаалалтын бүстэй (wolves.ts → protectionZones).
 * Чоно alertRadius-д ойртвол хөөнө. B8 (хэрэглэгчийн дүрэм 2026-11-14): нохой чоныг гүйцвэл тулалдана —
 * ганц чоно бол чоно үхэж нохой 80% шархдана, 2+ чоно бол нохойг алана (data/wolves.json → fight).
 * Шархтай нохой (fight.chaseMinHealth-ээс доош) тулалдахгүй, barkRange-д хуцаж л үргээнэ.
 * Харуулын цэгээсээ (anchor) leash-ээс хол хөөхгүй, буцаж ирнэ.
 */
import { m, type Msg } from '../msg';
import type { GameConfig, Species } from '../config';
import type { GameState } from '../state';
import { flockKey, type Herd } from './herds';
import { killWolf, scareWolf, type WolfEvent } from './wolves';

export type DogOrderKind = 'follow' | 'stay' | 'patrol' | 'patrolCamp' | 'guardHerd';
export const DOG_ORDERS: readonly DogOrderKind[] = ['follow', 'stay', 'patrol', 'patrolCamp', 'guardHerd'];

export interface Dog {
  id: number;
  name: string;
  x: number;
  z: number;
  heading: number;
  order: DogOrderKind;
  ax: number;            // stay/patrol-ийн төв
  az: number;
  herd: Species;         // guardHerd: аль сүрэг (хонь ямаа = 'sheep')
  hx: number;            // guardHerd: сүргийн сүүлд мэдэгдсэн төв
  hz: number;
  ang: number;           // эргүүлийн өнцөг
  mode: 'go' | 'chase';
  wolfId: number;
  barkT: number;         // хуцаж буй үлдсэн минут (дүрслэлд)
  wx?: number;           // сэлгүүцэх дараагийн цэг (B4)
  wz?: number;
  rest?: number;         // цэг дээрээ хэвтэх/үнэрлэх үлдсэн минут
  health?: number;       // 0–100 (B8: чонотой тулалдаж шархдана)
}

export function newDog(cfg: GameConfig, state: GameState, x: number, z: number): Dog {
  const id = state.dogs.reduce((m, d) => Math.max(m, d.id), 0) + 1;
  const names = cfg.dogs.names;
  const used = new Set(state.dogs.map((d) => d.name));
  const name = names.find((n) => !used.has(n)) ?? `${names[0]} ${id}`;
  return { id, name, x, z, heading: 0, order: 'patrolCamp', ax: x, az: z, herd: 'sheep', hx: x, hz: z, ang: (id * 2.1) % (Math.PI * 2), mode: 'go', wolfId: 0, barkT: 0 };
}

/** Командын нэр (UI, мэдэгдэл) */
export const DOG_ORDER_NAME: Record<DogOrderKind, Msg> = {
  follow: m('sim.follow_me'),
  stay: m('sim.stay_here'),
  patrol: m('sim.roam_here'),
  patrolCamp: m('sim.roam_around_the_camp'),
  guardHerd: m('sim.guard_the_herd'),
};

/** Командын үйлдэл. herdKey — guardHerd-д (өгөөгүй бол малчинд хамгийн ойр сүрэг) */
export function orderDog(cfg: GameConfig, state: GameState, d: Dog, kind: DogOrderKind, herdKey?: Species): void {
  const p = state.player;
  d.order = kind;
  d.mode = 'go';
  d.wx = d.wz = undefined;
  d.rest = 0;
  d.wolfId = 0;
  if (kind === 'stay' || kind === 'patrol') {
    d.ax = p.x;
    d.az = p.z;
  }
  if (kind === 'guardHerd') {
    d.herd = flockKey(herdKey ?? nearestHerdKey(state, p.x, p.z) ?? 'sheep');
    const c = speciesCenter(state, d.herd, p.x, p.z);
    if (c) {
      d.hx = c.x;
      d.hz = c.z;
    }
  }
  void cfg;
}

function nearestHerdKey(state: GameState, x: number, z: number): Species | null {
  let best: Species | null = null, bd = Infinity;
  for (const a of state.animals) {
    if (a.riding) continue;
    const d = Math.hypot(a.x - x, a.z - z);
    if (d < bd) {
      bd = d;
      best = a.species;
    }
  }
  return best;
}

/** Тухайн төрлийн малын (x, z)-д хамгийн ойр 30 м доторх дундаж байрлал */
function speciesCenter(state: GameState, key: Species, x: number, z: number): { x: number; z: number } | null {
  let near: { x: number; z: number } | null = null, bd = Infinity;
  for (const a of state.animals) {
    if (a.riding || flockKey(a.species) !== key) continue;
    const d = Math.hypot(a.x - x, a.z - z);
    if (d < bd) {
      bd = d;
      near = a;
    }
  }
  if (!near) return null;
  let sx = 0, sz = 0, n = 0;
  for (const a of state.animals) {
    if (a.riding || flockKey(a.species) !== key) continue;
    if (Math.hypot(a.x - near.x, a.z - near.z) > 30) continue;
    sx += a.x;
    sz += a.z;
    n++;
  }
  return n ? { x: sx / n, z: sz / n } : null;
}

/** Харуулын цэг (leash-ийг эндээс хэмжинэ) ба одоогийн зорилт */
export function dogGoal(cfg: GameConfig, state: GameState, d: Dog, index: number): { x: number; z: number; ax: number; az: number } {
  const c = cfg.dogs;
  const p = state.player;
  const order: DogOrderKind = d.order === 'follow' && p.away ? 'patrolCamp' : d.order;
  // Сэлгүүцэх: (cx, cz)-аас r радиус дотор санамсаргүй цэг (B4). Төв хөдөлсөн бол (сүрэг) шинэ цэг сонгоно
  const circle = (cx: number, cz: number, r: number) => {
    if (d.wx === undefined || d.wz === undefined || Math.hypot(d.wx - cx, d.wz - cz) > r * 1.05) pickWander(d, cx, cz, r, state.step);
    return { x: d.wx!, z: d.wz!, ax: cx, az: cz };
  };
  switch (order) {
    case 'follow': {
      // Малчны араас, нохой бүр өөр талд
      const side = (index % 2 ? 1 : -1) * (0.6 + Math.floor(index / 2) * 0.5);
      const back = c.followDistance + (p.mounted ? 1.5 : 0);
      const bx = -Math.sin(p.heading), bz = -Math.cos(p.heading);
      return { x: p.x + bx * back + bz * side, z: p.z + bz * back - bx * side, ax: p.x, az: p.z };
    }
    case 'stay':
      return { x: d.ax, z: d.az, ax: d.ax, az: d.az };
    case 'patrol':
      return circle(d.ax, d.az, c.patrolRadius);
    case 'patrolCamp':
      return circle(c.campPatrol.x, c.campPatrol.z, c.campPatrol.r);
    case 'guardHerd':
      return circle(d.hx, d.hz, c.guardRadius);
  }
}

/**
 * Нэг тоглоомын минут. herds — Sim энэ алхамд сүргийг тооцсон бол (guardHerd-ийн төвийг шинэчилнэ).
 */
export function dogsStep(cfg: GameConfig, state: GameState, herds?: Herd[]): WolfEvent[] {
  const ev: WolfEvent[] = [];
  if (!state.dogs.length) return ev;
  const c = cfg.dogs;
  const F = cfg.wolves.fight;
  const dead = new Set<number>();
  state.dogs.forEach((d, idx) => {
    if (d.barkT > 0) d.barkT -= 1;
    // Сүргийн төв: хамгийн ойрын тухайн төрлийн сүрэг
    if (herds && d.order === 'guardHerd') {
      let bd = Infinity;
      for (const h of herds) {
        if (h.key !== d.herd) continue;
        const dist = Math.hypot(h.x - d.hx, h.z - d.hz) - Math.sqrt(h.members.length) * 2;
        if (dist < bd) {
          bd = dist;
          d.hx = h.x;
          d.hz = h.z;
        }
      }
    }
    const goal = dogGoal(cfg, state, d, idx);

    // Чоно хөөх
    if (d.mode === 'chase') {
      const w = state.wolves.list.find((o) => o.id === d.wolfId);
      if (!w || w.mode === 'flee' || w.mode === 'den' || Math.hypot(w.x - goal.ax, w.z - goal.az) > c.leash) {
        d.mode = 'go';
        d.wolfId = 0;
      } else {
        move(d, w.x, w.z, c.speed.run);
        const dist = Math.hypot(w.x - d.x, w.z - d.z);
        if ((d.health ?? 100) < F.chaseMinHealth) {
          // Шархтай нохой тулалдахгүй — хуцаж л үргээнэ
          if (dist <= c.barkRange) {
            scareWolf(cfg, w);
            d.barkT = 6;
            d.mode = 'go';
            d.wolfId = 0;
          }
          return;
        }
        // Чоно нохойн хамгаалалтын бүс рүү орж чаддаггүй тул бүсийн захад хүрэхэд гүйцсэн гэж үзнэ
        if (dist <= cfg.wolves.protectRadius.dog + F.range) {
          // Тулаан (B8): ойролцоох чоныг тоолно
          const pack = state.wolves.list.filter((o) => o.mode !== 'flee' && o.mode !== 'den' && Math.hypot(o.x - d.x, o.z - d.z) <= F.packRadius);
          if (pack.length >= 2) {
            dead.add(d.id);
            ev.push({ type: 'dogFight', dog: d.name, result: 'dogKilled', x: d.x, z: d.z });
          } else {
            killWolf(state, w.id);
            d.health = (d.health ?? 100) - F.woundOne;
            if (d.health <= 0) dead.add(d.id);
            ev.push({ type: 'dogFight', dog: d.name, result: d.health <= 0 ? 'bothDied' : 'wolfKilled', x: d.x, z: d.z });
          }
          d.barkT = 6;
          d.mode = 'go';
          d.wolfId = 0;
        }
        return;
      }
    }
    if ((state.step + d.id) % 2 === 0) {
      let target = 0, bd = c.alertRadius;
      for (const w of state.wolves.list) {
        if (w.mode === 'flee' || w.mode === 'den') continue;   // үүрэндээ байгаа цадсан чоныг хөөхгүй
        const dist = Math.hypot(w.x - d.x, w.z - d.z);
        if (dist < bd && Math.hypot(w.x - goal.ax, w.z - goal.az) <= c.leash) {
          bd = dist;
          target = w.id;
        }
      }
      if (target) {
        d.mode = 'chase';
        d.wolfId = target;
        d.barkT = 4;
        return;
      }
    }

    // Сэлгүүц: цэгтээ хүрвэл хэсэг хэвтэж/үнэрлээд дараагийн санамсаргүй цэг рүү (тойрог биш, B4)
    const dist = Math.hypot(goal.x - d.x, goal.z - d.z);
    const roaming = d.order === 'patrol' || d.order === 'patrolCamp' || d.order === 'guardHerd' || (d.order === 'follow' && state.player.away);
    if (roaming && dist < 1) {
      if ((d.rest ?? 0) > 0) {
        d.rest = (d.rest ?? 0) - 1;
        return;
      }
      const r = d.order === 'patrol' ? c.patrolRadius : d.order === 'guardHerd' ? c.guardRadius : c.campPatrol.r;
      pickWander(d, goal.ax, goal.az, r, state.step);
      const w = c.wander ?? { restMin: 5, restMax: 40 };
      d.rest = Math.round(w.restMin + hash01(d.id * 7919 + state.step * 31) * (w.restMax - w.restMin));
      return;
    }
    // Сэлгүүцэхдээ алхана (хол бол гүйнэ)
    if (dist > 0.3) move(d, goal.x, goal.z, dist > (roaming ? 25 : 6) ? c.speed.run : Math.min(c.speed.walk, dist));
  });
  if (dead.size) state.dogs = state.dogs.filter((d) => !dead.has(d.id));
  return ev;
}

/** Өдрийн эцэс: шархтай нохой сэргэнэ (B8) */
export function dogsDaily(cfg: GameConfig, state: GameState): void {
  for (const d of state.dogs) if ((d.health ?? 100) < 100) d.health = Math.min(100, (d.health ?? 100) + cfg.wolves.fight.healPerDay);
}

/** Тогтмол «санамсаргүй» 0..1 (rng зарцуулахгүй — тэнцвэрийн дүнд нөлөөлөхгүй) */
function hash01(n: number): number {
  let h = Math.imul(n | 0, 2654435761);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** Сэлгүүцэх дараагийн цэг: төвөөс r радиус дотор, одоогийн байрлалаас хэт ойр биш */
function pickWander(d: Dog, cx: number, cz: number, r: number, step: number): void {
  for (let k = 0; k < 4; k++) {
    const ang = hash01(d.id * 131 + step * 17 + k * 7) * Math.PI * 2;
    const rr = Math.sqrt(hash01(d.id * 977 + step * 13 + k * 3)) * r;
    const x = cx + Math.cos(ang) * rr, z = cz + Math.sin(ang) * rr;
    if (k === 3 || Math.hypot(x - d.x, z - d.z) > r * 0.35) {
      d.wx = x;
      d.wz = z;
      return;
    }
  }
}

function move(d: Dog, x: number, z: number, speed: number): void {
  const dx = x - d.x, dz = z - d.z;
  const l = Math.hypot(dx, dz);
  if (l < 1e-6) return;
  const s = Math.min(speed, l);
  d.x += (dx / l) * s;
  d.z += (dz / l) * s;
  d.heading = Math.atan2(dx, dz);
}

/** Бууц сэлгэхэд: нохой майхны дэргэд ирж, газарт холбоотой командууд хотоо манах болно */
export function relocateDogs(cfg: GameConfig, state: GameState): void {
  const home = cfg.camps.home;
  state.dogs.forEach((d, i) => {
    d.x = home.x + 3 + i;
    d.z = home.z - 3;
    d.mode = 'go';
    d.wolfId = 0;
    d.wx = d.wz = undefined;
    d.rest = 0;
    if (d.order === 'stay' || d.order === 'patrol') d.order = 'patrolCamp';
    d.hx = home.x + 25;
    d.hz = home.z;
  });
}
