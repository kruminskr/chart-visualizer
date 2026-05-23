import * as XLSX from 'xlsx';

/**
 * Parses an .xlsx File object.
 * Returns { title, data: [{year, value}], error } — error is null on success.
 *
 * Handles two layouts:
 *   Layout A (brief spec): Row 1 = title, Row 2 = headers, Row 3+ = data
 *   Layout B (real file):  Row 1 = headers ("Gads" | ...), Row 2+ = data
 *
 * Auto-detects by scanning for the first row where A is a numeric year (1900-2100)
 * and B is a numeric value.
 */
export function parseFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];

        // Find first data row (numeric year 1900–2100, numeric value)
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
          resolve({
            error:
              'The file structure is not recognized. Expected year (1900–2100) and numeric value columns.',
          });
          return;
        }

        // Title: A1 if it's a descriptive string (>10 chars), not a short column header
        const a1 = sheet['A1']?.v;
        const title = typeof a1 === 'string' && a1.length > 10 ? a1 : '';

        // Parse data rows
        const data = [];
        for (let r = dataStart; sheet[`A${r}`] != null; r++) {
          const yearVal = sheet[`A${r}`]?.v;
          const dataVal = sheet[`B${r}`]?.v;

          if (typeof yearVal !== 'number' || isNaN(yearVal)) {
            resolve({ error: `Non-numeric year in row ${r}. Please check your data.` });
            return;
          }
          if (typeof dataVal !== 'number' || isNaN(dataVal)) {
            resolve({ error: `Non-numeric value in row ${r}. Please check your data.` });
            return;
          }

          data.push({ year: Math.round(yearVal), value: dataVal });
        }

        if (data.length < 2) {
          resolve({ error: 'At least 2 data points are required to generate a chart.' });
          return;
        }

        resolve({ title, data, error: null });
      } catch {
        resolve({
          error:
            'The file structure is not recognized. Expected: year and numeric value columns.',
        });
      }
    };

    reader.onerror = () => resolve({ error: 'Failed to read the file.' });
    reader.readAsArrayBuffer(file);
  });
}
