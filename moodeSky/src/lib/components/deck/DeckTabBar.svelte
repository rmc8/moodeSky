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

<!-- デッキタブバー -->
<div class="flex-1 flex flex-col min-h-0 bg-card">
  <div class="flex-1 overflow-y-auto p-2 flex flex-col gap-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/30 hover:scrollbar-thumb-primary/50">
    {#if columns.length > 0}
      <!-- 実際のカラムタブ表示 -->
      {#each columns as column}
        <button
          class="w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ease-out text-left bg-card text-themed border border-transparent hover:bg-primary-hover hover:border-primary-border active:scale-98 focus-visible:outline-2 focus-visible:outline-primary-outline focus-visible:outline-offset-2"
          class:bg-primary-active={column.id === activeColumnId}
          class:border-primary-border-active={column.id === activeColumnId}
          class:text-primary={column.id === activeColumnId}
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
          <span class="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis flex-1">
            {column.settings.title}
          </span>
        </button>
      {/each}
    {:else}
      <!-- カラムがない場合のメッセージ -->
      <div class="flex-1 flex flex-col items-center justify-center p-8 px-4 text-center gap-4">
        <Icon 
          icon={ICONS.INBOX}
          size="lg"
          color="inactive"
          decorative={true}
          class="deck-tab-bar__empty-icon"
        />
        <p class="text-sm text-themed opacity-60">カラムがありません</p>
      </div>
    {/if}
  </div>
</div>