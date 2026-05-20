import type { Model2D } from '../types';

// 2D Hindmarsh-Rose fast subsystem with z held fixed as the bifurcation parameter.
// Varying z scans the fast subsystem through a saddle-homoclinic bifurcation: the
// stable limit cycle grows into the saddle as z increases, and the cycle period
// diverges logarithmically (T ~ -1/ln(z_c - z)). For z > z_c the cycle is gone.
export const saddleHomoclinic: Model2D = {
  id: 'hr-fast',
  name: 'HR fast subsystem (saddle-homoclinic)',
  short: 'Saddle hom.',
  rhs: (x, y, p) => {
    return [
      y - p.a * x * x * x + p.b * x * x - p.z + p.I,
      p.c - p.d * x * x - y,
    ];
  },
  defaultParams: { a: 1, b: 3, c: 1, d: 5, I: 2.0, z: 2.0 },
  bifParam: { name: 'z', min: 1.4, max: 3.0, default: 2.0, step: 0.005 },
  bounds: { xMin: -2.2, xMax: 2.2, yMin: -16, yMax: 4 },
  labels: { x: 'x', y: 'y' },
  initial: [-1.6, -5],
  dt: 0.05,
  spikeThreshold: 0,
  freqScale: 1,
  freqUnit: '1/T',
  fiDuration: 600,
  latex: [
    '\\dot x = y - a x^3 + b x^2 - z + I',
    '\\dot y = c - d x^2 - y',
    '\\text{Cycle terminates at }z = z_c\\text{ via saddle-homoclinic;}\\ T \\sim -1/\\ln(z_c - z)',
  ],
  notes:
    "Hindmarsh–Rose's fast (x,y) subsystem with z frozen. Varying z slides the cubic nullcline; at z = z_c the stable limit cycle collides with a saddle and is destroyed in a saddle-homoclinic bifurcation. The cycle's period diverges logarithmically — slowly enough that you'd mistake it for a finite asymptote in a finite experiment (Izhikevich's cautionary Fig. 38).",
};
