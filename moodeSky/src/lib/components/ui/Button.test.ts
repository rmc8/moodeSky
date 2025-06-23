/**
 * Button.svelte テストスイート
 * 統一Buttonコンポーネントの包括的テスト
 */

import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Button from './Button.svelte';
import { ICONS } from '$lib/types/icon.js';

describe('Button Component', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    vi.clearAllMocks();
  });

  // ===================================================================
  // 基本レンダリングテスト
  // ===================================================================

  it('should render with default props', () => {
    render(Button);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
    expect(button).not.toBeDisabled();
  });

  // ===================================================================
  // Variantテスト
  // ===================================================================

  it('should apply primary variant classes by default', () => {
    render(Button);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('button-primary');
  });

  it('should apply secondary variant classes', () => {
    render(Button, { props: { variant: 'secondary' } });
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-muted/10');
    expect(button.className).toContain('border');
    expect(button.className).toContain('hover:bg-primary/15');
  });

  it('should apply outline variant classes', () => {
    render(Button, { props: { variant: 'outline' } });
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-transparent');
    expect(button.className).toContain('border-2');
    expect(button.className).toContain('border-primary');
  });

  it('should apply ghost variant classes', () => {
    render(Button, { props: { variant: 'ghost' } });
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-transparent');
    expect(button.className).toContain('hover:bg-primary/10');
  });

  // ===================================================================
  // サイズテスト
  // ===================================================================

  it('should apply medium size classes by default', () => {
    render(Button);
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('px-6');
    expect(button.className).toContain('py-3');
  });

  it('should apply small size classes', () => {
    render(Button, { props: { size: 'sm' } });
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('px-4');
    expect(button.className).toContain('py-2');
    expect(button.className).toContain('text-sm');
  });

  it('should apply large size classes', () => {
    render(Button, { props: { size: 'lg' } });
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('px-8');
    expect(button.className).toContain('py-3');
    expect(button.className).toContain('text-lg');
  });

  // ===================================================================
  // 状態テスト
  // ===================================================================

  it('should be disabled when disabled prop is true', () => {
    render(Button, { props: { disabled: true } });
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button.className).toContain('opacity-50');
    expect(button.className).toContain('cursor-not-allowed');
  });

  it('should show loading state', () => {
    render(Button, { props: { loading: true } });
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('aria-live', 'polite');
    expect(button.className).toContain('opacity-50');
  });

  // ===================================================================
  // アイコンテスト
  // ===================================================================

  it('should render left icon', () => {
    render(Button, { props: { leftIcon: ICONS.ARROW_LEFT } });
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('gap-2');
  });

  it('should render right icon', () => {
    render(Button, { props: { rightIcon: ICONS.ARROW_RIGHT } });
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('gap-2');
  });

  // ===================================================================
  // イベントハンドリングテスト
  // ===================================================================

  it('should call onclick when clicked', async () => {
    const handleClick = vi.fn();
    render(Button, { props: { onclick: handleClick } });
    
    const button = screen.getByRole('button');
    await fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onclick when disabled', async () => {
    const handleClick = vi.fn();
    render(Button, { props: { onclick: handleClick, disabled: true } });
    
    const button = screen.getByRole('button');
    await fireEvent.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should not call onclick when loading', async () => {
    const handleClick = vi.fn();
    render(Button, { props: { onclick: handleClick, loading: true } });
    
    const button = screen.getByRole('button');
    await fireEvent.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should handle onclick errors gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const errorHandler = vi.fn(() => {
      throw new Error('Test error');
    });
    
    render(Button, { props: { onclick: errorHandler } });
    
    const button = screen.getByRole('button');
    await fireEvent.click(button);
    
    // エラーが発生してもアプリケーションは正常に動作する
    expect(errorHandler).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith('Button click error:', expect.any(Error));
    
    consoleError.mockRestore();
  });

  // ===================================================================
  // キーボードナビゲーションテスト
  // ===================================================================

  it('should handle Enter key press', async () => {
    const handleClick = vi.fn();
    render(Button, { props: { onclick: handleClick } });
    
    const button = screen.getByRole('button');
    button.focus();
    await fireEvent.keyDown(button, { key: 'Enter' });
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should handle Space key press', async () => {
    const handleClick = vi.fn();
    render(Button, { props: { onclick: handleClick } });
    
    const button = screen.getByRole('button');
    button.focus();
    await fireEvent.keyDown(button, { key: ' ' });
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not handle keyboard when disabled', async () => {
    const handleClick = vi.fn();
    render(Button, { props: { onclick: handleClick, disabled: true } });
    
    const button = screen.getByRole('button');
    await fireEvent.keyDown(button, { key: 'Enter' });
    await fireEvent.keyDown(button, { key: ' ' });
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  // ===================================================================
  // アクセシビリティテスト
  // ===================================================================

  it('should have proper aria attributes', () => {
    render(Button, { props: { ariaLabel: 'Test Aria Label' } });
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Test Aria Label');
    expect(button).toHaveAttribute('role', 'button');
    expect(button).toHaveAttribute('tabindex', '0');
  });

  it('should have proper aria attributes when disabled', () => {
    render(Button, { props: { disabled: true } });
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('tabindex', '-1');
  });

  it('should have proper aria attributes when loading', () => {
    render(Button, { props: { loading: true } });
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('aria-live', 'polite');
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  // ===================================================================
  // 追加クラステスト
  // ===================================================================

  it('should apply additional CSS classes', () => {
    render(Button, { props: { class: 'custom-class another-class' } });
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('custom-class');
    expect(button.className).toContain('another-class');
  });

  it('should maintain base classes with additional classes', () => {
    render(Button, { props: { class: 'custom-class' } });
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('custom-class');
    expect(button.className).toContain('inline-flex');
    expect(button.className).toContain('items-center');
    expect(button.className).toContain('justify-center');
  });

  // ===================================================================
  // フォーカス・ホバーテスト
  // ===================================================================

  it('should be focusable by default', () => {
    render(Button);
    
    const button = screen.getByRole('button');
    button.focus();
    expect(button).toHaveFocus();
  });

  it('should not be focusable when disabled', () => {
    render(Button, { props: { disabled: true } });
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('tabindex', '-1');
  });

  // ===================================================================
  // type属性テスト
  // ===================================================================

  it('should support submit type', () => {
    render(Button, { props: { type: 'submit' } });
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('should support reset type', () => {
    render(Button, { props: { type: 'reset' } });
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'reset');
  });
});