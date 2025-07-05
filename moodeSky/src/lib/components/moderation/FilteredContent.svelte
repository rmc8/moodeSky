<!--
  FilteredContent.svelte
  フィルタされたコンテンツの表示制御コンポーネント
  ぼかし、警告、非表示などのモデレーションアクションを適用
-->
<script lang="ts">
  import type { FilterResult } from '$lib/types/moderation.js';
  import { getFilterMessage } from '$lib/utils/contentFilter.js';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';

  interface Props {
    /** フィルタリング結果 */
    filterResult: FilterResult | null;
    /** 子コンテンツ */
    children: any;
    /** 追加CSSクラス */
    class?: string;
    /** 警告を表示した後の表示許可 */
    allowOverride?: boolean;
    /** 常にコンテンツを表示（デバッグ用） */
    forceShow?: boolean;
  }

  const { 
    filterResult, 
    children,
    class: additionalClass = '',
    allowOverride = true,
    forceShow = false
  }: Props = $props();

  // 表示状態の管理
  let isOverridden = $state(false);
  let showWarning = $state(true);

  // フィルタ状態の判定
  const isFiltered = $derived(() => filterResult?.filtered || false);
  const action = $derived(() => filterResult?.action || 'show');
  const shouldHide = $derived(() => !forceShow && isFiltered() && (action() === 'hide' || action() === 'filter') && !isOverridden);
  const shouldBlur = $derived(() => !forceShow && isFiltered() && action() === 'blur' && !isOverridden);
  const shouldWarn = $derived(() => !forceShow && isFiltered() && action() === 'warn' && showWarning && !isOverridden);

  // フィルタメッセージの生成
  const filterMessage = $derived(() => {
    if (!filterResult || !isFiltered()) return '';
    return getFilterMessage(filterResult);
  });

  // 警告を無視して表示
  const overrideFilter = () => {
    isOverridden = true;
    showWarning = false;
  };

  // 警告を閉じる（コンテンツは表示したまま）
  const dismissWarning = () => {
    showWarning = false;
  };

  // 警告アイコンの選択
  const getWarningIcon = (action: string) => {
    switch (action) {
      case 'warn': return ICONS.WARNING;
      case 'blur': return ICONS.EYE_OFF;
      case 'hide': return ICONS.BLOCK;
      default: return ICONS.INFO;
    }
  };

  // アクションのラベル
  const getActionLabel = (action: string) => {
    switch (action) {
      case 'warn': return '注意が必要なコンテンツ';
      case 'blur': return 'センシティブなコンテンツ';
      case 'hide': return 'フィルタされたコンテンツ';
      case 'filter': return 'ブロックされたコンテンツ';
      default: return 'フィルタされたコンテンツ';
    }
  };
</script>

<!-- コンテンツコンテナ -->
<div class="filtered-content {additionalClass}">
  {#if shouldHide()}
    <!-- 完全非表示の場合 - プレースホルダーを表示 -->
    <div class="hidden-content-placeholder bg-muted/10 border border-subtle rounded-lg p-4 text-center">
      <Icon icon={ICONS.BLOCK} size="lg" color="inactive" class="mx-auto mb-2" />
      <p class="text-secondary text-sm font-medium mb-1">
        {getActionLabel(action())}
      </p>
      <p class="text-inactive text-xs mb-3">
        {filterMessage()}
      </p>
      {#if allowOverride}
        <button
          onclick={overrideFilter}
          class="text-primary text-xs hover:underline focus:outline-none focus:underline"
        >
          それでも表示する
        </button>
      {/if}
    </div>
  {:else if shouldWarn()}
    <!-- 警告表示の場合 -->
    <div class="warning-overlay bg-warning/5 border border-warning/20 rounded-lg overflow-hidden">
      <!-- 警告ヘッダー -->
      <div class="warning-header bg-warning/10 px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Icon icon={getWarningIcon(action())} size="md" color="warning" />
          <div>
            <h3 class="text-warning font-medium text-sm">
              {getActionLabel(action())}
            </h3>
            <p class="text-warning/80 text-xs mt-0.5">
              {filterMessage()}
            </p>
          </div>
        </div>
        <button
          onclick={dismissWarning}
          class="text-warning/60 hover:text-warning transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-warning/30"
          aria-label="警告を閉じる"
        >
          <Icon icon={ICONS.X} size="sm" />
        </button>
      </div>
      
      <!-- 警告アクションボタン -->
      <div class="warning-actions px-4 py-3 flex gap-2">
        <button
          onclick={overrideFilter}
          class="button-primary text-xs px-3 py-1.5"
        >
          表示する
        </button>
        <button
          onclick={dismissWarning}
          class="text-warning text-xs px-3 py-1.5 hover:bg-warning/10 rounded transition-colors"
        >
          警告を閉じる
        </button>
      </div>
    </div>
  {:else}
    <!-- 通常表示またはぼかし表示 -->
    <div class="content-wrapper {shouldBlur() ? 'blurred-content' : ''}">
      {#if shouldBlur()}
        <!-- ぼかしオーバーレイ -->
        <div class="blur-overlay">
          <div class="blur-control">
            <Icon icon={ICONS.EYE_OFF} size="lg" color="primary" class="mb-2" />
            <p class="text-primary font-medium text-sm mb-1">
              {getActionLabel(action())}
            </p>
            <p class="text-secondary text-xs mb-3">
              {filterMessage()}
            </p>
            <button
              onclick={overrideFilter}
              class="button-primary text-xs px-3 py-1.5"
            >
              表示する
            </button>
          </div>
        </div>
      {/if}
      
      <!-- 実際のコンテンツ -->
      <div class="actual-content">
        {@render children()}
      </div>
    </div>
  {/if}
</div>

<style>
  /* ぼかし効果のスタイル */
  .blurred-content {
    position: relative;
    overflow: hidden;
    border-radius: 0.5rem;
  }

  .blurred-content .actual-content {
    filter: blur(8px);
    transition: filter 0.3s ease;
  }

  .blur-overlay {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    transition: opacity 0.3s ease;
  }

  /* ダークテーマ対応 */
  [data-theme="sunset"] .blur-overlay {
    background: rgba(0, 0, 0, 0.8);
  }

  .blur-control {
    text-align: center;
    background: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    max-width: 280px;
  }

  /* ホバー効果でぼかしを軽減 */
  .blurred-content:hover .actual-content {
    filter: blur(4px);
  }

  .blurred-content:hover .blur-overlay {
    opacity: 0.8;
  }

  /* 警告コンテンツのアニメーション */
  .warning-overlay {
    animation: slideDown 0.3s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* プレースホルダーのアニメーション */
  .hidden-content-placeholder {
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

  /* フォーカス状態の強調 */
  button:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  /* 高コントラストモード対応 */
  .high-contrast .blur-overlay {
    background: rgba(255, 255, 255, 0.95);
    border: 2px solid var(--color-primary);
  }

  .high-contrast .blur-control {
    border: 2px solid var(--color-primary);
  }

  /* レスポンシブ対応 */
  @media (max-width: 640px) {
    .blur-control {
      padding: 1rem;
      max-width: 240px;
    }
    
    .warning-header {
      padding: 0.75rem 1rem;
    }
    
    .warning-actions {
      padding: 0.75rem 1rem;
    }
  }
</style>