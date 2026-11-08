// In-memory .xlsx fixtures that mirror the structure of LaSER's real workbooks
// (title row, blank row, header, data, Excel helper rows below, merged group cells).
// Values are synthetic. No binary files are committed.
import * as XLSX from 'xlsx';

function sheet(rows, merges) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  if (merges) ws['!merges'] = merges;
  return ws;
}

function book(sheets) {
  const wb = XLSX.utils.book_new();
  for (const [name, ws] of sheets) XLSX.utils.book_append_sheet(wb, ws, name);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

export const SINGLE_SERIES_ROWS = [
  ['Valsts budžeta izdevumi pa gadiem'],
  ['Gads', 'Izdevumi'],
  [2015, 7.2], [2016, 7.6], [2017, 8.1], [2018, 8.9], [2019, 9.4], [2020, 10.8], [2021, 12.1], [2022, 13.0],
];

export const MULTI_SERIES_ROWS = [
  ['Uzņēmumu skaits Baltijas valstīs pa gadiem'],
  [],
  ['Gads', 'Igaunija', 'Latvija', 'Lietuva'],
  [2019, 80, 60, 65], [2020, 84, 63, 66], [2021, 88, 66, 70], [2022, 93, 71, 78], [2023, 97, 74, 82], [2024, 101, 85, 88],
];

const STACKED_ROWS = [
  ['Ieguldījumi aizsardzībā salīdzinājumā ar citām valstīm (milj. EUR)'],
  [],
  ['Valsts', 'Lietuva', 'Igaunija', 'Latvija', 'Pārējās'],
  ['Portugāle', null, null, null, 4.1],
  ['Ungārija', null, null, null, 4.2],
  ['Baltijas\r\nvalstis', 2.2, 1.2, 1.3],
  ['Čehija', null, null, null, 6.1],
  [null, 'X', 'Y'],           // Excel helper block: must be ignored
  ['Portugāle', 1, -0.6],
];

const GROUPED_ROWS = [
  ['Asociāciju biedru skaits pa valstīm'],
  [],
  ['Valsts', 'Asociācija', 'Biedru skaits'],
  ['Latvija', 'Asoc A', 140], [null, 'Asoc B', 30], [null, 'Asoc C', 6],
  ['Igaunija', 'Asoc D', 190],
  ['Lietuva', 'Asoc E', 150], [null, 'Asoc F', 45],
];
const GROUPED_MERGES = [{ s: { r: 3, c: 0 }, e: { r: 5, c: 0 } }, { s: { r: 7, c: 0 }, e: { r: 8, c: 0 } }];

const CONFLICT_ROWS = [
  ['Notikumu skaits 1950.-2024. gadā'],
  ['Gads', 'Skaits'],
  ...Array.from({ length: 75 }, (_, i) => [1950 + i, Math.round(15 + i * 0.5 + 6 * Math.sin(i / 4))]),
];

const COUNTRIES = ['Germany', 'France', 'Sweden', 'Finland', 'Estonia', 'Lithuania', 'Latvia', 'Poland', 'Hungary', 'EU'];
const DOT_ROWS = [
  ['Indeksa rādītāji 2022. gadā'],
  [],
  ['Country', 'Climate', 'Economy', 'Health', 'Defence'],
  ...COUNTRIES.map((c, i) => [c, 4 + (i * 0.37) % 3, 4.5 + (i * 0.53) % 3, 5 + (i * 0.29) % 3, 2.5 + (i * 0.71) % 5]),
  [],
  ['X', 0, 0, 0, 0],
];

export const singleSeriesXlsx = () => book([['1', sheet(SINGLE_SERIES_ROWS)]]);
export const multiSeriesXlsx = () => book([['1', sheet(MULTI_SERIES_ROWS)]]);
export const invalidXlsx = () => book([['1', sheet([['hello', 'world'], ['foo', 'bar']])]]);
/** Multi-sheet workbook shaped like LaSER's `vizualizacijas_dati.xlsx`. */
export const laserLikeXlsx = () => book([
  ['1', sheet(MULTI_SERIES_ROWS)],
  ['2', sheet(STACKED_ROWS)],
  ['3', sheet(SINGLE_SERIES_ROWS)],
  ['4', sheet(GROUPED_ROWS, GROUPED_MERGES)],
  ['6', sheet(CONFLICT_ROWS)],
  ['7', sheet(DOT_ROWS)],
  ['notes', sheet([['Just some notes, no data here']])],
]);
