import { writable, type Writable } from 'svelte/store';
import { get } from 'svelte/store';
import { databaseStore, type DbUserPreferences } from './database';
import { currentUser } from './auth';

// ユーザー設定の型定義
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'ja' | 'en' | 'pt-BR' | 'ko' | 'de';
  notifications_enabled: boolean;
  auto_refresh_interval: number; // seconds
  pds_settings?: {
    default_pds_url: string;
    remember_pds: boolean;
    pds_history: string[];
    trusted_pds_list: string[];
  };
  deck_settings?: {
    column_width: number;
    max_columns: number;
    auto_scroll: boolean;
    show_avatars: boolean;
    compact_mode: boolean;
  };
  privacy_settings?: {
    analytics_enabled: boolean;
    crash_reports_enabled: boolean;
    remember_login: boolean;
  };
  accessibility?: {
    high_contrast: boolean;
    large_text: boolean;
    reduced_motion: boolean;
  };
}

// デフォルト設定
const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  language: 'ja',
  notifications_enabled: true,
  auto_refresh_interval: 30,
  pds_settings: {
    default_pds_url: 'https://bsky.social',
    remember_pds: true,
    pds_history: ['https://bsky.social'],
    trusted_pds_list: [
      'https://bsky.social',
      'https://staging.bsky.dev'
    ]
  },
  deck_settings: {
    column_width: 320,
    max_columns: 5,
    auto_scroll: true,
    show_avatars: true,
    compact_mode: false
  },
  privacy_settings: {
    analytics_enabled: false,
    crash_reports_enabled: true,
    remember_login: true
  },
  accessibility: {
    high_contrast: false,
    large_text: false,
    reduced_motion: false
  }
};

// 設定状態の管理
export const userSettings: Writable<UserSettings> = writable(DEFAULT_SETTINGS);
export const settingsLoading: Writable<boolean> = writable(false);
export const settingsError: Writable<string | null> = writable(null);

/**
 * 現在のユーザーの設定をデータベースから読み込み
 */
export async function loadUserSettings(): Promise<{ success: boolean; error?: string }> {
  settingsLoading.set(true);
  settingsError.set(null);

  try {
    const user = get(currentUser);
    if (!user || !user.account_id) {
      // ユーザーが認証されていない場合はデフォルト設定を使用
      userSettings.set(DEFAULT_SETTINGS);
      return { success: true };
    }

    const result = await databaseStore.getUserPreferences(user.account_id);
    
    if (result.success && result.data) {
      // データベースから設定を復元
      const dbPrefs = result.data;
      const additionalSettings = dbPrefs.preferences_json 
        ? JSON.parse(dbPrefs.preferences_json) 
        : {};

      const settings: UserSettings = {
        theme: dbPrefs.theme,
        language: dbPrefs.language,
        notifications_enabled: dbPrefs.notifications_enabled,
        auto_refresh_interval: dbPrefs.auto_refresh_interval,
        pds_settings: additionalSettings.pds_settings || DEFAULT_SETTINGS.pds_settings,
        deck_settings: additionalSettings.deck_settings || DEFAULT_SETTINGS.deck_settings,
        privacy_settings: additionalSettings.privacy_settings || DEFAULT_SETTINGS.privacy_settings,
        accessibility: additionalSettings.accessibility || DEFAULT_SETTINGS.accessibility
      };

      userSettings.set(settings);
      return { success: true };
    } else {
      // データベースに設定がない場合はデフォルト設定を保存
      await saveUserSettings(DEFAULT_SETTINGS);
      userSettings.set(DEFAULT_SETTINGS);
      return { success: true };
    }
  } catch (error) {
    console.error('Load user settings error:', error);
    const errorMsg = `設定読み込みエラー: ${error}`;
    settingsError.set(errorMsg);
    return { success: false, error: errorMsg };
  } finally {
    settingsLoading.set(false);
  }
}

/**
 * ユーザー設定をデータベースに保存
 */
export async function saveUserSettings(settings: UserSettings): Promise<{ success: boolean; error?: string }> {
  settingsLoading.set(true);
  settingsError.set(null);

  try {
    const user = get(currentUser);
    if (!user || !user.account_id) {
      return { success: false, error: 'ユーザーが認証されていません' };
    }

    // 追加設定をJSONとして保存
    const additionalSettings = {
      pds_settings: settings.pds_settings,
      deck_settings: settings.deck_settings,
      privacy_settings: settings.privacy_settings,
      accessibility: settings.accessibility
    };

    const dbPreferences: Omit<DbUserPreferences, 'created_at' | 'updated_at'> = {
      account_id: user.account_id,
      theme: settings.theme,
      language: settings.language,
      notifications_enabled: settings.notifications_enabled,
      auto_refresh_interval: settings.auto_refresh_interval,
      preferences_json: JSON.stringify(additionalSettings)
    };

    const result = await databaseStore.upsertUserPreferences(dbPreferences);
    
    if (result.success) {
      userSettings.set(settings);
      return { success: true };
    } else {
      settingsError.set(result.error || '設定保存に失敗しました');
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Save user settings error:', error);
    const errorMsg = `設定保存エラー: ${error}`;
    settingsError.set(errorMsg);
    return { success: false, error: errorMsg };
  } finally {
    settingsLoading.set(false);
  }
}

/**
 * 特定の設定項目を更新
 */
export async function updateSetting<K extends keyof UserSettings>(
  key: K, 
  value: UserSettings[K]
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentSettings = get(userSettings);
    const newSettings = { ...currentSettings, [key]: value };
    return await saveUserSettings(newSettings);
  } catch (error) {
    console.error('Update setting error:', error);
    return { success: false, error: `設定更新エラー: ${error}` };
  }
}

/**
 * テーマ設定を更新
 */
export async function updateTheme(theme: 'light' | 'dark' | 'system'): Promise<{ success: boolean; error?: string }> {
  return await updateSetting('theme', theme);
}

/**
 * 言語設定を更新
 */
export async function updateLanguage(language: 'ja' | 'en' | 'pt-BR' | 'ko' | 'de'): Promise<{ success: boolean; error?: string }> {
  return await updateSetting('language', language);
}

/**
 * 通知設定を更新
 */
export async function updateNotifications(enabled: boolean): Promise<{ success: boolean; error?: string }> {
  return await updateSetting('notifications_enabled', enabled);
}

/**
 * 自動更新間隔を更新
 */
export async function updateAutoRefreshInterval(interval: number): Promise<{ success: boolean; error?: string }> {
  return await updateSetting('auto_refresh_interval', interval);
}

/**
 * デッキ設定を更新
 */
export async function updateDeckSettings(deckSettings: UserSettings['deck_settings']): Promise<{ success: boolean; error?: string }> {
  return await updateSetting('deck_settings', deckSettings);
}

/**
 * プライバシー設定を更新
 */
export async function updatePrivacySettings(privacySettings: UserSettings['privacy_settings']): Promise<{ success: boolean; error?: string }> {
  return await updateSetting('privacy_settings', privacySettings);
}

/**
 * アクセシビリティ設定を更新
 */
export async function updateAccessibilitySettings(accessibilitySettings: UserSettings['accessibility']): Promise<{ success: boolean; error?: string }> {
  return await updateSetting('accessibility', accessibilitySettings);
}

/**
 * 設定をデフォルトにリセット
 */
export async function resetUserSettings(): Promise<{ success: boolean; error?: string }> {
  return await saveUserSettings(DEFAULT_SETTINGS);
}

/**
 * 設定エラーをクリア
 */
export function clearSettingsError(): void {
  settingsError.set(null);
}

/**
 * 設定をエクスポート（JSON形式）
 */
export function exportSettings(): string {
  const settings = get(userSettings);
  return JSON.stringify(settings, null, 2);
}

/**
 * 設定をインポート（JSON形式）
 */
export async function importSettings(settingsJson: string): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = JSON.parse(settingsJson) as UserSettings;
    
    // 基本的なバリデーション
    if (!settings.theme || !settings.language) {
      return { success: false, error: '無効な設定形式です' };
    }
    
    return await saveUserSettings(settings);
  } catch (error) {
    console.error('Import settings error:', error);
    return { success: false, error: `設定インポートエラー: ${error}` };
  }
}

// PDS設定専用の管理関数

/**
 * PDS URLをバリデーション
 */
export function validatePdsUrl(url: string): { valid: boolean; error?: string } {
  try {
    const pdsUrl = new URL(url);
    
    // HTTPSのみ許可
    if (pdsUrl.protocol !== 'https:') {
      return { valid: false, error: 'HTTPS URLのみ対応しています' };
    }
    
    // 基本的なドメイン形式チェック
    if (!pdsUrl.hostname.includes('.')) {
      return { valid: false, error: '有効なドメイン名を入力してください' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: '有効なURLを入力してください' };
  }
}

/**
 * PDS設定を更新
 */
export async function updatePdsSettings(pdsSettings: UserSettings['pds_settings']): Promise<{ success: boolean; error?: string }> {
  return await updateSetting('pds_settings', pdsSettings);
}

/**
 * PDS履歴にURLを追加
 */
export async function addPdsToHistory(pdsUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const validation = validatePdsUrl(pdsUrl);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const currentSettings = get(userSettings);
    const pdsSettings = currentSettings.pds_settings || DEFAULT_SETTINGS.pds_settings!;
    
    // 重複を除去し、新しいURLを先頭に追加
    const newHistory = [pdsUrl, ...pdsSettings.pds_history.filter(url => url !== pdsUrl)];
    
    // 履歴は最大10件まで
    if (newHistory.length > 10) {
      newHistory.splice(10);
    }
    
    const newPdsSettings = {
      ...pdsSettings,
      pds_history: newHistory
    };
    
    return await updatePdsSettings(newPdsSettings);
  } catch (error) {
    console.error('Add PDS to history error:', error);
    return { success: false, error: `PDS履歴追加エラー: ${error}` };
  }
}

/**
 * デフォルトPDS URLを設定
 */
export async function setDefaultPdsUrl(pdsUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const validation = validatePdsUrl(pdsUrl);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const currentSettings = get(userSettings);
    const pdsSettings = currentSettings.pds_settings || DEFAULT_SETTINGS.pds_settings!;
    
    const newPdsSettings = {
      ...pdsSettings,
      default_pds_url: pdsUrl
    };
    
    // 履歴にも追加
    await addPdsToHistory(pdsUrl);
    
    return await updatePdsSettings(newPdsSettings);
  } catch (error) {
    console.error('Set default PDS URL error:', error);
    return { success: false, error: `デフォルトPDS設定エラー: ${error}` };
  }
}

/**
 * PDS履歴をクリア
 */
export async function clearPdsHistory(): Promise<{ success: boolean; error?: string }> {
  try {
    const currentSettings = get(userSettings);
    const pdsSettings = currentSettings.pds_settings || DEFAULT_SETTINGS.pds_settings!;
    
    const newPdsSettings = {
      ...pdsSettings,
      pds_history: ['https://bsky.social'] // bsky.socialのみ残す
    };
    
    return await updatePdsSettings(newPdsSettings);
  } catch (error) {
    console.error('Clear PDS history error:', error);
    return { success: false, error: `PDS履歴クリアエラー: ${error}` };
  }
}

/**
 * 現在のデフォルトPDS URLを取得
 */
export function getCurrentDefaultPds(): string {
  const settings = get(userSettings);
  return settings.pds_settings?.default_pds_url || 'https://bsky.social';
}

/**
 * PDS履歴を取得
 */
export function getPdsHistory(): string[] {
  const settings = get(userSettings);
  return settings.pds_settings?.pds_history || ['https://bsky.social'];
}