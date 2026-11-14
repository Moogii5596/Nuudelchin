import { defineConfig } from 'vitest/config';

export default defineConfig({
  // data/ хавтас game/-ийн гадна байгаа тул dev серверт зөвшөөрнө
  // host: true — ижил Wi-Fi-д байгаа утаснаас компьютерийн IP хаягаар нээж турших
  server: { host: true, fs: { allow: ['..'] } },
  preview: { host: true },
  // three.js нь дангаараа ~500 kB (бүтэн тоглоом ~870 kB, gzip ~240 kB) тул анхааруулгын хязгаарыг өсгөнө
  build: { chunkSizeWarningLimit: 1000 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
