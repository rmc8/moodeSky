/**
 * deck/types.ts
 * デッキシステム専用型定義
 * 
 * tokimekiblueskyを参考にしつつ、moodeSky独自の機能を追加
 * Tauri統合・多言語対応・マルチプラットフォーム対応
 */

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

export interface ColumnAlgorithm {
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
    settings: { ...DEFAULT_COLUMN_SETTINGS, ...settings },
    data: {
      feed: [],
      isLoading: false,
      hasMore: true
    },
    createdAt: now,
    updatedAt: now
  };
}