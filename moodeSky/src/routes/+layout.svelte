<script lang="ts">
  // グローバルスタイルをインポート
  import '../app.css';
  // テーマプロバイダーをインポート
  import ThemeProvider from '../lib/components/ThemeProvider.svelte';
</script>

<!-- テーマプロバイダーでアプリ全体をラップ -->
<ThemeProvider>
  {#snippet children()}
    <!-- メインアプリケーションのレイアウト -->
    <main class="min-h-screen w-full">
      <slot />
    </main>
  {/snippet}
</ThemeProvider>