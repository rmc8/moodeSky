<!--
  DeckTabBar.svelte
  デスクトップ・タブレット用デッキタブバー
  
  配置: SideNavigation内（投稿ボタンの下、ナビゲーション項目の上）
  特徴: クロスプラットフォーム統合スクロールバー、アイコン+テキスト表示
  将来機能: ドラッグ&ドロップ、タブ追加・削除
-->
<script lang="ts">
  import { navigation } from '$lib/i18n/paraglide/messages.js';
  
  // Phase 1: プレースホルダー状態
  // 将来的にタブデータを受け取る予定
  
  // デモ用プレースホルダーデータ（スクロールテスト用に大幅増量）
  const placeholderTabs = [
    { id: 'home', title: navigation.home(), icon: '🏠' },
    { id: 'notifications', title: navigation.notifications(), icon: '🔔' },
    { id: 'search', title: navigation.search(), icon: '🔍' },
    { id: 'timeline1', title: 'タイムライン 1', icon: '📱' },
    { id: 'timeline2', title: 'タイムライン 2', icon: '📺' },
    { id: 'mentions', title: 'メンション', icon: '💬' },
    { id: 'bookmarks', title: 'ブックマーク', icon: '🔖' },
    { id: 'lists', title: 'リスト', icon: '📋' },
    { id: 'analytics', title: '分析', icon: '📊' },
    { id: 'settings', title: '設定', icon: '⚙️' },
    { id: 'following', title: 'フォロー中', icon: '👥' },
    { id: 'followers', title: 'フォロワー', icon: '👨‍👩‍👧‍👦' },
    { id: 'trending', title: 'トレンド', icon: '📈' },
    { id: 'discover', title: '発見', icon: '🔭' },
    { id: 'saved', title: '保存済み', icon: '💾' },
    { id: 'drafts', title: '下書き', icon: '📝' },
    { id: 'archive', title: 'アーカイブ', icon: '📦' },
    { id: 'scheduled', title: '予約投稿', icon: '⏰' },
    { id: 'custom1', title: 'カスタム 1', icon: '🎯' },
    { id: 'custom2', title: 'カスタム 2', icon: '🎨' }
  ];
</script>

<!-- デッキタブバー - 緊急修正: 高さ制限追加 -->
<div class="bg-card border-t border-themed" style="height: calc(100vh - 320px); min-height: 200px;">
  <div class="h-full overflow-y-auto scrollbar-professional p-2 space-y-1">
      <!-- Phase 1: プレースホルダー表示 -->
      {#each placeholderTabs as tab}
        <div
          class="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-themed hover:bg-muted transition-colors duration-200"
          role="tab"
          tabindex="0"
          aria-label={tab.title}
        >
          <!-- アイコン -->
          <span class="text-xl" aria-hidden="true">
            {tab.icon}
          </span>
          
          <!-- タブ名 -->
          <span class="font-medium text-sm truncate">
            {tab.title}
          </span>
        </div>
      {/each}
      
      <!-- Phase 1: プレースホルダーメッセージ -->
      <div class="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
        <p class="text-xs text-themed/70 text-center">
          🚧 Phase 1: タブ表示エリア確保完了<br />
          Phase 2でタブ機能を実装予定
        </p>
      </div>
    </div>
</div>