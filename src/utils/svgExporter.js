const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Montserrat&display=swap');";

/**
 * Clones the live SVG, injects Montserrat @import, serializes, and triggers download.
 * @param {SVGSVGElement} svgElement — the rendered <svg> DOM node
 * @param {string} title — used to derive the filename
 */
export function exportSVG(svgElement, title) {
  const clone = svgElement.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  let style = clone.querySelector('style');
  if (!style) {
    style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    clone.insertBefore(style, clone.firstChild);
  }
  if (!style.textContent.includes('Montserrat')) {
    style.textContent = FONT_IMPORT;
  }

  const svg = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = sanitizeFilename(title || 'chart') + '.svg';
  a.click();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(str) {
  return str
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 100);
}
