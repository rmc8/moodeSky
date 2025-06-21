<!--
  MobileDeckTabs.svelte
  モバイル用デッキタブバー
  
  配置: 画面最上部（固定位置）
  特徴: 横スクロール対応、アイコンのみ表示
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
  
  // カラムを切り替える
  function switchColumn(columnId: string) {
    // ステート更新
    deckStore.state.activeColumnId = columnId;
    
    // カスタムイベントを発行してDeckContainerに通知
    const event = new CustomEvent('tabColumnSwitch', {
      detail: { columnId },
      bubbles: true
    });
    window.dispatchEvent(event);
    
    console.log('🎛️ [MobileDeckTabs] Switched to column:', columnId);
  }
  
</script>

<!-- モバイルデッキタブバー -->
<div 
  class="fixed left-0 right-0 z-40 bg-card border-b-2 border-themed shadow-sm mobile-deck-tabs"
  style="top: env(safe-area-inset-top, 0px);"
  role="tablist"
  aria-label={t('deck.tabs.tabArea')}
>
  <div class="flex overflow-x-auto scrollbar-hide px-2 pt-1.5 pb-1">
    {#if columns.length > 0}
      <!-- 実際のカラムタブ表示 -->
      {#each columns as column}
        <button
          class="tab-button flex-shrink-0 flex items-center justify-center w-9 h-9 mx-1 rounded-xl transition-all duration-200 active:scale-90 {column.id === activeColumnId ? 'bg-primary/20 shadow-sm' : 'bg-muted/50 hover:bg-muted/70 hover:shadow-sm'}"
          role="tab"
          aria-selected={column.id === activeColumnId}
          aria-label={column.settings.title}
          title={column.settings.title}
          onclick={() => switchColumn(column.id)}
        >
          <!-- アイコンのみ表示 -->
          <Icon 
            icon={getColumnIcon(column)}
            size="md"
            color={column.id === activeColumnId ? 'primary' : 'themed'}
            decorative={true}
            class="tab-icon {column.id === activeColumnId ? 'opacity-100' : 'opacity-80'}"
          />
        </button>
      {/each}
    {:else}
      <!-- カラムがない場合のプレースホルダー -->
      <div class="flex-shrink-0 flex items-center justify-center w-9 h-9 mx-1 rounded-xl bg-muted/50">
        <Icon 
          icon={ICONS.INBOX}
          size="md"
          color="inactive"
          decorative={true}
          class="opacity-60"
        />
      </div>
    {/if}
  </div>
</div>

<!-- スペース確保は+page.svelteのpaddingで統一管理 -->

<style>
  .mobile-deck-tabs {
    /* セーフエリア対応でのタブバー高さ - 16px削減 */
    height: calc(48px + env(safe-area-inset-top, 0px));
  }
  
  /* iOS対応 */
  @supports (padding: max(0px)) {
    .mobile-deck-tabs {
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);
    }
  }
  
  /* タブボタンの視覚的強化 */
  .tab-button {
    /* より滑らかなアニメーション */
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
    
    /* タップフィードバック強化 */
    transform-origin: center;
    
    /* ホバー時の微細な変化 */
    will-change: transform, box-shadow, background-color;
  }
  
  /* アクティブタブの強調 */
  .tab-button[aria-selected="true"] {
    transform: scale(1.05);
    border: 1px solid rgb(var(--primary) / 0.3);
  }
  
  /* アイコンの視認性向上 */
  .tab-button :global(.tab-icon) {
    transition: opacity 150ms ease-in-out;
  }
  
  /* パフォーマンス最適化 */
  .tab-button {
    backface-visibility: hidden;
    -webkit-font-smoothing: antialiased;
  }
  
  /* フォーカス状態のアクセシビリティ */
  .tab-button:focus-visible {
    outline: 2px solid rgb(var(--primary) / 0.6);
    outline-offset: 2px;
  }
</style>