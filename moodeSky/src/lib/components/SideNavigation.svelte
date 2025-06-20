<!--
  SideNavigation.svelte
  デスクトップ・タブレット用サイドナビゲーション
  
  左サイドバー：
  - 上部: 投稿ボタン
  - 下部: ナビゲーション項目（ホーム・デッキ追加・設定）
-->
<script lang="ts">
  import { goto } from '$app/navigation';
  import Icon from './Icon.svelte';
  import DeckTabBar from './deck/DeckTabBar.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import { useTranslation } from '$lib/utils/reactiveTranslation.svelte.js';
  
  // リアクティブ翻訳システム
  const { t } = useTranslation();
  
  // $propsを使用してプロップを受け取る（Svelte 5 runes mode）
  const { currentPath = '' } = $props<{ currentPath?: string }>();
  
  // デバッグログ追加
  console.log('🔍 [SideNavigation] Component mounted, currentPath:', currentPath);
  
  interface NavItem {
    id: string;
    label: string;
    icon: string;
    path: string;
  }
  
  // $derivedを使用してリアクティブに言語切り替えに対応
  const navItems = $derived<NavItem[]>([
    {
      id: 'home',
      label: t('navigation.home'),
      icon: ICONS.HOME,
      path: '/deck'
    },
    {
      id: 'deck-add',
      label: t('navigation.deckAdd'),
      icon: ICONS.ADD_CIRCLE,
      path: '/deck/add'
    },
    {
      id: 'settings',
      label: t('navigation.settings'),
      icon: ICONS.SETTINGS,
      path: '/settings'
    }
  ]);
  
  function isActive(path: string): boolean {
    if (path === '/deck' && (currentPath === '/deck' || currentPath === '/')) {
      return true;
    }
    return currentPath === path;
  }
  
  function handleNavigation(path: string) {
    goto(path);
  }
  
  function handleCompose() {
    // TODO: 投稿作成モーダル/ページを開く
    console.log('投稿作成機能（未実装）');
  }
</script>

<!-- サイドナビゲーションバー -->
<nav 
  class="fixed left-0 top-0 bottom-0 z-40 w-64 bg-card border-r-2 border-themed shadow-lg flex flex-col"
  aria-label={t('navigation.home')}
>
  <!-- 上部: 投稿ボタン -->
  <div class="p-4 border-b border-themed">
    <button
      class="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-4 px-6 rounded-xl text-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 flex items-center justify-center gap-2"
      onclick={handleCompose}
      aria-label={t('navigation.compose')}
    >
      <Icon 
        icon={ICONS.CREATE}
        size="md"
        color="themed"
        ariaLabel={t('navigation.compose')}
        decorative={true}
        class="text-white"
      />
      <span>{t('navigation.post')}</span>
    </button>
  </div>
  
  <!-- 中央部: デッキタブエリア -->
  <DeckTabBar />
  
  <!-- 下部: ナビゲーション項目 -->
  <div class="p-4 space-y-2">
    {#each navItems as item}
      <button
        class="w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 active:scale-98 text-left"
        style={isActive(item.path) ? "background-color: rgb(var(--primary) / 0.2);" : ""}
        class:text-primary={isActive(item.path)}
        class:text-themed={!isActive(item.path)}
        class:nav-hover={!isActive(item.path)}
        onclick={() => handleNavigation(item.path)}
        aria-label={item.label}
        aria-current={isActive(item.path) ? 'page' : undefined}
      >
        <Icon 
          icon={item.icon}
          size="lg"
          color={isActive(item.path) ? 'primary' : 'themed'}
          ariaLabel={item.label}
          decorative={true}
        />
        <span class="font-medium text-lg">
          {item.label}
        </span>
      </button>
    {/each}
  </div>
</nav>

<style>
  .nav-hover:hover {
    background-color: rgb(var(--primary) / 0.05);
  }
</style>