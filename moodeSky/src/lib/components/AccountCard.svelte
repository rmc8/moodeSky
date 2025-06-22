<!--
  AccountCard.svelte
  アカウント表示カードコンポーネント
  
  個別のアカウント情報を表示するカード
  プロフィール、セッション状態、統計情報を含む
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Avatar from './Avatar.svelte';
  import Icon from './Icon.svelte';
  import ReauthModal from './ReauthModal.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import type { Account } from '$lib/types/auth.js';
  import { getTokenRemainingSeconds, isTokenExpired, getTokenExpiration } from '$lib/utils/jwt.js';
  import { 
    calculateTimeRemaining, 
    getWarningLevelClass, 
    getWarningLevelIcon, 
    getOptimalUpdateInterval,
    formatAbsoluteDate,
    getDetailedExpirationInfo
  } from '$lib/utils/timeUtils.js';
  import type { TimeRemaining } from '$lib/utils/timeUtils.js';
  import { useTranslation } from '$lib/utils/reactiveTranslation.svelte.js';
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
  
  // リフレッシュトークン期限管理
  let tokenTimeRemaining = $state<TimeRemaining | null>(null);
  let expirationDate = $state<Date | null>(null);
  let updateTimer: ReturnType<typeof setTimeout> | null = null;
  let isPageVisible = $state(true);

  // 翻訳システム
  const { currentLanguage } = useTranslation();

  // 再認証モーダル管理
  let showReauthModal = $state(false);
  let currentAccount = $state(account);

  // ===================================================================
  // 算出プロパティ
  // ===================================================================

  // セッション状態を判定
  const sessionStatus = $derived(() => {
    if (!account.session || !account.session.refreshJwt) return 'expired';
    
    // リフレッシュトークンの有効期限チェック
    const isExpired = isTokenExpired(account.session.refreshJwt);
    return isExpired ? 'expired' : 'active';
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
   * アカウントからログアウト
   */
  async function onLogoutAccount() {
    try {
      isLoading = true;
      
      // authService.deleteAccount を呼び出し（ローカルからアカウント情報を削除）
      const result = await import('$lib/services/authStore.js').then(m => m.authService.deleteAccount(account.id));
      
      if (result.success) {
        console.log('Account logout successfully:', account.profile.handle);
        // 成功時は親コンポーネントの再読み込みをトリガー
        // CustomEvent を発火してAccountSettingsに通知
        window.dispatchEvent(new CustomEvent('accountDeleted', { detail: { accountId: account.id } }));
      } else {
        console.error('Failed to logout account:', result.error);
      }
    } catch (error) {
      console.error('Error logging out account:', error);
    } finally {
      isLoading = false;
    }
  }

  /**
   * プロフィール統計の取得（AT Protocol API実装）
   */
  async function loadProfileStats() {
    isLoading = true;
    try {
      console.log('📊 [AccountCard] Loading profile stats for account:', account.profile.handle);
      
      // 既にキャッシュされたデータがある場合は先に表示
      if (account.profile.followersCount !== undefined) {
        profileStats = {
          followers: account.profile.followersCount,
          following: account.profile.followingCount || 0,
          posts: account.profile.postsCount || 0
        };
      }
      
      // ProfileServiceで実際のデータを取得
      const { profileService } = await import('$lib/services/profileService.js');
      
      if (!account.session?.accessJwt) {
        console.warn('📊 [AccountCard] No access token available for profile stats');
        return;
      }
      
      const result = await profileService.getProfileStats(
        account.profile.did,
        account.session.accessJwt,
        account.service
      );
      
      if (result.success && result.data) {
        profileStats = {
          followers: result.data.followersCount,
          following: result.data.followingCount,
          posts: result.data.postsCount
        };
        
        console.log('📊 [AccountCard] Successfully loaded profile stats:', profileStats);
      } else {
        // API失敗時のフォールバック表示
        console.warn('📊 [AccountCard] Failed to load profile stats:', result.error);
        
        // 既存のキャッシュデータがあれば表示を維持
        if (!profileStats && account.profile.followersCount !== undefined) {
          profileStats = {
            followers: account.profile.followersCount,
            following: account.profile.followingCount || 0,
            posts: account.profile.postsCount || 0
          };
        }
      }
    } catch (error) {
      console.error('📊 [AccountCard] Error loading profile stats:', error);
      
      // エラー時もキャッシュデータがあれば表示
      if (account.profile.followersCount !== undefined) {
        profileStats = {
          followers: account.profile.followersCount,
          following: account.profile.followingCount || 0,
          posts: account.profile.postsCount || 0
        };
      }
    } finally {
      isLoading = false;
    }
  }

  /**
   * リフレッシュトークンの期限情報を更新（強化版）
   */
  function updateTokenExpiration() {
    try {
      if (!account.session?.refreshJwt) {
        tokenTimeRemaining = null;
        expirationDate = null;
        return;
      }

      // 残り時間を計算
      const remainingSeconds = getTokenRemainingSeconds(account.session.refreshJwt);
      tokenTimeRemaining = calculateTimeRemaining(remainingSeconds);

      // 絶対期限日時を取得
      expirationDate = getTokenExpiration(account.session.refreshJwt);

      // 次回更新をスケジュール（リアルタイム更新重視）
      scheduleNextUpdate();
      
    } catch (error) {
      console.warn('Failed to update token expiration:', error);
      tokenTimeRemaining = null;
      expirationDate = null;
    }
  }

  /**
   * 次回更新をスケジュール（リアルタイム重視 + 省電力対応）
   */
  function scheduleNextUpdate() {
    // 既存のタイマーをクリア
    if (updateTimer) {
      clearTimeout(updateTimer);
      updateTimer = null;
    }

    if (!tokenTimeRemaining || !isPageVisible) return;

    // 最適化された更新間隔を決定
    const interval = getOptimalUpdateInterval(tokenTimeRemaining);
    
    updateTimer = setTimeout(() => {
      // ページが可視状態の場合のみ更新
      if (isPageVisible) {
        updateTokenExpiration();
      } else {
        // 非可視時は再スケジュール
        scheduleNextUpdate();
      }
    }, interval * 1000);
  }

  /**
   * ページ可視性の変更を処理
   */
  function handleVisibilityChange() {
    isPageVisible = !document.hidden;
    
    if (isPageVisible) {
      // ページが表示されたら即座に更新
      updateTokenExpiration();
    } else {
      // ページが非表示になったらタイマーを停止
      if (updateTimer) {
        clearTimeout(updateTimer);
        updateTimer = null;
      }
    }
  }

  /**
   * 期限表示用のテキストを生成（詳細版）
   */
  function getExpirationDisplayText(
    timeRemaining: TimeRemaining, 
    showDetailed: boolean = true
  ): string {
    if (timeRemaining.isExpired) {
      return m['session.expired']();
    }

    if (!showDetailed) {
      // 簡潔版：従来の表示
      switch (timeRemaining.unit) {
        case 'days':
          return m['session.daysLeft']({ count: timeRemaining.value });
        case 'hours':
          return m['session.hoursLeft']({ count: timeRemaining.value });
        case 'minutes':
          return m['session.minutesLeft']({ count: timeRemaining.value });
        default:
          return m['session.expired']();
      }
    }

    // 詳細版：セッション期限 + 相対時間 + 絶対日時
    const info = getDetailedExpirationInfo(
      timeRemaining, 
      expirationDate, 
      currentLanguage(), 
      !compact
    );

    if (compact) {
      // コンパクト版：「約89日」
      return `${info.aboutPrefix}${info.relativeText}`;
    } else if (info.absoluteDate) {
      // 標準版：「セッション期限: 約89日 (2024年9月18日まで)」
      return `${m['session.sessionExpiry']()}: ${info.aboutPrefix}${info.relativeText} (${info.absoluteDate}${info.untilSuffix})`;
    } else {
      // フォールバック：「セッション期限: 約89日」
      return `${m['session.sessionExpiry']()}: ${info.aboutPrefix}${info.relativeText}`;
    }
  }

  /**
   * 再認証モーダルを開く
   */
  function openReauthModal() {
    showReauthModal = true;
  }

  /**
   * 再認証モーダルを閉じる
   */
  function closeReauthModal() {
    showReauthModal = false;
  }

  /**
   * 再認証成功時の処理
   */
  function handleReauthSuccess(updatedAccount: Account) {
    // アカウント情報を更新
    currentAccount = updatedAccount;
    
    // トークン期限情報を更新
    updateTokenExpiration();
    
    // 成功イベントを発火してAccountSettingsに通知
    window.dispatchEvent(new CustomEvent('accountReauthenticated', { 
      detail: { 
        accountId: updatedAccount.id,
        account: updatedAccount
      } 
    }));
    
    console.log('Reauthentication successful:', updatedAccount.profile.handle);
  }

  // ===================================================================
  // ライフサイクル
  // ===================================================================

  onMount(() => {
    if (!compact) {
      loadProfileStats();
    }
    
    // リフレッシュトークンの期限情報を初期化
    updateTokenExpiration();
    
    // ページ可視性APIイベントリスナーを追加
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 初期状態を設定
    isPageVisible = !document.hidden;
  });

  onDestroy(() => {
    // タイマーをクリア
    if (updateTimer) {
      clearTimeout(updateTimer);
      updateTimer = null;
    }
    
    // イベントリスナーを削除
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });

  // ===================================================================
  // リアクティブ処理
  // ===================================================================

  // アカウント情報の更新を監視
  $effect(() => {
    currentAccount = account;
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
      
      <!-- リフレッシュトークン期限表示 -->
      {#if tokenTimeRemaining}
        <div class="flex items-center gap-1 mt-1">
          <Icon 
            icon={getWarningLevelIcon(tokenTimeRemaining.warningLevel)} 
            size="sm" 
            color={tokenTimeRemaining.warningLevel === 'normal' ? 'success' : 
                   tokenTimeRemaining.warningLevel === 'warning' ? 'warning' : 'error'} 
          />
          <span class="text-xs {getWarningLevelClass(tokenTimeRemaining.warningLevel)}" title={expirationDate ? formatAbsoluteDate(expirationDate, currentLanguage(), true) : ''}>
            {getExpirationDisplayText(tokenTimeRemaining, true)}
          </span>
        </div>
      {/if}
      
      {#if !compact}
        <p class="text-themed opacity-60 text-xs mt-1">
          {m['settings.account.lastLogin']()}: {lastLoginTime()}
        </p>
      {/if}
    </div>
  </div>

  <!-- 統計情報（非コンパクトモード） -->
  {#if !compact}
    <div class="pt-4 mt-4 border-t border-themed/20">
      {#if profileStats}
        <div class="flex justify-around">
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
      {:else if !isLoading}
        <div class="text-center py-2">
          <span class="text-themed opacity-60 text-sm">{m['settings.account.statsUnavailable']()}</span>
        </div>
      {/if}
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
    <div class="mt-4 pt-4 border-t border-themed/20">
      <!-- セッション期限切れ時のアクション（再認証 + ログアウト） -->
      {#if sessionStatus() === 'expired'}
        <div class="flex flex-col sm:flex-row gap-2">
          <button
            class="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 flex-1"
            onclick={openReauthModal}
            disabled={isLoading}
          >
            <Icon icon={ICONS.REFRESH} size="sm" color="primary" />
            <span>{m['reauth.button']()}</span>
          </button>
          
          <button
            class="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-error/10 text-error hover:bg-error/20 border border-error/20 flex-1"
            onclick={onLogoutAccount}
            disabled={isLoading}
          >
            <Icon icon={ICONS.LOGOUT} size="sm" color="error" />
            <span>{m['settings.account.logoutAccount']()}</span>
          </button>
        </div>
      {:else}
        <!-- セッション正常時のアクション（詳細表示 + ログアウト） -->
        <div class="flex flex-col sm:flex-row gap-2">
          <button
            class="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-muted/20 text-themed hover:bg-muted/30 flex-1"
            onclick={toggleDetails}
          >
            <Icon icon={showDetails ? ICONS.EXPAND_LESS : ICONS.EXPAND_MORE} size="sm" color="themed" />
            <span>{showDetails ? m['common.close']() : m['settings.account.accountDetails']()}</span>
          </button>
          
          <button
            class="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-error/10 text-error hover:bg-error/20 border border-error/20 flex-1"
            onclick={onLogoutAccount}
            disabled={isLoading}
          >
            <Icon icon={ICONS.LOGOUT} size="sm" color="error" />
            <span>{m['settings.account.logoutAccount']()}</span>
          </button>
        </div>
      {/if}
    </div>
  {/if}

  <!-- ローディング状態 -->
  {#if isLoading}
    <div class="absolute inset-0 bg-card/80 flex items-center justify-center rounded-xl">
      <div class="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
    </div>
  {/if}
</div>

<!-- 再認証モーダル -->
<ReauthModal
  account={currentAccount}
  isOpen={showReauthModal}
  onClose={closeReauthModal}
  onSuccess={handleReauthSuccess}
/>

