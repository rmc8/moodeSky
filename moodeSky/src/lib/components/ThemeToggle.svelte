<script lang="ts">
  import { themeStore } from '../stores/theme.svelte.js';
  import Icon from './Icon.svelte';
  import { ICONS } from '../types/icon.js';
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

  // テーマオプション定義 (Material Icons使用)
  const themeOptions: Array<{
    mode: ThemeMode;
    label: string;
    icon: string;
    description: string;
  }> = [
    {
      mode: 'system',
      label: 'システム',
      icon: ICONS.COMPUTER,
      description: 'システム設定に従います'
    },
    {
      mode: 'light',
      label: 'ライト',
      icon: ICONS.LIGHT_MODE,
      description: 'ライトテーマ'
    },
    {
      mode: 'dark',
      label: 'ダーク',
      icon: ICONS.DARK_MODE,
      description: 'ダークテーマ'
    },
    {
      mode: 'high-contrast',
      label: 'ハイコントラスト',
      icon: ICONS.CONTRAST,
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
    class="group inline-flex items-center justify-center rounded-lg border border-themed bg-card hover:bg-muted/20 text-themed transition-colors focus-themed disabled:opacity-50 high-contrast:hover:text-black high-contrast:focus:text-black {sizeClasses[size]}"
    disabled={themeStore.isLoading}
    title={`現在: ${currentOption.label} (クリックで切り替え)`}
    aria-label="テーマを切り替え"
  >
    <Icon 
      icon={currentOption.icon}
      size={size}
      color="themed"
      decorative
      class="high-contrast:group-hover:![color:rgb(0_0_0)] high-contrast:group-focus:![color:rgb(0_0_0)]"
    />
  </button>

{:else if variant === 'menu'}
  <!-- ドロップダウンメニュー -->
  <div class="relative" bind:this={dropdownRef}>
    <button
      onclick={() => isDropdownOpen = !isDropdownOpen}
      class="group inline-flex items-center justify-between w-full rounded-lg border border-themed bg-card hover:bg-muted/20 text-themed transition-colors focus-themed disabled:opacity-50 high-contrast:hover:text-black high-contrast:focus:text-black {sizeClasses[size]}"
      disabled={themeStore.isLoading}
      aria-haspopup="true"
      aria-expanded={isDropdownOpen}
    >
      <div class="flex items-center gap-2">
        <Icon 
          icon={currentOption.icon}
          size={size}
          color="themed"
          decorative
          class="high-contrast:group-hover:![color:rgb(0_0_0)] high-contrast:group-focus:![color:rgb(0_0_0)]"
        />
        {#if showLabel}
          <span>{currentOption.label}</span>
        {/if}
      </div>
      <Icon 
        icon={ICONS.EXPAND_MORE}
        size="sm"
        color="themed"
        class="transition-transform {isDropdownOpen ? 'rotate-180' : ''} high-contrast:group-hover:![color:rgb(0_0_0)] high-contrast:group-focus:![color:rgb(0_0_0)]"
        decorative
      />
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
              class="group w-full text-left px-4 py-2 text-sm text-themed hover:bg-muted/20 flex items-center gap-3 high-contrast:hover:text-black high-contrast:focus:text-black {themeStore.settings.mode === option.mode ? 'bg-primary/10 text-primary' : ''}"
            >
              <Icon 
                icon={option.icon}
                size="md"
                color={themeStore.settings.mode === option.mode ? 'primary' : 'themed'}
                decorative
                class="high-contrast:group-hover:![color:rgb(0_0_0)] high-contrast:group-focus:![color:rgb(0_0_0)]"
              />
              <div>
                <div class="font-medium">{option.label}</div>
                <div class="text-xs text-label">{option.description}</div>
              </div>
              {#if themeStore.settings.mode === option.mode}
                <Icon 
                  icon={ICONS.CHECK}
                  size="sm"
                  color="primary"
                  class="ml-auto high-contrast:group-hover:![color:rgb(0_0_0)] high-contrast:group-focus:![color:rgb(0_0_0)]"
                  ariaLabel="選択中"
                />
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
    class="group inline-flex items-center gap-2 rounded-lg border border-themed bg-card hover:bg-muted/20 text-themed transition-colors focus-themed disabled:opacity-50 high-contrast:hover:text-black high-contrast:focus:text-black {sizeClasses[size]}"
    disabled={themeStore.isLoading}
    title={currentOption.description}
  >
    <Icon 
      icon={currentOption.icon}
      size={size}
      color="themed"
      decorative
      class="high-contrast:group-hover:![color:rgb(0_0_0)] high-contrast:group-focus:![color:rgb(0_0_0)]"
    />
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