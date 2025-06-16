<script lang="ts">
  import { cn } from '$lib/utils/index.js';

  interface SpinnerProps {
    class?: string;
    size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl';
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'white';
    speed?: 'slow' | 'normal' | 'fast';
    label?: string;
  }

  let {
    class: className,
    size = 'default',
    variant = 'default',
    speed = 'normal',
    label = 'Loading...'
  }: SpinnerProps = $props();

  // サイズ設定
  const sizes = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  // ボーダー幅設定
  const borderWidths = {
    xs: 'border',
    sm: 'border-2',
    default: 'border-2',
    lg: 'border-[3px]',
    xl: 'border-4'
  };

  // カラーバリアント設定
  const variants = {
    default: 'border-gray-200 border-t-gray-600 dark:border-gray-700 dark:border-t-gray-300',
    primary: 'border-blue-200 border-t-blue-600 dark:border-blue-800 dark:border-t-blue-400',
    success: 'border-emerald-200 border-t-emerald-600 dark:border-emerald-800 dark:border-t-emerald-400',
    warning: 'border-amber-200 border-t-amber-600 dark:border-amber-800 dark:border-t-amber-400',
    error: 'border-red-200 border-t-red-600 dark:border-red-800 dark:border-t-red-400',
    white: 'border-white/30 border-t-white'
  };

  // スピード設定
  const speeds = {
    slow: 'animate-spin [animation-duration:2s]',
    normal: 'animate-spin [animation-duration:1s]',
    fast: 'animate-spin [animation-duration:0.5s]'
  };
</script>

<div
  class={cn(
    'inline-block rounded-full',
    sizes[size],
    borderWidths[size],
    variants[variant],
    speeds[speed],
    className
  )}
  role="status"
  aria-label={label}
>
  <span class="sr-only">{label}</span>
</div>

<!-- より高度なスピナー（ドット型） -->
{#snippet dotSpinner()}
  <div
    class={cn(
      'inline-flex space-x-1',
      className
    )}
    role="status"
    aria-label={label}
  >
    {#each Array(3) as _, i}
      <div
        class={cn(
          'rounded-full animate-pulse',
          size === 'xs' ? 'h-1 w-1' : 
          size === 'sm' ? 'h-1.5 w-1.5' :
          size === 'default' ? 'h-2 w-2' :
          size === 'lg' ? 'h-3 w-3' : 'h-4 w-4',
          variant === 'default' ? 'bg-gray-600 dark:bg-gray-300' :
          variant === 'primary' ? 'bg-blue-600 dark:bg-blue-400' :
          variant === 'success' ? 'bg-emerald-600 dark:bg-emerald-400' :
          variant === 'warning' ? 'bg-amber-600 dark:bg-amber-400' :
          variant === 'error' ? 'bg-red-600 dark:bg-red-400' :
          'bg-white'
        )}
        style={`animation-delay: ${i * 0.2}s; animation-duration: ${
          speed === 'slow' ? '2s' : speed === 'fast' ? '0.5s' : '1s'
        }`}>
      </div>
    {/each}
    <span class="sr-only">{label}</span>
  </div>
{/snippet}

<!-- より高度なスピナー（パルス型） -->
{#snippet pulseSpinner()}
  <div
    class={cn(
      'inline-block rounded-full animate-ping',
      sizes[size],
      variant === 'default' ? 'bg-gray-600 dark:bg-gray-300' :
      variant === 'primary' ? 'bg-blue-600 dark:bg-blue-400' :
      variant === 'success' ? 'bg-emerald-600 dark:bg-emerald-400' :
      variant === 'warning' ? 'bg-amber-600 dark:bg-amber-400' :
      variant === 'error' ? 'bg-red-600 dark:bg-red-400' :
      'bg-white',
      speed === 'slow' ? '[animation-duration:2s]' :
      speed === 'fast' ? '[animation-duration:0.5s]' : '[animation-duration:1s]',
      className
    )}
    role="status"
    aria-label={label}
  >
    <span class="sr-only">{label}</span>
  </div>
{/snippet}

<style>
  /* カスタムスピン アニメーション */
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* スムーズなアニメーション */
  .animate-spin {
    animation-timing-function: linear;
  }

  /* パルスアニメーション最適化 */
  @keyframes ping {
    75%, 100% {
      transform: scale(2);
      opacity: 0;
    }
  }
</style>