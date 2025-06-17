import type { ThemeSettings, ThemeMode } from '../types/theme.js';
import { DEFAULT_THEME_SETTINGS } from '../types/theme.js';
import { themeStoreService } from '../services/themeStore.js';

/**
 * Svelte 5 $state runesを使ったテーマストア
 * コンポーネント間でのリアクティブなテーマ状態管理
 */
class ThemeStore {
  /** 現在のテーマ設定 */
  settings = $state<ThemeSettings>(DEFAULT_THEME_SETTINGS);

  /** 現在適用されているテーマ */
  currentTheme = $state<'light' | 'dark' | 'high-contrast'>('light');

  /** 初期化状態 */
  isInitialized = $state<boolean>(false);

  /** ローディング状態 */
  isLoading = $state<boolean>(false);

  /** エラー状態 */
  error = $state<string | null>(null);

  /** システムテーマ変更の監視 */
  private systemMediaQuery?: MediaQueryList;
  private highContrastMediaQuery?: MediaQueryList;

  constructor() {
    // ブラウザ環境でのみシステム監視を初期化
    if (typeof window !== 'undefined') {
      this.initializeSystemThemeWatcher();
    }
  }

  /**
   * システムテーマ変更の監視を初期化
   */
  private initializeSystemThemeWatcher(): void {
    // ダークモード監視
    this.systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemMediaQuery.addEventListener('change', () => {
      this.onSystemThemeChange();
    });

    // ハイコントラスト監視
    this.highContrastMediaQuery = window.matchMedia('(prefers-contrast: high)');
    this.highContrastMediaQuery.addEventListener('change', () => {
      this.onSystemThemeChange();
    });
  }

  /**
   * システムテーマ変更時の処理
   */
  private async onSystemThemeChange(): Promise<void> {
    // システムモードまたは自動スケジュール有効時のみ反応
    if (this.settings.mode === 'system' || this.settings.autoSchedule.enabled) {
      await this.updateCurrentTheme();
    }
  }

  /**
   * ストアを初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      // 保存された設定を読み込み
      const settingsResult = await themeStoreService.loadThemeSettings();
      if (settingsResult.success && settingsResult.data) {
        this.settings = settingsResult.data;
      }

      // 現在のテーマを解決・適用
      await this.updateCurrentTheme();

      this.isInitialized = true;
    } catch (error) {
      this.error = `Failed to initialize theme store: ${error}`;
      console.error('Theme store initialization error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 現在のテーマを更新
   */
  async updateCurrentTheme(): Promise<void> {
    try {
      const themeResult = await themeStoreService.resolveCurrentTheme();
      if (themeResult.success && themeResult.data) {
        this.currentTheme = themeResult.data;
        this.applyThemeToDOM();
      } else {
        console.warn('Failed to resolve current theme:', themeResult.error);
      }
    } catch (error) {
      console.error('Failed to update current theme:', error);
    }
  }

  /**
   * DOMにテーマを適用（TailwindCSS v4対応: data-theme主体 + レガシー互換）
   */
  private applyThemeToDOM(): void {
    if (typeof document === 'undefined') return;

    const html = document.documentElement;
    
    // 全テーマクラス・属性をリセット
    html.classList.remove('light', 'dark', 'high-contrast');
    html.removeAttribute('data-theme');
    
    // TailwindCSS v4新architecture: data-theme属性がメイン制御
    switch (this.currentTheme) {
      case 'light':
        // data-theme="sky": ライト背景 + 空色アクセント
        html.setAttribute('data-theme', 'sky');
        html.classList.add('light'); // レガシー互換性
        break;
        
      case 'dark':
        // data-theme="sunset": ダーク背景 + 夕焼けオレンジアクセント  
        html.setAttribute('data-theme', 'sunset');
        html.classList.add('dark'); // レガシー互換性
        break;
        
      case 'high-contrast':
        // .high-contrast: 純粋なクラス制御、data-theme不使用
        html.classList.add('high-contrast');
        // data-theme属性は設定しない（CSS変数は.high-contrastで制御）
        break;
    }
    
    // アニメーション設定を適用
    if (this.settings.animations) {
      html.classList.add('theme-transitions');
    } else {
      html.classList.remove('theme-transitions');
    }

    // デバッグログ（開発時のみ）
    if (import.meta.env?.DEV) {
      console.log(`[ThemeStore] Applied theme: ${this.currentTheme}`, {
        dataTheme: html.getAttribute('data-theme'),
        classes: Array.from(html.classList),
        settings: this.settings
      });
    }
  }

  /**
   * テーマモードを変更
   */
  async setThemeMode(mode: ThemeMode): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      // 設定を更新
      this.settings = {
        ...this.settings,
        mode,
      };

      // 永続化
      const saveResult = await themeStoreService.saveThemeSettings(this.settings);
      if (!saveResult.success) {
        throw new Error(saveResult.error?.message || 'Failed to save theme settings');
      }

      // 現在のテーマを更新
      await this.updateCurrentTheme();
    } catch (error) {
      this.error = `Failed to set theme mode: ${error}`;
      console.error('Theme mode change error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * アニメーション設定を切り替え
   */
  async toggleAnimations(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      this.settings = {
        ...this.settings,
        animations: !this.settings.animations,
      };

      const saveResult = await themeStoreService.saveThemeSettings(this.settings);
      if (!saveResult.success) {
        throw new Error(saveResult.error?.message || 'Failed to save animation settings');
      }

      // DOM に即座に反映
      this.applyThemeToDOM();
    } catch (error) {
      this.error = `Failed to toggle animations: ${error}`;
      console.error('Animation toggle error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 自動スケジュール設定を更新
   */
  async updateAutoSchedule(schedule: Partial<ThemeSettings['autoSchedule']>): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      this.settings = {
        ...this.settings,
        autoSchedule: {
          ...this.settings.autoSchedule,
          ...schedule,
        },
      };

      const saveResult = await themeStoreService.saveThemeSettings(this.settings);
      if (!saveResult.success) {
        throw new Error(saveResult.error?.message || 'Failed to save schedule settings');
      }

      // システムモードで自動スケジュールが有効な場合は即座に更新
      if (this.settings.mode === 'system' && this.settings.autoSchedule.enabled) {
        await this.updateCurrentTheme();
      }
    } catch (error) {
      this.error = `Failed to update auto schedule: ${error}`;
      console.error('Auto schedule update error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * テーマ設定をリセット
   */
  async resetToDefaults(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      this.settings = { ...DEFAULT_THEME_SETTINGS };

      const saveResult = await themeStoreService.saveThemeSettings(this.settings);
      if (!saveResult.success) {
        throw new Error(saveResult.error?.message || 'Failed to reset theme settings');
      }

      await this.updateCurrentTheme();
    } catch (error) {
      this.error = `Failed to reset theme settings: ${error}`;
      console.error('Theme reset error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * エラーをクリア
   */
  clearError(): void {
    this.error = null;
  }

  /**
   * 現在のテーマが指定されたテーマかどうかを判定
   */
  isCurrentTheme(theme: 'light' | 'dark' | 'high-contrast'): boolean {
    return this.currentTheme === theme;
  }

  /**
   * 現在のモードが指定されたモードかどうかを判定
   */
  isCurrentMode(mode: ThemeMode): boolean {
    return this.settings.mode === mode;
  }

  /**
   * クリーンアップ（コンポーネントアンマウント時）
   */
  destroy(): void {
    if (this.systemMediaQuery) {
      this.systemMediaQuery.removeEventListener('change', this.onSystemThemeChange);
    }
    if (this.highContrastMediaQuery) {
      this.highContrastMediaQuery.removeEventListener('change', this.onSystemThemeChange);
    }
  }
}

// シングルトンインスタンス
export const themeStore = new ThemeStore();