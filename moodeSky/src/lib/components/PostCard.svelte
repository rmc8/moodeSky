<!--
  PostCard.svelte
  シンプルなポスト表示カード
  段階的実装: 作者名、テキスト、日時のみ
-->
<script lang="ts">
  import Avatar from './Avatar.svelte';
  import { formatRelativeTime, formatAbsoluteTime } from '$lib/utils/relativeTime.js';
  import type { SimplePost } from '$lib/types/post.js';
  
  interface Props {
    post: SimplePost;
    class?: string;
  }
  
  const { post, class: className = '' }: Props = $props();
  
  // 投稿日時の相対時間表示
  const relativeTime = $derived(() => formatRelativeTime(post.createdAt));
  
  // ツールチップ用の絶対時間表示  
  const absoluteTime = $derived(() => formatAbsoluteTime(post.createdAt));
  
  // displayNameの有効性チェック
  const hasValidDisplayName = $derived(
    post.author.displayName && post.author.displayName.trim() !== ''
  );
  
</script>

<!-- ポストカード -->
<article class="bg-card border-subtle rounded-lg p-4 hover:bg-muted/5 transition-colors {className}">
  <!-- ヘッダー: アバター + 作者情報 + 日時 -->
  <header class="flex items-start gap-3 mb-3">
    <!-- アバター -->
    <Avatar 
      src={post.author.avatar}
      displayName={post.author.displayName}
      handle={post.author.handle}
      size="sm"
      class="mt-1"
    />
    
    <!-- 作者情報と日時 -->
    <div class="flex-1 min-w-0">
      <!-- 1行目: 表示名と日時 (displayNameが有効な場合のみ) -->
      {#if hasValidDisplayName}
        <div class="flex items-center justify-between gap-2">
          <h3 class="font-semibold text-themed text-sm truncate">
            {post.author.displayName}
          </h3>
          <time 
            class="text-secondary text-sm flex-shrink-0" 
            datetime={post.createdAt}
            title={absoluteTime()}
          >
            {relativeTime()}
          </time>
        </div>
      {/if}
      
      <!-- 2行目: ハンドル -->
      <div class="flex items-center gap-2">
        <span class="text-secondary text-sm truncate">
          @{post.author.handle}
        </span>
        {#if !hasValidDisplayName}
          <time 
            class="text-secondary text-sm flex-shrink-0" 
            datetime={post.createdAt}
            title={absoluteTime()}
          >
            {relativeTime()}
          </time>
        {/if}
      </div>
    </div>
  </header>
  
  <!-- 投稿内容 -->
  <div class="text-themed text-sm leading-relaxed whitespace-pre-wrap break-words">
    {post.text}
  </div>
</article>