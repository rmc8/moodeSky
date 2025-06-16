<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { isAuthenticated, logout, currentUser, authLoading } from '$lib/stores/auth';
  import { toggleDarkMode } from '$lib/stores/theme.js';

  // UIコンポーネントのインポート
  import Button from '$lib/components/ui/button.svelte';
  import Card from '$lib/components/ui/card.svelte';
  import Spinner from '$lib/components/ui/spinner.svelte';

  // アイコンのインポート
  import { LogOut, User, Mail, Globe, Sun, Moon } from '$lib/components/icons/index.js';

  // 認証チェック
  onMount(() => {
    const unsubscribe = isAuthenticated.subscribe((authenticated) => {
      if (!authenticated) {
        goto('/login');
      }
    });
    
    return unsubscribe;
  });

  // ログアウト処理
  async function handleLogout() {
    await logout();
    goto('/login');
  }
</script>

<svelte:head>
  <title>ホーム - moodeSky</title>
</svelte:head>

{#if $authLoading}
  <!-- ローディング画面 -->
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
    <div class="text-center">
      <Spinner variant="primary" size="lg" class="mb-4" />
      <p class="text-gray-600 dark:text-gray-400">読み込み中...</p>
    </div>
  </div>
{:else if $isAuthenticated && $currentUser}
  <!-- メイン画面 -->
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
    <!-- ヘッダー -->
    <header class="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- ロゴ -->
          <div class="flex items-center">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span class="text-white text-lg">🌙</span>
            </div>
            <h1 class="ml-3 text-xl font-bold text-gray-900 dark:text-white">moodeSky</h1>
          </div>

          <!-- ヘッダーアクション -->
          <div class="flex items-center space-x-3">
            <!-- ダークモード切り替え -->
            <Button 
              variant="ghost" 
              size="icon" 
              onclick={toggleDarkMode}
              class="rounded-full"
            >
              <Moon class="w-5 h-5" />
            </Button>

            <!-- ログアウト -->
            <Button 
              variant="outline" 
              onclick={handleLogout}
              class="flex items-center gap-2"
            >
              <LogOut class="w-4 h-4" />
              ログアウト
            </Button>
          </div>
        </div>
      </div>
    </header>

    <!-- メインコンテンツ -->
    <main class="max-w-4xl mx-auto p-6">
      <!-- ユーザー情報カード -->
      <Card class="mb-8 p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div class="flex items-start space-x-4">
          <!-- アバター -->
          <div class="flex-shrink-0">
            {#if $currentUser.avatar_url}
              <img 
                src={$currentUser.avatar_url} 
                alt="プロフィール画像"
                class="w-16 h-16 rounded-full object-cover border-2 border-blue-500"
              />
            {:else}
              <div class="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <User class="w-8 h-8 text-white" />
              </div>
            {/if}
          </div>

          <!-- ユーザー詳細 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-2 mb-2">
              <h2 class="text-xl font-bold text-gray-900 dark:text-white truncate">
                {$currentUser.display_name || $currentUser.handle}
              </h2>
              {#if $currentUser.display_name}
                <span class="text-sm text-gray-500 dark:text-gray-400">
                  @{$currentUser.handle}
                </span>
              {/if}
            </div>

            <!-- ユーザー情報 -->
            <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <!-- Handle -->
              <div class="flex items-center space-x-2">
                <User class="w-4 h-4" />
                <span class="font-mono">@{$currentUser.handle}</span>
              </div>

              <!-- DID -->
              <div class="flex items-center space-x-2">
                <Globe class="w-4 h-4" />
                <span class="font-mono text-xs truncate" title={$currentUser.did}>
                  {$currentUser.did}
                </span>
              </div>

            </div>

            <!-- 表示名 -->
            {#if $currentUser.display_name && $currentUser.display_name !== $currentUser.handle}
              <div class="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  表示名: {$currentUser.display_name}
                </p>
              </div>
            {/if}
          </div>
        </div>
      </Card>

      <!-- ログイン成功メッセージ -->
      <Card class="p-6 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
            <span class="text-white text-lg">✓</span>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-emerald-800 dark:text-emerald-300">
              ログインに成功しました！
            </h3>
            <p class="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
              AT Protocolを通じてBlueskyに接続されています。
            </p>
          </div>
        </div>
      </Card>

      <!-- 今後の機能予告 -->
      <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card class="p-4 text-center">
          <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg mx-auto mb-3 flex items-center justify-center">
            <span class="text-2xl">📱</span>
          </div>
          <h3 class="font-semibold text-gray-900 dark:text-white mb-1">デッキビュー</h3>
          <p class="text-xs text-gray-600 dark:text-gray-400">複数のタイムラインを同時表示</p>
        </Card>

        <Card class="p-4 text-center">
          <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg mx-auto mb-3 flex items-center justify-center">
            <span class="text-2xl">👥</span>
          </div>
          <h3 class="font-semibold text-gray-900 dark:text-white mb-1">マルチアカウント</h3>
          <p class="text-xs text-gray-600 dark:text-gray-400">複数アカウントの同時管理</p>
        </Card>

        <Card class="p-4 text-center">
          <div class="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg mx-auto mb-3 flex items-center justify-center">
            <span class="text-2xl">🤖</span>
          </div>
          <h3 class="font-semibold text-gray-900 dark:text-white mb-1">AIエージェント</h3>
          <p class="text-xs text-gray-600 dark:text-gray-400">投稿支援・分析機能</p>
        </Card>
      </div>
    </main>
  </div>
{:else}
  <!-- 認証が必要 -->
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
    <div class="text-center">
      <p class="text-gray-600 dark:text-gray-400 mb-4">認証が必要です</p>
      <Button onclick={() => goto('/login')}>ログインページへ</Button>
    </div>
  </div>
{/if}
