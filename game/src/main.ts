/**
 * Эхлэл: тохиргоо ачаалж, симуляц, дүрслэл, удирдлагыг холбоно.
 * Симуляц тогтмол алхамтай (1 алхам = 1 тоглоомын минут), дүрслэл кадр бүр (~60 FPS)
 * хоёр алхмын хооронд зөөлрүүлнэ (architecture.md §3.2). Цонх нээлттэй үед тоглоом зогсоно.
 *
 * Утас (мэдрэгч дэлгэц) автоматаар танигдана: input/touch.ts, device.ts. ?mobile=1 — компьютер дээр утасны горим.
 *
 * URL параметр (туршилт; тэдний аль нэг байвал хадгалалтыг ачаалахгүй/хадгалахгүй, M6.2): ?fresh=1 · ?seed=123 · ?herd=300 (нийт малын тоо) · ?speed=3 (1/2/3) · ?heatmap=1 · ?report=0 (өдрийн тайлангүй)
 */
import { loadConfig, SPECIES } from './sim/config';
import { createInitialState, type GameState } from './sim/state';
import { clampDifficulty, defaultDifficulty, type Difficulty } from './sim/systems/difficulty';
import { Sim } from './sim/sim';
import { Rng } from './sim/rng';
import { buildGrid } from './sim/systems/pasture';
import { spawnWolves } from './sim/systems/wolves';
import { formatTime, isNight, realSecondsPerMinute } from './sim/clock';
import { averageBiomass } from './sim/systems/pasture';
import * as storage from './sim/systems/storage';
import { ridingHorse } from './sim/systems/herder';
import { huntingWolves } from './sim/systems/wolves';
import { DOG_ORDER_NAME } from './sim/systems/dogs';
import { nearestVehicle, partySpeedKmPerMin } from './sim/systems/travel';
import { nearTeahouse } from './sim/systems/helpers';
import { nearLotSlot, nearTradeDoor, sumDoors } from './sim/systems/sumtown';
import { nearTownDoor } from './sim/systems/town';
import { atExit, interiorService, nearEnterDoor } from './sim/systems/interior';
import { campAccess, seasonProgress, yearOf } from './sim/systems/seasons';
import { GameView } from './render/scene';
import { Panels } from './render/ui/panels';
import { PRODUCT_EMOJI, SEASON_EMOJI, SEASON_NAME, fmtMinutes, fmtMoney, fmtNum } from './render/ui/names';
import { PlayerController } from './input/controller';
import { t } from './i18n/i18n';
import { tm } from './i18n/msg';
import type { Msg } from './sim/msg';
import { SaveStore } from './persist/idb';
import { Autosave, attachPageEvents, attachSimEvents } from './persist/autosave';
import { MenuUI, takeIntent } from './render/ui/menu';
import { TouchUI } from './input/touch';
import { registerServiceWorker, onConnectionChange } from './pwa';
import { isTouch, touchKeys, quality, QUALITIES, QUALITY_NAME, QUALITY_SPEC, setQuality } from './device';

function toast(message: string | Msg, kind: '' | 'good' | 'bad' = ''): void {
  let msg = tm(message);
  if (isTouch) msg = touchKeys(msg.replace(t('ui.with_the_mouse'), t('ui.with_your_finger')));
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

/** Хөтчийн хадгалалт (M6.2): ачаалсан слот, эсвэл шинэ тоглоомд ашиглах слот. Эхлэлийн дэлгэц M6.3 */
interface Boot {
  store: SaveStore | null;
  slot: number;
  /** Ачаалсан/шинэ тоглоом; null = эхлэлийн дэлгэцийн ард түр шинэ төлөв (хадгалахгүй) */
  state: GameState | null;
  /** start = эхлэлийн дэлгэц, intro = шинэ тоглоомын оршил, none = шууд тоглоно */
  screen: 'start' | 'intro' | 'none';
}

function start(boot?: Boot): void {
  const cfg = loadConfig();
  const qs = new URLSearchParams(location.search);
  const shotParam = qs.get('shot');
  const shot = shotParam === null ? null : Number(shotParam);
  if (shotParam !== null && (!Number.isInteger(shot) || shot! < 1 || shot! > 7)) {
    throw new Error('?shot нь 1–7 бүхэл тоо байх ёстой');
  }
  const captureMode = shot !== null;
  let photoMode = captureMode;
  const seed = captureMode ? 20261113 : Number(qs.get('seed')) || 20261113;
  const state = boot?.state ?? createInitialState(cfg, seed);
  const persistence = boot ? { store: boot.store, slot: boot.slot } : null;
  if (shot !== null) {
    const presets = {
      1: { camp: 'river', season: 'summer', minute: 600, yaw: 0.6, pitch: 0.42, dist: 58 },
      2: { camp: 'river', season: 'summer', minute: 1170, yaw: 0.8, pitch: 0.38, dist: 58 },
      3: { camp: 'northSlope', season: 'spring', minute: 420, yaw: 0.5, pitch: 0.42, dist: 64 },
      4: { camp: 'southSlope', season: 'winter', minute: 720, yaw: 0.6, pitch: 0.38, dist: 60 },
      5: { camp: 'river', season: 'autumn', minute: 1380, yaw: 0.45, pitch: 0.36, dist: 58 },
      6: { camp: 'river', season: 'autumn', minute: 840, yaw: 0.2, pitch: 0.44, dist: 56 },
      7: { camp: 'river', season: 'summer', minute: 600, yaw: 0, pitch: 0.95, dist: 70 },
    } as const;
    const preset = presets[shot as keyof typeof presets];
    const seasonIndex = cfg.seasons.order.indexOf(preset.season);
    state.time.day = 1 + cfg.seasons.order.slice(0, seasonIndex).reduce((sum, season) => sum + cfg.seasons.days[season], 0);
    state.time.minute = preset.minute;
    state.home = 'ger';
    state.campId = preset.camp;
    state.grass = buildGrid(cfg, preset.camp, 0, new Rng(seed));
    state.wolves = spawnWolves(cfg, seed, preset.camp);
    state.camps[preset.camp]!.snow = preset.season === 'winter' ? 22 : preset.season === 'spring' ? 5 : 0;
    if (shot === 6) {
      const shop = sumDoors(cfg).find((d) => d.role === 'buyer')!;
      state.player.place = 'sum';
      state.player.away = true;
      state.player.x = shop.x;
      state.player.z = shop.z + 12;
    } else if (shot === 7) {
      const home = cfg.worldmap.locations[preset.camp]!;
      state.player.place = 'map';
      state.player.away = true;
      state.map = { x: home.x, z: home.z, tx: home.x, tz: home.z, dest: null };
    } else {
      state.player.place = 'camp';
      state.player.away = false;
    }
    state.player.heading = preset.yaw;
  }
  // Туршилт: ?home=ger — гэртэй эхлэх; ?door=<барилгын id> — сумын төвд тэр хаалганы дэргэд эхлэх (V6.1)
  if (qs.get('home') === 'ger') state.home = 'ger';
  const doorParam = qs.get('door');
  const doorAt = doorParam ? sumDoors(cfg).find((d) => d.id === doorParam) : undefined;
  if (doorAt) Object.assign(state.player, { place: 'sum', away: true, x: doorAt.x, z: doorAt.z + 1 });
  const sim = new Sim(cfg, state);
  const herd = Number(qs.get('herd')) || 0;
  if (herd > state.animals.length) sim.command({ type: 'debugAddAnimals', n: herd - state.animals.length });

  const view = new GameView(document.getElementById('app')!, cfg, state);
  if (captureMode) {
    const preset = ({
      1: { yaw: 0.6, pitch: 0.42, dist: 58 },
      2: { yaw: 0.8, pitch: 0.38, dist: 58 },
      3: { yaw: 0.5, pitch: 0.42, dist: 64 },
      4: { yaw: 0.6, pitch: 0.38, dist: 60 },
      5: { yaw: 0.45, pitch: 0.36, dist: 58 },
      6: { yaw: 0.2, pitch: 0.44, dist: 56 },
      7: { yaw: 0, pitch: 0.95, dist: 70 },
    } as const)[shot as 1 | 2 | 3 | 4 | 5 | 6 | 7]!;
    view.cam.yaw = preset.yaw;
    view.cam.pitch = preset.pitch;
    view.cam.dist = preset.dist;
    view.renderer.domElement.style.pointerEvents = 'none';
    document.body.classList.add('photo-mode');
  }
  if (qs.get('heatmap') === '1') view.toggleHeatmap(state);
  const hud = document.getElementById('hud')!;
  const perf = document.getElementById('perf')!;
  // FPS самбар: утсан дээр ❓ цэснээс асаана (суулгасан апп-д ?stats нэмэх боломжгүй)
  const PERF_KEY = 'nuudel.showPerf';
  let showPerf = qs.has('stats') || qs.get('perf') === '1';
  try {
    if (localStorage.getItem(PERF_KEY) === '1') showPerf = true;
  } catch {
    /* localStorage хаалттай бол үл тооно */
  }
  const help = document.getElementById('help')!;
  const prompt = document.getElementById('prompt')!;
  help.innerHTML = t('ui.p_photo_mode_the', { x: t('help.title'), x2: isTouch ? t('help.touch') + '\n\n' + touchKeys(t('help.body')) : t('help.body') });
  document.title = t('app.title');

  // M6.2: автомат хадгалалт. Sim-ийн алхмын дунд бичихгүй — хүсэлт тэмдэглээд кадрын давталт алхмуудын дараа flush хийнэ
  const autosave = persistence?.store && boot?.state ? new Autosave({
    store: persistence.store, state: () => state, slot: () => persistence.slot,
    onSaved: (reason) => { if (reason !== 'hidden') toast(t('save.done'), 'good'); },
    onError: (err) => { console.error(err); toast(t('save.failed'), 'bad'); },
  }) : null;
  if (autosave) {
    attachSimEvents(sim, autosave);
    attachPageEvents(autosave, window, document);
    if (boot!.screen === 'none') toast(t('save.resumed', { day: state.time.day }), 'good');
  }
  let curQuality = quality;
  const menu = new MenuUI({
    cfg, state, store: persistence?.store ?? null,
    getSlot: () => persistence?.slot ?? 1, setSlot: (n) => { if (persistence) persistence.slot = n; },
    autosave, dispatch: (cmd) => sim.command(cmd), hasGame: !!boot?.state,
    toast, getQuality: () => curQuality,
    setQuality: (q) => { curQuality = q; setQuality(q); view.applyQuality(QUALITY_SPEC[q], q, state); },
    openHelp: () => { document.getElementById('help')!.style.display = 'block'; },
    reload: () => {
      // ?lang=mn (туршилт) хэл солиход саад болохгүй: параметрийг авч хаяад дахин ачаална
      const u = new URL(location.href);
      if (u.searchParams.has('lang')) { u.searchParams.delete('lang'); location.replace(u.toString()); } else location.reload();
    },
    onFirstTap: () => touchUI?.enterLandscape(),
  });
  const panels = new Panels(cfg, state, { dispatch: (cmd) => { const r = sim.command(cmd); if (r.ok && cmd.type === 'moveCamp') autosave?.request('move'); return r; }, toast, toggleZones: () => view.zones.toggle() });
  const showReports = qs.get('report') !== '0';
  let huntToastT = 0;
  sim.on((e) => {
    if (e.type === 'dayReport' && showReports) panels.showReport(e.report);
    else if (e.type === 'wolfHunt') {
      const now = performance.now();
      if (now - huntToastT > 4000) {
        huntToastT = now;
        const d = Math.round(Math.hypot(e.x - state.player.x, e.z - state.player.z));
        toast(t('ui.a_wolf_is_attacking', { x: t('species.' + e.species).toLowerCase(), d }), 'bad');
      }
    } else if (e.type === 'wolfKill') toast(t('ui.a_wolf_caught_a', { x: t('species.' + e.species).toLowerCase() }), 'bad');
    else if (e.type === 'wolfGiveUp') toast(t('ui.the_wolf_gave_up'), 'good');
    else if (e.type === 'town') toast(e.msg, e.good ? 'good' : 'bad');
    else if (e.type === 'dogFight') toast(e.result === 'wolfKilled' ? t('ui.fought_the_wolf_and', { dog: e.dog }) : e.result === 'bothDied' ? t('ui.fought_the_wolf_and_7', { dog: e.dog }) : t('ui.two_wolves_killed', { dog: e.dog }), e.result === 'wolfKilled' ? 'good' : 'bad');
    else if (e.type === 'wolfPups') toast(t('ui.pups_were_born_in', { n: e.n }), 'bad');
    else if (e.type === 'wolfArrive') toast(t('ui.wolves_from_elsewhere_settled', { n: e.n }), 'bad');
    else if (e.type === 'leftToMap') toast(t('ui.map_click_where_you'), 'good');
    else if (e.type === 'arrived') toast(e.place === 'sum' ? t('ui.you_arrived_at_the') : t('ui.you_are_home'), 'good');
    else if (e.type === 'arriveCamp') panels.showArrive(e.campId);
    else if (e.type === 'season') {
      const msg: Record<string, string> = {
        summer: t('ui.summer_the_herd_fattens'),
        autumn: t('ui.autumn_the_grass_is'),
        winter: t('ui.winter_the_snow_has'),
        spring: t('ui.spring_birthing_season_snow'),
      };
      toast(msg[e.season] ?? '', 'good');
    } else if (e.type === 'helperQuit') toast(e.reason === 'wage' ? t('ui.not_enough_money_for', { x: e.names.join(', ') }) : t('ui.quit', { x: e.names.join(', ') }), 'bad');
    else if (e.type === 'helperTrip') toast(t('ui.arrived_from_the_sum', { name: e.name, x: fmtMoney(e.income) }), 'good');
    else if (e.type === 'otorLoss') toast(t('ui.at_the_otor_a', { x: t('camp.' + e.campId), x2: t('species.' + e.species).toLowerCase() }), 'bad');
    else if (e.type === 'wolfRaid') toast(t('ui.tonight_heading_for_the', { x: e.n > 1 ? e.n + t('ui.wolves') : t('ui.a_wolf') }), 'bad');
    else if (e.type === 'hour' && e.hour === Math.ceil(Math.min(...Object.values(cfg.time.homeMinute)) / 60)) toast(t('ui.evening_the_animals_are'), '');
  });

  let speedIdx = Math.max(0, Math.min(cfg.time.speeds.length - 1, (Number(qs.get('speed')) || 1) - 1));
  const controller = new PlayerController(cfg, {
    dispatch: (cmd) => sim.command(cmd),
    state: () => state,
    blocked: (code) => panels.isOpen || menu.isOpen || (photoMode && code !== 'KeyP'),
    onAction: (kind, res) => {
      if (res.ok && (kind === 'shout' || kind === 'scare' || kind === 'call')) view.characters.say(kind);
      if (res.msg) toast(res.msg, res.ok ? 'good' : 'bad');
      else if (kind === 'deposit' && res.ok) toast(t('ui.put_in_storage'), 'good');
    },
    onSpeed: (i) => {
      speedIdx = i;
    },
    onToggle: (what) => {
      if (what === 'heatmap') view.toggleHeatmap(state);
      else if (what === 'photo' && !captureMode) {
        photoMode = !photoMode;
        document.body.classList.toggle('photo-mode', photoMode);
        if (!photoMode) toast(t('ui.left_photo_mode'), 'good');
      }
      else if (what === 'storage') panels.open('storage');
      else if (what === 'trade') panels.open(state.player.place === 'sum' ? (nearLotSlot(cfg, state) ? 'lot' : nearTownDoor(cfg, state) ? 'town' : nearTeahouse(cfg, state) ? 'teahouse' : 'shop') : 'cargo');
      else if (what === 'helpers') panels.open('helpers');
      else if (what === 'dogs') panels.open('dogs');
      else if (what === 'camps') panels.open('camps');
      else if (what === 'cheat') panels.open('cheat');
      else if (what === 'zones') toast(view.zones.toggle() ? t('ui.protection_zones_are_visible') : t('ui.protection_zones_hidden'), 'good');
      else if (help.style.display === 'block') help.style.display = 'none';
      else menu.toggleGame();   // ❓ / F1 → тоглоомын цэс (M6.3); тусламж цэснээс
    },
  });
  // Утасны удирдлага (мэдрэгч дэлгэц)
  const touchUI = isTouch && !captureMode ? new TouchUI(cfg, controller, { speedIdx: () => speedIdx, speeds: cfg.time.speeds }, { menuGate: !!boot }) : null;
  let hudCompact = isTouch;
  if (isTouch && !captureMode) {
    if (!showPerf) perf.style.display = 'none';
    document.getElementById('toasts')!.appendChild(prompt);
    hud.addEventListener('click', () => {
      hudCompact = !hudCompact;
      hudT = 0;
    });
    // Тусламжийн цонх: графикийн чанар, туршилтын цэс, хаах
    let q = quality;
    const helpBody = help.innerHTML;
    const renderHelp = (): void => {
      help.innerHTML = '<span class="hclose" data-h="close">✕</span>' + helpBody + t('ui.graphics_fps_debug_menu', { x: QUALITY_NAME[q], x2: showPerf ? t('ui.on') : t('ui.off') });
    };
    renderHelp();
    help.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('[data-h]') as HTMLElement | null;
      if (!b) return;
      if (b.dataset.h === 'q') {
        q = QUALITIES[(QUALITIES.indexOf(q) + 1) % QUALITIES.length]!;
        setQuality(q);
        view.applyQuality(QUALITY_SPEC[q], q, state);
        renderHelp();
        return;
      }
      if (b.dataset.h === 'perf') {
        showPerf = !showPerf;
        perf.style.display = showPerf ? '' : 'none';
        try {
          localStorage.setItem(PERF_KEY, showPerf ? '1' : '0');
        } catch {
          /* хадгалж чадахгүй бол энэ удаад л ажиллана */
        }
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
  // Esc: тусламж нээлттэй бол хаана, үгүй бол тоглоомын цэс (самбар нээлттэй бол самбар өөрөө хаагдана; capture — самбараас өмнө уншина)
  if (boot) window.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape' || menu.isOpen || panels.isOpen || photoMode) return;
    if (help.style.display === 'block') help.style.display = 'none';
    else menu.toggleGame();
  }, true);
  if (boot?.screen === 'start') menu.showStart();
  else if (boot?.screen === 'intro') {
    menu.showIntro(() => undefined);
    void autosave?.saveNow('hidden');   // шинэ тоглоом слотод тэр дор бичигдэнэ
  }

  // Шөнө тоглоомын цаг хурдан өнгөрнө (M4.5)
  const secPerMinuteNow = (): number => realSecondsPerMinute(cfg.time, state.time.minute) / state.settings.difficulty.timeSpeed;   // M6.10: цагийн хурдны гулсуур
  let acc = 0;
  let last = performance.now();
  let hudT = 0;
  let grassAvg = averageBiomass(state.grass, 120);
  let grassT = 0;
  // Байршил (мөн орсон барилга) солигдоход дэлгэц бүдгэрнэ
  const placeKey = (): string => state.player.place + (state.player.interior?.door ?? '');
  let previousPlace = placeKey();
  // FPS хэмжилт
  let fpsFrames = 0, fpsT = 0, fps = 0, worstMs = 0, worstShown = 0;

  /** Барилгын нэр: сумын төвийн шошго (sum3d.*) байвал тэр, үгүй бол өрөөний төрлийн нэр */
  const interiorName = (door: string, room: string): string => (t('sum3d.' + door) !== 'sum3d.' + door ? t('sum3d.' + door) : t('interior.room.' + room));

  const updatePrompt = (): void => {
    const p = state.player;
    let html = '';
    if (!panels.isOpen && p.place === 'map') html = t('ui.map_left_click_where');
    else if (!panels.isOpen && p.interior) {
      const name = interiorName(p.interior.door, p.interior.room);
      const svc = interiorService(cfg, state);
      html = atExit(cfg, state) ? t('interior.hint.exit') : svc ? t('interior.hint.' + svc) + t('interior.hint.walk', { name }) : t('interior.hint.walk', { name });
    }
    else if (!panels.isOpen && p.driving) html = t('ui.w_s_drive_brake') + (p.place === 'camp' && Math.hypot(p.x - cfg.camps.home.x, p.z - cfg.camps.home.z) < cfg.vehicles.road.loadRange ? t('ui.t_load_unload') : '') + t('ui.drive_to_the_edge');
    else if (!panels.isOpen && p.place === 'sum') {
      const door = nearTradeDoor(cfg, state);
      const slot = nearLotSlot(cfg, state);
      const nearV = nearestVehicle(cfg, state, cfg.vehicles.road.enterRange);
      const where = t('ui.shops_yellow_ring_teahouse');
      const lotTxt = (): string => {
        const v = slot && !slot.display ? (cfg.vehicles as unknown as Record<string, { name: string; emoji: string; price: number } | undefined>)[slot.vehicle] : undefined;
        return v ? t('ui.e_buy', { emoji: v.emoji, name: v.name, x: fmtMoney(v.price) }) : t('ui.coming_soon', { x: t('sum3d.lot.' + (slot?.vehicle ?? '')) });
      };
      const town = nearTownDoor(cfg, state);
      const townTxt = (): string => town!.role === 'house' ? (state.town.houses[town!.id] ? t('ui.your_yard_house') : t('ui.yard_house_for_sale')) : town!.role === 'relative' ? t('ui.relatives') : t('sum3d.' + town!.id) + (town!.role === 'soon' ? t('ui.very_soon') : '');
      const enter = !p.driving && !slot ? nearEnterDoor(cfg, state) : null;
      html = slot && !p.driving ? lotTxt() : enter ? t('interior.hint.enter', { name: interiorName(enter.id, enter.room) }) : door ? `<kbd>E</kbd> ${t('sum3d.' + door.id)}` : town ? `<kbd>E</kbd> ${townTxt()}` : nearTeahouse(cfg, state) ? t('ui.e_teahouse_hire_a') : nearV ? t('ui.v_board_your_cart') : p.mounted ? where + t('ui.to_return_press_tab') : where + t('ui.tab_map');
    } else if (!p.away && !panels.isOpen) {
      const home = cfg.camps.home;
      const dHome = Math.hypot(p.x - home.x, p.z - home.z);
      const carried = p.carry.reduce((s, c) => s + c.amount, 0);
      const nearItems = state.items.filter((it) => Math.hypot(it.x - p.x, it.z - p.z) <= cfg.products.pickupRadius * 1.6).length;
      const horse = ridingHorse(state);
      if (carried >= cfg.products.carryUnits - 1e-9 && dHome > home.storageRadius) html = t('ui.hands_full_bring_it');
      else if (nearItems) html = t('ui.e_pick_up', { nearItems });
      else if (!carried && !p.mounted && nearEnterDoor(cfg, state)) html = t('interior.hint.enter', { name: interiorName(nearEnterDoor(cfg, state)!.id, nearEnterDoor(cfg, state)!.room) });
      else if (dHome <= home.storageRadius * 2) html = t('ui.b_storage_processing_t');
      else if (!p.mounted && nearestVehicle(cfg, state, cfg.vehicles.road.enterRange)) html = t('ui.v_board_your_cart');
      else if (!p.mounted && horse && Math.hypot(horse.x - p.x, horse.z - p.z) <= cfg.player.mountRange) html = t('ui.f_mount_the_horse');
      else if (p.mounted && Math.hypot(p.x, p.z) > cfg.player.worldRadius - 25) html = t('ui.ride_on_or_press');
    }
    if (isTouch && !panels.isOpen) {
      if (p.place === 'map') html = t('ui.tap_where_to_go');
      else if (p.driving) html = t('ui.up_go_down_brake');
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
    const paused = photoMode || panels.isOpen || menu.isOpen || !!touchUI?.paused;
    if (menu.isStart) view.cam.yaw += dt * 0.07;   // эхлэлийн дэлгэцийн ард бууц удаан эргэнэ

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
    autosave?.flush();   // алхмуудын завсарт (state бүтэн)
    if (placeKey() !== previousPlace) {
      previousPlace = placeKey();
      const fade = document.getElementById('sceneFade')!;
      fade.classList.remove('play');
      void fade.offsetWidth;
      fade.classList.add('play');
    }
    const spm = secPerMinuteNow();
    view.frame(state, Math.min(1, acc / spm), paused && !menu.isStart ? 0 : dt, paused ? 0 : spm / speed);

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
      const how = p.driving ? `${cfg.vehicles[p.driving].emoji} ${cfg.vehicles[p.driving].name}` : p.mounted ? t('ui.mounted') : t('ui.on_foot');
      if (p.place === 'map' && !state.move) {
        const m = state.map;
        const d = Math.hypot(m.tx - m.x, m.tz - m.z);
        const where = m.dest ? (cfg.worldmap.locations[m.dest]?.kind === 'sum' ? t('ui.sum_center') : t('camp.' + m.dest)) : t('ui.a_point_on_the');
        status = d > 0.01 ? t('ui.km', { how, where, x: d.toFixed(1), x2: fmtMinutes(Math.round(d / partySpeedKmPerMin(cfg, state))), x3: p.drove.length ? t('ui.herding_animals', { length: p.drove.length }) : '' }) : t('ui.stopped_on_the_map', { how });
      } else if (p.interior) status = t('interior.status', { name: interiorName(p.interior.door, p.interior.room) });
      else if (p.place === 'sum') status = t('ui.sum_center_62', { how });
      else if (p.driving) status = how;
      else if (state.move) status = t('ui.moving_to', { x: t('camp.' + state.move.to), x2: fmtMinutes(state.move.remaining) });
      const hunts = huntingWolves(state);
      let alert = '';
      if (hunts.length) {
        const a = state.animals.find((x) => x.id === hunts[0]!.targetId);
        const d = a ? Math.round(Math.hypot(a.x - p.x, a.z - p.z)) : 0;
        alert = t('ui.wolf_attack_q', { x: a ? t('ui.m', { x: t('species.' + a.species).toLowerCase(), d }) : '' });
      }
      const dogsTxt = state.dogs.length
        ? `🐕 ${state.dogs.map((d) => `${d.name}: ${d.mode === 'chase' ? t('ui.wolf_chasing') : tm(DOG_ORDER_NAME[d.order]).toLowerCase()}`).join(' · ')} <small>(K)</small><br>`
        : '';
      const hs = state.helpers;
      const helpersTxt = hs.list.length
        ? t('ui.helpers_j', { length: hs.list.length, x: hs.otor.length ? t('ui.otor', { length: hs.otor.length }) : '', x2: hs.list.some((h) => h.trip) ? t('ui.on_the_road') : '' })
        : '';
      const sp = seasonProgress(cfg, state.time.day);
      const cs = state.camps[state.campId];
      const snowTxt = cs && cs.snow >= 0.5 ? t('ui.cm_grazeable', { x: Math.round(cs.snow), x2: Math.round(campAccess(cfg, cs.snow) * 100) }) : '';
      const hayTxt = cs && (cs.hay > 0 || sp.season === 'winter' || sp.season === 'autumn') ? ` · 🌾 ${fmtNum(Math.round((cs.hay ?? 0) * 10) / 10)}` : '';
      const head =
        `<b>${t('hud.day', { day: state.time.day })}</b> · ${isNight(state.time, cfg.time) ? '🌙' : '☀️'} ${formatTime(state.time)}${paused ? ' · ⏸' : ''}<br>`;
      const full =
        head +
        t('ui.year', { x: SEASON_EMOJI[sp.season], x2: SEASON_NAME[sp.season], dayOf: sp.dayOf, days: sp.days, x3: yearOf(cfg, state.time.day), snowTxt, hayTxt }) +
        `${t('hud.money')}: <b>${fmtMoney(state.money)}</b><br>` +
        `${t('hud.animals')}: ${counts.join(' · ')}<br>` +
        `📦 ${fmtNum(storage.used(state))}/${storage.capacity(cfg, state)} · ✋ ${carryTxt} (${fmtNum(carried)}/${cfg.products.carryUnits})${onGround ? t('ui.on_the_ground', { onGround }) : ''}<br>` +
        `${t('hud.camp')}: ${t('camp.' + state.campId)} · ${t('hud.grass')} ${Math.round(grassAvg * 100)}% · ${t('hud.degrade')} ${Math.round(degrade * 100)}%<br>` +
        `${status} · ${t('hud.speed')}: ${speed}×${fast ? ' ⏩' : ''} <small>(1/2/3)</small><br>` +
        dogsTxt +
        helpersTxt +
        alert +
        `<small>${t('hud.milestone')} · ${t('help.hint')}${view.heatmap ? ' · G: heatmap' : ''}${view.zones.visible ? t('ui.z_zones') : ''}${state.wolves.peaceful ? t('ui.wolves_off') : ''}</small>`;
      // Утсанд HUD хураангуй — дарвал бүтэн харагдана
      hud.innerHTML = hudCompact
        ? touchKeys(head) +
          `💰 <b>${fmtMoney(state.money)}</b> · 🐑 ${state.animals.filter((a) => !a.riding).length} · ✋ ${fmtNum(carried)}/${cfg.products.carryUnits}<br>` +
          `${touchKeys(status)}<br>` +
          alert +
          t('ui.more')
        : touchKeys(full) + (isTouch ? t('ui.collapse') : '');
      touchUI?.update(state, panels.isOpen || menu.isOpen || help.style.display === 'block');
      perf.textContent = qs.has('stats') || showPerf
        ? t('ui.fps_max_ms_draw', { x: fps.toFixed(0), x2: worstShown.toFixed(0), drawCalls: view.drawCalls, x3: view.triangleCount.toLocaleString(), length: state.animals.length, geometries: view.renderer.info.memory.geometries, textures: view.renderer.info.memory.textures })
        : t('ui.fps_max_ms_draw_78', { x: fps.toFixed(0), x2: worstShown.toFixed(0), drawCalls: view.drawCalls, length: state.animals.length });
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // Туршилт, алдаа олоход (хөтчийн console)
  (window as unknown as { __game: unknown }).__game = { cfg, state, sim, view, panels, autosave, menu, store: persistence?.store, get fps() { return fps; } };
}

// Интернетгүй тоглох: анх нээхэд бүх файл утсанд хадгалагдана (sw-template.js)
registerServiceWorker((firstTime) =>
  toast(firstTime ? t('ui.the_game_is_saved') : t('ui.a_new_version_is'), 'good'),
);
onConnectionChange((online) => toast(online ? t('ui.internet_is_back') : t('ui.internet_lost_the_game'), online ? 'good' : ''));

/** Туршилтын URL параметртэй (seed, shot, herd, home, door, fresh) бол цэс, хадгалалтгүй — өмнөх шиг шууд тоглоно */
const TEST_PARAMS = ['seed', 'shot', 'herd', 'home', 'door', 'fresh'];

async function boot(): Promise<void> {
  const qs = new URLSearchParams(location.search);
  if (TEST_PARAMS.some((k) => qs.has(k)) || !SaveStore.available()) { start(); return; }
  const cfg = loadConfig();
  const store = new SaveStore(indexedDB);
  const intent = takeIntent();
  if (intent?.kind === 'new') {
    const state = createInitialState(cfg, intent.seed);
    state.settings.difficulty = clampDifficulty(cfg, defaultDifficulty(cfg), intent.difficulty as Partial<Difficulty>);
    start({ store, slot: intent.slot, state, screen: 'intro' });
    return;
  }
  if (intent?.kind === 'slot') {
    const state = await store.load(cfg, intent.slot).catch((e) => { console.error('слот ачаалж чадсангүй', e); return null; });
    if (state) { start({ store, slot: intent.slot, state, screen: 'none' }); return; }
  }
  const last = await store.latest(cfg).catch((e) => { console.error('хадгалалт ачаалж чадсангүй', e); return null; });
  start({ store, slot: last?.slot ?? 1, state: last?.state ?? null, screen: 'start' });
}

boot().catch((err) => {
  const el = document.getElementById('err')!;
  el.style.display = 'grid';
  el.textContent = err instanceof Error ? err.message : String(err);
  console.error(err);
});
