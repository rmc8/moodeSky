<!--
  DeckTabBar.svelte
  デスクトップ・タブレット用デッキタブバー
  
  配置: SideNavigation内（投稿ボタンの下、ナビゲーション項目の上）
  特徴: クロスプラットフォーム統合スクロールバー、アイコン+テキスト表示
  機能: カラム切り替え、タブ追加・削除
-->
<script lang="ts">
  import { useTranslation } from '$lib/utils/reactiveTranslation.svelte.js';
  import { deckStore } from '$lib/deck/store.svelte.js';
  import { getColumnIcon } from '$lib/deck/types.js';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  
  // リアクティブ翻訳システム
  const { t } = useTranslation();
  
  // デッキストアから実際のカラムデータを取得（リアクティブ）
  const columns = $derived(deckStore.columns);
  const activeColumnId = $derived(deckStore.state.activeColumnId);
  
  // デスクトップでは表示/非表示の切り替え（将来機能）
  // 現在はモバイル互換のためactiveColumnIdを更新
  function switchColumn(columnId: string) {
    // TODO: デスクトップでは個別カラムの表示/非表示切り替えに変更
    deckStore.state.activeColumnId = columnId;
    
    // デスクトップでは水平スクロールでカラムを表示
    if (window.innerWidth >= 768) {
      scrollToColumn(columnId);
    }
    
    console.log('🎛️ [DeckTabBar] Column selected:', columnId, 'Desktop mode:', window.innerWidth >= 768);
  }
  
  // デスクトップ用: 指定カラムまでスクロール
  function scrollToColumn(columnId: string) {
    const columnIndex = deckStore.columns.findIndex(col => col.id === columnId);
    if (columnIndex === -1) return;
    
    // カスタムイベントを発行してDeckContainerに通知
    const event = new CustomEvent('desktopScrollToColumn', {
      detail: { columnId, columnIndex },
      bubbles: true
    });
    window.dispatchEvent(event);
  }
  
</script>

<style>
  /* DeckTabBar ベーススタイル */
  .deck-tab-bar {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0; /* flexboxの高さ制御 */
  }
  
  .deck-tab-bar__content {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    /* スクロールバーのスタイル適用 */
    scrollbar-width: thin;
    scrollbar-color: rgb(var(--primary) / 0.3) transparent;
  }
  
  .deck-tab-bar__content::-webkit-scrollbar {
    width: 6px;
  }
  
  .deck-tab-bar__content::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .deck-tab-bar__content::-webkit-scrollbar-thumb {
    background-color: rgb(var(--primary) / 0.3);
    border-radius: 3px;
  }
  
  .deck-tab-bar__content::-webkit-scrollbar-thumb:hover {
    background-color: rgb(var(--primary) / 0.5);
  }
  
  /* タブボタン */
  .deck-tab-bar__button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
    text-align: left;
    background-color: var(--color-card);
    color: var(--color-foreground);
    border: 1px solid transparent;
  }
  
  .deck-tab-bar__button:hover {
    background-color: rgb(var(--primary) / 0.05);
    border-color: rgb(var(--primary) / 0.1);
  }
  
  .deck-tab-bar__button--active {
    background-color: rgb(var(--primary) / 0.1);
    border-color: rgb(var(--primary) / 0.3);
    color: rgb(var(--primary));
  }
  
  .deck-tab-bar__button:active {
    transform: scale(0.98);
  }
  
  .deck-tab-bar__label {
    font-size: 0.875rem;
    font-weight: 500;
    color: inherit;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }
  
  /* 空状態 */
  .deck-tab-bar__empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    text-align: center;
    gap: 1rem;
  }
  
  .deck-tab-bar__empty-icon {
    opacity: 0.6;
  }
  
  .deck-tab-bar__empty-text {
    font-size: 0.875rem;
    color: var(--color-foreground);
    opacity: 0.6;
  }
  
  /* フォーカス状態 */
  .deck-tab-bar__button:focus-visible {
    outline: 2px solid rgb(var(--primary) / 0.6);
    outline-offset: 2px;
  }
  
  /* パフォーマンス最適化 */
  .deck-tab-bar__button {
    backface-visibility: hidden;
    -webkit-font-smoothing: antialiased;
  }
</style>

<!-- デッキタブバー -->
<div class="deck-tab-bar bg-card border-t border-themed">
  <div class="deck-tab-bar__content">
    {#if columns.length > 0}
      <!-- 実際のカラムタブ表示 -->
      {#each columns as column}
        <button
          class="deck-tab-bar__button"
          class:deck-tab-bar__button--active={column.id === activeColumnId}
          role="tab"
          aria-selected={column.id === activeColumnId}
          aria-label={column.settings.title}
          onclick={() => switchColumn(column.id)}
        >
          <!-- アイコン -->
          <Icon 
            icon={getColumnIcon(column)}
            size="md"
            color={column.id === activeColumnId ? 'primary' : 'themed'}
            decorative={true}
          />
          
          <!-- タブ名 -->
          <span class="deck-tab-bar__label">
            {column.settings.title}
          </span>
        </button>
      {/each}
    {:else}
      <!-- カラムがない場合のメッセージ -->
      <div class="deck-tab-bar__empty">
        <Icon 
          icon={ICONS.INBOX}
          size="lg"
          color="inactive"
          decorative={true}
          class="deck-tab-bar__empty-icon"
        />
        <p class="deck-tab-bar__empty-text">カラムがありません</p>
      </div>
    {/if}
  </div>
</div>