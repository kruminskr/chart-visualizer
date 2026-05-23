import * as XLSX from 'xlsx';

/**
 * Parses an .xlsx File object.
 * Returns { title, series: [{name, data: [{year, value}]}], error }
 *
 * Auto-detects data start row by scanning for the first row where A is a
 * numeric year (1900-2100) and B is numeric.
 *
 * Multi-series: reads all numeric columns from B onwards as separate series.
 * Single-series files are wrapped in a one-element series array.
 */
export function parseFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];

        // Find first data row (numeric year 1900–2100 in A, numeric in B)
        let dataStart = -1;
        for (let r = 1; r <= 10; r++) {
          const a = sheet[`A${r}`]?.v;
          const b = sheet[`B${r}`]?.v;
          if (typeof a === 'number' && a >= 1900 && a <= 2100 && typeof b === 'number') {
            dataStart = r;
            break;
          }
        }

        if (dataStart === -1) {
          resolve({ error: 'The file structure is not recognized. Expected year (1900–2100) and numeric value columns.' });
          return;
        }

        // Title: A1 if it's a descriptive string (>10 chars)
        const a1 = sheet['A1']?.v;
        const title = typeof a1 === 'string' && a1.length > 10 ? a1 : '';

        // Count series by scanning columns B, C, D... at the data start row
        const seriesNames = [];
        for (let colIdx = 1; colIdx < 10; colIdx++) {
          const colLetter = String.fromCharCode(65 + colIdx); // B, C, D…
          if (sheet[`${colLetter}${dataStart}`] == null) break;
          // Header name comes from the row before dataStart (if one exists)
          let name = '';
          if (dataStart > 1) {
            const hCell = sheet[`${colLetter}${dataStart - 1}`];
            if (typeof hCell?.v === 'string') name = hCell.v;
          }
          seriesNames.push(name);
        }

        // Initialize empty data arrays for each series
        const seriesData = seriesNames.map(() => []);

        // Parse data rows
        for (let r = dataStart; sheet[`A${r}`] != null; r++) {
          const yearVal = sheet[`A${r}`]?.v;
          if (typeof yearVal !== 'number' || isNaN(yearVal)) {
            resolve({ error: `Non-numeric year in row ${r}. Please check your data.` });
            return;
          }

          for (let s = 0; s < seriesNames.length; s++) {
            const colLetter = String.fromCharCode(66 + s); // B, C, D…
            const val = sheet[`${colLetter}${r}`]?.v;
            if (typeof val !== 'number' || isNaN(val)) {
              resolve({ error: `Non-numeric value in row ${r}. Please check your data.` });
              return;
            }
            seriesData[s].push({ year: Math.round(yearVal), value: val });
          }
        }

        if (seriesData[0]?.length < 2) {
          resolve({ error: 'At least 2 data points are required to generate a chart.' });
          return;
        }

        const series = seriesNames.map((name, i) => ({ name, data: seriesData[i] }));
        resolve({ title, series, error: null });
      } catch {
        resolve({ error: 'The file structure is not recognized. Expected: year and numeric value columns.' });
      }
    };

    reader.onerror = () => resolve({ error: 'Failed to read the file.' });
    reader.readAsArrayBuffer(file);
  });
}
