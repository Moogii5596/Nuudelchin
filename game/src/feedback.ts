/** «💬 Санал» (T-12): data/feedback.json-ийн url-д ?v=&day=&dev= залгаж шинэ табд нээнэ. url хоосон бол товч нуугдана. */
import feedbackJson from '../../data/feedback.json';
import pkg from '../package.json';
import type { Quality } from './device';

export const FEEDBACK_URL: string = (feedbackJson as { url: string }).url.trim();

/** Хоосон эсвэл буруу (харьцангуй, http(s) биш) url → товч нуугдана; буруу тохиргоо алдааны мэдэгдэл болохгүй */
export const feedbackEnabled = (url: string = FEEDBACK_URL): boolean => {
  if (!url.length) return false;
  try { return /^https?:$/.test(new URL(url).protocol); } catch { return false; }
};

/** Цэвэр: параметр залгасан URL (байгаа query-г хадгална) */
export function buildFeedbackUrl(base: string, version: string, day: number, dev: Quality): string {
  const u = new URL(base);
  u.searchParams.set('v', version);
  u.searchParams.set('day', String(day));
  u.searchParams.set('dev', dev);
  return u.toString();
}

export function openFeedback(day: number, dev: Quality): void {
  if (!feedbackEnabled()) return;
  window.open(buildFeedbackUrl(FEEDBACK_URL, pkg.version, day, dev), '_blank', 'noopener');
}
