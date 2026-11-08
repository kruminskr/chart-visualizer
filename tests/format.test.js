import { describe, expect, it } from 'vitest';
import { formatNumber, formatCategory, decimalsForStep, thinLabels } from '@/utils/format';
import { seriesColors, tint, MAGENTA, LIGHT_PINK, DARK } from '@/lib/palette';

describe('formatNumber (lv)', () => {
  it('uses a decimal comma and space thousands', () => {
    expect(formatNumber(0.5, 1)).toBe('0,5');
    expect(formatNumber(12345, 0).replace(/\s/g, ' ')).toBe('12 345');
  });
  it('picks tick decimals from the step', () => {
    expect(decimalsForStep(0.2)).toBe(1);
    expect(decimalsForStep(0.05)).toBe(2);
    expect(decimalsForStep(5)).toBe(0);
  });
});

describe('formatCategory', () => {
  it('short years: first and last in full, middle 2 digits', () => {
    const ys = ['2016', '2017', '2018', '2026'];
    expect(ys.map((y, i) => formatCategory(y, i, ys.length, 'short'))).toEqual(['2016', '17', '18', '2026']);
  });
  it('full years and text labels stay as written', () => {
    expect(formatCategory('2017', 1, 4, 'full')).toBe('2017');
    expect(formatCategory('Latvija', 1, 4, 'short')).toBe('Latvija');
  });
});

describe('thinLabels', () => {
  it('matches the designer: 1946, 52, 58 … 2018, 2024', () => {
    const idx = thinLabels(79);
    expect(idx.map(i => 1946 + i)).toEqual([1946, 1952, 1958, 1964, 1970, 1976, 1982, 1988, 1994, 2000, 2006, 2012, 2018, 2024]);
  });
  it('keeps every label when there are few', () => {
    expect(thinLabels(6)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('palette', () => {
  it('colours series by country, not order', () => {
    expect(seriesColors(['Igaunija', 'Latvija', 'Lietuva'])).toEqual([LIGHT_PINK, MAGENTA, DARK]);
    expect(seriesColors(['Latvia', 'Revenue'])).toEqual([MAGENTA, DARK]);
  });
  it('mixes other colours with white', () => {
    expect(tint('#575756', 0.5)).toBe('#ABABAB');
  });
  it('honours overrides', () => {
    expect(seriesColors(['A'], { A: DARK })).toEqual([DARK]);
  });
  it('tints magenta like the designer area fill (#FCE5F1)', () => {
    expect(tint(MAGENTA, 0.1)).toBe('#FCE5F1');
  });
});

import { sortData } from '@/components/charts/BarChart';
describe('sortData', () => {
  it('sorts largest first within groups, keeping group order', () => {
    const data = {
      categories: [{ label: 'a', group: 'LV' }, { label: 'b', group: 'LV' }, { label: 'c', group: 'EE' }, { label: 'd', group: 'EE' }],
      series: [{ name: 's', values: [1, 5, 2, 9] }],
    };
    const out = sortData(data, 'desc');
    expect(out.categories.map(c => c.label)).toEqual(['b', 'a', 'd', 'c']);
    expect(out.series[0].values).toEqual([5, 1, 9, 2]);
    expect(sortData(data, 'none')).toBe(data);
  });
});
