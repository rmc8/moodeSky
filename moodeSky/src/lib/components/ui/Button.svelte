<!--
  統一Button.svelte
  TailwindCSS v4統合テーマシステム + Svelte 5 runes対応
  
  4バリアント × 3サイズ × 状態管理 + ハイコントラスト対応
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import type { ButtonProps } from './types.js';

  // ===================================================================
  // Props（Svelte 5 runes）
  // ===================================================================

  const {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    type = 'button',
    onclick,
    ariaLabel,
    class: additionalClass = '',
    children
  }: ButtonProps & { children: Snippet } = $props();

  // ===================================================================
  // 動的スタイル生成（$derived）
  // ===================================================================

  /**
   * バリアント別基本クラス
   */
  const variantClasses = $derived(() => {
    switch (variant) {
      case 'primary':
        return 'button-primary'; // 既存app.cssクラス活用
      
      case 'secondary':
        return 'bg-muted/10 border border-solid hover:bg-primary/15 active:bg-primary/20 text-themed hover:text-primary';
      
      case 'outline':
        return 'bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-white active:bg-primary/90';
      
      case 'ghost':
        return 'bg-transparent text-themed hover:bg-primary/10 hover:text-primary active:bg-primary/20';
      
      default:
        return 'button-primary';
    }
  });

  /**
   * サイズ別クラス
   */
  const sizeClasses = $derived(() => {
    switch (size) {
      case 'sm':
        return 'px-4 py-2 text-sm';
      case 'md':
        return 'px-6 py-3';
      case 'lg':
        return 'px-8 py-3 text-lg';
      default:
        return 'px-6 py-3';
    }
  });

  /**
   * 共通クラス
   */
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-semibold tracking-wide rounded-xl transition-all duration-200 focus-ring-subtle focus-visible:outline-2 focus-visible:outline-primary/60 focus-visible:outline-offset-1';

  /**
   * 状態別クラス
   */
  const stateClasses = $derived(() => {
    if (disabled || loading) {
      return 'opacity-50 cursor-not-allowed';
    }
    return 'cursor-pointer';
  });

  /**
   * 最終的なクラス文字列
   * パフォーマンス最適化版
   */
  const finalClasses = $derived(() => {
    const classes = [
      baseClasses,
      variantClasses(),
      sizeClasses(),
      stateClasses(),
      additionalClass
    ].filter(Boolean);
    
    return classes.join(' ');
  });

  // ===================================================================
  // ハイコントラスト対応（セカンダリボタン用）
  // ===================================================================

  /**
   * セカンダリボタンのボーダー色制御
   * ハイコントラストCSS競合問題への対応
   */
  let buttonElement: HTMLButtonElement;
  
  const handleSecondaryMouseEnter = () => {
    if (variant === 'secondary' && buttonElement && !disabled && !loading) {
      buttonElement.style.borderColor = 'rgb(var(--primary) / 0.4) !important';
    }
  };

  const handleSecondaryMouseLeave = () => {
    if (variant === 'secondary' && buttonElement && !disabled && !loading) {
      buttonElement.style.borderColor = 'rgb(var(--foreground) / 0.3) !important';
    }
  };

  /**
   * セカンダリボタンのインラインスタイル
   */
  const secondaryInlineStyle = $derived(() => {
    if (variant === 'secondary') {
      return 'border-color: rgb(var(--foreground) / 0.3) !important;';
    }
    return '';
  });

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  /**
   * クリックイベント処理
   * エラーハンドリング付き
   */
  const handleClick = () => {
    if (disabled || loading) return;
    
    try {
      onclick?.();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Button click error:', error);
      }
      // プロダクション環境でのエラーレポーティング拡張余地
    }
  };

  /**
   * キーボードイベント処理（アクセシビリティ）
   */
  const handleKeyDown = (event: KeyboardEvent) => {
    if (disabled || loading) return;
    
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  // ===================================================================
  // アクセシビリティ属性
  // ===================================================================

  const ariaAttributes = $derived(() => {
    const attrs: Record<string, string | boolean | number> = {
      'aria-disabled': disabled || loading,
      'role': 'button',
      'tabindex': disabled ? -1 : 0
    };

    if (ariaLabel) {
      attrs['aria-label'] = ariaLabel;
    }

    if (loading) {
      attrs['aria-busy'] = true;
      attrs['aria-live'] = 'polite';
    }

    return attrs;
  });
</script>

<!-- 
  統一ボタンコンポーネント
  ハイコントラスト対応 + 完全アクセシビリティ準拠
-->
<button
  bind:this={buttonElement}
  {type}
  class={finalClasses()}
  style={secondaryInlineStyle()}
  onclick={handleClick}
  onkeydown={handleKeyDown}
  onmouseenter={handleSecondaryMouseEnter}
  onmouseleave={handleSecondaryMouseLeave}
  disabled={disabled || loading}
  {...ariaAttributes()}
>
  <!-- 左アイコン -->
  {#if leftIcon && !loading}
    <Icon 
      icon={leftIcon} 
      size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'}
      color={variant === 'primary' ? 'white' : 'themed'}
    />
  {/if}

  <!-- ローディングスピナー -->
  {#if loading}
    <Icon 
      icon={ICONS.REFRESH} 
      size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'}
      color={variant === 'primary' ? 'white' : 'themed'}
      class="animate-spin"
    />
  {/if}

  <!-- ボタンテキスト -->
  {@render children()}

  <!-- 右アイコン -->
  {#if rightIcon && !loading}
    <Icon 
      icon={rightIcon} 
      size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'}
      color={variant === 'primary' ? 'white' : 'themed'}
    />
  {/if}
</button>

<!--
  使用例:

  基本的な使用:
  <Button variant="primary" onclick={handleSave}>保存</Button>

  アイコン付き:
  <Button variant="secondary" leftIcon={ICONS.ARROW_LEFT} onclick={handleBack}>戻る</Button>

  ローディング状態:
  <Button variant="primary" loading={isLoading} onclick={handleSubmit}>送信</Button>

  サイズ指定:
  <Button variant="outline" size="lg" onclick={handleAction}>大きなボタン</Button>

  無効状態:
  <Button variant="primary" disabled={!isValid} onclick={handleSubmit}>無効</Button>

  アクセシビリティ:
  <Button variant="ghost" ariaLabel="メニューを開く" leftIcon={ICONS.MENU} onclick={toggleMenu} />
-->