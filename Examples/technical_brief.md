# LaSER Data Visualization Tool — Technical Brief for Prototype Development

## Project Overview

You are building a **web-based data visualization tool** for LaSER, a privately funded research organization. The tool allows researchers to upload an Excel file, configure a branded chart, and export it as a vector file for use in academic papers and publications.

This document describes everything needed to build a working **prototype** — one chart type, one color, no auth, no multi-user. The goal is a demonstrable end-to-end flow: upload Excel → see branded chart → download SVG. The prototype will be shown to the client for feedback before further development.

---

## Prototype Scope — What Is and Is Not Included

### Included in prototype
- Excel file upload (.xlsx)
- Vertical bar chart rendered with exact brand specifications
- Editable chart title
- SVG export (RGB, for web/screen)
- Width presets (77.5mm and 165mm) plus custom width/height input
- Local session only — no backend, no login, no saving between sessions

### Explicitly excluded from prototype
- Multiple chart types (only bar chart)
- Multiple data series / multiple colors
- PDF/CMYK export
- User accounts and authentication
- Project saving and multi-device access
- Social media export formats

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend framework | React (Vite) | Component model maps well to chart + controls |
| Chart rendering | D3.js | Full SVG control, sub-pixel precision, physical units |
| Excel parsing | SheetJS (xlsx) | Client-side Excel parsing, no backend needed for prototype |
| Styling | Tailwind CSS | Fast utility-based UI |
| Export | Native SVG serialization | No library needed for SVG export |

No backend is needed for the prototype. Everything runs in the browser.

---

## Input: Excel File Format

The user uploads a `.xlsx` file. Based on the provided sample file, the structure is:

```
Row 1:  Chart title / description (full string, e.g. "Baltijas valstu aizsardzības izdevumi faktiskajās cenās 2016.-2026. gadā (mljrd. EUR)")
Row 2:  Column headers — Column A: "Gads" (Year), Column B: "Aizsardzības izdevumi" (the data series name)
Row 3+: Data rows — Column A: year (integer, e.g. 2016), Column B: numeric value (e.g. 1.39)
```

### Sample data from the real file:
Avaliable in /examples/spend_data(1).xlsx

### Parsing logic
- Row 1, Column A = chart title (pre-populate the title field in the UI)
- Row 2 = headers (skip for chart rendering, but use Column B header as series label)
- Row 3 onwards = data. Column A = X-axis label (year), Column B = Y-axis value (float)
- All parsing happens client-side using SheetJS
- Validate that Column A values are numeric years and Column B values are numeric
- Show a clear error message if the file structure does not match expectations

---

## Output: SVG Chart Specification

This is the most critical section. Every measurement must be implemented exactly.

### Chart type
Vertical bar chart. No line, no pie. Bars only.

### Physical dimensions and units
The SVG must use physical units (mm and pt), not pixels, so that it renders correctly at print resolution.

- **Narrow preset:** width = 77.5mm
- **Wide preset:** width = 165mm
- **Height:** user-defined (no fixed default — the UI should have a height input field)
- **Custom size:** user can override both width and height with any value in mm

### Color — bars
- **Single color for all bars:** Magenta
- CMYK value: C0 M100 Y0 K0
- RGB equivalent: #FF00AA (use this for SVG/screen rendering)
- Do not use any other color for bars in the prototype

### Typography
- **Font:** Montserrat Regular
- Load from Google Fonts: https://fonts.google.com/specimen/Montserrat
- Embed the @import in the SVG so the font works in exported files
- **Font size for all axis labels:** 7pt
- **Font color for all axis labels:** C0 M0 Y0 K50 = approximately #808080 (50% gray)

### Grid lines (horizontal)
- Color: C0 M0 Y0 K30 = approximately #B3B3B3 (30% gray)
- Stroke width: 0.25pt
- Grid lines run horizontally across the full chart width at each Y-axis tick
- The Y-axis itself has no visible line (only grid lines, no axis spine)

### Margins and spacing
- Top margin: 15mm (space above the chart area)
- Left margin: 5mm
- Right margin: 5mm (enough for the % label at top right)
- Bottom margin: enough for X-axis labels (approximately 7mm)

### Y-axis
- No visible axis line (spine) — only horizontal grid lines
- Y-axis labels appear on the LEFT side of the chart
- Label format: plain numbers (0, 1, 2, 3... or 0, 2, 4, 6... depending on data range)
- Font: Montserrat Regular 7pt, color #808080
- Y range: start at 0, ceiling rounded up to the next clean integer above max data value
- Unit label: displayed at the TOP RIGHT of the chart area (e.g., "%" or the unit from the data)
- The unit label uses the same font and color as axis labels

### X-axis
- No visible axis line
- Labels appear BELOW the bars
- **Year label logic:** First year and last year are displayed in full (e.g., "2016", "2026"). All years in between are abbreviated to 2 digits (e.g., "17", "18", "19"). This is a hard requirement — implement this exactly.
- Font: Montserrat Regular 7pt, color #808080
- Minimum space between X label and bar bottom: 1.5mm

### Bars
- Bar gap ratio: 40% gap, 60% bar width (i.e., bars take 60% of the available slot width)
- Bars start from Y=0
- No rounded corners
- No border/stroke on bars — solid fill only
- Bar color: #FF00AA (magenta)

### Chart title
- Displayed above the chart
- Editable by the user in the UI (pre-populated from the Excel file's Row 1)
- Font: Montserrat Regular, slightly larger than axis labels (suggest 9pt or 10pt)
- Color: same dark gray as axis labels or slightly darker — to be confirmed, use #595959 for now
- The title is part of the UI, not necessarily embedded in the SVG export (this can be a toggle)

### Value labels on bars (optional for prototype)
- Not visible in the reference chart design — do not add them unless the client requests
- Keep this off by default

---

## UI Layout

The interface should have two panels:

### Left panel — Controls
1. **File upload area** — drag and drop or click to upload .xlsx
2. **Chart title field** — text input, pre-populated from Excel row 1
3. **Y-axis unit field** — text input (default: read from data, allow override, e.g. "%", "mljrd. EUR")
4. **Width selector** — three options: "77.5mm", "165mm", "Custom"
5. **Custom width input** — number field in mm (visible only when Custom is selected)
6. **Height input** — number field in mm (always visible)
7. **Export SVG button** — downloads the SVG file

### Right panel — Preview
- Live SVG preview that updates as the user changes any control
- The preview should be scaled to fit the screen (CSS transform scale) but the underlying SVG dimensions remain in physical units
- Show a subtle background behind the chart to make the white chart area visible

---

## SVG Export Requirements

When the user clicks "Export SVG":
- Serialize the rendered SVG to a string
- Ensure the Montserrat font is embedded via `<style>@import url(...)</style>` inside the SVG
- Set the SVG `width` and `height` attributes in mm (e.g., `width="165mm" height="90mm"`)
- Set `xmlns="http://www.w3.org/2000/svg"` on the root element
- Filename: use the chart title, sanitized for filesystem use (spaces → underscores, remove special chars), with `.svg` extension
- Trigger a browser download using a Blob URL

---

## Data Validation and Error Handling

- If the uploaded file is not .xlsx: show error "Please upload an .xlsx file"
- If Row 1 / Row 2 / data rows cannot be parsed: show a specific error "The file structure is not recognized. Expected: Row 1 = title, Row 2 = headers, Row 3+ = year and value columns."
- If any value in Column B is not numeric: show "Non-numeric value found in row [N]. Please check your data."
- If fewer than 2 data rows: show "At least 2 data points are required to generate a chart."
- Errors should appear inline near the upload area, not as browser alerts

---

## Reference Chart (Visual Target)

The reference bar chart shows Baltic states defense spending from 2016 to 2026 in billions of EUR. The bars grow from ~1.39 in 2016 to ~9.35 in 2026. This is the exact dataset in the provided Excel file.

The final exported SVG should be visually indistinguishable from the reference chart provided by the designer, when opened in a vector editor like Inkscape or Adobe Illustrator.

Example avalibale in /examples directory

Key visual characteristics to match:
- Very thin, light gray grid lines that feel subtle, not dominant
- Bright magenta bars with no outline
- Minimal, clean axis labels in gray
- Generous whitespace — the chart does not feel crowded
- The "%" unit sits quietly at the top right, same weight as axis labels
- First and last year labels are full 4-digit years; all others are 2-digit

---

## File Structure Suggestion

```
/src
  /components
    ChartControls.jsx      — left panel, all inputs
    BarChart.jsx           — D3-powered SVG chart component
    ChartPreview.jsx       — right panel, wraps BarChart with scaling
  /utils
    excelParser.js         — SheetJS parsing logic, validation
    svgExporter.js         — SVG serialization and download
    chartHelpers.js        — Y-axis range calculation, label logic
  App.jsx                  — layout, state management
  main.jsx
/public
index.html
```

---

## Key Constraints Summary

- All measurements in the SVG must use pt or mm units, not px
- Montserrat font must be embedded in exported SVG
- Year label abbreviation logic (first/last full, middle 2-digit) is mandatory
- Bar color is exactly #FF00AA — no other bar colors in prototype
- Grid line weight is 0.25pt — this must be set precisely
- The chart must look correct when opened in Inkscape or Illustrator — not just in the browser
- Do not add features beyond the prototype scope listed above

---

## What Success Looks Like

The prototype is complete when:
1. A user can upload the provided `spend_data.xlsx` file
2. The chart renders immediately with correct brand styling
3. The user can change the title and dimensions
4. Clicking Export SVG downloads a file that, when opened in a vector editor, matches the reference chart visually with correct physical dimensions
