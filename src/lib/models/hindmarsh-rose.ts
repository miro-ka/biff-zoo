import type { Burster } from '../types';

// Hindmarsh–Rose (1984). The canonical square-wave burster.
//   dx/dt = y − a x³ + b x² − z + I        (fast voltage)
//   dy/dt = c − d x² − y                    (fast recovery)
//   dz/dt = r ( s (x − x_R) − z )          (slow adaptation, r ≪ 1)
// Fast subsystem (z fixed) undergoes fold of equilibria + saddle-homoclinic
// of cycle as z varies → fold/homoclinic = square-wave burster.
export const hindmarshRose: Burster = {
  id: 'hr',
  name: 'Hindmarsh–Rose',
  short: 'HR',
  classical: 'square-wave',
  rhs: (x, y, z, p) => {
    return [
      y - p.a * x * x * x + p.b * x * x - z + p.I,
      p.c - p.d * x * x - y,
      p.r * (p.s * (x - p.xR) - z),
    ];
  },
  defaultParams: { a: 1, b: 3, c: 1, d: 5, s: 4, xR: -1.6, r: 0.006, I: 2.5 },
  slowVarIdx: 2,
  spikeVarIdx: 0,
  slowRange: { min: 1.4, max: 3.4 },
  voltageRange: { min: -2.2, max: 2.2 },
  fastYRange: { min: -25, max: 5 },
  labels: { x: 'x (V)', y: 'y', z: 'z (slow)' },
  initial: [-1.6, -10, 2.0],
  dt: 0.05,
  spikeThreshold: 0.0,
  restBif: 'fold',
  cycleBif: 'saddle-homoclinic',
  latex: [
    '\\dot x = y - a x^3 + b x^2 - z + I',
    '\\dot y = c - d x^2 - y',
    '\\dot z = r\\,(\\,s(x - x_R) - z\\,)',
    '\\text{rest: fold,\\ \\ cycle: saddle-homoclinic\\quad(square-wave)}',
  ],
  notes:
    'The fast (x,y) subsystem with z fixed has a stable equilibrium and a coexisting stable limit cycle for an intermediate range of z. The slow variable z drifts: up while spiking (terminating the burst at saddle-homoclinic), down during rest (initiating the burst at the fold). Result: square-wave bursts with roughly constant spike amplitude and a flat plateau between bursts.',
};
