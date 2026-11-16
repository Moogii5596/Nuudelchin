import { describe, expect, it } from 'vitest';
import { cfg, newSim } from './helpers';
import * as storage from '../src/sim/systems/storage';
import { AutoTrip } from '../src/sim/autotrip';
import { isOpen, minutesUntilOpen, shopHours, validateShops } from '../src/sim/systems/shops';
import { hire } from '../src/sim/systems/helpers';
import { teahouseDoor } from '../src/sim/systems/sumtown';

const H = (h: number) => h * 60;

describe('Дэлгүүрийн ажлын цаг (data/shops.json)', () => {
  it('Худалдаачин, шатахуун 09–19; цайны газар 08–21', () => {
    expect(shopHours(cfg, 'buyer')).toEqual({ open: 9, close: 19 });
    expect(shopHours(cfg, 'fuel')).toEqual({ open: 9, close: 19 });
    expect(shopHours(cfg, 'teahouse')).toEqual({ open: 8, close: 21 });
    expect(isOpen(cfg, 'buyer', H(8.99))).toBe(false);
    expect(isOpen(cfg, 'buyer', H(9))).toBe(true);
    expect(isOpen(cfg, 'buyer', H(18.99))).toBe(true);
    expect(isOpen(cfg, 'buyer', H(19))).toBe(false);
    expect(isOpen(cfg, 'teahouse', H(8))).toBe(true);
    expect(isOpen(cfg, 'teahouse', H(20.5))).toBe(true);
    expect(isOpen(cfg, 'teahouse', H(21))).toBe(false);
    expect(isOpen(cfg, 'buyer', H(27))).toBe(false);   // шөнө дундаас хойш (minute > 1440): 03:00
    expect(isOpen(cfg, 'buyer', H(33))).toBe(true);    // дараа өдрийн 09:00
  });

  it('нээгдэх хүртэлх минут', () => {
    expect(minutesUntilOpen(cfg, 'buyer', H(7))).toBe(120);
    expect(minutesUntilOpen(cfg, 'buyer', H(12))).toBe(0);
    expect(minutesUntilOpen(cfg, 'buyer', H(20))).toBe(H(13));
  });

  it('буруу цагийг шалгана', () => {
    expect(() => validateShops({ default: { open: 19, close: 9 }, byRole: {}, byId: {} })).toThrow();
  });

  it('хаалттай цайны газарт хөлс авахгүй, нээлттэй үед боломжтой', () => {
    const sim = newSim(3);
    const t = teahouseDoor(cfg);
    sim.state.player.place = 'sum';
    sim.state.player.x = t.x;
    sim.state.player.z = t.z;
    sim.state.time.minute = H(7);
    expect(hire(cfg, sim.state, 1, true)?.key).toBe('sim.shop_closed');
    sim.state.time.minute = H(12);
    expect(hire(cfg, sim.state, 99999, true)?.key).toBe('sim.no_such_person');   // цаг нь өнгөрсөн, өөр шалтгаанаар л татгалзана
  });

  it('автомат аялал хаалттай үед хүлээж, нээгдэх үед арилжаа хийнэ', () => {
    const sim = newSim(4);
    storage.add(cfg, sim.state, 'aaruul', 8);
    const t = new AutoTrip({ sell: { aaruul: 8 }, sellAnimalIds: [], buy: [] });
    let sold = -1;
    for (let i = 0; i < 3 * 1440 && !t.tick(sim); i++) {
      if (sold < 0 && sim.state.player.place === 'sum' && storage.count(sim.state, 'aaruul') === 0 && sim.state.player.carry.length === 0) sold = sim.state.time.minute;
      sim.step();
    }
    expect(t.phase).toBe('done');
    // арилжаа хийсэн цаг нь ажлын цагт
    expect(sold === -1 || isOpen(cfg, 'buyer', sold)).toBe(true);
  });
});
