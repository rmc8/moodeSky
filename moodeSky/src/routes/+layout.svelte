<script lang="ts">
  // グローバルスタイルをインポート
  import '../app.css';
</script>

<!-- メインアプリケーションのレイアウト -->
<main>
  <slot />
</main>

<style>
  main {
    min-height: 100vh;
    width: 100%;
  }
</style>