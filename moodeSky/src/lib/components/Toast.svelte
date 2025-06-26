<!--
  Toast.svelte
  トースト通知コンポーネント
  
  成功/エラー/警告/情報の4タイプをサポート
  アニメーション付きのスライドイン/アウト
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import type { ToastItem, ToastType } from '$lib/stores/toast.svelte.js';

  // ===================================================================
  // プロパティ
  // ===================================================================

  interface Props {
    toast: ToastItem;
    onClose: (id: string) => void;
  }

  const { toast, onClose } = $props();

  // ===================================================================
  // 状態管理
  // ===================================================================

  let isVisible = $state(false);
  let isDismissing = $state(false);

  // ===================================================================
  // 算出プロパティ
  // ===================================================================

  // トーストタイプ別のスタイルクラス
  const typeStyles = $derived(() => {
    const baseClasses = 'border rounded-lg p-4 shadow-lg backdrop-blur-sm';
    
    switch (toast.type) {
      case 'success':
        return `${baseClasses} bg-success/10 border-success/30 text-success`;
      case 'error':
        return `${baseClasses} bg-error/10 border-error/30 text-error`;
      case 'warning':
        return `${baseClasses} bg-warning/10 border-warning/30 text-warning`;
      case 'info':
        return `${baseClasses} bg-primary/10 border-primary/30 text-primary`;
      default:
        return `${baseClasses} bg-muted/10 border-themed/30 text-themed`;
    }
  });

  // トーストタイプ別のアイコン
  const typeIcon = $derived(() => {
    switch (toast.type) {
      case 'success':
        return ICONS.CHECK;
      case 'error':
        return ICONS.ERROR;
      case 'warning':
        return ICONS.WARNING;
      case 'info':
        return ICONS.INFO;
      default:
        return ICONS.INFO;
    }
  });

  // トーストタイプ別のアイコンカラー
  const iconColor = $derived((): 'success' | 'error' | 'warning' | 'primary' => {
    switch (toast.type) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'primary';
      default:
        return 'primary';
    }
  });

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  /**
   * トースト閉じる処理
   */
  function handleClose() {
    isDismissing = true;
    
    // アニメーション完了後に実際に削除
    setTimeout(() => {
      onClose(toast.id);
    }, 300); // CSS transition duration と合わせる
  }

  /**
   * プログレスバーの進行状況を計算
   */
  function getProgressPercentage(): number {
    if (!toast.duration || toast.duration <= 0) return 100;
    
    const elapsed = Date.now() - toast.timestamp;
    const progress = Math.min((elapsed / toast.duration) * 100, 100);
    return 100 - progress; // 残り時間として表示
  }

  // ===================================================================
  // ライフサイクル
  // ===================================================================

  onMount(() => {
    // マウント後にフェードイン
    setTimeout(() => {
      isVisible = true;
    }, 10);

    // プログレスバー更新用のタイマー
    let progressInterval: ReturnType<typeof setInterval> | null = null;
    
    if (toast.duration && toast.duration > 0) {
      progressInterval = setInterval(() => {
        // プログレスバーの更新（実際の処理は CSS で行う）
      }, 100);

      // 自動削除は toastStore で管理されているため、ここでは何もしない
    }

    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  });
</script>

<!-- トースト通知 -->
<div 
  class={`
    relative max-w-md w-full transition-all duration-300 ease-in-out transform
    ${isVisible && !isDismissing ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
    ${typeStyles()}
  `}
  role="alert"
  aria-live="polite"
>
  <!-- メインコンテンツ -->
  <div class="flex items-start gap-3">
    <!-- アイコン -->
    <div class="flex-shrink-0">
      <Icon 
        icon={typeIcon()} 
        size="md" 
        color={iconColor()}
        ariaLabel={toast.type}
      />
    </div>

    <!-- メッセージ -->
    <div class="flex-1 min-w-0">
      {#if toast.title}
        <h4 class="font-semibold text-sm mb-1 truncate">
          {toast.title}
        </h4>
      {/if}
      <p class="text-sm leading-relaxed whitespace-pre-line">
        {toast.message}
      </p>
    </div>

    <!-- 閉じるボタン -->
    <button
      class="flex-shrink-0 p-1 rounded-md hover:bg-black/10 transition-colors"
      onclick={handleClose}
      aria-label="通知を閉じる"
      title="通知を閉じる"
    >
      <Icon 
        icon={ICONS.CLOSE} 
        size="sm" 
        color={iconColor()}
      />
    </button>
  </div>

  <!-- プログレスバー -->
  {#if toast.duration && toast.duration > 0}
    <div class="absolute bottom-0 left-0 right-0 h-1 bg-black/10 rounded-b-lg overflow-hidden">
      <div 
        class={`h-full transition-all ease-linear ${
          toast.type === 'success' ? 'bg-success' :
          toast.type === 'error' ? 'bg-error' :
          toast.type === 'warning' ? 'bg-warning' :
          'bg-primary'
        }`}
        style={`width: ${getProgressPercentage()}%; transition-duration: ${toast.duration}ms;`}
      ></div>
    </div>
  {/if}
</div>