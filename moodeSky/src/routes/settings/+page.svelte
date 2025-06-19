<!--
  Settings Page - 設定画面（基本実装）
  
  シンプルな空の設定ページ
  ナビゲーション統合とレスポンシブ対応済み
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Navigation from '$lib/components/Navigation.svelte';
  import { authService } from '$lib/services/authStore.js';
  import type { Account } from '$lib/types/auth.js';
  import { navigation, auth, common } from '$lib/i18n/paraglide/messages.js';
  import { page } from '$app/stores';
  
  // 設定コンポーネント
  import ThemeSettings from './components/ThemeSettings.svelte';
  
  // ===================================================================
  // 状態管理
  // ===================================================================

  let activeAccount = $state<Account | null>(null);
  let isLoading = $state(true);
  let errorMessage = $state('');
  let currentPath = $state($page.url.pathname);
  let activeSection = $state<'theme' | 'language' | 'account' | 'notifications'>('theme');

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
          errorMessage = auth.authRequired();
          await goto('/login');
          return;
        }
        
        activeAccount = result.data;
        console.log('🛠️ [Settings] 設定画面初期化完了');
        
      } catch (error) {
        console.error('🛠️ [Settings] 初期化エラー:', error);
        errorMessage = '設定画面の初期化に失敗しました。';
      } finally {
        isLoading = false;
      }
    })();
  });

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  /**
   * ログアウト処理
   */
  async function logout() {
    try {
      const result = await authService.clearAll();
      
      if (!result.success) {
        console.error('ログアウト処理に失敗:', result.error);
        errorMessage = auth.logoutFailed();
        return;
      }
      
      console.log('正常にログアウトしました');
      await goto('/login');
    } catch (error) {
      console.error('ログアウト中にエラー:', error);
      errorMessage = auth.logoutError();
    }
  }

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
      <p class="text-themed opacity-80">読み込み中...</p>
    </div>
  </div>
{:else if errorMessage}
  <!-- エラー画面 -->
  <div class="min-h-screen flex items-center justify-center bg-themed p-4">
    <div class="bg-error/10 border-2 border-error/20 rounded-2xl shadow-xl p-12 w-full max-w-md text-center">
      <h2 class="text-error text-2xl font-semibold mb-4">{common.error()}</h2>
      <p class="text-error mb-8">{errorMessage}</p>
      <button 
        class="bg-error hover:bg-error/80 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        onclick={() => location.reload()}
      >
        {common.retry()}
      </button>
    </div>
  </div>
{:else}
  <!-- メイン設定画面 -->
  <div class="min-h-screen bg-themed">
    <!-- ナビゲーション -->
    <Navigation {currentPath} />
    
    <!-- メインコンテンツエリア -->
    <main class="md:ml-64 min-h-screen pb-20 md:pb-0">
      <!-- ヘッダー -->
      <header class="bg-card border-b-2 border-themed shadow-sm p-4 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <h1 class="text-themed text-2xl font-bold flex items-center gap-2">
            <span class="text-2xl">⚙️</span>
            {navigation.settings()}
          </h1>
        </div>
        
        <div class="flex items-center gap-4">
          <!-- アカウント情報（デスクトップのみ） -->
          {#if activeAccount}
            <div class="hidden md:flex items-center gap-3">
              <div class="text-right">
                <p class="text-themed font-medium text-sm">
                  {activeAccount.profile.displayName || activeAccount.profile.handle}
                </p>
                <p class="text-themed opacity-70 text-xs">
                  @{activeAccount.profile.handle}
                </p>
              </div>
            </div>
          {/if}
          
          <!-- ログアウトボタン -->
          <button 
            class="text-themed opacity-70 hover:text-error transition-colors p-2 rounded-lg hover:bg-error/10"
            onclick={logout}
            title={auth.logout()}
            aria-label={auth.logout()}
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- メインコンテンツ -->
      <div class="p-6">
        <!-- 設定ナビゲーション -->
        <div class="max-w-4xl mx-auto mb-6">
          <div class="flex flex-wrap gap-2 p-2 bg-card rounded-lg border border-themed">
            <button
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              class:bg-primary={activeSection === 'theme'}
              class:text-white={activeSection === 'theme'}
              class:text-themed={activeSection !== 'theme'}
              class:hover:bg-muted={activeSection !== 'theme'}
              onclick={() => switchSection('theme')}
            >
              🎨 テーマ・外観
            </button>
            <button
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors opacity-50 cursor-not-allowed"
              disabled
            >
              🌍 言語設定（準備中）
            </button>
            <button
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors opacity-50 cursor-not-allowed"
              disabled
            >
              👤 アカウント（準備中）
            </button>
            <button
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors opacity-50 cursor-not-allowed"
              disabled
            >
              🔔 通知（準備中）
            </button>
          </div>
        </div>

        <!-- 設定コンテンツ -->
        <div class="transition-all duration-300">
          {#if activeSection === 'theme'}
            <ThemeSettings />
          {:else if activeSection === 'language'}
            <!-- 言語設定（準備中） -->
            <div class="max-w-4xl mx-auto text-center py-12">
              <div class="text-6xl mb-4">🌍</div>
              <h3 class="text-themed text-xl font-semibold mb-2">言語設定</h3>
              <p class="text-themed opacity-70">言語設定機能は準備中です</p>
            </div>
          {:else if activeSection === 'account'}
            <!-- アカウント設定（準備中） -->
            <div class="max-w-4xl mx-auto text-center py-12">
              <div class="text-6xl mb-4">👤</div>
              <h3 class="text-themed text-xl font-semibold mb-2">アカウント設定</h3>
              <p class="text-themed opacity-70">アカウント設定機能は準備中です</p>
            </div>
          {:else if activeSection === 'notifications'}
            <!-- 通知設定（準備中） -->
            <div class="max-w-4xl mx-auto text-center py-12">
              <div class="text-6xl mb-4">🔔</div>
              <h3 class="text-themed text-xl font-semibold mb-2">通知設定</h3>
              <p class="text-themed opacity-70">通知設定機能は準備中です</p>
            </div>
          {/if}
        </div>
      </div>
    </main>
  </div>
{/if}