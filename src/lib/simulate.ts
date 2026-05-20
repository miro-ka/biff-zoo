import type { Model2D, Params } from './types';
import { rk4Step } from './integrate';

export interface Trace {
  t: Float32Array;
  x: Float32Array;
  y: Float32Array;
}

export function simulate(
  model: Model2D,
  params: Params,
  duration: number,
  x0?: number,
  y0?: number,
  stride = 1,
): Trace {
  const dt = model.dt;
  const nSteps = Math.floor(duration / dt);
  const nOut = Math.floor(nSteps / stride) + 1;
  const t = new Float32Array(nOut);
  const x = new Float32Array(nOut);
  const y = new Float32Array(nOut);

  let xi = x0 ?? model.initial[0];
  let yi = y0 ?? model.initial[1];
  t[0] = 0;
  x[0] = xi;
  y[0] = yi;
  let outIdx = 1;
  for (let i = 0; i < nSteps; i++) {
    const [nx, ny] = rk4Step(model.rhs, xi, yi, params, dt);
    xi = nx;
    yi = ny;
    if ((i + 1) % stride === 0) {
      t[outIdx] = (i + 1) * dt;
      x[outIdx] = xi;
      y[outIdx] = yi;
      outIdx++;
    }
  }
  return { t, x, y };
}

export function spikeTimes(trace: Trace, threshold: number): number[] {
  const ts: number[] = [];
  for (let i = 1; i < trace.x.length; i++) {
    if (trace.x[i - 1] < threshold && trace.x[i] >= threshold) {
      const t0 = trace.t[i - 1];
      const t1 = trace.t[i];
      const v0 = trace.x[i - 1];
      const v1 = trace.x[i];
      const frac = (threshold - v0) / (v1 - v0 || 1);
      ts.push(t0 + frac * (t1 - t0));
    }
  }
  return ts;
}

export function firingFrequency(
  model: Model2D,
  params: Params,
  transientMs = 800,
  measureMs = 1200,
): number {
  const threshold = model.spikeThreshold ?? 0;
  const total = transientMs + measureMs;
  const trace = simulate(model, params, total);
  const cutIdx = Math.floor(transientMs / model.dt);
  const tail: Trace = {
    t: trace.t.slice(cutIdx),
    x: trace.x.slice(cutIdx),
    y: trace.y.slice(cutIdx),
  };
  const spikes = spikeTimes(tail, threshold);
  if (spikes.length < 2) return 0;
  const isis: number[] = [];
  for (let i = 1; i < spikes.length; i++) isis.push(spikes[i] - spikes[i - 1]);
  isis.sort((a, b) => a - b);
  const median = isis[Math.floor(isis.length / 2)];
  return median > 0 ? 1000 / median : 0; // Hz if t is in ms
}

export function fiCurve(
  model: Model2D,
  baseParams: Params,
  bifName: string,
  range: { min: number; max: number; n: number },
  options: { duration?: number; transient?: number; frequencyScale?: number } = {},
): { I: number[]; f: number[] } {
  const duration = options.duration ?? 1500;
  const transient = options.transient ?? Math.floor(duration * 0.55);
  const freqScale = options.frequencyScale ?? 1000; // ms→Hz default
  const Is: number[] = [];
  const fs: number[] = [];
  const dI = (range.max - range.min) / (range.n - 1);
  const threshold = model.spikeThreshold ?? 0;

  for (let i = 0; i < range.n; i++) {
    const I = range.min + i * dI;
    const params = { ...baseParams, [bifName]: I };
    // Always start from model.initial — carrying state forward causes underflow
    // to the unstable origin in Hopf normal forms, which then never escapes.
    const trace = simulate(model, params, duration, model.initial[0], model.initial[1], 1);
    const cut = Math.floor(transient / model.dt);
    const tail: Trace = {
      t: trace.t.slice(cut),
      x: trace.x.slice(cut),
      y: trace.y.slice(cut),
    };
    const spikes = spikeTimes(tail, threshold);
    let f = 0;
    if (spikes.length >= 2) {
      const isis: number[] = [];
      for (let k = 1; k < spikes.length; k++) isis.push(spikes[k] - spikes[k - 1]);
      isis.sort((a, b) => a - b);
      const median = isis[Math.floor(isis.length / 2)];
      f = median > 0 ? freqScale / median : 0;
    }
    Is.push(I);
    fs.push(f);
  }
  return { I: Is, f: fs };
}
