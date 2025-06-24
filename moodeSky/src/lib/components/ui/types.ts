/**
 * UI基本部品の型定義
 * TailwindCSS v4統合テーマシステム + Svelte 5 runes対応
 */

// ===================================================================
// Button コンポーネント型定義
// ===================================================================

/**
 * ボタンバリアント
 * primary: プライマリアクション（既存button-primaryクラス活用）
 * secondary: セカンダリアクション（ハイコントラスト対応）
 * outline: アウトライン（境界線のみ）
 * ghost: ゴースト（境界線なし、hover時のみ背景）
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

/**
 * ボタンサイズ
 * sm: 小サイズ（px-4 py-2）
 * md: 中サイズ（px-6 py-3）- デフォルト
 * lg: 大サイズ（px-8 py-3）
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * ボタンコンポーネントのProps
 */
export interface ButtonProps {
  /** ボタンバリアント */
  variant?: ButtonVariant;
  
  /** ボタンサイズ */
  size?: ButtonSize;
  
  /** ローディング状態 */
  loading?: boolean;
  
  /** 無効状態 */
  disabled?: boolean;
  
  /** 左アイコン */
  leftIcon?: string;
  
  /** 右アイコン */
  rightIcon?: string;
  
  /** ボタンタイプ */
  type?: 'button' | 'submit' | 'reset';
  
  /** クリックイベントハンドラー */
  onclick?: () => void;
  
  /** アクセシビリティラベル */
  ariaLabel?: string;
  
  /** 追加CSSクラス */
  class?: string;
}

// ===================================================================
// Modal コンポーネント型定義
// ===================================================================

/**
 * モーダルサイズ
 * sm: 小（max-w-md）
 * md: 中（max-w-2xl）
 * lg: 大（max-w-4xl）- 既存デフォルト
 * xl: 特大（max-w-6xl）
 * full: 全画面（max-w-none）
 */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

/**
 * モーダルコンポーネントのProps
 */
export interface ModalProps {
  /** モーダル表示状態 */
  isOpen: boolean;
  
  /** モーダルサイズ */
  size?: ModalSize;
  
  /** モーダルタイトル */
  title?: string;
  
  /** ヘッダー表示フラグ */
  showHeader?: boolean;
  
  /** フッター表示フラグ */
  showFooter?: boolean;
  
  /** 閉じるボタン表示フラグ */
  showCloseButton?: boolean;
  
  /** 閉じるイベントハンドラー */
  onClose: () => void;
  
  /** ESCキー押下時のイベントハンドラー */
  onEscapeKey?: () => void;
  
  /** z-indexレベル */
  zIndex?: number;
}

// ===================================================================
// Input コンポーネント型定義
// ===================================================================

/**
 * 入力フィールドタイプ
 */
export type InputType = 'text' | 'password' | 'email' | 'search' | 'textarea';

/**
 * 入力フィールド状態
 * normal: 通常状態
 * error: エラー状態（赤色境界線）
 * success: 成功状態（緑色境界線）
 * disabled: 無効状態
 */
export type InputState = 'normal' | 'error' | 'success' | 'disabled';

/**
 * 入力フィールドコンポーネントのProps
 */
export interface InputProps {
  /** 入力タイプ */
  type?: InputType;
  
  /** 入力状態 */
  inputState?: InputState;
  
  /** ラベルテキスト */
  label?: string;
  
  /** プレースホルダーテキスト */
  placeholder?: string;
  
  /** ヘルプテキスト */
  helpText?: string;
  
  /** エラーメッセージ */
  errorMessage?: string;
  
  /** 左アイコン */
  leftIcon?: string;
  
  /** 右アイコン */
  rightIcon?: string;
  
  /** 入力値 */
  value?: string;
  
  /** 無効状態 */
  disabled?: boolean;
  
  /** 必須フラグ */
  required?: boolean;
  
  /** 読み取り専用フラグ */
  readonly?: boolean;
  
  /** 最大文字数 */
  maxLength?: number;
  
  /** 行数（textarea用） */
  rows?: number;
  
  /** 自動フォーカス */
  autofocus?: boolean;
  
  /** 追加CSSクラス */
  class?: string;
}

// ===================================================================
// Card コンポーネント型定義
// ===================================================================

/**
 * カードバリアント
 * default: 基本カード
 * elevated: 影付きカード
 * outlined: 境界線強調カード
 * filled: 背景色強調カード
 */
export type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled';

/**
 * カード状態
 * normal: 通常表示
 * selectable: 選択可能（hover効果）
 * selected: 選択済み（primary色）
 * disabled: 無効状態
 */
export type CardState = 'normal' | 'selectable' | 'selected' | 'disabled';

/**
 * カードパディング
 * none: p-0
 * sm: p-4
 * md: p-6 - デフォルト
 * lg: p-8
 */
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

/**
 * カードコンポーネントのProps
 */
export interface CardProps {
  /** カードバリアント */
  variant?: CardVariant;
  
  /** カード状態 */
  cardState?: CardState;
  
  /** パディングサイズ */
  padding?: CardPadding;
  
  /** クリック可能フラグ */
  clickable?: boolean;
  
  /** クリックイベントハンドラー */
  onclick?: () => void;
  
  /** アクセシビリティラベル */
  ariaLabel?: string;
  
  /** 追加CSSクラス */
  class?: string;
}

// ===================================================================
// 共通型定義
// ===================================================================

/**
 * 統合テーマシステム対応色
 * TailwindCSS v4 + data-theme統合
 */
export type ThemeColor = 
  | 'themed'      // --color-foreground
  | 'primary'     // --color-primary
  | 'secondary'   // --color-text-secondary
  | 'inactive'    // --color-text-inactive
  | 'white'       // 白色（プライマリボタン等）
  | 'error'       // --color-error
  | 'success'     // --color-success
  | 'warning';    // --color-warning

/**
 * アイコンサイズ（Icon.svelteとの統合）
 */
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * 共通イベントハンドラー型
 */
export interface CommonEventHandlers {
  onclick?: () => void;
  onmouseenter?: () => void;
  onmouseleave?: () => void;
  onfocus?: () => void;
  onblur?: () => void;
}

/**
 * レスポンシブ対応型
 */
export type ResponsiveValue<T> = T | {
  default: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
};

// ===================================================================
// ConfirmationModal コンポーネント型定義
// ===================================================================

/**
 * 確認ダイアログのバリアント
 * danger: 危険な操作（削除等）- エラー色
 * warning: 警告（重要な変更等）- 警告色
 * info: 情報確認（保存等）- プライマリ色
 */
export type ConfirmationVariant = 'danger' | 'warning' | 'info';

/**
 * 確認ダイアログコンポーネントのProps
 */
export interface ConfirmationModalProps {
  /** モーダル表示状態 */
  isOpen: boolean;
  
  /** 確認タイトル */
  title?: string;
  
  /** 確認メッセージ */
  message: string;
  
  /** 確認ボタンテキスト（カスタム） */
  confirmText?: string;
  
  /** キャンセルボタンテキスト（カスタム） */
  cancelText?: string;
  
  /** 危険度レベル */
  variant?: ConfirmationVariant;
  
  /** 確認アイコン表示フラグ */
  showIcon?: boolean;
  
  /** 確認時のコールバック */
  onConfirm: () => void;
  
  /** キャンセル時のコールバック */
  onCancel: () => void;
}