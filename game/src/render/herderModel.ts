/**
 * Хуучин нэрс — шинэ дүрийн сан `render/character/*` (V4.5, docs/character-design.md §4) руу дамжуулагч.
 * Дуудагчид (characters.ts, sumcenter.ts) R5-д шууд `buildCharacter`/`animateCharacter`-д шилжээд энэ файл устна.
 */
import type { Season } from '../sim/config';
import { animateCharacter, type CharacterPose } from './character/animate';
import { buildCharacter, dressCharacter, type CharacterRig } from './character/rig';
import { characterSpec, withColors, type CharacterColors } from './character/spec';

export type HerderModelColors = CharacterColors;
export type HerderPose = CharacterPose;
export type HerderRig = CharacterRig;
export type { CrowdLook, CrowdPart } from './character/crowd';
export { makeCrowdParts } from './character/crowd';

/** Тоглогч: `data/characters.json` player (дээлийн өнгийг дуудагч өгнө) */
export function makeHerderModel(colors: HerderModelColors): HerderRig {
  return buildCharacter(withColors(characterSpec('player'), colors));
}

export function dressHerderModel(rig: HerderRig, season: Season): void {
  dressCharacter(rig, season);
}

export function animateHerder(H: HerderRig, p: HerderPose): number {
  return animateCharacter(H, p);
}
