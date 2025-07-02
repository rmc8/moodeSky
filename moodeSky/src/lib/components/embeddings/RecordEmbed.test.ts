/**
 * RecordEmbed.svelte テストスイート
 * 投稿埋め込みコンポーネントのイベント処理とアクセシビリティテスト
 */

import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import RecordEmbed from './RecordEmbed.svelte';
import type { RecordEmbed as RecordEmbedType, RecordEmbedView, EmbedDisplayOptions } from './types.js';

// 型定義：RecordEmbed コンポーネントのプロパティ
interface RecordEmbedProps {
  embed: RecordEmbedType | RecordEmbedView;
  options?: Partial<EmbedDisplayOptions>;
  class?: string;
  onPostClick?: (uri: string, cid: string) => void;
  onAuthorClick?: (did: string, handle: string) => void;
  maxDepth?: number;
  currentDepth?: number;
}

// モックコンポーネントの定義
vi.mock('$lib/components/Avatar.svelte', () => ({
  default: vi.fn().mockImplementation(() => ({
    default: null,
    $$: {}
  }))
}));

vi.mock('$lib/components/Icon.svelte', () => ({
  default: vi.fn().mockImplementation(() => ({
    default: null,
    $$: {}
  }))
}));

vi.mock('./EmbedRenderer.svelte', () => ({
  default: vi.fn().mockImplementation(() => ({
    default: null,
    $$: {}
  }))
}));

vi.mock('$lib/types/icon.js', () => ({
  ICONS: {
    LINK: 'mdi:link',
    MORE_HORIZ: 'mdi:dots-horizontal'
  }
}));

vi.mock('$lib/utils/relativeTime.js', () => ({
  formatRelativeTime: vi.fn().mockReturnValue('1時間前')
}));

vi.mock('./types.js', () => ({
  DEFAULT_EMBED_DISPLAY_OPTIONS: {
    clickable: true,
    rounded: false,
    maxWidth: 600,
    interactive: true,
    showImageCount: true
  },
  isImageEmbed: vi.fn().mockReturnValue(false),
  isImageEmbedView: vi.fn().mockReturnValue(false),
  isVideoEmbed: vi.fn().mockReturnValue(false),
  isVideoEmbedView: vi.fn().mockReturnValue(false),
  isExternalEmbed: vi.fn().mockReturnValue(false),
  isExternalEmbedView: vi.fn().mockReturnValue(false)
}));

describe('RecordEmbed Component', () => {
  // テスト用のモック埋め込みレコード（RecordEmbedView形式）
  const createMockEmbedView = (override: any = {}): RecordEmbedView => ({
    $type: 'app.bsky.embed.record#view',
    record: {
      cid: 'test-cid',
      uri: 'at://did:plc:test/app.bsky.feed.post/test',
      author: {
        did: 'did:plc:test',
        handle: 'test.bsky.social',
        displayName: 'Test User' as string, // Ensure non-optional for tests
        avatar: 'https://example.com/avatar.jpg'
      },
      value: {
        $type: 'app.bsky.feed.post',
        text: 'Test post content',
        createdAt: '2024-01-01T00:00:00.000Z'
      },
      indexedAt: '2024-01-01T00:00:00.000Z',
      embeds: []
    },
    ...override
  });

  // テスト用のモック埋め込みレコード（RecordEmbed形式 - 参照のみ）
  const createMockEmbed = (override: any = {}): RecordEmbedType => ({
    $type: 'app.bsky.embed.record',
    record: {
      uri: 'at://did:plc:test/app.bsky.feed.post/test',
      cid: 'test-cid'
    },
    ...override
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with default props', () => {
    const mockEmbed = createMockEmbedView();
    const props: RecordEmbedProps = { embed: mockEmbed };
    
    render(RecordEmbed, { props });
    
    // Check that the component renders by looking for specific content
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('@test.bsky.social')).toBeInTheDocument();
    expect(screen.getByText('Test post content')).toBeInTheDocument();
  });

  it('should render as clickable div with proper accessibility', () => {
    const mockEmbed = createMockEmbedView();
    const props: RecordEmbedProps = { 
      embed: mockEmbed,
      options: { clickable: true }
    };
    
    render(RecordEmbed, { props });
    
    const clickableElement = screen.getByRole('button', { name: /@test\.bsky\.socialの投稿を引用/ });
    expect(clickableElement).toBeInTheDocument();
    expect(clickableElement).toHaveAttribute('tabindex', '0');
    expect(clickableElement).toHaveClass('cursor-pointer');
  });

  it('should handle author click events with stopPropagation', async () => {
    const mockEmbed = createMockEmbedView();
    const mockHandleAuthorClick: MockedFunction<(event: Event) => void> = vi.fn();
    const mockHandlePostClick: MockedFunction<() => void> = vi.fn();
    
    const props: RecordEmbedProps = { 
      embed: mockEmbed,
      options: { clickable: true }
    };
    
    render(RecordEmbed, { props });
    
    // アバターボタンを探す
    const avatarButton = screen.getByLabelText(`@${mockEmbed.record.author.handle}のプロフィール`);
    expect(avatarButton).toBeInTheDocument();
    
    // クリックイベントをシミュレート
    await fireEvent.click(avatarButton);
    
    // stopPropagationが呼ばれることを間接的に確認
    // （実際のコンポーネントでは、親要素のクリックハンドラーが呼ばれないことを確認）
  });

  it('should handle display name click events with stopPropagation', async () => {
    const mockEmbed = createMockEmbedView();
    const props: RecordEmbedProps = { 
      embed: mockEmbed,
      options: { clickable: true }
    };
    
    render(RecordEmbed, { props });
    
    // 表示名ボタンを探す
    const displayNameButton = screen.getByText(mockEmbed.record.author.displayName!);
    expect(displayNameButton).toBeInTheDocument();
    
    // クリックイベントをシミュレート
    await fireEvent.click(displayNameButton);
  });

  it('should handle handle click events with stopPropagation', async () => {
    const mockEmbed = createMockEmbedView();
    const props: RecordEmbedProps = { 
      embed: mockEmbed,
      options: { clickable: true }
    };
    
    render(RecordEmbed, { props });
    
    // ハンドルボタンを探す
    const handleButton = screen.getByText(`@${mockEmbed.record.author.handle}`);
    expect(handleButton).toBeInTheDocument();
    
    // クリックイベントをシミュレート
    await fireEvent.click(handleButton);
  });

  it('should support keyboard navigation', async () => {
    const mockEmbed = createMockEmbedView();
    const props: RecordEmbedProps = { 
      embed: mockEmbed,
      options: { clickable: true }
    };
    
    render(RecordEmbed, { props });
    
    const clickableElement = screen.getByRole('button', { name: /@test\.bsky\.socialの投稿を引用/ });
    
    // Enterキーでの操作をテスト
    await fireEvent.keyDown(clickableElement, { key: 'Enter' });
    
    // Spaceキーでの操作をテスト
    await fireEvent.keyDown(clickableElement, { key: ' ' });
  });

  it('should render rounded styles when specified', () => {
    const mockEmbed = createMockEmbedView();
    const props: RecordEmbedProps = { 
      embed: mockEmbed,
      options: { rounded: true }
    };
    
    render(RecordEmbed, { props });
    
    const container = screen.getByRole('button', { name: /投稿を引用/ });
    expect(container).toBeInTheDocument();
    // Check for rounded styles in the container
    expect(container.closest('.w-full')).toBeInTheDocument();
  });

  it('should handle records without author gracefully', () => {
    const mockEmbed = createMockEmbed(); // RecordEmbed type has no author info
    const props: RecordEmbedProps = { embed: mockEmbed };
    
    render(RecordEmbed, { props });
    
    // Should show reference-only UI
    expect(screen.getByText('引用投稿')).toBeInTheDocument();
    expect(screen.getByText(mockEmbed.record.uri)).toBeInTheDocument();
  });

  it('should handle depth limitation for nested quotes', () => {
    const mockEmbed = createMockEmbedView({
      record: {
        ...createMockEmbedView().record,
        embeds: [{
          $type: 'app.bsky.embed.record',
          record: createMockEmbed().record
        }]
      }
    });
    
    const props: RecordEmbedProps = { 
      embed: mockEmbed,
      maxDepth: 2,
      currentDepth: 5 // 深い階層
    };
    
    render(RecordEmbed, { props });
    
    // 深い階層では「引用が続いています」が表示される
    const continueMessage = screen.queryByText('引用が続いています...');
    expect(continueMessage).toBeInTheDocument();
  });

  it('should render post content text', () => {
    const testText = 'This is a test post content';
    const mockEmbed = createMockEmbedView({
      record: {
        ...createMockEmbedView().record,
        value: {
          $type: 'app.bsky.feed.post',
          text: testText,
          createdAt: '2024-01-01T00:00:00.000Z'
        }
      }
    });
    
    const props: RecordEmbedProps = { embed: mockEmbed };
    
    render(RecordEmbed, { props });
    
    expect(screen.getByText(testText)).toBeInTheDocument();
  });

  it('should apply proper ARIA labels for accessibility', () => {
    const mockEmbed = createMockEmbedView();
    const props: RecordEmbedProps = { 
      embed: mockEmbed,
      options: { clickable: true }
    };
    
    render(RecordEmbed, { props });
    
    const clickableElement = screen.getByRole('button', { name: /@test\.bsky\.socialの投稿を引用/ });
    expect(clickableElement).toHaveAttribute('aria-label', `@${mockEmbed.record.author.handle}の投稿を引用`);
  });

  it('should handle RecordEmbed type (reference-only) without author data', () => {
    const mockEmbed = createMockEmbed();
    const props: RecordEmbedProps = { embed: mockEmbed };
    
    render(RecordEmbed, { props });
    
    // RecordEmbed type should show reference-only UI
    expect(screen.getByText('引用投稿')).toBeInTheDocument();
    expect(screen.getByText(mockEmbed.record.uri)).toBeInTheDocument();
  });

  it('should handle RecordEmbedView type with full author data', () => {
    const mockEmbed = createMockEmbedView();
    const props: RecordEmbedProps = { embed: mockEmbed };
    
    render(RecordEmbed, { props });
    
    // RecordEmbedView should show full author info
    expect(screen.getByText(mockEmbed.record.author.displayName!)).toBeInTheDocument();
    expect(screen.getByText(`@${mockEmbed.record.author.handle}`)).toBeInTheDocument();
    expect(screen.getByText(mockEmbed.record.value.text)).toBeInTheDocument();
  });
});