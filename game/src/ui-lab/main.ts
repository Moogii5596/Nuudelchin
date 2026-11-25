/**
 * T-27 UI лаб: утасны HUD 2-ыг (input/hud2/ — тоглоомын утасны горимтой НЭГ код) жинхэнэ тайз + PlayerController дээр туршина (game/ui-lab.html).
 * Тоглоомын үндсэн горимоос тусдаа оролт: хадгалалтгүй, эхлэлийн цэсгүй. Тоглоомын код зөвхөн импортлогдоно
 * (input/touch.ts, main.ts, render/ui/** өөрчлөгдөөгүй).
 *
 * URL: ?screen=calm|near|wheel|riding — эхлэлийн байдал (data/hud2.json → scenes)
 *      ?shot=<screen> — зураг авах горим (симуляц зогсоно, бэлэн болмогц <html data-ready="1">; tools/ui-lab-shots.mjs)
 *      ?lang=mn|en · ?stats — FPS, draw call
 */
import labJson from '../../../data/hud2.json';
import indexHtml from '../../index.html?raw';
import { loadConfig } from '../sim/config';
import { createInitialState, type GameState } from '../sim/state';
import { Sim } from '../sim/sim';
import type { CommandResult } from '../sim/commands';
import { formatTime, realSecondsPerMinute } from '../sim/clock';
import { averageBiomass } from '../sim/systems/pasture';
import { ridingHorse } from '../sim/systems/herder';
import { addVehicle, fleetOf } from '../sim/systems/travel';
import { nearLotSlot } from '../sim/systems/sumtown';
import { nearTownDoor } from '../sim/systems/town';
import { nearTeahouse } from '../sim/systems/helpers';
import { nearTrader } from '../sim/systems/trader';
import { addNote } from '../sim/systems/journal';
import { GameView } from '../render/scene';
import { Panels } from '../render/ui/panels';
import { PlayerController, type ActionKind } from '../input/controller';
import { SkipRun, skipGoal, type SkipTarget } from '../input/skip';
import { t } from '../i18n/i18n';
import { tm } from '../i18n/msg';
import type { Msg } from '../sim/msg';
import { canLockLandscape, landscapeFullscreen } from '../pwa';
import { createHud2 } from '../input/hud2/bind';

type SceneName = keyof typeof labJson.scenes;
const SCENES = Object.keys(labJson.scenes) as SceneName[];

/** Тоглоомын цонх (📦 агуулах, ачаа, 📜 тэмдэглэл)-ны загварыг index.html-ээс авна — CSS давхардуулахгүй */
function adoptGameStyles(): void {
  const css = /<style>([\s\S]*?)<\/style>/.exec(indexHtml)?.[1] ?? '';
  const el = document.createElement('style');
  el.textContent = css;
  document.head.insertBefore(el, document.head.querySelector('style'));
}

function toast(message: string | Msg, kind: '' | 'good' | 'bad' = ''): void {
  const msg = tm(message);
  if (!msg) return;
  const box = document.getElementById('toasts')!;
  const d = document.createElement('div');
  d.className = 'toast ' + kind;
  d.textContent = msg.replace(/<[^>]+>/g, '');
  box.appendChild(d);
  while (box.childElementCount > 2) box.firstElementChild?.remove();
  setTimeout(() => d.remove(), kind === 'bad' ? 4500 : 3000);
}

/** Эхлэлийн байдал: бууц, гэр, уяан дээрх морь, тэрэг, газарт сүү */
function applyScene(cfg: ReturnType<typeof loadConfig>, state: GameState, name: SceneName): void {
  const sc = labJson.scenes[name];
  state.home = 'ger';
  state.time.minute = sc.minute;
  state.wolves.peaceful = true;
  addVehicle(cfg, state, 'horseCart');
  Object.assign(fleetOf(state, 'horseCart')!, { place: 'camp', x: sc.cart.x, z: sc.cart.z, heading: sc.cart.heading });
  for (const m of sc.milk) state.items.push({ id: state.nextId++, product: 'milk', amount: m.amount, x: m.x, z: m.z, age: 0 });
  const p = state.player;
  Object.assign(p, { x: sc.player.x, z: sc.player.z, heading: sc.player.heading, mounted: sc.player.mounted, place: 'camp', away: false });
  const horse = ridingHorse(state);
  if (horse) Object.assign(horse, { x: sc.horse.x, z: sc.horse.z, tx: sc.horse.x, tz: sc.horse.z, hx: sc.horse.x, hz: sc.horse.z });
}

function start(): void {
  adoptGameStyles();
  document.body.classList.add('touch');
  const cfg = loadConfig();
  const qs = new URLSearchParams(location.search);
  const shotParam = qs.get('shot');
  const pick = (v: string | null): SceneName | null => (SCENES as string[]).includes(v ?? '') ? (v as SceneName) : null;
  if (shotParam !== null && !pick(shotParam)) throw new Error(`?shot: ${SCENES.join(' | ')}`);
  const shot = pick(shotParam);
  const sceneName = shot ?? pick(qs.get('screen')) ?? 'calm';
  const scene = labJson.scenes[sceneName];
  const state = createInitialState(cfg, 20261117);
  applyScene(cfg, state, sceneName);
  const sim = new Sim(cfg, state);
  const view = new GameView(document.getElementById('app')!, cfg, state);
  Object.assign(view.cam, scene.cam);
  view.cam.touchRotate = (x) => x >= window.innerWidth / 2;

  const floats = document.getElementById('floats')!;
  const floatText = (text: string): void => {
    if (!text) return;
    const p = state.player;
    const at = view.screenPoint(p.x, view.heightAt(p.x, p.z) + (p.mounted ? 3.2 : 2.3), p.z);
    const d = document.createElement('div');
    d.className = 'floatnote';
    d.textContent = text.replace(/<[^>]+>/g, '');
    d.style.left = `${Math.round(at.x)}px`;
    d.style.top = `${Math.round(at.y) - floats.childElementCount * 18}px`;
    floats.appendChild(d);
    setTimeout(() => d.remove(), 1000);
  };

  let skip: SkipRun | null = null;
  let speedIdx = 0;
  let acc = 0;
  const panels: Panels = new Panels(cfg, state, { dispatch: (cmd) => sim.command(cmd), toast, toggleZones: () => view.zones.toggle() });
  const feedback = (kind: ActionKind, res: CommandResult): void => {
    if (res.ok && (kind === 'shout' || kind === 'scare' || kind === 'call')) view.characters.say(kind);
    if (res.ok && res.msg) floatText(tm(res.msg));
    else if (!res.ok && res.msg) toast(res.msg, 'bad');
    h2.refresh();
  };
  const controller = new PlayerController(cfg, {
    dispatch: (cmd) => sim.command(cmd),
    state: () => state,
    blocked: () => panels.isOpen || !!skip || !!shot,
    onAction: feedback,
    onSpeed: (i) => { speedIdx = i; },
    onToggle: (what) => {
      if (what === 'storage') panels.open('storage');
      else if (what === 'trade') panels.open(state.player.place === 'sum' ? (nearTrader(cfg, state) ? 'trader' : nearLotSlot(cfg, state) ? 'lot' : nearTownDoor(cfg, state) ? 'town' : nearTeahouse(cfg, state) ? 'teahouse' : 'shop') : 'cargo');
      else if (what === 'helpers') panels.open('helpers');
      else if (what === 'dogs') panels.open('dogs');
      else if (what === 'camps') panels.open('camps');
      else if (what === 'log') panels.openLog();
      else if (what === 'zones') toast(view.zones.toggle() ? t('ui.protection_zones_are_visible') : t('ui.protection_zones_hidden'), 'good');
    },
  });
  controller.walk = view.sum.playerWalk;
  const clockText = (minute: number): string => formatTime({ day: state.time.day, minute });
  const endSkip = (): void => {
    const s = skip;
    if (!s) return;
    skip = null;
    s.dispose();
    acc = 0;
    h2.refresh();
    if (s.stop === 'done') toast(t(s.target === 'evening' ? 'ui.skip_done_evening' : 'ui.skip_done_morning', { x: clockText(s.goal.minute) }), 'good');
    else if (s.stop === 'user') toast(t('ui.skip_stop_user'), '');
    else if (s.stop) toast({ wolf: t('ui.skip_stop_wolf'), zone: t('ui.skip_stop_zone'), driver: t('ui.skip_stop_driver'), helper: t('ui.skip_stop_helper'), arrived: t('ui.skip_stop_arrived') }[s.stop], 'good');
  };
  const startSkip = (target: SkipTarget): void => {
    if (skip || panels.isOpen) return;
    if (!skipGoal(cfg, state.time, target)) { toast(t('ui.skip_too_late'), ''); return; }
    skip = new SkipRun(sim, target);
    acc = 0;
    if (skip.stop) endSkip();
  };

  let landscaped = false;
  let grassAvg = averageBiomass(state.grass, 120), grassT = 0;
  const h2 = createHud2({
    cfg, state, controller,
    act: (kind, cmd) => feedback(kind, sim.command(cmd)),
    blocked: () => panels.isOpen || !!skip,
    hidden: () => panels.isOpen,
    speedIdx: () => speedIdx,
    setSpeed: (i) => { speedIdx = i; },
    skip: { start: startSkip, stop: () => skip?.cancel(), active: () => !!skip },
    project: (x, z, h) => view.screenPoint(x, view.heightAt(x, z) + h, z),
    grass: () => grassAvg,
    menuItems: [
      { code: 'KeyB', icon: 'box', label: t('ui.storage') },
      { code: 'KeyM', icon: 'camp', label: t('ui.move_camp') },
      { code: 'KeyJ', icon: 'people', label: t('ui.helpers_319') },
      { code: 'KeyK', icon: 'dog', label: t('ui.dogs') },
      { code: 'KeyZ', icon: 'zones', label: t('ui.zones') },
      { code: 'full', icon: 'full', label: t('ui.fullscreen') },
    ],
    scenes: SCENES,
    onScene: (name) => { const u = new URL(location.href); u.searchParams.set('screen', name); u.searchParams.delete('shot'); location.replace(u.toString()); },
    rotate: true,
  });
  const hud = h2.hud;
  if (scene.wheel) hud.setWheel(true);
  // Эхний товшилтоор хэвтээ + бүтэн дэлгэц (Android); iPhone-д «Нүүр дэлгэцэд нэмэх»
  if (!shot) window.addEventListener('pointerdown', () => {
    if (landscaped || !canLockLandscape) return;
    landscaped = true;
    void landscapeFullscreen();
  }, true);

  view.cam.onClick = (nx, ny, dbl) => {
    if (panels.isOpen || hud.wheelIsOpen) return;
    if (state.player.place === 'map') {
      const g = view.map.pick(nx, ny);
      if (g) {
        const r = sim.command({ type: 'mapGo', x: g.x, z: g.z, dest: g.dest });
        if (!r.ok && r.msg) toast(r.msg, 'bad');
      }
      return;
    }
    if (state.player.driving) return;
    if (view.spinWheel(nx, ny)) return;
    const g = view.pickGround(nx, ny);
    if (g) controller.moveTo(g.x, g.z, dbl);
  };

  sim.on((e) => {
    const note = (text: string, kind: '' | 'good' | 'bad'): void => { toast(text, kind); addNote(cfg, state, text, kind); };
    if (e.type === 'dayReport') toast(t('log.report_ready', { day: e.report.day }), '');
    else if (e.type === 'leftToMap') toast(t('ui.tap_where_to_go'), 'good');
    else if (e.type === 'arrived') toast(e.place === 'sum' ? t('ui.you_arrived_at_the') : t('ui.you_are_home'), 'good');
    else if (e.type === 'arriveCamp') panels.showArrive(e.campId);
    else if (e.type === 'traderArrive') note(t('trader.arrive', { kind: t('trader.kind.' + e.kind), until: formatTime({ day: state.time.day, minute: e.until }) }), 'good');
    else if (e.type === 'wolfKill') note(t('ui.a_wolf_caught_a', { x: t('species.' + e.species).toLowerCase() }), 'bad');
    else if (e.type === 'town') note(tm(e.msg), e.good ? 'good' : 'bad');
  });

  const secPerMinuteNow = (): number => realSecondsPerMinute(cfg.time, state.time.minute) / state.settings.difficulty.timeSpeed;
  const perf = document.getElementById('perf')!;
  const showPerf = qs.has('stats');
  perf.style.display = showPerf ? '' : 'none';
  let last = performance.now();
  let frames = 0;
  let fpsFrames = 0, fpsT = 0, fps = 0;
  const placeKey = (): string => state.player.place + (state.player.interior?.door ?? '');
  let previousPlace = placeKey();

  const frame = (now: number): void => {
    const rawDt = (now - last) / 1000;
    const dt = Math.min(rawDt, 0.1);
    last = now;
    const paused = panels.isOpen || hud.portrait || !!shot;
    if (skip && paused) skip.cancel();
    const fast = state.player.place === 'map' && !state.move && controller.isDown('ShiftLeft');
    // Actions дугуй нээлттэй үед тоглоом удааширна (wheel.speed = ¼): симуляц, малчны хөдөлгөөн, дүрслэл хамт
    const slow = h2.slow();
    const speed = skip ? cfg.time.skip.speed : (cfg.time.speeds[speedIdx] ?? 1) * (fast ? cfg.time.mapFastForward : 1) * slow;
    if (!paused) {
      if (!skip) controller.update(dt * slow, state, view.cam.forward());
      acc += dt * speed;
      const maxSteps = skip ? cfg.time.skip.maxStepsPerFrame : 60;
      let steps = 0;
      while (acc >= secPerMinuteNow() && steps < maxSteps && !panels.isOpen) {
        acc -= secPerMinuteNow();
        view.snapshot(state);
        steps++;
        if (!skip) sim.step();
        else if (!skip.step()) break;
      }
      if (steps >= maxSteps) acc = 0;
    }
    if (skip?.stop) endSkip();
    if (placeKey() !== previousPlace) {
      previousPlace = placeKey();
      const fade = document.getElementById('sceneFade')!;
      fade.classList.remove('play');
      void fade.offsetWidth;
      fade.classList.add('play');
    }
    const spm = secPerMinuteNow();
    view.frame(state, Math.min(1, acc / spm), paused && !shot ? 0 : dt * slow, paused ? 0 : spm / speed);
    grassT -= dt;
    if (grassT <= 0) {
      grassT = 1;
      grassAvg = averageBiomass(state.grass, 120);
      panels.refresh();
    }
    h2.frame(dt);
    fpsFrames++;
    fpsT += rawDt;
    if (fpsT >= 1) {
      fps = fpsFrames / fpsT;
      fpsFrames = 0;
      fpsT = 0;
      if (showPerf) perf.textContent = `${fps.toFixed(0)} FPS · draw ${view.drawCalls}`;
    }
    if (shot && ++frames === labJson.shotFrames) document.documentElement.dataset.ready = '1';
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  (window as unknown as { __lab: unknown }).__lab = { cfg, state, sim, view, hud, controller };
}

try {
  start();
} catch (err) {
  const el = document.getElementById('err')!;
  el.style.display = 'grid';
  el.textContent = err instanceof Error ? err.message : String(err);
  console.error(err);
}
