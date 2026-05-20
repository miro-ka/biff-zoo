export type Vec2 = readonly [number, number];
export type Vec3 = readonly [number, number, number];

export type Params = Record<string, number>;

export type RHS = (x: number, y: number, p: Params) => Vec2;
export type RHS3 = (x: number, y: number, z: number, p: Params) => Vec3;

export type BifurcationType =
  | 'fold'
  | 'snic'
  | 'sup-hopf'
  | 'sub-hopf'
  | 'fold-cycle'
  | 'saddle-homoclinic';

export interface Burster {
  id: string;
  name: string;
  short: string;
  classical: string; // e.g. 'square-wave', 'parabolic'
  rhs: RHS3;
  defaultParams: Params;
  // index of the slow variable in [x, y, z]
  slowVarIdx: 0 | 1 | 2;
  // index of the "voltage"/spike variable
  spikeVarIdx: 0 | 1 | 2;
  // for the dissection plot — the range of the slow variable to sweep
  slowRange: { min: number; max: number };
  // for the V(t) plot — the visible voltage range
  voltageRange: { min: number; max: number };
  // bounds for the second fast variable (not voltage, not slow) — used by the dissection
  // equilibrium search to know where to seed Newton iterations.
  fastYRange: { min: number; max: number };
  labels: { x: string; y: string; z: string };
  initial: Vec3;
  dt: number;
  spikeThreshold: number;
  // the canonical bifurcation pair (rest / cycle)
  restBif: BifurcationType;
  cycleBif: BifurcationType;
  latex: string[];
  notes?: string;
}

export interface Model2D {
  id: string;
  name: string;
  short: string;
  rhs: RHS;
  defaultParams: Params;
  bifParam: { name: string; min: number; max: number; default: number; step: number; unit?: string };
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  labels: { x: string; y: string };
  initial: Vec2;
  dt: number;
  spikeThreshold?: number;
  // For converting ISI in trace time units to displayed frequency.
  // ms → Hz uses 1000; dimensionless models use 1.
  freqScale?: number;
  freqUnit?: string;
  // Optional override for F-I simulation duration in trace time units.
  fiDuration?: number;
  latex: string[];
  notes?: string;
}

export type EquilibriumKind =
  | 'stable-node'
  | 'unstable-node'
  | 'saddle'
  | 'stable-spiral'
  | 'unstable-spiral'
  | 'center'
  | 'degenerate';

export interface Equilibrium {
  x: number;
  y: number;
  trace: number;
  det: number;
  disc: number;
  eig: { lambda1: { re: number; im: number }; lambda2: { re: number; im: number } };
  kind: EquilibriumKind;
}
