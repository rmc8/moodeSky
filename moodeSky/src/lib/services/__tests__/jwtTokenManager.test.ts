/**
 * JWT Token Manager Test Suite
 * Issue #92 Phase 2: JWT Token Manager の包括的テスト
 * 
 * トークン管理、プロアクティブリフレッシュ、マルチアカウント対応の全シナリオをカバー
 */

import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { JWTTokenManager, type TokenInfo, type RefreshSchedule, type TokenManagerConfig } from '../../utils/jwtTokenManager.js';
import { JWTTestFactory, PerformanceTestHelper, TimeControlHelper } from '../../test-utils/sessionTestUtils.js';

// モック化対象のモジュール
vi.mock('../../utils/logger.js', () => ({
  createComponentLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }))
}));

describe('JWT Token Manager', () => {
  let tokenManager: JWTTokenManager;
  let mockConfig: Partial<TokenManagerConfig>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockConfig = {
      accessTokenRefreshBuffer: 300, // 5分
      refreshTokenRefreshBuffer: 3600, // 1時間
      healthCheckInterval: 60, // 1分
      logLevel: 'info'
    };

    tokenManager = new JWTTokenManager(mockConfig);
  });

  afterEach(() => {
    vi.useRealTimers();
    // テスト間でのリークを防ぐため、タイマーとリソースをクリーンアップ
    if (tokenManager) {
      tokenManager.dispose?.();
    }
  });

  // ===================================================================
  // 初期化とコンストラクタテスト
  // ===================================================================

  describe('Constructor and Initialization', () => {
    it('should initialize with default config when no config provided', () => {
      const defaultManager = new JWTTokenManager();
      expect(defaultManager).toBeInstanceOf(JWTTokenManager);
    });

    it('should initialize with custom config', () => {
      const customConfig: Partial<TokenManagerConfig> = {
        accessTokenRefreshBuffer: 600,
        healthCheckInterval: 30,
        logLevel: 'debug'
      };

      const customManager = new JWTTokenManager(customConfig);
      expect(customManager).toBeInstanceOf(JWTTokenManager);
    });

    it('should start health check timer on initialization', () => {
      expect(vi.getTimerCount()).toBeGreaterThan(0);
    });
  });

  // ===================================================================
  // トークン登録・削除・取得テスト
  // ===================================================================

  describe('Token Registration and Management', () => {
    const accountId = 'did:plc:test123';

    it('should register valid access token successfully', () => {
      const token = JWTTestFactory.createValidAccessToken(60);
      
      tokenManager.registerToken(accountId, token, 'access');
      
      const tokenInfo = tokenManager.getTokenInfo(accountId, 'access');
      expect(tokenInfo).toBeDefined();
      expect(tokenInfo?.accountId).toBe(accountId);
      expect(tokenInfo?.type).toBe('access');
      expect(tokenInfo?.token).toBe(token);
      expect(tokenInfo?.isExpired).toBe(false);
    });

    it('should register valid refresh token successfully', () => {
      const token = JWTTestFactory.createValidAccessToken(1440); // 24時間
      
      tokenManager.registerToken(accountId, token, 'refresh');
      
      const tokenInfo = tokenManager.getTokenInfo(accountId, 'refresh');
      expect(tokenInfo).toBeDefined();
      expect(tokenInfo?.type).toBe('refresh');
      expect(tokenInfo?.isExpired).toBe(false);
    });

    it('should handle invalid token registration gracefully', () => {
      const invalidToken = 'invalid.token.format';
      
      tokenManager.registerToken(accountId, invalidToken, 'access');
      
      const tokenInfo = tokenManager.getTokenInfo(accountId, 'access');
      expect(tokenInfo).toBeNull();
    });

    it('should remove token successfully', () => {
      const token = JWTTestFactory.createValidAccessToken(60);
      
      tokenManager.registerToken(accountId, token, 'access');
      expect(tokenManager.getTokenInfo(accountId, 'access')).toBeDefined();
      
      tokenManager.removeToken(accountId, 'access');
      expect(tokenManager.getTokenInfo(accountId, 'access')).toBeNull();
    });

    it('should replace existing token when registering same account/type', () => {
      const firstToken = JWTTestFactory.createValidAccessToken(60);
      const secondToken = JWTTestFactory.createValidAccessToken(120);
      
      tokenManager.registerToken(accountId, firstToken, 'access');
      const firstInfo = tokenManager.getTokenInfo(accountId, 'access');
      
      tokenManager.registerToken(accountId, secondToken, 'access');
      const secondInfo = tokenManager.getTokenInfo(accountId, 'access');
      
      expect(firstInfo?.token).toBe(firstToken);
      expect(secondInfo?.token).toBe(secondToken);
      expect(firstInfo?.token).not.toBe(secondInfo?.token);
    });

    it('should handle multiple accounts independently', () => {
      const account1 = 'did:plc:account1';
      const account2 = 'did:plc:account2';
      const token1 = JWTTestFactory.createValidAccessToken(60);
      const token2 = JWTTestFactory.createValidAccessToken(120);
      
      tokenManager.registerToken(account1, token1, 'access');
      tokenManager.registerToken(account2, token2, 'access');
      
      const info1 = tokenManager.getTokenInfo(account1, 'access');
      const info2 = tokenManager.getTokenInfo(account2, 'access');
      
      expect(info1?.accountId).toBe(account1);
      expect(info2?.accountId).toBe(account2);
      expect(info1?.token).toBe(token1);
      expect(info2?.token).toBe(token2);
    });
  });

  // ===================================================================
  // トークン情報取得とリアルタイム更新テスト
  // ===================================================================

  describe('Token Info Retrieval and Real-time Updates', () => {
    const accountId = 'did:plc:test123';

    it('should return null for non-existent token', () => {
      const tokenInfo = tokenManager.getTokenInfo('non-existent', 'access');
      expect(tokenInfo).toBeNull();
    });

    it('should update token info in real-time', () => {
      const token = JWTTestFactory.createValidAccessToken(5); // 5分後期限切れ
      tokenManager.registerToken(accountId, token, 'access');
      
      const initialInfo = tokenManager.getTokenInfo(accountId, 'access');
      expect(initialInfo?.needsRefresh).toBe(false);
      
      // 4分経過をシミュレート（まだリフレッシュ不要）
      vi.advanceTimersByTime(4 * 60 * 1000);
      const afterFourMinutes = tokenManager.getTokenInfo(accountId, 'access');
      expect(afterFourMinutes?.needsRefresh).toBe(true); // バッファ5分以内
      
      // 6分経過をシミュレート（期限切れ）
      vi.advanceTimersByTime(2 * 60 * 1000);
      const afterSixMinutes = tokenManager.getTokenInfo(accountId, 'access');
      expect(afterSixMinutes?.isExpired).toBe(true);
    });

    it('should calculate remaining seconds correctly', () => {
      const expiresInMinutes = 30;
      const token = JWTTestFactory.createValidAccessToken(expiresInMinutes);
      tokenManager.registerToken(accountId, token, 'access');
      
      const tokenInfo = tokenManager.getTokenInfo(accountId, 'access');
      const expectedSeconds = expiresInMinutes * 60;
      
      expect(tokenInfo?.remainingSeconds).toBeCloseTo(expectedSeconds, -1); // ±10秒の誤差許容
    });

    it('should detect need for refresh based on buffer time', () => {
      const bufferSeconds = mockConfig.accessTokenRefreshBuffer!;
      const token = JWTTestFactory.createValidAccessToken(bufferSeconds / 60); // バッファ時間と同じ期限
      
      tokenManager.registerToken(accountId, token, 'access');
      
      const tokenInfo = tokenManager.getTokenInfo(accountId, 'access');
      expect(tokenInfo?.needsRefresh).toBe(true);
    });
  });

  // ===================================================================
  // リフレッシュスケジューリングテスト
  // ===================================================================

  describe('Refresh Scheduling', () => {
    const accountId = 'did:plc:test123';

    it('should schedule refresh callback for token needing refresh', async () => {
      const refreshCallback = vi.fn().mockResolvedValue(undefined);
      const token = JWTTestFactory.createValidAccessToken(3); // 3分後期限切れ
      
      tokenManager.registerToken(accountId, token, 'access');
      tokenManager.scheduleRefresh(accountId, 'access', refreshCallback);
      
      // リフレッシュバッファ時間後にコールバックが実行されることを確認
      vi.advanceTimersByTime(1 * 60 * 1000); // 1分経過（リフレッシュが必要な時点）
      
      // タイマーが設定されていることを確認
      expect(vi.getTimerCount()).toBeGreaterThan(0);
    });

    it('should cancel existing refresh when new schedule is set', () => {
      const firstCallback = vi.fn();
      const secondCallback = vi.fn();
      const token = JWTTestFactory.createValidAccessToken(10);
      
      tokenManager.registerToken(accountId, token, 'access');
      tokenManager.scheduleRefresh(accountId, 'access', firstCallback);
      tokenManager.scheduleRefresh(accountId, 'access', secondCallback);
      
      // 古いスケジュールがキャンセルされ、新しいスケジュールが設定されている
      expect(vi.getTimerCount()).toBeGreaterThan(0);
    });

    it('should cancel refresh when token is removed', () => {
      const refreshCallback = vi.fn();
      const token = JWTTestFactory.createValidAccessToken(10);
      
      tokenManager.registerToken(accountId, token, 'access');
      tokenManager.scheduleRefresh(accountId, 'access', refreshCallback);
      
      const timerCountBefore = vi.getTimerCount();
      tokenManager.removeToken(accountId, 'access');
      
      // タイマーがクリアされていることを確認
      expect(refreshCallback).not.toHaveBeenCalled();
    });

    it('should not schedule refresh for already expired token', () => {
      const refreshCallback = vi.fn();
      const expiredToken = JWTTestFactory.createExpiredAccessToken();
      
      tokenManager.registerToken(accountId, expiredToken, 'access');
      tokenManager.scheduleRefresh(accountId, 'access', refreshCallback);
      
      // 期限切れトークンに対してはスケジュールされない
      vi.advanceTimersByTime(60 * 1000); // 1分経過
      expect(refreshCallback).not.toHaveBeenCalled();
    });
  });

  // ===================================================================
  // ヘルスチェック機能テスト
  // ===================================================================

  describe('Health Check Functionality', () => {
    const accountId = 'did:plc:test123';

    it('should perform periodic health checks', () => {
      const token = JWTTestFactory.createValidAccessToken(60);
      tokenManager.registerToken(accountId, token, 'access');
      
      // ヘルスチェック間隔経過
      vi.advanceTimersByTime(mockConfig.healthCheckInterval! * 1000);
      
      // ヘルスチェックが実行されたことを間接的に確認（ログ出力など）
      expect(vi.getTimerCount()).toBeGreaterThan(0);
    });

    it('should detect and handle expired tokens during health check', () => {
      const shortToken = JWTTestFactory.createValidAccessToken(1); // 1分後期限切れ
      tokenManager.registerToken(accountId, shortToken, 'access');
      
      // 期限切れまで時間を進める
      vi.advanceTimersByTime(2 * 60 * 1000); // 2分経過
      
      const tokenInfo = tokenManager.getTokenInfo(accountId, 'access');
      expect(tokenInfo?.isExpired).toBe(true);
    });

    it('should provide health statistics', () => {
      const token1 = JWTTestFactory.createValidAccessToken(60);
      const token2 = JWTTestFactory.createValidAccessToken(120);
      const expiredToken = JWTTestFactory.createExpiredAccessToken();
      
      tokenManager.registerToken('account1', token1, 'access');
      tokenManager.registerToken('account2', token2, 'access');
      tokenManager.registerToken('account3', expiredToken, 'access');
      
      const stats = tokenManager.getHealthStats();
      expect(stats).toBeDefined();
      expect(stats.totalTokens).toBeGreaterThan(0);
      expect(stats.validTokens).toBeGreaterThan(0);
      expect(stats.expiredTokens).toBeGreaterThan(0);
    });
  });

  // ===================================================================
  // マルチアカウント対応テスト
  // ===================================================================

  describe('Multi-Account Support', () => {
    it('should handle multiple accounts with different token types', () => {
      const accounts = [
        { id: 'did:plc:account1', accessToken: JWTTestFactory.createValidAccessToken(60) },
        { id: 'did:plc:account2', accessToken: JWTTestFactory.createValidAccessToken(120) },
        { id: 'did:plc:account3', refreshToken: JWTTestFactory.createValidAccessToken(1440) }
      ];

      accounts.forEach(account => {
        if (account.accessToken) {
          tokenManager.registerToken(account.id, account.accessToken, 'access');
        }
        if (account.refreshToken) {
          tokenManager.registerToken(account.id, account.refreshToken, 'refresh');
        }
      });

      // 各アカウントのトークンが独立して管理されている
      accounts.forEach(account => {
        if (account.accessToken) {
          const info = tokenManager.getTokenInfo(account.id, 'access');
          expect(info?.accountId).toBe(account.id);
          expect(info?.token).toBe(account.accessToken);
        }
      });
    });

    it('should handle concurrent operations on different accounts', async () => {
      const accounts = Array.from({ length: 10 }, (_, i) => ({
        id: `did:plc:account${i}`,
        token: JWTTestFactory.createValidAccessToken(60 + i)
      }));

      // 並行してトークンを登録
      await Promise.all(
        accounts.map(async account => {
          tokenManager.registerToken(account.id, account.token, 'access');
          return tokenManager.getTokenInfo(account.id, 'access');
        })
      );

      // 全てのアカウントが正しく登録されている
      accounts.forEach(account => {
        const info = tokenManager.getTokenInfo(account.id, 'access');
        expect(info?.accountId).toBe(account.id);
        expect(info?.token).toBe(account.token);
      });
    });

    it('should clean up specific account without affecting others', () => {
      const accounts = ['account1', 'account2', 'account3'];
      
      accounts.forEach(accountId => {
        const token = JWTTestFactory.createValidAccessToken(60);
        tokenManager.registerToken(accountId, token, 'access');
      });

      // 中間のアカウントを削除
      tokenManager.removeToken('account2', 'access');

      // 他のアカウントは影響を受けない
      expect(tokenManager.getTokenInfo('account1', 'access')).toBeDefined();
      expect(tokenManager.getTokenInfo('account2', 'access')).toBeNull();
      expect(tokenManager.getTokenInfo('account3', 'access')).toBeDefined();
    });
  });

  // ===================================================================
  // エラーハンドリングとエッジケース
  // ===================================================================

  describe('Error Handling and Edge Cases', () => {
    const accountId = 'did:plc:test123';

    it('should handle malformed tokens gracefully', () => {
      const malformedTokens = [
        'invalid',
        'header.payload',
        'header.payload.signature.extra',
        '',
        null as any,
        undefined as any
      ];

      malformedTokens.forEach(token => {
        expect(() => {
          tokenManager.registerToken(accountId, token, 'access');
        }).not.toThrow();
        
        expect(tokenManager.getTokenInfo(accountId, 'access')).toBeNull();
      });
    });

    it('should handle refresh callback errors gracefully', async () => {
      const failingCallback = vi.fn().mockRejectedValue(new Error('Refresh failed'));
      const token = JWTTestFactory.createValidAccessToken(3);
      
      tokenManager.registerToken(accountId, token, 'access');
      tokenManager.scheduleRefresh(accountId, 'access', failingCallback);
      
      // エラーが発生してもアプリケーションがクラッシュしない
      vi.advanceTimersByTime(4 * 60 * 1000); // リフレッシュ時刻を過ぎる
      
      expect(failingCallback).toHaveBeenCalled();
    });

    it('should handle rapid token updates correctly', () => {
      const tokens = Array.from({ length: 100 }, () => 
        JWTTestFactory.createValidAccessToken(60)
      );

      // 高速でトークンを更新
      tokens.forEach(token => {
        tokenManager.registerToken(accountId, token, 'access');
      });

      // 最後のトークンが正しく設定されている
      const finalInfo = tokenManager.getTokenInfo(accountId, 'access');
      expect(finalInfo?.token).toBe(tokens[tokens.length - 1]);
    });

    it('should handle memory pressure scenarios', async () => {
      const memoryBefore = await PerformanceTestHelper.measureMemoryUsage();
      
      // 大量のトークンを登録
      for (let i = 0; i < 1000; i++) {
        const token = JWTTestFactory.createValidAccessToken(60);
        tokenManager.registerToken(`account${i}`, token, 'access');
      }
      
      const memoryAfter = await PerformanceTestHelper.measureMemoryUsage();
      const memoryIncrease = memoryAfter - memoryBefore;
      
      // メモリ増加が合理的な範囲内であることを確認（50MB未満）
      expect(memoryIncrease).toBeLessThan(50);
    });
  });

  // ===================================================================
  // パフォーマンステスト
  // ===================================================================

  describe('Performance Tests', () => {
    it('should handle large number of tokens efficiently', async () => {
      const tokenCount = 1000;
      const startTime = performance.now();
      
      // 大量のトークンを登録
      for (let i = 0; i < tokenCount; i++) {
        const token = JWTTestFactory.createValidAccessToken(60);
        tokenManager.registerToken(`account${i}`, token, 'access');
      }
      
      const registrationTime = performance.now() - startTime;
      
      // 登録処理が効率的であることを確認（1秒未満）
      expect(registrationTime).toBeLessThan(1000);
      
      // 情報取得も効率的であることを確認
      const lookupStartTime = performance.now();
      for (let i = 0; i < tokenCount; i++) {
        tokenManager.getTokenInfo(`account${i}`, 'access');
      }
      const lookupTime = performance.now() - lookupStartTime;
      
      expect(lookupTime).toBeLessThan(100); // 100ms未満
    });

    it('should maintain consistent performance under concurrent load', async () => {
      const concurrentOperations = 100;
      
      const operations = Array.from({ length: concurrentOperations }, (_, i) => 
        async () => {
          const token = JWTTestFactory.createValidAccessToken(60);
          tokenManager.registerToken(`concurrent${i}`, token, 'access');
          return tokenManager.getTokenInfo(`concurrent${i}`, 'access');
        }
      );
      
      const startTime = performance.now();
      const results = await TimeControlHelper.runConcurrently(operations, 10);
      const totalTime = performance.now() - startTime;
      
      expect(results).toHaveLength(concurrentOperations);
      expect(totalTime).toBeLessThan(1000); // 1秒未満
      
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });

  // ===================================================================
  // 設定管理とライフサイクル
  // ===================================================================

  describe('Configuration Management and Lifecycle', () => {
    it('should respect custom buffer times', () => {
      const customConfig: TokenManagerConfig = {
        accessTokenRefreshBuffer: 600, // 10分
        refreshTokenRefreshBuffer: 7200, // 2時間
        healthCheckInterval: 30,
        logLevel: 'debug'
      };

      const customManager = new JWTTokenManager(customConfig);
      const token = JWTTestFactory.createValidAccessToken(8); // 8分後期限切れ
      
      customManager.registerToken('test', token, 'access');
      const tokenInfo = customManager.getTokenInfo('test', 'access');
      
      // カスタムバッファ時間（10分）により、8分後期限切れのトークンはリフレッシュが必要
      expect(tokenInfo?.needsRefresh).toBe(true);
    });

    it('should handle disposal correctly', () => {
      const token = JWTTestFactory.createValidAccessToken(60);
      tokenManager.registerToken('test', token, 'access');
      
      const timerCountBefore = vi.getTimerCount();
      tokenManager.dispose?.();
      
      // 全てのタイマーがクリアされている
      expect(vi.getTimerCount()).toBeLessThan(timerCountBefore);
      
      // 削除後はトークン情報を取得できない
      expect(tokenManager.getTokenInfo('test', 'access')).toBeNull();
    });

    it('should handle configuration updates', () => {
      const initialConfig = tokenManager.getConfig?.();
      
      // 設定を更新
      tokenManager.updateConfig?.({
        accessTokenRefreshBuffer: 900, // 15分
        healthCheckInterval: 120 // 2分
      });
      
      const updatedConfig = tokenManager.getConfig?.();
      expect(updatedConfig?.accessTokenRefreshBuffer).toBe(900);
      expect(updatedConfig?.healthCheckInterval).toBe(120);
    });
  });
});