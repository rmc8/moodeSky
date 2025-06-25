<!--
  DeckSettingsModal.svelte
  デッキグローバル設定モーダル
  
  統一Modalコンポーネントをベースにしたデッキ全体の設定管理
  自動更新間隔、表示形式、キーボードショートカット等の設定
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import { deckStore } from '../store.svelte.js';
  import type { ColumnWidth } from '../types.js';
  import { COLUMN_WIDTHS } from '../types.js';
  import * as m from '../../../paraglide/messages.js';

  // ===================================================================
  // Props
  // ===================================================================

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    zIndex?: number;
    deckId?: string;
    deckTitle?: string;
  }

  const { isOpen, onClose, zIndex = 9999, deckId, deckTitle = 'デッキ' }: Props = $props();
  

  // ===================================================================
  // 状態管理
  // ===================================================================

  let isSaving = $state(false);
  let isDeleting = $state(false);
  let showDeleteConfirmation = $state(false);
  
  // デッキ名前変更用
  let deckName = $state(deckTitle);
  let originalDeckName = deckTitle;
  
  // レスポンシブ対応
  let windowWidth = $state(768);
  
  // デッキサイズ変更用
  let currentDeckSize = $state<ColumnWidth>('medium');
  let isSavingSize = $state(false);

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  /**
   * デッキ名前を保存する
   */
  async function handleSaveName() {
    if (isSaving || !deckId || deckName.trim() === '') return;

    try {
      isSaving = true;
      
      // TODO: deckStore.updateDeckName(deckId, deckName.trim());
      console.log('🎛️ [DeckSettings] Deck name update:', { deckId, newName: deckName.trim() });
      
      originalDeckName = deckName.trim();
      onClose();
    } catch (error) {
      console.error('🎛️ [DeckSettings] Failed to save deck name:', error);
      alert('デッキ名の変更に失敗しました');
    } finally {
      isSaving = false;
    }
  }

  /**
   * デッキを削除する
   */
  async function handleDeleteDeck() {
    if (isDeleting || !deckId) return;

    try {
      isDeleting = true;
      
      // TODO: deckStore.deleteDeck(deckId);
      console.log('🎛️ [DeckSettings] Deck deletion:', { deckId });
      
      onClose();
    } catch (error) {
      console.error('🎛️ [DeckSettings] Failed to delete deck:', error);
      alert('デッキの削除に失敗しました');
    } finally {
      isDeleting = false;
      showDeleteConfirmation = false;
    }
  }

  /**
   * デッキサイズを変更する
   */
  async function handleSizeSave(size: ColumnWidth) {
    if (isSavingSize || !deckId) return;

    try {
      isSavingSize = true;
      
      // TODO: deckStore.updateDeckSize(deckId, size);
      console.log('🎛️ [DeckSettings] Deck size update:', { deckId, newSize: size });
      
      currentDeckSize = size;
    } catch (error) {
      console.error('🎛️ [DeckSettings] Failed to save deck size:', error);
      alert('デッキサイズの変更に失敗しました');
    } finally {
      isSavingSize = false;
    }
  }

  /**
   * キャンセル時の処理
   */
  function handleCancel() {
    // 元のデッキ名に戻す
    deckName = originalDeckName;
    onClose();
  }

  // ===================================================================
  // ライフサイクル
  // ===================================================================

  onMount(() => {
    // レスポンシブ状態の初期化
    if (typeof window !== 'undefined') {
      windowWidth = window.innerWidth;
      
      const handleResize = () => {
        windowWidth = window.innerWidth;
      };
      
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  });

  // ===================================================================
  // リアクティブ監視
  // ===================================================================

  // デッキ名が変更されたかチェック
  const nameChanged = $derived(deckName.trim() !== originalDeckName && deckName.trim() !== '');
  
  // プロップスの変更を監視してローカル状態を更新
  $effect(() => {
    if (deckTitle !== originalDeckName) {
      deckName = deckTitle;
      originalDeckName = deckTitle;
    }
  });

  // デッキサイズの初期化（deckStoreから取得）
  $effect(() => {
    if (isOpen && deckId && deckStore.columns.length > 0) {
      // TODO: 実際のデッキサイズをdeckStoreから取得
      // const column = deckStore.columns.find(c => c.accountId === deckId);
      // if (column) {
      //   currentDeckSize = column.settings.width;
      // }
      console.log('🎛️ [DeckSettings] Initializing deck size for:', deckId);
    }
  });
</script>

<Modal
  {isOpen}
  {onClose}
  title="{deckTitle} の設定"
  size="md"
  {zIndex}
>
  <div class="space-y-7">
    <!-- デッキ名変更 -->
    <div>
      <label for="deck-name" class="block text-sm font-medium text-themed mb-3">
        デッキ名
      </label>
      <div class="relative">
        <input
          id="deck-name"
          type="text"
          bind:value={deckName}
          class="w-full px-4 py-3 border border-gray-300 rounded-xl bg-card text-themed placeholder-secondary transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none hover:border-primary/50"
          placeholder="デッキ名を入力"
          maxlength="50"
        />
        <div class="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-transparent opacity-0 transition-opacity duration-200 pointer-events-none focus-within:opacity-100"></div>
      </div>
      <p class="text-xs text-secondary mt-2">
        このデッキの表示名を設定します
      </p>
      {#if nameChanged}
        <div class="mt-3 flex gap-2">
          <button
            class="button-primary px-4 py-2 text-sm"
            onclick={handleSaveName}
            disabled={isSaving}
          >
            {#if isSaving}
              <Icon icon={ICONS.LOADER} size="sm" class="animate-spin mr-2" />
              保存中...
            {:else}
              <Icon icon={ICONS.CHECK} size="sm" class="mr-2" />
              名前を変更
            {/if}
          </button>
          <button
            class="text-secondary hover:text-themed transition-colors px-4 py-2 text-sm"
            onclick={() => deckName = originalDeckName}
          >
            キャンセル
          </button>
        </div>
      {/if}
    </div>

    <!-- デッキサイズ設定（デスクトップのみ） -->
    {#if windowWidth >= 768}
      <div>
        <label for="deck-size" class="block text-sm font-medium text-themed mb-3">
          デッキサイズ
        </label>
        <p class="text-xs text-secondary mb-4">
          デスクトップでのカラム幅を選択
        </p>
        <div class="relative">
          <select
            id="deck-size"
            bind:value={currentDeckSize}
            onchange={() => handleSizeSave(currentDeckSize)}
            disabled={isSavingSize}
            class="w-full px-4 py-3 border border-gray-300 rounded-xl bg-card text-themed appearance-none cursor-pointer transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#each Object.entries(COLUMN_WIDTHS) as [width, info]}
              <option value={width}>{info.label} ({info.width}px)</option>
            {/each}
          </select>
          <!-- カスタム矢印アイコン -->
          <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Icon icon={ICONS.EXPAND_MORE} size="sm" color="secondary" />
          </div>
        </div>
        {#if isSavingSize}
          <div class="mt-3 flex items-center gap-2 text-sm text-secondary">
            <Icon icon={ICONS.LOADER} size="sm" class="animate-spin" />
            サイズを変更中...
          </div>
        {/if}
      </div>
    {/if}

    <!-- デッキ削除 -->
    <div class="pt-6 border-t border-gray-200">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h4 class="text-sm font-medium text-themed mb-1">デッキの削除</h4>
          <p class="text-xs text-secondary">このデッキを削除します。この操作は取り消せません。</p>
        </div>
        
        <div class="ml-4 flex-shrink-0">
          {#if !showDeleteConfirmation}
            <button
              class="px-4 py-2 bg-error hover:bg-error/90 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:shadow-md"
              onclick={() => showDeleteConfirmation = true}
            >
              削除
            </button>
          {:else}
            <div class="flex gap-2">
              <button
                class="px-4 py-2 bg-error hover:bg-error/90 text-white text-sm font-medium rounded-lg transition-all duration-200"
                onclick={handleDeleteDeck}
                disabled={isDeleting}
              >
                {#if isDeleting}
                  <Icon icon={ICONS.LOADER} size="sm" class="animate-spin" />
                {:else}
                  削除する
                {/if}
              </button>
              <button
                class="px-4 py-2 text-secondary hover:text-themed text-sm font-medium rounded-lg transition-colors"
                onclick={() => showDeleteConfirmation = false}
              >
                キャンセル
              </button>
            </div>
          {/if}
        </div>
      </div>
      
      {#if showDeleteConfirmation}
        <div class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-600">
            「{deckTitle}」を削除しますか？この操作は取り消せません。
          </p>
        </div>
      {/if}
    </div>
  </div>
</Modal>

