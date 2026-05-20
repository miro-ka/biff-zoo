import type { RHS, Params, Equilibrium, EquilibriumKind } from './types';

const EPS = 1e-5;

export function jacobian(rhs: RHS, x: number, y: number, p: Params): [number, number, number, number] {
  const [fx1, fy1] = rhs(x + EPS, y, p);
  const [fx0, fy0] = rhs(x - EPS, y, p);
  const [fx2, fy2] = rhs(x, y + EPS, p);
  const [fx3, fy3] = rhs(x, y - EPS, p);
  const a = (fx1 - fx0) / (2 * EPS); // df/dx
  const b = (fx2 - fx3) / (2 * EPS); // df/dy
  const c = (fy1 - fy0) / (2 * EPS); // dg/dx
  const d = (fy2 - fy3) / (2 * EPS); // dg/dy
  return [a, b, c, d];
}

function classify(trace: number, det: number, disc: number): EquilibriumKind {
  if (Math.abs(det) < 1e-9) return 'degenerate';
  if (det < 0) return 'saddle';
  if (Math.abs(trace) < 1e-9 && disc < 0) return 'center';
  if (disc < 0) return trace < 0 ? 'stable-spiral' : 'unstable-spiral';
  return trace < 0 ? 'stable-node' : 'unstable-node';
}

export function classifyEquilibrium(rhs: RHS, x: number, y: number, p: Params): Equilibrium {
  const [a, b, c, d] = jacobian(rhs, x, y, p);
  const trace = a + d;
  const det = a * d - b * c;
  const disc = trace * trace - 4 * det;
  let l1re: number, l1im: number, l2re: number, l2im: number;
  if (disc >= 0) {
    const s = Math.sqrt(disc);
    l1re = (trace + s) / 2;
    l2re = (trace - s) / 2;
    l1im = 0;
    l2im = 0;
  } else {
    l1re = trace / 2;
    l2re = trace / 2;
    l1im = Math.sqrt(-disc) / 2;
    l2im = -l1im;
  }
  return {
    x, y, trace, det, disc,
    eig: { lambda1: { re: l1re, im: l1im }, lambda2: { re: l2re, im: l2im } },
    kind: classify(trace, det, disc),
  };
}

function newton2D(
  rhs: RHS, x0: number, y0: number, p: Params, maxIter = 30, tol = 1e-9,
): [number, number] | null {
  let x = x0;
  let y = y0;
  for (let i = 0; i < maxIter; i++) {
    const [fx, fy] = rhs(x, y, p);
    if (Math.abs(fx) < tol && Math.abs(fy) < tol) return [x, y];
    const [a, b, c, d] = jacobian(rhs, x, y, p);
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-14) return null;
    const dx = (d * fx - b * fy) / det;
    const dy = (-c * fx + a * fy) / det;
    x -= dx;
    y -= dy;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  }
  const [fx, fy] = rhs(x, y, p);
  return Math.hypot(fx, fy) < 1e-6 ? [x, y] : null;
}

export function findEquilibria(
  rhs: RHS,
  p: Params,
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number },
  nGrid = 24,
): Equilibrium[] {
  const found: Equilibrium[] = [];
  const dx = (bounds.xMax - bounds.xMin) / nGrid;
  const dy = (bounds.yMax - bounds.yMin) / nGrid;
  const dedup = (x: number, y: number) =>
    found.some((e) => Math.hypot(e.x - x, e.y - y) < Math.max(dx, dy) * 0.05);

  for (let i = 0; i <= nGrid; i++) {
    for (let j = 0; j <= nGrid; j++) {
      const x0 = bounds.xMin + i * dx;
      const y0 = bounds.yMin + j * dy;
      const eq = newton2D(rhs, x0, y0, p);
      if (!eq) continue;
      const [x, y] = eq;
      if (x < bounds.xMin - dx || x > bounds.xMax + dx) continue;
      if (y < bounds.yMin - dy || y > bounds.yMax + dy) continue;
      if (dedup(x, y)) continue;
      found.push(classifyEquilibrium(rhs, x, y, p));
    }
  }
  return found;
}

export type Segment = { x1: number; y1: number; x2: number; y2: number };

export function nullclineSegments(
  rhs: RHS,
  p: Params,
  which: 'x' | 'y',
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number },
  nGrid = 160,
): Segment[] {
  const segs: Segment[] = [];
  const dx = (bounds.xMax - bounds.xMin) / nGrid;
  const dy = (bounds.yMax - bounds.yMin) / nGrid;

  const f = (x: number, y: number) => {
    const [fx, fy] = rhs(x, y, p);
    return which === 'x' ? fx : fy;
  };

  const grid = new Float64Array((nGrid + 1) * (nGrid + 1));
  for (let j = 0; j <= nGrid; j++) {
    for (let i = 0; i <= nGrid; i++) {
      const xi = bounds.xMin + i * dx;
      const yj = bounds.yMin + j * dy;
      grid[j * (nGrid + 1) + i] = f(xi, yj);
    }
  }

  const interp = (v1: number, v2: number, p1: number, p2: number) => {
    const t = v1 / (v1 - v2);
    return p1 + t * (p2 - p1);
  };

  for (let j = 0; j < nGrid; j++) {
    for (let i = 0; i < nGrid; i++) {
      const x0 = bounds.xMin + i * dx;
      const x1 = bounds.xMin + (i + 1) * dx;
      const y0 = bounds.yMin + j * dy;
      const y1 = bounds.yMin + (j + 1) * dy;
      const v00 = grid[j * (nGrid + 1) + i];
      const v10 = grid[j * (nGrid + 1) + (i + 1)];
      const v01 = grid[(j + 1) * (nGrid + 1) + i];
      const v11 = grid[(j + 1) * (nGrid + 1) + (i + 1)];

      let idx = 0;
      if (v00 > 0) idx |= 1;
      if (v10 > 0) idx |= 2;
      if (v11 > 0) idx |= 4;
      if (v01 > 0) idx |= 8;
      if (idx === 0 || idx === 15) continue;

      const edges: { p1: [number, number]; p2: [number, number] }[] = [];
      const bot = (): [number, number] => [interp(v00, v10, x0, x1), y0];
      const right = (): [number, number] => [x1, interp(v10, v11, y0, y1)];
      const top = (): [number, number] => [interp(v01, v11, x0, x1), y1];
      const left = (): [number, number] => [x0, interp(v00, v01, y0, y1)];

      switch (idx) {
        case 1: case 14: edges.push({ p1: left(), p2: bot() }); break;
        case 2: case 13: edges.push({ p1: bot(), p2: right() }); break;
        case 3: case 12: edges.push({ p1: left(), p2: right() }); break;
        case 4: case 11: edges.push({ p1: right(), p2: top() }); break;
        case 6: case 9: edges.push({ p1: bot(), p2: top() }); break;
        case 7: case 8: edges.push({ p1: left(), p2: top() }); break;
        case 5:
          edges.push({ p1: left(), p2: top() });
          edges.push({ p1: bot(), p2: right() });
          break;
        case 10:
          edges.push({ p1: left(), p2: bot() });
          edges.push({ p1: right(), p2: top() });
          break;
      }
      for (const e of edges) {
        segs.push({ x1: e.p1[0], y1: e.p1[1], x2: e.p2[0], y2: e.p2[1] });
      }
    }
  }
  return segs;
}
