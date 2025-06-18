<!--
  Navigation.svelte
  レスポンシブナビゲーションコンポーネント
  
  スマートフォン: ボトムナビゲーション
  タブレット・デスクトップ: サイドナビゲーション
-->
<script lang="ts">
  import BottomNavigation from './BottomNavigation.svelte';
  import SideNavigation from './SideNavigation.svelte';
  
  export let currentPath: string = '';
</script>

<!-- モバイル用ボトムナビゲーション (768px未満) -->
<div class="md:hidden">
  <BottomNavigation {currentPath} />
</div>

<!-- デスクトップ・タブレット用サイドナビゲーション (768px以上) -->
<div class="hidden md:block">
  <SideNavigation {currentPath} />
</div>