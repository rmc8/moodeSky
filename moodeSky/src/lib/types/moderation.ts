/**
 * モデレーション機能の型定義
 * AT Protocol のコンテンツモデレーション機能とキーワードミュート機能
 */

/**
 * コンテンツラベルの種類
 */
export type ContentLabel = 
  | 'adult'           // 成人向けコンテンツ
  | 'sexual'          // 性的コンテンツ
  | 'violence'        // 暴力的コンテンツ
  | 'graphic'         // グロテスクなコンテンツ
  | 'spam'            // スパムコンテンツ
  | 'political'       // 政治的コンテンツ
  | 'misinformation'  // 誤情報
  | 'hate-speech'     // ヘイトスピーチ
  | 'harassment'      // ハラスメント
  | 'self-harm';      // 自傷行為

/**
 * モデレーションアクション
 */
export type ModerationAction = 
  | 'show'          // 表示する
  | 'warn'          // 警告表示
  | 'blur'          // ぼかし表示
  | 'hide'          // 非表示
  | 'filter';       // 完全フィルタ

/**
 * コンテンツラベルに対するユーザー設定
 */
export interface LabelModeration {
  /** ラベルの種類 */
  label: ContentLabel;
  /** 実行するアクション */
  action: ModerationAction;
  /** この設定が有効かどうか */
  enabled: boolean;
  /** カスタム設定か（デフォルト設定を上書き） */
  isCustom: boolean;
}

/**
 * キーワードミュートの対象
 */
export type MuteTarget = 
  | 'content'       // 投稿本文
  | 'hashtags'      // ハッシュタグ
  | 'mentions'      // メンション
  | 'alt-text'      // 画像のalt属性
  | 'display-name'  // 表示名
  | 'bio';          // プロフィール文

/**
 * キーワードミュートの種類
 */
export type MuteType = 
  | 'exact'         // 完全一致
  | 'partial'       // 部分一致
  | 'regex'         // 正規表現
  | 'wildcard';     // ワイルドカード

/**
 * キーワードミュート設定
 */
export interface MutedKeyword {
  /** 一意のID */
  id: string;
  /** ミュートするキーワード */
  keyword: string;
  /** マッチング種類 */
  type: MuteType;
  /** 対象範囲 */
  targets: MuteTarget[];
  /** 有効/無効 */
  enabled: boolean;
  /** 大文字小文字を区別するか */
  caseSensitive: boolean;
  /** 作成日時 */
  createdAt: string;
  /** 最終更新日時 */
  updatedAt: string;
  /** メモ（任意） */
  note?: string;
}

/**
 * ラベラーサービス設定
 */
export interface LabelerConfig {
  /** ラベラーのDID */
  did: string;
  /** 表示名 */
  displayName: string;
  /** 説明 */
  description?: string;
  /** 有効/無効 */
  enabled: boolean;
  /** 信頼レベル */
  trustLevel: 'low' | 'medium' | 'high';
  /** カスタムラベル設定 */
  customLabels?: Record<string, ModerationAction>;
}

/**
 * モデレーション設定の全体
 */
export interface ModerationSettings {
  /** ラベルモデレーション設定 */
  labelModeration: LabelModeration[];
  /** キーワードミュート設定 */
  mutedKeywords: MutedKeyword[];
  /** ラベラー設定 */
  labelers: LabelerConfig[];
  /** アダルトコンテンツ表示許可 */
  adultContentEnabled: boolean;
  /** 政治コンテンツの表示レベル */
  politicalContentLevel: 'hide' | 'warn' | 'show';
  /** 自動フィルタリング有効 */
  autoFilterEnabled: boolean;
  /** 最後の同期日時 */
  lastSyncAt?: string;
  /** 設定バージョン */
  version: number;
}

/**
 * モデレーション設定のデフォルト値
 */
export const DEFAULT_MODERATION_SETTINGS: ModerationSettings = {
  labelModeration: [
    { label: 'adult', action: 'blur', enabled: true, isCustom: false },
    { label: 'sexual', action: 'blur', enabled: true, isCustom: false },
    { label: 'violence', action: 'warn', enabled: true, isCustom: false },
    { label: 'graphic', action: 'warn', enabled: true, isCustom: false },
    { label: 'spam', action: 'hide', enabled: true, isCustom: false },
    { label: 'political', action: 'show', enabled: false, isCustom: false },
    { label: 'misinformation', action: 'warn', enabled: true, isCustom: false },
    { label: 'hate-speech', action: 'hide', enabled: true, isCustom: false },
    { label: 'harassment', action: 'hide', enabled: true, isCustom: false },
    { label: 'self-harm', action: 'warn', enabled: true, isCustom: false },
  ],
  mutedKeywords: [],
  labelers: [],
  adultContentEnabled: false,
  politicalContentLevel: 'show',
  autoFilterEnabled: true,
  version: 1,
};

/**
 * フィルタリング結果
 */
export interface FilterResult {
  /** フィルタされたかどうか */
  filtered: boolean;
  /** 実行されたアクション */
  action?: ModerationAction;
  /** フィルタの理由 */
  reason?: string;
  /** マッチしたラベル */
  matchedLabels?: ContentLabel[];
  /** マッチしたキーワード */
  matchedKeywords?: string[];
  /** 警告メッセージ */
  warningMessage?: string;
}

/**
 * コンテンツの種類
 */
export type ContentType = 
  | 'post'         // 投稿
  | 'image'        // 画像
  | 'video'        // 動画
  | 'link'         // 外部リンク
  | 'profile';     // プロフィール

/**
 * フィルタリング対象のコンテンツ
 */
export interface FilterableContent {
  /** コンテンツタイプ */
  type: ContentType;
  /** テキスト内容 */
  text?: string;
  /** ハッシュタグ */
  hashtags?: string[];
  /** メンション */
  mentions?: string[];
  /** 画像のalt属性 */
  altText?: string[];
  /** AT Protocolラベル */
  labels?: string[];
  /** 作成者のDID */
  authorDid?: string;
  /** 作成日時 */
  createdAt?: string;
}

/**
 * モデレーションサービスのエラー種別
 */
export type ModerationError = 
  | 'INVALID_KEYWORD'     // 無効なキーワード
  | 'REGEX_ERROR'         // 正規表現エラー
  | 'STORAGE_ERROR'       // ストレージエラー
  | 'SYNC_ERROR'          // 同期エラー
  | 'PERMISSION_ERROR';   // 権限エラー

/**
 * モデレーション統計情報
 */
export interface ModerationStats {
  /** 総フィルタ数 */
  totalFiltered: number;
  /** ラベル別フィルタ数 */
  filteredByLabel: Record<ContentLabel, number>;
  /** キーワード別フィルタ数 */
  filteredByKeyword: Record<string, number>;
  /** 最後の統計更新日時 */
  lastUpdated: string;
}

/**
 * ユーザーフレンドリーなラベル名の多言語対応
 */
export const LABEL_DISPLAY_NAMES: Record<ContentLabel, string> = {
  'adult': 'アダルトコンテンツ',
  'sexual': '性的コンテンツ',
  'violence': '暴力的コンテンツ',
  'graphic': 'グロテスクなコンテンツ',
  'spam': 'スパム',
  'political': '政治的コンテンツ',
  'misinformation': '誤情報',
  'hate-speech': 'ヘイトスピーチ',
  'harassment': 'ハラスメント',
  'self-harm': '自傷行為',
};

/**
 * モデレーションアクションの説明
 */
export const ACTION_DESCRIPTIONS: Record<ModerationAction, string> = {
  'show': '通常通り表示',
  'warn': '警告を表示してから表示',
  'blur': 'ぼかして表示（クリックで表示）',
  'hide': '非表示にする',
  'filter': '完全にフィルタ（表示しない）',
};