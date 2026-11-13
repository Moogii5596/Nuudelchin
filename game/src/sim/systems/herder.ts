/**
 * Малчин ба унаа морь (M2, прототип v1.2 → prototype-rules.md §4–5).
 * - Малчин шилбүүр/богино уурга барьсан үед л мал 6 м (мориор 8.5 м) зайд айж холдоно → малчин алхаж/давхиж сүргээ хөтөлнө.
 *   Уураггүй бол мал малчнаас айхгүй; зөвхөн «Хөөе!»-гээр туугдана.
 * - «Хөөе!»: ойрын мал бөөгнөрч, малчнаас эсрэг зүг рүү хамт явна.
 * - Морь унах/буух, морь дуудах.
 * Малчны байрлалыг input бодит цагаар тооцож `movePlayer` командаар өгнө.
 */
import type { GameConfig } from '../config';
import type { Rng } from '../rng';
import type { Animal, GameState } from '../state';

export function ridingHorse(state: GameState): Animal | undefined {
  return state.animals.find((a) => a.riding);
}

/** Нэг тоглоомын минут: морь дагах/ирэх, мал малчнаас айх */
export function herderStep(cfg: GameConfig, state: GameState): void {
  const p = state.player;
  const horse = ridingHorse(state);
  if (horse) {
    if (p.mounted) {
      horse.x = horse.tx = p.x;
      horse.z = horse.tz = p.z;
      horse.heading = p.heading;
      p.horseCalled = false;
    } else if (p.horseCalled && !p.away) {
      const dx = p.x - horse.x, dz = p.z - horse.z;
      const d = Math.hypot(dx, dz);
      const stop = cfg.player.mountRange * 0.6;
      if (d <= stop) p.horseCalled = false;
      else {
        const s = Math.min(cfg.player.callHorseSpeed, d - stop);
        horse.x += (dx / d) * s;
        horse.z += (dz / d) * s;
        horse.tx = horse.x;
        horse.tz = horse.z;
        horse.heading = Math.atan2(dx, dz);
      }
    }
  } else {
    p.mounted = false;
  }
  if (p.away) return;

  // Мал малчнаас айж холдоно — зөвхөн шилбүүр/уурга барьсан үед
  if (!p.holdingUurga) return;
  const f = cfg.player.animalFear;
  const R = p.mounted ? f.mounted : f.onFoot;
  for (const a of state.animals) {
    if (a.riding) continue;
    const dx = a.x - p.x, dz = a.z - p.z;
    if (Math.abs(dx) > R || Math.abs(dz) > R) continue;
    const d = Math.hypot(dx, dz);
    if (d >= R) continue;
    const ux = d > 0.01 ? dx / d : Math.sin(p.heading);
    const uz = d > 0.01 ? dz / d : Math.cos(p.heading);
    const tx = p.x + ux * (R + f.push), tz = p.z + uz * (R + f.push);
    // Аль хэдийн хол туугдаж байгаа бол зорилтыг нь богиносгохгүй
    if (a.mode === 'driven' && Math.hypot(a.tx - p.x, a.tz - p.z) >= R + f.push) continue;
    a.mode = 'driven';
    a.tx = tx;
    a.tz = tz;
  }
}

/** «Хөөе!» — туугдсан малын тоо */
export function shout(cfg: GameConfig, state: GameState, rng: Rng): number {
  const p = state.player;
  const s = cfg.player.shout;
  const R = p.mounted ? s.radiusMounted : s.radius;
  const push = p.mounted ? s.pushMounted : s.push;
  const near = state.animals.filter((a) => !a.riding && Math.hypot(a.x - p.x, a.z - p.z) < R);
  if (!near.length) return 0;
  let cx = 0, cz = 0;
  for (const a of near) {
    cx += a.x;
    cz += a.z;
  }
  cx /= near.length;
  cz /= near.length;
  let ux = cx - p.x, uz = cz - p.z;
  const d = Math.hypot(ux, uz);
  if (d < 0.5) {
    ux = Math.sin(p.heading);
    uz = Math.cos(p.heading);
  } else {
    ux /= d;
    uz /= d;
  }
  // Сүргийн төв малчнаас эсрэг зүг рүү push м шилжиж, мал төв рүүгээ бөөгнөрнө
  const gx = cx + ux * push, gz = cz + uz * push;
  for (const a of near) {
    a.mode = 'driven';
    a.tx = gx + (a.x - cx) * s.bunch + rng.range(-1, 1);
    a.tz = gz + (a.z - cz) * s.bunch + rng.range(-1, 1);
  }
  return near.length;
}

/** Шилбүүр/богино уурга барих ↔ тавих. Шинэ төлөвийг буцаана */
export function toggleUurga(state: GameState): boolean {
  state.player.holdingUurga = !state.player.holdingUurga;
  return state.player.holdingUurga;
}

/** Морь унах / буух. Алдаа бол мессеж */
export function toggleMount(cfg: GameConfig, state: GameState): string | null {
  const p = state.player;
  const horse = ridingHorse(state);
  if (!horse) return 'Унаа морь алга';
  if (p.mounted) {
    p.mounted = false;
    // Морь малчны хажууд зогсоно
    const ox = Math.cos(p.heading) * 1.2, oz = -Math.sin(p.heading) * 1.2;
    horse.x = horse.tx = p.x + ox;
    horse.z = horse.tz = p.z + oz;
    return null;
  }
  if (Math.hypot(horse.x - p.x, horse.z - p.z) > cfg.player.mountRange) return 'Морь хол байна — дэргэд нь оч (H — морь дуудах)';
  p.mounted = true;
  p.horseCalled = false;
  p.x = horse.x;
  p.z = horse.z;
  return null;
}
