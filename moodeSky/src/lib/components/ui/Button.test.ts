/**
 * Button.svelte テストスイート
 * 統一Buttonコンポーネントの基本テスト
 */

import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import Button from './Button.svelte';
import { ICONS } from '$lib/types/icon.js';
import type { Snippet } from 'svelte';

// 実際の型をインポートして使用
import type { ButtonProps } from './types.js';

// テスト用の型定義（子要素を含む）
interface TestButtonProps extends ButtonProps {
  children: Snippet;
}

// Snippet テスト用ヘルパー - Svelte 5互換（型安全）
const createTestSnippet = (content = 'Test Button'): Snippet => {
  const snippet = () => {
    const result = document.createTextNode(content);
    return result as any;
  };
  
  // Svelte 5のSnippet型に必要なプロパティを追加
  Object.defineProperty(snippet, '@@render', {
    value: true,
    configurable: false
  });
  
  return snippet as unknown as Snippet;
};

describe('Button Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with default props', () => {
    const props: TestButtonProps = { children: createTestSnippet() };
    render(Button, { props });
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
    expect(button).not.toBeDisabled();
  });

  it('should apply primary variant classes by default', () => {
    const props: TestButtonProps = { children: createTestSnippet() };
    render(Button, { props });
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('button-primary');
  });

  it('should apply secondary variant classes', () => {
    const props: TestButtonProps = { 
      variant: 'secondary', 
      children: createTestSnippet() 
    };
    render(Button, { props });
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-muted/10');
    expect(button.className).toContain('border');
    expect(button.className).toContain('hover:bg-primary/15');
  });

  it('should apply outline variant classes', () => {
    const props: TestButtonProps = { 
      variant: 'outline', 
      children: createTestSnippet() 
    };
    render(Button, { props });
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-transparent');
    expect(button.className).toContain('border-2');
    expect(button.className).toContain('border-primary');
  });

  it('should apply ghost variant classes', () => {
    const props: TestButtonProps = { 
      variant: 'ghost', 
      children: createTestSnippet() 
    };
    render(Button, { props });
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-transparent');
    expect(button.className).toContain('hover:bg-primary/10');
  });

  it('should apply medium size classes by default', () => {
    const props: TestButtonProps = { children: createTestSnippet() };
    render(Button, { props });
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('px-6');
    expect(button.className).toContain('py-3');
  });

  it('should apply small size classes', () => {
    const props: TestButtonProps = { 
      size: 'sm', 
      children: createTestSnippet() 
    };
    render(Button, { props });
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('px-4');
    expect(button.className).toContain('py-2');
    expect(button.className).toContain('text-sm');
  });

  it('should apply large size classes', () => {
    const props: TestButtonProps = { 
      size: 'lg', 
      children: createTestSnippet() 
    };
    render(Button, { props });
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('px-8');
    expect(button.className).toContain('py-3');
    expect(button.className).toContain('text-lg');
  });

  it('should be disabled when disabled prop is true', () => {
    const props: TestButtonProps = { 
      disabled: true, 
      children: createTestSnippet() 
    };
    render(Button, { props });
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button.className).toContain('opacity-50');
    expect(button.className).toContain('cursor-not-allowed');
  });

  it('should show loading state', () => {
    const props: TestButtonProps = { 
      loading: true, 
      children: createTestSnippet() 
    };
    render(Button, { props });
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('aria-live', 'polite');
    expect(button.className).toContain('opacity-50');
  });

  it('should render left icon', () => {
    const props: TestButtonProps = { 
      leftIcon: ICONS.ARROW_LEFT, 
      children: createTestSnippet() 
    };
    render(Button, { props });
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('gap-2');
  });

  it('should render right icon', () => {
    const props: TestButtonProps = { 
      rightIcon: ICONS.ARROW_RIGHT, 
      children: createTestSnippet() 
    };
    render(Button, { props });
    
    const button = screen.getByRole('button');
    expect(button.className).toContain('gap-2');
  });

  it('should call onclick when clicked', async () => {
    const handleClick: MockedFunction<() => void> = vi.fn();
    const props: TestButtonProps = { 
      onclick: handleClick, 
      children: createTestSnippet() 
    };
    render(Button, { props });
    
    const button = screen.getByRole('button');
    await fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onclick when disabled', async () => {
    const handleClick: MockedFunction<() => void> = vi.fn();
    const props: TestButtonProps = { 
      onclick: handleClick, 
      disabled: true, 
      children: createTestSnippet() 
    };
    render(Button, { props });
    
    const button = screen.getByRole('button');
    await fireEvent.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should not call onclick when loading', async () => {
    const handleClick: MockedFunction<() => void> = vi.fn();
    const props: TestButtonProps = { 
      onclick: handleClick, 
      loading: true, 
      children: createTestSnippet() 
    };
    render(Button, { props });
    
    const button = screen.getByRole('button');
    await fireEvent.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });
});