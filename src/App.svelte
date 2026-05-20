<script lang="ts">
  import FourDoors from './views/FourDoors.svelte';
  import CycleBifurcations from './views/CycleBifurcations.svelte';
  import ClassComparison from './views/ClassComparison.svelte';
  import Bursters from './views/Bursters.svelte';
  import BifManifold from './views/BifManifold.svelte';
  import About from './lib/About.svelte';
  import { site } from './config';
  import { theme, toggleTheme, applyInitialTheme } from './lib/theme.svelte';

  let view = $state<'doors' | 'cycles' | 'class' | 'bursters' | 'manifold'>('doors');
  let aboutOpen = $state(false);

  $effect(() => { applyInitialTheme(); });
</script>

<div class="app">
  <header class="top">
    <div class="brand">
      <span class="logo">⌬</span>
      <span class="title">Biff Zoo</span>
      <span class="tag">a bifurcation explorer</span>
    </div>
    <nav>
      <button class:active={view === 'doors'} onclick={() => (view = 'doors')}>
        Rest-state
      </button>
      <button class:active={view === 'cycles'} onclick={() => (view = 'cycles')}>
        Cycle bifurcations
      </button>
      <button class:active={view === 'class'} onclick={() => (view = 'class')}>
        Class 1 vs 2
      </button>
      <button class:active={view === 'bursters'} onclick={() => (view = 'bursters')}>
        Bursters
      </button>
      <button class:active={view === 'manifold'} onclick={() => (view = 'manifold')}>
        Param map
      </button>
      <button class="theme-toggle" onclick={toggleTheme} aria-label="toggle theme" title="toggle theme">
        {theme.name === 'dark' ? '☀' : '☾'}
      </button>
      <button class="info" onclick={() => (aboutOpen = true)} aria-label="about">?</button>
    </nav>
  </header>

  <About open={aboutOpen} onClose={() => (aboutOpen = false)} />

  <main>
    {#if view === 'doors'}
      <FourDoors />
    {:else if view === 'cycles'}
      <CycleBifurcations />
    {:else if view === 'class'}
      <ClassComparison />
    {:else if view === 'bursters'}
      <Bursters />
    {:else}
      <BifManifold />
    {/if}
  </main>

  <footer>
    <span class="cite">After Izhikevich (2000) <i>Int. J. Bifurc. Chaos</i> 10:1171–1266.</span>
    <span class="links">
      <a href={site.github} target="_blank" rel="noreferrer">source</a>
      <span class="sep">·</span>
      <a href={site.kofi} target="_blank" rel="noreferrer">support</a>
      <span class="sep">·</span>
      <button class="link-btn" onclick={() => (aboutOpen = true)}>about</button>
    </span>
  </footer>
</div>

<style>
  :global(body) {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    transition: background 180ms ease, color 180ms ease;
  }
  :global(body[data-theme='dark']) {
    --bg: #0a0b0f;
    --surface: #14181f;
    --surface-2: #181a20;
    --border: #2a2e36;
    --border-strong: #3a3f48;
    --text: #e4e6ea;
    --text-dim: #9aa3b2;
    --text-muted: #5a626e;
    --accent: #6ec3ff;
    --warn: #ffd76b;
    --error: #ff8a8a;
    --success: #7dd87d;
    --pink: #ff7eb0;
    --thumb-ring: #1a1c22;
  }
  :global(body[data-theme='light']) {
    --bg: #f7f8fa;
    --surface: #ffffff;
    --surface-2: #f3f4f7;
    --border: #dde1e8;
    --border-strong: #c0c5cf;
    --text: #1a1d24;
    --text-dim: #5a6270;
    --text-muted: #8a93a0;
    --accent: #1564b8;
    --warn: #a67324;
    --error: #c43a3a;
    --success: #2f8a44;
    --pink: #b53574;
    --thumb-ring: #ffffff;
  }
  :global(*) { box-sizing: border-box; }

  :global(input[type='range']) {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    height: 16px;
    margin: 0;
    padding: 0;
  }
  :global(input[type='range']::-webkit-slider-runnable-track) {
    height: 3px;
    background: var(--border);
    border-radius: 2px;
  }
  :global(input[type='range']::-webkit-slider-thumb) {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--warn);
    border: 2px solid var(--thumb-ring);
    margin-top: -5px;
    cursor: pointer;
    transition: transform 80ms ease;
  }
  :global(input[type='range']::-webkit-slider-thumb:hover) {
    transform: scale(1.15);
  }
  :global(input[type='range']::-moz-range-track) {
    height: 3px;
    background: var(--border);
    border-radius: 2px;
    border: none;
  }
  :global(input[type='range']::-moz-range-thumb) {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--warn);
    border: 2px solid var(--thumb-ring);
    cursor: pointer;
  }
  :global(input[type='range']:focus) { outline: none; }

  @media (pointer: coarse) {
    :global(input[type='range']) {
      height: 32px;
      touch-action: pan-y;
    }
    :global(input[type='range']::-webkit-slider-runnable-track) { height: 4px; }
    :global(input[type='range']::-webkit-slider-thumb) {
      width: 22px;
      height: 22px;
      margin-top: -9px;
    }
    :global(input[type='range']::-moz-range-track) { height: 4px; }
    :global(input[type='range']::-moz-range-thumb) {
      width: 22px;
      height: 22px;
    }
  }

  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 24px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  .brand {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .logo {
    font-size: 18px;
    color: var(--accent);
  }
  .title {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.4px;
  }
  .tag {
    color: var(--text-muted);
    font-size: 11px;
    font-family: ui-monospace, monospace;
  }
  nav {
    display: flex;
    gap: 4px;
    align-items: center;
  }
  nav button {
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-dim);
    padding: 4px 12px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 12.5px;
  }
  nav button:hover { color: var(--text); }
  nav button.active {
    color: var(--accent);
    border-color: var(--border);
    background: var(--surface-2);
  }
  nav button.theme-toggle,
  nav button.info {
    margin-left: 4px;
    width: 22px;
    height: 22px;
    padding: 0;
    border-radius: 50%;
    border: 1px solid var(--border);
    color: var(--text-dim);
    font-family: ui-monospace, monospace;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  nav button.theme-toggle:hover,
  nav button.info:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  main { flex: 1; }
  footer {
    padding: 10px 24px;
    border-top: 1px solid var(--border);
    color: var(--text-muted);
    font-size: 10.5px;
    font-family: ui-monospace, monospace;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  footer .links { display: inline-flex; gap: 8px; align-items: center; }
  footer a, footer .link-btn {
    color: var(--text-muted);
    text-decoration: none;
    background: transparent;
    border: none;
    font: inherit;
    cursor: pointer;
    padding: 0;
  }
  footer a:hover, footer .link-btn:hover { color: var(--accent); }
  footer .sep { color: var(--border); }
</style>
