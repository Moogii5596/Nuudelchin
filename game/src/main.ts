/**
 * Эхлэл: тохиргоо ачаалж, симуляц ба дүрслэлийг холбоно.
 * Симуляц тогтмол алхамтай (1 алхам = 1 тоглоомын минут), дүрслэл секундэд ~60 удаа.
 */
import { loadConfig, SPECIES } from './sim/config';
import { createInitialState } from './sim/state';
import { Sim } from './sim/sim';
import { formatTime, realSecondsPerMinute } from './sim/clock';
import { GameView } from './render/scene';
import { t } from './i18n/i18n';

function fmtMoney(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + '₮';
}

function start(): void {
  const cfg = loadConfig();
  const seed = Number(new URLSearchParams(location.search).get('seed')) || 20261113;
  const state = createInitialState(cfg, seed);
  const sim = new Sim(cfg, state);
  const view = new GameView(document.getElementById('app')!, cfg, state);
  const hud = document.getElementById('hud')!;
  document.title = t('app.title');

  let speedIdx = 0;
  window.addEventListener('keydown', (e) => {
    if (e.key === '1' || e.key === '2' || e.key === '3') speedIdx = Number(e.key) - 1;
  });

  const secPerMinute = realSecondsPerMinute(cfg.time);
  let acc = 0;
  let last = performance.now();

  const frame = (now: number): void => {
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    const speed = cfg.time.speeds[speedIdx] ?? 1;
    acc += dt * speed;
    while (acc >= secPerMinute) {
      sim.step();
      acc -= secPerMinute;
    }
    view.syncAnimals(state);
    view.render();

    const counts = SPECIES.map((sp) => {
      const n = state.animals.filter((a) => a.species === sp).length;
      return n ? `${t('species.' + sp)} ${n}` : '';
    }).filter(Boolean);
    hud.innerHTML =
      `<b>${t('hud.day', { day: state.time.day })}</b> · ${formatTime(state.time)}<br>` +
      `${t('hud.money')}: <b>${fmtMoney(state.money)}</b><br>` +
      `${t('hud.animals')}: ${counts.join(' · ')}<br>` +
      `${t('hud.speed')}: ${speed}× <small>(1/2/3)</small><br><small>${t('hud.milestone')}</small>`;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

try {
  start();
} catch (err) {
  const el = document.getElementById('err')!;
  el.style.display = 'grid';
  el.textContent = err instanceof Error ? err.message : String(err);
  console.error(err);
}
