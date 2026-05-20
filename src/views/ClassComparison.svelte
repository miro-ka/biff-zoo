<script lang="ts">
  import { class1Model, class2Model } from '../lib/models/registry';
  import PhasePortrait from '../lib/plot/PhasePortrait.svelte';
  import TimePlot from '../lib/plot/TimePlot.svelte';
  import FICurve from '../lib/plot/FICurve.svelte';
  import InfoBanner from '../lib/InfoBanner.svelte';

  let I1 = $state(class1Model.bifParam.default);
  let I2 = $state(class2Model.bifParam.default);

  const params1 = $derived({ ...class1Model.defaultParams, I: I1 });
  const params2 = $derived({ ...class2Model.defaultParams, I: I2 });
</script>

<div class="cc">
  <InfoBanner id="class" title="Excitability class is a diagnostic test">
    {#snippet children()}
      <p>
        Same Morris–Lecar model, two parameter regimes. Drag each slider slowly past the spiking
        threshold and watch the F–I curve emerge.
      </p>
      <p>
        <b class="green">Class 1 (SNIC, left)</b>: firing rate emerges continuously from zero —
        the cell can spike arbitrarily slowly. Coding by rate; an <b>integrator</b>.
        <b class="cyan">Class 2 (Hopf-class, right)</b>: rate jumps to a finite value at threshold
        — no arbitrarily-slow spiking. Has damped subthreshold oscillations; a <b>resonator</b>.
      </p>
    {/snippet}
  </InfoBanner>
  <div class="grid">
    <section>
      <div class="header">
        <div class="lbl">Class 1 — Morris–Lecar (SNIC regime)</div>
        <div class="kinetics">V₃ = 12   V₄ = 17.4   φ = 0.067</div>
      </div>
      <div class="phase-frame">
        <PhasePortrait model={class1Model} params={params1} />
      </div>
      <div class="control">
        <label><span>I</span><span class="val">{I1.toFixed(1)}</span></label>
        <input
          type="range"
          min={class1Model.bifParam.min}
          max={class1Model.bifParam.max}
          step={class1Model.bifParam.step}
          value={I1}
          oninput={(e) => (I1 = parseFloat((e.target as HTMLInputElement).value))}
        />
      </div>
      <TimePlot model={class1Model} params={params1} height={120} windowMs={600} />
      <FICurve model={class1Model} params={params1} height={185} currentI={I1} />
    </section>

    <section>
      <div class="header">
        <div class="lbl">Class 2 — Morris–Lecar (Hopf regime)</div>
        <div class="kinetics">V₃ = 2   V₄ = 30   φ = 0.04</div>
      </div>
      <div class="phase-frame">
        <PhasePortrait model={class2Model} params={params2} />
      </div>
      <div class="control">
        <label><span>I</span><span class="val">{I2.toFixed(1)}</span></label>
        <input
          type="range"
          min={class2Model.bifParam.min}
          max={class2Model.bifParam.max}
          step={class2Model.bifParam.step}
          value={I2}
          oninput={(e) => (I2 = parseFloat((e.target as HTMLInputElement).value))}
        />
      </div>
      <TimePlot model={class2Model} params={params2} height={120} windowMs={600} />
      <FICurve model={class2Model} params={params2} height={185} currentI={I2} />
    </section>
  </div>

  <aside class="note">
    Try this: drag the Class 1 slider up slowly past threshold — the firing rate emerges from
    zero. Now do the same on Class 2 — at threshold, frequency jumps to a finite value and the
    spikes appear all at once. That single difference (continuous vs discontinuous onset) is
    Izhikevich's central diagnostic.
  </aside>
</div>

<style>
  .cc {
    max-width: 1280px;
    margin: 0 auto;
    padding: 14px 20px;
    color: var(--text);
  }
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 28px;
  }
  @media (max-width: 1100px) {
    .grid { grid-template-columns: 1fr; }
  }
  section {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }
  .phase-frame {
    width: 100%;
    aspect-ratio: 1 / 1;
    max-height: 60vh;
  }
  .header { display: flex; flex-direction: column; gap: 2px; }
  .lbl {
    color: var(--accent);
    font-size: 13px;
    font-family: ui-monospace, monospace;
  }
  .kinetics {
    color: var(--text-dim);
    font-size: 11.5px;
    font-family: ui-monospace, monospace;
  }
  .control {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 14px;
  }
  .control label {
    display: flex;
    justify-content: space-between;
    font-family: ui-monospace, monospace;
    font-size: 13px;
    margin-bottom: 6px;
  }
  .control label .val { color: var(--warn); }
  .control input[type=range] { width: 100%; }
  .note {
    margin-top: 24px;
    padding: 14px 18px;
    background: var(--surface);
    border-left: 3px solid var(--accent);
    border-radius: 4px;
    color: var(--text-dim);
    font-size: 13px;
    line-height: 1.55;
  }
</style>
