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
  import { deckStore } from '$lib/deck/store.svelte.js';
  import * as m from '../../paraglide/messages.js';
  
  // リアクティブ翻訳システム
  const { t } = useTranslation();
  
  // $propsを使用してプロップを受け取る（Svelte 5 runes mode）
  const { currentPath = '', accountId = '', onAddDeck } = $props<{ 
    currentPath?: string; 
    accountId?: string; 
    onAddDeck?: () => void;
  }>();
  
  // カラム追加モーダル状態は親コンポーネントで管理するため削除
  
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
  
  function handleNavigation(path: string, itemId: string) {
    if (itemId === 'deck-add') {
      // デッキ追加ボタンの場合は親コンポーネントのコールバックを呼び出し
      onAddDeck?.();
    } else {
      // その他のナビゲーション
      goto(path);
    }
  }
  
</script>

<!-- ボトムナビゲーションバー -->
<nav 
  class="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-subtle shadow-lg"
  aria-label={t('navigation.home')}
>
  <div class="flex justify-around items-center py-0.5 px-2">
    {#each navItems as item}
      <button
        class="flex flex-col items-center justify-center px-1 py-1.5 rounded-lg transition-all duration-200 active:scale-95 min-w-0 flex-1 focus-ring-subtle focus-visible:outline-2 focus-visible:outline-primary/60 focus-visible:outline-offset-1"
        class:bg-primary-active={isActive(item.path)}
        class:text-primary={isActive(item.path)}
        class:text-themed={!isActive(item.path)}
        class:hover:bg-primary-hover={!isActive(item.path)}
        onclick={() => handleNavigation(item.path, item.id)}
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



