/**
 * Хашаа байшингийн дотор талын тоглоомын өгөгдөл (саад, E цэг, NPC-ийн ажлын байр, хаалганы завсар) → data/house-interiors.json.
 * Эх: лабораторийн makeInterior (render/building/interior.ts). sim нь Three.js-гүй тул энэ өгөгдлийг уншина (sim/systems/houseLayout.ts).
 * Ажиллуулах: cd game && npm run houses   (tests/buildings.test.ts нь файл шинэчлэгдсэн эсэхийг шалгана)
 */
import { writeFileSync } from 'node:fs';
import { houseInteriorData } from '../game/src/render/building/interiorData';

writeFileSync(new URL('../data/house-interiors.json', import.meta.url), JSON.stringify(houseInteriorData(), null, 1) + '\n');
console.log('data/house-interiors.json шинэчлэгдлээ');
