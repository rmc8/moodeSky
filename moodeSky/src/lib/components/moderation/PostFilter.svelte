<!--
  PostFilter.svelte
  投稿をフィルタリングして適切に表示するラッパーコンポーネント
  AT Protocol投稿データを受け取り、モデレーション設定に基づいてフィルタリング
-->
<script lang="ts">
  import type { FilterResult } from '$lib/types/moderation.js';
  import type { AtProtoPost } from '$lib/utils/contentFilter.js';
  import { filterPost } from '$lib/utils/contentFilter.js';
  import FilteredContent from './FilteredContent.svelte';
  import { moderationStore } from '$lib/stores/moderation.svelte.js';
  import { onMount } from 'svelte';

  interface Props {
    /** AT Protocol 投稿データ */
    post: AtProtoPost;
    /** 子コンテンツ（投稿コンポーネント） */
    children: any;
    /** 追加CSSクラス */
    class?: string;
    /** フィルタリングを無効にする */
    disableFiltering?: boolean;
    /** 警告表示後の表示許可 */
    allowOverride?: boolean;
    /** フィルタリング完了時のコールバック */
    onFilterComplete?: (result: FilterResult | null) => void;
    /** デバッグモード */
    debug?: boolean;
  }

  const { 
    post, 
    children,
    class: additionalClass = '',
    disableFiltering = false,
    allowOverride = true,
    onFilterComplete,
    debug = false
  }: Props = $props();

  // フィルタリング状態
  let filterResult = $state<FilterResult | null>(null);
  let isFiltering = $state(false);
  let filterError = $state<string | null>(null);

  // フィルタリング実行
  const performFiltering = async () => {
    if (disableFiltering) {
      filterResult = null;
      return;
    }

    // モデレーションストアが初期化されていない場合は初期化
    if (!moderationStore.isInitialized) {
      await moderationStore.initialize();
    }

    // フィルタリングが無効な場合はスキップ
    if (!moderationStore.isFilteringActive) {
      filterResult = null;
      return;
    }

    isFiltering = true;
    filterError = null;

    try {
      filterResult = await filterPost(post);
      
      // コールバックを実行
      if (onFilterComplete) {
        onFilterComplete(filterResult);
      }

      // デバッグ情報
      if (debug && filterResult?.filtered) {
        console.log('[PostFilter] Content filtered:', {
          postUri: post.uri,
          filterResult,
          post
        });
      }
    } catch (error) {
      filterError = `フィルタリングエラー: ${error}`;
      console.error('Post filtering error:', error);
    } finally {
      isFiltering = false;
    }
  };

  // 投稿が変更された時にフィルタリングを再実行
  $effect(() => {
    performFiltering();
  });

  // モデレーション設定が変更された時にフィルタリングを再実行
  $effect(() => {
    // 設定変更を監視
    moderationStore.settings;
    if (moderationStore.isInitialized && !isFiltering) {
      performFiltering();
    }
  });

  // フィルタリング統計情報（デバッグ用）
  const debugInfo = $derived(() => {
    if (!debug) return null;
    
    return {
      isFiltering,
      filterError,
      filterResult,
      moderationActive: moderationStore.isFilteringActive,
      activeFilters: {
        keywords: moderationStore.activeKeywordCount,
        labels: moderationStore.activeLabelCount
      }
    };
  });
</script>

<!-- フィルタリング処理中のローディング表示 -->
{#if isFiltering}
  <div class="filtering-loading {additionalClass}">
    <div class="flex items-center justify-center p-4">
      <div class="w-4 h-4 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin mr-2"></div>
      <span class="text-secondary text-sm">コンテンツを確認中...</span>
    </div>
  </div>
{:else if filterError}
  <!-- フィルタリングエラー表示 -->
  <div class="filtering-error {additionalClass}">
    <div class="bg-error/5 border border-error/20 rounded-lg p-4">
      <p class="text-error text-sm">{filterError}</p>
    </div>
  </div>
{:else}
  <!-- フィルタリング結果に基づいてコンテンツを表示 -->
  <FilteredContent 
    {filterResult} 
    {allowOverride}
    class={additionalClass}
  >
    {@render children()}
  </FilteredContent>
{/if}

<!-- デバッグ情報表示 -->
{#if debug && debugInfo}
  <details class="debug-info mt-2 text-xs">
    <summary class="cursor-pointer text-secondary">フィルタリングデバッグ情報</summary>
    <pre class="mt-2 p-2 bg-muted/10 rounded text-xs overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
  </details>
{/if}

<style>
  .filtering-loading {
    min-height: 60px;
  }

  .filtering-error {
    margin: 0.5rem 0;
  }

  .debug-info {
    border: 1px solid var(--color-border);
    border-radius: 0.375rem;
    padding: 0.5rem;
    background: var(--color-muted);
  }

  .debug-info summary {
    padding: 0.25rem;
    font-weight: 500;
  }

  .debug-info pre {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 0.625rem;
    line-height: 1.2;
    max-height: 200px;
  }

  /* アニメーション */
  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* ローディング状態のフェードイン */
  .filtering-loading {
    animation: fadeIn 0.3s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>