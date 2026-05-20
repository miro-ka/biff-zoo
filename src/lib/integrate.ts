import type { RHS, RHS3, Vec2, Vec3, Params } from './types';

export function rk4Step(rhs: RHS, x: number, y: number, p: Params, dt: number): Vec2 {
  const [k1x, k1y] = rhs(x, y, p);
  const [k2x, k2y] = rhs(x + 0.5 * dt * k1x, y + 0.5 * dt * k1y, p);
  const [k3x, k3y] = rhs(x + 0.5 * dt * k2x, y + 0.5 * dt * k2y, p);
  const [k4x, k4y] = rhs(x + dt * k3x, y + dt * k3y, p);
  return [
    x + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x),
    y + (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y),
  ];
}

export function integrate(
  rhs: RHS,
  x0: number,
  y0: number,
  p: Params,
  dt: number,
  nSteps: number,
): { xs: Float32Array; ys: Float32Array } {
  const xs = new Float32Array(nSteps + 1);
  const ys = new Float32Array(nSteps + 1);
  xs[0] = x0;
  ys[0] = y0;
  let x = x0;
  let y = y0;
  for (let i = 0; i < nSteps; i++) {
    [x, y] = rk4Step(rhs, x, y, p, dt);
    xs[i + 1] = x;
    ys[i + 1] = y;
  }
  return { xs, ys };
}

export function rk4Step3(rhs: RHS3, x: number, y: number, z: number, p: Params, dt: number): Vec3 {
  const [k1x, k1y, k1z] = rhs(x, y, z, p);
  const [k2x, k2y, k2z] = rhs(x + 0.5 * dt * k1x, y + 0.5 * dt * k1y, z + 0.5 * dt * k1z, p);
  const [k3x, k3y, k3z] = rhs(x + 0.5 * dt * k2x, y + 0.5 * dt * k2y, z + 0.5 * dt * k2z, p);
  const [k4x, k4y, k4z] = rhs(x + dt * k3x, y + dt * k3y, z + dt * k3z, p);
  return [
    x + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x),
    y + (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y),
    z + (dt / 6) * (k1z + 2 * k2z + 2 * k3z + k4z),
  ];
}
