/** Тэмдэглэл, өдрийн тайлан, замын тэмдэг, баярын мөч */
import type { Species } from '../../sim/config';
import { PRODUCTS } from '../../sim/state';
import type { DayReport } from '../../sim/sim';
import { markRead } from '../../sim/systems/journal';
import * as storage from '../../sim/systems/storage';
import { campAccess, yearOf } from '../../sim/systems/seasons';
import { SEASON_EMOJI, SEASON_NAME, PRODUCT_EMOJI, expenseName, fmtMoney, fmtNum, productName, speciesEmoji } from './names';
import { t } from '../../i18n/i18n';
import { goalGerReached } from '../../sim/systems/gerLayout';
import { formatTime } from '../../sim/clock';
import { esc, type PanelCtx } from './panelCtx';

// ======================= замын тэмдэг (M6.5) =======================
export function milestonesHtml(pn: PanelCtx): string {
  const { cfg, state } = pn;
  const row = (grp: 'stage' | 'first', id: string, desc: boolean): string => {
    const day = state.milestones.reached[id];
    return `<tr><td>${day !== undefined ? '✅' : '⬜'} <b>${t('ms.' + grp + '.' + id)}</b>${desc ? `<br><span class="muted">${t('ms.stage.' + id + '.desc')}</span>` : ''}</td><td class="num ${day !== undefined ? 'good' : 'muted'}">${day !== undefined ? t('ms.reached_day', { day }) : t('ms.not_yet')}</td></tr>`;
  };
  return `<h2>${t('ms.title')} <span class="close" data-act="close">✕</span></h2><h3>${t('ms.long_path')}</h3><table>${cfg.milestones.stages.map((d) => row('stage', d.id, true)).join('')}</table>
    <h3>${t('ms.firsts')}</h3><table>${cfg.milestones.firsts.map((d) => row('first', d.id, false)).join('')}</table>`;
}

/** Хоёр цуваа график (SVG): хонин толгой, мөнгө */
export function spark(values: number[], color: string): string {
  if (values.length < 2) return '';
  const W = 300, H = 70, lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * W).toFixed(1)},${(H - 4 - ((v - lo) / span) * (H - 8)).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none"><polyline fill="none" stroke="${color}" stroke-width="2" points="${pts}"/></svg>`;
}

/** Баярын мөч: гэр босгосон дүрслэл (🛖🔥), статистик, график, «▶ Үргэлжлүүлэх» */
export function ceremonyHtml(pn: PanelCtx): string {
  const { state } = pn;
  const S = state.stats, d = S.daily;
  const stat = (k: string, v: string | number): string => `<tr><td>${t('ms.stat.' + k)}</td><td class="num"><b>${v}</b></td></tr>`;
  return `<div style="text-align:center"><div style="font-size:56px;line-height:1.1">🛖🔥</div><h2 style="justify-content:center">${t('ms.ceremony.title')}</h2><p class="muted">${t('ms.ceremony.text')}</p></div>
    <table>${stat('days', state.time.day)}${stat('animals', state.animals.length)}${stat('income', fmtMoney(S.income))}${stat('expenses', fmtMoney(S.expenses))}${stat('births', S.births)}${stat('deaths', S.deaths)}${stat('wolfLost', S.wolfLost)}${stat('moves', S.moves)}</table>
    <div class="cols"><div><h3>${t('ms.graph.sheep')}</h3>${spark(d.map((x) => x.sheepUnits), '#7bbf5a')}</div><div><h3>${t('ms.graph.money')}</h3>${spark(d.map((x) => x.money), '#c8962c')}</div></div>
    <p style="text-align:center"><button class="btn gold big" data-act="close">${t('ms.continue')}</button></p>`;
}


export function logHtml(pn: PanelCtx): string {
  const j = pn.state.journal;
  const tabBtn = (id: 'notes' | 'report', label: string): string => `<button class="btn ${pn.logTab === id ? 'gold' : ''}" data-act="logTab:${id}">${label}</button>`;
  let html = `<h2>${t('log.title')} <span class="close" data-act="close">✕</span></h2><p class="logtabs">${tabBtn('notes', t('log.tab_notes'))} ${tabBtn('report', t('log.tab_report'))}</p>`;
  if (pn.logTab === 'notes') {
    markRead(pn.state);   // нээхэд уншсанд тооцогдоно
    const rows = j.notes.slice().reverse().map((n) => `<tr><td class="muted logwhen">${t('hud.day', { day: n.day })} · ${formatTime({ day: n.day, minute: n.minute })}</td><td class="${n.kind}">${esc(n.text)}</td></tr>`).join('');
    return html + (rows ? `<table class="lognotes">${rows}</table>` : `<p class="muted">${t('log.no_notes')}</p>`);
  }
  if (!j.reports.length) return html + `<p class="muted">${t('log.no_reports')}</p>`;
  pn.logIdx = Math.max(0, Math.min(j.reports.length - 1, pn.logIdx));
  pn.report = j.reports[pn.logIdx]!;
  html += `<p class="lognav"><button class="btn" data-act="logPrev" ${pn.logIdx > 0 ? '' : 'disabled'}>◀</button> <b>${t('hud.day', { day: pn.report.day })}</b> <span class="muted">(${pn.logIdx + 1}/${j.reports.length})</span> <button class="btn" data-act="logNext" ${pn.logIdx < j.reports.length - 1 ? '' : 'disabled'}>▶</button></p>`;
  // Тайлангийн «Маргааш өглөө ▶» хаах товч энд хэрэггүй
  return html + reportHtml(pn).replace(/<button[^>]*data-act="close"[^>]*>[^<]*<\/button>/g, '');
}

// ======================= өдрийн тайлан =======================
export function reportHtml(pn: PanelCtx): string {
  const r = pn.report!;
  const cfg = pn.cfg;
  const inc = Object.entries(r.income).filter(([, n]) => (n ?? 0) > 0);
  const exp = Object.entries(r.expenses).filter(([, n]) => (n ?? 0) > 0);
  const totalInc = inc.reduce((s, [, n]) => s + (n ?? 0), 0);
  const totalExp = exp.reduce((s, [, n]) => s + (n ?? 0), 0);
  const prods = PRODUCTS.filter((p) => (r.dropped[p] ?? 0) + (r.collected[p] ?? 0) + (r.spoiled[p] ?? 0) > 0);
  const prodRows = prods.map((p) => `<tr><td>${PRODUCT_EMOJI[p]} ${productName(p)}</td><td class="num">${fmtNum(r.dropped[p] ?? 0)}</td><td class="num">${fmtNum(r.collected[p] ?? 0)}</td><td class="num ${(r.spoiled[p] ?? 0) > 0 ? 'bad' : ''}">${fmtNum(r.spoiled[p] ?? 0)}</td></tr>`).join('');
  const cap = storage.capacity(cfg, pn.state);
  const goalSU = cfg.economy.goalSheepUnits, walls = cfg.economy.goalGerWalls;
  const profit = r.moneyEnd - r.moneyStart;
  // «Зарлага»: туслах бүрийн цалин тусдаа мөр, дараа нь бусад зардал, эцэст нийт
  const expRow = ([k, n]: [string, number]): string => `<tr><td>${k.startsWith('wage:') ? t('ui.wage_of', { name: esc(k.slice(5)) }) : expenseName(k)}</td><td class="num bad">${fmtMoney(-(n ?? 0))}</td></tr>`;
  const wageExp = exp.filter(([k]) => k.startsWith('wage:')), otherExp = exp.filter(([k]) => !k.startsWith('wage:'));
  const expRows = exp.length ? t('ui.expenses_head') + wageExp.map(expRow).join('') + otherExp.map(expRow).join('') + t('ui.expenses_total', { x: fmtMoney(-totalExp) }) : '';
  const html = t('ui.daily_report_year_money', { day: r.day, x: SEASON_EMOJI[r.season], x2: SEASON_NAME[r.season], x3: yearOf(cfg, r.day), x4: inc.map(([k, n]) => `<tr><td>${k === 'animals' ? t('ui.animals_sold') : k === 'rent' ? t('ui.house_rent') : k === 'loan' ? t('ui.bank_loan') : `${PRODUCT_EMOJI[k] ?? ''} ${productName(k)}`}</td><td class="num good">+${fmtMoney(n ?? 0)}</td></tr>`).join('') || t('ui.no_income_today'), x5: expRows, x6: profit >= 0 ? 'good' : 'bad', x7: profit >= 0 ? '+' : '', x8: fmtMoney(profit), x9: fmtMoney(r.moneyEnd), x10: fmtMoney(totalInc), x11: fmtMoney(totalExp), x12: prodRows || '<tr><td class="muted" colspan="4">—</td></tr>', x13: fmtNum(r.storageUsed), cap, animals: r.animals, x14: fmtNum(r.sheepUnits), x15: r.births ? t('ui.born', { births: r.births }) : '', x16: r.deaths ? t('ui.died', { deaths: r.deaths }) : '', x17: Math.round(r.avgCondition * 100), x18: Math.round(r.avgGutFill * 100), x19: fmtNum(Math.round(r.avgEweKg * 10) / 10), x20: wolfKillsHtml(r), x21: t('camp.' + pn.state.campId), campDays: r.campDays, x22: r.snow >= 0.5 ? t('ui.snow_cm_grazing_access', { x: Math.round(r.snow), x2: Math.round(campAccess(cfg, r.snow) * 100) }) : '', x23: r.hayFed > 0 ? t('ui.hay_bales_fed_left', { x: fmtNum(Math.round(r.hayFed * 10) / 10), x2: fmtNum(Math.round(r.hay * 10) / 10) }) : r.season === 'winter' || r.season === 'spring' ? t('ui.hay_feed_bales', { x: r.hay > 0 ? '' : 'bad', x2: fmtNum(Math.round(r.hay * 10) / 10) }) : '', x24: r.coldHit > 0 ? t('ui.animals_lost_condition_sleeping', { coldHit: r.coldHit }) : '', x25: Math.round(r.grass * 100), x26: r.campDegrade > 0.3 ? 'bad' : '', x27: Math.round(r.campDegrade * 100), x28: r.regrowthMult < 0.8 ? 'bad' : '', x29: Math.round(r.regrowthMult * 100), x30: r.campDegrade > 0.6 ? t('ui.the_pasture_is_degraded') : r.campDegrade > 0.3 ? t('ui.time_to_change_camp') : '', x31: Object.entries(r.camps).filter(([id]) => id !== pn.state.campId).map(([id, c]) => `${t('camp.' + id)} ${Math.round(c.degrade * 100)}%`).join(' · '), goalSU, walls, x32: Math.min(100, (r.sheepUnits / goalSU) * 100), x33: pn.state.home === 'ger' ? t('ui.ger_progress', { mark: goalGerReached(cfg, pn.state) ? '✅' : '⬜', label: t('ger.size.' + pn.state.homeSize), have: cfg.ger.sizes[pn.state.homeSize]!.walls, need: cfg.economy.goalGerWalls }) : t('ui.ger', { x: fmtMoney(cfg.ger.sizes[cfg.ger.home.size]!.price) }), x34: fmtNum(r.sheepUnits), goalSU2: goalSU, x35: r.goalReached ? t('ui.goal_reached') : '' });
  // M6.5: өдрийн онцлох мөр — энэ өдөр хүрсэн замын тэмдэг
  const hl = r.milestones.length ? `<p class="good">${t('ms.highlight', { x: r.milestones.map((id) => t(cfg.milestones.stages.some((s) => s.id === id) ? 'ms.stage.' + id : 'ms.first.' + id)).join(', ') })}</p>` : '';
  return html.replace('</h2>', '</h2>' + hl) + reportDetailHtml(pn, r);
}

/** 1f: тайлангийн дэлгэрэнгүй хэсгүүд — бүгд симуляцийн бүртгэлээс; хоосон хэсэг харагдахгүй */
export function reportDetailHtml(pn: PanelCtx, r: DayReport): string {
  const sec = (title: string, lines: string[]): string => (lines.length ? `<h3>${title}</h3><ul class="replist">${lines.map((l) => `<li>${l}</li>`).join('')}</ul>` : '');
  const sp = (s: string, n: number): string => `${n} ${t('species.' + s).toLowerCase()}`;
  // (а) Бүтээгдэхүүн: хэдэн мал үлдээсэн, үлдээгээгүй нь яагаад
  const yl: string[] = [];
  for (const k of ['cow', 'sheep', 'goat'] as const) {
    const y = r.yield?.[k];
    if (!y) continue;
    if (y.gave) yl.push(t('rep.gave.' + k, { n: y.gave }) + (y.outside ? ' — ' + t('rep.gave_outside', { n: y.outside }) : ''));
    const waiting = y.waiting ?? 0, young = y.young ?? 0;
    const every = k === 'cow' ? 0 : pn.cfg.products.drops[k === 'sheep' ? 'wool' : 'cashmere'].everyDays;
    const none = y.lowGut + y.lowCond + y.partial + y.dry + waiting + young;
    if (none) {
      const why = [y.lowGut ? t('rep.why_gut', { n: y.lowGut }) : '', y.lowCond ? t('rep.why_cond', { n: y.lowCond }) : '', y.partial ? t('rep.why_partial', { n: y.partial }) : '', y.dry ? t('rep.why_dry', { n: y.dry }) : '', waiting ? t('rep.why_waiting', { n: waiting, days: every }) : '', young ? t('rep.why_young', { n: young }) : ''].filter(Boolean);
      yl.push(`<span class="bad">${t('rep.none.' + k, { n: none })}</span>: ${why.join(', ')}`);
    }
  }
  // (б) Чоно
  const kills = Object.entries(r.wolfKills).filter(([, n]) => (n ?? 0) > 0);
  const wl: string[] = [];
  if (r.wolfAttacks) wl.push(t('rep.wolf_attacks', { n: r.wolfAttacks }));
  if (kills.length) wl.push(`<span class="bad">${t('rep.wolf_lost', { x: kills.map(([k, n]) => sp(k, n ?? 0)).join(', ') })}</span>`);
  const where = Object.entries(r.wolfWhere ?? {}).filter(([, n]) => (n ?? 0) > 0);
  if (where.length) wl.push(t('rep.wolf_where', { x: where.map(([k, n]) => `${t('rep.where.' + k)} ${n}`).join(', ') }));
  // (в) Малын хөдөлгөөн
  const ml: string[] = [];
  if (r.births) ml.push(`<span class="good">${t('rep.born', { n: r.births })}</span>`);
  if (r.deaths) {
    const causes = Object.entries(r.deathCauses ?? {}).filter(([, n]) => (n ?? 0) > 0).map(([k, n]) => `${t('rep.cause.' + k)} ${n}`);
    ml.push(`<span class="bad">${t('rep.died', { n: r.deaths })}</span>${causes.length ? ` (${causes.join(', ')})` : ''}`);
  }
  if (r.sold) ml.push(t('rep.sold', { n: r.sold }));
  if (r.bought) ml.push(t('rep.bought', { n: r.bought }));
  if (ml.length || kills.length) {
    if (r.animalsStart !== undefined) {
      const d = r.animals - r.animalsStart;
      ml.push(`<b>${t('rep.net', { x: (d > 0 ? '+' : '') + d, n: r.animals })}</b>`);
    }
  }
  // (г) Ирэх төллөлт
  const fl = (r.forecast ?? []).filter((f) => f.females > 0).map((f) => t('rep.forecast', { what: t('rep.birth.' + f.species), n: f.inDays, day: f.day, y: f.females, who: t('rep.dam.' + f.species) }));
  return sec(t('rep.h_yield'), yl) + sec(t('rep.h_wolf'), wl) + sec(t('rep.h_herd'), ml) + sec(t('rep.h_forecast'), fl);
}

export function wolfKillsHtml(r: DayReport): string {
  const k = Object.entries(r.wolfKills).filter(([, n]) => (n ?? 0) > 0);
  if (!k.length) return '';
  return t('ui.taken_by_wolves_keep', { x: k.map(([sp, n]) => `${speciesEmoji(sp as Species)} ${t('species.' + sp).toLowerCase()} ${n}`).join(', ') });
}
