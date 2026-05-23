<script lang="ts">
  import type { ManifoldData3D } from '../manifold3d';
  import type { EquilibriumKind } from '../types';
  import { theme } from '../theme.svelte';

  interface LiveTrail {
    getPoints: () => Array<[number, number, number]>; // (param, x, y) for the live trajectory
  }

  interface Props {
    data: ManifoldData3D | null;
    pLabel: string;
    xLabel: string;
    yLabel: string;
    live?: LiveTrail | null;
    highlightP?: number | null;
    height?: number;
  }

  let { data, pLabel, xLabel, yLabel, live = null, highlightP = null, height: propHeight }: Props = $props();

  let container: HTMLDivElement | undefined = $state();
  let canvas: HTMLCanvasElement | undefined = $state();
  let measuredW = $state(0);
  let measuredH = $state(0);
  const width = $derived(measuredW || 480);
  const height = $derived(propHeight ?? measuredH ?? 360);

  let yaw = $state(-0.6);
  let pitch = $state(0.35);
  let dragging = false;
  let dragX = 0, dragY = 0;

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

  function onMouseDown(e: MouseEvent) {
    dragging = true;
    dragX = e.clientX;
    dragY = e.clientY;
  }
  function onMouseMove(e: MouseEvent) {
    if (!dragging) return;
    const dx = e.clientX - dragX;
    const dy = e.clientY - dragY;
    dragX = e.clientX;
    dragY = e.clientY;
    yaw += dx * 0.008;
    pitch = Math.max(-1.3, Math.min(1.3, pitch + dy * 0.006));
  }
  function onMouseUp() {
    dragging = false;
  }

  function onTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1) return;
    dragging = true;
    dragX = e.touches[0].clientX;
    dragY = e.touches[0].clientY;
  }
  function onTouchMove(e: TouchEvent) {
    if (!dragging || e.touches.length !== 1) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - dragX;
    const dy = e.touches[0].clientY - dragY;
    dragX = e.touches[0].clientX;
    dragY = e.touches[0].clientY;
    yaw += dx * 0.008;
    pitch = Math.max(-1.3, Math.min(1.3, pitch + dy * 0.006));
  }
  function onTouchEnd() {
    dragging = false;
  }

  function norm(v: number, r: { min: number; max: number }): number {
    return (v - r.min) / (r.max - r.min) - 0.5;
  }

  // Orthographic projection of a unit-cube point (px, py, pz) → [sx, sy, depth].
  // depth grows away from the camera so back-to-front painter sort uses descending depth.
  function project(px: number, py: number, pz: number): [number, number, number] {
    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
    const x1 = cosY * px + sinY * pz;
    const z1 = -sinY * px + cosY * pz;
    const y2 = cosP * py - sinP * z1;
    const z2 = sinP * py + cosP * z1;
    const scale = Math.min(width, height) * 0.62;
    return [width / 2 + x1 * scale, height / 2 - y2 * scale, z2];
  }

  // Map data axes onto the cube: p → horizontal, y → vertical, x → depth.
  function projData(p: number, x: number, y: number): [number, number, number] {
    if (!data) return [0, 0, 0];
    return project(norm(p, data.paramRange), norm(y, data.yRange), norm(x, data.xRange));
  }

  function kindColor(kind: EquilibriumKind): { fill: string; stroke: string; filled: boolean } {
    const c = theme.colors;
    switch (kind) {
      case 'stable-node':
      case 'stable-spiral':
        return { fill: c.success, stroke: c.success, filled: true };
      case 'saddle':
        return { fill: c.warn, stroke: c.warn, filled: true };
      case 'unstable-node':
      case 'unstable-spiral':
        return { fill: c.plotBg, stroke: c.error, filled: false };
      default:
        return { fill: c.textMuted, stroke: c.textMuted, filled: true };
    }
  }

  function draw() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = Math.max(1, Math.floor(width * devicePixelRatio));
    canvas.height = Math.max(1, Math.floor(height * devicePixelRatio));
    const c = theme.colors;

    ctx.save();
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = c.plotBg;
    ctx.fillRect(0, 0, width, height);

    const corners: Array<[number, number, number]> = [];
    for (let a = -1; a <= 1; a += 2)
      for (let b = -1; b <= 1; b += 2)
        for (let dd = -1; dd <= 1; dd += 2)
          corners.push([a * 0.5, b * 0.5, dd * 0.5]);
    const projCorners = corners.map(([a, b, dd]) => project(a, b, dd));
    const edges: Array<[number, number]> = [];
    for (let i = 0; i < 8; i++)
      for (let j = i + 1; j < 8; j++) {
        let diff = 0;
        for (let k = 0; k < 3; k++) if (corners[i][k] !== corners[j][k]) diff++;
        if (diff === 1) edges.push([i, j]);
      }
    ctx.strokeStyle = c.gridLine;
    ctx.lineWidth = 1;
    for (const [i, j] of edges) {
      const [x1, y1] = projCorners[i];
      const [x2, y2] = projCorners[j];
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    if (!data) {
      ctx.fillStyle = c.textMuted;
      ctx.font = '11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('computing…', width / 2, height / 2);
      ctx.restore();
      return;
    }

    type Item =
      | { kind: 'cycle'; depth: number; pts: Array<[number, number]>; alpha: number }
      | { kind: 'eq'; depth: number; sx: number; sy: number; ekind: EquilibriumKind }
      | { kind: 'trail'; depth: number; pts: Array<[number, number, number]> };

    const items: Item[] = [];

    for (const cyc of data.cycles) {
      const proj = cyc.pts.map(([x, y]) => projData(cyc.p, x, y));
      const avgDepth = proj.reduce((s, p) => s + p[2], 0) / proj.length;
      items.push({
        kind: 'cycle',
        depth: avgDepth,
        pts: proj.map((p) => [p[0], p[1]]),
        alpha: 0.6,
      });
    }

    for (const e of data.eqs) {
      const [sx, sy, sz] = projData(e.p, e.x, e.y);
      items.push({ kind: 'eq', depth: sz, sx, sy, ekind: e.kind });
    }

    if (live) {
      const pts = live.getPoints();
      if (pts.length > 1) {
        const proj = pts.map(([p, x, y]) => projData(p, x, y));
        const avgDepth = proj.reduce((s, p) => s + p[2], 0) / proj.length;
        items.push({ kind: 'trail', depth: avgDepth, pts: proj });
      }
    }

    items.sort((a, b) => b.depth - a.depth);

    for (const it of items) {
      if (it.kind === 'cycle') {
        ctx.strokeStyle = c.accent;
        ctx.lineWidth = 1.3;
        ctx.globalAlpha = it.alpha;
        ctx.beginPath();
        for (let k = 0; k < it.pts.length; k++) {
          const [x, y] = it.pts[k];
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (it.kind === 'eq') {
        const col = kindColor(it.ekind);
        ctx.beginPath();
        ctx.arc(it.sx, it.sy, 2.6, 0, Math.PI * 2);
        if (col.filled) {
          ctx.fillStyle = col.fill;
          ctx.fill();
        } else {
          ctx.fillStyle = c.plotBg;
          ctx.fill();
          ctx.strokeStyle = col.stroke;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      } else if (it.kind === 'trail') {
        ctx.lineWidth = 1.2;
        const n = it.pts.length;
        for (let k = 1; k < n; k++) {
          const a = k / n;
          ctx.strokeStyle = `rgba(${c.warnRgb},${0.05 + a * 0.6})`;
          ctx.beginPath();
          ctx.moveTo(it.pts[k - 1][0], it.pts[k - 1][1]);
          ctx.lineTo(it.pts[k][0], it.pts[k][1]);
          ctx.stroke();
        }
        const last = it.pts[n - 1];
        ctx.beginPath();
        ctx.arc(last[0], last[1], 3.5, 0, Math.PI * 2);
        ctx.fillStyle = c.warn;
        ctx.fill();
      }
    }

    if (highlightP !== null && data) {
      const u = norm(highlightP, data.paramRange);
      const a = project(u, -0.5, -0.5);
      const b = project(u, 0.5, -0.5);
      const cc = project(u, 0.5, 0.5);
      const d = project(u, -0.5, 0.5);
      ctx.strokeStyle = c.warn;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(cc[0], cc[1]);
      ctx.lineTo(d[0], d[1]);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = c.textDim;
    ctx.font = '10.5px ui-monospace, monospace';
    ctx.textAlign = 'center';
    const labelP = project(0.6, -0.5, -0.5);
    const labelY = project(-0.5, 0.6, -0.5);
    const labelX = project(-0.5, -0.5, 0.6);
    ctx.fillText(pLabel, labelP[0], labelP[1]);
    ctx.fillText(yLabel, labelY[0], labelY[1]);
    ctx.fillText(xLabel, labelX[0], labelX[1]);

    ctx.restore();
  }

  $effect(() => {
    if (live) {
      // RAF loop covers all changes (camera, data, theme) at 60 Hz while live.
      let raf = 0;
      const tick = () => {
        draw();
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
    width; height; data; yaw; pitch; void theme.name;
    draw();
  });
</script>

<div
  bind:this={container}
  class="m3-wrap"
  style:height={propHeight ? `${propHeight}px` : '100%'}
  onmousedown={onMouseDown}
  onmousemove={onMouseMove}
  onmouseup={onMouseUp}
  onmouseleave={onMouseUp}
  ontouchstart={onTouchStart}
  ontouchmove={onTouchMove}
  ontouchend={onTouchEnd}
  role="img"
  aria-label="3D manifold visualization"
>
  <canvas bind:this={canvas}></canvas>
  <div class="hint">drag to rotate</div>
</div>

<style>
  .m3-wrap {
    position: relative;
    width: 100%;
    border-radius: 6px;
    overflow: hidden;
    cursor: grab;
    touch-action: none;
    user-select: none;
  }
  .m3-wrap:active { cursor: grabbing; }
  canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
  .hint {
    position: absolute;
    bottom: 6px;
    right: 8px;
    font: 9.5px ui-monospace, monospace;
    color: var(--text-muted);
    pointer-events: none;
    background: color-mix(in srgb, var(--surface) 80%, transparent);
    border: 1px solid var(--border);
    padding: 2px 6px;
    border-radius: 3px;
  }
</style>
