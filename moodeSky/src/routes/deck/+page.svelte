<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { authService } from '$lib/services/authStore.js';
  import type { Account } from '$lib/types/auth.js';

  let activeAccount = $state<Account | null>(null);
  let isLoading = $state(true);
  let errorMessage = $state('');

  // 認証情報をStore APIから取得
  onMount(() => {
    let cleanupFunction: (() => void) | undefined;

    (async () => {
      try {
        // アクティブアカウントを取得
        const result = await authService.getActiveAccount();
        
        if (!result.success) {
          console.error('認証情報の取得に失敗:', result.error);
          errorMessage = '認証情報の取得に失敗しました。';
          await goto('/login');
          return;
        }
        
        if (!result.data) {
          console.log('アクティブアカウントが見つかりません');
          await goto('/login');
          return;
        }
        
        activeAccount = result.data;
        console.log('アクティブアカウント:', activeAccount);
        
        // 現在のURLを履歴に追加（戻るボタンを無効化）
        history.pushState(null, '', window.location.href);
        
        // popstateイベントをリッスンして戻る操作を防ぐ
        const handlePopState = () => {
          history.pushState(null, '', window.location.href);
        };
        
        window.addEventListener('popstate', handlePopState);
        
        // クリーンアップ関数を保存
        cleanupFunction = () => {
          window.removeEventListener('popstate', handlePopState);
        };
      } catch (error) {
        console.error('認証状態の確認中にエラー:', error);
        errorMessage = '認証状態の確認中にエラーが発生しました。';
        await goto('/login');
      } finally {
        isLoading = false;
      }
    })();

    // onMountのクリーンアップ関数を返す
    return () => {
      cleanupFunction?.();
    };
  });

  async function logout() {
    try {
      // Store API から認証データをクリア
      const result = await authService.clearAll();
      
      if (!result.success) {
        console.error('ログアウト処理に失敗:', result.error);
        errorMessage = 'ログアウト処理に失敗しました。';
        return;
      }
      
      console.log('正常にログアウトしました');
      await goto('/login');
    } catch (error) {
      console.error('ログアウト中にエラー:', error);
      errorMessage = 'ログアウト中にエラーが発生しました。';
    }
  }
</script>

<main class="min-h-screen flex items-center justify-center bg-themed p-4">
  {#if isLoading}
    <div class="bg-card rounded-2xl shadow-xl p-12 w-full max-w-md text-center flex flex-col items-center gap-4">
      <div class="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      <p class="text-muted">認証情報を読み込み中...</p>
    </div>
  {:else if errorMessage}
    <div class="bg-error/10 border-2 border-error/20 rounded-2xl shadow-xl p-12 w-full max-w-md text-center">
      <div class="text-5xl mb-4">⚠️</div>
      <h2 class="text-error text-2xl font-semibold mb-4">エラー</h2>
      <p class="text-error mb-8">{errorMessage}</p>
      <button 
        class="bg-error hover:bg-error/80 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        onclick={() => location.reload()}
      >
        再試行
      </button>
    </div>
  {:else if activeAccount}
    <div class="relative bg-card rounded-2xl shadow-xl p-12 w-full max-w-lg text-center">
      <!-- テーマ切り替えボタン（右上） -->
      <div class="absolute top-4 right-4">
        <ThemeToggle variant="menu" size="sm" />
      </div>
      
      <div class="mb-10">
        <div class="mb-6">
          <Avatar 
            src={activeAccount.profile.avatar || ''} 
            displayName={activeAccount.profile.displayName || ''} 
            handle={activeAccount.profile.handle}
            size="xl"
          />
        </div>
        <h1 class="text-success text-4xl sm:text-5xl font-bold mb-4">🎉 ログイン成功</h1>
        <p class="text-label text-lg">Blueskyへの認証が完了しました</p>
      </div>

      <div class="flex flex-col gap-6 mb-10 text-left">
        {#if activeAccount.profile.displayName}
          <div class="flex flex-col gap-2">
            <div class="text-sm font-semibold text-label uppercase tracking-wide">表示名</div>
            <div class="bg-muted/20 border-2 border-themed rounded-lg p-3.5 font-mono text-sm text-themed break-all">
              {activeAccount.profile.displayName}
            </div>
          </div>
        {/if}
        
        <div class="flex flex-col gap-2">
          <div class="text-sm font-semibold text-label uppercase tracking-wide">ハンドル</div>
          <div class="bg-muted/20 border-2 border-themed rounded-lg p-3.5 font-mono text-sm text-themed break-all">
            {activeAccount.profile.handle}
          </div>
        </div>
        
        <div class="flex flex-col gap-2">
          <div class="text-sm font-semibold text-label uppercase tracking-wide">DID</div>
          <div class="bg-muted/20 border-2 border-themed rounded-lg p-3.5 font-mono text-xs leading-relaxed text-themed break-all">
            {activeAccount.profile.did}
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <div class="text-sm font-semibold text-label uppercase tracking-wide">サービス</div>
          <div class="bg-muted/20 border-2 border-themed rounded-lg p-3.5 font-mono text-sm text-themed break-all">
            {activeAccount.service}
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <div class="text-sm font-semibold text-label uppercase tracking-wide">最終アクセス</div>
          <div class="bg-muted/20 border-2 border-themed rounded-lg p-3.5 font-mono text-sm text-themed break-all">
            {new Date(activeAccount.lastAccessAt).toLocaleString('ja-JP')}
          </div>
        </div>
      </div>

      <button 
        class="w-full bg-error hover:bg-error/80 text-white font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
        onclick={logout}
      >
        ログアウト
      </button>
    </div>
  {/if}
</main>

