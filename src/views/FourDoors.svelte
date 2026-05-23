<script lang="ts">
  import type { Model2D } from '../lib/types';
  import { fourDoors, doorInfo } from '../lib/models/registry';
  import PhasePortrait from '../lib/plot/PhasePortrait.svelte';
  import TimePlot from '../lib/plot/TimePlot.svelte';
  import FICurve from '../lib/plot/FICurve.svelte';
  import Equation from '../lib/plot/Equation.svelte';
  import InfoBanner from '../lib/InfoBanner.svelte';
  import Manifold3D from '../lib/plot/Manifold3D.svelte';
  import { computeManifold, type ManifoldData3D } from '../lib/manifold3d';
  import { rk4Step } from '../lib/integrate';
  import ViewToggle from '../lib/ViewToggle.svelte';

  let activeIdx = $state(1);
  const model = $derived<Model2D>(fourDoors[activeIdx]);

  let bifValues = $state<Record<string, number>>(
    Object.fromEntries(fourDoors.map((m) => [m.id, m.bifParam.default])),
  );

  const params = $derived({
    ...model.defaultParams,
    [model.bifParam.name]: bifValues[model.id],
  });

  const info = $derived(doorInfo[model.id]);

  let showEquations = $state(false);

  function setBif(v: number) {
    bifValues = { ...bifValues, [model.id]: v };
  }

  let view3D = $state(false);
  let manifold3d = $state<ManifoldData3D | null>(null);
  let computing3d = $state(false);

  const TRAIL_SIZE = 800;
  const trailParam = new Float32Array(TRAIL_SIZE);
  const trailX = new Float32Array(TRAIL_SIZE);
  const trailY = new Float32Array(TRAIL_SIZE);
  let trailHead = 0;
  let trailCount = 0;
  let liveTick = $state(0);

  $effect(() => {
    if (!view3D) return;
    const m = model;
    const initialP = { ...m.defaultParams, [m.bifParam.name]: bifValues[m.id] };
    let x = m.initial[0];
    let y = m.initial[1];
    const settle = Math.floor(200 / m.dt);
    for (let i = 0; i < settle; i++) {
      [x, y] = rk4Step(m.rhs, x, y, initialP, m.dt);
    }
    trailHead = 0;
    trailCount = 0;
    const stepsPerFrame = Math.max(1, Math.floor(8 / m.dt));
    let raf = 0;
    const tick = () => {
      const curP = bifValues[m.id];
      const curParams = { ...m.defaultParams, [m.bifParam.name]: curP };
      for (let i = 0; i < stepsPerFrame; i++) {
        [x, y] = rk4Step(m.rhs, x, y, curParams, m.dt);
        trailParam[trailHead] = curP;
        trailX[trailHead] = x;
        trailY[trailHead] = y;
        trailHead = (trailHead + 1) % TRAIL_SIZE;
        if (trailCount < TRAIL_SIZE) trailCount++;
      }
      liveTick++;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  const liveTrail = $derived({
    getPoints: (): Array<[number, number, number]> => {
      void liveTick;
      const n = trailCount;
      if (n === 0) return [];
      const start = n < TRAIL_SIZE ? 0 : trailHead;
      const pts: Array<[number, number, number]> = [];
      const stride = 3;
      for (let i = 0; i < n; i += stride) {
        const idx = (start + i) % TRAIL_SIZE;
        pts.push([trailParam[idx], trailX[idx], trailY[idx]]);
      }
      return pts;
    },
  });

  $effect(() => {
    if (!view3D) return;
    const m = model;
    let cancelled = false;
    computing3d = true;
    manifold3d = null;
    queueMicrotask(() => {
      if (cancelled) return;
      const bifName = m.bifParam.name;
      manifold3d = computeManifold(
        (p) => (x, y, ps) => m.rhs(x, y, { ...ps, [bifName]: p }),
        { ...m.defaultParams },
        { min: m.bifParam.min, max: m.bifParam.max },
        m.bounds,
        {
          nSamples: 40,
          cycleSamples: 50,
          seed: [
            m.bounds.xMax - (m.bounds.xMax - m.bounds.xMin) * 0.1,
            (m.bounds.yMin + m.bounds.yMax) / 2,
          ],
          dt: m.dt,
          transientSteps: 3000,
          cycleSteps: 3000,
          cycleMinAmplitudeFrac: 0.1,
        },
      );
      computing3d = false;
    });
    return () => { cancelled = true; };
  });
</script>

<div class="four-doors">
  <InfoBanner id="four-doors" title="Four routes out of rest">
    {#snippet children()}
      <p>
        Each tab is one codimension-1 way a stable equilibrium can lose stability when you raise
        the drive. The <b>phase portrait</b> is the (V, n) plane with <b class="cyan">cyan ẋ-nullclines</b>
        and <b class="red">pink ẏ-nullclines</b>;
        <span class="green">●</span> stable, <span class="yellow">●</span> saddle,
        <span class="red">○</span> unstable equilibria. Drag the parameter slider — watch
        attractors collide, exchange stability, or be born.
      </p>
      <p>
        The <b>F–I curve</b> tells you which bifurcation you're near:
        a <b>continuous rise from zero</b> ⇒ SNIC; a <b>jump to finite frequency</b> ⇒ fold or sub-Hopf;
        a <b>continuous rise with zero amplitude</b> ⇒ supercritical Hopf.
      </p>
    {/snippet}
  </InfoBanner>
  <nav class="tabs">
    {#each fourDoors as m, i}
      <button
        class:active={i === activeIdx}
        onclick={() => (activeIdx = i)}
      >
        <span class="short">{m.short}</span>
        <span class="name">{m.name}</span>
      </button>
    {/each}
  </nav>

  <div class="grid">
    <div class="phase-col">
      <div class="plot-header">
        <div class="plot-label">{view3D ? 'Bifurcation manifold' : 'Phase portrait'}</div>
        <ViewToggle value={view3D} onChange={(v) => (view3D = v)} />
      </div>
      <div class="phase-frame">
        {#if view3D}
          <Manifold3D
            data={manifold3d}
            pLabel={model.bifParam.name}
            xLabel={model.labels.x}
            yLabel={model.labels.y}
            highlightP={bifValues[model.id]}
            live={liveTrail}
          />
          {#if computing3d}
            <div class="compute-tag">computing…</div>
          {/if}
        {:else}
          <PhasePortrait {model} {params} />
        {/if}
      </div>
    </div>

    <div class="right-col">
      <div class="control">
        <label>
          <span class="param-name">{model.bifParam.name}</span>
          <span class="param-val">{bifValues[model.id].toFixed(3)}</span>
        </label>
        <input
          type="range"
          min={model.bifParam.min}
          max={model.bifParam.max}
          step={model.bifParam.step}
          value={bifValues[model.id]}
          oninput={(e) => setBif(parseFloat((e.target as HTMLInputElement).value))}
        />
        <div class="range-bounds">
          <span>{model.bifParam.min}</span>
          <span>{model.bifParam.max}</span>
        </div>
      </div>

      <div class="plot-block">
        <div class="plot-label">Voltage trace</div>
        <TimePlot {model} {params} height={110} windowMs={800} />
      </div>

      <div class="plot-block">
        <div class="plot-label">F–I curve</div>
        <FICurve {model} {params} height={180} currentI={bifValues[model.id]} />
      </div>

      <div class="sidebar">
        <div class="title">Diagnostic</div>
        <table>
          <tbody>
            <tr><td>Excitability class</td><td>Class {info.excitabilityClass}</td></tr>
            <tr><td>Role</td><td>{info.role}</td></tr>
            <tr><td>Bistable</td><td>{info.bistable ? 'yes' : 'no'}</td></tr>
            <tr><td>Subthreshold oscillations</td><td>{info.subthresholdOsc}</td></tr>
            <tr><td>Onset frequency</td><td>{info.onsetFreqScaling}</td></tr>
            <tr><td>Onset amplitude</td><td>{info.onsetAmpScaling}</td></tr>
          </tbody>
        </table>

        <div class="notes">{model.notes}</div>

        <button class="adv" onclick={() => (showEquations = !showEquations)}>
          {showEquations ? '▾' : '▸'} Show equations
        </button>
        {#if showEquations}
          <div class="equations">
            {#each model.latex as eq}
              <Equation tex={eq} />
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .four-doors {
    max-width: 1280px;
    margin: 0 auto;
    padding: 14px 20px;
    color: var(--text);
  }
  .tabs {
    display: flex;
    gap: 5px;
    margin-bottom: 14px;
    flex-wrap: wrap;
  }
  .tabs button {
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--text);
    padding: 6px 10px;
    border-radius: 5px;
    cursor: pointer;
    text-align: left;
    transition: all 120ms ease;
    min-width: 130px;
  }
  .tabs button:hover {
    border-color: var(--text-muted);
  }
  .tabs button.active {
    background: var(--surface-2);
    border-color: var(--accent);
  }
  .tabs .short {
    display: block;
    font-weight: 600;
    font-size: 12px;
  }
  .tabs .name {
    display: block;
    color: var(--text-dim);
    font-size: 10.5px;
    margin-top: 1px;
  }
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(340px, 1fr);
    gap: 22px;
    align-items: start;
  }
  .phase-col {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }
  .phase-frame {
    width: 100%;
    aspect-ratio: 1 / 1;
    max-height: calc(100vh - 140px);
    position: relative;
  }
  .plot-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }
  .plot-label {
    font-size: 10.5px;
    color: var(--text-dim);
    font-family: ui-monospace, monospace;
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
    z-index: 5;
  }
  @media (max-width: 1000px) {
    .grid {
      grid-template-columns: 1fr;
    }
    .phase-frame {
      max-width: 480px;
      margin: 0 auto;
    }
  }
  .right-col {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .control {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 10px 14px;
  }
  .control label {
    display: flex;
    justify-content: space-between;
    font-family: ui-monospace, monospace;
    font-size: 12px;
    margin-bottom: 4px;
  }
  .param-name { color: var(--accent); }
  .param-val { color: var(--warn); }
  .control input[type=range] {
    width: 100%;
  }
  .range-bounds {
    display: flex;
    justify-content: space-between;
    color: var(--text-muted);
    font-family: ui-monospace, monospace;
    font-size: 10px;
    margin-top: 2px;
  }
  .plot-block {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .plot-label {
    font-size: 10.5px;
    color: var(--text-dim);
    font-family: ui-monospace, monospace;
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
  .sidebar table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 10px;
  }
  .sidebar td {
    padding: 3px 0;
    border-bottom: 1px solid var(--border);
    font-size: 11.5px;
  }
  .sidebar td:first-child { color: var(--text-dim); }
  .sidebar td:last-child { text-align: right; color: var(--text); font-family: ui-monospace, monospace; }
  .notes {
    color: var(--text-dim);
    line-height: 1.5;
    margin-top: 8px;
    font-size: 11.5px;
  }
  .adv {
    margin-top: 12px;
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
    color: var(--text);
  }
  .equations :global(.katex) {
    font-size: 14px;
  }
</style>
