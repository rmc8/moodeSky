<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import Avatar from '$lib/components/Avatar.svelte';

  let authDid = $state('');
  let authHandle = $state('');
  let authDisplayName = $state('');
  let authAvatar = $state('');

  // 一方通行遷移制御とローカルストレージから認証情報を取得
  onMount(() => {
    // 認証情報を取得
    authDid = localStorage.getItem('authDid') || '';
    authHandle = localStorage.getItem('authHandle') || '';
    authDisplayName = localStorage.getItem('authDisplayName') || '';
    authAvatar = localStorage.getItem('authAvatar') || '';
    
    // 認証情報がない場合はログインページに戻る
    if (!authDid || !authHandle) {
      goto('/login');
      return;
    }
    
    // 現在のURLを履歴に追加（戻るボタンを無効化）
    history.pushState(null, '', window.location.href);
    
    // popstateイベントをリッスンして戻る操作を防ぐ
    const handlePopState = () => {
      history.pushState(null, '', window.location.href);
    };
    
    window.addEventListener('popstate', handlePopState);
    
    // クリーンアップ
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  });

  async function logout() {
    // localStorage をクリア
    localStorage.removeItem('authDid');
    localStorage.removeItem('authHandle');
    localStorage.removeItem('authAccessJwt');
    localStorage.removeItem('authDisplayName');
    localStorage.removeItem('authAvatar');
    
    await goto('/login');
  }
</script>

<main class="success-container">
  <div class="success-card">
    <div class="success-header">
      <Avatar 
        src={authAvatar} 
        displayName={authDisplayName} 
        handle={authHandle}
        size="xl"
        class="profile-avatar"
      />
      <h1>🎉 ログイン成功</h1>
      <p>Blueskyへの認証が完了しました</p>
    </div>

    <div class="auth-info">
      {#if authDisplayName}
        <div class="info-group">
          <label>表示名</label>
          <div class="info-value">{authDisplayName}</div>
        </div>
      {/if}
      
      <div class="info-group">
        <label>ハンドル</label>
        <div class="info-value">{authHandle}</div>
      </div>
      
      <div class="info-group">
        <label>DID</label>
        <div class="info-value did-value">{authDid}</div>
      </div>
    </div>

    <button class="logout-button" onclick={logout}>
      ログアウト
    </button>
  </div>
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

  .success-card {
    background: white;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    padding: 3rem;
    width: 100%;
    max-width: 500px;
    text-align: center;
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

  .info-group label {
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

  @media (prefers-color-scheme: dark) {
    .success-container {
      background: #0f172a;
    }

    .success-card {
      background: #1e293b;
      color: #f1f5f9;
    }

    .success-header p {
      color: #94a3b8;
    }

    .info-group label {
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