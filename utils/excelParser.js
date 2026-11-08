import * as XLSX from 'xlsx';

/**
 * Normalised chart data, shared by every chart type:
 *   { title, categories: [{ label, group? }], series: [{ name, values: (number|null)[] }] }
 *
 * Sheet layout we accept (LaSER workbooks):
 *   A1           optional title (a single text cell)
 *   next row     header: [category header, (group header,) series names…]
 *   data rows    first column(s) = labels, then numeric columns
 *   end          first row without a label (and outside a merged cell) or without any number.
 *                Anything below (Excel helper tables for scatter tricks) is ignored.
 */

/** Reads a File in the browser. Returns { sheets, error }. */
export function parseFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(parseWorkbook(e.target.result));
    reader.onerror = () => resolve({ sheets: [], error: 'Failed to read the file.' });
    reader.readAsArrayBuffer(file);
  });
}

/** ArrayBuffer/Uint8Array → { sheets: [{ name, title, data, suggested, error }], error } */
export function parseWorkbook(buf) {
  let wb;
  try {
    wb = XLSX.read(buf, { type: 'array' });
  } catch {
    return { sheets: [], error: 'The file could not be read as an Excel workbook.' };
  }
  const sheets = wb.SheetNames.map(name => ({ name, ...parseSheet(wb.Sheets[name]) }));
  const usable = sheets.filter(s => !s.error);
  return { sheets, error: usable.length ? null : (sheets[0]?.error ?? 'The workbook has no sheets.') };
}

const isBlank = v => v == null || (typeof v === 'string' && v.trim() === '');
const cleanText = v => String(v).replace(/\r\n?/g, '\n').trim();

function toNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const s = v.replace(/\s/g, '').replace(',', '.');
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  }
  return null;
}

export function parseSheet(sheet) {
  if (!sheet || !sheet['!ref']) return { error: 'Empty sheet.' };
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: true, defval: null, raw: true });

  // Cells covered by a vertical merge in column 0/1 inherit the merge's top value.
  for (const m of sheet['!merges'] ?? []) {
    for (let r = m.s.r + 1; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if (rows[r]) rows[r][c] = rows[m.s.r]?.[c] ?? null;
      }
    }
  }

  let r = 0;
  while (r < rows.length && rows[r].every(isBlank)) r++;

  // Title: a row with exactly one text cell.
  let title = '';
  const first = rows[r] ?? [];
  const filled = first.filter(v => !isBlank(v));
  if (filled.length === 1 && typeof filled[0] === 'string') {
    title = cleanText(filled[0]);
    r++;
    while (r < rows.length && rows[r].every(isBlank)) r++;
  }

  // Header row: contains text and no numbers past column 0. Otherwise data starts right away.
  let header = null;
  const cand = rows[r] ?? [];
  if (cand.slice(1).some(v => typeof v === 'string') && !cand.slice(1).some(v => toNumber(v) != null)) {
    header = cand;
    r++;
  }

  // Data block.
  const block = [];
  for (; r < rows.length; r++) {
    const row = rows[r];
    if (isBlank(row[0]) && isBlank(row[1])) break;
    if (!row.slice(1).some(v => toNumber(v) != null)) break;
    block.push(row);
  }
  if (block.length === 0) {
    return { title, error: 'No data found. Expected a header row followed by rows of labels and numbers.' };
  }

  const width = Math.max(...block.map(row => row.length), header?.length ?? 0);
  const numericCol = c => block.some(row => toNumber(row[c]) != null);
  // Leading label columns: everything before the first numeric column (max 2 → group + label).
  let firstNum = 0;
  while (firstNum < width && !(firstNum > 0 && numericCol(firstNum))) firstNum++;
  if (firstNum >= width) return { title, error: 'No numeric columns found.' };
  const labelCols = Math.min(firstNum, 2);
  const groupCol = labelCols === 2 ? firstNum - 2 : null;
  const labelCol = firstNum - 1;

  const valueCols = [];
  for (let c = firstNum; c < width; c++) {
    const named = header && !isBlank(header[c]);
    if (named || numericCol(c)) valueCols.push(c);
  }

  const categories = block.map(row => {
    const label = isBlank(row[labelCol]) ? '' : cleanText(row[labelCol]);
    const cat = { label };
    if (groupCol != null && !isBlank(row[groupCol])) cat.group = cleanText(row[groupCol]);
    return cat;
  });

  const series = valueCols.map(c => ({
    name: header && !isBlank(header[c]) ? cleanText(header[c]) : '',
    values: block.map(row => toNumber(row[c])),
  })).filter(s => s.values.some(v => v != null));

  if (series.length === 0) return { title, error: 'No numeric columns found.' };

  const data = { title, categories, series };
  return { title, data, suggested: suggestChart(data), error: null };
}

/** Suggested { type, config } for a parsed sheet. The user can change it. */
export function suggestChart({ categories, series }) {
  const years = categories.every(c => /^\d{4}$/.test(c.label));
  const hasGroups = categories.some(c => c.group);
  const sparse = series.length > 1 && series.some(s => s.values.some(v => v == null));
  const nonInteger = series.some(s => s.values.some(v => v != null && !Number.isInteger(v)));

  if (hasGroups) return { type: 'bar', config: { orientation: 'horizontal', valueLabels: 'outside' } };
  if (!years && series.length >= 3 && categories.length >= 8) return { type: 'dot', config: {} };
  if (sparse) return { type: 'bar', config: { stacked: true, valueLabels: 'inside' } };
  if (years && series.length === 1 && categories.length > 20) return { type: 'line', config: { areaFill: true } };
  if (years && series.length > 1 && nonInteger) return { type: 'line', config: {} };
  if (!years && series.length === 1) return { type: 'bar', config: { orientation: 'horizontal', valueLabels: 'inside' } };
  return { type: 'bar', config: series.length > 1 ? { valueLabels: 'inside' } : {} };
}

/** Old MVP format [{name, data:[{year, value}]}] or [{year,value}] → normalised data. */
export function normalizeData(dataJson, title = '') {
  if (dataJson && Array.isArray(dataJson.categories)) return dataJson;
  if (!Array.isArray(dataJson) || dataJson.length === 0) return null;
  const old = 'data' in dataJson[0] ? dataJson : [{ name: '', data: dataJson }];
  return {
    title,
    categories: old[0].data.map(d => ({ label: String(d.year) })),
    series: old.map(s => ({ name: s.name ?? '', values: s.data.map(d => d.value) })),
  };
}
