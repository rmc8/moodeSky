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
  import ConfirmationModal from '$lib/components/ui/ConfirmationModal.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import * as m from '../../../paraglide/messages.js';
  
  // リアクティブ翻訳システム
  const { t } = useTranslation();
  
  // デッキストアから実際のカラムデータを取得（リアクティブ）
  const columns = $derived(deckStore.columns);
  const activeColumnId = $derived(deckStore.state.activeColumnId);
  
  // ===================================================================
  // 削除機能用状態管理
  // ===================================================================
  
  // hover状態管理（各タブのhover状態）
  let hoveredColumnId = $state<string | null>(null);
  
  // 削除確認モーダル状態
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
  
  // ===================================================================
  // 削除機能
  // ===================================================================
  
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
      // 指定されたカラムのみを削除
      await deckStore.removeColumn(deletingColumnId);
      console.log('🗑️ [DeckTabBar] Column deleted:', deletingColumnId);
      
      closeDeleteConfirmation();
      
      // エッジケース処理: 削除後に空になった場合
      // 親コンポーネント(deck page)の空状態検出ロジックに委ねる
      if (deckStore.isEmpty) {
        console.log('🗑️ [DeckTabBar] Deck is now empty after column deletion - parent component should handle default column creation');
      }
    } catch (error) {
      console.error('🗑️ [DeckTabBar] Failed to delete column:', error);
      // エラーの詳細表示（将来的にはtoastシステムに変更）
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`カラムの削除に失敗しました: ${errorMessage}`);
    }
  }
  
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
  <div class="flex-1 overflow-y-auto p-2 flex flex-col gap-1 scrollbar-professional">
    {#if columns.length > 0}
      <!-- 実際のカラムタブ表示 -->
      {#each columns as column}
        <div 
          class="relative w-full group"
          role="group"
          onmouseenter={() => hoveredColumnId = column.id}
          onmouseleave={() => hoveredColumnId = null}
        >
          <button
            class="w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ease-out text-left bg-card text-themed border border-transparent hover:bg-primary-hover hover:border-primary-border active:scale-98 focus-ring-subtle focus-visible:outline-2 focus-visible:outline-primary-outline focus-visible:outline-offset-1"
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