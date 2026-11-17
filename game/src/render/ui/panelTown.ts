/** Сумын төвийн амьдрал (дуган, ЗДТГ, банк), машины талбай, өөр бууцанд ирэх */
import type { ProductId, VehicleId } from '../../sim/state';
import type { Command } from '../../sim/commands';
import { partySpeedKmPerMin, sellableAnimals, sellableAtShop } from '../../sim/systems/travel';
import { moveHours } from '../../sim/systems/camps';
import { campAccess } from '../../sim/systems/seasons';
import { nearLotSlot } from '../../sim/systems/sumtown';
import { bankDailyPayment, bankLimit, housePrice, nearTownDoor, zdtgPackages, zdtgRepayable } from '../../sim/systems/town';
import { CAMP_HINT, PASTURE_NAME, PRODUCT_EMOJI, WATER_NAME, WOLF_LEVEL_NAME, fmtMinutes, fmtMoney, fmtNum, unitOf } from './names';
import { t } from '../../i18n/i18n';
import { animalGroups, type PanelCtx } from './panelCtx';

// ======================= Сумын төвийн амьдрал (V3.4): дуган, ЗДТГ, банк, байшин, хамаатан =======================
export function townCommand(pn: PanelCtx, cmd: string, arg: string): Command {
  const { state } = pn;
  switch (cmd) {
    case 'donate':
      return { type: 'donate', amount: Number(arg) };
    case 'zdtgLoan':
      return { type: 'zdtgLoan', pkg: arg };
    case 'zdtgRepay':
      return { type: 'zdtgRepay', mode: arg === 'money' ? 'money' : 'animals' };
    case 'bankLoan':
      return { type: 'bankLoan', amount: Number(arg) };
    case 'bankRepay':
      return { type: 'bankRepay', amount: Number(arg) };
    case 'buyHouse':
      return { type: 'buyHouse', plot: arg };
    case 'houseMode': {
      const [plot, mode] = arg.split(',') as [string, 'empty' | 'rent' | 'child'];
      return { type: 'houseMode', plot, mode };
    }
    default: {
      // gift:<relId>,<what>  what = dairy | animals | all
      const [rel, what] = arg.split(',') as [string, string];
      const dairy: Partial<Record<ProductId, number>> = {};
      if (what !== 'animals') for (const [k, n] of Object.entries(sellableAtShop(state))) if (pn.cfg.town.relatives.giftProducts.includes(k)) dairy[k as ProductId] = n ?? 0;
      const animalIds = what !== 'dairy' ? sellableAnimals(state).map((a) => a.id) : [];
      return { type: 'gift', relative: rel, plan: { products: dairy, animalIds } };
    }
  }
}

export function townHtml(pn: PanelCtx): string {
  const { cfg, state } = pn;
  const T = state.town;
  const door = nearTownDoor(cfg, state);
  const close = '<span class="close" data-act="close">✕</span>';
  if (!door) return t('ui.sum_center_go_to', { close });
  const rep = t('ui.reputation', { x: fmtNum(T.reputation), max: cfg.town.reputation.max });
  const money = t('ui.money', { x: fmtMoney(state.money) });
  switch (door.role) {
    case 'soon':
      return t('ui.opening_very_soon', { x: t('sum3d.' + door.id), close });
    case 'temple': {
      const btns = cfg.town.temple.donations.map((a) => `<button class="btn ${state.money >= a ? 'gold' : ''}" data-act="donate:${a}" ${state.money >= a ? '' : 'disabled'}>${fmtMoney(a)}</button>`).join(' ');
      return t('ui.donating_at_the_temple', { x: t('sum3d.' + door.id), close, money, rep, reputationPer10k: cfg.town.temple.reputationPer10k, minReputation: cfg.town.zdtgLoan.minReputation, btns });
    }
    case 'zdtg': {
      const L = T.zdtgLoan, Z = cfg.town.zdtgLoan;
      let body = '';
      if (L) {
        const have = zdtgRepayable(cfg, state).length;
        const cost = Math.round(L.value * Z.moneyMult);
        body = t('ui.livestock_loan_due_on', { n: L.n, x: t('species.' + L.species).toLowerCase(), dueDay: L.dueDay, x2: L.overdue ? t('ui.overdue') : '', x3: have >= L.n ? '' : 'disabled', n2: L.n, have, x4: state.money >= cost ? '' : 'disabled', x5: fmtMoney(cost) });
      } else if (T.reputation < Z.minReputation) {
        body = t('ui.you_need_a_reputation', { minReputation: Z.minReputation });
      } else {
        body = t('ui.take_a_loan_in', { termDays: Z.termDays, moneyMult: Z.moneyMult, onTimeReputation: Z.onTimeReputation, x: zdtgPackages(cfg).map((k) => `<button class="btn gold" data-act="zdtgLoan:${k.id}">${k.n} ${t('species.' + k.species).toLowerCase()}</button>`).join(' ') });
      }
      return t('ui.the_police_station_is', { x: t('sum3d.' + door.id), close, money, rep, body });
    }
    case 'bank': {
      const L = T.bankLoan, B = cfg.town.bankLoan;
      const lim = bankLimit(cfg, state);
      let body = '';
      if (L) {
        body = t('ui.bank_daily_now', { x: fmtMoney(bankDailyPayment(state)) }) + t('ui.loan_balance_principal_per', { x: fmtMoney(L.owed), x2: fmtMoney(L.principal), x3: Math.round(B.interestPerMonth * 100), dueDay: L.dueDay, x4: [L.owed, Math.round(L.owed / 2)].map((a) => t('ui.pay', { x: state.money >= a ? 'gold' : '', a, x2: state.money >= a ? '' : 'disabled', x3: fmtMoney(a) })).join(' ') });
      } else {
        // Дүнг тоглогч сонгоно: minAmount … лимит, amountStep алхмаар
        const can = lim >= B.minAmount;
        const amt = (pn.bankAmt = can ? Math.min(lim, Math.max(B.minAmount, pn.bankAmt || B.minAmount)) : 0);
        const stepBtn = (d: number | 'min' | 'max', label: string, off: boolean): string => `<button class="btn" data-act="bankAmt:${d}" ${off ? 'disabled' : ''}>${label}</button>`;
        const pick = can
          ? `<span class="bankpick">${stepBtn('min', t('ui.bank_min'), amt <= B.minAmount)} ${stepBtn(-B.amountStep * 5, '−−', amt <= B.minAmount)} ${stepBtn(-B.amountStep, '−', amt <= B.minAmount)} <b>${fmtMoney(amt)}</b> ${stepBtn(B.amountStep, '+', amt >= lim)} ${stepBtn(B.amountStep * 5, '++', amt >= lim)} ${stepBtn('max', t('ui.bank_max'), amt >= lim)}</span><br>` +
            t('ui.bank_daily', { x: fmtMoney(Math.ceil(amt / B.termDays)) }) + '<br>' + t('ui.borrow', { a: amt, x: fmtMoney(amt) })
          : t('ui.not_enough_collateral');
        body = t('ui.borrow_against_animals_of', { x: Math.round(B.animalLtv * 100), x2: Math.round(B.houseLtv * 100), x3: fmtMoney(lim), termDays: B.termDays, x4: Math.round(B.interestPerMonth * 100), x5: pick });
      }
      return `<h2>🏦 ${t('sum3d.' + door.id)} ${close}</h2><p>${money} · ${rep}</p>${body}`;
    }
    case 'house': {
      const h = housePrice(cfg, door.id)!;
      const own = T.houses[door.id];
      if (!own) {
        return t('ui.yard_house_for_sale_196', { close, money, x: fmtMoney(h.price), x2: fmtMoney(h.rentPerDay), id: door.id, x3: state.money >= h.price ? '' : 'disabled' });
      }
      const btn = (m: string, label: string, dis = false): string => `<button class="btn ${own.mode === m ? 'gold' : ''}" data-act="houseMode:${door.id},${m}" ${dis ? 'disabled' : ''}>${label}</button>`;
      return t('ui.your_yard_house_keeping', { close, x: btn('rent', t('ui.rent_out_per_day', { x: fmtMoney(h.rentPerDay) })), x2: btn('empty', t('ui.empty_198')), x3: btn('child', t('ui.keep_your_schoolchild_here'), true) });
    }
    default: {
      const r = T.relatives[door.id];
      const R = cfg.town.relatives;
      const have = sellableAtShop(state);
      const dairy = Object.entries(have).filter(([k, n]) => R.giftProducts.includes(k) && (n ?? 0) > 0).map(([k, n]) => `${PRODUCT_EMOJI[k as ProductId]} ${fmtNum(n ?? 0)}`).join(' ');
      const animals = sellableAnimals(state).length;
      return t('ui.relatives_closeness_100_gifts', { close, x: fmtNum(r?.relation ?? 0), visitMinRelation: R.visitMinRelation, summerHelpMin: R.summerHelpMin, winterHayMin: R.winterHayMin, x2: dairy || t('ui.no_dairy'), animals, id: door.id, x3: dairy ? '' : 'disabled', id2: door.id, x4: animals ? '' : 'disabled' }) + pn.sleep.html();
    }
  }
}

// ======================= Машин худалдааны талбай (V3.3) =======================
export function lotHtml(pn: PanelCtx): string {
  const { cfg, state } = pn;
  const s = nearLotSlot(cfg, state);
  if (!s) return t('ui.move_closer_to_the', { x: t('sum3d.car_dealer') });
  const known = !s.display && s.vehicle in cfg.vehicles;
  if (!known) return t('ui.going_on_sale_soon', { x: t('sum3d.lot.' + s.vehicle) });
  const id = s.vehicle as VehicleId;
  const v = cfg.vehicles[id];
  const owned = state.vehicles.includes(id);
  const kmh = Math.round(cfg.vehicles.sumCenterKm / v.oneWayHours);
  const can = !owned && state.money >= v.price && !state.player.driving;
  return t('ui.units_of_cargo_sheep', { emoji: v.emoji, name: v.name, capacity: v.capacity, sheepSlots: v.sheepSlots, cowSlots: v.cowSlots, kmh, x: v.fuelPer100km ? t('ui.l_100_km_205', { fuelPer100km: v.fuelPer100km }) : '', x2: fmtMoney(v.price), x3: fmtMoney(state.money), x4: owned ? t('ui.you_already_own_this') : state.money < v.price ? t('ui.not_enough_money') : '', id: s.id, x5: can ? '' : 'disabled' });
}


// ======================= өөр бууцанд ирэх (газрын зураг) =======================
export function arriveHtml(pn: PanelCtx): string {
  const { cfg, state } = pn;
  const id = pn.arriveCamp;
  const c = cfg.camps.camps[id];
  const cs = state.camps[id];
  if (!c || !cs) return '';
  const deg = cfg.pasture.degradation;
  const types = [...new Set(c.rings.map(([, ty]) => ty).filter((ty) => ty !== 'camp'))].map((ty) => PASTURE_NAME[ty] ?? ty).join(', ');
  const hours = moveHours(cfg, state, false);
  const kmh = partySpeedKmPerMin(cfg, state) * 60;
  const g = state.helpers.otor.find((x) => x.campId === id);
  let otor = '';
  if (g) {
    const h = state.helpers.list.find((x) => x.id === g.helperId);
    const col = g.collectorId !== undefined ? state.helpers.list.find((x) => x.id === g.collectorId) : undefined;
    const cnt = animalGroups(pn, g.animals).map((x) => `${x.label} ${x.list.length}`).join(' · ');
    const avg = g.animals.length ? g.animals.reduce((s2, a) => s2 + a.condition, 0) / g.animals.length : 0;
    const items = (g.items ?? []).filter((it) => it.amount > 1e-9);
    const itemsTxt = items.map((it) => `${PRODUCT_EMOJI[it.product]} ${fmtNum(it.amount)} ${unitOf(it.product)}`).join(' · ');
    otor = t('ui.otor_days_average_condition', { x: h?.name ?? t('ui.herder'), x2: col ? t('ui.collector', { name: col.name }) : '', days: g.days, x3: cnt || t('ui.no_animals'), x4: Math.round(avg * 100), x5: itemsTxt ? t('ui.products', { itemsTxt }) : t('ui.no_products_collected'), x6: col ? '' : t('ui.with_no_collector_the'), id, x7: items.length ? '' : 'disabled', x8: state.player.driving ? t('ui.on_the_vehicle') : t('ui.in_hand') });
  }
  const shed = c.shed ? t('ui.sheltered_warm_camp_animals') : t('ui.plain_pen_no_shelter');
  return t('ui.snow_grass_camp_pasture', { x: t('camp.' + id), x2: CAMP_HINT[id] ?? '', x3: (cs.snow ?? 0) < 0.5 ? t('ui.no_snow') : t('ui.cm_grazing_access', { x: Math.round(cs.snow), x2: Math.round(campAccess(cfg, cs.snow) * 100) }), x4: Math.round((cs.grass ?? 0) * 100), shed, x5: (cs.hay ?? 0) > 0 ? t('ui.hay_bales', { x: fmtNum(cs.hay) }) : '', types, x6: WATER_NAME[c.water] ?? c.water, x7: WOLF_LEVEL_NAME[c.wolfLevel] ?? c.wolfLevel, x8: Math.round(cs.degrade * 100), x9: Math.round((1 - deg.growthPenalty * cs.degrade) * 100), x10: fmtMinutes(Math.round(hours * 60)), otor, x11: Math.round(kmh) });
}
