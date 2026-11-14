/**
 * Монгол нэрс: малын насны шат (prototype-rules.md §8), бүтээгдэхүүн, зардал.
 * UI-д харуулах текст тул i18n/mn.json-д байх ёстой ч насны шат нь тооноос хамаарах дүрэм тул энд.
 */
import type { GameConfig, Sex, Species } from '../../sim/config';
import { t } from '../../i18n/i18n';

const YOUNG: Record<Species, string[]> = {
  sheep: ['Хурга', 'Төлөг', 'Шүдлэн', 'Хязаалан'],
  goat: ['Ишиг', 'Төлөг', 'Шүдлэн', 'Хязаалан'],
  cow: ['Тугал', 'Бяруу', 'Шүдлэн', 'Хязаалан'],
  horse: ['Унага', 'Даага', 'Шүдлэн', 'Хязаалан'],
};
const ADULT: Record<Species, Record<Sex, string>> = {
  sheep: { m: 'Эрэг хонь', f: 'Эм хонь' },
  goat: { m: 'Ухна', f: 'Эм ямаа' },
  cow: { m: 'Бух', f: 'Үнээ' },
  horse: { m: 'Морь', f: 'Гүү' },
};
const SPECIES_EMOJI: Record<Species, string> = { sheep: '🐑', goat: '🐐', cow: '🐄', horse: '🐎' };

export function stageName(cfg: GameConfig, species: Species, sex: Sex, age: number): string {
  const sp = cfg.animals.species[species];
  const y = Math.floor(age);
  if (y < sp.adultAge) {
    const n = YOUNG[species][Math.min(y, 3)]!;
    return y >= 1 ? `${sex === 'm' ? 'Эр' : 'Эм'} ${n.toLowerCase()}` : n;
  }
  const base = ADULT[species][sex];
  return y >= sp.oldAge ? `Хөгшин ${base.toLowerCase()}` : base;
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
  return p === 'milk' || p === 'tarag' ? 'л' : p === 'felt' ? 'ш' : 'кг';
}

const EXPENSE: Record<string, string> = {
  living: 'Өдөр тутмын хүнс (гурил, будаа, цай)',
  fuel: 'Бензин',
  neighborBull: 'Хөршийн бух',
  buy_animal: 'Мал авсан',
  buy_processor: 'Төхөөрөмж авсан',
  buy_storage: 'Агуулах томруулсан',
  buy_ger: 'Гэр авсан',
  buy_vehicle: 'Тээвэр авсан',
  buy_dog: 'Нохой авсан',
  dogFood: 'Нохойн хоол',
};
export function expenseName(k: string): string {
  return EXPENSE[k] ?? k;
}

export const PROCESSOR_NAME: Record<string, string> = {
  pot: 'Тогоо (ааруул)',
  separator: 'Сепаратор, бүлүүр (өрөм)',
  feltKit: 'Эсгий хийх хэрэгсэл',
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
  return h ? `${h} цаг ${m ? m + ' мин' : ''}`.trim() : `${m} мин`;
}

/** Бэлчээрийн төрөл (data/pasture.json → types) */
export const PASTURE_NAME: Record<string, string> = {
  camp: 'бууцны орчим',
  steppe: 'тал хээр',
  meadow: 'голын нуга',
  southSlope: 'уулын өвөр',
  foothill: 'уулын бэл',
  northSlope: 'уулын ар',
};

/** Улирал (M5.5) */
export const SEASON_NAME: Record<string, string> = { summer: 'Зун', autumn: 'Намар', winter: 'Өвөл', spring: 'Хавар' };
export const SEASON_EMOJI: Record<string, string> = { summer: '☀️', autumn: '🍂', winter: '❄️', spring: '🌱' };
/** Бууц аль улиралд тохирох (хэрэглэгчийн дүрэм, seasons-camps.md) */
export const CAMP_HINT: Record<string, string> = {
  river: 'Гол ойрхон, нуга — зун',
  northSlope: 'Ой ихтэй, саравчтай. Цас удаан тогтож доор нь өвс хадгалагдана — хавар',
  southSlope: 'Нартай, саравчтай. Цас хурдан хайлж өвөл бэлчинэ — өвөл',
  valley: 'Зуны сайхан бэлчээр — зун, намар. Өвөл цасанд дарагдана',
};

export const WATER_NAME: Record<string, string> = { river: 'Гол (ойрхон)', stream: 'Горхи', spring: 'Булаг' };
export const WOLF_LEVEL_NAME: Record<string, string> = { low: 'бага', medium: 'дунд', high: 'өндөр' };
