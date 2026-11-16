import { defineConfig } from 'vitest/config';

/** Гүйцэтгэлийн тестүүд: `npm run test:perf`. Нэг дор нэг файл (зэрэгцээгүй) — хугацаа хэмжилтэнд саад болохгүй */
export default defineConfig({
  test: { environment: 'node', include: ['tests/**/*.perf.test.ts'], fileParallelism: false },
});
