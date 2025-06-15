<script>
  // グローバルスタイルの読み込み
  import '../app.css';
  
  // テーマ管理
  import { onMount } from 'svelte';
  import { initializeTheme } from '$lib/stores/theme.js';
  
  onMount(() => {
    return initializeTheme();
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