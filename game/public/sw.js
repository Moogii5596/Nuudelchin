// Нүүдэлчин — service worker (src/pwa.ts). Утсандаа суулгах нөхцөлийг хангана.
// Одоогоор юу ч кэшлэхгүй: тоглоом байнга шинэчлэгддэг тул тоглогч үргэлж сүүлийн хувилбарыг авна.
// Офлайн тоглох хэрэгтэй болбол энд кэш нэмнэ.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  /* сүлжээгээр шууд */
});
