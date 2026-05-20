<script lang="ts">
  import { site } from '../config';

  interface Props {
    open: boolean;
    onClose: () => void;
  }

  let { open, onClose }: Props = $props();

  function handleBackdrop(ev: MouseEvent) {
    if ((ev.target as HTMLElement).classList.contains('backdrop')) onClose();
  }
</script>

{#if open}
  <div class="backdrop" onclick={handleBackdrop} role="presentation">
    <div class="modal" role="dialog" aria-labelledby="about-title">
      <button class="close" onclick={onClose} aria-label="close">×</button>
      <h2 id="about-title">Biff Zoo</h2>
      <p class="lead">
        An interactive companion to Izhikevich's <i>Neural Excitability, Spiking and Bursting</i>
        (Int. J. Bifurc. Chaos, 2000). Every neural behaviour — rest, spiking, bursting — is an
        attractor configuration, and every transition between behaviours is a bifurcation.
      </p>

      <h3>What's here</h3>
      <ul>
        <li><b>Rest-state bifurcations</b> — the four codim-1 routes a stable equilibrium can lose stability, side-by-side with the matching biophysical models. The classifier in the sidebar reads off integrator vs resonator, bistability, onset scaling.</li>
        <li><b>Class 1 vs Class 2</b> — same Morris–Lecar in two parameter regimes. The F–I curves tell you which excitability class the cell belongs to.</li>
        <li><b>Bursters</b> — fast-slow dissection plots that overlay the slow trajectory on the fast subsystem's bifurcation diagram. Three of Izhikevich's classical bursters: square-wave (Hindmarsh–Rose), elliptic (Bautin), and parabolic (Morris–Lecar Class 1 with slow drive).</li>
      </ul>

      <h3>How to use it</h3>
      <p>
        Pick a card or tab. Slide the bifurcation parameter to watch attractors collide, exchange
        stability, or be born. Click anywhere in a phase portrait to seed a new initial condition.
        Open <i>Show equations</i> to reveal the underlying ODEs.
      </p>

      <h3>Source &amp; credits</h3>
      <p>
        Built with Svelte 5 + TypeScript. All integration is RK4 in the browser. Phase portraits,
        nullclines (marching squares), equilibrium classification (Newton + Jacobian eigenanalysis),
        and fast-slow dissection are computed live — no precomputed assets.
      </p>
      <p>
        Scientific content is from
        <a href="https://www.izhikevich.org/publications/whichmod.htm" target="_blank" rel="noreferrer">Izhikevich (2000)</a>.
        Source code:
        <a href={site.github} target="_blank" rel="noreferrer">{site.github}</a>.
      </p>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(6, 8, 12, 0.72);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 32px 20px;
  }
  .modal {
    position: relative;
    max-width: 640px;
    width: 100%;
    max-height: calc(100vh - 64px);
    overflow-y: auto;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 28px 32px;
    color: var(--text);
    font-size: 13px;
    line-height: 1.55;
  }
  .close {
    position: absolute;
    top: 8px;
    right: 12px;
    background: transparent;
    border: none;
    color: var(--text-dim);
    font-size: 22px;
    cursor: pointer;
    line-height: 1;
    padding: 4px 8px;
    border-radius: 4px;
  }
  .close:hover { color: var(--text); background: var(--surface-2); }
  h2 {
    color: var(--accent);
    font-weight: 600;
    font-size: 18px;
    margin: 0 0 10px;
  }
  h3 {
    color: var(--warn);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin: 18px 0 6px;
    font-weight: 600;
  }
  .lead { color: var(--text); margin: 0 0 4px; }
  p { color: var(--text-dim); margin: 0 0 6px; }
  ul { margin: 0 0 8px 0; padding-left: 18px; color: var(--text-dim); }
  li { margin-bottom: 6px; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
</style>
