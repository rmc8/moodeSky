<!--
  DeckColumn.svelte
  個別デッキカラム
  
  tokimekiblueskyのDeckRow.svelteを参考にしつつ、
  moodeSky独自のシンプル実装（最初は空カラム表示のみ）
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import Icon from '$lib/components/Icon.svelte';
  import AvatarGroup from '$lib/components/AvatarGroup.svelte';
  import AccountSwitcher from '$lib/components/AccountSwitcher.svelte';
  import PostCard from '$lib/components/PostCard.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import { deckStore } from '../store.svelte.js';
  import type { Column, ColumnWidth } from '../types.js';
  import type { Account } from '$lib/types/auth.js';
  import { COLUMN_WIDTHS, getFeedTypeIcon } from '../types.js';
  import { avatarCache } from '$lib/stores/avatarCache.svelte.js';
  import { agentManager } from '$lib/services/agentManager.js';
  import { timelineService, TimelineError, TimelineErrorType } from '$lib/services/timelineService.js';
  import type { SimplePost } from '$lib/types/post.js';
  import * as m from '../../../paraglide/messages.js';

  // ===================================================================
  // Props
  // ===================================================================

  interface Props {
    column: Column;
    index: number;
    accountId: string;
    activeAccount?: Account;
    allAccounts?: Account[];
    onScrollElementUpdate?: (columnId: string, element: HTMLElement | undefined) => void;
    onOpenDeckSettings?: () => void;
  }

  const { column, index, accountId, activeAccount, allAccounts = [], onScrollElementUpdate, onOpenDeckSettings }: Props = $props();
  

  // ===================================================================
  // 状態管理
  // ===================================================================

  let scrollElement: HTMLElement;
  let isRefreshing = $state(false);
  let isInitialLoading = $state(false);
  let hasTriedAutoLoad = $state(false);
  let showAccountSwitcher = $state(false);
  let posts = $state<SimplePost[]>([]);
  let timelineError = $state<string | null>(null);
  let timelineErrorType = $state<TimelineErrorType | null>(null);

  // ===================================================================
  // アバター表示用のロジック - アバターキャッシュ統合
  // ===================================================================
  
  /**
   * 表示対象アカウントの決定（カラム設定優先）
   * カラム固有のaccountIdを最優先で使用し、アクティブアカウントはフォールバックのみ
   */
  const displayAccounts = $derived.by((): Account[] => {
    try {
      // カラム設定のアカウントIDを取得（プロップのaccountIdではなくcolumn.accountIdを使用）
      const columnAccountId = column.accountId;
      
      console.log(`🎯 [DeckColumn] Column account resolution:`, {
        columnId: column.id,
        columnAccountId,
        propsAccountId: accountId,
        columnTitle: column.settings.title
      });
      
      if (columnAccountId === 'all') {
        // 全アカウント選択時：動的に変化（ログイン・ログアウトで変動）
        if (column.targetAccounts && column.targetAccounts.length > 0) {
          console.log(`🎭 [DeckColumn] Using targetAccounts for 'all' (${column.targetAccounts.length} accounts)`);
          return column.targetAccounts;
        } else if (allAccounts.length > 0) {
          // 全アカウントを動的に使用
          console.log(`🎭 [DeckColumn] Using allAccounts for 'all' (${allAccounts.length} accounts)`);
          return allAccounts;
        } else {
          // 最終フォールバック：activeAccount を使用
          console.warn(`🎭 [DeckColumn] No targetAccounts/allAccounts found for 'all', falling back to activeAccount`);
          return activeAccount ? [activeAccount] : [];
        }
      }
      
      // 単一アカウント選択時：カラム固有アカウントを優先検索
      const columnAccount = allAccounts.find(acc => 
        acc.profile.did === columnAccountId || 
        acc.profile.handle === columnAccountId ||
        acc.id === columnAccountId
      );
      
      if (columnAccount) {
        console.log(`✅ [DeckColumn] Using column-specific account:`, {
          columnAccountId,
          foundAccount: {
            did: columnAccount.profile.did,
            handle: columnAccount.profile.handle,
            displayName: columnAccount.profile.displayName,
            hasAvatar: !!columnAccount.profile.avatar
          }
        });
        
        return [columnAccount];
      }
      
      // フォールバック：アクティブアカウントを使用
      if (activeAccount) {
        console.warn(`⚠️ [DeckColumn] Column account not found, falling back to activeAccount:`, {
          columnAccountId,
          fallbackAccount: {
            did: activeAccount.profile.did,
            handle: activeAccount.profile.handle,
            displayName: activeAccount.profile.displayName
          }
        });
        
        return [activeAccount];
      } else {
        console.error(`❌ [DeckColumn] No account available for column ${column.id}`);
        return [];
      }
    } catch (error) {
      console.error('🎭 [DeckColumn] Error preparing display accounts:', error);
      return [];
    }
  });

  // ===================================================================
  // カラム幅の動的スタイル
  // ===================================================================

  // 画面幅の監視用
  let windowWidth = $state(768);
  
  const styleString = $derived(() => {
    // モバイル検出（768px未満）
    const isMobile = windowWidth < 768;
    
    if (isMobile) {
      // モバイル: インラインスタイルを一切適用しない（CSSクラスの100%幅を優先）
      return '';
    } else {
      // デスクトップ: 従来通りの固定幅
      const width = COLUMN_WIDTHS[column.settings.width];
      return `width: ${width.width}px; min-width: ${width.width}px;`;
    }
  });

  // ===================================================================
  // エフェクト
  // ===================================================================

  // アバターキャッシュプリフェッチ
  $effect(() => {
    // displayAccountsが変更されたときにアバターをプリフェッチ
    if (displayAccounts.length > 0) {
      displayAccounts.forEach(account => {
        // 非同期処理だが、エラーは無視（プリフェッチのため）
        avatarCache.getAvatar(account.profile.did).catch((error) => {
          console.warn(`🎭 [DeckColumn] Avatar cache prefetch failed for ${account.profile.did}:`, error);
        });
      });
    }
  });

  // 自動読み込み監視（アカウント初期化完了後のリアクティブ処理）
  $effect(() => {
    // displayAccountsが利用可能になったときに自動読み込みを試行
    console.log('🎛️ [DeckColumn] Auto-load effect triggered:', {
      columnId: column.id,
      displayAccountsLength: displayAccounts.length,
      hasTriedAutoLoad,
      postsLength: posts.length,
      algorithm: column.algorithm
    });

    if (shouldAutoLoad()) {
      console.log('🎛️ [DeckColumn] Starting reactive auto-load for column:', column.id);
      handleAutoLoad();
    }
  });

  // ===================================================================
  // ライフサイクル
  // ===================================================================

  onMount(() => {
    // スクロール要素を登録（コールバック経由）
    if (scrollElement && onScrollElementUpdate) {
      onScrollElementUpdate(column.id, scrollElement);
    }

    // 初期画面幅設定
    if (typeof window !== 'undefined') {
      windowWidth = window.innerWidth;
      
      // リサイズイベント監視
      const handleResize = () => {
        windowWidth = window.innerWidth;
      };
      
      window.addEventListener('resize', handleResize);
      
      // クリーンアップ用に返す
      return () => window.removeEventListener('resize', handleResize);
    }

    console.log('🎛️ [DeckColumn] Column mounted:', column.id, column.settings.title);
    
    // 自動コンテンツ読み込み
    if (shouldAutoLoad()) {
      console.log('🎛️ [DeckColumn] Starting auto-load for column:', column.id);
      handleAutoLoad();
    }
  });

  onDestroy(() => {
    // クリーンアップ（コールバック経由）
    if (onScrollElementUpdate) {
      onScrollElementUpdate(column.id, undefined);
    }
  });

  // ===================================================================
  // ヘルパー関数
  // ===================================================================

  /**
   * 自動読み込みを実行すべきかどうかを判定
   */
  function shouldAutoLoad(): boolean {
    // 既に自動読み込みを試行済みの場合はスキップ
    if (hasTriedAutoLoad) {
      console.log('🎛️ [DeckColumn] Auto-load skipped: already attempted');
      return false;
    }

    // ホームフィードのみ対応（段階的実装）
    if (column.algorithm !== 'home') {
      console.log('🎛️ [DeckColumn] Auto-load skipped: non-home algorithm:', column.algorithm);
      return false;
    }

    // 有効なアカウントが存在することを確認
    if (displayAccounts.length === 0) {
      console.log('🎛️ [DeckColumn] Auto-load skipped: no display accounts available');
      return false;
    }

    // 既にコンテンツが読み込まれている場合はスキップ
    if (posts.length > 0) {
      console.log('🎛️ [DeckColumn] Auto-load skipped: content already loaded');
      return false;
    }

    // エラー状態の場合はスキップ（手動リトライを促す）
    if (timelineError) {
      console.log('🎛️ [DeckColumn] Auto-load skipped: previous error state');
      return false;
    }

    console.log('🎛️ [DeckColumn] Auto-load conditions met for column:', column.id);
    return true;
  }

  /**
   * 初期自動読み込みを実行
   */
  async function handleAutoLoad() {
    if (isInitialLoading || isRefreshing) return;

    try {
      hasTriedAutoLoad = true;
      isInitialLoading = true;
      console.log('🎛️ [DeckColumn] Auto-loading content for column:', column.id);
      
      // handleRefreshと同じロジックを使用
      await handleRefresh();
      
      console.log('🎛️ [DeckColumn] Auto-load completed for column:', column.id);
    } catch (error) {
      console.error('🎛️ [DeckColumn] Auto-load failed for column:', column.id, error);
      // エラーは既にhandleRefresh内で適切に処理される
    } finally {
      isInitialLoading = false;
    }
  }

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  /**
   * タイムライン読み込み（ホームフィード対応）
   */
  async function handleRefresh() {
    if (isRefreshing) return;

    try {
      isRefreshing = true;
      timelineError = null;
      timelineErrorType = null;
      console.log('🎛️ [DeckColumn] Loading timeline for column:', column.id);
      
      // ホームフィードのみ対応（段階的実装）
      if (column.algorithm === 'home') {
        // 表示対象のアカウントを取得
        const targetAccount = displayAccounts[0];
        if (!targetAccount) {
          throw new Error('No account available for timeline');
        }
        
        console.log('📋 [DeckColumn] Loading timeline for account:', targetAccount.profile.handle);
        
        // AgentManagerからAgentを取得
        const agent = agentManager.getAgent(targetAccount);
        console.log('🎯 [DeckColumn] Got agent from AgentManager:', { 
          accountDid: targetAccount.profile.did, 
          agentStatus: agent.status 
        });
        
        // タイムラインデータを取得（Agent注入）
        const timelineData = await timelineService.getTimeline(targetAccount, agent);
        
        // SimplePost形式に変換
        const simplePosts: SimplePost[] = timelineData.map((item: any) => {
          const post = item.post || item; // AT Protocolの構造に対応
          return {
            uri: post.uri,
            cid: post.cid,
            author: {
              did: post.author.did,
              handle: post.author.handle,
              displayName: post.author.displayName,
              avatar: post.author.avatar
            },
            text: post.record?.text || '',
            createdAt: post.record?.createdAt || post.indexedAt,
            replyCount: post.replyCount,
            repostCount: post.repostCount,
            likeCount: post.likeCount,
            indexedAt: post.indexedAt
          };
        });
        
        posts = simplePosts;
        console.log('✅ [DeckColumn] Timeline loaded:', posts.length, 'posts');
      } else {
        // 他のフィードタイプは後の段階で実装
        console.log('ℹ️ [DeckColumn] Feed type not yet supported:', column.algorithm);
      }
      
    } catch (error) {
      console.error('🎛️ [DeckColumn] Failed to load timeline:', error);
      
      if (error instanceof TimelineError) {
        // TimelineErrorの場合、適切なメッセージを表示
        timelineError = error.message;
        timelineErrorType = error.type;
        
        // セッション期限切れの場合は特別な処理
        if (error.type === TimelineErrorType.SESSION_EXPIRED) {
          console.warn('🎛️ [DeckColumn] Session expired, user needs to re-login');
        }
      } else {
        // その他のエラー
        timelineError = error instanceof Error ? error.message : 'タイムラインの読み込みに失敗しました';
        timelineErrorType = null;
      }
    } finally {
      isRefreshing = false;
    }
  }

  /**
   * ヘッダークリック（トップにスクロール）
   */
  function handleHeaderClick() {
    if (scrollElement) {
      scrollElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * アカウント切り替え処理
   */
  async function handleAccountSelect(account: Account | 'all') {
    console.log('🔄 [DeckColumn] handleAccountSelect called with:', account === 'all' ? 'all accounts' : account.profile.handle);
    console.log('🔄 [DeckColumn] column.id:', column.id);
    console.log('🔄 [DeckColumn] allAccounts:', allAccounts);
    
    try {
      if (account === 'all') {
        console.log('🔄 [DeckColumn] Setting all accounts for deck');
        // 全アカウント選択時
        await deckStore.updateColumnAccount(column.id, 'all', allAccounts);
        console.log('🔄 [DeckColumn] All accounts set successfully');
      } else {
        console.log('🔄 [DeckColumn] Setting single account for deck:', account.profile.handle);
        // 単一アカウント選択時
        await deckStore.updateColumnAccount(column.id, account.profile.did);
        console.log('🔄 [DeckColumn] Single account set successfully');
      }
      
      // デバッグ: 更新後のカラム状態を確認
      const updatedColumn = deckStore.getColumn(column.id);
      console.log('🔄 [DeckColumn] Updated column state:', {
        accountId: updatedColumn?.accountId,
        targetAccounts: updatedColumn?.targetAccounts?.length || 0
      });
      
    } catch (error) {
      console.error('🔄 [DeckColumn] Error updating column account:', error);
    } finally {
      showAccountSwitcher = false;
    }
  }

  /**
   * アカウント切り替えモーダルを閉じる
   */
  function handleCloseAccountSwitcher() {
    showAccountSwitcher = false;
  }
</script>

<!-- カラムコンテナ -->
<div 
  class="flex flex-col bg-card overflow-hidden relative h-full transition-all duration-200 w-full min-w-0"
  class:w-20={column.settings.isMinimized}
  class:border-primary-pinned={column.settings.isPinned}
  class:shadow-md={column.settings.isPinned}
  class:border={windowWidth >= 768}
  class:border-subtle={windowWidth >= 768}
  class:rounded-lg={windowWidth >= 768}
  class:shadow-sm={windowWidth >= 768}
  class:mobile-column-width={windowWidth < 768}
  style={styleString()}
>
  <!-- カラムヘッダー -->
  <header 
    class="flex items-center gap-2 bg-card sticky top-0 z-10 w-full min-w-0 max-w-full overflow-hidden"
    class:border-b={windowWidth >= 768}
    class:border-subtle={windowWidth >= 768}
    class:p-3={windowWidth >= 768}
    class:px-4={windowWidth < 768}
    class:py-2={windowWidth < 768}
  >
    <!-- デッキ種類アイコン -->
    <div class="flex-shrink-0 w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
      <Icon icon={getFeedTypeIcon(column.algorithm)} size="md" color="primary" />
    </div>
    
    <!-- アカウント切り替えボタン -->
    <button 
      class="flex-shrink-0 p-1 rounded-lg hover:bg-muted/20 transition-colors relative"
      onclick={() => {
        console.log('🎯 [DeckColumn] Avatar click event triggered');
        console.log('🎯 [DeckColumn] allAccounts:', allAccounts);
        console.log('🎯 [DeckColumn] displayAccounts:', displayAccounts);
        
        showAccountSwitcher = !showAccountSwitcher;
        
        console.log('🎯 [DeckColumn] showAccountSwitcher set to:', showAccountSwitcher);
      }}
      aria-label="デッキのアカウントを切り替え"
      title="デッキのアカウントを切り替え"
    >
      <AvatarGroup 
        accounts={displayAccounts} 
        size="sm" 
        maxDisplay={4}
        clickable={false}
        displayMode={displayAccounts.length > 1 ? "split" : "overlap"}
      />
    </button>
    
    <!-- タイトル部分（クリックでトップスクロール） -->
    <button 
      class="flex items-center gap-3 flex-1 min-w-0 text-left rounded p-1 transition-colors hover:bg-muted/10"
      onclick={handleHeaderClick}
    >        
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold text-sm text-themed truncate">
          {column.settings.title}
        </h3>
        <p class="text-xs text-themed opacity-60">
          {#if column.accountId === 'all' && displayAccounts.length > 1}
            すべてのアカウント ({displayAccounts.length})
          {:else if displayAccounts.length > 0}
            @{displayAccounts[0].profile.handle}
          {:else}
            @{column.accountId || 'user'}
          {/if}
        </p>
      </div>
    </button>

    <!-- ヘッダーボタン -->
    <div class="flex items-center gap-1">
      <!-- デッキ設定ボタン -->
      {#if onOpenDeckSettings}
        <button 
          class="w-8 h-8 rounded flex items-center justify-center transition-colors hover:bg-muted/20"
          onclick={() => {
            console.log('🎯 [DeckColumn] Deck settings button clicked');
            onOpenDeckSettings();
          }}
          aria-label="デッキ設定"
          title="デッキ設定"
        >
          <Icon icon={ICONS.SETTINGS} size="sm" color="themed" />
        </button>
      {/if}
    </div>

  </header>

  <!-- カラムコンテンツ -->
  <div 
    class="flex-1 overflow-y-auto overflow-x-hidden scrollbar-professional w-full min-w-0 max-w-full"
    bind:this={scrollElement}
  >
    {#if posts.length > 0}
      <!-- タイムライン表示 -->
      <div class="space-y-2 p-2">
        {#each posts as post (post.uri)}
          <PostCard {post} columnWidth={column.settings.width} />
        {/each}
      </div>
    {:else if isInitialLoading}
      <!-- 初期読み込み中状態 -->
      <div class="flex flex-col items-center justify-center h-full text-center w-full min-w-0 max-w-full" class:p-6={windowWidth >= 768} class:px-4={windowWidth < 768} class:py-6={windowWidth < 768}>
        <div class="mb-4 opacity-60">
          <Icon icon={ICONS.REFRESH} size="lg" color="themed" />
        </div>
        <h4 class="font-medium text-themed mb-2">
          コンテンツを読み込み中
        </h4>
        <p class="text-sm text-themed opacity-70 max-w-48">
          タイムラインを取得しています...
        </p>
      </div>
    {:else if timelineError}
      <!-- エラー状態 -->
      <div class="flex flex-col items-center justify-center h-full text-center w-full min-w-0 max-w-full" class:p-6={windowWidth >= 768} class:px-4={windowWidth < 768} class:py-6={windowWidth < 768}>
        <div class="mb-4 opacity-40">
          {#if timelineErrorType === TimelineErrorType.SESSION_EXPIRED}
            <Icon icon={ICONS.LOGIN} size="lg" color="warning" />
          {:else if timelineErrorType === TimelineErrorType.NETWORK_ERROR}
            <Icon icon={ICONS.ERROR} size="lg" color="error" />
          {:else}
            <Icon icon={ICONS.WARNING} size="lg" color="error" />
          {/if}
        </div>
        
        <h4 class="font-medium text-themed mb-2">
          {#if timelineErrorType === TimelineErrorType.SESSION_EXPIRED}
            認証が必要です
          {:else if timelineErrorType === TimelineErrorType.NETWORK_ERROR}
            接続エラー
          {:else}
            読み込みエラー
          {/if}
        </h4>
        
        <p class="text-sm text-themed opacity-70 mb-6 max-w-48">
          {timelineError}
        </p>
        
        <div class="flex flex-col gap-3">
          {#if timelineErrorType === TimelineErrorType.SESSION_EXPIRED}
            <button 
              class="button-primary text-sm px-4 py-2"
              onclick={() => goto('/settings?tab=account')}
            >
              {m['settings.account.title']()}
            </button>
          {:else}
            <button 
              class="button-primary text-sm px-4 py-2"
              onclick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? '読み込み中...' : '再試行'}
            </button>
          {/if}
        </div>
      </div>
    {:else}
      <!-- 空状態 -->
      <div class="flex flex-col items-center justify-center h-full text-center w-full min-w-0 max-w-full" class:p-6={windowWidth >= 768} class:px-4={windowWidth < 768} class:py-6={windowWidth < 768}>
        <div class="mb-4 opacity-40">
          <Icon icon={ICONS.INBOX} size="lg" color="themed" />
        </div>
        <h4 class="font-medium text-themed mb-2">
          {m['deck.column.empty.title']()}
        </h4>
        <p class="text-sm text-themed opacity-70 mb-6 max-w-48">
          {m['deck.column.empty.description']()}
        </p>
        <button 
          class="button-primary text-sm px-4 py-2"
          onclick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? m['deck.column.loading']() : m['deck.column.loadContent']()}
        </button>
      </div>
    {/if}
  </div>
</div>

<!-- アカウント切り替えモーダル（AddDeckModalパターン） -->
{#if showAccountSwitcher && allAccounts && allAccounts.length > 0}
  {console.log('🎯 [DeckColumn] Rendering AccountSwitcher modal')}
  <AccountSwitcher
    isOpen={showAccountSwitcher}
    accounts={allAccounts}
    activeAccount={activeAccount || null}
    showAllAccountsOption={true}
    isAllAccountsSelected={column.accountId === 'all'}
    zIndex={9999}
    onClose={handleCloseAccountSwitcher}
    onAccountSelect={handleAccountSelect}
    onAddAccount={() => {
      // TODO: アカウント追加処理
      console.log('Add account clicked');
    }}
  />
{/if}

<style>
  /* DeckColumn TailwindCSS v4移行完了 - 大幅CSS削減達成 */
  
  /* WebKit角丸レンダリング最適化は app.css に移動済み */
  
  /* モバイル特化調整: 完全100%幅制御 */
  .mobile-column-width {
    width: 100% !important;
    min-width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  
  /* 最小化時の特別幅設定 */
  .w-20 {
    width: 80px !important;
    min-width: 80px !important;
  }
</style>