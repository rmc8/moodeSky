<script lang="ts">
  import { goto } from '$app/navigation';
  import { AtpAgent } from '@atproto/api';
  import { authService } from '$lib/services/authStore.js';

  let handle = $state('');
  let password = $state('');
  let host = $state('bsky.social');
  let showPassword = $state(false);
  let errorMessage = $state('');
  let isLoading = $state(false);

  async function handleLogin(event: Event) {
    event.preventDefault();
    
    // 簡単なバリデーション
    if (!handle || !password) {
      errorMessage = 'ハンドルとパスワードを入力してください';
      return;
    }
    
    // ローディング開始
    isLoading = true;
    errorMessage = '';
    
    try {
      // AT Protocol AgentでBlueSkyにログイン
      const agent = new AtpAgent({
        service: `https://${host}`
      });
      
      // ハンドル形式の処理
      const identifier = handle.includes('.') ? handle : `${handle}.bsky.social`;
      
      // ログイン実行
      const response = await agent.login({
        identifier: identifier,
        password: password
      });
      
      // ログイン成功 - didとハンドル、プロフィール情報を保存
      console.log('ログイン成功:', response);
      
      // プロフィール情報を取得
      const profile = await agent.getProfile({ actor: response.data.did });
      console.log('プロフィール情報:', profile.data);
      
      // Store API に認証情報を保存
      const sessionData = {
        ...response.data,
        active: response.data.active ?? true  // activeがundefinedの場合はtrueを設定
      };
      
      const saveResult = await authService.saveAccount(
        `https://${host}`,
        sessionData,
        {
          did: response.data.did,
          handle: response.data.handle,
          displayName: profile.data.displayName,
          avatar: profile.data.avatar,
        }
      );
      
      if (!saveResult.success) {
        console.error('認証情報の保存に失敗:', saveResult.error);
        errorMessage = '認証情報の保存に失敗しました。もう一度お試しください。';
        return;
      }
      
      console.log('認証情報を正常に保存:', saveResult.data);
      await goto('/deck');
      
    } catch (error: any) {
      // AT Protocol固有のエラーハンドリング
      console.error('Login error:', error);
      
      if (error?.status === 401) {
        errorMessage = '認証に失敗しました。ハンドルとアプリパスワードを確認してください。';
      } else if (error?.status === 400) {
        errorMessage = 'ハンドルまたはパスワードの形式が正しくありません。';
      } else if (error?.status === 429) {
        errorMessage = 'リクエストが多すぎます。しばらく時間をおいてからお試しください。';
      } else if (error?.message?.includes('network') || error?.code === 'ENOTFOUND') {
        errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
      } else if (error?.message?.includes('timeout') || error?.code === 'ETIMEDOUT') {
        errorMessage = '接続がタイムアウトしました。しばらく時間をおいてからお試しください。';
      } else if (error?.message?.includes('invalid_grant')) {
        errorMessage = 'アプリパスワードが無効です。新しいアプリパスワードを作成してください。';
      } else if (error?.message?.includes('account_not_found')) {
        errorMessage = 'アカウントが見つかりません。ハンドルを確認してください。';
      } else {
        errorMessage = error?.message || 'ログインに失敗しました。しばらく時間をおいてからお試しください。';
      }
    } finally {
      isLoading = false;
    }
  }
</script>

<main class="login-container">
  <div class="login-card">
    <div class="login-header">
      <h1>moodeSky</h1>
      <p>Blueskyアカウントでログイン</p>
    </div>

    {#if errorMessage}
      <div class="error-message">
        <span class="error-icon">⚠️</span>
        {errorMessage}
      </div>
    {/if}

    <form class="login-form" onsubmit={handleLogin}>
      <div class="form-group">
        <label for="handle">ハンドル</label>
        <input
          id="handle"
          type="text"
          placeholder="例: alice.bsky.social"
          bind:value={handle}
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
          disabled={isLoading}
          required
        />
      </div>

      <div class="form-group">
        <label for="password">アプリパスワード</label>
        <div class="password-input-container">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="アプリパスワードを入力"
            bind:value={password}
            disabled={isLoading}
            required
          />
          <button
            type="button"
            class="password-toggle-button"
            onclick={() => showPassword = !showPassword}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      <div class="form-group">
        <label for="host">ホスト</label>
        <input
          id="host"
          type="text"
          placeholder="bsky.social"
          bind:value={host}
          disabled={isLoading}
          required
        />
      </div>

      <button type="submit" class="login-button" disabled={isLoading}>
        {#if isLoading}
          <span class="loading-spinner"></span>
          ログイン中...
        {:else}
          ログイン
        {/if}
      </button>
    </form>

    <div class="login-footer">
      <p>
        <a href="https://bsky.app/settings/app-passwords" target="_blank">
          アプリパスワードの作成方法
        </a>
      </p>
    </div>
  </div>
</main>

<style>
  .login-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    padding: 1rem;
  }

  .login-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    padding: 2rem;
    width: 100%;
    max-width: 400px;
  }

  .login-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .login-header h1 {
    color: #333;
    font-size: 2rem;
    margin: 0 0 0.5rem 0;
    font-weight: 700;
  }

  .login-header p {
    color: #666;
    margin: 0;
    font-size: 0.9rem;
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-weight: 600;
    color: #333;
    font-size: 0.9rem;
  }

  .password-input-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .form-group input {
    padding: 0.75rem;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s ease;
    background: white;
    width: 100%;
    box-sizing: border-box;
  }

  .password-input-container input {
    padding-right: 3rem;
  }

  .password-toggle-button {
    position: absolute;
    right: 0.75rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.2rem;
    padding: 0.25rem;
    border-radius: 4px;
    transition: background-color 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .password-toggle-button:hover {
    background-color: #f1f5f9;
  }

  .form-group input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .login-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 0.875rem;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .login-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
  }

  .login-button:active {
    transform: translateY(0);
  }

  .login-footer {
    margin-top: 1.5rem;
    text-align: center;
  }

  .login-footer a {
    color: #667eea;
    text-decoration: none;
    font-size: 0.85rem;
  }

  .login-footer a:hover {
    text-decoration: underline;
  }

  /* エラーメッセージスタイル */
  .error-message {
    background-color: #fee2e2;
    border: 1px solid #fecaca;
    color: #dc2626;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    animation: fadeIn 0.3s ease-in-out;
  }

  .error-icon {
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  /* ローディングスピナー */
  .loading-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    margin-right: 0.5rem;
    animation: spin 1s linear infinite;
    display: inline-block;
  }

  /* 無効化状態スタイル */
  .form-group input:disabled {
    background-color: #f9fafb;
    color: #9ca3af;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .login-button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
  }

  .login-button:disabled:hover {
    transform: none;
    box-shadow: none;
  }

  /* アニメーション */
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes fadeIn {
    0% { opacity: 0; transform: translateY(-10px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @media (prefers-color-scheme: dark) {
    .login-card {
      background: #1a1a1a;
      color: #f6f6f6;
    }

    .login-header h1 {
      color: #f6f6f6;
    }

    .login-header p {
      color: #a0a0a0;
    }

    .form-group label {
      color: #f6f6f6;
    }

    .form-group input {
      background: #2a2a2a;
      border-color: #404040;
      color: #f6f6f6;
    }

    .password-toggle-button:hover {
      background-color: #404040;
    }

    /* ダークモードでのエラーメッセージ */
    .error-message {
      background-color: #450a0a;
      border-color: #7f1d1d;
      color: #fca5a5;
    }

    .form-group input:disabled {
      background-color: #374151;
      color: #6b7280;
    }

    .form-group input:focus {
      border-color: #667eea;
    }
  }
</style>