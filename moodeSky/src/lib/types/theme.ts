/**
 * テーマモード定義
 */
export type ThemeMode = 
  | 'system'      // システム設定に連動
  | 'light'       // ライトテーマ
  | 'dark'        // ダークテーマ
  | 'high-contrast'; // ハイコントラストテーマ

/**
 * カスタムテーマカラー設定
 */
export interface CustomThemeColors {
  /** プライマリカラー */
  primary: string;
  /** セカンダリカラー */
  secondary: string;
  /** アクセントカラー */
  accent: string;
  /** 背景カラー */
  background: string;
  /** 表面カラー */
  surface: string;
  /** テキストカラー */
  text: string;
  /** ミュートテキストカラー */
  textMuted: string;
  /** 境界線カラー */
  border: string;
}

/**
 * 時間帯自動切り替え設定
 */
export interface AutoThemeSchedule {
  /** 自動切り替えを有効にするか */
  enabled: boolean;
  /** ライトテーマ開始時刻 (24時間表記: 0-23) */
  lightStart: number;
  /** ダークテーマ開始時刻 (24時間表記: 0-23) */
  darkStart: number;
}

/**
 * テーマ設定のメインデータ構造
 */
export interface ThemeSettings {
  /** 現在のテーマモード */
  mode: ThemeMode;
  
  /** カスタムテーマカラー（mode='custom'時に使用） */
  customColors?: CustomThemeColors;
  
  /** 時間帯自動切り替え設定 */
  autoSchedule: AutoThemeSchedule;
  
  /** アニメーション・トランジションを有効にするか */
  animations: boolean;
  
  /** 最後に設定が更新された日時 (ISO 8601) */
  lastUpdatedAt: string;
}

/**
 * Tauri Store Plugin のキー定義
 */
export const THEME_STORE_KEYS = {
  /** メインテーマ設定 */
  THEME_SETTINGS: 'theme_settings',
  /** システム設定キャッシュ */
  SYSTEM_THEME_CACHE: 'system_theme_cache',
} as const;

/**
 * テーマエラー種別
 */
export type ThemeError = 
  | 'STORE_LOAD_FAILED'
  | 'STORE_SAVE_FAILED'
  | 'INVALID_THEME_DATA'
  | 'SYSTEM_DETECTION_FAILED'
  | 'SCHEDULE_VALIDATION_FAILED';

/**
 * テーマ操作結果
 * authStore.tsのAuthResult<T>パターンを踏襲
 */
export interface ThemeResult<T = void> {
  success: boolean;
  data?: T;
  error?: {
    type: ThemeError;
    message: string;
  };
}

/**
 * システムテーマ検出結果
 */
export interface SystemThemeInfo {
  /** システムの現在のテーマ ('light' | 'dark') */
  currentTheme: 'light' | 'dark';
  /** ハイコントラストモードが有効か */
  highContrast: boolean;
  /** 検出時刻 (ISO 8601) */
  detectedAt: string;
}

/**
 * デフォルトテーマ設定
 */
export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  mode: 'system',
  autoSchedule: {
    enabled: false,
    lightStart: 7,  // 午前7時
    darkStart: 19,  // 午後7時
  },
  animations: true,
  lastUpdatedAt: new Date().toISOString(),
};

/**
 * デフォルトカスタムカラー（将来のカスタムテーマ機能用）
 */
export const DEFAULT_CUSTOM_COLORS: CustomThemeColors = {
  primary: '#3b82f6',      // blue-500
  secondary: '#6b7280',    // gray-500  
  accent: '#8b5cf6',       // violet-500
  background: '#ffffff',   // white
  surface: '#f9fafb',      // gray-50
  text: '#111827',         // gray-900
  textMuted: '#6b7280',    // gray-500
  border: '#e5e7eb',       // gray-200
};