<!--
  FeedSettings.svelte
  フィード別詳細設定UI
  
  検索・ハッシュタグ・リスト・カスタムフィードの設定
-->
<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import * as m from '../../../paraglide/messages.js';
  import type { FeedTypeConfig } from '../types.js';

  // ===================================================================
  // Props
  // ===================================================================
  
  interface Props {
    feedType: FeedTypeConfig;
    config: any;
    onChange: (config: any) => void;
  }

  const { feedType, config, onChange }: Props = $props();

  // ===================================================================
  // Local State
  // ===================================================================

  let searchQuery = $state(config.query || '');
  let hashtag = $state(config.hashtag || '');
  let listId = $state(config.listId || '');
  let listName = $state(config.listName || '');
  let customFeedUri = $state(config.uri || '');
  let feedName = $state(config.feedName || '');

  // ===================================================================
  // Effects
  // ===================================================================

  // 設定変更時の通知
  $effect(() => {
    const newConfig: any = {};
    
    switch (feedType.inputType) {
      case 'search':
        if (searchQuery.trim()) {
          newConfig.query = searchQuery.trim();
        }
        break;
        
      case 'hashtag':
        if (hashtag.trim()) {
          newConfig.hashtag = hashtag.trim().replace(/^#/, ''); // #を除去
        }
        break;
        
      case 'list':
        if (listId.trim()) {
          newConfig.listId = listId.trim();
          if (listName.trim()) {
            newConfig.listName = listName.trim();
          }
        }
        break;
        
      case 'custom_feed':
        if (customFeedUri.trim()) {
          newConfig.uri = customFeedUri.trim();
          if (feedName.trim()) {
            newConfig.feedName = feedName.trim();
          }
        }
        break;
    }
    
    onChange(newConfig);
  });

  // ===================================================================
  // Validation
  // ===================================================================

  const isValid = $derived(() => {
    switch (feedType.inputType) {
      case 'search':
        return searchQuery.trim().length > 0;
      case 'hashtag':
        return hashtag.trim().length > 0;
      case 'list':
        return listId.trim().length > 0;
      case 'custom_feed':
        return customFeedUri.trim().length > 0 && 
               (customFeedUri.startsWith('at://') || customFeedUri.startsWith('https://'));
      default:
        return true;
    }
  });

  // ===================================================================
  // Helper Functions
  // ===================================================================

  function handleHashtagInput(event: Event) {
    const target = event.target as HTMLInputElement;
    let value = target.value;
    
    // #で始まる場合は自動で除去
    if (value.startsWith('#')) {
      value = value.substring(1);
      target.value = value;
    }
    
    hashtag = value;
  }
</script>

<!-- フィード詳細設定 -->
<div class="space-y-6">
  {#if feedType.inputType === 'search'}
    <!-- 検索設定 -->
    <div class="space-y-4">
      <div>
        <label for="search-query" class="block text-sm font-medium text-themed mb-2">
          {m['feeds.settings.searchKeywords']()} <span class="text-error">*</span>
        </label>
        <input 
          id="search-query"
          type="text"
          class="input-themed"
          bind:value={searchQuery}
          placeholder={m['feeds.settings.searchPlaceholder']()}
          required
        />
        <p class="text-xs text-secondary mt-2">
          {m['feeds.settings.searchHelp']()}
        </p>
      </div>
      
      <!-- プレビュー -->
      {#if searchQuery.trim()}
        <div class="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p class="text-sm text-primary font-medium">{m['feeds.settings.searchPreview']()}</p>
          <p class="text-xs text-secondary mt-1">
            {m['feeds.settings.searchPreviewText']({ query: searchQuery.trim() })}
          </p>
        </div>
      {/if}
    </div>

  {:else if feedType.inputType === 'hashtag'}
    <!-- ハッシュタグ設定 -->
    <div class="space-y-4">
      <div>
        <label for="hashtag-input" class="block text-sm font-medium text-themed mb-2">
          {m['feeds.settings.hashtagLabel']()} <span class="text-error">*</span>
        </label>
        <div class="relative">
          <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary font-medium">#</div>
          <input 
            id="hashtag-input"
            type="text"
            class="input-themed pl-8"
            bind:value={hashtag}
            oninput={handleHashtagInput}
            placeholder={m['feeds.settings.hashtagExample']()}
            required
          />
        </div>
        <p class="text-xs text-secondary mt-2">
          {m['feeds.settings.hashtagHelp']()}
        </p>
      </div>
      
      <!-- プレビュー -->
      {#if hashtag.trim()}
        <div class="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p class="text-sm text-primary font-medium">{m['feeds.settings.hashtagPreview']()}</p>
          <p class="text-xs text-secondary mt-1">
            {m['feeds.settings.hashtagPreviewText']({ hashtag: hashtag.trim() })}
          </p>
        </div>
      {/if}
    </div>

  {:else if feedType.inputType === 'list'}
    <!-- リスト設定 -->
    <div class="space-y-4">
      <div>
        <label for="list-id" class="block text-sm font-medium text-themed mb-2">
          {m['feeds.settings.listIdLabel']()} <span class="text-error">*</span>
        </label>
        <input 
          id="list-id"
          type="text"
          class="input-themed"
          bind:value={listId}
          placeholder={m['feeds.settings.listIdPlaceholder']()}
          required
        />
        <p class="text-xs text-secondary mt-2">
          {m['feeds.settings.listIdHelp']()}
        </p>
      </div>
      
      <div>
        <label for="list-name" class="block text-sm font-medium text-themed mb-2">
          {m['feeds.settings.listNameLabel']()}
        </label>
        <input 
          id="list-name"
          type="text"
          class="input-themed"
          bind:value={listName}
          placeholder={m['feeds.settings.listNamePlaceholder']()}
        />
        <p class="text-xs text-secondary mt-2">
          {m['feeds.settings.listNameHelp']()}
        </p>
      </div>
      
      <!-- プレビュー -->
      {#if listId.trim()}
        <div class="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p class="text-sm text-primary font-medium">{m['feeds.settings.listPreview']()}</p>
          <p class="text-xs text-secondary mt-1">
            {m['feeds.settings.listPreviewText']({ listName: listName.trim() || m['feeds.types.list.name']() })}
          </p>
        </div>
      {/if}
    </div>

  {:else if feedType.inputType === 'custom_feed'}
    <!-- カスタムフィード設定 -->
    <div class="space-y-4">
      <div>
        <label for="feed-uri" class="block text-sm font-medium text-themed mb-2">
          {m['feeds.settings.feedUriLabel']()} <span class="text-error">*</span>
        </label>
        <input 
          id="feed-uri"
          type="text"
          class="input-themed"
          bind:value={customFeedUri}
          placeholder={m['feeds.settings.feedUriPlaceholder']()}
          required
        />
        <p class="text-xs text-secondary mt-2">
          {m['feeds.settings.feedUriHelp']()}
        </p>
      </div>
      
      <div>
        <label for="feed-name" class="block text-sm font-medium text-themed mb-2">
          {m['feeds.settings.feedNameLabel']()}
        </label>
        <input 
          id="feed-name"
          type="text"
          class="input-themed"
          bind:value={feedName}
          placeholder={m['feeds.settings.feedNamePlaceholder']()}
        />
        <p class="text-xs text-secondary mt-2">
          {m['feeds.settings.feedNameHelp']()}
        </p>
      </div>
      
      <!-- プレビュー -->
      {#if customFeedUri.trim()}
        <div class="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p class="text-sm text-primary font-medium">{m['feeds.settings.customFeedPreview']()}</p>
          <p class="text-xs text-secondary mt-1">
            {m['feeds.settings.customFeedPreviewText']({ feedName: feedName.trim() || m['feeds.types.customFeed.name']() })}
          </p>
        </div>
      {/if}
    </div>
  {/if}

  <!-- バリデーション状態 -->
  {#if feedType.requiresAdditionalInput}
    <div class="flex items-center gap-2 pt-2">
      {#if isValid()}
        <Icon icon={ICONS.CHECK_CIRCLE} size="sm" color="success" />
        <span class="text-sm text-success">{m['feeds.settings.settingsComplete']()}</span>
      {:else}
        <Icon icon={ICONS.ERROR} size="sm" color="error" />
        <span class="text-sm text-error">{m['feeds.settings.requiredFields']()}</span>
      {/if}
    </div>
  {/if}
</div>