<script lang="ts">
  import { goto } from '$app/navigation';

  let handle = $state('');
  let password = $state('');
  let host = $state('bsky.social');
  let showPassword = $state(false);

  async function handleLogin(event: Event) {
    event.preventDefault();
    
    // 簡単なバリデーション
    if (!handle || !password) {
      alert('ハンドルとパスワードを入力してください');
      return;
    }
    
    // 仮のログイン処理（API通信なし）
    console.log('ログイン情報:', { handle, password, host });
    
    // デッキページに遷移
    await goto('/deck');
  }
</script>

<main class="login-container">
  <div class="login-card">
    <div class="login-header">
      <h1>moodeSky</h1>
      <p>Blueskyアカウントでログイン</p>
    </div>

    <form class="login-form" on:submit={handleLogin}>
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
            required
          />
          <button
            type="button"
            class="password-toggle-button"
            on:click={() => showPassword = !showPassword}
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
          required
        />
      </div>

      <button type="submit" class="login-button">
        ログイン
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

    .form-group input:focus {
      border-color: #667eea;
    }
  }
</style>