import { Store } from '@tauri-apps/plugin-store';
import type {
  ThemeSettings,
  ThemeResult,
  ThemeError,
  SystemThemeInfo,
  AutoThemeSchedule,
  THEME_STORE_KEYS
} from '../types/theme.js';
import { DEFAULT_THEME_SETTINGS } from '../types/theme.js';

/**
 * Tauri Store Plugin テーマ管理サービス
 * authStore.tsのパターンを踏襲してテーマ設定の永続化を提供
 */
export class ThemeStoreService {
  private readonly STORE_NAME = 'theme.json';
  private store?: Store;

  constructor() {}

  /**
   * Store インスタンスを取得・初期化
   */
  private async getStore(): Promise<Store> {
    if (!this.store) {
      this.store = await Store.load(this.STORE_NAME);
    }
    return this.store;
  }

  /**
   * Store Pluginからデータを読み込み
   */
  private async loadFromStore<T>(key: string): Promise<ThemeResult<T | null>> {
    try {
      const store = await this.getStore();
      const value = await store.get<T>(key);
      return { success: true, data: value };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORE_LOAD_FAILED',
          message: `Failed to load ${key}: ${error}`,
        },
      };
    }
  }

  /**
   * Store Pluginにデータを保存
   */
  private async saveToStore<T>(key: string, value: T): Promise<ThemeResult> {
    try {
      const store = await this.getStore();
      await store.set(key, value);
      await store.save();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORE_SAVE_FAILED',
          message: `Failed to save ${key}: ${error}`,
        },
      };
    }
  }

  /**
   * Store Pluginからキーを削除
   */
  private async deleteFromStore(key: string): Promise<ThemeResult> {
    try {
      const store = await this.getStore();
      await store.delete(key);
      await store.save();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORE_SAVE_FAILED',
          message: `Failed to delete ${key}: ${error}`,
        },
      };
    }
  }

  /**
   * システムのテーマ設定を検出
   */
  private async detectSystemTheme(): Promise<ThemeResult<SystemThemeInfo>> {
    try {
      // CSS Media Query でシステム設定を検出
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isHighContrast = window.matchMedia('(prefers-contrast: high)').matches;

      const systemInfo: SystemThemeInfo = {
        currentTheme: isDark ? 'dark' : 'light',
        highContrast: isHighContrast,
        detectedAt: new Date().toISOString(),
      };

      return { success: true, data: systemInfo };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'SYSTEM_DETECTION_FAILED',
          message: `Failed to detect system theme: ${error}`,
        },
      };
    }
  }

  /**
   * 時間帯スケジュールの検証
   */
  private validateSchedule(schedule: AutoThemeSchedule): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (schedule.lightStart < 0 || schedule.lightStart > 23) {
      errors.push('Light start time must be between 0-23');
    }

    if (schedule.darkStart < 0 || schedule.darkStart > 23) {
      errors.push('Dark start time must be between 0-23');
    }

    if (schedule.lightStart === schedule.darkStart) {
      errors.push('Light and dark start times cannot be the same');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 現在時刻に基づく自動テーマを取得
   */
  private getCurrentAutoTheme(schedule: AutoThemeSchedule): 'light' | 'dark' {
    const now = new Date();
    const currentHour = now.getHours();

    // スケジュールが有効でない場合はライトテーマをデフォルト
    if (!schedule.enabled) {
      return 'light';
    }

    const { lightStart, darkStart } = schedule;

    // ライト開始時刻がダーク開始時刻より小さい場合（通常パターン）
    if (lightStart < darkStart) {
      return (currentHour >= lightStart && currentHour < darkStart) ? 'light' : 'dark';
    }
    // ライト開始時刻がダーク開始時刻より大きい場合（夜間跨ぎパターン）
    else {
      return (currentHour >= lightStart || currentHour < darkStart) ? 'light' : 'dark';
    }
  }

  /**
   * テーマ設定を読み込み
   */
  async loadThemeSettings(): Promise<ThemeResult<ThemeSettings>> {
    const result = await this.loadFromStore<ThemeSettings>('theme_settings');
    if (!result.success) {
      return result as ThemeResult<ThemeSettings>;
    }

    // デフォルト設定とマージ
    const themeSettings: ThemeSettings = {
      ...DEFAULT_THEME_SETTINGS,
      ...result.data,
    };

    return { success: true, data: themeSettings };
  }

  /**
   * テーマ設定を保存
   */
  async saveThemeSettings(settings: ThemeSettings): Promise<ThemeResult> {
    // スケジュール設定の検証
    if (settings.autoSchedule.enabled) {
      const validation = this.validateSchedule(settings.autoSchedule);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            type: 'SCHEDULE_VALIDATION_FAILED',
            message: `Schedule validation failed: ${validation.errors.join(', ')}`,
          },
        };
      }
    }

    // 更新日時を設定
    const updatedSettings: ThemeSettings = {
      ...settings,
      lastUpdatedAt: new Date().toISOString(),
    };

    return await this.saveToStore('theme_settings', updatedSettings);
  }

  /**
   * 現在の適用すべきテーマを解決
   * システム設定・自動スケジュール・手動設定を考慮
   */
  async resolveCurrentTheme(): Promise<ThemeResult<'light' | 'dark' | 'high-contrast'>> {
    try {
      // テーマ設定を読み込み
      const settingsResult = await this.loadThemeSettings();
      if (!settingsResult.success) {
        return {
          success: false,
          error: settingsResult.error,
        } as ThemeResult<'light' | 'dark' | 'high-contrast'>;
      }

      const settings = settingsResult.data!;

      // ハイコントラストモードの場合
      if (settings.mode === 'high-contrast') {
        return { success: true, data: 'high-contrast' };
      }

      // 手動設定の場合
      if (settings.mode === 'light' || settings.mode === 'dark') {
        return { success: true, data: settings.mode };
      }

      // システム設定の場合
      if (settings.mode === 'system') {
        // 自動スケジュールが有効な場合
        if (settings.autoSchedule.enabled) {
          const autoTheme = this.getCurrentAutoTheme(settings.autoSchedule);
          return { success: true, data: autoTheme };
        }

        // システム設定を検出
        const systemResult = await this.detectSystemTheme();
        if (!systemResult.success) {
          // フォールバック: ライトテーマ
          return { success: true, data: 'light' };
        }

        const systemInfo = systemResult.data!;
        
        // ハイコントラストが有効な場合
        if (systemInfo.highContrast) {
          return { success: true, data: 'high-contrast' };
        }

        return { success: true, data: systemInfo.currentTheme };
      }

      // 未知のモード: フォールバック
      return { success: true, data: 'light' };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'SYSTEM_DETECTION_FAILED',
          message: `Failed to resolve current theme: ${error}`,
        },
      };
    }
  }

  /**
   * システムテーマ情報をキャッシュ
   */
  async cacheSystemTheme(): Promise<ThemeResult<SystemThemeInfo>> {
    const systemResult = await this.detectSystemTheme();
    if (!systemResult.success) {
      return systemResult;
    }

    const systemInfo = systemResult.data!;
    const saveResult = await this.saveToStore('system_theme_cache', systemInfo);
    
    if (!saveResult.success) {
      return {
        success: false,
        error: saveResult.error,
      } as ThemeResult<SystemThemeInfo>;
    }

    return { success: true, data: systemInfo };
  }

  /**
   * キャッシュされたシステムテーマ情報を取得
   */
  async getCachedSystemTheme(): Promise<ThemeResult<SystemThemeInfo | null>> {
    return await this.loadFromStore<SystemThemeInfo>('system_theme_cache');
  }

  /**
   * 全テーマデータをクリア
   */
  async clearAll(): Promise<ThemeResult> {
    try {
      await this.deleteFromStore('theme_settings');
      await this.deleteFromStore('system_theme_cache');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORE_SAVE_FAILED',
          message: `Failed to clear theme data: ${error}`,
        },
      };
    }
  }

  /**
   * Store Pluginストアファイルを手動で読み込み
   */
  async loadStore(): Promise<ThemeResult> {
    try {
      await this.getStore(); // Store インスタンスを初期化
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORE_LOAD_FAILED',
          message: `Failed to load theme store: ${error}`,
        },
      };
    }
  }

  /**
   * Store Pluginストアファイルを手動で保存
   */
  async saveStore(): Promise<ThemeResult> {
    try {
      const store = await this.getStore();
      await store.save();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORE_SAVE_FAILED',
          message: `Failed to save theme store: ${error}`,
        },
      };
    }
  }
}

// シングルトンインスタンス
export const themeStoreService = new ThemeStoreService();