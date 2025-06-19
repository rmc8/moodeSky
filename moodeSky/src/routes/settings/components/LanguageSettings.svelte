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
  import { language, common, misc } from '$lib/i18n/paraglide/messages.js';

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
      description: 'プライマリ言語・最高品質の翻訳',
      flag: '🇯🇵'
    },
    {
      code: 'en',
      info: SUPPORTED_LANGUAGES.en,
      description: 'グローバル標準・フォールバック言語',
      flag: '🇺🇸'
    },
    {
      code: 'pt-BR',
      info: SUPPORTED_LANGUAGES['pt-BR'],
      description: 'ブラジル・南米市場向け',
      flag: '🇧🇷'
    },
    {
      code: 'de',
      info: SUPPORTED_LANGUAGES.de,
      description: 'ドイツ語・ヨーロッパ市場向け',
      flag: '🇩🇪'
    },
    {
      code: 'ko',
      info: SUPPORTED_LANGUAGES.ko,
      description: '韓国語・東アジア市場向け',
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
      successMessage = `言語を「${selectedLanguage?.info.nativeName}」に変更しました`;
      setTimeout(() => successMessage = '', 3000);
    } catch (error) {
      console.error('言語変更エラー:', error);
      errorMessage = '言語の変更に失敗しました';
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
      successMessage = `システム言語「${SUPPORTED_LANGUAGES[i18nStore.systemLanguage]?.nativeName}」に戻しました`;
      setTimeout(() => successMessage = '', 3000);
    } catch (error) {
      console.error('システム言語リセットエラー:', error);
      errorMessage = 'システム言語への復帰に失敗しました';
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
      successMessage = 'システム言語を再検出しました';
      setTimeout(() => successMessage = '', 3000);
    } catch (error) {
      console.error('言語再検出エラー:', error);
      errorMessage = '言語再検出に失敗しました';
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
          source: '保存された設定',
          icon: ICONS.SETTINGS,
          color: 'primary' as const
        };
      case 'os':
        return {
          source: 'システム設定',
          icon: ICONS.COMPUTER,
          color: 'themed' as const
        };
      case 'browser':
        return {
          source: 'ブラウザ設定',
          icon: ICONS.PUBLIC,
          color: 'themed' as const
        };
      case 'fallback':
        return {
          source: 'フォールバック',
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
      言語・多言語化設定
    </h2>
    <p class="text-themed opacity-70">
      アプリケーションの表示言語とローカライゼーション設定
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
        aria-label="エラーメッセージを閉じる"
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
        表示言語
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
                    <span class="text-xs text-primary font-medium">選択中</span>
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
              方向: {option.info.isRTL ? 'RTL' : 'LTR'} | 地域: {option.info.region}
            </div>
          </button>
        {/each}
      </div>
    </div>

    <!-- システム連携 -->
    <div class="bg-card rounded-xl p-6 border border-themed">
      <h3 class="text-themed text-lg font-semibold mb-4 flex items-center gap-2">
        <Icon icon={ICONS.COMPUTER} size="md" color="primary" />
        システム連携
      </h3>
      
      <div class="space-y-4">
        <!-- システム言語に戻すボタン -->
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <p class="text-themed mb-2">
              システム言語を使用
            </p>
            <p class="text-themed opacity-60 text-sm">
              OS設定の言語「{SUPPORTED_LANGUAGES[i18nStore.systemLanguage]?.nativeName}」を使用
            </p>
          </div>
          
          <button
            class="button-primary"
            disabled={isLoading || i18nStore.currentLanguage === i18nStore.systemLanguage}
            onclick={handleResetToSystemLanguage}
          >
            <Icon icon={ICONS.COMPUTER} size="sm" color="themed" />
            システム言語に戻す
          </button>
        </div>

        <!-- 言語再検出ボタン -->
        <div class="flex items-center justify-between pt-4 border-t border-themed/20">
          <div class="flex-1">
            <p class="text-themed mb-2">
              システム言語を再検出
            </p>
            <p class="text-themed opacity-60 text-sm">
              OS設定が変更された場合に言語を再取得
            </p>
          </div>
          
          <button
            class="px-4 py-2 border border-themed rounded-lg text-themed hover:bg-muted/20 transition-colors"
            disabled={isLoading}
            onclick={handleRedetectLanguage}
          >
            <Icon icon={ICONS.REFRESH} size="sm" color="themed" />
            再検出
          </button>
        </div>
      </div>
    </div>

    <!-- 現在の言語情報 -->
    <div class="bg-muted/20 rounded-xl p-6 border border-themed/20">
      <h3 class="text-themed text-lg font-semibold mb-4 flex items-center gap-2">
        <Icon icon={ICONS.INFO} size="md" color="themed" />
        現在の言語情報
      </h3>
      
      <div class="space-y-3 text-sm">
        <div class="flex justify-between items-center">
          <span class="text-themed opacity-70">現在の言語:</span>
          <span class="text-themed font-medium flex items-center gap-2">
            {languageOptions.find(opt => opt.code === i18nStore.currentLanguage)?.flag}
            {SUPPORTED_LANGUAGES[i18nStore.currentLanguage]?.nativeName}
            <span class="text-xs opacity-70">({i18nStore.currentLanguage.toUpperCase()})</span>
          </span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-themed opacity-70">システム言語:</span>
          <span class="text-themed font-medium flex items-center gap-2">
            {languageOptions.find(opt => opt.code === i18nStore.systemLanguage)?.flag}
            {SUPPORTED_LANGUAGES[i18nStore.systemLanguage]?.nativeName}
            <span class="text-xs opacity-70">({i18nStore.systemLanguage.toUpperCase()})</span>
          </span>
        </div>
        {#if detectionInfo()}
          <div class="flex justify-between items-center">
            <span class="text-themed opacity-70">検出方法:</span>
            <span class="text-themed font-medium flex items-center gap-2">
              <Icon icon={detectionInfo()?.icon || ICONS.INFO} size="sm" color={detectionInfo()?.color || 'themed'} />
              {detectionInfo()?.source || '不明'}
            </span>
          </div>
        {/if}
        <div class="flex justify-between items-center">
          <span class="text-themed opacity-70">初期化状態:</span>
          <span class="text-themed font-medium">
            {i18nStore.isInitialized ? '完了' : '初期化中...'}
          </span>
        </div>
      </div>
    </div>

    <!-- 多言語化機能 -->
    <div class="bg-card rounded-xl p-6 border border-themed">
      <h3 class="text-themed text-lg font-semibold mb-4 flex items-center gap-2">
        <Icon icon={ICONS.TRANSLATE} size="md" color="primary" />
        多言語化機能
      </h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- 実装済み機能 -->
        <div class="space-y-3">
          <h4 class="text-themed font-medium flex items-center gap-2">
            <Icon icon={ICONS.CHECK} size="sm" color="success" />
            実装済み機能
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
            対応言語（{languageOptions.length}言語）
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
        <span class="text-themed">言語設定を変更中...</span>
      </div>
    </div>
  {/if}
</div>