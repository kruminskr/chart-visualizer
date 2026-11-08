#!/usr/bin/env node
// Quick visual check of the running app (start it with `npm run dev` first).
//
//   npm run screenshot                       → dashboard
//   npm run screenshot -- /project/<id>      → any path
//   npm run screenshot -- --demo             → new project with sample data uploaded
//   options: --out <file>  --mobile  --full
//
// Writes PNGs to ./screenshots/ (gitignored) and prints the path.
import { chromium, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import * as XLSX from 'xlsx';

const args = process.argv.slice(2);
const flag = n => args.includes(n);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const target = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--out') ?? '/dashboard';
const base = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;

const browser = await chromium.launch();
const context = await browser.newContext(
  flag('--mobile') ? devices['iPhone 14'] : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
);
const page = await context.newPage();
const consoleErrors = [];
page.on('console', m => m.type() === 'error' && consoleErrors.push(m.text()));
page.on('pageerror', e => consoleErrors.push(e.message));

try {
  if (flag('--demo')) {
    await page.goto(`${base}/dashboard`);
    await page.getByRole('button', { name: '+ New Project' }).click();
    await page.waitForURL(/\/project\//);
    await page.getByText('Upload an Excel file to get started').waitFor(); // editor finished loading
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Valsts budžeta izdevumi pa gadiem'], ['Gads', 'Izdevumi'],
      [2015, 7.2], [2016, 7.6], [2017, 8.1], [2018, 8.9], [2019, 9.4], [2020, 10.8], [2021, 12.1], [2022, 13.0],
    ]), 'Sheet1');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'demo.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }),
    });
    await page.locator('main svg[viewBox]').waitFor();
  } else {
    await page.goto(new URL(target, base).toString(), { waitUntil: 'networkidle' });
  }
  await page.waitForTimeout(500);

  const outDir = path.resolve('screenshots');
  await mkdir(outDir, { recursive: true });
  const name = opt('--out') ?? `${(flag('--demo') ? 'demo' : target).replace(/[^\w]+/g, '_').replace(/^_|_$/g, '') || 'root'}${flag('--mobile') ? '_mobile' : ''}.png`;
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: flag('--full') });
  console.log(`screenshot: ${file}`);
  console.log(`url: ${page.url()}`);
  if (consoleErrors.length) console.log(`console errors:\n  ${consoleErrors.join('\n  ')}`);
} finally {
  await browser.close();
}
