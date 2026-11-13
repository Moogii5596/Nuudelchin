/**
 * Эхлэл: тохиргоо ачаалж, симуляц, дүрслэл, удирдлагыг холбоно.
 * Симуляц тогтмол алхамтай (1 алхам = 1 тоглоомын минут), дүрслэл кадр бүр (~60 FPS)
 * хоёр алхмын хооронд зөөлрүүлнэ (architecture.md §3.2).
 *
 * URL параметр (туршилт): ?seed=123 · ?herd=300 (нийт малын тоо) · ?speed=3 (1/2/3) · ?heatmap=1
 */
import { loadConfig, SPECIES } from './sim/config';
import { createInitialState } from './sim/state';
import { Sim } from './sim/sim';
import { formatTime, realSecondsPerMinute } from './sim/clock';
import { averageBiomass } from './sim/systems/pasture';
import { GameView } from './render/scene';
import { PlayerController } from './input/controller';
import { t } from './i18n/i18n';

function fmtMoney(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + '₮';
}

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
  help.innerHTML = `<h3>${t('help.title')}</h3>${t('help.body')}`;
  document.title = t('app.title');

  let speedIdx = Math.max(0, Math.min(cfg.time.speeds.length - 1, (Number(qs.get('speed')) || 1) - 1));
  const controller = new PlayerController(cfg, {
    dispatch: (cmd) => sim.command(cmd),
    onAction: (kind, res) => {
      if (res.ok && kind !== 'mount') view.characters.say(kind);
      if (res.msg) toast(res.msg, res.ok ? 'good' : 'bad');
    },
    onSpeed: (i) => {
      speedIdx = i;
    },
    onToggle: (what) => {
      if (what === 'heatmap') view.toggleHeatmap(state);
      else if (what === 'cheatHerd') {
        const p = state.player;
        const r = sim.command({ type: 'debugAddAnimals', n: 50, x: p.x + Math.sin(p.heading) * 20, z: p.z + Math.cos(p.heading) * 20 });
        if (r.msg) toast(r.msg, 'good');
      } else help.style.display = help.style.display === 'block' ? 'none' : 'block';
    },
  });
  view.cam.onClick = (nx, ny, dbl) => {
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
  // FPS хэмжилт
  let fpsFrames = 0, fpsT = 0, fps = 0, worstMs = 0, worstShown = 0;

  const frame = (now: number): void => {
    const rawDt = (now - last) / 1000;
    const dt = Math.min(rawDt, 0.1);
    last = now;
    worstMs = Math.max(worstMs, rawDt * 1000);

    controller.update(dt, state, view.cam.forward());
    const speed = cfg.time.speeds[speedIdx] ?? 1;
    acc += dt * speed;
    let steps = 0;
    while (acc >= secPerMinute && steps < 60) {
      view.snapshot(state);
      sim.step();
      acc -= secPerMinute;
      steps++;
    }
    if (steps >= 60) acc = 0;
    view.frame(state, Math.min(1, acc / secPerMinute), dt, secPerMinute / speed);

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
    }
    hudT -= dt;
    if (hudT <= 0) {
      hudT = 0.25;
      const counts = SPECIES.map((sp) => {
        const n = state.animals.filter((a) => a.species === sp && !a.riding).length;
        return n ? `${t('species.' + sp)} ${n}` : '';
      }).filter(Boolean);
      const p = state.player;
      const degrade = state.camps[state.campId]?.degrade ?? 0;
      hud.innerHTML =
        `<b>${t('hud.day', { day: state.time.day })}</b> · ${formatTime(state.time)}<br>` +
        `${t('hud.money')}: <b>${fmtMoney(state.money)}</b><br>` +
        `${t('hud.animals')}: ${counts.join(' · ')}<br>` +
        `${t('hud.camp')}: ${t('camp.' + state.campId)} · ${t('hud.grass')} ${Math.round(grassAvg * 100)}% · ${t('hud.degrade')} ${Math.round(degrade * 100)}%<br>` +
        `${p.away ? t('hud.away') : p.mounted ? t('hud.mounted') : t('hud.onFoot')} · ${t('hud.speed')}: ${speed}× <small>(1/2/3)</small><br>` +
        `<small>${t('hud.milestone')} · ${t('help.hint')}${view.heatmap ? ' · G: heatmap' : ''}</small>`;
      perf.textContent = `${fps.toFixed(0)} FPS · max ${worstShown.toFixed(0)} ms · ${view.drawCalls} draw · ${state.animals.length} мал`;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // Туршилт, алдаа олоход (хөтчийн console)
  (window as unknown as { __game: unknown }).__game = { cfg, state, sim, view, get fps() { return fps; } };
}

try {
  start();
} catch (err) {
  const el = document.getElementById('err')!;
  el.style.display = 'grid';
  el.textContent = err instanceof Error ? err.message : String(err);
  console.error(err);
}
