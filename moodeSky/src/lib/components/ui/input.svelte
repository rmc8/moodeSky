<script lang="ts">
  import { cn } from '$lib/utils/index.js';
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface InputProps extends HTMLInputAttributes {
    class?: string;
    value?: string;
  }

  let {
    class: className,
    type = 'text',
    value = $bindable(),
    ...restProps
  }: InputProps = $props();
</script>

<input
  class={cn(
    'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bluesky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400 dark:focus-visible:ring-bluesky-400',
    className
  )}
  {type}
  bind:value
  {...restProps}
/>