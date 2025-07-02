/**
 * Concurrency Chaos Test Suite
 * Issue #92 Phase 4 Wave 1: 並行処理破壊テスト
 * 
 * セッション管理システムの並行処理・競合状態での動作を検証
 * - 高並行アクセスパターン
 * - 競合状態・デッドロック検出
 * - 原子性・一貫性の検証
 * - 並行セッション管理の安全性
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChaosTestingFramework, type ChaosInjectionConfig } from '../../../test-utils/chaosTestingFramework.ts';
import { IntegrationTestContainer } from '../../../test-utils/integrationTestContainer.ts';
import { TimeControlHelper, AccountTestFactory } from '../../../test-utils/sessionTestUtils.ts';

describe('Concurrency Chaos Engineering Tests', () => {
  let container: IntegrationTestContainer;
  let chaosFramework: ChaosTestingFramework;

  beforeEach(async () => {
    container = new IntegrationTestContainer({
      initialAccountCount: 10, // 並行テスト用に多めのアカウント
      enableJWTManager: true,
      enableBackgroundMonitor: true,
      logLevel: 'warn'
    });
    await container.setup();

    chaosFramework = new ChaosTestingFramework(container);
  });

  afterEach(async () => {
    await chaosFramework.cleanup();
    await container.teardown();
  });

  // ===================================================================
  // 高並行アクセステスト
  // ===================================================================

  describe('High Concurrency Access Testing', () => {
    it('should handle massive concurrent session validations', async () => {
      const concurrencyLevels = [
        { concurrent: 10, description: 'Low concurrency (10 parallel)' },
        { concurrent: 25, description: 'Medium concurrency (25 parallel)' },
        { concurrent: 50, description: 'High concurrency (50 parallel)' }
      ];

      for (const level of concurrencyLevels) {
        console.log(`Testing ${level.description}...`);

        const startTime = Date.now();
        const results: Array<{ success: boolean; duration: number; error?: string }> = [];

        // 並行セッション検証の実行
        const concurrentOperations = Array.from({ length: level.concurrent }, async (_, index) => {
          const operationStart = Date.now();
          
          try {
            const validation = await container.validateAllSessions();
            const duration = Date.now() - operationStart;
            
            return {
              success: validation && validation.length > 0,
              duration,
              index
            };
          } catch (error) {
            return {
              success: false,
              duration: Date.now() - operationStart,
              error: error instanceof Error ? error.message : String(error),
              index
            };
          }
        });

        const operationResults = await Promise.allSettled(concurrentOperations);
        const totalTime = Date.now() - startTime;

        // 結果の分析
        const successfulOps = operationResults.filter(r => 
          r.status === 'fulfilled' && r.value.success
        ).length;
        const failedOps = operationResults.length - successfulOps;
        const avgDuration = operationResults
          .filter(r => r.status === 'fulfilled')
          .reduce((sum, r) => sum + (r as any).value.duration, 0) / operationResults.length;

        console.log(`  Results: ${successfulOps}/${level.concurrent} successful, avg: ${avgDuration.toFixed(0)}ms, total: ${totalTime}ms`);

        // 高並行でも最低限の成功率を維持
        const successRate = successfulOps / level.concurrent;
        expect(successRate).toBeGreaterThan(0.7); // 70%以上成功

        // 完全デッドロックしていないこと（全て30秒以内で完了）
        expect(totalTime).toBeLessThan(30000);

        // データ整合性の確認
        const postConcurrencyValidation = await container.validateAllSessions();
        expect(postConcurrencyValidation.length).toBeGreaterThan(0);

        await TimeControlHelper.wait(2000); // 次のレベルまでの間隔
      }
    });

    it('should maintain data consistency under concurrent modifications', async () => {
      console.log('Testing data consistency under concurrent modifications...');

      const accounts = container.state.activeAccounts;
      const testAccount = accounts[0];
      const concurrentModifications = 20;

      // 初期状態をキャプチャ
      const initialAuthResult = await container.authService.getAccount(testAccount.id);
      expect(initialAuthResult.success).toBe(true);
      const initialSessionState = container.sessionManager.getSessionState(testAccount.profile.did);

      console.log(`Testing concurrent modifications on account: ${testAccount.profile.handle}`);

      // 並行でのセッション操作
      const concurrentOps = Array.from({ length: concurrentModifications }, async (_, index) => {
        const operationType = index % 3;
        
        try {
          switch (operationType) {
            case 0: // セッション検証
              const validation = await container.sessionManager.validateAllSessions();
              return { type: 'validate', success: validation && validation.length > 0, index };
              
            case 1: // プロアクティブリフレッシュ
              const refreshResult = await container.sessionManager.proactiveRefresh(testAccount.profile.did);
              return { type: 'refresh', success: refreshResult, index };
              
            case 2: // セッション状態取得
              const sessionState = container.sessionManager.getSessionState(testAccount.profile.did);
              return { type: 'getState', success: sessionState !== null, index };
              
            default:
              return { type: 'unknown', success: false, index };
          }
        } catch (error) {
          return { type: 'error', success: false, error: error instanceof Error ? error.message : String(error), index };
        }
      });

      const results = await Promise.allSettled(concurrentOps);
      
      // 結果分析
      const successfulResults = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      );
      const operationsByType = results.reduce((acc: any, r) => {
        if (r.status === 'fulfilled') {
          const type = (r as any).value.type;
          acc[type] = (acc[type] || 0) + 1;
        }
        return acc;
      }, {});

      console.log(`Concurrent operations completed: ${successfulResults.length}/${concurrentModifications} successful`);
      console.log(`Operations by type:`, operationsByType);

      // 並行操作後の整合性確認
      const finalAuthResult = await container.authService.getAccount(testAccount.id);
      const finalSessionState = container.sessionManager.getSessionState(testAccount.profile.did);

      // データ整合性の検証
      expect(finalAuthResult.success).toBe(true);
      expect(finalAuthResult.data!.profile.did).toBe(testAccount.profile.did);
      expect(finalAuthResult.data!.profile.handle).toBe(testAccount.profile.handle);
      
      if (finalSessionState) {
        expect(finalSessionState.accountId).toBe(testAccount.profile.did);
        expect(typeof finalSessionState.isValid).toBe('boolean');
        expect(finalSessionState.refreshInProgress).toBe(false); // 操作完了後は進行中フラグはfalse
      }

      // 成功率の確認
      const successRate = successfulResults.length / concurrentModifications;
      expect(successRate).toBeGreaterThan(0.6); // 60%以上成功

      console.log('✅ Data consistency maintained under concurrent modifications');
    });

    it('should handle concurrent account operations safely', async () => {
      console.log('Testing concurrent account operations safety...');

      const concurrentAccountOps = 15;
      const operationResults: Array<{ type: string; success: boolean; accountId?: string }> = [];

      // 並行でのアカウント操作（追加・削除・更新）
      const concurrentOperations = Array.from({ length: concurrentAccountOps }, async (_, index) => {
        const operationType = index % 3;
        
        try {
          switch (operationType) {
            case 0: // アカウント追加
              const newAccount = await container.addAccount(`did:plc:concurrent${index}`, `concurrent${index}.bsky.social`);
              return { type: 'add', success: true, accountId: newAccount.id };
              
            case 1: // アカウント削除（既存のアカウントから）
              const accounts = container.state.activeAccounts;
              if (accounts.length > 5) { // 最低5つは残す
                const accountToRemove = accounts[accounts.length - 1];
                await container.removeAccount(accountToRemove.id);
                return { type: 'remove', success: true, accountId: accountToRemove.id };
              }
              return { type: 'remove', success: false, reason: 'insufficient accounts' };
              
            case 2: // セッション検証
              const validation = await container.validateAllSessions();
              return { type: 'validate', success: validation && validation.length > 0 };
              
            default:
              return { type: 'unknown', success: false };
          }
        } catch (error) {
          return { type: 'error', success: false, error: error instanceof Error ? error.message : String(error) };
        }
      });

      const results = await Promise.allSettled(concurrentOperations);

      // 結果の集計
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          operationResults.push(result.value);
        } else {
          operationResults.push({ type: 'rejected', success: false });
        }
      });

      const successfulOps = operationResults.filter(r => r.success).length;
      const operationsByType = operationResults.reduce((acc: any, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, {});

      console.log(`Account operations completed: ${successfulOps}/${concurrentAccountOps} successful`);
      console.log(`Operations by type:`, operationsByType);

      // 最終的なアカウント状態の確認
      const finalAccounts = container.state.activeAccounts;
      const finalValidation = await container.validateAllSessions();

      // 整合性確認
      expect(finalAccounts.length).toBeGreaterThan(0);
      expect(finalValidation.length).toBe(finalAccounts.length);

      // 各アカウントのデータ整合性
      for (const account of finalAccounts) {
        const authResult = await container.authService.getAccount(account.id);
        expect(authResult.success).toBe(true);
        expect(authResult.data!.profile.did).toBe(account.profile.did);
        
        const sessionState = container.sessionManager.getSessionState(account.profile.did);
        if (sessionState) {
          expect(sessionState.accountId).toBe(account.profile.did);
        }
      }

      console.log(`Final account count: ${finalAccounts.length}`);
      console.log('✅ Concurrent account operations handled safely');
    });
  });

  // ===================================================================
  // 競合状態・デッドロック検出テスト
  // ===================================================================

  describe('Race Condition and Deadlock Detection', () => {
    it('should detect and handle race conditions in session refresh', async () => {
      console.log('Testing race condition detection in session refresh...');

      const targetAccount = container.state.activeAccounts[0];
      const concurrentRefreshCount = 8;

      // 意図的に競合状態を作る - 同じアカウントの同時リフレッシュ
      const raceConditionTest = Array.from({ length: concurrentRefreshCount }, async (_, index) => {
        const startTime = Date.now();
        
        try {
          // 少しずらしたタイミングで実行
          await TimeControlHelper.wait(index * 10);
          
          const refreshResult = await container.sessionManager.proactiveRefresh(targetAccount.profile.did);
          
          return {
            index,
            success: refreshResult,
            duration: Date.now() - startTime,
            timestamp: Date.now()
          };
        } catch (error) {
          return {
            index,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration: Date.now() - startTime,
            timestamp: Date.now()
          };
        }
      });

      const raceResults = await Promise.allSettled(raceConditionTest);

      // 競合状態の分析
      const successfulRefreshes = raceResults.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;
      const failedRefreshes = raceResults.length - successfulRefreshes;

      console.log(`Race condition results: ${successfulRefreshes} successful, ${failedRefreshes} failed refreshes`);

      // レース条件でも少なくとも1つは成功することを期待
      expect(successfulRefreshes).toBeGreaterThan(0);

      // 最終的なセッション状態は一貫していること
      const finalSessionState = container.sessionManager.getSessionState(targetAccount.profile.did);
      expect(finalSessionState).toBeDefined();
      expect(finalSessionState!.accountId).toBe(targetAccount.profile.did);
      expect(finalSessionState!.refreshInProgress).toBe(false);

      // データ破損が発生していないこと
      const finalAuthResult = await container.authService.getAccount(targetAccount.id);
      expect(finalAuthResult.success).toBe(true);
      expect(finalAuthResult.data!.profile.did).toBe(targetAccount.profile.did);

      console.log('✅ Race conditions handled without data corruption');
    });

    it('should prevent deadlocks in concurrent operations', async () => {
      console.log('Testing deadlock prevention...');

      const deadlockTestOperations = Array.from({ length: 12 }, async (_, index) => {
        const operationTimeout = 20000; // 20秒でタイムアウト
        const startTime = Date.now();

        return Promise.race([
          // 実際の操作
          (async () => {
            const accounts = container.state.activeAccounts;
            const account1 = accounts[index % accounts.length];
            const account2 = accounts[(index + 1) % accounts.length];

            // 交互に異なるアカウントを操作（デッドロック誘発を試行）
            if (index % 2 === 0) {
              await container.sessionManager.proactiveRefresh(account1.profile.did);
              await TimeControlHelper.wait(50);
              await container.sessionManager.getSessionState(account2.profile.did);
            } else {
              await container.sessionManager.getSessionState(account2.profile.did);
              await TimeControlHelper.wait(50);
              await container.sessionManager.proactiveRefresh(account1.profile.did);
            }

            return {
              index,
              success: true,
              duration: Date.now() - startTime,
              completed: true
            };
          })(),
          
          // タイムアウト検出
          TimeControlHelper.wait(operationTimeout).then(() => ({
            index,
            success: false,
            duration: Date.now() - startTime,
            timeout: true,
            completed: false
          }))
        ]);
      });

      const deadlockResults = await Promise.allSettled(deadlockTestOperations);

      // デッドロック分析
      const completedOps = deadlockResults.filter(r => 
        r.status === 'fulfilled' && r.value.completed
      ).length;
      const timedOutOps = deadlockResults.filter(r => 
        r.status === 'fulfilled' && r.value.timeout
      ).length;
      const totalDuration = Math.max(...deadlockResults
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as any).value.duration)
      );

      console.log(`Deadlock test results: ${completedOps} completed, ${timedOutOps} timed out, max duration: ${totalDuration}ms`);

      // デッドロックが発生していないこと（大部分の操作が完了）
      expect(completedOps).toBeGreaterThan(deadlockTestOperations.length * 0.7); // 70%以上完了

      // 異常に長時間の操作がないこと
      expect(totalDuration).toBeLessThan(25000); // 25秒以内

      // システムは引き続き応答可能であること
      const systemHealthCheck = await container.validateAllSessions();
      expect(systemHealthCheck.length).toBeGreaterThan(0);

      console.log('✅ No deadlocks detected, system remains responsive');
    });

    it('should maintain atomicity in concurrent session updates', async () => {
      console.log('Testing atomicity in concurrent session updates...');

      const targetAccount = container.state.activeAccounts[0];
      const atomicityTestCount = 10;

      // 原子性テスト - セッション更新の中断とデータ整合性
      const atomicityOperations = Array.from({ length: atomicityTestCount }, async (_, index) => {
        try {
          const beforeOperation = {
            authState: await container.authService.getAccount(targetAccount.id),
            sessionState: container.sessionManager.getSessionState(targetAccount.profile.did),
            timestamp: Date.now()
          };

          // 並行でのセッション更新操作
          if (index % 2 === 0) {
            // セッション検証
            const validation = await container.validateAllSessions();
            const isSuccessful = validation && validation.some(v => v.accountId === targetAccount.profile.did);
            
            return {
              type: 'validation',
              success: isSuccessful,
              beforeState: beforeOperation,
              index
            };
          } else {
            // プロアクティブリフレッシュ
            const refreshResult = await container.sessionManager.proactiveRefresh(targetAccount.profile.did);
            
            return {
              type: 'refresh',
              success: refreshResult,
              beforeState: beforeOperation,
              index
            };
          }
        } catch (error) {
          return {
            type: 'error',
            success: false,
            error: error instanceof Error ? error.message : String(error),
            index
          };
        }
      });

      const atomicityResults = await Promise.allSettled(atomicityOperations);

      // 原子性確認 - 中間状態での不整合がないこと
      const finalAuthState = await container.authService.getAccount(targetAccount.id);
      const finalSessionState = container.sessionManager.getSessionState(targetAccount.profile.did);

      // 最終状態の整合性
      expect(finalAuthState.success).toBe(true);
      expect(finalAuthState.data!.profile.did).toBe(targetAccount.profile.did);
      
      if (finalSessionState) {
        expect(finalSessionState.accountId).toBe(targetAccount.profile.did);
        expect(finalSessionState.refreshInProgress).toBe(false); // 操作完了後
      }

      // 操作成功率の確認
      const successfulAtomicOps = atomicityResults.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;
      const atomicitySuccessRate = successfulAtomicOps / atomicityTestCount;

      console.log(`Atomicity test: ${successfulAtomicOps}/${atomicityTestCount} operations successful (${(atomicitySuccessRate * 100).toFixed(1)}%)`);

      expect(atomicitySuccessRate).toBeGreaterThan(0.6); // 60%以上成功

      console.log('✅ Atomicity maintained in concurrent session updates');
    });
  });

  // ===================================================================
  // 並行カオス・複合障害テスト
  // ===================================================================

  describe('Concurrent Chaos and Combined Failures', () => {
    it('should handle concurrent chaos with high parallelism', async () => {
      console.log('Testing concurrent chaos with high parallelism...');

      const concurrentChaosConfig: ChaosInjectionConfig = {
        type: 'concurrent_access',
        durationMs: 15000,
        intensity: 0.8, // 高並行度
        pattern: 'constant'
      };

      const beforeChaos = await container.validateAllSessions();
      const initialValidCount = beforeChaos.filter(v => v.isValid).length;

      // 並行カオス注入
      const chaosInjectionId = await chaosFramework.injectChaos(concurrentChaosConfig);

      // カオス中の並行操作テスト
      const duringChaosOperations = Array.from({ length: 20 }, async (_, index) => {
        const startTime = Date.now();
        
        try {
          const operation = index % 4;
          let result;
          
          switch (operation) {
            case 0:
              result = await container.validateAllSessions();
              return { type: 'validate', success: result && result.length > 0, duration: Date.now() - startTime };
            case 1:
              const account = container.state.activeAccounts[index % container.state.activeAccounts.length];
              result = await container.sessionManager.proactiveRefresh(account.profile.did);
              return { type: 'refresh', success: result, duration: Date.now() - startTime };
            case 2:
              const state = container.sessionManager.getSessionState(container.state.activeAccounts[0].profile.did);
              return { type: 'getState', success: state !== null, duration: Date.now() - startTime };
            case 3:
              const stats = container.getStatistics();
              return { type: 'stats', success: stats && typeof stats.totalEvents === 'number', duration: Date.now() - startTime };
            default:
              return { type: 'unknown', success: false, duration: Date.now() - startTime };
          }
        } catch (error) {
          return { type: 'error', success: false, error: error instanceof Error ? error.message : String(error), duration: Date.now() - startTime };
        }
      });

      const chaosResults = await Promise.allSettled(duringChaosOperations);

      // カオス終了まで待機
      await TimeControlHelper.wait(18000);

      // 回復後の検証
      const afterChaos = await container.validateAllSessions();
      const recoveredValidCount = afterChaos.filter(v => v.isValid).length;

      // 結果分析
      const successfulChaosOps = chaosResults.filter(r => 
        r.status === 'fulfilled' && r.value.success
      ).length;
      const chaosSuccessRate = successfulChaosOps / duringChaosOperations.length;
      const recoveryRate = recoveredValidCount / initialValidCount;

      console.log(`Concurrent chaos results:`);
      console.log(`  Operations during chaos: ${successfulChaosOps}/${duringChaosOperations.length} successful (${(chaosSuccessRate * 100).toFixed(1)}%)`);
      console.log(`  Recovery rate: ${(recoveryRate * 100).toFixed(1)}%`);

      // 並行カオス中でも一定の動作は維持
      expect(chaosSuccessRate).toBeGreaterThan(0.3); // 30%以上

      // 回復率の確認
      expect(recoveryRate).toBeGreaterThan(0.6); // 60%以上回復

      console.log('✅ System survived concurrent chaos with high parallelism');
    });

    it('should handle combined concurrency and resource pressure', async () => {
      console.log('Testing combined concurrency and resource pressure...');

      const combinedChaosConfigs: ChaosInjectionConfig[] = [
        {
          type: 'concurrent_access',
          durationMs: 12000,
          intensity: 0.7,
          pattern: 'constant',
          delayMs: 0
        },
        {
          type: 'memory_pressure',
          durationMs: 10000,
          intensity: 0.6,
          pattern: 'escalating',
          delayMs: 2000
        },
        {
          type: 'cpu_spike',
          durationMs: 8000,
          intensity: 0.5,
          pattern: 'spike',
          delayMs: 4000
        }
      ];

      const beforeCombined = await container.validateAllSessions();
      const initialMemory = process.memoryUsage();

      // 複合カオス実行
      const combinedResults = await chaosFramework.executeChaosSuite(combinedChaosConfigs);
      expect(combinedResults.length).toBe(3);

      // 複合カオス終了まで待機
      await TimeControlHelper.wait(15000);

      // 回復後の評価
      const afterCombined = await container.validateAllSessions();
      const finalMemory = process.memoryUsage();
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;

      // 複合カオスの影響評価
      const recoveredSessions = afterCombined.filter(v => v.isValid).length;
      const initialSessions = beforeCombined.filter(v => v.isValid).length;
      const combinedRecoveryRate = recoveredSessions / initialSessions;

      console.log(`Combined chaos recovery: ${recoveredSessions}/${initialSessions} sessions (${(combinedRecoveryRate * 100).toFixed(1)}%)`);
      console.log(`Memory increase: ${memoryIncrease.toFixed(1)}MB`);

      // 複合障害でも最低限の回復
      expect(combinedRecoveryRate).toBeGreaterThan(0.4); // 40%以上回復

      // メモリリークが深刻でないこと
      expect(memoryIncrease).toBeLessThan(150); // 150MB以下

      // レジリエンス評価
      const assessment = await chaosFramework.assessResilience(combinedResults);
      console.log(`Combined chaos resilience score: ${assessment.overallScore.toFixed(1)}/100`);

      expect(assessment.overallScore).toBeGreaterThan(35); // 複合障害では低めの基準

      console.log('✅ System survived combined concurrency and resource pressure');
    });

    it('should provide comprehensive concurrency resilience assessment', async () => {
      console.log('Conducting comprehensive concurrency resilience assessment...');

      const comprehensiveConcurrencyTests: ChaosInjectionConfig[] = [
        {
          type: 'concurrent_access',
          durationMs: 10000,
          intensity: 0.6,
          pattern: 'constant'
        },
        {
          type: 'random_crashes',
          durationMs: 8000,
          intensity: 0.2,
          pattern: 'intermittent',
          delayMs: 3000
        },
        {
          type: 'concurrent_access',
          durationMs: 12000,
          intensity: 0.8,
          pattern: 'escalating',
          delayMs: 8000
        }
      ];

      const testResults = await chaosFramework.executeChaosSuite(comprehensiveConcurrencyTests);
      expect(testResults.length).toBe(3);

      // 並行処理耐性評価
      const assessment = await chaosFramework.assessResilience(testResults);

      console.log(`Concurrency resilience assessment:`);
      console.log(`  Overall Score: ${assessment.overallScore.toFixed(1)}/100`);
      console.log(`  Fault Tolerance: ${assessment.faultToleranceScore.toFixed(1)}/100`);
      console.log(`  Recovery Capability: ${assessment.recoveryScore.toFixed(1)}/100`);
      console.log(`  Performance Maintenance: ${assessment.performanceMaintenanceScore.toFixed(1)}/100`);
      console.log(`  Data Integrity: ${assessment.dataIntegrityScore.toFixed(1)}/100`);

      // 並行処理特化の評価基準
      expect(assessment.overallScore).toBeGreaterThan(50); // 並行処理では中程度の基準
      expect(assessment.dataIntegrityScore).toBeGreaterThan(70); // データ整合性は重要
      expect(assessment.faultToleranceScore).toBeGreaterThan(60); // 障害許容性

      // 推奨事項の確認
      expect(assessment.recommendations.length).toBeGreaterThan(0);
      
      console.log('\nConcurrency optimization recommendations:');
      assessment.recommendations.forEach((rec: string, index: number) => {
        console.log(`  ${index + 1}. ${rec}`);
      });

      // 最終的なシステム状態確認
      const finalValidation = await container.validateAllSessions();
      const finalAccounts = container.state.activeAccounts;

      console.log(`Final state - ${finalValidation.filter(v => v.isValid).length}/${finalValidation.length} valid sessions`);
      console.log(`Active accounts: ${finalAccounts.length}`);

      // システムは安定していること
      expect(finalValidation.filter(v => v.isValid).length).toBeGreaterThan(0);
      expect(finalAccounts.length).toBeGreaterThan(0);

      // データ整合性の最終確認
      for (const account of finalAccounts.slice(0, 3)) { // 最初の3つをチェック
        const authResult = await container.authService.getAccount(account.id);
        expect(authResult.success).toBe(true);
        expect(authResult.data!.profile.did).toBe(account.profile.did);
      }

      console.log('✅ Comprehensive concurrency resilience assessment completed');
    });
  });
});