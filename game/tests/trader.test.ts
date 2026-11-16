/**
 * M6.12 Явуулын худалдаачин (ченж): 4–8 хоног тутам ирнэ, 3 төрөл, бүтээгдэхүүнийг дэлгүүрээс хямд авч боодол өвс зарна;
 * ирэх/явах үйл явдал, цагийн цонх, хадгалалт, migrate.
 */
import { describe, expect, it } from 'vitest';
import { cfg, newSim } from './helpers';
import type { SimEvent } from '../src/sim/sim';
import { deserialize, serialize, validateState } from '../src/sim/save';
import { SAVE_VERSION } from '../src/sim/state';
import { nearTrader, traderBuyPrice, traderHayPrice, traderPresent, validateTrader } from '../src/sim/systems/trader';
import { productPrice } from '../src/sim/systems/trip';

type S = ReturnType<typeof newSim>;

function visitDays(sim: S, days: number): { arrivals: { day: number; kind: string }[]; leaves: number } {
  const arrivals: { day: number; kind: string }[] = [];
  let leaves = 0;
  sim.on((e: SimEvent) => {
    if (e.type === 'traderArrive') arrivals.push({ day: sim.state.time.day, kind: e.kind });
    if (e.type === 'traderLeave') leaves++;
  });
  sim.runDays(days);
  return { arrivals, leaves };
}

/** Худалдаачин одоо зогсож байгаа мэт тохируулна, малчин түүний дэргэд */
function present(sim: S, kind = 'medium', hay = 10): void {
  const st = sim.state;
  st.time.minute = 12 * 60;
  st.trader.visit = { kind, day: st.time.day, from: 11 * 60, to: 15 * 60, hay };
  st.player.place = 'sum';
  st.player.away = true;
  st.player.x = cfg.trader.stand.x;
  st.player.z = cfg.trader.stand.z;
}

describe('Ирэх давтамж, төрөл', () => {
  it('data/trader.json зөв; 3 төрөл; ирэх цаг, хугацаа тохиргоонд', () => {
    expect(validateTrader(cfg)).toEqual([]);
    expect(Object.keys(cfg.trader.kinds)).toEqual(['small', 'medium', 'large']);
  });

  it('120 өдөрт 4–8 хоног тутам (хоорондын зай 4–8), ирэх бүр өдрийн тохируулсан цагт; ирэх/явах мэдэгдэл тэнцүү; 3 төрөл гарна', () => {
    const kinds = new Set<string>();
    for (const seed of [1, 2, 3]) {
      const sim = newSim(seed);
      const days: number[] = [];
      const { arrivals, leaves } = visitDays(sim, 120);
      for (const a of arrivals) { days.push(a.day); kinds.add(a.kind); }
      expect(arrivals.length, `seed ${seed}`).toBeGreaterThanOrEqual(120 / 8 - 1);
      expect(arrivals.length, `seed ${seed}`).toBeLessThanOrEqual(120 / 4 + 1);
      for (let i = 1; i < days.length; i++) {
        const gap = days[i]! - days[i - 1]!;
        expect(gap, `seed ${seed} gap ${i}`).toBeGreaterThanOrEqual(cfg.trader.intervalDays[0]);
        expect(gap, `seed ${seed} gap ${i}`).toBeLessThanOrEqual(cfg.trader.intervalDays[1] + 1);   // +1: цагийн мэдэгдэл дараагийн өдрийн цаг хүртэл хоцорч болно
      }
      expect(Math.abs(arrivals.length - leaves), `seed ${seed}`).toBeLessThanOrEqual(1);
    }
    expect(kinds.size).toBeGreaterThanOrEqual(2);
  }, 120_000);

  it('цагийн цонх: ирэхээс өмнө, явсны дараа байхгүй', () => {
    const sim = newSim(4);
    const st = sim.state;
    st.trader.visit = { kind: 'small', day: st.time.day, from: 600, to: 780, hay: 4 };
    st.time.minute = 590;
    expect(traderPresent(st)).toBeNull();
    st.time.minute = 600;
    expect(traderPresent(st)?.kind).toBe('small');
    st.time.minute = 780;
    expect(traderPresent(st)).toBeNull();
  });
});

describe('Арилжаа', () => {
  it('бүтээгдэхүүнийг дэлгүүрээс ХЯМД авна; жагсаалтад байхгүй бараа (felt) авахгүй; боодол өвс нөөцөөр хязгаарлагдана', () => {
    const sim = newSim(5);
    const st = sim.state;
    st.money = 100_000;
    present(sim, 'medium', 6);
    st.player.carry = [{ product: 'milk', amount: 10, age: 0 }, { product: 'felt', amount: 3, age: 0 }, { product: 'wool', amount: 4, age: 0 }];
    expect(traderBuyPrice(cfg, 'medium', 'milk')).toBeLessThan(productPrice(cfg, 'milk'));
    expect(nearTrader(cfg, st)).toBe(true);
    const before = st.money;
    const r = sim.command({ type: 'traderTrade', sell: { milk: 10, felt: 3, wool: 2 }, buyHay: 20 });
    expect(r.ok, r.msg?.key).toBe(true);
    const income = 10 * traderBuyPrice(cfg, 'medium', 'milk') + 2 * traderBuyPrice(cfg, 'medium', 'wool');
    const bought = 6 - st.trader.visit!.hay;   // нөөц 6, гэхдээ бууцанд багтах өвсөөр (hayRoom) хязгаарлагдана
    expect(bought).toBeGreaterThan(0);
    expect(bought).toBeLessThanOrEqual(6);
    const hayCost = bought * traderHayPrice(cfg, 'medium');
    expect(st.money).toBeCloseTo(before + income - hayCost, 6);
    expect(st.player.carry.find((c) => c.product === 'felt')?.amount).toBe(3);   // авдаггүй
    expect(st.player.carry.find((c) => c.product === 'wool')?.amount).toBe(2);
    expect(st.player.orders).toContainEqual({ kind: 'hay', n: bought });
    // нөөц дуусгаад дахин авах: тайлбар
    st.trader.visit!.hay = 0;
    expect(sim.command({ type: 'traderTrade', sell: {}, buyHay: 1 }).msg?.key).toBe('sim.the_trader_has_no_hay');
  });

  it('байхгүй үед, холоос, сумын төвөөс гадуур арилжаа хийхгүй; мөнгө хүрэхгүй бол өвс авахгүй', () => {
    const sim = newSim(6);
    const st = sim.state;
    expect(sim.command({ type: 'traderTrade', sell: {}, buyHay: 0 }).msg?.key).toBe('sim.you_must_be_in');
    present(sim, 'small', 4);
    st.player.x += 50;
    expect(sim.command({ type: 'traderTrade', sell: {}, buyHay: 1 }).msg?.key).toBe('sim.go_up_to_the_trader');
    st.player.x = cfg.trader.stand.x;
    st.trader.visit = null;
    expect(sim.command({ type: 'traderTrade', sell: {}, buyHay: 1 }).msg?.key).toBe('sim.the_trader_is_not_here');
    present(sim, 'small', 4);
    st.money = 1;
    expect(sim.command({ type: 'traderTrade', sell: {}, buyHay: 2 }).msg?.key).toBe('sim.not_enough_money');
    expect(st.trader.visit!.hay).toBe(4);
  });
});

describe('Хадгалалт', () => {
  it('айлчлал хадгалагдаж, ачаалахад үргэлжилнэ (ижил үр дүн)', () => {
    const a = newSim(7);
    a.runDays(6);
    present(a, 'large', 24);
    const back = deserialize(cfg, serialize(a.state));
    expect(back.trader).toEqual(a.state.trader);
    expect(validateState(cfg, back)).toEqual([]);
  }, 60_000);

  it('v19 хадгалалт: trader нөхөгдөнө', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(20);
    const sim = newSim(8);
    const old = JSON.parse(JSON.stringify(sim.state)) as Record<string, unknown> & { version: number };
    delete old.trader;
    old.version = 19;
    const st = deserialize(cfg, JSON.stringify(old));
    expect(st.trader.visit).toBeNull();
    expect(st.trader.nextDay).toBeGreaterThan(st.time.day);
  });
});

describe('Жолоочийн машин газрын зураг дээр', () => {
  it('гэрээс сумын төв рүү явж, буцах нь харагдана (хагас нь явах, хагас нь буцах)', async () => {
    const { driversOnMap } = await import('../src/sim/systems/mapTraffic');
    const { sumId } = await import('../src/sim/systems/travel');
    const sim = newSim(9);
    const st = sim.state;
    st.helpers.list.push({ id: 7, trip: { vehicle: 'horseCart', remaining: 100, total: 100, cargo: {} } } as never);
    const home = cfg.worldmap.locations[st.campId]!, sum = cfg.worldmap.locations[sumId(cfg)]!;
    const at = (remaining: number) => { st.helpers.list[0]!.trip!.remaining = remaining; return driversOnMap(cfg, st)[0]!; };
    const start = at(100);
    expect([start.x, start.z]).toEqual([home.x, home.z]);
    const mid = at(75);   // 1-р хагасын дундаас: гэр → сум 50%
    expect(mid.toSum).toBe(true);
    expect(mid.x).toBeCloseTo((home.x + sum.x) / 2, 9);
    const atSum = at(50);
    expect(atSum.x).toBeCloseTo(sum.x, 9);
    expect(atSum.z).toBeCloseTo(sum.z, 9);
    const back = at(25);   // буцаж байна
    expect(back.toSum).toBe(false);
    expect(back.x).toBeCloseTo((home.x + sum.x) / 2, 9);
    expect(back.heading).toBeCloseTo(Math.atan2(home.x - sum.x, home.z - sum.z), 9);
    st.helpers.list[0]!.trip = null;
    expect(driversOnMap(cfg, st)).toEqual([]);
  });
});
