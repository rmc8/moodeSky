<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { login, isAuthenticated, authLoading, authError, clearAuthError } from '$lib/stores/auth';
  import { toggleDarkMode } from '$lib/stores/theme.js';
  import { 
    getCurrentDefaultPds, 
    getPdsHistory, 
    validatePdsUrl, 
    addPdsToHistory,
    setDefaultPdsUrl 
  } from '$lib/stores/settings';

  // UIコンポーネントのインポート
  import Button from '$lib/components/ui/button.svelte';
  import Input from '$lib/components/ui/input.svelte';
  import Spinner from '$lib/components/ui/spinner.svelte';

  // アイコンのインポート
  import { LogIn, Moon, ChevronDown, Settings, Check, AlertTriangle } from '$lib/components/icons/index.js';

  // フォームの状態管理
  let handleOrEmail = $state('');
  let password = $state('');
  let pdsUrl = $state('');
  let showAdvanced = $state(false);
  let pdsDropdownOpen = $state(false);
  let customPdsInput = $state('');
  let pdsValidation = $state<{ valid: boolean; error?: string }>({ valid: true });

  // 初期化でデフォルトPDSを設定
  onMount(() => {
    pdsUrl = getCurrentDefaultPds();
  });

  // バリデーション
  let formValid = $derived(
    handleOrEmail.trim().length > 0 && 
    password.trim().length > 0 &&
    pdsValidation.valid
  );

  // PDS URL変更時のバリデーション
  $effect(() => {
    if (pdsUrl.trim()) {
      pdsValidation = validatePdsUrl(pdsUrl.trim());
    } else {
      pdsValidation = { valid: false, error: 'PDS URLが必要です' };
    }
  });

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
    const trimmedPdsUrl = pdsUrl.trim();
    
    // PDS履歴に追加
    await addPdsToHistory(trimmedPdsUrl);
    
    await login(trimmedHandle, trimmedPassword, trimmedPdsUrl);
  }

  // エンターキーでのフォーム送信
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && formValid && !$authLoading) {
      handleLogin(event);
    }
  }

  // PDS選択処理
  function selectPds(selectedPdsUrl: string) {
    pdsUrl = selectedPdsUrl;
    pdsDropdownOpen = false;
  }

  // カスタムPDS追加
  async function addCustomPds() {
    const trimmedInput = customPdsInput.trim();
    if (!trimmedInput) return;
    
    const validation = validatePdsUrl(trimmedInput);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }
    
    await addPdsToHistory(trimmedInput);
    selectPds(trimmedInput);
    customPdsInput = '';
  }

  // PDS URLをデフォルトに設定
  async function makeDefaultPds(pdsUrlToSet: string) {
    await setDefaultPdsUrl(pdsUrlToSet);
  }

  // 高度な設定の切り替え
  function toggleAdvanced() {
    showAdvanced = !showAdvanced;
  }
</script>

<svelte:head>
  <title>ログイン - moodeSky</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
  <!-- ダークモード切り替え -->
  <div class="absolute top-4 right-4">
    <Button 
      variant="ghost" 
      size="icon" 
      onclick={toggleDarkMode}
      class="rounded-full"
    >
      <Moon class="w-5 h-5" />
    </Button>
  </div>

  <!-- ログインフォーム -->
  <div class="w-full max-w-md">
    <!-- ロゴ・タイトル -->
    <div class="text-center mb-8">
      <div class="w-16 h-16 bg-blue-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
        <span class="text-2xl text-white">🌙</span>
      </div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        moodeSky
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        Blueskyにログインして始めましょう
      </p>
    </div>

    <!-- ログインカード -->
    <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <form onsubmit={handleLogin} class="space-y-6">
        <!-- ハンドル/メール入力 -->
        <div>
          <label for="handle" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            アプリパスワード
          </label>
          <Input
            id="password"
            type="password"
            bind:value={password}
            placeholder="アプリパスワードを入力"
            class="w-full"
            autocomplete="current-password"
            onkeydown={handleKeydown}
            disabled={$authLoading}
          />
        </div>

        <!-- 高度な設定（PDS選択） -->
        <div>
          <button
            type="button"
            onclick={toggleAdvanced}
            class="flex items-center justify-between w-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <span class="flex items-center gap-2">
              <Settings class="w-4 h-4" />
              高度な設定
            </span>
            <ChevronDown class={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
          
          {#if showAdvanced}
            <div class="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <!-- PDS URL選択 -->
              <div class="space-y-3">
                <label for="pds-url" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Personal Data Server (PDS)
                </label>
                
                <!-- PDS URL入力 -->
                <div class="relative">
                  <Input
                    id="pds-url"
                    type="url"
                    bind:value={pdsUrl}
                    placeholder="https://bsky.social"
                    class={`w-full pr-10 ${!pdsValidation.valid ? 'border-red-500 focus:ring-red-500' : ''}`}
                    onkeydown={handleKeydown}
                    disabled={$authLoading}
                  />
                  
                  <!-- バリデーション状態アイコン -->
                  <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {#if pdsValidation.valid}
                      <Check class="w-4 h-4 text-green-500" />
                    {:else}
                      <AlertTriangle class="w-4 h-4 text-red-500" />
                    {/if}
                  </div>
                </div>

                <!-- PDS バリデーションエラー -->
                {#if !pdsValidation.valid && pdsValidation.error}
                  <p class="text-xs text-red-600 dark:text-red-400">{pdsValidation.error}</p>
                {/if}

                <!-- PDS選択ドロップダウン -->
                <div class="relative">
                  <button
                    type="button"
                    onclick={() => pdsDropdownOpen = !pdsDropdownOpen}
                    class="w-full text-left px-3 py-2 text-sm bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                    disabled={$authLoading}
                  >
                    履歴から選択
                    <ChevronDown class={`w-4 h-4 float-right mt-0.5 transition-transform ${pdsDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {#if pdsDropdownOpen}
                    <div class="absolute z-10 w-full mt-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      <!-- 履歴一覧 -->
                      {#each getPdsHistory() as historyPds}
                        <button
                          type="button"
                          onclick={() => selectPds(historyPds)}
                          class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-500 border-b border-gray-200 dark:border-gray-500 last:border-b-0"
                        >
                          <div class="flex items-center justify-between">
                            <span class="truncate">{historyPds}</span>
                            {#if historyPds === getCurrentDefaultPds()}
                              <Check class="w-4 h-4 text-blue-500" />
                            {/if}
                          </div>
                        </button>
                      {/each}
                      
                      <!-- カスタムPDS追加 -->
                      <div class="p-2 border-t border-gray-200 dark:border-gray-500">
                        <div class="flex gap-2">
                          <Input
                            bind:value={customPdsInput}
                            placeholder="カスタムPDS URL"
                            class="flex-1 text-xs"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onclick={addCustomPds}
                            disabled={!customPdsInput.trim()}
                          >
                            追加
                          </Button>
                        </div>
                      </div>
                    </div>
                  {/if}
                </div>

                <!-- PDS情報 -->
                <div class="text-xs text-gray-600 dark:text-gray-400">
                  <p class="mb-1">💡 Personal Data Server (PDS) について</p>
                  <p>AT Protocolは分散型ネットワークです。bsky.socialは公式サーバーですが、セルフホストのPDSも利用できます。</p>
                </div>
              </div>
            </div>
          {/if}
        </div>

        <!-- エラーメッセージ -->
        {#if $authError}
          <div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p class="text-sm text-red-800 dark:text-red-200">{$authError}</p>
          </div>
        {/if}

        <!-- ログインボタン -->
        <Button 
          type="submit" 
          class="w-full bg-blue-500 hover:bg-blue-600 text-white" 
          disabled={!formValid || $authLoading}
        >
          {#if $authLoading}
            <Spinner variant="white" size="sm" class="mr-2" />
            ログイン中...
          {:else}
            <LogIn class="w-5 h-5 mr-2" />
            ログイン
          {/if}
        </Button>

        <!-- 接続先PDS表示 -->
        {#if pdsUrl && pdsValidation.valid}
          <div class="mt-3 p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
            <p class="text-xs text-gray-600 dark:text-gray-400 text-center">
              接続先: <span class="font-mono font-medium">{pdsUrl}</span>
            </p>
          </div>
        {/if}
      </form>
    </div>

    <!-- アプリパスワードの説明 -->
    <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <p class="text-sm text-blue-800 dark:text-blue-300 mb-2">
        💡 アプリパスワードが必要です
      </p>
      <p class="text-xs text-blue-700 dark:text-blue-400 mb-3">
        Blueskyのアカウント設定でアプリパスワードを作成してください
      </p>
      <a 
        href="https://bsky.app/settings/app-passwords" 
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      >
        アプリパスワードを作成 →
      </a>
    </div>
  </div>
</div>