<!--
  DeckManagementSettings.svelte
  設定画面用デッキ管理コンポーネント
  
  デッキ一覧表示・追加・削除機能と自動遷移
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import { deckStore } from '$lib/deck/store.svelte.js';
  import AddDeckModal from '$lib/deck/components/AddDeckModal.svelte';
  import DeckSettingsModal from '$lib/deck/components/DeckSettingsModal.svelte';
  import { authService } from '$lib/services/authStore.js';
  import type { Account } from '$lib/types/auth.js';
  import type { Column } from '$lib/deck/types.js';
  import * as m from '../../../paraglide/messages.js';
  import { message } from '@tauri-apps/plugin-dialog';

  // ===================================================================
  // 状態管理
  // ===================================================================


  let activeAccount = $state<Account | null>(null);
  let isLoading = $state(true);
  let showAddDeckModal = $state(false);
  let showDeckSettingsModal = $state(false);
  let selectedDeckId = $state<string>('');
  let selectedDeckTitle = $state<string>('');

  // ===================================================================
  // ライフサイクル・初期化
  // ===================================================================

  onMount(() => {
    (async () => {
      try {
        console.log('🛠️ [DeckManagement] 初期化開始');
        
        // 認証状態確認
        const authResult = await authService.getActiveAccount();
        if (!authResult.success || !authResult.data) {
          console.error('🛠️ [DeckManagement] 認証失敗');
          return;
        }
        
        activeAccount = authResult.data;
        
        // deckStoreを初期化
        await deckStore.initialize(activeAccount.profile.did);
        
        console.log('🛠️ [DeckManagement] 初期化完了');
      } catch (error) {
        console.error('🛠️ [DeckManagement] 初期化エラー:', error);
      } finally {
        isLoading = false;
      }
    })();
  });

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  /**
   * デッキ追加ボタンクリック
   */
  function handleAddDeck() {
    console.log('[DeckManagement] Add Deck button clicked. Setting showAddDeckModal to true.');
    showAddDeckModal = true;
  }

  /**
   * デッキ追加成功時の処理（自動遷移付き）
   */
  async function handleDeckAddSuccess(column: Column) {
    try {
      showAddDeckModal = false;
      
      // 成功メッセージ表示
      await message(
        m['settings.deckManagement.addSuccess']({ name: column.settings.title })
      );
      
      // ホーム画面に自動遷移
      console.log('🛠️ [DeckManagement] デッキ追加成功 - ホームに遷移:', column.settings.title);
      await goto('/deck');
      
    } catch (error) {
      console.error('🛠️ [DeckManagement] デッキ追加後処理エラー:', error);
    }
  }

  /**
   * デッキ設定ボタンクリック
   */
  function handleDeckSettings(deckId: string, deckTitle: string) {
    selectedDeckId = deckId;
    selectedDeckTitle = deckTitle;
    showDeckSettingsModal = true;
  }

  /**
   * デッキ削除
   */
  async function handleDeleteDeck(deckId: string, deckTitle: string) {
    try {
      // 削除確認ダイアログ
      await message(
        m['settings.deckManagement.deleteConfirmation']({ name: deckTitle })
      );

      // 削除実行
      await deckStore.removeColumn(deckId);
      
      // 成功メッセージ
      await message(
        m['settings.deckManagement.deleteSuccess']({ name: deckTitle })
      );
    } catch (error) {
      console.error('🛠️ [DeckManagement] デッキ削除エラー:', error);
      await message(
        m['settings.deckManagement.deleteError']()
      );
    }
  }

  // ===================================================================
  // 派生値
  // ===================================================================

  const columns = $derived(deckStore.columns || []);
  const hasDecks = $derived(columns.length > 0);
</script>

<div class="max-w-4xl mx-auto">
  <!-- ヘッダー -->
  <div class="mb-6">
    <h2 class="text-themed text-2xl font-bold mb-2 flex items-center gap-3">
      <Icon icon={ICONS.DASHBOARD} size="lg" color="themed" />
      {m['settings.deckManagement.title']()}
    </h2>
    <p class="text-secondary text-lg leading-relaxed">
      {m['settings.deckManagement.description']()}
    </p>
  </div>

  {#if isLoading}
    <!-- ローディング状態 -->
    <div class="bg-card rounded-xl p-8 text-center">
      <div class="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
      <p class="text-themed opacity-80">{m['settings.deckManagement.loading']()}</p>
    </div>
  {:else}
    <!-- デッキ追加ボタン -->
    <div class="mb-6">
      <button
        class="button-primary px-6 py-3 text-lg font-medium flex items-center gap-3"
        onclick={handleAddDeck}
      >
        <Icon icon={ICONS.ADD} size="md" class="text-[var(--color-background)]" />
        {m['settings.deckManagement.addDeck']()}
      </button>
    </div>

    {#if hasDecks}
      <!-- デッキ一覧 -->
      <div class="space-y-4">
        <h3 class="text-themed text-xl font-semibold mb-4">
          {m['settings.deckManagement.existingDecks']()}
        </h3>
        
        {#each columns as column (column.id)}
          <div class="bg-card rounded-xl p-6 border border-themed/10 hover:border-themed/20 transition-colors">
            <div class="flex items-center justify-between">
              <!-- デッキ情報 -->
              <div class="flex items-center gap-4">
                <div class="p-3 bg-primary/10 rounded-lg">
                  <Icon 
                    icon={column.settings.icon || ICONS.DASHBOARD} 
                    size="lg" 
                    color="primary" 
                  />
                </div>
                <div>
                  <h4 class="text-themed text-lg font-semibold mb-1">
                    {column.settings.title}
                  </h4>
                  <p class="text-secondary text-sm">
                    {m['settings.deckManagement.algorithm']()}: {column.algorithm}
                  </p>
                  <p class="text-secondary text-xs">
                    {m['settings.deckManagement.createdAt']()}: {new Date(column.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <!-- アクション -->
              <div class="flex items-center gap-2">
                <button
                  class="p-2 text-secondary hover:text-themed hover:bg-muted rounded-lg transition-all"
                  onclick={() => handleDeckSettings(column.id, column.settings.title)}
                  title={m['settings.deckManagement.settings']()}
                >
                  <Icon icon={ICONS.SETTINGS} size="md" />
                </button>
                <button
                  class="p-2 text-error hover:text-error/80 hover:bg-error/10 rounded-lg transition-all"
                  onclick={() => handleDeleteDeck(column.id, column.settings.title)}
                  title={m['settings.deckManagement.delete']()}
                >
                  <Icon icon={ICONS.DELETE} size="md" />
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <!-- 空状態 -->
      <div class="bg-card rounded-xl p-12 text-center">
        <div class="text-6xl mb-6">🎛️</div>
        <h3 class="text-themed text-xl font-semibold mb-2">
          {m['settings.deckManagement.noDecks']()}
        </h3>
        <p class="text-secondary mb-6">
          {m['settings.deckManagement.noDecksDescription']()}
        </p>
        <button
          class="button-primary px-6 py-3 text-lg font-medium flex items-center gap-3 mx-auto"
          onclick={handleAddDeck}
        >
          <Icon icon={ICONS.ADD} size="md" class="text-[var(--color-background)]" />
          {m['settings.deckManagement.addFirstDeck']()}
        </button>
      </div>
    {/if}
  {/if}
</div>

<!-- モーダル -->
{#if showAddDeckModal}
  <AddDeckModal
    isOpen={showAddDeckModal}
    onClose={() => showAddDeckModal = false}
    onSuccess={handleDeckAddSuccess}
    zIndex={9999}
  />
{/if}

{#if showDeckSettingsModal}
  <DeckSettingsModal
    isOpen={showDeckSettingsModal}
    onClose={() => showDeckSettingsModal = false}
    deckId={selectedDeckId}
    deckTitle={selectedDeckTitle}
  />
{/if}