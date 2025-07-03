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
  import InfiniteScroll from '$lib/components/timeline/InfiniteScroll.svelte';
  import Refresher from '$lib/components/timeline/Refresher.svelte';
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
  
  // 無限スクロール関連の状態
  let cursor = $state<string | undefined>(undefined);
  let hasMore = $state(true);
  let infiniteScrollLoading = $state(false);
  let newPostsCount = $state(0);
  
  // 新しいポスト取得機能関連
  let showNewPostsIndicator = $state(false);
  let lastRefreshTime = $state<Date | null>(null);
  let autoRefreshInterval: ReturnType<typeof setInterval> | null = null;

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
    
    // 5分ごとの自動リフレッシュを設定（ホームタイムラインのみ）
    if (column.algorithm === 'home') {
      autoRefreshInterval = setInterval(() => {
        if (!isRefreshing && !infiniteScrollLoading) {
          handleSilentRefresh();
        }
      }, 5 * 60 * 1000); // 5分
    }
  });

  onDestroy(() => {
    // クリーンアップ（コールバック経由）
    if (onScrollElementUpdate) {
      onScrollElementUpdate(column.id, undefined);
    }
    
    // 自動リフレッシュタイマーをクリア
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
      autoRefreshInterval = null;
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
      
      // 初期読み込みロジックを使用
      await handleRefresh(false);
      
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
   * タイムライン読み込み（リフレッシュ・初期読み込み対応）
   */
  async function handleRefresh(isRefresh: boolean = false) {
    if (isRefreshing) return;

    try {
      isRefreshing = true;
      timelineError = null;
      timelineErrorType = null;
      
      console.log('🎛️ [DeckColumn] Loading timeline for column:', {
        columnId: column.id,
        isRefresh,
        algorithm: column.algorithm
      });
      
      // ホームフィードのみ対応（段階的実装）
      if (column.algorithm === 'home') {
        // 表示対象のアカウントを取得
        const targetAccount = displayAccounts[0];
        if (!targetAccount) {
          throw new Error('No account available for timeline');
        }
        
        console.log('📋 [DeckColumn] Loading timeline for account:', targetAccount.profile.handle);
        
        // AgentManagerからAgentを取得
        const agent = await agentManager.getAgent(targetAccount);
        console.log('🎯 [DeckColumn] Got agent from AgentManager:', { 
          accountDid: targetAccount.profile.did, 
          agentStatus: agent.status 
        });
        
        // キャッシュをクリア（一時的なデバッグ対応）
        if (!isRefresh && !hasTriedAutoLoad) {
          timelineService.clearAllCache();
          console.log('🔧 [DeckColumn] Cleared timeline cache for fresh load');
        }
        
        // 拡張されたタイムラインサービスを使用
        const result = isRefresh 
          ? await timelineService.refreshTimeline(targetAccount, agent, column.algorithm)
          : await timelineService.getTimelineWithCursor(targetAccount, agent, {
              algorithm: column.algorithm,
              limit: 50
            });
        
        console.log('📊 [DeckColumn] Timeline API result:', {
          feedLength: result.feed.length,
          hasMore: result.hasMore,
          cursor: result.cursor ? 'present' : 'none',
          total: result.total
        });
        
        // SimplePost形式に変換
        const simplePosts: SimplePost[] = result.feed.map((item: any) => {
          const post = item.post || item;
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
            facets: post.record?.facets || undefined,
            embed: post.embed,
            embeds: post.embeds,
            replyCount: post.replyCount,
            repostCount: post.repostCount,
            likeCount: post.likeCount,
            indexedAt: post.indexedAt,
            reason: item.reason ? {
              $type: item.reason.$type,
              by: {
                did: item.reason.by.did,
                handle: item.reason.by.handle,
                displayName: item.reason.by.displayName,
                avatar: item.reason.by.avatar
              },
              indexedAt: item.reason.indexedAt
            } : undefined
          };
        });
        
        // 状態を更新
        posts = simplePosts;
        cursor = result.cursor;
        hasMore = result.hasMore;
        
        if (isRefresh && result.newPostsCount !== undefined) {
          newPostsCount = result.newPostsCount;
          console.log('🔄 [DeckColumn] Refresh completed:', {
            newPostsCount: result.newPostsCount,
            totalPosts: posts.length
          });
        }
        
        console.log('✅ [DeckColumn] Timeline loaded:', {
          posts: posts.length,
          hasMore: result.hasMore,
          cursor: result.cursor ? result.cursor.slice(0, 10) + '...' : 'none'
        });
      } else {
        // 他のフィードタイプは後の段階で実装
        console.log('ℹ️ [DeckColumn] Feed type not yet supported:', column.algorithm);
      }
      
    } catch (error) {
      console.error('🎛️ [DeckColumn] Failed to load timeline:', error);
      
      if (error instanceof TimelineError) {
        timelineError = error.message;
        timelineErrorType = error.type;
        
        if (error.type === TimelineErrorType.SESSION_EXPIRED) {
          console.warn('🎛️ [DeckColumn] Session expired, user needs to re-login');
        }
      } else {
        timelineError = error instanceof Error ? error.message : 'タイムラインの読み込みに失敗しました';
        timelineErrorType = null;
      }
    } finally {
      isRefreshing = false;
    }
  }

  /**
   * 無限スクロール用の追加読み込み
   */
  async function handleLoadMore() {
    if (infiniteScrollLoading || !hasMore || !cursor) {
      console.log('🔄 [DeckColumn] Load more skipped:', {
        infiniteScrollLoading,
        hasMore,
        hasCursor: !!cursor
      });
      return;
    }

    try {
      infiniteScrollLoading = true;
      console.log('🔄 [DeckColumn] Loading more posts:', {
        currentCount: posts.length,
        cursor: cursor.slice(0, 10) + '...'
      });
      
      const targetAccount = displayAccounts[0];
      if (!targetAccount) {
        throw new Error('No account available for load more');
      }
      
      const agent = await agentManager.getAgent(targetAccount);
      const result = await timelineService.loadMorePosts(
        targetAccount, 
        agent, 
        cursor, 
        column.algorithm
      );
      
      // 新しいポストを既存のポストに追加
      const newSimplePosts: SimplePost[] = result.feed.map((item: any) => {
        const post = item.post || item;
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
          facets: post.record?.facets || undefined,
          embed: post.embed,
          embeds: post.embeds,
          replyCount: post.replyCount,
          repostCount: post.repostCount,
          likeCount: post.likeCount,
          indexedAt: post.indexedAt,
          reason: item.reason ? {
            $type: item.reason.$type,
            by: {
              did: item.reason.by.did,
              handle: item.reason.by.handle,
              displayName: item.reason.by.displayName,
              avatar: item.reason.by.avatar
            },
            indexedAt: item.reason.indexedAt
          } : undefined
        };
      });
      
      // 重複除去を行いながら追加
      const existingUris = new Set(posts.map(p => p.uri));
      const uniqueNewPosts = newSimplePosts.filter(p => !existingUris.has(p.uri));
      
      posts = [...posts, ...uniqueNewPosts];
      cursor = result.cursor;
      hasMore = result.hasMore;
      
      console.log('✅ [DeckColumn] Load more completed:', {
        newPosts: uniqueNewPosts.length,
        totalPosts: posts.length,
        hasMore: result.hasMore,
        nextCursor: result.cursor ? result.cursor.slice(0, 10) + '...' : 'none'
      });
    } catch (error) {
      console.error('🔄 [DeckColumn] Load more failed:', error);
      
      // エラーをInfiniteScrollコンポーネントで表示
      if (error instanceof TimelineError) {
        timelineError = error.message;
        timelineErrorType = error.type;
      } else {
        timelineError = 'さらに読み込みに失敗しました';
      }
    } finally {
      infiniteScrollLoading = false;
    }
  }

  /**
   * エラー時のリトライ処理
   */
  async function handleRetry() {
    timelineError = null;
    timelineErrorType = null;
    
    if (posts.length === 0) {
      // 初期読み込みの再試行
      await handleRefresh(false);
    } else {
      // 無限スクロールの再試行
      await handleLoadMore();
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
   * Pull to Refresh処理
   */
  async function handlePullRefresh(event: { complete: () => Promise<void> }) {
    try {
      console.log('🔄 [DeckColumn] Pull to refresh triggered');
      
      // 既存のリフレッシュ機能を活用
      await handleRefresh();
      
      console.log('✅ [DeckColumn] Pull to refresh completed');
    } catch (error) {
      console.error('❌ [DeckColumn] Pull to refresh failed:', error);
    } finally {
      // Refresherコンポーネントに完了通知
      await event.complete();
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

  /**
   * 手動リフレッシュ（新しいポスト取得）
   */
  async function handleManualRefresh() {
    console.log('🔄 [DeckColumn] Manual refresh triggered');
    
    showNewPostsIndicator = false;
    newPostsCount = 0;
    
    await handleRefresh(true);
    lastRefreshTime = new Date();
    
    // 新しいポストが見つかった場合の通知
    if (newPostsCount > 0) {
      showNewPostsIndicator = true;
      setTimeout(() => {
        showNewPostsIndicator = false;
      }, 3000); // 3秒後に非表示
    }
  }

  /**
   * サイレントリフレッシュ（バックグラウンド更新）
   */
  async function handleSilentRefresh() {
    try {
      console.log('🔄 [DeckColumn] Silent refresh triggered');
      
      const targetAccount = displayAccounts[0];
      if (!targetAccount || column.algorithm !== 'home') {
        return;
      }
      
      const agent = await agentManager.getAgent(targetAccount);
      const result = await timelineService.refreshTimeline(
        targetAccount, 
        agent, 
        column.algorithm
      );
      
      // 新しいポストが見つかった場合のみ通知
      if (result.newPostsCount && result.newPostsCount > 0) {
        newPostsCount = result.newPostsCount;
        showNewPostsIndicator = true;
        
        console.log('🔔 [DeckColumn] New posts available:', {
          newPostsCount: result.newPostsCount,
          totalPosts: result.total
        });
      }
    } catch (error) {
      console.warn('🔄 [DeckColumn] Silent refresh failed (non-critical):', error);
    }
  }

  /**
   * 新しいポストインジケーターをクリックした時の処理
   */
  async function handleNewPostsClick() {
    await handleManualRefresh();
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
      <!-- 新しいポスト通知 -->
      {#if showNewPostsIndicator && newPostsCount > 0}
        <button 
          class="px-3 py-1 rounded-full bg-primary text-white text-xs font-medium transition-all hover:bg-primary/90 animate-pulse"
          onclick={handleNewPostsClick}
          aria-label="新しいポストを表示"
          title="{newPostsCount}件の新しいポスト"
        >
          +{newPostsCount}
        </button>
      {/if}
      
      <!-- リフレッシュボタン -->
      <button 
        class="w-8 h-8 rounded flex items-center justify-center transition-colors hover:bg-muted/20"
        class:animate-spin={isRefreshing}
        onclick={handleManualRefresh}
        disabled={isRefreshing || infiniteScrollLoading}
        aria-label="タイムラインを更新"
        title="新しいポストを取得"
      >
        <Icon icon={ICONS.REFRESH} size="sm" color="themed" />
      </button>
      
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
    <Refresher 
      onrefresh={handlePullRefresh}
      refresherHeight={70}
      pullMin={70}
      pullMax={140}
      disabled={isInitialLoading || isRefreshing}
    >
      {#if posts.length > 0}
      <!-- タイムライン表示 -->
      <div>
        {#each posts as post (post.uri)}
          <PostCard {post} columnWidth={column.settings.width} />
        {/each}
        
        <!-- 無限スクロールトリガー -->
        <InfiniteScroll 
          {hasMore}
          isLoading={infiniteScrollLoading}
          error={timelineError}
          threshold={200}
          debounceMs={300}
          enableDebugLogs={false}
          onLoadMore={handleLoadMore}
          onRetry={handleRetry}
        />
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
              onclick={handleRetry}
              disabled={isRefreshing || infiniteScrollLoading}
            >
              {isRefreshing || infiniteScrollLoading ? '読み込み中...' : '再試行'}
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
          onclick={() => handleRefresh(false)}
          disabled={isRefreshing || infiniteScrollLoading}
        >
          {isRefreshing || infiniteScrollLoading ? m['deck.column.loading']() : m['deck.column.loadContent']()}
        </button>
      </div>
    {/if}
    </Refresher>
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