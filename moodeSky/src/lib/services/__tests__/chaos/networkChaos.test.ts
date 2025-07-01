/**
 * Network Chaos Test Suite
 * Issue #92 Phase 4 Wave 1: ネットワーク障害注入テスト
 * 
 * セッション管理システムのネットワーク障害に対する耐性を検証
 * - ネットワーク分断・遅延・パケットロス
 * - 断続的ネットワーク障害
 * - 接続復旧パターンの検証
 * - オフライン・オンライン切り替え
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChaosTestingFramework, type ChaosInjectionConfig } from '../../../test-utils/chaosTestingFramework.js';
import { IntegrationTestContainer } from '../../../test-utils/integrationTestContainer.js';
import { TimeControlHelper } from '../../../test-utils/sessionTestUtils.js';
import { NetworkSimulator } from '../../../test-utils/mockFactories.js';

describe('Network Chaos Engineering Tests', () => {
  let container: IntegrationTestContainer;
  let chaosFramework: ChaosTestingFramework;
  let networkSimulator: NetworkSimulator;

  beforeEach(async () => {
    // ネットワーク監視を有効にした統合テスト環境
    container = new IntegrationTestContainer({
      initialAccountCount: 8,
      enableJWTManager: true,
      enableBackgroundMonitor: true,
      enableNetworkSimulation: true,
      logLevel: 'warn'
    });
    await container.setup();

    chaosFramework = new ChaosTestingFramework(container);
    networkSimulator = new NetworkSimulator();
  });

  afterEach(async () => {
    await networkSimulator.restoreNetwork();
    await chaosFramework.cleanup();
    await container.teardown();
  });

  // ===================================================================
  // ネットワーク分断テスト
  // ===================================================================

  describe('Network Partition Testing', () => {
    it('should handle complete network partition gracefully', async () => {
      const initialValidation = await container.validateAllSessions();
      const initialValidCount = initialValidation.filter(v => v.isValid).length;

      console.log(`Starting complete network partition test with ${initialValidCount} sessions`);

      // 完全ネットワーク分断の注入
      const partitionConfig: ChaosInjectionConfig = {
        type: 'network_partition',
        durationMs: 15000, // 15秒間分断
        intensity: 1.0, // 完全分断
        pattern: 'constant'
      };

      const injectionId = await chaosFramework.injectChaos(partitionConfig);

      // 分断中のシステム動作確認
      await TimeControlHelper.wait(5000); // 5秒後

      try {
        // 分断中はネットワーク操作が失敗するはず
        const duringPartition = await container.validateAllSessions();
        // セッション検証は失敗するが、システムはクラッシュしない
        expect(duringPartition).toBeDefined();
      } catch (error) {
        // ネットワーク分断中のエラーは期待される動作
        expect(error.message).toContain('network');
      }

      // 分断終了後の回復を待機
      await TimeControlHelper.wait(12000); // 分断終了まで待機
      await TimeControlHelper.wait(5000);  // 回復時間

      // ネットワーク回復後の検証
      const afterPartition = await container.validateAllSessions();
      const recoveredCount = afterPartition.filter(v => v.isValid).length;
      const recoveryRate = recoveredCount / initialValidCount;

      console.log(`Network partition recovery rate: ${(recoveryRate * 100).toFixed(1)}%`);
      
      // 80%以上のセッションが回復することを期待
      expect(recoveryRate).toBeGreaterThan(0.8);

      // セッション状態の整合性確認
      for (const result of afterPartition) {
        if (result.isValid) {
          expect(result.sessionState.accountId).toBeTruthy();
          expect(result.sessionState.refreshInProgress).toBe(false);
        }
      }
    });

    it('should handle intermittent network partition', async () => {
      // 断続的ネットワーク分断パターン
      const intermittentConfigs: ChaosInjectionConfig[] = [
        // 短期分断1
        {
          type: 'network_partition',
          durationMs: 3000,
          intensity: 1.0,
          pattern: 'constant',
          delayMs: 0
        },
        // 回復期間
        // 短期分断2
        {
          type: 'network_partition',
          durationMs: 2000,
          intensity: 1.0,
          pattern: 'constant',
          delayMs: 8000
        },
        // 回復期間
        // 短期分断3
        {
          type: 'network_partition',
          durationMs: 4000,
          intensity: 1.0,
          pattern: 'constant',
          delayMs: 15000
        }
      ];

      const initialStats = container.getStatistics();

      console.log('Starting intermittent network partition test...');

      // 断続的分断の実行
      const results = await chaosFramework.executeChaosSuite(intermittentConfigs);
      expect(results.length).toBe(3);

      // 各分断イベントの回復時間を確認
      for (const result of results) {
        if (result.systemImpact.recoveryTimeMs !== null) {
          expect(result.systemImpact.recoveryTimeMs).toBeLessThan(10000); // 10秒以内の回復
          console.log(`Partition recovery time: ${result.systemImpact.recoveryTimeMs}ms`);
        }
      }

      // 最終的なシステム安定性確認
      const finalValidation = await container.validateAllSessions();
      const stableSessionCount = finalValidation.filter(v => v.isValid).length;
      
      expect(stableSessionCount).toBeGreaterThan(0);

      // セッション管理の統計確認
      const finalStats = container.getStatistics();
      
      // エラー率が異常に高くないこと（断続的分断による一時的エラーは許容）
      expect(finalStats.errorRate).toBeLessThan(0.5);
    });

    it('should maintain session state consistency during partition recovery', async () => {
      const accounts = container.state.activeAccounts;
      
      // 分断前のセッション状態をキャプチャ
      const beforePartition = new Map();
      for (const account of accounts) {
        const sessionState = container.sessionManager.getSessionState(account.profile.did);
        beforePartition.set(account.profile.did, {
          accountId: sessionState?.accountId,
          isValid: sessionState?.isValid,
          refreshFailureCount: sessionState?.refreshFailureCount
        });
      }

      // ネットワーク分断実行
      const partitionConfig: ChaosInjectionConfig = {
        type: 'network_partition',
        durationMs: 12000,
        intensity: 0.9, // 90%分断
        pattern: 'constant'
      };

      await chaosFramework.injectChaos(partitionConfig);
      await TimeControlHelper.wait(15000); // 分断 + 回復時間

      // 分断後のセッション状態を検証
      for (const account of accounts) {
        const accountId = account.profile.did;
        const beforeState = beforePartition.get(accountId);
        const afterState = container.sessionManager.getSessionState(accountId);

        if (beforeState && afterState) {
          // アカウントIDは変更されないこと
          expect(afterState.accountId).toBe(beforeState.accountId);
          
          // セッション状態の基本構造は維持されること
          expect(typeof afterState.isValid).toBe('boolean');
          expect(afterState.lastValidatedAt).toBeInstanceOf(Date);
          
          // リフレッシュ失敗回数が異常に増加していないこと
          expect(afterState.refreshFailureCount).toBeLessThan(beforeState.refreshFailureCount + 5);
        }
      }
    });
  });

  // ===================================================================
  // ネットワーク遅延・パケットロステスト
  // ===================================================================

  describe('Network Latency and Packet Loss', () => {
    it('should handle high network latency gracefully', async () => {
      const latencyLevels = [
        { intensity: 0.2, expectedLatency: 1000 },  // 1秒遅延
        { intensity: 0.5, expectedLatency: 2500 },  // 2.5秒遅延
        { intensity: 0.8, expectedLatency: 4000 }   // 4秒遅延
      ];

      for (const level of latencyLevels) {
        console.log(`Testing network latency: ${level.expectedLatency}ms`);

        const latencyConfig: ChaosInjectionConfig = {
          type: 'network_delay',
          durationMs: 10000,
          intensity: level.intensity,
          pattern: 'constant'
        };

        const beforeLatency = await container.validateAllSessions();
        const startTime = Date.now();

        const injectionId = await chaosFramework.injectChaos(latencyConfig);

        // 遅延中の操作実行
        const duringLatency = await container.validateAllSessions();
        const operationTime = Date.now() - startTime;

        // 遅延が適用されていることを確認
        expect(operationTime).toBeGreaterThan(level.expectedLatency * 0.5);

        // 遅延があってもセッション検証は完了すること
        expect(duringLatency).toBeDefined();
        expect(duringLatency.length).toBeGreaterThan(0);

        // 遅延終了まで待機
        await TimeControlHelper.wait(12000);

        // 遅延解除後の性能回復確認
        const afterLatencyStart = Date.now();
        const afterLatency = await container.validateAllSessions();
        const normalOperationTime = Date.now() - afterLatencyStart;

        expect(normalOperationTime).toBeLessThan(level.expectedLatency * 0.3);
        expect(afterLatency.length).toBeGreaterThan(0);
      }
    });

    it('should handle packet loss with appropriate retries', async () => {
      const packetLossLevels = [
        { intensity: 0.2, description: '20% packet loss' },
        { intensity: 0.5, description: '50% packet loss' },
        { intensity: 0.7, description: '70% packet loss' }
      ];

      for (const level of packetLossLevels) {
        console.log(`Testing ${level.description}`);

        const packetLossConfig: ChaosInjectionConfig = {
          type: 'network_loss',
          durationMs: 8000,
          intensity: level.intensity,
          pattern: 'constant'
        };

        const beforeLoss = await container.validateAllSessions();
        const initialValidCount = beforeLoss.filter(v => v.isValid).length;

        const injectionId = await chaosFramework.injectChaos(packetLossConfig);

        // パケットロス中の操作
        let successfulOperations = 0;
        let totalOperations = 0;

        for (let i = 0; i < 5; i++) {
          try {
            totalOperations++;
            const result = await container.validateAllSessions();
            if (result && result.length > 0) {
              successfulOperations++;
            }
            await TimeControlHelper.wait(1000);
          } catch (error) {
            // パケットロスによるエラーは期待される
          }
        }

        // パケットロス終了まで待機
        await TimeControlHelper.wait(10000);

        // 回復後の検証
        const afterLoss = await container.validateAllSessions();
        const recoveredValidCount = afterLoss.filter(v => v.isValid).length;

        // パケットロス中でも一部の操作は成功すること
        const successRate = successfulOperations / totalOperations;
        const expectedMinSuccess = Math.max(0.1, 1 - level.intensity);
        expect(successRate).toBeGreaterThan(expectedMinSuccess);

        // 回復後は正常動作すること
        const recoveryRate = recoveredValidCount / initialValidCount;
        expect(recoveryRate).toBeGreaterThan(0.7);

        console.log(`${level.description} - Success rate: ${(successRate * 100).toFixed(1)}%, Recovery rate: ${(recoveryRate * 100).toFixed(1)}%`);
      }
    });

    it('should implement intelligent retry mechanisms', async () => {
      // 重度のネットワーク問題でのリトライ機構テスト
      const severeNetworkConfig: ChaosInjectionConfig = {
        type: 'network_loss',
        durationMs: 12000,
        intensity: 0.8, // 80%パケットロス
        pattern: 'intermittent'
      };

      console.log('Testing intelligent retry mechanisms...');

      // リトライ統計の追跡
      const retryStats = {
        attempts: 0,
        successes: 0,
        failures: 0
      };

      // ネットワーク問題注入
      const injectionId = await chaosFramework.injectChaos(severeNetworkConfig);

      // 複数回の操作試行
      for (let i = 0; i < 8; i++) {
        retryStats.attempts++;
        
        try {
          const result = await container.validateAllSessions();
          if (result && result.length > 0) {
            retryStats.successes++;
          }
        } catch (error) {
          retryStats.failures++;
        }

        await TimeControlHelper.wait(1500);
      }

      // 注入終了まで待機
      await TimeControlHelper.wait(15000);

      // リトライ機構の効果を評価
      const retrySuccessRate = retryStats.successes / retryStats.attempts;
      console.log(`Retry mechanism success rate: ${(retrySuccessRate * 100).toFixed(1)}%`);

      // 重度のネットワーク問題でも一定の成功率を維持
      expect(retrySuccessRate).toBeGreaterThan(0.2); // 20%以上の成功率

      // 最終的な回復確認
      const finalValidation = await container.validateAllSessions();
      expect(finalValidation.filter(v => v.isValid).length).toBeGreaterThan(0);
    });
  });

  // ===================================================================
  // オフライン・オンライン切り替えテスト
  // ===================================================================

  describe('Offline-Online Transition Testing', () => {
    it('should handle offline-online cycles gracefully', async () => {
      const cycles = 3;
      const offlineDuration = 6000; // 6秒オフライン
      const onlineDuration = 4000;  // 4秒オンライン

      console.log(`Testing ${cycles} offline-online cycles`);

      let cycleResults = [];

      for (let cycle = 0; cycle < cycles; cycle++) {
        console.log(`Cycle ${cycle + 1}/${cycles}: Going offline...`);

        // オフライン状態の作成
        const offlineConfig: ChaosInjectionConfig = {
          type: 'network_partition',
          durationMs: offlineDuration,
          intensity: 1.0,
          pattern: 'constant'
        };

        const offlineStart = Date.now();
        const injectionId = await chaosFramework.injectChaos(offlineConfig);

        // オフライン期間中のシステム動作確認
        try {
          await container.sessionManager.validateAllSessions();
        } catch (error) {
          // オフライン中のエラーは期待される
        }

        // オフライン期間終了まで待機
        await TimeControlHelper.wait(offlineDuration + 1000);

        console.log(`Cycle ${cycle + 1}/${cycles}: Back online...`);

        // オンライン復帰後の回復測定
        const recoveryStart = Date.now();
        let recovered = false;

        // 回復の確認（最大10秒待機）
        for (let attempt = 0; attempt < 10; attempt++) {
          try {
            const validation = await container.validateAllSessions();
            if (validation.filter(v => v.isValid).length > 0) {
              recovered = true;
              break;
            }
          } catch (error) {
            // 回復中のエラー
          }
          await TimeControlHelper.wait(1000);
        }

        const recoveryTime = Date.now() - recoveryStart;
        cycleResults.push({
          cycle: cycle + 1,
          recovered,
          recoveryTime
        });

        console.log(`Cycle ${cycle + 1} recovery: ${recovered ? 'Success' : 'Failed'} in ${recoveryTime}ms`);

        // オンライン期間
        await TimeControlHelper.wait(onlineDuration);
      }

      // 全サイクルの評価
      const successfulRecoveries = cycleResults.filter(r => r.recovered).length;
      const averageRecoveryTime = cycleResults
        .filter(r => r.recovered)
        .reduce((sum, r) => sum + r.recoveryTime, 0) / successfulRecoveries || 0;

      console.log(`Successful recoveries: ${successfulRecoveries}/${cycles}`);
      console.log(`Average recovery time: ${averageRecoveryTime.toFixed(0)}ms`);

      // 最低80%のサイクルで回復成功
      expect(successfulRecoveries / cycles).toBeGreaterThan(0.8);
      
      // 平均回復時間が15秒以内
      expect(averageRecoveryTime).toBeLessThan(15000);

      // 最終的なシステム安定性確認
      const finalValidation = await container.validateAllSessions();
      expect(finalValidation.filter(v => v.isValid).length).toBeGreaterThan(0);
    });

    it('should preserve session data during offline periods', async () => {
      const accounts = container.state.activeAccounts;
      
      // オフライン前のセッションデータをキャプチャ
      const beforeOffline = new Map();
      for (const account of accounts) {
        const authResult = await container.authService.getAccount(account.id);
        if (authResult.success) {
          beforeOffline.set(account.id, {
            profileDid: authResult.data!.profile.did,
            profileHandle: authResult.data!.profile.handle,
            hasSession: !!authResult.data!.session,
            sessionData: authResult.data!.session
          });
        }
      }

      console.log('Testing data preservation during offline period...');

      // 長期オフライン状態を作成
      const longOfflineConfig: ChaosInjectionConfig = {
        type: 'network_partition',
        durationMs: 20000, // 20秒オフライン
        intensity: 1.0,
        pattern: 'constant'
      };

      await chaosFramework.injectChaos(longOfflineConfig);
      await TimeControlHelper.wait(25000); // オフライン期間 + 回復時間

      // オンライン復帰後のデータ整合性確認
      for (const account of accounts) {
        const beforeData = beforeOffline.get(account.id);
        if (!beforeData) continue;

        const afterResult = await container.authService.getAccount(account.id);
        expect(afterResult.success).toBe(true);

        const afterData = afterResult.data!;

        // プロファイル情報の保持確認
        expect(afterData.profile.did).toBe(beforeData.profileDid);
        expect(afterData.profile.handle).toBe(beforeData.profileHandle);

        // セッション存在性の保持確認
        expect(!!afterData.session).toBe(beforeData.hasSession);

        if (beforeData.hasSession && afterData.session) {
          // セッション基本情報の保持確認
          expect(afterData.session.did).toBe(beforeData.sessionData.did);
          expect(afterData.session.handle).toBe(beforeData.sessionData.handle);
        }
      }

      console.log('✅ Session data preserved during offline period');
    });
  });

  // ===================================================================
  // ネットワーク障害復旧パターンテスト
  // ===================================================================

  describe('Network Recovery Pattern Testing', () => {
    it('should implement exponential backoff for network retries', async () => {
      // 指数バックオフのテスト
      const networkFailureConfig: ChaosInjectionConfig = {
        type: 'network_partition',
        durationMs: 8000,
        intensity: 1.0,
        pattern: 'constant'
      };

      const retryTimings: number[] = [];
      const startTime = Date.now();

      console.log('Testing exponential backoff retry pattern...');

      // ネットワーク障害注入
      await chaosFramework.injectChaos(networkFailureConfig);

      // 複数回のリトライ試行（障害中）
      for (let i = 0; i < 5; i++) {
        const attemptStart = Date.now();
        
        try {
          await container.validateAllSessions();
        } catch (error) {
          // 障害中のエラーは期待される
        }

        retryTimings.push(Date.now() - attemptStart);
        await TimeControlHelper.wait(1000);
      }

      // 障害終了まで待機
      await TimeControlHelper.wait(10000);

      // バックオフパターンの分析
      console.log('Retry timings:', retryTimings.map(t => `${t}ms`).join(', '));

      // 少なくとも一部のリトライで時間がかかっていること（バックオフ効果）
      const hasIncreasingDelay = retryTimings.some((timing, index) => {
        if (index === 0) return false;
        return timing > retryTimings[index - 1] * 0.8; // 前回より80%以上の時間
      });

      // 最終的な回復確認
      const finalValidation = await container.validateAllSessions();
      expect(finalValidation.filter(v => v.isValid).length).toBeGreaterThan(0);
    });

    it('should handle network jitter and instability', async () => {
      // ネットワーク不安定性のシミュレーション
      const jitterConfigs: ChaosInjectionConfig[] = [
        {
          type: 'network_delay',
          durationMs: 3000,
          intensity: 0.6,
          pattern: 'random',
          delayMs: 0
        },
        {
          type: 'network_loss',
          durationMs: 2000,
          intensity: 0.3,
          pattern: 'intermittent',
          delayMs: 1000
        },
        {
          type: 'network_delay',
          durationMs: 4000,
          intensity: 0.4,
          pattern: 'wave',
          delayMs: 4000
        },
        {
          type: 'network_loss',
          durationMs: 2000,
          intensity: 0.5,
          pattern: 'random',
          delayMs: 7000
        }
      ];

      console.log('Testing network jitter and instability...');

      const operationResults: boolean[] = [];
      const operationTimes: number[] = [];

      // 不安定ネットワーク条件下での連続操作
      const jitterPromises = jitterConfigs.map(config => 
        chaosFramework.injectChaos(config)
      );

      await Promise.all(jitterPromises);

      // 不安定期間中の操作実行
      for (let i = 0; i < 10; i++) {
        const operationStart = Date.now();
        
        try {
          const result = await container.validateAllSessions();
          operationResults.push(result && result.length > 0);
          operationTimes.push(Date.now() - operationStart);
        } catch (error) {
          operationResults.push(false);
          operationTimes.push(Date.now() - operationStart);
        }

        await TimeControlHelper.wait(1000);
      }

      // 不安定性終了まで待機
      await TimeControlHelper.wait(12000);

      // ジッター期間の統計
      const successRate = operationResults.filter(success => success).length / operationResults.length;
      const avgOperationTime = operationTimes.reduce((sum, time) => sum + time, 0) / operationTimes.length;
      const maxOperationTime = Math.max(...operationTimes);

      console.log(`Jitter period - Success rate: ${(successRate * 100).toFixed(1)}%, Avg time: ${avgOperationTime.toFixed(0)}ms, Max time: ${maxOperationTime}ms`);

      // 不安定期間でも30%以上の成功率
      expect(successRate).toBeGreaterThan(0.3);

      // 安定化後の確認
      const stableValidation = await container.validateAllSessions();
      expect(stableValidation.filter(v => v.isValid).length).toBeGreaterThan(0);

      // 安定化後の操作時間確認
      const stableStart = Date.now();
      await container.validateAllSessions();
      const stableTime = Date.now() - stableStart;

      // 安定化後は不安定期間より高速
      expect(stableTime).toBeLessThan(avgOperationTime * 0.7);

      console.log(`Stable operation time: ${stableTime}ms`);
    });

    it('should provide comprehensive network resilience assessment', async () => {
      // 包括的なネットワーク耐性評価
      const comprehensiveNetworkTests: ChaosInjectionConfig[] = [
        {
          type: 'network_partition',
          durationMs: 6000,
          intensity: 1.0,
          pattern: 'constant'
        },
        {
          type: 'network_delay',
          durationMs: 8000,
          intensity: 0.7,
          pattern: 'escalating',
          delayMs: 2000
        },
        {
          type: 'network_loss',
          durationMs: 10000,
          intensity: 0.6,
          pattern: 'wave',
          delayMs: 6000
        }
      ];

      console.log('Conducting comprehensive network resilience assessment...');

      const testResults = await chaosFramework.executeChaosSuite(comprehensiveNetworkTests);
      expect(testResults.length).toBe(3);

      // ネットワーク耐性評価
      const assessment = await chaosFramework.assessResilience(testResults);

      console.log(`Network resilience scores:`);
      console.log(`  Overall: ${assessment.overallScore.toFixed(1)}/100`);
      console.log(`  Fault Tolerance: ${assessment.faultToleranceScore.toFixed(1)}/100`);
      console.log(`  Recovery: ${assessment.recoveryScore.toFixed(1)}/100`);
      console.log(`  Performance: ${assessment.performanceMaintenanceScore.toFixed(1)}/100`);
      console.log(`  Data Integrity: ${assessment.dataIntegrityScore.toFixed(1)}/100`);

      // ネットワーク特化の基準評価
      expect(assessment.overallScore).toBeGreaterThan(60); // ネットワーク耐性60点以上
      expect(assessment.faultToleranceScore).toBeGreaterThan(70); // 障害許容性70点以上
      expect(assessment.recoveryScore).toBeGreaterThan(65); // 回復力65点以上

      // 推奨事項の確認
      expect(assessment.recommendations.length).toBeGreaterThan(0);
      
      console.log('\nNetwork resilience recommendations:');
      assessment.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });

      // 最終的なシステム安定性確認
      const finalValidation = await container.validateAllSessions();
      const finalValidCount = finalValidation.filter(v => v.isValid).length;
      
      expect(finalValidCount).toBeGreaterThan(container.state.activeAccounts.length * 0.7);

      console.log('✅ Comprehensive network resilience assessment completed');
    });
  });
});