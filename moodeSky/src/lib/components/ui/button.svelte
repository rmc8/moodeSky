<script lang="ts">
  import { cn } from '$lib/utils/index.js';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

  interface ButtonProps extends HTMLButtonAttributes {
    variant?: ButtonVariant;
    size?: ButtonSize;
    class?: string;
  }

  let {
    class: className,
    variant = 'default',
    size = 'default',
    type = 'button',
    ...restProps
  }: ButtonProps = $props();

  const variants = {
    default: 'bg-bluesky-600 text-white hover:bg-bluesky-700 focus:ring-bluesky-500',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 focus:ring-bluesky-500',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
    ghost: 'hover:bg-gray-100 focus:ring-gray-500',
    link: 'text-bluesky-600 underline-offset-4 hover:underline focus:ring-bluesky-500'
  };

  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10'
  };
</script>

<button
  class={cn(
    'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className
  )}
  {type}
  {...restProps}
>
  <slot />
</button>