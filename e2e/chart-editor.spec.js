import { test, expect } from '@playwright/test';
import { createProject, fixtures, uploadFixture, uploadWorkbook } from './helpers.js';

const MAGENTA = '#E6007E';
const LIGHT_PINK = '#F29FC5';
const DARK = '#575756';
const GRID_STROKE_MM = 0.088; // 0.25pt in mm, rounded to 3 dp

const fills = loc => loc.evaluateAll(els => els.map(e => e.getAttribute('fill')));

test('dashboard loads for the dev user', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
});

test('upload → bar chart renders to spec', async ({ page }) => {
  await createProject(page);
  const svg = await uploadFixture(page, fixtures.single());

  await expect(svg).toHaveAttribute('width', '165mm');
  await expect(svg).toHaveAttribute('height', '90mm');
  await expect(svg).toHaveAttribute('viewBox', '0 0 165 90');

  const bars = svg.locator('rect');
  await expect(bars).toHaveCount(8);
  for (const f of await fills(bars)) expect(f).toBe(MAGENTA);

  const strokes = await svg.locator('line').evaluateAll(els => els.map(e => Number(e.getAttribute('stroke-width'))));
  for (const s of strokes) expect(s).toBe(GRID_STROKE_MM);

  const labels = await svg.locator('text').allTextContents();
  expect(labels).toEqual(expect.arrayContaining(['2015', '16', '17', '18', '19', '20', '21', '2022']));
  // Latvian number format: decimal comma on the y axis is not needed here (integer ticks), but no dots
  expect(labels.join(' ')).not.toMatch(/\d\.\d/);

  await expect(page.getByPlaceholder('Chart title')).toHaveValue('Valsts budžeta izdevumi pa gadiem');

  // Year format switch → all years in full
  await page.getByRole('button', { name: '2016 2017 …' }).click();
  await expect(svg.getByText('2017', { exact: true })).toBeVisible();
});

test('grouped bars use country colours and a top legend', async ({ page }) => {
  await createProject(page);
  const svg = await uploadFixture(page, fixtures.multi());
  const bars = svg.locator('g[transform] rect');
  await expect(bars).toHaveCount(18);
  expect(new Set(await fills(bars))).toEqual(new Set([LIGHT_PINK, MAGENTA, DARK]));
  const legend = svg.locator('[data-role="legend"]');
  await expect(legend.getByText('Latvija')).toBeVisible();
  // value labels inside bars are white
  expect(await svg.locator('text[fill="#FFFFFF"]').count()).toBeGreaterThan(0);

  // Stacked + horizontal
  await page.getByLabel('Stack series').check();
  await page.getByRole('button', { name: 'Horizontal' }).click();
  await expect(svg.locator('g[transform] rect')).toHaveCount(18);
});

test('workbook → sheet picker → one chart per sheet', async ({ page }) => {
  await createProject(page);
  const dialog = await uploadWorkbook(page);
  await expect(dialog.getByRole('checkbox')).toHaveCount(7);
  await expect(dialog.getByRole('checkbox').last()).toBeDisabled(); // "notes" sheet has no data
  await dialog.getByRole('button', { name: 'Create 6 charts' }).click();

  const tabs = page.getByRole('navigation', { name: 'Charts' }).getByRole('button', { name: /^(?!Delete)/ });
  await expect(tabs).toHaveCount(6);

  // Sheet 4: horizontal bars grouped by country (merged cells)
  await tabs.nth(3).click();
  const svg = page.locator('main svg[viewBox]');
  await expect(svg.getByText('Igaunija')).toBeVisible();
  expect(new Set(await fills(svg.locator('g[transform] rect')))).toEqual(new Set([MAGENTA, LIGHT_PINK, DARK]));

  // Sheet 6: long series → line with area fill, thinned year labels
  await tabs.nth(4).click();
  await expect(svg.locator('[data-role="area"]')).toHaveAttribute('fill', '#FCE5F1');
  await expect(svg.getByText('1950', { exact: true })).toBeVisible();
  await page.getByLabel('Fill area under line').uncheck();
  await expect(svg.locator('[data-role="area"]')).toHaveCount(0);

  // Sheet 7: dot plot, Baltic countries highlighted, EU as reference
  await tabs.nth(5).click();
  await expect(svg.locator('[data-role="strip"]')).toHaveCount(4);
  await expect(svg.locator('circle[data-label="Latvia"]').first()).toHaveAttribute('fill', MAGENTA);
  await expect(svg.locator('circle[data-label="Germany"]').first()).toHaveAttribute('fill', '#DADADA');
  await expect(svg.locator('[data-role="reference"]')).toHaveCount(4);

  // Charts survive a reload
  await page.reload();
  await expect(tabs).toHaveCount(6);
});

test('switching to line chart and multi-series legend', async ({ page }) => {
  await createProject(page);
  const svg = await uploadFixture(page, fixtures.multi());
  await page.getByRole('button', { name: 'Line', exact: true }).click();
  await expect(svg.locator('path[stroke]')).toHaveCount(3);
  await expect(svg.locator('[data-role="legend"]').getByText('Igaunija')).toBeVisible();
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
  expect(content).toContain(MAGENTA);
  expect(content).toMatch(/width="165mm"/);
  expect(content).not.toMatch(/\d\s*px/);
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

  await page.reload();
  await expect(page.getByPlaceholder('Chart title')).toHaveValue('Autosave check');
});
