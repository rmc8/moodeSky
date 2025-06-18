/**
 * i18n Helper - Paraglide-JS コンパイル問題の回避用ヘルパー
 * 一時的な翻訳アクセス方法を提供
 */

import type { SupportedLanguage } from '../types/i18n.js';

// 翻訳データをインポート（静的インポート）
import jaTranslations from '../i18n/locales/ja.json';
import enTranslations from '../i18n/locales/en.json';
import ptBrTranslations from '../i18n/locales/pt-BR.json';
import deTranslations from '../i18n/locales/de.json';
import koTranslations from '../i18n/locales/ko.json';

/**
 * 翻訳データマップ
 */
const translations = {
  ja: jaTranslations,
  en: enTranslations,
  'pt-BR': ptBrTranslations,
  de: deTranslations,
  ko: koTranslations
} as const;

/**
 * ネストされたオブジェクトから値を取得
 */
function getNestedValue(obj: any, path: string): string | undefined {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

// 現在の言語を保持する変数（循環依存を避けるため）
let currentLanguage: SupportedLanguage = 'en';

/**
 * 現在の言語を設定（循環依存回避用）
 */
export function setCurrentLanguage(lang: SupportedLanguage): void {
  currentLanguage = lang;
}

/**
 * 翻訳テキストを取得
 * @param key - 翻訳キー（例: "navigation.home"）
 * @param language - 言語（省略時は現在の言語を使用、初期化前は 'en'）
 * @returns 翻訳テキスト（見つからない場合は英語フォールバック、それも無い場合はキー自体）
 */
export function t(key: string, language?: SupportedLanguage): string {
  const lang = language || currentLanguage;
  
  try {
    // 現在の言語の翻訳を試行
    const currentLangTranslation = getNestedValue(translations[lang], key);
    if (currentLangTranslation) {
      return currentLangTranslation;
    }
    
    // 英語フォールバック
    if (lang !== 'en') {
      const englishTranslation = getNestedValue(translations.en, key);
      if (englishTranslation) {
        console.warn(`Translation missing for key "${key}" in language "${lang}". Using English fallback.`);
        return englishTranslation;
      }
    }
    
    // フォールバックも失敗した場合はキー自体を返す
    console.error(`Translation missing for key "${key}" in all languages.`);
    return key;
  } catch (error) {
    console.error(`Error accessing translation for key "${key}":`, error);
    return key;
  }
}

/**
 * ナビゲーション用の特定翻訳を取得
 */
export const navigationTranslations = {
  home: () => t('navigation.home'),
  deck: () => t('navigation.deck'),
  deckAdd: () => t('navigation.deckAdd'),
  settings: () => t('navigation.settings'),
  profile: () => t('navigation.profile'),
  compose: () => t('navigation.compose'),
  post: () => t('navigation.post')
} as const;

/**
 * よく使用される翻訳のショートカット
 */
export const commonTranslations = {
  save: () => t('common.save'),
  cancel: () => t('common.cancel'),
  delete: () => t('common.delete'),
  edit: () => t('common.edit'),
  close: () => t('common.close'),
  back: () => t('common.back'),
  next: () => t('common.next'),
  error: () => t('common.error')
} as const;