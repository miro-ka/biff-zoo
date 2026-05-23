import type { EquilibriumKind, Params, RHS } from './types';
import { findEquilibria } from './analysis';
import { rk4Step } from './integrate';

export interface EqPoint3D {
  p: number; // parameter axis value
  x: number;
  y: number;
  kind: EquilibriumKind;
}

export interface CycleLoop3D {
  p: number;
  pts: Array<[number, number]>; // sampled (x, y) around the closed orbit
}

export interface ManifoldData3D {
  paramName: string;
  paramRange: { min: number; max: number };
  xRange: { min: number; max: number };
  yRange: { min: number; max: number };
  eqs: EqPoint3D[];
  cycles: CycleLoop3D[];
}

export interface ManifoldOptions {
  nSamples?: number;
  cycleSamples?: number;
  cycleMinAmplitudeFrac?: number;
  seed?: [number, number];
  dt?: number;
  transientSteps?: number;
  cycleSteps?: number;
}

/**
 * Sweep a parameter, find equilibria + limit cycle (if any) at each value.
 * Generic: caller supplies how to get the 2D RHS for a given parameter value.
 */
export function computeManifold(
  rhsAtParam: (p: number) => RHS,
  params: Params,
  paramRange: { min: number; max: number },
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number },
  opts: ManifoldOptions = {},
): ManifoldData3D {
  const nSamples = opts.nSamples ?? 50;
  const cycleSamples = opts.cycleSamples ?? 60;
  const cycleMinAmp = opts.cycleMinAmplitudeFrac ?? 0.05;
  const seed: [number, number] = opts.seed ?? [
    (bounds.xMin + bounds.xMax) / 2 + (bounds.xMax - bounds.xMin) * 0.3,
    (bounds.yMin + bounds.yMax) / 2,
  ];
  const dt = opts.dt ?? 0.05;
  const transient = opts.transientSteps ?? 4000;
  const cycSteps = opts.cycleSteps ?? 4000;

  const eqs: EqPoint3D[] = [];
  const cycles: CycleLoop3D[] = [];
  const dp = (paramRange.max - paramRange.min) / nSamples;
  const xSpan = bounds.xMax - bounds.xMin;
  const ySpan = bounds.yMax - bounds.yMin;

  for (let i = 0; i <= nSamples; i++) {
    const p = paramRange.min + i * dp;
    const rhs = rhsAtParam(p);

    const found = findEquilibria(rhs, params, bounds, 14);
    for (const e of found) {
      eqs.push({ p, x: e.x, y: e.y, kind: e.kind });
    }

    let x = seed[0];
    let y = seed[1];
    for (let k = 0; k < transient; k++) {
      [x, y] = rk4Step(rhs, x, y, params, dt);
      if (!Number.isFinite(x) || !Number.isFinite(y)) break;
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    const traj: Array<[number, number]> = [];
    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    let cx = x, cy = y;
    for (let k = 0; k < cycSteps; k++) {
      [cx, cy] = rk4Step(rhs, cx, cy, params, dt);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) break;
      traj.push([cx, cy]);
      if (cx < xmin) xmin = cx;
      if (cx > xmax) xmax = cx;
      if (cy < ymin) ymin = cy;
      if (cy > ymax) ymax = cy;
    }
    const ampX = (xmax - xmin) / xSpan;
    const ampY = (ymax - ymin) / ySpan;
    if (ampX < cycleMinAmp && ampY < cycleMinAmp) continue;
    if (traj.length < 50) continue;

    // Extract one period by slicing between two consecutive x-peaks above the upper 30% band.
    let lastPeakIdx = -1;
    let prevPeakIdx = -1;
    for (let k = 2; k < traj.length - 2; k++) {
      const a = traj[k - 1][0];
      const b = traj[k][0];
      const c = traj[k + 1][0];
      if (b > a && b > c && b > xmin + (xmax - xmin) * 0.7) {
        prevPeakIdx = lastPeakIdx;
        lastPeakIdx = k;
        if (prevPeakIdx >= 0) break;
      }
    }
    let onePeriod: Array<[number, number]>;
    if (prevPeakIdx >= 0 && lastPeakIdx > prevPeakIdx) {
      onePeriod = traj.slice(prevPeakIdx, lastPeakIdx + 1);
    } else {
      onePeriod = traj.slice(traj.length - Math.min(traj.length, 800));
    }
    const sampled: Array<[number, number]> = [];
    for (let k = 0; k < cycleSamples; k++) {
      const idx = Math.floor((k / cycleSamples) * onePeriod.length);
      sampled.push(onePeriod[Math.min(idx, onePeriod.length - 1)]);
    }
    sampled.push(sampled[0]);
    cycles.push({ p, pts: sampled });
  }

  return {
    paramName: '',
    paramRange,
    xRange: { min: bounds.xMin, max: bounds.xMax },
    yRange: { min: bounds.yMin, max: bounds.yMax },
    eqs,
    cycles,
  };
}
