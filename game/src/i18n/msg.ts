/**
 * sim-ийн мессеж (`Msg` = { key, params }) → одоогийн хэлээр бичиг. Параметр нь өөр Msg байж болно (нэр томьёо), жагсаалт бол
 * таслалаар нийлнэ. sim i18n-г импортлодоггүй тул орчуулга зөвхөн энд (UI талд).
 */
import type { Msg, MsgParam } from '../sim/msg';
import { t } from './i18n';

function param(p: MsgParam): string | number {
  if (typeof p === 'string' || typeof p === 'number') return p;
  if (Array.isArray(p)) return p.map((x) => (typeof x === 'object' ? tm(x) : String(x))).join(', ');
  return tm(p as Msg);
}

export function tm(msg: Msg | string | null | undefined): string {
  if (!msg) return '';
  if (typeof msg === 'string') return msg;
  const params: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(msg.params ?? {})) params[k] = param(v);
  return t(msg.key, params);
}
