<script lang="ts">
  import type { Model2D } from '../lib/types';
  import { fourDoors, doorInfo } from '../lib/models/registry';
  import PhasePortrait from '../lib/plot/PhasePortrait.svelte';
  import TimePlot from '../lib/plot/TimePlot.svelte';
  import FICurve from '../lib/plot/FICurve.svelte';
  import Equation from '../lib/plot/Equation.svelte';
  import InfoBanner from '../lib/InfoBanner.svelte';

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
      <div class="phase-frame">
        <PhasePortrait {model} {params} />
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
