/**
 * Утасны HUD 2-ыг тоглоомтой холбоно: GameState → HudModel (товч, жагсаалт, төлөвийн мөр), товч → PlayerController / Command.
 * Тоглоом (main.ts, утас) ба лаб (ui-lab/main.ts) хоёулаа үүгээр — нэг газар.
 */
import hudJson from '../../../../data/hud2.json';
import { SPECIES, type GameConfig } from '../../sim/config';
import type { GameState, VehicleId } from '../../sim/state';
import type { Command } from '../../sim/commands';
import { formatTime, isNight } from '../../sim/clock';
import * as storage from '../../sim/systems/storage';
import { huntingWolves } from '../../sim/systems/wolves';
import { seasonProgress, yearOf } from '../../sim/systems/seasons';
import { SEASON_NAME, fmtMoney, fmtNum, productName } from '../../render/ui/names';
import { skipGoal, type SkipTarget } from '../skip';
import type { ActionKind, PlayerController } from '../controller';
import { t } from '../../i18n/i18n';
import { landscapeFullscreen } from '../../pwa';
import { contextTargets, horseMode, type HorseMode, type Target, type TargetKind } from './context';
import { LabHud, type HudModel, type TargetView, type WheelId } from './hud';
import { icon } from './icons';

export const HUD2 = hudJson;

const TARGET_ICON: Record<TargetKind, string> = {
  scare: 'shout', mount: 'horse', cart: 'cart', exitCart: 'exit', send: 'send', enter: 'door', exit: 'exit', service: 'trade', pickup: 'hand', deposit: 'box', trade: 'trade',
  gallop: 'gallop', fast: 'gallop',
};
const HORSE_ICON: Record<HorseMode, string> = { none: 'horse', call: 'call', coming: 'call', mount: 'horse', dismount: 'dismount' };
const WHEEL_CODE: Record<WheelId, string> = { shout: 'Space', call: 'KeyH', process: 'KeyB', load: 'KeyT', switch: 'KeyU', log: 'KeyL' };

export interface Hud2Deps {
  cfg: GameConfig;
  state: GameState;
  controller: PlayerController;
  /** Шууд команд (алтан товчны жагсаалтаас сонгосон зүйл) — үр дүнг тоглоомын мэдэгдлээр харуулна */
  act: (kind: ActionKind, cmd: Command) => void;
  /** Цонх/цэс нээлттэй, алгасаж байгаа: удирдлага ажиллахгүй */
  blocked: () => boolean;
  /** HUD бүхэлдээ нуугдах (цонх, цэс, зураг авах горим) */
  hidden: () => boolean;
  speedIdx: () => number;
  setSpeed: (i: number) => void;
  skip: { start: (target: SkipTarget) => void; stop: () => void; active: () => boolean };
  /** Дэлхийн цэг → дэлгэцийн px */
  project: (x: number, z: number, h: number) => { x: number; y: number };
  grass: () => number;
  /** ☰ цэсний мөрүүд (товчны код; 'full' = бүтэн дэлгэц) */
  menuItems: { code: string; icon: string; label: string }[];
  /** Лаб: эхлэлийн байдлууд (тоглоомд хоосон) */
  scenes?: string[];
  onScene?: (name: string) => void;
  /** Босоо байрлалын сануулгыг HUD өөрөө харуулах эсэх (тоглоомд input/touch.ts харуулна) */
  rotate: boolean;
}

export interface Hud2 {
  hud: LabHud;
  /** Actions дугуй нээлттэй үеийн хурдны үржүүлэгч (үгүй бол 1) */
  slow: () => number;
  /** Кадр бүр: dt бодит секунд */
  frame: (dt: number) => void;
  /** Дараагийн кадрт төлөвийг шууд шинэчил */
  refresh: () => void;
}

export function createHud2(d: Hud2Deps): Hud2 {
  const { cfg, state, controller } = d;
  let wheelOpen = false;
  let hudT = 0;
  const run = (tg: Target): void => {
    if (d.blocked()) return;
    switch (tg.kind) {
      case 'scare': controller.press('KeyQ'); break;
      case 'mount': controller.press('KeyF'); break;
      case 'cart': case 'exitCart': controller.press('KeyV'); break;
      case 'send': if (tg.ref) d.act('vehicle', { type: 'sendDriver', vehicle: tg.ref as VehicleId }); break;
      case 'enter': d.act('interior', { type: 'enterBuilding' }); break;
      case 'exit': d.act('interior', { type: 'exitBuilding' }); break;
      case 'pickup':
        // Гар хүрэх зайд бол шууд түүнэ; арай хол бол тийш алхана (хүрмэгц автоматаар түүгдэнэ)
        if (tg.at && tg.d > cfg.products.pickupRadius) controller.moveTo(tg.at.x, tg.at.z, false);
        else d.act('pickup', { type: 'pickup', ids: 'nearby' });
        break;
      case 'deposit': d.act('deposit', { type: 'deposit' }); break;
      case 'service': case 'trade': controller.press('KeyT'); break;
      default: break;
    }
    hudT = 0;
  };
  const vehicleName = (id: string | undefined): string => (t('sum3d.lot.' + id) !== 'sum3d.lot.' + id ? t('sum3d.lot.' + id) : t('ui.cart'));
  const label = (tg: Target): string => {
    switch (tg.kind) {
      case 'scare': return t('ui.scare');
      case 'mount': return t('lab.mount');
      case 'cart': return vehicleName(tg.ref);
      case 'exitCart': return t('lab.get_out');
      case 'send': return t('ui.send_act');
      case 'enter': return t('ui.enter_act');
      case 'exit': return t('lab.leave');
      case 'service': return t('lab.counter');
      case 'pickup': return t('ui.pick_up');
      case 'deposit': return t('lab.store');
      case 'trade': return t('ui.trade');
      default: return t('ui.gallop');
    }
  };
  const HORSE_LABEL: Record<HorseMode, string> = { none: t('ui.horse'), call: t('ui.call'), coming: t('lab.coming'), mount: t('lab.mount'), dismount: t('lab.dismount') };
  const clockText = (minute: number): string => formatTime({ day: state.time.day, minute });

  const hud = new LabHud({
    horse: t('ui.horse'), actions: t('lab.actions'), map: t('ui.map'), nothing: t('lab.nothing'), stop: t('ui.skip_stop'), rotate: t('ui.please_turn_your_phone'),
    speed: t('ui.speed'), skip: t('ui.skip'), menu: t('ui.menu'),
    wheel: { shout: t('ui.shout'), call: t('ui.call'), process: t('ui.process_act'), load: t('ui.load_act'), switch: t('ui.switch'), log: t('lab.log') },
    menuItems: d.menuItems,
    scenes: d.scenes ?? [],
  }, {
    run,
    hold: (_tg, on) => controller.hold('ShiftLeft', on),
    horse: () => { controller.press(state.player.mounted || horseMode(cfg, state) === 'mount' ? 'KeyF' : 'KeyH'); hudT = 0; },
    map: () => controller.press('Tab'),
    wheel: (id) => { controller.press(WHEEL_CODE[id]); hudT = 0; },
    wheelOpen: (open) => { wheelOpen = open; },
    stick: (x, y) => { controller.stick = { x, y }; },
    cycleSpeed: () => { d.setSpeed((d.speedIdx() + 1) % cfg.time.speeds.length); hudT = 0; },
    skip: (target) => d.skip.start(target),
    stopSkip: () => d.skip.stop(),
    menu: (code) => {
      if (code !== 'full') controller.press(code);
      else if (document.fullscreenElement) void document.exitFullscreen();
      else void landscapeFullscreen();
    },
    scene: (name) => d.onScene?.(name),
    project: d.project,
  }, hudJson.wheel, { rotate: d.rotate });

  const buildModel = (): HudModel => {
    const p = state.player;
    const targets: TargetView[] = contextTargets(cfg, state, hudJson.pickupReach).slice(0, hudJson.listMax).map((tg) => ({ t: tg, label: label(tg), icon: TARGET_ICON[tg.kind] }));
    const mode = horseMode(cfg, state);
    const herd = state.animals.filter((a) => !a.riding).length;
    const carried = p.carry.reduce((s, c) => s + c.amount, 0);
    const hunts = huntingWolves(state);
    const status =
      `<span>${icon(isNight(state.time, cfg.time) ? 'moon' : 'sun', 16)}<b>${formatTime(state.time)}</b></span>` +
      `<span>${t('hud.day', { day: state.time.day })}</span>` +
      `<span><b>${fmtMoney(state.money)}</b></span>` +
      `<span>${icon('herd', 16)}${herd}</span>` +
      `<span>${icon('hand', 16)}${fmtNum(carried)}/${cfg.products.carryUnits}</span>` +
      (hunts.length ? `<span class="l-alert">${icon('shout', 16)}${t('lab.wolf')}</span>` : '');
    const sp = seasonProgress(cfg, state.time.day);
    const counts = SPECIES.map((s) => {
      const n = state.animals.filter((a) => a.species === s && !a.riding).length;
      return n ? `${t('species.' + s)} ${n}` : '';
    }).filter(Boolean).join(' · ');
    const carryTxt = p.carry.length ? p.carry.map((c) => `${productName(c.product).toLowerCase()} ${fmtNum(c.amount)}`).join(', ') : '—';
    const detail =
      `<div>${SEASON_NAME[sp.season]} ${sp.dayOf}/${sp.days} · ${t('lab.year', { n: yearOf(cfg, state.time.day) })}</div>` +
      `<div>${t('hud.animals')}: ${counts || '—'}</div>` +
      `<div>${t('ui.storage')}: ${fmtNum(storage.used(state))}/${storage.capacity(cfg, state)} · ${t('hud.hand')}: ${carryTxt}</div>` +
      `<div>${t('hud.camp')}: ${t('camp.' + state.campId)} · ${t('hud.grass')} ${Math.round(d.grass() * 100)}%</div>`;
    const onGround = (p.place === 'camp' || p.place === 'sum') && !state.move;
    return {
      hidden: d.hidden(),
      targets,
      horse: { mode, label: HORSE_LABEL[mode], icon: HORSE_ICON[mode] },
      mapOn: p.place !== 'map' && !state.move && !p.interior,
      joyOn: p.place !== 'map' && !state.move,
      wheelOn: onGround && !p.driving && !p.interior,
      status, detail,
      speed: `${cfg.time.speeds[d.speedIdx()] ?? 1}×`,
      unread: state.journal.unread,
      skip: (['evening', 'morning'] as const).map((target) => {
        const g = skipGoal(cfg, state.time, target);
        return { target, label: t(target === 'evening' ? 'ui.skip_evening' : 'ui.skip_morning', { x: g ? clockText(g.minute) : '—' }), on: !!g };
      }),
      skipClock: d.skip.active() ? formatTime(state.time) : null,
    };
  };

  return {
    hud,
    slow: () => (wheelOpen ? hudJson.wheel.speed : 1),
    refresh: () => { hudT = 0; },
    frame: (dt) => {
      hudT -= dt;
      if (hudT <= 0) {
        hudT = hudJson.hudRefreshSec;
        hud.update(buildModel());
      }
      hud.frame();
    },
  };
}
