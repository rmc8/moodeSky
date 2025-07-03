<!--
  InfiniteScroll.svelte
  無限スクロールコンポーネント

  機能:
  - Intersection Observer APIを使用したスクロール検出
  - 動的なローディング状態管理
  - デバウンス処理
  - カスタマイズ可能なトリガー距離
  - エラー状態のハンドリング
  - タッチデバイス最適化

  tokimekibluesky参考の最新実装
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import * as m from '../../../paraglide/messages.js';

  // ===================================================================
  // Props
  // ===================================================================

  interface Props {
    hasMore: boolean;
    isLoading: boolean;
    error?: string | null;
    threshold?: number;        // トリガー距離（デフォルト: 300px）
    debounceMs?: number;       // デバウンス時間（デフォルト: 300ms）
    enableDebugLogs?: boolean; // デバッグログ有効化
    onLoadMore: () => Promise<void> | void;
    onRetry?: () => Promise<void> | void;
  }

  const {
    hasMore,
    isLoading,
    error = null,
    threshold = 300,
    debounceMs = 300,
    enableDebugLogs = false,
    onLoadMore,
    onRetry
  }: Props = $props();

  // ===================================================================
  // 状態管理
  // ===================================================================

  let triggerElement: HTMLElement;
  let observer: IntersectionObserver | null = null;
  let loadMoreDebounced: (() => void) | null = null;
  let isInitialized = $state(false);
  let triggerVisible = $state(false);

  // ===================================================================
  // Intersection Observer の設定と監視
  // ===================================================================

  function createObserver(): IntersectionObserver {
    return new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        triggerVisible = entry.isIntersecting;

        if (enableDebugLogs) {
          console.log('🔄 [InfiniteScroll] Intersection observed:', {
            isIntersecting: entry.isIntersecting,
            intersectionRatio: entry.intersectionRatio,
            hasMore,
            isLoading,
            error: !!error
          });
        }

        // 条件を満たす場合のみloadMoreを実行
        if (entry.isIntersecting && hasMore && !isLoading && !error) {
          if (enableDebugLogs) {
            console.log('🔄 [InfiniteScroll] Triggering load more');
          }
          
          // デバウンス処理
          if (loadMoreDebounced) {
            loadMoreDebounced();
          }
        }
      },
      {
        root: null,
        rootMargin: `${threshold}px`,
        threshold: 0.1
      }
    );
  }

  function createDebounceFunction(fn: () => void, delay: number): () => void {
    let timeoutId: number | null = null;
    
    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        fn();
        timeoutId = null;
      }, delay);
    };
  }

  async function handleLoadMore(): Promise<void> {
    try {
      if (enableDebugLogs) {
        console.log('🔄 [InfiniteScroll] Executing onLoadMore');
      }
      
      await onLoadMore();
    } catch (error) {
      console.error('🔄 [InfiniteScroll] Load more failed:', error);
    }
  }

  // ===================================================================
  // リアクティブエフェクト
  // ===================================================================

  // hasMoreが変更されたときの処理
  $effect(() => {
    if (enableDebugLogs) {
      console.log('🔄 [InfiniteScroll] State changed:', {
        hasMore,
        isLoading,
        error: !!error,
        triggerVisible,
        isInitialized
      });
    }

    // hasMoreがfalseになったらObserverを停止
    if (!hasMore && observer && triggerElement) {
      observer.unobserve(triggerElement);
      if (enableDebugLogs) {
        console.log('🔄 [InfiniteScroll] Observer stopped (hasMore = false)');
      }
    }
    
    // hasMoreがtrueになったらObserverを再開
    if (hasMore && observer && triggerElement && isInitialized) {
      observer.observe(triggerElement);
      if (enableDebugLogs) {
        console.log('🔄 [InfiniteScroll] Observer restarted (hasMore = true)');
      }
    }
  });

  // ===================================================================
  // ライフサイクル
  // ===================================================================

  onMount(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      console.warn('🔄 [InfiniteScroll] IntersectionObserver not supported');
      return;
    }

    // デバウンス関数を作成
    loadMoreDebounced = createDebounceFunction(handleLoadMore, debounceMs);

    // Observerを作成
    observer = createObserver();

    if (enableDebugLogs) {
      console.log('🔄 [InfiniteScroll] Observer created', { 
        threshold, 
        debounceMs,
        rootMargin: `${threshold}px`
      });
    }

    // triggerElementが準備できるまで待つ
    const checkTriggerElement = () => {
      if (triggerElement && observer) {
        observer.observe(triggerElement);
        isInitialized = true;
        
        if (enableDebugLogs) {
          console.log('🔄 [InfiniteScroll] Observer initialized and watching trigger element');
        }
      } else {
        // 要素が準備できていない場合は少し待って再試行
        setTimeout(checkTriggerElement, 100);
      }
    };

    checkTriggerElement();
  });

  onDestroy(() => {
    if (observer) {
      observer.disconnect();
      observer = null;
      
      if (enableDebugLogs) {
        console.log('🔄 [InfiniteScroll] Observer disconnected');
      }
    }
    
    loadMoreDebounced = null;
  });

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  async function handleRetryClick(): Promise<void> {
    if (onRetry) {
      try {
        await onRetry();
      } catch (error) {
        console.error('🔄 [InfiniteScroll] Retry failed:', error);
      }
    }
  }
</script>

<!-- 無限スクロールトリガー要素 -->
<div 
  bind:this={triggerElement}
  class="infinite-scroll-trigger"
  data-testid="infinite-scroll-trigger"
>
  {#if hasMore}
    <!-- まだ読み込み可能 -->
    {#if isLoading}
      <!-- 読み込み中状態 -->
      <div class="flex flex-col items-center justify-center py-8 px-4">
        <div class="mb-3 opacity-60 animate-spin">
          <Icon icon={ICONS.REFRESH} size="lg" color="themed" />
        </div>
        <p class="text-sm text-secondary text-center">
          {m['deck.column.loading']()}
        </p>
      </div>
    {:else if error}
      <!-- エラー状態 -->
      <div class="flex flex-col items-center justify-center py-8 px-4">
        <div class="mb-3 opacity-60">
          <Icon icon={ICONS.WARNING} size="lg" color="error" />
        </div>
        <p class="text-sm text-secondary text-center mb-4">
          {error}
        </p>
        {#if onRetry}
          <button 
            class="button-primary text-sm px-4 py-2"
            onclick={handleRetryClick}
          >
            {m['common.retry']()}
          </button>
        {/if}
      </div>
    {:else}
      <!-- 待機状態（見た目上は非表示、Observer用） -->
      <div class="h-4 opacity-0" aria-hidden="true">
        <!-- Intersection Observer detection zone -->
      </div>
    {/if}
  {:else}
    <!-- すべて読み込み済み -->
    <div class="flex flex-col items-center justify-center py-6 px-4">
      <div class="mb-3 opacity-40">
        <Icon icon={ICONS.CHECK} size="lg" color="themed" />
      </div>
      <p class="text-sm text-secondary text-center">
        すべて読み込み済み
      </p>
    </div>
  {/if}
</div>

<style>
  .infinite-scroll-trigger {
    min-height: 20px;
    width: 100%;
  }
</style>