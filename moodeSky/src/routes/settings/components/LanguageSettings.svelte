<!--
  LanguageSettings.svelte
  言語・多言語化設定コンポーネント
  
  既存のi18nシステム (i18n.svelte.ts) との完全統合
  Paraglide-JS v2 + Tauri OS Plugin対応
-->
<script lang="ts">
  import { i18nStore, type SupportedLanguage } from '$lib/stores/i18n.svelte.js';
  import { SUPPORTED_LANGUAGES } from '$lib/services/i18nService.js';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import * as m from '../../../paraglide/messages.js';

  // ===================================================================
  // 状態管理
  // ===================================================================

  let isLoading = $state(false);
  let successMessage = $state('');
  let errorMessage = $state('');

  // 言語オプション定義（SUPPORTED_LANGUAGESベース）
  const languageOptions: Array<{
    code: SupportedLanguage;
    info: typeof SUPPORTED_LANGUAGES[SupportedLanguage];
    description: string;
    flag: string;
  }> = [
    {
      code: 'ja',
      info: SUPPORTED_LANGUAGES.ja,
      description: m['settings.language.primaryLanguage'](),
      flag: '🇯🇵'
    },
    {
      code: 'en',
      info: SUPPORTED_LANGUAGES.en,
      description: m['settings.language.globalStandard'](),
      flag: '🇺🇸'
    },
    {
      code: 'pt-BR',
      info: SUPPORTED_LANGUAGES['pt-BR'],
      description: m['settings.language.brazilMarket'](),
      flag: '🇧🇷'
    },
    {
      code: 'de',
      info: SUPPORTED_LANGUAGES.de,
      description: m['settings.language.europeanMarket'](),
      flag: '🇩🇪'
    },
    {
      code: 'ko',
      info: SUPPORTED_LANGUAGES.ko,
      description: m['settings.language.eastAsianMarket'](),
      flag: '🇰🇷'
    }
  ];

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  /**
   * 言語変更
   */
  async function handleLanguageChange(code: SupportedLanguage) {
    if (code === i18nStore.currentLanguage) return;

    isLoading = true;
    errorMessage = '';
    successMessage = '';

    try {
      await i18nStore.setLanguage(code);
      const selectedLanguage = languageOptions.find(opt => opt.code === code);
      successMessage = m['settings.language.changedTo']({ language: selectedLanguage?.info.nativeName || code });
      setTimeout(() => successMessage = '', 3000);
    } catch (error) {
      console.error('言語変更エラー:', error);
      errorMessage = m['settings.language.changeError']();
    } finally {
      isLoading = false;
    }
  }

  /**
   * システム言語に戻す
   */
  async function handleResetToSystemLanguage() {
    if (i18nStore.currentLanguage === i18nStore.systemLanguage) return;

    isLoading = true;
    errorMessage = '';

    try {
      await i18nStore.resetToSystemLanguage();
      successMessage = m['settings.language.resetToSystemSuccess']({ language: SUPPORTED_LANGUAGES[i18nStore.systemLanguage]?.nativeName || i18nStore.systemLanguage });
      setTimeout(() => successMessage = '', 3000);
    } catch (error) {
      console.error('システム言語リセットエラー:', error);
      errorMessage = m['settings.language.resetError']();
    } finally {
      isLoading = false;
    }
  }

  /**
   * 言語再検出
   */
  async function handleRedetectLanguage() {
    isLoading = true;
    errorMessage = '';

    try {
      await i18nStore.redetectLanguage();
      successMessage = m['settings.language.redetectedSuccess']();
      setTimeout(() => successMessage = '', 3000);
    } catch (error) {
      console.error('言語再検出エラー:', error);
      errorMessage = m['settings.language.redetectError']();
    } finally {
      isLoading = false;
    }
  }

  /**
   * メッセージをクリア
   */
  function clearMessages() {
    successMessage = '';
    errorMessage = '';
  }

  // 自動的にメッセージをクリア
  let clearTimer: ReturnType<typeof setTimeout>;
  $effect(() => {
    if (successMessage || errorMessage) {
      clearTimer = setTimeout(clearMessages, 5000);
    }
    return () => clearTimeout(clearTimer);
  });

  // 検出情報を取得
  const detectionInfo = $derived(() => {
    const result = i18nStore.detectionResult;
    if (!result) return null;

    switch (result.source) {
      case 'stored':
        return {
          source: m['settings.language.detectionSources.stored'](),
          icon: ICONS.SETTINGS,
          color: 'primary' as const
        };
      case 'os':
        return {
          source: m['settings.language.detectionSources.os'](),
          icon: ICONS.COMPUTER,
          color: 'themed' as const
        };
      case 'browser':
        return {
          source: m['settings.language.detectionSources.browser'](),
          icon: ICONS.PUBLIC,
          color: 'themed' as const
        };
      case 'fallback':
        return {
          source: m['settings.language.detectionSources.fallback'](),
          icon: ICONS.WARNING,
          color: 'warning' as const
        };
      default:
        return null;
    }
  });
</script>

<!-- 言語設定セクション -->
<div class="max-w-4xl mx-auto">
  <!-- セクションヘッダー -->
  <div class="mb-8">
    <h2 class="text-themed text-2xl font-bold mb-2 flex items-center gap-3">
      <span class="text-3xl">🌍</span>
      {m['settings.language.title']()}
    </h2>
    <p class="text-themed opacity-70">
      {m['settings.language.description']()}
    </p>
  </div>

  <!-- メッセージ表示 -->
  {#if successMessage}
    <div class="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg flex items-center gap-3">
      <Icon icon={ICONS.CHECK} size="md" color="success" />
      <span class="text-success font-medium">{successMessage}</span>
    </div>
  {/if}

  {#if errorMessage}
    <div class="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-3">
      <Icon icon={ICONS.ERROR} size="md" color="error" />
      <span class="text-error font-medium">{errorMessage}</span>
      <button 
        class="ml-auto text-error hover:text-error/80 transition-colors"
        onclick={clearMessages}
        aria-label={m['settings.closeMessage']()}
      >
        <Icon icon={ICONS.CLOSE} size="sm" />
      </button>
    </div>
  {/if}

  <!-- 設定項目 -->
  <div class="space-y-8">
    <!-- 言語選択 -->
    <div class="bg-card rounded-xl p-6 border border-themed">
      <h3 class="text-themed text-lg font-semibold mb-4 flex items-center gap-2">
        <Icon icon={ICONS.LANGUAGE} size="md" color="primary" />
        {m['settings.language.displayLanguage']()}
      </h3>
      
      <!-- 言語選択グリッド -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {#each languageOptions as option}
          <button
            class="group p-4 rounded-lg border-2 transition-all duration-200 text-left hover:scale-[1.02] focus:scale-[1.02]"
            class:border-primary={option.code === i18nStore.currentLanguage}
            class:bg-primary={option.code === i18nStore.currentLanguage}
            class:border-themed={option.code !== i18nStore.currentLanguage}
            class:hover:border-primary={option.code !== i18nStore.currentLanguage}
            style={option.code === i18nStore.currentLanguage ? 'background: rgb(var(--primary) / 0.1);' : ''}
            disabled={isLoading}
            onclick={() => handleLanguageChange(option.code)}
          >
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-3">
                <span class="text-2xl">{option.flag}</span>
                <div>
                  <h4 class="font-semibold text-themed flex items-center gap-2">
                    {option.info.nativeName}
                    <span class="text-xs opacity-70">{option.info.code.toUpperCase()}</span>
                  </h4>
                  {#if option.code === i18nStore.currentLanguage}
                    <span class="text-xs text-primary font-medium">{m['settings.theme.selected']()}</span>
                  {/if}
                </div>
              </div>
              {#if option.code === i18nStore.currentLanguage}
                <Icon icon={ICONS.CHECK} size="md" color="primary" />
              {/if}
            </div>
            
            <p class="text-sm text-themed opacity-70 mb-2">{option.description}</p>
            
            <!-- 言語情報 -->
            <div class="text-xs text-themed opacity-60">
              {m['settings.language.direction']()}: {option.info.isRTL ? 'RTL' : 'LTR'} | {m['settings.language.region']()}: {option.info.region}
            </div>
          </button>
        {/each}
      </div>
    </div>

    <!-- システム連携 -->
    <div class="bg-card rounded-xl p-6 border border-themed">
      <h3 class="text-themed text-lg font-semibold mb-4 flex items-center gap-2">
        <Icon icon={ICONS.COMPUTER} size="md" color="primary" />
        {m['settings.language.systemIntegration']()}
      </h3>
      
      <div class="space-y-4">
        <!-- システム言語に戻すボタン -->
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <p class="text-themed mb-2">
              {m['settings.language.useSystemLanguage']()}
            </p>
            <p class="text-themed opacity-60 text-sm">
              {m['settings.language.useSystemLanguageDescription']({ language: SUPPORTED_LANGUAGES[i18nStore.systemLanguage]?.nativeName || i18nStore.systemLanguage })}
            </p>
          </div>
          
          <button
            class="button-primary"
            disabled={isLoading || i18nStore.currentLanguage === i18nStore.systemLanguage}
            onclick={handleResetToSystemLanguage}
          >
            <Icon icon={ICONS.COMPUTER} size="sm" color="themed" />
            {m['settings.language.resetToSystem']()}
          </button>
        </div>

        <!-- 言語再検出ボタン -->
        <div class="flex items-center justify-between pt-4 border-t border-themed/20">
          <div class="flex-1">
            <p class="text-themed mb-2">
              {m['settings.language.redetectLanguage']()}
            </p>
            <p class="text-themed opacity-60 text-sm">
              {m['settings.language.redetectDescription']()}
            </p>
          </div>
          
          <button
            class="px-4 py-2 border border-themed rounded-lg text-themed hover:bg-muted/20 transition-colors"
            disabled={isLoading}
            onclick={handleRedetectLanguage}
          >
            <Icon icon={ICONS.REFRESH} size="sm" color="themed" />
            {m['settings.language.redetect']()}
          </button>
        </div>
      </div>
    </div>

    <!-- 現在の言語情報 -->
    <div class="bg-muted/20 rounded-xl p-6 border border-themed/20">
      <h3 class="text-themed text-lg font-semibold mb-4 flex items-center gap-2">
        <Icon icon={ICONS.INFO} size="md" color="themed" />
        {m['settings.language.currentInfo']()}
      </h3>
      
      <div class="space-y-3 text-sm">
        <div class="flex justify-between items-center">
          <span class="text-themed opacity-70">{m['settings.language.currentLanguage']()}:</span>
          <span class="text-themed font-medium flex items-center gap-2">
            {languageOptions.find(opt => opt.code === i18nStore.currentLanguage)?.flag}
            {SUPPORTED_LANGUAGES[i18nStore.currentLanguage]?.nativeName}
            <span class="text-xs opacity-70">({i18nStore.currentLanguage.toUpperCase()})</span>
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-themed opacity-70">{m['settings.language.systemLanguage']()}:</span>
          <span class="text-themed font-medium flex items-center gap-2">
            {languageOptions.find(opt => opt.code === i18nStore.systemLanguage)?.flag}
            {SUPPORTED_LANGUAGES[i18nStore.systemLanguage]?.nativeName}
            <span class="text-xs opacity-70">({i18nStore.systemLanguage.toUpperCase()})</span>
          </span>
        </div>
        {#if detectionInfo()}
          <div class="flex justify-between items-center">
            <span class="text-themed opacity-70">{m['settings.language.detectionMethod']()}:</span>
            <span class="text-themed font-medium flex items-center gap-2">
              <Icon icon={detectionInfo()?.icon || ICONS.INFO} size="sm" color={detectionInfo()?.color || 'themed'} />
              {detectionInfo()?.source || m['settings.language.unknown']()}
            </span>
          </div>
        {/if}
        <div class="flex justify-between items-center">
          <span class="text-themed opacity-70">{m['settings.language.initializationStatus']()}:</span>
          <span class="text-themed font-medium">
            {i18nStore.isInitialized ? m['settings.language.completed']() : m['settings.language.initializing']()}
          </span>
        </div>
      </div>
    </div>

    <!-- 多言語化機能 -->
    <div class="bg-card rounded-xl p-6 border border-themed">
      <h3 class="text-themed text-lg font-semibold mb-4 flex items-center gap-2">
        <Icon icon={ICONS.TRANSLATE} size="md" color="primary" />
        {m['settings.language.features']()}
      </h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- 実装済み機能 -->
        <div class="space-y-3">
          <h4 class="text-themed font-medium flex items-center gap-2">
            <Icon icon={ICONS.CHECK} size="sm" color="success" />
            {m['settings.language.implementedFeatures']()}
          </h4>
          <ul class="space-y-2 text-sm text-themed opacity-80">
            <li>• Paraglide-JS v2 型安全翻訳</li>
            <li>• Tauri OS Plugin言語検出</li>
            <li>• 多層言語検出システム</li>
            <li>• 設定の永続化（Tauri Store）</li>
            <li>• リアクティブ言語切り替え</li>
          </ul>
        </div>

        <!-- 対応言語 -->
        <div class="space-y-3">
          <h4 class="text-themed font-medium flex items-center gap-2">
            <Icon icon={ICONS.PUBLIC} size="sm" color="primary" />
            {m['settings.language.supportedLanguages']({ count: languageOptions.length.toString() })}
          </h4>
          <ul class="space-y-2 text-sm text-themed opacity-80">
            {#each languageOptions as option}
              <li class="flex items-center gap-2">
                <span>{option.flag}</span>
                <span>{option.info.nativeName}</span>
                <span class="text-xs opacity-60">({option.info.code.toUpperCase()})</span>
              </li>
            {/each}
          </ul>
        </div>
      </div>
    </div>
  </div>

  <!-- ローディング状態 -->
  {#if isLoading}
    <div class="fixed inset-0 bg-themed/50 flex items-center justify-center z-50">
      <div class="bg-card rounded-lg p-6 shadow-xl flex items-center gap-3">
        <div class="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <span class="text-themed">{m['settings.changingSettings']()}</span>
      </div>
    </div>
  {/if}
</div>