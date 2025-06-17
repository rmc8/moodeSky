<script lang="ts">
  import { themeStore } from '../stores/theme.svelte.js';
  import type { ThemeMode } from '../types/theme.js';

  interface Props {
    /** ボタンのバリアント */
    variant?: 'button' | 'menu' | 'compact';
    /** ボタンサイズ */
    size?: 'sm' | 'md' | 'lg';
    /** ラベルを表示するか */
    showLabel?: boolean;
  }

  let { 
    variant = 'button',
    size = 'md', 
    showLabel = true 
  }: Props = $props();

  // テーマオプション定義
  const themeOptions: Array<{
    mode: ThemeMode;
    label: string;
    icon: string;
    description: string;
  }> = [
    {
      mode: 'system',
      label: 'システム',
      icon: '🖥️',
      description: 'システム設定に従います'
    },
    {
      mode: 'light',
      label: 'ライト',
      icon: '☀️',
      description: 'ライトテーマ'
    },
    {
      mode: 'dark',
      label: 'ダーク',
      icon: '🌙',
      description: 'ダークテーマ'
    },
    {
      mode: 'high-contrast',
      label: 'ハイコントラスト',
      icon: '🔳',
      description: 'ハイコントラストテーマ'
    }
  ];

  // 現在のテーマオプションを取得
  let currentOption = $derived(
    themeOptions.find(option => option.mode === themeStore.settings.mode) || themeOptions[0]
  );

  // サイズクラス
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  // アイコンサイズクラス
  const iconSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  // テーマ切り替えハンドラー
  async function handleThemeChange(mode: ThemeMode): Promise<void> {
    await themeStore.setThemeMode(mode);
  }

  // ドロップダウン表示状態
  let isDropdownOpen = $state(false);

  // ドロップダウン要素への参照
  let dropdownRef = $state<HTMLDivElement>();

  // 外側クリックでドロップダウンを閉じる
  function handleClickOutside(event: MouseEvent): void {
    if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
      isDropdownOpen = false;
    }
  }

  // ESCキーでドロップダウンを閉じる
  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      isDropdownOpen = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} onkeydown={handleKeydown} />

{#if variant === 'compact'}
  <!-- コンパクトボタン（アイコンのみ） -->
  <button
    onclick={() => {
      // システム → ライト → ダーク → ハイコントラスト → システム の循環
      const currentIndex = themeOptions.findIndex(option => option.mode === themeStore.settings.mode);
      const nextIndex = (currentIndex + 1) % themeOptions.length;
      handleThemeChange(themeOptions[nextIndex].mode);
    }}
    class="inline-flex items-center justify-center rounded-lg border border-themed bg-card hover:bg-muted/20 text-themed transition-colors focus-themed disabled:opacity-50 {sizeClasses[size]}"
    disabled={themeStore.isLoading}
    title={`現在: ${currentOption.label} (クリックで切り替え)`}
    aria-label="テーマを切り替え"
  >
    <span class="{iconSizeClasses[size]}" aria-hidden="true">
      {currentOption.icon}
    </span>
  </button>

{:else if variant === 'menu'}
  <!-- ドロップダウンメニュー -->
  <div class="relative" bind:this={dropdownRef}>
    <button
      onclick={() => isDropdownOpen = !isDropdownOpen}
      class="inline-flex items-center justify-between w-full rounded-lg border border-themed bg-card hover:bg-muted/20 text-themed transition-colors focus-themed disabled:opacity-50 {sizeClasses[size]}"
      disabled={themeStore.isLoading}
      aria-haspopup="true"
      aria-expanded={isDropdownOpen}
    >
      <div class="flex items-center gap-2">
        <span class="{iconSizeClasses[size]}" aria-hidden="true">
          {currentOption.icon}
        </span>
        {#if showLabel}
          <span>{currentOption.label}</span>
        {/if}
      </div>
      <svg class="w-4 h-4 transition-transform {isDropdownOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    </button>

    {#if isDropdownOpen}
      <div class="absolute right-0 mt-2 w-56 bg-card border border-themed rounded-lg shadow-lg z-50">
        <div class="py-1">
          {#each themeOptions as option}
            <button
              onclick={() => {
                handleThemeChange(option.mode);
                isDropdownOpen = false;
              }}
              class="w-full text-left px-4 py-2 text-sm text-themed hover:bg-muted/20 flex items-center gap-3 {themeStore.settings.mode === option.mode ? 'bg-primary/10 text-primary' : ''}"
            >
              <span class="text-base" aria-hidden="true">{option.icon}</span>
              <div>
                <div class="font-medium">{option.label}</div>
                <div class="text-xs text-label">{option.description}</div>
              </div>
              {#if themeStore.settings.mode === option.mode}
                <svg class="w-4 h-4 ml-auto text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>

{:else}
  <!-- 通常ボタン -->
  <button
    onclick={() => {
      // システム → ライト → ダーク → ハイコントラスト → システム の循環
      const currentIndex = themeOptions.findIndex(option => option.mode === themeStore.settings.mode);
      const nextIndex = (currentIndex + 1) % themeOptions.length;
      handleThemeChange(themeOptions[nextIndex].mode);
    }}
    class="inline-flex items-center gap-2 rounded-lg border border-themed bg-card hover:bg-muted/20 text-themed transition-colors focus-themed disabled:opacity-50 {sizeClasses[size]}"
    disabled={themeStore.isLoading}
    title={currentOption.description}
  >
    <span class="{iconSizeClasses[size]}" aria-hidden="true">
      {currentOption.icon}
    </span>
    {#if showLabel}
      <span>{currentOption.label}</span>
    {/if}
    {#if themeStore.isLoading}
      <div class="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full" aria-hidden="true"></div>
    {/if}
  </button>
{/if}

<!-- エラー表示 -->
{#if themeStore.error}
  <div class="mt-2 text-xs text-error">
    {themeStore.error}
  </div>
{/if}