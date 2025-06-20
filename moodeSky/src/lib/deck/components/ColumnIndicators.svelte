<!--
  ColumnIndicators.svelte
  モバイル用カラムインジケーター
  
  現在のカラム位置を視覚的に表示
  タップで直接カラムに移動可能
-->
<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import type { Column } from '../types.js';
  import * as m from '$paraglide/messages.js';

  // ===================================================================
  // Props
  // ===================================================================

  interface Props {
    columns: Column[];
    activeIndex: number;
    onColumnSelect?: (index: number) => void;
    className?: string;
  }

  const { 
    columns, 
    activeIndex, 
    onColumnSelect,
    className = '' 
  }: Props = $props();

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  /**
   * インジケータークリック
   */
  function handleIndicatorClick(index: number) {
    if (onColumnSelect && index !== activeIndex) {
      onColumnSelect(index);
    }
  }

  /**
   * キーボード操作
   */
  function handleKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleIndicatorClick(index);
    }
  }

  // ===================================================================
  // カラム情報の取得
  // ===================================================================

  /**
   * カラムアイコンを取得
   */
  function getColumnIcon(column: Column): string {
    switch (column.algorithm.type) {
      case 'home': return ICONS.HOME;
      case 'notifications': return ICONS.NOTIFICATIONS;
      case 'mentions': return ICONS.AT;
      case 'search': return ICONS.SEARCH;
      case 'bookmarks': return ICONS.BOOKMARK;
      case 'likes': return ICONS.HEART;
      case 'following': return ICONS.PEOPLE;
      case 'followers': return ICONS.PEOPLE;
      case 'list': return ICONS.LIST;
      case 'hashtag': return ICONS.HASHTAG;
      case 'author': return ICONS.ACCOUNT_CIRCLE;
      case 'thread': return ICONS.THREAD;
      case 'custom': return ICONS.FEED;
      default: return ICONS.FEED;
    }
  }
</script>

<!-- インジケーターコンテナ -->
{#if columns.length > 1}
  <div class="column-indicators {className}">
    <!-- ドットインジケーター -->
    <div class="indicators-track">
      {#each columns as column, index (column.id)}
        <button
          class="indicator-dot"
          class:indicator-dot--active={index === activeIndex}
          onclick={() => handleIndicatorClick(index)}
          onkeydown={(e) => handleKeydown(e, index)}
          aria-label="{column.algorithm.name} ({index + 1}/{columns.length})"
          title={column.algorithm.name}
        >
          <!-- アクティブ時のアイコン表示 -->
          {#if index === activeIndex}
            <Icon 
              icon={getColumnIcon(column)} 
              size="xs" 
              color="themed" 
            />
          {/if}
        </button>
      {/each}
    </div>

    <!-- カラム情報表示 -->
    <div class="column-info">
      <span class="column-name text-themed">
        {columns[activeIndex]?.algorithm.name || ''}
      </span>
      <span class="column-counter text-themed opacity-60">
        {activeIndex + 1} / {columns.length}
      </span>
    </div>

    <!-- スワイプヒント（初回のみ表示） -->
    <div class="swipe-hint" class:swipe-hint--visible={columns.length === 1}>
      <Icon icon={ICONS.SWIPE_HORIZONTAL} size="sm" color="themed" />
      <span class="swipe-hint__text text-themed opacity-60">
        {m['deck.mobile.swipeHint']()}
      </span>
    </div>
  </div>
{/if}

<style>
  .column-indicators {
    position: fixed;
    bottom: 5rem;
    left: 0;
    right: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    pointer-events: none;
    
    /* デスクトップでは非表示 */
    @media (min-width: 768px) {
      display: none;
    }
  }

  /* インジケータートラック */
  .indicators-track {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background-color: rgb(var(--card) / 0.8);
    backdrop-filter: blur(8px);
    border: 1px solid rgb(var(--border) / 0.2);
    border-radius: 9999px;
    pointer-events: auto;
  }

  /* ドットインジケーター */
  .indicator-dot {
    width: 2rem;
    height: 2rem;
    border-radius: 9999px;
    border: 2px solid rgb(var(--border) / 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 200ms;
  }
  
  .indicator-dot:hover,
  .indicator-dot:focus {
    border-color: rgb(var(--primary) / 0.6);
  }
  
  .indicator-dot:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgb(var(--primary) / 0.3);
  }
    
  .indicator-dot--active {
    border-color: var(--color-primary);
    background-color: rgb(var(--primary) / 0.1);
    transform: scale(1.1);
  }
    
  /* 非アクティブ時は小さな点として表示 */
  .indicator-dot:not(.indicator-dot--active) {
    width: 0.75rem;
    height: 0.75rem;
    background-color: rgb(var(--foreground) / 0.3);
  }
      
  .indicator-dot:not(.indicator-dot--active):hover,
  .indicator-dot:not(.indicator-dot--active):focus {
    width: 1rem;
    height: 1rem;
    background-color: rgb(var(--foreground) / 0.5);
  }

  /* カラム情報 */
  .column-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    background-color: rgb(var(--card) / 0.8);
    backdrop-filter: blur(8px);
    border: 1px solid rgb(var(--border) / 0.2);
    border-radius: 0.5rem;
    pointer-events: auto;
    min-width: 0;
  }

  .column-name {
    font-size: 0.875rem;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 12rem;
  }

  .column-counter {
    font-size: 0.75rem;
  }

  /* スワイプヒント */
  .swipe-hint {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background-color: rgb(var(--primary) / 0.1);
    border: 1px solid rgb(var(--primary) / 0.2);
    border-radius: 0.5rem;
    transition: all 300ms;
    opacity: 0;
    transform: scale(0.95);
    pointer-events: auto;
  }
    
  .swipe-hint--visible {
    opacity: 1;
    transform: scale(1);
  }
    
  .swipe-hint__text {
    font-size: 0.75rem;
  }

  /* アニメーション効果 */
  .indicators-track {
    animation: slideUp 0.3s ease-out;
  }

  .column-info {
    animation: slideUp 0.4s ease-out;
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  /* ダークモード対応 */
  @media (prefers-color-scheme: dark) {
    .indicators-track,
    .column-info {
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }
  }

  /* 安全領域対応 */
  .column-indicators {
    padding-bottom: calc(1rem + env(safe-area-inset-bottom));
  }

  /* 横向き時の調整 */
  @media (max-width: 767px) and (orientation: landscape) {
    .column-indicators {
      bottom: 1rem;
      padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));
    }
    
    .column-info {
      display: none; /* 横向き時は情報を非表示 */
    }
  }

  /* アクセシビリティ: motion減少設定時 */
  @media (prefers-reduced-motion: reduce) {
    .indicator-dot,
    .indicators-track,
    .column-info,
    .swipe-hint {
      transition: none;
    }
    
    .indicators-track,
    .column-info {
      animation: none;
    }
  }

  /* ハイコントラストモード対応 */
  @media (prefers-contrast: high) {
    .indicator-dot {
      border-width: 2px;
    }
    
    .indicator-dot--active {
      border-width: 4px;
      border-color: var(--color-primary);
      background-color: rgb(var(--primary) / 0.2);
    }
    
    .indicators-track,
    .column-info {
      border: 2px solid rgb(var(--border) / 0.6);
    }
  }
</style>