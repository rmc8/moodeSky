<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';
  import { authService } from '$lib/services/authStore.js';
  import { useTranslation } from '$lib/utils/reactiveTranslation.svelte.js';
  import { delayedGoto, DelayManager } from '$lib/utils/delay.js';
  import { createComponentLogger } from '$lib/utils/logger.js';

  // コンポーネント専用ログ
  const log = createComponentLogger('RootPage');

  // リアクティブ翻訳システム
  const { t } = useTranslation();

  let isLoading = $state(true);
  let statusMessage = $state(t('root.checkingAuth'));
  let migrationStatus = $state<{
    inProgress: boolean;
    completed: boolean;
    hasLegacyData: boolean;
    accountInfo?: { handle: string };
  }>({
    inProgress: false,
    completed: false,
    hasLegacyData: false
  });

  // 遅延操作管理
  const delayManager = new DelayManager();

  onMount(async () => {
    try {
      // 移行状態を確認
      const migrationStatusResult = await authService.getMigrationStatus();
      if (migrationStatusResult.success) {
        migrationStatus.completed = migrationStatusResult.data?.completed || false;
        
        if (migrationStatus.completed && migrationStatusResult.data?.migratedAccount) {
          migrationStatus.accountInfo = {
            handle: migrationStatusResult.data.migratedAccount.handle
          };
        }
      }

      // localStorage データの存在確認
      const hasLegacyData = !!(
        localStorage.getItem('authDid') ||
        localStorage.getItem('authHandle') ||
        localStorage.getItem('authAccessJwt')
      );
      
      migrationStatus.hasLegacyData = hasLegacyData;

      // 移行が必要で未完了の場合
      if (hasLegacyData && !migrationStatus.completed) {
        migrationStatus.inProgress = true;
        statusMessage = t('root.migrating');
        
        // localStorage からの移行を実行
        const migrationResult = await authService.migrateFromLocalStorage();
        if (migrationResult.success && migrationResult.data) {
          log.info('localStorage からの移行完了', {
            handle: migrationResult.data.profile.handle,
            did: migrationResult.data.profile.did
          });
          statusMessage = t('root.migrationComplete');
          migrationStatus.completed = true;
          migrationStatus.accountInfo = {
            handle: migrationResult.data.profile.handle
          };
          
          // 遅延ナビゲーション（キャンセル可能）
          await delayedGoto('/deck', 1500, 'migration-complete');
          return;
        } else if (!migrationResult.success) {
          log.warn('移行処理失敗', { error: migrationResult.error });
          statusMessage = t('root.migrationError');
          await delayedGoto('/login', 2000, 'migration-failed');
          return;
        }
      }

      statusMessage = t('root.checkingAccount');

      // アクティブアカウントの確認
      const activeAccount = await authService.getActiveAccount();
      if (activeAccount.success && activeAccount.data) {
        log.info('アクティブアカウント発見', {
          handle: activeAccount.data.profile.handle,
          did: activeAccount.data.profile.did
        });
        statusMessage = t('root.redirectingToDeck');
        await delayedGoto('/deck', 800, 'active-account-found');
        return;
      }

      // ログインが必要
      log.debug('アクティブアカウントなし、ログインページへ遷移');
      statusMessage = t('root.redirectingToLogin');
      await delayedGoto('/login', 800, 'no-active-account');
    } catch (error) {
      log.error('認証状態確認エラー', { error });
      statusMessage = t('root.error');
      await delayedGoto('/login', 1500, 'auth-check-error');
    } finally {
      isLoading = false;
    }
  });

  // コンポーネント破棄時の cleanup
  onDestroy(() => {
    log.debug('コンポーネント破棄、遅延操作をクリーンアップ');
    delayManager.cancelAll();
  });
</script>

<main class="min-h-screen flex items-center justify-center bg-themed">
  <div class="text-center text-themed max-w-md mx-auto px-6">
    <h1 class="text-5xl font-bold mb-8">moodeSky</h1>
    
    {#if isLoading}
      <div class="space-y-4">
        <!-- メインステータス表示 -->
        <div class="bg-card rounded-lg p-6 border border-themed shadow-lg">
          <div class="flex items-center justify-center space-x-3 mb-4">
            <div class="animate-spin h-6 w-6 border-2 border-themed border-t-transparent rounded-full"></div>
            <span class="text-lg font-medium text-themed">{statusMessage}</span>
          </div>
          
          <!-- 移行状態詳細 -->
          {#if migrationStatus.inProgress}
            <div class="mt-4 p-4 bg-primary/20 rounded-lg border border-primary/30">
              <div class="flex items-center space-x-2 mb-2">
                <div class="h-2 w-2 bg-primary rounded-full animate-pulse"></div>
                <span class="text-sm font-medium text-themed">{t('root.migrationInProgress')}</span>
              </div>
              <p class="text-xs text-label opacity-80">
                {t('root.migrationDescription')}
              </p>
            </div>
          {/if}
          
          {#if migrationStatus.completed}
            <div class="mt-4 p-4 bg-success/20 rounded-lg border border-success/30">
              <div class="flex items-center space-x-2 mb-2">
                <div class="h-2 w-2 bg-success rounded-full"></div>
                <span class="text-sm font-medium text-themed">{t('root.migrationCompleted')}</span>
              </div>
              {#if migrationStatus.accountInfo}
                <p class="text-xs text-label opacity-80">
                  アカウント: @{migrationStatus.accountInfo.handle}
                </p>
              {/if}
            </div>
          {/if}
          
          {#if migrationStatus.hasLegacyData && !migrationStatus.inProgress && !migrationStatus.completed}
            <div class="mt-4 p-4 bg-warning/20 rounded-lg border border-warning/30">
              <div class="flex items-center space-x-2 mb-2">
                <div class="h-2 w-2 bg-warning rounded-full"></div>
                <span class="text-sm font-medium text-themed">{t('root.legacyDataDetected')}</span>
              </div>
              <p class="text-xs text-label opacity-80">
                {t('root.legacyDataDescription')}
              </p>
            </div>
          {/if}
        </div>
        
        <!-- 進行状況インジケーター -->
        <div class="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
          <div class="bg-primary h-full transition-all duration-1000 ease-out animate-pulse" 
               style="width: {migrationStatus.completed ? '100%' : migrationStatus.inProgress ? '60%' : '30%'}">
          </div>
        </div>
      </div>
    {:else}
      <!-- 初期化完了状態 -->
      <div class="bg-card rounded-lg p-6 border border-themed shadow-lg">
        <p class="text-xl text-themed opacity-90">{statusMessage}</p>
      </div>
    {/if}
  </div>
</main>