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

test('dashboard: dropping a file opens a project named after it, straight into the sheet picker', async ({ page }) => {
  await page.goto('/dashboard');
  const b64 = fixtures.workbook().buffer.toString('base64');
  const dt = await page.evaluateHandle(data => {
    const t = new DataTransfer();
    t.items.add(new File([Uint8Array.from(atob(data), c => c.charCodeAt(0))], 'Petijums_2026.xlsx'));
    return t;
  }, b64);
  await page.dispatchEvent('main', 'drop', { dataTransfer: dt });
  await page.waitForURL(/\/project\/[\w-]+$/);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /Create \d+ charts/ }).click();
  await expect(page.locator('[data-role="artboard"] svg')).toBeVisible();
  await expect(page.getByRole('banner').getByText('Petijums 2026')).toBeVisible();
  // The chart list shows a live thumbnail per chart
  await expect(page.getByRole('navigation', { name: 'Charts' }).locator('svg[viewBox]').first()).toBeVisible();
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

  const tabs = page.getByRole('navigation', { name: 'Charts' }).getByRole('button', { name: /^(?!Delete|\+ Add)/ });
  await expect(tabs).toHaveCount(6);

  // Sheet 4: horizontal bars grouped by country (merged cells)
  await tabs.nth(3).click();
  const svg = page.locator('[data-role="artboard"] svg');
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
  await page.getByRole('button', { name: 'Lines', exact: true }).click();
  await expect(svg.locator('path[stroke]')).toHaveCount(3);
  await expect(svg.locator('[data-role="legend"]').getByText('Igaunija')).toBeVisible();

  // First/last value labels in the line colour
  await page.getByLabel('Value labels').selectOption('ends');
  await expect(svg.locator('[data-role="value"]')).toHaveCount(6);
});

test('sort largest first and zoom to actual size', async ({ page }) => {
  await createProject(page);
  const svg = await uploadFixture(page, fixtures.single());
  await page.getByRole('button', { name: 'Horizontal' }).click();
  await page.getByLabel('Order').selectOption('desc');
  const firstLabel = await svg.locator('text').first().textContent();
  expect(firstLabel).toBe('2022'); // largest value first

  await page.getByRole('group', { name: 'Zoom' }).getByRole('button', { name: '100%' }).click();
  await expect(page.locator('figcaption')).toContainText('165 × 90 mm · 100%');
  const box = await page.locator('[data-role="artboard"]').boundingBox();
  expect(Math.round(box.width)).toBe(Math.round(165 * 96 / 25.4));
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

test('Latvian CSV → data panel: unit, exclude a row, swap rows/columns', async ({ page }) => {
  await createProject(page);
  const csv = 'Izdevumi pa gadiem\n(milj. EUR)\nGads;Latvija;Igaunija\n2019;1,5;2\n2020;;2,5\n2021;3;4,25\nKopā;4,5;8,75\n\nAvots: Eurostat\n';
  const svg = await uploadFixture(page, { name: 'dati.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });

  await expect(page.getByLabel('Axis unit (top right)')).toHaveValue('milj. EUR');
  await expect(svg.getByText('milj. EUR')).toBeVisible();

  const panel = page.getByRole('region', { name: 'Data' });
  await panel.getByRole('button', { name: /Data/ }).click();
  await expect(panel.getByText('Avots: Eurostat')).toBeVisible();
  await expect(panel.getByLabel('Igaunija, 2021')).toHaveValue('4,25'); // decimal comma read correctly
  await expect(panel.getByRole('row')).toHaveCount(5); // header + 4 rows (gap row kept)

  // Leave out the total row
  const before = await svg.locator('g[transform] rect').count();
  await panel.getByLabel('Include row Kopā').uncheck();
  await expect(svg.locator('g[transform] rect')).toHaveCount(before - 2);
  await expect(panel.getByText('1 hidden')).toBeVisible();

  // Swap: countries become categories
  await panel.getByRole('button', { name: 'Swap rows / columns' }).click();
  await expect(svg.locator('[data-role="legend"]').getByText('2019')).toBeVisible();
});

test('data panel: correct a value in place, bad input is rejected', async ({ page }) => {
  await createProject(page);
  const svg = await uploadFixture(page, fixtures.single());
  const panel = page.getByRole('region', { name: 'Data' });
  await panel.getByRole('button', { name: /Data/ }).click();

  const cell = panel.getByRole('textbox').first();
  const bar = svg.locator('g[transform] rect').first();
  const before = Number(await bar.getAttribute('height'));

  await cell.fill('abc');
  await cell.press('Enter');
  await expect(cell).not.toHaveValue('abc'); // reverted
  expect(Number(await bar.getAttribute('height'))).toBe(before);

  await cell.fill('1,5');
  await cell.press('Enter');
  await expect(cell).toHaveValue('1,5');
  await expect.poll(async () => Number(await bar.getAttribute('height'))).toBeLessThan(before);
});

test('uploading a single-sheet file into a project with a chart adds a new chart', async ({ page }) => {
  await createProject(page);
  await uploadFixture(page, fixtures.single());
  const rail = page.getByRole('navigation', { name: 'Charts' });
  await rail.locator('input[type="file"]').setInputFiles(fixtures.multi());
  await expect(rail.locator('li > button:first-child')).toHaveCount(2);
  await expect(rail.getByText('Valsts budžeta izdevumi pa gadiem')).toBeVisible(); // the first chart is untouched
  await expect(page.getByPlaceholder('Chart title')).toHaveValue('Uzņēmumu skaits Baltijas valstīs pa gadiem');
});

test('switching bars → lines keeps value labels valid; close lines get separated labels', async ({ page }) => {
  await createProject(page);
  const svg = await uploadFixture(page, fixtures.multi()); // suggested: bars with labels inside
  const settings = page.getByRole('complementary', { name: 'Chart settings' });
  await settings.getByRole('button', { name: 'Lines' }).click();
  await expect(settings.getByLabel('Value labels')).toHaveValue('none');
  await expect(svg.locator('[data-role="value"]')).toHaveCount(0);

  await settings.getByLabel('Value labels').selectOption('all');
  // Plain numbers: an SVGRect doesn't serialise out of the page. Digits are ~0.7 em tall above the baseline,
  // so labels that share x must have baselines at least that far apart, plus a small gap.
  const labels = await svg.locator('[data-role="value"]').evaluateAll(els => els.map(e => {
    const b = e.getBBox();
    return { x: b.x, w: b.width, base: Number(e.getAttribute('y')) };
  }));
  expect(labels.length).toBe(18);
  const fontMm = Number(await svg.locator('[data-role="value"]').first().getAttribute('font-size'));
  const minGap = fontMm * 0.7 + 0.4;
  for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
    const a = labels[i], b = labels[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w) expect(Math.abs(a.base - b.base), `labels ${i} and ${j}`).toBeGreaterThanOrEqual(minGap);
  }
});
