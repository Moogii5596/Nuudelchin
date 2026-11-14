/**
 * Эхлэл: тохиргоо ачаалж, симуляц, дүрслэл, удирдлагыг холбоно.
 * Симуляц тогтмол алхамтай (1 алхам = 1 тоглоомын минут), дүрслэл кадр бүр (~60 FPS)
 * хоёр алхмын хооронд зөөлрүүлнэ (architecture.md §3.2). Цонх нээлттэй үед тоглоом зогсоно.
 *
 * Утас (мэдрэгч дэлгэц) автоматаар танигдана: input/touch.ts, device.ts. ?mobile=1 — компьютер дээр утасны горим.
 *
 * URL параметр (туршилт): ?seed=123 · ?herd=300 (нийт малын тоо) · ?speed=3 (1/2/3) · ?heatmap=1 · ?report=0 (өдрийн тайлангүй)
 */
import { loadConfig, SPECIES } from './sim/config';
import { createInitialState } from './sim/state';
import { Sim } from './sim/sim';
import { formatTime, isNight, realSecondsPerMinute } from './sim/clock';
import { averageBiomass } from './sim/systems/pasture';
import * as storage from './sim/systems/storage';
import { ridingHorse } from './sim/systems/herder';
import { huntingWolves } from './sim/systems/wolves';
import { DOG_ORDER_NAME } from './sim/systems/dogs';
import { nearestVehicle, partySpeedKmPerMin } from './sim/systems/travel';
import { nearTeahouse } from './sim/systems/helpers';
import { campAccess, seasonProgress, yearOf } from './sim/systems/seasons';
import { GameView } from './render/scene';
import { Panels } from './render/ui/panels';
import { PRODUCT_EMOJI, SEASON_EMOJI, SEASON_NAME, fmtMinutes, fmtMoney, fmtNum } from './render/ui/names';
import { PlayerController } from './input/controller';
import { t } from './i18n/i18n';
import { TouchUI } from './input/touch';
import { registerServiceWorker } from './pwa';
import { isTouch, touchKeys, quality, QUALITIES, QUALITY_NAME, QUALITY_SPEC, setQuality } from './device';

function toast(msg: string, kind: '' | 'good' | 'bad' = ''): void {
  if (isTouch) msg = touchKeys(msg.replace('хулганаар', 'хуруугаар'));
  const box = document.getElementById('toasts')!;
  const d = document.createElement('div');
  d.className = 'toast ' + kind;
  d.textContent = msg;
  const pr = document.getElementById('prompt');
  if (pr && pr.parentElement === box) box.insertBefore(d, pr);   // утас: зааврын мөр хамгийн доор
  else box.appendChild(d);
  while (box.querySelectorAll('.toast').length > (isTouch ? 3 : 4)) box.querySelector('.toast')?.remove();
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
  help.innerHTML = `<h3>${t('help.title')}</h3>${isTouch ? t('help.touch') + '\n\n' + touchKeys(t('help.body')) : t('help.body')}`;
  document.title = t('app.title');

  const panels = new Panels(cfg, state, { dispatch: (cmd) => sim.command(cmd), toast, toggleZones: () => view.zones.toggle() });
  const showReports = qs.get('report') !== '0';
  let huntToastT = 0;
  sim.on((e) => {
    if (e.type === 'dayReport' && showReports) panels.showReport(e.report);
    else if (e.type === 'wolfHunt') {
      const now = performance.now();
      if (now - huntToastT > 4000) {
        huntToastT = now;
        const d = Math.round(Math.hypot(e.x - state.player.x, e.z - state.player.z));
        toast(`🐺 Чоно ${t('species.' + e.species).toLowerCase()} руу дайрлаа! ${d} м зайд — Q үргээх, морь унаж оч`, 'bad');
      }
    } else if (e.type === 'wolfKill') toast(`🐺 Чоно ${t('species.' + e.species).toLowerCase()} барьж авлаа`, 'bad');
    else if (e.type === 'wolfGiveUp') toast('Чоно ангаа орхилоо', 'good');
    else if (e.type === 'dogFight') toast(e.result === 'wolfKilled' ? `🐕 ${e.dog} чонотой барилдаж аллаа! Нохой шархадсан — хэд хоног амраана` : e.result === 'bothDied' ? `🐕 ${e.dog} чонотой барилдаж хоёулаа үхлээ` : `🐺 Хоёр чоно ${e.dog}-ыг барилаа`, e.result === 'wolfKilled' ? 'good' : 'bad');
    else if (e.type === 'wolfPups') toast(`🐺 Чонын үүрэнд ${e.n} гөлөг гарлаа — чоно өлсөж, илүү ан хийнэ`, 'bad');
    else if (e.type === 'wolfArrive') toast(`🐺 Өөр газраас ${e.n} чоно ирж үүрэнд суулаа`, 'bad');
    else if (e.type === 'leftToMap') toast('🗺 Газрын зураг — очих газраа хулганаар дарна (явж байхдаа сольж болно)', 'good');
    else if (e.type === 'arrived') toast(e.place === 'sum' ? '🏘 Сумын төвд ирлээ — Худалдаачны дэлгүүрт оч (шар тойрог, E)' : '🏠 Гэртээ ирлээ', 'good');
    else if (e.type === 'arriveCamp') panels.showArrive(e.campId);
    else if (e.type === 'season') {
      const msg: Record<string, string> = {
        summer: '☀️ Зун боллоо — голын бэл, энгэрийн сайхан бэлчээрт мал таргална',
        autumn: '🍂 Намар боллоо — өвс шарлаж байна. Өвлийн бууц (саравчтай уулын өвөр), боодол өвс бэлтгэ',
        winter: '❄️ Өвөл боллоо — цас орж эхэллээ. Саравчтай уулын өвөрт өвөлжиж, өвс тэжээлээ бэлд',
        spring: '🌱 Хавар боллоо — төлийн улирал. Уулын арын цас хайлж, доороос нь хадгалагдсан өвс гарч ирнэ',
      };
      toast(msg[e.season] ?? '', 'good');
    } else if (e.type === 'helperQuit') toast(e.reason === 'wage' ? `💸 Цалин хүрэлцээгүй — ${e.names.join(', ')} малаа аваад явлаа` : `${e.names.join(', ')} ажлаас гарлаа`, 'bad');
    else if (e.type === 'helperTrip') toast(`🚚 ${e.name} сумын төвөөс ирлээ: ${fmtMoney(e.income)} орлого`, 'good');
    else if (e.type === 'otorLoss') toast(`🐺 Отор дээр (${t('camp.' + e.campId)}) чоно ${t('species.' + e.species).toLowerCase()} барьлаа`, 'bad');
    else if (e.type === 'wolfRaid') toast(`🌙 Шөнө ${e.n > 1 ? e.n + ' чоно' : 'чоно'} хот руу дөхөж байна — хотоос гадуур хоносон мал аюултай`, 'bad');
    else if (e.type === 'hour' && e.hour === Math.ceil(Math.min(...Object.values(cfg.time.homeMinute)) / 60)) toast('🌇 Орой боллоо — мал хотондоо харьж байна', '');
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
      else if (what === 'trade') panels.open(state.player.place === 'sum' ? (nearTeahouse(cfg, state) ? 'teahouse' : 'shop') : 'cargo');
      else if (what === 'helpers') panels.open('helpers');
      else if (what === 'dogs') panels.open('dogs');
      else if (what === 'camps') panels.open('camps');
      else if (what === 'cheat') panels.open('cheat');
      else if (what === 'zones') toast(view.zones.toggle() ? '🛡 Хамгаалалтын бүс харагдаж байна' : 'Хамгаалалтын бүс нуулаа', 'good');
      else help.style.display = help.style.display === 'block' ? 'none' : 'block';
    },
  });
  // Утасны удирдлага (мэдрэгч дэлгэц)
  const touchUI = isTouch ? new TouchUI(cfg, controller, { speedIdx: () => speedIdx, speeds: cfg.time.speeds }) : null;
  let hudCompact = isTouch;
  if (isTouch) {
    if (new URLSearchParams(location.search).get('perf') !== '1') perf.style.display = 'none';
    document.getElementById('toasts')!.appendChild(prompt);
    hud.addEventListener('click', () => {
      hudCompact = !hudCompact;
      hudT = 0;
    });
    // Тусламжийн цонх: графикийн чанар, туршилтын цэс, хаах
    let q = quality;
    const helpBody = help.innerHTML;
    const renderHelp = (): void => {
      help.innerHTML = '<span class="hclose" data-h="close">✕</span>' + helpBody + `<p class="hbtns"><button class="btn" data-h="q">⚙ График: ${QUALITY_NAME[q]}</button> <button class="btn" data-h="cheat">🛠 Туршилтын цэс</button> <button class="btn gold" data-h="close">✕ Хаах</button></p>`;
    };
    renderHelp();
    help.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('[data-h]') as HTMLElement | null;
      if (!b) return;
      if (b.dataset.h === 'q') {
        q = QUALITIES[(QUALITIES.indexOf(q) + 1) % QUALITIES.length]!;
        setQuality(q);
        view.applyQuality(QUALITY_SPEC[q]);
        renderHelp();
        return;
      }
      help.style.display = 'none';
      if (b.dataset.h === 'cheat') controller.press('Backquote');
    });
  }
  view.cam.onClick = (nx, ny, dbl) => {
    if (panels.isOpen) return;
    if (state.player.place === 'map') {
      const g = view.map.pick(nx, ny);
      if (g) {
        const r = sim.command({ type: 'mapGo', x: g.x, z: g.z, dest: g.dest });
        if (!r.ok && r.msg) toast(r.msg, 'bad');
      }
      return;
    }
    if (state.player.driving) return;
    const g = view.pickGround(nx, ny);
    if (g) controller.moveTo(g.x, g.z, dbl);
  };
  view.renderer.domElement.focus();

  // Шөнө тоглоомын цаг хурдан өнгөрнө (M4.5)
  const secPerMinuteNow = (): number => realSecondsPerMinute(cfg.time, state.time.minute);
  let acc = 0;
  let last = performance.now();
  let hudT = 0;
  let grassAvg = averageBiomass(state.grass, 120);
  let grassT = 0;
  // FPS хэмжилт
  let fpsFrames = 0, fpsT = 0, fps = 0, worstMs = 0, worstShown = 0;

  const updatePrompt = (): void => {
    const p = state.player;
    let html = '';
    if (!panels.isOpen && p.place === 'map') html = 'Газрын зураг: очих газраа зүүн товчоор дарна · баруун товч — эргүүлэх · дунд товч — хазайлгах · дугуй — томруулах · <kbd>Shift</kbd> — цаг хурдасгах';
    else if (!panels.isOpen && p.driving) html = '<kbd>W</kbd><kbd>S</kbd> явах/тоормос · <kbd>A</kbd><kbd>D</kbd> эргэх · <kbd>V</kbd> буух' + (p.place === 'camp' && Math.hypot(p.x - cfg.camps.home.x, p.z - cfg.camps.home.z) < cfg.vehicles.road.loadRange ? ' · <kbd>T</kbd> ачих/буулгах' : '') + ' · захын хязгаар руу явбал эсвэл <kbd>Tab</kbd> — газрын зураг';
    else if (!panels.isOpen && p.place === 'sum') {
      const sh = cfg.worldmap.sum3d.shop;
      const nearV = nearestVehicle(cfg, state, cfg.vehicles.road.enterRange);
      const where = 'Худалдаачин — шар тойрог · Цайны газар (туслах хөлслөх) — цэнхэр тойрог';
      html = Math.hypot(p.x - sh.x, p.z - sh.z) <= sh.r ? '<kbd>E</kbd> Худалдаачин' : nearTeahouse(cfg, state) ? '<kbd>E</kbd> Цайны газар — туслах малчин хөлслөх' : nearV ? '<kbd>V</kbd> тэрэг/машиндаа суух' : p.mounted ? where + '. Буцахдаа <kbd>Tab</kbd> эсвэл захын хязгаар руу давхи' : where + ' · <kbd>Tab</kbd> газрын зураг';
    } else if (!p.away && !panels.isOpen) {
      const home = cfg.camps.home;
      const dHome = Math.hypot(p.x - home.x, p.z - home.z);
      const carried = p.carry.reduce((s, c) => s + c.amount, 0);
      const nearItems = state.items.filter((it) => Math.hypot(it.x - p.x, it.z - p.z) <= cfg.products.pickupRadius * 1.6).length;
      const horse = ridingHorse(state);
      if (carried >= cfg.products.carryUnits - 1e-9 && dHome > home.storageRadius) html = 'Гар дүүрсэн — майхны дэргэдэх агуулах руу авчир';
      else if (nearItems) html = `<kbd>E</kbd> түүх (${nearItems})`;
      else if (dHome <= home.storageRadius * 2) html = `<kbd>B</kbd> агуулах, боловсруулах · <kbd>T</kbd> сумын төвд зарах ачаа · <kbd>M</kbd> нүүх · <kbd>J</kbd> туслахууд · <kbd>Tab</kbd> газрын зураг`;
      else if (!p.mounted && nearestVehicle(cfg, state, cfg.vehicles.road.enterRange)) html = '<kbd>V</kbd> тэрэг/машиндаа суух';
      else if (!p.mounted && horse && Math.hypot(horse.x - p.x, horse.z - p.z) <= cfg.player.mountRange) html = '<kbd>F</kbd> морь унах';
      else if (p.mounted && Math.hypot(p.x, p.z) > cfg.player.worldRadius - 25) html = 'Цааш давхивал (эсвэл <kbd>Tab</kbd>) газрын зураг руу гарна (сумын төв, өөр бууц)';
    }
    if (isTouch && !panels.isOpen) {
      if (p.place === 'map') html = 'Очих газраа дарна · ☝️ эргүүлэх · ✌️ томруулах · <kbd>⏩</kbd> цаг хурдасгах';
      else if (p.driving) html = '🕹 дээш — явах, доош — тоормос, хажуу — эргэх · <kbd>🚚</kbd> буух · захын хязгаар руу явбал эсвэл <kbd>🗺</kbd> — газрын зураг';
      html = touchKeys(html);
    }
    prompt.innerHTML = html;
    prompt.style.display = html ? 'block' : 'none';
  };

  const frame = (now: number): void => {
    const rawDt = (now - last) / 1000;
    const dt = Math.min(rawDt, 0.1);
    last = now;
    worstMs = Math.max(worstMs, rawDt * 1000);
    const paused = panels.isOpen || !!touchUI?.paused;

    // Газрын зураг дээр Shift — цаг хурдасна (M4.6)
    const fast = state.player.place === 'map' && !state.move && (controller.isDown('ShiftLeft') || controller.isDown('ShiftRight'));
    const speed = (cfg.time.speeds[speedIdx] ?? 1) * (fast ? cfg.time.mapFastForward : 1);
    if (!paused) {
      controller.update(dt, state, view.cam.forward());
      acc += dt * speed;
      let steps = 0;
      while (acc >= secPerMinuteNow() && steps < 60 && !panels.isOpen) {
        acc -= secPerMinuteNow();
        view.snapshot(state);
        sim.step();
        steps++;
      }
      if (steps >= 60) acc = 0;
    }
    const spm = secPerMinuteNow();
    view.frame(state, Math.min(1, acc / spm), paused ? 0 : dt, paused ? 0 : spm / speed);

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
      const how = p.driving ? `${cfg.vehicles[p.driving].emoji} ${cfg.vehicles[p.driving].name}` : p.mounted ? '🐎 Морьтой' : '🚶 Явганаар';
      if (p.place === 'map' && !state.move) {
        const m = state.map;
        const d = Math.hypot(m.tx - m.x, m.tz - m.z);
        const where = m.dest ? (cfg.worldmap.locations[m.dest]?.kind === 'sum' ? 'Сумын төв' : t('camp.' + m.dest)) : 'зураг дээрх цэг';
        status = d > 0.01 ? `🗺 ${how} → ${where} · ${d.toFixed(1)} км · ~${fmtMinutes(Math.round(d / partySpeedKmPerMin(cfg, state)))}${p.drove.length ? ` · 🐑 ${p.drove.length} мал тууж явна` : ''}` : `🗺 ${how} · газрын зураг дээр зогсож байна`;
      } else if (p.place === 'sum') status = `🏘 Сумын төв · ${how}`;
      else if (p.driving) status = how;
      else if (state.move) status = `🏕 ${t('camp.' + state.move.to)} руу нүүж байна · ${fmtMinutes(state.move.remaining)}`;
      const hunts = huntingWolves(state);
      let alert = '';
      if (hunts.length) {
        const a = state.animals.find((x) => x.id === hunts[0]!.targetId);
        const d = a ? Math.round(Math.hypot(a.x - p.x, a.z - p.z)) : 0;
        alert = `<b style="color:#ff6b5a">⚠ Чоно дайрч байна${a ? `: ${t('species.' + a.species).toLowerCase()}, ${d} м` : ''} (Q)</b><br>`;
      }
      const dogsTxt = state.dogs.length
        ? `🐕 ${state.dogs.map((d) => `${d.name}: ${d.mode === 'chase' ? 'чоно хөөж байна' : DOG_ORDER_NAME[d.order].toLowerCase()}`).join(' · ')} <small>(K)</small><br>`
        : '';
      const hs = state.helpers;
      const helpersTxt = hs.list.length
        ? `👥 Туслах ${hs.list.length}${hs.otor.length ? ` · 🏕 отор ${hs.otor.length}` : ''}${hs.list.some((h) => h.trip) ? ' · 🚚 замд' : ''} <small>(J)</small><br>`
        : '';
      const sp = seasonProgress(cfg, state.time.day);
      const cs = state.camps[state.campId];
      const snowTxt = cs && cs.snow >= 0.5 ? ` · ❄ ${Math.round(cs.snow)} см (идэх ${Math.round(campAccess(cfg, cs.snow) * 100)}%)` : '';
      const hayTxt = cs && (cs.hay > 0 || sp.season === 'winter' || sp.season === 'autumn') ? ` · 🌾 ${fmtNum(Math.round((cs.hay ?? 0) * 10) / 10)}` : '';
      const head =
        `<b>${t('hud.day', { day: state.time.day })}</b> · ${isNight(state.time, cfg.time) ? '🌙' : '☀️'} ${formatTime(state.time)}${paused ? ' · ⏸' : ''}<br>`;
      const full =
        head +
        `${SEASON_EMOJI[sp.season]} ${SEASON_NAME[sp.season]} ${sp.dayOf}/${sp.days} · ${yearOf(cfg, state.time.day)}-р жил${snowTxt}${hayTxt}<br>` +
        `${t('hud.money')}: <b>${fmtMoney(state.money)}</b><br>` +
        `${t('hud.animals')}: ${counts.join(' · ')}<br>` +
        `📦 ${fmtNum(storage.used(state))}/${storage.capacity(cfg, state)} · ✋ ${carryTxt} (${fmtNum(carried)}/${cfg.products.carryUnits})${onGround ? ` · газарт ${onGround}` : ''}<br>` +
        `${t('hud.camp')}: ${t('camp.' + state.campId)} · ${t('hud.grass')} ${Math.round(grassAvg * 100)}% · ${t('hud.degrade')} ${Math.round(degrade * 100)}%<br>` +
        `${status} · ${t('hud.speed')}: ${speed}×${fast ? ' ⏩' : ''} <small>(1/2/3)</small><br>` +
        dogsTxt +
        helpersTxt +
        alert +
        `<small>${t('hud.milestone')} · ${t('help.hint')}${view.heatmap ? ' · G: heatmap' : ''}${view.zones.visible ? ' · Z: бүс' : ''}${state.wolves.peaceful ? ' · чоно унтраасан' : ''}</small>`;
      // Утсанд HUD хураангуй — дарвал бүтэн харагдана
      hud.innerHTML = hudCompact
        ? touchKeys(head) +
          `💰 <b>${fmtMoney(state.money)}</b> · 🐑 ${state.animals.filter((a) => !a.riding).length} · ✋ ${fmtNum(carried)}/${cfg.products.carryUnits}<br>` +
          `${touchKeys(status)}<br>` +
          alert +
          `<small>▾ дэлгэрэнгүй</small>`
        : touchKeys(full) + (isTouch ? '<br><small>▴ хураах</small>' : '');
      touchUI?.update(state, panels.isOpen || help.style.display === 'block');
      perf.textContent = `${fps.toFixed(0)} FPS · max ${worstShown.toFixed(0)} ms · ${view.drawCalls} draw · ${state.animals.length} мал`;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // Туршилт, алдаа олоход (хөтчийн console)
  (window as unknown as { __game: unknown }).__game = { cfg, state, sim, view, panels, get fps() { return fps; } };
}

registerServiceWorker();

try {
  start();
} catch (err) {
  const el = document.getElementById('err')!;
  el.style.display = 'grid';
  el.textContent = err instanceof Error ? err.message : String(err);
  console.error(err);
}
