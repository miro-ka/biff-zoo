import type { Model2D } from '../types';
import { morrisLecarFold, morrisLecarSNIC, morrisLecarHopf } from './morris-lecar';
import { supercriticalHopf, subcriticalHopf } from './hopf';
import { saddleHomoclinic } from './saddle-homoclinic';

export const fourDoors: Model2D[] = [
  morrisLecarFold,
  morrisLecarSNIC,
  supercriticalHopf,
  subcriticalHopf,
];

export const cycleBifurcations: Model2D[] = [
  morrisLecarSNIC,    // SNIC of the cycle (cycle's saddle collides with node on it)
  saddleHomoclinic,   // saddle-homoclinic (cycle grows into a saddle)
  supercriticalHopf,  // sup Hopf (cycle shrinks to a point)
  subcriticalHopf,    // fold-limit-cycle (the outer cycle dies at Bautin's fold)
];

export interface CycleInfo {
  modelId: string;
  bifName: string;             // pretty bifurcation name
  periodScaling: string;       // e.g. 'T ~ 1/√(λ_c − λ)'
  scalingExpr: (lam: number, lamC: number) => number; // analytic scaling, for overlay
  approachFromBelow: boolean;  // sweep λ from min toward critical (true) or max toward critical (false)
}

export const cycleInfo: Record<string, CycleInfo> = {
  'ml-snic': {
    modelId: 'ml-snic',
    bifName: 'SNIC',
    periodScaling: 'T \\propto 1/\\sqrt{I - I_c}',
    scalingExpr: (lam, lamC) => 1 / Math.sqrt(Math.max(1e-9, lam - lamC)),
    approachFromBelow: true,
  },
  'hr-fast': {
    modelId: 'hr-fast',
    bifName: 'Saddle homoclinic',
    periodScaling: 'T \\propto -1/\\ln(z_c - z)',
    scalingExpr: (lam, lamC) => 1 / Math.max(1e-9, -Math.log(Math.max(1e-9, lamC - lam))),
    approachFromBelow: false,
  },
  'hopf-super': {
    modelId: 'hopf-super',
    bifName: 'Supercritical Hopf',
    periodScaling: 'T \\to 2\\pi/\\omega \\text{ (finite)}',
    scalingExpr: () => 1,
    approachFromBelow: true,
  },
  'hopf-sub': {
    modelId: 'hopf-sub',
    bifName: 'Fold limit cycle',
    periodScaling: 'T \\to T_c \\text{ (finite, jump)}',
    scalingExpr: () => 1,
    approachFromBelow: true,
  },
};

export const class1Model = morrisLecarSNIC;
export const class2Model = morrisLecarHopf;

export interface DoorInfo {
  modelId: string;
  excitabilityClass: 1 | 2;
  role: 'integrator' | 'resonator';
  bistable: boolean;
  subthresholdOsc: 'none' | 'damped';
  onsetFreqScaling: string;
  onsetAmpScaling: string;
  spikeOnset: 'zero' | 'nonzero';
}

export const doorInfo: Record<string, DoorInfo> = {
  'ml-fold': {
    modelId: 'ml-fold',
    excitabilityClass: 2,
    role: 'integrator',
    bistable: true,
    subthresholdOsc: 'none',
    onsetFreqScaling: 'nonzero (jump)',
    onsetAmpScaling: 'fixed',
    spikeOnset: 'nonzero',
  },
  'ml-snic': {
    modelId: 'ml-snic',
    excitabilityClass: 1,
    role: 'integrator',
    bistable: false,
    subthresholdOsc: 'none',
    onsetFreqScaling: 'O(√λ) → 0',
    onsetAmpScaling: 'fixed',
    spikeOnset: 'zero',
  },
  'hopf-super': {
    modelId: 'hopf-super',
    excitabilityClass: 2,
    role: 'resonator',
    bistable: false,
    subthresholdOsc: 'damped',
    onsetFreqScaling: 'nonzero (ω₀)',
    onsetAmpScaling: 'O(√λ) → 0',
    spikeOnset: 'nonzero',
  },
  'hopf-sub': {
    modelId: 'hopf-sub',
    excitabilityClass: 2,
    role: 'resonator',
    bistable: true,
    subthresholdOsc: 'damped',
    onsetFreqScaling: 'nonzero',
    onsetAmpScaling: 'arbitrary (jump)',
    spikeOnset: 'nonzero',
  },
};
