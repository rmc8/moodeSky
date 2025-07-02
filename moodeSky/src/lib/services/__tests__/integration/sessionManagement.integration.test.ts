/**
 * Session Management Integration Test Suite
 * Issue #92 Phase 3: セッション管理の完全統合テスト
 * 
 * SessionManager ↔ AuthService ↔ JWT Token Manager の統合動作を検証
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IntegrationTestContainer, IntegrationTestHelpers } from '../../../test-utils/integrationTestContainer.js';
import { AccountTestFactory, TimeControlHelper } from '../../../test-utils/sessionTestUtils.js';
import { AtProtocolMockFactory } from '../../../test-utils/mockFactories.js';
import type { Account } from '../../../types/auth.ts';
import type { SessionState, ValidationResult } from '../../sessionManager.ts';

describe('Session Management Integration Tests', () => {
  let container: IntegrationTestContainer;

  beforeEach(async () => {
    container = new IntegrationTestContainer({
      initialAccountCount: 3,
      enableJWTManager: true,
      enableBackgroundMonitor: false,
      logLevel: 'info'
    });
    await container.setup();
  });

  afterEach(async () => {
    await container.teardown();
  });

  // ===================================================================
  // 基本統合フロー テスト
  // ===================================================================

  describe('Basic Integration Flow', () => {
    it('should handle complete session lifecycle with all components', async () => {
      // 新しいアカウントを追加
      const account = await container.addAccount('did:plc:integration', 'integration.bsky.social');
      
      // セッション状態の初期化を確認
      const initialValidation = await container.validateAllSessions();
      const accountValidation = initialValidation.find(v => v.accountId === account.profile.did);
      
      expect(accountValidation).toBeDefined();
      expect(accountValidation!.isValid).toBe(true);
      expect(accountValidation!.requiredAction).toBe('none');

      // JWT Token Manager にトークンが登録されていることを確認
      if (container.jwtTokenManager) {
        const accessTokenInfo = container.jwtTokenManager.getTokenInfo(account.profile.did, 'access');
        expect(accessTokenInfo).toBeDefined();
        expect(accessTokenInfo!.isExpired).toBe(false);
      }

      // AuthService でアカウントが管理されていることを確認
      const storedAccount = await container.authService.getAccount(account.id);
      expect(storedAccount.success).toBe(true);
      expect(storedAccount.data!.profile.did).toBe(account.profile.did);

      // SessionManager でセッション状態が管理されていることを確認
      const sessionState = container.sessionManager.getSessionState(account.profile.did);
      expect(sessionState).toBeDefined();
      expect(sessionState!.isValid).toBe(true);
      expect(sessionState!.accountId).toBe(account.profile.did);
    });

    it('should maintain data consistency across all components', async () => {
      const accounts = container.state.activeAccounts;
      expect(accounts.length).toBeGreaterThan(0);

      // 全セッションの検証
      const validationResults = await container.validateAllSessions();
      expect(validationResults.length).toBe(accounts.length);

      // 各コンポーネントでの一貫性を確認
      for (const account of accounts) {
        const accountId = account.profile.did;

        // AuthService での存在確認
        const authResult = await container.authService.getAccount(account.id);
        expect(authResult.success).toBe(true);

        // SessionManager での状態確認
        const sessionState = container.sessionManager.getSessionState(accountId);
        expect(sessionState).toBeDefined();
        expect(sessionState!.accountId).toBe(accountId);

        // JWT Token Manager での登録確認（有効な場合）
        if (container.jwtTokenManager && account.session?.accessJwt) {
          const tokenInfo = container.jwtTokenManager.getTokenInfo(accountId, 'access');
          expect(tokenInfo).toBeDefined();
        }

        // 検証結果との一貫性確認
        const validation = validationResults.find(v => v.accountId === accountId);
        expect(validation).toBeDefined();
        expect(validation!.isValid).toBe(sessionState!.isValid);
      }
    });

    it('should handle component initialization order correctly', async () => {
      // 新しいコンテナで初期化順序をテスト
      const newContainer = new IntegrationTestContainer({
        initialAccountCount: 1,
        enableJWTManager: true
      });

      try {
        await newContainer.setup();

        // 初期化イベントの順序を確認
        const setupEvents = newContainer.getEventsByType('container-setup');
        expect(setupEvents).toHaveLength(1);

        // 全コンポーネントが正常に初期化されていることを確認
        expect(newContainer.authService).toBeDefined();
        expect(newContainer.sessionManager).toBeDefined();
        expect(newContainer.jwtTokenManager).toBeDefined();
        expect(newContainer.state.isInitialized).toBe(true);
        expect(newContainer.state.activeAccounts.length).toBe(1);

      } finally {
        await newContainer.teardown();
      }
    });
  });

  // ===================================================================
  // プロアクティブリフレッシュ統合テスト
  // ===================================================================

  describe('Proactive Refresh Integration', () => {
    it('should perform integrated proactive refresh across all components', async () => {
      const account = container.state.activeAccounts[0];
      const accountId = account.profile.did;

      // 期限が近いトークンを設定（5分後期限切れ）
      const shortLivedToken = require('../../../test-utils/sessionTestUtils.js')
        .JWTTestFactory.createValidAccessToken(5);

      // AuthService でセッションを更新
      account.session!.accessJwt = shortLivedToken;
      await container.authService.addAccount(account); // 更新として追加

      // JWT Token Manager でトークンを再登録
      if (container.jwtTokenManager) {
        container.jwtTokenManager.removeToken(accountId, 'access');
        container.jwtTokenManager.registerToken(accountId, shortLivedToken, 'access');
      }

      // リフレッシュ前の状態を確認
      const beforeRefresh = await container.validateAllSessions();
      const beforeState = beforeRefresh.find(v => v.accountId === accountId);
      expect(beforeState?.requiredAction === 'refresh').toBe(true);

      // プロアクティブリフレッシュを実行
      const refreshSuccess = await container.sessionManager.proactiveRefresh(accountId);
      expect(refreshSuccess).toBe(true);

      // リフレッシュ後の状態を確認
      const afterRefresh = await container.validateAllSessions();
      const afterState = afterRefresh.find(v => v.accountId === accountId);
      expect(afterState?.isValid).toBe(true);
      expect(afterState?.requiredAction).toBe('none');

      // 全コンポーネントでの更新を確認
      const updatedSessionState = container.sessionManager.getSessionState(accountId);
      expect(updatedSessionState?.refreshFailureCount).toBe(0);
      expect(updatedSessionState?.lastError).toBeNull();
    });

    it('should handle refresh token rotation across all components', async () => {
      const account = container.state.activeAccounts[0];
      const accountId = account.profile.did;

      // Token rotation をシミュレート
      const rotatedSession = AtProtocolMockFactory.createTokenRotationResponse(
        accountId,
        account.profile.handle
      );

      // AuthService での persistSessionHandler をシミュレート
      const persistHandler = container.authService.createPersistSessionHandler(accountId);
      await persistHandler('update', rotatedSession);

      // SessionManager でのセッション更新後処理をシミュレート
      await container.sessionManager.updateSessionAfterRefresh(account);

      // JWT Token Manager での新しいトークン登録を確認
      if (container.jwtTokenManager) {
        const newTokenInfo = container.jwtTokenManager.getTokenInfo(accountId, 'access');
        expect(newTokenInfo).toBeDefined();
        expect(newTokenInfo!.token).toBe(rotatedSession.accessJwt);
      }

      // AuthService でのアカウント更新を確認
      const updatedAccount = await container.authService.getAccount(account.id);
      expect(updatedAccount.success).toBe(true);
      expect(updatedAccount.data!.session!.accessJwt).toBe(rotatedSession.accessJwt);
      expect(updatedAccount.data!.session!.refreshJwt).toBe(rotatedSession.refreshJwt);
    });

    it('should coordinate refresh attempts across multiple accounts', async () => {
      const accounts = container.state.activeAccounts;
      expect(accounts.length).toBeGreaterThan(1);

      // 複数アカウントの並行リフレッシュを実行
      const refreshPromises = accounts.map(account => 
        container.sessionManager.proactiveRefresh(account.profile.did)
      );

      const refreshResults = await Promise.allSettled(refreshPromises);

      // 結果の確認
      const successfulRefreshes = refreshResults.filter(r => 
        r.status === 'fulfilled' && r.value === true
      ).length;

      expect(successfulRefreshes).toBeGreaterThan(0);

      // 各アカウントの最終状態を確認
      const finalValidation = await container.validateAllSessions();
      finalValidation.forEach(validation => {
        expect(validation.sessionState.refreshInProgress).toBe(false);
      });
    });
  });

  // ===================================================================
  // エラー伝播と回復統合テスト
  // ===================================================================

  describe('Error Propagation and Recovery Integration', () => {
    it('should handle error propagation across components gracefully', async () => {
      const account = container.state.activeAccounts[0];
      const accountId = account.profile.did;

      // AuthService でのエラーをシミュレート
      vi.spyOn(container.authService, 'refreshSession')
        .mockRejectedValueOnce(new Error('Mock refresh failure'));

      // リフレッシュ失敗を試行
      const refreshResult = await container.sessionManager.proactiveRefresh(accountId);
      expect(refreshResult).toBe(false);

      // エラー状態の伝播を確認
      const sessionState = container.sessionManager.getSessionState(accountId);
      expect(sessionState?.lastError).toContain('Mock refresh failure');
      expect(sessionState?.refreshFailureCount).toBeGreaterThan(0);

      // SessionManager 統計でのエラーカウント確認
      const stats = container.sessionManager.getStats();
      expect(stats.invalidSessions).toBeGreaterThan(0);
    });

    it('should recover from transient errors with retry mechanism', async () => {
      const account = container.state.activeAccounts[0];
      const accountId = account.profile.did;

      let callCount = 0;
      vi.spyOn(container.authService, 'refreshSession')
        .mockImplementation(async () => {
          callCount++;
          if (callCount < 3) {
            throw new Error('Transient error');
          }
          return { success: true, data: account };
        });

      // リトライ機構付きリフレッシュを実行
      const refreshResult = await container.sessionManager.proactiveRefresh(accountId);

      // 最終的に成功することを確認
      expect(refreshResult).toBe(true);
      expect(callCount).toBe(3); // 2回失敗後、3回目で成功

      // 回復後の状態を確認
      const sessionState = container.sessionManager.getSessionState(accountId);
      expect(sessionState?.isValid).toBe(true);
      expect(sessionState?.lastError).toBeNull();
    });

    it('should isolate errors between different accounts', async () => {
      const accounts = container.state.activeAccounts;
      expect(accounts.length).toBeGreaterThanOrEqual(2);

      const [account1, account2] = accounts;

      // account1 のみエラーが発生するようにモック
      vi.spyOn(container.authService, 'refreshSession')
        .mockImplementation(async (accountId) => {
          if (accountId === account1.profile.did) {
            throw new Error('Account1 specific error');
          }
          return { success: true, data: account2 };
        });

      // 両方のアカウントでリフレッシュを試行
      const [result1, result2] = await Promise.allSettled([
        container.sessionManager.proactiveRefresh(account1.profile.did),
        container.sessionManager.proactiveRefresh(account2.profile.did)
      ]);

      // account1 は失敗、account2 は成功
      expect(result1.status).toBe('fulfilled');
      expect((result1 as any).value).toBe(false);
      expect(result2.status).toBe('fulfilled');
      expect((result2 as any).value).toBe(true);

      // 各アカウントの独立した状態を確認
      const state1 = container.sessionManager.getSessionState(account1.profile.did);
      const state2 = container.sessionManager.getSessionState(account2.profile.did);

      expect(state1?.lastError).toContain('Account1 specific error');
      expect(state2?.lastError).toBeNull();
      expect(state1?.isValid).toBe(false);
      expect(state2?.isValid).toBe(true);
    });
  });

  // ===================================================================
  // イベント駆動統合テスト
  // ===================================================================

  describe('Event-Driven Integration', () => {
    it('should propagate session events across all components', async () => {
      const account = container.state.activeAccounts[0];
      const accountId = account.profile.did;

      // イベント履歴をクリア
      container.clearEventHistory();

      // セッションイベントを発生させる
      await IntegrationTestHelpers.verifyEventPropagation(
        container,
        async () => {
          await container.sessionManager.proactiveRefresh(accountId);
        },
        ['session-manager'],
        5000
      );

      // 発生したイベントを確認
      const events = container.getEventsByType('session-manager');
      expect(events.length).toBeGreaterThan(0);
    });

    it('should handle session expiration events correctly', async () => {
      const account = container.state.activeAccounts[0];
      const accountId = account.profile.did;

      // セッション期限切れを通知
      await container.sessionManager.notifySessionExpired(accountId);

      // 期限切れ状態の確認
      const sessionState = container.sessionManager.getSessionState(accountId);
      expect(sessionState?.isValid).toBe(false);
      expect(sessionState?.lastError).toContain('Session expired');

      // イベントが記録されていることを確認
      const expiredEvents = container.getEventsByType('session-manager');
      const expiredEvent = expiredEvents.find(e => 
        e.data.type === 'SessionExpired' && e.data.accountId === accountId
      );
      expect(expiredEvent).toBeDefined();
    });

    it('should coordinate events during account lifecycle', async () => {
      // イベント履歴をクリア
      container.clearEventHistory();

      // 新しいアカウントを追加
      const newAccount = await container.addAccount();

      // セッション検証を実行
      await container.validateAllSessions();

      // アカウントを削除
      await container.removeAccount(newAccount.id);

      // ライフサイクルイベントが正しく記録されていることを確認
      const addedEvents = container.getEventsByType('account-added');
      const removedEvents = container.getEventsByType('account-removed');
      const validationEvents = container.getEventsByType('sessions-validated');

      expect(addedEvents.length).toBe(1);
      expect(removedEvents.length).toBe(1);
      expect(validationEvents.length).toBeGreaterThan(0);

      // 最終状態の確認
      const finalSessionState = container.sessionManager.getSessionState(newAccount.profile.did);
      expect(finalSessionState).toBeNull(); // 削除されているはず
    });
  });

  // ===================================================================
  // パフォーマンス統合テスト
  // ===================================================================

  describe('Performance Integration', () => {
    it('should maintain performance standards during integrated operations', async () => {
      await IntegrationTestHelpers.verifyPerformanceRequirements(
        container,
        async () => {
          // 複数の統合操作を実行
          await container.validateAllSessions();
          await container.refreshAllSessions();
          await container.validateAllSessions();
        },
        {
          maxResponseTimeMs: 5000,  // 5秒以内
          maxMemoryMB: 100,        // 100MB以内
          maxErrorRate: 0.1        // エラー率10%以内
        }
      );
    });

    it('should handle time progression efficiently', async () => {
      const startStats = container.getStatistics();

      // 時間を段階的に進める（24時間相当）
      for (let hour = 0; hour < 24; hour++) {
        await container.advanceTime(60 * 60 * 1000); // 1時間進める
        
        // 定期的にセッション検証を実行
        if (hour % 6 === 0) { // 6時間ごと
          await container.validateAllSessions();
        }
      }

      const endStats = container.getStatistics();

      // 長時間運用での安定性を確認
      expect(endStats.errorRate).toBeLessThan(0.2); // エラー率20%未満
      expect(container.state.metrics.memoryUsageMB).toBeLessThan(200); // メモリ200MB未満
    });

    it('should scale efficiently with multiple accounts', async () => {
      // 追加アカウントを作成（合計10アカウント）
      const additionalAccounts = 7; // 既に3アカウントあるので7追加
      
      for (let i = 0; i < additionalAccounts; i++) {
        await container.addAccount(`did:plc:scale${i}`, `scale${i}.bsky.social`);
      }

      expect(container.state.activeAccounts.length).toBe(10);

      // スケーラビリティテスト
      await IntegrationTestHelpers.verifyPerformanceRequirements(
        container,
        async () => {
          await container.validateAllSessions();
        },
        {
          maxResponseTimeMs: 1000,  // 1秒以内
          maxMemoryMB: 150         // 150MB以内
        }
      );

      // 全セッションが正常に管理されていることを確認
      const validationResults = await container.validateAllSessions();
      expect(validationResults.length).toBe(10);
      
      const validSessions = validationResults.filter(v => v.isValid).length;
      expect(validSessions).toBeGreaterThanOrEqual(8); // 80%以上が有効
    });
  });

  // ===================================================================
  // 境界条件統合テスト
  // ===================================================================

  describe('Edge Cases Integration', () => {
    it('should handle empty account list gracefully', async () => {
      // 全アカウントを削除
      for (const account of container.state.activeAccounts) {
        await container.removeAccount(account.id);
      }

      expect(container.state.activeAccounts.length).toBe(0);

      // 空の状態でのセッション検証
      const validationResults = await container.validateAllSessions();
      expect(validationResults).toEqual([]);

      // SessionManager 統計の確認
      const stats = container.sessionManager.getStats();
      expect(stats.totalSessions).toBe(0);
      expect(stats.validSessions).toBe(0);
      expect(stats.invalidSessions).toBe(0);
    });

    it('should handle rapid component state changes', async () => {
      const account = container.state.activeAccounts[0];
      const accountId = account.profile.did;

      // 高速での状態変更を実行
      const operations = Array.from({ length: 20 }, (_, i) => async () => {
        if (i % 2 === 0) {
          await container.sessionManager.proactiveRefresh(accountId);
        } else {
          await container.sessionManager.validateAllSessions();
        }
      });

      // 並行実行
      const results = await TimeControlHelper.runConcurrently(operations, 5);
      
      // 全操作が完了していることを確認
      expect(results.length).toBe(20);

      // 最終状態の一貫性を確認
      const finalState = container.sessionManager.getSessionState(accountId);
      expect(finalState?.refreshInProgress).toBe(false);
    });

    it('should maintain consistency during concurrent modifications', async () => {
      const account = container.state.activeAccounts[0];
      
      // 同じアカウントに対する並行操作
      const concurrentOperations = [
        () => container.authService.refreshSession(account.profile.did),
        () => container.sessionManager.proactiveRefresh(account.profile.did),
        () => container.sessionManager.validateAllSessions(),
        () => container.sessionManager.getSessionState(account.profile.did)
      ];

      // 並行実行（競合状態をテスト）
      const results = await Promise.allSettled(
        concurrentOperations.map(op => op())
      );

      // 少なくとも一部の操作は成功することを確認
      const successfulOps = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulOps).toBeGreaterThan(0);

      // 最終的にデータ整合性が保たれていることを確認
      const finalValidation = await container.validateAllSessions();
      const accountValidation = finalValidation.find(v => v.accountId === account.profile.did);
      expect(accountValidation).toBeDefined();
    });
  });
});