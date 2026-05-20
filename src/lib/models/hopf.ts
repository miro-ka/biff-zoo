import type { Model2D } from '../types';

// Supercritical Hopf normal form:
//   ẋ = μ x − ω y − x(x² + y²)
//   ẏ = ω x + μ y − y(x² + y²)
// μ = bifurcation parameter. μ<0: stable origin. μ>0: unstable origin, stable cycle of radius √μ.
export const supercriticalHopf: Model2D = {
  id: 'hopf-super',
  name: 'Supercritical Andronov–Hopf',
  short: 'Sup Hopf',
  rhs: (x, y, p) => {
    const r2 = x * x + y * y;
    return [p.mu * x - p.omega * y - x * r2, p.omega * x + p.mu * y - y * r2];
  },
  defaultParams: { mu: -0.2, omega: 1.0 },
  bifParam: { name: 'mu', min: -1.0, max: 1.0, default: -0.2, step: 0.01 },
  bounds: { xMin: -1.6, xMax: 1.6, yMin: -1.6, yMax: 1.6 },
  labels: { x: 'x', y: 'y' },
  initial: [0.6, 0.0],
  dt: 0.02,
  spikeThreshold: 0,
  freqScale: 1,
  freqUnit: '1/T',
  fiDuration: 400,
  latex: [
    '\\dot x = \\mu x - \\omega y - x(x^2 + y^2)',
    '\\dot y = \\omega x + \\mu y - y(x^2 + y^2)',
    '\\mu < 0:\\text{ stable origin}\\quad\\mu > 0:\\text{ stable cycle of radius }\\sqrt{\\mu}',
  ],
  notes:
    'Resonator. As μ crosses 0 the equilibrium loses stability and a stable limit cycle of vanishing amplitude is born. No coexistence — no bistability.',
};

// Subcritical Hopf (Bautin) normal form, real form:
//   ẋ = μ x − ω y + x(x² + y²) − x(x² + y²)²
//   ẏ = ω x + μ y + y(x² + y²) − y(x² + y²)²
// μ<0: stable origin + outer stable cycle + middle unstable cycle (bistable).
// μ=0: subcritical Hopf — unstable cycle shrinks to origin and destabilises it.
// μ>0: unstable origin, single large stable cycle.
export const subcriticalHopf: Model2D = {
  id: 'hopf-sub',
  name: 'Subcritical Andronov–Hopf (Bautin)',
  short: 'Sub Hopf',
  rhs: (x, y, p) => {
    const r2 = x * x + y * y;
    const f = r2 - r2 * r2;
    return [p.mu * x - p.omega * y + x * f, p.omega * x + p.mu * y + y * f];
  },
  defaultParams: { mu: -0.1, omega: 1.0 },
  bifParam: { name: 'mu', min: -0.4, max: 0.4, default: -0.1, step: 0.005 },
  bounds: { xMin: -1.6, xMax: 1.6, yMin: -1.6, yMax: 1.6 },
  labels: { x: 'x', y: 'y' },
  initial: [0.2, 0.0],
  dt: 0.02,
  spikeThreshold: 0,
  freqScale: 1,
  freqUnit: '1/T',
  fiDuration: 400,
  latex: [
    '\\dot x = \\mu x - \\omega y + x(r^2 - r^4),\\quad r^2 = x^2 + y^2',
    '\\dot y = \\omega x + \\mu y + y(r^2 - r^4)',
    '\\mu < 0:\\text{ rest \\& cycle coexist (bistable)}\\quad\\mu > 0:\\text{ only cycle}',
  ],
  notes:
    'Resonator with bistability. For μ<0 the rest state and a large stable limit cycle coexist, separated by an unstable cycle. As μ→0 the unstable cycle shrinks onto the rest state and annihilates it.',
};
