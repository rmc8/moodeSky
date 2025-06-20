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
  import * as m from '$paraglide/messages.js';

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

  const columnStyle = $derived(() => {
    const width = COLUMN_WIDTHS[column.settings.width];
    return `width: ${width.width}px; min-width: ${width.width}px;`;
  });

  // ===================================================================
  // ライフサイクル
  // ===================================================================

  onMount(() => {
    // スクロール要素を登録
    if (scrollElement) {
      column.scrollElement = scrollElement;
    }

    console.log('🎛️ [DeckColumn] Column mounted:', column.id, column.algorithm.name);
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
  class="deck-column"
  class:deck-column--minimized={column.settings.isMinimized}
  class:deck-column--pinned={column.settings.isPinned}
  style={columnStyle}
>
  <!-- カラムヘッダー -->
  <header class="deck-column__header">
    <!-- タイトル部分（クリックでトップスクロール） -->
    <button 
      class="deck-column__title-button"
      onclick={handleHeaderClick}
    >
      <div class="deck-column__icon">
        {#if column.algorithm.type === 'home'}
          <Icon icon={ICONS.HOME} size="md" color="primary" />
        {:else if column.algorithm.type === 'notifications'}
          <Icon icon={ICONS.NOTIFICATIONS} size="md" color="primary" />
        {:else}
          <Icon icon={ICONS.FEED} size="md" color="primary" />
        {/if}
      </div>
      
      <div class="deck-column__title-info">
        <h3 class="deck-column__title text-themed">
          {column.algorithm.name}
        </h3>
        <p class="deck-column__subtitle text-themed opacity-60">
          @{accountId.split('.')[0] || 'user'}
        </p>
      </div>
    </button>

    <!-- ヘッダーボタン -->
    <div class="deck-column__actions">
      <!-- リフレッシュボタン -->
      <button 
        class="deck-column__action-button"
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
        class="deck-column__action-button"
        onclick={toggleSettings}
        class:deck-column__action-button--active={showSettings}
        aria-label={m['deck.column.settings']()}
      >
        <Icon icon={ICONS.SETTINGS} size="sm" color="themed" />
      </button>
    </div>

    <!-- 設定ドロップダウン -->
    {#if showSettings}
      <div class="deck-column__settings">
        <!-- カラム幅設定 -->
        <div class="settings-section">
          <h4 class="settings-section__title text-themed">
            {m['deck.column.width']()}
          </h4>
          <div class="settings-section__content">
            {#each Object.entries(COLUMN_WIDTHS) as [width, info]}
              <button
                class="width-option"
                class:width-option--active={column.settings.width === width}
                onclick={() => handleWidthChange(width as ColumnWidth)}
              >
                <span class="width-option__label text-themed">{info.label}</span>
                <span class="width-option__size text-themed opacity-60">{info.width}px</span>
              </button>
            {/each}
          </div>
        </div>

        <!-- 削除ボタン -->
        <div class="settings-section">
          <button 
            class="settings-danger-button"
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
    class="deck-column__content"
    bind:this={scrollElement}
  >
    <!-- 空状態（現在の実装） -->
    <div class="deck-column__empty">
      <div class="deck-column__empty-icon">
        <Icon icon={ICONS.INBOX} size="lg" color="themed" />
      </div>
      <h4 class="deck-column__empty-title text-themed">
        {m['deck.column.empty.title']()}
      </h4>
      <p class="deck-column__empty-description text-themed opacity-70">
        {m['deck.column.empty.description']()}
      </p>
      <button 
        class="deck-column__empty-button button-primary"
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
  .deck-column {
    display: flex;
    flex-direction: column;
    background-color: var(--color-card);
    border: 1px solid rgb(var(--border) / 0.2);
    border-radius: 0.5rem;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    overflow: hidden;
    position: relative;
    height: calc(100vh - 200px); /* 調整可能 */
    transition: width 0.2s ease-in-out;
  }
  
  .deck-column--minimized {
    width: 80px !important;
    min-width: 80px !important;
  }
  
  .deck-column--pinned {
    border-color: rgb(var(--primary) / 0.4);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }
  
  /* モバイル対応 */
  @media (max-width: 767px) {
    .deck-column {
      width: calc(100vw - 32px) !important;
      min-width: calc(100vw - 32px) !important;
      scroll-snap-align: start;
    }
  }
  
  /* ヘッダー */
  .deck-column__header {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    border-bottom: 1px solid rgb(var(--border) / 0.2);
    background-color: rgb(var(--card) / 0.8);
    backdrop-filter: blur(8px);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  
  .deck-column__title-button {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
    min-width: 0;
    text-align: left;
    border-radius: 0.25rem;
    padding: 0.25rem;
    transition: color 150ms, background-color 150ms;
  }
  
  .deck-column__title-button:hover {
    background-color: rgb(var(--muted) / 0.1);
  }
  
  .deck-column__icon {
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.25rem;
    background-color: rgb(var(--primary) / 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .deck-column__title-info {
    flex: 1;
    min-width: 0;
  }
  
  .deck-column__title {
    font-weight: 600;
    font-size: 0.875rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .deck-column__subtitle {
    font-size: 0.75rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .deck-column__actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .deck-column__action-button {
    width: 2rem;
    height: 2rem;
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 150ms, background-color 150ms;
  }
  
  .deck-column__action-button:hover {
    background-color: rgb(var(--muted) / 0.2);
  }
  
  .deck-column__action-button--active {
    background-color: rgb(var(--primary) / 0.1);
    color: var(--color-primary);
  }
  
  .deck-column__action-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* 設定ドロップダウン */
  .deck-column__settings {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.25rem;
    background-color: var(--color-card);
    border: 1px solid rgb(var(--border) / 0.2);
    border-radius: 0.5rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    padding: 0.75rem;
    min-width: 16rem;
    z-index: 20;
  }
  
  .settings-section {
    margin-bottom: 1rem;
  }
  
  .settings-section:last-child {
    margin-bottom: 0;
  }
    
  .settings-section__title {
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }
    
  .settings-section__content > * + * {
    margin-top: 0.25rem;
  }
  
  .width-option {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem;
    border-radius: 0.25rem;
    text-align: left;
    transition: color 150ms, background-color 150ms;
  }
  
  .width-option:hover {
    background-color: rgb(var(--muted) / 0.1);
  }
    
  .width-option--active {
    background-color: rgb(var(--primary) / 0.1);
    color: var(--color-primary);
  }
    
  .width-option__label {
    font-size: 0.875rem;
  }
    
  .width-option__size {
    font-size: 0.75rem;
  }
  
  .settings-danger-button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border-radius: 0.25rem;
    color: var(--color-error);
    transition: color 150ms, background-color 150ms;
  }
  
  .settings-danger-button:hover {
    background-color: rgb(var(--error) / 0.1);
  }
  
  /* コンテンツ */
  .deck-column__content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }
  
  /* スクロールバースタイリング */
  .deck-column__content::-webkit-scrollbar {
    width: 0.25rem;
  }
  
  .deck-column__content::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .deck-column__content::-webkit-scrollbar-thumb {
    background-color: rgb(var(--foreground) / 0.2);
    border-radius: 9999px;
  }
  
  .deck-column__content::-webkit-scrollbar-thumb:hover {
    background-color: rgb(var(--foreground) / 0.4);
  }
  
  /* 空状態 */
  .deck-column__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 1.5rem;
    text-align: center;
  }
  
  .deck-column__empty-icon {
    margin-bottom: 1rem;
    opacity: 0.4;
  }
  
  .deck-column__empty-title {
    font-weight: 500;
    margin-bottom: 0.5rem;
  }
  
  .deck-column__empty-description {
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
    max-width: 12rem;
  }
  
  .deck-column__empty-button {
    font-size: 0.875rem;
    padding: 0.5rem 1rem;
  }
</style>