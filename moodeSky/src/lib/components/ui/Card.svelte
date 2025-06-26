<!--
  統一Card.svelte
  TailwindCSS v4統合テーマシステム + Svelte 5 runes対応
  
  AccountSelector等のカードパターンを汎用化
  4バリアント × 4状態 × レスポンシブ対応
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { CardProps } from './types.js';

  // ===================================================================
  // Props（Svelte 5 runes）
  // ===================================================================

  const {
    variant = 'default',
    cardState = 'normal',
    padding = 'md',
    clickable = false,
    onclick,
    ariaLabel,
    class: additionalClass = '',
    children
  }: CardProps & { children: Snippet } = $props();

  // ===================================================================
  // 内部状態管理
  // ===================================================================

  let isCardHovered = $state(false);
  let isCardFocused = $state(false);

  // ===================================================================
  // 動的スタイル生成（$derived）
  // ===================================================================

  /**
   * バリアント別基本クラス
   */
  const variantClasses = $derived(() => {
    switch (variant) {
      case 'default':
        return 'bg-card border border-themed/20';
      
      case 'elevated':
        return 'bg-card border border-themed/10 shadow-lg shadow-black/5';
      
      case 'outlined':
        return 'bg-card border-2 border-themed/30';
      
      case 'filled':
        return 'bg-muted/20 border border-themed/10';
      
      default:
        return 'bg-card border border-themed/20';
    }
  });

  /**
   * 状態別クラス
   */
  const stateClasses = $derived(() => {
    switch (cardState) {
      case 'normal':
        return '';
      
      case 'selectable':
        if (clickable) {
          return 'hover:border-primary/50 hover:bg-primary/5 transition-all duration-150 cursor-pointer';
        }
        return 'hover:border-primary/30 hover:bg-primary/3 transition-all duration-150';
      
      case 'selected':
        return 'border-primary bg-primary/10 text-themed';
      
      case 'disabled':
        return 'opacity-50 cursor-not-allowed bg-muted/10';
      
      default:
        return '';
    }
  });

  /**
   * パディング別クラス
   */
  const paddingClasses = $derived(() => {
    switch (padding) {
      case 'none':
        return 'p-0';
      case 'sm':
        return 'p-4';
      case 'md':
        return 'p-6';
      case 'lg':
        return 'p-8';
      default:
        return 'p-6';
    }
  });

  /**
   * インタラクション状態クラス
   */
  const interactionClasses = $derived(() => {
    const classes = [];
    
    if (clickable || cardState === 'selectable') {
      classes.push('cursor-pointer');
      
      // フォーカス状態
      if (isCardFocused) {
        classes.push('ring-2 ring-primary/50 ring-offset-2');
      }
      
      // ホバー状態（選択済み以外）
      if (isCardHovered && cardState !== 'selected' && cardState !== 'disabled') {
        classes.push('transform scale-[1.02]');
      }
    }
    
    return classes.join(' ');
  });

  /**
   * 基本クラス
   */
  const baseClasses = 'rounded-xl transition-all duration-200';

  /**
   * 最終的なクラス文字列
   */
  const finalClasses = $derived(() => 
    `${baseClasses} ${variantClasses()} ${stateClasses()} ${paddingClasses()} ${interactionClasses()} ${additionalClass}`.trim()
  );

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  const handleClick = () => {
    if (cardState === 'disabled') return;
    if (clickable || cardState === 'selectable') {
      onclick?.();
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (cardState === 'disabled') return;
    if (clickable || cardState === 'selectable') {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleClick();
      }
    }
  };

  const handleMouseEnter = () => {
    if (cardState !== 'disabled') {
      isCardHovered = true;
    }
  };

  const handleMouseLeave = () => {
    isCardHovered = false;
  };

  const handleFocus = () => {
    if (cardState !== 'disabled') {
      isCardFocused = true;
    }
  };

  const handleBlur = () => {
    isCardFocused = false;
  };

  // ===================================================================
  // アクセシビリティ属性
  // ===================================================================

  const accessibilityAttributes = $derived(() => {
    const attrs: Record<string, string | boolean | number> = {};

    if (clickable || cardState === 'selectable') {
      attrs['role'] = 'button';
      attrs['tabindex'] = cardState === 'disabled' ? -1 : 0;
      attrs['aria-disabled'] = cardState === 'disabled';
      
      if (ariaLabel) {
        attrs['aria-label'] = ariaLabel;
      }

      if (cardState === 'selected') {
        attrs['aria-selected'] = true;
      }
    }

    return attrs;
  });

  // ===================================================================
  // コンポーネント要素
  // ===================================================================

  /**
   * カードがボタンとして機能するかどうか
   */
  const isInteractive = $derived(() => 
    (clickable || cardState === 'selectable') && cardState !== 'disabled'
  );
</script>

<!-- 
  汎用カードコンポーネント
  AccountSelector等のパターンを統一
-->
{#if isInteractive()}
  <!-- インタラクティブカード（ボタン機能） -->
  <div
    class={finalClasses()}
    onclick={handleClick}
    onkeydown={handleKeyDown}
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
    onfocus={handleFocus}
    onblur={handleBlur}
    {...accessibilityAttributes()}
  >
    {@render children()}
  </div>
{:else}
  <!-- 静的カード -->
  <div class={finalClasses()}>
    {@render children()}
  </div>
{/if}

<!--
  使用例:

  基本的なカード:
  <Card>
    <h3>タイトル</h3>
    <p>コンテンツ</p>
  </Card>

  選択可能なカード:
  <Card state="selectable" onclick={handleSelect}>
    <div class="flex items-center gap-4">
      <img src="avatar.jpg" alt="Avatar" class="w-12 h-12 rounded-full" />
      <div>
        <h4>ユーザー名</h4>
        <p class="text-secondary">説明文</p>
      </div>
    </div>
  </Card>

  選択済みカード:
  <Card state="selected">
    <div>選択済みアイテム</div>
  </Card>

  影付きカード:
  <Card variant="elevated" padding="lg">
    <h2>重要なコンテンツ</h2>
    <p>詳細情報</p>
  </Card>

  アウトライン強調カード:
  <Card variant="outlined" padding="sm">
    <div class="text-center">
      <p>境界線が強調されたカード</p>
    </div>
  </Card>

  クリック可能カード:
  <Card 
    clickable={true} 
    onclick={handleCardClick}
    ariaLabel="詳細を表示"
  >
    <div class="flex justify-between items-center">
      <span>クリックして詳細表示</span>
      <Icon icon={ICONS.ARROW_RIGHT} size="sm" />
    </div>
  </Card>

  無効状態カード:
  <Card state="disabled">
    <div>無効なカード</div>
  </Card>

  パディングなしカード:
  <Card padding="none">
    <img src="cover.jpg" alt="Cover" class="w-full h-48 object-cover rounded-t-xl" />
    <div class="p-6">
      <h3>画像付きカード</h3>
      <p>カスタムパディング</p>
    </div>
  </Card>
-->