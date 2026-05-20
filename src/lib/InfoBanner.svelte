<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    id: string;          // unique id used for localStorage
    title: string;
    children: Snippet;
  }

  let { id, title, children }: Props = $props();

  const storageKey = `biff-zoo:info-banner:${id}`;
  let open = $state(true);

  $effect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'closed') open = false;
    } catch (e) {
      // localStorage unavailable; ignore
    }
  });

  function close() {
    open = false;
    try {
      localStorage.setItem(storageKey, 'closed');
    } catch (e) {}
  }

  function reopen() {
    open = true;
    try {
      localStorage.setItem(storageKey, 'open');
    } catch (e) {}
  }
</script>

{#if open}
  <div class="banner">
    <button class="close" onclick={close} aria-label="close">×</button>
    <div class="title">{title}</div>
    <div class="content">{@render children()}</div>
  </div>
{:else}
  <button class="reopen" onclick={reopen}>ⓘ how to read this view</button>
{/if}

<style>
  .banner {
    position: relative;
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    border-radius: 6px;
    padding: 10px 36px 10px 14px;
    margin-bottom: 14px;
    color: var(--text-dim);
    font-size: 12px;
    line-height: 1.55;
  }
  .title {
    color: var(--accent);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
    margin-bottom: 6px;
  }
  .content :global(b) { color: var(--text); font-weight: 500; }
  .content :global(.green) { color: var(--success); font-weight: 500; }
  .content :global(.yellow) { color: var(--warn); font-weight: 500; }
  .content :global(.red) { color: var(--error); font-weight: 500; }
  .content :global(.cyan) { color: var(--accent); font-weight: 500; }
  .content :global(.amber) { color: var(--warn); font-weight: 500; }
  .content :global(p) { margin: 4px 0; }
  .content :global(ul) { margin: 4px 0; padding-left: 18px; }
  .content :global(li) { margin: 2px 0; }
  .close {
    position: absolute;
    top: 4px;
    right: 6px;
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 18px;
    cursor: pointer;
    line-height: 1;
    padding: 2px 6px;
    border-radius: 3px;
  }
  .close:hover { color: var(--text); background: var(--surface-2); }
  .reopen {
    background: transparent;
    border: 1px dashed var(--border);
    color: var(--text-muted);
    padding: 4px 10px;
    border-radius: 5px;
    font: 11px ui-monospace, monospace;
    cursor: pointer;
    margin-bottom: 12px;
  }
  .reopen:hover { color: var(--accent); border-color: var(--accent); }
</style>
