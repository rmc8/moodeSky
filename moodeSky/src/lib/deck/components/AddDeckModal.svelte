<!--
  AddDeckModal.svelte
  統一UIコンポーネントシステム移行版
  
  Modal.svelte + Button.svelte による実装
-->
<script lang="ts">
  import { Modal, Button } from '$lib/components/ui';
  import SimpleFeedAdder from './SimpleFeedAdder.svelte';
  import type { AddDeckModalProps, Column } from '../types.js';
  import * as m from '../../../paraglide/messages.js';

  // ===================================================================
  // Props
  // ===================================================================

  const { isOpen, onClose, onSuccess, zIndex = 50 }: AddDeckModalProps = $props();

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
  {zIndex}
  title={m['deck.addDeck.title']()}
  onClose={handleClose}
  showFooter={true}
  size="lg"
>
  <!-- ヘッダーサブタイトル -->
  <svelte:fragment slot="header">
    <p class="text-secondary text-lg leading-relaxed">
      {m['deck.addDeck.subtitle']()}
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
        {m['deck.addDeck.buttons.cancel']()}
      </Button>
    </div>
  </svelte:fragment>
</Modal>