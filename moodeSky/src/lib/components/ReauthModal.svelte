<!--
  ReauthModal.svelte
  アカウント再認証専用モーダルコンポーネント
  
  リフレッシュトークン期限切れ時にパスワードのみを入力して認証を更新
  既存ログイン画面のUIパターンを再利用して一貫性を保つ
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import Avatar from './Avatar.svelte';
  import Icon from './Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import type { Account } from '$lib/types/auth.js';
  import { authService } from '$lib/services/authStore.js';
  import * as m from '../../paraglide/messages.js';

  // ===================================================================
  // プロパティ
  // ===================================================================

  interface Props {
    account: Account;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (updatedAccount: Account) => void;
    autoFocus?: boolean;
  }

  const { 
    account, 
    isOpen = false,
    onClose,
    onSuccess,
    autoFocus = true
  } = $props();

  // ===================================================================
  // 状態管理
  // ===================================================================

  let password = $state('');
  let showPassword = $state(false);
  let isLoading = $state(false);
  let errorMessage = $state('');
  let passwordInput: HTMLInputElement | undefined = $state();

  // ===================================================================
  // 算出プロパティ
  // ===================================================================

  const displayName = $derived(() => {
    return account.profile.displayName || account.profile.handle;
  });

  const canSubmit = $derived(() => {
    return password.trim().length > 0 && !isLoading;
  });

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  /**
   * パスワード表示切り替え
   */
  function togglePasswordVisibility() {
    showPassword = !showPassword;
  }

  /**
   * 再認証実行
   */
  async function handleReauth() {
    if (!canSubmit()) return;

    try {
      isLoading = true;
      errorMessage = '';

      const result = await authService.reauthenticateAccount(account.id, password);

      if (result.success && result.data) {
        // 成功時の処理
        console.log('Reauthentication successful:', account.profile.handle);
        
        // パスワードをクリア（セキュリティ対策）
        password = '';
        
        // 成功コールバック実行
        onSuccess(result.data);
        
        // モーダルを閉じる
        onClose();
      } else {
        // エラー処理
        console.error('Reauthentication failed:', result.error);
        errorMessage = getErrorMessage(result.error);
      }
    } catch (error) {
      console.error('Unexpected reauthentication error:', error);
      errorMessage = m['reauth.failed']();
    } finally {
      isLoading = false;
    }
  }

  /**
   * エラーメッセージを取得
   */
  function getErrorMessage(error?: { type: string; message: string }): string {
    if (!error) return m['reauth.failed']();

    switch (error.type) {
      case 'AUTH_FAILED':
        return m['validation.authFailed']();
      case 'NETWORK_ERROR':
        return m['validation.networkError']();
      case 'RATE_LIMITED':
        return m['validation.rateLimited']();
      case 'ACCOUNT_NOT_FOUND':
        return m['validation.accountNotFound']();
      default:
        return error.message || m['reauth.failed']();
    }
  }

  /**
   * モーダルキャンセル
   */
  function handleCancel() {
    if (isLoading) return; // ローディング中はキャンセル不可
    
    // パスワードをクリア
    password = '';
    errorMessage = '';
    
    onClose();
  }

  /**
   * キーボードイベント処理
   */
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && canSubmit()) {
      event.preventDefault();
      handleReauth();
    } else if (event.key === 'Escape' && !isLoading) {
      event.preventDefault();
      handleCancel();
    }
  }

  /**
   * フォーカス管理
   */
  function focusPasswordInput() {
    if (autoFocus && passwordInput && isOpen) {
      setTimeout(() => {
        passwordInput?.focus();
      }, 100); // モーダル表示アニメーション後にフォーカス
    }
  }

  // ===================================================================
  // リアクティブ処理
  // ===================================================================

  // モーダルが開いた時にフォーカス設定
  $effect(() => {
    if (isOpen) {
      focusPasswordInput();
    }
  });

  // コンポーネント破棄時のクリーンアップ
  onDestroy(() => {
    password = ''; // セキュリティ対策: パスワードクリア
  });
</script>

<!-- モーダルオーバーレイ -->
{#if isOpen}
  <div 
    class="fixed inset-0 bg-themed/50 flex items-center justify-center z-50 backdrop-blur-sm"
    onclick={handleCancel}
    onkeydown={handleKeydown}
    role="button"
    tabindex="-1"
    aria-label="Close modal"
  >
    <!-- モーダルコンテンツ -->
    <div 
      class="bg-card rounded-xl p-6 shadow-xl max-w-md w-full mx-4 border border-themed"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      tabindex="0"
      aria-labelledby="reauth-title"
      aria-describedby="reauth-description"
    >
      <!-- ヘッダー -->
      <div class="flex items-center gap-4 mb-6">
        <Avatar
          src={account.profile.avatar || ''}
          displayName={displayName()}
          handle={account.profile.handle}
          size="md"
        />
        
        <div class="flex-1">
          <h2 id="reauth-title" class="text-themed text-lg font-semibold">
            {m['reauth.title']()}
          </h2>
          <p class="text-themed opacity-70 text-sm">
            @{account.profile.handle}
          </p>
        </div>

        <!-- 閉じるボタン -->
        <button
          class="text-themed hover:text-themed/80 transition-colors p-1"
          onclick={handleCancel}
          disabled={isLoading}
          aria-label={m['common.close']()}
        >
          <Icon icon={ICONS.CLOSE} size="sm" />
        </button>
      </div>

      <!-- 説明文 -->
      <p id="reauth-description" class="text-themed opacity-80 text-sm mb-6">
        {m['reauth.description']()}
      </p>

      <!-- エラーメッセージ -->
      {#if errorMessage}
        <div class="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
          <Icon icon={ICONS.ERROR} size="sm" color="error" />
          <span class="text-error text-sm">{errorMessage}</span>
        </div>
      {/if}

      <!-- パスワード入力フォーム -->
      <form onsubmit={(e) => { e.preventDefault(); handleReauth(); }}>
        <div class="mb-6">
          <label for="reauth-password" class="block text-themed text-sm font-medium mb-2">
            {m['reauth.passwordLabel']()}
          </label>
          
          <div class="relative">
            <input
              id="reauth-password"
              bind:this={passwordInput}
              bind:value={password}
              type={showPassword ? 'text' : 'password'}
              class="input-themed w-full pr-10"
              placeholder={m['reauth.passwordPlaceholder']()}
              disabled={isLoading}
              autocomplete="current-password"
              required
            />
            
            <!-- パスワード表示切り替えボタン -->
            <button
              type="button"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-themed opacity-70 hover:opacity-100 transition-opacity"
              onclick={togglePasswordVisibility}
              disabled={isLoading}
              aria-label={showPassword ? m['reauth.hidePassword']() : m['reauth.showPassword']()}
            >
              <Icon icon={showPassword ? ICONS.VISIBILITY_OFF : ICONS.VISIBILITY} size="sm" />
            </button>
          </div>
        </div>

        <!-- アクションボタン -->
        <div class="flex gap-3 justify-end">
          <button
            type="button"
            class="px-4 py-2 border border-themed rounded-lg text-themed hover:bg-muted/20 transition-colors"
            onclick={handleCancel}
            disabled={isLoading}
          >
            {m['reauth.cancel']()}
          </button>
          
          <button
            type="submit"
            class="button-primary"
            disabled={!canSubmit()}
          >
            {#if isLoading}
              <div class="w-4 h-4 border-2 border-themed/30 border-t-themed rounded-full animate-spin mr-2 inline-block"></div>
              {m['reauth.authenticating']()}
            {:else}
              <Icon icon={ICONS.LOGIN} size="sm" color="themed" />
              {m['reauth.button']()}
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}