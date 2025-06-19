<!--
  DeckTabBar.svelte
  デスクトップ・タブレット用デッキタブバー
  
  配置: SideNavigation内（投稿ボタンの下、ナビゲーション項目の上）
  特徴: クロスプラットフォーム統合スクロールバー、アイコン+テキスト表示
  将来機能: ドラッグ&ドロップ、タブ追加・削除
-->
<script lang="ts">
  import { useTranslation } from '$lib/utils/reactiveTranslation.svelte.js';
  
  // リアクティブ翻訳システム
  const { t } = useTranslation();
  
  // Phase 1: プレースホルダー状態
  // 将来的にタブデータを受け取る予定
  
  // デモ用プレースホルダーデータ（スクロールテスト用に大幅増量）
  // $derivedを使用してリアクティブに言語切り替えに対応
  const placeholderTabs = $derived([
    { id: 'home', title: t('navigation.home'), icon: '🏠' },
    { id: 'notifications', title: t('navigation.notifications'), icon: '🔔' },
    { id: 'search', title: t('navigation.search'), icon: '🔍' },
    { id: 'timeline1', title: `${t('deck.tabs.timeline')} 1`, icon: '📱' },
    { id: 'timeline2', title: `${t('deck.tabs.timeline')} 2`, icon: '📺' },
    { id: 'mentions', title: t('deck.tabs.mentions'), icon: '💬' },
    { id: 'bookmarks', title: t('deck.tabs.bookmarks'), icon: '🔖' },
    { id: 'lists', title: t('deck.tabs.lists'), icon: '📋' },
    { id: 'analytics', title: t('deck.tabs.analytics'), icon: '📊' },
    { id: 'settings', title: t('navigation.settings'), icon: '⚙️' },
    { id: 'following', title: t('deck.tabs.following'), icon: '👥' },
    { id: 'followers', title: t('deck.tabs.followers'), icon: '👨‍👩‍👧‍👦' },
    { id: 'trending', title: t('deck.tabs.trending'), icon: '📈' },
    { id: 'discover', title: t('deck.tabs.discover'), icon: '🔭' },
    { id: 'saved', title: t('deck.tabs.saved'), icon: '💾' },
    { id: 'drafts', title: t('deck.tabs.drafts'), icon: '📝' },
    { id: 'archive', title: t('deck.tabs.archive'), icon: '📦' },
    { id: 'scheduled', title: t('deck.tabs.scheduled'), icon: '⏰' },
    { id: 'custom1', title: `${t('deck.tabs.custom')} 1`, icon: '🎯' },
    { id: 'custom2', title: `${t('deck.tabs.custom')} 2`, icon: '🎨' }
  ]);
</script>

<!-- デッキタブバー - 緊急修正: 高さ制限追加 -->
<div class="bg-card border-t border-themed" style="height: calc(100vh - 320px); min-height: 200px;">
  <div class="h-full overflow-y-auto scrollbar-professional p-2 space-y-1">
      <!-- Phase 1: プレースホルダー表示 -->
      {#each placeholderTabs as tab}
        <div
          class="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-themed hover:bg-muted/70 transition-colors duration-200"
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
          🚧 {t('deck.development.phase1Complete')}<br />
          {t('deck.development.phase2Planned')}
        </p>
      </div>
    </div>
</div>