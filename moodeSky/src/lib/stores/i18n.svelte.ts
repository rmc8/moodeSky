/**
 * i18n Svelte 5 Store
 * リアクティブな多言語対応ストア
 */

import { i18nService, detectSystemLanguage } from '../services/i18nService.js';
import { overwriteGetLocale, overwriteSetLocale, setLocale as paraglidSetLocale } from '../i18n/paraglide/runtime.js';
import type { 
  SupportedLanguage, 
  LanguageDetectionResult, 
  I18nConfig 
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

      // i18nサービスを初期化
      const config = await i18nService.initialize();
      const detectionResult = i18nService.getDetectionResult();

      // 状態を更新
      this.state.currentLanguage = config.currentLanguage;
      this.state.systemLanguage = config.systemLanguage;
      this.state.detectionResult = detectionResult;
      this.state.isInitialized = true;

      // Paraglide-JSの言語設定
      paraglidSetLocale(config.currentLanguage, { reload: false });

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
    overwriteSetLocale((newLocale) => {
      this.state.currentLanguage = newLocale as SupportedLanguage;
      this.updateHtmlLangAttribute();
      
      // i18nサービスにも反映
      i18nService.setLanguage(newLocale as SupportedLanguage);
    });
  }

  /**
   * 言語を変更
   */
  async setLanguage(language: SupportedLanguage): Promise<void> {
    if (language === this.state.currentLanguage) {
      return;
    }

    try {
      console.log('Changing language to:', language);

      // i18nサービスに反映
      i18nService.setLanguage(language);

      // 状態を更新
      this.state.currentLanguage = language;
      this.state.error = null;

      // Paraglide-JSの言語設定（リロードなし）
      paraglidSetLocale(language, { reload: false });

      // HTML lang属性を更新
      this.updateHtmlLangAttribute();

      // TODO: Tauri Storeに設定を保存
      await this.saveLanguagePreference(language);

      console.log('Language changed successfully to:', language);

    } catch (error) {
      console.error('Failed to change language:', error);
      this.state.error = error instanceof Error ? error.message : 'Failed to change language';
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
      // TODO: Tauri Store統合実装
      // const { Store } = await import('@tauri-apps/plugin-store');
      // const store = await Store.load('settings.json');
      // await store.set('language', language);
      console.log('Language preference saved (placeholder):', language);
    } catch (error) {
      console.warn('Failed to save language preference:', error);
    }
  }

  /**
   * Tauri Storeから言語設定を読み込み
   */
  private async loadLanguagePreference(): Promise<SupportedLanguage | null> {
    try {
      // TODO: Tauri Store統合実装
      // const { Store } = await import('@tauri-apps/plugin-store');
      // const store = await Store.load('settings.json');
      // return await store.get<SupportedLanguage>('language');
      console.log('Language preference loaded (placeholder)');
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
      serviceDetectionResult: i18nService.getDetectionResult()
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