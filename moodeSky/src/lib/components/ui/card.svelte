<script lang="ts">
  import { cn } from '$lib/utils/index.js';
  import type { HTMLAttributes } from 'svelte/elements';

  interface CardProps extends HTMLAttributes<HTMLDivElement> {
    class?: string;
  }

  let { class: className, ...restProps }: CardProps = $props();
</script>

<div
  class={cn(
    'rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800',
    className
  )}
  {...restProps}
>
  <slot />
</div>