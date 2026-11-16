/**
 * NpcView (render) — бүтэн өдрийн явган замын шалгалт: NPC ханыг нэвтлэхгүй, өглөө гэрийн үүднээс гарна,
 * гэртээ үүдэндээ л алга болно, getHomeState. Three.js-ийг node дээр, DOM-ын stub-тай ажиллуулна.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { cfg } from './helpers';
import { createInitialState } from '../src/sim/state';
import { pushOut } from '../src/sim/systems/sumwalk';
import { seasonOf } from '../src/sim/systems/seasons';
import type { NpcView as NpcViewT } from '../src/render/npcs';

type AnyView = Pick<NpcViewT, 'walk' | 'minuteFrac' | 'updateOutdoor'> & { entries: { def: { id: string }; leg: unknown; placed: boolean; far: { visible: boolean; position: { x: number; z: number } } | null; rig: { root: { visible: boolean; position: { x: number; z: number } } } | null }[]; anchors(): { x: number; z: number }[] };

const stubCtx: unknown = new Proxy(function () { /* stub */ }, { get: (_t, k) => (k === Symbol.toPrimitive ? () => 0 : stubCtx), set: () => true, apply: () => stubCtx });
const el = (): unknown => ({ style: {}, setAttribute() { /* stub */ }, getContext: () => stubCtx, width: 0, height: 0, appendChild() { /* stub */ }, textContent: '' });
let mod: typeof import('../src/render/npcs');
let built: Awaited<ReturnType<typeof import('../src/render/sumlayout').buildSumCenter>>;

beforeAll(async () => {
  const stub: Record<string, unknown> = {
    document: { createElement: el, body: { appendChild() { /* stub */ } } },
    location: { search: '' },
    localStorage: { getItem: () => null, setItem() { /* stub */ } },
    matchMedia: () => ({ matches: false }),
    window: globalThis,
  };
  for (const [k, v] of Object.entries(stub)) Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  mod = await import('../src/render/npcs');
  built = (await import('../src/render/sumlayout')).buildSumCenter(cfg.sumcenter, { seed: 7, walk: cfg.worldmap.sum3d.walk });
});

/** Сумын төвд айлгүй (гадаа амьдардаг) — гэрийн цэгээс л гарч ирж/алга болно */
const HOMELESS: string[] = [];
const dayOf = (season: string): number => { for (let d = 1; d < 800; d++) if (seasonOf(cfg, d) === season) return d; throw new Error(season); };

/** Нэг өдрийг (06:00–20:30) 1 минутын дөрөвний нэг алхмаар «тоглуулж» NPC бүрийн дэлгэц дээрх байрлалыг бүртгэнэ */
function playDay(day: number, hook: (view: AnyView, min: number) => void): AnyView {
  const view = new mod.NpcView(cfg) as unknown as AnyView;
  view.walk = built.walk;
  const st = createInitialState(cfg, 1);
  st.time.day = day;
  const dt = (cfg.time.realSecondsPerGameHour / 60) / 4;       // 1/4 тоглоомын минут (бодит сек)
  for (let q = 6 * 60 * 4; q < 20.5 * 60 * 4; q++) {
    st.time.minute = Math.floor(q / 4);
    view.minuteFrac = (q % 4) / 4;
    view.updateOutdoor(st, dt, () => 0, -500, -500, 0);        // тоглогч хол: бүгд «холын» дүр
    hook(view, q / 4);
  }
  return view;
}
const posOf = (e: AnyView['entries'][number]): { x: number; z: number } | null => (e.far?.visible ? e.far.position : e.rig?.root.visible ? e.rig.root.position : null);

describe('NpcView: бодит өдөр', () => {
  const W = () => cfg.worldmap.sum3d.walk;

  it('хичээлийн өдөр: NPC хэзээ ч хана, барилга, хашаа нэвтлэхгүй; өглөө бүгд (гэрээс) гарна', () => {
    const wallHits: string[] = [], firstSeen = new Map<string, number>();
    playDay(dayOf('winter'), (view, min) => {
      for (const e of view.entries) {
        const p = posOf(e);
        if (!p) continue;
        if (!firstSeen.has(e.def.id)) firstSeen.set(e.def.id, min);
        // үүдний 1.4 м-д саадыг үл тооцно (гэр, үүд ханатай шүргэлцдэг)
        const nearDoor = view.anchors().some((a) => Math.hypot(a.x - p.x, a.z - p.z) < 1.4);
        if (!nearDoor && pushOut(built.walk, p.x, p.z, W().npcR - 0.1).hit) wallHits.push(`${e.def.id}@${(min / 60).toFixed(2)} ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
      }
    });
    expect([...new Set(wallHits)].slice(0, 12)).toEqual([]);
    // өглөөний 11:00 гэхэд (хичээлийн өдөр) сурагч бүр, гол ажилчид гэрээсээ гарч харагдсан
    for (const id of ['khuslen', 'erdenebat', 'tenuun', 'uyanga', 'michidmaa', 'zolboo', 'ganbaatar', 'tsetsegmaa', 'batsukh', 'baatarsukh', 'oyuntsetseg']) {
      const t = firstSeen.get(id);
      expect(t, `${id}: өглөө гэрээсээ гараагүй`).toBeDefined();
      expect(t!, `${id}`).toBeLessThan(11 * 60);
    }
  });

  it('гэртээ үүдэндээ л алга болно (өөр газар ойртоод алга болохгүй), гарахдаа үүднээс', () => {
    const vanish: string[] = [], appear: string[] = [];
    const prev = new Map<string, { x: number; z: number } | null>();
    playDay(dayOf('winter'), (view) => {
      const doors = view.anchors();
      for (const e of view.entries) {
        const p = posOf(e), q = prev.get(e.def.id) ?? null;
        // «байшин, гэр» барилга бүрийн үүд хүртэл 1.5 м-д л алга болно (door:* зогсоол үүдээс 1.4 м хажууд)/гарч ирнэ (гадаа тогтсон цэг — at:* — үл хамаарна)
        const nearDoor = (r: { x: number; z: number }): boolean => doors.some((a) => Math.hypot(a.x - r.x, a.z - r.z) < 1.5);
        if (q && !p && !nearDoor(q) && !HOMELESS.includes(e.def.id)) vanish.push(`${e.def.id} алга болсон ${q.x.toFixed(1)},${q.z.toFixed(1)}`);
        if (!q && p && !HOMELESS.includes(e.def.id) && !nearDoor(p) && firstAppear(e.def.id)) appear.push(`${e.def.id} гарч ирсэн ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
        prev.set(e.def.id, p ? { x: p.x, z: p.z } : null);
      }
    });
    expect(vanish).toEqual([]);
    expect(appear.slice(0, 5)).toEqual([]);
  });

  it('getHomeState: гэртээ байвал occupied, гадуур явбал empty; сурагчдын дотуур байр', () => {
    const view = new mod.NpcView(cfg) as unknown as AnyView;
    view.walk = built.walk;
    const st = createInitialState(cfg, 1);
    st.time.day = dayOf('winter');
    st.time.minute = 6 * 60 + 10;
    view.updateOutdoor(st, 0.05, () => 0, -500, -500, 0);
    expect(mod.getHomeState('dorm')).toBe('occupied');          // 6 сурагч дотуур байранд
    expect(mod.getHomeState('plot_rel_1')).toBe('occupied');    // Сарангэрэл (хамаатны айл)
    expect(mod.getHomeState('plot_sale_1')).toBe('empty');      // зарагдах хашаа — хэн ч амьдардаггүй
    expect(mod.getHomeState('yard:99999')).toBe('empty');
    expect(mod.getHomeState('байхгүй')).toBe('empty');
    st.time.minute = 10 * 60;                                   // сурагчид сургуульд
    view.updateOutdoor(st, 0.05, () => 0, -500, -500, 0);
    expect(mod.getHomeState('dorm')).toBe('empty');
  });
});

/** NPC бүрийн ГЭРЭЭС анх гарч ирэх нь л шалгагдана (дараа нь ажлаас/цайнаас гарч ирэх нь үүд биш байж болно) */
const seen = new Set<string>();
function firstAppear(id: string): boolean { if (seen.has(id)) return false; seen.add(id); return true; }
