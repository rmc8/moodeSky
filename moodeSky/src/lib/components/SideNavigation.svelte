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
  class="fixed left-0 top-0 bottom-0 z-40 w-64 bg-card border-r border-subtle shadow-lg flex flex-col"
  aria-label={t('navigation.home')}
>
  <!-- 上部: 投稿ボタン -->
  <div class="flex-shrink-0 p-4">
    <button
      class="w-full bg-primary text-[var(--color-background)] font-semibold px-6 py-4 rounded-xl text-lg transition-all duration-200 ease-out flex items-center justify-center gap-2 hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 focus-ring-subtle focus-visible:outline-2 focus-visible:outline-primary/60 focus-visible:outline-offset-1"
      onclick={handleCompose}
      aria-label={t('navigation.compose')}
    >
      <Icon 
        icon={ICONS.CREATE}
        size="md"
        color="themed"
        ariaLabel={t('navigation.compose')}
        decorative={true}
        class="!text-[var(--color-background)]"
      />
      <span>{t('navigation.post')}</span>
    </button>
  </div>
  
  <!-- 中央部: デッキタブエリア -->
  <div class="flex-1 min-h-0 flex flex-col">
    <DeckTabBar />
  </div>
  
  <!-- 下部: ナビゲーション項目 -->
  <div class="flex-shrink-0 p-4 flex flex-col gap-2">
    {#each navItems as item}
      <button
        class="w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 ease-out text-left bg-transparent hover:bg-primary-hover active:scale-98 focus-ring-subtle focus-visible:outline-2 focus-visible:outline-primary-outline focus-visible:outline-offset-1"
        class:bg-primary-active={isActive(item.path)}
        class:text-primary={isActive(item.path)}
        class:text-themed={!isActive(item.path)}
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
        <span class="text-lg font-medium">
          {item.label}
        </span>
      </button>
    {/each}
  </div>
</nav>

<!-- カラム追加モーダル -->
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
      class="bg-card rounded-xl shadow-2xl max-w-md w-full mx-4 border border-themed/15" 
      onclick={(e) => e.stopPropagation()}
      role="document"
    >
      <div class="flex items-center justify-between p-6 border-b border-themed/12">
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

