/**
 * Тоглогчийн командууд. Input (гар, хулгана) болон тэнцвэрийн симуляторын стратеги
 * хоёул эдгээрээр л sim-ийг өөрчилнө (architecture.md §3.1).
 *
 * proximity=true үед (3D тоглолт) малчин бүтээгдэхүүн, агуулахын ойролцоо байх ёстой.
 * 3D-гүй симуляторт proximity=false: алхах хугацааг тооцохгүй (гараар тоглолтын дээд хязгаар).
 */
import { m, raw, type Msg } from './msg';
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
import { clampDifficulty, type Difficulty } from './systems/difficulty';

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
  | { type: 'ackCeremony' }                       // M6.5: баярын мөчийг хаах («▶ Үргэлжлүүлэх»)
  | { type: 'setShowMilestones'; on: boolean }   // M6.5: HUD-ийн замын тэмдгийн самбар
  | { type: 'setDifficulty'; patch: Partial<Difficulty> }   // M6.10: гулсуур (тоглолтын дундаас ч)
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
  msg?: Msg;
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

const ok = (msg?: Msg): CommandResult => ({ ok: true, msg });
const fail = (msg: Msg): CommandResult => ({ ok: false, msg });

export function applyCommand(sim: Sim, cmd: Command, proximity = true): CommandResult {
  const { cfg, state } = sim;
  const p = state.player;
  // Зөвхөн гэрийн бууцанд, явганаар/мориор хийх ажлууд
  if (CAMP_ONLY.has(cmd.type) && p.away) return fail(m('sim.the_herder_is_busy'));
  if (NOT_DRIVING.has(cmd.type) && p.driving) return fail(m('sim.get_out_of_the'));
  if (cmd.type === 'toggleMount' && p.place === 'map') return fail(m('sim.you_are_on_the'));
  if (state.move && cmd.type !== 'neighborBull' && cmd.type !== 'debugAddAnimals' && cmd.type !== 'cheat') return fail(m('sim.you_are_moving_camp'));

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
      if (p.driving || p.place === 'map') return fail(m('sim.you_are_driving'));
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
      return n ? ok(m('sim.hoy_herded_animals', { n })) : fail(m('sim.no_animals_nearby'));
    }

    case 'toggleMount': {
      const err = toggleMount(cfg, state);
      if (err) return fail(err);
      return ok(p.mounted ? m('sim.you_mounted_the_horse') : m('sim.you_dismounted'));
    }

    case 'toggleUurga':
      return ok(toggleUurga(state) ? m('sim.you_hold_the_urga') : m('sim.you_put_the_urga'));
    case 'callHorse': {
      if (p.mounted) return fail(m('sim.you_are_on_your'));
      p.horseCalled = true;
      return ok(m('sim.chuu_come_here_the'));
    }

    case 'scareWolves': {
      const n = scareWolves(cfg, state);
      return n ? ok(m('sim.huu_hai_wolves_fled', { n })) : fail(m('sim.no_wolves_nearby'));
    }

    case 'ackCeremony':
      state.milestones.ceremony = null;
      return ok();

    case 'setShowMilestones':
      state.settings.showMilestones = cmd.on;
      return ok();

    case 'setDifficulty': {
      state.settings.difficulty = clampDifficulty(cfg, state.settings.difficulty, cmd.patch);
      return { ok: true };
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
      return ok(m('sim.added_animals', { n: cmd.n }));
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
      if (!picked.length) return fail(carried >= cap ? m('sim.your_hands_are_full') : m('sim.no_products_nearby'));
      state.items = state.items.filter((it) => !picked.includes(it.id));
      return ok(m('sim.picked_up_item_s', { length: picked.length }));
    }

    case 'deposit': {
      const h = cfg.camps.home;
      if (proximity && Math.hypot(p.x - h.x, p.z - h.z) > h.storageRadius) return fail(m('sim.too_far_from_the'));
      const left: typeof p.carry = [];
      for (const c of p.carry) {
        const added = storage.add(cfg, state, c.product as ProductId, c.amount, 0);
        if (added > 0) state.today.collected[c.product] = (state.today.collected[c.product] ?? 0) + added;
        if (c.amount - added > 1e-9) left.push({ ...c, amount: c.amount - added });
      }
      p.carry = left;
      return left.length ? fail(m('sim.storage_is_full')) : ok();
    }

    case 'drive': {
      const n = driveFlock(cfg, state, sim.random, cmd.species, cmd.x, cmd.z);
      return n ? ok(m('sim.herded_animals', { n })) : fail(m('sim.no_animals'));
    }

    case 'process': {
      if (proximity && !nearHome(cfg, p)) return fail(m('sim.go_to_your_tent'));
      const pr = state.processors.find((x) => x.kind === cmd.kind && processing.canStart(cfg, state, x));
      if (!pr) return fail(m('sim.the_equipment_is_busy'));
      processing.start(cfg, state, pr);
      return ok();
    }

    case 'toggleVehicle': {
      if (p.driving) {
        const err = exitVehicle(cfg, state);
        return err ? fail(err) : ok(m('sim.you_got_out_of'));
      }
      const err = enterVehicle(cfg, state);
      return err ? fail(err) : ok(m('sim.you_boarded_the_wasd', { x: cfg.vehicles[p.driving!].emoji, x2: cfg.vehicles[p.driving!].name }));
    }
    case 'boardBest':
      return boardBest(cfg, state) ? ok() : fail(m('sim.no_vehicle'));
    case 'driveVehicle': {
      const ev = driveVehicle(cfg, state, cmd.x, cmd.z, cmd.heading);
      if (ev) sim.emitTravel(ev);
      return ok();
    }
    case 'quickMap': {
      if (p.place === 'map') return fail(m('sim.you_are_on_the'));
      if (!canTravel(state)) {
        // Явган бол унаа мориндоо мордоно, морьгүй бол тэрэг/машиндаа сууна
        const horse = state.animals.find((a) => a.riding);
        if (horse) {
          p.mounted = true;
          p.horseCalled = false;
        } else if (!boardBest(cfg, state)) return fail(m('sim.you_have_no_riding'));
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
      return err ? fail(err) : ok(m('sim.your_household_and_herd'));
    }
    case 'loadCargo': {
      const err = loadCargo(cfg, state, cmd.vehicle, cmd.products, cmd.animalIds, proximity);
      return err ? fail(err) : ok(m('sim.loaded'));
    }
    case 'unloadCargo': {
      const err = unloadCargo(cfg, state, sim.random, cmd.vehicle, proximity);
      return err ? fail(err) : ok(m('sim.unloaded'));
    }
    case 'droveAnimals': {
      const err = droveAnimals(state, cmd.animalIds);
      return err ? fail(err) : ok(m('sim.the_animals_follow_behind'));
    }
    case 'takeFromStorage': {
      const err = takeFromStorage(cfg, state, cmd.products, proximity);
      return err ? fail(err) : ok(m('sim.taken_in_hand'));
    }
    case 'trade': {
      const err = trade(cfg, state, sim.random, cmd.plan, proximity);
      return err ? fail(err) : ok(m('sim.trade_done'));
    }
    case 'buyHouse': {
      const err = buyHouse(cfg, state, cmd.plot, proximity);
      return err ? fail(err) : ok(m('sim.yard_house_bought_you'));
    }
    case 'houseMode': {
      const err = setHouseMode(cfg, state, cmd.plot, cmd.mode);
      return err ? fail(err) : ok(cmd.mode === 'rent' ? m('sim.rented_out_rent_comes') : m('sim.the_house_is_empty'));
    }
    case 'donate': {
      const err = donate(cfg, state, cmd.amount, proximity);
      return err ? fail(err) : ok(m('sim.donated_your_reputation_rose'));
    }
    case 'zdtgLoan': {
      const err = takeZdtgLoan(cfg, state, sim.random, cmd.pkg, proximity);
      return err ? fail(err) : ok(m('sim.livestock_loan_taken_the'));
    }
    case 'zdtgRepay': {
      const err = repayZdtgLoan(cfg, state, cmd.mode, proximity);
      return err ? fail(err) : ok(m('sim.livestock_loan_repaid'));
    }
    case 'bankLoan': {
      const err = takeBankLoan(cfg, state, cmd.amount, proximity);
      return err ? fail(err) : ok(m('sim.loan_taken'));
    }
    case 'bankRepay': {
      const err = repayBankLoan(cfg, state, cmd.amount, proximity);
      return err ? fail(err) : ok(m('sim.loan_repaid'));
    }
    case 'gift': {
      const err = giveGift(cfg, state, cmd.relative, cmd.plan, proximity);
      return err ? fail(err) : ok(m('sim.gift_given_you_grew'));
    }
    case 'buyLotVehicle': {
      const err = buyLotVehicle(cfg, state, cmd.slot, proximity);
      return err ? fail(err) : ok(m('sim.bought_the_wasd_to', { x: cfg.vehicles[p.driving!].emoji, x2: cfg.vehicles[p.driving!].name }));
    }

    case 'neighborBull':
      state.neighborBull = cmd.on;
      return ok();

    case 'dogOrder': {
      const dogs = cmd.dog === 'all' ? state.dogs : state.dogs.filter((d) => d.id === cmd.dog);
      if (!dogs.length) return fail(state.dogs.length ? m('sim.no_such_dog') : m('sim.you_have_no_dogs'));
      for (const d of dogs) orderDog(cfg, state, d, cmd.order, cmd.herd);
      const who = cmd.dog === 'all' ? (dogs.length > 1 ? m('sim.all_dogs') : dogs[0]!.name) : dogs[0]!.name;
      return ok(m('sim.dog_order', { who, order: DOG_ORDER_NAME[cmd.order] }));
    }

    case 'cheat':
      return ok(raw(applyCheat(sim, cmd.action)));

    case 'teahouse':
      refreshCandidates(cfg, state);
      return ok();
    case 'hire': {
      refreshCandidates(cfg, state);
      const err = hire(cfg, state, cmd.candidate, proximity);
      return err ? fail(err) : ok(m('sim.helper_hired_heading_to'));
    }
    case 'fireHelper': {
      const err = fire(state, cmd.helper);
      return err ? fail(err) : ok(m('sim.the_helper_quit'));
    }
    case 'helperTask': {
      const err = setTask(state, cmd.helper, cmd.task, cmd.herd);
      return err ? fail(err) : ok();
    }
    case 'payWithAnimal': {
      const err = payWithAnimal(cfg, state, cmd.helper, cmd.animal);
      return err ? fail(err) : ok(m('sim.paid_wages_in_animals'));
    }
    case 'sendOtor': {
      const err = sendOtor(cfg, state, cmd.helper, cmd.animalIds, cmd.camp);
      return err ? fail(err) : ok(m('sim.otor_sent_off'));
    }
    case 'otorCollector': {
      const err = setOtorCollector(state, cmd.helper, cmd.camp);
      return err ? fail(err) : ok(cmd.camp ? m('sim.the_collector_went_to') : m('sim.the_collector_came_home'));
    }
    case 'takeOtor': {
      const r = takeFromOtor(cfg, state, cmd.camp);
      return r.err ? fail(r.err) : ok(m('sim.collected_units_of_products', { x: Math.round(r.took * 10) / 10 }));
    }
    case 'recallOtor': {
      const err = recallOtor(cfg, state, cmd.helper, sim.random);
      return err ? fail(err) : ok(m('sim.recalled_from_the_otor'));
    }

    case 'moveCamp': {
      if (proximity && !nearHome(cfg, p)) return fail(m('sim.go_to_your_tent_56'));
      const err = startMove(cfg, state, cmd.to);
      if (err) return fail(err);
      // Шинэ бууцны чанарыг Sim дахин тооцно
      return ok(m('sim.you_are_moving_camp'));
    }
  }
}

export type { BuyOrder };
