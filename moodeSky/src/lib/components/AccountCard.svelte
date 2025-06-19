<!--
  AccountCard.svelte
  アカウント表示カードコンポーネント
  
  個別のアカウント情報を表示するカード
  プロフィール、セッション状態、統計情報を含む
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Avatar from './Avatar.svelte';
  import Icon from './Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import type { Account } from '$lib/types/auth.js';
  import * as m from '../../paraglide/messages.js';

  // ===================================================================
  // プロパティ
  // ===================================================================

  interface Props {
    account: Account;
    isActive?: boolean;
    showActions?: boolean;
    compact?: boolean;
  }

  const { 
    account, 
    isActive = false, 
    showActions = true, 
    compact = false 
  } = $props();

  // ===================================================================
  // 状態管理
  // ===================================================================

  let isLoading = $state(false);
  let showDetails = $state(false);
  let profileStats = $state<{
    followers: number;
    following: number;
    posts: number;
  } | null>(null);

  // ===================================================================
  // 算出プロパティ
  // ===================================================================

  // セッション状態を判定
  const sessionStatus = $derived(() => {
    if (!account.session) return 'expired';
    
    // 実際のセッション有効期限チェックはここで実装
    // 現在はアクティブと仮定
    return 'active';
  });

  // 表示名またはハンドルを取得
  const displayName = $derived(() => {
    return account.profile.displayName || account.profile.handle;
  });

  // 最終ログイン時刻（仮実装）
  const lastLoginTime = $derived(() => {
    // 実際のログイン時刻は authStore から取得
    return new Date().toLocaleDateString();
  });

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  /**
   * アカウント詳細の表示切り替え
   */
  function toggleDetails() {
    showDetails = !showDetails;
  }

  /**
   * アカウント削除
   */
  function onRemoveAccount() {
    // TODO: 将来のマルチアカウント対応時に実装
    console.log('Remove account:', account.profile.handle);
  }

  /**
   * プロフィール統計の取得（仮実装）
   */
  async function loadProfileStats() {
    isLoading = true;
    try {
      // TODO: AT Protocol API で実際のプロフィール統計を取得
      // 現在はダミーデータ
      await new Promise(resolve => setTimeout(resolve, 500));
      profileStats = {
        followers: Math.floor(Math.random() * 1000) + 100,
        following: Math.floor(Math.random() * 500) + 50,
        posts: Math.floor(Math.random() * 2000) + 200
      };
    } catch (error) {
      console.error('Failed to load profile stats:', error);
    } finally {
      isLoading = false;
    }
  }

  // ===================================================================
  // ライフサイクル
  // ===================================================================

  onMount(() => {
    if (!compact) {
      loadProfileStats();
    }
  });
</script>

<!-- アカウントカード -->
<div 
  class="bg-card rounded-xl border border-themed transition-all duration-200 hover:shadow-md relative high-contrast:border-2 {compact ? 'p-3' : 'p-4'} {isActive ? 'border-primary/30 bg-primary/5 high-contrast:border-primary' : ''}"
>
  <!-- メインコンテンツ -->
  <div class="flex items-start gap-4">
    <!-- プロフィール情報 -->
    <div class="flex items-start flex-1 {compact ? 'gap-2' : 'gap-3'}">
      <Avatar
        src={account.profile.avatar || ''}
        displayName={displayName()}
        handle={account.profile.handle}
        size={compact ? 'sm' : 'md'}
      />
      
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <h3 class="text-themed font-semibold">
            {displayName()}
          </h3>
          {#if isActive}
            <span class="flex items-center gap-1 px-2 py-1 bg-success/10 rounded-full">
              <Icon icon={ICONS.CHECK} size="sm" color="success" />
              <span class="text-success text-xs font-medium">{m['settings.account.sessionActive']()}</span>
            </span>
          {/if}
        </div>
        
        <p class="text-themed opacity-70 text-sm">
          @{account.profile.handle}
        </p>
        
        {#if account.profile.displayName && !compact}
          <p class="text-themed opacity-60 text-xs mt-1">
            DID: {account.profile.did || 'N/A'}
          </p>
        {/if}
      </div>
    </div>

    <!-- セッション情報 -->
    <div class="flex flex-col items-end text-right">
      <div class="flex items-center gap-2">
        <Icon 
          icon={sessionStatus() === 'active' ? ICONS.CHECK : ICONS.WARNING} 
          size="sm" 
          color={sessionStatus() === 'active' ? 'success' : 'warning'} 
        />
        <span class="text-themed text-sm">
          {sessionStatus() === 'active' ? m['settings.account.sessionActive']() : m['settings.account.sessionExpired']()}
        </span>
      </div>
      
      {#if !compact}
        <p class="text-themed opacity-60 text-xs mt-1">
          {m['settings.account.lastLogin']()}: {lastLoginTime()}
        </p>
      {/if}
    </div>
  </div>

  <!-- 統計情報（非コンパクトモード） -->
  {#if !compact && profileStats}
    <div class="flex justify-around pt-4 mt-4 border-t border-themed/20">
      <div class="text-center">
        <span class="block text-themed font-semibold text-lg">{profileStats.followers.toLocaleString()}</span>
        <span class="block text-themed opacity-70 text-xs">{m['settings.account.followers']()}</span>
      </div>
      <div class="text-center">
        <span class="block text-themed font-semibold text-lg">{profileStats.following.toLocaleString()}</span>
        <span class="block text-themed opacity-70 text-xs">{m['settings.account.following']()}</span>
      </div>
      <div class="text-center">
        <span class="block text-themed font-semibold text-lg">{profileStats.posts.toLocaleString()}</span>
        <span class="block text-themed opacity-70 text-xs">{m['settings.account.posts']()}</span>
      </div>
    </div>
  {/if}

  <!-- 詳細情報（展開時） -->
  {#if showDetails && !compact}
    <div class="mt-4 p-3 bg-muted/10 rounded-lg border border-themed/10">
      <h4 class="text-themed font-medium text-sm mb-3 flex items-center gap-2">
        <Icon icon={ICONS.INFO} size="sm" color="themed" />
        {m['settings.account.accountDetails']()}
      </h4>
      
      <div class="space-y-2 text-xs">
        <div class="flex justify-between">
          <span class="text-themed opacity-70">{m['profile.service']()}:</span>
          <span class="text-themed">{account.service}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-themed opacity-70">{m['profile.did']()}:</span>
          <span class="text-themed font-mono text-xs break-all">{account.profile.did || 'N/A'}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-themed opacity-70">{m['settings.account.sessionInfo']()}:</span>
          <span class="text-themed">{sessionStatus() === 'active' ? '✓ Active' : '✗ Expired'}</span>
        </div>
      </div>
    </div>
  {/if}

  <!-- アクション（非コンパクトモード） -->
  {#if showActions && !compact}
    <div class="flex gap-2 mt-4 pt-4 border-t border-themed/20">
      <button
        class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-muted/20 text-themed hover:bg-muted/30"
        onclick={toggleDetails}
      >
        <Icon icon={showDetails ? ICONS.EXPAND_LESS : ICONS.EXPAND_MORE} size="sm" color="themed" />
        <span>{showDetails ? m['common.close']() : m['settings.account.accountDetails']()}</span>
      </button>
      
      <!-- 将来のマルチアカウント対応時に有効化 -->
      <!-- 
      <button
        class="account-card__action-btn account-card__action-btn--danger"
        onclick={onRemoveAccount}
      >
        <Icon icon={ICONS.DELETE} size="sm" color="error" />
        <span>{m['settings.account.removeAccount']()}</span>
      </button>
      -->
    </div>
  {/if}

  <!-- ローディング状態 -->
  {#if isLoading}
    <div class="absolute inset-0 bg-card/80 flex items-center justify-center rounded-xl">
      <div class="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
    </div>
  {/if}
</div>

