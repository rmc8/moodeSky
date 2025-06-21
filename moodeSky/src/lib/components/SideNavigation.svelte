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
  import { deckStore } from '$lib/deck/store.svelte.js';
  import * as m from '../../paraglide/messages.js';
  
  // リアクティブ翻訳システム
  const { t } = useTranslation();
  
  // $propsを使用してプロップを受け取る（Svelte 5 runes mode）
  const { currentPath = '', accountId = '' } = $props<{ currentPath?: string; accountId?: string }>();
  
  // デバッグログ追加
  console.log('🔍 [SideNavigation] Component mounted, currentPath:', currentPath);
  
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
  
  function handleCompose() {
    // TODO: 投稿作成モーダル/ページを開く
    console.log('投稿作成機能（未実装）');
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
        console.warn('🔍 [SideNavigation] accountId not provided, cannot add column');
        return;
      }
      
      await deckStore.addColumn(accountId, 'reverse_chronological', {
        title: t('navigation.home'),
        subtitle: 'デフォルト'
      });
      
      showAddColumnModal = false;
      console.log('🔍 [SideNavigation] Home column added');
    } catch (error) {
      console.error('🔍 [SideNavigation] Failed to add home column:', error);
    }
  }
</script>

<!-- サイドナビゲーションバー -->
<nav 
  class="side-navigation"
  aria-label={t('navigation.home')}
>
  <!-- 上部: 投稿ボタン -->
  <div class="side-navigation__header">
    <button
      class="side-navigation__compose-button"
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
  <div class="side-navigation__deck-tabs">
    <DeckTabBar />
  </div>
  
  <!-- 下部: ナビゲーション項目 -->
  <div class="side-navigation__footer">
    {#each navItems as item}
      <button
        class="side-navigation__nav-button"
        class:side-navigation__nav-button--active={isActive(item.path)}
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
        />
        <span class="side-navigation__nav-label">
          {item.label}
        </span>
      </button>
    {/each}
  </div>
</nav>

<!-- カラム追加モーダル -->
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
  /* SideNavigation ベーススタイル */
  .side-navigation {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 40;
    width: 16rem; /* w-64 */
    background-color: var(--color-card);
    border-right: 2px solid rgb(var(--border) / 0.2);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    /* 🚨 デバッグ用背景色 - SideNavigation全体の可視性確認 */
    background-color: rgba(0, 255, 255, 0.1);
    border: 2px solid cyan;
  }
  
  /* ヘッダー部分 - 投稿ボタン */
  .side-navigation__header {
    flex-shrink: 0;
    padding: 1rem;
    border-bottom: 1px solid rgb(var(--border) / 0.2);
  }
  
  .side-navigation__compose-button {
    width: 100%;
    background-color: rgb(var(--primary));
    color: white;
    font-weight: 600;
    padding: 1rem 1.5rem;
    border-radius: 0.75rem;
    font-size: 1.125rem;
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  
  .side-navigation__compose-button:hover {
    background-color: rgb(var(--primary) / 0.9);
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
  
  .side-navigation__compose-button:active {
    transform: translateY(0);
  }
  
  /* 中央部分 - デッキタブ */
  .side-navigation__deck-tabs {
    flex: 1;
    min-height: 0; /* flexboxの高さ制御 */
    display: flex;
    flex-direction: column;
  }
  
  /* フッター部分 - ナビゲーション */
  .side-navigation__footer {
    flex-shrink: 0;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .side-navigation__nav-button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border-radius: 0.75rem;
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
    text-align: left;
    background-color: transparent;
    color: var(--color-foreground);
  }
  
  .side-navigation__nav-button:hover {
    background-color: rgb(var(--primary) / 0.05);
  }
  
  .side-navigation__nav-button--active {
    background-color: rgb(var(--primary) / 0.1);
    color: rgb(var(--primary));
  }
  
  .side-navigation__nav-button:active {
    transform: scale(0.98);
  }
  
  .side-navigation__nav-label {
    font-size: 1.125rem;
    font-weight: 500;
    color: inherit;
  }
  
  /* フォーカス状態 */
  .side-navigation__compose-button:focus-visible,
  .side-navigation__nav-button:focus-visible {
    outline: 2px solid rgb(var(--primary) / 0.6);
    outline-offset: 2px;
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
    border: 1px solid rgb(var(--border) / 0.2);
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
    background-color: rgb(var(--primary) / 0.1);
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