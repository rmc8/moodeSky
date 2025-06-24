<!--
  統一Modal.svelte
  TailwindCSS v4統合テーマシステム + Svelte 5 runes対応
  
  既存モーダル構造の統一 + slot-based設計 + 完全アクセシビリティ対応
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import Button from './Button.svelte';
  import type { ModalProps } from './types.js';

  // ===================================================================
  // Props（Svelte 5 runes）
  // ===================================================================

  const {
    isOpen,
    size = 'lg',
    title,
    showHeader = true,
    showFooter = false,
    showCloseButton = true,
    onClose,
    onEscapeKey,
    zIndex = 50
  }: ModalProps = $props();

  // ===================================================================
  // 内部状態管理
  // ===================================================================

  let modalElement = $state<HTMLDivElement>();
  let overlayElement = $state<HTMLDivElement>();
  let focusableElements: HTMLElement[] = [];
  let previousActiveElement: HTMLElement | null = null;

  // ===================================================================
  // 動的スタイル生成（$derived）
  // ===================================================================

  /**
   * サイズ別クラス
   */
  const sizeClasses = $derived(() => {
    switch (size) {
      case 'sm':
        return 'max-w-md';
      case 'md':
        return 'max-w-2xl';
      case 'lg':
        return 'max-w-4xl';
      case 'xl':
        return 'max-w-6xl';
      case 'full':
        return 'max-w-none mx-4';
      default:
        return 'max-w-4xl';
    }
  });

  /**
   * z-index スタイル
   */
  const zIndexStyle = $derived(() => `z-${zIndex}`);

  /**
   * オーバーレイクラス
   */
  const overlayClasses = $derived(() => 
    `fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center ${zIndexStyle()} p-4 transition-all duration-300`
  );

  /**
   * モーダルコンテナクラス
   */
  const containerClasses = $derived(() => 
    `bg-card rounded-2xl shadow-2xl ${sizeClasses()} w-full max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-300 scale-100`
  );

  // ===================================================================
  // フォーカス管理（アクセシビリティ）
  // ===================================================================

  /**
   * フォーカス可能な要素を取得
   */
  const getFocusableElements = () => {
    if (!modalElement) return [];
    
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(modalElement.querySelectorAll(selector)) as HTMLElement[];
  };

  /**
   * フォーカストラップの実装
   */
  const handleTabKey = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab: 逆方向
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: 順方向
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  /**
   * 初期フォーカス設定
   */
  const setInitialFocus = () => {
    focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      // 最初のフォーカス可能要素にフォーカス
      focusableElements[0].focus();
    } else if (modalElement) {
      // フォーカス可能要素がない場合はモーダル自体にフォーカス
      modalElement.focus();
    }
  };

  /**
   * フォーカス復元
   * エラーハンドリング付き
   */
  const restoreFocus = () => {
    if (previousActiveElement) {
      try {
        // DOM要素がまだ存在するかチェック
        if (previousActiveElement.isConnected) {
          previousActiveElement.focus();
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Focus restoration failed:', error);
        }
        // フォーカス復元失敗時のフォールバック
        try {
          document.body.focus();
        } catch {
          // フォールバックも失敗した場合は無視
        }
      } finally {
        previousActiveElement = null;
      }
    }
  };

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  /**
   * モーダルを閉じる
   */
  const handleClose = () => {
    restoreFocus();
    onClose();
  };

  /**
   * ESCキー処理
   */
  const handleEscapeKey = () => {
    if (onEscapeKey) {
      onEscapeKey();
    } else {
      handleClose();
    }
  };

  /**
   * キーボードイベント処理
   */
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleEscapeKey();
    } else if (event.key === 'Tab') {
      handleTabKey(event);
    }
  };

  /**
   * オーバーレイクリック処理
   */
  const handleOverlayClick = (event: MouseEvent) => {
    // オーバーレイ直接クリック時のみ閉じる（モーダル内容クリックは無視）
    if (event.target === overlayElement) {
      handleClose();
    }
  };

  // ===================================================================
  // ライフサイクル
  // ===================================================================

  /**
   * モーダル開閉時の処理
   */
  $effect(() => {
    if (isOpen) {
      // モーダル開く時
      previousActiveElement = document.activeElement as HTMLElement;
      
      // 次のティックでフォーカス設定（DOM更新後）
      setTimeout(() => {
        setInitialFocus();
      }, 100);
      
      // bodyスクロール無効化
      document.body.style.overflow = 'hidden';
      
      // キーボードイベントリスナー追加
      document.addEventListener('keydown', handleKeyDown);
    } else {
      // モーダル閉じる時
      
      // bodyスクロール復元
      document.body.style.overflow = '';
      
      // キーボードイベントリスナー削除
      document.removeEventListener('keydown', handleKeyDown);
    }

    // クリーンアップ
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  });
</script>

<!-- 
  統一モーダルコンポーネント
  slot-based設計 + 完全アクセシビリティ対応
-->
{#if isOpen}
  <!-- オーバーレイ -->
  <div
    bind:this={overlayElement}
    class={overlayClasses()}
    onclick={handleOverlayClick}
    onkeydown={handleKeyDown}
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? 'modal-title' : undefined}
    tabindex="-1"
  >
    <!-- モーダルコンテナ -->
    <div
      bind:this={modalElement}
      class={containerClasses()}
      tabindex="-1"
      role="document"
    >
      <!-- ヘッダー -->
      {#if showHeader}
        <div class="bg-gradient-to-r from-primary/5 to-primary/10 px-8 py-6">
          <div class="flex items-center justify-between">
            <!-- タイトル部分 -->
            <div class="flex-1">
              {#if title}
                <h2 id="modal-title" class="text-themed text-3xl font-bold mb-2 tracking-tight">
                  {title}
                </h2>
              {/if}
              
              <!-- ヘッダースロット -->
              <slot name="header" />
            </div>

            <!-- 閉じるボタン -->
            {#if showCloseButton}
              <Button
                variant="secondary"
                size="md"
                onclick={handleClose}
                ariaLabel="モーダルを閉じる"
                class="p-3"
              >
                <Icon icon={ICONS.CLOSE} size="lg" />
              </Button>
            {/if}
          </div>
        </div>
      {/if}

      <!-- コンテンツエリア -->
      <div class="p-8 overflow-y-auto flex-1 custom-scrollbar">
        <slot />
      </div>

      <!-- フッター -->
      {#if showFooter}
        <div class="bg-gradient-to-r from-muted/5 to-muted/10 px-8 py-6">
          <slot name="footer" />
        </div>
      {/if}
    </div>
  </div>
{/if}

<!--
  使用例:

  基本的なモーダル:
  <Modal isOpen={showModal} title="確認" onClose={() => showModal = false}>
    <p>本当に削除しますか？</p>
    
    <svelte:fragment slot="footer">
      <div class="flex justify-end gap-3">
        <Button variant="secondary" onclick={() => showModal = false}>キャンセル</Button>
        <Button variant="primary" onclick={handleDelete}>削除</Button>
      </div>
    </svelte:fragment>
  </Modal>

  大きなモーダル:
  <Modal isOpen={showLargeModal} size="xl" onClose={closeLargeModal}>
    <div class="space-y-6">
      <h3 class="text-xl font-bold">詳細設定</h3>
      <Input label="設定名" bind:value={settingName} />
      <Input label="説明" type="textarea" bind:value={description} />
    </div>
  </Modal>

  カスタムヘッダー:
  <Modal isOpen={showCustomModal} showHeader={true} onClose={closeCustomModal}>
    <svelte:fragment slot="header">
      <div>
        <h2 class="text-2xl font-bold text-primary">カスタムタイトル</h2>
        <p class="text-secondary">サブタイトル</p>
      </div>
    </svelte:fragment>
    
    <div>カスタムヘッダー付きコンテンツ</div>
  </Modal>

  小さなモーダル:
  <Modal isOpen={showSmallModal} size="sm" title="通知" onClose={closeSmallModal}>
    <p class="text-center">操作が完了しました。</p>
    
    <svelte:fragment slot="footer">
      <div class="flex justify-center">
        <Button variant="primary" onclick={closeSmallModal}>OK</Button>
      </div>
    </svelte:fragment>
  </Modal>

  フルスクリーンモーダル:
  <Modal isOpen={showFullModal} size="full" title="詳細ビュー" onClose={closeFullModal}>
    <div class="h-full">
      <p>フルスクリーンコンテンツ</p>
    </div>
  </Modal>

  ESCキーハンドリング:
  <Modal 
    isOpen={showModal} 
    title="設定" 
    onClose={closeModal}
    onEscapeKey={handleCustomEscape}
  >
    <p>ESCキーの動作をカスタマイズできます</p>
  </Modal>
-->