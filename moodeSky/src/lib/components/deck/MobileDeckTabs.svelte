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
  import { dndzone, SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import type { ColumnDndEvent } from '$lib/types/dragDrop.js';
  import { createDragDropHandlers, createColumnSwitcher, DRAG_DROP_CONFIG } from '$lib/utils/dragDropHandlers.js';
  import { debugLog } from '$lib/utils/debugUtils.js';
  
  // リアクティブ翻訳システム
  const { t } = useTranslation();
  
  // デッキストアから実際のカラムデータを取得（リアクティブ）
  const columns = $derived(deckStore.columns);
  const activeColumnId = $derived(deckStore.state.activeColumnId);
  
  // ドラッグ&ドロップハンドラーの初期化（条件付き有効化対応）
  const dragHandlers = createDragDropHandlers(
    deckStore,
    'MobileDeckTabs',
    {
      onFinalizeExtra: () => {
        // モバイルでの触覚フィードバック
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 30, 50]);
        }
      },
      enableAutoRollback: true
    }
  );
  
  const { handleConsider, handleFinalize, zoneId, isAllowed } = dragHandlers;
  
  // ドラッグ有効/無効の判定（リアクティブ）
  const isDragEnabled = $derived(isAllowed() && columns.length > 1);
  
  // ドラッグ無効時のメッセージ（デバッグ用）
  $effect(() => {
    if (!isAllowed()) {
      debugLog(`🚫 [MobileDeckTabs] Drag disabled - not allowed on current device`);
    } else if (columns.length <= 1) {
      debugLog(`🚫 [MobileDeckTabs] Drag disabled - insufficient columns (${columns.length})`);
    } else {
      debugLog(`✅ [MobileDeckTabs] Drag enabled - ${columns.length} columns`);
    }
  });
  
  // カラム切り替え関数
  const switchColumn = createColumnSwitcher(deckStore, 'MobileDeckTabs');
  
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
    use:dndzone={DRAG_DROP_CONFIG.createDndZoneOptions(columns, zoneId)}
    onconsider={handleConsider}
    onfinalize={handleFinalize}
    role="presentation"
  >
    {#if columns.length > 0}
      <!-- 実際のカラムタブ表示 -->
      {#each columns as column (`${column.id}${(column as any)[SHADOW_ITEM_MARKER_PROPERTY_NAME] ? '_shadow_placeholder' : ''}`)}
        <button
          class="flex-shrink-0 flex items-center justify-center w-9 h-9 mx-1 rounded-xl transition-all duration-200 ease-out active:scale-90 focus-ring-subtle focus-visible:outline-2 focus-visible:outline-primary/60 focus-visible:outline-offset-1"
          data-is-dnd-shadow-item-hint={(column as any)[SHADOW_ITEM_MARKER_PROPERTY_NAME]}
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
          animate:flip={{ duration: DRAG_DROP_CONFIG.flipDurationMs }}
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