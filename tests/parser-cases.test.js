// Input layouts the parser must handle. Each case is a sheet shape seen in real-world Excel files.
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseWorkbook, toNumber, transposeData, applyExclusions } from '@/utils/excelParser';

function sheetOf(rows, opts = {}) {
  const ws = XLSX.utils.aoa_to_sheet(rows, { cellDates: true });
  if (opts.merges) ws['!merges'] = opts.merges;
  if (opts.hiddenRows) ws['!rows'] = opts.hiddenRows;
  if (opts.hiddenCols) ws['!cols'] = opts.hiddenCols;
  for (const a of opts.pct ?? []) ws[a].z = '0%';
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'S');
  return parseWorkbook(XLSX.write(wb, { type: 'buffer', bookType: opts.book ?? 'xlsx' })).sheets[0];
}
const csv = text => parseWorkbook(Buffer.from(text)).sheets[0];
const T = ['Virsraksts par datiem 2019.-2021. gadā'];
const shape = s => ({
  cats: s.data.categories.map(c => (c.group ? `${c.group}/${c.label}` : c.label)),
  series: Object.fromEntries(s.data.series.map(x => [x.name, x.values])),
});

describe('table location', () => {
  it('title + header + data', () => {
    const s = sheetOf([T, ['Gads', 'LV', 'EE'], [2019, 1, 2], [2020, 3, 4]]);
    expect(s.title).toBe(T[0]);
    expect(shape(s)).toEqual({ cats: ['2019', '2020'], series: { LV: [1, 3], EE: [2, 4] } });
  });
  it('no title / no header', () => {
    expect(shape(sheetOf([['Gads', 'LV'], [2019, 1], [2020, 2]])).series).toEqual({ LV: [1, 2] });
    expect(shape(sheetOf([[2019, 1], [2020, 2]])).series).toEqual({ '': [1, 2] });
  });
  it('table anywhere: starts at C3, or a note in A1 and the table at B3', () => {
    expect(shape(sheetOf([[], [], [null, null, 'Gads', 'LV'], [null, null, 2019, 1], [null, null, 2020, 2]])))
      .toEqual({ cats: ['2019', '2020'], series: { LV: [1, 2] } });
    expect(shape(sheetOf([['Piezīme'], [], [null, 'Gads', 'LV'], [null, 2019, 1], [null, 2020, 2]])).series).toEqual({ LV: [1, 2] });
  });
  it('subtitle line "(milj. EUR)" becomes the unit', () => {
    const s = sheetOf([T, ['(milj. EUR)'], ['Gads', 'LV'], [2019, 1], [2020, 2]]);
    expect(s.data.unit).toBe('milj. EUR');
    expect(shape(s).series).toEqual({ LV: [1, 2] });
  });
  it('source notes below the table are kept as notes, not data', () => {
    const a = sheetOf([T, ['Gads', 'LV'], [2019, 1], [2020, 2], ['Avots: Eurostat']]);
    const b = sheetOf([T, ['Gads', 'LV'], [2019, 1], [2020, 2], [], ['Avots: Eurostat']]);
    for (const s of [a, b]) {
      expect(s.data.notes).toEqual(['Avots: Eurostat']);
      expect(shape(s).cats).toEqual(['2019', '2020']);
    }
  });
  it('ignores a second table right of an empty column, and says so', () => {
    const s = sheetOf([T, ['Gads', 'LV', null, 'Cits', 'X'], [2019, 1, null, 'a', 9], [2020, 2, null, 'b', 8]]);
    expect(shape(s).series).toEqual({ LV: [1, 2] });
    expect(s.warnings.join(' ')).toMatch(/right of an empty column/);
  });
  it('stops at a helper table directly below (LaSER sheet 2), and says so', () => {
    const s = sheetOf([T, ['Valsts', 'LV', 'Citi'], ['A', 1, null], ['B', null, 2], [null, 'X', 'Y'], ['A', 1, -0.6]]);
    expect(shape(s).cats).toEqual(['A', 'B']);
    expect(s.warnings.join(' ')).toMatch(/below the table/);
  });
});

describe('headers', () => {
  it('a unit row under the header becomes the unit', () => {
    const s = sheetOf([T, ['Gads', 'LV', 'EE'], ['', 'milj. EUR', 'milj. EUR'], [2019, 1, 2], [2020, 3, 4]]);
    expect(s.data.unit).toBe('milj. EUR');
    expect(shape(s).series).toEqual({ LV: [1, 3], EE: [2, 4] });
  });
  it('two header rows combine into "group · name"', () => {
    const s = sheetOf([T, ['', 'Latvija', '', 'Igaunija', ''], ['Gads', 'Izdevumi', 'Ieņēmumi', 'Izdevumi', 'Ieņēmumi'], [2019, 1, 2, 3, 4]]);
    expect(Object.keys(shape(s).series)).toEqual(['Latvija · Izdevumi', 'Latvija · Ieņēmumi', 'Igaunija · Izdevumi', 'Igaunija · Ieņēmumi']);
  });
  it('merged group header across columns works the same', () => {
    const s = sheetOf([T, ['', 'Latvija', null, 'Igaunija', null], ['Gads', 'A', 'B', 'A', 'B'], [2019, 1, 2, 3, 4]],
      { merges: [{ s: { r: 1, c: 1 }, e: { r: 1, c: 2 } }, { s: { r: 1, c: 3 }, e: { r: 1, c: 4 } }] });
    expect(Object.keys(shape(s).series)).toEqual(['Latvija · A', 'Latvija · B', 'Igaunija · A', 'Igaunija · B']);
  });
  it('blank top-left header cell', () => {
    expect(shape(sheetOf([T, [null, 'LV', 'EE'], [2019, 1, 2]])).series).toEqual({ LV: [1], EE: [2] });
  });
});

describe('orientation', () => {
  it('years across the columns are swapped into rows (Eurostat layout)', () => {
    const s = sheetOf([T, ['Valsts', 2019, 2020, 2021], ['LV', 1, 2, 3], ['EE', 4, 5, 6]]);
    expect(shape(s)).toEqual({ cats: ['2019', '2020', '2021'], series: { LV: [1, 2, 3], EE: [4, 5, 6] } });
    expect(s.warnings.join(' ')).toMatch(/swapped/);
  });
  it('transposeData swaps back', () => {
    const s = sheetOf([T, ['Gads', 'LV', 'EE'], [2019, 1, 2], [2020, 3, 4]]);
    const t = transposeData(s.data);
    expect(t.categories.map(c => c.label)).toEqual(['LV', 'EE']);
    expect(t.series).toEqual([{ name: '2019', values: [1, 2] }, { name: '2020', values: [3, 4] }]);
  });
});

describe('values and labels', () => {
  it('a missing value is a gap, not the end of the data', () => {
    expect(shape(sheetOf([T, ['Gads', 'LV'], [2019, 1], [2020, null], [2021, 3]])))
      .toEqual({ cats: ['2019', '2020', '2021'], series: { LV: [1, null, 3] } });
  });
  it('numbers as text, negative values, percent strings and % formatted cells', () => {
    expect(shape(sheetOf([T, ['Gads', 'LV'], ['2019', '1,5'], ['2020', '1 234,5'], ['2021', '-2']])).series.LV).toEqual([1.5, 1234.5, -2]);
    const p = sheetOf([T, ['Gads', 'LV'], [2019, '12%'], [2020, '15,5 %']]);
    expect(p.data.series[0].values).toEqual([12, 15.5]);
    expect(p.data.unit).toBe('%');
    expect(sheetOf([T, ['Gads', 'LV'], [2019, 0.12], [2020, 0.15]], { pct: ['B3', 'B4'] }).data.series[0].values).toEqual([12, 15]);
  });
  it('year labels "2019." and real dates become readable labels', () => {
    expect(shape(sheetOf([T, ['Gads', 'LV'], ['2019.', 1], ['2020.', 2]])).cats).toEqual(['2019', '2020']);
    expect(shape(sheetOf([T, ['Mēnesis', 'LV'], [new Date(2023, 0, 1), 1], [new Date(2023, 1, 1), 2]])).cats).toEqual(['01.2023', '02.2023']);
    expect(shape(sheetOf([T, ['Gads', 'LV'], [new Date(2022, 0, 1), 1], [new Date(2023, 0, 1), 2]])).cats).toEqual(['2022', '2023']);
  });
  it('skips hidden rows and columns, and says so', () => {
    const s = sheetOf([T, ['Gads', 'LV', 'Helper'], [2019, 1, 9], [2020, 2, 9], [2021, 3, 9]],
      { hiddenRows: [{}, {}, {}, { hidden: true }], hiddenCols: [{}, {}, { hidden: true }] });
    expect(shape(s)).toEqual({ cats: ['2019', '2021'], series: { LV: [1, 3] } });
    expect(s.warnings.join(' ')).toMatch(/hidden/);
  });
  it('quarters and text categories stay as written', () => {
    expect(shape(sheetOf([T, ['Ceturksnis', 'LV'], ['2023 Q1', 1], ['2023 Q2', 2]])).cats).toEqual(['2023 Q1', '2023 Q2']);
  });
});

describe('file formats', () => {
  it('.xls and .ods', () => {
    for (const book of ['xls', 'ods']) expect(shape(sheetOf([T, ['Gads', 'LV'], [2019, 1]], { book })).series).toEqual({ LV: [1] });
  });
  it('Latvian CSV: semicolons and decimal commas', () => {
    const s = csv('Virsraksts par datiem\nGads;LV;EE\n2019;1,5;2\n2020;3;4,25\n');
    expect(s.title).toBe('Virsraksts par datiem');
    expect(shape(s)).toEqual({ cats: ['2019', '2020'], series: { LV: [1.5, 3], EE: [2, 4.25] } });
  });
  it('Latvian CSV whose title line contains a comma still splits on semicolons', () => {
    const s = csv('Pētniecības izdevumi, % no IKP\nValsts;Izdevumi\nVācija;3,1\nLatvija;0,8\nES-27;2,2\n');
    expect(s.title).toBe('Pētniecības izdevumi, % no IKP');
    expect(shape(s)).toEqual({ cats: ['Vācija', 'Latvija', 'ES-27'], series: { Izdevumi: [3.1, 0.8, 2.2] } });
  });
  it('English CSV: commas and decimal points', () => {
    expect(shape(csv('Year,LV\n2019,1.5\n2020,"1,234.5"\n')).series).toEqual({ LV: [1.5, 1234.5] });
  });
});

describe('helpers', () => {
  it('toNumber', () => {
    expect([toNumber('1,5'), toNumber('1 234,5'), toNumber('1.234,5'), toNumber('1,234.5'), toNumber('1,234,567'), toNumber('12%'), toNumber('abc')])
      .toEqual([1.5, 1234.5, 1234.5, 1234.5, 1234567, 12, null]);
  });
  it('applyExclusions drops rows and series', () => {
    const data = { categories: [{ label: 'a' }, { label: 'b' }, { label: 'Kopā' }], series: [{ name: 'x', values: [1, 2, 3] }, { name: 'y', values: [4, 5, 6] }] };
    expect(applyExclusions(data, { rows: [2], series: [1] })).toMatchObject({
      categories: [{ label: 'a' }, { label: 'b' }], series: [{ name: 'x', values: [1, 2] }],
    });
    expect(applyExclusions(data, {})).toBe(data);
  });
});

describe('text encodings', () => {
  it('UTF-8 CSV keeps Latvian letters (with or without BOM)', () => {
    const s = csv('﻿Gads;Kopā\n2019;1\n2020;2\n');
    expect(s.data.series[0].name).toBe('Kopā');
  });
  it('Windows-1257 CSV (Excel "CSV" on Baltic Windows) keeps Latvian letters', () => {
    // "Kopā;Ēnas" in Windows-1257: ā = 0xE2, Ē = 0xC7
    const bytes = Uint8Array.from([...Buffer.from('Gads;Kop'), 0xe2, ...Buffer.from(';'), 0xc7, ...Buffer.from('nas\n2019;1;2\n2020;3;4\n')]);
    expect(Object.keys(shape(parseWorkbook(bytes).sheets[0]).series)).toEqual(['Kopā', 'Ēnas']);
  });
});
