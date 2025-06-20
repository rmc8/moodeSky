<!--
  DeckContainer.svelte
  メインデッキコンテナ
  
  tokimekiblueskyのDecks.svelteを参考にしつつ、
  moodeSky独自のTauri統合・多言語対応・テーマシステム連携
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import { deckStore } from '../store.svelte.js';
  import type { Column } from '../types.js';
  import DeckColumn from './DeckColumn.svelte';
  import ColumnIndicators from './ColumnIndicators.svelte';
  import { SwipeDetector, CircularColumnNavigator, ColumnIntersectionObserver } from '../utils/swipeDetector.js';
  import * as m from '$paraglide/messages.js';

  // ===================================================================
  // Props
  // ===================================================================

  interface Props {
    accountId: string;
    className?: string;
  }

  const { accountId, className = '' }: Props = $props();

  // ===================================================================
  // 状態管理
  // ===================================================================

  let isInitializing = $state(true);
  let showAddColumnModal = $state(false);
  
  // モバイル対応
  let deckColumnsElement = $state<HTMLElement>();
  let activeColumnIndex = $state(0);
  let swipeDetector: SwipeDetector | undefined;
  let columnNavigator: CircularColumnNavigator | undefined;
  let intersectionObserver: ColumnIntersectionObserver | undefined;

  // ===================================================================
  // ライフサイクル・初期化
  // ===================================================================

  onMount(async () => {
    try {
      console.log('🎛️ [DeckContainer] Initializing for account:', accountId);
      await deckStore.initialize(accountId);
      console.log('🎛️ [DeckContainer] Deck store initialized, columns:', deckStore.columns.length);
      
      // モバイル対応の初期化
      if (deckColumnsElement && deckStore.columns.length > 0) {
        initializeMobileFeatures();
      }
    } catch (error) {
      console.error('🎛️ [DeckContainer] Failed to initialize deck store:', error);
    } finally {
      isInitializing = false;
    }
  });
  
  onDestroy(() => {
    // クリーンアップ
    swipeDetector?.destroy();
    intersectionObserver?.destroy();
  });

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  /**
   * カラム追加モーダルを開く
   */
  function handleAddColumn() {
    showAddColumnModal = true;
  }

  /**
   * カラム追加モーダルを閉じる
   */
  function handleCloseAddModal() {
    showAddColumnModal = false;
  }

  /**
   * デモ用のホームタイムラインカラムを追加
   */
  async function handleAddHomeColumn() {
    try {
      await deckStore.addColumn(accountId, {
        type: 'home',
        name: 'ホームタイムライン'
      });
      showAddColumnModal = false;
      console.log('🎛️ [DeckContainer] Home column added');
      
      // モバイル機能を再初期化
      setTimeout(() => {
        if (deckColumnsElement && deckStore.columns.length > 0) {
          initializeMobileFeatures();
        }
      }, 100);
    } catch (error) {
      console.error('🎛️ [DeckContainer] Failed to add home column:', error);
    }
  }
  
  /**
   * モバイル機能の初期化
   */
  function initializeMobileFeatures() {
    // 既存のインスタンスをクリーンアップ
    swipeDetector?.destroy();
    intersectionObserver?.destroy();
    
    // スワイプ検出
    swipeDetector = new SwipeDetector(
      deckColumnsElement,
      {
        onSwipeLeft: () => columnNavigator?.moveNext(),
        onSwipeRight: () => columnNavigator?.movePrevious()
      },
      {
        threshold: 50,
        velocity: 0.3,
        enableCircular: true
      }
    );
    
    // 循環ナビゲーション
    columnNavigator = new CircularColumnNavigator(
      deckColumnsElement,
      deckStore.columns.length,
      {
        onColumnChange: (index) => {
          activeColumnIndex = index;
        }
      }
    );
    
    // インターセクション監視
    intersectionObserver = new ColumnIntersectionObserver((index) => {
      activeColumnIndex = index;
      columnNavigator?.updateCurrentIndex(index);
    });
    
    // カラム要素を監視
    const columnElements = deckColumnsElement.querySelectorAll('.deck-column') as NodeListOf<HTMLElement>;
    intersectionObserver.observeColumns(Array.from(columnElements));
    
    console.log('🎛️ [DeckContainer] Mobile features initialized');
  }
  
  /**
   * カラムインジケーターからの選択
   */
  function handleColumnSelect(index: number) {
    columnNavigator?.scrollToColumn(index);
  }

  // ===================================================================
  // CSS変数の計算
  // ===================================================================

  $effect(() => {
    // デッキ設定に基づいてCSS変数を設定
    const settings = deckStore.deckSettings;
    const root = document.documentElement;
    
    root.style.setProperty('--deck-gap', `${settings.gap}px`);
    root.style.setProperty('--deck-padding', `${settings.padding}px`);
  });
  
  // カラム数変更の監視
  $effect(() => {
    if (deckStore.columns.length > 0 && deckColumnsElement && !isInitializing) {
      // カラム数が変更された場合の再初期化
      setTimeout(() => {
        columnNavigator?.updateTotalColumns(deckStore.columns.length);
        
        // インターセクション監視の更新
        const columnElements = deckColumnsElement.querySelectorAll('.deck-column') as NodeListOf<HTMLElement>;
        intersectionObserver?.observeColumns(Array.from(columnElements));
      }, 100);
    }
  });
</script>

<!-- デッキコンテナ -->
<div class="deck-container {className}" class:deck-container--loading={isInitializing}>
  
  {#if isInitializing}
    <!-- 初期化中 -->
    <div class="deck-loading">
      <div class="deck-loading__spinner">
        <Icon icon={ICONS.LOADER} size="lg" color="primary" />
      </div>
      <p class="deck-loading__text text-themed opacity-70">
        {m['deck.loading']()}
      </p>
    </div>
    
  {:else if deckStore.isEmpty}
    <!-- 空デッキ状態 -->
    <div class="deck-empty">
      <div class="deck-empty__content">
        <div class="deck-empty__icon">
          <Icon icon={ICONS.COLUMNS} size="xl" color="themed" />
        </div>
        
        <h2 class="deck-empty__title text-themed">
          {m['deck.empty.title']()}
        </h2>
        
        <p class="deck-empty__description text-themed opacity-70">
          {m['deck.empty.description']()}
        </p>
        
        <button 
          class="deck-empty__button button-primary"
          onclick={handleAddColumn}
        >
          <Icon icon={ICONS.ADD} size="sm" color="themed" />
          {m['deck.empty.addFirstColumn']()}
        </button>
      </div>
    </div>
    
  {:else}
    <!-- デッキカラム表示 -->
    <div class="deck-columns" bind:this={deckColumnsElement}>
      <!-- カラム一覧 -->
      {#each deckStore.columns as column, index (column.id)}
        <DeckColumn
          {column}
          {index}
          {accountId}
        />
      {/each}
      
      <!-- カラム追加ボタン -->
      <div class="deck-add-column">
        <button 
          class="deck-add-column__button"
          onclick={handleAddColumn}
          aria-label={m['deck.addColumn']()}
        >
          <Icon icon={ICONS.ADD} size="lg" color="primary" />
        </button>
      </div>
    </div>
    
    <!-- モバイル用カラムインジケーター -->
    {#if deckStore.columns.length > 0}
      <ColumnIndicators
        columns={deckStore.columns}
        activeIndex={activeColumnIndex}
        onColumnSelect={handleColumnSelect}
      />
    {/if}
  {/if}

  <!-- エラー表示 -->
  {#if deckStore.error}
    <div class="deck-error">
      <Icon icon={ICONS.ERROR} size="md" color="error" />
      <span class="text-error">{deckStore.error}</span>
    </div>
  {/if}
</div>

<!-- カラム追加モーダル（仮実装） -->
{#if showAddColumnModal}
  <div 
    class="modal-overlay" 
    onclick={handleCloseAddModal}
    onkeydown={(e) => e.key === 'Escape' && handleCloseAddModal()}
    role="dialog" 
    aria-modal="true"
    tabindex="0"
  >
    <div 
      class="modal-content" 
      onclick={(e) => e.stopPropagation()}
      role="document"
    >
      <div class="modal-header">
        <h3 class="text-themed text-lg font-semibold">
          {m['deck.addColumn']()}
        </h3>
        <button 
          class="modal-close"
          onclick={handleCloseAddModal}
          aria-label={m['common.close']()}
        >
          <Icon icon={ICONS.CLOSE} size="md" color="themed" />
        </button>
      </div>
      
      <div class="modal-body">
        <p class="text-themed opacity-70 mb-4">
          {m['deck.selectColumnType']()}
        </p>
        
        <!-- デモ用ホームタイムラインボタン -->
        <button 
          class="column-type-button"
          onclick={handleAddHomeColumn}
        >
          <Icon icon={ICONS.HOME} size="md" color="primary" />
          <div class="column-type-info">
            <h4 class="text-themed font-medium">ホームタイムライン</h4>
            <p class="text-themed opacity-60 text-sm">フォロー中のユーザーの投稿</p>
          </div>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .deck-container {
    width: 100%;
    height: 100%;
    position: relative;
  }
  
  .deck-container--loading {
    overflow: hidden;
  }
  
  /* 初期化中 */
  .deck-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 1rem;
  }
  
  .deck-loading__spinner {
    animation: spin 1s linear infinite;
  }
  
  /* 空デッキ状態 */
  .deck-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
  }
  
  .deck-empty__content {
    text-align: center;
    max-width: 28rem;
  }
  
  .deck-empty__icon {
    margin-bottom: 1.5rem;
    opacity: 0.4;
  }
  
  .deck-empty__title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }
  
  .deck-empty__description {
    font-size: 1rem;
    margin-bottom: 2rem;
    line-height: 1.625;
  }
  
  .deck-empty__button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  /* デッキカラム */
  .deck-columns {
    display: flex;
    gap: 1rem;
    height: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    padding: var(--deck-padding, 16px);
    gap: var(--deck-gap, 16px);
    
    /* スクロールバースタイリング */
    &::-webkit-scrollbar {
      height: 0.5rem;
    }
    
    &::-webkit-scrollbar-track {
      background-color: rgb(var(--muted) / 0.2);
      border-radius: 0.25rem;
    }
    
    &::-webkit-scrollbar-thumb {
      background-color: rgb(var(--foreground) / 0.3);
      border-radius: 0.25rem;
    }
    
    &::-webkit-scrollbar-thumb:hover {
      background-color: rgb(var(--foreground) / 0.5);
    }
    
    /* モバイル対応 */
    @media (max-width: 767px) {
      padding-left: 1rem;
      padding-right: 1rem;
      scroll-snap-type: x mandatory;
    }
  }
  
  /* カラム追加ボタン */
  .deck-add-column {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 80px;
  }
  
  .deck-add-column__button {
    width: 4rem;
    height: 4rem;
    border-radius: 9999px;
    background-color: var(--color-card);
    border: 2px dashed rgb(var(--primary) / 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 200ms;
  }
  
  .deck-add-column__button:hover {
    border-color: rgb(var(--primary) / 0.6);
    background-color: rgb(var(--primary) / 0.05);
  }
  
  /* エラー表示 */
  .deck-error {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    background-color: rgb(var(--error) / 0.1);
    border: 1px solid rgb(var(--error) / 0.2);
    border-radius: 0.5rem;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    max-width: 24rem;
  }
  
  /* モーダル */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgb(var(--foreground) / 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
  }
  
  .modal-content {
    background-color: var(--color-card);
    border-radius: 0.75rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    max-width: 28rem;
    width: 100%;
    margin-left: 1rem;
    margin-right: 1rem;
    border: 1px solid var(--color-border);
  }
  
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    border-bottom: 1px solid rgb(var(--border) / 0.2);
  }
  
  .modal-close {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
  }
  
  .modal-close:hover {
    background-color: rgb(var(--muted) / 0.2);
  }
  
  .modal-body {
    padding: 1.5rem;
  }
  
  /* カラムタイプボタン */
  .column-type-button {
    width: 100%;
    padding: 1rem;
    border: 1px solid rgb(var(--border) / 0.2);
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-align: left;
    transition: all 200ms;
  }
  
  .column-type-button:hover {
    border-color: rgb(var(--primary) / 0.4);
    background-color: rgb(var(--primary) / 0.05);
  }
  
  .column-type-info {
    flex: 1;
  }
</style>