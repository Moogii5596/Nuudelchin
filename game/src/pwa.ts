/**
 * Утсандаа суулгах (PWA). Нүүр дэлгэцэд нэмбэл апп шиг бүтэн дэлгэцээр нээгдэнэ,
 * Android-д manifest-ийн дагуу автоматаар хэвтээ байрлалд түгжигдэнэ.
 *
 *  - Android Chrome / Samsung Internet: хөтөч `beforeinstallprompt` өгнө → өөрийн «Суулгах» цонхоо гаргана.
 *  - iPhone/iPad: суулгах цонх байхгүй → «Хуваалцах → Нүүр дэлгэцэд нэмэх» заавар харуулна.
 *  - Messenger, Facebook зэрэг апп доторх хөтөч суулгаж чаддаггүй → жинхэнэ хөтчөөр нээхийг зөвлөнө.
 * Суулгах нь зөвхөн HTTPS хаяг дээр ажиллана (localhost-оос бусад http хаягаар болохгүй).
 */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const ua = navigator.userAgent;

export const isIOS: boolean = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
export const isAndroid: boolean = /Android/i.test(ua);
/** Апп доторх хөтөч (Messenger, Facebook, Instagram, TikTok …) — суулгах боломжгүй */
export const inAppBrowser: boolean = /FBAN|FBAV|FB_IAB|Messenger|Instagram|Line\/|TikTok|musical_ly|; wv\)/i.test(ua);

/** Суулгасан аппаар (нүүр дэлгэцээс) нээгдсэн эсэх */
export const installed: boolean =
  matchMedia('(display-mode: standalone)').matches ||
  matchMedia('(display-mode: fullscreen)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Android: бүтэн дэлгэц + хэвтээ түгжих боломжтой эсэх */
export const canLockLandscape: boolean =
  !isIOS && !!document.fullscreenEnabled && typeof (screen.orientation as { lock?: unknown } | undefined)?.lock === 'function';

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const notify = (): void => listeners.forEach((f) => f());

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();   // хөтчийн өөрийн жижиг мэдэгдлийг гаргахгүй — бид товчоор санал болгоно
  deferred = e as InstallEvent;
  notify();
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  justInstalled = true;
  notify();
});
let justInstalled = false;

export const pwa = {
  /** Суулгах товч харуулах уу */
  get available(): boolean {
    if (installed || justInstalled) return false;
    return !!deferred || (isIOS && !inAppBrowser);
  },
  /** Суулгах цонхыг шууд гаргаж чадах уу (Android). false бол iPhone-ы заавар */
  get native(): boolean {
    return !!deferred;
  },
  get justInstalled(): boolean {
    return justInstalled;
  },
  onChange(f: () => void): void {
    listeners.add(f);
  },
  /** Хөтчийн суулгах цонх. Хэрэглэгч зөвшөөрвөл true */
  async prompt(): Promise<boolean> {
    const d = deferred;
    if (!d) return false;
    deferred = null;   // нэг event-ийг нэг л удаа ашиглана
    await d.prompt();
    const r = await d.userChoice;
    notify();
    return r.outcome === 'accepted';
  },
};

/** Бүтэн дэлгэц + хэвтээ байрлалд түгжих (Android). Амжилттай бол true */
export async function landscapeFullscreen(): Promise<boolean> {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await o.lock?.('landscape');
    return true;
  } catch {
    return false;
  }
}

/** Service worker: Android-д суулгах нөхцөл. Кэш хийхгүй — шинэ хувилбар шууд ирнэ */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
