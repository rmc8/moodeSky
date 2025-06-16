import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  validatePdsUrl,
  addPdsToHistory,
  setDefaultPdsUrl,
  getCurrentDefaultPds,
  getPdsHistory,
  clearPdsHistory,
  userSettings,
  type UserSettings
} from './settings';
import { mockDatabaseCommands, mockTauriCommand } from '../test/helpers';

// データベースストアのモック
vi.mock('./database', () => ({
  databaseStore: {
    getUserPreferences: vi.fn().mockResolvedValue(null),
    upsertUserPreferences: vi.fn().mockResolvedValue({ success: true })
  }
}));

// 認証ストアのモック
vi.mock('./auth', () => ({
  currentUser: {
    subscribe: vi.fn(() => () => {}),
  }
}));

describe('PDS URL バリデーション', () => {
  describe('validatePdsUrl', () => {
    it('有効なHTTPS URLを受け入れる', () => {
      const result = validatePdsUrl('https://bsky.social');
      expect(result).toEqual({ valid: true });
    });

    it('有効なHTTPS URLを受け入れる（サブドメイン付き）', () => {
      const result = validatePdsUrl('https://pds.example.com');
      expect(result).toEqual({ valid: true });
    });

    it('HTTP URLを拒否する', () => {
      const result = validatePdsUrl('http://bsky.social');
      expect(result).toEqual({
        valid: false,
        error: 'HTTPS URLのみ対応しています'
      });
    });

    it('不正なURL形式を拒否する', () => {
      const result = validatePdsUrl('not-a-url');
      expect(result).toEqual({
        valid: false,
        error: '有効なURLを入力してください'
      });
    });

    it('ドメイン形式不正を拒否する', () => {
      const result = validatePdsUrl('https://localhost');
      expect(result).toEqual({
        valid: false,
        error: '有効なドメイン名を入力してください'
      });
    });

    it('空文字列を拒否する', () => {
      const result = validatePdsUrl('');
      expect(result).toEqual({
        valid: false,
        error: '有効なURLを入力してください'
      });
    });
  });
});

describe('PDS履歴管理', () => {
  beforeEach(() => {
    // ストアをリセット
    userSettings.set({
      theme: 'system',
      language: 'ja',
      notifications_enabled: true,
      auto_refresh_interval: 30,
      pds_settings: {
        default_pds_url: 'https://bsky.social',
        remember_pds: true,
        pds_history: ['https://bsky.social'],
        trusted_pds_list: ['https://bsky.social', 'https://staging.bsky.dev']
      }
    });

    // データベースモックのセットアップ
    mockDatabaseCommands();
  });

  describe('getCurrentDefaultPds', () => {
    it('デフォルトPDS URLを返す', () => {
      const result = getCurrentDefaultPds();
      expect(result).toBe('https://bsky.social');
    });

    it('設定がない場合はフォールバック値を返す', () => {
      userSettings.set({
        theme: 'system',
        language: 'ja',
        notifications_enabled: true,
        auto_refresh_interval: 30
      });
      
      const result = getCurrentDefaultPds();
      expect(result).toBe('https://bsky.social');
    });
  });

  describe('getPdsHistory', () => {
    it('PDS履歴を返す', () => {
      const result = getPdsHistory();
      expect(result).toEqual(['https://bsky.social']);
    });

    it('設定がない場合はデフォルト履歴を返す', () => {
      userSettings.set({
        theme: 'system',
        language: 'ja',
        notifications_enabled: true,
        auto_refresh_interval: 30
      });
      
      const result = getPdsHistory();
      expect(result).toEqual(['https://bsky.social']);
    });
  });

  describe('addPdsToHistory', () => {
    it('有効なPDS URLを履歴に追加する', async () => {
      const result = await addPdsToHistory('https://custom.example.com');
      expect(result.success).toBe(true);
      
      const settings = get(userSettings);
      expect(settings.pds_settings?.pds_history).toContain('https://custom.example.com');
    });

    it('重複するURLは履歴の先頭に移動する', async () => {
      // 既存のURLを再度追加
      const result = await addPdsToHistory('https://bsky.social');
      expect(result.success).toBe(true);
      
      const settings = get(userSettings);
      const history = settings.pds_settings?.pds_history || [];
      expect(history[0]).toBe('https://bsky.social');
      expect(history.filter(url => url === 'https://bsky.social')).toHaveLength(1);
    });

    it('不正なURLは拒否する', async () => {
      const result = await addPdsToHistory('http://insecure.com');
      expect(result.success).toBe(false);
      expect(result.error).toBe('HTTPS URLのみ対応しています');
    });

    it('履歴が10件を超える場合は古いものを削除する', async () => {
      // 10件のURLを追加
      for (let i = 1; i <= 10; i++) {
        await addPdsToHistory(`https://test${i}.example.com`);
      }
      
      // 11件目を追加
      await addPdsToHistory('https://test11.example.com');
      
      const settings = get(userSettings);
      const history = settings.pds_settings?.pds_history || [];
      expect(history).toHaveLength(10);
      expect(history[0]).toBe('https://test11.example.com');
    });
  });

  describe('setDefaultPdsUrl', () => {
    it('有効なURLをデフォルトに設定する', async () => {
      const result = await setDefaultPdsUrl('https://custom.example.com');
      expect(result.success).toBe(true);
      
      const defaultPds = getCurrentDefaultPds();
      expect(defaultPds).toBe('https://custom.example.com');
    });

    it('デフォルト設定時に履歴にも追加される', async () => {
      await setDefaultPdsUrl('https://custom.example.com');
      
      const history = getPdsHistory();
      expect(history).toContain('https://custom.example.com');
    });

    it('不正なURLは拒否する', async () => {
      const result = await setDefaultPdsUrl('invalid-url');
      expect(result.success).toBe(false);
      expect(result.error).toBe('有効なURLを入力してください');
    });
  });

  describe('clearPdsHistory', () => {
    it('履歴をクリアしてbsky.socialのみ残す', async () => {
      // 複数のURLを追加
      await addPdsToHistory('https://custom1.example.com');
      await addPdsToHistory('https://custom2.example.com');
      
      // 履歴をクリア
      const result = await clearPdsHistory();
      expect(result.success).toBe(true);
      
      const history = getPdsHistory();
      expect(history).toEqual(['https://bsky.social']);
    });
  });
});

describe('設定データの整合性', () => {
  it('無効なPDS設定でもアプリがクラッシュしない', () => {
    // 不正なデータを設定
    userSettings.set({
      theme: 'system',
      language: 'ja',
      notifications_enabled: true,
      auto_refresh_interval: 30,
      pds_settings: undefined
    });
    
    // エラーが発生しないことを確認
    expect(() => getCurrentDefaultPds()).not.toThrow();
    expect(() => getPdsHistory()).not.toThrow();
    
    // フォールバック値が返されることを確認
    expect(getCurrentDefaultPds()).toBe('https://bsky.social');
    expect(getPdsHistory()).toEqual(['https://bsky.social']);
  });
});