import { describe, expect, it } from 'vitest';
import { cfg, newSim, steps, DAY } from './helpers';
import { addNote, markRead } from '../src/sim/systems/journal';
import { deserialize, serialize } from '../src/sim/save';
import { SkipRun } from '../src/input/skip';

const J = cfg.time.journal;

describe('📜 Тэмдэглэл: мэдэгдэл + өдрийн тайлан', () => {
  it('2 өдөр алгасахад хоёр өдрийн тайлан хадгалагдана (дарааллаар), save-д орно', () => {
    const sim = newSim(51);
    sim.command({ type: 'cheat', action: 'wolvesPeaceful' });
    for (let d = 0; d < 2; d++) {
      const skip = new SkipRun(sim, 'morning');
      while (skip.step()) { /* өглөө болтол */ }
      skip.dispose();
    }
    expect(sim.state.journal.reports.map((r) => r.day)).toEqual([1, 2]);
    addNote(cfg, sim.state, 'сорил', 'good');
    const back = deserialize(cfg, serialize(sim.state));
    expect(back.journal.reports.map((r) => r.day)).toEqual([1, 2]);
    expect(back.journal.notes.at(-1)).toMatchObject({ text: 'сорил', kind: 'good', day: sim.state.time.day });
    expect(back.journal.unread).toBe(1);
  });

  it('сүүлийн 7 өдрийн тайлан, 30 мэдэгдэл л үлдэнэ; нээхэд уншсанд тооцогдоно', () => {
    const sim = newSim(52);
    sim.command({ type: 'cheat', action: 'wolvesPeaceful' });
    steps(sim, (J.reportDays + 2) * DAY);
    const days = sim.state.journal.reports.map((r) => r.day);
    expect(days).toHaveLength(J.reportDays);
    expect(days.at(-1)).toBe(J.reportDays + 2);
    for (let i = 0; i < J.notes + 5; i++) addNote(cfg, sim.state, `м${i}`, '');
    expect(sim.state.journal.notes).toHaveLength(J.notes);
    expect(sim.state.journal.notes[0]!.text).toBe('м5');
    expect(sim.state.journal.unread).toBe(J.notes);
    markRead(sim.state);
    expect(sim.state.journal.unread).toBe(0);
  });
});
