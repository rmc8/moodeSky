<!--
  Navigation.svelte
  レスポンシブナビゲーションコンポーネント
  
  スマートフォン: ボトムナビゲーション
  タブレット・デスクトップ: サイドナビゲーション
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import BottomNavigation from './BottomNavigation.svelte';
  import SideNavigation from './SideNavigation.svelte';
  import MobileDeckTabs from './deck/MobileDeckTabs.svelte';
  
  // $propsを使用してプロップを受け取る（Svelte 5 runes mode）
  const { currentPath = '' } = $props<{ currentPath?: string }>();
  
  // メディアクエリを使用してレスポンシブ制御
  let isDesktop = $state(false);
  
  onMount(() => {
    // 768px以上をデスクトップとする（TailwindCSSのmdブレークポイント）
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    
    // 初期値設定
    isDesktop = mediaQuery.matches;
    console.log('🔍 [Navigation] Initial isDesktop:', isDesktop, 'Window width:', window.innerWidth);
    
    // リサイズイベントの監視
    const handleMediaChange = (e: MediaQueryListEvent) => {
      isDesktop = e.matches;
      console.log('🔍 [Navigation] Media query changed, isDesktop:', isDesktop);
    };
    
    mediaQuery.addEventListener('change', handleMediaChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  });
</script>

{#if isDesktop}
  <!-- デスクトップ・タブレット用サイドナビゲーション (768px以上) -->
  {console.log('🔍 [Navigation] Rendering desktop navigation')}
  <SideNavigation {currentPath} />
{:else}
  <!-- モバイル用ナビゲーション (768px未満) -->
  {console.log('🔍 [Navigation] Rendering mobile navigation')}
  <!-- モバイル用デッキタブ (画面最上部) -->
  <MobileDeckTabs />
  
  <!-- モバイル用ボトムナビゲーション -->
  <BottomNavigation {currentPath} />
{/if}