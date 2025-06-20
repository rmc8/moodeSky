/**
 * アイコンシステムの型定義
 * Material Symbols (Google Material Icons)をベースとした統一アイコンシステム
 */

/**
 * アイコンサイズバリアント
 */
export type IconSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * アイコンカラーバリアント  
 * 既存のテーマシステム（TailwindCSS v4 + data-theme）と統合
 * 
 * 🚫 DEPRECATED: 'muted' は使用禁止（背景色を文字色として使用するため視認性問題）
 * ✅ 推奨: 'secondary' または 'inactive' を使用
 */
export type IconColor = 
  | 'themed'     // メインテキスト色
  | 'primary'    // プライマリアクセント色
  | 'secondary'  // ✅ セカンダリテキスト専用色（推奨）
  | 'inactive'   // ✅ 非アクティブ状態専用色（推奨）
  | 'error'      // エラー状態色
  | 'success'    // 成功状態色
  | 'warning';   // 警告状態色

/**
 * アイコンコンポーネントのプロパティ
 */
export interface IconProps {
  /** Material Symbols アイコン名 (例: 'material-symbols:visibility') */
  icon: string;
  
  /** アイコンサイズ */
  size?: IconSize;
  
  /** アイコンカラー */
  color?: IconColor;
  
  /** 追加CSSクラス */
  class?: string;
  
  /** アクセシビリティ用ラベル */
  ariaLabel?: string;
  
  /** アクセシビリティ用説明 */
  ariaDescribedBy?: string;
  
  /** 装飾的アイコンかどうか */
  decorative?: boolean;
}

/**
 * アイコンサイズのピクセル値マッピング
 */
export const ICON_SIZES: Record<IconSize, number> = {
  sm: 16,
  md: 20, 
  lg: 24,
  xl: 32
} as const;

/**
 * よく使用されるアイコン名の定数定義
 * typo防止とインテリセンス向上のため
 */
export const ICONS = {
  // 基本UI
  VISIBILITY: 'material-symbols:visibility',
  VISIBILITY_OFF: 'material-symbols:visibility-off',
  WARNING: 'material-symbols:warning',
  ERROR: 'material-symbols:error',
  CHECK_CIRCLE: 'material-symbols:check-circle',
  INFO: 'material-symbols:info',
  
  // テーマ関連 (replaces emojis 🖥️, ☀️, 🌙, 🔳)
  LIGHT_MODE: 'material-symbols:light-mode',
  DARK_MODE: 'material-symbols:dark-mode',
  COMPUTER: 'material-symbols:computer',
  CONTRAST: 'material-symbols:contrast',
  PALETTE: 'material-symbols:palette',
  EXPAND_MORE: 'material-symbols:expand-more',
  CHECK: 'material-symbols:check',
  SETTINGS: 'material-symbols:settings',
  
  // Bluesky/ソーシャルメディア機能
  FAVORITE: 'material-symbols:favorite',
  FAVORITE_BORDER: 'material-symbols:favorite-border',
  REPEAT: 'material-symbols:repeat',
  CHAT_BUBBLE: 'material-symbols:chat-bubble-outline',
  REPLY: 'material-symbols:reply',
  SEND: 'material-symbols:send',
  EDIT: 'material-symbols:edit',
  
  // ナビゲーション
  HOME: 'material-symbols:home',
  SEARCH: 'material-symbols:search',
  NOTIFICATIONS: 'material-symbols:notifications',
  PERSON: 'material-symbols:person',
  ACCOUNT_CIRCLE: 'material-symbols:account-circle',
  
  // アクション
  MORE_HORIZ: 'material-symbols:more-horiz',
  MORE_VERT: 'material-symbols:more-vert',
  CLOSE: 'material-symbols:close',
  MENU: 'material-symbols:menu',
  REFRESH: 'material-symbols:refresh',
  ADD: 'material-symbols:add',
  ADD_CIRCLE: 'material-symbols:add-circle',
  CREATE: 'material-symbols:create',
  DELETE: 'material-symbols:delete',
  LOGIN: 'material-symbols:login',
  LOGOUT: 'material-symbols:logout',
  
  // ユーザー・アカウント
  PEOPLE: 'material-symbols:people',
  GROUP: 'material-symbols:group',
  SECURITY: 'material-symbols:security',
  
  // 未来・開発
  FUTURE: 'material-symbols:auto-awesome',
  EXPAND_LESS: 'material-symbols:expand-less',
  
  // デッキ・カラム管理
  DASHBOARD: 'material-symbols:dashboard',
  VIEW_COLUMN: 'material-symbols:view-column',
  GRID_VIEW: 'material-symbols:grid-view',
  COLUMNS: 'material-symbols:view-column',
  INBOX: 'material-symbols:inbox',
  LOADER: 'material-symbols:autorenew',
  
  // ソーシャルメディア拡張
  BOOKMARK: 'material-symbols:bookmark',
  HEART: 'material-symbols:favorite',
  AT: 'material-symbols:alternate-email',
  LIST: 'material-symbols:list',
  HASHTAG: 'material-symbols:tag',
  THREAD: 'material-symbols:forum',
  FEED: 'material-symbols:dynamic-feed',
  
  // モバイル・スワイプ
  SWIPE_HORIZONTAL: 'material-symbols:swipe',
  
  // 国際化・言語
  TRANSLATE: 'material-symbols:translate',
  LANGUAGE: 'material-symbols:language',
  PUBLIC: 'material-symbols:public',
  
  // ファイル・メディア
  IMAGE: 'material-symbols:image',
  ATTACH_FILE: 'material-symbols:attach-file',
  DOWNLOAD: 'material-symbols:download',
  UPLOAD: 'material-symbols:upload',
  
  // 設定・スケジュール
  SCHEDULE: 'material-symbols:schedule',
  ANIMATION: 'material-symbols:animation',
} as const;

/**
 * アイコン名の型 (ICONS定数から推論)
 */
export type IconName = typeof ICONS[keyof typeof ICONS];