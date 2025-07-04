<!--
  ImageEmbed.svelte
  画像埋め込みコンポーネント
  app.bsky.embed.images および app.bsky.embed.images#view 対応
-->
<script lang="ts">
  import type { ImageEmbed, ImageEmbedView, EmbedDisplayOptions, AspectRatio } from './types.js';
  import { DEFAULT_EMBED_DISPLAY_OPTIONS } from './types.js';
  import { normalizeEmbedToView, analyzeEmbedStructure } from '$lib/services/embedService.js';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';

  interface Props {
    /** 画像埋め込みデータ */
    embed: ImageEmbed | ImageEmbedView;
    /** 表示オプション */
    options?: Partial<EmbedDisplayOptions>;
    /** 追加CSSクラス */
    class?: string;
    /** クリック時の処理 */
    onClick?: (imageIndex: number, imageUrl: string) => void;
    /** 最大表示画像数（引用ポストなどで制限用） */
    maxImages?: number;
  }

  const { 
    embed, 
    options = {}, 
    class: additionalClass = '',
    onClick,
    maxImages = 4
  }: Props = $props();

  // 表示設定のマージ
  const displayOptions = $derived({ ...DEFAULT_EMBED_DISPLAY_OPTIONS, ...options });

  // 埋め込みデータを正規化してView形式に変換
  const normalizedEmbed = $derived(() => {
    // EmbedService を使用して正規化
    const normalized = normalizeEmbedToView(embed as any);
    if (!normalized || normalized.$type !== 'app.bsky.embed.images#view') {
      return null;
    }
    return normalized as ImageEmbedView;
  });

  // 画像データの処理（正規化済みのView形式から）
  const images = $derived(() => {
    const normalized = normalizedEmbed();
    if (!normalized || !normalized.images) {
      return [];
    }

    return normalized.images.map((img, index) => {
      // URL優先順位: thumb → fullsize → フォールバック処理
      let imageUrl = '';
      let fullImageUrl = '';

      if (img.thumb && img.thumb !== '' && img.thumb !== '#') {
        imageUrl = img.thumb;
      } else if (img.fullsize && img.fullsize !== '' && img.fullsize !== '#') {
        imageUrl = img.fullsize;
      }

      if (img.fullsize && img.fullsize !== '' && img.fullsize !== '#') {
        fullImageUrl = img.fullsize;
      } else if (img.thumb && img.thumb !== '' && img.thumb !== '#') {
        fullImageUrl = img.thumb;
      } else {
        fullImageUrl = imageUrl;
      }

      return {
        id: `img-${index}`,
        url: imageUrl,
        fullUrl: fullImageUrl,
        alt: img.alt || '',
        aspectRatio: img.aspectRatio
      };
    });
  });

  // 16:9美しいレイアウトクラスの計算
  const gridLayoutClass = $derived(() => {
    const count = Math.min(images().length, maxImages);
    
    // 美しい16:9レイアウトパターン
    switch (count) {
      case 1:
        return 'image-layout-single';
      case 2:
        return maxImages >= 2 ? 'image-layout-double' : 'image-layout-single';
      case 3:
        return maxImages >= 3 ? 'image-layout-triple' : 'image-layout-single';
      case 4:
        return maxImages >= 4 ? 'image-layout-quad' : 'image-layout-single';
      default:
        return maxImages >= 4 ? 'image-layout-quad' : 'image-layout-single';
    }
  });

  // 個別画像のスタイルクラス（16:9レイアウト対応）
  const getImageClass = (index: number, totalCount: number) => {
    let baseClass = 'relative overflow-hidden transition-all duration-200 bg-muted border border-subtle';
    
    // 角丸設定
    if (displayOptions.rounded) {
      baseClass += ' rounded-lg';
    }
    
    // ホバー効果
    if (displayOptions.interactive) {
      baseClass += ' hover:scale-[1.02] hover:shadow-lg';
    }
    
    // クリック可能な場合
    if (displayOptions.clickable && onClick) {
      baseClass += ' cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50';
    }
    
    // 枚数別の特殊位置指定
    switch (totalCount) {
      case 1:
        baseClass += ' image-item-single';
        break;
      case 2:
        baseClass += index === 0 ? ' image-item-double-left' : ' image-item-double-right';
        break;
      case 3:
        if (index === 0) baseClass += ' image-item-triple-left';
        else if (index === 1) baseClass += ' image-item-triple-top-right';
        else baseClass += ' image-item-triple-bottom-right';
        break;
      case 4:
      default:
        if (index === 0) baseClass += ' image-item-quad-top-left';
        else if (index === 1) baseClass += ' image-item-quad-top-right';
        else if (index === 2) baseClass += ' image-item-quad-bottom-left';
        else baseClass += ' image-item-quad-bottom-right';
        break;
    }
    
    return baseClass;
  };

  // 16:9レイアウトでは個別アスペクト比は使用しない
  // object-coverで美しくクロップして統一感を保つ
  const getAspectRatioStyle = (aspectRatio?: AspectRatio) => {
    // 16:9レイアウトシステムでは個別のアスペクト比は適用しない
    // CSSグリッドとobject-coverによる美しい統一レイアウトを優先
    return '';
  };

  // 画像クリックハンドラー
  const handleImageClick = (index: number, imageUrl: string) => {
    if (onClick && displayOptions.clickable) {
      onClick(index, imageUrl);
    }
  };

  // 画像読み込み状態管理
  let imageLoadStates = $state<Record<string, boolean>>({});
  let imageErrorStates = $state<Record<string, boolean>>({});

  // 画像URLから状態キーへのマッピング用ヘルパー
  const getStateKey = (url: string) => url;

  // 画像の読み込み状態を簡素化
  const isImageLoaded = (url: string) => imageLoadStates[url] ?? false;
  const hasImageError = (url: string) => imageErrorStates[url] ?? false;

  // 画像の読み込み完了ハンドラー
  const handleImageLoad = (event: Event) => {
    const img = event.target as HTMLImageElement;
    const imageUrl = img.src;
    const stateKey = getStateKey(imageUrl);
    
    imageLoadStates[stateKey] = true;
    imageErrorStates[stateKey] = false;
  };

  // 画像の読み込みエラーハンドラー
  const handleImageError = (event: Event) => {
    const img = event.target as HTMLImageElement;
    const imageUrl = img.src;
    const stateKey = getStateKey(imageUrl);
    
    img.style.display = 'none';
    imageLoadStates[stateKey] = false;
    imageErrorStates[stateKey] = true;
  };
</script>

<!-- 画像埋め込みコンテナ（16:9美しいレイアウト） -->
<div 
  class="w-full {additionalClass}"
  style="{displayOptions.maxWidth ? `max-width: ${displayOptions.maxWidth}px;` : ''}"
>
  <!-- 16:9美しい画像グリッド -->
  <div class="relative w-full aspect-[16/9] rounded-lg overflow-hidden {gridLayoutClass()}">
    {#each images().slice(0, maxImages) as image, index}
      <!-- 個別画像コンテナ -->
      {#if displayOptions.clickable}
        <button
          class={getImageClass(index, Math.min(images().length, maxImages))}
          aria-label={`画像 ${index + 1} を表示`}
          onclick={() => handleImageClick(index, image.fullUrl)}
        >
          <!-- 画像要素 -->
          {#if image.url && image.url !== '' && image.url !== '#'}
            <img
              src={image.url}
              alt={image.alt}
              class="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 {isImageLoaded(image.url) ? 'opacity-100' : 'opacity-0'}"
              loading={displayOptions.lazy ? 'lazy' : 'eager'}
              decoding="async"
              onload={handleImageLoad}
              onerror={handleImageError}
            />
          {:else}
            <!-- 無効なURL用のプレースホルダー -->
            <div class="absolute inset-0 w-full h-full bg-muted flex items-center justify-center">
              <div class="text-center">
                <Icon icon={ICONS.ERROR} size="lg" color="inactive" />
                <p class="text-xs text-inactive mt-1">画像URL無効</p>
              </div>
            </div>
          {/if}
          
          <!-- alt テキストオーバーレイ（設定で有効な場合） -->
          {#if displayOptions.showAlt && image.alt}
            <div 
              class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-sm p-2 backdrop-blur-sm"
              aria-hidden="true"
            >
              {image.alt}
            </div>
          {/if}
          
          <!-- 読み込み中プレースホルダー -->
          {#if image.url && image.url !== '' && image.url !== '#'}
            {#if !isImageLoaded(image.url) && !hasImageError(image.url)}
              <div 
                class="absolute inset-0 bg-muted animate-pulse flex items-center justify-center"
                aria-hidden="true"
              >
                <div class="w-8 h-8 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin"></div>
              </div>
            {:else if hasImageError(image.url)}
              <!-- 画像読み込みエラー表示 -->
              <div 
                class="absolute inset-0 bg-muted flex items-center justify-center"
                aria-hidden="true"
              >
                <div class="text-center">
                  <Icon icon={ICONS.ERROR} size="lg" color="inactive" />
                  <p class="text-xs text-inactive mt-1">読み込み失敗</p>
                </div>
              </div>
            {/if}
          {/if}
        </button>
      {:else}
        <div class={getImageClass(index, Math.min(images().length, maxImages))}>
          <!-- 画像要素 -->
          {#if image.url && image.url !== '' && image.url !== '#'}
            <img
              src={image.url}
              alt={image.alt}
              class="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 {isImageLoaded(image.url) ? 'opacity-100' : 'opacity-0'}"
              loading={displayOptions.lazy ? 'lazy' : 'eager'}
              decoding="async"
              onload={handleImageLoad}
              onerror={handleImageError}
            />
          {:else}
            <!-- 無効なURL用のプレースホルダー -->
            <div class="absolute inset-0 w-full h-full bg-muted flex items-center justify-center">
              <div class="text-center">
                <Icon icon={ICONS.ERROR} size="lg" color="inactive" />
                <p class="text-xs text-inactive mt-1">画像URL無効</p>
              </div>
            </div>
          {/if}
          
          <!-- alt テキストオーバーレイ（設定で有効な場合） -->
          {#if displayOptions.showAlt && image.alt}
            <div 
              class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-sm p-2 backdrop-blur-sm"
              aria-hidden="true"
            >
              {image.alt}
            </div>
          {/if}
          
          <!-- 読み込み中プレースホルダー -->
          {#if image.url && image.url !== '' && image.url !== '#'}
            {#if !isImageLoaded(image.url) && !hasImageError(image.url)}
              <div 
                class="absolute inset-0 bg-muted animate-pulse flex items-center justify-center"
                aria-hidden="true"
              >
                <div class="w-8 h-8 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin"></div>
              </div>
            {:else if hasImageError(image.url)}
              <!-- 画像読み込みエラー表示 -->
              <div 
                class="absolute inset-0 bg-muted flex items-center justify-center"
                aria-hidden="true"
              >
                <div class="text-center">
                  <Icon icon={ICONS.ERROR} size="lg" color="inactive" />
                  <p class="text-xs text-inactive mt-1">読み込み失敗</p>
                </div>
              </div>
            {/if}
          {/if}
        </div>
      {/if}
    {/each}
  </div>
  
  <!-- 画像枚数インジケーター＋追加画像表示 -->
  {#if images().length > maxImages}
    <!-- 制限枚数以上の場合: 最後の画像に+N表示オーバーレイ -->
    <div class="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm z-10">
      +{images().length - maxImages}
    </div>
  {/if}
  
</div>

<!--
使用例:

基本的な使用:
<ImageEmbed {embed} />

カスタムオプション付き:
<ImageEmbed 
  {embed}
  options={{
    maxWidth: 800,
    rounded: true,
    interactive: true,
    clickable: true
  }}
  onClick={(index, url) => openLightbox(url)}
/>

非インタラクティブ:
<ImageEmbed 
  {embed}
  options={{
    interactive: false,
    clickable: false,
    showAlt: false
  }}
/>
-->

<style>
  /* ===================================================================
     16:9美しい画像レイアウトシステム
     Bluesky/Twitter風の洗練されたソーシャルメディアレイアウト
   =================================================================== */

  /* 1枚レイアウト: フル16:9表示 */
  .image-layout-single {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
  }
  
  .image-item-single {
    grid-column: 1;
    grid-row: 1;
  }

  /* 2枚レイアウト: 左右分割（各8:9相当） */
  .image-layout-double {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr;
  }
  
  .image-item-double-left {
    grid-column: 1;
    grid-row: 1;
  }
  
  .image-item-double-right {
    grid-column: 2;
    grid-row: 1;
  }

  /* 3枚レイアウト: 左右分割 + 左側を上下分割 */
  .image-layout-triple {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
  }
  
  .image-item-triple-left {
    grid-column: 1;
    grid-row: 1 / 3; /* 2行分を占有 */
  }
  
  .image-item-triple-top-right {
    grid-column: 2;
    grid-row: 1;
  }
  
  .image-item-triple-bottom-right {
    grid-column: 2;
    grid-row: 2;
  }

  /* 4枚レイアウト: 2x2グリッド */
  .image-layout-quad {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
  }
  
  .image-item-quad-top-left {
    grid-column: 1;
    grid-row: 1;
  }
  
  .image-item-quad-top-right {
    grid-column: 2;
    grid-row: 1;
  }
  
  .image-item-quad-bottom-left {
    grid-column: 1;
    grid-row: 2;
  }
  
  .image-item-quad-bottom-right {
    grid-column: 2;
    grid-row: 2;
  }

  /* ===================================================================
     共通スタイル
   =================================================================== */

  /* フォーカス状態の視覚化 */
  [role="button"]:focus-visible {
    outline: 2px solid rgb(59 130 246 / 0.5);
    outline-offset: 2px;
    z-index: 10;
  }
  
  /* 画像の最適化 */
  img {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
  }
  
  /* ホバー時のスケール効果を滑らかに */
  .hover\:scale-\[1\.02\]:hover {
    transform: scale(1.02);
    transition: transform 0.2s ease-out;
  }

  /* ===================================================================
     レスポンシブ対応
   =================================================================== */

  /* モバイル（480px未満）: gap調整 */
  @media (max-width: 480px) {
    .image-layout-single,
    .image-layout-double,
    .image-layout-triple,
    .image-layout-quad {
      gap: 2px;
    }
  }

  /* タブレット（768px未満）: 少し広めのgap */
  @media (min-width: 480px) and (max-width: 768px) {
    .image-layout-single,
    .image-layout-double,
    .image-layout-triple,
    .image-layout-quad {
      gap: 3px;
    }
  }

  /* デスクトップ（768px以上）: 標準gap */
  @media (min-width: 768px) {
    .image-layout-single,
    .image-layout-double,
    .image-layout-triple,
    .image-layout-quad {
      gap: 4px;
    }
  }

  /* ダークモード対応 */
  @media (prefers-color-scheme: dark) {
    .bg-black\/60 {
      background-color: rgba(0, 0, 0, 0.8);
    }
  }
</style>