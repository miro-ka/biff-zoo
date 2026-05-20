import type { Burster } from '../types';

// Parabolic burster (SNIC / SNIC) using the canonical Plant-style mechanism:
// a Morris–Lecar Class 1 fast subsystem plus an intracellular calcium variable z
// that activates an outward K current. During spiking, Ca accumulates and the extra
// K current hyperpolarises the cell across the SNIC. At rest, Ca decays and the
// cell crosses SNIC the other way. Frequency tracks √(distance to SNIC) → parabolic
// spike-rate profile across each burst.
//
//   C V̇ = I − g_L(V−V_L) − g_Ca m∞(V)(V−V_Ca) − g_K n (V−V_K) − g_KCa z (V−V_K)
//   ṅ = φ (n∞(V) − n) / τ_n(V)
//   ż = ε ( α m∞(V) − z )                     slow Ca accumulation/decay
export const parabolic: Burster = {
  id: 'par',
  name: 'Parabolic burster (ML + I_K(Ca))',
  short: 'Parabolic',
  classical: 'parabolic',
  rhs: (V, n, z, p) => {
    const mInf = 0.5 * (1 + Math.tanh((V - p.V1) / p.V2));
    const nInf = 0.5 * (1 + Math.tanh((V - p.V3) / p.V4));
    const tauN = 1 / Math.cosh((V - p.V3) / (2 * p.V4));
    const dV =
      (p.I -
        p.gL * (V - p.VL) -
        p.gCa * mInf * (V - p.VCa) -
        p.gK * n * (V - p.VK) -
        p.gKCa * z * (V - p.VK)) /
      p.C;
    const dn = (p.phi * (nInf - n)) / tauN;
    const dz = p.eps * (p.alpha * mInf - z);
    return [dV, dn, dz];
  },
  defaultParams: {
    C: 20, gL: 2, VL: -60, gCa: 4.4, VCa: 120, gK: 8, VK: -84,
    V1: -1.2, V2: 18, V3: 12, V4: 17.4, phi: 0.067,
    I: 55, gKCa: 1.0, alpha: 2.0, eps: 0.005,
  },
  slowVarIdx: 2,
  spikeVarIdx: 0,
  slowRange: { min: 0.0, max: 0.55 },
  voltageRange: { min: -75, max: 35 },
  fastYRange: { min: -0.05, max: 0.7 },
  labels: { x: 'V (mV)', y: 'n', z: '[Ca] (slow)' },
  initial: [-55, 0.01, 0.05],
  dt: 0.1,
  spikeThreshold: 0.0,
  restBif: 'snic',
  cycleBif: 'snic',
  latex: [
    'C\\,\\dot V = I - g_L(V-V_L) - g_{Ca}\\,m_\\infty(V-V_{Ca}) - g_K\\,n(V-V_K) - g_{KCa}\\,z(V-V_K)',
    '\\dot n = \\phi\\,(n_\\infty(V) - n)/\\tau_n(V)',
    '\\dot z = \\varepsilon\\,(\\alpha\\,m_\\infty(V) - z)',
    '\\text{rest: SNIC,\\ \\ cycle: SNIC\\quad(parabolic)}',
  ],
  notes:
    "Morris–Lecar Class 1 with a Ca-activated K current. During spiking, the time-averaged m∞(V) is high — Ca accumulates, the extra K current builds, and the cell crosses the SNIC the other way (cycle terminates). At rest m∞≈0, Ca decays, K current drops, and the cell crosses SNIC into spiking. Each burst opens and closes at the SNIC ⇒ spike frequency ∝ √(distance to SNIC) ⇒ parabolic rate profile across the burst.",
};
