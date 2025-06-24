<!--
  AccountSelector.svelte
  アカウント選択UI
  
  マルチアカウント・全アカウント対応の選択インターフェース
-->
<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import type { Account } from '$lib/types/auth.js';
  import * as m from '../../../paraglide/messages.js';

  // ===================================================================
  // Props
  // ===================================================================
  
  interface Props {
    accounts: Account[];
    selectedAccountId: string;
    onSelect: (accountId: string) => void;
    supportsAllAccounts?: boolean;
  }

  const { accounts, selectedAccountId, onSelect, supportsAllAccounts = false }: Props = $props();

  // ===================================================================
  // Event Handlers
  // ===================================================================

  function handleSelect(accountId: string) {
    onSelect(accountId);
  }
</script>

<!-- アカウント選択 -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
  {#each accounts as account}
    <button
      class="w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-150 
             {selectedAccountId === account.id 
               ? 'border-primary bg-primary/10 text-themed' 
               : 'border-themed/20 bg-card hover:border-primary/50 hover:bg-primary/5 text-themed'}"
      onclick={() => handleSelect(account.id)}
    >
      <!-- アバター/アイコン -->
      <div class="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
        {#if account.id === 'all'}
          <Icon icon={ICONS.GROUP} size="md" color="primary" />
        {:else if account.profile?.avatar}
          <img 
            src={account.profile.avatar} 
            alt={account.profile.displayName || account.profile.handle}
            class="w-full h-full object-cover"
          />
        {:else}
          <Icon icon={ICONS.PERSON} size="md" color="primary" />
        {/if}
      </div>

      <!-- アカウント情報 -->
      <div class="flex-1 min-w-0 text-left">
        <p class="font-semibold text-[15px] leading-tight text-themed truncate">
          {#if account.id === 'all'}
            {m['deck.addDeck.accountSelector.allAccounts']()}
          {:else}
            {account.profile?.displayName || account.profile?.handle}
          {/if}
        </p>
        <p class="text-[13px] leading-relaxed text-secondary truncate">
          {#if account.id === 'all'}
            {m['deck.addDeck.accountSelector.allAccountsDescription']()}
          {:else}
            @{account.profile?.handle}
          {/if}
        </p>
        
        <!-- 全アカウント対応バッジ -->
        {#if account.id === 'all'}
          <div class="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 px-2 py-1 rounded-md mt-1">
            <Icon icon={ICONS.AUTO_AWESOME} size="xs" />
            {m['deck.addDeck.accountSelector.recommended']()}
          </div>
        {/if}
      </div>

      <!-- 選択状態アイコン -->
      <div class="flex-shrink-0 w-6 h-6 flex items-center justify-center">
        {#if selectedAccountId === account.id}
          <Icon icon={ICONS.CHECK_CIRCLE} size="md" color="primary" />
        {:else}
          <div class="w-5 h-5 rounded-full border-2 border-themed/30"></div>
        {/if}
      </div>
    </button>
  {/each}
</div>

<!-- 説明文 -->
{#if supportsAllAccounts}
  <div class="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
    <div class="flex items-start gap-3">
      <Icon icon={ICONS.INFO} size="sm" color="primary" class="mt-0.5 flex-shrink-0" />
      <div class="flex-1 min-w-0">
        <p class="text-sm text-themed font-medium mb-1">{m['deck.addDeck.accountSelector.multiAccountFeed']()}</p>
        <p class="text-xs text-secondary leading-relaxed">
          {m['deck.addDeck.accountSelector.multiAccountDescription']()}
        </p>
      </div>
    </div>
  </div>
{:else}
  <div class="mt-4 p-4 bg-muted/10 border border-themed/20 rounded-lg">
    <div class="flex items-start gap-3">
      <Icon icon={ICONS.PERSON} size="sm" color="themed" class="mt-0.5 flex-shrink-0" />
      <div class="flex-1 min-w-0">
        <p class="text-sm text-themed font-medium mb-1">{m['deck.addDeck.accountSelector.singleAccountFeed']()}</p>
        <p class="text-xs text-secondary leading-relaxed">
          {m['deck.addDeck.accountSelector.singleAccountDescription']()}
        </p>
      </div>
    </div>
  </div>
{/if}