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
  const { currentPath = '', accountId = '' } = $props<{ currentPath?: string; accountId?: string }>();
  
  // カラム追加モーダル状態
  let showAddColumnModal = $state(false);
  
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
      // デッキ追加ボタンの場合はモーダルを表示
      showAddColumnModal = true;
    } else {
      // その他のナビゲーション
      goto(path);
    }
  }
  
  /**
   * カラム追加モーダルを閉じる
   */
  function handleCloseAddModal() {
    showAddColumnModal = false;
  }
  
  /**
   * デモ用のホームタイムラインカラムを追加
   */
  async function handleAddHomeColumn() {
    try {
      if (!accountId) {
        console.warn('🔍 [BottomNavigation] accountId not provided, cannot add column');
        return;
      }
      
      await deckStore.addColumn(accountId, 'reverse_chronological', {
        title: t('navigation.home'),
        subtitle: 'デフォルト'
      });
      
      showAddColumnModal = false;
      console.log('🔍 [BottomNavigation] Home column added');
    } catch (error) {
      console.error('🔍 [BottomNavigation] Failed to add home column:', error);
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


<!-- カラム追加モーダル（モバイル用） -->
{#if showAddColumnModal}
  <button
    class="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 border-none p-0 m-0 cursor-pointer" 
    onclick={handleCloseAddModal}
    onkeydown={(e) => e.key === 'Escape' && handleCloseAddModal()}
    role="dialog" 
    aria-modal="true"
    aria-label={m['common.close']()}
    tabindex="0"
  >
    <div 
      class="bg-card rounded-xl shadow-2xl max-w-md w-full mx-4 border border-themed/20" 
      onclick={(e) => e.stopPropagation()}
      role="document"
    >
      <div class="flex items-center justify-between p-6 border-b border-themed/20">
        <h3 class="text-themed text-lg font-semibold">
          {m['deck.addColumn']()}
        </h3>
        <div 
          class="w-8 h-8 flex items-center justify-center rounded cursor-pointer transition-colors duration-200 hover:bg-primary/10"
          onclick={handleCloseAddModal}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCloseAddModal()}
          role="button"
          tabindex="0"
          aria-label={m['common.close']()}
        >
          <Icon icon={ICONS.CLOSE} size="md" color="themed" />
        </div>
      </div>
      
      <div class="p-6">
        <p class="text-themed opacity-70 mb-4">
          {m['deck.selectColumnType']()}
        </p>
        
        <!-- デモ用ホームタイムラインボタン -->
        <div 
          class="w-full p-4 border border-themed/20 rounded-lg flex items-center gap-3 text-left transition-all duration-200 cursor-pointer hover:border-primary/40 hover:bg-primary/5"
          onclick={handleAddHomeColumn}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleAddHomeColumn()}
          role="button"
          tabindex="0"
        >
          <Icon icon={ICONS.HOME} size="md" color="primary" />
          <div class="flex-1">
            <h4 class="text-themed font-medium">{t('navigation.home')}</h4>
            <p class="text-themed opacity-60 text-sm">フォロー中のユーザーの投稿</p>
          </div>
        </div>
      </div>
    </div>
  </button>
{/if}

