import { describe, expect, it } from 'vitest';
import { cfg, newSim } from './helpers';
import { primaryAction } from '../src/input/controller';
import { addVehicle, fleetOf } from '../src/sim/systems/travel';

describe('Утасны гол товч (primaryAction)', () => {
  it('нөхцөлөөс хамаарч үйлдэл сонгоно; хийх зүйлгүй бол null', () => {
    const sim = newSim(7);
    const s = sim.state, p = s.player, home = cfg.camps.home;
    p.x = home.x + 60; p.z = home.z + 60;
    s.items = [];
    expect(primaryAction(cfg, s)).toBeNull();
    s.items.push({ id: 999, product: 'wool', amount: 1, x: p.x, z: p.z, age: 0 } as (typeof s.items)[number]);
    expect(primaryAction(cfg, s)).toBe('pickup');
    s.items = [];
    p.carry.push({ product: 'wool', amount: 1, age: 0 });
    expect(primaryAction(cfg, s)).toBeNull();          // гар дүүрэн ч агуулахаас хол
    p.x = home.x + 1; p.z = home.z + 1;
    expect(primaryAction(cfg, s)).toBe('deposit');
    p.carry = [];
    // жолоочтой, ачаатай тээврийн дэргэд → явуулах
    addVehicle(cfg, s, 'horseCart');
    const f = fleetOf(s, 'horseCart')!;
    f.cargo.wool = 5;
    p.x = f.x + 1; p.z = f.z + 1;
    expect(primaryAction(cfg, s)).not.toBe('send');    // жолоочгүй
    s.helpers.list.push({ id: 1, kind: 'adult', task: 'drive', trip: null } as unknown as (typeof s.helpers.list)[number]);
    expect(primaryAction(cfg, s)).toBe('send');
    p.driving = 'horseCart';
    expect(primaryAction(cfg, s)).toBeNull();
  });
});
