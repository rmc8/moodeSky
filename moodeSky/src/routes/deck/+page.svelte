<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Navigation from '$lib/components/Navigation.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import { authService } from '$lib/services/authStore.js';
  import type { Account } from '$lib/types/auth.js';
  import { auth, navigation, app, common } from '$lib/i18n/paraglide/messages.js';
  
  
  let activeAccount = $state<Account | null>(null);
  let isLoading = $state(true);
  let errorMessage = $state('');
  
  // デバッグ用の状態監視
  $effect(() => {
    console.log('🔍 [DEBUG] State change - isLoading:', isLoading);
  });
  
  $effect(() => {
    console.log('🔍 [DEBUG] State change - errorMessage:', errorMessage);
  });
  
  $effect(() => {
    console.log('🔍 [DEBUG] State change - activeAccount:', activeAccount);
  });
  let currentPath = $state($page.url.pathname);
  
  // 現在のパスを監視
  $effect(() => {
    currentPath = $page.url.pathname;
  });
  
  // 認証状態確認
  onMount(() => {
    let cleanupFunction: (() => void) | undefined;

    (async () => {
      try {
        console.log('🔍 [DEBUG] Deck page onMount started');
        console.log('🔍 [DEBUG] User agent:', navigator.userAgent);
        console.log('🔍 [DEBUG] Platform:', navigator.platform);
        
        // 🚨 ネットワーク接続テスト
        try {
          const response = await fetch('/');
          console.log('🔍 [DEBUG] Network test successful:', response.status);
        } catch (networkError) {
          console.error('🚨 [NETWORK] Network connection failed:', networkError);
        }
        
        console.log('🔍 [DEBUG] authService:', authService);
        console.log('🔍 [DEBUG] About to call getActiveAccount...');
        
        // アクティブアカウントを取得
        const result = await authService.getActiveAccount();
        console.log('🔍 [DEBUG] getActiveAccount result:', result);
        
        if (!result.success) {
          console.error('🔍 [DEBUG] 認証情報の取得に失敗:', result.error);
          console.log('🔍 [DEBUG] Setting error message and redirecting to login');
          
          errorMessage = auth.authDataFetchFailed();
          await goto('/login');
          return;
        }
        
        if (!result.data) {
          console.log('🔍 [DEBUG] アクティブアカウントが見つかりません');
          console.log('🔍 [DEBUG] Redirecting to login...');
          await goto('/login');
          return;
        }
        
        console.log('🔍 [DEBUG] Setting activeAccount:', result.data);
        activeAccount = result.data;
        console.log('🔍 [DEBUG] activeAccount set successfully:', activeAccount);
        
        // ブラウザバック防止
        history.pushState(null, '', window.location.href);
        
        const handlePopState = () => {
          history.pushState(null, '', window.location.href);
        };
        
        window.addEventListener('popstate', handlePopState);
        
        cleanupFunction = () => {
          window.removeEventListener('popstate', handlePopState);
        };
      } catch (error) {
        console.error('🔍 [DEBUG] 認証状態の確認中にエラー:', error);
        console.log('🔍 [DEBUG] Error type:', typeof error, error);
        errorMessage = auth.authStatusCheckFailed();
        await goto('/login');
      } finally {
        console.log('🔍 [DEBUG] Setting isLoading = false');
        isLoading = false;
        console.log('🔍 [DEBUG] onMount finally block completed');
      }
    })();

    return () => {
      cleanupFunction?.();
    };
  });
  
</script>

{#if isLoading}
  <!-- ローディング画面 -->
  {console.log('🔍 [DEBUG] Rendering loading screen')}
  <div class="min-h-screen flex items-center justify-center bg-themed">
    <div class="bg-card rounded-2xl shadow-xl p-12 w-full max-w-md text-center flex flex-col items-center gap-4">
      <div class="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      <p class="text-themed opacity-80">{app.loading()}</p>
    </div>
  </div>
{:else if errorMessage}
  <!-- エラー画面 -->
  {console.log('🔍 [DEBUG] Rendering error screen with message:', errorMessage)}
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
{:else if activeAccount}
  <!-- メインデッキレイアウト -->
  {console.log('🔍 [DEBUG] Rendering main deck layout with account:', activeAccount)}
  <div class="min-h-screen bg-themed">
    <!-- ナビゲーション -->
    <Navigation {currentPath} />
    
    <!-- メインコンテンツエリア -->
    <main class="md:ml-64 min-h-screen pb-20 md:pb-0">
      <!-- ヘッダー -->
      <header class="bg-card border-b-2 border-themed shadow-sm p-4 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <h1 class="text-themed text-2xl font-bold">
            {app.name()}
          </h1>
        </div>
        
        <!-- ユーザー情報 -->
        <div class="flex items-center gap-3">
          <Avatar 
            src={activeAccount.profile.avatar || ''} 
            displayName={activeAccount.profile.displayName || ''} 
            handle={activeAccount.profile.handle}
            size="sm"
          />
          <div class="hidden md:block">
            <p class="text-themed font-medium text-sm">
              {activeAccount.profile.displayName || activeAccount.profile.handle}
            </p>
            <p class="text-themed opacity-70 text-xs">
              @{activeAccount.profile.handle}
            </p>
          </div>
        </div>
      </header>
      
      <!-- デッキコンテンツエリア -->
      <div class="p-4">
        <!-- 暫定的なウェルカムメッセージ -->
        <div class="bg-card rounded-xl shadow-lg p-8 text-center">
          <h2 class="text-themed text-3xl font-bold mb-4">
            🎉 {navigation.home()}
          </h2>
          <p class="text-themed opacity-80 text-lg mb-6">
            moodeSky デッキシステムへようこそ！<br>
            ここにタイムラインとカラム機能が実装される予定です。
          </p>
          
          <!-- 開発状況 -->
          <div class="bg-muted/10 border-2 border-themed rounded-lg p-6 text-left">
            <h3 class="text-themed font-semibold text-lg mb-3">🚧 開発予定機能</h3>
            <ul class="text-themed opacity-80 space-y-2">
              <li>• ホームタイムライン表示</li>
              <li>• マルチカラム デッキシステム</li>
              <li>• 投稿作成・操作機能</li>
              <li>• 検索・フィルタリング機能</li>
              <li>• リアルタイム更新</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  </div>
{:else}
  <!-- フォールバック画面 - 条件に当てはまらない場合 -->
  {console.log('🔍 [DEBUG] Rendering fallback screen - no conditions matched')}
  {console.log('🔍 [DEBUG] Current state - isLoading:', isLoading, 'errorMessage:', errorMessage, 'activeAccount:', activeAccount)}
  <div class="min-h-screen flex items-center justify-center bg-themed p-4">
    <div class="bg-card rounded-2xl shadow-xl p-12 w-full max-w-md text-center">
      <h2 class="text-themed text-2xl font-semibold mb-4">⚠️ 予期しない状態</h2>
      <p class="text-themed opacity-80 mb-4">
        アプリケーションが予期しない状態になりました。
      </p>
      <div class="text-left bg-themed/5 rounded-lg p-4 mb-4 text-sm">
        <p><strong>isLoading:</strong> {isLoading}</p>
        <p><strong>errorMessage:</strong> '{errorMessage}'</p>
        <p><strong>activeAccount:</strong> {activeAccount ? 'present' : 'null'}</p>
      </div>
      <button 
        class="bg-primary hover:bg-primary/80 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        onclick={() => location.reload()}
      >
        ページを再読み込み
      </button>
    </div>
  </div>
{/if}