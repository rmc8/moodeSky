<!--
  ImageEmbed.svelte
  画像埋め込みコンポーネント
  app.bsky.embed.images および app.bsky.embed.images#view 対応
-->
<script lang="ts">
  import type { ImageEmbed, ImageEmbedView, EmbedDisplayOptions, AspectRatio } from './types.js';
  import { DEFAULT_EMBED_DISPLAY_OPTIONS } from './types.js';

  interface Props {
    /** 画像埋め込みデータ */
    embed: ImageEmbed | ImageEmbedView;
    /** 表示オプション */
    options?: Partial<EmbedDisplayOptions>;
    /** 追加CSSクラス */
    class?: string;
    /** クリック時の処理 */
    onClick?: (imageIndex: number, imageUrl: string) => void;
  }

  const { 
    embed, 
    options = {}, 
    class: additionalClass = '',
    onClick
  }: Props = $props();

  // 表示設定のマージ
  const displayOptions = $derived({ ...DEFAULT_EMBED_DISPLAY_OPTIONS, ...options });

  // 画像データの正規化（embed vs embedView の違いを吸収）
  const images = $derived(() => {
    return embed.images.map((img, index) => ({
      id: `img-${index}`,
      url: 'thumb' in img ? img.thumb : '#', // View の場合は thumb URL
      fullUrl: 'fullsize' in img ? img.fullsize : '#', // View の場合は fullsize URL  
      alt: img.alt || '',
      aspectRatio: img.aspectRatio
    }));
  });

  // グリッドレイアウトクラスの計算
  const gridClass = $derived(() => {
    const count = images().length;
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count === 3) return 'grid-cols-2'; // 3枚の場合は 2+1 レイアウト
    return 'grid-cols-2'; // 4枚以上は 2x2
  });

  // 個別画像のスタイルクラス
  const getImageClass = (index: number, totalCount: number) => {
    let baseClass = 'relative overflow-hidden transition-all duration-200';
    
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
    
    // 3枚レイアウトの特殊処理
    if (totalCount === 3 && index === 2) {
      baseClass += ' col-span-2'; // 3枚目は横幅2倍
    }
    
    return baseClass;
  };

  // アスペクト比スタイルの計算
  const getAspectRatioStyle = (aspectRatio?: AspectRatio) => {
    if (!aspectRatio) return '';
    const ratio = (aspectRatio.height / aspectRatio.width) * 100;
    return `aspect-ratio: ${aspectRatio.width}/${aspectRatio.height};`;
  };

  // 画像クリックハンドラー
  const handleImageClick = (index: number, imageUrl: string) => {
    if (onClick && displayOptions.clickable) {
      onClick(index, imageUrl);
    }
  };

  // 画像の読み込みエラーハンドラー
  const handleImageError = (event: Event) => {
    const img = event.target as HTMLImageElement;
    const imageUrl = img.src;
    
    console.log('🚫 [ImageEmbed] Image load error:', {
      url: imageUrl,
      error: event,
      loadState: imageLoadStates[imageUrl],
      errorState: imageErrorStates[imageUrl]
    });
    
    img.style.display = 'none';
    imageLoadStates[imageUrl] = false;
    imageErrorStates[imageUrl] = true;
    
    console.log('🚫 [ImageEmbed] State after error:', {
      imageLoadStates,
      imageErrorStates
    });
    // エラー時のフォールバック表示は親要素で処理
  };

  // 画像読み込み状態管理
  let imageLoadStates = $state<Record<string, boolean>>({});
  let imageErrorStates = $state<Record<string, boolean>>({});

  // 画像の読み込み完了ハンドラー
  const handleImageLoad = (event: Event) => {
    const img = event.target as HTMLImageElement;
    const imageUrl = img.src;
    
    console.log('🖼️ [ImageEmbed] Image loaded successfully:', {
      url: imageUrl,
      loadState: imageLoadStates[imageUrl]
    });
    
    img.classList.add('opacity-100');
    img.classList.remove('opacity-0');
    imageLoadStates[imageUrl] = true;
    imageErrorStates[imageUrl] = false;
    
    console.log('🖼️ [ImageEmbed] State after load:', {
      imageLoadStates,
      imageErrorStates
    });
  };
</script>

<!-- 画像埋め込みコンテナ -->
<div 
  class="w-full {additionalClass}"
  style="max-width: {displayOptions.maxWidth}px;"
>
  <!-- 画像グリッド -->
  <div class="grid {gridClass} gap-2">
    {#each images() as image, index}
      <!-- 個別画像コンテナ -->
      <div
        class={getImageClass(index, images().length)}
        style={getAspectRatioStyle(image.aspectRatio)}
        role={displayOptions.clickable ? "button" : undefined}
        tabindex={displayOptions.clickable ? 0 : undefined}
        aria-label={displayOptions.clickable ? `画像 ${index + 1} を表示` : undefined}
        onclick={() => handleImageClick(index, image.fullUrl)}
        onkeydown={(e) => {
          if (displayOptions.clickable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleImageClick(index, image.fullUrl);
          }
        }}
      >
        <!-- 画像要素 -->
        <img
          src={image.url}
          alt={image.alt}
          class="w-full h-full object-cover transition-opacity duration-300 opacity-0"
          loading={displayOptions.lazy ? 'lazy' : 'eager'}
          decoding="async"
          onload={handleImageLoad}
          onerror={handleImageError}
        />
        
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
        {#if !imageLoadStates[image.url] && !imageErrorStates[image.url]}
          <div 
            class="absolute inset-0 bg-muted animate-pulse flex items-center justify-center"
            aria-hidden="true"
          >
            <div class="w-8 h-8 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin"></div>
          </div>
        {:else if imageErrorStates[image.url]}
          <!-- 画像読み込みエラー表示 -->
          <div 
            class="absolute inset-0 bg-muted flex items-center justify-center"
            aria-hidden="true"
          >
            <div class="text-center">
              <Icon icon={ICONS.IMAGE_OFF} size="lg" color="inactive" />
              <p class="text-xs text-inactive mt-1">読み込み失敗</p>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
  
  <!-- 画像枚数インジケーター（3枚以上の場合） -->
  {#if images().length > 2}
    <div class="mt-2 text-center">
      <span class="text-secondary text-sm">
        {images().length} 枚の画像
      </span>
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
  /* アスペクト比維持のためのCSS */
  .grid > div {
    min-height: 120px; /* 最小高さ確保 */
  }
  
  /* 3枚レイアウトの調整 */
  .grid-cols-2 > div:nth-child(3) {
    grid-column: span 2;
    max-height: 200px; /* 3枚目の高さ制限 */
  }
  
  /* フォーカス状態の視覚化 */
  [role="button"]:focus-visible {
    outline: 2px solid rgb(59 130 246 / 0.5);
    outline-offset: 2px;
  }
  
  /* 画像のスムーズな表示 */
  img {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
  }
  
  /* ダークモード対応 */
  @media (prefers-color-scheme: dark) {
    .bg-black\/60 {
      background-color: rgba(0, 0, 0, 0.8);
    }
  }
</style>