<!--
  DeckTabBar.svelte
  デスクトップ・タブレット用デッキタブバー（垂直レイアウト）
  
  配置: SideNavigation内（投稿ボタンの下、ナビゲーション項目の上）
  特徴: 垂直スクロール対応、アイコン+テキスト表示
  機能: カラム切り替え、タブ追加・削除、ドラッグ&ドロップ
-->
<script lang="ts">
  import { useTranslation } from '$lib/utils/reactiveTranslation.svelte.js';
  import { deckStore } from '$lib/deck/store.svelte.js';
  import { getColumnIcon } from '$lib/deck/types.js';
  import Icon from '$lib/components/Icon.svelte';
  import ConfirmationModal from '$lib/components/ui/ConfirmationModal.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import * as m from '../../../paraglide/messages.js';
  import { dndzone, SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import type { ColumnDndEvent } from '$lib/types/dragDrop.js';
  import { createDragDropHandlers, createColumnSwitcher, DRAG_DROP_CONFIG } from '$lib/utils/dragDropHandlers.js';
  import { debugLog, debugError } from '$lib/utils/debugUtils.js';
  
  // リアクティブ翻訳システム
  const { t } = useTranslation();
  
  // デッキストアから実際のカラムデータを取得（リアクティブ）
  const columns = $derived(deckStore.columns);
  const activeColumnId = $derived(deckStore.state.activeColumnId);
  
  // ドラッグ&ドロップハンドラーの初期化（条件付き有効化対応）
  const dragHandlers = createDragDropHandlers(
    deckStore,
    'DeckTabBar',
    {
      onFinalizeExtra: () => {
        // ドラッグ完了後にアクティブカラムをスクロール表示
        if (activeColumnId) {
          scrollToColumn(activeColumnId);
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
      debugLog(`🚫 [DeckTabBar] Drag disabled - not allowed on current device`);
    } else if (columns.length <= 1) {
      debugLog(`🚫 [DeckTabBar] Drag disabled - insufficient columns (${columns.length})`);
    } else {
      debugLog(`✅ [DeckTabBar] Drag enabled - ${columns.length} columns`);
    }
  });
  
  // 削除機能用状態管理
  let hoveredColumnId = $state<string | null>(null);
  let showDeleteConfirmation = $state(false);
  let deletingColumnId = $state<string | null>(null);
  
  // 削除対象カラムの情報を取得
  const deletingColumn = $derived(
    deletingColumnId ? columns.find(col => col.id === deletingColumnId) : null
  );
  
  // 削除確認メッセージを動的生成
  const deleteConfirmationMessage = $derived(
    deletingColumn 
      ? m['deck.column.confirmDeleteWithName']({ columnName: deletingColumn.settings.title })
      : m['deck.column.confirmDelete']()
  );
  
  // カラム切り替え関数（デスクトップ用スクロール処理付き）
  function switchColumn(columnId: string) {
    // 共通処理を実行
    const baseSwitcher = createColumnSwitcher(deckStore, 'DeckTabBar');
    baseSwitcher(columnId);
    
    // デスクトップ特有のスクロール処理
    if (window.innerWidth >= 768) {
      scrollToColumn(columnId);
    }
    
    debugLog('🎛️ [DeckTabBar] Column selected:', { columnId, desktopMode: window.innerWidth >= 768 });
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
  
  // 削除確認モーダルを開く
  function openDeleteConfirmation(columnId: string) {
    deletingColumnId = columnId;
    showDeleteConfirmation = true;
  }
  
  // 削除確認モーダルを閉じる
  function closeDeleteConfirmation() {
    showDeleteConfirmation = false;
    deletingColumnId = null;
  }
  
  // 個別カラム削除の実行
  async function handleDeleteColumn() {
    if (!deletingColumnId) return;
    
    try {
      await deckStore.removeColumn(deletingColumnId);
      debugLog('🗑️ [DeckTabBar] Column deleted:', deletingColumnId);
      
      closeDeleteConfirmation();
      
      if (deckStore.isEmpty) {
        debugLog('🗑️ [DeckTabBar] Deck is now empty after column deletion - parent component should handle default column creation');
      }
    } catch (error) {
      debugError('🗑️ [DeckTabBar] Failed to delete column:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`カラムの削除に失敗しました: ${errorMessage}`);
    }
  }
</script>

<!-- デッキタブバー（垂直レイアウト） -->
<div class="flex-1 flex flex-col min-h-0 bg-card">
  <div 
    class="flex-1 overflow-y-auto p-2 flex flex-col gap-1 scrollbar-professional"
    use:dndzone={DRAG_DROP_CONFIG.createDndZoneOptions(columns, zoneId)}
    onconsider={handleConsider}
    onfinalize={handleFinalize}
    role="presentation"
  >
    {#if columns.length > 0}
      <!-- 実際のカラムタブ表示 -->
      {#each columns as column, index (`${column.id}${(column as any)[SHADOW_ITEM_MARKER_PROPERTY_NAME] ? '_shadow_placeholder' : ''}`)}
        <div 
          class="relative w-full group"
          role="group"
          data-is-dnd-shadow-item-hint={(column as any)[SHADOW_ITEM_MARKER_PROPERTY_NAME]}
          onmouseenter={() => {
            hoveredColumnId = column.id;
          }}
          onmouseleave={() => hoveredColumnId = null}
          animate:flip={{ duration: DRAG_DROP_CONFIG.flipDurationMs }}
        >
          <button
            class="w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ease-out text-left bg-card text-themed border border-transparent hover:bg-primary-hover hover:border-primary-border active:scale-98 focus-ring-subtle focus-visible:outline-2 focus-visible:outline-primary-outline focus-visible:outline-offset-1"
            class:bg-primary-active={column.id === activeColumnId}
            class:border-primary-border-active={column.id === activeColumnId}
            class:text-primary={column.id === activeColumnId}
            class:cursor-grab={columns.length > 1}
            role="tab"
            aria-selected={column.id === activeColumnId}
            aria-label={`${column.settings.title}${columns.length > 1 ? ' - ドラッグで並び替え' : ''}`}
            aria-describedby={columns.length > 1 ? 'drag-instructions-desktop' : undefined}
            onclick={() => switchColumn(column.id)}
          >
            <!-- ドラッグハンドル（アイコン兼用） -->
            <Icon 
              icon={getColumnIcon(column)}
              size="md"
              color={column.id === activeColumnId ? 'primary' : 'themed'}
              decorative={true}
              class="transition-opacity duration-150 ease-in-out"
            />
            
            <!-- タブ名 -->
            <span class="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis flex-1">
              {column.settings.title}
            </span>
          </button>
          
          <!-- 削除ボタン (hover + active条件で表示) -->
          {#if hoveredColumnId === column.id && column.id === activeColumnId}
            <button
              class="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md bg-error/10 hover:bg-error/20 text-error hover:text-error/80 transition-all duration-150 ease-out opacity-0 group-hover:opacity-100 z-10"
              onclick={(e) => { e.stopPropagation(); openDeleteConfirmation(column.id); }}
              aria-label={m['deck.column.delete']()} 
              title={m['deck.column.delete']()}
            >
              <Icon 
                icon={ICONS.DELETE}
                size="xs"
                color="themed"
                decorative={true}
                class="!text-error"
              />
            </button>
          {/if}
        </div>
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
        <p class="text-sm text-themed opacity-60">{m['deck.noColumns']()}</p>
      </div>
    {/if}
    
    <!-- ドラッグ&ドロップ使用説明（スクリーンリーダー用） -->
    {#if columns.length > 1}
      <div id="drag-instructions-desktop" class="sr-only">
        ドラッグしてタブの順序を変更できます
      </div>
    {/if}
  </div>
</div>

<!-- 削除確認モーダル -->
<ConfirmationModal
  isOpen={showDeleteConfirmation}
  title={m['deck.column.delete']()}
  message={deleteConfirmationMessage}
  confirmText={m['common.delete']()}
  cancelText={m['common.cancel']()}
  variant="danger"
  showIcon={true}
  zIndex={9999}
  onConfirm={handleDeleteColumn}
  onCancel={closeDeleteConfirmation}
/>

<style>
  /* フォーカス状態のアクセシビリティ */
  .focus-ring-subtle:focus-visible {
    outline: 2px solid rgb(var(--primary) / 0.6);
    outline-offset: 2px;
  }
  
  /* グループホバー効果 */
  .group:hover .group-hover\:opacity-100 {
    opacity: 1;
  }
  
  /* デスクトップ最適化 */
  @media (min-width: 768px) {
    /* マウス操作での視覚的フィードバック */
    button:hover:not(.dragging) {
      transform: translateX(2px);
    }
  }
  
  /* アクセシビリティ向上 */
  @media (prefers-reduced-motion: reduce) {
    * {
      transition: none !important;
      animation: none !important;
      transform: none !important;
    }
  }
  
  /* ハイコントラストモード対応 */
  @media (prefers-contrast: high) {
    button {
      border-width: 2px !important;
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