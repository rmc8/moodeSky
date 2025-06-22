<!--
  Navigation.svelte
  レスポンシブナビゲーションコンポーネント
  
  スマートフォン: ボトムナビゲーション
  タブレット・デスクトップ: サイドナビゲーション
  
  改良版 JavaScript 制御（SSR対応・初期値最適化）
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import BottomNavigation from './BottomNavigation.svelte';
  import SideNavigation from './SideNavigation.svelte';
  import MobileDeckTabs from './deck/MobileDeckTabs.svelte';
  
  // $propsを使用してプロップを受け取る（Svelte 5 runes mode）
  const { currentPath = '', accountId = '', onAddDeck } = $props<{ 
    currentPath?: string; 
    accountId?: string; 
    onAddDeck?: () => void;
  }>();
  
  // SSR対応: 初期値をデスクトップサイズに設定（表示遅延を防ぐ）
  // ブラウザ環境では実際の幅をチェック、サーバー環境ではデスクトップを仮定
  let isDesktop = $state(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  
  // 設定画面判定
  const isSettingsPage = $derived(currentPath.startsWith('/settings'));
  
  onMount(() => {
    // 768px以上をデスクトップとする（TailwindCSSのmdブレークポイント）
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    
    // 即座に正しい値を設定
    isDesktop = mediaQuery.matches;
    console.log('🔍 [Navigation] Media query matches:', isDesktop, 'Window width:', window.innerWidth);
    
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
  {console.log('🔍 [Navigation] Rendering desktop navigation (SideNavigation)')}
  <SideNavigation {currentPath} {accountId} {onAddDeck} />
{:else}
  <!-- モバイル用ナビゲーション (768px未満) -->
  {console.log('🔍 [Navigation] Rendering mobile navigation')}
  <!-- モバイル用デッキタブ (画面最上部) - 設定画面では非表示 -->
  {#if !isSettingsPage}
    <MobileDeckTabs />
  {/if}
  
  <!-- モバイル用ボトムナビゲーション -->
  <BottomNavigation {currentPath} {accountId} {onAddDeck} />
{/if}