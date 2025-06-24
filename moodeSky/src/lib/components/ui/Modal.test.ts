/**
 * Modal.svelte テストスイート
 * 統一Modalコンポーネントの包括的テスト
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Modal from './Modal.svelte';

describe('Modal Component', () => {
  let originalOverflow: string;

  beforeEach(() => {
    // 各テスト前にモックをリセット
    vi.clearAllMocks();
    
    // body.style.overflowの初期値を保存
    originalOverflow = document.body.style.overflow;
    
    // DOMを初期化
    document.body.innerHTML = '';
    document.body.style.overflow = '';
  });

  afterEach(() => {
    // テスト後にbody.style.overflowを復元
    document.body.style.overflow = originalOverflow;
    
    // イベントリスナーをクリーンアップ
    const events = ['keydown'];
    events.forEach(event => {
      document.removeEventListener(event, () => {});
    });
  });

  // ===================================================================
  // 基本レンダリングテスト
  // ===================================================================

  it('should not render when isOpen is false', () => {
    render(Modal, { props: { isOpen: false, onClose: vi.fn() } });
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(Modal, { props: { isOpen: true, onClose: vi.fn() } });
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should render with title', () => {
    render(Modal, { props: { isOpen: true, title: 'Test Modal Title', onClose: vi.fn() } });
    
    expect(screen.getByText('Test Modal Title')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Test Modal Title');
  });

  // ===================================================================
  // サイズテスト
  // ===================================================================

  it('should apply default large size classes', () => {
    render(Modal, { props: { isOpen: true, onClose: vi.fn() } });
    
    const modalContainer = screen.getByRole('document');
    expect(modalContainer.className).toContain('max-w-4xl');
  });

  it('should apply small size classes', () => {
    render(Modal, { props: { isOpen: true, size: 'sm', onClose: vi.fn() } });
    
    const modalContainer = screen.getByRole('document');
    expect(modalContainer.className).toContain('max-w-md');
  });

  it('should apply medium size classes', () => {
    render(Modal, { props: { isOpen: true, size: 'md', onClose: vi.fn() } });
    
    const modalContainer = screen.getByRole('document');
    expect(modalContainer.className).toContain('max-w-2xl');
  });

  it('should apply extra large size classes', () => {
    render(Modal, { props: { isOpen: true, size: 'xl', onClose: vi.fn() } });
    
    const modalContainer = screen.getByRole('document');
    expect(modalContainer.className).toContain('max-w-6xl');
  });

  it('should apply full size classes', () => {
    render(Modal, { props: { isOpen: true, size: 'full', onClose: vi.fn() } });
    
    const modalContainer = screen.getByRole('document');
    expect(modalContainer.className).toContain('max-w-none');
    expect(modalContainer.className).toContain('mx-4');
  });

  // ===================================================================
  // ヘッダー・フッターテスト
  // ===================================================================

  it('should show header by default', () => {
    render(Modal, { props: { isOpen: true, title: 'Test Title', onClose: vi.fn() } });
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should hide header when showHeader is false', () => {
    render(Modal, { props: { isOpen: true, title: 'Test Title', showHeader: false, onClose: vi.fn() } });
    
    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
  });

  it('should show close button by default', () => {
    render(Modal, { props: { isOpen: true, title: 'Test Title', onClose: vi.fn() } });
    
    const closeButton = screen.getByLabelText('モーダルを閉じる');
    expect(closeButton).toBeInTheDocument();
  });

  it('should hide close button when showCloseButton is false', () => {
    render(Modal, { 
      props: { 
        isOpen: true, 
        title: 'Test Title', 
        showCloseButton: false, 
        onClose: vi.fn() 
      }
    });
    
    expect(screen.queryByLabelText('モーダルを閉じる')).not.toBeInTheDocument();
  });

  it('should not show footer by default', () => {
    const { container } = render(Modal, { props: { isOpen: true, onClose: vi.fn() } });
    
    // フッターのDOMが存在しないことを確認
    const footerElement = container.querySelector('.bg-gradient-to-r.from-muted\\/5');
    expect(footerElement).not.toBeInTheDocument();
  });

  // ===================================================================
  // 閉じる動作テスト
  // ===================================================================

  it('should call onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(Modal, { props: { isOpen: true, title: 'Test Title', onClose } });
    
    const closeButton = screen.getByLabelText('モーダルを閉じる');
    await fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when overlay is clicked', async () => {
    const onClose = vi.fn();
    render(Modal, { props: { isOpen: true, onClose } });
    
    const overlay = screen.getByRole('dialog');
    await fireEvent.click(overlay);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ===================================================================
  // キーボードナビゲーションテスト
  // ===================================================================

  it('should call onClose when Escape key is pressed', async () => {
    const onClose = vi.fn();
    render(Modal, { props: { isOpen: true, onClose } });
    
    await fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call custom onEscapeKey when provided', async () => {
    const onClose = vi.fn();
    const onEscapeKey = vi.fn();
    render(Modal, { props: { isOpen: true, onClose, onEscapeKey } });
    
    await fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(onEscapeKey).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  // ===================================================================
  // アクセシビリティテスト
  // ===================================================================

  it('should have proper ARIA attributes', () => {
    render(Modal, { props: { isOpen: true, title: 'Test Title', onClose: vi.fn() } });
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    expect(dialog).toHaveAttribute('tabindex', '-1');
    
    const document = screen.getByRole('document');
    expect(document).toHaveAttribute('tabindex', '-1');
  });

  it('should have proper ARIA attributes without title', () => {
    render(Modal, { props: { isOpen: true, onClose: vi.fn() } });
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).not.toHaveAttribute('aria-labelledby');
  });

  // ===================================================================
  // フォーカス管理テスト
  // ===================================================================

  it('should disable body scroll when open', async () => {
    render(Modal, { props: { isOpen: true, onClose: vi.fn() } });
    
    // 非同期でDOM更新を待つ
    await waitFor(() => {
      expect(document.body.style.overflow).toBe('hidden');
    });
  });

  it('should restore body scroll when closed', async () => {
    const { rerender } = render(Modal, { props: { isOpen: true, onClose: vi.fn() } });
    
    // モーダルが開いている状態でbodyスクロールが無効化されることを確認
    await waitFor(() => {
      expect(document.body.style.overflow).toBe('hidden');
    });
    
    // モーダルを閉じる
    await rerender({ isOpen: false, onClose: vi.fn() });
    
    // bodyスクロールが復元されることを確認
    await waitFor(() => {
      expect(document.body.style.overflow).toBe('');
    });
  });

  // ===================================================================
  // Z-indexテスト
  // ===================================================================

  it('should apply default z-index', () => {
    render(Modal, { props: { isOpen: true, onClose: vi.fn() } });
    
    const overlay = screen.getByRole('dialog');
    expect(overlay.className).toContain('z-50');
  });

  it('should apply custom z-index', () => {
    render(Modal, { props: { isOpen: true, zIndex: 999, onClose: vi.fn() } });
    
    const overlay = screen.getByRole('dialog');
    expect(overlay.className).toContain('z-999');
  });

  // ===================================================================
  // エラーハンドリングテスト
  // ===================================================================

  it('should handle focus restoration errors gracefully', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // フォーカス復元でエラーが発生する要素を作成
    const problematicElement = document.createElement('button');
    problematicElement.textContent = 'Problematic Button';
    document.body.appendChild(problematicElement);
    problematicElement.focus();
    
    // フォーカス復元時にエラーを発生させる
    const originalFocus = problematicElement.focus;
    problematicElement.focus = vi.fn(() => {
      throw new Error('Focus error');
    });
    
    const onClose = vi.fn();
    render(Modal, { props: { isOpen: true, onClose } });
    
    // モーダルを閉じる
    const closeButton = screen.getByLabelText('モーダルを閉じる');
    await fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(consoleWarn).toHaveBeenCalledWith('Focus restoration failed:', expect.any(Error));
    
    // クリーンアップ
    problematicElement.focus = originalFocus;
    document.body.removeChild(problematicElement);
    consoleWarn.mockRestore();
  });

  // ===================================================================
  // レスポンシブ動作テスト
  // ===================================================================

  it('should apply responsive classes', () => {
    render(Modal, { props: { isOpen: true, onClose: vi.fn() } });
    
    const overlay = screen.getByRole('dialog');
    expect(overlay.className).toContain('p-4');
    expect(overlay.className).toContain('flex');
    expect(overlay.className).toContain('items-center');
    expect(overlay.className).toContain('justify-center');
    
    const container = screen.getByRole('document');
    expect(container.className).toContain('w-full');
    expect(container.className).toContain('max-h-[90vh]');
  });

  // ===================================================================
  // スタイルテスト
  // ===================================================================

  it('should apply theme-based styling', () => {
    render(Modal, { props: { isOpen: true, title: 'Styled Modal', onClose: vi.fn() } });
    
    const container = screen.getByRole('document');
    expect(container.className).toContain('bg-card');
    expect(container.className).toContain('rounded-2xl');
    expect(container.className).toContain('shadow-2xl');
    
    const title = screen.getByText('Styled Modal');
    expect(title.className).toContain('text-themed');
    expect(title.className).toContain('text-3xl');
    expect(title.className).toContain('font-bold');
  });
});