import { describe, expect, it } from 'vitest';
import { placePointLabels } from '@/utils/format';

describe('placePointLabels (multi-line value labels at one x)', () => {
  const H = 2;
  it('far apart: every label sits above its own point', () => {
    expect(placePointLabels([10, 30], { gap: 1, height: H })).toEqual([9, 29]);
  });
  it('two close points: the lower label moves below its point, the upper stays above', () => {
    const [a, b] = placePointLabels([20, 20.5], { gap: 1, height: H, below: 2.7 });
    expect(a).toBe(19);
    expect(b).toBe(23.2);
  });
  it('the lowest label also moves below when it would cover the other line\'s point', () => {
    // labels 19 and 21.5 don't touch each other, but the lower label (21.5 up to 19.5) covers the point at 20
    expect(placePointLabels([20, 22.5], { gap: 1, height: H, below: 2.7 })).toEqual([19, 25.2]);
  });
  it('three close points: no two labels closer than the label height', () => {
    const ys = placePointLabels([20, 20.4, 20.8], { gap: 1, height: H, below: 2.7 }).sort((p, q) => p - q);
    for (let k = 1; k < ys.length; k++) expect(ys[k] - ys[k - 1]).toBeGreaterThanOrEqual(H - 1e-9);
  });
});
