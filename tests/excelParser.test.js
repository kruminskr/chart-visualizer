import { describe, expect, it } from 'vitest';
import { parseWorkbook } from '@/utils/excelParser';
import { invalidXlsx, multiSeriesXlsx, singleSeriesXlsx } from './fixtures/workbooks';

describe('parseWorkbook', () => {
  it('parses a single-series workbook with title and header row', () => {
    const r = parseWorkbook(singleSeriesXlsx());
    expect(r.error).toBeNull();
    expect(r.title).toBe('Valsts budžeta izdevumi pa gadiem');
    expect(r.series).toHaveLength(1);
    expect(r.series[0].name).toBe('Izdevumi');
    expect(r.series[0].data[0]).toEqual({ year: 2015, value: 7.2 });
    expect(r.series[0].data).toHaveLength(8);
  });

  it('parses multiple numeric columns as separate series', () => {
    const r = parseWorkbook(multiSeriesXlsx());
    expect(r.error).toBeNull();
    expect(r.series.map(s => s.name)).toEqual(['Ieņēmumi', 'Izdevumi']);
    expect(r.series[1].data.at(-1)).toEqual({ year: 2021, value: 12.1 });
  });

  it('returns an error for unrecognised structure', () => {
    expect(parseWorkbook(invalidXlsx()).error).toMatch(/not recognized/);
  });
});
