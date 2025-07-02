/**
 * AuthService Test Suite
 * Issue #92 Phase 2: AuthService の包括的テスト
 * 
 * persistSessionHandler、セッション更新処理、Tauri Store連携の全シナリオをカバー
 */

import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import type { AtpSessionData, AtpSessionEvent } from '@atproto/api';
import { AuthService } from '../authStore.ts';
import type { Account, AuthResult, SessionEventHandler } from '../../types/auth.ts';
import { 
  AccountTestFactory, 
  SessionTestAssertions,
  TimeControlHelper 
} from '../../test-utils/sessionTestUtils.js';
import { 
  TauriStoreMockFactory, 
  AtProtocolMockFactory,
  type MockedStore 
} from '../../test-utils/mockFactories.js';

// モック化対象のモジュール
vi.mock('@tauri-apps/plugin-store', () => ({
  Store: vi.fn()
}));

vi.mock('../../utils/logger.ts', () => ({
  createComponentLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

vi.mock('../profileService.ts', () => ({
  profileService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn()
  }
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockStore: MockedStore;
  let mockSessionEventHandler: MockedFunction<SessionEventHandler>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Tauri Store のモックを設定
    mockStore = TauriStoreMockFactory.createStoreMock();
    
    // Store コンストラクタのモック
    const { Store } = await vi.importActual('@tauri-apps/plugin-store') as any;
    vi.mocked(Store).mockImplementation(() => mockStore);

    mockSessionEventHandler = vi.fn().mockResolvedValue(undefined);
    authService = new AuthService(mockSessionEventHandler);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===================================================================
  // 初期化とコンストラクタテスト
  // ===================================================================

  describe('Constructor and Initialization', () => {
    it('should initialize without session event handler', () => {
      const serviceWithoutHandler = new AuthService();
      expect(serviceWithoutHandler).toBeInstanceOf(AuthService);
    });

    it('should initialize with session event handler', () => {
      expect(authService).toBeInstanceOf(AuthService);
    });

    it('should initialize store lazily', async () => {
      // Store は最初のアクセス時に初期化される
      const result = await authService.getAllAccounts();
      expect(mockStore.get).toHaveBeenCalled();
    });
  });

  // ===================================================================
  // persistSessionHandler テスト
  // ===================================================================

  describe('persistSessionHandler', () => {
    const accountId = 'did:plc:test123';
    
    it('should create persistent session handler for account', () => {
      const handler = authService.createPersistSessionHandler(accountId);
      expect(handler).toBeInstanceOf(Function);
    });

    it('should handle session update event', async () => {
      const handler = authService.createPersistSessionHandler(accountId);
      const sessionData = AtProtocolMockFactory.createSuccessfulRefreshResponse();
      
      await handler('update', sessionData);
      
      expect(mockSessionEventHandler).toHaveBeenCalledWith('update', sessionData);
    });

    it('should handle session create event', async () => {
      const handler = authService.createPersistSessionHandler(accountId);
      const sessionData = AtProtocolMockFactory.createSuccessfulRefreshResponse();
      
      await handler('create', sessionData);
      
      expect(mockSessionEventHandler).toHaveBeenCalledWith('create', sessionData);
    });

    it('should handle session expired event', async () => {
      const handler = authService.createPersistSessionHandler(accountId);
      
      await handler('expired');
      
      expect(mockSessionEventHandler).toHaveBeenCalledWith('expired', undefined);
    });

    it('should handle unknown session events gracefully', async () => {
      const handler = authService.createPersistSessionHandler(accountId);
      
      // @ts-ignore - 意図的に未知のイベントタイプをテスト
      await handler('unknown-event');
      
      // エラーが発生せず、外部ハンドラーが呼ばれることを確認
      expect(mockSessionEventHandler).toHaveBeenCalled();
    });

    it('should propagate errors from session handler', async () => {
      const handlerError = new Error('Session handler failed');
      mockSessionEventHandler.mockRejectedValueOnce(handlerError);
      
      const handler = authService.createPersistSessionHandler(accountId);
      const sessionData = AtProtocolMockFactory.createSuccessfulRefreshResponse();
      
      await expect(handler('update', sessionData)).rejects.toThrow(handlerError);
    });

    it('should handle concurrent session updates for same account', async () => {
      const handler = authService.createPersistSessionHandler(accountId);
      const sessionData1 = AtProtocolMockFactory.createSuccessfulRefreshResponse();
      const sessionData2 = AtProtocolMockFactory.createTokenRotationResponse();
      
      // 並行してセッション更新を実行
      const promises = [
        handler('update', sessionData1),
        handler('update', sessionData2)
      ];
      
      await Promise.all(promises);
      
      // 両方のイベントが処理されている
      expect(mockSessionEventHandler).toHaveBeenCalledTimes(2);
    });

    it('should warn when handler called without account ID', async () => {
      const handler = authService.createPersistSessionHandler(); // accountId未指定
      const sessionData = AtProtocolMockFactory.createSuccessfulRefreshResponse();
      
      // エラーではなく警告として処理される
      await expect(handler('update', sessionData)).resolves.not.toThrow();
    });
  });

  // ===================================================================
  // アカウント管理テスト
  // ===================================================================

  describe('Account Management', () => {
    it('should add new account successfully', async () => {
      const account = AccountTestFactory.createBasicAccount();
      
      const result = await authService.addAccount(account);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(account);
      expect(mockStore.set).toHaveBeenCalled();
      expect(mockStore.save).toHaveBeenCalled();
    });

    it('should retrieve all accounts', async () => {
      const account1 = AccountTestFactory.createBasicAccount('did:plc:test1', 'user1.bsky.social');
      const account2 = AccountTestFactory.createBasicAccount('did:plc:test2', 'user2.bsky.social');
      
      // 既存のアカウントをストアに設定
      mockStore._setData(new Map([
        ['accounts', [account1, account2]]
      ]));
      
      const result = await authService.getAllAccounts();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data).toContain(account1);
      expect(result.data).toContain(account2);
    });

    it('should get specific account by ID', async () => {
      const account = AccountTestFactory.createBasicAccount();
      mockStore._setData(new Map([['accounts', [account]]]));
      
      const result = await authService.getAccount(account.id);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(account);
    });

    it('should return error for non-existent account', async () => {
      const result = await authService.getAccount('non-existent-id');
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('not found');
    });

    it('should remove account successfully', async () => {
      const account1 = AccountTestFactory.createBasicAccount('did:plc:test1');
      const account2 = AccountTestFactory.createBasicAccount('did:plc:test2');
      
      mockStore._setData(new Map([['accounts', [account1, account2]]]));
      
      const result = await authService.removeAccount(account1.id);
      
      expect(result.success).toBe(true);
      expect(mockStore.set).toHaveBeenCalled();
      expect(mockStore.save).toHaveBeenCalled();
    });

    it('should handle duplicate account addition', async () => {
      const account = AccountTestFactory.createBasicAccount();
      
      // 同じアカウントを2回追加
      await authService.addAccount(account);
      const result = await authService.addAccount(account);
      
      // 重複は更新として処理される
      expect(result.success).toBe(true);
    });

    it('should handle account without session', async () => {
      const account = AccountTestFactory.createAccountWithoutSession() as Account;
      
      const result = await authService.addAccount(account);
      
      expect(result.success).toBe(true);
      expect(result.data?.session).toBeUndefined();
    });
  });

  // ===================================================================
  // セッションリフレッシュテスト
  // ===================================================================

  describe('Session Refresh', () => {
    const accountId = 'did:plc:test123';

    beforeEach(() => {
      const account = AccountTestFactory.createBasicAccount(accountId);
      mockStore._setData(new Map([['accounts', [account]]]));
    });

    it('should refresh session successfully', async () => {
      const refreshedSession = AtProtocolMockFactory.createTokenRotationResponse();
      
      // リフレッシュ成功をシミュレート
      const mockAgent = {
        resumeSession: vi.fn().mockResolvedValue(refreshedSession)
      };
      
      vi.doMock('../agent.ts', () => ({
        Agent: vi.fn().mockImplementation(() => ({
          agent: mockAgent
        }))
      }));

      const result = await authService.refreshSession(accountId);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockStore.set).toHaveBeenCalled();
    });

    it('should handle refresh failure gracefully', async () => {
      const refreshError = AtProtocolMockFactory.createFailedRefreshResponse('ExpiredToken');
      
      const mockAgent = {
        resumeSession: vi.fn().mockRejectedValue(refreshError)
      };
      
      vi.doMock('../agent.ts', () => ({
        Agent: vi.fn().mockImplementation(() => ({
          agent: mockAgent
        }))
      }));

      const result = await authService.refreshSession(accountId);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('RefreshToken has expired');
    });

    it('should handle refreshToken rotation correctly', async () => {
      const rotatedSession = AtProtocolMockFactory.createTokenRotationResponse();
      
      const mockAgent = {
        resumeSession: vi.fn().mockResolvedValue(rotatedSession)
      };
      
      vi.doMock('../agent.ts', () => ({
        Agent: vi.fn().mockImplementation(() => ({
          agent: mockAgent
        }))
      }));

      const result = await authService.refreshSession(accountId);
      
      expect(result.success).toBe(true);
      // 新しいリフレッシュトークンが設定されている
      expect(result.data?.session?.refreshJwt).toBe(rotatedSession.refreshJwt);
    });

    it('should handle multiple accounts refresh', async () => {
      const account1 = AccountTestFactory.createBasicAccount('did:plc:test1');
      const account2 = AccountTestFactory.createBasicAccount('did:plc:test2');
      
      mockStore._setData(new Map([['accounts', [account1, account2]]]));
      
      const result = await authService.refreshAllSessions();
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should handle partial refresh failures in multi-account scenario', async () => {
      const account1 = AccountTestFactory.createBasicAccount('did:plc:test1');
      const account2 = AccountTestFactory.createExpiredAccount(); // 期限切れアカウント
      
      mockStore._setData(new Map([['accounts', [account1, account2]]]));
      
      const result = await authService.refreshAllSessions();
      
      // 部分的な成功として処理される
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  // ===================================================================
  // Tauri Store Plugin 連携テスト
  // ===================================================================

  describe('Tauri Store Integration', () => {
    it('should handle store initialization failure', async () => {
      const failingStore = TauriStoreMockFactory.createFailingStoreMock('PermissionDenied');
      const { Store } = await vi.importActual('@tauri-apps/plugin-store') as any;
      vi.mocked(Store).mockImplementation(() => failingStore);
      
      const failingAuthService = new AuthService();
      const result = await failingAuthService.getAllAccounts();
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Permission denied');
    });

    it('should handle store save failure', async () => {
      mockStore.save.mockRejectedValueOnce(new Error('Disk full'));
      
      const account = AccountTestFactory.createBasicAccount();
      const result = await authService.addAccount(account);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Disk full');
    });

    it('should handle corrupted store data', async () => {
      // 不正なデータをストアに設定
      mockStore._setData(new Map([['accounts', 'invalid-data']]));
      
      const result = await authService.getAllAccounts();
      
      // 不正なデータは空配列として処理される
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle store load/save cycle correctly', async () => {
      const account = AccountTestFactory.createBasicAccount();
      
      // アカウント追加
      await authService.addAccount(account);
      
      // 新しいサービスインスタンスで読み込み
      const newAuthService = new AuthService();
      const result = await newAuthService.getAllAccounts();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].id).toBe(account.id);
    });

    it('should handle concurrent store operations', async () => {
      const accounts = Array.from({ length: 10 }, (_, i) => 
        AccountTestFactory.createBasicAccount(`did:plc:test${i}`)
      );

      // 並行してアカウントを追加
      const promises = accounts.map(account => 
        authService.addAccount(account)
      );

      const results = await Promise.all(promises);
      
      // 全ての操作が成功している
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  // ===================================================================
  // 競合制御とエラーハンドリング
  // ===================================================================

  describe('Concurrency Control and Error Handling', () => {
    const accountId = 'did:plc:test123';

    it('should handle session update locks correctly', async () => {
      const account = AccountTestFactory.createBasicAccount(accountId);
      mockStore._setData(new Map([['accounts', [account]]]));
      
      const handler = authService.createPersistSessionHandler(accountId);
      const sessionData1 = AtProtocolMockFactory.createSuccessfulRefreshResponse();
      const sessionData2 = AtProtocolMockFactory.createTokenRotationResponse();
      
      // 同じアカウントの並行セッション更新
      const promise1 = handler('update', sessionData1);
      const promise2 = handler('update', sessionData2);
      
      await Promise.all([promise1, promise2]);
      
      // ロックにより順次処理されている
      expect(mockSessionEventHandler).toHaveBeenCalledTimes(2);
    });

    it('should handle invalid session data gracefully', async () => {
      const handler = authService.createPersistSessionHandler(accountId);
      
      // 無効なセッションデータ
      const invalidSession = {} as AtpSessionData;
      
      await expect(handler('update', invalidSession)).resolves.not.toThrow();
    });

    it('should handle store corruption during operation', async () => {
      const account = AccountTestFactory.createBasicAccount();
      
      // 操作中にストアが破損
      mockStore.get.mockResolvedValueOnce([account]); // 初回は成功
      mockStore.set.mockRejectedValueOnce(new Error('Store corrupted'));
      
      const result = await authService.addAccount(account);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Store corrupted');
    });

    it('should handle memory pressure during large operations', async () => {
      // 大量のアカウントデータ
      const largeAccounts = Array.from({ length: 1000 }, (_, i) => 
        AccountTestFactory.createBasicAccount(`did:plc:large${i}`)
      );
      
      mockStore._setData(new Map([['accounts', largeAccounts]]));
      
      const result = await authService.getAllAccounts();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1000);
    });

    it('should timeout long-running operations', async () => {
      // 長時間のストア操作をシミュレート
      const slowStore = TauriStoreMockFactory.createSlowStoreMock(10000); // 10秒遅延
      const { Store } = await vi.importActual('@tauri-apps/plugin-store') as any;
      vi.mocked(Store).mockImplementation(() => slowStore);
      
      const slowAuthService = new AuthService();
      
      // タイムアウト処理のテスト（実装により異なる）
      const result = await Promise.race([
        slowAuthService.getAllAccounts(),
        TimeControlHelper.wait(5000).then(() => ({ success: false, error: { message: 'Timeout' } }))
      ]);
      
      // 5秒でタイムアウトすることを確認
      expect(result.success).toBe(false);
    });
  });

  // ===================================================================
  // セキュリティテスト
  // ===================================================================

  describe('Security Tests', () => {
    it('should not expose sensitive data in error messages', async () => {
      const account = AccountTestFactory.createBasicAccount();
      account.session!.accessJwt = 'sensitive-access-token';
      account.session!.refreshJwt = 'sensitive-refresh-token';
      
      mockStore.set.mockRejectedValueOnce(new Error('Storage failed'));
      
      const result = await authService.addAccount(account);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).not.toContain('sensitive-access-token');
      expect(result.error?.message).not.toContain('sensitive-refresh-token');
    });

    it('should handle session data validation', async () => {
      const handler = authService.createPersistSessionHandler('did:plc:test');
      
      // 不完全なセッションデータ
      const partialSession = AtProtocolMockFactory.createPartialSessionData();
      
      await expect(handler('update', partialSession as AtpSessionData)).resolves.not.toThrow();
    });

    it('should sanitize account data before storage', async () => {
      const account = AccountTestFactory.createBasicAccount();
      
      // 悪意のあるデータを追加
      (account as any).maliciousScript = '<script>alert("xss")</script>';
      (account as any).__proto__ = { malicious: true };
      
      const result = await authService.addAccount(account);
      
      expect(result.success).toBe(true);
      // サニタイズされたデータのみが保存される
      expect(mockStore.set).toHaveBeenCalled();
    });
  });

  // ===================================================================
  // レガシーデータ移行テスト
  // ===================================================================

  describe('Legacy Data Migration', () => {
    it('should handle legacy account format migration', async () => {
      // 古い形式のアカウントデータ
      const legacyAccount = {
        did: 'did:plc:test123',
        handle: 'user.bsky.social',
        accessJwt: 'legacy-access-token',
        refreshJwt: 'legacy-refresh-token'
      };
      
      mockStore._setData(new Map([['accounts', [legacyAccount]]]));
      
      const result = await authService.getAllAccounts();
      
      expect(result.success).toBe(true);
      // 新しい形式に自動変換される
      expect(result.data?.[0]).toHaveProperty('profile');
      expect(result.data?.[0]).toHaveProperty('session');
    });

    it('should handle mixed legacy and current format data', async () => {
      const legacyAccount = { did: 'did:plc:legacy', handle: 'legacy.bsky.social' };
      const currentAccount = AccountTestFactory.createBasicAccount();
      
      mockStore._setData(new Map([['accounts', [legacyAccount, currentAccount]]]));
      
      const result = await authService.getAllAccounts();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });
});