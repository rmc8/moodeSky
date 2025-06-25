/**
 * AvatarGroup.svelte テストスイート
 * 複数アカウントアバター表示コンポーネントの包括的テスト
 */

import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AvatarGroup from './AvatarGroup.svelte';
import type { Account } from '$lib/types/auth.js';

// Iconifyのモック
vi.mock('$lib/components/Icon.svelte', () => {
  return {
    default: {
      render: () => '<div role="img" aria-hidden="true"></div>'
    }
  };
});

// Avatarコンポーネントのモック
vi.mock('$lib/components/Avatar.svelte', () => {
  return {
    default: {
      render: (props: any) => 
        `<img src="${props.src || ''}" alt="${props.displayName || props.handle || 'avatar'}" role="img" />`
    }
  };
});

// ===================================================================
// テストデータ
// ===================================================================

const createMockAccount = (id: string, override: Partial<Account> = {}): Account => ({
  id,
  service: 'https://bsky.social',
  session: {} as any,
  profile: {
    did: `did:plc:${id}`,
    handle: `user${id}.bsky.social`,
    displayName: `User ${id}`,
    avatar: `https://example.com/avatar${id}.jpg`,
    ...override.profile
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  lastAccessAt: '2024-01-01T00:00:00.000Z',
  ...override
});

const mockAccounts = {
  single: [createMockAccount('1')],
  dual: [
    createMockAccount('1'),
    createMockAccount('2')
  ],
  triple: [
    createMockAccount('1'),
    createMockAccount('2'), 
    createMockAccount('3')
  ],
  quad: [
    createMockAccount('1'),
    createMockAccount('2'),
    createMockAccount('3'),
    createMockAccount('4')
  ],
  multiple: [
    createMockAccount('1'),
    createMockAccount('2'),
    createMockAccount('3'),
    createMockAccount('4'),
    createMockAccount('5'),
    createMockAccount('6')
  ]
};

describe('AvatarGroup Component', () => {
  beforeEach(() => {
    // 各テスト前にコンソールエラーをクリア
    vi.clearAllMocks();
  });

  // ===================================================================
  // 基本レンダリングテスト
  // ===================================================================

  it('should render with default props', () => {
    render(AvatarGroup, { props: { accounts: [] } });
    
    const container = screen.getByRole('generic');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('flex-shrink-0', 'relative');
  });

  it('should apply default size classes', () => {
    render(AvatarGroup, { props: { accounts: [] } });
    
    const container = screen.getByRole('generic');
    expect(container).toHaveClass('w-10', 'h-10');
  });

  // ===================================================================
  // サイズテスト
  // ===================================================================

  it('should apply small size classes', () => {
    render(AvatarGroup, { props: { accounts: [], size: 'sm' } });
    
    const container = screen.getByRole('generic');
    expect(container).toHaveClass('w-8', 'h-8');
  });

  it('should apply large size classes', () => {
    render(AvatarGroup, { props: { accounts: [], size: 'lg' } });
    
    const container = screen.getByRole('generic');
    expect(container).toHaveClass('w-12', 'h-12');
  });

  // ===================================================================
  // 空状態テスト
  // ===================================================================

  it('should render fallback when no accounts provided', () => {
    render(AvatarGroup, { props: { accounts: [] } });
    
    // フォールバックのPersonアイコンが表示される
    const fallback = screen.getByRole('generic').querySelector('.bg-muted\\/20');
    expect(fallback).toBeInTheDocument();
  });

  // ===================================================================
  // 単一アカウントテスト
  // ===================================================================

  it('should render single avatar for one account', () => {
    render(AvatarGroup, { props: { accounts: mockAccounts.single } });
    
    const avatar = screen.getByRole('img');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('alt', 'User 1');
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar1.jpg');
  });

  it('should handle single account without avatar', () => {
    const accountWithoutAvatar = createMockAccount('1', {
      profile: { 
        ...mockAccounts.single[0].profile,
        avatar: undefined 
      }
    });
    
    render(AvatarGroup, { props: { accounts: [accountWithoutAvatar] } });
    
    // フォールバック文字が表示される
    const fallbackText = screen.getByText('U');
    expect(fallbackText).toBeInTheDocument();
  });

  // ===================================================================
  // 複数アカウントテスト（レイアウト）
  // ===================================================================

  it('should render dual layout for two accounts', () => {
    render(AvatarGroup, { props: { accounts: mockAccounts.dual } });
    
    const container = screen.getByRole('generic');
    const dualContainer = container.querySelector('.flex');
    expect(dualContainer).toBeInTheDocument();
    
    const avatars = screen.getAllByRole('img');
    expect(avatars).toHaveLength(2);
  });

  it('should render triple layout for three accounts', () => {
    render(AvatarGroup, { props: { accounts: mockAccounts.triple } });
    
    const container = screen.getByRole('generic');
    const tripleContainer = container.querySelector('.flex-col');
    expect(tripleContainer).toBeInTheDocument();
    
    const avatars = screen.getAllByRole('img');
    expect(avatars).toHaveLength(3);
  });

  it('should render grid layout for four accounts', () => {
    render(AvatarGroup, { props: { accounts: mockAccounts.quad } });
    
    const container = screen.getByRole('generic');
    const gridContainer = container.querySelector('.grid-cols-2');
    expect(gridContainer).toBeInTheDocument();
    
    const avatars = screen.getAllByRole('img');
    expect(avatars).toHaveLength(4);
  });

  // ===================================================================
  // maxDisplay制限テスト
  // ===================================================================

  it('should respect maxDisplay limit', () => {
    render(AvatarGroup, { 
      props: { 
        accounts: mockAccounts.multiple, 
        maxDisplay: 3 
      } 
    });
    
    const avatars = screen.getAllByRole('img');
    expect(avatars).toHaveLength(3);
  });

  it('should show overflow indicator when accounts exceed maxDisplay', () => {
    render(AvatarGroup, { 
      props: { 
        accounts: mockAccounts.multiple, 
        maxDisplay: 4 
      } 
    });
    
    // 超過インジケーター（+マーク）が表示される
    const indicator = screen.getByText('+');
    expect(indicator).toBeInTheDocument();
  });

  it('should not show overflow indicator when accounts equal maxDisplay', () => {
    render(AvatarGroup, { 
      props: { 
        accounts: mockAccounts.quad, 
        maxDisplay: 4 
      } 
    });
    
    // 超過インジケーターは表示されない
    const indicator = screen.queryByText('+');
    expect(indicator).not.toBeInTheDocument();
  });

  // ===================================================================
  // カスタムクラステスト
  // ===================================================================

  it('should apply custom CSS classes', () => {
    render(AvatarGroup, { 
      props: { 
        accounts: [], 
        class: 'custom-class another-class' 
      } 
    });
    
    const container = screen.getByRole('generic');
    expect(container).toHaveClass('custom-class', 'another-class');
  });

  it('should maintain base classes with custom classes', () => {
    render(AvatarGroup, { 
      props: { 
        accounts: [], 
        class: 'custom-class' 
      } 
    });
    
    const container = screen.getByRole('generic');
    expect(container).toHaveClass('custom-class', 'flex-shrink-0', 'relative');
  });

  // ===================================================================
  // エラーハンドリングテスト
  // ===================================================================

  it('should handle malformed account data gracefully', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // 不正なアカウントデータ
    const malformedAccounts = [
      null,
      undefined,
      { id: 'invalid' }
    ] as any;
    
    render(AvatarGroup, { props: { accounts: malformedAccounts } });
    
    // エラーが発生してもフォールバックが表示される
    const container = screen.getByRole('generic');
    expect(container).toBeInTheDocument();
    
    consoleError.mockRestore();
  });

  it('should handle empty string values gracefully', () => {
    const accountWithEmptyValues = createMockAccount('1', {
      profile: {
        did: 'did:plc:1',
        handle: '',
        displayName: '',
        avatar: ''
      }
    });
    
    render(AvatarGroup, { props: { accounts: [accountWithEmptyValues] } });
    
    // フォールバック文字「?」が表示される
    const fallbackText = screen.getByText('?');
    expect(fallbackText).toBeInTheDocument();
  });

  // ===================================================================
  // アクセシビリティテスト
  // ===================================================================

  it('should have proper image alt attributes', () => {
    render(AvatarGroup, { props: { accounts: mockAccounts.dual } });
    
    const avatars = screen.getAllByRole('img');
    expect(avatars[0]).toHaveAttribute('alt', 'User 1');
    expect(avatars[1]).toHaveAttribute('alt', 'User 2');
  });

  it('should use handle as fallback for alt text', () => {
    const accountWithoutDisplayName = createMockAccount('1', {
      profile: {
        ...mockAccounts.single[0].profile,
        displayName: undefined
      }
    });
    
    render(AvatarGroup, { props: { accounts: [accountWithoutDisplayName] } });
    
    const avatar = screen.getByRole('img');
    expect(avatar).toHaveAttribute('alt', 'user1.bsky.social');
  });

  // ===================================================================
  // 境界値テスト
  // ===================================================================

  it('should handle zero maxDisplay gracefully', () => {
    render(AvatarGroup, { 
      props: { 
        accounts: mockAccounts.multiple, 
        maxDisplay: 0 
      } 
    });
    
    // フォールバック表示
    const fallback = screen.getByRole('generic').querySelector('.bg-muted\\/20');
    expect(fallback).toBeInTheDocument();
  });

  it('should handle negative maxDisplay gracefully', () => {
    render(AvatarGroup, { 
      props: { 
        accounts: mockAccounts.multiple, 
        maxDisplay: -1 
      } 
    });
    
    // フォールバック表示
    const fallback = screen.getByRole('generic').querySelector('.bg-muted\\/20');
    expect(fallback).toBeInTheDocument();
  });

  it('should handle very large maxDisplay values', () => {
    render(AvatarGroup, { 
      props: { 
        accounts: mockAccounts.dual, 
        maxDisplay: 1000 
      } 
    });
    
    // 実際のアカウント数のみ表示
    const avatars = screen.getAllByRole('img');
    expect(avatars).toHaveLength(2);
  });

  // ===================================================================
  // パフォーマンステスト
  // ===================================================================

  it('should not render more than maxDisplay avatars', () => {
    const manyAccounts = Array.from({ length: 100 }, (_, i) => 
      createMockAccount(String(i + 1))
    );
    
    render(AvatarGroup, { 
      props: { 
        accounts: manyAccounts, 
        maxDisplay: 4 
      } 
    });
    
    // 最大4つまでしか表示されない
    const avatars = screen.getAllByRole('img');
    expect(avatars).toHaveLength(4);
  });
});