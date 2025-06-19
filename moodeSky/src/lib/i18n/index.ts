/**
 * i18n統合インデックス
 * Paraglide-JS + Tauri OS Plugin + Svelte 5 Store
 */

// Paraglide-JS生成メッセージ関数
import * as m from '../../paraglide/messages.js';
export { m };

// ストアとサービス
export { i18nStore, getCurrentLanguage, setLanguage, initializeI18n } from '../stores/i18n.svelte.js';
export { i18nService, detectSystemLanguage, isSupportedLanguage, getLanguageInfo, getAllLanguages, SUPPORTED_LANGUAGES } from '../services/i18nService.js';

// 型定義
export type { SupportedLanguage, LanguageDetectionResult, I18nConfig, LanguageInfo } from '../types/i18n.js';

// Paraglide-JS ランタイム関数
export { setLocale, getLocale, locales, baseLocale } from '../../paraglide/runtime.js';

/**
 * 便利関数: メッセージのパラメータ付き取得
 */
export function t(key: keyof typeof m, params: any = {}): string {
  const messageFunction = m[key] as any;
  if (typeof messageFunction === 'function') {
    return messageFunction(params);
  }
  return String(messageFunction);
}

/**
 * 便利関数: 安全なメッセージ取得（キーが存在しない場合はキーを返す）
 */
export function tryT(key: string, params: any = {}): string {
  try {
    if (key in m) {
      const messageFunction = (m as any)[key];
      if (typeof messageFunction === 'function') {
        return messageFunction(params);
      }
      return String(messageFunction);
    }
    return key;
  } catch (error) {
    console.warn('Translation key not found:', key, error);
    return key;
  }
}