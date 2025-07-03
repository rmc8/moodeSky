<!--
  PostCard.svelte
  シンプルなポスト表示カード
  段階的実装: 作者名、テキスト、日時、アクションボタン、埋め込みコンテンツ
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Avatar from './Avatar.svelte';
  import PostActionButton from './post/PostActionButton.svelte';
  import RepostBadge from './post/RepostBadge.svelte';
  import EmbedRenderer from './embeddings/EmbedRenderer.svelte';
  import RichText from './post/RichText.svelte';
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
  
  // モバイル判定用
  let windowWidth = $state(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const isMobile = $derived(windowWidth < 768);
  
  onMount(() => {
    const handleResize = () => {
      windowWidth = window.innerWidth;
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

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

  // 埋め込みコンテンツの存在チェック
  const hasEmbeds = $derived(() => {
    return !!(post.embed || (post.embeds && post.embeds.length > 0));
  });

  // 埋め込みデータの統一化（embed または embeds）
  const embedsData = $derived(() => {
    if (post.embeds && post.embeds.length > 0) {
      return post.embeds;
    } else if (post.embed) {
      return post.embed;
    }
    return null;
  });

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

  // 埋め込みコンテンツハンドラー
  function handlePostClick(uri: string, cid: string) {
    console.log('Navigate to quoted post:', uri, cid);
    // TODO: 引用投稿へのナビゲーション実装
  }

  function handleAuthorClick(did: string, handle: string) {
    console.log('Navigate to profile:', did, handle);
    // TODO: プロフィールページへのナビゲーション実装
  }

  function handleImageClick(imageIndex: number, imageUrl: string) {
    console.log('Open image viewer:', imageIndex, imageUrl);
    // TODO: 画像ビューアー実装
  }

  function handleVideoClick(videoUrl: string) {
    console.log('Open video player:', videoUrl);
    // TODO: 動画プレーヤー実装
  }

  function handleLinkClick(url: string, event: MouseEvent) {
    console.log('Open external link:', url);
    // デフォルト: 新しいタブで開く
    window.open(url, '_blank', 'noopener,noreferrer');
    event.preventDefault();
  }

  function handleMediaClick(mediaUrl: string, mediaType: string) {
    console.log('Open media:', mediaType, mediaUrl);
    // TODO: 統一メディアビューアー実装
  }

  function handleEmbedError(error: Error, embed: unknown) {
    console.warn('Embed rendering error:', error, embed);
    // TODO: エラー報告システム実装
  }

  // リポストユーザークリックハンドラー
  function handleRepostUserClick(did: string, handle: string) {
    console.log('Navigate to repost user profile:', did, handle);
    // TODO: プロフィールページへのナビゲーション実装
  }
</script>

<article class="bg-card border-b border-subtle p-4 hover:bg-muted/5 transition-colors {className}">
  <RepostBadge 
    reason={post.reason}
    onClick={handleRepostUserClick}
    class="mb-2"
  />
  
  <header class="flex items-start gap-3 mb-3">
    <Avatar 
      src={post.author.avatar}
      displayName={post.author.displayName}
      handle={post.author.handle}
      size="sm"
      class="mt-1"
    />
    <div class="flex-1 min-w-0">
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
  <div class="text-themed text-sm leading-relaxed mb-3">
    <RichText 
      text={post.text}
      facets={post.facets}
      class="break-words"
    />
  </div>

  <!-- 埋め込みコンテンツエリア -->
  {#if hasEmbeds()}
    <div class="mb-3">
      <EmbedRenderer 
        embeds={embedsData()}
        options={{
          maxWidth: isMobile ? undefined : 
                   columnWidth === 'small' ? 350 :
                   columnWidth === 'medium' ? 450 :
                   columnWidth === 'large' ? 550 :
                   columnWidth === 'xl' ? 650 :
                   columnWidth === 'xxl' ? 800 : 600,
          rounded: true,
          interactive: true,
          clickable: true,
          lazy: true
        }}
        onPostClick={handlePostClick}
        onAuthorClick={handleAuthorClick}
        onImageClick={handleImageClick}
        onVideoClick={handleVideoClick}
        onLinkClick={handleLinkClick}
        onMediaClick={handleMediaClick}
        onError={handleEmbedError}
        maxEmbeds={3}
        debug={true}
      />
    </div>
  {/if}

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