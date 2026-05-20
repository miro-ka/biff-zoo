<script lang="ts">
  import { mlc } from '../lib/models/morris-lecar';
  import { findEquilibria } from '../lib/analysis';
  import InfoBanner from '../lib/InfoBanner.svelte';
  import Equation from '../lib/plot/Equation.svelte';

  const equations = [
    'C\\,\\dot V = I - g_L(V-V_L) - g_{Ca}\\,m_\\infty(V)(V-V_{Ca}) - g_K\\,n\\,(V-V_K)',
    '\\dot n = \\phi\\,\\bigl(n_\\infty(V) - n\\bigr) / \\tau_n(V)',
    'n_\\infty(V) = \\tfrac{1}{2}\\bigl(1 + \\tanh\\tfrac{V - V_3}{V_4}\\bigr),\\quad \\tau_n(V) = 1/\\cosh\\tfrac{V - V_3}{2 V_4}',
  ];

  type BifClass = 'snic' | 'hopf' | 'fold' | 'spiking' | 'mixed';

  const V3_MIN = -10, V3_MAX = 25;
  const V4_MIN = 10, V4_MAX = 42;
  const NX = 70, NY = 70;

  let phi = $state(0.04);
  let probeI = $state(40);

  const fixedBase = {
    C: 20, gL: 2, VL: -60, gCa: 4.4, VCa: 120, gK: 8, VK: -84,
    V1: -1.2, V2: 18,
  };
  const bounds = { xMin: -75, xMax: 40, yMin: -0.05, yMax: 0.7 };

  function classify(V3: number, V4: number, I: number, ph: number): BifClass {
    const rhs = mlc(V3, V4, ph);
    const eqs = findEquilibria(rhs, { ...fixedBase, I }, bounds, 18);
    const stable = eqs.filter((e) => e.kind === 'stable-node' || e.kind === 'stable-spiral');
    const saddles = eqs.filter((e) => e.kind === 'saddle');
    if (stable.length === 0) return 'spiking';
    if (stable.length === 1 && saddles.length >= 1) return 'snic';
    if (stable.length === 1 && saddles.length === 0) {
      const eq = stable[0];
      return eq.kind === 'stable-spiral' ? 'hopf' : 'fold';
    }
    return 'mixed';
  }

  const palette: Record<BifClass, [number, number, number]> = {
    snic: [125, 216, 125],
    hopf: [110, 195, 255],
    fold: [255, 215, 107],
    spiking: [255, 138, 138],
    mixed: [170, 170, 185],
  };

  const legendItems: { key: BifClass; label: string; sub: string }[] = [
    { key: 'snic', label: 'SNIC topology', sub: '3 equilibria: stable + saddle + upper' },
    { key: 'hopf', label: 'Hopf candidate', sub: '1 stable spiral (complex eigenvalues)' },
    { key: 'fold', label: 'Node / pre-fold', sub: '1 stable node (real eigenvalues)' },
    { key: 'spiking', label: 'No stable rest', sub: 'already spiking at probe I' },
    { key: 'mixed', label: 'Mixed / other', sub: 'multiple stable, or unclassified' },
  ];

  let canvas: HTMLCanvasElement | undefined = $state();
  let computing = $state(true);
  let progress = $state(0);

  $effect(() => {
    if (!canvas) return;
    const ph = phi;
    const I = probeI;
    const ctx = canvas.getContext('2d')!;
    canvas.width = NX;
    canvas.height = NY;
    const img = ctx.createImageData(NX, NY);
    const data = img.data;

    let cursor = 0;
    const total = NX * NY;
    computing = true;
    progress = 0;
    let raf = 0;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const end = Math.min(cursor + 80, total);
      for (; cursor < end; cursor++) {
        const i = cursor % NX;
        const j = Math.floor(cursor / NX);
        const V3 = V3_MIN + (i / (NX - 1)) * (V3_MAX - V3_MIN);
        const V4 = V4_MIN + (j / (NY - 1)) * (V4_MAX - V4_MIN);
        const c = classify(V3, V4, I, ph);
        const [r, g, b] = palette[c];
        const idx = ((NY - 1 - j) * NX + i) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      progress = cursor / total;
      if (cursor < total) raf = requestAnimationFrame(tick);
      else computing = false;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  });

  const points = [
    { V3: 12, V4: 17.4, label: 'Class 1 (SNIC)' },
    { V3: 2, V4: 30, label: 'Class 2 (Hopf)' },
  ];

  function leftPct(V3: number) {
    return ((V3 - V3_MIN) / (V3_MAX - V3_MIN)) * 100;
  }
  function topPct(V4: number) {
    return (1 - (V4 - V4_MIN) / (V4_MAX - V4_MIN)) * 100;
  }

  const v3Ticks = [-10, -5, 0, 5, 10, 15, 20, 25];
  const v4Ticks = [10, 15, 20, 25, 30, 35, 40];
</script>

<div class="manifold">
  <InfoBanner id="manifold" title="Bifurcation manifold in channel-kinetics space">
    {#snippet children()}
      <p>
        Each pixel is a different Morris–Lecar neuron — same equations, but with a different
        K⁺-channel <b>V₃</b> (half-activation voltage) and <b>V₄</b> (slope). The color tells you
        which kind of equilibrium structure that cell has at the probe current.
      </p>
      <ul>
        <li><b class="green">SNIC topology</b> — 3 equilibria; saddle and node will collide → Class 1 integrator.</li>
        <li><b class="cyan">Hopf candidate</b> — single stable spiral; will lose stability via complex eigenvalues → Class 2 resonator.</li>
        <li><b class="yellow">Pre-fold</b> — single stable node; transition route depends on parameters.</li>
        <li><b class="red">No stable rest</b> — cell already past threshold for this probe I.</li>
      </ul>
      <p>
        The marked points are the two demos from <i>Class 1 vs 2</i>. <b>Sloppy directions</b>: any
        move that stays inside one color region — function preserved. <b>Stiff directions</b>: any
        move that crosses a color boundary — bifurcation class flips, behavior changes qualitatively.
        Compensation, in the homeostatic sense, is the cell walking along sloppy directions to
        absorb a perturbation that would otherwise push it across a boundary.
      </p>
    {/snippet}
  </InfoBanner>

  <div class="grid">
    <div class="plot-col">
      <div class="plot-frame">
        <div class="canvas-wrap">
          <canvas bind:this={canvas}></canvas>
          {#each points as p}
            <div
              class="marker"
              style:left="{leftPct(p.V3)}%"
              style:top="{topPct(p.V4)}%"
            >
              <div class="dot"></div>
              <div class="mlabel">
                {p.label}<br />
                <span class="dim">V₃={p.V3}, V₄={p.V4}</span>
              </div>
            </div>
          {/each}
          {#each v3Ticks as t}
            <div class="vtick" style:left="{leftPct(t)}%">{t}</div>
          {/each}
          {#each v4Ticks as t}
            <div class="htick" style:top="{topPct(t)}%">{t}</div>
          {/each}
          <div class="axlabel x">V₃ (mV)</div>
          <div class="axlabel y">V₄ (mV)</div>
        </div>
        {#if computing}
          <div class="progress">
            computing — {Math.round(progress * 100)}%
          </div>
        {/if}
      </div>
    </div>

    <div class="sidebar">
      <div class="title">Legend</div>
      <ul class="legend">
        {#each legendItems as it}
          <li>
            <span
              class="sw"
              style:background="rgb({palette[it.key][0]},{palette[it.key][1]},{palette[it.key][2]})"
            ></span>
            <div class="li-text">
              <div class="li-label">{it.label}</div>
              <div class="li-sub">{it.sub}</div>
            </div>
          </li>
        {/each}
      </ul>

      <div class="title" style:margin-top="14px">Probe parameters</div>
      <div class="row">
        <label>
          <span class="pname">I</span>
          <span class="pval">{probeI.toFixed(1)} μA/cm²</span>
        </label>
        <input
          type="range"
          min={0}
          max={120}
          step={1}
          value={probeI}
          oninput={(e) => (probeI = parseFloat((e.target as HTMLInputElement).value))}
        />
      </div>
      <div class="row">
        <label>
          <span class="pname">φ</span>
          <span class="pval">{phi.toFixed(3)}</span>
        </label>
        <input
          type="range"
          min={0.01}
          max={0.1}
          step={0.005}
          value={phi}
          oninput={(e) => (phi = parseFloat((e.target as HTMLInputElement).value))}
        />
      </div>

      <div class="hint">
        Probe current scans the rest-state structure. Slide it up to watch SNIC regions shrink as
        the saddle and node collide; the Hopf region is robust to I until the spiral itself
        destabilises.
      </div>

      <div class="title" style:margin-top="16px">Model</div>
      <div class="equations">
        {#each equations as eq}
          <Equation tex={eq} />
        {/each}
        <div class="eqhint">
          V₃ shifts where the K⁺ channel is half-activated; V₄ sets how steeply it activates with
          voltage. φ scales how fast n approaches n∞. All other parameters are held fixed.
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .manifold {
    max-width: 1280px;
    margin: 0 auto;
    padding: 14px 20px;
    color: var(--text);
  }
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
    gap: 22px;
    align-items: start;
  }
  @media (max-width: 1000px) {
    .grid { grid-template-columns: 1fr; }
  }
  .plot-frame {
    position: relative;
    padding: 8px 14px 36px 50px;
  }
  .canvas-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: visible;
  }
  canvas {
    width: 100%;
    height: 100%;
    display: block;
    image-rendering: pixelated;
    border-radius: 6px;
  }
  .marker {
    position: absolute;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
  .marker .dot {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid #111;
    box-shadow: 0 0 0 2px #fff;
  }
  .marker .mlabel {
    position: absolute;
    left: 14px;
    top: -4px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 3px 7px;
    font: 10.5px ui-monospace, monospace;
    color: var(--text);
    white-space: nowrap;
  }
  .marker .mlabel .dim { color: var(--text-dim); }

  .vtick {
    position: absolute;
    bottom: -18px;
    transform: translateX(-50%);
    font: 10px ui-monospace, monospace;
    color: var(--text-dim);
  }
  .htick {
    position: absolute;
    left: -22px;
    transform: translateY(-50%);
    font: 10px ui-monospace, monospace;
    color: var(--text-dim);
  }
  .axlabel {
    position: absolute;
    color: var(--text-dim);
    font: 11px ui-monospace, monospace;
  }
  .axlabel.x {
    bottom: -36px;
    left: 50%;
    transform: translateX(-50%);
  }
  .axlabel.y {
    left: -42px;
    top: 50%;
    transform: translateY(-50%) rotate(-90deg);
    transform-origin: center;
  }
  .progress {
    position: absolute;
    top: 14px;
    right: 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text-dim);
    font: 10.5px ui-monospace, monospace;
    padding: 3px 8px;
    border-radius: 4px;
  }
  .sidebar {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 12px 14px;
    font-size: 12.5px;
  }
  .sidebar .title {
    font-weight: 600;
    color: var(--warn);
    margin-bottom: 8px;
  }
  ul.legend {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  ul.legend li {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .sw {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    margin-top: 2px;
    flex-shrink: 0;
    border: 1px solid var(--border);
  }
  .li-label { color: var(--text); font-size: 12px; }
  .li-sub { color: var(--text-dim); font-size: 10.5px; line-height: 1.4; }

  .row {
    margin-top: 10px;
  }
  .row label {
    display: flex;
    justify-content: space-between;
    font: 12px ui-monospace, monospace;
    margin-bottom: 4px;
  }
  .pname { color: var(--accent); }
  .pval { color: var(--warn); }
  .row input[type='range'] { width: 100%; }
  .hint {
    margin-top: 12px;
    color: var(--text-dim);
    font-size: 11px;
    line-height: 1.5;
  }
  .equations {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .equations :global(.katex) { font-size: 11.5px; }
  .eqhint {
    color: var(--text-dim);
    font-size: 11px;
    line-height: 1.5;
    margin-top: 4px;
  }
</style>
