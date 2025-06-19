/**
 * i18n Svelte 5 Store
 * リアクティブな多言語対応ストア
 */

import { i18nService, detectSystemLanguage } from '../services/i18nService.js';
import { overwriteGetLocale, overwriteSetLocale, setLocale as paraglidSetLocale } from '../../paraglide/runtime.js';
import { setCurrentLanguage } from '../utils/i18nHelper.js';
import type { 
  SupportedLanguage, 
  LanguageDetectionResult, 
  I18nConfig,
  StoredLanguagePreference
} from '../types/i18n.js';

/**
 * i18nストアの状態
 */
interface I18nState {
  /** 現在の言語 */
  currentLanguage: SupportedLanguage;
  /** システム言語 */
  systemLanguage: SupportedLanguage;
  /** 言語検出結果 */
  detectionResult: LanguageDetectionResult | null;
  /** 初期化済みフラグ */
  isInitialized: boolean;
  /** 初期化中フラグ */
  isLoading: boolean;
  /** エラー情報 */
  error: string | null;
}

/**
 * i18nストアクラス
 */
class I18nStore {
  // Svelte 5 runes を使用したリアクティブ状態
  private state = $state<I18nState>({
    currentLanguage: 'en',
    systemLanguage: 'en',
    detectionResult: null,
    isInitialized: false,
    isLoading: false,
    error: null
  });

  /**
   * 現在の言語（読み取り専用）
   */
  get currentLanguage(): SupportedLanguage {
    return this.state.currentLanguage;
  }

  /**
   * システム言語（読み取り専用）
   */
  get systemLanguage(): SupportedLanguage {
    return this.state.systemLanguage;
  }

  /**
   * 言語検出結果（読み取り専用）
   */
  get detectionResult(): LanguageDetectionResult | null {
    return this.state.detectionResult;
  }

  /**
   * 初期化済みフラグ（読み取り専用）
   */
  get isInitialized(): boolean {
    return this.state.isInitialized;
  }

  /**
   * 初期化中フラグ（読み取り専用）
   */
  get isLoading(): boolean {
    return this.state.isLoading;
  }

  /**
   * エラー情報（読み取り専用）
   */
  get error(): string | null {
    return this.state.error;
  }

  /**
   * i18nシステムを初期化
   */
  async initialize(): Promise<void> {
    if (this.state.isInitialized || this.state.isLoading) {
      return;
    }

    this.state.isLoading = true;
    this.state.error = null;

    try {
      console.log('Initializing i18n store...');

      // Paraglide-JSランタイムを設定
      this.setupParaglideRuntime();

      // 言語の優先順位検出: Stored → OS → Fallback
      let finalLanguage: SupportedLanguage = 'en';
      let detectionResult: LanguageDetectionResult;

      // 1. 保存された言語設定を確認
      const storedLanguage = await this.loadLanguagePreference();
      if (storedLanguage) {
        finalLanguage = storedLanguage;
        detectionResult = {
          language: storedLanguage,
          source: 'stored',
          originalLocale: undefined
        };
        console.log('Using stored language preference:', storedLanguage);
      } else {
        // 2. システム言語検出
        const systemDetection = await detectSystemLanguage();
        finalLanguage = systemDetection.language;
        detectionResult = systemDetection;
        console.log('Using system language detection:', systemDetection);
      }

      // 状態を更新
      this.state.currentLanguage = finalLanguage;
      this.state.systemLanguage = detectionResult.source === 'stored' 
        ? (await detectSystemLanguage()).language 
        : finalLanguage;
      this.state.detectionResult = detectionResult;
      this.state.isInitialized = true;

      // i18nHelper の現在言語を同期
      setCurrentLanguage(finalLanguage);

      // Paraglide-JSの言語設定
      paraglidSetLocale(finalLanguage, { reload: false });

      console.log('i18n store initialized:', {
        currentLanguage: this.state.currentLanguage,
        systemLanguage: this.state.systemLanguage,
        detectionResult: this.state.detectionResult
      });

      // HTML lang属性を更新
      this.updateHtmlLangAttribute();

    } catch (error) {
      console.error('Failed to initialize i18n store:', error);
      this.state.error = error instanceof Error ? error.message : 'Unknown error';
      
      // エラー時はフォールバック言語を使用
      this.state.currentLanguage = 'en';
      this.state.systemLanguage = 'en';
      setCurrentLanguage('en');
      paraglidSetLocale('en', { reload: false });
      this.updateHtmlLangAttribute();
      
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Paraglide-JSランタイムを設定
   */
  private setupParaglideRuntime(): void {
    // getLocale()をカスタマイズして、ストアの現在の言語を返す
    overwriteGetLocale(() => {
      return this.state.currentLanguage;
    });

    // setLocale()をカスタマイズして、ストアの状態を更新
    overwriteSetLocale((newLocale: string) => {
      this.state.currentLanguage = newLocale as SupportedLanguage;
      this.updateHtmlLangAttribute();
      
      // i18nサービスにも反映
      i18nService.setLanguage(newLocale as SupportedLanguage);
    });
  }

  /**
   * 言語を変更（リアクティブ更新保証）
   */
  async setLanguage(language: SupportedLanguage): Promise<void> {
    if (language === this.state.currentLanguage) {
      return;
    }

    try {
      console.log('🌍 [i18n] Changing language to:', language);

      // 1. i18nサービスに反映
      i18nService.setLanguage(language);

      // 2. Paraglide-JSの言語設定を即座に適用
      paraglidSetLocale(language, { reload: false });

      // 3. 状態を更新（これによりリアクティブな更新がトリガーされる）
      this.state.currentLanguage = language;
      this.state.error = null;

      // 4. i18nHelper の現在言語を同期
      setCurrentLanguage(language);

      // 5. HTML lang属性を更新
      this.updateHtmlLangAttribute();

      // 6. Tauri Storeに設定を保存
      await this.saveLanguagePreference(language);

      // 7. リアクティブ翻訳システムに変更を通知
      this.notifyLanguageChange();

      console.log('🌍 [i18n] Language changed successfully to:', language);
      console.log('🌍 [i18n] Current state:', {
        currentLanguage: this.state.currentLanguage,
        isInitialized: this.state.isInitialized,
        htmlLang: typeof document !== 'undefined' ? document.documentElement.lang : 'N/A'
      });

    } catch (error) {
      console.error('🌍 [i18n] Failed to change language:', error);
      this.state.error = error instanceof Error ? error.message : 'Failed to change language';
    }
  }

  /**
   * 言語変更をリアクティブシステムに通知
   */
  private notifyLanguageChange(): void {
    // グローバルイベントとして言語変更を通知
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('languageChanged', {
        detail: { language: this.state.currentLanguage }
      }));
    }

    // リアクティブ翻訳システムへの通知
    try {
      // 動的インポートでリアクティブ翻訳システムに通知
      import('../utils/reactiveTranslation.svelte.js').then(({ forceTranslationUpdate }) => {
        forceTranslationUpdate();
      });
    } catch (error) {
      console.warn('🌍 [i18n] Could not notify reactive translation system:', error);
    }
  }

  /**
   * システム言語に戻す
   */
  async resetToSystemLanguage(): Promise<void> {
    await this.setLanguage(this.state.systemLanguage);
  }

  /**
   * 言語を再検出
   */
  async redetectLanguage(): Promise<void> {
    try {
      console.log('Re-detecting system language...');

      const detectionResult = await detectSystemLanguage();
      
      this.state.detectionResult = detectionResult;
      this.state.systemLanguage = detectionResult.language;

      // 自動検出が有効な場合は現在の言語も更新
      if (i18nService.getConfig().autoDetect) {
        this.state.currentLanguage = detectionResult.language;
        this.updateHtmlLangAttribute();
      }

      console.log('Language re-detection completed:', detectionResult);

    } catch (error) {
      console.error('Failed to re-detect language:', error);
      this.state.error = error instanceof Error ? error.message : 'Failed to re-detect language';
    }
  }

  /**
   * HTML lang属性を更新
   */
  private updateHtmlLangAttribute(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = this.state.currentLanguage;
      console.log('HTML lang attribute updated to:', this.state.currentLanguage);
    }
  }

  /**
   * 言語設定をTauri Storeに保存
   */
  private async saveLanguagePreference(language: SupportedLanguage): Promise<void> {
    try {
      const { Store } = await import('@tauri-apps/plugin-store');
      const store = await Store.load('settings.json');
      
      const languageData: StoredLanguagePreference = {
        current: language,
        userSelected: true,
        timestamp: new Date().toISOString()
      };
      
      await store.set('language', languageData);
      await store.save();
      
      console.log('Language preference saved successfully:', languageData);
    } catch (error) {
      console.warn('Failed to save language preference:', error);
      // Store失敗時もアプリケーションは継続動作
    }
  }

  /**
   * Tauri Storeから言語設定を読み込み
   */
  private async loadLanguagePreference(): Promise<SupportedLanguage | null> {
    try {
      const { Store } = await import('@tauri-apps/plugin-store');
      const store = await Store.load('settings.json');
      
      const languageData = await store.get<StoredLanguagePreference>('language');
      
      if (languageData && languageData.current && languageData.userSelected) {
        console.log('Language preference loaded successfully:', languageData);
        
        // 言語の有効性を検証
        if (languageData.current in i18nService.getSupportedLanguages()) {
          return languageData.current;
        } else {
          console.warn('Stored language is not supported:', languageData.current);
        }
      }
      
      console.log('No valid stored language preference found');
      return null;
    } catch (error) {
      console.warn('Failed to load language preference:', error);
      return null;
    }
  }

  /**
   * エラーをクリア
   */
  clearError(): void {
    this.state.error = null;
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): object {
    return {
      state: { ...this.state },
      config: i18nService.getConfig(),
      serviceDetectionResult: i18nService.getDetectionResult(),
      storeStatus: {
        hasStore: typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__,
        detectionPriority: 'stored → os → browser → fallback'
      }
    };
  }
}

/**
 * グローバルi18nストア
 */
export const i18nStore = new I18nStore();

/**
 * 便利関数: 現在の言語を取得
 */
export function getCurrentLanguage(): SupportedLanguage {
  return i18nStore.currentLanguage;
}

/**
 * 便利関数: 言語変更
 */
export async function setLanguage(language: SupportedLanguage): Promise<void> {
  await i18nStore.setLanguage(language);
}

/**
 * 便利関数: i18n初期化
 */
export async function initializeI18n(): Promise<void> {
  await i18nStore.initialize();
}

// 型定義の再エクスポート
export type { SupportedLanguage, LanguageDetectionResult, I18nConfig } from '../types/i18n.js';