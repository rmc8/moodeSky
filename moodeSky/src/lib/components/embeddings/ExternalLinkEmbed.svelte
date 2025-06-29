<!--
  ExternalLinkEmbed.svelte
  外部リンク埋め込みコンポーネント
  app.bsky.embed.external および app.bsky.embed.external#view 対応
  リンクプレビューカード、メタデータ表示、サムネイル対応
-->
<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import type { ExternalEmbed, ExternalEmbedView, EmbedDisplayOptions } from './types.js';
  import { DEFAULT_EMBED_DISPLAY_OPTIONS } from './types.js';

  interface Props {
    /** 外部リンク埋め込みデータ */
    embed: ExternalEmbed | ExternalEmbedView;
    /** 表示オプション */
    options?: Partial<EmbedDisplayOptions>;
    /** 追加CSSクラス */
    class?: string;
    /** リンククリック時の処理（デフォルト: 新しいタブで開く） */
    onLinkClick?: (url: string, event: MouseEvent) => void;
    /** 画像クリック時の処理（デフォルト: リンククリックと同じ） */
    onImageClick?: (imageUrl: string, linkUrl: string, event: MouseEvent) => void;
  }

  const { 
    embed, 
    options = {}, 
    class: additionalClass = '',
    onLinkClick,
    onImageClick
  }: Props = $props();

  // 内部状態
  let imageLoaded = $state(false);
  let imageError = $state(false);

  // 表示設定のマージ
  const displayOptions = $derived({ ...DEFAULT_EMBED_DISPLAY_OPTIONS, ...options });

  // 外部リンクデータの正規化（embed vs embedView の違いを吸収）
  const linkData = $derived(() => {
    const result = {
      uri: embed.external.uri,
      title: embed.external.title || 'Untitled',
      description: embed.external.description || '',
      thumb: 'thumb' in embed.external && embed.external.thumb 
        ? (typeof embed.external.thumb === 'string' ? embed.external.thumb : '#')
        : undefined
    };
    
    console.log('🔗 [ExternalLinkEmbed] Link data parsed:', {
      hasThumb: !!result.thumb,
      thumbUrl: result.thumb,
      title: result.title,
      description: result.description?.slice(0, 50) + '...'
    });
    
    return result;
  });

  // ドメイン名を抽出
  const domain = $derived(() => {
    try {
      const url = new URL(linkData().uri);
      return url.hostname.replace(/^www\./, '');
    } catch {
      return linkData().uri;
    }
  });

  // リンククリックハンドラー
  const handleLinkClick = (event: MouseEvent) => {
    if (onLinkClick) {
      event.preventDefault();
      onLinkClick(linkData().uri, event);
    } else {
      // デフォルト: 新しいタブで開く
      window.open(linkData().uri, '_blank', 'noopener,noreferrer');
      event.preventDefault();
    }
  };

  // 画像クリックハンドラー
  const handleImageClick = (event: MouseEvent) => {
    const thumb = linkData().thumb;
    if (onImageClick && thumb) {
      event.preventDefault();
      event.stopPropagation();
      onImageClick(thumb, linkData().uri, event);
    } else {
      // デフォルト: リンククリックと同じ動作
      handleLinkClick(event);
    }
  };

  // 画像読み込み完了ハンドラー
  const handleImageLoad = (event: Event) => {
    console.log('🖼️ [ExternalLinkEmbed] Image loaded successfully:', {
      url: linkData().thumb,
      imageLoaded: imageLoaded,
      imageError: imageError
    });
    imageLoaded = true;
    imageError = false;
    console.log('🖼️ [ExternalLinkEmbed] State after load:', {
      imageLoaded: imageLoaded,
      imageError: imageError
    });
  };

  // 画像読み込みエラーハンドラー
  const handleImageError = (event: Event) => {
    console.log('🚫 [ExternalLinkEmbed] Image load error:', {
      url: linkData().thumb,
      error: event,
      imageLoaded: imageLoaded,
      imageError: imageError
    });
    imageLoaded = false;
    imageError = true;
    console.log('🚫 [ExternalLinkEmbed] State after error:', {
      imageLoaded: imageLoaded,
      imageError: imageError
    });
  };

  // タイトルとディスクリプションの切り詰め
  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  };

  // キーボードイベントハンドラー
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleLinkClick(event as unknown as MouseEvent);
    }
  };
</script>

<!-- 外部リンク埋め込みコンテナ -->
<div 
  class="w-full {additionalClass}"
  style="max-width: {displayOptions.maxWidth}px;"
>
  <!-- リンクプレビューカード -->
  <div
    class="group border border-subtle bg-card hover:bg-muted/5 transition-colors cursor-pointer {displayOptions.rounded ? 'rounded-lg' : ''} overflow-hidden {displayOptions.shadow ? 'shadow-sm hover:shadow-md' : ''}"
    role="button"
    tabindex="0"
    onclick={handleLinkClick}
    onkeydown={handleKeyDown}
    aria-label="外部リンク: {linkData().title}"
  >
    <!-- サムネイル付きレイアウト -->
    {#if linkData().thumb && !imageError}
      <div class="flex">
        <!-- サムネイル画像 -->
        <div 
          class="relative w-32 h-24 flex-shrink-0 bg-muted overflow-hidden cursor-pointer"
          onclick={handleImageClick}
          role="button"
          tabindex="0"
          aria-label="リンクのサムネイル画像"
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleImageClick(e as unknown as MouseEvent);
            }
          }}
        >
          <img
            src={linkData().thumb}
            alt=""
            class="w-full h-full object-cover transition-all duration-200 {imageLoaded ? 'opacity-100' : 'opacity-0'} group-hover:scale-105"
            loading={displayOptions.lazy ? 'lazy' : 'eager'}
            onload={handleImageLoad}
            onerror={handleImageError}
            decoding="async"
          />
          
          <!-- 画像読み込み中プレースホルダー -->
          {#if !imageLoaded && !imageError}
            <div class="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
              <Icon icon={ICONS.IMAGE} size="md" color="secondary" />
            </div>
          {:else if imageError}
            <!-- 画像読み込みエラー表示 -->
            <div class="absolute inset-0 bg-muted flex items-center justify-center">
              <Icon icon={ICONS.IMAGE_OFF} size="md" color="inactive" />
            </div>
          {/if}
          
          <!-- 外部リンクアイコンオーバーレイ -->
          <div class="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
            <Icon icon={ICONS.OPEN_IN_NEW} size="xs" color="white" />
          </div>
        </div>
        
        <!-- テキストコンテンツ -->
        <div class="flex-1 p-3 min-w-0">
          <div class="space-y-1">
            <!-- タイトル -->
            <h3 class="font-medium text-themed text-sm leading-tight line-clamp-2">
              {truncateText(linkData().title, 80)}
            </h3>
            
            <!-- 説明文 -->
            {#if linkData().description}
              <p class="text-secondary text-xs leading-relaxed line-clamp-2">
                {truncateText(linkData().description, 120)}
              </p>
            {/if}
            
            <!-- ドメイン -->
            <div class="flex items-center gap-1 mt-2">
              <Icon icon={ICONS.LANGUAGE} size="xs" color="inactive" />
              <span class="text-inactive text-xs truncate">
                {domain()}
              </span>
            </div>
          </div>
        </div>
      </div>
    {:else}
      <!-- サムネイルなしレイアウト -->
      <div class="p-3">
        <div class="space-y-2">
          <!-- ヘッダー -->
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <!-- タイトル -->
              <h3 class="font-medium text-themed text-sm leading-tight line-clamp-2">
                {truncateText(linkData().title, 100)}
              </h3>
              
              <!-- ドメイン -->
              <div class="flex items-center gap-1 mt-1">
                <Icon icon={ICONS.LANGUAGE} size="xs" color="inactive" />
                <span class="text-inactive text-xs truncate">
                  {domain()}
                </span>
              </div>
            </div>
            
            <!-- 外部リンクアイコン -->
            <div class="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <Icon icon={ICONS.OPEN_IN_NEW} size="sm" color="secondary" />
            </div>
          </div>
          
          <!-- 説明文 -->
          {#if linkData().description}
            <p class="text-secondary text-xs leading-relaxed line-clamp-3">
              {truncateText(linkData().description, 200)}
            </p>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

<!--
使用例:

基本的な使用:
<ExternalLinkEmbed {embed} />

カスタムクリックハンドラー:
<ExternalLinkEmbed 
  {embed}
  onLinkClick={(url, event) => {
    // カスタムリンク処理
    window.open(url, '_blank');
  }}
  onImageClick={(imageUrl, linkUrl, event) => {
    // 画像クリック時の独自処理
    openImageViewer(imageUrl);
  }}
/>

表示オプション:
<ExternalLinkEmbed 
  {embed}
  options={{
    maxWidth: 600,
    rounded: true,
    shadow: true,
    lazy: true
  }}
/>
-->

<style>
  /* 複数行テキストの切り詰め */
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }
  
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    overflow: hidden;
  }
  
  /* ホバー時のスケール効果を滑らかに */
  .group:hover img {
    transform: scale(1.05);
  }
  
  /* フォーカス状態の視覚化 */
  [role="button"]:focus-visible {
    outline: 2px solid rgb(59 130 246 / 0.5);
    outline-offset: 2px;
  }
  
  /* 画像の最適化 */
  img {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
  }
</style>