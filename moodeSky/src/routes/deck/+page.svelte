<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Navigation from '$lib/components/Navigation.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import DeckContainer from '$lib/deck/components/DeckContainer.svelte';
  import FloatingPostButton from '$lib/components/FloatingPostButton.svelte';
  import { authService } from '$lib/services/authStore.js';
  import type { Account } from '$lib/types/auth.js';
  import { useTranslation } from '$lib/utils/reactiveTranslation.svelte.js';
  import { deckStore } from '$lib/deck/store.svelte.js';
  import { avatarCache } from '$lib/stores/avatarCache.svelte.js';
  import { accountsStore } from '$lib/stores/accounts.svelte.js';
  import { moderationStore } from '$lib/stores/moderation.svelte.js';
  
  
  // リアクティブ翻訳システム
  const { t, currentLanguage } = useTranslation();
  
  let isLoading = $state(true);
  let errorMessage = $state('');
  
  // Add Deck モーダル状態管理
  let showAddDeckModal = $state(false);
  
  function handleOpenAddDeckModal() {
    showAddDeckModal = true;
  }
  
  function handleCloseAddDeckModal() {
    showAddDeckModal = false;
  }
  
  // デバッグ用の状態監視
  $effect(() => {
    console.log('🔍 [DEBUG] State change - isLoading:', isLoading);
  });
  
  $effect(() => {
    console.log('🔍 [DEBUG] State change - errorMessage:', errorMessage);
  });
  
  $effect(() => {
    console.log('🔍 [DEBUG] State change - activeAccount:', accountsStore.activeAccount);
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
        
        console.log('🔍 [DEBUG] accountsStore:', accountsStore);
        console.log('🔍 [DEBUG] About to initialize accountsStore...');
        
        // accountsStoreを初期化（全アカウント + アクティブアカウント取得）
        await accountsStore.initialize();
        console.log('🔍 [DEBUG] accountsStore initialized:', {
          allAccounts: accountsStore.allAccounts.length,
          activeAccount: accountsStore.activeAccount?.profile.handle
        });
        
        if (!accountsStore.hasAccounts) {
          console.log('🔍 [DEBUG] アカウントが見つかりません');
          console.log('🔍 [DEBUG] Redirecting to login...');
          await goto('/login');
          return;
        }
        
        if (!accountsStore.activeAccount) {
          console.log('🔍 [DEBUG] アクティブアカウントが見つかりません');
          console.log('🔍 [DEBUG] Redirecting to login...');
          await goto('/login');
          return;
        }
        
        console.log('🔍 [DEBUG] accountsStore setup successfully:', {
          totalAccounts: accountsStore.accountCount,
          activeAccount: accountsStore.activeAccount.profile.handle,
          allAccountHandles: accountsStore.allAccounts.map(acc => acc.profile.handle)
        });
        
        // デッキストアを初期化
        console.log('🔍 [DEBUG] Initializing deck store...');
        console.log('🔍 [DEBUG] Account handle:', accountsStore.activeAccount.profile.handle);
        console.log('🔍 [DEBUG] DeckStore state before init:', {
          isInitialized: deckStore.isInitialized,
          isEmpty: deckStore.isEmpty,
          columnCount: deckStore.columnCount,
          columns: deckStore.columns
        });
        
        await deckStore.initialize(accountsStore.activeAccount.profile.did);
        
        // アバターキャッシュシステムを初期化
        console.log('🔍 [DEBUG] Initializing avatar cache...');
        await avatarCache.initialize();
        console.log('🔍 [DEBUG] Avatar cache initialized successfully');

        // モデレーションシステムを初期化
        console.log('🔍 [DEBUG] Initializing moderation system...');
        await moderationStore.initialize();
        console.log('🔍 [DEBUG] Moderation system initialized successfully:', {
          filteringActive: moderationStore.isFilteringActive,
          activeKeywords: moderationStore.activeKeywordCount,
          activeLabels: moderationStore.activeLabelCount
        });
        
        console.log('🔍 [DEBUG] DeckStore state after init:', {
          isInitialized: deckStore.isInitialized,
          isEmpty: deckStore.isEmpty,
          columnCount: deckStore.columnCount,
          columns: deckStore.columns,
          storeState: deckStore.state
        });
        
        // 初回利用時（カラムが0個）の場合、デフォルトカラムを作成
        if (deckStore.isEmpty) {
          console.log('🔍 [DEBUG] No columns found, creating default column');
          console.log('🔍 [DEBUG] Adding column with params:', {
            accountId: accountsStore.activeAccount.profile.handle,
            algorithm: 'home',
            settings: {
              title: t('navigation.home'),
              subtitle: 'フォロー中のユーザーの投稿'
            }
          });
          
          try {
            const newColumn = await deckStore.addColumn(
              accountsStore.activeAccount.profile.did,
              'home',
              {
                title: t('navigation.home'),
                subtitle: 'フォロー中のユーザーの投稿'
              }
            );
            console.log('🔍 [DEBUG] Default column created successfully:', newColumn);
          } catch (error) {
            console.error('🔍 [DEBUG] Failed to create default column:', error);
            console.error('🔍 [DEBUG] Error details:', error instanceof Error ? error.message : error);
          }
        } else {
          console.log('🔍 [DEBUG] Columns already exist, skipping default column creation');
        }
        
        console.log('🔍 [DEBUG] Final deck state:', {
          columnCount: deckStore.columnCount,
          columns: deckStore.columns,
          activeColumnId: deckStore.state.activeColumnId,
          isEmpty: deckStore.isEmpty
        });
        
        // フェイルセーフ: 3秒後にカラムチェック、必要に応じて強制作成
        setTimeout(async () => {
          console.log('🔍 [DEBUG] Failsafe check after 3 seconds:', {
            isEmpty: deckStore.isEmpty,
            columnCount: deckStore.columnCount,
            isInitialized: deckStore.isInitialized
          });
          
          if (deckStore.isEmpty && deckStore.isInitialized && accountsStore.activeAccount) {
            console.log('🚨 [FAILSAFE] No columns found after 3 seconds, forcing default column creation');
            try {
              const failsafeColumn = await deckStore.addColumn(
                accountsStore.activeAccount.profile.did,
                'home',
                {
                  title: t('navigation.home'),
                  subtitle: 'フォロー中のユーザーの投稿'
                }
              );
              console.log('🚨 [FAILSAFE] Forced column creation successful:', failsafeColumn);
            } catch (error) {
              console.error('🚨 [FAILSAFE] Forced column creation failed:', error);
              // 最後の手段: ページリロード
              console.log('🚨 [FAILSAFE] Attempting page reload as last resort...');
              setTimeout(() => {
                if (deckStore.isEmpty) {
                  location.reload();
                }
              }, 1000);
            }
          } else {
            console.log('🔍 [DEBUG] Failsafe check passed - columns exist');
          }
        }, 3000);
        
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
  
  // ===================================================================
  // エッジケース処理: デッキが空になった場合の自動復旧
  // ===================================================================
  
  // デッキが空になったことを検出して自動的にデフォルトカラムを作成
  $effect(() => {
    console.log('🔍 [DEBUG] Effect triggered - edge case recovery:', {
      isInitialized: deckStore.isInitialized,
      isLoading: isLoading,
      hasActiveAccount: !!accountsStore.activeAccount,
      isEmpty: deckStore.isEmpty,
      columnCount: deckStore.columnCount
    });
    
    // 初期化完了後で、ログイン済みで、デッキが空の場合
    if (deckStore.isInitialized && !isLoading && accountsStore.activeAccount && deckStore.isEmpty) {
      console.log('🔍 [DEBUG] Edge case: Deck became empty, creating default home column');
      console.log('🔍 [DEBUG] Account handle for recovery:', accountsStore.activeAccount.profile.handle);
      
      // 非同期でデフォルトカラムを作成
      deckStore.addColumn(
        accountsStore.activeAccount.profile.did,
        'home',
        {
          title: t('navigation.home'),
          subtitle: 'フォロー中のユーザーの投稿'
        }
      ).then((column) => {
        console.log('🔍 [DEBUG] Recovery: Default column created successfully:', column);
        console.log('🔍 [DEBUG] Recovery: Final state:', {
          columnCount: deckStore.columnCount,
          isEmpty: deckStore.isEmpty,
          activeColumnId: deckStore.state.activeColumnId
        });
      }).catch((error) => {
        console.error('🔍 [DEBUG] Recovery: Failed to create default column:', error);
        console.error('🔍 [DEBUG] Recovery: Error details:', error instanceof Error ? error.message : error);
      });
    } else {
      console.log('🔍 [DEBUG] Edge case conditions not met, skipping recovery');
    }
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
{:else if accountsStore.activeAccount}
  <!-- メインデッキレイアウト -->
  {console.log('🔍 [DEBUG] Rendering main deck layout with accounts:', {
    activeAccount: accountsStore.activeAccount.profile.handle,
    totalAccounts: accountsStore.accountCount,
    allHandles: accountsStore.allAccounts.map(acc => acc.profile.handle)
  })}
  <div class="h-screen flex flex-col bg-themed">
    <!-- ナビゲーション（レスポンシブ制御は Navigation 内部で実施） -->
    <Navigation {currentPath} accountId={accountsStore.activeAccount.profile.did} onAddDeck={handleOpenAddDeckModal} />
    
    <!-- モバイル用デッキタブは Navigation.svelte 内で管理 -->
    
    <!-- メインコンテンツエリア -->
    <main class="flex-1 md:ml-64 mobile-main-content main-content-flex">
      <!-- デッキコンテンツエリア -->
      <div class="deck-content-wrapper">
        <DeckContainer 
          accountId={accountsStore.activeAccount.profile.handle}
          activeAccount={accountsStore.activeAccount}
          allAccounts={accountsStore.allAccounts}
          className="h-full"
          {showAddDeckModal}
          onCloseAddDeckModal={handleCloseAddDeckModal}
        />
      </div>
    </main>
    
    <!-- モバイル用フローティング投稿ボタン -->
    <FloatingPostButton />
  </div>
{:else}
  <!-- フォールバック画面 - 条件に当てはまらない場合 -->
  {console.log('🔍 [DEBUG] Rendering fallback screen - no conditions matched')}
  {console.log('🔍 [DEBUG] Current state - isLoading:', isLoading, 'errorMessage:', errorMessage, 'activeAccount:', accountsStore.activeAccount)}
  <div class="min-h-screen flex items-center justify-center bg-themed p-4">
    <div class="bg-card rounded-2xl shadow-xl p-12 w-full max-w-md text-center">
      <h2 class="text-themed text-2xl font-semibold mb-4">⚠️ {t('deck.unexpectedState')}</h2>
      <p class="text-themed opacity-80 mb-4">
        {t('deck.unexpectedStateDescription')}
      </p>
      <div class="text-left bg-themed/5 rounded-lg p-4 mb-4 text-sm">
        <p><strong>isLoading:</strong> {isLoading}</p>
        <p><strong>errorMessage:</strong> '{errorMessage}'</p>
        <p><strong>activeAccount:</strong> {accountsStore.activeAccount ? 'present' : 'null'}</p>
        <p><strong>accountCount:</strong> {accountsStore.accountCount}</p>
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
    padding-top: calc(var(--mobile-tab-height) + env(safe-area-inset-top, 0px));
    padding-bottom: calc(var(--mobile-nav-height) + env(safe-area-inset-bottom, 0px));
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
    flex: 1;
    overflow: hidden;
  }
  
  /* モバイル専用高さ設定 */
  @media (max-width: 767px) {
    .main-content-flex {
      /* モバイル: タブとナビゲーション分を差し引いた高さ */
      height: calc(100vh - var(--mobile-tab-height) - var(--mobile-nav-height) - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
    }
  }
  
  /* デスクトップ専用高さ設定 */
  @media (min-width: 768px) {
    .main-content-flex {
      /* デスクトップ: サイドナビゲーション分を考慮した高さ */
      height: 100vh;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
  }
  
  .deck-content-wrapper {
    /* 親の残り高さを取得してデッキが100%高さを使用 */
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0; /* flexboxの高さ制御 */
    overflow: hidden; /* 子要素のスクロール制御 */
  }
</style>