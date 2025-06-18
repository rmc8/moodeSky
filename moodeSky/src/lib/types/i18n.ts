/**
 * 多言語対応（i18n）の型定義
 * Tauri OS Plugin + Paraglide-JS統合システム
 */

/**
 * 対応言語一覧
 */
export type SupportedLanguage = 'ja' | 'en' | 'pt-BR' | 'de' | 'ko';

/**
 * 言語検出の結果
 */
export interface LanguageDetectionResult {
  /** 検出された言語コード */
  language: SupportedLanguage;
  /** 検出源 */
  source: 'os' | 'browser' | 'stored' | 'fallback';
  /** 元の言語コード（BCP-47形式） */
  originalLocale?: string;
}

/**
 * i18n設定
 */
export interface I18nConfig {
  /** 現在の言語 */
  currentLanguage: SupportedLanguage;
  /** システム言語 */
  systemLanguage: SupportedLanguage;
  /** フォールバック言語 */
  fallbackLanguage: SupportedLanguage;
  /** 自動言語検出の有効/無効 */
  autoDetect: boolean;
}

/**
 * 言語情報
 */
export interface LanguageInfo {
  /** 言語コード */
  code: SupportedLanguage;
  /** 表示名（各言語での自言語名） */
  nativeName: string;
  /** 英語名 */
  englishName: string;
  /** 地域コード */
  region?: string;
  /** RTL（右から左）かどうか */
  isRTL: boolean;
}

/**
 * Tauri Storeに保存される言語設定
 */
export interface StoredLanguagePreference {
  /** 保存された言語コード */
  current: SupportedLanguage;
  /** ユーザーが手動選択したかどうか */
  userSelected: boolean;
  /** 保存日時（ISO 8601形式） */
  timestamp: string;
}

/**
 * 翻訳キーの型定義（Paraglide-JS統合用）
 */
export interface TranslationKey {
  [key: string]: string | TranslationKey;
}

/**
 * 言語マッピング設定
 */
export interface LanguageMapping {
  /** BCP-47コードからアプリ言語への変換マップ */
  bcpToApp: Record<string, SupportedLanguage>;
  /** 地域バリアントの処理規則 */
  regionHandling: {
    /** 地域コードを保持する言語 */
    preserveRegion: string[];
    /** 基本言語にフォールバックする言語 */
    fallbackToBase: string[];
  };
}