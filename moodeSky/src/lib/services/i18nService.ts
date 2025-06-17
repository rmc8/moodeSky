/**
 * 多層言語検出システム
 * Tauri OS Plugin + ブラウザAPI + フォールバック
 */

import { locale } from '@tauri-apps/plugin-os';
import type { 
  SupportedLanguage, 
  LanguageDetectionResult, 
  I18nConfig,
  LanguageInfo,
  LanguageMapping
} from '../types/i18n.js';

/**
 * 対応言語の情報
 */
export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageInfo> = {
  ja: {
    code: 'ja',
    nativeName: '日本語',
    englishName: 'Japanese',
    region: 'JP',
    isRTL: false
  },
  en: {
    code: 'en',
    nativeName: 'English',
    englishName: 'English',
    region: 'US',
    isRTL: false
  },
  'pt-BR': {
    code: 'pt-BR',
    nativeName: 'Português (Brasil)',
    englishName: 'Portuguese (Brazil)',
    region: 'BR',
    isRTL: false
  },
  de: {
    code: 'de',
    nativeName: 'Deutsch',
    englishName: 'German',
    region: 'DE',
    isRTL: false
  },
  ko: {
    code: 'ko',
    nativeName: '한국어',
    englishName: 'Korean',
    region: 'KR',
    isRTL: false
  }
};

/**
 * 言語マッピング設定
 */
const LANGUAGE_MAPPING: LanguageMapping = {
  bcpToApp: {
    // 日本語
    'ja': 'ja',
    'ja-JP': 'ja',
    'ja-US': 'ja',
    
    // 英語
    'en': 'en',
    'en-US': 'en',
    'en-GB': 'en',
    'en-CA': 'en',
    'en-AU': 'en',
    
    // ポルトガル語（ブラジル）
    'pt-BR': 'pt-BR',
    'pt': 'pt-BR', // ポルトガル語はブラジル版にフォールバック
    
    // ドイツ語
    'de': 'de',
    'de-DE': 'de',
    'de-AT': 'de',
    'de-CH': 'de',
    
    // 韓国語
    'ko': 'ko',
    'ko-KR': 'ko'
  },
  regionHandling: {
    preserveRegion: ['pt-BR'], // ブラジルポルトガル語は地域を保持
    fallbackToBase: ['ja', 'en', 'de', 'ko']
  }
};

/**
 * デフォルトi18n設定
 */
const DEFAULT_CONFIG: I18nConfig = {
  currentLanguage: 'en',
  systemLanguage: 'en',
  fallbackLanguage: 'en',
  autoDetect: true
};

/**
 * BCP-47言語コードをアプリ対応言語に変換
 */
function mapBcpToAppLanguage(bcpCode: string): SupportedLanguage {
  // 直接マッピングを試行
  if (bcpCode in LANGUAGE_MAPPING.bcpToApp) {
    return LANGUAGE_MAPPING.bcpToApp[bcpCode];
  }
  
  // 基本言語コードを抽出して再試行
  const baseLang = bcpCode.split('-')[0];
  if (baseLang in LANGUAGE_MAPPING.bcpToApp) {
    return LANGUAGE_MAPPING.bcpToApp[baseLang];
  }
  
  // フォールバック: 英語
  return 'en';
}

/**
 * Tauri OS Pluginでシステム言語を取得
 */
async function detectOSLanguage(): Promise<LanguageDetectionResult | null> {
  try {
    const osLocale = await locale();
    
    if (!osLocale) {
      console.warn('OS locale detection returned null');
      return null;
    }
    
    console.log('OS locale detected:', osLocale);
    
    const mappedLanguage = mapBcpToAppLanguage(osLocale);
    
    return {
      language: mappedLanguage,
      source: 'os',
      originalLocale: osLocale
    };
  } catch (error) {
    console.error('Failed to detect OS language:', error);
    return null;
  }
}

/**
 * ブラウザAPIで言語を取得
 */
function detectBrowserLanguage(): LanguageDetectionResult | null {
  try {
    const browserLang = navigator.language;
    
    if (!browserLang) {
      console.warn('Browser language detection failed');
      return null;
    }
    
    console.log('Browser language detected:', browserLang);
    
    const mappedLanguage = mapBcpToAppLanguage(browserLang);
    
    return {
      language: mappedLanguage,
      source: 'browser',
      originalLocale: browserLang
    };
  } catch (error) {
    console.error('Failed to detect browser language:', error);
    return null;
  }
}

/**
 * 多層言語検出システム
 * 1. Tauri OS Plugin (最優先)
 * 2. navigator.language (ブラウザ)
 * 3. フォールバック (英語)
 */
export async function detectSystemLanguage(): Promise<LanguageDetectionResult> {
  // 第1優先: Tauri OS Plugin
  const osResult = await detectOSLanguage();
  if (osResult) {
    return osResult;
  }
  
  // 第2優先: ブラウザAPI
  const browserResult = detectBrowserLanguage();
  if (browserResult) {
    return browserResult;
  }
  
  // フォールバック: 英語
  console.log('Using fallback language: en');
  return {
    language: 'en',
    source: 'fallback'
  };
}

/**
 * 言語が対応しているかチェック
 */
export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return lang in SUPPORTED_LANGUAGES;
}

/**
 * 言語情報を取得
 */
export function getLanguageInfo(lang: SupportedLanguage): LanguageInfo {
  return SUPPORTED_LANGUAGES[lang];
}

/**
 * 全対応言語の情報を取得
 */
export function getAllLanguages(): LanguageInfo[] {
  return Object.values(SUPPORTED_LANGUAGES);
}

/**
 * i18nサービスクラス
 */
export class I18nService {
  private config: I18nConfig = { ...DEFAULT_CONFIG };
  private detectionResult: LanguageDetectionResult | null = null;
  
  /**
   * 初期化
   */
  async initialize(): Promise<I18nConfig> {
    console.log('Initializing i18n service...');
    
    // システム言語検出
    this.detectionResult = await detectSystemLanguage();
    
    // 設定を更新
    this.config.systemLanguage = this.detectionResult.language;
    this.config.currentLanguage = this.detectionResult.language;
    
    console.log('i18n service initialized:', {
      detectionResult: this.detectionResult,
      config: this.config
    });
    
    return this.config;
  }
  
  /**
   * 現在の設定を取得
   */
  getConfig(): I18nConfig {
    return { ...this.config };
  }
  
  /**
   * 言語検出結果を取得
   */
  getDetectionResult(): LanguageDetectionResult | null {
    return this.detectionResult;
  }
  
  /**
   * 言語を変更
   */
  setLanguage(language: SupportedLanguage): void {
    if (!isSupportedLanguage(language)) {
      throw new Error(`Unsupported language: ${language}`);
    }
    
    this.config.currentLanguage = language;
  }
  
  /**
   * 自動検出の有効/無効を切り替え
   */
  setAutoDetect(enabled: boolean): void {
    this.config.autoDetect = enabled;
  }
}

/**
 * グローバルi18nサービスインスタンス
 */
export const i18nService = new I18nService();