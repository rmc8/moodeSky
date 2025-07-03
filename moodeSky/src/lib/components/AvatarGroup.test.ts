/**
 * AvatarGroup.svelte テストスイート
 * 複数アカウントアバター表示コンポーネントの基本テスト
 */

import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import AvatarGroup from './AvatarGroup.svelte';
import type { Account } from '$lib/types/auth.js';

// Iconifyコンポーネントのモック定義
const MockIcon = vi.fn();
vi.mock('$lib/components/Icon.svelte', () => ({
  default: MockIcon
}));

// Avatarコンポーネントのモック定義
const MockAvatar = vi.fn();
vi.mock('$lib/components/Avatar.svelte', () => ({
  default: MockAvatar
}));

// 型定義：テスト用のアカウント作成関数
interface TestAccountOverride {
  profile?: Partial<Pick<Account['profile'], 'displayName' | 'avatar' | 'followersCount' | 'followingCount' | 'postsCount'>> & 
            Pick<Account['profile'], 'did' | 'handle'>;
  [key: string]: any;
}

// テストデータファクトリー関数
const createMockAccount = (id: string, override: TestAccountOverride = {}): Account => {
  const defaultProfile: Account['profile'] = {
    did: `did:plc:${id}`,
    handle: `user${id}.bsky.social`,
    displayName: `User ${id}`,
    avatar: `https://example.com/avatar${id}.jpg`
  };
  
  return {
    id,
    service: 'https://bsky.social',
    session: {} as Account['session'],
    profile: {
      ...defaultProfile,
      ...override.profile
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    lastAccessAt: '2024-01-01T00:00:00.000Z',
    ...override
  };
};

// テストデータセット型定義
interface MockAccountSets {
  readonly single: readonly Account[];
  readonly dual: readonly Account[];
  readonly multiple: readonly Account[];
}

// テストデータセット
const mockAccounts: MockAccountSets = {
  single: [createMockAccount('1')],
  dual: [
    createMockAccount('1'),
    createMockAccount('2')
  ],
  multiple: [
    createMockAccount('1'),
    createMockAccount('2'),
    createMockAccount('3'),
    createMockAccount('4'),
    createMockAccount('5')
  ]
};

// テスト用の型定義
type AvatarGroupProps = {
  accounts: Account[];
  size?: 'sm' | 'md' | 'lg';
  maxDisplay?: number;
  class?: string;
};

describe('AvatarGroup Component', () => {
  // Mock関数の型定義
  let mockIcon: MockedFunction<any>;
  let mockAvatar: MockedFunction<any>;

  beforeEach(() => {
    // モック関数をリセット
    vi.clearAllMocks();
    
    // 型安全なモック関数の設定
    mockIcon = vi.mocked(MockIcon);
    mockAvatar = vi.mocked(MockAvatar);
  });

  it('should render with default props', () => {
    const props: AvatarGroupProps = { accounts: [] };
    render(AvatarGroup, { props });
    
    const container = screen.getByRole('generic');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass('flex-shrink-0', 'relative');
  });

  it('should apply default size classes', () => {
    const props: AvatarGroupProps = { accounts: [] };
    render(AvatarGroup, { props });
    
    const container = screen.getByRole('generic');
    expect(container).toHaveClass('w-10', 'h-10');
  });

  it('should apply small size classes', () => {
    const props: AvatarGroupProps = { accounts: [], size: 'sm' };
    render(AvatarGroup, { props });
    
    const container = screen.getByRole('generic');
    expect(container).toHaveClass('w-8', 'h-8');
  });

  it('should apply large size classes', () => {
    const props: AvatarGroupProps = { accounts: [], size: 'lg' };
    render(AvatarGroup, { props });
    
    const container = screen.getByRole('generic');
    expect(container).toHaveClass('w-12', 'h-12');
  });

  it('should render fallback when no accounts provided', () => {
    const props: AvatarGroupProps = { accounts: [] };
    render(AvatarGroup, { props });
    
    const fallback = screen.getByRole('generic').querySelector('.bg-muted\\/20');
    expect(fallback).toBeInTheDocument();
  });

  it('should render single avatar for one account', () => {
    const props: AvatarGroupProps = { accounts: [...mockAccounts.single] };
    render(AvatarGroup, { props });
    
    const avatar = screen.getByRole('img');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('alt', 'User 1');
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar1.jpg');
  });

  it('should render dual layout for two accounts', () => {
    const props: AvatarGroupProps = { accounts: [...mockAccounts.dual] };
    render(AvatarGroup, { props });
    
    const container = screen.getByRole('generic');
    const dualContainer = container.querySelector('.flex');
    expect(dualContainer).toBeInTheDocument();
    
    const avatars = screen.getAllByRole('img');
    expect(avatars).toHaveLength(2);
  });

  it('should respect maxDisplay limit', () => {
    const props: AvatarGroupProps = { 
      accounts: [...mockAccounts.multiple], 
      maxDisplay: 3 
    };
    render(AvatarGroup, { props });
    
    const avatars = screen.getAllByRole('img');
    expect(avatars).toHaveLength(3);
  });

  it('should show overflow indicator when accounts exceed maxDisplay', () => {
    const props: AvatarGroupProps = { 
      accounts: [...mockAccounts.multiple], 
      maxDisplay: 3 
    };
    render(AvatarGroup, { props });
    
    const indicator = screen.getByText('+');
    expect(indicator).toBeInTheDocument();
  });

  it('should apply custom CSS classes', () => {
    const props: AvatarGroupProps = { 
      accounts: [], 
      class: 'custom-class' 
    };
    render(AvatarGroup, { props });
    
    const container = screen.getByRole('generic');
    expect(container).toHaveClass('custom-class', 'flex-shrink-0', 'relative');
  });

  it('should handle malformed account data gracefully', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    
    // 不正なデータの型定義
    const malformedAccounts = [null, undefined, { id: 'invalid' }] as unknown as Account[];
    const props: AvatarGroupProps = { accounts: malformedAccounts };
    
    render(AvatarGroup, { props });
    
    const container = screen.getByRole('generic');
    expect(container).toBeInTheDocument();
    
    consoleErrorSpy.mockRestore();
  });
});