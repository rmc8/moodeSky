<!--
  Settings Page - 設定画面（基本実装）
  
  シンプルな空の設定ページ
  ナビゲーション統合とレスポンシブ対応済み
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Navigation from '$lib/components/Navigation.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { authService } from '$lib/services/authStore.js';
  import type { Account } from '$lib/types/auth.js';
  import { useTranslation } from '$lib/utils/reactiveTranslation.svelte.js';
  import { page } from '$app/stores';
  import { ICONS } from '$lib/types/icon.js';
  
  // 設定コンポーネント
  import ThemeSettings from './components/ThemeSettings.svelte';
  import LanguageSettings from './components/LanguageSettings.svelte';
  import AccountSettings from './components/AccountSettings.svelte';
  import ModerationSettings from './components/ModerationSettings.svelte';
  
  // ===================================================================
  // 状態管理
  // ===================================================================

  // リアクティブ翻訳システム
  const { t, currentLanguage } = useTranslation();

  let activeAccount = $state<Account | null>(null);
  let isLoading = $state(true);
  let errorMessage = $state('');
  let currentPath = $state($page.url.pathname);
  let activeSection = $state<'theme' | 'language' | 'account' | 'moderation' | 'notifications'>('theme');

  // 現在のパスを監視
  $effect(() => {
    currentPath = $page.url.pathname;
  });

  // ===================================================================
  // ライフサイクル・初期化
  // ===================================================================

  onMount(() => {
    (async () => {
      try {
        console.log('🛠️ [Settings] 設定画面初期化開始');
        
        // 認証状態確認
        const result = await authService.getActiveAccount();
        
        if (!result.success || !result.data) {
          console.log('🛠️ [Settings] 認証失敗 - ログインページにリダイレクト');
          errorMessage = t('settings.authRequired');
          await goto('/login');
          return;
        }
        
        activeAccount = result.data;
        console.log('🛠️ [Settings] 設定画面初期化完了');
        
      } catch (error) {
        console.error('🛠️ [Settings] 初期化エラー:', error);
        errorMessage = t('settings.initializationFailed');
      } finally {
        isLoading = false;
      }
    })();
  });

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  /**
   * 設定セクション切り替え
   */
  function switchSection(section: typeof activeSection) {
    activeSection = section;
  }
</script>

<!-- メインレイアウト -->
{#if isLoading}
  <!-- ローディング画面 -->
  <div class="min-h-screen flex items-center justify-center bg-themed">
    <div class="bg-card rounded-2xl shadow-xl p-12 w-full max-w-md text-center flex flex-col items-center gap-4">
      <div class="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      <p class="text-themed opacity-80">{t('settings.loading')}</p>
    </div>
  </div>
{:else if errorMessage}
  <!-- エラー画面 -->
  <div class="min-h-screen flex items-center justify-center bg-themed p-4">
    <div class="bg-error/10 border-2 border-error/20 rounded-2xl shadow-xl p-12 w-full max-w-md text-center">
      <h2 class="text-error text-2xl font-semibold mb-4">{t('common.error')}</h2>
      <p class="text-error mb-8">{errorMessage}</p>
      <button 
        class="bg-error hover:bg-error/80 text-[var(--color-background)] font-semibold py-3 px-6 rounded-lg transition-colors"
        onclick={() => location.reload()}
      >
        {t('common.retry')}
      </button>
    </div>
  </div>
{:else}
  <!-- メイン設定画面 -->
  <div class="h-screen bg-themed">
    <!-- ナビゲーション -->
    <Navigation {currentPath} />
    
    <!-- メインコンテンツエリア -->
    <main class="md:ml-64 h-full pb-14 md:pb-0 flex flex-col">
      <!-- ヘッダー -->
      <header class="bg-card border-b-2 border-themed shadow-sm p-4">
        <h1 class="text-themed text-2xl font-bold flex items-center gap-2">
          <Icon icon={ICONS.SETTINGS} size="lg" color="themed" />
          {t('settings.title')}
        </h1>
      </header>

      <!-- スクロール可能なメインコンテンツ -->
      <div class="flex-1 overflow-y-auto scrollbar-professional p-6">
        <!-- 設定ナビゲーション -->
        <div class="max-w-4xl mx-auto mb-6">
          <div class="flex flex-wrap gap-2 p-2 bg-card rounded-lg border border-themed">
            <button
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
              class:bg-primary={activeSection === 'theme'}
              class:text-[var(--color-background)]={activeSection === 'theme'}
              class:text-themed={activeSection !== 'theme'}
              class:hover:bg-muted={activeSection !== 'theme'}
              onclick={() => switchSection('theme')}
            >
              <Icon icon={ICONS.PALETTE} size="sm" class={activeSection === 'theme' ? '!text-[var(--color-background)]' : 'text-themed'} />
              {t('settings.tabs.theme')}
            </button>
            <button
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
              class:bg-primary={activeSection === 'language'}
              class:text-[var(--color-background)]={activeSection === 'language'}
              class:text-themed={activeSection !== 'language'}
              class:hover:bg-muted={activeSection !== 'language'}
              onclick={() => switchSection('language')}
            >
              <Icon icon={ICONS.LANGUAGE} size="sm" class={activeSection === 'language' ? '!text-[var(--color-background)]' : 'text-themed'} />
              {t('settings.tabs.language')}
            </button>
            <button
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
              class:bg-primary={activeSection === 'account'}
              class:text-[var(--color-background)]={activeSection === 'account'}
              class:text-themed={activeSection !== 'account'}
              class:hover:bg-muted={activeSection !== 'account'}
              onclick={() => switchSection('account')}
            >
              <Icon icon={ICONS.PERSON} size="sm" class={activeSection === 'account' ? '!text-[var(--color-background)]' : 'text-themed'} />
              {t('settings.tabs.account')}
            </button>
            <button
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
              class:bg-primary={activeSection === 'moderation'}
              class:text-[var(--color-background)]={activeSection === 'moderation'}
              class:text-themed={activeSection !== 'moderation'}
              class:hover:bg-muted={activeSection !== 'moderation'}
              onclick={() => switchSection('moderation')}
            >
              <Icon icon={ICONS.PAN_TOOL} size="sm" class={activeSection === 'moderation' ? '!text-[var(--color-background)]' : 'text-themed'} />
              モデレーション
            </button>
            <button
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors opacity-50 cursor-not-allowed flex items-center gap-2"
              disabled
            >
              <Icon icon={ICONS.NOTIFICATIONS} size="sm" color="themed" />
              {t('settings.tabs.notifications')}（{t('settings.comingSoon')}）
            </button>
          </div>
        </div>

        <!-- 設定コンテンツ -->
        <div class="transition-all duration-300">
          {#if activeSection === 'theme'}
            <ThemeSettings />
          {:else if activeSection === 'language'}
            <LanguageSettings />
          {:else if activeSection === 'account'}
            <AccountSettings />
          {:else if activeSection === 'moderation'}
            <ModerationSettings />
          {:else if activeSection === 'notifications'}
            <!-- 通知設定（準備中） -->
            <div class="max-w-4xl mx-auto text-center py-12">
              <div class="text-6xl mb-4">🔔</div>
              <h3 class="text-themed text-xl font-semibold mb-2">{t('settings.notifications.title')}</h3>
              <p class="text-themed opacity-70">{t('settings.notifications.description')}</p>
            </div>
          {/if}
        </div>
      </div>
    </main>
  </div>
{/if}