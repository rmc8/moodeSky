<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { authService } from '$lib/services/authStore.js';

  onMount(async () => {
    try {
      // localStorage からの移行を試行
      const migrationResult = await authService.migrateFromLocalStorage();
      if (migrationResult.success && migrationResult.data) {
        console.log('localStorage からの移行が完了:', migrationResult.data);
      }

      // アクティブアカウントの確認
      const activeAccount = await authService.getActiveAccount();
      if (activeAccount.success && activeAccount.data) {
        console.log('アクティブアカウント発見:', activeAccount.data);
        await goto('/deck');
        return;
      }

      // ログインが必要
      await goto('/login');
    } catch (error) {
      console.error('認証状態確認エラー:', error);
      await goto('/login');
    }
  });
</script>

<main class="container">
  <div class="loading">
    <h1>moodeSky</h1>
    <p>ログインページに移動中...</p>
  </div>
</main>

<style>
.container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.loading {
  text-align: center;
  color: white;
}

.loading h1 {
  font-size: 3rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
}

.loading p {
  font-size: 1.2rem;
  opacity: 0.8;
  margin: 0;
}
</style>