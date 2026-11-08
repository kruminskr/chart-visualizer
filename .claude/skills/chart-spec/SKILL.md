---
name: chart-spec
description: The non-negotiable LaSER chart/SVG specification and how to verify it. Use before and after touching anything under components/*Chart*.jsx, utils/svgExporter.js, utils/chartHelpers.js, lib/brandColors.js, or anything that changes chart output.
---

# LaSER chart specification

Exported SVGs go straight into academic publications. Any deviation is a bug.

## Units
- The SVG `width`/`height` are in **mm** (`"165mm"`), and the viewBox is in mm (1 user unit = 1 mm). Never use px anywhere in chart output.
- pt → mm happens at definition time: `mm = pt * 25.4 / 72`, then rounded. 7pt font = **2.469**, 0.25pt grid stroke = **0.088**.
- Every computed coordinate/size is rounded to 3 decimals: `Math.round(n * 1000) / 1000` (`rnd`). An emitted attribute like `0.08819444444444444` is a bug.
- Width presets: 77.5 mm and 165 mm. Default height is 90 mm.

## Visual rules
- Colours follow **countries** (`lib/palette.js`): Latvija #E6007E, Igaunija #F29FC5 (pending LaSER: or #F088B6), Lietuva #575756, EU #1D1D1B, others/Pārējās #B3B3B3. Non-country series use the fallback order starting with magenta. Users override colours from the brand swatches only.
- Font: **Montserrat**, via a Google Fonts `@import` in an SVG `<style>`, which must survive export (`utils/svgExporter.js`).
- No axis spines. Horizontal grid lines only, `#B3B3B3`, 0.088 mm. Labels are `#808080`.
- Year labels: user toggle `yearFormat` (`utils/format.js#formatCategory`). 'short' (default for vertical) = first and last 4 digits, middle 2 digits; 'full' (default for horizontal). Dense axes are thinned (`thinLabels`): every k-th label, first and last always shown.
- Numbers: Latvian format, decimal comma (`formatNumber`).
- Multi-series charts get a legend below the plot, and the SVG height grows by the legend height.

## Implementation rules
- D3 is for **math only**: `scaleBand`, `scaleLinear`, `.nice()`, `.ticks()`, `line()`. All elements are React JSX. Never `d3.select(...)`, `.call(axis)`, or DOM mutation.
- Chart components are `forwardRef` so `svgRef` can serialize the live node.
- The preview scales the mm-sized SVG to fit with a CSS transform (`ChartPreview`). Never change the SVG's own size for display.

## Verify
1. `npx playwright test -g "spec|export"`. These assert units, colour, stroke, year labels, rounding, and the font in the exported file.
2. `npm run screenshot -- --demo` and look at the PNG.
3. For a quick look at the raw export, run a Playwright snippet that clicks **Export SVG** and greps the download for `px`, `\.\d{4,}`, `E6007E`, and `Montserrat`.
