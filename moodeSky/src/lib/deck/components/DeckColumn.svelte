<!--
  DeckColumn.svelte
  個別デッキカラム
  
  tokimekiblueskyのDeckRow.svelteを参考にしつつ、
  moodeSky独自のシンプル実装（最初は空カラム表示のみ）
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import AvatarGroup from '$lib/components/AvatarGroup.svelte';
  import AccountSwitcher from '$lib/components/AccountSwitcher.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import { deckStore } from '../store.svelte.js';
  import type { Column, ColumnWidth } from '../types.js';
  import type { Account } from '$lib/types/auth.js';
  import { COLUMN_WIDTHS, getFeedTypeIcon } from '../types.js';
  import { avatarCache } from '$lib/stores/avatarCache.svelte.js';
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
  let showAccountSwitcher = $state(false);
  let accountSwitcherPosition = $state({ x: 0, y: 0 });

  // ===================================================================
  // アバター表示用のロジック - アバターキャッシュ統合
  // ===================================================================
  
  /**
   * 表示対象アカウントの決定（マルチアカウント対応）
   * 全アカウント選択時は targetAccounts または allAccounts を使用、単一選択時は activeAccount を使用
   */
  const displayAccounts = $derived.by((): Account[] => {
    try {
      if (accountId === 'all') {
        // 全アカウント選択時：優先度は targetAccounts > allAccounts > activeAccount
        if (column.targetAccounts && column.targetAccounts.length > 0) {
          console.log(`🎭 [DeckColumn] Using targetAccounts for 'all' (${column.targetAccounts.length} accounts)`);
          
          // 各アカウントのアバターを並行でプリフェッチ
          column.targetAccounts.forEach(account => {
            avatarCache.getAvatar(account.profile.did).catch((error) => {
              console.warn(`🎭 [DeckColumn] Avatar cache prefetch failed for ${account.profile.did}:`, error);
            });
          });
          
          return column.targetAccounts;
        } else if (allAccounts.length > 0) {
          // 新しいフォールバック：allAccounts を使用
          console.log(`🎭 [DeckColumn] Using allAccounts for 'all' (${allAccounts.length} accounts)`);
          
          // 各アカウントのアバターを並行でプリフェッチ
          allAccounts.forEach(account => {
            avatarCache.getAvatar(account.profile.did).catch((error) => {
              console.warn(`🎭 [DeckColumn] Avatar cache prefetch failed for ${account.profile.did}:`, error);
            });
          });
          
          return allAccounts;
        } else {
          // 最終フォールバック：activeAccount を使用
          console.warn(`🎭 [DeckColumn] No targetAccounts/allAccounts found for 'all', falling back to activeAccount`);
          return activeAccount ? [activeAccount] : [];
        }
      }
      
      // 単一アカウント選択時：activeAccount を使用
      if (activeAccount) {
        console.log(`🎭 [DeckColumn] Using activeAccount for ${accountId}:`, {
          did: activeAccount.profile.did,
          handle: activeAccount.profile.handle,
          displayName: activeAccount.profile.displayName,
          hasAvatar: !!activeAccount.profile.avatar
        });
        
        // アバターキャッシュへのプリフェッチ
        avatarCache.getAvatar(activeAccount.profile.did).catch((error) => {
          console.warn(`🎭 [DeckColumn] Avatar cache prefetch failed for ${activeAccount.profile.did}:`, error);
        });
        
        return [activeAccount];
      } else {
        console.warn(`🎭 [DeckColumn] No activeAccount available for ${accountId}`);
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
  });

  onDestroy(() => {
    // クリーンアップ（コールバック経由）
    if (onScrollElementUpdate) {
      onScrollElementUpdate(column.id, undefined);
    }
  });

  // ===================================================================
  // イベントハンドラー
  // ===================================================================


  /**
   * リフレッシュ（現在は仮実装）
   */
  async function handleRefresh() {
    if (isRefreshing) return;

    try {
      isRefreshing = true;
      console.log('🎛️ [DeckColumn] Refreshing column:', column.id);
      
      // 仮のリフレッシュ処理（2秒待機）
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 実際のAPI呼び出しはここで実装
      // await fetchColumnData();
      
    } catch (error) {
      console.error('🎛️ [DeckColumn] Failed to refresh column:', error);
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
    if (account === 'all') {
      console.log('Selected all accounts for deck');
      // 全アカウント選択時
      await deckStore.updateColumnAccount(column.id, 'all', allAccounts);
    } else {
      console.log('Selected account for deck:', account.profile.handle);
      // 単一アカウント選択時
      await deckStore.updateColumnAccount(column.id, account.profile.did);
    }
    showAccountSwitcher = false;
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
      onclick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        accountSwitcherPosition = { x: rect.left, y: rect.bottom + 8 };
        showAccountSwitcher = !showAccountSwitcher;
      }}
      aria-label="デッキのアカウントを切り替え"
      title="デッキのアカウントを切り替え"
    >
      <AvatarGroup 
        accounts={displayAccounts} 
        size="sm" 
        maxDisplay={4}
        clickable={true}
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
          {#if accountId === 'all' && displayAccounts.length > 1}
            すべてのアカウント ({displayAccounts.length})
          {:else if displayAccounts.length > 0}
            @{displayAccounts[0].profile.handle}
          {:else}
            @{accountId || 'user'}
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
    <!-- 空状態（現在の実装） -->
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

    <!-- 将来: タイムラインコンテンツがここに表示される -->
    <!-- {#if column.data.feed.length > 0}
      <div class="deck-column__feed">
        {#each column.data.feed as post}
          <PostCard {post} />
        {/each}
      </div>
    {/if} -->
  </div>
</div>

<!-- アカウント切り替えモーダル -->
{#if showAccountSwitcher && allAccounts}
  <AccountSwitcher
    isOpen={showAccountSwitcher}
    accounts={allAccounts}
    activeAccount={activeAccount || null}
    position={accountSwitcherPosition}
    isMobile={windowWidth < 768}
    showAllAccountsOption={true}
    isAllAccountsSelected={accountId === 'all'}
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