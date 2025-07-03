<!--
  RecordWithMediaEmbed.svelte
  記録+メディア複合埋め込みコンポーネント
  app.bsky.embed.recordWithMedia および app.bsky.embed.recordWithMedia#view 対応
  引用投稿にメディア（画像・動画・外部リンク）を組み合わせて表示
-->
<script lang="ts">
  import ImageEmbed from './ImageEmbed.svelte';
  import VideoEmbed from './VideoEmbed.svelte';
  import ExternalLinkEmbed from './ExternalLinkEmbed.svelte';
  import RecordEmbed from './RecordEmbed.svelte';
  import type { 
    RecordWithMediaEmbed, 
    RecordWithMediaEmbedView, 
    EmbedDisplayOptions,
    ImageEmbed as ImageEmbedType,
    ImageEmbedView,
    VideoEmbed as VideoEmbedType,
    VideoEmbedView,
    ExternalEmbed as ExternalEmbedType,
    ExternalEmbedView
  } from './types.js';
  import { 
    DEFAULT_EMBED_DISPLAY_OPTIONS,
    isImageEmbed,
    isImageEmbedView,
    isVideoEmbed,
    isVideoEmbedView,
    isExternalEmbed,
    isExternalEmbedView
  } from './types.js';

  interface Props {
    /** 記録+メディア埋め込みデータ */
    embed: RecordWithMediaEmbed | RecordWithMediaEmbedView;
    /** 表示オプション */
    options?: Partial<EmbedDisplayOptions>;
    /** 追加CSSクラス */
    class?: string;
    /** 引用投稿クリック時の処理 */
    onPostClick?: (uri: string, cid: string) => void;
    /** 作者クリック時の処理 */
    onAuthorClick?: (did: string, handle: string) => void;
    /** メディアクリック時の処理 */
    onMediaClick?: (mediaUrl: string, mediaType: string) => void;
    /** 外部リンククリック時の処理 */
    onLinkClick?: (url: string, event: MouseEvent) => void;
    /** レイアウト方向（vertical: 縦, horizontal: 横） */
    layout?: 'vertical' | 'horizontal';
  }

  const { 
    embed, 
    options = {}, 
    class: additionalClass = '',
    onPostClick,
    onAuthorClick,
    onMediaClick,
    onLinkClick,
    layout = 'vertical'
  }: Props = $props();

  // 表示設定のマージ
  const displayOptions = $derived({ ...DEFAULT_EMBED_DISPLAY_OPTIONS, ...options });

  // 記録データの抽出（RecordEmbedに委譲）
  const recordData = $derived(() => embed.record);

  // メディアデータの抽出と型判定
  const mediaData = $derived(() => {
    const media = embed.media as any; // 型安全性のため
    
    if (isImageEmbed(media)) {
      return { type: 'image' as const, data: media };
    } else if (isImageEmbedView(media)) {
      return { type: 'image' as const, data: media };
    } else if (isVideoEmbed(media)) {
      return { type: 'video' as const, data: media };
    } else if (isVideoEmbedView(media)) {
      return { type: 'video' as const, data: media };
    } else if (isExternalEmbed(media)) {
      return { type: 'external' as const, data: media };
    } else if (isExternalEmbedView(media)) {
      return { type: 'external' as const, data: media };
    }
    
    return { type: 'unknown' as const, data: media };
  });

  // レイアウトクラスの計算
  const containerClass = $derived(() => {
    let baseClass = 'w-full space-y-3';
    
    if (layout === 'horizontal' && mediaData().type !== 'video') {
      // 横レイアウト（動画以外）
      baseClass = 'w-full flex gap-3';
    }
    
    return `${baseClass} ${additionalClass}`;
  });

  // 記録部分のクラス
  const recordClass = $derived(() => {
    if (layout === 'horizontal' && mediaData().type !== 'video') {
      return 'flex-1 min-w-0'; // 横レイアウトでは柔軟な幅
    }
    return 'w-full';
  });

  // メディア部分のクラス
  const mediaClass = $derived(() => {
    if (layout === 'horizontal' && mediaData().type !== 'video') {
      if (mediaData().type === 'external') {
        return 'w-1/3 max-w-xs'; // 外部リンクは小さめ
      }
      return 'w-1/2'; // 画像は半分
    }
    return 'w-full';
  });

  // メディア用の表示オプション
  const mediaOptions = $derived(() => ({
    ...displayOptions,
    maxWidth: layout === 'horizontal' ? 300 : displayOptions.maxWidth,
    rounded: true
  }));

  // 記録用の表示オプション  
  const recordOptions = $derived(() => ({
    ...displayOptions,
    maxWidth: layout === 'horizontal' ? undefined : displayOptions.maxWidth
  }));

  // メディアクリックハンドラー
  const handleMediaClick = (mediaUrl: string) => {
    if (onMediaClick) {
      onMediaClick(mediaUrl, mediaData().type);
    }
  };

  // 画像クリックハンドラー
  const handleImageClick = (imageIndex: number, imageUrl: string) => {
    handleMediaClick(imageUrl);
  };

  // 外部リンククリックハンドラー
  const handleLinkClick = (url: string, event: MouseEvent) => {
    if (onLinkClick) {
      event.preventDefault();
      onLinkClick(url, event);
    }
  };
</script>

<!-- RecordEmbed表示用の共通スニペット -->
{#snippet recordContent()}
  <RecordEmbed 
    embed={{ $type: 'app.bsky.embed.record', record: recordData() }}
    options={recordOptions()}
    {onPostClick}
    {onAuthorClick}
    maxDepth={2}
    currentDepth={1}
  />
{/snippet}

<!-- 記録+メディア埋め込みコンテナ -->
<div 
  class={containerClass()}
  style="{displayOptions.maxWidth ? `max-width: ${displayOptions.maxWidth}px;` : ''}"
>
  {#if layout === 'vertical'}
    <!-- 縦レイアウト: メディア → 記録 -->
    
    <!-- メディア部分 -->
    <div class={mediaClass()}>
      {#if mediaData().type === 'image'}
        <ImageEmbed 
          embed={mediaData().data as ImageEmbedType | ImageEmbedView}
          options={mediaOptions()}
          onClick={handleImageClick}
        />
      {:else if mediaData().type === 'video'}
        <VideoEmbed 
          embed={mediaData().data as VideoEmbedType | VideoEmbedView}
          options={mediaOptions()}
        />
      {:else if mediaData().type === 'external'}
        <ExternalLinkEmbed 
          embed={mediaData().data as ExternalEmbedType | ExternalEmbedView}
          options={mediaOptions()}
          onLinkClick={handleLinkClick}
        />
      {:else}
        <!-- 未知のメディアタイプ -->
        <div class="p-3 border-subtle rounded-lg bg-muted/5 text-center">
          <p class="text-secondary text-sm">未対応のメディアタイプ</p>
        </div>
      {/if}
    </div>
    
    <!-- 記録部分 -->
    <div class={recordClass()}>
      {@render recordContent()}
    </div>
    
  {:else}
    <!-- 横レイアウト: 記録 | メディア -->
    
    <!-- 記録部分 -->
    <div class={recordClass()}>
      {@render recordContent()}
    </div>
    
    <!-- メディア部分 -->
    <div class={mediaClass()}>
      {#if mediaData().type === 'image'}
        <ImageEmbed 
          embed={mediaData().data as ImageEmbedType | ImageEmbedView}
          options={mediaOptions()}
          onClick={handleImageClick}
        />
      {:else if mediaData().type === 'video'}
        <!-- 横レイアウトでも動画は縦に表示 -->
        <div class="w-full">
          <VideoEmbed 
            embed={mediaData().data as VideoEmbedType | VideoEmbedView}
            options={{ ...mediaOptions(), maxWidth: displayOptions.maxWidth }}
          />
        </div>
      {:else if mediaData().type === 'external'}
        <ExternalLinkEmbed 
          embed={mediaData().data as ExternalEmbedType | ExternalEmbedView}
          options={mediaOptions()}
          onLinkClick={handleLinkClick}
        />
      {:else}
        <!-- 未知のメディアタイプ -->
        <div class="p-2 border-subtle rounded-lg bg-muted/5 text-center">
          <p class="text-secondary text-xs">未対応</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!--
使用例:

基本的な使用（縦レイアウト）:
<RecordWithMediaEmbed {embed} />

横レイアウト:
<RecordWithMediaEmbed 
  {embed}
  layout="horizontal"
/>

すべてのハンドラー付き:
<RecordWithMediaEmbed 
  {embed}
  onPostClick={(uri, cid) => navigateToPost(uri)}
  onAuthorClick={(did, handle) => navigateToProfile(handle)}
  onMediaClick={(url, type) => openMediaViewer(url, type)}
  onLinkClick={(url) => window.open(url, '_blank')}
/>

カスタムオプション:
<RecordWithMediaEmbed 
  {embed}
  layout="vertical"
  options={{
    maxWidth: 800,
    rounded: true,
    interactive: true,
    clickable: true
  }}
/>
-->

<style>
  /* レスポンシブ調整 */
  @media (max-width: 640px) {
    /* 小画面では常に縦レイアウト */
    .flex {
      flex-direction: column;
    }
    
    .w-1\/2,
    .w-1\/3 {
      width: 100%;
      max-width: none;
    }
  }
  
  /* メディアとテキストの調和 */
  .space-y-3 > * + * {
    margin-top: 0.75rem;
  }
  
  /* 横レイアウトでの最小幅確保 */
  .min-w-0 {
    min-width: 0;
  }
  
  /* フレックスアイテムの調整 */
  .flex-1 {
    flex: 1 1 0%;
  }
</style>