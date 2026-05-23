<script lang="ts">
  import { bursters, driveControls } from '../lib/models/bursters';
  import { BursterSim } from '../lib/burster-sim';
  import DissectionPlot from '../lib/plot/DissectionPlot.svelte';
  import Manifold3D from '../lib/plot/Manifold3D.svelte';
  import { bursterManifold3D } from '../lib/dissect3d';
  import type { ManifoldData3D } from '../lib/manifold3d';
  import BurstTrace from '../lib/plot/BurstTrace.svelte';
  import Equation from '../lib/plot/Equation.svelte';
  import InfoBanner from '../lib/InfoBanner.svelte';
  import ViewToggle from '../lib/ViewToggle.svelte';

  let activeIdx = $state(0);
  const burster = $derived(bursters[activeIdx]);
  const controls = $derived(driveControls[burster.id] ?? []);

  let paramOverrides = $state<Record<string, Record<string, number>>>(
    Object.fromEntries(bursters.map((b) => [b.id, {}])),
  );

  const params = $derived({
    ...burster.defaultParams,
    ...paramOverrides[burster.id],
  });

  function setParam(name: string, v: number) {
    paramOverrides = {
      ...paramOverrides,
      [burster.id]: { ...paramOverrides[burster.id], [name]: v },
    };
  }

  let simEpoch = $state(0);
  let sim = $state<BursterSim>(new BursterSim(bursters[0], { ...bursters[0].defaultParams }));

  $effect(() => {
    burster.id; simEpoch;
    const fresh = new BursterSim(burster, { ...burster.defaultParams, ...paramOverrides[burster.id] });
    fresh.prefill();
    sim = fresh;
  });

  $effect(() => {
    sim.params = { ...burster.defaultParams, ...params };
  });

  $effect(() => {
    let raf = 0;
    const tick = () => {
      sim.step(220);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  function resetSim() {
    sim.reset();
    sim.prefill();
  }

  function resetParams() {
    paramOverrides = { ...paramOverrides, [burster.id]: {} };
    simEpoch++;
  }

  let showEquations = $state(false);

  let view3D = $state(false);
  let manifold3d = $state<ManifoldData3D | null>(null);
  let computing3d = $state(false);

  const otherVarIdx = $derived(
    [0, 1, 2].find((i) => i !== burster.slowVarIdx && i !== burster.spikeVarIdx)! as 0 | 1 | 2,
  );

  $effect(() => {
    if (!view3D) return;
    const b = burster;
    const p = params;
    let cancelled = false;
    computing3d = true;
    // Debounce so dragging sliders doesn't trigger a full re-dissect every frame.
    const handle = setTimeout(() => {
      if (cancelled) return;
      manifold3d = bursterManifold3D(b, { ...b.defaultParams, ...p });
      computing3d = false;
    }, 250);
    return () => { cancelled = true; clearTimeout(handle); };
  });

  const liveTrail = $derived({
    getPoints: (): Array<[number, number, number]> => {
      const buf = sim.buf;
      const n = buf.count;
      if (n === 0) return [];
      const keys = ['x', 'y', 'z'] as const;
      const slowArr = buf[keys[burster.slowVarIdx]];
      const spikeArr = buf[keys[burster.spikeVarIdx]];
      const otherArr = buf[keys[otherVarIdx]];
      const start = n < buf.size ? 0 : buf.head;
      const tEnd = buf.t[(buf.head - 1 + buf.size) % buf.size];
      const tCut = tEnd - 1200;
      const pts: Array<[number, number, number]> = [];
      const stride = 6;
      for (let i = 0; i < n; i += stride) {
        const idx = (start + i) % buf.size;
        if (buf.t[idx] < tCut) continue;
        pts.push([slowArr[idx], otherArr[idx], spikeArr[idx]]);
      }
      return pts;
    },
  });
</script>

<div class="bursters">
  <InfoBanner id="bursters" title="Reading the fast-slow dissection">
    {#snippet children()}
      <p>
        A burster has two timescales. The <b>slow variable</b> (z) acts as a quasi-static
        bifurcation parameter for the fast (V, n) subsystem. The plot on the left shows the fast
        subsystem's bifurcation diagram in slow-variable space — equilibria and limit cycles as
        z varies.
      </p>
      <ul>
        <li><span class="green">●</span> <b>stable equilibrium</b> — the rest branch; cell sits here quietly.</li>
        <li><span class="yellow">●</span> <b>saddle</b> — separator; cell on this branch flips sign of stability around it.</li>
        <li><span class="red">○</span> <b>unstable equilibrium</b> — the rest state has lost stability.</li>
        <li><span class="cyan">━</span> <b>limit cycle envelope</b> — min/max of the spike variable on the cycle; the cyan region is where spiking exists.</li>
        <li><span class="amber">━</span> <b>slow trajectory</b> — the actual (z, V) path of the live simulation, fading older-to-newer.</li>
      </ul>
      <p>
        The trajectory's <b>hysteresis loop</b> between rest and spike branches IS the burst.
        Each burster type — square-wave, elliptic, parabolic — has a distinct loop shape because
        rest and cycle die at different bifurcations.
      </p>
    {/snippet}
  </InfoBanner>
  <div class="card-row">
    {#each bursters as b, i}
      <button
        class="card"
        class:active={i === activeIdx}
        onclick={() => (activeIdx = i)}
      >
        <div class="card-title">{b.short}</div>
        <div class="card-sub">{b.name} — {b.classical}</div>
        <div class="card-bif">
          <span><b>rest:</b> {b.restBif}</span>
          <span><b>cycle:</b> {b.cycleBif}</span>
        </div>
      </button>
    {/each}
    <div class="upcoming">3 of Izhikevich's 6 classical bursters: square-wave, elliptic, parabolic.</div>
  </div>

  <div class="grid">
    <div class="left">
      <div class="plot-header">
        <div class="plot-label">Fast-slow dissection — fast subsystem bifurcations vs slow variable</div>
        <ViewToggle value={view3D} onChange={(v) => (view3D = v)} />
      </div>
      <div class="dissect-frame">
        {#if view3D}
          {@const keys = ['x', 'y', 'z'] as const}
          <Manifold3D
            data={manifold3d}
            pLabel={burster.labels[keys[burster.slowVarIdx]]}
            yLabel={burster.labels[keys[burster.spikeVarIdx]]}
            xLabel={burster.labels[keys[otherVarIdx]]}
            live={liveTrail}
          />
          {#if computing3d}
            <div class="compute-tag">computing…</div>
          {/if}
        {:else}
          <DissectionPlot {burster} {params} {sim} />
        {/if}
      </div>
    </div>

    <div class="right">
      <div class="plot-label">Spike variable (burst structure)</div>
      <BurstTrace {burster} {sim} variable="spike" height={130} windowDt={1800} />

      <div class="plot-label">Slow variable</div>
      <BurstTrace {burster} {sim} variable="slow" height={88} windowDt={1800} />

      <div class="controls">
        {#each controls as c}
          <label>
            <span><span class="pname">{c.label.split(' ')[0]}</span> {c.label.split(' ').slice(1).join(' ')}</span>
            <span class="pval">{params[c.name].toFixed(c.step < 0.001 ? 4 : c.step < 0.01 ? 3 : 2)}</span>
          </label>
          <input
            type="range"
            min={c.min} max={c.max} step={c.step}
            value={params[c.name]}
            oninput={(e) => setParam(c.name, parseFloat((e.target as HTMLInputElement).value))}
          />
          <div class="rb"><span>{c.min}</span><span>{c.max}</span></div>
        {/each}
        <div class="reset-row">
          <button class="reset" onclick={resetSim}>↻ reset trajectory</button>
          <button class="reset" onclick={resetParams}>defaults</button>
        </div>
      </div>

      <div class="sidebar">
        <div class="title">{burster.classical}: <span class="dim">{burster.restBif}/{burster.cycleBif}</span></div>
        <div class="notes">{burster.notes}</div>
        <button class="adv" onclick={() => (showEquations = !showEquations)}>
          {showEquations ? '▾' : '▸'} Show equations
        </button>
        {#if showEquations}
          <div class="equations">
            {#each burster.latex as eq}
              <Equation tex={eq} />
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .bursters {
    max-width: 1280px;
    margin: 0 auto;
    padding: 14px 20px;
    color: var(--text);
  }
  .card-row {
    display: flex;
    gap: 10px;
    margin-bottom: 14px;
    align-items: stretch;
  }
  .card {
    flex: 0 0 auto;
    max-width: 260px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 8px 12px;
    min-width: 0;
    text-align: left;
    cursor: pointer;
    color: var(--text);
    font-family: inherit;
    transition: border-color 120ms ease, background 120ms ease;
  }
  .card:hover { border-color: var(--text-muted); }
  .card.active {
    background: var(--surface-2);
    border-color: var(--accent);
  }
  .card-title { font-weight: 600; font-size: 13px; }
  .card-sub { color: var(--text-dim); font-size: 11px; margin-top: 2px; }
  .card-bif {
    display: flex;
    gap: 10px;
    margin-top: 6px;
    font: 10.5px ui-monospace, monospace;
    color: var(--text-dim);
  }
  .card-bif b { color: var(--accent); font-weight: 500; }
  .upcoming {
    flex: 1;
    display: flex;
    align-items: center;
    color: var(--text-muted);
    font: 11px ui-monospace, monospace;
    padding: 0 8px;
  }

  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(340px, 0.9fr);
    gap: 22px;
    align-items: start;
  }
  @media (max-width: 1000px) {
    .grid { grid-template-columns: 1fr; }
  }
  .left, .right { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .dissect-frame {
    width: 100%;
    aspect-ratio: 1.25 / 1;
    max-height: calc(100vh - 240px);
    position: relative;
  }
  .plot-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }
  .compute-tag {
    position: absolute;
    top: 8px;
    right: 8px;
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text-dim);
    font: 10px ui-monospace, monospace;
    padding: 2px 6px;
    border-radius: 3px;
  }
  .plot-label {
    font-size: 10.5px;
    color: var(--text-dim);
    font-family: ui-monospace, monospace;
  }
  .controls {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 10px 14px;
    margin-top: 6px;
  }
  .controls label {
    display: flex;
    justify-content: space-between;
    font: 12px ui-monospace, monospace;
    margin-bottom: 4px;
    margin-top: 8px;
  }
  .controls label:first-of-type { margin-top: 0; }
  .pname { color: var(--accent); }
  .pval { color: var(--warn); }
  .controls input[type='range'] { width: 100%; }
  .rb {
    display: flex;
    justify-content: space-between;
    color: var(--text-muted);
    font: 10px ui-monospace, monospace;
    margin-top: 2px;
  }
  .reset-row {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }
  .reset {
    margin-top: 0;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-dim);
    padding: 4px 10px;
    border-radius: 5px;
    cursor: pointer;
    font: 11px ui-monospace, monospace;
  }
  .reset:hover { border-color: var(--accent); color: var(--text); }
  .sidebar {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 12px 14px;
    font-size: 12.5px;
    margin-top: 6px;
  }
  .sidebar .title {
    font-weight: 600;
    color: var(--warn);
    margin-bottom: 8px;
  }
  .dim { color: var(--text-dim); font-weight: 400; }
  .notes {
    color: var(--text-dim);
    line-height: 1.5;
    font-size: 11.5px;
  }
  .adv {
    margin-top: 10px;
    background: transparent;
    border: none;
    color: var(--accent);
    cursor: pointer;
    padding: 4px 0;
    font-size: 12px;
  }
  .equations {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 12px 14px;
    margin-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .equations :global(.katex) { font-size: 13px; }
</style>
