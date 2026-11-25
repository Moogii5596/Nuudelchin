/**
 * Алдаа барилт (T-12): `window.onerror` / `unhandledrejection` тоглоомыг зогсоохгүй. Нэг товч мэдэгдэл (throttleMs дотор давтахгүй)
 * + эхний алдаан дээр нэг удаа autosave + «Файл татах». Алдааны мессеж, stack-ыг зөвхөн console-д; хэрэглэгчид нууц мэдээлэл харуулахгүй.
 */
export interface ErrorGuardDeps {
  /** Тоглолтыг тэр дор хадгална (Autosave.saveNow('hidden')) */
  save: () => Promise<void> | void;
  /** Хэрэглэгчид нэг товч мэдэгдэл (+ «Файл татах»). saved = энэ session-д алдааны хадгалалт амжилттай болсон эсэх */
  notify: (saved: boolean) => void;
  log?: (...a: unknown[]) => void;
  now?: () => number;
  throttleMs?: number;
  /** throttle цонхонд console-д бичих алдааны дээд тоо (кадр бүр унахад секундэд 60 stack бичихгүй) */
  logPerWindow?: number;
}

/** Алдаанаас console-д бичих мөр (цэвэр) */
export function describeError(err: unknown): string {
  if (err instanceof Error) return err.stack ?? `${err.name}: ${err.message}`;
  try { return typeof err === 'string' ? err : JSON.stringify(err); } catch { return String(err); }
}

export class ErrorGuard {
  private last = -Infinity;
  /** Нийт барьсан, мэдэгдсэн тоо (тест, оношлогоо) */
  caught = 0;
  notified = 0;
  /** Алдааны хадгалалтыг session-д НЭГ л удаа: давтагдах алдаа (эвдэрсэн төлөв) сайн autosave-ийг дарж бичихгүй */
  private saveTried = false;
  private savedOk = false;
  private windowLogs = 0;
  private suppressed = 0;

  constructor(private readonly d: ErrorGuardDeps) {}

  /** Алдаа бүрийг console-д бичнэ; мэдэгдэл + хадгалалт нь throttle-ээр. Хэзээ ч throw хийхгүй */
  handle(err: unknown): boolean {
    this.caught++;
    const now = (this.d.now ?? Date.now)();
    const quiet = now - this.last < (this.d.throttleMs ?? 5000);
    // console: throttle цонхонд эхний logPerWindow алдаа; үлдсэнийг тоолж дараагийн мэдэгдэлд нэг мөрөөр
    if (!quiet || this.windowLogs < (this.d.logPerWindow ?? 5)) {
      this.windowLogs++;
      try { (this.d.log ?? console.error)('[error]', describeError(err)); } catch { /* console байхгүй */ }
    } else this.suppressed++;
    if (quiet) return false;
    this.last = now;
    this.notified++;
    if (this.suppressed) {
      try { (this.d.log ?? console.error)(`[error] … ${this.suppressed} давтагдсан алдааг алгаслаа`); } catch { /* */ }
      this.suppressed = 0;
    }
    this.windowLogs = 1;
    const log = this.d.log ?? console.error;
    const notify = (): void => { try { this.d.notify(this.savedOk); } catch { /* мэдэгдэл бүтэлгүйтвэл ч тоглоом үргэлжилнэ */ } };
    if (this.saveTried) { notify(); return true; }
    this.saveTried = true;
    // Мэдэгдлийг хадгалалт дууссаны дараа: «хадгаллаа» гэж худал хэлэхгүй
    let p: Promise<void>;
    try { p = Promise.resolve(this.d.save()); } catch (e) { p = Promise.reject(e); }
    void p.then(() => { this.savedOk = true; }, (e) => { log('[error] save', describeError(e)); }).then(notify);
    return true;
  }
}

/** window-д залгана. Буцаах функц = салгах */
export function installErrorGuard(g: ErrorGuard, win: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>): () => void {
  const onErr = (e: Event): void => { g.handle((e as ErrorEvent).error ?? (e as ErrorEvent).message ?? 'error'); };
  const onRej = (e: Event): void => { g.handle((e as PromiseRejectionEvent).reason); };
  win.addEventListener('error', onErr);
  win.addEventListener('unhandledrejection', onRej);
  return () => { win.removeEventListener('error', onErr); win.removeEventListener('unhandledrejection', onRej); };
}
