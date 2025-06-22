<script lang="ts">
  import { onMount } from 'svelte';
  // グローバルスタイルをインポート
  import '../app.css';
  // テーマプロバイダーをインポート
  import ThemeProvider from '../lib/components/ThemeProvider.svelte';
  // i18n初期化
  import { initializeI18n, i18nStore } from '../lib/stores/i18n.svelte.js';
  // 認証サービス
  import { authService } from '../lib/services/authStore.js';
  import { accountsStore } from '../lib/stores/accounts.svelte.js';

  // アプリケーション初期化
  onMount(async () => {
    // i18nシステムを初期化
    await initializeI18n();
    
    // セッション復元・統計情報更新を実行
    await initializeAuth();
  });

  /**
   * 認証システム初期化
   * セッション復元と統計情報の更新を実行
   */
  async function initializeAuth(): Promise<void> {
    try {
      console.log('🔄 [App] 認証システム初期化開始...');
      
      // localStorage からの移行処理（初回のみ）
      await authService.migrateFromLocalStorage();
      
      // 既存セッションの復元と統計情報更新
      const refreshResult = await authService.refreshSession();
      
      if (refreshResult.success && Array.isArray(refreshResult.data)) {
        const refreshedAccounts = refreshResult.data;
        console.log(`✅ [App] ${refreshedAccounts.length}個のアカウントのセッション復元完了`);
        
        // accountsStoreを更新（リアクティブ反映）
        for (const account of refreshedAccounts) {
          await accountsStore.addAccount(account);
        }
        
        // 統計情報ログ出力
        refreshedAccounts.forEach(account => {
          console.log(`📊 [App] ${account.profile.handle} 統計情報:`, {
            フォロワー数: account.profile.followersCount,
            フォロー数: account.profile.followingCount,
            ポスト数: account.profile.postsCount,
          });
        });
      } else if (!refreshResult.success) {
        console.warn('⚠️ [App] セッション復元に失敗:', refreshResult.error);
      } else {
        console.log('ℹ️ [App] 復元対象のアカウントなし');
      }
    } catch (error) {
      console.error('❌ [App] 認証システム初期化中にエラー:', error);
      // 認証エラーはアプリ全体を停止させない
    }
  }
</script>

<!-- テーマプロバイダーでアプリ全体をラップ -->
<ThemeProvider>
  {#snippet children()}
    <!-- メインアプリケーションのレイアウト -->
    <main class="h-screen w-full flex flex-col">
      <slot />
    </main>
  {/snippet}
</ThemeProvider>