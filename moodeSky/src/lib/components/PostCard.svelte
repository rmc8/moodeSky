<!--
  PostCard.svelte
  シンプルなポスト表示カード
  段階的実装: 作者名、テキスト、日時、アクションボタン、埋め込みコンテンツ
-->
<script lang="ts">
  import Avatar from './Avatar.svelte';
  import PostActionButton from './post/PostActionButton.svelte';
  import EmbedRenderer from './embeddings/EmbedRenderer.svelte';
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

  // 埋め込みコンテンツの存在チェック
  const hasEmbeds = $derived(() => {
    const result = !!(post.embed || (post.embeds && post.embeds.length > 0));
    
    // デバッグログ: 埋め込み検出状況（$state.snapshot使用）
    if (post.embed || post.embeds) {
      console.log('🎯 [PostCard] Embed detection for post:', $state.snapshot({
        postUri: post.uri,
        hasEmbed: !!post.embed,
        embedType: post.embed?.$type,
        hasEmbeds: !!(post.embeds && post.embeds.length > 0),
        embedsCount: post.embeds?.length || 0,
        embedsTypes: post.embeds?.map(e => e.$type) || [],
        hasEmbeds_result: result,
        rawEmbed: post.embed,
        rawEmbeds: post.embeds
      }));
    }
    
    return result;
  });

  // 埋め込みデータの統一化（embed または embeds）
  const embedsData = $derived(() => {
    let result = null;
    
    if (post.embeds && post.embeds.length > 0) {
      result = $state.snapshot(post.embeds);  // スナップショット化
      console.log('🎯 [PostCard] Using post.embeds (snapshot):', {
        postUri: post.uri,
        embedsCount: post.embeds.length,
        resultType: Array.isArray(result) ? `Array(${result.length})` : typeof result,
        resultStructure: result,
        hasTypes: result ? result.map(e => e?.$type) : 'none'
      });
    } else if (post.embed) {
      result = $state.snapshot(post.embed);  // スナップショット化
      console.log('🎯 [PostCard] Using post.embed (snapshot):', {
        postUri: post.uri,
        embedType: post.embed.$type,
        resultType: typeof result,
        resultStructure: result,
        hasType: result?.$type || 'missing'
      });
    } else {
      console.log('🎯 [PostCard] No embed data found:', {
        postUri: post.uri,
        hasEmbed: !!post.embed,
        hasEmbeds: !!(post.embeds && post.embeds.length > 0)
      });
    }
    
    return result;
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

  <!-- 埋め込みコンテンツエリア -->
  {#if hasEmbeds()}
    <div class="mb-3">
      {console.log('🎯 [PostCard] Rendering EmbedRenderer with data:', {
        postUri: post.uri,
        embedsData: embedsData(),
        hasEmbeds: hasEmbeds()
      })}
      <EmbedRenderer 
        embeds={embedsData()}
        options={{
          maxWidth: columnWidth === 'xxs' ? 220 : 
                   columnWidth === 'xs' ? 280 :
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
  {:else}
    {console.log('🎯 [PostCard] No embeds to render for post:', {
      postUri: post.uri,
      hasEmbeds: hasEmbeds(),
      embedsData: embedsData()
    })}
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