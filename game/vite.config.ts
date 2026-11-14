import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/**
 * Интернетгүй тоглох (src/pwa.ts, sw-template.js): build-ийн бүх файлын жагсаалтаар dist/sw.js үүсгэнэ.
 * Файл бүрийн нэр хэштэй тул тоглоом шинэчлэгдэхэд sw.js-ийн хувилбар өөрчлөгдөж, утсан дахь кэш шинэчлэгдэнэ.
 */
function offlineServiceWorker(): Plugin {
  const publicFiles = ['manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
  return {
    name: 'nuudel-offline-sw',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const built = Object.keys(bundle).filter((f) => !f.endsWith('.map')).sort();
      const files = ['./', ...built, ...publicFiles];
      // Файлын нэрс хэштэй (index-AbC123.js) тул тэдгээрийн жагсаалт өөрчлөгдвөл шинэ хувилбар
      const version = createHash('sha1').update(built.join('|')).digest('hex').slice(0, 10);
      const src = readFileSync(new URL('./sw-template.js', import.meta.url), 'utf8')
        .replace("const VERSION = '__VERSION__';", `const VERSION = '${version}';`)
        .replace('const FILES = __FILES__;', `const FILES = ${JSON.stringify(files)};`);
      if (src.includes("= '__VERSION__'") || src.includes('= __FILES__')) this.error('sw-template.js: орлуулах мөр олдсонгүй');
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: src });
    },
  };
}

export default defineConfig({
  plugins: [offlineServiceWorker()],
  // data/ хавтас game/-ийн гадна байгаа тул dev серверт зөвшөөрнө
  // host: true — ижил Wi-Fi-д байгаа утаснаас компьютерийн IP хаягаар нээж турших
  server: { host: true, fs: { allow: ['..'] } },
  preview: { host: true },
  // three.js нь дангаараа ~500 kB (бүтэн тоглоом ~870 kB, gzip ~240 kB) тул анхааруулгын хязгаарыг өсгөнө
  build: { chunkSizeWarningLimit: 1000 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
