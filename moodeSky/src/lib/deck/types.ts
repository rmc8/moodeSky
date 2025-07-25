/**
 * deck/types.ts
 * デッキシステム専用型定義
 * 
 * tokimekiblueskyを参考にしつつ、moodeSky独自の機能を追加
 * Tauri統合・多言語対応・マルチプラットフォーム対応
 */

import { ICONS } from '$lib/types/icon.js';
import * as m from '../../paraglide/messages.js';
import type { Account } from '$lib/types/auth.js';

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
  // 基本フィード
  | 'home'                   // ホームタイムライン
  | 'notifications'          // 通知（全アカウント対応）
  | 'mentions'               // メンション（全アカウント対応）
  
  // 検索・発見
  | 'search'                 // 検索結果（全アカウント対応）
  | 'hashtag'                // ハッシュタグ（全アカウント対応）
  | 'trending'               // トレンド
  
  // ユーザー関連
  | 'following'              // フォロー中
  | 'followers'              // フォロワー
  
  // カスタム機能
  | 'list'                   // リスト
  | 'custom_feed';           // カスタムフィード

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
  accountId: string;     // 所有アカウントID（'all'の場合は全アカウント対応）
  algorithm: ColumnAlgorithm;
  algorithmConfig?: ColumnAlgorithmConfig; // 詳細設定
  settings: ColumnSettings;
  data: ColumnData;
  createdAt: string;
  updatedAt: string;
  
  // マルチアカウント対応
  targetAccounts?: Account[]; // 対象アカウント配列（全アカウント選択時に使用）
  
  // UI状態（永続化しない）
  scrollElement?: HTMLElement;
  isVisible?: boolean;
}

// ===================================================================
// デッキグローバル設定
// ===================================================================

export interface DeckSettings {
  // 自動更新設定
  autoRefreshInterval: number;     // ミリ秒単位（0で無効）
  
  // レイアウト設定
  gap: number;                     // カラム間のギャップ（px）
  padding: number;                 // デッキの余白（px）
  
  // 表示設定
  showColumnHeaders: boolean;      // カラムヘッダー表示
  compactMode: boolean;           // コンパクトモード
  smoothAnimations: boolean;      // スムーズアニメーション
  
  // インタラクション設定
  enableSwipeGestures: boolean;   // スワイプジェスチャー
  enableKeyboardShortcuts: boolean; // キーボードショートカット
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
  deckSettings: DeckSettings;  // デッキグローバル設定
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

export const DEFAULT_DECK_SETTINGS: DeckSettings = {
  autoRefreshInterval: 300000, // 5分
  gap: 16,
  padding: 8,
  showColumnHeaders: true,
  compactMode: false,
  smoothAnimations: true,
  enableSwipeGestures: true,
  enableKeyboardShortcuts: true
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
 * Add Deck ウィザードのステップ（purpose-first flow）
 */
export type AddDeckStep = 'feedType' | 'account' | 'settings';

/**
 * Add Deck フォームデータ（purpose-first flow対応）
 */
export interface AddDeckFormData {
  selectedFeedType: ColumnAlgorithm;
  selectedAccountId: string | 'all'; // 'all'は全アカウント対応フィードタイプ用
  deckName: string;
  additionalConfig?: {
    searchQuery?: string;     // 検索フィード用
    hashtag?: string;         // ハッシュタグフィード用
    listId?: string;          // リストフィード用
    customFeedUri?: string;   // カスタムフィード用
  };
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
 * フィード種類設定（purpose-first flow用）
 */
export interface FeedTypeConfig {
  id: ColumnAlgorithm;
  name: string; // 日本語表示名
  description: string; // 日本語説明
  icon: string;
  category: 'basic' | 'discovery' | 'user' | 'custom';
  supportsAllAccounts: boolean; // 全アカウント対応フラグ
  requiresAdditionalInput?: boolean; // 追加入力が必要
  inputType?: 'search' | 'hashtag' | 'list' | 'custom_feed';
  inputLabel?: string; // 入力フィールドのラベル（日本語）
  inputPlaceholder?: string; // 入力フィールドのプレースホルダー（日本語）
  recommendedFor?: string; // 推奨用途（日本語）
}

/**
 * フィードタイプカテゴリ定義
 */
export interface FeedCategory {
  id: 'basic' | 'discovery' | 'user' | 'custom';
  name: string; // 日本語表示名
  description: string; // 日本語説明
  icon: string;
  order: number;
}

/**
 * アルゴリズム選択用オプション（legacy - 互換性のため残す）
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
  zIndex?: number;
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
 * Add Deck のデフォルト設定（purpose-first flow対応）
 */
export const ADD_DECK_DEFAULTS = {
  feedType: 'home' as ColumnAlgorithm,
  accountId: '',
  deckName: 'Home', // 翻訳キーで置き換える: m['deck.addDeck.defaultName']()
  step: 'feedType' as AddDeckStep,
  additionalConfig: {},
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
 * フィードタイプに基づくデフォルト名取得
 */
export function getDefaultDeckName(feedType: ColumnAlgorithm, additionalConfig?: any): string {
  switch (feedType) {
    case 'home':
      return m['feeds.types.home.name']();
    case 'notifications':
      return m['feeds.types.notifications.name']();
    case 'mentions':
      return m['feeds.types.mentions.name']();
    case 'search':
      return additionalConfig?.searchQuery ? `${m['feeds.types.search.name']()}: ${additionalConfig.searchQuery}` : m['feeds.types.search.name']();
    case 'hashtag':
      return additionalConfig?.hashtag ? `#${additionalConfig.hashtag}` : m['feeds.types.hashtag.name']();
    case 'trending':
      return m['feeds.types.trending.name']();
    case 'following':
      return m['feeds.types.following.name']();
    case 'followers':
      return m['feeds.types.followers.name']();
    case 'list':
      return additionalConfig?.listName ? `${m['feeds.types.list.name']()}: ${additionalConfig.listName}` : m['feeds.types.list.name']();
    case 'custom_feed':
      return additionalConfig?.feedName ? `${additionalConfig.feedName}` : m['feeds.types.customFeed.name']();
    default:
      return m['deck.column.defaultSubtitle']();
  }
}


// ===================================================================
// フィードタイプカテゴリ設定（purpose-first flow）
// ===================================================================

/**
 * フィードタイプカテゴリ一覧
 * 国際化対応: 翻訳関数を使用してリアクティブに名前と説明を取得
 */
export function getFeedCategories(): FeedCategory[] {
  return [
    {
      id: 'basic',
      name: m['feeds.categories.basic.name'](),
      description: m['feeds.categories.basic.description'](),
      icon: ICONS.HOME,
      order: 1
    },
    {
      id: 'discovery',
      name: m['feeds.categories.discovery.name'](),
      description: m['feeds.categories.discovery.description'](),
      icon: ICONS.SEARCH,
      order: 2
    },
    {
      id: 'user',
      name: m['feeds.categories.user.name'](),
      description: m['feeds.categories.user.description'](),
      icon: ICONS.PEOPLE,
      order: 3
    },
    {
      id: 'custom',
      name: m['feeds.categories.custom.name'](),
      description: m['feeds.categories.custom.description'](),
      icon: ICONS.SETTINGS,
      order: 4
    }
  ];
}

/**
 * 後方互換性のため、静的な配列も維持
 * @deprecated getFeedCategories()関数を使用してください
 */
export const FEED_CATEGORIES: FeedCategory[] = [
  {
    id: 'basic',
    name: '基本フィード',
    description: '日常的に使用する基本的なフィード',
    icon: ICONS.HOME,
    order: 1
  },
  {
    id: 'discovery',
    name: '発見・検索',
    description: '新しいコンテンツや話題を発見するフィード',
    icon: ICONS.SEARCH,
    order: 2
  },
  {
    id: 'user',
    name: 'ユーザー関連',
    description: 'ユーザーとのつながりやアクティビティ関連のフィード',
    icon: ICONS.PEOPLE,
    order: 3
  },
  {
    id: 'custom',
    name: 'カスタム機能',
    description: 'カスタマイズ可能な高度なフィード',
    icon: ICONS.SETTINGS,
    order: 4
  }
];

/**
 * フィードタイプ設定一覧（purpose-first flow用）
 * 国際化対応: 翻訳関数を使用してリアクティブに取得
 */
export function getFeedTypeConfigs(): FeedTypeConfig[] {
  return [
    // 基本フィード
    {
      id: 'home',
      name: m['feeds.types.home.name'](),
      description: m['feeds.types.home.description'](),
      icon: ICONS.HOME,
      category: 'basic',
      supportsAllAccounts: false,
      recommendedFor: m['feeds.types.home.recommendation']()
    },
    {
      id: 'notifications',
      name: m['feeds.types.notifications.name'](),
      description: m['feeds.types.notifications.description'](),
      icon: ICONS.NOTIFICATIONS,
      category: 'basic',
      supportsAllAccounts: true,
      recommendedFor: m['feeds.types.notifications.recommendation']()
    },
    {
      id: 'mentions',
      name: m['feeds.types.mentions.name'](),
      description: m['feeds.types.mentions.description'](),
      icon: ICONS.ALTERNATE_EMAIL,
      category: 'basic',
      supportsAllAccounts: true,
      recommendedFor: m['feeds.types.mentions.recommendation']()
    },
    
    // 発見・検索フィード
    {
      id: 'search',
      name: m['feeds.types.search.name'](),
      description: m['feeds.types.search.description'](),
      icon: ICONS.SEARCH,
      category: 'discovery',
      supportsAllAccounts: false,
      requiresAdditionalInput: true,
      inputType: 'search',
      inputLabel: m['feeds.types.search.inputLabel'](),
      inputPlaceholder: m['feeds.types.search.inputPlaceholder'](),
      recommendedFor: m['feeds.types.search.recommendation']()
    },
    {
      id: 'hashtag',
      name: m['feeds.types.hashtag.name'](),
      description: m['feeds.types.hashtag.description'](),
      icon: ICONS.TAG,
      category: 'discovery',
      supportsAllAccounts: false,
      requiresAdditionalInput: true,
      inputType: 'hashtag',
      inputLabel: m['feeds.types.hashtag.inputLabel'](),
      inputPlaceholder: m['feeds.types.hashtag.inputPlaceholder'](),
      recommendedFor: m['feeds.types.hashtag.recommendation']()
    },
    {
      id: 'trending',
      name: m['feeds.types.trending.name'](),
      description: m['feeds.types.trending.description'](),
      icon: ICONS.TRENDING_UP,
      category: 'discovery',
      supportsAllAccounts: false,
      recommendedFor: m['feeds.types.trending.recommendation']()
    },
    
    // ユーザー関連フィード
    {
      id: 'following',
      name: m['feeds.types.following.name'](),
      description: m['feeds.types.following.description'](),
      icon: ICONS.PERSON_ADD,
      category: 'user',
      supportsAllAccounts: false,
      recommendedFor: m['feeds.types.following.recommendation']()
    },
    {
      id: 'followers',
      name: m['feeds.types.followers.name'](),
      description: m['feeds.types.followers.description'](),
      icon: ICONS.GROUP,
      category: 'user',
      supportsAllAccounts: false,
      recommendedFor: m['feeds.types.followers.recommendation']()
    },
    
    // カスタム機能
    {
      id: 'list',
      name: m['feeds.types.list.name'](),
      description: m['feeds.types.list.description'](),
      icon: ICONS.LIST,
      category: 'custom',
      supportsAllAccounts: false,
      requiresAdditionalInput: true,
      inputType: 'list',
      inputLabel: m['feeds.types.list.inputLabel'](),
      inputPlaceholder: m['feeds.types.list.inputPlaceholder'](),
      recommendedFor: m['feeds.types.list.recommendation']()
    },
    {
      id: 'custom_feed',
      name: m['feeds.types.customFeed.name'](),
      description: m['feeds.types.customFeed.description'](),
      icon: ICONS.TAG,
      category: 'custom',
      supportsAllAccounts: false,
      requiresAdditionalInput: true,
      inputType: 'custom_feed',
      inputLabel: m['feeds.types.customFeed.inputLabel'](),
      inputPlaceholder: m['feeds.types.customFeed.inputPlaceholder'](),
      recommendedFor: m['feeds.types.customFeed.recommendation']()
    }
  ];
}

/**
 * 後方互換性のため、静的な配列も維持
 * @deprecated getFeedTypeConfigs()関数を使用してください
 */
export const FEED_TYPE_CONFIGS: FeedTypeConfig[] = [
  // 基本フィード
  {
    id: 'home',
    name: 'ホーム',
    description: 'フォローしているユーザーの投稿を時系列で表示',
    icon: ICONS.HOME,
    category: 'basic',
    supportsAllAccounts: false,
    recommendedFor: '日常的な情報収集に最適'
  },
  {
    id: 'notifications',
    name: '通知',
    description: 'いいね、リポスト、フォロー、リプライなどの通知',
    icon: ICONS.NOTIFICATIONS,
    category: 'basic',
    supportsAllAccounts: true,
    recommendedFor: 'アクティビティの確認に便利'
  },
  {
    id: 'mentions',
    name: 'メンション',
    description: '自分への言及を含む投稿を表示',
    icon: ICONS.ALTERNATE_EMAIL,
    category: 'basic',
    supportsAllAccounts: true,
    recommendedFor: '会話の追跡に最適'
  },
  
  // 発見・検索フィード
  {
    id: 'search',
    name: '検索',
    description: '特定のキーワードで投稿を検索',
    icon: ICONS.SEARCH,
    category: 'discovery',
    supportsAllAccounts: false,
    requiresAdditionalInput: true,
    inputType: 'search',
    inputLabel: '検索キーワード',
    inputPlaceholder: '検索したいキーワードを入力',
    recommendedFor: '特定の話題や情報の追跡に最適'
  },
  {
    id: 'hashtag',
    name: 'ハッシュタグ',
    description: '指定したハッシュタグを含む投稿を表示',
    icon: ICONS.TAG,
    category: 'discovery',
    supportsAllAccounts: false,
    requiresAdditionalInput: true,
    inputType: 'hashtag',
    inputLabel: 'ハッシュタグ',
    inputPlaceholder: '#を除いて入力 (例: 技術)',
    recommendedFor: '特定のジャンルやトピックの追跡に最適'
  },
  {
    id: 'trending',
    name: 'トレンド',
    description: '今話題になっている人気の投稿',
    icon: ICONS.TRENDING_UP,
    category: 'discovery',
    supportsAllAccounts: false,
    recommendedFor: '最新のトレンドや話題の把握に最適'
  },
  
  // ユーザー関連フィード
  {
    id: 'following',
    name: 'フォロー中',
    description: 'フォローしているユーザー一覧を表示',
    icon: ICONS.PERSON_ADD,
    category: 'user',
    supportsAllAccounts: false,
    recommendedFor: 'フォロー関係の管理に最適'
  },
  {
    id: 'followers',
    name: 'フォロワー',
    description: '自分をフォローしているユーザー一覧を表示',
    icon: ICONS.GROUP,
    category: 'user',
    supportsAllAccounts: false,
    recommendedFor: 'フォロワーの確認や管理に最適'
  },
  
  // カスタム機能
  {
    id: 'list',
    name: 'リスト',
    description: '特定のユーザーリストの投稿を表示',
    icon: ICONS.LIST,
    category: 'custom',
    supportsAllAccounts: false,
    requiresAdditionalInput: true,
    inputType: 'list',
    inputLabel: 'リストID',
    inputPlaceholder: 'リストのIDまたはURIを入力',
    recommendedFor: '特定のグループやジャンルの追跡に最適'
  },
  {
    id: 'custom_feed',
    name: 'カスタムフィード',
    description: '外部のカスタムフィードを表示',
    icon: ICONS.TAG,
    category: 'custom',
    supportsAllAccounts: false,
    requiresAdditionalInput: true,
    inputType: 'custom_feed',
    inputLabel: 'フィードURI',
    inputPlaceholder: 'at://did:plc:...またはhttps://...',
    recommendedFor: 'コミュニティ作成の特別なフィードの利用に最適'
  }
];

/**
 * カテゴリ別フィードタイプ取得
 */
export function getFeedTypesByCategory(category: 'basic' | 'discovery' | 'user' | 'custom'): FeedTypeConfig[] {
  return getFeedTypeConfigs().filter(config => config.category === category);
}


/**
 * フィードタイプ設定取得
 */
export function getFeedTypeConfig(id: ColumnAlgorithm): FeedTypeConfig | undefined {
  return getFeedTypeConfigs().find(config => config.id === id);
}

// ===================================================================
// カラムアイコンマッピング
// ===================================================================

/**
 * ColumnAlgorithmに対応するアイコンを取得
 */
export const COLUMN_ALGORITHM_ICONS: Record<ColumnAlgorithm, string> = {
  // 基本フィード
  'home': ICONS.HOME,
  'notifications': ICONS.NOTIFICATIONS,
  'mentions': ICONS.ALTERNATE_EMAIL,
  
  // 検索・発見
  'search': ICONS.SEARCH,
  'hashtag': ICONS.TAG,
  'trending': ICONS.TRENDING_UP,
  
  // ユーザー関連
  'following': ICONS.PERSON_ADD,
  'followers': ICONS.GROUP,
  
  // カスタム機能
  'list': ICONS.LIST,
  'custom_feed': ICONS.TAG,
};

/**
 * カラムタイプに基づいてアイコンを取得
 */
export function getColumnIcon(column: Column): string {
  // フィードタイプ設定からアイコンを取得（優先）
  const feedConfig = getFeedTypeConfig(column.algorithm);
  if (feedConfig) {
    return feedConfig.icon;
  }
  
  // レガシーマッピングからフォールバック
  return COLUMN_ALGORITHM_ICONS[column.algorithm] || ICONS.FEED;
}

/**
 * フィードタイプに基づいてアイコンを取得
 */
export function getFeedTypeIcon(feedType: ColumnAlgorithm): string {
  const feedConfig = getFeedTypeConfig(feedType);
  return feedConfig?.icon || COLUMN_ALGORITHM_ICONS[feedType] || ICONS.FEED;
}