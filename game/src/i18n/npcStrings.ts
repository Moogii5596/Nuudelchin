/**
 * V6.3 NPC-ийн үг: `npc.<id>.1–3` (NPC бүр өөрийн 3 мөр), `npc.away` («Айлд явсан» шошго). i18n.ts-ийн нэгдсэн хүснэгтээс
 * тусдаа файл (npc.mn.json / npc.en.json) — хэл солигдоход getLang()-ээр сонгоно, олдохгүй бол монгол.
 */
import mn from './npc.mn.json';
import en from './npc.en.json';
import { getLang } from './i18n';

const tables: Record<string, Record<string, string>> = { mn, en };

export function npcText(key: string): string {
  return tables[getLang()]?.[key] ?? mn[key as keyof typeof mn] ?? key;
}
export const NPC_LINES = 3;
/** NPC-ийн n-р мөр (1–3) */
export const npcLine = (id: string, n: number): string => npcText(`npc.${id}.${((n - 1) % NPC_LINES + NPC_LINES) % NPC_LINES + 1}`);
