import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  login,
  logout,
  checkAuthStatus,
  isAuthenticated,
  currentUser,
  authLoading,
  authError,
  clearAuthError
} from './auth';
import { mockTauriCommand, mockTauriCommandError, mockUserData, mockDatabaseCommands } from '../test/helpers';

// データベースストアのモック
vi.mock('./database', () => {
  const mockUserData = {
    account: {
      id: 1,
      handle: 'test.bsky.social',
      did: 'did:plc:test123456789',
      service_url: 'https://bsky.social',
      auth_type: 'app_password',
      display_name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
      is_active: true,
      account_id: 1,
      created_at: '2025-06-16T00:00:00Z',
      updated_at: '2025-06-16T00:00:00Z'
    }
  };
  
  return {
    databaseStore: {
      getAccountByHandle: vi.fn().mockResolvedValue(mockUserData.account),
      createAccount: vi.fn().mockResolvedValue({ success: true, account_id: 1 }),
      updateAccount: vi.fn().mockResolvedValue({ success: true }),
      upsertAccount: vi.fn().mockResolvedValue({ success: true, account_id: 1 }),
      upsertOAuthSession: vi.fn().mockResolvedValue({ success: true }),
      getOAuthSession: vi.fn().mockResolvedValue(null),
      deactivateAccount: vi.fn().mockResolvedValue({ success: true })
    }
  };
});

describe('認証ストア', () => {
  beforeEach(() => {
    // ストア状態をリセット
    isAuthenticated.set(false);
    currentUser.set(null);
    authLoading.set(false);
    authError.set(null);
    
    // データベースモックのセットアップ
    mockDatabaseCommands();
    
    // モックをクリア
    vi.clearAllMocks();
  });

  describe('初期状態', () => {
    it('認証状態が未認証である', () => {
      expect(get(isAuthenticated)).toBe(false);
      expect(get(currentUser)).toBeNull();
      expect(get(authLoading)).toBe(false);
      expect(get(authError)).toBeNull();
    });
  });

  describe('ログイン機能', () => {
    it('正常なログインが成功する', async () => {
      // Tauriコマンドのモック
      mockTauriCommand('login_app_password', {
        success: true,
        account: mockUserData.account,
        session_token: mockUserData.session_token
      });

      const result = await login('test.bsky.social', 'password123', 'https://bsky.social');

      expect(result.success).toBe(true);
      expect(get(isAuthenticated)).toBe(true);
      expect(get(currentUser)).toEqual(mockUserData.account);
      expect(get(authError)).toBeNull();
    });

    it('ログイン中はローディング状態になる', async () => {
      let loadingState = false;
      
      // ローディング状態を監視
      const unsubscribe = authLoading.subscribe(loading => {
        if (loading) loadingState = true;
      });

      mockTauriCommand('login_app_password', {
        success: true,
        account: mockUserData.account,
        session_token: mockUserData.session_token
      });

      await login('test.bsky.social', 'password123', 'https://bsky.social');
      
      expect(loadingState).toBe(true);
      expect(get(authLoading)).toBe(false); // 完了後はfalse
      
      unsubscribe();
    });

    it('ログイン失敗時にエラーメッセージが設定される', async () => {
      mockTauriCommandError('login_app_password', 'Invalid credentials');

      const result = await login('test.bsky.social', 'wrongpassword', 'https://bsky.social');

      expect(result.success).toBe(false);
      expect(get(isAuthenticated)).toBe(false);
      expect(get(currentUser)).toBeNull();
      expect(get(authError)).toContain('ログインに失敗しました');
    });

    it('空のハンドルまたはパスワードでログインを拒否する', async () => {
      const result1 = await login('', 'password123', 'https://bsky.social');
      const result2 = await login('test.bsky.social', '', 'https://bsky.social');

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      expect(get(authError)).toBeTruthy();
    });

    it('無効なPDS URLでログインを拒否する', async () => {
      const result = await login('test.bsky.social', 'password123', 'http://insecure.com');

      expect(result.success).toBe(false);
      expect(get(authError)).toContain('HTTPS');
    });
  });

  describe('ログアウト機能', () => {
    beforeEach(async () => {
      // 事前にログイン状態にする
      mockTauriCommand('login_app_password', {
        success: true,
        account: mockUserData.account,
        session_token: mockUserData.session_token
      });
      await login('test.bsky.social', 'password123', 'https://bsky.social');
    });

    it('正常なログアウトが成功する', async () => {
      mockTauriCommand('logout_account', { success: true });

      const result = await logout();

      expect(result.success).toBe(true);
      expect(get(isAuthenticated)).toBe(false);
      expect(get(currentUser)).toBeNull();
      expect(get(authError)).toBeNull();
    });

    it('ログアウト失敗時でもローカル状態はクリアされる', async () => {
      mockTauriCommandError('logout_account', 'Network error');

      const result = await logout();

      // バックエンドエラーでもフロントエンド状態はクリア
      expect(get(isAuthenticated)).toBe(false);
      expect(get(currentUser)).toBeNull();
    });
  });

  describe('認証状態確認', () => {
    it('有効なセッションで認証状態を復元する', async () => {
      mockTauriCommand('get_current_session', {
        authenticated: true,
        account: mockUserData.account
      });

      const result = await checkAuthStatus();

      expect(result.authenticated).toBe(true);
      expect(get(isAuthenticated)).toBe(true);
      expect(get(currentUser)).toEqual(mockUserData.account);
    });

    it('無効なセッションで未認証状態になる', async () => {
      mockTauriCommand('get_current_session', {
        authenticated: false,
        account: null
      });

      const result = await checkAuthStatus();

      expect(result.authenticated).toBe(false);
      expect(get(isAuthenticated)).toBe(false);
      expect(get(currentUser)).toBeNull();
    });

    it('セッション確認エラー時は未認証扱いになる', async () => {
      mockTauriCommandError('get_current_session', 'Session check failed');

      const result = await checkAuthStatus();

      expect(result.authenticated).toBe(false);
      expect(get(isAuthenticated)).toBe(false);
      expect(get(currentUser)).toBeNull();
    });
  });

  describe('エラー管理', () => {
    it('clearAuthError でエラーがクリアされる', () => {
      authError.set('テストエラー');
      expect(get(authError)).toBe('テストエラー');

      clearAuthError();
      expect(get(authError)).toBeNull();
    });

    it('新しいログイン試行時に前のエラーがクリアされる', async () => {
      // 最初のエラーを設定
      authError.set('前のエラー');
      expect(get(authError)).toBe('前のエラー');

      // 新しいログイン試行
      mockTauriCommand('login_app_password', {
        success: true,
        account: mockUserData.account,
        session_token: mockUserData.session_token
      });

      await login('test.bsky.social', 'password123', 'https://bsky.social');

      expect(get(authError)).toBeNull();
    });
  });

  describe('データ整合性', () => {
    it('部分的なユーザーデータでもクラッシュしない', async () => {
      const partialUserData = {
        success: true,
        account: {
          handle: 'test.bsky.social',
          did: 'did:plc:test123456789',
          service_url: 'https://bsky.social',
          auth_type: 'app_password',
          is_active: true
          // 他のフィールドは不足
        },
        session_token: 'token123'
      };

      mockTauriCommand('login_app_password', partialUserData);

      expect(async () => {
        await login('test.bsky.social', 'password123', 'https://bsky.social');
      }).not.toThrow();

      expect(get(isAuthenticated)).toBe(true);
      expect(get(currentUser)?.handle).toBe('test.bsky.social');
    });

    it('予期しないレスポンス形式でも適切にエラーハンドリングする', async () => {
      mockTauriCommand('login_app_password', null);

      const result = await login('test.bsky.social', 'password123', 'https://bsky.social');

      expect(result.success).toBe(false);
      expect(get(isAuthenticated)).toBe(false);
      expect(get(authError)).toBeTruthy();
    });
  });
});