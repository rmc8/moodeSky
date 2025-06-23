<!--
  AddDeckModal.svelte
  統一UIコンポーネントシステム移行版
  
  Modal.svelte + Button.svelte による実装
-->
<script lang="ts">
  import { Modal, Button } from '$lib/components/ui';
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

<!-- 統一UIコンポーネントシステム -->
<Modal 
  {isOpen}
  title="デッキを追加"
  onClose={handleClose}
  showFooter={true}
  size="lg"
>
  <!-- ヘッダーサブタイトル -->
  <svelte:fragment slot="header">
    <p class="text-secondary text-lg leading-relaxed">
      追加したいフィードを選択してください
    </p>
  </svelte:fragment>

  <!-- メインコンテンツ -->
  <SimpleFeedAdder onSuccess={handleSuccess} />

  <!-- フッターボタン -->
  <svelte:fragment slot="footer">
    <div class="flex justify-end">
      <Button 
        variant="secondary" 
        onclick={handleClose}
        size="md"
      >
        閉じる
      </Button>
    </div>
  </svelte:fragment>
</Modal>