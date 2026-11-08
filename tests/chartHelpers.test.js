import { describe, expect, it } from 'vitest';
import { formatYearLabel } from '@/utils/chartHelpers';

describe('formatYearLabel', () => {
  it('uses 4 digits for first and last, 2 digits in between', () => {
    const years = [2015, 2016, 2017, 2018];
    expect(years.map((y, i) => formatYearLabel(y, i, years.length))).toEqual(['2015', '16', '17', '2018']);
  });

  it('keeps 4 digits when there are only two years', () => {
    expect(formatYearLabel(2020, 0, 2)).toBe('2020');
    expect(formatYearLabel(2021, 1, 2)).toBe('2021');
  });
});
