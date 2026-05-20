import type { Burster, Equilibrium, EquilibriumKind, Params, RHS } from './types';
import { findEquilibria } from './analysis';
import { rk4Step } from './integrate';

export interface DissectionData {
  slowName: string;
  eqPoints: Array<{ s: number; v: number; kind: EquilibriumKind }>;
  cyclePoints: Array<{ s: number; vMin: number; vMax: number }>;
}

function frozenFastRHS(burster: Burster, slowVal: number): { rhs: RHS; spikeIsFirst: boolean } {
  const { slowVarIdx, spikeVarIdx, rhs } = burster;
  const fastIdxs = [0, 1, 2].filter((i) => i !== slowVarIdx);
  const spikeIsFirst = spikeVarIdx === fastIdxs[0];

  const frozen: RHS = (fx, fy, p) => {
    const state: [number, number, number] = [0, 0, 0];
    state[fastIdxs[0]] = fx;
    state[fastIdxs[1]] = fy;
    state[slowVarIdx] = slowVal;
    const d = rhs(state[0], state[1], state[2], p);
    return [d[fastIdxs[0]], d[fastIdxs[1]]];
  };
  return { rhs: frozen, spikeIsFirst };
}

function fastBounds(burster: Burster) {
  const vSpan = burster.voltageRange.max - burster.voltageRange.min;
  const fySpan = burster.fastYRange.max - burster.fastYRange.min;
  return {
    xMin: burster.voltageRange.min - vSpan * 0.3,
    xMax: burster.voltageRange.max + vSpan * 0.3,
    yMin: burster.fastYRange.min - fySpan * 0.2,
    yMax: burster.fastYRange.max + fySpan * 0.2,
  };
}

export function dissect(burster: Burster, params: Params, nSlow = 70): DissectionData {
  const { slowRange } = burster;
  const eqPoints: DissectionData['eqPoints'] = [];
  const cyclePoints: DissectionData['cyclePoints'] = [];
  const ds = (slowRange.max - slowRange.min) / nSlow;
  const bounds = fastBounds(burster);

  for (let i = 0; i <= nSlow; i++) {
    const s = slowRange.min + i * ds;
    const { rhs: frozen, spikeIsFirst } = frozenFastRHS(burster, s);

    const eqs = findEquilibria(frozen, params, bounds, 14);
    for (const eq of eqs) {
      const v = spikeIsFirst ? eq.x : eq.y;
      eqPoints.push({ s, v, kind: eq.kind });
    }

    let fx = burster.voltageRange.max * 0.85;
    let fy = (burster.fastYRange.min + burster.fastYRange.max) / 2;
    const stepDt = burster.dt * 2;
    for (let k = 0; k < 2500; k++) {
      [fx, fy] = rk4Step(frozen, fx, fy, params, stepDt);
      if (!Number.isFinite(fx) || !Number.isFinite(fy)) break;
    }
    if (!Number.isFinite(fx) || !Number.isFinite(fy)) continue;
    let vmin = Infinity;
    let vmax = -Infinity;
    for (let k = 0; k < 3000; k++) {
      [fx, fy] = rk4Step(frozen, fx, fy, params, stepDt);
      const v = spikeIsFirst ? fx : fy;
      if (v < vmin) vmin = v;
      if (v > vmax) vmax = v;
    }
    const vSpan = burster.voltageRange.max - burster.voltageRange.min;
    if (vmax - vmin > vSpan * 0.15) {
      cyclePoints.push({ s, vMin: vmin, vMax: vmax });
    }
  }

  return { slowName: burster.labels[['x', 'y', 'z'][burster.slowVarIdx] as 'x' | 'y' | 'z'], eqPoints, cyclePoints };
}
