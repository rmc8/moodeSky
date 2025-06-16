<script lang="ts">
  import { cn } from '$lib/utils/index.js';
  import { Check } from '$lib/components/icons/index.js';
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface CheckboxProps extends Omit<HTMLInputAttributes, 'class' | 'size'> {
    class?: string;
    checked?: boolean;
    indeterminate?: boolean;
    size?: 'sm' | 'default' | 'lg';
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
    label?: string;
    description?: string;
  }

  let {
    class: className,
    checked = $bindable(false),
    indeterminate = false,
    size = 'default',
    variant = 'default',
    label,
    description,
    disabled = false,
    id,
    ...restProps
  }: CheckboxProps = $props();

  // サイズ設定
  const sizes = {
    sm: 'h-4 w-4',
    default: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const checkSizes = {
    sm: 'h-3 w-3',
    default: 'h-4 w-4', 
    lg: 'h-5 w-5'
  };

  // バリアント設定
  const variants = {
    default: {
      base: 'border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600',
      focus: 'focus:ring-blue-500 focus:ring-offset-2',
      dark: 'dark:border-gray-600 dark:data-[state=checked]:bg-blue-500 dark:data-[state=checked]:border-blue-500'
    },
    primary: {
      base: 'border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600',
      focus: 'focus:ring-blue-500 focus:ring-offset-2',
      dark: 'dark:border-gray-600 dark:data-[state=checked]:bg-blue-500 dark:data-[state=checked]:border-blue-500'
    },
    success: {
      base: 'border-gray-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600',
      focus: 'focus:ring-emerald-500 focus:ring-offset-2',
      dark: 'dark:border-gray-600 dark:data-[state=checked]:bg-emerald-500 dark:data-[state=checked]:border-emerald-500'
    },
    warning: {
      base: 'border-gray-300 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600',
      focus: 'focus:ring-amber-500 focus:ring-offset-2',
      dark: 'dark:border-gray-600 dark:data-[state=checked]:bg-amber-500 dark:data-[state=checked]:border-amber-500'
    },
    error: {
      base: 'border-gray-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600',
      focus: 'focus:ring-red-500 focus:ring-offset-2',
      dark: 'dark:border-gray-600 dark:data-[state=checked]:bg-red-500 dark:data-[state=checked]:border-red-500'
    }
  };

  // 一意なIDを生成
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  // チェック状態を決定
  const isChecked = $derived(indeterminate ? false : checked);
  const dataState = $derived(
    indeterminate ? 'indeterminate' : isChecked ? 'checked' : 'unchecked'
  );
</script>

<div class={cn('flex items-start space-x-3', className)}>
  <div class="relative flex items-center">
    <input
      {id}
      type="checkbox"
      bind:checked
      {disabled}
      class="sr-only"
      aria-describedby={description ? `${checkboxId}-description` : undefined}
      {...restProps}
    />
    
    <div
      class={cn(
        // ベーススタイル
        'relative flex items-center justify-center rounded-md border-2 bg-white transition-all duration-200 ease-in-out',
        
        // サイズ
        sizes[size],
        
        // バリアント
        variants[variant].base,
        variants[variant].focus,
        variants[variant].dark,
        
        // フォーカス状態
        'focus-within:ring-2 focus-within:ring-offset-2',
        
        // ホバー状態
        'hover:border-opacity-80',
        
        // 無効状態
        disabled && 'opacity-50 cursor-not-allowed',
        
        // ダークモード
        'dark:bg-gray-800'
      )}
      data-state={dataState}
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : isChecked}
      aria-label={label}
      tabindex={disabled ? -1 : 0}
      onclick={() => {
        if (!disabled) {
          checked = !checked;
        }
      }}
      onkeydown={(e) => {
        if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          checked = !checked;
        }
      }}
    >
      <!-- チェックアイコン -->
      {#if isChecked}
        <Check 
          class={cn(
            'text-white transition-all duration-200 ease-in-out transform scale-100',
            checkSizes[size]
          )} 
        />
      {/if}
      
      <!-- 不確定状態のアイコン -->
      {#if indeterminate}
        <div 
          class={cn(
            'bg-white rounded-sm transition-all duration-200 ease-in-out',
            size === 'sm' ? 'w-2 h-0.5' : size === 'lg' ? 'w-3 h-0.5' : 'w-2.5 h-0.5'
          )}>
        </div>
      {/if}
    </div>
  </div>

  <!-- ラベルと説明 -->
  {#if label || description}
    <div class="flex flex-col">
      {#if label}
        <label 
          for={checkboxId}
          class={cn(
            'text-sm font-medium leading-none cursor-pointer transition-colors',
            disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-900 dark:text-gray-100',
            'peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
          )}
        >
          {label}
        </label>
      {/if}
      
      {#if description}
        <p 
          id={`${checkboxId}-description`}
          class={cn(
            'text-xs text-gray-500 dark:text-gray-400 mt-1',
            disabled && 'opacity-70'
          )}
        >
          {description}
        </p>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* カスタムアニメーション */
  [data-state="checked"] {
    animation: checkboxCheck 0.2s ease-in-out;
  }
  
  [data-state="unchecked"] {
    animation: checkboxUncheck 0.2s ease-in-out;
  }
  
  @keyframes checkboxCheck {
    from {
      transform: scale(0.8);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
  
  @keyframes checkboxUncheck {
    from {
      transform: scale(1);
      opacity: 1;
    }
    to {
      transform: scale(0.8);
      opacity: 0;
    }
  }
</style>