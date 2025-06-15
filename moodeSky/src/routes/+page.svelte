<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { toggleDarkMode } from '$lib/stores/theme.js';
  import { logout, currentUser, isAuthenticated } from '$lib/stores/auth';
  import { onMount } from 'svelte';
  
  // UIコンポーネントのインポート
  import Button from '$lib/components/ui/button.svelte';
  import Card from '$lib/components/ui/card.svelte';
  import Input from '$lib/components/ui/input.svelte';
  
  // アイコンのインポート
  import {
    Home,
    Search,
    Bell,
    User,
    Heart,
    MessageCircle,
    Repeat2,
    Share,
    Moon,
    Sun,
    Plus,
    Menu,
    LogOut
  } from '$lib/components/icons/index.js';

  let greetMsg = $state("");
  let name = $state("");
  let postText = $state("");

  async function greet(event: Event) {
    event.preventDefault();
    greetMsg = await invoke("greet", { name });
  }

  // ログアウト処理
  async function handleLogout() {
    await logout();
  }

  // モックデータ
  const mockPosts = [
    {
      id: 1,
      author: {
        handle: '@alice.bsky.social',
        displayName: 'Alice',
        avatar: '/svelte.svg'
      },
      text: 'これはmoodeSkyのテスト投稿です！Tailwind CSSとshadcn-svelteがうまく動作しています 🎉',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      likes: 12,
      reposts: 3,
      replies: 1
    },
    {
      id: 2,
      author: {
        handle: '@bob.bsky.social',
        displayName: 'Bob',
        avatar: '/tauri.svg'
      },
      text: 'Tauriアプリでのデッキ型UIを試しています。レスポンシブデザインも対応予定です。',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      likes: 8,
      reposts: 2,
      replies: 0
    }
  ];

  function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 1000 / 60);
    
    if (diffMins < 1) return '今';
    if (diffMins < 60) return `${diffMins}分前`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}時間前`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}日前`;
  }
</script>

<svelte:head>
  <title>🌙 moodeSky - デッキ型Blueskyクライアント</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <!-- ヘッダー -->
  <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
    <div class="flex items-center justify-between max-w-7xl mx-auto">
      <div class="flex items-center gap-3">
        <Menu class="w-6 h-6 text-gray-600 dark:text-gray-400 md:hidden" />
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">
          🌙 moodeSky
        </h1>
      </div>
      
      <div class="flex items-center gap-2">
        <!-- ユーザー情報表示 -->
        {#if $currentUser}
          <span class="text-sm text-gray-600 dark:text-gray-400 hidden md:block">
            @{$currentUser.handle}
          </span>
        {/if}
        
        <Button variant="ghost" size="icon" onclick={toggleDarkMode}>
          <Moon class="w-5 h-5" />
        </Button>
        
        <Button>
          <Plus class="w-4 h-4 mr-2" />
          投稿
        </Button>
        
        <!-- ログアウトボタン -->
        <Button variant="ghost" size="icon" onclick={handleLogout} title="ログアウト">
          <LogOut class="w-5 h-5" />
        </Button>
      </div>
    </div>
  </header>

  <!-- メインコンテンツ -->
  <main class="max-w-7xl mx-auto p-4">
    <!-- デッキレイアウトのデモ -->
    <div class="deck-container">
      <!-- ホームタイムライン -->
      <div class="deck-column">
        <div class="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-2">
            <Home class="w-5 h-5 text-bluesky-600" />
            <h2 class="font-semibold text-gray-900 dark:text-white">ホーム</h2>
          </div>
        </div>
        
        <div class="p-4 space-y-4">
          <!-- 投稿作成 -->
          <Card class="p-4">
            <div class="space-y-3">
              <Input 
                bind:value={postText}
                placeholder="いまどうしてる？"
                class="min-h-[80px] resize-none"
              />
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-500">{300 - postText.length}文字</span>
                <Button size="sm" disabled={!postText.trim()}>投稿</Button>
              </div>
            </div>
          </Card>

          <!-- 投稿一覧 -->
          {#each mockPosts as post (post.id)}
            <Card class="post-card">
              <div class="flex gap-3">
                <img src={post.author.avatar} alt={post.author.displayName} class="post-avatar" />
                
                <div class="flex-1 space-y-2">
                  <div class="flex items-center gap-2 text-sm">
                    <span class="font-semibold text-gray-900 dark:text-white">
                      {post.author.displayName}
                    </span>
                    <span class="text-gray-500">
                      {post.author.handle}
                    </span>
                    <span class="text-gray-500">•</span>
                    <span class="text-gray-500">
                      {formatRelativeTime(post.timestamp)}
                    </span>
                  </div>
                  
                  <div class="post-content">
                    {post.text}
                  </div>
                  
                  <div class="post-actions">
                    <button class="post-action-btn">
                      <MessageCircle class="w-4 h-4" />
                      <span class="text-xs">{post.replies}</span>
                    </button>
                    <button class="post-action-btn">
                      <Repeat2 class="w-4 h-4" />
                      <span class="text-xs">{post.reposts}</span>
                    </button>
                    <button class="post-action-btn">
                      <Heart class="w-4 h-4" />
                      <span class="text-xs">{post.likes}</span>
                    </button>
                    <button class="post-action-btn">
                      <Share class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          {/each}
        </div>
      </div>

      <!-- 通知カラム -->
      <div class="deck-column">
        <div class="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-2">
            <Bell class="w-5 h-5 text-bluesky-600" />
            <h2 class="font-semibold text-gray-900 dark:text-white">通知</h2>
          </div>
        </div>
        
        <div class="p-4">
          <Card class="p-4 text-center text-gray-500">
            <Bell class="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>新しい通知はありません</p>
          </Card>
        </div>
      </div>

      <!-- 検索カラム -->
      <div class="deck-column">
        <div class="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-2">
            <Search class="w-5 h-5 text-bluesky-600" />
            <h2 class="font-semibold text-gray-900 dark:text-white">検索</h2>
          </div>
        </div>
        
        <div class="p-4 space-y-4">
          <Input 
            placeholder="投稿・ユーザーを検索"
            class="w-full"
          />
          
          <Card class="p-4 text-center text-gray-500">
            <Search class="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>検索結果がここに表示されます</p>
          </Card>
        </div>
      </div>
    </div>

    <!-- Tauriテスト機能 -->
    <Card class="mt-8 p-6">
      <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Tauri動作テスト
      </h3>
      
      <div class="space-y-4">
        <form class="flex gap-2" onsubmit={greet}>
          <Input 
            bind:value={name}
            placeholder="名前を入力してください"
            class="flex-1"
          />
          <Button type="submit">挨拶</Button>
        </form>
        
        {#if greetMsg}
          <div class="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <p class="text-green-800 dark:text-green-200">{greetMsg}</p>
          </div>
        {/if}
      </div>
    </Card>
  </main>

  <!-- モバイルナビゲーション -->
  <nav class="mobile-nav">
    <button class="mobile-nav-item">
      <Home class="w-5 h-5" />
      <span class="text-xs">ホーム</span>
    </button>
    <button class="mobile-nav-item">
      <Search class="w-5 h-5" />
      <span class="text-xs">検索</span>
    </button>
    <button class="mobile-nav-item">
      <Bell class="w-5 h-5" />
      <span class="text-xs">通知</span>
    </button>
    <button class="mobile-nav-item">
      <User class="w-5 h-5" />
      <span class="text-xs">プロフィール</span>
    </button>
  </nav>
</div>
