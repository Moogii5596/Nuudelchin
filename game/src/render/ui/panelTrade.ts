/** Ачаа (T), сумын төвийн дэлгүүр, худалдаачин: HTML бүтээгч */
import type { Sex, Species } from '../../sim/config';
import { PRODUCTS, type BuyOrder, type ProcessorKind, type ProductId, type VehicleId } from '../../sim/state';
import * as storage from '../../sim/systems/storage';
import { animalSlots, orderPrice, productPrice } from '../../sim/systems/trip';
import { animalRoom, atLoadingSpot, cargoSlots, cargoUnits, sellableAnimals, sellableAtShop, hayRoom } from '../../sim/systems/travel';
import { salePrice } from '../../sim/systems/animals';
import { hasDriver, spareTents } from '../../sim/systems/helpers';
import { canSellAnimals, canSellProducts, nearTradeDoor, orderAllowed } from '../../sim/systems/sumtown';
import { PRODUCT_EMOJI, PROCESSOR_NAME, fmtMoney, fmtNum, productName, speciesEmoji, stageName, unitOf } from './names';
import { t } from '../../i18n/i18n';
import { gerLadder } from '../../sim/systems/gerLayout';
import { sellableGers } from '../../sim/systems/ownGers';
import { formatTime } from '../../sim/clock';
import { nearTrader, traderBuyPrice, traderHayPrice, traderPresent } from '../../sim/systems/trader';
import { animalGroups, selectedAnimals, type PanelCtx } from './panelCtx';

export interface BuyItem {
  key: string;
  label: string;
  note: string;
  order: BuyOrder;
}

const ANIMAL_CATALOG: { key: string; species: Species; sex: Sex; age: number; note: string }[] = [
  { key: 'ewe', species: 'sheep', sex: 'f', age: 3, note: t('ui.gives_birth_gives_wool') },
  { key: 'ram', species: 'sheep', sex: 'm', age: 3, note: t('ui.a_breeding_ram_for') },
  { key: 'goatF', species: 'goat', sex: 'f', age: 3, note: t('ui.gives_cashmere') },
  { key: 'buck', species: 'goat', sex: 'm', age: 3, note: t('ui.breeding_buck_for_goats') },
  { key: 'cowF', species: 'cow', sex: 'f', age: 4, note: t('ui.gives_a_calf_and') },
  { key: 'bull', species: 'cow', sex: 'm', age: 4, note: t('ui.with_a_bull_you') },
  { key: 'mare', species: 'horse', sex: 'f', age: 4, note: t('ui.horses_115') },
];

export function buyItems(pn: PanelCtx): BuyItem[] {
  const { cfg, state } = pn;
  const out: BuyItem[] = [];
  for (const kind of Object.keys(PROCESSOR_NAME) as ProcessorKind[]) {
    if (state.processors.some((p) => p.kind === kind)) continue;
    out.push({ key: 'proc:' + kind, label: PROCESSOR_NAME[kind]!, note: t('ui.makes_dairy_products_and'), order: { kind: 'processor', id: kind } });
  }
  const next = cfg.storage.levels[state.storageLevel + 1];
  if (next) out.push({ key: 'storage', label: state.storageLevel === 0 ? t('ui.wooden_barn') : t('ui.large_storage'), note: t('ui.capacity_units', { capacity: next.capacity }), order: { kind: 'storage' } });
  // M6.13: гэрийн хэмжээний шат — дараагийн (томсгох) хэмжээг л санал болгоно; үнэ = шинэ үнэ − одоогийнхоо буцаан тооцох хувь
  const ladder = gerLadder(cfg.ger), nextSize = ladder[state.home === 'ger' ? ladder.indexOf(state.homeSize) + 1 : 0];
  if (nextSize) out.push({ key: 'ger:' + nextSize, label: t('ui.ger_size', { x: t('ger.size.' + nextSize) }), note: t('ui.ger_size_note', { storage: cfg.ger.sizes[nextSize]!.storage, walls: cfg.ger.sizes[nextSize]!.walls }), order: { kind: 'ger', size: nextSize } });
  if (state.dogs.length < cfg.dogs.maxDogs) out.push({ key: 'dog', label: t('ui.dog_bankhar'), note: t('ui.10_m_protection_zone', { x: fmtMoney(cfg.dogs.foodPerDay) }), order: { kind: 'dog' } });
  if (state.home === 'ger') for (const size of gerLadder(cfg.ger)) out.push({ key: 'gerAdd:' + size, label: t('ui.ger_add', { x: t('ger.size.' + size) }), note: t('ui.ger_add_note', { walls: cfg.ger.sizes[size]!.walls }), order: { kind: 'gerAdd', size } });   // M6.13: гэр бүр 1 ганц бие туслахын ор
  out.push({ key: 'otorTent', label: t('ui.otor_tent'), note: t('ui.sending_a_herder_to', { x: spareTents(state) }), order: { kind: 'otorTent' } });
  for (const id of ['horseCart', 'porter', 'amjirgaa'] as const) {
    if (state.vehicles.includes(id)) continue;
    const v = cfg.vehicles[id];
    const kmh = Math.round(cfg.vehicles.sumCenterKm / v.oneWayHours);
    out.push({ key: id, label: `${v.emoji} ${v.name}${v.truck ? t('ui.truck') : ''}`, note: t('ui.units_sheep_cattle_km', { capacity: v.capacity, sheepSlots: v.sheepSlots, cowSlots: v.cowSlots, kmh, x: v.fuelPer100km ? t('ui.l_100_km', { fuelPer100km: v.fuelPer100km }) : '' }), order: { kind: 'vehicle', id } });
  }
  return out;
}

export function vehicleButtons(pn: PanelCtx): string {
  const { cfg, state } = pn;
  const d = pn.draft!;
  const here = state.fleet.filter((f) => f.place === state.player.place);
  const btn = (id: VehicleId | null, label: string) => `<button class="btn ${id === d.vehicle ? 'gold' : ''}" data-act="veh:${id ?? ''}">${label}</button>`;
  return here.map((f) => btn(f.id, `${cfg.vehicles[f.id].emoji} ${cfg.vehicles[f.id].name}`)).join(' ');
}

export function cargoList(pn: PanelCtx): string {
  const { cfg, state } = pn;
  const d = pn.draft!;
  const f = d.vehicle ? state.fleet.find((x) => x.id === d.vehicle) : null;
  if (!f) return '';
  const v = cfg.vehicles[f.id];
  const prod = Object.entries(f.cargo).map(([p, n]) => `${PRODUCT_EMOJI[p as ProductId]} ${fmtNum(n ?? 0)} ${unitOf(p)}`).join(' · ');
  const an = animalGroups(pn, f.animals).map((g) => `${g.label} ${g.list.length}`).join(' · ');
  const ord = f.orders.length ? t('ui.item_s', { length: f.orders.length }) : '';
  const parts = [prod, an, ord].filter(Boolean).join(' · ');
  return t('ui.cargo_units_animals_slots', { x: fmtNum(cargoUnits(f)), capacity: v.capacity, x2: fmtNum(cargoSlots(cfg, f)), sheepSlots: v.sheepSlots, x3: parts ? ` — ${parts}` : t('ui.empty_148') });
}


// ======================= ачаа (хотонд, T) =======================
export function cargoHtml(pn: PanelCtx): string {
  const { cfg, state } = pn;
  const d = pn.draft!;
  const p = state.player;
  const carried = p.carry.reduce((s, c) => s + c.amount, 0);
  const room = Math.max(0, cfg.products.carryUnits - carried);
  const takeUnits = Object.values(d.take).reduce((s, n) => s + (n ?? 0), 0);
  const nearStore = Math.hypot(p.x - cfg.camps.home.x, p.z - cfg.camps.home.z) <= cfg.camps.home.storageRadius * 2;
  const takeRows = PRODUCTS.map((pr) => {
    const have = storage.count(state, pr);
    if (have <= 1e-9) return '';
    const n = d.take[pr] ?? 0;
    return t('ui.all', { x: PRODUCT_EMOJI[pr], x2: productName(pr), x3: fmtNum(have), x4: unitOf(pr), x5: fmtMoney(productPrice(cfg, pr)), pr, x6: fmtNum(n), pr2: pr, pr3: pr });
  }).join('');
  let html = d.atVehicle ? t('ui.cart_cargo_head') : t('ui.prepare_goods_for_the', { x: fmtNum(carried), carryUnits: cfg.products.carryUnits, x2: takeRows || t('ui.storage_is_empty'), x3: takeUnits > 0 && takeUnits <= room + 1e-9 && nearStore ? '' : 'disabled', x4: fmtNum(takeUnits), x5: !nearStore ? t('ui.go_to_the_storage') : takeUnits > room + 1e-9 ? t('ui.your_hands_only_hold', { x: fmtNum(room) }) : '' });

  // Морьтой: мал тууж явах
  const groups = animalGroups(pn);
  if (p.mounted && !d.atVehicle) {
    const rows = groups.map((g) => {
      const n = d.sellGroups[g.key] ?? 0;
      return `<tr><td>${g.label} <span class="muted">(${g.list.length})</span></td><td class="num">~${fmtMoney(salePrice(g.list[0]!, cfg.animals))}</td>
        <td class="ctl"><button class="btn sm" data-act="ag-:${g.key}">−</button><b>${n}</b><button class="btn sm" data-act="ag+:${g.key}">+</button></td></tr>`;
    }).join('');
    if (!d.vehicle) html += t('ui.riding_drive_animals_behind', { x: fmtNum(cfg.vehicles.riding.droveKmh), rows });
  }
  if (!state.fleet.some((f) => f.place === 'camp')) {
    html += t('ui.you_have_no_cart');
    return html;
  }
  html += d.atVehicle ? `<p>${vehicleButtons(pn)}</p>` : t('ui.load_onto_cart_vehicle', { x: vehicleButtons(pn) });
  const f = d.vehicle ? state.fleet.find((x) => x.id === d.vehicle) : null;
  if (!f) return html;
  const v = cfg.vehicles[f.id];
  const atSpot = atLoadingSpot(cfg, state, f);
  const loadUnits = Object.values(d.sell).reduce((s, n) => s + (n ?? 0), 0);
  const loadRows = PRODUCTS.map((pr) => {
    const have = storage.count(state, pr);
    if (have <= 1e-9) return '';
    const n = d.sell[pr] ?? 0;
    return t('ui.all_158', { x: PRODUCT_EMOJI[pr], x2: productName(pr), x3: fmtNum(have), x4: unitOf(pr), x5: fmtMoney(productPrice(cfg, pr)), pr, x6: fmtNum(n), pr2: pr, pr3: pr });
  }).join('');
  const animalRows = groups.map((g) => {
    const n = d.sellGroups[g.key] ?? 0;
    return `<tr><td>${g.label} <span class="muted">(${g.list.length})</span></td><td class="num">~${fmtMoney(salePrice(g.list[0]!, cfg.animals))}</td>
      <td class="ctl"><button class="btn sm" data-act="ag-:${g.key}">−</button><b>${n}</b><button class="btn sm" data-act="ag+:${g.key}">+</button></td></tr>`;
  }).join('');
  const loadSlots = selectedAnimals(pn, groups).reduce((s, a) => s + animalSlots(cfg, f.id, a.species), 0);
  const errs: string[] = [];
  if (cargoUnits(f) + loadUnits > v.capacity + 1e-9) errs.push(t('ui.cargo_does_not_fit', { capacity: v.capacity }));
  if (cargoSlots(cfg, f) + loadSlots > v.sheepSlots + 1e-9) errs.push(t('ui.animals_do_not_fit', { sheepSlots: v.sheepSlots, cowSlots: v.cowSlots }));
  if (!atSpot) errs.push(t('ui.bring_your_vehicle_next'));
  html += cargoList(pn) + t('ui.load_from_storage_price', { x: loadRows || t('ui.storage_is_empty'), animalRows, x2: errs.length ? `<p class="bad">${errs.join(' · ')}</p>` : '', x3: errs.length || (!loadUnits && !loadSlots) ? 'disabled' : '', x4: atSpot && (cargoUnits(f) || f.animals.length || f.orders.length) ? '' : 'disabled' });
  if (d.atVehicle) {
    const ready = hasDriver(state) && cargoUnits(f) > 1e-9 && !f.animals.length && !f.orders.length && state.player.driving !== f.id;
    // Тэргэн дээрх ачааны нийт үнэ (одоогийн үнээр, ойролцоо — жолооч хүрэх үеийн үнээр зарна)
    const total = PRODUCTS.reduce((sum, pr) => sum + (f.cargo[pr] ?? 0) * productPrice(cfg, pr), 0);
    html += t('ui.cart_send', { x: ready ? '' : 'disabled', x2: hasDriver(state) ? '' : t('ui.cart_send_no_driver'), total: fmtMoney(Math.round(total)) });
  }
  return html;
}


// ======================= Худалдаачин (сумын төвд, E/T) =======================
export function shopHtml(pn: PanelCtx): string {
  const { cfg, state } = pn;
  const d = pn.draft!;
  const p = state.player;
  // V3.3: дэлгүүр бүр өөр үүрэгтэй — зөвхөн тухайн дэлгүүрийн хэсгүүд харагдана
  const door = nearTradeDoor(cfg, state);
  const near = !!door;
  const role = door?.role ?? null;
  const f = p.driving ? state.fleet.find((x) => x.id === p.driving) : null;
  const have = sellableAtShop(state);
  const sellRows = PRODUCTS.map((pr) => {
    const n0 = have[pr] ?? 0;
    if (n0 <= 1e-9) return '';
    const n = d.sell[pr] ?? 0;
    return t('ui.all_158', { x: PRODUCT_EMOJI[pr], x2: productName(pr), x3: fmtNum(n0), x4: unitOf(pr), x5: fmtMoney(productPrice(cfg, pr)), pr, x6: fmtNum(n), pr2: pr, pr3: pr });
  }).join('');
  const groups = animalGroups(pn, sellableAnimals(state));
  const animalRows = groups.map((g) => {
    const n = d.sellGroups[g.key] ?? 0;
    return `<tr><td>${g.label} <span class="muted">(${g.list.length})</span></td><td class="num">~${fmtMoney(salePrice(g.list[0]!, cfg.animals))}</td>
      <td class="ctl"><button class="btn sm" data-act="ag-:${g.key}">−</button><b>${n}</b><button class="btn sm" data-act="ag+:${g.key}">+</button></td></tr>`;
  }).join('');
  const buyAnimalRows = ANIMAL_CATALOG.map((c) => {
    const n = d.buyAnimals[c.key] ?? 0;
    const price = orderPrice(cfg, state, { kind: 'animal', species: c.species, sex: c.sex, age: c.age });
    return `<tr><td>${speciesEmoji(c.species)} ${stageName(cfg, c.species, c.sex, c.age)} <span class="muted">${c.note}</span></td><td class="num">${fmtMoney(price)}</td>
      <td class="ctl"><button class="btn sm" data-act="ba-:${c.key}">−</button><b>${n}</b><button class="btn sm" data-act="ba+:${c.key}">+</button></td></tr>`;
  }).join('');
  const hayMax = hayRoom(cfg, state);
  const hayRow = t('ui.hay_bales_fed_automatically', { sheepDaysPerBale: cfg.seasons.hay.sheepDaysPerBale, hayMax, x: f ? t('ui.free_vehicle_slots') : t('ui.riding'), x2: fmtNum(state.camps[state.campId]?.hay ?? 0), x3: fmtMoney(cfg.seasons.hay.price), hay: d.hay });
  const itemRows = (role === 'feed' ? hayRow : '') + buyItems(pn).filter((it) => role !== null && orderAllowed(role, it.order)).map((it) => {
    const on = d.buyItems.has(it.key);
    return `<tr><td>${it.label} <span class="muted">${it.note}</span></td><td class="num">${fmtMoney(orderPrice(cfg, state, it.order))}</td>
      <td class="ctl"><button class="btn sm ${on ? 'gold' : ''}" data-act="bi:${it.key}">${on ? t('ui.will_take') : t('ui.take')}</button></td></tr>`;
  }).join('');
  const plan = shopPlan(pn);
  const income = Object.entries(plan.sell).reduce((s, [k, n]) => s + (n ?? 0) * productPrice(cfg, k as ProductId), 0)
    + sellableAnimals(state).filter((a) => plan.sellAnimalIds.includes(a.id)).reduce((s, a) => s + salePrice(a, cfg.animals), 0);
  const cost = plan.buy.reduce((s, o) => s + orderPrice(cfg, state, o), 0);
  const after = state.money + income - cost;
  const buySlots = plan.buy.reduce((s, o) => s + (o.kind === 'animal' ? (f ? animalSlots(cfg, f.id, o.species) : 1) : 0), 0);
  const freed = f ? sellableAnimals(state).filter((a) => plan.sellAnimalIds.includes(a.id)).reduce((s, a) => s + animalSlots(cfg, f.id, a.species), 0) : 0;
  const roomOk = buySlots <= animalRoom(cfg, state) + freed + 1e-9;
  const how = f ? `${cfg.vehicles[f.id].emoji} ${cfg.vehicles[f.id].name}` : t('ui.mounted');
  const animalNote = f ? t('ui.animals_you_buy_are', { x: cfg.vehicles[f.id].sheepSlots, x2: cfg.vehicles[f.id].cowSlots }) : t('ui.if_riding_you_drive', { x: fmtNum(cfg.vehicles.riding.droveKmh) });
  const empty = !Object.keys(plan.sell).length && !plan.sellAnimalIds.length && !plan.buy.length;
  const title = door ? t(`sum3d.${door.id}`) : t('ui.shop');
  if (!role) {
    return t('ui.go_to_the_shop', { title });
  }
  const sellSec = canSellProducts(role) ? t('ui.sell_price', { x: sellRows || t('ui.nothing_to_sell_bring') }) : '';
  const animalSec = canSellAnimals(role)
    ? t('ui.buy_animals_price', { x: groups.length ? t('ui.sell_animals_price', { animalRows }) : '', buyAnimalRows, animalNote }) : '';
  const itemSec = itemRows ? t('ui.buy_goods_price', { itemRows }) : '';
  return t('ui.money_income_expenses_after', { title, how, x: fmtMoney(state.money), x2: f ? ' · ' : '', x3: cargoList(pn).replace(/^<p>|<\/p>$/g, ''), sellSec, animalSec, itemSec: itemSec + (role === 'ger_tent' ? gerSellHtml(pn) : ''), x4: fmtMoney(income), x5: fmtMoney(cost), x6: after < 0 ? 'bad' : '', x7: fmtMoney(after), x8: !roomOk ? t('ui.the_animals_you_want') : '', x9: after < 0 ? t('ui.not_enough_money_items') : '', x10: empty || !near ? 'disabled' : '', x11: role === 'livestock' ? t('ui.use_the_neighbor_s', { x: state.neighborBull ? 'checked' : '', x2: fmtMoney(cfg.economy.neighborBullFee) }) : '' });
}



/** Явуулын худалдаачин (M6.12): бүтээгдэхүүнийг дэлгүүрээс хямд авна, боодол өвс зарна */
export function traderHtml(pn: PanelCtx): string {
  const { cfg, state } = pn;
  const v = traderPresent(state);
  if (!v) return `<h2>${t('trader.title', { kind: '' })} <span class="close" data-act="close">✕</span></h2><p class="bad">${t('sim.the_trader_is_not_here')}</p>`;
  const K = cfg.trader.kinds[v.kind]!;
  const have = sellableAtShop(state);
  const rows = K.products.filter((p) => (have[p] ?? 0) > 1e-9).map((p) => {
    const n0 = have[p] ?? 0, n = pn.tr.sell[p] ?? 0;
    return `<tr><td>${PRODUCT_EMOJI[p]} ${productName(p)} <span class="muted">(${fmtNum(n0)} ${unitOf(p)})</span></td><td class="num">${fmtMoney(traderBuyPrice(cfg, v.kind, p))}</td><td class="ctl"><button class="btn sm" data-act="tr-:${p}">−</button><b>${fmtNum(n)}</b><button class="btn sm" data-act="tr+:${p}">+</button><button class="btn sm" data-act="trAll:${p}">${t('trader.all')}</button></td></tr>`;
  }).join('');
  const income = K.products.reduce((s, p) => s + (pn.tr.sell[p] ?? 0) * traderBuyPrice(cfg, v.kind, p), 0);
  const hayCost = pn.tr.hay * traderHayPrice(cfg, v.kind);
  const near = nearTrader(cfg, state);
  const until = formatTime({ day: state.time.day, minute: v.to });
  return `<h2>${t('trader.title', { kind: t('trader.kind.' + v.kind) })} <span class="close" data-act="close">✕</span></h2><p class="muted">${t('trader.until', { until })}</p>
    ${near ? '' : `<p class="bad">${t('trader.far')}</p>`}
    <h3>${t('trader.sell', { pct: Math.round(K.buyMult * 100) })}</h3><table>${rows || `<tr><td class="muted">${t('trader.nothing')}</td></tr>`}</table>
    <h3>${t('trader.hay', { left: v.hay })}</h3><table><tr><td>🌾 ${fmtMoney(traderHayPrice(cfg, v.kind))}</td><td class="ctl"><button class="btn sm" data-act="trh-:1">−</button><b>${pn.tr.hay}</b><button class="btn sm" data-act="trh+:1">+</button></td></tr></table>
    <table><tr class="total"><td>${t('trader.income')}</td><td class="num">+${fmtMoney(income)}</td></tr><tr class="total"><td>${t('trader.expenses')}</td><td class="num">−${fmtMoney(hayCost)}</td></tr></table>
    <p><button class="btn gold" data-act="doTrader" ${near && (income > 0 || pn.tr.hay > 0) ? '' : 'disabled'}>${t('trader.do')}</button></p>`;
}

/** Гэр зарах (M6.13): гэр/майхны дэлгүүрт үнийн 50%; сүүлийн гэрийг зарахгүй */
export function gerSellHtml(pn: PanelCtx): string {
  const { cfg, state } = pn;
  const rows = sellableGers(cfg, state).map((g) => `<tr><td>🛖 ${t('ger.size.' + g.size)}${g.index === 0 ? ' <span class="muted">(' + t('ui.main_ger') + ')</span>' : ''}</td><td class="num">+${fmtMoney(g.price)}</td><td class="ctl"><button class="btn sm" data-act="sellGer:${g.index}">${t('ui.sell')}</button></td></tr>`).join('');
  return rows ? `<h3>${t('ui.sell_gers')}</h3><table>${rows}</table>` : '';
}


export function shopPlan(pn: PanelCtx): { sell: Partial<Record<ProductId, number>>; sellAnimalIds: number[]; buy: BuyOrder[] } {
  const d = pn.draft!;
  const role = nearTradeDoor(pn.cfg, pn.state)?.role ?? null;
  const sell: Partial<Record<ProductId, number>> = {};
  if (role && canSellProducts(role)) for (const [k, n] of Object.entries(d.sell)) if ((n ?? 0) > 0) sell[k as ProductId] = n;
  const sellAnimalIds = role && canSellAnimals(role) ? selectedAnimals(pn, animalGroups(pn, sellableAnimals(pn.state))).map((a) => a.id) : [];
  const buy: BuyOrder[] = [];
  for (const c of ANIMAL_CATALOG) for (let i = 0; i < (d.buyAnimals[c.key] ?? 0); i++) buy.push({ kind: 'animal', species: c.species, sex: c.sex, age: c.age });
  for (const it of buyItems(pn)) if (d.buyItems.has(it.key)) buy.push(it.order);
  if (d.hay > 0) buy.push({ kind: 'hay', n: d.hay });
  return { sell, sellAnimalIds, buy: buy.filter((o) => role !== null && orderAllowed(role, o)) };
}
