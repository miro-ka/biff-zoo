<script lang="ts">
  import katex from 'katex';

  interface Props {
    tex: string;
    display?: boolean;
  }
  let { tex, display = true }: Props = $props();

  let el: HTMLSpanElement | undefined = $state();

  $effect(() => {
    if (!el) return;
    try {
      katex.render(tex, el, { displayMode: display, throwOnError: false });
    } catch (e) {
      el.textContent = tex;
    }
  });
</script>

<span bind:this={el}></span>
