<script lang="ts">
  import type { Model2D } from '../types';
  import { fiCurve } from '../simulate';
  import { theme } from '../theme.svelte';

  interface Props {
    model: Model2D;
    params: Record<string, number>;
    width?: number;
    height?: number;
    nPoints?: number;
    currentI?: number;
  }

  let {
    model,
    params,
    width: propWidth,
    height: propHeight = 200,
    nPoints = 30,
    currentI,
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

  // Strip the bifurcation parameter so the curve only recomputes when other knobs change.
  let staticParams = $derived.by(() => {
    const cp = { ...params };
    delete cp[model.bifParam.name];
    return cp;
  });

  let curve: { I: number[]; f: number[] } | null = $state(null);
  let computing = $state(false);

  $effect(() => {
    staticParams; model;
    let cancelled = false;
    computing = true;
    queueMicrotask(() => {
      if (cancelled) return;
      const baseP = { ...model.defaultParams, ...staticParams };
      const c = fiCurve(model, baseP, model.bifParam.name, {
        min: model.bifParam.min,
        max: model.bifParam.max,
        n: nPoints,
      }, {
        duration: model.fiDuration,
        frequencyScale: model.freqScale ?? 1000,
      });
      if (!cancelled) {
        curve = c;
        computing = false;
      }
    });
    return () => { cancelled = true; };
  });

  $effect(() => {
    if (!canvas) return;
    void theme.name; // re-render on theme change
    const c = theme.colors;
    const ctx = canvas.getContext('2d')!;
    canvas.width = Math.max(1, Math.floor(width * devicePixelRatio));
    canvas.height = Math.max(1, Math.floor(height * devicePixelRatio));
    ctx.save();
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = c.plotBg;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = c.gridLine;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    const padL = 42, padR = 12, padT = 20, padB = 38;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const Imin = model.bifParam.min;
    const Imax = model.bifParam.max;
    let fmax = 0;
    if (curve) {
      for (const f of curve.f) if (f > fmax) fmax = f;
      fmax = fmax > 0 ? fmax * 1.15 : 1;
    } else {
      fmax = 1;
    }
    const tickFmt = fmax >= 10 ? (v: number) => v.toFixed(0)
      : fmax >= 1 ? (v: number) => v.toFixed(1)
      : (v: number) => v.toFixed(2);
    const xToPx = (I: number) => padL + ((I - Imin) / (Imax - Imin)) * plotW;
    const yToPx = (f: number) => padT + plotH - (f / fmax) * plotH;

    ctx.strokeStyle = c.axisLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + plotH);
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.stroke();

    ctx.fillStyle = c.axisLabel;
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
      const I = Imin + ((Imax - Imin) * i) / 4;
      const x = xToPx(I);
      ctx.beginPath();
      ctx.moveTo(x, padT + plotH);
      ctx.lineTo(x, padT + plotH + 3);
      ctx.stroke();
      ctx.fillText(I.toFixed(1), x, padT + plotH + 14);
    }
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const f = (fmax * i) / 4;
      const y = yToPx(f);
      ctx.beginPath();
      ctx.moveTo(padL - 3, y);
      ctx.lineTo(padL, y);
      ctx.stroke();
      ctx.fillText(tickFmt(f), padL - 5, y + 3);
    }
    const xUnit = model.bifParam.unit;
    const xLbl = xUnit ? `${model.bifParam.name} (${xUnit})` : model.bifParam.name;
    ctx.textAlign = 'center';
    ctx.fillStyle = c.axisLabel;
    ctx.fillText(xLbl, padL + plotW / 2, padT + plotH + 28);
    ctx.textAlign = 'left';
    ctx.fillText(`f (${model.freqUnit ?? 'Hz'})`, padL - 6, padT - 6);

    if (curve) {
      ctx.strokeStyle = c.ficurveLine;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      let first = true;
      for (let i = 0; i < curve.I.length; i++) {
        const px = xToPx(curve.I[i]);
        const py = yToPx(curve.f[i]);
        if (first) { ctx.moveTo(px, py); first = false; }
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      for (let i = 0; i < curve.I.length; i++) {
        ctx.beginPath();
        ctx.arc(xToPx(curve.I[i]), yToPx(curve.f[i]), 2, 0, Math.PI * 2);
        ctx.fillStyle = curve.f[i] > 0 ? c.ficurveLine : c.textMuted;
        ctx.fill();
      }
    } else if (computing) {
      ctx.fillStyle = c.textMuted;
      ctx.font = '11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('computing…', width / 2, height / 2);
    }

    if (currentI !== undefined) {
      const x = xToPx(currentI);
      ctx.strokeStyle = c.warn;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  });
</script>

<div bind:this={container} class="fi-wrap" style:height="{height}px">
  <canvas bind:this={canvas} class="ficurve"></canvas>
</div>

<style>
  .fi-wrap { width: 100%; position: relative; }
  .ficurve { display: block; width: 100%; height: 100%; border-radius: 6px; }
</style>
