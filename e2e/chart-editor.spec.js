import { test, expect } from '@playwright/test';
import { createProject, fixtures, uploadFixture } from './helpers.js';

const BRAND_MAGENTA = '#E6007E';
const GRID_STROKE_MM = 0.088; // 0.25pt in mm, rounded to 3 dp

test('dashboard loads for the dev user', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
});

test('upload → bar chart renders to spec', async ({ page }) => {
  await createProject(page);
  const svg = await uploadFixture(page, fixtures.single());

  // Physical units: mm size + mm viewBox
  await expect(svg).toHaveAttribute('width', '165mm');
  await expect(svg).toHaveAttribute('height', '90mm');
  await expect(svg).toHaveAttribute('viewBox', '0 0 165 90');

  // Series 1 is always brand magenta
  const bars = svg.locator('rect');
  await expect(bars).toHaveCount(8);
  for (const fill of await bars.evaluateAll(els => els.map(e => e.getAttribute('fill')))) {
    expect(fill).toBe(BRAND_MAGENTA);
  }

  // Grid lines use 0.25pt stroke
  const strokes = await svg.locator('line').evaluateAll(els => els.map(e => Number(e.getAttribute('stroke-width'))));
  for (const s of strokes) expect(s).toBe(GRID_STROKE_MM);

  // Year labels: 4 digits first/last, 2 digits in between
  const labels = await svg.locator('text').allTextContents();
  expect(labels).toContain('2015');
  expect(labels).toContain('2022');
  for (const y of ['16', '17', '18', '19', '20', '21']) expect(labels).toContain(y);

  // Title pulled from A1
  await expect(page.getByPlaceholder('Chart title')).toHaveValue('Valsts budžeta izdevumi pa gadiem');
});

test('switching to line chart and multi-series legend', async ({ page }) => {
  await createProject(page);
  const svg = await uploadFixture(page, fixtures.multi());
  await expect(svg.getByText('Ieņēmumi')).toBeVisible();
  await expect(svg.getByText('Izdevumi')).toBeVisible();

  await page.getByRole('button', { name: 'line', exact: true }).click();
  await expect(page.locator('main svg[viewBox] path').first()).toBeVisible();
});

test('SVG export is mm-based, embeds Montserrat, has no px', async ({ page }) => {
  await createProject(page);
  await uploadFixture(page, fixtures.single());

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export SVG' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.svg$/);

  const content = await (await download.createReadStream()).toArray().then(c => Buffer.concat(c).toString('utf8'));
  expect(content).toContain('Montserrat');
  expect(content).toContain(BRAND_MAGENTA);
  expect(content).toMatch(/width="165mm"/);
  expect(content).not.toMatch(/\d\s*px/);
  // All numeric coordinates rounded to ≤3 decimals
  expect(content).not.toMatch(/="-?\d+\.\d{4,}"/);
});

test('edits autosave and survive reload', async ({ page }) => {
  await createProject(page);
  await uploadFixture(page, fixtures.single());

  const saved = page.waitForResponse(r =>
    r.request().method() === 'PUT' && /\/charts\//.test(r.url()) &&
    (r.request().postData() ?? '').includes('Autosave check') && r.ok());
  await page.getByPlaceholder('Chart title').fill('Autosave check');
  await saved;
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByPlaceholder('Chart title')).toHaveValue('Autosave check');
});
