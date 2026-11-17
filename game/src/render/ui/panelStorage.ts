/** Агуулах ба боловсруулалтын цонх (B) */
import { PRODUCTS, type ProcessorKind, type ProductId } from '../../sim/state';
import * as storage from '../../sim/systems/storage';
import { recipe } from '../../sim/systems/processing';
import { productPrice } from '../../sim/systems/trip';
import { PRODUCT_EMOJI, PROCESSOR_NAME, fmtMinutes, fmtMoney, fmtNum, productName, unitOf } from './names';
import { t } from '../../i18n/i18n';
import { type PanelCtx } from './panelCtx';

// ======================= агуулах =======================
export function storageHtml(pn: PanelCtx): string {
  const { cfg, state } = pn;
  const cap = storage.capacity(cfg, state), used = storage.used(state);
  const lvlNames = [t('ui.containers_beside_the_tent'), t('ui.wooden_barn'), t('ui.large_storage')];
  const rows = PRODUCTS.map((p) => {
    const batches = state.storage.filter((b) => b.product === p);
    const n = batches.reduce((s, b) => s + b.amount, 0);
    if (n <= 1e-9) return '';
    let note = '';
    if (p === 'milk') note = t('ui.becomes_tarag_yogurt_tomorrow');
    if (p === 'tarag') {
      const old = batches.filter((b) => b.ageDays >= cfg.products.storage.milkSpoilDays - 1).reduce((s, b) => s + b.amount, 0);
      note = old > 0 ? t('ui.l_spoil_tomorrow', { x: fmtNum(old) }) : '';
    }
    return `<tr><td>${PRODUCT_EMOJI[p]} ${productName(p)}</td><td class="num">${fmtNum(n)} ${unitOf(p)}</td><td class="num">${fmtMoney(productPrice(cfg, p))}</td><td class="muted">${note}</td></tr>`;
  }).join('');
  const carry = state.player.carry;
  const carryTxt = carry.length
    ? carry.map((c) => `${PRODUCT_EMOJI[c.product]} ${fmtNum(c.amount)}`).join(' · ')
    : t('ui.empty');
  const near = Math.hypot(state.player.x - cfg.camps.home.x, state.player.z - cfg.camps.home.z) <= cfg.camps.home.storageRadius * 2;
  const procs = (Object.keys(PROCESSOR_NAME) as ProcessorKind[]).map((kind) => {
    const r = recipe(cfg, kind);
    const owned = state.processors.filter((p) => p.kind === kind);
    const recipeTxt = t('ui.h', { x: Object.entries(r.input).map(([p, n]) => `${n} ${unitOf(p)} ${productName(p).toLowerCase()}`).join(', '), x2: Object.entries(r.output).map(([p, n]) => `${n} ${unitOf(p)} ${productName(p).toLowerCase()}`).join(', '), hours: r.hours });
    if (!owned.length) return t('ui.not_available_buy_in', { x: PROCESSOR_NAME[kind], recipeTxt, x2: fmtMoney(r.price) });
    return owned.map((pr) => {
      const pending = Object.keys(pr.pending).length;
      const status = pr.remaining > 0 ? t('ui.left', { x: fmtMinutes(pr.remaining) }) : pending ? t('ui.storage_is_full_output') : t('ui.idle');
      const can = pr.remaining <= 0 && !pending && Object.entries(r.input).every(([p, n]) => storage.count(state, p as ProductId) >= n - 1e-9);
      return t('ui.start', { x: PROCESSOR_NAME[kind], recipeTxt, status, kind, x2: can && near ? '' : 'disabled' });
    }).join('');
  }).join('');
  return t('ui.storage_processing_units_1', { x: cap ? Math.min(100, (used / cap) * 100) : 0, x2: lvlNames[state.storageLevel] ?? '', x3: fmtNum(used), cap, carryTxt, x4: fmtNum(carry.reduce((s, c) => s + c.amount, 0)), carryUnits: cfg.products.carryUnits, x5: rows || t('ui.the_storage_is_empty'), procs, x6: near ? '' : t('ui.go_near_your_tent') });
}
