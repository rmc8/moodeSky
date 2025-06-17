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

<main class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
  <div class="text-center text-white">
    <h1 class="text-5xl font-bold mb-4">moodeSky</h1>
    <p class="text-xl opacity-80">ログインページに移動中...</p>
  </div>
</main>