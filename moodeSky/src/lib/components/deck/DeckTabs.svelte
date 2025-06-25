<!--
  DeckTabs.svelte
  統合デッキタブバー (モバイル・デスクトップ両対応)
  
  配置: モバイル版は画面最上部、デスクトップ版はヘッダー下部
  特徴: レスポンシブ対応、統一された状態管理とイベント処理
  機能: カラム切り替え、タブ追加・削除
-->
<script lang="ts">
  import { useTranslation } from '$lib/utils/reactiveTranslation.svelte.js';
  import { deckStore } from '$lib/deck/store.svelte.js';
  import { getColumnIcon } from '$lib/deck/types.js';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import { createDragDropHandlers, DRAG_DROP_CONFIG } from '$lib/utils/dragDropHandlers.js';
  import { dndzone } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  
  // ===================================================================
  // Props
  // ===================================================================
  
  interface Props {
    variant: 'mobile' | 'desktop';
    class?: string;
  }
  
  const { variant, class: className = '' }: Props = $props();
  
  // ===================================================================
  // リアクティブ翻訳システム
  // ===================================================================
  
  const { t } = useTranslation();
  
  // ===================================================================
  // 状態管理
  // ===================================================================
  
  // デッキストアから実際のカラムデータを取得（リアクティブ）
  const columns = $derived(deckStore.columns);
  const activeColumnId = $derived(deckStore.state.activeColumnId);
  
  // 一意なゾーンIDを生成してプレースホルダーの重複を防ぐ
  const zoneId = DRAG_DROP_CONFIG.generateZoneId(`deck-tabs-${variant}`);
  
  // ドラッグ&ドロップハンドラーの初期化
  const { handleConsider, handleFinalize } = createDragDropHandlers(
    deckStore,
    `DeckTabs-${variant}`,
    {
      onFinalizeExtra: () => {
        // モバイルでの触覚フィードバック
        if (variant === 'mobile' && 'vibrate' in navigator) {
          navigator.vibrate([50, 30, 50]);
        }
      }
    }
  );
  
  // カラムを切り替える
  function switchColumn(columnId: string) {
    deckStore.state.activeColumnId = columnId;
    
    // カスタムイベントを発行してDeckContainerに通知
    const event = new CustomEvent('tabColumnSwitch', {
      detail: { columnId },
      bubbles: true
    });
    window.dispatchEvent(event);
    
    console.log('🎛️ [DeckTabs] Switched to column:', columnId, 'variant:', variant);
  }
  
  
</script>

<!-- デッキタブバー -->
<div 
  class="deck-tabs deck-tabs--{variant} {className}"
  class:deck-tabs--mobile={variant === 'mobile'}
  class:deck-tabs--desktop={variant === 'desktop'}
  role="tablist"
  aria-label={t('deck.tabs.tabArea')}
>
  <div 
    class="deck-tabs__content"
    use:dndzone={DRAG_DROP_CONFIG.createDndZoneOptions(columns, zoneId)}
    onconsider={handleConsider}
    onfinalize={handleFinalize}
    role="presentation"
  >
    {#if columns.length > 0}
      <!-- 実際のカラムタブ表示 -->
      {#each columns as column, index (column.id)}
        <button
          class="deck-tabs__button touch-none select-none"
          class:deck-tabs__button--active={column.id === activeColumnId}
          class:cursor-grab={columns.length > 1}
          role="tab"
          aria-selected={column.id === activeColumnId}
          aria-label={`${column.settings.title}${columns.length > 1 ? ' - ドラッグで並び替え' : ''}`}
          aria-describedby={columns.length > 1 ? `drag-instructions-${variant}` : undefined}
          title={`${column.settings.title}${columns.length > 1 ? ' - ドラッグで並び替え' : ''}`}
          onclick={() => switchColumn(column.id)}
          animate:flip={{ duration: DRAG_DROP_CONFIG.flipDurationMs }}
        >
          <!-- アイコン表示 -->
          <Icon 
            icon={getColumnIcon(column)}
            size={variant === 'mobile' ? 'md' : 'sm'}
            color={column.id === activeColumnId ? 'primary' : 'themed'}
            decorative={true}
            class="deck-tabs__icon {column.id === activeColumnId ? 'opacity-100' : 'opacity-80'}"
          />
          
          <!-- デスクトップではラベルも表示 -->
          {#if variant === 'desktop'}
            <span class="deck-tabs__label">
              {column.settings.title}
            </span>
          {/if}
        </button>
      {/each}
    {:else}
      <!-- カラムがない場合のプレースホルダー -->
      <div class="deck-tabs__placeholder">
        <Icon 
          icon={ICONS.INBOX}
          size={variant === 'mobile' ? 'md' : 'sm'}
          color="inactive"
          decorative={true}
          class="opacity-60"
        />
        {#if variant === 'desktop'}
          <span class="deck-tabs__label opacity-60">
            {t('deck.empty.title')}
          </span>
        {/if}
      </div>
    {/if}
    
    <!-- ドラッグ&ドロップ使用説明（スクリーンリーダー用） -->
    {#if columns.length > 1}
      <div id="drag-instructions-{variant}" class="sr-only">
        {variant === 'mobile' ? '長押ししてドラッグしてタブの順序を変更できます' : 'ドラッグしてタブの順序を変更できます'}
      </div>
    {/if}
  </div>
</div>

<style>
  /* ベーススタイル */
  .deck-tabs {
    background-color: var(--color-card);
    border-bottom: 2px solid rgb(var(--border) / 0.2);
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    position: relative;
  }
  
  .deck-tabs__content {
    display: flex;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  
  .deck-tabs__content::-webkit-scrollbar {
    display: none;
  }
  
  .deck-tabs__button {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 0.75rem;
    transform-origin: center;
    will-change: transform, box-shadow, background-color;
  }
  
  .deck-tabs__button:hover {
    background-color: rgb(var(--muted) / 0.1);
  }
  
  .deck-tabs__button--active {
    background-color: rgb(var(--primary) / 0.1);
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  }
  
  .deck-tabs__button:active {
    transform: scale(0.95);
  }
  
  .deck-tabs__icon {
    transition: opacity 150ms ease-in-out;
  }
  
  .deck-tabs__label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .deck-tabs__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.75rem;
    background-color: rgb(var(--muted) / 0.5);
  }
  
  /* モバイルバリアント */
  .deck-tabs--mobile {
    position: fixed;
    left: 0;
    right: 0;
    top: env(safe-area-inset-top, 0px);
    z-index: 40;
    height: calc(48px + env(safe-area-inset-top, 0px));
  }
  
  .deck-tabs--mobile .deck-tabs__content {
    padding: 0 0.5rem;
    padding-top: calc(env(safe-area-inset-top, 0px) + 0.375rem); /* 6px */
    padding-bottom: 0.25rem; /* 4px */
  }
  
  .deck-tabs--mobile .deck-tabs__button {
    width: 2.25rem; /* w-9 */
    height: 2.25rem; /* h-9 */
    margin: 0 0.25rem;
  }
  
  .deck-tabs--mobile .deck-tabs__placeholder {
    width: 2.25rem;
    height: 2.25rem;
    margin: 0 0.25rem;
  }
  
  /* デスクトップバリアント */
  .deck-tabs--desktop {
    position: static;
    height: auto;
    min-height: 3rem; /* 48px */
  }
  
  .deck-tabs--desktop .deck-tabs__content {
    padding: 0.5rem 1rem; /* 上下余白を縮小：12px→8px */
    gap: 0.5rem;
  }
  
  .deck-tabs--desktop .deck-tabs__button {
    padding: 0.5rem 0.75rem;
    gap: 0.5rem;
    min-width: auto;
  }
  
  .deck-tabs--desktop .deck-tabs__button--active {
    transform: scale(1.02);
    border: 1px solid rgb(var(--primary) / 0.3);
  }
  
  .deck-tabs--desktop .deck-tabs__placeholder {
    padding: 0.5rem 0.75rem;
    gap: 0.5rem;
  }
  
  /* iOS セーフエリア対応 */
  @supports (padding: max(0px)) {
    .deck-tabs--mobile {
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);
    }
  }
  
  /* フォーカス状態のアクセシビリティ */
  .deck-tabs__button:focus-visible {
    outline: 2px solid rgb(var(--primary) / 0.6);
    outline-offset: 2px;
  }
  
  /* パフォーマンス最適化 */
  .deck-tabs__button {
    backface-visibility: hidden;
    -webkit-font-smoothing: antialiased;
  }
  
  /* ドラッグ&ドロップ最適化 - TailwindCSS v4統合完了 */
  
  /* グローバルドラッグプレビュー最適化 */
  :global(.drag-preview) {
    border-radius: 0.75rem; /* rounded-xl */
    backdrop-filter: blur(10px);
    will-change: transform;
  }
  
  /* モバイル版プレビュー */
  .deck-tabs--mobile :global(.drag-preview) {
    box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }
  
  /* デスクトップ版プレビュー */
  .deck-tabs--desktop :global(.drag-preview) {
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    min-width: 120px; /* デスクトップタブの最小幅確保 */
  }
  
  /* アクセシビリティ向上 */
  @media (prefers-reduced-motion: reduce) {
    .deck-tabs__button,
    :global(.drag-preview) {
      transition: none !important;
      animation: none !important;
      transform: none !important;
    }
  }
  
  /* タッチデバイス最適化（モバイル） */
  @media (hover: none) and (pointer: coarse) {
    .deck-tabs--mobile .deck-tabs__button {
      /* モバイルでのタッチターゲット最適化 */
      min-width: 36px;
      min-height: 36px;
    }
  }
  
  /* デスクトップ最適化 */
  @media (min-width: 768px) {
    .deck-tabs--desktop .deck-tabs__button {
      /* デスクトップでのマウスターゲット最適化 */
      min-height: 40px;
    }
    
    /* マウス操作での視覚的フィードバック - TailwindCSS v4対応 */
    .deck-tabs--desktop .deck-tabs__button:hover:not(:active) {
      transform: translateY(-1px);
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