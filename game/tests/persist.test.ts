/**
 * M6.2 Хөтчийн хадгалалт: fake-indexeddb дээр слот, A/B хуулбар (бичих дундаа тасрахад өмнөх хуулбар бүтэн), слотын жагсаалт,
 * автомат хадгалалтын хүсэлт/flush, .nuudel файл экспорт → импорт.
 */
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { cfg, newSim, steps, DAY } from './helpers';
import { SaveStore, SLOTS, fnv1a } from '../src/persist/idb';
import { Autosave, attachPageEvents, attachSimEvents } from '../src/persist/autosave';
import { exportBytes, fileName, importBytes } from '../src/persist/file';
import { saveMeta, serialize, SaveError } from '../src/sim/save';
import { Sim } from '../src/sim/sim';

const store = (): SaveStore => new SaveStore(new IDBFactory());

describe('IndexedDB: слот, A/B хуулбар', () => {
  it('3 слот: хоосон жагсаалт → бичих → жагсаалтад meta, ачаалах = анхны state', async () => {
    const s = store();
    expect((await s.list()).map((i) => i.empty)).toEqual([true, true, true]);
    expect(await s.load(cfg, 1)).toBeNull();
    const sim = newSim(1);
    steps(sim, 2 * DAY);
    await s.write(2, serialize(sim.state), saveMeta(sim.state), 1000);
    const l = await s.list();
    expect(l).toHaveLength(SLOTS);
    expect(l[1]).toMatchObject({ slot: 2, empty: false, damaged: false, savedAt: 1000, meta: { seed: 1, day: sim.state.time.day } });
    expect(l[0]!.empty && l[2]!.empty).toBe(true);
    expect(await s.load(cfg, 2)).toEqual(sim.state);
    await expect(s.write(4, '', saveMeta(sim.state))).rejects.toThrow(/слот/);
  });

  it('A/B: бичилт шилжинэ, ачаалахад хамгийн сүүлийнх', async () => {
    const s = store();
    const sim = newSim(2);
    const copies: string[] = [];
    for (let i = 0; i < 4; i++) {
      steps(sim, 100);
      copies.push((await s.write(1, serialize(sim.state), saveMeta(sim.state), 100 + i)).copy);
    }
    expect(copies).toEqual(['A', 'B', 'A', 'B']);
    expect((await s.load(cfg, 1))!.step).toBe(sim.state.step);
  });

  it('бичих дундаа тасрахад (гүйлгээ буцна) өмнөх хуулбар бүтэн', async () => {
    const s = store();
    const sim = newSim(3);
    steps(sim, 50);
    await s.write(1, serialize(sim.state), saveMeta(sim.state), 1);
    const before = sim.state.step;
    steps(sim, 50);
    s.hooks.afterPut = () => { throw new Error('цахилгаан тасарлаа'); };
    await expect(s.write(1, serialize(sim.state), saveMeta(sim.state), 2)).rejects.toThrow(/цахилгаан/);
    s.hooks.afterPut = undefined;
    expect((await s.load(cfg, 1))!.step).toBe(before);
    expect((await s.list())[0]).toMatchObject({ damaged: false, savedAt: 1 });
    // дараагийн хадгалалт хэвийн
    await s.write(1, serialize(sim.state), saveMeta(sim.state), 3);
    expect((await s.load(cfg, 1))!.step).toBe(sim.state.step);
  });

  it('шинэ хуулбар эвдэрсэн (хагас бичигдсэн/нийлбэр таарахгүй) бол өмнөхөөр сэргэнэ; хоёул эвдэрвэл SaveError', async () => {
    const factory = new IDBFactory();
    const s = new SaveStore(factory);
    const sim = newSim(4);
    await s.write(1, serialize(sim.state), saveMeta(sim.state), 1);   // A, seq1
    steps(sim, 60);
    const second = serialize(sim.state);
    await s.write(1, second, saveMeta(sim.state), 2);                  // B, seq2
    s.close();
    // B-ийн data-г тасалсан мэт тайрна (size/check хэвээр)
    await tamper(factory, '1.B', (r) => { r.data = r.data.slice(0, r.data.length >> 1); });
    const s2 = new SaveStore(factory);
    expect((await s2.load(cfg, 1))!.step).toBe(0);   // A (анхны, step 0)
    expect((await s2.list())[0]).toMatchObject({ copy: 'A', damaged: false });
    expect((await s2.latest(cfg))!.slot).toBe(1);
    // A-г ч эвдэнэ
    s2.close();
    await tamper(factory, '1.A', (r) => { r.check = 'deadbeef'; });
    const s3 = new SaveStore(factory);
    expect((await s3.list())[0]).toMatchObject({ damaged: true, empty: false });
    await expect(s3.load(cfg, 1)).rejects.toThrow(SaveError);
    expect(await s3.latest(cfg)).toBeNull();
    // шинээр хадгалахад эвдэрсэн хуулбарыг сольж сэргэнэ
    await s3.write(1, second, saveMeta(sim.state), 5);
    expect((await s3.load(cfg, 1))!.step).toBe(sim.state.step);
  });

  it('latest: хамгийн сүүлд хадгалсан бүтэн слот; remove', async () => {
    const s = store();
    const a = newSim(5), b = newSim(6);
    steps(b, 30);
    await s.write(1, serialize(a.state), saveMeta(a.state), 10);
    await s.write(3, serialize(b.state), saveMeta(b.state), 20);
    const l = await s.latest(cfg);
    expect(l!.slot).toBe(3);
    expect(l!.state.seed).toBe(6);
    await s.remove(3);
    expect((await s.latest(cfg))!.slot).toBe(1);
  });

  it('нийлбэр (fnv1a) тогтвортой, ялгаатай текстэд ялгаатай', () => {
    expect(fnv1a('abc')).toBe(fnv1a('abc'));
    expect(fnv1a('abc')).not.toBe(fnv1a('abd'));
  });
});

async function tamper(factory: IDBFactory, id: string, fn: (r: { data: string; check: string }) => void): Promise<void> {
  const db: IDBDatabase = await new Promise((ok, no) => { const r = factory.open('nuudelchin', 1); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  await new Promise<void>((ok, no) => {
    const tx = db.transaction('saves', 'readwrite');
    const st = tx.objectStore('saves');
    const g = st.get(id);
    g.onsuccess = () => { fn(g.result); st.put(g.result); };
    tx.oncomplete = () => { db.close(); ok(); };
    tx.onerror = () => no(tx.error);
  });
}

describe('Автомат хадгалалт', () => {
  it('20:00 (dayReport) хүсэлт → flush хүртэл бичихгүй; flush-аар слот шинэчлэгдэнэ', async () => {
    const s = store();
    const sim = newSim(7);
    let t = 0;
    const saved: string[] = [];
    const a = new Autosave({ store: s, state: () => sim.state, slot: () => 2, onSaved: (r) => saved.push(r), now: () => t, minGapMs: 1000 });
    attachSimEvents(sim, a);
    while (sim.state.time.minute < 20 * 60) {
      sim.step();
      expect(a.saves).toBe(0);   // алхмын дунд бичигдээгүй
    }
    // dayEnd энэ алхамд гарсан: хүсэлт хүлээгдэж байна
    await a.flush();
    await a.idle();
    expect(saved).toEqual(['dayEnd']);
    const got = (await s.load(cfg, 2))!;
    expect(got.time.minute).toBe(sim.state.time.minute);
    expect(got.step).toBe(sim.state.step);
    // тасралтгүй үргэлжилсэнтэй ижил (rngState бүтэн)
    const cont = new Sim(cfg, got);
    steps(sim, 300); steps(cont, 300);
    expect(JSON.stringify(cont.state)).toBe(JSON.stringify(sim.state));
  }, 30_000);

  it('хэт ойр хоёр автомат хүсэлтийг нэгтгэнэ; hidden/manual нь хугацааг алгасна', async () => {
    const s = store();
    const sim = newSim(8);
    let t = 100_000;
    const a = new Autosave({ store: s, state: () => sim.state, slot: () => 1, now: () => t, minGapMs: 5000 });
    a.request('dayEnd'); await a.flush(); await a.idle();
    expect(a.saves).toBe(1);
    t += 1000;
    a.request('map'); await a.flush(); await a.idle();
    expect(a.saves).toBe(1);                      // 1 сек — хэт ойр
    a.request('hidden'); await a.flush(); await a.idle();
    expect(a.saves).toBe(2);                      // hidden шууд
    t += 6000;
    await a.flush(); await a.idle();
    expect(a.saves).toBe(2);                      // map хүсэлт hidden-д шингэсэн
  });

  it('visibilitychange(hidden)/pagehide: тэр дор нь хадгална; алдаа onError-т', async () => {
    const s = store();
    const sim = newSim(9);
    steps(sim, 25);
    const errs: unknown[] = [];
    const a = new Autosave({ store: s, state: () => sim.state, slot: () => 3, onError: (e) => errs.push(e) });
    const listeners = new Map<string, () => void>();
    const target = { addEventListener: (n: string, f: () => void) => { listeners.set(n, f); }, removeEventListener: (n: string) => { listeners.delete(n); } };
    const doc = Object.assign(target, { visibilityState: 'visible' as DocumentVisibilityState });
    const off = attachPageEvents(a, target as unknown as EventTarget, doc as unknown as Document);
    listeners.get('visibilitychange')!();   // visible → юу ч хийхгүй
    await a.idle();
    expect(a.saves).toBe(0);
    doc.visibilityState = 'hidden';
    listeners.get('visibilitychange')!();
    await a.idle();
    expect(a.saves).toBe(1);
    expect((await s.load(cfg, 3))!.step).toBe(25);
    steps(sim, 5);
    listeners.get('pagehide')!();
    await a.idle();
    expect((await s.load(cfg, 3))!.step).toBe(30);
    off();
    expect(listeners.size).toBe(0);
    // бичилт амжилтгүй → onError, тоглоом үргэлжилнэ
    s.hooks.afterPut = () => { throw new Error('хаалттай'); };
    await a.saveNow('manual');
    expect(errs).toHaveLength(1);
    expect(a.failures).toBe(1);
  });
});

describe('.nuudel файл (gzip)', () => {
  it('экспорт → импорт = анхны state; шахсан нь жижиг; нэр', async () => {
    const sim = newSim(10);
    steps(sim, 3 * DAY);
    const bytes = await exportBytes(sim.state);
    expect(bytes[0]).toBe(0x1f);
    expect(bytes[1]).toBe(0x8b);
    expect(bytes.length).toBeLessThan(serialize(sim.state).length / 2);
    expect(await importBytes(cfg, bytes)).toEqual(sim.state);
    expect(fileName(sim.state)).toBe(`nuudel-day${sim.state.time.day}-seed10.nuudel`);
  });

  it('шахаагүй JSON-ыг ч уншина; эвдэрсэн файл SaveError/Error', async () => {
    const sim = newSim(11);
    expect((await importBytes(cfg, new TextEncoder().encode(serialize(sim.state)))).seed).toBe(11);
    const bytes = await exportBytes(sim.state);
    await expect(importBytes(cfg, bytes.slice(0, 40))).rejects.toThrow();
    await expect(importBytes(cfg, new TextEncoder().encode('мэдээлэл биш'))).rejects.toThrow(SaveError);
  });
});
