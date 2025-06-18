<!--
  MobileDeckTabs.svelte
  モバイル用デッキタブバー
  
  配置: 画面最上部（固定位置）
  特徴: 横スクロール対応、アイコンのみ表示
  将来機能: ドラッグ&ドロップ、タブ追加・削除
-->
<script lang="ts">
  import { navigation } from '$lib/i18n/paraglide/messages.js';
  
  // Phase 1: プレースホルダー状態
  // 将来的にタブデータを受け取る予定
  
  // デモ用プレースホルダーデータ（アイコンのみ、スクロールテスト用に増量）
  const placeholderTabs = [
    { id: 'home', title: navigation.home(), icon: '🏠' },
    { id: 'notifications', title: navigation.notifications(), icon: '🔔' },
    { id: 'search', title: navigation.search(), icon: '🔍' },
    { id: 'trending', title: 'トレンド', icon: '📈' },
    { id: 'lists', title: 'リスト', icon: '📝' },
    { id: 'bookmarks', title: 'ブックマーク', icon: '🔖' },
    { id: 'mentions', title: 'メンション', icon: '💬' },
    { id: 'analytics', title: '分析', icon: '📊' },
    { id: 'timeline1', title: 'タイムライン 1', icon: '📱' },
    { id: 'timeline2', title: 'タイムライン 2', icon: '📺' }
  ];
</script>

<!-- モバイルデッキタブバー -->
<div 
  class="fixed top-0 left-0 right-0 z-40 bg-card border-b-2 border-themed shadow-sm"
  role="tablist"
  aria-label="デッキタブ"
>
  <!-- Phase 1: プレースホルダー表示 -->
  <div class="flex overflow-x-auto scrollbar-hide px-2 py-2">
    {#each placeholderTabs as tab}
      <button
        class="flex-shrink-0 flex items-center justify-center w-12 h-12 mx-1 rounded-lg bg-muted/50 text-themed hover:bg-muted active:scale-95 transition-all duration-200"
        role="tab"
        aria-label={tab.title}
        title={tab.title}
      >
        <!-- アイコンのみ表示 -->
        <span class="text-lg" aria-hidden="true">
          {tab.icon}
        </span>
      </button>
    {/each}
    
    <!-- タブ追加ボタン（プレースホルダー） -->
    <button
      class="flex-shrink-0 flex items-center justify-center w-12 h-12 mx-1 rounded-lg border-2 border-dashed border-themed/30 text-themed/50 hover:border-themed/50 hover:text-themed/70 transition-all duration-200"
      aria-label="タブを追加"
      title="タブを追加（準備中）"
    >
      <span class="text-lg" aria-hidden="true">➕</span>
    </button>
  </div>
</div>

<!-- モバイルタブバー分のスペース確保 -->
<div class="h-16 w-full"></div>