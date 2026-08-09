// SVG path geometry for the landing-page charts.
//
// These are hand-built rather than pulled from Recharts because the landing
// visuals are animated with GSAP (stroke-draw, band reveal), which needs stable
// path strings we control. Dashboard charts still use Recharts.

export type Pt = { x: number; y: number };

export type ChartBox = {
  width: number;
  height: number;
  padX: number;
  padTop: number;
  padBottom: number;
};

export const DEFAULT_BOX: ChartBox = {
  width: 600,
  height: 220,
  padX: 8,
  padTop: 16,
  padBottom: 26,
};

/** Map values onto the box, sharing one y-scale across every series drawn. */
export function makeScale(values: number[], box: ChartBox = DEFAULT_BOX) {
  const finite = values.filter((v) => Number.isFinite(v));
  const max = finite.length ? Math.max(...finite) : 1;
  const min = Math.min(0, ...(finite.length ? finite : [0]));
  const span = max - min || 1;
  const plotH = box.height - box.padTop - box.padBottom;
  const plotW = box.width - box.padX * 2;

  return {
    max,
    min,
    /** index → x, for a series of `count` evenly spaced points */
    x: (i: number, count: number) =>
      box.padX + (count <= 1 ? plotW / 2 : (i / (count - 1)) * plotW),
    y: (v: number) => box.padTop + plotH - ((v - min) / span) * plotH,
    baseline: box.height - box.padBottom,
  };
}

/**
 * Catmull-Rom → cubic Bézier. Gives the line a smooth, "designed" curve
 * without the overshoot a naive quadratic smoothing produces.
 */
export function smoothPath(points: Pt[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  }

  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    // 1/6 tension is the standard uniform Catmull-Rom conversion factor.
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`;
  }
  return d;
}

/** Close a line down to the baseline so it can be filled as an area. */
export function areaPath(points: Pt[], baseline: number): string {
  if (points.length === 0) return "";
  const line = smoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L${last.x},${baseline} L${first.x},${baseline} Z`;
}

/** Ribbon between an upper and lower series — the forecast confidence band. */
export function bandPath(upper: Pt[], lower: Pt[]): string {
  if (upper.length === 0 || lower.length === 0) return "";
  const out = smoothPath(upper);
  // Walk the lower edge backwards; its opening moveto becomes a lineto so the
  // two edges join into a single closed ribbon.
  const back = smoothPath([...lower].reverse()).replace(/^M/, "L");
  return `${out} ${back} Z`;
}
