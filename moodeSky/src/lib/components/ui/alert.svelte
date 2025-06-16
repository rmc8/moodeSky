<script lang="ts">
  import { cn } from '$lib/utils/index.js';
  import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from '$lib/components/icons/index.js';

  interface AlertProps {
    class?: string;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
    size?: 'sm' | 'default' | 'lg';
    title?: string;
    description?: string;
    dismissible?: boolean;
    icon?: boolean;
    onDismiss?: () => void;
    children?: any;
  }

  let {
    class: className,
    variant = 'default',
    size = 'default',
    title,
    description,
    dismissible = false,
    icon = true,
    onDismiss,
    children
  }: AlertProps = $props();

  let visible = $state(true);

  // バリアント設定
  const variants = {
    default: {
      container: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300',
      icon: 'text-blue-600 dark:text-blue-400',
      iconComponent: Info
    },
    success: {
      container: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300',
      icon: 'text-emerald-600 dark:text-emerald-400',
      iconComponent: CheckCircle
    },
    warning: {
      container: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-300',
      icon: 'text-amber-600 dark:text-amber-400',
      iconComponent: AlertTriangle
    },
    error: {
      container: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/50 dark:border-red-800 dark:text-red-300',
      icon: 'text-red-600 dark:text-red-400',
      iconComponent: AlertCircle
    },
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300',
      icon: 'text-blue-600 dark:text-blue-400',
      iconComponent: Info
    }
  };

  // サイズ設定
  const sizes = {
    sm: 'p-3 text-sm',
    default: 'p-4',
    lg: 'p-5 text-lg'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    default: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  function handleDismiss() {
    visible = false;
    onDismiss?.();
  }

  const IconComponent = variants[variant].iconComponent;
</script>

{#if visible}
  <div
    class={cn(
      'relative border rounded-lg transition-all duration-300 ease-in-out',
      variants[variant].container,
      sizes[size],
      'animate-in slide-in-from-top-1 fade-in duration-300',
      className
    )}
    role="alert"
    aria-live="polite"
  >
    <div class="flex items-start gap-3">
      <!-- アイコン -->
      {#if icon}
        <div class="flex-shrink-0">
          <IconComponent 
            class={cn(
              iconSizes[size],
              variants[variant].icon
            )}
          />
        </div>
      {/if}

      <!-- コンテンツ -->
      <div class="flex-1 min-w-0">
        {#if title}
          <h3 class={cn(
            'font-medium leading-tight',
            size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'
          )}>
            {title}
          </h3>
        {/if}

        {#if description}
          <div class={cn(
            'mt-1',
            size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm',
            title ? 'opacity-90' : ''
          )}>
            {description}
          </div>
        {/if}

        {#if children}
          <div class={cn(
            title || description ? 'mt-2' : '',
            size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
          )}>
            {@render children()}
          </div>
        {/if}
      </div>

      <!-- 閉じるボタン -->
      {#if dismissible}
        <button
          type="button"
          class={cn(
            'flex-shrink-0 rounded-md p-1.5 transition-colors duration-200',
            'hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-2',
            variants[variant].icon,
            'focus:ring-current'
          )}
          onclick={handleDismiss}
          aria-label="アラートを閉じる"
        >
          <X class={cn(iconSizes[size])} />
        </button>
      {/if}
    </div>
  </div>
{/if}

<!-- 必要に応じて後で追加 -->

<style>
  /* アニメーション */
  @keyframes slide-in-from-top-1 {
    from {
      transform: translateY(-4px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .animate-in {
    animation-fill-mode: both;
  }

  .slide-in-from-top-1 {
    animation-name: slide-in-from-top-1;
  }

  .fade-in {
    animation-name: fade-in;
  }

  .duration-300 {
    animation-duration: 300ms;
  }
</style>