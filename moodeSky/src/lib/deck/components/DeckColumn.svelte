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
  import { COLUMN_WIDTHS } from '../types.js';
  import * as m from '../../../paraglide/messages.js';

  // ===================================================================
  // Props
  // ===================================================================

  interface Props {
    column: Column;
    index: number;
    accountId: string;
  }

  const { column, index, accountId }: Props = $props();

  // ===================================================================
  // 状態管理
  // ===================================================================

  let scrollElement: HTMLElement;
  let showSettings = $state(false);
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
      return 'width: 100%; min-width: 100%;'; // モバイル: 強制100%
    } else {
      const width = COLUMN_WIDTHS[column.settings.width];
      return `width: ${width.width}px; min-width: ${width.width}px;`; // デスクトップ: 設定幅
    }
  });

  // ===================================================================
  // ライフサイクル
  // ===================================================================

  onMount(() => {
    // スクロール要素を登録
    if (scrollElement) {
      column.scrollElement = scrollElement;
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
    // クリーンアップ
    if (column.scrollElement) {
      column.scrollElement = undefined;
    }
  });

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  /**
   * カラム設定を開く/閉じる
   */
  function toggleSettings() {
    showSettings = !showSettings;
  }

  /**
   * カラムを削除
   */
  async function handleRemoveColumn() {
    if (confirm(m['deck.column.confirmDelete']())) {
      try {
        await deckStore.removeColumn(column.id);
        console.log('🎛️ [DeckColumn] Column removed:', column.id);
      } catch (error) {
        console.error('🎛️ [DeckColumn] Failed to remove column:', error);
      }
    }
  }

  /**
   * カラム幅を変更
   */
  async function handleWidthChange(width: ColumnWidth) {
    try {
      await deckStore.updateColumnSettings(column.id, { width });
      console.log('🎛️ [DeckColumn] Column width updated:', column.id, width);
    } catch (error) {
      console.error('🎛️ [DeckColumn] Failed to update column width:', error);
    }
  }

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
  class="flex flex-col bg-card border border-subtle rounded-lg shadow-sm overflow-hidden relative h-full transition-all duration-200"
  class:w-20={column.settings.isMinimized}
  class:border-primary-pinned={column.settings.isPinned}
  class:shadow-md={column.settings.isPinned}
  style={styleString()}
>
  <!-- カラムヘッダー -->
  <header class="flex items-center gap-2 p-3 border-b border-subtle bg-card sticky top-0 z-10">
    <!-- タイトル部分（クリックでトップスクロール） -->
    <button 
      class="flex items-center gap-3 flex-1 min-w-0 text-left rounded p-1 transition-colors hover:bg-muted/10"
      onclick={handleHeaderClick}
    >
      <div class="flex-shrink-0 w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
        {#if column.algorithm === 'reverse_chronological'}
          <Icon icon={ICONS.HOME} size="md" color="primary" />
        {:else}
          <Icon icon={ICONS.FEED} size="md" color="primary" />
        {/if}
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
      <!-- リフレッシュボタン -->
      <button 
        class="w-8 h-8 rounded flex items-center justify-center transition-colors hover:bg-muted/20 disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={handleRefresh}
        disabled={isRefreshing}
        aria-label={m['deck.column.refresh']()}
      >
        <Icon 
          icon={ICONS.REFRESH} 
          size="sm" 
          color="themed" 
          class={isRefreshing ? 'animate-spin' : ''}
        />
      </button>

      <!-- 設定ボタン -->
      <button 
        class="w-8 h-8 rounded flex items-center justify-center transition-colors hover:bg-muted/20"
        onclick={toggleSettings}
        class:bg-primary-active={showSettings} class:text-primary={showSettings}
        aria-label={m['deck.column.settings']()}
      >
        <Icon icon={ICONS.SETTINGS} size="sm" color="themed" />
      </button>
    </div>

    <!-- 設定ドロップダウン -->
    {#if showSettings}
      <div class="absolute top-full right-0 mt-1 bg-card border border-themed/20 rounded-lg shadow-lg p-3 min-w-64 z-20">
        <!-- カラム幅設定 -->
        <div class="mb-4 last:mb-0">
          <h4 class="text-sm font-medium text-themed mb-2">
            {m['deck.column.width']()}
          </h4>
          <div class="space-y-1">
            {#each Object.entries(COLUMN_WIDTHS) as [width, info]}
              <button
                class="w-full flex items-center justify-between p-2 rounded text-left transition-colors hover:bg-muted/10"
                class:bg-primary-active={column.settings.width === width} class:text-primary={column.settings.width === width}
                onclick={() => handleWidthChange(width as ColumnWidth)}
              >
                <span class="text-sm text-themed">{info.label}</span>
                <span class="text-xs text-themed opacity-60">{info.width}px</span>
              </button>
            {/each}
          </div>
        </div>

        <!-- 削除ボタン -->
        <div class="mb-4 last:mb-0">
          <button 
            class="w-full flex items-center gap-2 p-2 rounded text-error transition-colors hover:bg-error/10"
            onclick={handleRemoveColumn}
          >
            <Icon icon={ICONS.DELETE} size="sm" color="error" />
            {m['deck.column.delete']()}
          </button>
        </div>
      </div>
    {/if}
  </header>

  <!-- カラムコンテンツ -->
  <div 
    class="flex-1 overflow-y-auto overflow-x-hidden scrollbar-professional"
    bind:this={scrollElement}
  >
    <!-- 空状態（現在の実装） -->
    <div class="flex flex-col items-center justify-center h-full p-6 text-center md:p-6 max-md:pt-0 max-md:pb-15 max-md:px-2">
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
  
  /* WebKit角丸レンダリング最適化 */
  :global(.rounded-lg) {
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
    transform: translateZ(0);
  }
  
  /* モバイル特化調整: レスポンシブ高さ・幅制御 */
  @media (max-width: 767px) {
    /* モバイル固有のスタイルは現在TailwindCSSクラスで対応 */
  }
  
  /* 最小化時の特別幅設定 */
  .w-20 {
    width: 80px !important;
    min-width: 80px !important;
  }
</style>