/**
 * Малын төрөл (хонь, ямаа, дараа нь үхэр, адуу): нэг төрөл = нэг модуль (sheep.ts, goat.ts…) — энэ `AnimalModel`-ийг
 * `createModel(species)`-ээр бүтээнэ. render/animals.ts зөвхөн энэ интерфейсээр ажиллана; шинэ төрөл нэмэхэд (S2 батлагдсаны дараа)
 * шинэ модуль + data/animals-look.json-д төрөл нэмэхэд хангалттай.
 */
import * as THREE from 'three';
import { animalLook, type LookSpecies, type SpeciesLook } from './config';
import { buildParts, type Colors, type Level, type PartDef } from './lod';

export interface AnimalModel {
  readonly species: LookSpecies;
  readonly look: SpeciesLook;
  parts(level: Level): PartDef[];
  /** мал бүрийн зүс (id-аас тогтмол, жингээр) */
  variantOf(id: number): number;
  /** instanceColor-ууд (хөгшин нь бүдэг) */
  colors(variant: number, old: boolean): Colors;
  isPatched(variant: number): boolean;
}

const mixHex = (a: number, b: number, k: number): number => new THREE.Color(a).lerp(new THREE.Color(b), k).getHex();
const hash = (id: number): number => { const v = Math.sin(id * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };

export function createModel(species: LookSpecies): AnimalModel {
  const look = animalLook.species[species], total = look.variants.reduce((n, v) => n + v.weight, 0), O = animalLook.age.old;
  return {
    species, look,
    parts: (level) => buildParts(species, level),
    variantOf(id) {
      let r = hash(id) * total;
      for (let i = 0; i < look.variants.length; i++) { r -= look.variants[i]!.weight; if (r < 0) return i; }
      return look.variants.length - 1;
    },
    colors(variant, old) {
      const V = look.variants[variant % look.variants.length]!;
      const wool = old ? mixHex(V.wool, O.woolTo, O.woolK) : V.wool, head = old ? mixHex(V.head, O.headTo, O.headK) : V.head;
      return { wool, head, leg: mixHex(head, wool, 0.5) };
    },
    isPatched: (variant) => look.variants[variant % look.variants.length]!.patch === true,
  };
}

/** Нас (жил) → насны шат 0–4 (+5 хөгшин): эвэр, хүйсийн толгойн сонголт */
export const ageIdxOf = (age: number, old: boolean): number => (old ? 5 : Math.min(4, Math.max(0, Math.floor(age))));
