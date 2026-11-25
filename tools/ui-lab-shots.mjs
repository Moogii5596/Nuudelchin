/**
 * T-27: UI лабын (game/ui-lab.html) бодит дэлгэцийн зураг → tools/shots/ui-lab/<screen>.png (844×390, DPR 2).
 * Ажиллуулах: node tools/ui-lab-shots.mjs [calm near wheel riding] [--lang=en|mn]
 * Vite dev server-ийг өөрөө асааж, дуусмагц зогсооно. Шаардлага: `playwright` (npm i -g playwright эсвэл npx playwright install chromium).
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'tools', 'shots', 'ui-lab');
const PORT = 5197;
const args = process.argv.slice(2);
const lang = args.find((a) => a.startsWith('--lang='))?.slice(7) ?? 'en';
const screens = args.filter((a) => !a.startsWith('--'));
if (!screens.length) screens.push('calm', 'near', 'wheel', 'riding');

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: join(ROOT, 'game'), stdio: 'ignore', shell: process.platform === 'win32' });
const base = `http://localhost:${PORT}/ui-lab.html`;
try {
  for (let i = 0; ; i++) {
    if (await fetch(base).then((r) => r.ok, () => false)) break;
    if (i > 60) throw new Error('vite dev server did not start');
    await new Promise((r) => setTimeout(r, 500));
  }
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  for (const s of screens) {
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.error(`[${s}]`, e.message));
    await page.goto(`${base}?shot=${s}&lang=${lang}`);
    await page.waitForSelector('html[data-ready="1"]', { timeout: 120_000 });
    await page.screenshot({ path: join(OUT, `${s}.png`) });
    await page.close();
    console.log(`${s}.png`);
  }
  await browser.close();
} finally {
  server.kill();
}
