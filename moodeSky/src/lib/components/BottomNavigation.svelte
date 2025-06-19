<!--
  BottomNavigation.svelte
  モバイル用ボトムナビゲーション
  
  下部に固定されたナビゲーションバー
  ホーム・デッキ追加・設定の3項目を均等配置
-->
<script lang="ts">
  import { goto } from '$app/navigation';
  import Icon from './Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import { useTranslation } from '$lib/utils/reactiveTranslation.svelte.js';
  
  // リアクティブ翻訳システム
  const { t } = useTranslation();
  
  export let currentPath: string = '';
  
  interface NavItem {
    id: string;
    label: string;
    icon: string;
    path: string;
  }
  
  const navItems: NavItem[] = [
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
  ];
  
  function isActive(path: string): boolean {
    if (path === '/deck' && (currentPath === '/deck' || currentPath === '/')) {
      return true;
    }
    return currentPath === path;
  }
  
  function handleNavigation(path: string) {
    goto(path);
  }
</script>

<!-- ボトムナビゲーションバー -->
<nav 
  class="fixed bottom-0 left-0 right-0 z-50 bg-card border-t-2 border-themed shadow-lg"
  aria-label={t('navigation.home')}
>
  <div class="flex justify-around items-center py-0.5 px-2">
    {#each navItems as item}
      <button
        class="flex flex-col items-center justify-center px-1 py-1.5 rounded-lg transition-all duration-200 active:scale-95 min-w-0 flex-1"
        style={isActive(item.path) ? "background-color: rgb(var(--primary) / 0.2);" : ""}
        class:text-primary={isActive(item.path)}
        class:text-themed={!isActive(item.path)}
        class:hover:bg-muted={!isActive(item.path)}
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
          class="mb-0.5"
        />
        <span 
          class="text-xs font-medium truncate w-full text-center leading-tight"
          title={item.label}
        >
          {item.label}
        </span>
      </button>
    {/each}
  </div>
</nav>

<!-- ボトムナビゲーション分のスペース確保 -->
<div class="h-14"></div>