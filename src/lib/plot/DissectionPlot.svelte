<script lang="ts">
  import type { Burster, Params } from '../types';
  import { dissect, type DissectionData } from '../dissect';
  import type { BursterSim } from '../burster-sim';
  import { theme } from '../theme.svelte';

  interface Props {
    burster: Burster;
    params: Params;
    sim: BursterSim;
    height?: number;
  }

  let { burster, params, sim, height: propHeight }: Props = $props();

  let container: HTMLDivElement | undefined = $state();
  let measuredW = $state(0);
  let measuredH = $state(0);
  const width = $derived(measuredW || 480);
  const height = $derived(propHeight ?? measuredH ?? 360);

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

  let staticCanvas: HTMLCanvasElement | undefined = $state();
  let overlayCanvas: HTMLCanvasElement | undefined = $state();

  let dissection: DissectionData | null = $state(null);
  let computing = $state(false);

  $effect(() => {
    burster; params;
    let cancelled = false;
    computing = true;
    queueMicrotask(() => {
      if (cancelled) return;
      const d = dissect(burster, { ...burster.defaultParams, ...params }, 70);
      if (!cancelled) {
        dissection = d;
        computing = false;
      }
    });
    return () => { cancelled = true; };
  });

  const padL = 46, padR = 14, padT = 22, padB = 36;

  function sToPx(s: number): number {
    const r = burster.slowRange;
    return padL + ((s - r.min) / (r.max - r.min)) * (width - padL - padR);
  }
  function vToPx(v: number): number {
    const r = burster.voltageRange;
    return padT + (height - padT - padB) - ((v - r.min) / (r.max - r.min)) * (height - padT - padB);
  }

  function drawStatic() {
    if (!staticCanvas) return;
    const c = theme.colors;
    const ctx = staticCanvas.getContext('2d')!;
    staticCanvas.width = Math.max(1, Math.floor(width * devicePixelRatio));
    staticCanvas.height = Math.max(1, Math.floor(height * devicePixelRatio));
    ctx.save();
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = c.plotBg;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = c.gridLine;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    ctx.strokeStyle = c.axisLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, height - padB);
    ctx.lineTo(width - padR, height - padB);
    ctx.stroke();

    ctx.fillStyle = c.axisLabel;
    ctx.font = '10px ui-monospace, monospace';
    const r = burster.slowRange;
    const vr = burster.voltageRange;
    ctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
      const s = r.min + ((r.max - r.min) * i) / 4;
      const x = sToPx(s);
      ctx.beginPath();
      ctx.moveTo(x, height - padB);
      ctx.lineTo(x, height - padB + 3);
      ctx.stroke();
      ctx.fillText(s.toFixed(2), x, height - padB + 14);
    }
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const v = vr.min + ((vr.max - vr.min) * i) / 4;
      const y = vToPx(v);
      ctx.beginPath();
      ctx.moveTo(padL - 3, y);
      ctx.lineTo(padL, y);
      ctx.stroke();
      ctx.fillText(v.toFixed(1), padL - 5, y + 3);
    }
    ctx.fillStyle = c.axisLabel;
    ctx.textAlign = 'center';
    const slowName = burster.labels[['x', 'y', 'z'][burster.slowVarIdx] as 'x' | 'y' | 'z'];
    ctx.fillText(slowName, padL + (width - padL - padR) / 2, height - padB + 28);
    ctx.textAlign = 'left';
    const spikeName = burster.labels[['x', 'y', 'z'][burster.spikeVarIdx] as 'x' | 'y' | 'z'];
    ctx.fillText(spikeName, padL - 8, padT - 8);

    if (!dissection) {
      ctx.fillStyle = c.textMuted;
      ctx.textAlign = 'center';
      ctx.fillText(computing ? 'computing…' : '', width / 2, height / 2);
      ctx.restore();
      return;
    }

    if (dissection.cyclePoints.length > 0) {
      ctx.fillStyle = `rgba(${c.accentRgb},0.10)`;
      ctx.beginPath();
      const pts = dissection.cyclePoints;
      ctx.moveTo(sToPx(pts[0].s), vToPx(pts[0].vMax));
      for (let i = 1; i < pts.length; i++) ctx.lineTo(sToPx(pts[i].s), vToPx(pts[i].vMax));
      for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(sToPx(pts[i].s), vToPx(pts[i].vMin));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const x = sToPx(pts[i].s);
        if (i === 0) ctx.moveTo(x, vToPx(pts[i].vMax));
        else ctx.lineTo(x, vToPx(pts[i].vMax));
      }
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const x = sToPx(pts[i].s);
        if (i === 0) ctx.moveTo(x, vToPx(pts[i].vMin));
        else ctx.lineTo(x, vToPx(pts[i].vMin));
      }
      ctx.stroke();
    }

    for (const ep of dissection.eqPoints) {
      const x = sToPx(ep.s);
      const y = vToPx(ep.v);
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      switch (ep.kind) {
        case 'stable-node':
        case 'stable-spiral':
          ctx.fillStyle = c.success;
          ctx.fill();
          break;
        case 'saddle':
          ctx.fillStyle = c.warn;
          ctx.fill();
          break;
        case 'unstable-node':
        case 'unstable-spiral':
          ctx.strokeStyle = c.error;
          ctx.lineWidth = 1.4;
          ctx.stroke();
          break;
      }
    }

    ctx.restore();
  }

  $effect(() => {
    width; height; dissection; burster; void theme.name;
    drawStatic();
  });

  $effect(() => {
    if (!overlayCanvas) return;
    const ctx = overlayCanvas.getContext('2d')!;
    overlayCanvas.width = Math.max(1, Math.floor(width * devicePixelRatio));
    overlayCanvas.height = Math.max(1, Math.floor(height * devicePixelRatio));

    let raf = 0;
    const draw = () => {
      const c = theme.colors;
      ctx.save();
      ctx.scale(devicePixelRatio, devicePixelRatio);
      ctx.clearRect(0, 0, width, height);

      const buf = sim.buf;
      const slowVarKey = (['x', 'y', 'z'] as const)[burster.slowVarIdx];
      const spikeVarKey = (['x', 'y', 'z'] as const)[burster.spikeVarIdx];
      const slowArr = buf[slowVarKey];
      const spikeArr = buf[spikeVarKey];
      const start = buf.count < buf.size ? 0 : buf.head;
      const n = buf.count;
      if (n < 2) {
        ctx.restore();
        raf = requestAnimationFrame(draw);
        return;
      }
      const stride = 4;
      const tEnd = buf.t[(buf.head - 1 + buf.size) % buf.size];
      const tCut = tEnd - 1000;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      let first = true;
      let lastA = 0;
      for (let i = 0; i < n; i += stride) {
        const idx = (start + i) % buf.size;
        if (buf.t[idx] < tCut) continue;
        const a = (i - (n - 1000 / (burster.dt))) / (1000 / burster.dt);
        const aClamped = Math.max(0, Math.min(1, a));
        if (Math.abs(aClamped - lastA) > 0.08 || first) {
          if (!first) ctx.stroke();
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${c.warnRgb},${0.05 + aClamped * 0.35})`;
          ctx.moveTo(sToPx(slowArr[idx]), vToPx(spikeArr[idx]));
          first = false;
          lastA = aClamped;
        } else {
          ctx.lineTo(sToPx(slowArr[idx]), vToPx(spikeArr[idx]));
        }
      }
      if (!first) ctx.stroke();

      // Redraw bifurcation structure on top so the trajectory doesn't bury it.
      if (dissection) {
        const pts = dissection.cyclePoints;
        if (pts.length > 0) {
          ctx.fillStyle = `rgba(${c.accentRgb},0.12)`;
          ctx.beginPath();
          ctx.moveTo(sToPx(pts[0].s), vToPx(pts[0].vMax));
          for (let i = 1; i < pts.length; i++) ctx.lineTo(sToPx(pts[i].s), vToPx(pts[i].vMax));
          for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(sToPx(pts[i].s), vToPx(pts[i].vMin));
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = c.accent;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          for (let i = 0; i < pts.length; i++) {
            const x = sToPx(pts[i].s);
            if (i === 0) ctx.moveTo(x, vToPx(pts[i].vMax));
            else ctx.lineTo(x, vToPx(pts[i].vMax));
          }
          ctx.stroke();
          ctx.beginPath();
          for (let i = 0; i < pts.length; i++) {
            const x = sToPx(pts[i].s);
            if (i === 0) ctx.moveTo(x, vToPx(pts[i].vMin));
            else ctx.lineTo(x, vToPx(pts[i].vMin));
          }
          ctx.stroke();
        }
        for (const ep of dissection.eqPoints) {
          const x = sToPx(ep.s);
          const yp = vToPx(ep.v);
          ctx.beginPath();
          ctx.arc(x, yp, 2.6, 0, Math.PI * 2);
          switch (ep.kind) {
            case 'stable-node':
            case 'stable-spiral':
              ctx.fillStyle = c.success;
              ctx.fill();
              break;
            case 'saddle':
              ctx.fillStyle = c.warn;
              ctx.fill();
              break;
            case 'unstable-node':
            case 'unstable-spiral':
              ctx.fillStyle = c.plotBg;
              ctx.fill();
              ctx.strokeStyle = c.error;
              ctx.lineWidth = 1.5;
              ctx.stroke();
              break;
          }
        }
      }
      const hi = (buf.head - 1 + buf.size) % buf.size;
      ctx.beginPath();
      ctx.arc(sToPx(slowArr[hi]), vToPx(spikeArr[hi]), 3.5, 0, Math.PI * 2);
      ctx.fillStyle = c.warn;
      ctx.fill();

      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  });
</script>

<div bind:this={container} class="dp-wrap" style:height={propHeight ? `${propHeight}px` : '100%'}>
  <canvas bind:this={staticCanvas} class="layer static"></canvas>
  <canvas bind:this={overlayCanvas} class="layer overlay"></canvas>
  <div class="legend">
    <span><i class="line cyan"></i>limit cycle</span>
    <span><i class="dot stable"></i>stable</span>
    <span><i class="dot saddle"></i>saddle</span>
    <span><i class="dot unstable"></i>unstable</span>
    <span><i class="line yellow"></i>slow trajectory</span>
  </div>
</div>

<style>
  .dp-wrap {
    position: relative;
    width: 100%;
    border-radius: 6px;
    overflow: hidden;
  }
  .layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }
  .layer.overlay { pointer-events: none; }
  .legend {
    position: absolute;
    top: 8px;
    right: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    font: 9.5px ui-monospace, monospace;
    color: var(--text-dim);
    pointer-events: none;
    background: color-mix(in srgb, var(--surface) 88%, transparent);
    border: 1px solid var(--border);
    padding: 4px 8px;
    border-radius: 4px;
    max-width: 70%;
    justify-content: flex-end;
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
  .legend i.line.cyan { background: var(--accent); }
  .legend i.line.yellow { background: var(--warn); }
  .legend i.dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }
  .legend i.dot.stable { background: var(--success); }
  .legend i.dot.saddle { background: var(--warn); }
  .legend i.dot.unstable { background: transparent; border: 1.5px solid var(--error); }
</style>
