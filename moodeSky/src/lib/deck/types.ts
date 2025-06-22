/**
 * deck/types.ts
 * デッキシステム専用型定義
 * 
 * tokimekiblueskyを参考にしつつ、moodeSky独自の機能を追加
 * Tauri統合・多言語対応・マルチプラットフォーム対応
 */

import { ICONS } from '$lib/types/icon.js';

// ===================================================================
// カラム幅設定（tokimekibluesky参考）
// ===================================================================

export type ColumnWidth = 'xxs' | 'xs' | 'small' | 'medium' | 'large' | 'xl' | 'xxl';

export const COLUMN_WIDTHS: Record<ColumnWidth, { width: number; label: string }> = {
  xxs: { width: 280, label: 'Extra Extra Small' },
  xs: { width: 320, label: 'Extra Small' },
  small: { width: 380, label: 'Small' },
  medium: { width: 450, label: 'Medium' },
  large: { width: 520, label: 'Large' },
  xl: { width: 600, label: 'Extra Large' },
  xxl: { width: 720, label: 'Extra Extra Large' }
};

// ===================================================================
// カラムタイプ（AT Protocol対応）
// ===================================================================

export type ColumnType = 
  | 'home'           // ホームタイムライン
  | 'notifications'  // 通知
  | 'mentions'       // メンション
  | 'following'      // フォロー中ユーザー
  | 'followers'      // フォロワー
  | 'search'         // 検索結果
  | 'hashtag'        // ハッシュタグ
  | 'list'           // リスト
  | 'bookmarks'      // ブックマーク
  | 'likes'          // いいね一覧
  | 'author'         // 特定ユーザーの投稿
  | 'thread'         // スレッド表示
  | 'custom';        // カスタムフィード

// ===================================================================
// カラム設定
// ===================================================================

export interface ColumnSettings {
  title: string;           // カラムタイトル
  subtitle?: string;       // カラムサブタイトル
  width: ColumnWidth;
  autoRefresh: boolean;
  refreshInterval: number; // 分単位
  showRetweets: boolean;
  showReplies: boolean;
  showMedia: boolean;
  icon?: string;
  background?: string;
  isMinimized: boolean;
  isPinned: boolean;
  sortOrder?: 'newest' | 'oldest' | 'popular';
  filterKeywords?: string[];
}

// ===================================================================
// カラムアルゴリズム（AT Protocol対応）
// ===================================================================

export type ColumnAlgorithm = 
  | 'reverse_chronological'  // ホームタイムライン（逆時系列）
  | 'top_posts'              // トップ投稿（人気順）
  | 'most_friends'           // フレンド（友達との投稿）
  | 'best_of_follows'        // ベストフォロー
  | 'quiet_posters'          // 控えめな投稿者
  | 'loud_posters'           // 活発な投稿者
  | 'close_friends'          // 親しい友達
  | 'popular_in_network'     // ネットワークで人気
  | 'popular_with_friends';  // 友達に人気

export interface ColumnAlgorithmConfig {
  type: ColumnType;
  name: string;
  uri?: string;          // フィードURI（カスタムフィード用）
  query?: string;        // 検索クエリ
  userId?: string;       // 特定ユーザーID
  listId?: string;       // リストID
  hashtag?: string;      // ハッシュタグ
  parameters?: Record<string, any>; // 追加パラメータ
}

// ===================================================================
// カラムデータ（AT Protocol投稿データ）
// ===================================================================

export interface ColumnData {
  feed: any[];           // AT Protocol投稿データ配列
  cursor?: string;       // ページネーション用カーソル
  lastRefresh?: string;  // 最終更新時刻
  isLoading: boolean;
  hasMore: boolean;
  error?: string;
}

// ===================================================================
// カラム（tokimekibluesky Column参考）
// ===================================================================

export interface Column {
  id: string;
  accountId: string;     // 所有アカウントID
  algorithm: ColumnAlgorithm;
  algorithmConfig?: ColumnAlgorithmConfig; // 詳細設定
  settings: ColumnSettings;
  data: ColumnData;
  createdAt: string;
  updatedAt: string;
  
  // UI状態（永続化しない）
  scrollElement?: HTMLElement;
  isVisible?: boolean;
}

// ===================================================================
// デッキレイアウト設定
// ===================================================================

export interface DeckLayout {
  columns: Column[];
  settings: {
    gap: number;           // カラム間のギャップ
    padding: number;       // デッキの余白
    showHeader: boolean;   // ヘッダー表示
    compactMode: boolean;  // コンパクトモード
    autoHideUI: boolean;   // UI自動非表示
  };
}

// ===================================================================
// デッキ状態（永続化用）
// ===================================================================

export interface DeckState {
  layout: DeckLayout;
  activeColumnId?: string;
  lastSavedAt: string;
  version: number;       // マイグレーション用
}

// ===================================================================
// デフォルト設定
// ===================================================================

export const DEFAULT_COLUMN_SETTINGS: ColumnSettings = {
  title: 'New Column',
  subtitle: '',
  width: 'medium',
  autoRefresh: false,
  refreshInterval: 5,
  showRetweets: true,
  showReplies: true,
  showMedia: true,
  isMinimized: false,
  isPinned: false,
  sortOrder: 'newest',
  filterKeywords: []
};

export const DEFAULT_DECK_LAYOUT: DeckLayout = {
  columns: [],
  settings: {
    gap: 16,
    padding: 16,
    showHeader: true,
    compactMode: false,
    autoHideUI: false
  }
};

// ===================================================================
// カラム作成ヘルパー
// ===================================================================

export function createColumn(
  accountId: string,
  algorithm: ColumnAlgorithm,
  settings?: Partial<ColumnSettings>
): Column {
  const now = new Date().toISOString();
  
  return {
    id: crypto.randomUUID(),
    accountId,
    algorithm,
    settings: { 
      ...DEFAULT_COLUMN_SETTINGS, 
      ...settings 
    },
    data: {
      feed: [],
      isLoading: false,
      hasMore: true
    },
    createdAt: now,
    updatedAt: now
  };
}

// ===================================================================
// Add Deck 拡張機能 型定義（moodeSky独自機能）
// ===================================================================

/**
 * Add Deck ウィザードのステップ
 */
export type AddDeckStep = 'account' | 'algorithm' | 'settings';

/**
 * Add Deck フォームデータ
 */
export interface AddDeckFormData {
  selectedAccountId: string;
  selectedAlgorithm: ColumnAlgorithm;
  deckName: string;
  settings?: Partial<ColumnSettings>;
}

/**
 * アカウント選択用オプション
 */
export interface AccountOption {
  id: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  isSelected?: boolean; // 初期選択状態（デフォルトアカウントの概念ではない）
}

/**
 * アルゴリズム選択用オプション
 */
export interface AlgorithmOption {
  algorithm: ColumnAlgorithm;
  name: string;
  description: string;
  icon: string;
  isDefault?: boolean;
}

/**
 * Add Deck モーダルのProps
 */
export interface AddDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (column: Column) => void;
}

/**
 * Add Deck 作成結果
 */
export interface AddDeckResult {
  success: boolean;
  column?: Column;
  error?: string;
}

// ===================================================================
// Add Deck デフォルト設定
// ===================================================================

/**
 * Add Deck のデフォルト設定
 */
export const ADD_DECK_DEFAULTS = {
  algorithm: 'reverse_chronological' as ColumnAlgorithm,
  deckName: 'Home', // 翻訳キーで置き換える: m['deck.addDeck.defaultName']()
  step: 'account' as AddDeckStep,
  settings: {
    title: 'Home',
    width: 'medium' as ColumnWidth,
    autoRefresh: false,
    refreshInterval: 5,
    showRetweets: true,
    showReplies: true,
    showMedia: true,
    icon: ICONS.HOME,
    isMinimized: false,
    isPinned: false,
    sortOrder: 'newest' as const,
    filterKeywords: [] as string[]
  }
};

/**
 * アルゴリズムの説明文（翻訳キーと対応）
 */
export const ALGORITHM_DESCRIPTIONS: Record<ColumnAlgorithm, string> = {
  'reverse_chronological': 'deck.addDeck.algorithms.reverse_chronological.description',
  'top_posts': 'deck.addDeck.algorithms.top_posts.description',
  'most_friends': 'deck.addDeck.algorithms.most_friends.description',
  'best_of_follows': 'deck.addDeck.algorithms.best_of_follows.description',
  'quiet_posters': 'deck.addDeck.algorithms.quiet_posters.description',
  'loud_posters': 'deck.addDeck.algorithms.loud_posters.description',
  'close_friends': 'deck.addDeck.algorithms.close_friends.description',
  'popular_in_network': 'deck.addDeck.algorithms.popular_in_network.description',
  'popular_with_friends': 'deck.addDeck.algorithms.popular_with_friends.description'
};

/**
 * アルゴリズムの表示名（翻訳キーと対応）
 */
export const ALGORITHM_NAMES: Record<ColumnAlgorithm, string> = {
  'reverse_chronological': 'deck.addDeck.algorithms.reverse_chronological.name',
  'top_posts': 'deck.addDeck.algorithms.top_posts.name',
  'most_friends': 'deck.addDeck.algorithms.most_friends.name',
  'best_of_follows': 'deck.addDeck.algorithms.best_of_follows.name',
  'quiet_posters': 'deck.addDeck.algorithms.quiet_posters.name',
  'loud_posters': 'deck.addDeck.algorithms.loud_posters.name',
  'close_friends': 'deck.addDeck.algorithms.close_friends.name',
  'popular_in_network': 'deck.addDeck.algorithms.popular_in_network.name',
  'popular_with_friends': 'deck.addDeck.algorithms.popular_with_friends.name'
};

// ===================================================================
// カラムアイコンマッピング
// ===================================================================

/**
 * ColumnAlgorithmに対応するアイコンを取得
 */
export const COLUMN_ALGORITHM_ICONS: Record<ColumnAlgorithm, string> = {
  'reverse_chronological': ICONS.HOME,           // ホームタイムライン
  'top_posts': ICONS.FAVORITE,                  // トップ投稿（人気）
  'most_friends': ICONS.PEOPLE,                  // フレンド
  'best_of_follows': ICONS.AUTO_AWESOME,         // ベストフォロー
  'quiet_posters': ICONS.VOLUME_DOWN,            // 控えめな投稿者
  'loud_posters': ICONS.VOLUME_UP,              // 活発な投稿者  
  'close_friends': ICONS.FAVORITE_BORDER,        // 親しい友達
  'popular_in_network': ICONS.PUBLIC,            // ネットワークで人気
  'popular_with_friends': ICONS.GROUP            // 友達に人気
};

/**
 * カラムタイプに基づいてアイコンを取得
 */
export function getColumnIcon(column: Column): string {
  // 将来的にカラムタイプ別のアイコンも追加可能
  return COLUMN_ALGORITHM_ICONS[column.algorithm] || ICONS.FEED;
}