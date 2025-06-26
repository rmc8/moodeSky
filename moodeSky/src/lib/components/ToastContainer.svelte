<!--
  ToastContainer.svelte
  トースト通知コンテナコンポーネント
  
  全てのトースト通知を管理・表示
-->
<script lang="ts">
  import Toast from './Toast.svelte';
  import { toastStore } from '$lib/stores/toast.svelte.js';

  // ===================================================================
  // 状態管理
  // ===================================================================

  // トーストストアからリアクティブにアイテムを取得
  const toasts = $derived(() => toastStore.items);

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  /**
   * トースト削除ハンドラー
   */
  function handleToastClose(id: string) {
    toastStore.remove(id);
  }
</script>

<!-- トーストコンテナ -->
{#if toasts().length > 0}
  <div 
    class="fixed top-4 right-4 z-[10000] flex flex-col gap-3 pointer-events-none"
    aria-live="polite"
    aria-label="通知"
  >
    {#each toasts() as toast (toast.id)}
      <div class="pointer-events-auto">
        <Toast 
          {toast}
          onClose={handleToastClose}
        />
      </div>
    {/each}
  </div>
{/if}