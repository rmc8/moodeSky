<!--
  FeedSettings.svelte
  フィード別詳細設定UI
  
  検索・ハッシュタグ・リスト・カスタムフィードの設定
-->
<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
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
          検索キーワード <span class="text-error">*</span>
        </label>
        <input 
          id="search-query"
          type="text"
          class="input-themed"
          bind:value={searchQuery}
          placeholder="検索したいキーワードを入力"
          required
        />
        <p class="text-xs text-secondary mt-2">
          複数のキーワードを入力する場合はスペースで区切ってください
        </p>
      </div>
      
      <!-- プレビュー -->
      {#if searchQuery.trim()}
        <div class="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p class="text-sm text-primary font-medium">検索プレビュー</p>
          <p class="text-xs text-secondary mt-1">
            「{searchQuery.trim()}」を含む投稿を検索します
          </p>
        </div>
      {/if}
    </div>

  {:else if feedType.inputType === 'hashtag'}
    <!-- ハッシュタグ設定 -->
    <div class="space-y-4">
      <div>
        <label for="hashtag-input" class="block text-sm font-medium text-themed mb-2">
          ハッシュタグ <span class="text-error">*</span>
        </label>
        <div class="relative">
          <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary font-medium">#</div>
          <input 
            id="hashtag-input"
            type="text"
            class="input-themed pl-8"
            bind:value={hashtag}
            oninput={handleHashtagInput}
            placeholder="技術"
            required
          />
        </div>
        <p class="text-xs text-secondary mt-2">
          #は自動で追加されます。日本語・英語のハッシュタグに対応しています
        </p>
      </div>
      
      <!-- プレビュー -->
      {#if hashtag.trim()}
        <div class="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p class="text-sm text-primary font-medium">ハッシュタグプレビュー</p>
          <p class="text-xs text-secondary mt-1">
            #{hashtag.trim()} を含む投稿を表示します
          </p>
        </div>
      {/if}
    </div>

  {:else if feedType.inputType === 'list'}
    <!-- リスト設定 -->
    <div class="space-y-4">
      <div>
        <label for="list-id" class="block text-sm font-medium text-themed mb-2">
          リストID <span class="text-error">*</span>
        </label>
        <input 
          id="list-id"
          type="text"
          class="input-themed"
          bind:value={listId}
          placeholder="at://did:plc:example.../app.bsky.graph.list/..."
          required
        />
        <p class="text-xs text-secondary mt-2">
          BlueskyのリストIDまたはURIを入力してください
        </p>
      </div>
      
      <div>
        <label for="list-name" class="block text-sm font-medium text-themed mb-2">
          リスト名（任意）
        </label>
        <input 
          id="list-name"
          type="text"
          class="input-themed"
          bind:value={listName}
          placeholder="例: 技術者リスト"
        />
        <p class="text-xs text-secondary mt-2">
          デッキ名に使用されます。空欄の場合は「リスト」が使用されます
        </p>
      </div>
      
      <!-- プレビュー -->
      {#if listId.trim()}
        <div class="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p class="text-sm text-primary font-medium">リストプレビュー</p>
          <p class="text-xs text-secondary mt-1">
            {listName.trim() || 'リスト'}の投稿を表示します
          </p>
        </div>
      {/if}
    </div>

  {:else if feedType.inputType === 'custom_feed'}
    <!-- カスタムフィード設定 -->
    <div class="space-y-4">
      <div>
        <label for="feed-uri" class="block text-sm font-medium text-themed mb-2">
          フィードURI <span class="text-error">*</span>
        </label>
        <input 
          id="feed-uri"
          type="text"
          class="input-themed"
          bind:value={customFeedUri}
          placeholder="at://did:plc:example.../app.bsky.feed.generator/..."
          required
        />
        <p class="text-xs text-secondary mt-2">
          at:// または https:// で始まるフィードURIを入力してください
        </p>
      </div>
      
      <div>
        <label for="feed-name" class="block text-sm font-medium text-themed mb-2">
          フィード名（任意）
        </label>
        <input 
          id="feed-name"
          type="text"
          class="input-themed"
          bind:value={feedName}
          placeholder="例: 日本語フィード"
        />
        <p class="text-xs text-secondary mt-2">
          デッキ名に使用されます。空欄の場合は「カスタムフィード」が使用されます
        </p>
      </div>
      
      <!-- プレビュー -->
      {#if customFeedUri.trim()}
        <div class="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p class="text-sm text-primary font-medium">カスタムフィードプレビュー</p>
          <p class="text-xs text-secondary mt-1">
            {feedName.trim() || 'カスタムフィード'}を表示します
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
        <span class="text-sm text-success">設定が完了しました</span>
      {:else}
        <Icon icon={ICONS.ERROR} size="sm" color="error" />
        <span class="text-sm text-error">必須項目を入力してください</span>
      {/if}
    </div>
  {/if}
</div>