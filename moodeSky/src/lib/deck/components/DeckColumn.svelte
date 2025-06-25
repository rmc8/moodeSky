<!--
  DeckColumn.svelte
  個別デッキカラム
  
  tokimekiblueskyのDeckRow.svelteを参考にしつつ、
  moodeSky独自のシンプル実装（最初は空カラム表示のみ）
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import { deckStore } from '../store.svelte.js';
  import type { Column, ColumnWidth } from '../types.js';
  import { COLUMN_WIDTHS, getFeedTypeIcon } from '../types.js';
  import * as m from '../../../paraglide/messages.js';

  // ===================================================================
  // Props
  // ===================================================================

  interface Props {
    column: Column;
    index: number;
    accountId: string;
    onScrollElementUpdate?: (columnId: string, element: HTMLElement | undefined) => void;
    onOpenDeckSettings?: () => void;
  }

  const { column, index, accountId, onScrollElementUpdate, onOpenDeckSettings }: Props = $props();
  

  // ===================================================================
  // 状態管理
  // ===================================================================

  let scrollElement: HTMLElement;
  let isRefreshing = $state(false);

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
    <!-- タイトル部分（クリックでトップスクロール） -->
    <button 
      class="flex items-center gap-3 flex-1 min-w-0 text-left rounded p-1 transition-colors hover:bg-muted/10"
      onclick={handleHeaderClick}
    >
      <div class="flex-shrink-0 w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
        <Icon icon={getFeedTypeIcon(column.algorithm)} size="md" color="primary" />
      </div>
      
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold text-sm text-themed truncate">
          {column.settings.title}
        </h3>
        <p class="text-xs text-themed opacity-60 truncate">
          @{accountId.split('.')[0] || 'user'}
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