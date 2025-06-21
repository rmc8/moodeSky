<script lang="ts">
  import { onMount } from 'svelte';
  // グローバルスタイルをインポート
  import '../app.css';
  // テーマプロバイダーをインポート
  import ThemeProvider from '../lib/components/ThemeProvider.svelte';
  // i18n初期化
  import { initializeI18n, i18nStore } from '../lib/stores/i18n.svelte.js';

  // アプリケーション初期化
  onMount(async () => {
    // i18nシステムを初期化
    await initializeI18n();
  });
</script>

<!-- テーマプロバイダーでアプリ全体をラップ -->
<ThemeProvider>
  {#snippet children()}
    <!-- メインアプリケーションのレイアウト -->
    <main class="h-screen w-full flex flex-col">
      <slot />
    </main>
  {/snippet}
</ThemeProvider>