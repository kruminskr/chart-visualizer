# SVG comparison: ours vs the LaSER designer's files

Date: 2026-11-08. Method: each designer SVG (Illustrator export, units = pt) was matched with the same data rendered by our app at the same physical size (pt → mm). The two were compared side by side and as an overlay in Chromium. Script: the scratchpad `compare.cjs` (not committed, because it reads LaSER's files, which are not in git).

| Designer file | Our chart | Size (mm) | Verdict |
|---|---|---|---|
| `_16.svg` grouped bars | sheet 1, bars, labels inside, full years | 165 × 46,3 | ✅ matches. Their groups are slightly wider; tune with "Bar width". |
| `_11.svg` horizontal bars | sheet 3, horizontal, labels inside | 77,4 × 29,7 | ✅ matches (bar thickness 0.74 vs our default 0.75; white labels inside) |
| `_07.svg` horizontal, grouped by country | sheet 4, horizontal, labels outside, largest first | 77,5 × 46,8 | ✅ matches (tight bars in a group, rules between groups, labels in the bar colour). Group **order** differs: the designer put Igaunija first. |
| `_17.svg` multi-line | sheet 5, lines, full years | 77,5 × 90,3 | ✅ matches (0.5 pt lines, markers, legend) |
| `_09_bez_teksta-52.svg` line with fill | sheet 6, area fill | 50,9 × 57,8 | ⚠️ Different data in their file (226 → 1534, 2016–2026; not in the workbook). Style matches: fill #FCE5F1, 1 pt line. The designer also uses **markers + first/last value labels** → now available ("Value labels: First and last"). |
| PDF spec chart | spend_data, bars, unit "%" | 77,5 × 80,1 | ✅ matches (magenta K0 M100, 0.25 pt K30 grid, 7 pt K50 labels) |
| `_25.svg` dot plot (data rebuilt from the circle positions) | dot plot, single strip | 165 × 16 | ✅ matches after the fixes below. Colours differ: in this file **Lietuva is pink and Igaunija dark**, the reverse of 16/17. |
| `_09_bez_teksta-50/51.svg` | — | 50,8 × 58 | Not compared: their data is not in the workbook |

## Spec values confirmed

- **Widths:** 77,5 mm / 165 mm. All designer viewBoxes are these widths in pt.
- **Grid:** 0,25 pt `#B3B3B3`. **Labels:** 7 pt Montserrat Regular `#808080` (cap height 4,9 pt = 0,7 em).
- **Lines:** single line 1 pt; multi-line 0,5 pt with markers. Legend dot r = 2,83 pt (1 mm). Dot-plot dot r = 5,22 pt.
- **Colours:** magenta `#E6007E`, light pink `#F29FC5` (16/17) or `#F088B6` (07/09), dark `#575756`, area fill `#FCE5F1`, dot-plot band `#F2F2F2`, other dots `#DADADA` with multiply blending.

## Fixed after this comparison

1. **Dot plot, single strip:** country labels now sit on the legend row and the band fills the height. Before, the band collapsed to 1,5 mm at the designer's 16 mm height.
2. **Horizontal bars:** default thickness 0,75 (0,85 when grouped by country). A label now fits inside if the bar is taller than the cap height, so 7 pt labels fit in 2,5 mm bars as in `_11`.
3. **Grouped horizontal bars:** tight bars within a group, extra space and a 0,25 pt rule between groups plus top and bottom rules, outside labels in the bar colour.
4. **New "Order: largest first"** for bars (sorts within each group, as in `_07`).
5. **Lines: value labels** "First and last" / "All points", above the point in the line colour (as in `_09-52`).

## Remaining, deliberate differences

- **Text stays live `<text>`** (the designer's files have text as outlines). The designer asked for editable text and fonts, so this is by design. Montserrat must be installed on the PC that opens the SVG, because Illustrator ignores the Google Fonts `@import`.
- **Zero on the axis:** `_25` writes "0", `_17` writes "0,0". We print every tick with the same number of decimals. ❓ Asked LaSER.
- **Group order** (`_07`): ours follows the Excel order. Reorder the rows in Excel, or see the question to LaSER.
- **Left inset:** the PDF spec shows 15 mm before the first bar, and `_16` uses about 4 mm. We fit the y-labels (8–15 mm). The designer says she adjusts this per context.
