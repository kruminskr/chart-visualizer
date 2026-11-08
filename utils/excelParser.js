import * as XLSX from 'xlsx';

/**
 * Normalised chart data, shared by every chart type:
 *   { title, categories: [{ label, group? }], series: [{ name, values: (number|null)[] }],
 *     unit?, notes?: string[], warnings?: string[] }
 *
 * Reading a sheet = find the table, then read it:
 *   1. Build a grid of cleaned cells (hidden rows/columns dropped, merged cells filled, %, dates, "1 234,5" handled).
 *   2. Split into blocks at empty rows. Single-text rows above the table are title/subtitle; below it, notes/source.
 *      The table is the block with the most numbers.
 *   3. Inside the block: cut at the first empty column, swap rows/columns if the years run across,
 *      take 0–2 header rows (a row of identical units becomes the axis unit), then data rows.
 *      Empty cells are gaps; the table ends only at a row that is a new header (text in value columns).
 *   4. Every row or column we skip is reported in `warnings`, so nothing is dropped silently.
 */

export const ACCEPTED_FILES = '.xlsx,.xls,.ods,.csv';
export const isAcceptedFile = name => /\.(xlsx|xls|ods|csv)$/i.test(name);

/** Reads a File in the browser. Returns { sheets, error }. */
export function parseFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(parseWorkbook(e.target.result));
    reader.onerror = () => resolve({ sheets: [], error: 'Failed to read the file.' });
    reader.readAsArrayBuffer(file);
  });
}

/** ArrayBuffer/Uint8Array → { sheets: [{ name, title, data, suggested, warnings, error }], error } */
export function parseWorkbook(buf) {
  let wb;
  try {
    // cellStyles: needed for hidden rows/cols. raw: CSV cells stay text, so "1,5" is read by toNumber
    // (SheetJS would read it as 15 with a comma as thousands separator).
    const opts = { cellDates: true, cellNF: true, cellStyles: true, raw: true };
    const text = decodeText(buf);
    wb = text != null ? XLSX.read(text, { ...opts, type: 'string' }) : XLSX.read(buf, { ...opts, type: 'array' });
  } catch {
    return { sheets: [], error: 'The file could not be read as a spreadsheet.' };
  }
  const sheets = wb.SheetNames.map(name => {
    try {
      return { name, ...parseSheet(wb.Sheets[name]) };
    } catch {
      return { name, error: 'This sheet could not be read.' };
    }
  });
  const usable = sheets.filter(s => !s.error);
  return { sheets, error: usable.length ? null : (sheets[0]?.error ?? 'The workbook has no sheets.') };
}

/**
 * Text files (CSV) are decoded here: SheetJS reads raw bytes as Latin-1, turning "Kopā" into "KopÄ".
 * UTF-8 first; if that fails, Windows-1257 (what Excel's plain "CSV" save uses on Baltic Windows).
 * Returns null for binary spreadsheets (xlsx/ods = zip "PK", xls = OLE "D0 CF").
 */
function decodeText(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  if ((bytes[0] === 0x50 && bytes[1] === 0x4b) || (bytes[0] === 0xd0 && bytes[1] === 0xcf)) return null;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
  } catch {
    return new TextDecoder('windows-1257').decode(bytes);
  }
}

// ── Cells ────────────────────────────────────────────────────────────────────

const cleanText = v => String(v).replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').trim();

/** "1,5" "1 234,5" "1.234,5" "-3" "12%" → number (or null). */
export function toNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  let s = v.replace(/[\s  ]/g, '').replace(/%$/, '').replace(/^−/, '-');
  if (s.includes(',') && s.includes('.')) {
    // Both separators: the last one is the decimal ("1.234,5" lv / "1,234.5" en).
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if ((s.match(/,/g) ?? []).length === 1) s = s.replace(',', '.'); // Latvian decimal comma
  else if (s.includes(',')) s = s.replace(/,/g, ''); // 1,234,567
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}

/** A cleaned cell: { num } or { text }, plus pct / date flags. null when empty. */
function cellOf(c) {
  if (!c || c.v == null) return null;
  if (c.v instanceof Date || c.t === 'd') return { text: '', date: new Date(c.v) };
  if (c.t === 'n') {
    const pct = /%/.test(c.z ?? '');
    return { num: pct ? Math.round(c.v * 100 * 1e9) / 1e9 : c.v, pct };
  }
  const s = cleanText(c.v);
  if (s === '') return null;
  const n = toNumber(s);
  if (n != null) return { num: n, pct: /%$/.test(s.replace(/\s/g, '')) };
  return { text: s };
}

const isYearValue = c => c && ((c.num != null && Number.isInteger(c.num) && c.num >= 1900 && c.num <= 2100) || /^\d{4}\.?$/.test(c.text ?? ''));
const isNum = c => c?.num != null;
const isText = c => c != null && c.num == null && !c.date;

function buildGrid(sheet) {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const hiddenRows = new Set((sheet['!rows'] ?? []).flatMap((r, i) => (r?.hidden ? [i] : [])));
  const hiddenCols = new Set((sheet['!cols'] ?? []).flatMap((c, i) => (c?.hidden ? [i] : [])));
  const raw = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row = [];
    for (let c = range.s.c; c <= range.e.c; c++) row.push(sheet[XLSX.utils.encode_cell({ r, c })]);
    raw.push(row);
  }
  // Merged cells: every covered cell takes the top-left value (group labels down, header groups across).
  for (const m of sheet['!merges'] ?? []) {
    const src = sheet[XLSX.utils.encode_cell(m.s)];
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) {
        if ((r !== m.s.r || c !== m.s.c) && raw[r - range.s.r]) raw[r - range.s.r][c - range.s.c] = src;
      }
    }
  }
  const keepRow = (_, i) => !hiddenRows.has(i + range.s.r);
  const keepCol = (_, j) => !hiddenCols.has(j + range.s.c);
  const rows = raw.filter(keepRow).map(row => row.filter(keepCol).map(cellOf));
  const hidden = raw.filter((row, i) => !keepRow(row, i) && row.some(Boolean)).length
    + [...hiddenCols].filter(j => j >= range.s.c && j <= range.e.c).length;
  return { rows, hidden };
}

// ── Table ────────────────────────────────────────────────────────────────────

const isEmptyRow = r => r.every(c => c == null);
/** A row with one distinct text value (a title, subtitle or note; merged across or not). */
const isTextLine = r => {
  const cells = r.filter(Boolean);
  return cells.length > 0 && cells.every(isText) && new Set(cells.map(c => c.text)).size === 1;
};
const lineText = r => r.find(Boolean).text;

export function parseSheet(sheet) {
  if (!sheet || !sheet['!ref']) return { error: 'Empty sheet.' };
  const warnings = [];
  const { rows, hidden } = buildGrid(sheet);
  if (hidden) warnings.push(`Skipped ${hidden} hidden ${hidden === 1 ? 'row or column' : 'rows/columns'}.`);

  // Blocks separated by empty rows; leading/trailing text lines are trimmed off each block.
  const segments = [];
  let cur = null;
  rows.forEach((r, i) => {
    if (isEmptyRow(r)) { cur = null; return; }
    if (!cur) segments.push(cur = { start: i, end: i });
    cur.end = i;
  });
  for (const s of segments) {
    s.top = s.start;
    while (s.top <= s.end && isTextLine(rows[s.top])) s.top++;
    s.bottom = s.end;
    while (s.bottom >= s.top && isTextLine(rows[s.bottom])) s.bottom--;
    s.numbers = 0;
    for (let i = s.top; i <= s.bottom; i++) s.numbers += rows[i].filter(isNum).length;
  }
  const table = segments.reduce((best, s) => (s.numbers > (best?.numbers ?? 0) ? s : best), null);

  // Text lines above the table: first = title, the rest = subtitle (a "(milj. EUR)" line becomes the unit).
  const above = rows.slice(0, table?.top ?? rows.length).filter(r => !isEmptyRow(r) && isTextLine(r)).map(lineText);
  const title = above[0] ?? '';
  if (!table) return { title, error: 'No numbers found. Expected a table: labels in the first column, numbers next to them.' };

  let unit = null;
  for (const line of above.slice(1)) {
    const m = line.match(/^\((.+)\)$/);
    if (m || line.length <= 24) unit = m ? m[1] : line;
  }
  const notes = rows.slice(table.bottom + 1, table.end + 1).map(lineText);
  const nextSeg = segments[segments.indexOf(table) + 1];
  if (nextSeg && nextSeg.top > nextSeg.bottom) notes.push(...rows.slice(nextSeg.start, nextSeg.end + 1).map(lineText));

  // Block → columns: drop empty leading columns, cut at the first empty column.
  let block = rows.slice(table.top, table.bottom + 1);
  const width = Math.max(...block.map(r => r.length));
  const colEmpty = c => block.every(r => r[c] == null);
  let c0 = 0;
  while (c0 < width && colEmpty(c0)) c0++;
  let c1 = c0;
  while (c1 < width && !colEmpty(c1)) c1++;
  const rightCols = [];
  for (let c = c1; c < width; c++) if (!colEmpty(c)) rightCols.push(c);
  if (rightCols.length) warnings.push(`Ignored ${rightCols.length} column${rightCols.length > 1 ? 's' : ''} right of an empty column.`);
  block = block.map(r => Array.from({ length: c1 - c0 }, (_, k) => r[c0 + k] ?? null));

  // Years across the first row with text labels down the first column → swap rows and columns.
  const top = block[0];
  const yearsAcross = top.slice(1).filter(Boolean).length >= 2 && top.slice(1).every(c => c == null || isYearValue(c));
  const textDown = block.slice(1).some(r => isText(r[0]));
  if (yearsAcross && textDown) {
    block = top.map((_, j) => block.map(r => r[j]));
    warnings.push('Years were in columns: rows and columns were swapped.');
  }

  // Header rows: up to two leading rows with no numbers after the first column.
  const noNumbers = r => !r.slice(1).some(isNum);
  let h = 0;
  while (h < 2 && h < block.length - 1 && noNumbers(block[h]) && block[h].slice(1).some(Boolean)) h++;
  let names = block[0].map(() => '');
  const labelOf = c => (c == null ? '' : c.text || (c.num != null ? String(c.num) : ''));
  if (h >= 1) names = block[h - 1].map(labelOf);
  if (h === 2) {
    const second = block[1].slice(1).filter(Boolean).map(labelOf);
    const unitRow = second.length > 0 && new Set(second).size === 1
      && (second.length >= 2 || /(eur|usd|%|milj|mljrd|tūkst|skaits|gab\.|vien)/i.test(second[0]));
    if (unitRow) {
      unit = second[0].replace(/^\((.+)\)$/, '$1');
      names = block[0].map(labelOf);
    } else {
      let group = '';
      const groups = block[0].map((c, j) => (j === 0 ? '' : (group = labelOf(c) || group)));
      names = names.map((n, j) => (j > 0 && groups[j] ? (n ? `${groups[j]} · ${n}` : groups[j]) : n));
    }
  }

  // Label columns: everything before the first column (after col 0) that holds numbers in the data rows.
  let dataRows = block.slice(h);
  const numericCol = c => dataRows.some(r => isNum(r[c]));
  let firstNum = 1;
  while (firstNum < block[0].length && !numericCol(firstNum)) firstNum++;
  if (firstNum >= block[0].length) return { title, error: 'No numeric columns found.' };
  const labelCol = firstNum - 1;
  const groupCol = firstNum >= 2 ? firstNum - 2 : null;

  // Data ends at a row that looks like a new header (text in a value column); trailing empty rows are trimmed.
  const stop = dataRows.findIndex(r => r.slice(firstNum).some(isText));
  if (stop >= 0) {
    const extra = dataRows.length - stop;
    warnings.push(`Ignored ${extra} row${extra > 1 ? 's' : ''} below the table (another table or helper data).`);
    dataRows = dataRows.slice(0, stop);
  }
  while (dataRows.length && !dataRows.at(-1).slice(firstNum).some(isNum)) dataRows.pop();
  if (dataRows.length === 0) return { title, error: 'No data rows found under the header.' };

  const categories = labelColumn(dataRows.map(r => r[labelCol])).map((label, i) => {
    const cat = { label };
    const g = groupCol != null ? dataRows[i][groupCol] : null;
    if (g) cat.group = labelOf(g);
    return cat;
  });

  const series = [];
  let pct = false;
  for (let c = firstNum; c < block[0].length; c++) {
    const values = dataRows.map(r => (isNum(r[c]) ? r[c].num : null));
    if (values.every(v => v == null)) continue;
    pct ||= dataRows.some(r => r[c]?.pct);
    series.push({ name: names[c] ?? '', values });
  }
  if (series.length === 0) return { title, error: 'No numeric columns found.' };
  if (pct && !unit) unit = '%';

  const data = { title, categories, series };
  if (unit) data.unit = unit;
  if (notes.length) data.notes = notes;
  if (warnings.length) data.warnings = warnings;
  return { title, data, warnings, suggested: suggestChart(data), error: null };
}

/** Category labels: years "2019." → "2019"; dates → year, month.year or day.month.year as precise as needed. */
function labelColumn(cells) {
  const dates = cells.filter(c => c?.date).map(c => new Date(c.date.getTime() + 12 * 3600e3)); // noon: no TZ day-shift
  const allJan1 = dates.every(d => d.getUTCMonth() === 0 && d.getUTCDate() === 1);
  const allFirst = dates.every(d => d.getUTCDate() === 1);
  const pad = n => String(n).padStart(2, '0');
  return cells.map(c => {
    if (c == null) return '';
    if (c.date) {
      const d = new Date(c.date.getTime() + 12 * 3600e3);
      const y = d.getUTCFullYear(), m = pad(d.getUTCMonth() + 1), day = pad(d.getUTCDate());
      return allJan1 ? String(y) : allFirst ? `${m}.${y}` : `${day}.${m}.${y}`;
    }
    if (c.num != null) return String(c.num);
    return /^\d{4}\.$/.test(c.text) ? c.text.slice(0, 4) : c.text;
  });
}

/** Suggested { type, config } for a parsed sheet. The user can change it. */
export function suggestChart({ categories, series }) {
  const years = categories.every(c => /^\d{4}$/.test(c.label));
  const hasGroups = categories.some(c => c.group);
  const sparse = series.length > 1 && series.some(s => s.values.some(v => v == null));
  const nonInteger = series.some(s => s.values.some(v => v != null && !Number.isInteger(v)));

  if (hasGroups) return { type: 'bar', config: { orientation: 'horizontal', valueLabels: 'outside' } };
  if (!years && series.length >= 3 && categories.length >= 8) return { type: 'dot', config: {} };
  if (sparse && !years) return { type: 'bar', config: { stacked: true, valueLabels: 'inside' } };
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

/** Swap rows and columns (categories ↔ series). Groups are dropped. */
export function transposeData(data) {
  return {
    ...data,
    categories: data.series.map(s => ({ label: s.name })),
    series: data.categories.map((c, i) => ({ name: c.label, values: data.series.map(s => s.values[i] ?? null) })),
  };
}

/** Remove rows/series the user unticked in the data panel. exclude = { rows: [i], series: [j] }. */
export function applyExclusions(data, exclude) {
  if (!data || (!exclude?.rows?.length && !exclude?.series?.length)) return data;
  const rows = new Set(exclude.rows ?? []);
  const cols = new Set(exclude.series ?? []);
  const keep = data.categories.map((_, i) => !rows.has(i));
  return {
    ...data,
    categories: data.categories.filter((_, i) => keep[i]),
    series: data.series.filter((_, j) => !cols.has(j)).map(s => ({ ...s, values: s.values.filter((_, i) => keep[i]) })),
  };
}
