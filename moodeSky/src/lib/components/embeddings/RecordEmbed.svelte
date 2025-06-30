<!--
  RecordEmbed.svelte
  記録埋め込みコンポーネント（引用投稿）
  app.bsky.embed.record および app.bsky.embed.record#view 対応
  他のBluesky投稿への参照・引用表示
-->
<script lang="ts">
  import Avatar from '$lib/components/Avatar.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import { formatRelativeTime } from '$lib/utils/relativeTime.js';
  import type { RecordEmbed, RecordEmbedView, EmbedDisplayOptions } from './types.js';
  import type { EmbedView } from './types.js';
  import { DEFAULT_EMBED_DISPLAY_OPTIONS } from './types.js';

  interface Props {
    /** 記録埋め込みデータ */
    embed: RecordEmbed | RecordEmbedView;
    /** 表示オプション */
    options?: Partial<EmbedDisplayOptions>;
    /** 追加CSSクラス */
    class?: string;
    /** 引用投稿クリック時の処理 */
    onPostClick?: (uri: string, cid: string) => void;
    /** 作者クリック時の処理 */
    onAuthorClick?: (did: string, handle: string) => void;
    /** 最大ネスト深度（無限ループ防止） */
    maxDepth?: number;
    /** 現在のネスト深度 */
    currentDepth?: number;
  }

  const { 
    embed, 
    options = {}, 
    class: additionalClass = '',
    onPostClick,
    onAuthorClick,
    maxDepth = 3,
    currentDepth = 0
  }: Props = $props();

  // 表示設定のマージ
  const displayOptions = $derived({ ...DEFAULT_EMBED_DISPLAY_OPTIONS, ...options });

  // 記録データの正規化（embed vs embedView の違いを吸収）
  const recordData = $derived(() => {
    if ('record' in embed && typeof embed.record === 'object' && 'author' in embed.record) {
      // RecordEmbedView の場合
      const recordView = embed as RecordEmbedView;
      return {
        uri: recordView.record.uri,
        cid: recordView.record.cid,
        author: recordView.record.author,
        value: recordView.record.value,
        indexedAt: recordView.record.indexedAt,
        embeds: recordView.record.embeds || []
      };
    } else {
      // RecordEmbed の場合（参照データのみ）
      const recordEmbed = embed as RecordEmbed;
      return {
        uri: recordEmbed.record.uri,
        cid: recordEmbed.record.cid,
        author: null, // View データがないため不明
        value: null,
        indexedAt: null,
        embeds: []
      };
    }
  });

  // 投稿テキストを抽出（app.bsky.feed.post の場合）
  const postText = $derived(() => {
    if (!recordData().value || typeof recordData().value !== 'object') {
      return '投稿を読み込めませんでした';
    }
    
    const value = recordData().value as any;
    if (value.$type === 'app.bsky.feed.post' && typeof value.text === 'string') {
      return value.text;
    }
    
    return '不明な記録タイプ';
  });

  // 相対時間表示
  const relativeTime = $derived(() => {
    if (!recordData().indexedAt) return '';
    return formatRelativeTime(recordData().indexedAt || '');
  });

  // 作者情報の有効性チェック
  const hasAuthor = $derived(() => recordData().author !== null);

  // 投稿クリックハンドラー
  const handlePostClick = () => {
    if (onPostClick && displayOptions.clickable) {
      onPostClick(recordData().uri, recordData().cid);
    }
  };

  // 作者クリックハンドラー
  const handleAuthorClick = (event: MouseEvent) => {
    event.stopPropagation();
    const author = recordData().author;
    if (onAuthorClick && author) {
      onAuthorClick(author.did, author.handle);
    }
  };

  // キーボードイベントハンドラー
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handlePostClick();
    }
  };

  // ネストが深すぎる場合の判定
  const isTooDeep = $derived(() => currentDepth >= maxDepth);

  // 短縮表示用のテキスト切り詰め
  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  };
</script>

<!-- 記録埋め込みコンテナ -->
<div 
  class="w-full {additionalClass}"
  style="max-width: {displayOptions.maxWidth}px;"
>
  <!-- 引用投稿カード -->
  <div
    class="border-subtle bg-muted/5 hover:bg-muted/10 transition-colors {displayOptions.rounded ? 'rounded-lg' : ''} overflow-hidden {displayOptions.clickable ? 'cursor-pointer' : ''}"
    role={displayOptions.clickable ? "button" : undefined}
    tabindex={displayOptions.clickable ? 0 : undefined}
    onclick={handlePostClick}
    onkeydown={handleKeyDown}
    aria-label={hasAuthor() ? `@${recordData().author?.handle}の投稿を引用` : '引用投稿'}
  >
    {#if hasAuthor() && !isTooDeep()}
      <!-- 完全なView データがある場合 -->
      <div class="p-3">
        <!-- ヘッダー: 作者情報 + 日時 -->
        <header class="flex items-start gap-2 mb-2">
          <!-- アバター -->
          <button
            class="flex-shrink-0 hover:opacity-80 transition-opacity"
            onclick={handleAuthorClick}
            aria-label="@{recordData().author?.handle}のプロフィール"
          >
            <Avatar 
              src={recordData().author?.avatar}
              displayName={recordData().author?.displayName}
              handle={recordData().author?.handle}
              size="sm"
            />
          </button>
          
          <!-- 作者情報と日時 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <!-- 表示名 -->
              {#if recordData().author?.displayName}
                <button
                  class="font-medium text-themed text-sm hover:underline truncate"
                  onclick={handleAuthorClick}
                >
                  {recordData().author?.displayName}
                </button>
              {/if}
              
              <!-- ハンドル -->
              <button
                class="text-secondary text-sm hover:underline truncate"
                onclick={handleAuthorClick}
              >
                @{recordData().author?.handle}
              </button>
              
              <!-- 時間 -->
              {#if relativeTime()}
                <span class="text-secondary text-sm flex-shrink-0">
                  · {relativeTime()}
                </span>
              {/if}
            </div>
          </div>
          
          <!-- 引用アイコン -->
          <div class="flex-shrink-0">
            <Icon icon={ICONS.LINK} size="xs" color="secondary" />
          </div>
        </header>
        
        <!-- 投稿内容 -->
        <div class="text-themed text-sm leading-relaxed mb-2">
          {truncateText(postText(), 280)}
        </div>
        
        <!-- ネストされた埋め込み（深度制限あり） -->
        {#if recordData().embeds.length > 0 && !isTooDeep()}
          <div class="mt-2 ml-2 border-l-2 border-subtle pl-2">
            {#each recordData().embeds as nestedEmbed}
              <!-- 再帰的な埋め込み表示（簡略化） -->
              <div class="text-xs text-secondary">
                <Icon icon={ICONS.ATTACH_FILE} size="xs" color="inactive" />
                埋め込みコンテンツ
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {:else if isTooDeep()}
      <!-- ネストが深すぎる場合の簡略表示 -->
      <div class="p-3 text-center">
        <Icon icon={ICONS.MORE_HORIZ} size="md" color="secondary" class="mx-auto mb-1" />
        <p class="text-secondary text-sm">引用が続いています...</p>
        <button
          class="text-primary text-xs hover:underline mt-1"
          onclick={handlePostClick}
        >
          投稿を表示
        </button>
      </div>
    {:else}
      <!-- View データがない場合（参照のみ） -->
      <div class="p-3">
        <div class="flex items-center gap-2">
          <Icon icon={ICONS.LINK} size="sm" color="secondary" />
          <div class="flex-1">
            <p class="text-secondary text-sm">引用投稿</p>
            <p class="text-inactive text-xs font-mono truncate">
              {recordData().uri}
            </p>
          </div>
          <button
            class="text-primary text-xs hover:underline"
            onclick={handlePostClick}
          >
            表示
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<!--
使用例:

基本的な使用:
<RecordEmbed {embed} />

クリックハンドラー付き:
<RecordEmbed 
  {embed}
  onPostClick={(uri, cid) => navigateToPost(uri)}
  onAuthorClick={(did, handle) => navigateToProfile(handle)}
/>

ネスト深度制限:
<RecordEmbed 
  {embed}
  maxDepth={2}
  currentDepth={1}
/>

非インタラクティブ:
<RecordEmbed 
  {embed}
  options={{
    clickable: false,
    interactive: false
  }}
/>
-->

<style>
  /* フォーカス状態の視覚化 */
  [role="button"]:focus-visible {
    outline: 2px solid rgb(59 130 246 / 0.5);
    outline-offset: 2px;
  }
  
  /* アバターボタンのホバー効果 */
  button:hover img {
    transform: scale(1.05);
  }
  
  /* 引用カードの境界線調整 */
  .border-l-2 {
    border-left-width: 2px;
  }
  
  /* テキストの切り詰め */
  .truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>