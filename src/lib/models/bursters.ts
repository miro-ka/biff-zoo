import type { Burster } from '../types';
import { hindmarshRose } from './hindmarsh-rose';
import { fitzhughRinzel } from './fitzhugh-rinzel';
import { parabolic } from './parabolic';

export const bursters: Burster[] = [hindmarshRose, fitzhughRinzel, parabolic];

// Per-burster "drive" slider — which parameter shifts the bursting regime.
// Keeps the UI generic across models that name their bifurcation parameter differently.
export interface DriveControl {
  name: string;     // parameter key
  label: string;    // display label
  min: number;
  max: number;
  step: number;
}

export const driveControls: Record<string, DriveControl[]> = {
  hr: [
    { name: 'I', label: 'I drive', min: 1.0, max: 4.0, step: 0.01 },
    { name: 'r', label: 'r slow rate', min: 0.001, max: 0.02, step: 0.0005 },
  ],
  fhr: [
    { name: 'I', label: 'I drive', min: -0.5, max: 0.5, step: 0.01 },
    { name: 'eps', label: 'ε slow rate', min: 0.002, max: 0.04, step: 0.001 },
  ],
  par: [
    { name: 'I', label: 'I drive', min: 40, max: 70, step: 0.5 },
    { name: 'eps', label: 'ε Ca rate', min: 0.001, max: 0.02, step: 0.0005 },
  ],
};
