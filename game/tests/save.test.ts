/**
 * M6.1 Хадгалалтын цөм: нэг seed + нэг командын дараалал → «15 өдөр + хадгалах + ачаалах + 15 өдөр» нь 30 өдөр тасралтгүйтэй
 * ЯГ ИЖИЛ. Ялгаатай бол Sim/модуль дотор GameState-д ороогүй төлөв байна гэсэн үг (sim/save.ts-ийн толгойг үз).
 */
import { describe, expect, it } from 'vitest';
import { cfg, newSim, steps, DAY } from './helpers';
import { Sim, type SimEvent } from '../src/sim/sim';
import { createInitialState, SAVE_VERSION, MIN_SAVE_VERSION, type GameState } from '../src/sim/state';
import { SAVE_FORMAT, SaveError, deserialize, migrationChainComplete, saveMeta, serialize, validateState } from '../src/sim/save';
import { refreshCandidates } from '../src/sim/systems/helpers';
import { seasonOf } from '../src/sim/systems/seasons';
import { campEnterDoors, currentRoom } from '../src/sim/systems/interior';
import { addVehicle, fleetOf } from '../src/sim/systems/travel';

/** Хоёр утгын эхний ялгаатай зам (JSON-оор), байхгүй бол null */
function firstDiff(a: unknown, b: unknown, path = ''): string | null {
  if (a === b) return null;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return Object.is(a, b) ? null : `${path}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`;
  }
  const ka = Object.keys(a as object), kb = Object.keys(b as object);
  for (const k of new Set([...ka, ...kb])) {
    const d = firstDiff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`);
    if (d) return d;
  }
  return null;
}

/** Хадгалах → текст → ачаалах → шинэ Sim (UI-ийн «үргэлжлүүлэх»-тэй адил) */
function reload(sim: Sim): Sim {
  return new Sim(cfg, deserialize(cfg, serialize(sim.state)));
}

function record(sim: Sim): SimEvent[] {
  const out: SimEvent[] = [];
  sim.on((e) => { if (e.type !== 'hour') out.push(e); });
  return out;
}

/** Хоёр Sim-ийг n алхам ижил үйлдлээр явуулж (тоглогчийн дуурайлт), төлөв ба үйл явдал ижил эсэхийг шалгана */
function bothRun(a: Sim, b: Sim, n: number, act?: (s: Sim) => void): void {
  const ea = record(a), eb = record(b);
  for (let i = 0; i < n; i++) {
    act?.(a); act?.(b);
    a.step(); b.step();
  }
  expect(firstDiff(a.state, b.state)).toBeNull();
  expect(firstDiff(ea, eb)).toBeNull();
}

/** Тоглогчийн энгийн үйлдлүүд — алхмын тоогоор тодорхойлогдоно (A, B хоёуланд ижил) */
function shouter(s: Sim): void {
  const k = s.state.step;
  if (k % 97 === 0) s.command({ type: 'shout' });
  if (k % 211 === 0) s.command({ type: 'pickup', ids: 'nearby' });
  if (k % 331 === 0) s.command({ type: 'debugAddAnimals', n: 2 });
}

describe('Хадгалалт: 15 өдөр + хадгалах + ачаалах + 15 өдөр = 30 өдөр тасралтгүй', () => {
  for (const seed of [1, 2, 3, 4]) {
    it(`seed ${seed}`, () => {
      const a = newSim(seed);
      const bSteps = 15 * DAY + seed * 3;   // шийдвэрийн алхмын завсарт хадгална (seed 1 → +3 …)
      for (let i = 0; i < bSteps; i++) { shouter(a); a.step(); }
      const b = reload(a);
      expect(firstDiff(a.state, b.state)).toBeNull();   // ачаалсан төлөв хадгалсантай ижил
      bothRun(a, b, 15 * DAY - seed * 3, shouter);
    }, 180_000);
  }

  it('JSON-оор дамжих нь төлөвийг өөрчлөхгүй (NaN/undefined/Map байхгүй)', () => {
    const a = newSim(5);
    steps(a, 3 * DAY);
    const back = deserialize(cfg, serialize(a.state));
    expect(back).toEqual(a.state);
    expect(validateState(cfg, a.state)).toEqual([]);
    expect(saveMeta(a.state)).toMatchObject({ seed: 5, day: a.state.time.day, version: SAVE_VERSION });
  });

  it('командын санамсаргүй тоо хадгалалтад орно: shout дараа шууд хадгалаад үргэлжлүүлэхэд ижил', () => {
    const a = newSim(6);
    steps(a, 120);
    a.command({ type: 'shout' });
    a.command({ type: 'debugAddAnimals', n: 3 });
    expect(a.state.rngState).toBe(a.random.state);
    const b = reload(a);
    bothRun(a, b, 400);
  });
});

describe('Хадгалах мөчүүд: ачаалсны дараа тасралтгүйтэй ижил үргэлжилнэ', () => {
  it('шөнө (22:00)', () => {
    const a = newSim(11);
    while (a.state.time.minute < 22 * 60 - 0 || a.state.time.day < 2) a.step();
    const b = reload(a);
    bothRun(a, b, DAY);
  }, 60_000);

  it('улирал солигдох өдөр', () => {
    const a = newSim(12);
    let d = 1;
    while (seasonOf(cfg, d) === seasonOf(cfg, d + 1)) d++;
    a.state.time.day = d;   // улирлын сүүлийн өдөр
    while (a.state.time.minute < 19 * 60) a.step();   // dayEnd-ийн өмнө
    const b = reload(a);
    bothRun(a, b, 2 * DAY);
    expect(seasonOf(cfg, a.state.time.day)).not.toBe(seasonOf(cfg, d));
  }, 60_000);

  it('отор: туслах, отрын мал бүтээгдэхүүн хуримтлуулж байхад', () => {
    const a = newSim(13);
    const s = a.state;
    s.home = 'ger';
    s.money = 5_000_000;
    s.helpers.otorTents = 1;
    let fam = null;
    for (let k = 0; k < 40 && !fam; k++) {
      refreshCandidates(cfg, s);
      fam = s.helpers.candidates.find((c) => c.family) ?? null;
      if (!fam) { s.helpers.candidatesDay -= 100; s.time.day += 1; }
    }
    expect(a.command({ type: 'hire', candidate: fam!.id }, false).ok).toBe(true);
    const adult = s.helpers.list.find((h) => h.kind === 'adult')!;
    const ids = s.animals.filter((x) => !x.riding && x.species === 'sheep').slice(0, 6).map((x) => x.id);
    expect(a.command({ type: 'sendOtor', helper: adult.id, animalIds: ids, camp: 'valley' }).ok).toBe(true);
    steps(a, 2 * DAY);
    expect(s.helpers.otor.length).toBeGreaterThan(0);
    const b = reload(a);
    bothRun(a, b, 3 * DAY);
  }, 90_000);

  it('жолооч: тэргэнд суусан (3D) ба газрын зураг дээр явж байхад', () => {
    const a = newSim(14);
    addVehicle(cfg, a.state, 'horseCart');
    const f = fleetOf(a.state, 'horseCart')!;
    a.state.player.x = f.x + 1;
    a.state.player.z = f.z;
    expect(a.command({ type: 'toggleVehicle' }).ok).toBe(true);
    for (let x = f.x; x > f.x - 10; x -= 2) a.command({ type: 'driveVehicle', x, z: f.z, heading: -Math.PI / 2 });
    expect(a.state.player.driving).toBe('horseCart');
    const b = reload(a);
    expect(b.state.player.driving).toBe('horseCart');
    bothRun(a, b, 300);
    // газрын зураг руу гарч, зам дундаас
    a.command({ type: 'quickMap' });
    a.command({ type: 'mapGo', x: 0, z: 0, dest: 'sum' });
    steps(a, 15);
    expect(a.state.player.place).toBe('map');
    expect(a.state.map.dest).not.toBeNull();
    const c = reload(a);
    bothRun(a, c, 1500);
  }, 60_000);

  it('барилга дотор байх үед', () => {
    const a = newSim(15, (s) => (s.home = 'ger'));
    const door = campEnterDoors(cfg, a.state).find((d) => d.id === 'home')!;
    a.state.player.x = door.x;
    a.state.player.z = door.z;
    expect(a.command({ type: 'enterBuilding' }).ok).toBe(true);
    expect(a.command({ type: 'moveInterior', x: 0.4, z: 0.6, heading: 1 }).ok).toBe(true);
    const inside = structuredClone(a.state.player.interior);
    const b = reload(a);
    expect(b.state.player.interior).toEqual(inside);
    bothRun(a, b, 600);
    expect(a.state.player.interior).toEqual(b.state.player.interior);
    const room = currentRoom(cfg, b.state)!;
    b.command({ type: 'moveInterior', x: room.exit[0], z: room.exit[1] });
    expect(b.command({ type: 'exitBuilding' }).ok).toBe(true);
  });
});

describe('Хуучин хувилбар → migrate; эвдэрсэн файл → SaveError', () => {
  /** Одоогийн хадгалалтыг хуучин хувилбарын хэлбэр рүү буцаана (дараа нь нэмэгдсэн талбаруудыг хасна) */
  function downgrade(st: GameState, to: number): unknown {
    const o = structuredClone(st) as unknown as Record<string, unknown>;
    o.version = to;
    if (to < 13) { delete o.dayStartMoney; delete o.flockCenters; }
    if (to < 12) delete (o.player as Record<string, unknown>).interior;
    return o;
  }

  it('шилжүүлэх алхмын гинж бүрэн', () => {
    expect(migrationChainComplete()).toBe(true);
    expect(MIN_SAVE_VERSION).toBeLessThan(SAVE_VERSION);
  });

  for (const v of [11, 12]) {
    it(`v${v} хадгалалт ачаалагдаж, шинэ талбарууд нөхөгдөж, тоглоом үргэлжилнэ`, () => {
      const a = newSim(21);
      steps(a, 2 * DAY);
      const old = JSON.stringify(downgrade(a.state, v));
      const st = deserialize(cfg, old);
      expect(st.version).toBe(SAVE_VERSION);
      expect(st.player.interior).toBeNull();
      expect(st.flockCenters).toEqual([]);
      expect(validateState(cfg, st)).toEqual([]);
      const b = new Sim(cfg, st);
      steps(b, DAY);   // унахгүй
      expect(b.state.time.day).toBeGreaterThan(a.state.time.day);
      expect(b.state.dayStartMoney).not.toBeNull();
    }, 30_000);
  }

  it('боодолтой (SaveFile) ба нүцгэн GameState хоёуланг хүлээн авна', () => {
    const a = newSim(22);
    const wrapped = JSON.parse(serialize(a.state)) as { format: string };
    expect(wrapped.format).toBe(SAVE_FORMAT);
    expect(deserialize(cfg, JSON.stringify(a.state)).seed).toBe(22);
  });

  it('эвдэрсэн, шинэ, хэт хуучин, буруу хадгалалтыг SaveError-оор татгалзана', () => {
    const a = newSim(23);
    const good = JSON.parse(serialize(a.state)) as { state: Record<string, unknown> };
    const bad = (mut: (s: Record<string, unknown>) => void): string => { const c = structuredClone(good); mut(c.state); return JSON.stringify(c); };
    expect(() => deserialize(cfg, '{not json')).toThrow(SaveError);
    expect(() => deserialize(cfg, '[]')).toThrow(/объект/);
    expect(() => deserialize(cfg, bad((s) => { s.version = SAVE_VERSION + 1; }))).toThrow(/шинэ хувилбар/);
    expect(() => deserialize(cfg, bad((s) => { s.version = MIN_SAVE_VERSION - 1; }))).toThrow(/хэт хуучин/);
    expect(() => deserialize(cfg, bad((s) => { s.money = null; }))).toThrow(/money/);
    expect(() => deserialize(cfg, bad((s) => { s.campId = 'mars'; }))).toThrow(/campId/);
    expect(() => deserialize(cfg, bad((s) => { (s.grass as { biomass: number[] }).biomass.pop(); }))).toThrow(/grass\.biomass/);
    expect(() => deserialize(cfg, bad((s) => { (s.animals as { id: number }[])[1]!.id = (s.animals as { id: number }[])[0]!.id; }))).toThrow(/давхардсан/);
    expect(() => deserialize(cfg, bad((s) => { (s.animals as { x: unknown }[])[0]!.x = null; }))).toThrow(/animals/);
    expect(() => deserialize(cfg, bad((s) => { (s.wolves as { rngState: number }).rngState = -1; }))).toThrow(/wolves\.rngState/);
    expect(() => deserialize(cfg, bad((s) => { delete s.town; }))).toThrow(/town/);
    expect(() => deserialize(cfg, bad((s) => { (s.player as { place: string }).place = 'moon'; }))).toThrow(/player\.place/);
    try { deserialize(cfg, bad((s) => { s.money = null; s.campId = 'mars'; })); } catch (e) { expect((e as SaveError).problems.length).toBeGreaterThanOrEqual(2); }
  });

  it('шинэ тоглоомын анхны төлөв валидаци давна (бүх seed)', () => {
    for (const seed of [1, 2, 3, 99, 4_000_000_000]) expect(validateState(cfg, createInitialState(cfg, seed)), `seed ${seed}`).toEqual([]);
  });
});
