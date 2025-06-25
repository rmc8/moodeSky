<!--
  MobileDeckTabs.svelte
  モバイル用デッキタブバー
  
  配置: 画面最上部（固定位置）
  特徴: 横スクロール対応、アイコンのみ表示
  機能: カラム切り替え、タブ追加・削除、ドラッグ&ドロップ
-->
<script lang="ts">
  import { useTranslation } from '$lib/utils/reactiveTranslation.svelte.js';
  import { deckStore } from '$lib/deck/store.svelte.js';
  import { getColumnIcon } from '$lib/deck/types.js';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import { dndzone } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  
  // リアクティブ翻訳システム
  const { t } = useTranslation();
  
  // デッキストアから実際のカラムデータを取得（リアクティブ）
  const columns = $derived(deckStore.columns);
  const activeColumnId = $derived(deckStore.state.activeColumnId);
  
  // ドラッグ&ドロップ設定
  const flipDurationMs = 200;
  
  // カラムを切り替える
  function switchColumn(columnId: string) {
    deckStore.state.activeColumnId = columnId;
    
    // カスタムイベントを発行してDeckContainerに通知
    const event = new CustomEvent('tabColumnSwitch', {
      detail: { columnId },
      bubbles: true
    });
    window.dispatchEvent(event);
    
    console.log('🎛️ [MobileDeckTabs] Switched to column:', columnId);
  }
  
  // ドラッグ中のハンドラ（onconsider用）
  function handleConsider(e: CustomEvent<any>) {
    const newColumns = e.detail.items;
    const info = e.detail.info;
    
    console.log('🔄 [MobileDeckTabs] Consider event:', { trigger: info?.trigger, id: info?.id });
    
    // deckStoreのカラム順序を更新
    deckStore.state.layout.columns = newColumns;
    
    // ドラッグ中のタブをアクティブに設定
    if (info && info.trigger === 'draggedEntered') {
      const draggedColumn = newColumns.find((col: any) => col.id === info.id);
      if (draggedColumn) {
        deckStore.state.activeColumnId = draggedColumn.id;
        console.log('🎯 [MobileDeckTabs] Active column changed during drag:', draggedColumn.id);
      }
    }
  }
  
  // ドラッグ完了時のハンドラ（onfinalize用）
  function handleFinalize(e: CustomEvent<any>) {
    const newColumns = e.detail.items;
    const info = e.detail.info;
    
    console.log('✅ [MobileDeckTabs] Finalize event:', { trigger: info?.trigger, id: info?.id, activeColumnId: deckStore.state.activeColumnId });
    
    // deckStoreのカラム順序を更新
    deckStore.state.layout.columns = newColumns;
    
    // 保存処理（非同期で実行）
    deckStore.save().catch(error => {
      console.error('🎛️ [MobileDeckTabs] Failed to save column order:', error);
    });
    
    // 必ず同期イベントを発火（ドラッグ完了時）
    const syncEvent = new CustomEvent('tabColumnSwitch', {
      detail: { columnId: deckStore.state.activeColumnId },
      bubbles: true
    });
    window.dispatchEvent(syncEvent);
    console.log('🔄 [MobileDeckTabs] Sync event dispatched for activeColumnId:', deckStore.state.activeColumnId);
    
    console.log('🎛️ [MobileDeckTabs] Columns reordered and sync completed');
  }
</script>

<!-- モバイルデッキタブバー -->
<div 
  class="fixed left-0 right-0 z-40 bg-card shadow-sm mobile-deck-tabs"
  style="top: env(safe-area-inset-top, 0px);"
  role="tablist"
  aria-label={t('deck.tabs.tabArea')}
>
  <div 
    class="flex overflow-x-auto scrollbar-hide px-2 pt-1.5 pb-1"
    use:dndzone={{
      items: columns,
      flipDurationMs,
      dropTargetStyle: {},
      dragDisabled: columns.length <= 1
    }}
    onconsider={handleConsider}
    onfinalize={handleFinalize}
    role="presentation"
  >
    {#if columns.length > 0}
      <!-- 実際のカラムタブ表示 -->
      {#each columns as column (column.id)}
        <button
          class="flex-shrink-0 flex items-center justify-center w-9 h-9 mx-1 rounded-xl transition-all duration-200 ease-out active:scale-90 focus-ring-subtle focus-visible:outline-2 focus-visible:outline-primary/60 focus-visible:outline-offset-1"
          class:bg-primary-active={column.id === activeColumnId}
          class:shadow-sm={column.id === activeColumnId}
          class:scale-105={column.id === activeColumnId}
          class:border={column.id === activeColumnId}
          class:border-primary-border-active={column.id === activeColumnId}
          class:bg-muted={column.id !== activeColumnId}
          class:hover:bg-muted-hover={column.id !== activeColumnId}
          class:hover:shadow-sm={column.id !== activeColumnId}
          class:cursor-grab={columns.length > 1}
          role="tab"
          aria-selected={column.id === activeColumnId}
          aria-label={`${column.settings.title}${columns.length > 1 ? ' - ドラッグで並び替え' : ''}`}
          aria-describedby={columns.length > 1 ? 'drag-instructions' : undefined}
          title={`${column.settings.title}${columns.length > 1 ? ' - ドラッグで並び替え' : ''}`}
          onclick={() => switchColumn(column.id)}
          animate:flip={{ duration: flipDurationMs }}
        >
          <!-- アイコンのみ表示 -->
          <Icon 
            icon={getColumnIcon(column)}
            size="md"
            color={column.id === activeColumnId ? 'primary' : 'themed'}
            decorative={true}
            class="transition-opacity duration-150 ease-in-out {column.id === activeColumnId ? 'opacity-100' : 'opacity-80'}"
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
  
  <!-- ドラッグ&ドロップ使用説明（スクリーンリーダー用） -->
  {#if columns.length > 1}
    <div id="drag-instructions" class="sr-only">
      長押ししてドラッグしてタブの順序を変更できます
    </div>
  {/if}
</div>

<style>
  .mobile-deck-tabs {
    /* セーフエリア対応でのタブバー高さ */
    height: calc(48px + env(safe-area-inset-top, 0px));
  }
  
  /* iOS対応 */
  @supports (padding: max(0px)) {
    .mobile-deck-tabs {
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);
    }
  }
  
  /* アクセシビリティ向上 */
  @media (prefers-reduced-motion: reduce) {
    .mobile-deck-tabs * {
      transition: none !important;
      animation: none !important;
    }
  }
  
  /* タッチデバイス最適化 */
  @media (hover: none) and (pointer: coarse) {
    .mobile-deck-tabs button {
      /* モバイルでのタッチターゲット最適化 */
      min-width: 36px;
      min-height: 36px;
    }
  }
  
  /* フォーカス状態のアクセシビリティ */
  .focus-ring-subtle:focus-visible {
    outline: 2px solid rgb(var(--primary) / 0.6);
    outline-offset: 2px;
  }
  
  /* ハイコントラストモード対応 */
  @media (prefers-contrast: high) {
    .mobile-deck-tabs button {
      border-width: 2px;
    }
  }
  
  /* スクリーンリーダー用の非表示クラス */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>