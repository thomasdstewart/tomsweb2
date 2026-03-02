import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = 'http://127.0.0.1:1313';
const targets = [
  { path: '/', file: 'home.png' },
  { path: '/posts/', file: 'posts.png' },
];

await fs.mkdir('artifacts/screenshots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

for (const target of targets) {
  const url = `${baseUrl}${target.path}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({
    path: `artifacts/screenshots/${target.file}`,
    fullPage: true,
  });
}

await browser.close();
