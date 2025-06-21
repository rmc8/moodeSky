<!--
  AccountSettings.svelte
  アカウント管理設定コンポーネント
  
  既存のauthSystemとの完全統合
  現在はシングルアカウント対応、将来マルチアカウント拡張予定
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authService } from '$lib/services/authStore.js';
  import { accountsStore } from '$lib/stores/accounts.svelte.js';
  import AccountCard from '$lib/components/AccountCard.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import type { Account } from '$lib/types/auth.js';
  import * as m from '../../../paraglide/messages.js';

  // ===================================================================
  // 状態管理
  // ===================================================================

  let isLoading = $state(false);
  let successMessage = $state('');
  let errorMessage = $state('');
  let showSignOutConfirm = $state(false);

  // アカウントストアから状態を取得（リアクティブ）
  const allAccounts = $derived(() => accountsStore.allAccounts);
  const accountCount = $derived(() => accountsStore.accountCount);
  const hasAccounts = $derived(() => accountsStore.hasAccounts);
  const isMaxAccountsReached = $derived(() => accountsStore.isMaxAccountsReached);
  const isInitializing = $derived(() => !accountsStore.isInitialized);

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  /**
   * アカウント追加（ログイン画面へ遷移）
   */
  async function addAccount() {
    try {
      isLoading = true;
      // 将来のマルチアカウント対応では、現在のアカウントを保持してログイン画面へ
      // 現在はシングルアカウントなので通常のログイン画面へ
      await goto('/login?mode=add');
    } catch (error) {
      console.error('Failed to navigate to login:', error);
      errorMessage = 'ログイン画面への遷移に失敗しました';
    } finally {
      isLoading = false;
    }
  }

  /**
   * 全アカウントからログアウト
   */
  async function logoutAll() {
    try {
      isLoading = true;
      errorMessage = '';
      
      // アカウントストアを使用して全アカウントをクリア
      await accountsStore.clearAllAccounts();
      
      if (accountsStore.error) {
        console.error('Log out failed:', accountsStore.error);
        errorMessage = m['settings.account.logoutAllError']();
        return;
      }
      
      successMessage = m['settings.account.logoutAllSuccess']();
      
      // 短い遅延後にログイン画面へリダイレクト
      setTimeout(async () => {
        await goto('/login');
      }, 1500);
      
    } catch (error) {
      console.error('Log out error:', error);
      errorMessage = m['settings.account.logoutAllError']();
    } finally {
      isLoading = false;
      showSignOutConfirm = false;
    }
  }

  /**
   * ログアウト確認ダイアログを表示
   */
  function confirmLogoutAll() {
    showSignOutConfirm = true;
  }

  /**
   * ログアウト確認をキャンセル
   */
  function cancelLogoutAll() {
    showSignOutConfirm = false;
  }

  /**
   * メッセージをクリア
   */
  function clearMessages() {
    successMessage = '';
    errorMessage = '';
  }

  /**
   * アカウント削除イベントをリスンして再読み込み
   */
  function handleAccountDeleted(event: Event) {
    const customEvent = event as CustomEvent;
    console.log('🛠️ [AccountSettings] Account deleted:', customEvent.detail.accountId);
    // アカウントストアから削除（リアクティブ更新）
    accountsStore.removeAccount(customEvent.detail.accountId);
  }

  /**
   * アカウント再認証イベントをリスンして更新
   */
  function handleAccountReauthenticated(event: Event) {
    const customEvent = event as CustomEvent;
    console.log('🛠️ [AccountSettings] Account reauthenticated:', customEvent.detail.accountId);
    
    // 成功メッセージを表示
    successMessage = m['reauth.success']();
    
    // アカウントストアを更新（必要に応じて）
    // 既にAccountCardで更新されているため、特別な処理は不要
    // ただし、将来的にはストアの再初期化を検討
  }

  // ===================================================================
  // ライフサイクル・初期化
  // ===================================================================

  onMount(() => {
    // アカウントストアを初期化（未初期化の場合のみ）
    (async () => {
      try {
        console.log('🛠️ [AccountSettings] 初期化開始');
        await accountsStore.initialize();
      } catch (error) {
        console.error('🛠️ [AccountSettings] 初期化エラー:', error);
        errorMessage = 'アカウント情報の初期化に失敗しました';
      }
    })();

    // アカウント削除・再認証イベントをリスン
    window.addEventListener('accountDeleted', handleAccountDeleted);
    window.addEventListener('accountReauthenticated', handleAccountReauthenticated);
    
    return () => {
      window.removeEventListener('accountDeleted', handleAccountDeleted);
      window.removeEventListener('accountReauthenticated', handleAccountReauthenticated);
    };
  });

  // 自動的にメッセージをクリア
  let clearTimer: ReturnType<typeof setTimeout>;
  $effect(() => {
    if (successMessage || errorMessage) {
      clearTimer = setTimeout(clearMessages, 5000);
    }
    return () => clearTimeout(clearTimer);
  });
</script>

<!-- アカウント管理セクション -->
<div class="max-w-4xl mx-auto pb-20 md:pb-8">
  <!-- セクションヘッダー -->
  <div class="mb-8">
    <h2 class="text-themed text-2xl font-bold mb-2 flex items-center gap-3">
      <span class="text-3xl">👤</span>
      {m['settings.account.title']()}
    </h2>
    <p class="text-themed opacity-70">
      {m['settings.account.description']()}
    </p>
  </div>

  <!-- メッセージ表示 -->
  {#if successMessage}
    <div class="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg flex items-center gap-3">
      <Icon icon={ICONS.CHECK} size="md" color="success" />
      <span class="text-success font-medium">{successMessage}</span>
    </div>
  {/if}

  {#if errorMessage}
    <div class="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-3">
      <Icon icon={ICONS.ERROR} size="md" color="error" />
      <span class="text-error font-medium">{errorMessage}</span>
      <button 
        class="ml-auto text-error hover:text-error/80 transition-colors"
        onclick={clearMessages}
        aria-label={m['settings.closeMessage']()}
      >
        <Icon icon={ICONS.CLOSE} size="sm" />
      </button>
    </div>
  {/if}

  <!-- 初期化中 -->
  {#if isInitializing()}
    <div class="flex items-center justify-center py-12">
      <div class="flex items-center gap-3">
        <div class="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <span class="text-themed">{m['settings.loading']()}</span>
      </div>
    </div>
  {:else}
    <!-- メインコンテンツ -->
    <div class="space-y-8">
      <!-- 1. アカウント追加ボタン（最上部） -->
      <div class="bg-card rounded-xl p-6 border border-themed">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div class="flex-1">
            <h3 class="text-themed text-lg font-semibold mb-2 flex items-center gap-2">
              <Icon icon={ICONS.ADD} size="md" color="primary" />
              {m['settings.account.addAccount']()}
            </h3>
            <p class="text-themed opacity-70">
              {m['settings.account.addAccountDescription']()}
            </p>
            {#if isMaxAccountsReached()}
              <p class="text-error text-sm mt-2">
                最大100アカウントに達しています
              </p>
            {/if}
          </div>
          
          <button
            class="button-primary flex items-center gap-2"
            disabled={isLoading || isMaxAccountsReached()}
            onclick={addAccount}
          >
            <Icon icon={ICONS.ADD} size="sm" color="white" />
            {m['settings.account.addAccount']()}
          </button>
        </div>
      </div>

      <!-- 2. ログイン中のアカウント -->
      <div class="bg-card rounded-xl p-6 border border-themed">
        <h3 class="text-themed text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon icon={ICONS.PEOPLE} size="md" color="primary" />
          {m['settings.account.currentAccounts']()}
        </h3>
        
        {#if hasAccounts()}
          <div class="space-y-4">
            {#each allAccounts() as account}
              <AccountCard 
                {account}
                isActive={false}
                showActions={true}
                compact={false}
              />
            {/each}
          </div>
        {:else}
          <!-- アカウントがない場合 -->
          <div class="text-center py-8">
            <div class="text-6xl mb-4 opacity-30">👤</div>
            <h4 class="text-themed text-lg font-medium mb-2">
              {m['settings.account.noAccounts']()}
            </h4>
            <p class="text-themed opacity-70 mb-4">
              Blueskyアカウントでログインしてください
            </p>
            <button
              class="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
              onclick={addAccount}
            >
              {m['settings.account.addAccount']()}
            </button>
          </div>
        {/if}
      </div>

      <!-- 3. 全アカウントからサインアウト（最下部） -->
      {#if hasAccounts()}
        <div class="bg-error/5 border border-error/20 rounded-xl p-6">
          <div class="space-y-4">
            <div>
              <h3 class="text-error text-lg font-semibold mb-2 flex items-center gap-2">
                <Icon icon={ICONS.LOGOUT} size="md" color="error" />
                {m['settings.account.logoutAll']()}
              </h3>
              <p class="text-error opacity-80">
                全てのアカウントからログアウトし、ログイン画面に戻ります
              </p>
            </div>
            
            <div class="flex justify-end">
              <button
                class="px-4 py-2 bg-error/10 text-error border border-error/30 rounded-lg hover:bg-error/20 transition-colors font-medium flex items-center gap-2"
                disabled={isLoading}
                onclick={confirmLogoutAll}
              >
                <Icon icon={ICONS.LOGOUT} size="sm" color="error" />
                {m['settings.account.logoutAll']()}
              </button>
            </div>
          </div>
        </div>
      {/if}

      <!-- 将来機能のプレビュー -->
      <div class="bg-muted/10 border border-themed/20 rounded-xl p-6">
        <h3 class="text-themed text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon icon={ICONS.FUTURE} size="md" color="themed" />
          将来実装予定の機能
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-3">
            <h4 class="text-themed font-medium flex items-center gap-2">
              <Icon icon={ICONS.ACCOUNT_CIRCLE} size="sm" color="primary" />
              マルチアカウント対応
            </h4>
            <ul class="space-y-2 text-sm text-themed opacity-80">
              <li>• 複数アカウント同時ログイン</li>
              <li>• アクティブアカウント切り替え</li>
              <li>• アカウント別設定管理</li>
              <li>• クロスアカウント操作</li>
            </ul>
          </div>

          <div class="space-y-3">
            <h4 class="text-themed font-medium flex items-center gap-2">
              <Icon icon={ICONS.SECURITY} size="sm" color="primary" />
              セキュリティ機能
            </h4>
            <ul class="space-y-2 text-sm text-themed opacity-80">
              <li>• アプリパスワード管理</li>
              <li>• ログイン履歴表示</li>
              <li>• セッション管理</li>
              <li>• デバイス管理</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- サインアウト確認ダイアログ -->
  {#if showSignOutConfirm}
    <div class="fixed inset-0 bg-themed/50 flex items-center justify-center z-50">
      <div class="bg-card rounded-xl p-6 shadow-xl max-w-md w-full mx-4">
        <h3 class="text-themed text-lg font-semibold mb-4 flex items-center gap-2">
          <Icon icon={ICONS.WARNING} size="md" color="warning" />
          {m['settings.account.logoutAllConfirm']()}
        </h3>
        
        <p class="text-themed opacity-80 mb-6">
          全てのアカウントからサインアウトし、ログイン画面に戻ります。<br>
          この操作は取り消せません。
        </p>
        
        <div class="flex gap-3 justify-end">
          <button
            class="px-4 py-2 border border-themed rounded-lg text-themed hover:bg-muted/20 transition-colors"
            onclick={cancelLogoutAll}
          >
            {m['common.cancel']()}
          </button>
          <button
            class="px-4 py-2 bg-error text-white rounded-lg hover:bg-error/80 transition-colors"
            onclick={logoutAll}
            disabled={isLoading}
          >
            {#if isLoading}
              <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 inline-block"></div>
            {/if}
            {m['settings.account.logoutAll']()}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- ローディング状態 -->
  {#if isLoading && !showSignOutConfirm}
    <div class="fixed inset-0 bg-themed/50 flex items-center justify-center z-50">
      <div class="bg-card rounded-lg p-6 shadow-xl flex items-center gap-3">
        <div class="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <span class="text-themed">{m['settings.changingSettings']()}</span>
      </div>
    </div>
  {/if}
</div>