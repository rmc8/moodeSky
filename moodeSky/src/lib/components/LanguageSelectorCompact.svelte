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

<div class="language-selector-compact" bind:this={dropdownRef}>
  <!-- トリガーボタン -->
  <button
    type="button"
    onclick={toggleDropdown}
    disabled={i18nStore.isLoading}
    class="trigger-button"
    aria-label={t('language.current')}
    title={`${t('language.current')}: ${currentLanguageInfo?.nativeName}`}
  >
    <Icon 
      icon={ICONS.TRANSLATE}
      size="lg"
      color="themed"
      ariaLabel={t('misc.languageSelection')}
    />
    <span class="current-language">{currentLanguageInfo?.code.toUpperCase()}</span>
  </button>

  <!-- ドロップダウンメニュー -->
  {#if isOpen}
    <div class="dropdown-menu" role="menu">
      <!-- 言語リスト -->
      {#each Object.entries(SUPPORTED_LANGUAGES) as [code, info]}
        <button
          type="button"
          role="menuitem"
          onclick={() => handleLanguageChange(code as SupportedLanguage)}
          disabled={i18nStore.isLoading}
          class="language-option"
          class:active={code === i18nStore.currentLanguage}
        >
          <span class="language-code">{info.code.toUpperCase()}</span>
          <span class="language-name">{info.nativeName}</span>
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
      <div class="divider"></div>

      <!-- システム言語に戻すボタン -->
      <button
        type="button"
        role="menuitem"
        onclick={resetToSystemLanguage}
        disabled={i18nStore.isLoading || i18nStore.currentLanguage === i18nStore.systemLanguage}
        class="system-language-button"
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
  .language-selector-compact {
    position: relative;
    display: inline-block;
  }

  .trigger-button {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem;
    background-color: transparent;
    border: 2px solid transparent;
    border-radius: 0.5rem;
    color: var(--color-foreground);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.75rem;
    font-weight: 600;
    min-width: 2.5rem;
  }

  .trigger-button:hover {
    background-color: var(--color-muted);
    border-color: var(--color-border);
  }

  .trigger-button:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(var(--primary) / 0.2);
  }

  .trigger-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .current-language {
    font-size: 0.625rem;
    line-height: 1;
    color: var(--color-foreground);
    opacity: 0.8;
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 0.25rem;
    background-color: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    box-shadow: 0 4px 12px rgba(var(--foreground) / 0.1);
    z-index: 50;
    min-width: 12rem;
    padding: 0.25rem;
    animation: dropdown-appear 0.15s ease-out;
  }

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

  .language-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    background-color: transparent;
    border: none;
    border-radius: 0.25rem;
    color: var(--color-foreground);
    cursor: pointer;
    transition: background-color 0.2s ease;
    text-align: left;
    font-size: 0.875rem;
  }

  .language-option:hover {
    background-color: var(--color-muted);
  }

  .language-option:focus {
    outline: none;
    background-color: var(--color-primary);
    color: var(--color-background);
  }

  .language-option.active {
    background-color: rgba(var(--primary) / 0.1);
    color: var(--color-primary);
  }

  .language-option:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .language-code {
    font-weight: 600;
    font-size: 0.75rem;
    color: var(--color-foreground);
    opacity: 0.7;
    min-width: 2rem;
  }

  .language-name {
    flex: 1;
  }

  .divider {
    height: 1px;
    background-color: var(--color-border);
    margin: 0.25rem 0;
  }

  .system-language-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    background-color: transparent;
    border: none;
    border-radius: 0.25rem;
    color: var(--color-foreground);
    cursor: pointer;
    transition: background-color 0.2s ease;
    text-align: left;
    font-size: 0.875rem;
  }

  .system-language-button:hover:not(:disabled) {
    background-color: var(--color-muted);
  }

  .system-language-button:focus {
    outline: none;
    background-color: var(--color-primary);
    color: var(--color-background);
  }

  .system-language-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ハイコントラストテーマ対応 */
  :global(.high-contrast) .trigger-button {
    border-color: var(--color-foreground);
  }

  :global(.high-contrast) .trigger-button:hover {
    background-color: var(--color-foreground);
    color: var(--color-background);
  }

  :global(.high-contrast) .dropdown-menu {
    border-color: var(--color-foreground);
    border-width: 2px;
  }
</style>