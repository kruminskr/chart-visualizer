import { expect } from '@playwright/test';
import { singleSeriesXlsx, multiSeriesXlsx } from '../tests/fixtures/workbooks.js';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const fixtures = {
  single: () => ({ name: 'single.xlsx', mimeType: XLSX_MIME, buffer: singleSeriesXlsx() }),
  multi: () => ({ name: 'multi.xlsx', mimeType: XLSX_MIME, buffer: multiSeriesXlsx() }),
};

/** Creates a fresh project from the dashboard and lands on its editor page. */
export async function createProject(page) {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: '+ New Project' }).click();
  await page.waitForURL(/\/project\/[\w-]+$/);
  await expect(page.getByText('Upload an Excel file to get started')).toBeVisible();
}

/** Uploads an in-memory fixture and waits for the chart SVG to render. */
export async function uploadFixture(page, fixture) {
  await page.locator('input[type="file"]').setInputFiles(fixture);
  const svg = page.locator('main svg[viewBox]');
  await expect(svg).toBeVisible();
  return svg;
}
