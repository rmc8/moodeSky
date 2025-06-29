<!--
  PostCard.svelte
  シンプルなポスト表示カード
  段階的実装: 作者名、テキスト、日時、アクションボタン
-->
<script lang="ts">
  import Avatar from './Avatar.svelte';
  import PostActionButton from './post/PostActionButton.svelte';
  import { formatRelativeTime, formatAbsoluteTime } from '$lib/utils/relativeTime.js';
  import { ICONS } from '$lib/types/icon.js';
  import type { SimplePost } from '$lib/types/post.js';
  import type { ColumnWidth } from '$lib/deck/types.js';
  
  interface Props {
    post: SimplePost;
    class?: string;
    columnWidth?: ColumnWidth;
  }
  
  const { post, class: className = '', columnWidth }: Props = $props();

  // デッキサイズに応じたアクションボタンのギャップクラスを計算
  // 黄金比・フィボナッチ数列を意識した美しい配置
  function getActionButtonGap(columnWidth?: ColumnWidth): string {
    if (!columnWidth) return 'gap-4'; // デフォルト（現在の値）
    
    const gapMap: Record<ColumnWidth, string> = {
      'xxs': 'gap-2',     // 8px (2.9%) - 機能性重視の最小サイズ
      'xs': 'gap-6',      // 24px (7.5%) - 大幅増加でインパクト
      'small': 'gap-12',  // 48px (12.6%) - 黄金比的増加
      'medium': 'gap-16', // 64px (14.2%) - 継続的な美しい増加
      'large': 'gap-20',  // 80px (15.4%) - 劇的な余白増加
      'xl': 'gap-28',     // 112px (18.7%) - さらに豊かな余白
      'xxl': 'gap-40'     // 160px (22.2%) - 最大級の余白
    };
    
    return gapMap[columnWidth] || 'gap-4';
  }
  
  // 投稿日時の相対時間表示
  const relativeTime = $derived(() => formatRelativeTime(post.createdAt));
  
  // ツールチップ用の絶対時間表示  
  const absoluteTime = $derived(() => formatAbsoluteTime(post.createdAt));
  
  // displayNameの有効性チェック
  const hasValidDisplayName = $derived(
    post.author.displayName && post.author.displayName.trim() !== ''
  );
  

  // アクションボタンハンドラー（将来のAT Protocol連携用）
  function handleReply() {
    console.log('Reply to post:', post.uri);
    // TODO: 返信UI実装
  }

  function handleRepost() {
    console.log('Repost:', post.uri);
    // TODO: リポスト実装
  }

  function handleLike() {
    console.log('Like post:', post.uri);
    // TODO: いいね実装
  }

  function handleMore() {
    console.log('More options for post:', post.uri);
    // TODO: その他メニュー実装
  }
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
  <div class="text-themed text-sm leading-relaxed whitespace-pre-wrap break-words mb-3">
    {post.text}
  </div>

  <!-- アクションボタンエリア -->
  <footer class="flex items-center justify-between">
    <div class="flex items-center {getActionButtonGap(columnWidth)}">
      <!-- 返信ボタン -->
      <PostActionButton 
        icon={ICONS.REPLY}
        count={post.replyCount}
        label="返信"
        onclick={handleReply}
      />
      
      <!-- リポストボタン -->
      <PostActionButton 
        icon={ICONS.REPEAT}
        count={post.repostCount}
        label="リポスト"
        onclick={handleRepost}
      />
      
      <!-- いいねボタン -->
      <PostActionButton 
        icon={ICONS.HEART_OUTLINE}
        count={post.likeCount}
        label="いいね"
        onclick={handleLike}
      />
    </div>

    <!-- その他メニューボタン -->
    <PostActionButton 
      icon={ICONS.MORE_HORIZ}
      label="その他のオプション"
      onclick={handleMore}
      hideCount={true}
      class="ml-auto"
    />
  </footer>
</article>