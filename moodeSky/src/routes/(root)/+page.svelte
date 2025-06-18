<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { authService } from '$lib/services/authStore.js';
  import { root } from '$lib/i18n/paraglide/messages.js';

  let isLoading = $state(true);
  let statusMessage = $state(root.checkingAuth());
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
        statusMessage = root.migrating();
        
        // localStorage からの移行を実行
        const migrationResult = await authService.migrateFromLocalStorage();
        if (migrationResult.success && migrationResult.data) {
          console.log('localStorage からの移行が完了:', migrationResult.data);
          statusMessage = root.migrationComplete();
          migrationStatus.completed = true;
          migrationStatus.accountInfo = {
            handle: migrationResult.data.profile.handle
          };
          
          // 少し待ってからデッキページへ
          setTimeout(async () => {
            await goto('/deck');
          }, 1500);
          return;
        } else if (!migrationResult.success) {
          console.warn('Migration failed:', migrationResult.error);
          statusMessage = root.migrationError();
          setTimeout(async () => {
            await goto('/login');
          }, 2000);
          return;
        }
      }

      statusMessage = root.checkingAccount();

      // アクティブアカウントの確認
      const activeAccount = await authService.getActiveAccount();
      if (activeAccount.success && activeAccount.data) {
        console.log('アクティブアカウント発見:', activeAccount.data);
        statusMessage = root.redirectingToDeck();
        setTimeout(async () => {
          await goto('/deck');
        }, 800);
        return;
      }

      // ログインが必要
      statusMessage = root.redirectingToLogin();
      setTimeout(async () => {
        await goto('/login');
      }, 800);
    } catch (error) {
      console.error('認証状態確認エラー:', error);
      statusMessage = root.error();
      setTimeout(async () => {
        await goto('/login');
      }, 1500);
    } finally {
      isLoading = false;
    }
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
                <span class="text-sm font-medium text-themed">{root.migrationInProgress()}</span>
              </div>
              <p class="text-xs text-label opacity-80">
                {root.migrationDescription()}
              </p>
            </div>
          {/if}
          
          {#if migrationStatus.completed}
            <div class="mt-4 p-4 bg-success/20 rounded-lg border border-success/30">
              <div class="flex items-center space-x-2 mb-2">
                <div class="h-2 w-2 bg-success rounded-full"></div>
                <span class="text-sm font-medium text-themed">{root.migrationCompleted()}</span>
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
                <span class="text-sm font-medium text-themed">{root.legacyDataDetected()}</span>
              </div>
              <p class="text-xs text-label opacity-80">
                {root.legacyDataDescription()}
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