/** Нохой (K), бууц сэлгэх (M), цайны газар, туслахууд (J), туршилтын цэс */
import { bestTruck } from '../../sim/systems/trip';
import { salePrice, herdSheepUnits } from '../../sim/systems/animals';
import { DOG_ORDER_NAME, type DogOrderKind } from '../../sim/systems/dogs';
import { flockKey } from '../../sim/systems/herds';
import { moveHours } from '../../sim/systems/camps';
import { averageBiomass } from '../../sim/systems/pasture';
import type { CheatAction } from '../../sim/systems/cheats';
import { bedsTotal, bedsUsed, nearTeahouse, spareTents, type Helper, type HerdGroup } from '../../sim/systems/helpers';
import { campAccess, seasonProgress } from '../../sim/systems/seasons';
import { CAMP_HINT, SEASON_EMOJI, SEASON_NAME, PASTURE_NAME, WATER_NAME, WOLF_LEVEL_NAME, fmtMinutes, fmtMoney, fmtNum } from './names';
import { t } from '../../i18n/i18n';
import { animalGroups, type PanelCtx } from './panelCtx';

const HERD_NAME: Record<string, string> = { sheep: t('ui.sheep_goats'), cow: t('ui.cattle'), horse: t('ui.horses') };

const CHEATS: { act: CheatAction; label: string }[][] = [
  [{ act: 'money', label: '💰 +1 000 000₮' }, { act: 'fillStorage', label: t('ui.milk_wool_in_hand') }],
  [{ act: 'addSheep', label: t('ui.10_sheep') }, { act: 'addGoats', label: t('ui.10_goats') }, { act: 'addCows', label: t('ui.5_cattle') }, { act: 'addHorses', label: t('ui.5_horses') }, { act: 'addMixed', label: t('ui.50_mixed') }],
  [{ act: 'addDog', label: t('ui.1_dog') }, { act: 'removeDog', label: t('ui.1_dog_93') }],
  [{ act: 'skipHour', label: t('ui.1_hour') }, { act: 'endDay', label: t('ui.end_the_day') }],
  [{ act: 'thirsty', label: t('ui.all_animals_thirsty') }, { act: 'quench', label: t('ui.all_animals_drink') }, { act: 'hungry', label: t('ui.feed_0') }, { act: 'fatten', label: t('ui.very_fat') }],
  [{ act: 'degradeUp', label: t('ui.degradation_10') }, { act: 'degradeReset', label: t('ui.degradation_0') }],
  [{ act: 'nextSeason', label: t('ui.next_season') }, { act: 'addHay', label: t('ui.20_hay_bales') }, { act: 'snowUp', label: t('ui.snow_10_cm') }, { act: 'snowClear', label: t('ui.clear_snow') }],
  [{ act: 'wolfAttack', label: t('ui.trigger_a_wolf_attack') }, { act: 'scareAll', label: t('ui.scare_all_wolves_away') }, { act: 'wolvesPeaceful', label: t('ui.wolf_attacks_on_off') }],
];

// ======================= нохой (K) =======================
export function dogsHtml(pn: PanelCtx): string {
  const { cfg, state } = pn;
  const p = state.player;
  if (!state.dogs.length) {
    return t('ui.dogs_you_have_no', { x: fmtMoney(cfg.dogs.price), x2: fmtMoney(cfg.dogs.foodPerDay), dog: cfg.wolves.protectRadius.dog });
  }
  const keys = [...new Set(state.animals.filter((a) => !a.riding).map((a) => flockKey(a.species)))];
  const buttons = (target: string) => {
    const base = (['follow', 'stay', 'patrol', 'patrolCamp'] as DogOrderKind[])
      .map((o) => `<button class="btn sm" data-act="dog:${target}|${o}">${DOG_ORDER_NAME[o]}</button>`).join(' ');
    const herd = keys.map((k) => `<button class="btn sm" data-act="dog:${target}|guardHerd|${k}">${HERD_NAME[k]}</button>`).join(' ');
    return t('ui.guard_the_herd', { base, x: herd || t('ui.no_animals_242') });
  };
  const rows = state.dogs.map((d) => {
    const dist = Math.round(Math.hypot(d.x - p.x, d.z - p.z));
    const cur = d.order === 'guardHerd' ? `${DOG_ORDER_NAME.guardHerd} (${HERD_NAME[d.herd]})` : DOG_ORDER_NAME[d.order];
    const status = d.mode === 'chase' ? t('ui.chasing_a_wolf') : cur;
    return t('ui.m_away', { name: d.name, dist, x: (d.health ?? 100) < 100 ? ` · 🩹 ${Math.round(d.health ?? 100)}%` : '', status, x2: buttons(String(d.id)) });
  }).join('');
  return t('ui.dog_commands_here_where', { dog: cfg.wolves.protectRadius.dog, alertRadius: cfg.dogs.alertRadius, leash: cfg.dogs.leash, rows, x: state.dogs.length > 1 ? t('ui.all_dogs', { x: buttons('all') }) : '' });
}

// ======================= бууц сэлгэх (M) =======================
export function campsHtml(pn: PanelCtx): string {
  const { cfg, state } = pn;
  const deg = cfg.pasture.degradation;
  const truck = bestTruck(cfg, state);
  const byTruck = truck !== null;
  const hours = moveHours(cfg, state, byTruck);
  const trips = state.home === 'ger' ? Number(cfg.camps.move.truckTripsGer) : Number(cfg.camps.move.truckTripsTent);
  const fuel = truck ? ((cfg.vehicles.campDistanceKm * 2 * trips * cfg.vehicles[truck].fuelPer100km) / 100) * cfg.vehicles.fuelPricePerL : 0;
  const su = herdSheepUnits(state, cfg.animals);
  const gainPerDay = deg.gainPerDayAtCapacity * (su / deg.campCapacitySheepUnits);
  const near = Math.hypot(state.player.x - cfg.camps.home.x, state.player.z - cfg.camps.home.z) <= cfg.camps.home.storageRadius * 2;
  const busy = Boolean(state.move || state.player.away || state.player.driving);
  const r120 = averageBiomass(state.grass, 150);
  const sp = seasonProgress(cfg, state.time.day);
  const rows = Object.entries(cfg.camps.camps).map(([id, c]) => {
    const cs = state.camps[id]!;
    const here = id === state.campId;
    const types = [...new Set(c.rings.map(([, ty]) => ty).filter((ty) => ty !== 'camp'))].map((ty) => PASTURE_NAME[ty] ?? ty).join(', ');
    const growth = 1 - deg.growthPenalty * cs.degrade;
    const dCls = cs.degrade > 0.3 ? 'bad' : cs.degrade < 0.1 ? 'good' : '';
    const action = here
      ? t('ui.you_are_here_days', { daysSpent: cs.daysSpent, x: fmtNum(Math.round(gainPerDay * 1000) / 10) })
      : t('ui.move', { id, x: !near || busy ? 'disabled' : '' });
    const snowTxt = (cs.snow ?? 0) < 0.5 ? '' : t('ui.cm', { x: Math.round(cs.snow), x2: Math.round(campAccess(cfg, cs.snow) * 100) });
    return t('ui.grass', { x: t('camp.' + id), x2: c.shed ? ' 🏚' : '', x3: CAMP_HINT[id] ?? types, x4: snowTxt || '—', x5: Math.round((here ? r120 : cs.grass ?? 0) * 100), x6: (cs.hay ?? 0) > 0 ? ` · 🌾${fmtNum(cs.hay)}` : '', x7: WATER_NAME[c.water] ?? c.water, x8: c.wolfLevel === 'high' ? 'bad' : '', x9: WOLF_LEVEL_NAME[c.wolfLevel] ?? c.wolfLevel, dCls, x10: Math.round(cs.degrade * 100), x11: Math.round(cs.degrade * 100), x12: Math.round(growth * 100), action });
  }).join('');
  const lost = state.items.reduce((s, it) => s + it.amount, 0);
  return t('ui.change_camp_the_longer', { x: Math.round(deg.recoverPerDayWhenAway * 100), x2: SEASON_EMOJI[sp.season], x3: SEASON_NAME[sp.season], dayOf: sp.dayOf, days: sp.days, rows, x4: fmtNum(hours), x5: byTruck ? t('ui.by_truck') : t('ui.by_cart'), x6: state.home === 'ger' ? t('ui.with_a_ger') : t('ui.with_tents'), x7: fuel ? t('ui.fuel', { x: fmtMoney(-fuel) }) : '', x8: fmtNum(su), x9: lost > 0 ? t('ui.units_of_products_lying', { x: fmtNum(lost) }) : '', x10: busy ? t('ui.the_herder_is_busy') : !near ? t('ui.go_to_your_tent') : '' });
}

// ======================= туршилтын цэс (`) =======================
export function cheatHtml(pn: PanelCtx): string {
  const { cfg, state } = pn;
  const perf = pn.hooks.perf ? `<p><button class="btn sm ${pn.hooks.perf.on() ? 'gold' : ''}" data-act="perf">${t('ui.perf_panel', { x: pn.hooks.perf.on() ? t('ui.on') : t('ui.off') })}</button></p>` : '';
  const rows = CHEATS.map((row) => `<p>${row.map((c) => `<button class="btn sm" data-act="cheat:${c.act}">${c.label}</button>`).join(' ')}</p>`).join('') + perf;
  const camps = Object.keys(cfg.camps.camps).map((id) => `<button class="btn sm ${id === state.campId ? 'gold' : ''}" data-act="cheat:camp:${id}">${t('camp.' + id)}</button>`).join(' ');
  return t('ui.debug_menu_jump_to', { rows, camps, x: state.wolves.peaceful ? t('ui.off_261') : t('ui.on_262'), length: state.dogs.length, length2: state.animals.length });
}


// ======================= цайны газар (M5) =======================
export function teahouseHtml(pn: PanelCtx): string {
  const { cfg, state } = pn;
  const H = cfg.helpers;
  const near = nearTeahouse(cfg, state);
  const beds = bedsTotal(cfg, state);
  const used = bedsUsed(state);
  const icon = (m: { kind: string; sex: string }) => (m.kind === 'child' ? '🧒' : m.sex === 'f' ? '👩' : '👨');
  const rows = state.helpers.candidates.map((c) => {
    const who = c.members.map((m) => `${icon(m)} ${m.name}${m.kind === 'child' ? t('ui.child_collector') : ''}`).join('<br>');
    const type = c.family ? t('ui.family_comes_with_their') : t('ui.single_needs_a_bed');
    const noBed = !c.family && used + 1 > beds;
    return t('ui.days_hire', { who, type, x: t('ui.per_day', { x: fmtMoney(c.wage) }), id: c.id, x2: near && !noBed ? '' : 'disabled', x3: noBed ? t('ui.no_bed') : '' });
  }).join('');
  return t('ui.teahouse_herders_looking_for', { used, beds, x: rows ? t('ui.person_wage', { rows }) : t('ui.nobody_is_looking_for'), x2: near ? '' : t('ui.step_inside_the_teahouse'), refreshDays: H.teahouse.refreshDays });
}

// ======================= туслахууд (M5) =======================
export function helpersHtml(pn: PanelCtx): string {
  if (pn.hv.mode === 'otor') return otorHtml(pn);
  if (pn.hv.mode === 'pay') return payHtml(pn);
  const { cfg, state } = pn;
  const hs = state.helpers;
  const head = t('ui.helpers');
  if (!hs.list.length)
    return head + t('ui.you_have_no_helpers');
  const total = hs.list.reduce((s, h) => s + h.wage, 0);
  const owned = (h: Helper) => state.animals.filter((a) => a.ownerId === h.id).length + hs.otor.reduce((s, g) => s + g.animals.filter((a) => a.ownerId === h.id).length, 0);
  const icon = (h: Helper) => (h.kind === 'child' ? '🧒' : h.sex === 'f' ? '👩' : '👨');
  const herdBtn = (h: Helper, g: HerdGroup) => `<button class="btn sm ${h.task === 'herd' && h.herd === g ? 'gold' : ''}" data-act="task:${h.id}|herd|${g}">${HERD_NAME[g]}</button>`;
  const rows = hs.list.map((h) => {
    let what = '';
    let btns = '';
    if (h.kind === 'child' && h.task === 'otor') {
      const g = hs.otor.find((x) => x.collectorId === h.id);
      what = t('ui.collector_at_the_otor', { x: g ? `: ${t('camp.' + g.campId)}` : '' });
      btns = t('ui.send_home', { id: h.id });
    } else if (h.kind === 'child') {
      what = t('ui.collector_collects_milk_and');
      btns = hs.otor.filter((g) => g.collectorId === undefined).map((g) => t('ui.to_the_otor', { id: h.id, campId: g.campId, x: t('camp.' + g.campId) })).join(' ');
    }
    else if (h.task === 'otor') {
      const g = hs.otor.find((x) => x.helperId === h.id);
      const it = g ? (g.items ?? []).reduce((s2, x) => s2 + x.amount, 0) : 0;
      what = g ? t('ui.otor_animals_days', { x: t('camp.' + g.campId), length: g.animals.length, days: g.days, x2: it > 0 ? t('ui.units_of_products_go', { x: fmtNum(it) }) : '' }) : t('ui.otor_283');
      btns = t('ui.recall_from_otor', { id: h.id });
    } else if (h.trip) {
      what = t('ui.heading_to_the_sum', { x: cfg.vehicles[h.trip.vehicle].emoji, x2: fmtMinutes(Math.round(h.trip.remaining)) });
    } else {
      const auto = hs.autoTrip !== false;
      what = h.task === 'drive' ? t(auto ? 'ui.driver_sells_the_storage' : 'ui.driver_waits_for_orders', { departHour: cfg.helpers.driver.departHour }) : t('ui.herding', { x: HERD_NAME[h.herd] });
      btns = t('ui.driver_otor', { x: herdBtn(h, 'sheep'), x2: herdBtn(h, 'cow'), x3: herdBtn(h, 'horse'), x4: h.task === 'drive' ? 'gold' : '', id: h.id, id2: h.id });
      if (h.task === 'drive') btns += ' ' + t('ui.auto_trip_toggle', { cls: auto ? 'gold' : '', on: auto ? 0 : 1, departHour: cfg.helpers.driver.departHour, state: t(auto ? 'ui.on' : 'ui.off') });
    }
    const pay = h.task === 'otor' || h.trip ? '' : t('ui.pay_in_animals_fire', { id: h.id, id2: h.id });
    const own = owned(h);
    return `<tr><td>${icon(h)} <b>${h.name}</b>${h.family ? t('ui.family') : ''}<br><span class="muted">${what}</span></td>
      <td class="num">${t('ui.per_day', { x: fmtMoney(h.wage) })}<br><span class="muted">${h.prepaid > 0 ? t('ui.advance', { x: fmtMoney(h.prepaid) }) : (h.owed ?? 0) > 0 ? `<span class="bad">${t('ui.debt', { x: fmtMoney(h.owed ?? 0) })}</span>` : ''}${own ? t('ui.animals', { own }) : ''}</span></td>
      <td>${btns}<br>${pay}</td></tr>`;
  }).join('');
  return head + t('ui.wages_every_days_total', { x: fmtMoney(total), x2: bedsUsed(state), x3: bedsTotal(cfg, state), x4: spareTents(state), rows });
}

export function otorHtml(pn: PanelCtx): string {
  const { cfg, state } = pn;
  const v = pn.hv;
  const h = state.helpers.list.find((x) => x.id === v.helper);
  if (!h) return '';
  const spare = spareTents(state);
  const camps = Object.keys(cfg.camps.camps).filter((id) => id !== state.campId)
    .map((id) => `<button class="btn ${v.camp === id ? 'gold' : ''}" data-act="oc:${id}">${t('camp.' + id)}</button>`).join(' ');
  const groups = animalGroups(pn);
  const rows = groups.map((g) => {
    const n = v.counts[g.key] ?? 0;
    return t('ui.all_295', { label: g.label, length: g.list.length, key: g.key, n, key2: g.key, key3: g.key });
  }).join('');
  const n = Object.values(v.counts).reduce((s, x) => s + x, 0);
  const errs: string[] = [];
  if (spare <= 0) errs.push(t('ui.no_spare_tent_get'));
  if (state.player.place !== 'camp') errs.push(t('ui.can_be_sent_while'));
  return t('ui.send_to_otor_split', { name: h.name, spare, camps, n, rows, x: errs.length ? `<p class="bad">${errs.join(' · ')}</p>` : '', x2: errs.length || !n || !v.camp ? 'disabled' : '' });
}

export function payHtml(pn: PanelCtx): string {
  const { cfg, state } = pn;
  const h = state.helpers.list.find((x) => x.id === pn.hv.helper);
  if (!h) return '';
  const fam = state.helpers.list.filter((x) => x.familyId === h.familyId);
  const due = fam.reduce((s, x) => s + x.wage, 0);
  const prepaid = fam.reduce((s, x) => s + x.prepaid, 0);
  const rows = animalGroups(pn).map((g) => {
    const price = salePrice(g.list[0]!, cfg.animals);
    return t('ui.give_1', { label: g.label, length: g.list.length, x: fmtMoney(price), key: g.key });
  }).join('');
  return t('ui.pay_in_animals_the', { name: h.name, x: fmtMoney(due), x2: fmtMoney(prepaid), x3: due ? Math.floor(prepaid / due) : 0, rows });
}
