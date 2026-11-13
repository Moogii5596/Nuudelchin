/**
 * Эхлэл: тохиргоо ачаалж, симуляц, дүрслэл, удирдлагыг холбоно.
 * Симуляц тогтмол алхамтай (1 алхам = 1 тоглоомын минут), дүрслэл кадр бүр (~60 FPS)
 * хоёр алхмын хооронд зөөлрүүлнэ (architecture.md §3.2). Цонх нээлттэй үед тоглоом зогсоно.
 *
 * URL параметр (туршилт): ?seed=123 · ?herd=300 (нийт малын тоо) · ?speed=3 (1/2/3) · ?heatmap=1 · ?report=0 (өдрийн тайлангүй)
 */
import { loadConfig, SPECIES } from './sim/config';
import { createInitialState, type TripState } from './sim/state';
import { Sim } from './sim/sim';
import { formatTime, realSecondsPerMinute } from './sim/clock';
import { averageBiomass } from './sim/systems/pasture';
import * as storage from './sim/systems/storage';
import { ridingHorse } from './sim/systems/herder';
import { GameView } from './render/scene';
import { Panels } from './render/ui/panels';
import { PRODUCT_EMOJI, fmtMinutes, fmtMoney, fmtNum } from './render/ui/names';
import { PlayerController } from './input/controller';
import { t } from './i18n/i18n';

function toast(msg: string, kind: '' | 'good' | 'bad' = ''): void {
  const box = document.getElementById('toasts')!;
  const d = document.createElement('div');
  d.className = 'toast ' + kind;
  d.textContent = msg;
  box.appendChild(d);
  while (box.children.length > 4) box.firstChild?.remove();
  setTimeout(() => d.remove(), kind === 'bad' ? 5000 : 3500);
}

function start(): void {
  const cfg = loadConfig();
  const qs = new URLSearchParams(location.search);
  const seed = Number(qs.get('seed')) || 20261113;
  const state = createInitialState(cfg, seed);
  const sim = new Sim(cfg, state);
  const herd = Number(qs.get('herd')) || 0;
  if (herd > state.animals.length) sim.command({ type: 'debugAddAnimals', n: herd - state.animals.length });

  const view = new GameView(document.getElementById('app')!, cfg, state);
  if (qs.get('heatmap') === '1') view.toggleHeatmap(state);
  const hud = document.getElementById('hud')!;
  const perf = document.getElementById('perf')!;
  const help = document.getElementById('help')!;
  const prompt = document.getElementById('prompt')!;
  help.innerHTML = `<h3>${t('help.title')}</h3>${t('help.body')}`;
  document.title = t('app.title');

  const panels = new Panels(cfg, state, { dispatch: (cmd) => sim.command(cmd), toast });
  const showReports = qs.get('report') !== '0';
  sim.on((e) => {
    if (e.type === 'dayReport' && showReports) panels.showReport(e.report);
  });

  let speedIdx = Math.max(0, Math.min(cfg.time.speeds.length - 1, (Number(qs.get('speed')) || 1) - 1));
  const controller = new PlayerController(cfg, {
    dispatch: (cmd) => sim.command(cmd),
    state: () => state,
    blocked: () => panels.isOpen,
    onAction: (kind, res) => {
      if (res.ok && (kind === 'shout' || kind === 'scare' || kind === 'call')) view.characters.say(kind);
      if (res.msg) toast(res.msg, res.ok ? 'good' : 'bad');
      else if (kind === 'deposit' && res.ok) toast('📦 Агуулахад хийлээ', 'good');
    },
    onSpeed: (i) => {
      speedIdx = i;
    },
    onToggle: (what) => {
      if (what === 'heatmap') view.toggleHeatmap(state);
      else if (what === 'storage') panels.open('storage');
      else if (what === 'trip') panels.open('trip');
      else if (what === 'cheatHerd') {
        const p = state.player;
        const r = sim.command({ type: 'debugAddAnimals', n: 50, x: p.x + Math.sin(p.heading) * 20, z: p.z + Math.cos(p.heading) * 20 });
        if (r.msg) toast(r.msg, 'good');
      } else help.style.display = help.style.display === 'block' ? 'none' : 'block';
    },
  });
  view.cam.onClick = (nx, ny, dbl) => {
    if (panels.isOpen) return;
    const g = view.pickGround(nx, ny);
    if (g) controller.moveTo(g.x, g.z, dbl);
  };
  view.renderer.domElement.focus();

  const secPerMinute = realSecondsPerMinute(cfg.time);
  let acc = 0;
  let last = performance.now();
  let hudT = 0;
  let grassAvg = averageBiomass(state.grass, 120);
  let grassT = 0;
  let lastTrip: TripState | null = null;
  // FPS хэмжилт
  let fpsFrames = 0, fpsT = 0, fps = 0, worstMs = 0, worstShown = 0;

  /** Аялал дуусахад үр дүнг мэдэгдэнэ */
  const watchTrip = (): void => {
    if (state.trip) lastTrip = state.trip;
    else if (lastTrip) {
      const tr = lastTrip;
      lastTrip = null;
      const missed = tr.buy.length - tr.bought.length;
      toast(`🏘 Сумын төвөөс ирлээ: орлого +${fmtMoney(tr.income)}${tr.bought.length ? ` · авсан ${tr.bought.length}` : ''}`, 'good');
      if (missed > 0) toast(`Мөнгө хүрэлцээгүй тул ${missed} зүйл авч чадсангүй`, 'bad');
    }
  };

  const updatePrompt = (): void => {
    const p = state.player;
    let html = '';
    if (!p.away && !panels.isOpen) {
      const home = cfg.camps.home;
      const dHome = Math.hypot(p.x - home.x, p.z - home.z);
      const carried = p.carry.reduce((s, c) => s + c.amount, 0);
      const nearItems = state.items.filter((it) => Math.hypot(it.x - p.x, it.z - p.z) <= cfg.products.pickupRadius * 1.6).length;
      const horse = ridingHorse(state);
      if (carried >= cfg.products.carryUnits - 1e-9 && dHome > home.storageRadius) html = 'Гар дүүрсэн — майхны дэргэдэх агуулах руу авчир';
      else if (nearItems) html = `<kbd>E</kbd> түүх (${nearItems})`;
      else if (dHome <= home.storageRadius * 2) html = `<kbd>B</kbd> агуулах, боловсруулах · <kbd>T</kbd> сумын төв рүү явах`;
      else if (!p.mounted && horse && Math.hypot(horse.x - p.x, horse.z - p.z) <= cfg.player.mountRange) html = '<kbd>F</kbd> морь унах';
    }
    prompt.innerHTML = html;
    prompt.style.display = html ? 'block' : 'none';
  };

  const frame = (now: number): void => {
    const rawDt = (now - last) / 1000;
    const dt = Math.min(rawDt, 0.1);
    last = now;
    worstMs = Math.max(worstMs, rawDt * 1000);
    const paused = panels.isOpen;

    const speed = cfg.time.speeds[speedIdx] ?? 1;
    if (!paused) {
      controller.update(dt, state, view.cam.forward());
      acc += dt * speed;
      let steps = 0;
      while (acc >= secPerMinute && steps < 60 && !panels.isOpen) {
        view.snapshot(state);
        sim.step();
        acc -= secPerMinute;
        steps++;
      }
      if (steps >= 60) acc = 0;
      watchTrip();
    }
    view.frame(state, Math.min(1, acc / secPerMinute), paused ? 0 : dt, paused ? 0 : secPerMinute / speed);

    fpsFrames++;
    fpsT += rawDt;
    if (fpsT >= 1) {
      fps = fpsFrames / fpsT;
      fpsFrames = 0;
      fpsT = 0;
      worstShown = worstMs;
      worstMs = 0;
    }
    grassT -= dt;
    if (grassT <= 0) {
      grassT = 1;
      grassAvg = averageBiomass(state.grass, 120);
      panels.refresh();
    }
    hudT -= dt;
    if (hudT <= 0) {
      hudT = 0.25;
      updatePrompt();
      const counts = SPECIES.map((sp) => {
        const n = state.animals.filter((a) => a.species === sp && !a.riding).length;
        return n ? `${t('species.' + sp)} ${n}` : '';
      }).filter(Boolean);
      const p = state.player;
      const degrade = state.camps[state.campId]?.degrade ?? 0;
      const carried = p.carry.reduce((s, c) => s + c.amount, 0);
      const carryTxt = p.carry.length ? p.carry.map((c) => `${PRODUCT_EMOJI[c.product]}${fmtNum(c.amount)}`).join(' ') : '—';
      const onGround = state.items.length;
      let status = (p.mounted ? t('hud.mounted') : t('hud.onFoot')) + ' · ' + (p.holdingUurga ? t('hud.uurga') : t('hud.noUurga'));
      if (state.trip) {
        const tr = state.trip;
        status = `${tr.vehicle === 'truck' ? '🚚' : '🐴'} ${tr.arrived ? 'Сумын төвөөс буцаж байна' : 'Сумын төв рүү явж байна'} · ${fmtMinutes(tr.total - tr.elapsed)}`;
      } else if (state.move) status = `Нүүж байна · ${fmtMinutes(state.move.remaining)}`;
      hud.innerHTML =
        `<b>${t('hud.day', { day: state.time.day })}</b> · ${formatTime(state.time)}${paused ? ' · ⏸' : ''}<br>` +
        `${t('hud.money')}: <b>${fmtMoney(state.money)}</b><br>` +
        `${t('hud.animals')}: ${counts.join(' · ')}<br>` +
        `📦 ${fmtNum(storage.used(state))}/${storage.capacity(cfg, state)} · ✋ ${carryTxt} (${fmtNum(carried)}/${cfg.products.carryUnits})${onGround ? ` · газарт ${onGround}` : ''}<br>` +
        `${t('hud.camp')}: ${t('camp.' + state.campId)} · ${t('hud.grass')} ${Math.round(grassAvg * 100)}% · ${t('hud.degrade')} ${Math.round(degrade * 100)}%<br>` +
        `${status} · ${t('hud.speed')}: ${speed}× <small>(1/2/3)</small><br>` +
        `<small>${t('hud.milestone')} · ${t('help.hint')}${view.heatmap ? ' · G: heatmap' : ''}</small>`;
      perf.textContent = `${fps.toFixed(0)} FPS · max ${worstShown.toFixed(0)} ms · ${view.drawCalls} draw · ${state.animals.length} мал`;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // Туршилт, алдаа олоход (хөтчийн console)
  (window as unknown as { __game: unknown }).__game = { cfg, state, sim, view, panels, get fps() { return fps; } };
}

try {
  start();
} catch (err) {
  const el = document.getElementById('err')!;
  el.style.display = 'grid';
  el.textContent = err instanceof Error ? err.message : String(err);
  console.error(err);
}
