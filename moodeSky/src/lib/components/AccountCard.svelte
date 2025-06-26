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
  import { getTokenRemainingSeconds, isTokenExpired, getTokenExpiration, getTokenIssuedAt } from '$lib/utils/jwt.js';
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
  import { createComponentLogger } from '$lib/utils/logger.js';
  import { toastStore } from '$lib/stores/toast.svelte.js';
  import * as m from '../../paraglide/messages.js';

  // コンポーネント専用ログ
  const log = createComponentLogger('AccountCard');

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
  let sessionValidationStatus = $state<'checking' | 'valid' | 'invalid' | 'error' | null>(null);
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
  
  // ログアウト確認モーダル管理
  let showLogoutConfirmModal = $state(false);

  // ===================================================================
  // 算出プロパティ
  // ===================================================================

  // セッション状態を判定（JWTと実際のセッション有効性を組み合わせ）
  const sessionStatus = $derived(() => {
    if (!account.session || !account.session.refreshJwt) return 'expired';
    
    // リフレッシュトークンの有効期限チェック
    const isExpired = isTokenExpired(account.session.refreshJwt);
    if (isExpired) return 'expired';
    
    // 実際のセッション検証結果を考慮
    if (sessionValidationStatus === 'checking') return 'checking';
    if (sessionValidationStatus === 'invalid') return 'expired';
    if (sessionValidationStatus === 'error') return 'error';
    
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
   * ログアウト確認モーダルを表示
   */
  function confirmLogoutAccount() {
    log.info('ログアウト確認モーダル表示', { handle: account.profile.handle });
    showLogoutConfirmModal = true;
  }
  
  /**
   * ログアウト確認をキャンセル
   */
  function cancelLogoutAccount() {
    log.info('ログアウト確認キャンセル', { handle: account.profile.handle });
    showLogoutConfirmModal = false;
  }

  /**
   * アカウントからログアウト（確認後実行）
   */
  async function executeLogoutAccount() {
    try {
      log.info('アカウントログアウト開始', { handle: account.profile.handle });
      isLoading = true;
      showLogoutConfirmModal = false;
      
      // authService.deleteAccount を呼び出し（ローカルからアカウント情報を削除）
      log.debug('authService.deleteAccount 呼び出し中', { accountId: account.id });
      const result = await import('$lib/services/authStore.js').then(m => m.authService.deleteAccount(account.id));
      log.debug('authService.deleteAccount 結果', { result });
      
      if (result.success) {
        log.info('アカウントログアウト成功', { handle: account.profile.handle });
        
        // セッション関連のタイマーを停止
        if (updateTimer) {
          clearTimeout(updateTimer);
          updateTimer = null;
        }
        
        // 成功時は親コンポーネントの再読み込みをトリガー
        // CustomEvent を発火してAccountSettingsに通知
        window.dispatchEvent(new CustomEvent('accountDeleted', { detail: { 
          accountId: account.id,
          handle: account.profile.handle 
        } }));
      } else {
        log.error('アカウントログアウト失敗', { error: result.error });
        toastStore.error(`ログアウトに失敗しました: ${result.error?.message || 'Unknown error'}`, {
          title: 'ログアウトエラー'
        });
      }
    } catch (error) {
      log.error('アカウントログアウトエラー', { error });
      toastStore.error(`ログアウト中にエラーが発生しました: ${error}`, {
        title: 'システムエラー'
      });
    } finally {
      isLoading = false;
    }
  }

  /**
   * セッションの実際の有効性を検証
   */
  async function validateSession() {
    try {
      sessionValidationStatus = 'checking';
      
      const { authService } = await import('$lib/services/authStore.js');
      const result = await authService.validateAccountSession(account.id);
      
      if (result.success) {
        sessionValidationStatus = result.data ? 'valid' : 'invalid';
        if (!result.data) {
          log.warn('Session validation failed', { handle: account.profile.handle });
        }
      } else {
        sessionValidationStatus = 'error';
        log.error('Session validation error', { error: result.error });
      }
    } catch (error) {
      sessionValidationStatus = 'error';
      log.error('Session validation exception', { error });
    }
  }

  /**
   * RefreshJwt更新テストを実行
   */
  async function testRefreshJwtUpdate() {
    try {
      isLoading = true;
      
      const { authService } = await import('$lib/services/authStore.js');
      const result = await authService.testRefreshJwtUpdate(account.id);
      
      if (result.success && result.data) {
        log.info('RefreshJwt更新テスト完了', { data: result.data });
        toastStore.info(`RefreshJwt更新テスト結果:\n${result.data.isUpdated ? '✅ 更新されました' : '⚠️ 更新されませんでした'}\n詳細はコンソールを確認してください。`, {
          title: 'RefreshJwt更新テスト',
          duration: 6000
        });
        
        // トークン期限情報を再更新
        updateTokenExpiration();
      } else {
        log.error('RefreshJwt更新テストエラー', { error: result.error });
        toastStore.error(`RefreshJwt更新テストエラー:\n${result.error?.message || 'Unknown error'}`, {
          title: 'テストエラー'
        });
      }
    } catch (error) {
      log.error('RefreshJwt更新テスト例外', { error });
      toastStore.error(`RefreshJwt更新テスト例外:\n${error}`, {
        title: 'システムエラー'
      });
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
      log.debug('Loading profile stats for account', { handle: account.profile.handle });
      
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
        log.warn('No access token available for profile stats');
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
        
        log.debug('Successfully loaded profile stats', { profileStats });
      } else {
        // API失敗時のフォールバック表示
        log.warn('Failed to load profile stats', { error: result.error });
        
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
      log.error('Error loading profile stats', { error });
      
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
        log.debug('RefreshJwt not found for account', { handle: account.profile.handle });
        tokenTimeRemaining = null;
        expirationDate = null;
        return;
      }

      // RefreshJwtの詳細情報をデバッグ出力
      import('$lib/utils/jwt.js').then(({ getTokenIssuedAt, getTokenInfo }) => {
        const tokenInfo = getTokenInfo(account.session.refreshJwt);
        const issuedAt = getTokenIssuedAt(account.session.refreshJwt);
        
        log.debug('RefreshJwt詳細情報', {
          handle: account.profile.handle,
          accountId: account.id,
          isValid: tokenInfo.isValid,
          isExpired: tokenInfo.isExpired,
          issuedAt: issuedAt?.toISOString(),
          expiresAt: tokenInfo.expiresAt?.toISOString(),
          remainingSeconds: tokenInfo.remainingSeconds,
          remainingDays: tokenInfo.expiresAt ? Math.ceil((tokenInfo.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 'N/A',
          lastAccessAt: account.lastAccessAt
        });
      });

      // 残り時間を計算
      const remainingSeconds = getTokenRemainingSeconds(account.session.refreshJwt);
      tokenTimeRemaining = calculateTimeRemaining(remainingSeconds);

      // 絶対期限日時を取得
      expirationDate = getTokenExpiration(account.session.refreshJwt);
      
      log.debug('期限計算結果', {
        handle: account.profile.handle,
        remainingSeconds,
        tokenTimeRemaining,
        expirationDate: expirationDate?.toISOString(),
        displayText: tokenTimeRemaining ? getExpirationDisplayText(tokenTimeRemaining, true) : 'N/A'
      });

      // 次回更新をスケジュール（リアルタイム更新重視）
      scheduleNextUpdate();
      
    } catch (error) {
      log.warn('Failed to update token expiration', { error });
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
   * 期限表示用のテキストを生成（相対日時のみ）
   */
  function getExpirationDisplayText(
    timeRemaining: TimeRemaining, 
    showDetailed: boolean = true
  ): string {
    if (timeRemaining.isExpired) {
      return m['session.expired']();
    }

    // 相対時間のみの表示
    switch (timeRemaining.unit) {
      case 'days':
        return compact 
          ? m['session.daysLeft']({ count: timeRemaining.value })
          : `${m['session.sessionExpiry']()}: ${m['session.daysLeft']({ count: timeRemaining.value })}`;
      case 'hours':
        return compact 
          ? m['session.hoursLeft']({ count: timeRemaining.value })
          : `${m['session.sessionExpiry']()}: ${m['session.hoursLeft']({ count: timeRemaining.value })}`;
      case 'minutes':
        return compact 
          ? m['session.minutesLeft']({ count: timeRemaining.value })
          : `${m['session.sessionExpiry']()}: ${m['session.minutesLeft']({ count: timeRemaining.value })}`;
      default:
        return m['session.expired']();
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
    
    log.info('Reauthentication successful', { handle: updatedAccount.profile.handle });
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
    
    // セッションの実際の有効性を検証
    validateSession();
    
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
    <div class="flex items-start flex-1 min-w-0 {compact ? 'gap-2' : 'gap-3'}">
      <Avatar
        src={account.profile.avatar || ''}
        displayName={displayName()}
        handle={account.profile.handle}
        size={compact ? 'sm' : 'md'}
      />
      
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <h3 class="text-themed font-semibold truncate">
            {displayName()}
          </h3>
          {#if isActive}
            <span class="flex items-center gap-1 px-2 py-1 bg-success/10 rounded-full flex-shrink-0">
              <Icon icon={ICONS.CHECK} size="sm" color="success" />
              <span class="text-success text-xs font-medium">{m['settings.account.sessionActive']()}</span>
            </span>
          {/if}
        </div>
        
        <p class="text-themed opacity-70 text-sm truncate">
          @{account.profile.handle}
        </p>
        
      </div>
    </div>

    <!-- セッション情報 -->
    <div class="flex flex-col items-end text-right flex-shrink-0">
      <div class="flex items-center gap-2">
        <Icon 
          icon={sessionStatus() === 'active' ? ICONS.CHECK : 
                sessionStatus() === 'checking' ? ICONS.REFRESH :
                sessionStatus() === 'error' ? ICONS.WARNING : ICONS.WARNING} 
          size="sm" 
          color={sessionStatus() === 'active' ? 'success' : 
                 sessionStatus() === 'checking' ? 'primary' :
                 sessionStatus() === 'error' ? 'error' : 'warning'} 
        />
        <span class="text-themed text-sm">
          {sessionStatus() === 'active' ? m['settings.account.sessionActive']() : 
           sessionStatus() === 'checking' ? '検証中...' :
           sessionStatus() === 'error' ? 'エラー' : 
           m['settings.account.sessionExpired']()}
        </span>
      </div>
      
      <!-- リフレッシュトークン期限表示 -->
      {#if tokenTimeRemaining}
        <div class="flex flex-col gap-1 mt-1">
          <div class="flex items-center gap-1">
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
        <div class="mb-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
          <div class="flex items-center gap-2 mb-2">
            <Icon icon={ICONS.WARNING} size="sm" color="warning" />
            <span class="text-warning text-sm font-medium">
              {sessionValidationStatus === 'invalid' ? 'RefreshToken期限切れ' : 'セッション期限切れ'}
            </span>
          </div>
          <p class="text-themed text-xs opacity-70">
            {sessionValidationStatus === 'invalid' 
              ? 'RefreshTokenの有効期限が切れています。再認証が必要です。' 
              : 'セッションの有効期限が切れています。再認証またはログアウトを選択してください。'}
          </p>
        </div>
        
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
            onclick={confirmLogoutAccount}
            disabled={isLoading}
          >
            <Icon icon={ICONS.LOGOUT} size="sm" color="error" />
            <span>{m['settings.account.logoutAccount']()}</span>
          </button>
        </div>
      {:else if sessionStatus() === 'error'}
        <!-- セッション検証エラー時のアクション -->
        <div class="mb-3 p-3 bg-error/10 border border-error/20 rounded-lg">
          <div class="flex items-center gap-2 mb-2">
            <Icon icon={ICONS.WARNING} size="sm" color="error" />
            <span class="text-error text-sm font-medium">セッション検証エラー</span>
          </div>
          <p class="text-themed text-xs opacity-70">
            ネットワーク接続を確認して再検証するか、このアカウントからログアウトしてください。
          </p>
        </div>
        
        <div class="flex flex-col sm:flex-row gap-2">
          <button
            class="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 flex-1"
            onclick={validateSession}
            disabled={isLoading}
          >
            <Icon icon={ICONS.REFRESH} size="sm" color="primary" />
            <span>再検証</span>
          </button>
          
          <button
            class="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-error/10 text-error hover:bg-error/20 border border-error/20 flex-1"
            onclick={confirmLogoutAccount}
            disabled={isLoading}
          >
            <Icon icon={ICONS.LOGOUT} size="sm" color="error" />
            <span>{m['settings.account.logoutAccount']()}</span>
          </button>
        </div>
      {:else if sessionStatus() === 'checking'}
        <!-- セッション検証中の表示 -->
        <div class="flex items-center justify-center gap-2 py-3">
          <div class="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <span class="text-themed text-sm">セッション検証中...</span>
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
            onclick={confirmLogoutAccount}
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

<!-- ログアウト確認モーダル -->
{#if showLogoutConfirmModal}
  <div 
    class="fixed inset-0 bg-themed/50 flex items-center justify-center z-[9999] backdrop-blur-sm"
    onkeydown={(e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelLogoutAccount();
      }
    }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="logout-confirm-title"
  >
    <div class="bg-card rounded-xl p-6 shadow-2xl max-w-md w-full mx-4 border border-themed">
      <h3 id="logout-confirm-title" class="text-themed text-lg font-semibold mb-4 flex items-center gap-2">
        <Icon icon={ICONS.WARNING} size="md" color="warning" />
        アカウントからログアウト
      </h3>
      
      <div class="mb-4">
        <div class="flex items-center gap-3 p-3 bg-muted/10 rounded-lg border border-themed/20">
          <Avatar
            src={account.profile.avatar || ''}
            displayName={account.profile.displayName || account.profile.handle}
            handle={account.profile.handle}
            size="sm"
          />
          <div class="flex-1 min-w-0">
            <div class="font-medium text-themed truncate">
              {account.profile.displayName || account.profile.handle}
            </div>
            <div class="text-sm text-secondary truncate">
              @{account.profile.handle}
            </div>
          </div>
        </div>
      </div>
      
      <p class="text-themed opacity-80 mb-6">
        このアカウントからログアウトしますか？<br>
        再度利用するには、ログイン情報を入力し直す必要があります。
      </p>
      
      <div class="flex gap-3 justify-end">
        <button
          class="px-4 py-2 border border-themed rounded-lg text-themed hover:bg-muted/20 transition-colors"
          onclick={cancelLogoutAccount}
        >
          キャンセル
        </button>
        <button
          class="px-4 py-2 bg-error text-white rounded-lg hover:bg-error/80 transition-colors flex items-center gap-2"
          onclick={executeLogoutAccount}
          disabled={isLoading}
        >
          {#if isLoading}
            <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          {/if}
          <Icon icon={ICONS.LOGOUT} size="sm" class="text-white" />
          ログアウト
        </button>
      </div>
    </div>
  </div>
{/if}

