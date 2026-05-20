import type { Burster, Params } from './types';
import { rk4Step3 } from './integrate';

export class BursterSim {
  buf: {
    t: Float32Array;
    x: Float32Array;
    y: Float32Array;
    z: Float32Array;
    head: number;
    count: number;
    size: number;
  };
  state: [number, number, number];
  t = 0;
  burster: Burster;
  params: Params;

  constructor(burster: Burster, params: Params, bufSize = 40000) {
    this.burster = burster;
    this.params = params;
    this.buf = {
      t: new Float32Array(bufSize),
      x: new Float32Array(bufSize),
      y: new Float32Array(bufSize),
      z: new Float32Array(bufSize),
      head: 0,
      count: 0,
      size: bufSize,
    };
    this.state = [burster.initial[0], burster.initial[1], burster.initial[2]];
  }

  step(stepsPerFrame: number): void {
    const { dt, rhs } = this.burster;
    let [x, y, z] = this.state;
    const buf = this.buf;
    for (let i = 0; i < stepsPerFrame; i++) {
      [x, y, z] = rk4Step3(rhs, x, y, z, this.params, dt);
      this.t += dt;
      const h = buf.head;
      buf.t[h] = this.t;
      buf.x[h] = x;
      buf.y[h] = y;
      buf.z[h] = z;
      buf.head = (h + 1) % buf.size;
      if (buf.count < buf.size) buf.count++;
    }
    this.state = [x, y, z];
  }

  reset(): void {
    this.state = [
      this.burster.initial[0],
      this.burster.initial[1],
      this.burster.initial[2],
    ];
    this.t = 0;
    this.buf.head = 0;
    this.buf.count = 0;
  }

  prefill(transientSteps = 4000): void {
    const { dt, rhs } = this.burster;
    let [x, y, z] = this.state;
    for (let i = 0; i < transientSteps; i++) {
      [x, y, z] = rk4Step3(rhs, x, y, z, this.params, dt);
    }
    this.state = [x, y, z];
    this.step(this.buf.size);
  }

  forEach(fn: (t: number, x: number, y: number, z: number) => void, stride = 1): void {
    const { t, x, y, z, head, count, size } = this.buf;
    const start = count < size ? 0 : head;
    for (let i = 0; i < count; i += stride) {
      const idx = (start + i) % size;
      fn(t[idx], x[idx], y[idx], z[idx]);
    }
  }
}
