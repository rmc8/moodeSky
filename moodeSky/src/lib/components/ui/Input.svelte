<!--
  統一Input.svelte
  TailwindCSS v4統合テーマシステム + Svelte 5 runes対応
  
  5タイプ × 4状態 × 機能統合 + アクセシビリティ完全対応
-->
<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { ICONS } from '$lib/types/icon.js';
  import type { InputProps } from './types.js';

  // ===================================================================
  // Props（Svelte 5 runes）
  // ===================================================================

  let {
    type = 'text',
    inputState = 'normal',
    label,
    placeholder,
    helpText,
    errorMessage,
    leftIcon,
    rightIcon,
    value = $bindable(''),
    disabled = false,
    required = false,
    readonly = false,
    maxLength,
    rows = 4,
    autofocus = false,
    class: additionalClass = ''
  }: InputProps = $props();

  // ===================================================================
  // 内部状態管理
  // ===================================================================

  let inputElement: HTMLInputElement | HTMLTextAreaElement;
  let isFocused = $state(false);
  let uniqueId = $state(`input-${Math.random().toString(36).substr(2, 9)}`);

  // ===================================================================
  // 動的スタイル生成（$derived）
  // ===================================================================

  /**
   * 状態別境界線色クラス
   */
  const borderColorClasses = $derived(() => {
    if (disabled) {
      return 'border-themed/30';
    }
    
    switch (inputState) {
      case 'error':
        return 'border-error focus:border-error';
      case 'success':
        return 'border-success focus:border-success';
      case 'disabled':
        return 'border-themed/30';
      default:
        return 'border-input focus:border-primary';
    }
  });

  /**
   * 状態別背景色クラス
   */
  const backgroundClasses = $derived(() => {
    if (disabled || inputState === 'disabled') {
      return 'bg-muted/20';
    }
    return 'bg-card';
  });

  /**
   * 状態別テキスト色クラス
   */
  const textColorClasses = $derived(() => {
    if (disabled || inputState === 'disabled') {
      return 'text-inactive';
    }
    return 'text-themed';
  });

  /**
   * フォーカス時のボックスシャドウ
   */
  const focusClasses = $derived(() => {
    if (disabled || inputState === 'disabled') {
      return '';
    }
    
    switch (inputState) {
      case 'error':
        return 'focus:shadow-[0_0_0_3px_rgba(var(--error)_/_0.1)]';
      case 'success':
        return 'focus:shadow-[0_0_0_3px_rgba(var(--success)_/_0.1)]';
      default:
        return 'focus:shadow-[0_0_0_3px_rgba(var(--primary)_/_0.1)]';
    }
  });

  /**
   * 基本クラス
   */
  const baseClasses = 'w-full rounded-lg border-2 transition-all duration-200 focus:outline-none';

  /**
   * パディングクラス（アイコンの有無で調整）
   */
  const paddingClasses = $derived(() => {
    const baseVertical = 'py-3';
    const leftPadding = leftIcon ? 'pl-12' : 'pl-4';
    const rightPadding = rightIcon ? 'pr-12' : 'pr-4';
    
    return `${baseVertical} ${leftPadding} ${rightPadding}`;
  });

  /**
   * 最終的なクラス文字列
   */
  const finalClasses = $derived(() => 
    `${baseClasses} ${borderColorClasses()} ${backgroundClasses()} ${textColorClasses()} ${paddingClasses()} ${focusClasses()} ${additionalClass}`.trim()
  );

  /**
   * ラベルのクラス
   */
  const labelClasses = $derived(() => {
    const baseLabel = 'block text-sm font-medium mb-2';
    const colorClass = inputState === 'error' ? 'text-error' : 'text-label';
    const requiredClass = required ? "after:content-['*'] after:text-error after:ml-1" : '';
    
    return `${baseLabel} ${colorClass} ${requiredClass}`;
  });

  /**
   * ヘルプテキストのクラス
   */
  const helpTextClasses = $derived(() => {
    switch (inputState) {
      case 'error':
        return 'text-error';
      case 'success':
        return 'text-success';
      default:
        return 'text-secondary';
    }
  });

  // ===================================================================
  // イベントハンドラー
  // ===================================================================

  const handleFocus = () => {
    isFocused = true;
  };

  const handleBlur = () => {
    isFocused = false;
  };

  const handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    value = target.value;
  };

  // ===================================================================
  // アクセシビリティ属性
  // ===================================================================

  const inputAttributes = $derived(() => {
    const attrs: Record<string, string | boolean | number> = {
      id: uniqueId,
      placeholder: placeholder || '',
      disabled: disabled || inputState === 'disabled',
      readonly,
      required,
      'aria-invalid': inputState === 'error'
    };

    if (helpText || errorMessage) {
      attrs['aria-describedby'] = `${uniqueId}-help`;
    }

    if (maxLength) {
      attrs.maxlength = maxLength;
    }

    if (autofocus) {
      attrs.autofocus = true;
    }

    return attrs;
  });
</script>

<!-- 入力フィールドコンテナ -->
<div class="w-full">
  <!-- ラベル -->
  {#if label}
    <label for={uniqueId} class={labelClasses()}>
      {label}
    </label>
  {/if}

  <!-- 入力フィールドコンテナ（アイコン対応） -->
  <div class="relative">
    <!-- 左アイコン -->
    {#if leftIcon}
      <div class="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <Icon 
          icon={leftIcon} 
          size="md" 
          color={disabled || inputState === 'disabled' ? 'inactive' : 'secondary'}
        />
      </div>
    {/if}

    <!-- 入力フィールド -->
    {#if type === 'textarea'}
      <textarea
        bind:this={inputElement}
        bind:value
        class={finalClasses()}
        {rows}
        onfocus={handleFocus}
        onblur={handleBlur}
        oninput={handleInput}
        {...inputAttributes()}
      ></textarea>
    {:else}
      <input
        bind:this={inputElement}
        bind:value
        type={type}
        class={finalClasses()}
        onfocus={handleFocus}
        onblur={handleBlur}
        oninput={handleInput}
        {...inputAttributes()}
      />
    {/if}

    <!-- 右アイコン -->
    {#if rightIcon}
      <div class="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <Icon 
          icon={rightIcon} 
          size="md" 
          color={disabled || inputState === 'disabled' ? 'inactive' : 'secondary'}
        />
      </div>
    {/if}

    <!-- パスワード表示切り替えボタン（password type用） -->
    {#if type === 'password' && !rightIcon}
      <button
        type="button"
        class="absolute right-4 top-1/2 transform -translate-y-1/2 text-secondary hover:text-primary transition-colors duration-200"
        onclick={() => {
          const input = inputElement as HTMLInputElement;
          input.type = input.type === 'password' ? 'text' : 'password';
        }}
        aria-label="パスワードの表示/非表示を切り替え"
      >
        <Icon icon={ICONS.VISIBILITY} size="md" />
      </button>
    {/if}
  </div>

  <!-- ヘルプテキスト・エラーメッセージ -->
  {#if helpText || errorMessage}
    <div
      id="{uniqueId}-help"
      class="mt-2 text-sm {helpTextClasses()} flex items-start gap-2"
    >
      <!-- エラー・成功アイコン -->
      {#if inputState === 'error'}
        <Icon icon={ICONS.ERROR} size="sm" color="error" class="mt-0.5 flex-shrink-0" />
      {:else if inputState === 'success'}
        <Icon icon={ICONS.CHECK_CIRCLE} size="sm" color="success" class="mt-0.5 flex-shrink-0" />
      {/if}
      
      <!-- ヘルプテキスト or エラーメッセージ -->
      <span class="flex-1">
        {errorMessage || helpText}
      </span>
    </div>
  {/if}

  <!-- 文字数カウンター（maxLength指定時） -->
  {#if maxLength && value}
    <div class="mt-1 text-right text-xs text-secondary">
      {value.length} / {maxLength}
    </div>
  {/if}
</div>

<!--
  使用例:

  基本的な使用:
  <Input label="メールアドレス" type="email" bind:value={email} />

  エラー状態:
  <Input 
    label="パスワード" 
    type="password" 
    state="error" 
    errorMessage="パスワードが短すぎます"
    bind:value={password} 
  />

  成功状態:
  <Input 
    label="ユーザー名" 
    state="success" 
    helpText="使用可能です"
    bind:value={username} 
  />

  アイコン付き:
  <Input 
    label="検索" 
    type="search" 
    leftIcon={ICONS.SEARCH}
    placeholder="キーワードを入力..."
    bind:value={searchQuery} 
  />

  テキストエリア:
  <Input 
    label="コメント" 
    type="textarea" 
    rows={6}
    maxLength={500}
    bind:value={comment} 
  />

  必須フィールド:
  <Input 
    label="お名前" 
    required={true}
    helpText="必須項目です"
    bind:value={name} 
  />
-->