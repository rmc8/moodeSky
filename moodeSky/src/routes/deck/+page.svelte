<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import Avatar from '$lib/components/Avatar.svelte';
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

<main class="success-container">
  {#if isLoading}
    <div class="loading-card">
      <div class="loading-spinner"></div>
      <p>認証情報を読み込み中...</p>
    </div>
  {:else if errorMessage}
    <div class="error-card">
      <div class="error-icon">⚠️</div>
      <h2>エラー</h2>
      <p>{errorMessage}</p>
      <button class="retry-button" onclick={() => location.reload()}>
        再試行
      </button>
    </div>
  {:else if activeAccount}
    <div class="success-card">
      <div class="success-header">
        <Avatar 
          src={activeAccount.profile.avatar || ''} 
          displayName={activeAccount.profile.displayName || ''} 
          handle={activeAccount.profile.handle}
          size="xl"
          class="profile-avatar"
        />
        <h1>🎉 ログイン成功</h1>
        <p>Blueskyへの認証が完了しました</p>
      </div>

      <div class="auth-info">
        {#if activeAccount.profile.displayName}
          <div class="info-group">
            <div class="info-label">表示名</div>
            <div class="info-value">{activeAccount.profile.displayName}</div>
          </div>
        {/if}
        
        <div class="info-group">
          <div class="info-label">ハンドル</div>
          <div class="info-value">{activeAccount.profile.handle}</div>
        </div>
        
        <div class="info-group">
          <div class="info-label">DID</div>
          <div class="info-value did-value">{activeAccount.profile.did}</div>
        </div>

        <div class="info-group">
          <div class="info-label">サービス</div>
          <div class="info-value">{activeAccount.service}</div>
        </div>

        <div class="info-group">
          <div class="info-label">最終アクセス</div>
          <div class="info-value">{new Date(activeAccount.lastAccessAt).toLocaleString('ja-JP')}</div>
        </div>
      </div>

      <button class="logout-button" onclick={logout}>
        ログアウト
      </button>
    </div>
  {/if}
</main>

<style>
  .success-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8fafc;
    padding: 1rem;
  }

  .success-card, .loading-card, .error-card {
    background: white;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    padding: 3rem;
    width: 100%;
    max-width: 500px;
    text-align: center;
  }

  .loading-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 3px solid rgba(102, 126, 234, 0.3);
    border-top: 3px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .error-card {
    border: 2px solid #fecaca;
    background: #fef2f2;
  }

  .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .error-card h2 {
    color: #dc2626;
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
  }

  .error-card p {
    color: #991b1b;
    margin: 0 0 2rem 0;
  }

  .retry-button {
    background: #dc2626;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
  }

  .retry-button:hover {
    background: #b91c1c;
  }

  .success-header {
    margin-bottom: 2.5rem;
  }

  .success-header :global(.profile-avatar) {
    margin-bottom: 1.5rem;
  }

  .success-header h1 {
    color: #22c55e;
    font-size: 2.5rem;
    margin: 0 0 1rem 0;
    font-weight: 700;
  }

  .success-header p {
    color: #64748b;
    margin: 0;
    font-size: 1.1rem;
  }

  .auth-info {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 2.5rem;
    text-align: left;
  }

  .info-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .info-group .info-label {
    font-weight: 600;
    color: #374151;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .info-value {
    background: #f8fafc;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    padding: 0.875rem;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
    font-size: 0.9rem;
    color: #1e293b;
    word-break: break-all;
  }

  .did-value {
    font-size: 0.8rem;
    line-height: 1.4;
  }

  .logout-button {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    border: none;
    padding: 1rem 2rem;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    width: 100%;
  }

  .logout-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(239, 68, 68, 0.3);
  }

  .logout-button:active {
    transform: translateY(0);
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @media (prefers-color-scheme: dark) {
    .success-container {
      background: #0f172a;
    }

    .success-card, .loading-card {
      background: #1e293b;
      color: #f1f5f9;
    }

    .error-card {
      background: #450a0a;
      border-color: #7f1d1d;
      color: #fca5a5;
    }

    .error-card h2 {
      color: #fca5a5;
    }

    .error-card p {
      color: #fecaca;
    }

    .retry-button {
      background: #7f1d1d;
    }

    .retry-button:hover {
      background: #991b1b;
    }

    .success-header p {
      color: #94a3b8;
    }

    .info-group .info-label {
      color: #cbd5e1;
    }

    .info-value {
      background: #334155;
      border-color: #475569;
      color: #e2e8f0;
    }
  }

  @media (max-width: 640px) {
    .success-card {
      padding: 2rem;
    }

    .success-header h1 {
      font-size: 2rem;
    }

    .auth-info {
      gap: 1.25rem;
    }
  }
</style>