<!--
  AccountSwitcher.svelte
  アカウント切り替えUI
  
  統一されたModalコンポーネントを使用した信頼性の高いアカウント切り替えインターフェース
  AddDeckModalと同じパターンで実装（デスクトップ・モバイル統一）
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Icon from './Icon.svelte';
  import Avatar from './Avatar.svelte';
  import AvatarGroup from './AvatarGroup.svelte';
  import { Modal, Button } from './ui';
  import { ICONS } from '$lib/types/icon.js';
  import type { Account } from '$lib/types/auth.js';
  import * as m from '../../paraglide/messages.js';

  // ===================================================================
  // Props
  // ===================================================================

  interface Props {
    isOpen: boolean;
    accounts: Account[];
    activeAccount: Account | null;
    showAllAccountsOption?: boolean; // 「すべてのアカウント」オプションを表示するか
    isAllAccountsSelected?: boolean; // 現在「すべてのアカウント」が選択されているか
    zIndex?: number; // AddDeckModalパターンに合わせたz-index制御
    onClose: () => void;
    onAccountSelect: (account: Account | 'all') => void;
    onAddAccount: () => void;
  }

  const { 
    isOpen, 
    accounts, 
    activeAccount, 
    showAllAccountsOption = false,
    isAllAccountsSelected = false,
    zIndex = 9999, // AddDeckModalと同じ高優先度
    onClose,
    onAccountSelect,
    onAddAccount
  }: Props = $props();

  // ===================================================================
  // イベントディスパッチャー
  // ===================================================================

  const dispatch = createEventDispatcher<{
    accountSelect: Account | 'all';
    addAccount: void;
    close: void;
  }>();

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  function handleAccountSelect(account: Account | 'all') {
    onAccountSelect(account);
    dispatch('accountSelect', account);
    onClose();
  }

  function handleAddAccount() {
    onAddAccount();
    dispatch('addAccount');
    onClose();
  }

  function handleClose() {
    onClose();
    dispatch('close');
  }
</script>

<!-- AddDeckModalパターンの統一Modal実装 -->
{#if isOpen}
  <Modal
    isOpen={true}
    title={m['settings.account.title']()}
    onClose={handleClose}
    showFooter={false}
    size="md"
    {zIndex}
  >
    <div class="space-y-3">
      <!-- すべてのアカウントオプション -->
      {#if showAllAccountsOption && accounts.length > 1}
        <button
          class="w-full p-4 rounded-lg border transition-all duration-200 flex items-center gap-3 text-left group"
          class:border-primary={isAllAccountsSelected}
          class:border-subtle={!isAllAccountsSelected}
          class:hover:border-primary={!isAllAccountsSelected}
          class:hover:bg-muted={!isAllAccountsSelected}
          onclick={() => handleAccountSelect('all')}
        >
          <!-- 複数アバター表示 - 円形分割モード -->
          <div class="flex-shrink-0">
            {console.log('🎨 [AccountSwitcher] Rendering AvatarGroup with split mode, accounts:', accounts.slice(0, 4).length)}
            <AvatarGroup 
              accounts={accounts.slice(0, 4)} 
              size="md" 
              maxDisplay={4}
              clickable={false}
              displayMode="split"
            />
          </div>
          
          <!-- 「すべてのアカウント」テキスト -->
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-themed transition-colors duration-200">
              すべてのアカウント
            </div>
            <div class="text-sm text-secondary transition-colors duration-200">
              {accounts.length}個のアカウント
            </div>
          </div>
          
          <!-- アクティブ表示 -->
          {#if isAllAccountsSelected}
            <div class="flex-shrink-0">
              <Icon icon={ICONS.CHECK} size="sm" color="primary" />
            </div>
          {/if}
        </button>
        
        <!-- 区切り線 -->
        <div class="border-t border-subtle/50 my-2"></div>
      {/if}
      
      <!-- アカウント一覧 -->
      {#each accounts as account (account.profile.did)}
        <button
          class="w-full p-4 rounded-lg border transition-all duration-200 flex items-center gap-3 text-left group"
          class:border-primary={activeAccount?.profile.did === account.profile.did && !isAllAccountsSelected}
          class:border-subtle={activeAccount?.profile.did !== account.profile.did || isAllAccountsSelected}
          class:hover:border-primary={activeAccount?.profile.did !== account.profile.did || isAllAccountsSelected}
          class:hover:bg-muted={activeAccount?.profile.did !== account.profile.did || isAllAccountsSelected}
          onclick={() => handleAccountSelect(account)}
        >
          <!-- アバター - flex-shrink-0で固定幅確保 -->
          <div class="flex-shrink-0">
            <Avatar 
              src={account.profile.avatar}
              displayName={account.profile.displayName}
              handle={account.profile.handle}
              size="md"
            />
          </div>
          
          <!-- アカウント情報 -->
          <div class="flex-1 min-w-0">
            <div class="font-semibold truncate text-themed transition-colors duration-200">
              {account.profile.displayName || account.profile.handle}
            </div>
            <div class="text-sm truncate text-secondary transition-colors duration-200">
              @{account.profile.handle}
            </div>
          </div>
          
          <!-- アクティブ表示 -->
          {#if activeAccount?.profile.did === account.profile.did && !isAllAccountsSelected}
            <div class="flex-shrink-0">
              <Icon icon={ICONS.CHECK} size="sm" color="primary" />
            </div>
          {/if}
        </button>
      {/each}
      
      <!-- アカウント追加ボタン -->
      <button
        class="w-full p-4 rounded-lg border border-dashed border-primary border-opacity-30 hover:border-primary hover:border-opacity-60 hover:bg-muted transition-all duration-200 flex items-center gap-3 text-left group"
        onclick={handleAddAccount}
      >
        <div class="flex-shrink-0 w-12 h-12 rounded-full bg-primary bg-opacity-10 flex items-center justify-center transition-all duration-200">
          <Icon icon={ICONS.ADD} size="md" color="primary" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-primary transition-colors duration-200">
            {m['settings.account.addAccount']()}
          </div>
          <div class="text-sm text-secondary transition-colors duration-200">
            {m['settings.account.addAccountDescription']()}
          </div>
        </div>
      </button>
    </div>
  </Modal>
{/if}

<!-- AccountSwitcher統一Modal実装完了 - AddDeckModalパターン適用 -->