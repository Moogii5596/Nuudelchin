/**
 * T-27 UI лаб: HUD 2-ын контекст логик (src/ui-lab/context.ts) — алтан товчны жагсаалт, Horse товчны төлөв.
 */
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/sim/config';
import { createInitialState, type GameState } from '../src/sim/state';
import { ridingHorse } from '../src/sim/systems/herder';
import { addVehicle, fleetOf } from '../src/sim/systems/travel';
import { contextTargets, horseMode } from '../src/ui-lab/context';
import lab from '../../data/ui-lab.json';

const cfg = loadConfig();
const REACH = lab.pickupReach;

function fresh(): GameState {
  const st = createInitialState(cfg, 7);
  st.home = 'ger';
  Object.assign(st.player, { x: 40, z: 40, mounted: false });
  const h = ridingHorse(st)!;
  Object.assign(h, { x: -7, z: 7 });
  return st;
}
const kinds = (st: GameState): string[] => contextTargets(cfg, st, REACH).map((t) => t.kind);

describe('ui-lab: контекст товч', () => {
  it('ойр юу ч үгүй бол жагсаалт хоосон (товч бүдэг)', () => {
    expect(kinds(fresh())).toEqual([]);
  });

  it('морь, тэрэг, сүү ойр байвал бүгд гарна, хамгийн ойрх нь эхэнд', () => {
    const st = fresh();
    addVehicle(cfg, st, 'horseCart');
    Object.assign(st.player, { x: 0, z: 30 });
    Object.assign(ridingHorse(st)!, { x: 0, z: 31 });                       // 1 м
    Object.assign(fleetOf(st, 'horseCart')!, { x: 3, z: 30 });              // 3 м
    st.items.push({ id: st.nextId++, product: 'milk', amount: 1, x: -2.5, z: 30, age: 0 });   // 2.5 м
    const ts = contextTargets(cfg, st, REACH);
    expect(ts.map((t) => t.kind)).toEqual(['mount', 'pickup', 'cart']);
    expect(ts.every((t) => t.at)).toBe(true);
    expect(ts[2]!.ref).toBe('horseCart');
  });

  it('зайны босго тоглоомын тохиргооноос: mountRange, enterRange, pickupRadius × pickupReach', () => {
    const st = fresh();
    addVehicle(cfg, st, 'horseCart');
    Object.assign(st.player, { x: 0, z: 30 });
    Object.assign(ridingHorse(st)!, { x: cfg.player.mountRange + 0.2, z: 30 });
    Object.assign(fleetOf(st, 'horseCart')!, { x: 0, z: 30 + cfg.vehicles.road.enterRange + 0.2 });
    st.items.push({ id: st.nextId++, product: 'milk', amount: 1, x: 0, z: 30 - cfg.products.pickupRadius * REACH - 0.2, age: 0 });
    expect(kinds(st)).toEqual([]);
  });

  it('гэрийн хаалганы дэргэд «орох», агуулахын дэргэд гартаа ачаатай бол «хийх»', () => {
    const st = fresh();
    Object.assign(st.player, { x: 0, z: cfg.camps.home.storageRadius - 1 });
    expect(kinds(st)).toContain('enter');
    st.player.carry.push({ product: 'milk', amount: 1, age: 0 });
    expect(kinds(st)).toContain('deposit');
  });

  it('морь унасан үед эхний үйлдэл нь давхих (дарж байх)', () => {
    const st = fresh();
    st.player.mounted = true;
    const ts = contextTargets(cfg, st, REACH);
    expect(ts[0]).toMatchObject({ kind: 'gallop', hold: true });
    expect(ts.some((t) => t.kind === 'cart' || t.kind === 'enter')).toBe(false);
  });

  it('тэрэг жолоодож байвал «буух», газрын зураг дээр «хурдлах»', () => {
    const st = fresh();
    addVehicle(cfg, st, 'horseCart');
    st.player.driving = 'horseCart';
    expect(kinds(st)).toEqual(['exitCart']);
    st.player.driving = null;
    st.player.place = 'map';
    expect(contextTargets(cfg, st, REACH)).toEqual([{ kind: 'fast', d: -1, hold: true }]);
  });
});

describe('ui-lab: Horse товч', () => {
  it('хол → дуудах, дуудсан → ирж байна, ойр → унах, унасан → буух', () => {
    const st = fresh();
    expect(horseMode(cfg, st)).toBe('call');
    st.player.horseCalled = true;
    expect(horseMode(cfg, st)).toBe('coming');
    Object.assign(ridingHorse(st)!, { x: st.player.x + 1, z: st.player.z });
    expect(horseMode(cfg, st)).toBe('mount');
    st.player.mounted = true;
    expect(horseMode(cfg, st)).toBe('dismount');
  });

  it('морь өөр газар (сумын төвд тоглогч, морь бууцанд), жолоодож байгаа, зураг дээр → идэвхгүй', () => {
    const st = fresh();
    st.player.place = 'sum';
    expect(horseMode(cfg, st)).toBe('none');
    st.player.place = 'camp';
    st.player.driving = 'horseCart';
    expect(horseMode(cfg, st)).toBe('none');
    st.player.driving = null;
    st.player.place = 'map';
    expect(horseMode(cfg, st)).toBe('none');
  });

  it('лабын 4 эхлэлийн байдал тохиргоонд бий', () => {
    expect(Object.keys(lab.scenes).sort()).toEqual(['calm', 'near', 'riding', 'wheel']);
  });
});
