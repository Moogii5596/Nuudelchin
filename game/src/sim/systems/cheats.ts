/**
 * Туршилтын (cheat) цэс (` товч). prototype-rules.md §13-ын M4 хувилбар.
 * Тоглоомын дүрмийг шалгах, тэнцвэрийг гараар турших зорилготой.
 */
import type { Species } from '../config';
import type { Sim } from '../sim';
import { newAnimal } from '../state';
import { newDog } from './dogs';
import { isProtected, protectionZones, scareWolf } from './wolves';

export type CheatAction =
  | 'money'
  | 'addSheep' | 'addGoats' | 'addCows' | 'addHorses' | 'addMixed'
  | 'addDog' | 'removeDog'
  | 'skipHour' | 'endDay'
  | 'thirsty' | 'quench' | 'hungry' | 'fatten'
  | 'degradeUp' | 'degradeReset'
  | 'wolfAttack' | 'wolvesPeaceful' | 'scareAll'
  | 'fillStorage'
  | `camp:${string}`;

export function applyCheat(sim: Sim, action: CheatAction): string {
  const { cfg, state } = sim;
  const rng = sim.random;
  const p = state.player;
  const add = (species: Species, n: number, adultMaleShare = 0.1): string => {
    const fx = p.x + Math.sin(p.heading) * 15, fz = p.z + Math.cos(p.heading) * 15;
    for (let i = 0; i < n; i++) {
      const ang = rng.range(0, Math.PI * 2), r = Math.sqrt(rng.next()) * 8;
      state.animals.push(newAnimal(cfg, rng, state.nextId++, {
        species,
        sex: rng.chance(adultMaleShare) ? 'm' : 'f',
        age: rng.range(1, 6),
        x: fx + Math.cos(ang) * r,
        z: fz + Math.sin(ang) * r,
        lactating: species === 'cow',
      }));
    }
    return `+${n} мал`;
  };
  switch (action) {
    case 'money':
      state.money += 1_000_000;
      return '+1 000 000₮';
    case 'addSheep':
      return add('sheep', 10);
    case 'addGoats':
      return add('goat', 10);
    case 'addCows':
      return add('cow', 5);
    case 'addHorses':
      return add('horse', 5, 0.25);
    case 'addMixed': {
      sim.command({ type: 'debugAddAnimals', n: 50, x: p.x + Math.sin(p.heading) * 20, z: p.z + Math.cos(p.heading) * 20 });
      return '+50 холимог мал';
    }
    case 'addDog': {
      if (state.dogs.length >= cfg.dogs.maxDogs) return `Нохой ${cfg.dogs.maxDogs}-аас олон байж болохгүй`;
      const d = newDog(cfg, state, p.x + 1.5, p.z + 1.5);
      state.dogs.push(d);
      return `🐕 ${d.name} ирлээ (хотыг эргүүлнэ)`;
    }
    case 'removeDog': {
      const d = state.dogs.pop();
      return d ? `${d.name} явлаа` : 'Нохой алга';
    }
    case 'skipHour':
      for (let i = 0; i < 60; i++) sim.step();
      return '+1 цаг';
    case 'endDay': {
      const day = state.time.day;
      for (let i = 0; i < 24 * 60 && state.time.day === day; i++) sim.step();
      return 'Өдөр дууслаа';
    }
    case 'thirsty':
      for (const a of state.animals) if (!a.riding) a.thirst = 85;
      return 'Бүх мал цангалаа (85)';
    case 'quench':
      for (const a of state.animals) a.thirst = 0;
      return 'Бүх мал ус уулаа';
    case 'hungry':
      for (const a of state.animals) if (!a.riding) a.gutFill = 0;
      return 'Бүх малын өнөөдрийн идэш 0';
    case 'fatten':
      for (const a of state.animals) {
        a.condition = 1;
        a.health = 100;
      }
      return 'Бүх мал бүдүүн тарган';
    case 'degradeUp': {
      const c = state.camps[state.campId]!;
      c.degrade = Math.min(1, c.degrade + 0.1);
      sim.refreshQuality();
      return `Доройтол ${Math.round(c.degrade * 100)}%`;
    }
    case 'degradeReset': {
      const c = state.camps[state.campId]!;
      c.degrade = 0;
      sim.refreshQuality();
      return 'Доройтол 0%';
    }
    case 'wolfAttack': {
      // Хамгаалалтгүй, үүрэнд хамгийн ойр малыг тухайн үүрийн чоно хөөнө
      const zones = protectionZones(cfg, state);
      let best: { w: (typeof state.wolves.list)[number]; id: number; d: number } | null = null;
      for (const a of state.animals) {
        if (a.riding || isProtected(zones, a.x, a.z)) continue;
        for (const w of state.wolves.list) {
          if (w.mode === 'flee') continue;
          const d = Math.hypot(a.x - w.x, a.z - w.z);
          if (!best || d < best.d) best = { w, id: a.id, d };
        }
      }
      if (!best) return 'Хамгаалалтгүй мал эсвэл чоно алга';
      state.wolves.peaceful = false;
      best.w.mode = 'hunt';
      best.w.targetId = best.id;
      best.w.forced = true;
      best.w.fed = 0;
      best.w.scared = 0;
      return `🐺 Чоно ${Math.round(best.d)} м зайтай мал руу дайрлаа`;
    }
    case 'wolvesPeaceful':
      state.wolves.peaceful = !state.wolves.peaceful;
      return state.wolves.peaceful ? 'Чонын дайралт унтарлаа' : 'Чонын дайралт асаалаа';
    case 'scareAll':
      for (const w of state.wolves.list) scareWolf(cfg, w);
      return 'Бүх чоно үүр лүүгээ зугтлаа';
    case 'fillStorage': {
      sim.command({ type: 'deposit' }, false);
      p.carry = [{ product: 'milk', amount: 5, age: 0 }, { product: 'wool', amount: 5, age: 0 }];
      return 'Гарт 5 л сүү, 5 кг ноос';
    }
    default: {
      if (action.startsWith('camp:')) {
        const to = action.slice(5);
        if (!cfg.camps.camps[to]) return 'Ийм бууц алга';
        if (to === state.campId) return 'Аль хэдийн энэ бууцанд';
        if (state.player.place !== 'camp') return 'Гэртээ байх ёстой';
        state.move = { to, remaining: 1 };
        sim.step();
        return 'Шууд нүүлээ';
      }
      return 'Үл мэдэгдэх команд';
    }
  }
}
