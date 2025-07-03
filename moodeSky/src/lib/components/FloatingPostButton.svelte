<!--
  FloatingPostButton.svelte
  モバイル用フローティング投稿ボタン
  
  右下に配置されるフローティングボタン
  - スクロール中は非表示
  - スクロール停止時に表示
  - モバイルのみ表示（768px未満）
  - 半透明背景でBottomNavigationと干渉しない
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Icon from './Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import { useTranslation } from '$lib/utils/reactiveTranslation.svelte.js';
  
  // リアクティブ翻訳システム
  const { t } = useTranslation();
  
  // 定数定義
  const MOBILE_BREAKPOINT = 768;
  const SCROLL_DEBOUNCE_MS = 150;
  const BUTTON_BOTTOM_OFFSET = '5rem';
  const BUTTON_RIGHT_OFFSET = '1rem';
  
  // プロップス
  interface Props {
    class?: string;
  }
  
  const { class: className = '' }: Props = $props();
  
  // 状態管理
  let isScrolling = $state(false);
  let windowWidth = $state(typeof window !== 'undefined' ? window.innerWidth : 1024);
  
  // モバイル判定
  const isMobile = $derived(windowWidth < MOBILE_BREAKPOINT);
  
  // 表示判定（モバイルかつスクロール中でない場合に表示）
  const shouldShow = $derived(isMobile && !isScrolling);
  
  // スクロール関連の状態
  let scrollTimeout: ReturnType<typeof setTimeout> | undefined;
  
  onMount(() => {
    // 初期画面幅設定
    windowWidth = window.innerWidth;
    
    // リサイズ監視
    const handleResize = () => {
      windowWidth = window.innerWidth;
    };
    
    // スクロール監視（デバウンス付き）
    const handleScroll = () => {
      // スクロール中フラグをON
      isScrolling = true;
      
      // 既存のタイムアウトをクリア
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      // 150ms後にスクロール停止と判定
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, SCROLL_DEBOUNCE_MS);
    };
    
    // イベントリスナー追加
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // クリーンアップ
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  });
  
  // 投稿ボタンクリックハンドラー
  const handlePostClick = () => {
    console.log('🚀 [FloatingPostButton] Post button clicked');
    // TODO: 投稿作成画面への遷移を実装
    // 現在は機能未実装のため、アラートを表示
    alert('投稿作成機能は現在開発中です');
    
    // 将来的には以下のような遷移を実装
    // goto('/compose');
  };
</script>

<!-- フローティング投稿ボタン（モバイルのみ） -->
{#if isMobile}
  <button
    class="
      fixed bottom-20 right-4 z-40
      w-14 h-14 
      bg-primary/80 backdrop-blur-sm
      text-white
      rounded-full
      shadow-lg shadow-primary/25
      transition-all duration-300 ease-out
      hover:bg-primary hover:scale-105
      active:scale-95
      focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
      {shouldShow ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
      {className}
    "
    onclick={handlePostClick}
    aria-label={t('navigation.compose')}
    aria-hidden={!shouldShow}
  >
    <!-- 投稿アイコン -->
    <div class="flex items-center justify-center w-full h-full">
      <Icon 
        icon={ICONS.ADD}
        size="lg"
        color="white"
        ariaLabel={t('navigation.compose')}
        decorative={true}
      />
    </div>
    
    <!-- ホバー時のリップル効果 -->
    <div 
      class="
        absolute inset-0 rounded-full
        bg-white/10 
        scale-0 transition-transform duration-200
        hover:scale-100
      "
      aria-hidden="true"
    ></div>
  </button>
{/if}

<style>
  /* CSS変数定義 */
  :root {
    --button-bottom-offset: 5rem;
    --button-right-offset: 1rem;
  }

  /* フローティングボタンのアニメーション最適化 */
  button {
    /* GPU加速でスムーズなアニメーション */
    transform: translateZ(0);
    will-change: transform, opacity;
  }
  
  /* フォーカス状態の視覚化強化 */
  button:focus-visible {
    transform: scale(1.05);
    box-shadow: 
      0 8px 25px rgba(var(--color-primary-rgb), 0.3),
      0 0 0 2px rgba(var(--color-primary-rgb), 0.5);
  }
  
  /* アクティブ状態のフィードバック */
  button:active {
    transition-duration: 100ms;
  }
  
  /* ホバー時の影効果強化 */
  button:hover {
    box-shadow: 
      0 12px 30px rgba(var(--color-primary-rgb), 0.4),
      0 4px 15px rgba(0, 0, 0, 0.1);
  }
  
  /* リップル効果のカスタマイズ */
  button:hover .absolute {
    animation: ripple 0.6s ease-out;
  }
  
  @keyframes ripple {
    0% {
      transform: scale(0);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 0;
    }
  }
  
  /* モバイル特化の最適化とセーフエリア対応 */
  @media (max-width: 767px) {
    button {
      /* モバイルでのタッチフィードバック最適化 */
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      
      /* セーフエリア対応 */
      bottom: calc(var(--button-bottom-offset, 5rem) + env(safe-area-inset-bottom, 0px));
      right: calc(var(--button-right-offset, 1rem) + env(safe-area-inset-right, 0px));
    }
  }
</style>