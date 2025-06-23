<!--
  AddDeckModal.svelte
  tokimekibluesky式シンプルデック追加モーダル
  
  透明性と直感性を重視した一覧表示方式
-->
<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import SimpleFeedAdder from './SimpleFeedAdder.svelte';
  import type { AddDeckModalProps, Column } from '../types.js';

  // ===================================================================
  // Props
  // ===================================================================

  const { isOpen, onClose, onSuccess }: AddDeckModalProps = $props();

  // ===================================================================
  // Event Handlers
  // ===================================================================


  /**
   * デッキ作成成功時の処理
   */
  function handleSuccess(column: Column) {
    onSuccess(column);
    handleClose();
  }


  /**
   * モーダルを閉じる
   */
  function handleClose() {
    onClose();
  }

</script>

<!-- モーダルオーバーレイ -->
{#if isOpen}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
    <div class="bg-card rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden transform transition-all duration-300 scale-100">
      <!-- ヘッダー -->
      <div class="bg-gradient-to-r from-primary/5 to-primary/10 px-8 py-6">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <h2 class="text-themed text-3xl font-bold mb-2 tracking-tight">デッキを追加</h2>
            <p class="text-secondary text-lg leading-relaxed">
              追加したいフィードを選択してください
            </p>
          </div>
          <button 
            class="text-themed hover:text-primary transition-all duration-200 p-3 rounded-xl bg-muted/10 border border-solid hover:bg-primary/15 active:bg-primary/20"
            style="border-color: rgb(var(--foreground) / 0.3) !important;"
            onmouseenter={function() { this.style.borderColor = 'rgb(var(--primary) / 0.4) !important'; }}
            onmouseleave={function() { this.style.borderColor = 'rgb(var(--foreground) / 0.3) !important'; }}
            onclick={handleClose}
            aria-label="閉じる"
          >
            <Icon icon={ICONS.CLOSE} size="lg" />
          </button>
        </div>
      </div>

      <!-- コンテンツエリア -->
      <div class="p-8 overflow-y-auto flex-1 custom-scrollbar">
        <SimpleFeedAdder onSuccess={handleSuccess} />
      </div>

      <!-- フッター -->
      <div class="bg-gradient-to-r from-muted/5 to-muted/10 px-8 py-6">
        <div class="flex justify-end">
          <button 
            class="px-8 py-3 text-themed hover:text-primary transition-all duration-200 rounded-xl bg-muted/10 border border-solid hover:bg-primary/15 font-semibold tracking-wide active:bg-primary/20"
            style="border-color: rgb(var(--foreground) / 0.3) !important;"
            onmouseenter={function() { this.style.borderColor = 'rgb(var(--primary) / 0.4) !important'; }}
            onmouseleave={function() { this.style.borderColor = 'rgb(var(--foreground) / 0.3) !important'; }}
            onclick={handleClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}