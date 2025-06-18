<!--
  Navigation.svelte
  レスポンシブナビゲーションコンポーネント
  
  スマートフォン: ボトムナビゲーション
  タブレット・デスクトップ: サイドナビゲーション
-->
<script lang="ts">
  import BottomNavigation from './BottomNavigation.svelte';
  import SideNavigation from './SideNavigation.svelte';
  import MobileDeckTabs from './deck/MobileDeckTabs.svelte';
  
  export let currentPath: string = '';
</script>

<!-- モバイル用ナビゲーション (768px未満) -->
<div class="md:hidden">
  <!-- モバイル用デッキタブ (画面最上部) -->
  <MobileDeckTabs />
  
  <!-- モバイル用ボトムナビゲーション -->
  <BottomNavigation {currentPath} />
</div>

<!-- デスクトップ・タブレット用サイドナビゲーション (768px以上) -->
<div class="hidden md:block">
  <SideNavigation {currentPath} />
</div>