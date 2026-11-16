/**
 * Монгол нэрс: малын насны шат (prototype-rules.md §8), бүтээгдэхүүн, зардал.
 * UI-д харуулах текст тул i18n/mn.json-д байх ёстой ч насны шат нь тооноос хамаарах дүрэм тул энд.
 */
import type { GameConfig, Sex, Species } from '../../sim/config';
import { t } from '../../i18n/i18n';

const YOUNG: Record<Species, string[]> = {
  sheep: [t('ui.lamb_khurga'), t('ui.young_ewe_t_l'), t('ui.yearling_sh_dlen'), t('ui.two_year_old_khyazaalan')],
  goat: [t('ui.kid_ishig'), t('ui.young_ewe_t_l'), t('ui.yearling_sh_dlen'), t('ui.two_year_old_khyazaalan')],
  cow: [t('ui.calf_tugal'), t('ui.heifer_calf_byaruu'), t('ui.yearling_sh_dlen'), t('ui.two_year_old_khyazaalan')],
  horse: [t('ui.foal_unaga'), t('ui.yearling_horse_daaga'), t('ui.yearling_sh_dlen'), t('ui.two_year_old_khyazaalan')],
};
const ADULT: Record<Species, Record<Sex, string>> = {
  sheep: { m: t('ui.ram_ereg_khon'), f: t('ui.ewe_em_khon') },
  goat: { m: t('ui.buck_ukhna'), f: t('ui.nanny_goat_em_yamaa') },
  cow: { m: t('ui.bull_bukh'), f: t('ui.cow_neg') },
  horse: { m: t('ui.horse'), f: t('ui.mare_g') },
};
const SPECIES_EMOJI: Record<Species, string> = { sheep: '🐑', goat: '🐐', cow: '🐄', horse: '🐎' };

export function stageName(cfg: GameConfig, species: Species, sex: Sex, age: number): string {
  const sp = cfg.animals.species[species];
  const y = Math.floor(age);
  if (y < sp.adultAge) {
    const n = YOUNG[species][Math.min(y, 3)]!;
    return y >= 1 ? `${sex === 'm' ? t('ui.male') : t('ui.female')} ${n.toLowerCase()}` : n;
  }
  const base = ADULT[species][sex];
  return y >= sp.oldAge ? t('ui.old', { x: base.toLowerCase() }) : base;
}

export function speciesEmoji(sp: Species): string {
  return SPECIES_EMOJI[sp];
}

export const PRODUCT_EMOJI: Record<string, string> = {
  milk: '🥛', tarag: '🥣', aaruul: '🧀', urum: '🧈', wool: '🧶', felt: '🟫', cashmere: '🪶',
};

export function productName(p: string): string {
  return t('product.' + p);
}

export function unitOf(p: string): string {
  return p === 'milk' || p === 'tarag' ? t('ui.l') : p === 'felt' ? t('ui.pcs') : t('ui.kg');
}

const EXPENSE: Record<string, string> = {
  living: t('ui.daily_food_flour_rice'),
  fuel: t('ui.fuel_355'),
  neighborBull: t('ui.neighbor_s_bull'),
  buy_animal: t('ui.animals_bought'),
  buy_processor: t('ui.equipment_bought'),
  buy_storage: t('ui.storage_upgraded'),
  buy_ger: t('ui.ger_bought'),
  buy_vehicle: t('ui.vehicle_bought'),
  buy_dog: t('ui.dog_bought'),
  dogFood: t('ui.dog_food'),
  buy_house: t('ui.yard_house_bought'),
  donation: t('ui.temple_donation'),
  zdtgLoan: t('ui.livestock_loan_repaid'),
  bankLoan: t('ui.bank_loan_repaid'),
};
export function expenseName(k: string): string {
  return EXPENSE[k] ?? k;
}

export const PROCESSOR_NAME: Record<string, string> = {
  pot: t('ui.cauldron_aaruul_dried_curd'),
  separator: t('ui.separator_churn_urum_clotted'),
  feltKit: t('ui.felt_making_kit'),
};

export function fmtMoney(n: number): string {
  const s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (n < 0 ? '−' : '') + s + '₮';
}

export function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return h ? t('ui.h_372', { h, x: m ? m + t('ui.min') : '' }).trim() : t('ui.min_373', { m });
}

/** Бэлчээрийн төрөл (data/pasture.json → types) */
export const PASTURE_NAME: Record<string, string> = {
  camp: t('ui.around_the_camp'),
  steppe: t('ui.open_steppe'),
  meadow: t('ui.river_meadow'),
  southSlope: t('ui.mountain_side'),
  foothill: t('ui.foothills'),
  northSlope: t('ui.mountain_back'),
};

/** Улирал (M5.5) */
export const SEASON_NAME: Record<string, string> = { summer: t('ui.summer'), autumn: t('ui.autumn'), winter: t('ui.winter'), spring: t('ui.spring') };
export const SEASON_EMOJI: Record<string, string> = { summer: '☀️', autumn: '🍂', winter: '❄️', spring: '🌱' };
/** Бууц аль улиралд тохирох (хэрэглэгчийн дүрэм, seasons-camps.md) */
export const CAMP_HINT: Record<string, string> = {
  river: t('ui.river_close_by_meadow'),
  northSlope: t('ui.forested_and_sheltered_snow'),
  southSlope: t('ui.sunny_and_sheltered_snow'),
  valley: t('ui.good_summer_pasture_summer'),
};

export const WATER_NAME: Record<string, string> = { river: t('ui.river_close'), stream: t('ui.stream'), spring: t('ui.spring_water') };
export const WOLF_LEVEL_NAME: Record<string, string> = { low: t('ui.low'), medium: t('ui.medium'), high: t('ui.high') };
