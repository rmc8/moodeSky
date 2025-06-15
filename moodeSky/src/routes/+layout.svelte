<script>
  // グローバルスタイルの読み込み
  import '../app.css';
  
  // テーマ管理
  import { onMount } from 'svelte';
  import { initializeTheme } from '$lib/stores/theme.js';
  
  // 認証管理
  import { page } from '$app/stores';
  import { checkAuthStatus, isAuthenticated } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  
  onMount(() => {
    // テーマ初期化
    const themeCleanup = initializeTheme();
    
    // 認証状態確認（非同期）
    checkAuthStatus();
    
    // ログインページ以外で未認証の場合はリダイレクト
    const unsubscribe = isAuthenticated.subscribe((authenticated) => {
      if (!authenticated && $page.route.id !== '/login') {
        goto('/login');
      }
    });
    
    return () => {
      if (themeCleanup) themeCleanup();
      unsubscribe();
    };
  });
</script>

<!-- グローバルレイアウト -->
<main class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
  <slot />
</main>

<style>
  /* グローバルスタイル調整 */
  :global(html) {
    scroll-behavior: smooth;
  }
  
  :global(body) {
    font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
  }
</style>