// Builds .xlsx fixtures in memory so no binary files need to be committed.
import * as XLSX from 'xlsx';

function toXlsx(rows) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

export const SINGLE_SERIES_ROWS = [
  ['Valsts budžeta izdevumi pa gadiem'],
  ['Gads', 'Izdevumi'],
  [2015, 7.2],
  [2016, 7.6],
  [2017, 8.1],
  [2018, 8.9],
  [2019, 9.4],
  [2020, 10.8],
  [2021, 12.1],
  [2022, 13.0],
];

export const MULTI_SERIES_ROWS = [
  ['Ieņēmumi un izdevumi pa gadiem'],
  ['Gads', 'Ieņēmumi', 'Izdevumi'],
  [2018, 8.1, 8.9],
  [2019, 8.8, 9.4],
  [2020, 8.5, 10.8],
  [2021, 9.7, 12.1],
];

export const singleSeriesXlsx = () => toXlsx(SINGLE_SERIES_ROWS);
export const multiSeriesXlsx = () => toXlsx(MULTI_SERIES_ROWS);
export const invalidXlsx = () => toXlsx([['hello', 'world'], ['foo', 'bar']]);
