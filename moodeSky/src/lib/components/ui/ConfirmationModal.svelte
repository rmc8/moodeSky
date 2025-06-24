<!--
  ConfirmationModal.svelte
  確認ダイアログ専用モーダル - moodeSky統一デザイン
  
  既存Modal.svelteをラップして、削除・重要な操作の確認に特化
  完全クロスプラットフォーム対応（WebView、Android、iOS）
-->
<script lang="ts">
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import * as m from '../../../paraglide/messages.js';

  // ===================================================================
  // Props（Svelte 5 runes）
  // ===================================================================

  interface Props {
    /** モーダル表示状態 */
    isOpen: boolean;
    
    /** 確認タイトル */
    title?: string;
    
    /** 確認メッセージ */
    message: string;
    
    /** 確認ボタンテキスト（カスタム） */
    confirmText?: string;
    
    /** キャンセルボタンテキスト（カスタム） */
    cancelText?: string;
    
    /** 危険度レベル */
    variant?: 'danger' | 'warning' | 'info';
    
    /** 確認アイコン表示フラグ */
    showIcon?: boolean;
    
    /** z-indexレベル */
    zIndex?: number;
    
    /** 確認時のコールバック */
    onConfirm: () => void;
    
    /** キャンセル時のコールバック */
    onCancel: () => void;
  }

  const {
    isOpen,
    title,
    message,
    confirmText,
    cancelText,
    variant = 'warning',
    showIcon = true,
    zIndex = 60,
    onConfirm,
    onCancel
  }: Props = $props();

  // ===================================================================
  // 動的値計算（$derived）
  // ===================================================================

  /**
   * バリアント別設定
   */
  const variantConfig = $derived(() => {
    switch (variant) {
      case 'danger':
        return {
          icon: ICONS.DELETE,
          iconColor: 'error' as const,
          titleClass: 'text-error',
          messageClass: 'text-themed',
          confirmButtonVariant: 'primary' as const, // エラー系はprimaryボタンで強調
          confirmButtonClass: 'bg-error hover:bg-error/90'
        };
      case 'warning':
        return {
          icon: ICONS.WARNING,
          iconColor: 'warning' as const,
          titleClass: 'text-warning',
          messageClass: 'text-themed',
          confirmButtonVariant: 'primary' as const,
          confirmButtonClass: 'bg-warning hover:bg-warning/90'
        };
      case 'info':
        return {
          icon: ICONS.INFO,
          iconColor: 'primary' as const,
          titleClass: 'text-primary',
          messageClass: 'text-themed',
          confirmButtonVariant: 'primary' as const,
          confirmButtonClass: ''
        };
      default:
        return {
          icon: ICONS.HELP_CIRCLE,
          iconColor: 'themed' as const,
          titleClass: 'text-themed',
          messageClass: 'text-themed',
          confirmButtonVariant: 'primary' as const,
          confirmButtonClass: ''
        };
    }
  });

  /**
   * 表示テキスト（多言語対応）
   */
  const displayTexts = $derived(() => ({
    title: title || m['common.delete'](),
    confirmText: confirmText || m['common.delete'](),
    cancelText: cancelText || m['common.cancel']()
  }));

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  /**
   * 確認ボタンクリック
   */
  const handleConfirm = () => {
    onConfirm();
  };

  /**
   * キャンセルボタンクリック
   */
  const handleCancel = () => {
    onCancel();
  };

  /**
   * ESCキー処理（キャンセル扱い）
   */
  const handleEscapeKey = () => {
    onCancel();
  };
</script>

<!-- 
  確認ダイアログモーダル
  tokimekibluesky参考の配置戦略で最適化
-->
<Modal
  {isOpen}
  size="sm"
  title=""
  showHeader={false}
  showFooter={true}
  showCloseButton={false}
  onClose={handleCancel}
  onEscapeKey={handleEscapeKey}
  {zIndex}
>
  <!-- メインコンテンツ -->
  <div class="text-center space-y-6 py-4">
    <!-- アイコン -->
    {#if showIcon}
      <div class="flex justify-center">
        <div class="w-16 h-16 rounded-full bg-{variantConfig().iconColor}/10 flex items-center justify-center">
          <Icon 
            icon={variantConfig().icon} 
            size="xl" 
            color={variantConfig().iconColor}
          />
        </div>
      </div>
    {/if}

    <!-- タイトル -->
    <div>
      <h3 class="text-2xl font-bold {variantConfig().titleClass} mb-2">
        {displayTexts().title}
      </h3>
      
      <!-- メッセージ -->
      <p class="text-lg {variantConfig().messageClass} leading-relaxed max-w-sm mx-auto">
        {message}
      </p>
    </div>
  </div>

  <!-- フッター（ボタンエリア） -->
  <svelte:fragment slot="footer">
    <div class="flex flex-col-reverse sm:flex-row gap-3 justify-center sm:justify-end">
      <!-- キャンセルボタン -->
      <Button
        variant="secondary"
        size="lg"
        onclick={handleCancel}
        class="flex-1 sm:flex-initial sm:min-w-24"
      >
        {displayTexts().cancelText}
      </Button>

      <!-- 確認ボタン -->
      <Button
        variant={variantConfig().confirmButtonVariant}
        size="lg"
        onclick={handleConfirm}
        class="flex-1 sm:flex-initial sm:min-w-24 {variantConfig().confirmButtonClass}"
      >
        {displayTexts().confirmText}
      </Button>
    </div>
  </svelte:fragment>
</Modal>

<!--
  使用例:

  削除確認（危険）:
  <ConfirmationModal
    isOpen={showDeleteModal}
    variant="danger"
    title="カラム削除"
    message="このカラムを完全に削除します。この操作は取り消せません。"
    onConfirm={handleDeleteConfirm}
    onCancel={handleDeleteCancel}
  />

  警告確認:
  <ConfirmationModal
    isOpen={showWarningModal}
    variant="warning"
    message="この操作を続行しますか？"
    confirmText="続行"
    onConfirm={handleWarningConfirm}
    onCancel={handleWarningCancel}
  />

  情報確認:
  <ConfirmationModal
    isOpen={showInfoModal}
    variant="info"
    title="設定変更"
    message="設定を保存しますか？"
    confirmText="保存"
    cancelText="キャンセル"
    onConfirm={handleSaveConfirm}
    onCancel={handleSaveCancel}
  />

  カスタムテキスト:
  <ConfirmationModal
    isOpen={showCustomModal}
    variant="danger"
    title="重要な操作"
    message="本当に実行しますか？"
    confirmText="実行"
    cancelText="やめる"
    showIcon={true}
    onConfirm={handleCustomConfirm}
    onCancel={handleCustomCancel}
  />

  アイコンなし:
  <ConfirmationModal
    isOpen={showSimpleModal}
    variant="info"
    message="確認してください"
    showIcon={false}
    onConfirm={handleSimpleConfirm}
    onCancel={handleSimpleCancel}
  />
-->