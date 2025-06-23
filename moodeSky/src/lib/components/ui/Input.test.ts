/**
 * Input.svelte テストスイート
 * 統一Inputコンポーネントの包括的テスト
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import Input from './Input.svelte';
import { ICONS } from '$lib/types/icon.js';

describe('Input Component', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    vi.clearAllMocks();
  });

  // ===================================================================
  // 基本レンダリングテスト
  // ===================================================================

  it('should render basic input with default props', () => {
    render(Input, { props: { value: 'test value' } });
    
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('test value');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('should render with label', () => {
    render(Input, { props: { label: 'Test Label', value: '' } });
    
    const label = screen.getByText('Test Label');
    const input = screen.getByRole('textbox');
    
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('for', input.id);
  });

  it('should render with placeholder', () => {
    render(Input, { props: { placeholder: 'Enter text here', value: '' } });
    
    const input = screen.getByPlaceholderText('Enter text here');
    expect(input).toBeInTheDocument();
  });

  // ===================================================================
  // Input タイプテスト
  // ===================================================================

  it('should render email input type', () => {
    render(Input, { props: { type: 'email', value: '' } });
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('should render password input type', () => {
    render(Input, { props: { type: 'password', value: '' } });
    
    const input = screen.getByLabelText('', { selector: 'input[type="password"]' });
    expect(input).toBeInTheDocument();
  });

  it('should render number input type', () => {
    render(Input, { props: { type: 'number', value: '' } });
    
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('type', 'number');
  });

  it('should render textarea', () => {
    render(Input, { props: { type: 'textarea', value: '' } });
    
    const textarea = screen.getByRole('textbox');
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('should render textarea with custom rows', () => {
    render(Input, { props: { type: 'textarea', rows: 8, value: '' } });
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows', '8');
  });

  // ===================================================================
  // 状態テスト
  // ===================================================================

  it('should render normal state by default', () => {
    render(Input, { props: { value: '' } });
    
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('border-input');
    expect(input.className).toContain('focus:border-primary');
  });

  it('should render error state', () => {
    render(Input, { 
      props: { 
        inputState: 'error', 
        errorMessage: 'This field is required', 
        value: '' 
      } 
    });
    
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('border-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    
    const errorMessage = screen.getByText('This field is required');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage.className).toContain('text-error');
  });

  it('should render success state', () => {
    render(Input, { 
      props: { 
        inputState: 'success', 
        helpText: 'Looks good!', 
        value: '' 
      } 
    });
    
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('border-success');
    
    const helpText = screen.getByText('Looks good!');
    expect(helpText).toBeInTheDocument();
    expect(helpText.className).toContain('text-success');
  });

  it('should render disabled state', () => {
    render(Input, { props: { disabled: true, value: '' } });
    
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input.className).toContain('bg-muted/20');
    expect(input.className).toContain('text-inactive');
  });

  it('should render readonly state', () => {
    render(Input, { props: { readonly: true, value: 'readonly value' } });
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('readonly');
    expect(input).toHaveValue('readonly value');
  });

  // ===================================================================
  // 必須フィールドテスト
  // ===================================================================

  it('should render required field with asterisk', () => {
    render(Input, { props: { label: 'Required Field', required: true, value: '' } });
    
    const label = screen.getByText('Required Field');
    expect(label.className).toContain("after:content-['*']");
    expect(label.className).toContain('after:text-error');
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('required');
  });

  // ===================================================================
  // アイコンテスト
  // ===================================================================

  it('should render left icon', () => {
    render(Input, { props: { leftIcon: ICONS.SEARCH, value: '' } });
    
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('pl-12');
    
    // アイコンの存在確認
    const iconContainer = input.parentElement?.querySelector('.absolute.left-4');
    expect(iconContainer).toBeInTheDocument();
  });

  it('should render right icon', () => {
    render(Input, { props: { rightIcon: ICONS.CLOSE, value: '' } });
    
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('pr-12');
    
    // アイコンの存在確認
    const iconContainer = input.parentElement?.querySelector('.absolute.right-4');
    expect(iconContainer).toBeInTheDocument();
  });

  it('should adjust padding for icons', () => {
    render(Input, { 
      props: { 
        leftIcon: ICONS.SEARCH, 
        rightIcon: ICONS.CLOSE, 
        value: '' 
      } 
    });
    
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('pl-12');
    expect(input.className).toContain('pr-12');
  });

  // ===================================================================
  // パスワード表示切り替えテスト
  // ===================================================================

  it('should render password visibility toggle', () => {
    render(Input, { props: { type: 'password', value: 'secret' } });
    
    const toggleButton = screen.getByLabelText('パスワードの表示/非表示を切り替え');
    expect(toggleButton).toBeInTheDocument();
  });

  it('should toggle password visibility', async () => {
    render(Input, { props: { type: 'password', value: 'secret' } });
    
    const input = screen.getByLabelText('', { selector: 'input' });
    const toggleButton = screen.getByLabelText('パスワードの表示/非表示を切り替え');
    
    expect(input).toHaveAttribute('type', 'password');
    
    await fireEvent.click(toggleButton);
    expect(input).toHaveAttribute('type', 'text');
    
    await fireEvent.click(toggleButton);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('should not show password toggle when right icon is present', () => {
    render(Input, { 
      props: { 
        type: 'password', 
        rightIcon: ICONS.CLOSE, 
        value: 'secret' 
      } 
    });
    
    const toggleButton = screen.queryByLabelText('パスワードの表示/非表示を切り替え');
    expect(toggleButton).not.toBeInTheDocument();
  });

  // ===================================================================
  // ヘルプテキスト・エラーメッセージテスト
  // ===================================================================

  it('should render help text', () => {
    render(Input, { props: { helpText: 'This is helpful information', value: '' } });
    
    const helpText = screen.getByText('This is helpful information');
    expect(helpText).toBeInTheDocument();
    expect(helpText.className).toContain('text-secondary');
  });

  it('should prioritize error message over help text', () => {
    render(Input, { 
      props: { 
        inputState: 'error',
        helpText: 'This is help',
        errorMessage: 'This is an error',
        value: '' 
      } 
    });
    
    expect(screen.getByText('This is an error')).toBeInTheDocument();
    expect(screen.queryByText('This is help')).not.toBeInTheDocument();
  });

  // ===================================================================
  // 文字数カウンターテスト
  // ===================================================================

  it('should show character counter with maxLength', () => {
    render(Input, { props: { maxLength: 100, value: 'Hello World' } });
    
    const counter = screen.getByText('11 / 100');
    expect(counter).toBeInTheDocument();
    expect(counter.className).toContain('text-xs');
    expect(counter.className).toContain('text-secondary');
  });

  it('should not show character counter without value', () => {
    render(Input, { props: { maxLength: 100, value: '' } });
    
    const counter = screen.queryByText('0 / 100');
    expect(counter).not.toBeInTheDocument();
  });

  it('should apply maxlength attribute', () => {
    render(Input, { props: { maxLength: 50, value: '' } });
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('maxlength', '50');
  });

  // ===================================================================
  // フォーカス・イベントテスト
  // ===================================================================

  it('should handle focus and blur events', async () => {
    render(Input, { props: { value: '' } });
    
    const input = screen.getByRole('textbox');
    
    await fireEvent.focus(input);
    expect(input).toHaveFocus();
    
    await fireEvent.blur(input);
    expect(input).not.toHaveFocus();
  });

  it('should handle input events', async () => {
    const user = userEvent.setup();
    render(Input, { props: { value: '' } });
    
    const input = screen.getByRole('textbox') as HTMLInputElement;
    
    await user.type(input, 'Hello World');
    expect(input.value).toBe('Hello World');
  });

  it('should support autofocus', () => {
    render(Input, { props: { autofocus: true, value: '' } });
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('autofocus');
  });

  // ===================================================================
  // アクセシビリティテスト
  // ===================================================================

  it('should have proper ARIA attributes', () => {
    render(Input, { 
      props: { 
        label: 'Accessible Input',
        helpText: 'This is help text',
        value: '' 
      } 
    });
    
    const input = screen.getByRole('textbox');
    const label = screen.getByText('Accessible Input');
    const helpText = screen.getByText('This is help text');
    
    expect(label).toHaveAttribute('for', input.id);
    expect(input).toHaveAttribute('aria-describedby', `${input.id}-help`);
    expect(helpText.parentElement).toHaveAttribute('id', `${input.id}-help`);
  });

  it('should have aria-invalid for error state', () => {
    render(Input, { 
      props: { 
        inputState: 'error', 
        errorMessage: 'Error', 
        value: '' 
      } 
    });
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('should not have aria-invalid for normal state', () => {
    render(Input, { props: { value: '' } });
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  // ===================================================================
  // レスポンシブ・スタイルテスト
  // ===================================================================

  it('should apply theme-based styling', () => {
    render(Input, { props: { value: '' } });
    
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('bg-card');
    expect(input.className).toContain('text-themed');
    expect(input.className).toContain('border-2');
    expect(input.className).toContain('rounded-lg');
  });

  it('should apply full width', () => {
    render(Input, { props: { value: '' } });
    
    const container = screen.getByRole('textbox').closest('div');
    expect(container?.className).toContain('w-full');
    
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('w-full');
  });

  // ===================================================================
  // カスタムクラステスト
  // ===================================================================

  it('should apply additional CSS classes', () => {
    render(Input, { props: { class: 'custom-input-class', value: '' } });
    
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('custom-input-class');
  });

  it('should maintain base classes with additional classes', () => {
    render(Input, { props: { class: 'custom-class', value: '' } });
    
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('custom-class');
    expect(input.className).toContain('w-full');
    expect(input.className).toContain('rounded-lg');
    expect(input.className).toContain('border-2');
  });

  // ===================================================================
  // エラーハンドリングテスト
  // ===================================================================

  it('should handle missing props gracefully', () => {
    // value なしでレンダリング（デフォルト値のテスト）
    render(Input, { props: {} });
    
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('should handle undefined values', () => {
    render(Input, { 
      props: { 
        label: undefined, 
        placeholder: undefined, 
        value: '' 
      } 
    });
    
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', '');
  });

  // ===================================================================
  // 複合機能テスト
  // ===================================================================

  it('should work with all features combined', () => {
    render(Input, { 
      props: { 
        label: 'Complete Input',
        type: 'email',
        placeholder: 'Enter your email',
        helpText: 'We will never share your email',
        leftIcon: ICONS.EMAIL,
        required: true,
        maxLength: 50,
        value: 'test@example.com'
      } 
    });
    
    // すべての要素が存在することを確認
    expect(screen.getByText('Complete Input')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('test@example.com');
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    expect(screen.getByText('We will never share your email')).toBeInTheDocument();
    expect(screen.getByText('17 / 50')).toBeInTheDocument();
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('required');
    expect(input).toHaveAttribute('maxlength', '50');
    expect(input.className).toContain('pl-12'); // left icon padding
  });

  it('should handle error state with all features', () => {
    render(Input, { 
      props: { 
        label: 'Error Input',
        inputState: 'error',
        errorMessage: 'Invalid email format',
        leftIcon: ICONS.EMAIL,
        required: true,
        value: 'invalid-email'
      } 
    });
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.className).toContain('border-error');
    
    const errorMessage = screen.getByText('Invalid email format');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage.className).toContain('text-error');
  });
});