/**
 * Тоглогчийн командууд. Input (гар, хулгана) болон тэнцвэрийн симуляторын стратеги
 * хоёул эдгээрээр л sim-ийг өөрчилнө (architecture.md §3.1).
 *
 * proximity=true үед (3D тоглолт) малчин бүтээгдэхүүн, агуулахын ойролцоо байх ёстой.
 * 3D-гүй симуляторт proximity=false: алхах хугацааг тооцохгүй (гараар тоглолтын дээд хязгаар).
 */
import type { Species } from './config';
import type { BuyOrder, ProcessorKind, ProductId, VehicleId } from './state';
import type { Sim } from './sim';
import { driveFlock } from './systems/grazing';
import * as storage from './systems/storage';
import * as processing from './systems/processing';
import { buyLotVehicle, boardBest, canTravel, driveVehicle, enterVehicle, exitVehicle, leaveToMap, loadCargo, mapGo, migrateHere, takeFromStorage, droveAnimals, trade, unloadCargo, type TradePlan } from './systems/travel';
import { startMove } from './systems/camps';
import { worldLimit } from './systems/sumtown';
import { enterBuilding, exitBuilding, moveInterior } from './systems/interior';
import { buyHouse, donate, giveGift, repayBankLoan, repayZdtgLoan, setHouseMode, takeBankLoan, takeZdtgLoan, type GiftPlan, type HouseMode } from './systems/town';
import { shout, toggleMount, toggleUurga } from './systems/herder';
import { scareWolves } from './systems/wolves';
import { newAnimal } from './state';
import { SPECIES } from './config';
import { orderDog, DOG_ORDER_NAME, type DogOrderKind } from './systems/dogs';
import { applyCheat, type CheatAction } from './systems/cheats';
import { fire, hire, payWithAnimal, recallOtor, refreshCandidates, sendOtor, setOtorCollector, setTask, takeFromOtor, type HelperTask, type HerdGroup } from './systems/helpers';

export type Command =
  | { type: 'movePlayer'; x: number; z: number; heading?: number }
  // V6.1 орж болдог барилга
  | { type: 'enterBuilding'; door?: string }            // E: хаалганы дэргэд орно (door — бот/тест)
  | { type: 'exitBuilding'; force?: boolean }           // E: дотор хаалганы дэргэд гарна
  | { type: 'moveInterior'; x: number; z: number; heading?: number }   // дотор алхах (өрөөний координат)
  | { type: 'shout' }                 // «Хөөе!» (Space)
  | { type: 'toggleMount' }           // морь унах/буух (F)
  | { type: 'toggleUurga' }           // шилбүүр/уурга барих/тавих (U)
  | { type: 'callHorse' }             // морь дуудах (H)
  | { type: 'scareWolves' }           // чоно үргээх (Q)
  | { type: 'debugAddAnimals'; n: number; x?: number; z?: number }   // туршилтын цэс: мал нэмэх
  | { type: 'pickup'; ids: number[] | 'nearby' }
  | { type: 'deposit' }
  | { type: 'drive'; species: Species; x: number; z: number }
  | { type: 'process'; kind: ProcessorKind }
  | { type: 'toggleVehicle' }         // тэрэг/машинд суух, буух (V) — M4.6
  | { type: 'boardBest' }             // бот, туслах: хамгийн их даацтай тээвэрт шууд суух
  | { type: 'driveVehicle'; x: number; z: number; heading: number }
  | { type: 'leaveToMap'; dirX: number; dirZ: number }   // бот: 3D-ийн хязгаар хүртэл жолоодсонтой адил
  | { type: 'quickMap' }             // Tab: шууд газрын зураг руу (явган бол унаа мориндоо мордоно)
  | { type: 'mapGo'; x: number; z: number; dest: string | null }
  | { type: 'migrateHere' }
  | { type: 'loadCargo'; vehicle: VehicleId; products: Partial<Record<ProductId, number>>; animalIds: number[] }
  | { type: 'unloadCargo'; vehicle: VehicleId }
  | { type: 'trade'; plan: TradePlan }
  | { type: 'buyLotVehicle'; slot: string }   // V3.3: машин худалдааны талбайгаас авч шууд суух
  // V3.4 сумын төвийн амьдрал
  | { type: 'buyHouse'; plot: string }
  | { type: 'houseMode'; plot: string; mode: HouseMode }
  | { type: 'donate'; amount: number }
  | { type: 'zdtgLoan'; pkg: string }
  | { type: 'zdtgRepay'; mode: 'animals' | 'money' }
  | { type: 'bankLoan'; amount: number }
  | { type: 'bankRepay'; amount: number }
  | { type: 'gift'; relative: string; plan: GiftPlan }
  | { type: 'droveAnimals'; animalIds: number[] }   // морьтой: мал тууж явах
  | { type: 'takeFromStorage'; products: Partial<Record<ProductId, number>> }   // агуулахаас гартаа (зарахаар)
  | { type: 'neighborBull'; on: boolean }
  | { type: 'moveCamp'; to: string }
  | { type: 'dogOrder'; dog: number | 'all'; order: DogOrderKind; herd?: Species }   // нохойн команд (K цонх, N)
  | { type: 'teahouse' }                                                  // цайны газрын нэр дэвшигчдийг шинэчлэх (M5)
  | { type: 'hire'; candidate: number }                                   // цайны газар (M5)
  | { type: 'fireHelper'; helper: number }
  | { type: 'helperTask'; helper: number; task: HelperTask; herd?: HerdGroup }
  | { type: 'payWithAnimal'; helper: number; animal: number }
  | { type: 'sendOtor'; helper: number; animalIds: number[]; camp: string }
  | { type: 'recallOtor'; helper: number }
  | { type: 'otorCollector'; helper: number; camp: string | null }   // хүүхдийг отор руу цуглуулагчаар (M5.5)
  | { type: 'takeOtor'; camp: string }                              // отор дээрх сүү, ноосыг авах (газрын зураг дээр тэр бууцанд)
  | { type: 'cheat'; action: CheatAction };                                          // туршилтын цэс (`)

export interface CommandResult {
  ok: boolean;
  msg?: string;
}

/** Малчин майхан/агуулахын дэргэд байгаа эсэх (тэрэг, тогоо тэнд байна) */
export function nearHome(cfg: { camps: { home: { x: number; z: number; storageRadius: number } } }, p: { x: number; z: number }): boolean {
  const h = cfg.camps.home;
  return Math.hypot(p.x - h.x, p.z - h.z) <= h.storageRadius * 2;
}

const CAMP_ONLY = new Set<Command['type']>(['payWithAnimal', 'sendOtor', 'recallOtor', 'shout', 'callHorse', 'scareWolves', 'pickup', 'deposit', 'drive', 'process', 'moveCamp', 'dogOrder', 'loadCargo', 'unloadCargo', 'takeFromStorage', 'droveAnimals']);
/** Тэрэг/машин жолоодож байхад хийхгүй ажлууд */
const NOT_DRIVING = new Set<Command['type']>(['toggleMount', 'callHorse', 'pickup', 'deposit', 'drive', 'process', 'moveCamp', 'dogOrder', 'takeFromStorage']);

/** Гаднах ертөнцөд гарч хийх үйлдлүүд: барилга дотор байвал эхлээд гаргана */
const LEAVES_BUILDING = new Set<Command['type']>(['movePlayer', 'shout', 'scareWolves', 'toggleMount', 'callHorse', 'pickup', 'deposit', 'drive', 'process', 'toggleVehicle', 'boardBest', 'driveVehicle', 'leaveToMap', 'quickMap', 'mapGo', 'migrateHere', 'moveCamp', 'loadCargo', 'unloadCargo', 'takeFromStorage', 'droveAnimals', 'buyLotVehicle']);

const ok = (msg?: string): CommandResult => ({ ok: true, msg });
const fail = (msg: string): CommandResult => ({ ok: false, msg });

export function applyCommand(sim: Sim, cmd: Command, proximity = true): CommandResult {
  const { cfg, state } = sim;
  const p = state.player;
  // Зөвхөн гэрийн бууцанд, явганаар/мориор хийх ажлууд
  if (CAMP_ONLY.has(cmd.type) && p.away) return fail('Малчин завгүй (гэрээсээ хол эсвэл нүүж байна)');
  if (NOT_DRIVING.has(cmd.type) && p.driving) return fail('Тэрэг/машинаас буу (V)');
  if (cmd.type === 'toggleMount' && p.place === 'map') return fail('Газрын зураг дээр байна');
  if (state.move && cmd.type !== 'neighborBull' && cmd.type !== 'debugAddAnimals' && cmd.type !== 'cheat') return fail('Нүүж байна');

  if (p.interior && LEAVES_BUILDING.has(cmd.type)) exitBuilding(cfg, state, true);

  switch (cmd.type) {
    case 'enterBuilding': {
      const err = enterBuilding(cfg, state, cmd.door);
      return err ? fail(err) : ok();
    }
    case 'exitBuilding': {
      const err = exitBuilding(cfg, state, cmd.force === true || !proximity);
      return err ? fail(err) : ok();
    }
    case 'moveInterior': {
      const err = moveInterior(cfg, state, cmd.x, cmd.z, cmd.heading);
      return err ? fail(err) : ok();
    }

    case 'movePlayer': {
      if (p.driving || p.place === 'map') return fail('Жолоодож байна');
      // Морьтой 3D-ийн хязгаарт хүрвэл газрын зураг руу гарна (M4.6)
      const R = Math.hypot(cmd.x, cmd.z);
      if (p.mounted && R >= worldLimit(cfg, p.place) - 0.05) {
        const err = leaveToMap(cfg, state, cmd.x, cmd.z);
        if (!err) {
          sim.emitTravel({ type: 'leftToMap' });
          return ok();
        }
      }
      p.x = cmd.x;
      p.z = cmd.z;
      if (cmd.heading !== undefined) p.heading = cmd.heading;
      return ok();
    }

    case 'shout': {
      const n = shout(cfg, state, sim.random);
      return n ? ok(`Хөөе! ${n} мал туугдлаа`) : fail('Ойрхон мал алга');
    }

    case 'toggleMount': {
      const err = toggleMount(cfg, state);
      if (err) return fail(err);
      return ok(p.mounted ? 'Морь унлаа' : 'Мориноосоо буулаа');
    }

    case 'toggleUurga':
      return ok(toggleUurga(state) ? 'Уургаа барилаа — мал танаас айж туугдана' : 'Уургаа тавилаа — мал зөвхөн «Хөөе!»-гээр туугдана');
    case 'callHorse': {
      if (p.mounted) return fail('Та мориндоо сууж байна');
      p.horseCalled = true;
      return ok('Чүү, нааш! Морь давхиж ирж байна');
    }

    case 'scareWolves': {
      const n = scareWolves(cfg, state);
      return n ? ok(`Хуу-хай! ${n} чоно үүр лүүгээ зугтлаа`) : fail('Ойрхон чоно алга');
    }

    case 'debugAddAnimals': {
      // Насны холимог сүрэг (хонь 70%, ямаа 15%, үхэр 10%, адуу 5%), бууцны ойролцоо
      const rng = sim.random;
      const cx = cmd.x ?? 30, cz = cmd.z ?? 0;
      for (let i = 0; i < cmd.n; i++) {
        const u = rng.next();
        const species = u < 0.7 ? SPECIES[0]! : u < 0.85 ? SPECIES[1]! : u < 0.95 ? SPECIES[2]! : SPECIES[3]!;
        const ang = rng.range(0, Math.PI * 2), r = Math.sqrt(rng.next()) * 35;
        state.animals.push(newAnimal(cfg, rng, state.nextId++, {
          species,
          sex: rng.chance(0.15) ? 'm' : 'f',
          age: rng.range(0.2, 6),
          x: cx + Math.cos(ang) * r,
          z: cz + Math.sin(ang) * r,
        }));
      }
      return ok(`${cmd.n} мал нэмлээ`);
    }

    case 'pickup': {
      const r = cfg.products.pickupRadius;
      const cap = cfg.products.carryUnits;
      let carried = p.carry.reduce((s, c) => s + c.amount, 0);
      const picked: number[] = [];
      for (const it of state.items) {
        if (cmd.ids !== 'nearby' && !cmd.ids.includes(it.id)) continue;
        if ((proximity || cmd.ids === 'nearby') && Math.hypot(it.x - p.x, it.z - p.z) > r) continue;
        if (carried + it.amount > cap + 1e-9) break;
        p.carry.push({ product: it.product, amount: it.amount, age: it.age });
        carried += it.amount;
        picked.push(it.id);
      }
      if (!picked.length) return fail(carried >= cap ? 'Гар дүүрсэн' : 'Ойролцоо бүтээгдэхүүн алга');
      state.items = state.items.filter((it) => !picked.includes(it.id));
      return ok(`${picked.length} ширхэг авлаа`);
    }

    case 'deposit': {
      const h = cfg.camps.home;
      if (proximity && Math.hypot(p.x - h.x, p.z - h.z) > h.storageRadius) return fail('Агуулахаас хол байна');
      const left: typeof p.carry = [];
      for (const c of p.carry) {
        const added = storage.add(cfg, state, c.product as ProductId, c.amount, 0);
        if (added > 0) state.today.collected[c.product] = (state.today.collected[c.product] ?? 0) + added;
        if (c.amount - added > 1e-9) left.push({ ...c, amount: c.amount - added });
      }
      p.carry = left;
      return left.length ? fail('Агуулах дүүрсэн') : ok();
    }

    case 'drive': {
      const n = driveFlock(cfg, state, sim.random, cmd.species, cmd.x, cmd.z);
      return n ? ok(`${n} мал туулаа`) : fail('Мал алга');
    }

    case 'process': {
      if (proximity && !nearHome(cfg, p)) return fail('Майхандаа очиж боловсруулна');
      const pr = state.processors.find((x) => x.kind === cmd.kind && processing.canStart(cfg, state, x));
      if (!pr) return fail('Төхөөрөмж завгүй эсвэл түүхий эд дутуу');
      processing.start(cfg, state, pr);
      return ok();
    }

    case 'toggleVehicle': {
      if (p.driving) {
        const err = exitVehicle(cfg, state);
        return err ? fail(err) : ok('Тэрэг/машинаас буулаа');
      }
      const err = enterVehicle(cfg, state);
      return err ? fail(err) : ok(`${cfg.vehicles[p.driving!].emoji} ${cfg.vehicles[p.driving!].name}-д суулаа — WASD жолоодох, газрын хязгаарт хүрвэл газрын зураг`);
    }
    case 'boardBest':
      return boardBest(cfg, state) ? ok() : fail('Тээвэр алга');
    case 'driveVehicle': {
      const ev = driveVehicle(cfg, state, cmd.x, cmd.z, cmd.heading);
      if (ev) sim.emitTravel(ev);
      return ok();
    }
    case 'quickMap': {
      if (p.place === 'map') return fail('Газрын зураг дээр байна');
      if (!canTravel(state)) {
        // Явган бол унаа мориндоо мордоно, морьгүй бол тэрэг/машиндаа сууна
        const horse = state.animals.find((a) => a.riding);
        if (horse) {
          p.mounted = true;
          p.horseCalled = false;
        } else if (!boardBest(cfg, state)) return fail('Унаа морь, тэрэг машин алга');
      }
      const R = Math.hypot(p.x, p.z);
      const err = R > 5 ? leaveToMap(cfg, state, p.x, p.z) : leaveToMap(cfg, state, Math.sin(p.heading), Math.cos(p.heading));
      if (!err) sim.emitTravel({ type: 'leftToMap' });
      return err ? fail(err) : ok();
    }
    case 'leaveToMap': {
      const err = leaveToMap(cfg, state, cmd.dirX, cmd.dirZ);
      if (!err) sim.emitTravel({ type: 'leftToMap' });
      return err ? fail(err) : ok();
    }
    case 'mapGo': {
      const err = mapGo(cfg, state, cmd.x, cmd.z, cmd.dest);
      return err ? fail(err) : ok();
    }
    case 'migrateHere': {
      const err = migrateHere(cfg, state);
      if (!err) sim.refreshQuality();
      return err ? fail(err) : ok('Гэр бүл, сүрэг тань энэ бууц руу нүүж байна');
    }
    case 'loadCargo': {
      const err = loadCargo(cfg, state, cmd.vehicle, cmd.products, cmd.animalIds, proximity);
      return err ? fail(err) : ok('Ачлаа');
    }
    case 'unloadCargo': {
      const err = unloadCargo(cfg, state, sim.random, cmd.vehicle, proximity);
      return err ? fail(err) : ok('Буулгалаа');
    }
    case 'droveAnimals': {
      const err = droveAnimals(state, cmd.animalIds);
      return err ? fail(err) : ok('Мал араасаа тууж явна');
    }
    case 'takeFromStorage': {
      const err = takeFromStorage(cfg, state, cmd.products, proximity);
      return err ? fail(err) : ok('Гартаа авлаа');
    }
    case 'trade': {
      const err = trade(cfg, state, sim.random, cmd.plan, proximity);
      return err ? fail(err) : ok('Арилжаа хийлээ');
    }
    case 'buyHouse': {
      const err = buyHouse(cfg, state, cmd.plot, proximity);
      return err ? fail(err) : ok('🏠 Хашаа байшин худалдаж авлаа — түрээслүүлж болно');
    }
    case 'houseMode': {
      const err = setHouseMode(cfg, state, cmd.plot, cmd.mode);
      return err ? fail(err) : ok(cmd.mode === 'rent' ? 'Түрээслүүллээ — өдөр бүр түрээс орно' : 'Байшин хоосон');
    }
    case 'donate': {
      const err = donate(cfg, state, cmd.amount, proximity);
      return err ? fail(err) : ok('🙏 Хандив өглөө — нэр хүнд өслөө');
    }
    case 'zdtgLoan': {
      const err = takeZdtgLoan(cfg, state, sim.random, cmd.pkg, proximity);
      return err ? fail(err) : ok('🏛 Малын зээл авлаа — мал араас тань тууж/тэвшинд ачигдлаа');
    }
    case 'zdtgRepay': {
      const err = repayZdtgLoan(cfg, state, cmd.mode, proximity);
      return err ? fail(err) : ok('🏛 Малын зээлээ төллөө');
    }
    case 'bankLoan': {
      const err = takeBankLoan(cfg, state, cmd.amount, proximity);
      return err ? fail(err) : ok('🏦 Зээл авлаа');
    }
    case 'bankRepay': {
      const err = repayBankLoan(cfg, state, cmd.amount, proximity);
      return err ? fail(err) : ok('🏦 Зээл төллөө');
    }
    case 'gift': {
      const err = giveGift(cfg, state, cmd.relative, cmd.plan, proximity);
      return err ? fail(err) : ok('🎁 Бэлэг өглөө — хамаатантайгаа илүү дотно боллоо');
    }
    case 'buyLotVehicle': {
      const err = buyLotVehicle(cfg, state, cmd.slot, proximity);
      return err ? fail(err) : ok(`${cfg.vehicles[p.driving!].emoji} ${cfg.vehicles[p.driving!].name} худалдаж авлаа — WASD жолоодох`);
    }

    case 'neighborBull':
      state.neighborBull = cmd.on;
      return ok();

    case 'dogOrder': {
      const dogs = cmd.dog === 'all' ? state.dogs : state.dogs.filter((d) => d.id === cmd.dog);
      if (!dogs.length) return fail(state.dogs.length ? 'Ийм нохой алга' : 'Нохой алга — сумын төвөөс авна (T)');
      for (const d of dogs) orderDog(cfg, state, d, cmd.order, cmd.herd);
      const who = cmd.dog === 'all' ? (dogs.length > 1 ? 'Бүх нохой' : dogs[0]!.name) : dogs[0]!.name;
      return ok(`🐕 ${who}: ${DOG_ORDER_NAME[cmd.order]}`);
    }

    case 'cheat':
      return ok(applyCheat(sim, cmd.action));

    case 'teahouse':
      refreshCandidates(cfg, state);
      return ok();
    case 'hire': {
      refreshCandidates(cfg, state);
      const err = hire(cfg, state, cmd.candidate, proximity);
      return err ? fail(err) : ok('Туслах хөлсөллөө — таны бууц руу явлаа');
    }
    case 'fireHelper': {
      const err = fire(state, cmd.helper);
      return err ? fail(err) : ok('Туслах ажлаас гарлаа');
    }
    case 'helperTask': {
      const err = setTask(state, cmd.helper, cmd.task, cmd.herd);
      return err ? fail(err) : ok();
    }
    case 'payWithAnimal': {
      const err = payWithAnimal(cfg, state, cmd.helper, cmd.animal);
      return err ? fail(err) : ok('Цалинг малаар өглөө');
    }
    case 'sendOtor': {
      const err = sendOtor(cfg, state, cmd.helper, cmd.animalIds, cmd.camp);
      return err ? fail(err) : ok('Отор явлаа');
    }
    case 'otorCollector': {
      const err = setOtorCollector(state, cmd.helper, cmd.camp);
      return err ? fail(err) : ok(cmd.camp ? 'Цуглуулагч отор руу явлаа' : 'Цуглуулагч гэртээ ирлээ');
    }
    case 'takeOtor': {
      const r = takeFromOtor(cfg, state, cmd.camp);
      return r.err ? fail(r.err) : ok(`Отроос ${Math.round(r.took * 10) / 10} нэгж бүтээгдэхүүн авлаа`);
    }
    case 'recallOtor': {
      const err = recallOtor(cfg, state, cmd.helper, sim.random);
      return err ? fail(err) : ok('Отроос буцлаа');
    }

    case 'moveCamp': {
      if (proximity && !nearHome(cfg, p)) return fail('Нүүхийн тулд майхандаа оч (ачаа бараагаа ачина)');
      const err = startMove(cfg, state, cmd.to);
      if (err) return fail(err);
      // Шинэ бууцны чанарыг Sim дахин тооцно
      return ok('Нүүж байна');
    }
  }
}

export type { BuyOrder };
