<script lang="ts">
  import type { Model2D } from '../types';
  import { rk4Step } from '../integrate';
  import { theme } from '../theme.svelte';

  interface Props {
    model: Model2D;
    params: Record<string, number>;
    width?: number;
    height?: number;
    windowMs?: number;
    yMin?: number;
    yMax?: number;
  }

  let {
    model,
    params,
    width: propWidth,
    height: propHeight = 160,
    windowMs = 600,
    yMin,
    yMax,
  }: Props = $props();

  let container: HTMLDivElement | undefined = $state();
  let measuredW = $state(0);
  const width = $derived(propWidth ?? (measuredW || 480));
  const height = $derived(propHeight);

  $effect(() => {
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      measuredW = Math.max(1, Math.floor(entries[0].contentRect.width));
    });
    ro.observe(container);
    return () => ro.disconnect();
  });

  let canvas: HTMLCanvasElement | undefined = $state();
  const effYMin = $derived(yMin ?? model.bounds.xMin);
  const effYMax = $derived(yMax ?? model.bounds.xMax);

  let bufferSize = $derived(Math.max(200, Math.floor(windowMs / model.dt)));
  let buffer = new Float32Array(0);
  let head = 0;
  let count = 0;

  $effect(() => {
    bufferSize;
    buffer = new Float32Array(bufferSize);
    head = 0;
    count = 0;
  });

  $effect(() => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = Math.max(1, Math.floor(width * devicePixelRatio));
    canvas.height = Math.max(1, Math.floor(height * devicePixelRatio));

    let x = model.initial[0];
    let y = model.initial[1];
    // initial settle: 200ms transient
    const settle = Math.floor(200 / model.dt);
    for (let i = 0; i < settle; i++) {
      const [nx, ny] = rk4Step(model.rhs, x, y, params, model.dt);
      x = nx; y = ny;
    }

    let raf = 0;
    const stepsPerFrame = Math.max(1, Math.floor(8 / model.dt));

    const draw = () => {
      const c = theme.colors;
      for (let i = 0; i < stepsPerFrame; i++) {
        const [nx, ny] = rk4Step(model.rhs, x, y, params, model.dt);
        x = nx; y = ny;
        buffer[head] = x;
        head = (head + 1) % bufferSize;
        if (count < bufferSize) count++;
      }
      ctx.save();
      ctx.scale(devicePixelRatio, devicePixelRatio);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = c.plotBg;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = c.gridLine;
      ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

      if (model.spikeThreshold !== undefined) {
        const ty = height - ((model.spikeThreshold - effYMin) / (effYMax - effYMin)) * height;
        ctx.strokeStyle = c.thresholdLine;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(0, ty);
        ctx.lineTo(width, ty);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.strokeStyle = c.warn;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const stride = Math.max(1, Math.floor(count / width));
      let first = true;
      for (let i = 0; i < count; i += stride) {
        const idx = (head - count + i + bufferSize * 2) % bufferSize;
        const v = buffer[idx];
        const px = (i / count) * width;
        const py = height - ((v - effYMin) / (effYMax - effYMin)) * height;
        if (first) { ctx.moveTo(px, py); first = false; }
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.fillStyle = c.axisLabel;
      ctx.font = '11px ui-monospace, monospace';
      ctx.fillText(model.labels.x, 6, 14);
      ctx.fillText(`${windowMs} ms`, width - 60, height - 6);

      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  });
</script>

<div bind:this={container} class="tp-wrap" style:height="{height}px">
  <canvas bind:this={canvas} class="timeplot"></canvas>
</div>

<style>
  .tp-wrap {
    width: 100%;
    position: relative;
  }
  .timeplot {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 6px;
  }
</style>
