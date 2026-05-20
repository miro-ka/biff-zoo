import type { Model2D } from '../types';

export function mlc(V3: number, V4: number, phi: number) {
  return (V: number, n: number, p: Record<string, number>) => {
    const mInf = 0.5 * (1 + Math.tanh((V - p.V1) / p.V2));
    const nInf = 0.5 * (1 + Math.tanh((V - V3) / V4));
    const tauN = 1 / Math.cosh((V - V3) / (2 * V4));
    const dV =
      (p.I -
        p.gL * (V - p.VL) -
        p.gCa * mInf * (V - p.VCa) -
        p.gK * n * (V - p.VK)) /
      p.C;
    const dn = (phi * (nInf - n)) / tauN;
    return [dV, dn] as [number, number];
  };
}

const baseParams = {
  C: 20, gL: 2, VL: -60, gCa: 4.4, VCa: 120, gK: 8, VK: -84,
  V1: -1.2, V2: 18, I: 40,
};

// SNIC: V3=12, V4=17.4 (Class 1). Increasing I: saddle and node collide on invariant circle.
export const morrisLecarSNIC: Model2D = {
  id: 'ml-snic',
  name: 'Morris–Lecar (Class 1, SNIC)',
  short: 'SNIC',
  rhs: mlc(12, 17.4, 0.067),
  defaultParams: { ...baseParams, I: 40 },
  bifParam: { name: 'I', min: 0, max: 100, default: 40, step: 0.5, unit: 'μA/cm²' },
  bounds: { xMin: -75, xMax: 40, yMin: -0.05, yMax: 0.7 },
  labels: { x: 'V (mV)', y: 'n' },
  initial: [-60, 0.01],
  dt: 0.1,
  spikeThreshold: 0,
  freqScale: 1000,
  freqUnit: 'Hz',
  latex: [
    'C\\,\\dot V = I - g_L(V-V_L) - g_{Ca}\\,m_\\infty(V)(V-V_{Ca}) - g_K\\,n\\,(V-V_K)',
    '\\dot n = \\phi\\,(n_\\infty(V) - n)/\\tau_n(V)',
    'V_3 = 12,\\ V_4 = 17.4,\\ \\phi = 0.067 \\quad\\text{(Class 1 / SNIC)}',
  ],
  notes:
    'Saddle and node sit on a closed invariant curve. As I increases they collide and vanish, leaving a limit cycle of arbitrarily long period. Frequency at onset scales as √(I−I_c).',
};

// Fold off-cycle: V3=2, V4=30 (Class 2), bistable I range
export const morrisLecarFold: Model2D = {
  id: 'ml-fold',
  name: 'Morris–Lecar (Fold off cycle)',
  short: 'Fold',
  rhs: mlc(2, 30, 0.04),
  defaultParams: { ...baseParams, gCa: 4.0, I: 90 },
  bifParam: { name: 'I', min: 60, max: 130, default: 90, step: 0.5, unit: 'μA/cm²' },
  bounds: { xMin: -75, xMax: 40, yMin: -0.05, yMax: 0.6 },
  labels: { x: 'V (mV)', y: 'n' },
  initial: [-30, 0.0],
  dt: 0.1,
  spikeThreshold: 0,
  freqScale: 1000,
  freqUnit: 'Hz',
  latex: [
    'C\\,\\dot V = I - g_L(V-V_L) - g_{Ca}\\,m_\\infty(V)(V-V_{Ca}) - g_K\\,n\\,(V-V_K)',
    '\\dot n = \\phi\\,(n_\\infty(V) - n)/\\tau_n(V)',
    'V_3 = 2,\\ V_4 = 30,\\ \\phi = 0.04 \\quad\\text{(Class 2 / fold)}',
  ],
  notes:
    'Stable rest and a coexisting stable limit cycle: bistability. Raising I causes a saddle-node of equilibria; rest disappears, only spiking remains. Onset is to a finite-frequency cycle.',
};

// Class-comparison reuses these; expose Class-2 Hopf via Morris–Lecar too
export const morrisLecarHopf: Model2D = {
  id: 'ml-hopf',
  name: 'Morris–Lecar (Class 2, Hopf)',
  short: 'ML-Hopf',
  rhs: mlc(2, 30, 0.04),
  defaultParams: { ...baseParams, I: 90 },
  bifParam: { name: 'I', min: 60, max: 200, default: 90, step: 0.5, unit: 'μA/cm²' },
  bounds: { xMin: -75, xMax: 40, yMin: -0.05, yMax: 0.6 },
  labels: { x: 'V (mV)', y: 'n' },
  initial: [-30, 0.0],
  dt: 0.1,
  spikeThreshold: 0,
  freqScale: 1000,
  freqUnit: 'Hz',
  latex: [
    'C\\,\\dot V = I - g_L(V-V_L) - g_{Ca}\\,m_\\infty(V)(V-V_{Ca}) - g_K\\,n\\,(V-V_K)',
    'V_3 = 2,\\ V_4 = 30 \\quad\\text{(Class 2)}',
  ],
  notes:
    'Class 2 excitability. Spiking onset is to nonzero frequency. Subthreshold dynamics show damped oscillations near rest.',
};
