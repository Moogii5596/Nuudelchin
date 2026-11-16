// Нүүдэлчин — service worker (src/pwa.ts). Build үед vite.config.ts энэ загвараас dist/sw.js үүсгэнэ:
// __VERSION__ — build-ийн хэш, __FILES__ — тоглоомын бүх файлын жагсаалт.
//
// Интернетгүй тоглох: анх интернеттэй нээхэд бүх файлыг утсанд хадгална (install).
// Дараа нь интернет байхгүй ч хадгалсан хувилбараар бүрэн тоглоно — тоглоом серверээс юу ч татдаггүй.
// Шинэчлэлт: интернет байвал хуудсыг сүлжээнээс авна → шинэ хувилбар гарвал шинэ sw.js суугаад хуучин кэшийг устгана.

const VERSION = '__VERSION__';
const CACHE = 'nuudel-' + VERSION;
const FILES = __FILES__;
/** Сүлжээ удаан бол (хөдөө) хадгалсан хуудсаар нээх хүлээх хугацаа */
const NAV_TIMEOUT_MS = 4000;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k.startsWith('nuudel-') && k !== CACHE) await caches.delete(k);
      await self.clients.claim();
      for (const c of await self.clients.matchAll()) c.postMessage({ type: 'offline-ready', version: VERSION });
    })(),
  );
});

const cachedPage = () => caches.match('./', { cacheName: CACHE }).then((r) => r || caches.match('index.html'));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // Шилжүүлэх код (M6.4): /api/* бүрийг кэшлэхгүй, service worker дамжуулахгүй — нэг удаагийн код кэшээс давхар уншигдах ёсгүй
  if (new URL(req.url).pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate') {
    // Хуудас: интернет байвал шинийг авч хадгална. Интернетгүй эсвэл хэт удаан бол хадгалсныг.
    e.respondWith(
      (async () => {
        const net = fetch(req).then(async (res) => {
          if (res.ok) {
            const c = await caches.open(CACHE);
            await c.put('./', res.clone());
          }
          return res;
        });
        const slow = new Promise((resolve) => setTimeout(resolve, NAV_TIMEOUT_MS, null));
        try {
          const r = await Promise.race([net, slow]);
          if (r) return r;
          return (await cachedPage()) || (await net);
        } catch {
          return (await cachedPage()) || Response.error();
        }
      })(),
    );
    return;
  }

  // JS, зураг, manifest: хадгалсныг шууд (нэр нь хэштэй тул өөрчлөгддөггүй), байхгүй бол сүлжээнээс аваад хадгална
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
