<script lang="ts">
  import type { Model2D, Equilibrium } from '../types';
  import type { Segment } from '../analysis';
  import { findEquilibria, nullclineSegments } from '../analysis';
  import { rk4Step } from '../integrate';
  import { theme } from '../theme.svelte';

  interface Props {
    model: Model2D;
    params: Record<string, number>;
    width?: number;
    height?: number;
    showVectorField?: boolean;
    onSeed?: (x: number, y: number) => void;
  }

  let {
    model,
    params,
    width: propWidth,
    height: propHeight,
    showVectorField = true,
    onSeed,
  }: Props = $props();

  let container: HTMLDivElement | undefined = $state();
  let measuredW = $state(0);
  let measuredH = $state(0);

  const width = $derived(propWidth ?? (measuredW || 480));
  const height = $derived(propHeight ?? (measuredH || 480));

  $effect(() => {
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      measuredW = Math.max(1, Math.floor(r.width));
      measuredH = Math.max(1, Math.floor(r.height));
    });
    ro.observe(container);
    return () => ro.disconnect();
  });

  let canvas: HTMLCanvasElement | undefined = $state();
  let trajCanvas: HTMLCanvasElement | undefined = $state();

  const bounds = $derived(model.bounds);

  function xToPx(x: number): number {
    return ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * width;
  }
  function yToPx(y: number): number {
    return height - ((y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * height;
  }
  function pxToX(px: number): number {
    return bounds.xMin + (px / width) * (bounds.xMax - bounds.xMin);
  }
  function pxToY(py: number): number {
    return bounds.yMin + ((height - py) / height) * (bounds.yMax - bounds.yMin);
  }

  const nullX = $derived(nullclineSegments(model.rhs, params, 'x', bounds, 140));
  const nullY = $derived(nullclineSegments(model.rhs, params, 'y', bounds, 140));
  const equilibria = $derived(findEquilibria(model.rhs, params, bounds, 28));

  function drawStatic() {
    if (!canvas) return;
    const c = theme.colors;
    const ctx = canvas.getContext('2d')!;
    ctx.save();
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = c.plotBg;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = c.gridLine;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    if (showVectorField) {
      drawVectorField(ctx);
    }

    drawSegments(ctx, nullX, c.accent, 1.6);
    drawSegments(ctx, nullY, c.pink, 1.6);

    for (const eq of equilibria) drawEquilibrium(ctx, eq);

    ctx.restore();
  }

  function drawVectorField(ctx: CanvasRenderingContext2D) {
    const c = theme.colors;
    const vfBase = theme.name === 'dark' ? '140,150,170' : '70,80,100';
    const n = 13;
    const dx = (bounds.xMax - bounds.xMin) / n;
    const dy = (bounds.yMax - bounds.yMin) / n;
    let maxMag = 0;
    const fs: { x: number; y: number; fxn: number; fyn: number }[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = bounds.xMin + (i + 0.5) * dx;
        const y = bounds.yMin + (j + 0.5) * dy;
        const [fx, fy] = model.rhs(x, y, params);
        const fxn = fx / (bounds.xMax - bounds.xMin);
        const fyn = fy / (bounds.yMax - bounds.yMin);
        const m = Math.hypot(fxn, fyn);
        if (Number.isFinite(m) && m > maxMag) maxMag = m;
        fs.push({ x, y, fxn, fyn });
      }
    }
    if (maxMag === 0) return;
    const cellPx = Math.min(width, height) / n;
    const maxLen = cellPx * 0.42;
    for (const f of fs) {
      const m = Math.hypot(f.fxn, f.fyn);
      if (m < 1e-12) continue;
      const dxp = (f.fxn / m) * width;
      const dyp = -(f.fyn / m) * height;
      const dirLen = Math.hypot(dxp, dyp);
      const ux = dxp / dirLen;
      const uy = dyp / dirLen;
      // Strong compression on magnitude so weak fields stay visible.
      const len = maxLen * (0.35 + 0.65 * Math.pow(m / maxMag, 0.35));
      const cx = xToPx(f.x);
      const cy = yToPx(f.y);
      const tipX = cx + ux * len * 0.5;
      const tipY = cy + uy * len * 0.5;
      const tailX = cx - ux * len * 0.5;
      const tailY = cy - uy * len * 0.5;
      const alpha = 0.18 + 0.32 * Math.pow(m / maxMag, 0.6);
      ctx.strokeStyle = `rgba(${vfBase},${alpha})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      const head = 3;
      const perpX = -uy;
      const perpY = ux;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX - ux * head + perpX * head * 0.5, tipY - uy * head + perpY * head * 0.5);
      ctx.lineTo(tipX - ux * head - perpX * head * 0.5, tipY - uy * head - perpY * head * 0.5);
      ctx.closePath();
      ctx.fillStyle = `rgba(${vfBase},${alpha + 0.1})`;
      ctx.fill();
    }
  }

  function drawSegments(
    ctx: CanvasRenderingContext2D,
    segs: Segment[],
    color: string,
    lw: number,
  ) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (const s of segs) {
      ctx.moveTo(xToPx(s.x1), yToPx(s.y1));
      ctx.lineTo(xToPx(s.x2), yToPx(s.y2));
    }
    ctx.stroke();
  }

  function drawEquilibrium(ctx: CanvasRenderingContext2D, eq: Equilibrium) {
    const c = theme.colors;
    const cx = xToPx(eq.x);
    const cy = yToPx(eq.y);
    const r = 6;
    let fill = c.textMuted;
    let stroke = c.text;
    switch (eq.kind) {
      case 'stable-node':
      case 'stable-spiral':
        fill = c.success;
        stroke = c.success;
        break;
      case 'unstable-node':
      case 'unstable-spiral':
        fill = c.plotBg;
        stroke = c.error;
        break;
      case 'saddle':
        fill = c.plotBg;
        stroke = c.warn;
        break;
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = stroke;
    ctx.stroke();
    if (eq.kind === 'saddle') {
      ctx.beginPath();
      ctx.moveTo(cx - r * 1.4, cy);
      ctx.lineTo(cx + r * 1.4, cy);
      ctx.moveTo(cx, cy - r * 1.4);
      ctx.lineTo(cx, cy + r * 1.4);
      ctx.strokeStyle = c.warn;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  let trajState = $state<{ x: number; y: number }>({
    x: model.initial[0],
    y: model.initial[1],
  });
  $effect(() => {
    trajState = { x: model.initial[0], y: model.initial[1] };
  });

  $effect(() => {
    if (!trajCanvas) return;
    const ctx = trajCanvas.getContext('2d')!;
    let raf = 0;
    const trail: { x: number; y: number }[] = [];
    const maxTrail = 800;
    const stepsPerFrame = 30;

    const tick = () => {
      const c = theme.colors;
      let { x, y } = trajState;
      for (let i = 0; i < stepsPerFrame; i++) {
        const [nx, ny] = rk4Step(model.rhs, x, y, params, model.dt);
        x = nx;
        y = ny;
        trail.push({ x, y });
        if (trail.length > maxTrail) trail.shift();
      }
      trajState = { x, y };
      ctx.save();
      ctx.scale(devicePixelRatio, devicePixelRatio);
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1.5;
      for (let i = 1; i < trail.length; i++) {
        const a = i / trail.length;
        ctx.strokeStyle = `rgba(${c.warnRgb},${a * 0.9})`;
        ctx.beginPath();
        ctx.moveTo(xToPx(trail[i - 1].x), yToPx(trail[i - 1].y));
        ctx.lineTo(xToPx(trail[i].x), yToPx(trail[i].y));
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(xToPx(x), yToPx(y), 4, 0, Math.PI * 2);
      ctx.fillStyle = c.warn;
      ctx.fill();
      ctx.restore();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  $effect(() => {
    void params; void model; void nullX; void nullY; void equilibria; void theme.name;
    drawStatic();
  });

  function handleClick(ev: MouseEvent) {
    if (!trajCanvas) return;
    const rect = trajCanvas.getBoundingClientRect();
    const px = ev.clientX - rect.left;
    const py = ev.clientY - rect.top;
    const x = pxToX(px);
    const y = pxToY(py);
    trajState = { x, y };
    onSeed?.(x, y);
  }

  $effect(() => {
    for (const c of [canvas, trajCanvas]) {
      if (!c) continue;
      c.width = Math.max(1, Math.floor(width * devicePixelRatio));
      c.height = Math.max(1, Math.floor(height * devicePixelRatio));
    }
    drawStatic();
  });
</script>

<div
  bind:this={container}
  class="phase"
  style={propWidth !== undefined && propHeight !== undefined
    ? `width: ${propWidth}px; height: ${propHeight}px;`
    : ''}
>
  <canvas bind:this={canvas} class="static"></canvas>
  <canvas bind:this={trajCanvas} class="traj" onclick={handleClick}></canvas>
  <div class="axislabel xlabel">{model.labels.x}</div>
  <div class="axislabel ylabel">{model.labels.y}</div>
  <div class="legend">
    <span><i class="line blue"></i>ẋ=0</span>
    <span><i class="line pink"></i>ẏ=0</span>
    <span><i class="dot stable"></i>stable</span>
    <span><i class="dot saddle"></i>saddle</span>
    <span><i class="dot unstable"></i>unstable</span>
  </div>
</div>

<style>
  .phase {
    position: relative;
    border-radius: 6px;
    overflow: hidden;
    width: 100%;
    height: 100%;
  }
  .static,
  .traj {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
  }
  .traj {
    cursor: crosshair;
  }
  .axislabel {
    position: absolute;
    color: var(--text-dim);
    font: 11px ui-monospace, monospace;
    pointer-events: none;
  }
  .xlabel {
    bottom: 4px;
    right: 8px;
  }
  .ylabel {
    top: 4px;
    left: 8px;
  }
  .legend {
    position: absolute;
    bottom: 6px;
    left: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
    font: 9.5px ui-monospace, monospace;
    color: var(--text-dim);
    pointer-events: none;
  }
  .legend span {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  .legend i.line {
    display: inline-block;
    width: 10px;
    height: 2px;
  }
  .legend i.line.blue { background: var(--accent); }
  .legend i.line.pink { background: var(--pink); }
  .legend i.dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    border: 1.5px solid;
  }
  .legend i.dot.stable { background: var(--success); border-color: var(--success); }
  .legend i.dot.saddle { background: transparent; border-color: var(--warn); }
  .legend i.dot.unstable { background: transparent; border-color: var(--error); }
</style>
