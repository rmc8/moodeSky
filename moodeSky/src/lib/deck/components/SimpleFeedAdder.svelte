<!--
  SimpleFeedAdder.svelte
  tokimekibluesky式のシンプルな一覧表示でフィード追加
  透明性と直感性を重視した設計
-->
<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import * as m from '../../../paraglide/messages.js';
  import FeedConfigModal from './FeedConfigModal.svelte';
  import type { 
    FeedTypeConfig, 
    FeedCategory, 
    ColumnAlgorithm,
    AddDeckFormData,
    Column
  } from '../types.js';
  import {
    getFeedCategories,
    getFeedTypeConfigs,
    getFeedTypesByCategory,
    getFeedTypeConfig,
    getDefaultDeckName,
    getFeedTypeIcon
  } from '../types.js';

  // ===================================================================
  // Props & State
  // ===================================================================
  
  let { onSuccess }: { onSuccess: (column: Column) => void } = $props();

  // 2段階フロー管理
  let selectedFeedType = $state<FeedTypeConfig | null>(null);
  let showConfigModal = $state(false);
  let errorMessage = $state('');

  // ===================================================================
  // Data Preparation
  // ===================================================================

  // カテゴリ別フィード種類（国際化対応）
  const feedTypesByCategory = $derived(
    getFeedCategories().map(category => ({
      category,
      feedTypes: getFeedTypesByCategory(category.id)
    }))
  );

  // ===================================================================
  // Event Handlers
  // ===================================================================

  function handleFeedClick(feedType: FeedTypeConfig) {
    selectedFeedType = feedType;
    showConfigModal = true;
    errorMessage = '';
  }

  function handleConfigModalClose() {
    showConfigModal = false;
    selectedFeedType = null;
  }

  function handleConfigModalBack() {
    showConfigModal = false;
    selectedFeedType = null;
  }

  function handleConfigSuccess(column: Column) {
    showConfigModal = false;
    selectedFeedType = null;
    onSuccess(column);
  }


</script>

<!-- エラーメッセージ -->
{#if errorMessage}
  <div class="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
    <Icon icon={ICONS.ERROR} size="sm" color="error" />
    <span class="text-error text-sm">{errorMessage}</span>
  </div>
{/if}

<!-- カテゴリ別フィード -->
{#each feedTypesByCategory as { category, feedTypes }}
  {#if feedTypes.length > 0}
    <div class="mb-10">
      <div class="mb-5 pb-3 border-b-2 border-themed/20">
        <h4 class="text-lg font-bold tracking-wide mb-1.5 text-themed flex items-center gap-2">
          <Icon icon={category.icon} size="sm" color="themed" />
          {category.name}
        </h4>
        <p class="text-sm text-secondary">{category.description}</p>
      </div>

      <div class="grid gap-4 auto-rows-min grid-cols-1 md:grid-cols-2">
        {#each feedTypes as feedType}
          <div class="flex gap-4 items-center p-4 rounded-xl bg-card border-2 border-themed/20 transition-all duration-150 cursor-pointer shadow-sm hover:border-primary hover:bg-primary/10 hover:-translate-y-px hover:shadow-lg min-w-0">
            <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon icon={feedType.icon} size="md" color="primary" />
            </div>

            <div class="flex-1 min-w-0 flex flex-col gap-1.5">
              <p class="font-semibold text-[15px] leading-tight text-themed">{feedType.name}</p>
              <p class="text-[13px] leading-relaxed text-secondary">{feedType.description}</p>
              <div class="flex flex-wrap gap-2 mt-0.5">
                {#if feedType.supportsAllAccounts}
                  <div class="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 px-2 py-1 rounded-md w-fit">
                    <Icon icon={ICONS.GROUP} size="xs" />
                    {m['feeds.settings.allAccountsSupport']()}
                  </div>
                {/if}
                {#if feedType.requiresAdditionalInput}
                  <div class="inline-flex items-center gap-1 text-[11px] font-medium text-secondary bg-primary/10 px-2 py-1 rounded-md w-fit">
                    <Icon icon={ICONS.EDIT} size="xs" />
                    {m['feeds.settings.configRequired']()}
                  </div>
                {/if}
              </div>
            </div>

            <button 
              class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg border-2 border-primary text-primary transition-all duration-150 hover:bg-primary hover:text-white hover:scale-105 group"
              onclick={() => handleFeedClick(feedType)}
              aria-label={m['feeds.settings.addButtonLabel']()}
            >
              <Icon icon={ICONS.ADD} size="md" color="primary" class="group-hover:text-white transition-colors duration-150" />
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}
{/each}

<!-- フィード設定モーダル -->
<FeedConfigModal 
  isOpen={showConfigModal}
  feedType={selectedFeedType}
  onClose={handleConfigModalClose}
  onBack={handleConfigModalBack}
  onSuccess={handleConfigSuccess}
/>
