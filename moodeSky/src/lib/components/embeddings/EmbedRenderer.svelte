<!--
  EmbedRenderer.svelte
  統合埋め込みレンダラーコンポーネント
  すべての埋め込みタイプを自動判定して適切なコンポーネントをレンダリング
  
  対応する埋め込みタイプ:
  - app.bsky.embed.images / app.bsky.embed.images#view
  - app.bsky.embed.video / app.bsky.embed.video#view  
  - app.bsky.embed.external / app.bsky.embed.external#view
  - app.bsky.embed.record / app.bsky.embed.record#view
  - app.bsky.embed.recordWithMedia / app.bsky.embed.recordWithMedia#view
-->
<script lang="ts">
  import ImageEmbed from './ImageEmbed.svelte';
  import VideoEmbed from './VideoEmbed.svelte';
  import ExternalLinkEmbed from './ExternalLinkEmbed.svelte';
  import RecordEmbed from './RecordEmbed.svelte';
  import RecordWithMediaEmbed from './RecordWithMediaEmbed.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import type { 
    Embed, 
    EmbedView, 
    EmbedDisplayOptions,
    EmbedType
  } from './types.js';
  import { 
    DEFAULT_EMBED_DISPLAY_OPTIONS,
    isImageEmbed,
    isImageEmbedView,
    isVideoEmbed,
    isVideoEmbedView,
    isExternalEmbed,
    isExternalEmbedView,
    isRecordEmbed,
    isRecordEmbedView,
    isRecordWithMediaEmbed,
    isRecordWithMediaEmbedView,
    getEmbedType,
    validateEmbed
  } from './types.js';

  interface Props {
    /** 埋め込みデータ（単一または配列） */
    embeds?: (Embed | EmbedView)[] | Embed | EmbedView | null;
    /** 表示オプション */
    options?: Partial<EmbedDisplayOptions>;
    /** 追加CSSクラス */
    class?: string;
    /** 引用投稿クリック時の処理 */
    onPostClick?: (uri: string, cid: string) => void;
    /** 作者クリック時の処理 */
    onAuthorClick?: (did: string, handle: string) => void;
    /** 画像クリック時の処理 */
    onImageClick?: (imageIndex: number, imageUrl: string) => void;
    /** 動画クリック時の処理 */
    onVideoClick?: (videoUrl: string) => void;
    /** 外部リンククリック時の処理 */
    onLinkClick?: (url: string, event: MouseEvent) => void;
    /** メディアクリック時の汎用処理 */
    onMediaClick?: (mediaUrl: string, mediaType: string) => void;
    /** エラー時の処理 */
    onError?: (error: Error, embed: unknown) => void;
    /** 最大表示数（配列の場合） */
    maxEmbeds?: number;
    /** 画像の最大表示数 */
    maxImages?: number;
    /** デバッグモード */
    debug?: boolean;
  }

  const { 
    embeds, 
    options = {}, 
    class: additionalClass = '',
    onPostClick,
    onAuthorClick,
    onImageClick,
    onVideoClick,
    onLinkClick,
    onMediaClick,
    onError,
    maxEmbeds = 10,
    maxImages = 4,
    debug = false
  }: Props = $props();

  // 表示設定のマージ
  const displayOptions = $derived({ ...DEFAULT_EMBED_DISPLAY_OPTIONS, ...options });

  // 埋め込みデータの正規化（配列に統一）
  const normalizedEmbeds = $derived(() => {
    if (!embeds) return [];
    
    if (Array.isArray(embeds)) {
      return embeds.slice(0, maxEmbeds);
    }
    
    return [embeds];
  });

  // 有効な埋め込みデータのフィルタリング
  const validEmbeds = $derived(() => {
    const normalized = normalizedEmbeds();
    
    
    return normalized.filter((embed, index) => {
      try {
        if (!embed || typeof embed !== 'object') {
          return false;
        }
        
        // より緩和された基本的な検証
        if (!(embed as any).$type || typeof (embed as any).$type !== 'string') {
          return false;
        }
        
        // 基本的なAT Protocol埋め込みタイプかどうかチェック
        const isValidType = (embed as any).$type.startsWith('app.bsky.embed.');
        if (!isValidType) {
          return false;
        }
        
        
        return true;
      } catch (error) {
        if (onError) {
          onError(error as Error, embed);
        }
        return false;
      }
    });
  });

  // エラーハンドリング付きのコンポーネントレンダリング
  const renderEmbed = (embed: Embed | EmbedView, index: number) => {
    try {
      const embedType = getEmbedType(embed);
      
      
      return { type: embedType, embed, error: null };
    } catch (error) {
      if (onError) {
        onError(error as Error, embed);
      }
      return { type: null, embed, error: error as Error };
    }
  };

  // 各埋め込みのレンダリング情報
  const renderableEmbeds = $derived(() => {
    return validEmbeds().map(renderEmbed);
  });

  // 統計情報（デバッグ用）
  const embedStats = $derived(() => {
    if (!debug) return null;
    
    const stats = {
      total: normalizedEmbeds().length,
      valid: validEmbeds().length,
      types: {} as Record<string, number>
    };
    
    renderableEmbeds().forEach(({ type }) => {
      if (type) {
        stats.types[type] = (stats.types[type] || 0) + 1;
      }
    });
    
    return stats;
  });

  // 複合メディアクリックハンドラー
  const handleMediaClick = (mediaUrl: string, mediaType: string) => {
    if (onMediaClick) {
      onMediaClick(mediaUrl, mediaType);
    } else {
      // デフォルトの処理
      if (mediaType === 'image' && onImageClick) {
        onImageClick(0, mediaUrl);
      } else if (mediaType === 'video' && onVideoClick) {
        onVideoClick(mediaUrl);
      }
    }
  };

  // 画像クリックハンドラー（ImageEmbed用）
  const handleImageEmbedClick = (imageIndex: number, imageUrl: string) => {
    if (onImageClick) {
      onImageClick(imageIndex, imageUrl);
    } else if (onMediaClick) {
      onMediaClick(imageUrl, 'image');
    }
  };
</script>

<!-- 埋め込みレンダラーコンテナ -->
{#if validEmbeds().length > 0}
  <div class="w-full {additionalClass}">

    <!-- 埋め込みコンテンツ -->
    <div class="space-y-3">
      {#each renderableEmbeds() as { type, embed, error }, index}
        {#if error}
          <!-- エラー表示 -->
          <div class="p-3 border border-error/20 bg-error/5 rounded-lg text-center">
            <Icon icon={ICONS.ERROR} size="md" color="error" class="mx-auto mb-1" />
            <p class="text-error text-sm">埋め込みコンテンツを読み込めませんでした</p>
            {#if debug}
              <p class="text-error text-xs mt-1 font-mono">{error.message}</p>
            {/if}
          </div>
        {:else if type === 'images'}
          <!-- 画像埋め込み -->
          <ImageEmbed 
            embed={embed as any}
            options={options}
            onClick={handleImageEmbedClick}
            maxImages={maxImages}
          />
        {:else if type === 'video'}
          <!-- 動画埋め込み -->
          <VideoEmbed 
            embed={embed as any}
            options={options}
          />
        {:else if type === 'external'}
          <!-- 外部リンク埋め込み -->
          <ExternalLinkEmbed 
            embed={embed as any}
            options={options}
            onLinkClick={onLinkClick}
          />
        {:else if type === 'record'}
          <!-- 記録埋め込み -->
          <RecordEmbed 
            embed={embed as any}
            options={options}
            onPostClick={onPostClick}
            onAuthorClick={onAuthorClick}
          />
        {:else if type === 'recordWithMedia'}
          <!-- 記録+メディア埋め込み -->
          <RecordWithMediaEmbed 
            embed={embed as any}
            options={options}
            onPostClick={onPostClick}
            onAuthorClick={onAuthorClick}
            onMediaClick={handleMediaClick}
            onLinkClick={onLinkClick}
          />
        {:else}
          <!-- 未知の埋め込みタイプ -->
          <div class="p-3 border-subtle bg-muted/5 rounded-lg text-center">
            <Icon icon={ICONS.HELP_CIRCLE} size="md" color="secondary" class="mx-auto mb-1" />
            <p class="text-secondary text-sm">未対応の埋め込みタイプ</p>
            {#if debug}
              <p class="text-secondary text-xs mt-1 font-mono">
                Type: {type || 'unknown'} | $type: {(embed as any)?.$type || 'missing'}
              </p>
            {/if}
          </div>
        {/if}
      {/each}
    </div>

    <!-- 表示制限通知 -->
    {#if normalizedEmbeds().length > maxEmbeds}
      <div class="mt-3 p-2 bg-muted/10 rounded text-center">
        <p class="text-secondary text-sm">
          {normalizedEmbeds().length - maxEmbeds} 個の追加埋め込みコンテンツがあります
        </p>
      </div>
    {/if}
  </div>
{:else if embeds !== null && embeds !== undefined}
  <!-- 埋め込みデータはあるが無効な場合 -->
  {#if debug}
    <div class="p-3 border border-warning/20 bg-warning/5 rounded-lg text-center">
      <Icon icon={ICONS.WARNING} size="md" color="warning" class="mx-auto mb-1" />
      <p class="text-warning text-sm">有効な埋め込みコンテンツが見つかりませんでした</p>
      <div class="text-warning text-xs mt-2 space-y-1">
        <p class="font-mono">
          Input: {Array.isArray(embeds) ? `Array(${embeds.length})` : typeof embeds}
        </p>
        <p class="font-mono">
          Normalized: {normalizedEmbeds().length} items
        </p>
        <p class="font-mono">
          Valid: {validEmbeds().length} items
        </p>
        {#if normalizedEmbeds().length > 0 && normalizedEmbeds()[0]}
          <p class="font-mono">
            Sample $type: {(normalizedEmbeds()[0] as any).$type || 'missing'}
          </p>
          <p class="font-mono">
            Sample keys: {Object.keys(normalizedEmbeds()[0] || {}).join(', ')}
          </p>
        {/if}
      </div>
    </div>
  {/if}
{/if}

<!--
使用例:

基本的な使用（単一埋め込み）:
<EmbedRenderer embeds={post.embed} />

複数埋め込み:
<EmbedRenderer embeds={post.embeds} />

すべてのハンドラー付き:
<EmbedRenderer 
  embeds={post.embeds}
  onPostClick={(uri, cid) => navigateToPost(uri)}
  onAuthorClick={(did, handle) => navigateToProfile(handle)}
  onImageClick={(index, url) => openImageViewer(url)}
  onVideoClick={(url) => openVideoPlayer(url)}
  onLinkClick={(url, event) => handleExternalLink(url)}
  onMediaClick={(url, type) => openMediaViewer(url, type)}
  onError={(error, embed) => logError(error, embed)}
/>

カスタムオプション:
<EmbedRenderer 
  embeds={post.embeds}
  options={{
    maxWidth: 600,
    rounded: true,
    interactive: true,
    clickable: true
  }}
  maxEmbeds={5}
/>

デバッグモード:
<EmbedRenderer 
  embeds={post.embeds}
  debug={true}
/>
-->

<style>
  /* 埋め込み間のスペース */
  .space-y-3 > * + * {
    margin-top: 0.75rem;
  }
  
  /* デバッグ情報のスタイル */
  .font-mono {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
  }
  
  /* エラー状態の視覚的強調 */
  .border-error\/20 {
    border-color: rgb(239 68 68 / 0.2);
  }
  
  .bg-error\/5 {
    background-color: rgb(239 68 68 / 0.05);
  }
  
  .text-error {
    color: rgb(239 68 68);
  }
  
  .border-warning\/20 {
    border-color: rgb(245 158 11 / 0.2);
  }
  
  .bg-warning\/5 {
    background-color: rgb(245 158 11 / 0.05);
  }
  
  .text-warning {
    color: rgb(245 158 11);
  }
</style>