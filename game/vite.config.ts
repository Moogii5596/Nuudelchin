import { defineConfig } from 'vitest/config';

export default defineConfig({
  // data/ хавтас game/-ийн гадна байгаа тул dev серверт зөвшөөрнө
  server: { fs: { allow: ['..'] } },
  // three.js нь дангаараа ~500 kB тул анхааруулгын хязгаарыг өсгөнө
  build: { chunkSizeWarningLimit: 800 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
