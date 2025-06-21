<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Navigation from '$lib/components/Navigation.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import DeckContainer from '$lib/deck/components/DeckContainer.svelte';
  import DeckTabs from '$lib/components/deck/DeckTabs.svelte';
  import { authService } from '$lib/services/authStore.js';
  import type { Account } from '$lib/types/auth.js';
  import { useTranslation } from '$lib/utils/reactiveTranslation.svelte.js';
  import { deckStore } from '$lib/deck/store.svelte.js';
  
  
  // リアクティブ翻訳システム
  const { t, currentLanguage } = useTranslation();
  
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
          
          errorMessage = t('auth.authDataFetchFailed');
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
        
        // デッキストアを初期化
        console.log('🔍 [DEBUG] Initializing deck store...');
        await deckStore.initialize(activeAccount.profile.handle);
        
        // 初回利用時（カラムが0個）の場合、デフォルトカラムを作成
        if (deckStore.isEmpty) {
          console.log('🔍 [DEBUG] No columns found, creating default column');
          await deckStore.addColumn(
            activeAccount.profile.handle,
            'reverse_chronological',
            {
              title: t('navigation.home'),
              subtitle: 'フォロー中のユーザーの投稿'
            }
          );
        }
        
        console.log('🔍 [DEBUG] Deck initialized with', deckStore.columnCount, 'columns');
        
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
        errorMessage = t('auth.authStatusCheckFailed');
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
      <p class="text-themed opacity-80">{t('app.loading')}</p>
    </div>
  </div>
{:else if errorMessage}
  <!-- エラー画面 -->
  {console.log('🔍 [DEBUG] Rendering error screen with message:', errorMessage)}
  <div class="min-h-screen flex items-center justify-center bg-themed p-4">
    <div class="bg-error/10 border-2 border-error/20 rounded-2xl shadow-xl p-12 w-full max-w-md text-center">
      <h2 class="text-error text-2xl font-semibold mb-4">{t('common.error')}</h2>
      <p class="text-error mb-8">{errorMessage}</p>
      <button 
        class="bg-error hover:bg-error/80 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        onclick={() => location.reload()}
      >
        {t('common.retry')}
      </button>
    </div>
  </div>
{:else if activeAccount}
  <!-- メインデッキレイアウト -->
  {console.log('🔍 [DEBUG] Rendering main deck layout with account:', activeAccount)}
  <div class="h-screen md:min-h-screen bg-themed">
    <!-- デスクトップナビゲーション -->
    <div class="hidden md:block">
      <Navigation {currentPath} accountId={activeAccount.profile.handle} />
    </div>
    
    <!-- モバイル用デッキタブ（画面上部） -->
    <DeckTabs variant="mobile" class="md:hidden" />
    
    <!-- メインコンテンツエリア -->
    <main class="md:ml-64 h-full md:min-h-screen mobile-main-content main-content-flex">
      <!-- デスクトップのみヘッダー表示 -->
      <header class="hidden md:flex bg-card border-b-2 border-themed shadow-sm p-4 items-center justify-between">
        <div class="flex items-center gap-4">
          <h1 class="text-themed text-2xl font-bold">
            {t('app.name')}
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
      
      <!-- デスクトップ用デッキタブ -->
      <div class="hidden md:block">
        <DeckTabs variant="desktop" />
      </div>
      
      <!-- デッキコンテンツエリア -->
      <div class="deck-content-wrapper">
        <DeckContainer 
          accountId={activeAccount.profile.handle}
          className="h-full"
        />
      </div>
    </main>
    
    <!-- モバイル用ボトムナビ（固定配置） -->
    <div class="md:hidden">
      <Navigation {currentPath} />
    </div>
  </div>
{:else}
  <!-- フォールバック画面 - 条件に当てはまらない場合 -->
  {console.log('🔍 [DEBUG] Rendering fallback screen - no conditions matched')}
  {console.log('🔍 [DEBUG] Current state - isLoading:', isLoading, 'errorMessage:', errorMessage, 'activeAccount:', activeAccount)}
  <div class="min-h-screen flex items-center justify-center bg-themed p-4">
    <div class="bg-card rounded-2xl shadow-xl p-12 w-full max-w-md text-center">
      <h2 class="text-themed text-2xl font-semibold mb-4">⚠️ {t('deck.unexpectedState')}</h2>
      <p class="text-themed opacity-80 mb-4">
        {t('deck.unexpectedStateDescription')}
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
        {t('common.reload')}
      </button>
    </div>
  </div>
{/if}

<style>
  /* モバイル版の全画面対応 */
  .mobile-main-content {
    /* モバイル: 上部はコンパクトタブ分、下部はボトムナビ分のスペース確保 */
    padding-top: calc(48px + env(safe-area-inset-top, 0px));
    padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px));
  }
  
  /* デスクトップ版では通常のパディング */
  @media (min-width: 768px) {
    .mobile-main-content {
      padding-top: 0;
      padding-bottom: 0;
    }
  }
  
  /* メインコンテンツのFlexboxレイアウト */
  .main-content-flex {
    display: flex;
    flex-direction: column;
    /* モバイル: パディング分を差し引いた高さ */
    height: calc(100vh - 48px - 56px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  }
  
  /* デスクトップでの高さ調整 */
  @media (min-width: 768px) {
    .main-content-flex {
      height: 100vh; /* デスクトップでは通常の全画面高さ */
    }
  }
  
  /* 🚨 デバッグ用スタイル - 要素の可視性確認 */
  .deck-content-wrapper {
    background-color: rgba(0, 0, 255, 0.1);
    /* Flexboxで残り高さを取得 */
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0; /* flexboxの高さ制御 */
  }
</style>