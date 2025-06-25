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
  import AddDeckModal from '$lib/deck/components/AddDeckModal.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import { useTranslation } from '$lib/utils/reactiveTranslation.svelte.js';
  import { deckStore } from '$lib/deck/store.svelte.js';
  import { debugLog } from '$lib/utils/debugUtils.js';
  import { authService } from '$lib/services/authStore.js';
  import type { Account } from '$lib/types/auth.js';
  import type { Column } from '$lib/deck/types.js';
  import * as m from '../../paraglide/messages.js';
  
  // リアクティブ翻訳システム
  const { t } = useTranslation();
  
  // $propsを使用してプロップを受け取る（Svelte 5 runes mode）
  const { currentPath = '', accountId = '', onAddDeck } = $props<{ 
    currentPath?: string; 
    accountId?: string; 
    onAddDeck?: () => void;
  }>();
  
  // デバッグログ追加
  debugLog('🔍 [SideNavigation] Component mounted, currentPath:', currentPath);
  
  // グローバルなデッキ追加モーダル状態管理
  let showAddDeckModal = $state(false);
  let activeAccount = $state<Account | null>(null);
  
  // アクティブアカウントを取得
  $effect(async () => {
    const result = await authService.getActiveAccount();
    if (result.success && result.data) {
      activeAccount = result.data;
    }
  });
  
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
      // デッキ追加ボタンの場合はグローバルモーダルを開く
      debugLog('🎛️ [SideNavigation] Opening global Add Deck modal');
      showAddDeckModal = true;
    } else {
      // その他のナビゲーション
      goto(path);
    }
  }
  
  /**
   * デッキ追加モーダルを閉じる
   */
  function handleCloseAddDeckModal() {
    debugLog('🎛️ [SideNavigation] Closing global Add Deck modal');
    showAddDeckModal = false;
  }
  
  /**
   * デッキ追加成功時の処理
   */
  function handleDeckAddSuccess(column: Column) {
    debugLog('🎛️ [SideNavigation] Deck added successfully:', column.settings.title);
    showAddDeckModal = false;
    // 必要に応じてホーム画面に遷移
    if (currentPath !== '/deck') {
      goto('/deck');
    }
  }
  
  function handleCompose() {
    // TODO: 投稿作成モーダル/ページを開く
    debugLog('投稿作成機能（未実装）');
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

<!-- グローバルなデッキ追加モーダル -->
{#if showAddDeckModal && activeAccount}
  <AddDeckModal
    isOpen={showAddDeckModal}
    onClose={handleCloseAddDeckModal}
    onSuccess={handleDeckAddSuccess}
    zIndex={9999}
  />
{/if}
