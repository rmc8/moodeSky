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
 */
export type IconColor = 'themed' | 'primary' | 'muted' | 'error' | 'success' | 'warning';

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
  
  // テーマ関連
  LIGHT_MODE: 'material-symbols:light-mode',
  DARK_MODE: 'material-symbols:dark-mode',
  COMPUTER: 'material-symbols:computer',
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
  
  // ファイル・メディア
  IMAGE: 'material-symbols:image',
  ATTACH_FILE: 'material-symbols:attach-file',
  DOWNLOAD: 'material-symbols:download',
  UPLOAD: 'material-symbols:upload',
} as const;

/**
 * アイコン名の型 (ICONS定数から推論)
 */
export type IconName = typeof ICONS[keyof typeof ICONS];