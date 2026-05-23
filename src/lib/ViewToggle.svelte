<script lang="ts">
  interface Props {
    value: boolean;
    onChange: (v: boolean) => void;
    labelOff?: string;
    labelOn?: string;
  }

  let { value, onChange, labelOff = '2D', labelOn = '3D' }: Props = $props();
</script>

<div class="view-toggle">
  <button class:active={!value} onclick={() => onChange(false)}>{labelOff}</button>
  <button class:active={value} onclick={() => onChange(true)}>{labelOn}</button>
</div>

<style>
  .view-toggle {
    display: inline-flex;
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
  }
  .view-toggle button {
    background: transparent;
    border: none;
    color: var(--text-dim);
    padding: 2px 8px;
    cursor: pointer;
    font: 10.5px ui-monospace, monospace;
  }
  .view-toggle button.active {
    background: var(--surface-2);
    color: var(--accent);
  }
</style>
