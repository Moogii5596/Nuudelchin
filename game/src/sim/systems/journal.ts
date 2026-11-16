/**
 * Тэмдэглэл (📜): сүүлийн мэдэгдлүүд ба өдрийн тайлангууд. Төлөвт хадгалагдана (save, шилжүүлэх код).
 * Өдрийн тайланг sim өдрийн эцэст нэмнэ; мэдэгдлийг UI (toast) нэмнэ — тоглоомын дүрэмд нөлөөлөхгүй.
 * Хязгаар: data/time.json → journal.
 */
import type { GameConfig } from '../config';
import type { GameState } from '../state';
import type { DayReport } from '../sim';

export interface JournalNote {
  day: number;
  minute: number;
  text: string;
  kind: '' | 'good' | 'bad';
}

export interface JournalState {
  /** Хуучнаас шинэ рүү */
  notes: JournalNote[];
  reports: DayReport[];
  /** Уншаагүй мэдэгдлийн тоо (📜 товчны улаан тэмдэг) */
  unread: number;
}

export function newJournal(): JournalState {
  return { notes: [], reports: [], unread: 0 };
}

export function addNote(cfg: GameConfig, state: GameState, text: string, kind: JournalNote['kind']): void {
  const j = state.journal, max = cfg.time.journal.notes;
  j.notes.push({ day: state.time.day, minute: state.time.minute, text, kind });
  if (j.notes.length > max) j.notes.splice(0, j.notes.length - max);
  j.unread = Math.min(max, j.unread + 1);
}

export function addReport(cfg: GameConfig, state: GameState, report: DayReport): void {
  const j = state.journal, max = cfg.time.journal.reportDays;
  j.reports.push(report);
  if (j.reports.length > max) j.reports.splice(0, j.reports.length - max);
}

export function markRead(state: GameState): void {
  state.journal.unread = 0;
}
