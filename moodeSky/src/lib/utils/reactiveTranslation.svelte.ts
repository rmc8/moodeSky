/**
 * リアクティブ翻訳システム
 * Svelte 5 runes + Paraglide-JS完全統合
 */

import { i18nStore } from '../stores/i18n.svelte.js';
import * as messages from '../../paraglide/messages.js';

/**
 * 翻訳関数の型定義
 */
type TranslationFunction = (...args: any[]) => string;

/**
 * リアクティブ翻訳フック
 * 言語変更時に自動的に翻訳を更新
 */
export function useTranslation() {
  // i18nStore.currentLanguageの変更を監視してリアクティブに翻訳を更新
  const currentLanguage = $derived(i18nStore.currentLanguage);
  
  // 翻訳オブジェクトを個別に定義
  const translationObject = $derived({
    /**
     * 翻訳関数（パラメータなし）
     */
    t: (key: keyof typeof messages): string => {
      // 現在の言語を強制的に参照してリアクティブに
      const _ = currentLanguage;
      
      const messageFunction = messages[key] as TranslationFunction;
      if (typeof messageFunction === 'function') {
        try {
          return messageFunction();
        } catch (error) {
          console.warn(`Translation error for key "${String(key)}":`, error);
          return String(key);
        }
      }
      
      console.warn(`Translation key not found: ${String(key)}`);
      return String(key);
    },
    
    /**
     * 翻訳関数（パラメータあり）
     */
    tp: (key: keyof typeof messages, params: Record<string, any> = {}): string => {
      // 現在の言語を強制的に参照してリアクティブに
      const _ = currentLanguage;
      
      const messageFunction = messages[key] as TranslationFunction;
      if (typeof messageFunction === 'function') {
        try {
          return messageFunction(params);
        } catch (error) {
          console.warn(`Translation error for key "${String(key)}":`, error);
          return String(key);
        }
      }
      
      console.warn(`Translation key not found: ${String(key)}`);
      return String(key);
    },
    
    /**
     * 現在の言語
     */
    currentLanguage: currentLanguage
  });
  
  return translationObject;
}

/**
 * グローバルリアクティブ翻訳インスタンス
 * コンポーネント間で共有される翻訳オブジェクト
 */
class ReactiveTranslationStore {
  private state = $state({
    forceUpdate: 0 // リアクティブ更新を強制するフラグ
  });

  /**
   * 翻訳の強制更新をトリガー
   */
  forceUpdate(): void {
    this.state.forceUpdate++;
  }

  /**
   * リアクティブ翻訳オブジェクトを取得
   */
  getTranslations() {
    // i18nStoreの変更とforceUpdateを監視
    const currentLanguage = $derived(i18nStore.currentLanguage);
    const updateFlag = $derived(this.state.forceUpdate);
    
    // 翻訳オブジェクトを個別に定義
    const translationObject = $derived({
      /**
       * 翻訳関数（パラメータなし）
       */
      t: (key: keyof typeof messages): string => {
        // リアクティブ依存関係を確立
        const _ = currentLanguage;
        const __ = updateFlag;
        
        const messageFunction = messages[key] as TranslationFunction;
        if (typeof messageFunction === 'function') {
          try {
            return messageFunction();
          } catch (error) {
            console.warn(`Translation error for key "${String(key)}":`, error);
            return String(key);
          }
        }
        
        console.warn(`Translation key not found: ${String(key)}`);
        return String(key);
      },
      
      /**
       * 翻訳関数（パラメータあり）
       */
      tp: (key: keyof typeof messages, params: Record<string, any> = {}): string => {
        // リアクティブ依存関係を確立
        const _ = currentLanguage;
        const __ = updateFlag;
        
        const messageFunction = messages[key] as TranslationFunction;
        if (typeof messageFunction === 'function') {
          try {
            return messageFunction(params);
          } catch (error) {
            console.warn(`Translation error for key "${String(key)}":`, error);
            return String(key);
          }
        }
        
        console.warn(`Translation key not found: ${String(key)}`);
        return String(key);
      },
      
      /**
       * 現在の言語
       */
      currentLanguage: currentLanguage
    });
    
    return translationObject;
  }
}

/**
 * グローバル翻訳ストア
 */
export const reactiveTranslation = new ReactiveTranslationStore();

/**
 * 便利関数: リアクティブ翻訳を取得
 */
export function getReactiveTranslations() {
  return reactiveTranslation.getTranslations();
}

/**
 * 便利関数: 翻訳更新を強制
 */
export function forceTranslationUpdate(): void {
  reactiveTranslation.forceUpdate();
}