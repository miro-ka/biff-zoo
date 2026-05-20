import type { Burster } from '../types';

// Elliptic burster from a Bautin (subcritical-Hopf + fold-of-cycles) fast subsystem
// coupled to a slow variable. This is the cleanest minimal model that produces a true
// elliptic envelope: spike amplitude grows from zero at burst onset (sub-Hopf escape)
// and shrinks back to zero at burst termination (fold-of-cycles annihilation).
//
//   ẋ = z x − ω y + x (x²+y²) − x (x²+y²)²
//   ẏ = ω x + z y + y (x²+y²) − y (x²+y²)²
//   ż = ε ( c − (x²+y²) − k I_drive )
//
// Fast subsystem (z held fixed) bifurcation structure:
//   z < −1/4:  only the origin is stable (rest)
//   −1/4 < z < 0:  bistability — stable origin + stable outer cycle + unstable middle cycle
//   z > 0:  origin unstable, only the outer cycle remains
//
// Slow variable z is driven by the amplitude r² = x²+y². At rest (r²≈0): z rises.
// At spiking (r²≈1): z falls. Hysteresis between sub-Hopf (z=0) and fold-of-cycles
// (z=−1/4) gives the burst plateau.
export const fitzhughRinzel: Burster = {
  id: 'fhr',
  name: 'Elliptic burster (Bautin)',
  short: 'Elliptic',
  classical: 'elliptic',
  rhs: (x, y, z, p) => {
    const r2 = x * x + y * y;
    const f = r2 - r2 * r2;
    return [
      z * x - p.omega * y + x * f,
      p.omega * x + z * y + y * f,
      p.eps * (p.c - r2 - p.k * p.I),
    ];
  },
  defaultParams: { omega: 1.0, eps: 0.01, c: 0.5, k: 0.4, I: 0.0 },
  slowVarIdx: 2,
  spikeVarIdx: 0,
  slowRange: { min: -0.45, max: 0.25 },
  voltageRange: { min: -1.4, max: 1.4 },
  fastYRange: { min: -1.4, max: 1.4 },
  labels: { x: 'x', y: 'y', z: 'z (slow)' },
  initial: [0.05, 0.0, -0.35],
  dt: 0.05,
  spikeThreshold: 0.0,
  restBif: 'sub-hopf',
  cycleBif: 'fold-cycle',
  latex: [
    '\\dot x = z\\,x - \\omega y + x\\,(r^2 - r^4),\\quad r^2 = x^2 + y^2',
    '\\dot y = \\omega x + z\\,y + y\\,(r^2 - r^4)',
    '\\dot z = \\varepsilon\\,(\\,c - r^2 - k\\,I\\,)',
    '\\text{rest: subcritical Hopf,\\ \\ cycle: fold-of-cycles\\quad(elliptic)}',
  ],
  notes:
    'A Bautin (degenerate Hopf) fast subsystem gives genuine bistability between rest and spiking. The slow variable z senses the squared amplitude r²: it rises while the cell rests, destabilising the equilibrium at the subcritical Hopf (z=0); it falls while spiking, eventually colliding the stable and unstable cycles at the fold-of-cycles (z=−1/4). Spike amplitude grows at burst onset and shrinks at termination — the elliptic envelope.',
};
