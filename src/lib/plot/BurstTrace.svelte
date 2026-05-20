<script lang="ts">
  import type { Burster } from '../types';
  import type { BursterSim } from '../burster-sim';
  import { theme } from '../theme.svelte';

  interface Props {
    burster: Burster;
    sim: BursterSim;
    variable: 'spike' | 'slow';
    height?: number;
    color?: string;
    windowDt?: number; // approx time-units shown across the panel
  }

  let { burster, sim, variable, height: propHeight = 130, color, windowDt = 1800 }: Props = $props();

  let container: HTMLDivElement | undefined = $state();
  let measuredW = $state(0);
  const width = $derived(measuredW || 480);
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

  $effect(() => {
    if (!canvas) return;
    canvas.width = Math.max(1, Math.floor(width * devicePixelRatio));
    canvas.height = Math.max(1, Math.floor(height * devicePixelRatio));
    const ctx = canvas.getContext('2d')!;

    let raf = 0;
    const tick = () => {
      const c = theme.colors;
      ctx.save();
      ctx.scale(devicePixelRatio, devicePixelRatio);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = c.plotBg;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = c.gridLine;
      ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

      const buf = sim.buf;
      const n = buf.count;
      if (n < 2) {
        ctx.restore();
        raf = requestAnimationFrame(tick);
        return;
      }
      const idxKey = variable === 'spike' ? burster.spikeVarIdx : burster.slowVarIdx;
      const key = (['x', 'y', 'z'] as const)[idxKey];
      const arr = buf[key];
      const range = variable === 'spike' ? burster.voltageRange : burster.slowRange;
      const yMin = range.min;
      const yMax = range.max;

      const start = buf.count < buf.size ? 0 : buf.head;
      const lastIdx = (buf.head - 1 + buf.size) % buf.size;
      const tEnd = buf.t[lastIdx];
      const tStart = tEnd - windowDt;

      ctx.lineWidth = 1.1;
      ctx.strokeStyle = color ?? (variable === 'spike' ? c.warn : c.textDim);
      ctx.beginPath();
      let first = true;
      // Keep ~2 samples per pixel so spike peaks aren't aliased away
      const targetPts = Math.max(width * 2, 400);
      const stride = Math.max(1, Math.floor(n / targetPts));
      for (let i = 0; i < n; i += stride) {
        const idx = (start + i) % buf.size;
        const t = buf.t[idx];
        if (t < tStart) continue;
        const px = ((t - tStart) / windowDt) * width;
        const v = arr[idx];
        const py = height - ((v - yMin) / (yMax - yMin)) * height;
        if (first) { ctx.moveTo(px, py); first = false; }
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.fillStyle = c.axisLabel;
      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(
        burster.labels[(['x', 'y', 'z'] as const)[idxKey]],
        6, 12,
      );
      ctx.textAlign = 'right';
      ctx.fillText(`${windowDt} t.u.`, width - 6, height - 6);

      ctx.restore();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });
</script>

<div bind:this={container} class="bt-wrap" style:height="{height}px">
  <canvas bind:this={canvas} class="bt-canvas"></canvas>
</div>

<style>
  .bt-wrap { width: 100%; position: relative; }
  .bt-canvas { display: block; width: 100%; height: 100%; border-radius: 6px; }
</style>
