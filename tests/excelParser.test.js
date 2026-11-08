import { describe, expect, it } from 'vitest';
import { parseWorkbook, normalizeData } from '@/utils/excelParser';
import { invalidXlsx, laserLikeXlsx, multiSeriesXlsx, singleSeriesXlsx } from './fixtures/workbooks';

const byName = (wb, n) => wb.sheets.find(s => s.name === n);

describe('parseWorkbook', () => {
  it('parses a single-series sheet with title and header', () => {
    const s = parseWorkbook(singleSeriesXlsx()).sheets[0];
    expect(s.error).toBeNull();
    expect(s.title).toBe('Valsts budžeta izdevumi pa gadiem');
    expect(s.data.series).toEqual([{ name: 'Izdevumi', values: [7.2, 7.6, 8.1, 8.9, 9.4, 10.8, 12.1, 13] }]);
    expect(s.data.categories[0]).toEqual({ label: '2015' });
  });

  it('skips a blank row between title and header; reads several series', () => {
    const s = parseWorkbook(multiSeriesXlsx()).sheets[0];
    expect(s.data.series.map(x => x.name)).toEqual(['Igaunija', 'Latvija', 'Lietuva']);
    expect(s.suggested.type).toBe('bar');
  });

  const wb = parseWorkbook(laserLikeXlsx());

  it('reads every usable sheet and flags the unusable one', () => {
    expect(wb.sheets.map(s => s.name)).toEqual(['1', '2', '3', '4', '6', '7', 'notes']);
    expect(byName(wb, 'notes').error).toBeTruthy();
    expect(wb.error).toBeNull();
  });

  it('stops at Excel helper rows and keeps line breaks and empty cells', () => {
    const s = byName(wb, '2');
    expect(s.data.categories.map(c => c.label)).toEqual(['Portugāle', 'Ungārija', 'Baltijas\nvalstis', 'Čehija']);
    expect(s.data.series.find(x => x.name === 'Latvija').values).toEqual([null, null, 1.3, null]);
    expect(s.suggested).toMatchObject({ type: 'bar', config: { stacked: true } });
  });

  it('turns merged first-column cells into category groups', () => {
    const s = byName(wb, '4');
    expect(s.data.categories.slice(0, 4)).toEqual([
      { label: 'Asoc A', group: 'Latvija' }, { label: 'Asoc B', group: 'Latvija' },
      { label: 'Asoc C', group: 'Latvija' }, { label: 'Asoc D', group: 'Igaunija' },
    ]);
    expect(s.suggested.config.orientation).toBe('horizontal');
  });

  it('suggests a filled line for a long yearly series and a dot plot for a wide table', () => {
    expect(byName(wb, '6').suggested).toMatchObject({ type: 'line', config: { areaFill: true } });
    const dot = byName(wb, '7');
    expect(dot.suggested.type).toBe('dot');
    expect(dot.data.categories.at(-1).label).toBe('EU');
    expect(dot.data.series).toHaveLength(4);
  });

  it('returns an error for an unrecognised structure', () => {
    expect(parseWorkbook(invalidXlsx()).error).toMatch(/No numbers found/);
  });
});

describe('normalizeData', () => {
  it('converts the MVP format', () => {
    expect(normalizeData([{ name: 'A', data: [{ year: 2020, value: 1 }, { year: 2021, value: 2 }] }])).toEqual({
      title: '', categories: [{ label: '2020' }, { label: '2021' }], series: [{ name: 'A', values: [1, 2] }],
    });
  });
});
