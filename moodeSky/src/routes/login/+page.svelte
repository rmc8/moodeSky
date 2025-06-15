<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { login, isAuthenticated, authLoading, authError, clearAuthError } from '$lib/stores/auth';
  
  // UIコンポーネントのインポート
  import Button from '$lib/components/ui/button.svelte';
  import Card from '$lib/components/ui/card.svelte';
  import Input from '$lib/components/ui/input.svelte';
  
  // アイコンのインポート
  import { Eye, EyeOff, LogIn, Moon, Sun } from '$lib/components/icons/index.js';
  import { toggleDarkMode } from '$lib/stores/theme.js';

  // フォームの状態管理
  let handleOrEmail = $state('');
  let password = $state('');
  let serviceUrl = $state('https://bsky.social');
  let showPassword = $state(false);
  let isCustomPDS = $state(false);

  // バリデーション
  let formValid = $derived(
    handleOrEmail.trim().length > 0 && 
    password.trim().length > 0
  );

  // 認証済みの場合はメイン画面にリダイレクト
  onMount(() => {
    const unsubscribe = isAuthenticated.subscribe((authenticated) => {
      if (authenticated) {
        goto('/');
      }
    });
    
    return unsubscribe;
  });

  // ログイン処理
  async function handleLogin(event: Event) {
    event.preventDefault();
    
    if (!formValid) return;
    
    clearAuthError();
    
    const trimmedHandle = handleOrEmail.trim();
    const trimmedPassword = password.trim();
    const pdsUrl = isCustomPDS ? serviceUrl.trim() : 'https://bsky.social';
    
    await login(trimmedHandle, trimmedPassword, pdsUrl);
  }

  // パスワード表示切り替え
  function togglePasswordVisibility() {
    showPassword = !showPassword;
  }

  // カスタムPDS切り替え
  function toggleCustomPDS() {
    isCustomPDS = !isCustomPDS;
    if (!isCustomPDS) {
      serviceUrl = 'https://bsky.social';
    }
  }

  // エンターキーでのフォーム送信
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && formValid && !$authLoading) {
      handleLogin(event);
    }
  }
</script>

<svelte:head>
  <title>ログイン - moodeSky</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
  <!-- ヘッダー (ダークモード切り替え) -->
  <div class="absolute top-4 right-4">
    <Button variant="ghost" size="icon" onclick={toggleDarkMode}>
      <Moon class="w-5 h-5" />
    </Button>
  </div>

  <!-- ログインフォーム -->
  <div class="w-full max-w-md">
    <!-- ロゴ・タイトル -->
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        🌙 moodeSky
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        Blueskyにログインして始めましょう
      </p>
    </div>

    <!-- ログインカード -->
    <Card class="p-6">
      <form onsubmit={handleLogin} class="space-y-4">
        <!-- ハンドル/メール入力 -->
        <div class="space-y-2">
          <label for="handle" class="text-sm font-medium text-gray-700 dark:text-gray-300">
            ハンドルまたはメールアドレス
          </label>
          <Input
            id="handle"
            type="text"
            bind:value={handleOrEmail}
            placeholder="@example.bsky.social または email@example.com"
            class="w-full"
            autocomplete="username"
            onkeydown={handleKeydown}
            disabled={$authLoading}
          />
        </div>

        <!-- パスワード入力 -->
        <div class="space-y-2">
          <label for="password" class="text-sm font-medium text-gray-700 dark:text-gray-300">
            アプリパスワード
          </label>
          <div class="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              bind:value={password}
              placeholder="アプリパスワードを入力"
              class="w-full pr-10"
              autocomplete="current-password"
              onkeydown={handleKeydown}
              disabled={$authLoading}
            />
            <button
              type="button"
              onclick={togglePasswordVisibility}
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              disabled={$authLoading}
            >
              {#if showPassword}
                <EyeOff class="w-4 h-4" />
              {:else}
                <Eye class="w-4 h-4" />
              {/if}
            </button>
          </div>
        </div>

        <!-- カスタムPDS設定 -->
        <div class="space-y-2">
          <div class="flex items-center space-x-2">
            <input
              id="custom-pds"
              type="checkbox"
              bind:checked={isCustomPDS}
              onchange={toggleCustomPDS}
              class="w-4 h-4 text-bluesky-600 bg-gray-100 border-gray-300 rounded focus:ring-bluesky-500 dark:focus:ring-bluesky-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              disabled={$authLoading}
            />
            <label for="custom-pds" class="text-sm text-gray-700 dark:text-gray-300">
              カスタムPDSを使用
            </label>
          </div>
          
          {#if isCustomPDS}
            <Input
              id="service-url"
              type="url"
              bind:value={serviceUrl}
              placeholder="https://custom.pds.example.com"
              class="w-full"
              onkeydown={handleKeydown}
              disabled={$authLoading}
            />
          {/if}
        </div>

        <!-- エラーメッセージ -->
        {#if $authError}
          <div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p class="text-red-800 dark:text-red-200 text-sm">{$authError}</p>
          </div>
        {/if}

        <!-- ログインボタン -->
        <Button 
          type="submit" 
          class="w-full" 
          disabled={!formValid || $authLoading}
        >
          {#if $authLoading}
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ログイン中...
          {:else}
            <LogIn class="w-4 h-4 mr-2" />
            ログイン
          {/if}
        </Button>
      </form>
    </Card>

    <!-- アプリパスワードの説明 -->
    <div class="mt-6 text-center">
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
        アプリパスワードが必要です
      </p>
      <a 
        href="https://bsky.app/settings/app-passwords" 
        target="_blank"
        rel="noopener noreferrer"
        class="text-bluesky-600 hover:text-bluesky-700 dark:text-bluesky-400 dark:hover:text-bluesky-300 text-sm underline"
      >
        設定でアプリパスワードを作成 →
      </a>
    </div>

    <!-- フッター -->
    <div class="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
      <p>
        moodeSky v1.0.0 - AT Protocol対応デッキ型クライアント
      </p>
      <p class="mt-1">
        安全な認証でBlueskyに接続します
      </p>
    </div>
  </div>
</div>

<style>
  /* カスタムBlueskyカラー */
  :global(.text-bluesky-600) {
    color: #0085ff;
  }
  
  :global(.text-bluesky-700) {
    color: #0066cc;
  }
  
  :global(.text-bluesky-400) {
    color: #4da6ff;
  }
  
  :global(.text-bluesky-300) {
    color: #80bfff;
  }
  
  :global(.hover\\:text-bluesky-700:hover) {
    color: #0066cc;
  }
  
  :global(.hover\\:text-bluesky-300:hover) {
    color: #80bfff;
  }
</style>