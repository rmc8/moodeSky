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
        class:nav-hover={!isActive(item.path)}
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

<!-- ボトムナビゲーション分のスペース確保 -->
<div class="h-14"></div>

<!-- カラム追加モーダル（モバイル用） -->
{#if showAddColumnModal}
  <button
    class="modal-overlay" 
    onclick={handleCloseAddModal}
    onkeydown={(e) => e.key === 'Escape' && handleCloseAddModal()}
    role="dialog" 
    aria-modal="true"
    aria-label={m['common.close']()}
    tabindex="0"
  >
    <div 
      class="modal-content" 
      onclick={(e) => e.stopPropagation()}
      role="document"
    >
      <div class="modal-header">
        <h3 class="text-themed text-lg font-semibold">
          {m['deck.addColumn']()}
        </h3>
        <div 
          class="modal-close"
          onclick={handleCloseAddModal}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCloseAddModal()}
          role="button"
          tabindex="0"
          aria-label={m['common.close']()}
        >
          <Icon icon={ICONS.CLOSE} size="md" color="themed" />
        </div>
      </div>
      
      <div class="modal-body">
        <p class="text-themed opacity-70 mb-4">
          {m['deck.selectColumnType']()}
        </p>
        
        <!-- デモ用ホームタイムラインボタン -->
        <div 
          class="column-type-button"
          onclick={handleAddHomeColumn}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleAddHomeColumn()}
          role="button"
          tabindex="0"
        >
          <Icon icon={ICONS.HOME} size="md" color="primary" />
          <div class="column-type-info">
            <h4 class="text-themed font-medium">{t('navigation.home')}</h4>
            <p class="text-themed opacity-60 text-sm">フォロー中のユーザーの投稿</p>
          </div>
        </div>
      </div>
    </div>
  </button>
{/if}

<style>
  .nav-hover:hover {
    background-color: rgb(var(--primary) / 0.05);
  }
  
  /* モーダル */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgb(var(--foreground) / 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
  }
  
  .modal-content {
    background-color: var(--color-card);
    border-radius: 0.75rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    max-width: 28rem;
    width: 100%;
    margin-left: 1rem;
    margin-right: 1rem;
    border: 1px solid var(--color-border);
  }
  
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    border-bottom: 1px solid rgb(var(--border) / 0.2);
  }
  
  .modal-close {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: background-color 200ms;
  }
  
  .modal-close:hover {
    background-color: rgb(var(--muted) / 0.2);
  }
  
  .modal-body {
    padding: 1.5rem;
  }
  
  /* カラムタイプボタン */
  .column-type-button {
    width: 100%;
    padding: 1rem;
    border: 1px solid rgb(var(--border) / 0.2);
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-align: left;
    transition: all 200ms;
    cursor: pointer;
  }
  
  .column-type-button:hover {
    border-color: rgb(var(--primary) / 0.4);
    background-color: rgb(var(--primary) / 0.05);
  }
  
  .column-type-info {
    flex: 1;
  }
</style>