<!--
  VideoEmbed.svelte
  動画埋め込みコンポーネント
  app.bsky.embed.video および app.bsky.embed.video#view 対応
  最大100MBサイズ、HLS (m3u8) プレイリスト、キャプション対応
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import type { VideoEmbed, VideoEmbedView, EmbedDisplayOptions, AspectRatio } from './types.js';
  import { DEFAULT_EMBED_DISPLAY_OPTIONS } from './types.js';

  interface Props {
    /** 動画埋め込みデータ */
    embed: VideoEmbed | VideoEmbedView;
    /** 表示オプション */
    options?: Partial<EmbedDisplayOptions>;
    /** 追加CSSクラス */
    class?: string;
    /** 自動再生（デフォルト: false） */
    autoplay?: boolean;
    /** ミュート状態（デフォルト: true） */
    muted?: boolean;
    /** ループ再生（デフォルト: false） */
    loop?: boolean;
  }

  const { 
    embed, 
    options = {}, 
    class: additionalClass = '',
    autoplay = false,
    muted = true,
    loop = false
  }: Props = $props();

  // 内部状態
  let videoElement: HTMLVideoElement;
  let isPlaying = $state(false);
  let isLoading = $state(true);
  let hasError = $state(false);
  let currentTime = $state(0);
  let duration = $state(0);
  let volume = $state(muted ? 0 : 0.5);
  let showControls = $state(false);
  let isFullscreen = $state(false);

  // 表示設定のマージ
  const displayOptions = $derived({ ...DEFAULT_EMBED_DISPLAY_OPTIONS, ...options });

  // 動画データの正規化（embed vs embedView の違いを吸収）
  const videoData = $derived(() => ({
    url: 'playlist' in embed ? embed.playlist : '#', // View の場合は playlist URL (m3u8)
    thumbnail: 'thumbnail' in embed ? embed.thumbnail : undefined,
    alt: embed.alt || '',
    aspectRatio: embed.aspectRatio,
    cid: 'cid' in embed ? embed.cid : undefined
  }));

  // アスペクト比スタイルの計算
  const getAspectRatioStyle = (aspectRatio?: AspectRatio) => {
    if (!aspectRatio) return 'aspect-video'; // デフォルト 16:9
    return `aspect-[${aspectRatio.width}/${aspectRatio.height}]`;
  };

  // 再生/一時停止トグル
  const togglePlayPause = () => {
    if (!videoElement) return;
    
    if (isPlaying) {
      videoElement.pause();
    } else {
      videoElement.play();
    }
  };

  // 音量調整
  const handleVolumeChange = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const newVolume = parseFloat(input.value);
    volume = newVolume;
    if (videoElement) {
      videoElement.volume = newVolume;
      videoElement.muted = newVolume === 0;
    }
  };

  // シーク操作
  const handleSeek = (event: Event) => {
    const input = event.target as HTMLInputElement;
    const newTime = parseFloat(input.value);
    currentTime = newTime;
    if (videoElement) {
      videoElement.currentTime = newTime;
    }
  };

  // フルスクリーン切り替え
  const toggleFullscreen = async () => {
    if (!videoElement) return;
    
    try {
      if (isFullscreen) {
        await document.exitFullscreen();
      } else {
        await videoElement.requestFullscreen();
      }
    } catch (error) {
      console.warn('Fullscreen not supported:', error);
    }
  };

  // 時間フォーマット
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // コンポーネントマウント時の処理
  onMount(() => {
    if (!videoElement) return;

    // イベントリスナーの設定
    const handleLoadStart = () => {
      isLoading = true;
      hasError = false;
    };

    const handleLoadedData = () => {
      isLoading = false;
      duration = videoElement.duration;
    };

    const handlePlay = () => {
      isPlaying = true;
    };

    const handlePause = () => {
      isPlaying = false;
    };

    const handleTimeUpdate = () => {
      currentTime = videoElement.currentTime;
    };

    const handleError = () => {
      isLoading = false;
      hasError = true;
    };

    const handleFullscreenChange = () => {
      isFullscreen = !!document.fullscreenElement;
    };

    // イベントリスナー登録
    videoElement.addEventListener('loadstart', handleLoadStart);
    videoElement.addEventListener('loadeddata', handleLoadedData);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('error', handleError);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // クリーンアップ
    return () => {
      videoElement?.removeEventListener('loadstart', handleLoadStart);
      videoElement?.removeEventListener('loadeddata', handleLoadedData);
      videoElement?.removeEventListener('play', handlePlay);
      videoElement?.removeEventListener('pause', handlePause);
      videoElement?.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement?.removeEventListener('error', handleError);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  });
</script>

<!-- 動画埋め込みコンテナ -->
<div 
  class="relative w-full border-subtle rounded-lg overflow-hidden {additionalClass} {getAspectRatioStyle(videoData().aspectRatio)}"
  style="max-width: {displayOptions.maxWidth}px; max-height: {displayOptions.maxHeight}px;"
  onmouseenter={() => showControls = true}
  onmouseleave={() => showControls = false}
>
  <!-- 動画要素 -->
  <video
    bind:this={videoElement}
    class="w-full h-full object-cover {displayOptions.rounded ? 'rounded-lg' : ''}"
    {autoplay}
    {muted}
    {loop}
    playsinline
    preload="metadata"
    aria-label={videoData().alt || '動画コンテンツ'}
    poster={videoData().thumbnail}
  >
    <!-- HLS プレイリスト (m3u8) の場合 -->
    {#if videoData().url.endsWith('.m3u8')}
      <source src={videoData().url} type="application/x-mpegURL" />
    {:else}
      <source src={videoData().url} type="video/mp4" />
    {/if}
    
    <!-- キャプション（将来実装） -->
    <!-- 
    {#if embed.captions}
      {#each embed.captions as caption}
        <track kind="captions" src={caption.file} srclang={caption.lang} />
      {/each}
    {/if}
    -->
    
    <!-- フォールバック -->
    <p class="text-secondary">
      お使いのブラウザは動画の再生をサポートしていません。
    </p>
  </video>

  <!-- エラー表示 -->
  {#if hasError}
    <div class="absolute inset-0 bg-muted flex items-center justify-center {displayOptions.rounded ? 'rounded-lg' : ''}">
      <div class="text-center text-secondary">
        <Icon icon={ICONS.ERROR} size="lg" class="mx-auto mb-2" />
        <p>動画を読み込めませんでした</p>
      </div>
    </div>
  {/if}

  <!-- 読み込み中表示 -->
  {#if isLoading && !hasError}
    <div class="absolute inset-0 bg-black/50 flex items-center justify-center">
      <div class="text-center text-white">
        <div class="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2"></div>
        <p class="text-sm">読み込み中...</p>
      </div>
    </div>
  {/if}

  <!-- 中央再生ボタン -->
  {#if !isPlaying && !isLoading && !hasError}
    <button
      class="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors group"
      onclick={togglePlayPause}
      aria-label="動画を再生"
    >
      <div class="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
        <Icon icon={ICONS.PLAY_ARROW} size="lg" color="themed" />
      </div>
    </button>
  {/if}

  <!-- コントロールバー -->
  {#if showControls && !isLoading && !hasError}
    <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 {displayOptions.rounded ? 'rounded-b-lg' : ''}">
      <!-- プログレスバー -->
      <div class="mb-2">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          class="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
          oninput={handleSeek}
        />
      </div>
      
      <!-- コントロールボタン群 -->
      <div class="flex items-center justify-between text-white">
        <!-- 左側コントロール -->
        <div class="flex items-center gap-2">
          <!-- 再生/一時停止 -->
          <button
            class="p-1 hover:bg-white/20 rounded transition-colors"
            onclick={togglePlayPause}
            aria-label={isPlaying ? '一時停止' : '再生'}
          >
            <Icon 
              icon={isPlaying ? ICONS.PAUSE : ICONS.PLAY_ARROW} 
              size="sm" 
              color="white" 
            />
          </button>
          
          <!-- 音量 -->
          <div class="flex items-center gap-1">
            <button
              class="p-1 hover:bg-white/20 rounded transition-colors"
              onclick={() => {
                const newMuted = volume > 0;
                volume = newMuted ? 0 : 0.5;
                if (videoElement) {
                  videoElement.volume = volume;
                  videoElement.muted = newMuted;
                }
              }}
              aria-label={volume === 0 ? 'ミュート解除' : 'ミュート'}
            >
              <Icon 
                icon={volume === 0 ? ICONS.VOLUME_OFF : ICONS.VOLUME_UP} 
                size="sm" 
                color="white" 
              />
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              class="w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
              oninput={handleVolumeChange}
              aria-label="音量"
            />
          </div>
          
          <!-- 時間表示 -->
          <span class="text-sm tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
        
        <!-- 右側コントロール -->
        <div class="flex items-center gap-2">
          <!-- フルスクリーン -->
          <button
            class="p-1 hover:bg-white/20 rounded transition-colors"
            onclick={toggleFullscreen}
            aria-label={isFullscreen ? 'フルスクリーン解除' : 'フルスクリーン'}
          >
            <Icon 
              icon={isFullscreen ? ICONS.FULLSCREEN_EXIT : ICONS.FULLSCREEN} 
              size="sm" 
              color="white" 
            />
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- alt テキスト表示（設定で有効な場合） -->
  {#if displayOptions.showAlt && videoData().alt}
    <div 
      class="absolute top-2 left-2 bg-black/60 text-white text-sm px-2 py-1 rounded backdrop-blur-sm max-w-xs"
      aria-hidden="true"
    >
      {videoData().alt}
    </div>
  {/if}
</div>

<!--
使用例:

基本的な使用:
<VideoEmbed {embed} />

自動再生・ミュート:
<VideoEmbed 
  {embed}
  autoplay={true}
  muted={true}
/>

カスタムオプション:
<VideoEmbed 
  {embed}
  options={{
    maxWidth: 800,
    maxHeight: 450,
    rounded: true,
    showAlt: true
  }}
/>
-->

<style>
  /* スライダーのカスタムスタイル */
  .slider {
    -webkit-appearance: none;
    appearance: none;
  }
  
  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  .slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  /* ホバー時のスライダー */
  .slider:hover::-webkit-slider-thumb {
    transform: scale(1.2);
  }
  
  .slider:hover::-moz-range-thumb {
    transform: scale(1.2);
  }
  
  /* フォーカス状態 */
  .slider:focus {
    outline: none;
  }
  
  .slider:focus::-webkit-slider-thumb {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
  }
  
  .slider:focus::-moz-range-thumb {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
  }
</style>