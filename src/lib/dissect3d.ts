import type { Burster, Params, RHS } from './types';
import { computeManifold, type ManifoldData3D } from './manifold3d';

// Frozen fast-subsystem RHS at a given slow value. The returned RHS exposes
// (fx, fy) = (other-fast-var, spike-var) so the 3D renderer can treat fy as voltage.
function frozenFastRHS(burster: Burster, slowVal: number): RHS {
  const { slowVarIdx, spikeVarIdx, rhs } = burster;
  const otherIdx = [0, 1, 2].find((i) => i !== slowVarIdx && i !== spikeVarIdx)!;

  return (fx, fy, p) => {
    const state: [number, number, number] = [0, 0, 0];
    state[spikeVarIdx] = fy;
    state[otherIdx] = fx;
    state[slowVarIdx] = slowVal;
    const d = rhs(state[0], state[1], state[2], p);
    return [d[otherIdx], d[spikeVarIdx]];
  };
}

export function bursterManifold3D(burster: Burster, params: Params): ManifoldData3D {
  const vR = burster.voltageRange;
  const fyR = burster.fastYRange;
  const xSpan = fyR.max - fyR.min;
  const ySpan = vR.max - vR.min;
  const bounds = {
    xMin: fyR.min - xSpan * 0.2,
    xMax: fyR.max + xSpan * 0.2,
    yMin: vR.min - ySpan * 0.3,
    yMax: vR.max + ySpan * 0.3,
  };

  const data = computeManifold(
    (s) => frozenFastRHS(burster, s),
    params,
    burster.slowRange,
    bounds,
    {
      nSamples: 36,
      cycleSamples: 50,
      seed: [(fyR.min + fyR.max) / 2, vR.max * 0.85],
      dt: burster.dt * 2,
      transientSteps: 2500,
      cycleSteps: 3000,
      cycleMinAmplitudeFrac: 0.15,
    },
  );
  return data;
}
