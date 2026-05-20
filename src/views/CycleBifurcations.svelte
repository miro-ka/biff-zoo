<script lang="ts">
  import type { Model2D } from '../lib/types';
  import { cycleBifurcations, cycleInfo } from '../lib/models/registry';
  import PhasePortrait from '../lib/plot/PhasePortrait.svelte';
  import TimePlot from '../lib/plot/TimePlot.svelte';
  import FICurve from '../lib/plot/FICurve.svelte';
  import Equation from '../lib/plot/Equation.svelte';
  import InfoBanner from '../lib/InfoBanner.svelte';

  let activeIdx = $state(0);
  const model = $derived<Model2D>(cycleBifurcations[activeIdx]);
  const info = $derived(cycleInfo[model.id]);

  let bifValues = $state<Record<string, number>>(
    Object.fromEntries(cycleBifurcations.map((m) => [m.id, m.bifParam.default])),
  );

  const params = $derived({
    ...model.defaultParams,
    [model.bifParam.name]: bifValues[model.id],
  });

  let showEquations = $state(false);

  function setBif(v: number) {
    bifValues = { ...bifValues, [model.id]: v };
  }
</script>

<div class="cb">
  <InfoBanner id="cycles" title="Four ways spiking ends">
    {#snippet children()}
      <p>
        Mirror of the rest-state view, but for how a stable limit cycle can die.
        The <b>period scaling</b> is the diagnostic: <b>SNIC</b> diverges as <em>T ∝ 1/√(λ−λ_c)</em>;
        <b>saddle-homoclinic</b> diverges <em>much more slowly</em> as <em>T ∝ −1/ln(λ_c−λ)</em>;
        <b>supercritical Hopf</b> and <b>fold-of-cycles</b> stay finite at termination.
      </p>
      <p>
        Watch the F–I curve as you push the parameter toward the bifurcation: <b>frequency → 0</b>
        means the cycle disappears with infinite period (SNIC or homoclinic); <b>frequency stays
        finite</b> means the cycle is annihilated at non-zero rate (Hopf or fold-cycle).
      </p>
    {/snippet}
  </InfoBanner>
  <nav class="tabs">
    {#each cycleBifurcations as m, i}
      <button
        class:active={i === activeIdx}
        onclick={() => (activeIdx = i)}
      >
        <span class="short">{cycleInfo[m.id].bifName}</span>
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
        <div class="plot-label">
          Frequency vs parameter — watch f(λ) approach the cycle's death
        </div>
        <FICurve {model} {params} height={180} currentI={bifValues[model.id]} />
      </div>

      <div class="sidebar">
        <div class="title">{info.bifName}</div>
        <div class="scaling">
          <Equation tex={info.periodScaling} />
        </div>
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

  <aside class="bottom-note">
    The four codim-1 ways a stable limit cycle can lose stability sharply.
    Two diverge in period: <b>SNIC</b> as 1/√(λ−λ_c), <b>saddle-homoclinic</b> as −1/ln(λ_c−λ) — much slower.
    Two stay finite: <b>supercritical Hopf</b> (cycle shrinks to a point) and <b>fold limit cycle</b> (stable + unstable cycles collide).
    Onset / amplitude / period scaling are the diagnostic fingerprints that tell you which one you're near (Izhikevich §3.1).
  </aside>
</div>

<style>
  .cb {
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
    min-width: 150px;
  }
  .tabs button:hover { border-color: var(--text-muted); }
  .tabs button.active { background: var(--surface-2); border-color: var(--accent); }
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
  @media (max-width: 1000px) {
    .grid { grid-template-columns: 1fr; }
  }
  .phase-col, .right-col {
    display: flex; flex-direction: column; gap: 8px; min-width: 0;
  }
  .phase-frame {
    width: 100%;
    aspect-ratio: 1 / 1;
    max-height: calc(100vh - 200px);
  }
  .right-col { gap: 12px; }
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
  .control input[type='range'] { width: 100%; }
  .range-bounds {
    display: flex;
    justify-content: space-between;
    color: var(--text-muted);
    font-family: ui-monospace, monospace;
    font-size: 10px;
    margin-top: 2px;
  }
  .plot-block { display: flex; flex-direction: column; gap: 3px; }
  .plot-label { font-size: 10.5px; color: var(--text-dim); font-family: ui-monospace, monospace; }
  .sidebar {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 12px 14px;
    font-size: 12.5px;
  }
  .sidebar .title { font-weight: 600; color: var(--warn); margin-bottom: 6px; }
  .scaling {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 8px 10px;
    margin-bottom: 10px;
  }
  .scaling :global(.katex) { font-size: 13px; }
  .notes { color: var(--text-dim); line-height: 1.5; font-size: 11.5px; }
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
  .bottom-note {
    margin-top: 18px;
    padding: 12px 16px;
    background: var(--surface);
    border-left: 3px solid var(--accent);
    border-radius: 4px;
    color: var(--text-dim);
    font-size: 12px;
    line-height: 1.55;
  }
  .bottom-note b { color: var(--accent); font-weight: 500; }
</style>
