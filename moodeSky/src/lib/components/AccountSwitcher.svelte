<!--
  AccountSwitcher.svelte
  アカウント切り替えUI
  
  アバタータップ時に表示される、レスポンシブなアカウント切り替えインターフェース
  デスクトップ：ドロップダウン、モバイル：モーダル
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
    position?: { x: number; y: number }; // ドロップダウン位置
    isMobile?: boolean;
    showAllAccountsOption?: boolean; // 「すべてのアカウント」オプションを表示するか
    isAllAccountsSelected?: boolean; // 現在「すべてのアカウント」が選択されているか
    onClose: () => void;
    onAccountSelect: (account: Account | 'all') => void;
    onAddAccount: () => void;
  }

  const { 
    isOpen, 
    accounts, 
    activeAccount, 
    position = { x: 0, y: 0 }, 
    isMobile = false,
    showAllAccountsOption = false,
    isAllAccountsSelected = false,
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

  // クリック外部検出（ドロップダウン用）
  function handleOutsideClick(event: MouseEvent) {
    if (!isMobile && isOpen) {
      const target = event.target as Element;
      const dropdown = document.querySelector('.account-switcher-dropdown');
      if (dropdown && !dropdown.contains(target)) {
        handleClose();
      }
    }
  }

  // エスケープキー検出
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen) {
      handleClose();
    }
  }

  // ===================================================================
  // ライフサイクル
  // ===================================================================

  $effect(() => {
    if (isOpen) {
      document.addEventListener('click', handleOutsideClick);
      document.addEventListener('keydown', handleKeydown);
      
      return () => {
        document.removeEventListener('click', handleOutsideClick);
        document.removeEventListener('keydown', handleKeydown);
      };
    }
  });
</script>

{#if isOpen}
  {#if isMobile}
    <!-- モバイル版：モーダル -->
    <Modal
      isOpen={true}
      title={m['settings.account.title']()}
      onClose={handleClose}
      showFooter={false}
      size="md"
    >
      <div class="space-y-3">
        <!-- すべてのアカウントオプション -->
        {#if showAllAccountsOption && accounts.length > 1}
          <button
            class="w-full p-4 rounded-lg border transition-all duration-200 flex items-center gap-3 text-left"
            class:border-primary={isAllAccountsSelected}
            class:bg-primary={isAllAccountsSelected}
            class:bg-opacity-5={isAllAccountsSelected}
            class:border-subtle={!isAllAccountsSelected}
            class:hover:border-primary={!isAllAccountsSelected}
            class:hover:bg-primary={!isAllAccountsSelected}
            class:hover:bg-opacity-5={!isAllAccountsSelected}
            onclick={() => handleAccountSelect('all')}
          >
            <!-- 複数アバター表示 -->
            <AvatarGroup 
              accounts={accounts.slice(0, 3)} 
              size="md" 
              maxDisplay={3}
              clickable={false}
            />
            
            <!-- 「すべてのアカウント」テキスト -->
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-themed">
                すべてのアカウント
              </div>
              <div class="text-sm text-secondary">
                {accounts.length}個のアカウント
              </div>
            </div>
            
            <!-- アクティブ表示 -->
            {#if isAllAccountsSelected}
              <Icon icon={ICONS.CHECK} size="sm" color="primary" />
            {/if}
          </button>
          
          <!-- 区切り線 -->
          <div class="border-t border-subtle/50 my-2"></div>
        {/if}
        
        <!-- アカウント一覧 -->
        {#each accounts as account (account.profile.did)}
          <button
            class="w-full p-4 rounded-lg border transition-all duration-200 flex items-center gap-3 text-left"
            class:border-primary={activeAccount?.profile.did === account.profile.did}
            class:bg-primary={activeAccount?.profile.did === account.profile.did}
            class:bg-opacity-5={activeAccount?.profile.did === account.profile.did}
            class:border-subtle={activeAccount?.profile.did !== account.profile.did}
            class:hover:border-primary={activeAccount?.profile.did !== account.profile.did}
            class:hover:bg-primary={activeAccount?.profile.did !== account.profile.did}
            class:hover:bg-opacity-5={activeAccount?.profile.did !== account.profile.did}
            onclick={() => handleAccountSelect(account)}
          >
            <!-- アバター -->
            <Avatar 
              src={account.profile.avatar}
              displayName={account.profile.displayName}
              handle={account.profile.handle}
              size="md"
            />
            
            <!-- アカウント情報 -->
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-themed truncate">
                {account.profile.displayName || account.profile.handle}
              </div>
              <div class="text-sm text-secondary truncate">
                @{account.profile.handle}
              </div>
            </div>
            
            <!-- アクティブ表示 -->
            {#if activeAccount?.profile.did === account.profile.did && !isAllAccountsSelected}
              <Icon icon={ICONS.CHECK} size="sm" color="primary" />
            {/if}
          </button>
        {/each}
        
        <!-- アカウント追加ボタン -->
        <button
          class="w-full p-4 rounded-lg border border-dashed border-primary border-opacity-30 hover:border-primary hover:border-opacity-60 hover:bg-primary hover:bg-opacity-5 transition-all duration-200 flex items-center gap-3 text-left"
          onclick={handleAddAccount}
        >
          <div class="w-12 h-12 rounded-full bg-primary bg-opacity-10 flex items-center justify-center">
            <Icon icon={ICONS.ADD} size="md" color="primary" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-primary">
              {m['settings.account.addAccount']()}
            </div>
            <div class="text-sm text-secondary">
              {m['settings.account.addAccountDescription']()}
            </div>
          </div>
        </button>
      </div>
    </Modal>
  {:else}
    <!-- デスクトップ版：ドロップダウン -->
    <div
      class="account-switcher-dropdown fixed bg-card border border-subtle rounded-lg shadow-lg p-2 min-w-72 max-w-80 z-50"
      style="left: {position.x}px; top: {position.y}px;"
    >
      <!-- ヘッダー -->
      <div class="px-3 py-2 border-b border-subtle/50 mb-2">
        <h3 class="font-semibold text-themed text-sm">
          {m['settings.account.title']()}
        </h3>
      </div>
      
      <!-- アカウント一覧 -->
      <div class="space-y-1">
        <!-- すべてのアカウントオプション -->
        {#if showAllAccountsOption && accounts.length > 1}
          <button
            class="w-full p-3 rounded-md transition-all duration-200 flex items-center gap-3 text-left"
            class:bg-primary={isAllAccountsSelected}
            class:bg-opacity-10={isAllAccountsSelected}
            class:hover:bg-muted={!isAllAccountsSelected}
            class:hover:bg-opacity-20={!isAllAccountsSelected}
            onclick={() => handleAccountSelect('all')}
          >
            <!-- 複数アバター表示 -->
            <AvatarGroup 
              accounts={accounts.slice(0, 3)} 
              size="sm" 
              maxDisplay={3}
              clickable={false}
            />
            
            <!-- 「すべてのアカウント」テキスト -->
            <div class="flex-1 min-w-0">
              <div class="font-medium text-themed text-sm">
                すべてのアカウント
              </div>
              <div class="text-xs text-secondary">
                {accounts.length}個のアカウント
              </div>
            </div>
            
            <!-- アクティブ表示 -->
            {#if isAllAccountsSelected}
              <Icon icon={ICONS.CHECK} size="xs" color="primary" />
            {/if}
          </button>
          
          <!-- 区切り線 -->
          <div class="border-t border-subtle border-opacity-50 my-1"></div>
        {/if}
        
        {#each accounts as account (account.profile.did)}
          <button
            class="w-full p-3 rounded-md transition-all duration-200 flex items-center gap-3 text-left"
            class:bg-primary={activeAccount?.profile.did === account.profile.did}
            class:bg-opacity-10={activeAccount?.profile.did === account.profile.did}
            class:hover:bg-muted={activeAccount?.profile.did !== account.profile.did}
            class:hover:bg-opacity-20={activeAccount?.profile.did !== account.profile.did}
            onclick={() => handleAccountSelect(account)}
          >
            <!-- アバター -->
            <Avatar 
              src={account.profile.avatar}
              displayName={account.profile.displayName}
              handle={account.profile.handle}
              size="sm"
            />
            
            <!-- アカウント情報 -->
            <div class="flex-1 min-w-0">
              <div class="font-medium text-themed text-sm truncate">
                {account.profile.displayName || account.profile.handle}
              </div>
              <div class="text-xs text-secondary truncate">
                @{account.profile.handle}
              </div>
            </div>
            
            <!-- アクティブ表示 -->
            {#if activeAccount?.profile.did === account.profile.did && !isAllAccountsSelected}
              <Icon icon={ICONS.CHECK} size="xs" color="primary" />
            {/if}
          </button>
        {/each}
      </div>
      
      <!-- 区切り線 -->
      <div class="border-t border-subtle border-opacity-50 my-2"></div>
      
      <!-- アカウント追加ボタン -->
      <button
        class="w-full p-3 rounded-md hover:bg-muted hover:bg-opacity-20 transition-all duration-200 flex items-center gap-3 text-left"
        onclick={handleAddAccount}
      >
        <div class="w-8 h-8 rounded-full bg-primary bg-opacity-10 flex items-center justify-center">
          <Icon icon={ICONS.ADD} size="xs" color="primary" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-primary text-sm">
            {m['settings.account.addAccount']()}
          </div>
        </div>
      </button>
    </div>
  {/if}
{/if}

<style>
  .account-switcher-dropdown {
    /* ドロップダウンの境界調整 */
    max-height: 80vh;
    overflow-y: auto;
    
    /* スクロールバーのスタイリング */
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
  }
  
  .account-switcher-dropdown::-webkit-scrollbar {
    width: 6px;
  }
  
  .account-switcher-dropdown::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .account-switcher-dropdown::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }
  
  .account-switcher-dropdown::-webkit-scrollbar-thumb:hover {
    background-color: rgba(0, 0, 0, 0.3);
  }
</style>