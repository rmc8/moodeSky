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

<main class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4">
  <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 w-full max-w-md">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">moodeSky</h1>
      <p class="text-gray-600 dark:text-gray-400 text-sm">Blueskyアカウントでログイン</p>
    </div>

    {#if errorMessage}
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6 flex items-center gap-2 text-sm animate-in fade-in duration-300">
        <span class="text-lg flex-shrink-0">⚠️</span>
        {errorMessage}
      </div>
    {/if}

    <form class="flex flex-col gap-6" onsubmit={handleLogin}>
      <div class="flex flex-col gap-2">
        <label for="handle" class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">ハンドル</label>
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
          class="w-full px-3 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-base transition-colors focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100 dark:focus:ring-blue-900/50 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label for="password" class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">アプリパスワード</label>
        <div class="relative flex items-center">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="アプリパスワードを入力"
            bind:value={password}
            disabled={isLoading}
            required
            class="w-full px-3 py-3 pr-12 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-base transition-colors focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100 dark:focus:ring-blue-900/50 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="button"
            onclick={() => showPassword = !showPassword}
            class="absolute right-3 p-1 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-center text-lg"
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <label for="host" class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">ホスト</label>
        <input
          id="host"
          type="text"
          placeholder="bsky.social"
          bind:value={host}
          disabled={isLoading}
          required
          class="w-full px-3 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-base transition-colors focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100 dark:focus:ring-blue-900/50 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      <button type="submit" disabled={isLoading} class="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:hover:translate-y-0 disabled:hover:shadow-none">
        {#if isLoading}
          <div class="flex items-center justify-center gap-2">
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ログイン中...
          </div>
        {:else}
          ログイン
        {/if}
      </button>
    </form>

    <div class="mt-6 text-center">
      <p>
        <a href="https://bsky.app/settings/app-passwords" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline text-sm">
          アプリパスワードの作成方法
        </a>
      </p>
    </div>
  </div>
</main>

