/**
 * Өдөр ба шөнийн мөчлөг (M4.5, хэрэглэгчийн дүрэм 2026-11-14).
 *
 * - Орой (time.homeMinute) мал хотондоо харина: хонь ямаа хашаа дотроо, үхэр хашааны хажуу дахь
 *   үхрийн хэвтэр (home.cowYard) рүү. Адуу хотод ирэхгүй (бэлчээртээ хононо).
 * - Хүрсэн мал хэвтэж унтана. 21:00 (sleepMinute) болоход хүрээгүй мал хүрсэн газраа хоноглоно.
 * - Шөнө мал идэхгүй, цангахгүй. Чоноос үргэвэл зугтаад хүрсэн газраа дахин унтана.
 * - Өглөө (06:00) мал бэлчээрт гарахдаа сүү, ноосоо ХОНОСОН газраа үлдээнэ: хотонд хоносон бол
 *   хотонд, гадуур хоносон бол тэнд. Хэмжээ нь өчигдөр бэлчээрт идсэн өвснөөс хамаарна.
 */
import type { GameConfig, Species } from '../config';
import type { Rng } from '../rng';
import type { Animal, GameState, ProductId, YieldNote, YieldSpecies } from '../state';
import { isNight } from '../clock';

/** Тухайн мал хотондоо харьдаг уу (адуу, унаа морь үгүй) */
export function goesHome(cfg: GameConfig, a: Animal): boolean {
  return !a.riding && cfg.time.homeMinute[a.species] !== undefined;
}

/** Хоноглох цэг: хонь ямаа хашаа дотор, үхэр үхрийн хэвтэрт */
export function homeSpot(cfg: GameConfig, rng: Rng, species: Species): { x: number; z: number } {
  const h = cfg.camps.home;
  const c = species === 'cow' ? h.cowYard : { x: h.pen.x, z: h.pen.z, r: h.pen.r * 0.72 };
  const ang = rng.range(0, Math.PI * 2);
  const r = Math.sqrt(rng.next()) * c.r;
  return { x: c.x + Math.cos(ang) * r, z: c.z + Math.sin(ang) * r };
}

/** Хотондоо (хашаа/үхрийн хэвтэр) байгаа эсэх */
export function atHome(cfg: GameConfig, a: Animal): boolean {
  const h = cfg.camps.home;
  if (a.species === 'cow') return Math.hypot(a.x - h.cowYard.x, a.z - h.cowYard.z) <= h.cowYard.r + 2;
  return Math.hypot(a.x - h.pen.x, a.z - h.pen.z) <= h.pen.r;
}

/** Минут бүр (орой): харих цаг болсон малыг хот руу явуулна */
export function eveningStep(cfg: GameConfig, state: GameState, rng: Rng): void {
  const m = state.time.minute;
  if (m < cfg.time.dayStartMinute || isNight(state.time, cfg.time)) return;
  for (const a of state.animals) {
    if (!goesHome(cfg, a)) continue;
    if (m < (cfg.time.homeMinute[a.species] ?? Infinity)) continue;
    // Туугдаж, айж зугтаж буй мал эхлээд тэр ажлаа дуусгана; хүрсэн мал хэвтэнэ
    if (a.mode === 'home' || a.mode === 'sleep' || a.mode === 'driven' || a.mode === 'flee') continue;
    const p = homeSpot(cfg, rng, a.species);
    a.mode = 'home';
    a.tx = p.x;
    a.tz = p.z;
  }
}

/** 21:00: бүх мал хүрсэн газраа унтана */
export function sleepAll(state: GameState): void {
  for (const a of state.animals) {
    if (a.riding || a.mode === 'flee' || a.mode === 'driven') continue;
    a.mode = 'sleep';
    a.tx = a.x;
    a.tz = a.z;
  }
}

/** Идшийн хүчин зүйл 0–1: өчигдөр хэр их өвс идсэн бэ */
export function intakeFactor(cfg: GameConfig, gut: number): number {
  const d = cfg.products.drops;
  return Math.min(1, Math.max(0, (gut - d.minGut) / (d.fullGut - d.minGut)));
}

/** Сүүтэй үнээ өдөрт хэдэн литр сүү үлдээх вэ (бутархай) */
export function dailyMilkLiters(cfg: GameConfig, a: Pick<Animal, 'condition' | 'lastGut'>): number {
  const m = cfg.products.drops.milk;
  return m.litersPerDay * (m.condBase + m.condGain * a.condition) * intakeFactor(cfg, a.lastGut);
}

function bump(rec: Partial<Record<ProductId, number>>, p: ProductId, n: number): void {
  rec[p] = (rec[p] ?? 0) + n;
}

function drop(state: GameState, rng: Rng, product: ProductId, amount: number, x: number, z: number, spread: number): void {
  state.items.push({ id: state.nextId++, product, amount, x: x + rng.range(-spread, spread), z: z + rng.range(-spread, spread), age: 0 });
  bump(state.today.dropped, product, amount);
}

/** Өглөө (06:00): хоносон газраа сүү, ноос үлдээгээд бэлчээрт гарна */
export function morning(cfg: GameConfig, state: GameState, rng: Rng): void {
  const d = cfg.products.drops;
  const dif = state.settings.difficulty;   // M6.10: бүтээгдэхүүний гарц ×0.5–2
  // Тайланд: хэдэн мал үлдээсэн, үлдээгээгүй нь яагаад (доорх дүрмийн яг тэр нөхцөлөөр тоолно)
  const notes: Partial<Record<YieldSpecies, YieldNote>> = (state.today.yield ??= {});
  const note = (sp: YieldSpecies): YieldNote => (notes[sp] ??= { gave: 0, outside: 0, lowGut: 0, lowCond: 0, partial: 0, dry: 0 });
  const gave = (sp: YieldSpecies, a: Animal): void => {
    note(sp).gave++;
    if (!atHome(cfg, a)) note(sp).outside++;
  };
  for (const a of state.animals) {
    if (a.riding) continue;
    // Туслахын малын сүү, ноос ч тоглогчийнх (тоглогчийн бэлчээрт бэлчдэг)
    if (a.species === 'cow' && a.sex === 'f' && a.lactating) {
      a.milkTimer += dailyMilkLiters(cfg, a) * dif.products;
      let cans = 0;
      while (a.milkTimer >= d.milk.amount) {
        a.milkTimer -= d.milk.amount;
        drop(state, rng, 'milk', d.milk.amount, a.x, a.z, 1.2);
        cans++;
      }
      if (cans) gave('cow', a);
      else if (intakeFactor(cfg, a.lastGut) <= 0) note('cow').lowGut++;
      else note('cow').partial++;
    } else if (a.species === 'cow' && a.sex === 'f' && a.age >= cfg.animals.species.cow.breedAge) note('cow').dry++;
    const rule = a.species === 'sheep' ? d.wool : a.species === 'goat' ? d.cashmere : null;
    const fsp: YieldSpecies = a.species === 'goat' ? 'goat' : 'sheep';
    if (rule && a.age >= 1 && a.condition >= rule.minCondition) {
      a.fiberDays += intakeFactor(cfg, a.lastGut) * dif.products;
      if (a.fiberDays >= rule.everyDays) {
        a.fiberDays -= rule.everyDays;
        drop(state, rng, a.species === 'sheep' ? 'wool' : 'cashmere', rule.amount, a.x, a.z, 0.6);
        gave(fsp, a);
      } else if (intakeFactor(cfg, a.lastGut) <= 0) note(fsp).lowGut++;
      else note(fsp).waiting = (note(fsp).waiting ?? 0) + 1;
    } else if (rule && a.age >= 1) note(fsp).lowCond++;
    else if (rule) note(fsp).young = (note(fsp).young ?? 0) + 1;
    if (a.mode === 'sleep' || a.mode === 'home' || a.mode === 'rest') {
      a.mode = 'graze';
      a.tx = a.x;
      a.tz = a.z;
    }
  }
}
