<!--
  コンパクト言語切り替えセレクター
  ログイン画面などの限られたスペース用
-->
<script lang="ts">
  import { i18nStore, type SupportedLanguage } from '../stores/i18n.svelte.js';
  import { SUPPORTED_LANGUAGES } from '../services/i18nService.js';
  import Icon from './Icon.svelte';
  import { ICONS } from '../types/icon.js';
  import { useTranslation } from '../utils/reactiveTranslation.svelte.js';

  // リアクティブ翻訳システム
  const { t } = useTranslation();

  let isOpen = $state(false);
  let dropdownRef: HTMLDivElement | undefined;

  // 言語選択の処理
  async function handleLanguageChange(language: SupportedLanguage) {
    if (language && language !== i18nStore.currentLanguage) {
      await i18nStore.setLanguage(language);
    }
    isOpen = false;
  }

  // システム言語に戻す
  async function resetToSystemLanguage() {
    await i18nStore.resetToSystemLanguage();
    isOpen = false;
  }

  // 外部クリックでドロップダウンを閉じる
  function handleClickOutside(event: MouseEvent) {
    if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
      isOpen = false;
    }
  }

  // ドロップダウンの表示/非表示切り替え
  function toggleDropdown() {
    isOpen = !isOpen;
    if (isOpen) {
      // ドロップダウンが開かれたときに外部クリック監視を開始
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
    } else {
      // ドロップダウンが閉じられたときに外部クリック監視を終了
      document.removeEventListener('click', handleClickOutside);
    }
  }

  // コンポーネント破棄時にイベントリスナーをクリーンアップ
  import { onDestroy } from 'svelte';
  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside);
  });

  // 現在の言語情報を取得
  const currentLanguageInfo = $derived(SUPPORTED_LANGUAGES[i18nStore.currentLanguage]);
</script>

<div class="relative inline-block" bind:this={dropdownRef}>
  <!-- トリガーボタン -->
  <button
    type="button"
    onclick={toggleDropdown}
    disabled={i18nStore.isLoading}
    class="flex items-center gap-1 p-2 bg-transparent border-2 border-transparent rounded-lg text-themed cursor-pointer transition-all duration-200 text-xs font-semibold min-w-10 hover:bg-muted hover:border-themed focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(var(--primary)/0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
    aria-label={t('language.current')}
    title={`${t('language.current')}: ${currentLanguageInfo?.nativeName}`}
  >
    <Icon 
      icon={ICONS.TRANSLATE}
      size="lg"
      color="themed"
      ariaLabel={t('misc.languageSelection')}
    />
    <span class="text-2xs leading-none text-themed opacity-80">{currentLanguageInfo?.code.toUpperCase()}</span>
  </button>

  <!-- ドロップダウンメニュー -->
  {#if isOpen}
    <div class="absolute top-full left-0 mt-1 bg-card border border-themed rounded-lg shadow-[0_4px_12px_rgba(var(--foreground)/0.1)] z-50 min-w-48 p-1 animate-[dropdown-appear_0.15s_ease-out]" role="menu">
      <!-- 言語リスト -->
      {#each Object.entries(SUPPORTED_LANGUAGES) as [code, info]}
        <button
          type="button"
          role="menuitem"
          onclick={() => handleLanguageChange(code as SupportedLanguage)}
          disabled={i18nStore.isLoading}
          class="flex items-center gap-2 w-full p-2 px-3 bg-transparent border-none rounded text-themed cursor-pointer transition-colors duration-200 text-left text-sm hover:bg-muted focus:outline-none focus:bg-primary focus:text-[var(--color-background)] disabled:opacity-50 disabled:cursor-not-allowed"
          class:bg-primary-100={code === i18nStore.currentLanguage} class:text-primary={code === i18nStore.currentLanguage}
        >
          <span class="font-semibold text-xs text-themed opacity-70 min-w-8">{info.code.toUpperCase()}</span>
          <span class="flex-1">{info.nativeName}</span>
          {#if code === i18nStore.currentLanguage}
            <Icon 
              icon={ICONS.CHECK}
              size="sm"
              color="primary"
              ariaLabel={t('common.active')}
            />
          {/if}
        </button>
      {/each}

      <!-- 区切り線 -->
      <div class="h-px bg-themed my-1"></div>

      <!-- システム言語に戻すボタン -->
      <button
        type="button"
        role="menuitem"
        onclick={resetToSystemLanguage}
        disabled={i18nStore.isLoading || i18nStore.currentLanguage === i18nStore.systemLanguage}
        class="flex items-center gap-2 w-full p-2 px-3 bg-transparent border-none rounded text-themed cursor-pointer transition-colors duration-200 text-left text-sm hover:bg-muted hover:disabled:bg-transparent focus:outline-none focus:bg-primary focus:text-[var(--color-background)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Icon 
          icon={ICONS.COMPUTER}
          size="sm"
          color="themed"
          ariaLabel={t('language.system')}
        />
        <span>{t('language.system')}</span>
      </button>
    </div>
  {/if}
</div>

<style>
  /* ドロップダウンアニメーション */
  @keyframes dropdown-appear {
    from {
      opacity: 0;
      transform: translateY(-0.25rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* text-2xs utility (TailwindCSS非標準) */
  .text-2xs {
    font-size: 0.625rem;
    line-height: 1;
  }

  /* ハイコントラストテーマ対応 */
  :global(.high-contrast) .relative button {
    border-color: var(--color-foreground) !important;
  }

  :global(.high-contrast) .relative button:hover {
    background-color: var(--color-foreground) !important;
    color: var(--color-background) !important;
  }

  :global(.high-contrast) .absolute.top-full {
    border-color: var(--color-foreground) !important;
    border-width: 2px !important;
  }
</style>