/**
 * Алдаа барилт (T-12): `window.onerror` / `unhandledrejection` тоглоомыг зогсоохгүй. Нэг товч мэдэгдэл + шууд autosave
 * (throttleMs дотор давтахгүй) + «Файл татах». Алдааны мессеж, stack-ыг зөвхөн console-д; хэрэглэгчид нууц мэдээлэл харуулахгүй.
 */
export interface ErrorGuardDeps {
  /** Тоглолтыг тэр дор хадгална (Autosave.saveNow('hidden')) */
  save: () => Promise<void> | void;
  /** Хэрэглэгчид нэг товч мэдэгдэл (+ «Файл татах») */
  notify: () => void;
  log?: (...a: unknown[]) => void;
  now?: () => number;
  throttleMs?: number;
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

  constructor(private readonly d: ErrorGuardDeps) {}

  /** Алдаа бүрийг console-д бичнэ; мэдэгдэл + хадгалалт нь throttle-ээр. Хэзээ ч throw хийхгүй */
  handle(err: unknown): boolean {
    this.caught++;
    try { (this.d.log ?? console.error)('[error]', describeError(err)); } catch { /* console байхгүй */ }
    const now = (this.d.now ?? Date.now)();
    if (now - this.last < (this.d.throttleMs ?? 5000)) return false;
    this.last = now;
    this.notified++;
    try { void Promise.resolve(this.d.save()).catch((e) => (this.d.log ?? console.error)('[error] save', describeError(e))); } catch (e) { (this.d.log ?? console.error)('[error] save', describeError(e)); }
    try { this.d.notify(); } catch { /* мэдэгдэл бүтэлгүйтвэл ч тоглоом үргэлжилнэ */ }
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
