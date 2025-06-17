<script lang="ts">
  import { goto } from '$app/navigation';
  import { AtpAgent } from '@atproto/api';
  import { authService } from '$lib/services/authStore.js';
  import Icon from '$lib/components/Icon.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import LanguageSelectorCompact from '$lib/components/LanguageSelectorCompact.svelte';
  import { ICONS } from '$lib/types/icon.js';

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

<main class="min-h-screen flex items-center justify-center bg-themed p-4">
  <div class="relative bg-card rounded-2xl shadow-xl p-8 w-full max-w-md">
    <!-- 設定パネル（右上） -->
    <div class="absolute top-4 right-4 flex flex-col gap-2">
      <ThemeToggle variant="compact" size="sm" showLabel={false} />
    </div>
    
    <!-- 言語セレクター（左上） -->
    <div class="absolute top-4 left-4">
      <LanguageSelectorCompact />
    </div>
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-themed mb-2">moodeSky</h1>
      <p class="text-label text-sm">Blueskyアカウントでログイン</p>
    </div>

    {#if errorMessage}
      <div class="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg mb-6 flex items-center gap-2 text-sm animate-in fade-in duration-300">
        <Icon 
          icon={ICONS.WARNING}
          size="lg"
          color="error"
          ariaLabel="エラー"
          class="flex-shrink-0"
        />
        {errorMessage}
      </div>
    {/if}

    <form class="flex flex-col gap-6" onsubmit={handleLogin}>
      <div class="flex flex-col gap-2">
        <label for="handle" class="text-sm font-semibold text-label uppercase tracking-wide">ハンドル</label>
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
          class="input-themed"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label for="password" class="text-sm font-semibold text-label uppercase tracking-wide">アプリパスワード</label>
        <div class="relative flex items-center">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="アプリパスワードを入力"
            bind:value={password}
            disabled={isLoading}
            required
            class="input-themed pr-12"
          />
          <button
            type="button"
            onclick={() => showPassword = !showPassword}
            class="group absolute right-3 p-2 rounded-md border-2 border-transparent bg-muted/20 hover:bg-primary hover:text-white focus:bg-primary focus:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 high-contrast:border-themed high-contrast:bg-background high-contrast:hover:bg-foreground high-contrast:focus:bg-foreground high-contrast:hover:text-black high-contrast:focus:text-black"
            aria-label={showPassword ? 'パスワードを非表示' : 'パスワードを表示'}
            title={showPassword ? 'パスワードを非表示にする' : 'パスワードを表示する'}
          >
            <Icon 
              icon={showPassword ? ICONS.VISIBILITY_OFF : ICONS.VISIBILITY}
              size="lg"
              color="themed"
              ariaLabel={showPassword ? 'パスワードを非表示' : 'パスワードを表示'}
              class="high-contrast:group-hover:![color:rgb(0_0_0)] high-contrast:group-focus:![color:rgb(0_0_0)]"
            />
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <label for="host" class="text-sm font-semibold text-label uppercase tracking-wide">ホスト</label>
        <input
          id="host"
          type="text"
          placeholder="bsky.social"
          bind:value={host}
          disabled={isLoading}
          required
          class="input-themed"
        />
      </div>

      <button type="submit" disabled={isLoading} class="button-primary w-full py-3 px-4 font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed disabled:opacity-60">
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
        <a href="https://bsky.app/settings/app-passwords" target="_blank" class="text-primary hover:underline text-sm">
          アプリパスワードの作成方法
        </a>
      </p>
    </div>
  </div>
</main>

