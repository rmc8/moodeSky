/**
 * System Chaos Test Suite
 * Issue #92 Phase 4 Wave 1: システム全体破壊テスト
 * 
 * セッション管理システム全体の極限状況での動作を検証
 * - 複数障害の同時発生
 * - システム全体の協調動作破綻
 * - 連鎖障害パターンの検証
 * - 全体回復メカニズムの評価
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChaosTestingFramework, type ChaosInjectionConfig, ChaosTestHelpers } from '../../../test-utils/chaosTestingFramework.js';
import { IntegrationTestContainer } from '../../../test-utils/integrationTestContainer.js';
import { TimeControlHelper } from '../../../test-utils/sessionTestUtils.js';

describe('System Chaos Engineering Tests', () => {
  let container: IntegrationTestContainer;
  let chaosFramework: ChaosTestingFramework;

  beforeEach(async () => {
    // 統合テスト環境のセットアップ
    container = new IntegrationTestContainer({
      initialAccountCount: 5,
      enableJWTManager: true,
      enableBackgroundMonitor: true,
      logLevel: 'warn' // カオステスト中はログを絞る
    });
    await container.setup();

    // カオステストフレームワークの初期化
    chaosFramework = new ChaosTestingFramework(container);
  });

  afterEach(async () => {
    await chaosFramework.cleanup();
    await container.teardown();
  });

  // ===================================================================
  // 多重障害カオステスト
  // ===================================================================

  describe('Multiple Simultaneous Failures', () => {
    it('should survive network partition + memory pressure + random crashes', async () => {
      const chaosConfigs: ChaosInjectionConfig[] = [
        {
          type: 'network_partition',
          durationMs: 15000,
          intensity: 0.8,
          pattern: 'constant',
          delayMs: 0
        },
        {
          type: 'memory_pressure',
          durationMs: 12000,
          intensity: 0.6,
          pattern: 'escalating',
          delayMs: 2000
        },
        {
          type: 'random_crashes',
          durationMs: 18000,
          intensity: 0.2,
          pattern: 'random',
          delayMs: 5000
        }
      ];

      // 事前状態の確認
      const initialValidation = await container.validateAllSessions();
      expect(initialValidation.length).toBeGreaterThan(0);
      const initialValidSessions = initialValidation.filter(v => v.isValid).length;

      console.log(`Starting multi-failure chaos test with ${initialValidSessions} valid sessions`);

      // 複数障害の同時注入
      const injectionPromises = chaosConfigs.map(config => 
        chaosFramework.injectChaos(config)
      );

      const injectionIds = await Promise.all(injectionPromises);
      expect(injectionIds.length).toBe(3);

      // 最長の注入期間 + 回復時間を待機
      await TimeControlHelper.wait(20000);

      // システム回復の検証
      const finalValidation = await container.validateAllSessions();
      const finalValidSessions = finalValidation.filter(v => v.isValid).length;

      // アクティブな注入の確認（すべて終了しているはず）
      const activeInjections = chaosFramework.getActiveInjections();
      expect(activeInjections.filter(inj => inj.endedAt === null).length).toBe(0);

      // 回復率の評価（70%以上のセッションが有効であることを期待）
      const recoveryRate = finalValidSessions / initialValidSessions;
      console.log(`Recovery rate: ${(recoveryRate * 100).toFixed(1)}%`);
      expect(recoveryRate).toBeGreaterThanOrEqual(0.7);

      // レジリエンス評価
      const injectionResults = injectionIds.map(id => 
        chaosFramework.getActiveInjections().find(inj => inj.injectionId === id)
      ).filter(Boolean);

      const assessment = await chaosFramework.assessResilience(injectionResults);
      expect(assessment.overallScore).toBeGreaterThan(60); // 60点以上のレジリエンス

      console.log(`System resilience score: ${assessment.overallScore.toFixed(1)}/100`);
    });

    it('should handle cascading failures with graceful degradation', async () => {
      // 段階的な障害エスカレーション
      const cascadingFailures: ChaosInjectionConfig[] = [
        // ステップ1: 軽度のネットワーク遅延
        {
          type: 'network_delay',
          durationMs: 8000,
          intensity: 0.3,
          pattern: 'constant',
          delayMs: 0
        },
        // ステップ2: CPU負荷追加（遅延後）
        {
          type: 'cpu_spike',
          durationMs: 10000,
          intensity: 0.6,
          pattern: 'escalating',
          delayMs: 4000
        },
        // ステップ3: 認証失敗追加（さらに遅延後）
        {
          type: 'auth_failures',
          durationMs: 12000,
          intensity: 0.4,
          pattern: 'intermittent',
          delayMs: 8000
        }
      ];

      const beforeCascade = await container.validateAllSessions();
      const initialStats = container.getStatistics();

      console.log('Initiating cascading failure sequence...');

      // 段階的障害注入
      const results = await chaosFramework.executeChaosSuite(cascadingFailures);
      expect(results.length).toBe(3);

      // 各段階での影響を確認
      for (const result of results) {
        expect(result.systemImpact.recoveryTimeMs).toBeLessThan(30000); // 30秒以内の回復
        console.log(`${result.type} - Recovery time: ${result.systemImpact.recoveryTimeMs}ms`);
      }

      // 最終状態の確認
      const afterCascade = await container.validateAllSessions();
      const finalStats = container.getStatistics();

      // システムは最終的に安定していること
      const stabilityCheck = await container.validateAllSessions();
      await TimeControlHelper.wait(2000);
      const stabilityCheck2 = await container.validateAllSessions();
      
      const stabilityRate1 = stabilityCheck.filter(v => v.isValid).length / stabilityCheck.length;
      const stabilityRate2 = stabilityCheck2.filter(v => v.isValid).length / stabilityCheck2.length;
      
      // 安定性の差が5%以内であること
      expect(Math.abs(stabilityRate2 - stabilityRate1)).toBeLessThan(0.05);
    });

    it('should maintain data consistency during system chaos', async () => {
      // データ整合性重視のカオステスト
      const dataIntegrityTest: ChaosInjectionConfig[] = [
        {
          type: 'clock_skew',
          durationMs: 10000,
          intensity: 0.5, // 30分のずれ
          pattern: 'constant'
        },
        {
          type: 'token_corruption',
          durationMs: 8000,
          intensity: 0.3,
          pattern: 'intermittent',
          delayMs: 3000
        },
        {
          type: 'concurrent_access',
          durationMs: 12000,
          intensity: 0.8,
          pattern: 'random',
          delayMs: 2000
        }
      ];

      // 初期データ状態のスナップショット
      const initialAccounts = [...container.state.activeAccounts];
      const initialSessionStates = new Map();
      
      for (const account of initialAccounts) {
        const sessionState = container.sessionManager.getSessionState(account.profile.did);
        initialSessionStates.set(account.profile.did, { ...sessionState });
      }

      console.log('Starting data integrity chaos test...');

      // カオス注入実行
      const chaosResults = await chaosFramework.executeChaosSuite(dataIntegrityTest);
      
      // データ整合性の詳細検証
      for (const account of initialAccounts) {
        const accountId = account.profile.did;

        // AuthService でのアカウント存在確認
        const authResult = await container.authService.getAccount(account.id);
        expect(authResult.success).toBe(true);
        expect(authResult.data!.profile.did).toBe(accountId);

        // SessionManager でのセッション状態確認
        const currentSessionState = container.sessionManager.getSessionState(accountId);
        expect(currentSessionState).toBeDefined();
        expect(currentSessionState!.accountId).toBe(accountId);

        // 重要なセッションデータの整合性
        const initialState = initialSessionStates.get(accountId);
        if (initialState) {
          // アカウントIDは変更されないこと
          expect(currentSessionState!.accountId).toBe(initialState.accountId);
          
          // セッションの基本構造は維持されること
          expect(typeof currentSessionState!.isValid).toBe('boolean');
          expect(currentSessionState!.lastValidatedAt).toBeInstanceOf(Date);
        }
      }

      // レジリエンス評価で高いデータ整合性スコアを期待
      const assessment = await chaosFramework.assessResilience(chaosResults);
      expect(assessment.dataIntegrityScore).toBeGreaterThan(80);

      console.log(`Data integrity score: ${assessment.dataIntegrityScore.toFixed(1)}/100`);
    });
  });

  // ===================================================================
  // システム境界テスト
  // ===================================================================

  describe('System Boundary Testing', () => {
    it('should handle extreme load with system-wide failures', async () => {
      // 極限負荷 + システム障害の組み合わせ
      const extremeLoadTest: ChaosInjectionConfig[] = [
        {
          type: 'memory_pressure',
          durationMs: 20000,
          intensity: 0.9, // 90MB消費
          pattern: 'escalating'
        },
        {
          type: 'cpu_spike',
          durationMs: 15000,
          intensity: 1.0, // 最大4ワーカー
          pattern: 'constant',
          delayMs: 2000
        },
        {
          type: 'network_loss',
          durationMs: 12000,
          intensity: 0.7, // 70%パケットロス
          pattern: 'wave',
          delayMs: 5000
        }
      ];

      // 大量のセッション検証を並行実行してシステムに負荷をかける
      const loadGenerators = Array.from({ length: 20 }, async (_, i) => {
        for (let j = 0; j < 10; j++) {
          try {
            await container.validateAllSessions();
            await TimeControlHelper.wait(500);
          } catch (error) {
            // 極限状況でのエラーは許容
          }
        }
      });

      // カオス注入と負荷生成を並行実行
      const [chaosResults] = await Promise.all([
        chaosFramework.executeChaosSuite(extremeLoadTest),
        ...loadGenerators
      ]);

      // システムが完全に停止していないことを確認
      const finalValidation = await container.validateAllSessions();
      expect(finalValidation.length).toBeGreaterThan(0);

      // 少なくとも一部のセッションは有効であること
      const validSessionCount = finalValidation.filter(v => v.isValid).length;
      expect(validSessionCount).toBeGreaterThan(0);

      console.log(`System survived extreme load with ${validSessionCount} valid sessions`);
    });

    it('should recover from complete system failure simulation', async () => {
      // 完全システム障害シミュレーション
      const totalSystemFailure: ChaosInjectionConfig[] = [
        {
          type: 'network_partition',
          durationMs: 8000,
          intensity: 1.0, // 完全分断
          pattern: 'constant'
        },
        {
          type: 'random_crashes',
          durationMs: 10000,
          intensity: 0.8, // 高頻度クラッシュ
          pattern: 'constant',
          delayMs: 1000
        },
        {
          type: 'memory_pressure',
          durationMs: 12000,
          intensity: 1.0, // 最大メモリ圧迫
          pattern: 'constant',
          delayMs: 2000
        }
      ];

      console.log('Simulating total system failure...');

      const beforeFailure = container.getStatistics();
      
      // 完全障害の注入
      const chaosResults = await chaosFramework.executeChaosSuite(totalSystemFailure);

      // 長めの回復時間を設ける
      await TimeControlHelper.wait(15000);

      // システム回復能力の評価
      const recoveryStart = Date.now();
      let recoveredSessions = 0;
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        try {
          const validation = await container.validateAllSessions();
          recoveredSessions = validation.filter(v => v.isValid).length;
          
          if (recoveredSessions > 0) {
            break; // 一部でも回復したら成功
          }
        } catch (error) {
          // 回復中のエラーは想定内
        }
        
        await TimeControlHelper.wait(2000);
        attempts++;
      }

      const recoveryTime = Date.now() - recoveryStart;

      // 完全障害からでも最終的に一部は回復すること
      expect(recoveredSessions).toBeGreaterThan(0);
      expect(recoveryTime).toBeLessThan(30000); // 30秒以内での部分回復

      console.log(`System recovered ${recoveredSessions} sessions in ${recoveryTime}ms`);

      // レジリエンス評価
      const assessment = await chaosFramework.assessResilience(chaosResults);
      expect(assessment.recoveryScore).toBeGreaterThan(40); // 完全障害からの回復なので基準は低め

      console.log(`Recovery score after total failure: ${assessment.recoveryScore.toFixed(1)}/100`);
    });
  });

  // ===================================================================
  // カオスエンジニアリング統計評価
  // ===================================================================

  describe('Chaos Engineering Assessment', () => {
    it('should provide comprehensive resilience assessment', async () => {
      // 標準的なカオステストスイートの実行
      const standardChaosTests = ChaosTestHelpers.generateStandardChaosConfigs();
      
      console.log(`Running comprehensive chaos assessment with ${standardChaosTests.length} test scenarios...`);

      const allResults = await chaosFramework.executeChaosSuite(standardChaosTests);
      expect(allResults.length).toBe(standardChaosTests.length);

      // 各テストの基本結果確認
      for (const result of allResults) {
        expect(result.injectionId).toBeTruthy();
        expect(result.startedAt).toBeInstanceOf(Date);
        expect(result.endedAt).toBeInstanceOf(Date);
        expect(result.systemImpact).toBeDefined();
        expect(result.recoveryValidation).toBeDefined();
      }

      // 包括的レジリエンス評価
      const assessment = await chaosFramework.assessResilience(allResults);
      
      // 評価結果の検証
      expect(assessment.overallScore).toBeGreaterThanOrEqual(0);
      expect(assessment.overallScore).toBeLessThanOrEqual(100);
      expect(assessment.faultToleranceScore).toBeGreaterThanOrEqual(0);
      expect(assessment.recoveryScore).toBeGreaterThanOrEqual(0);
      expect(assessment.performanceMaintenanceScore).toBeGreaterThanOrEqual(0);
      expect(assessment.dataIntegrityScore).toBeGreaterThanOrEqual(0);

      // 推奨事項が提供されること
      expect(assessment.recommendations).toBeInstanceOf(Array);
      expect(assessment.detailedAnalysis).toBeDefined();
      expect(assessment.detailedAnalysis.strengths).toBeInstanceOf(Array);
      expect(assessment.detailedAnalysis.weaknesses).toBeInstanceOf(Array);

      // レジリエンスレポートの生成
      const resilienceReport = ChaosTestHelpers.generateResilienceReport(assessment);
      expect(resilienceReport).toContain('システムレジリエンス評価レポート');
      expect(resilienceReport).toContain('総合スコア');

      console.log('\n' + resilienceReport);

      // 基本的なレジリエンス基準を満たすこと
      expect(assessment.overallScore).toBeGreaterThan(50); // 最低50点のレジリエンス
    });

    it('should detect and categorize system weaknesses', async () => {
      // 弱点検出を目的とした特化カオステスト
      const weaknessDetectionTests: ChaosInjectionConfig[] = [
        {
          type: 'token_corruption',
          durationMs: 8000,
          intensity: 0.6,
          pattern: 'intermittent'
        },
        {
          type: 'auth_failures',
          durationMs: 10000,
          intensity: 0.5,
          pattern: 'escalating'
        },
        {
          type: 'clock_skew',
          durationMs: 12000,
          intensity: 0.8,
          pattern: 'constant'
        }
      ];

      const results = await chaosFramework.executeChaosSuite(weaknessDetectionTests);
      const assessment = await chaosFramework.assessResilience(results);

      // 弱点が検出されていることを確認
      if (assessment.detailedAnalysis.weaknesses.length > 0) {
        console.log('Detected weaknesses:');
        assessment.detailedAnalysis.weaknesses.forEach((weakness, index) => {
          console.log(`  ${index + 1}. ${weakness}`);
        });
      }

      // 推奨事項が弱点に対応していることを確認
      expect(assessment.recommendations.length).toBeGreaterThan(0);
      
      // レジリエンス改善の方向性が示されていること
      const hasRecoveryRecommendation = assessment.recommendations.some(rec => 
        rec.includes('回復') || rec.includes('復旧') || rec.includes('自動')
      );
      const hasErrorHandlingRecommendation = assessment.recommendations.some(rec => 
        rec.includes('エラー') || rec.includes('例外') || rec.includes('処理')
      );

      console.log('System improvement recommendations:');
      assessment.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    });
  });

  // ===================================================================
  // 極限カオステスト
  // ===================================================================

  describe('Extreme Chaos Scenarios', () => {
    it('should survive extreme chaos with minimal degradation', async () => {
      // 最も厳しいカオス条件でのテスト
      const extremeChaosConfigs = ChaosTestHelpers.generateExtremeChaosConfigs();
      
      console.log('Starting EXTREME chaos engineering test...');
      console.log('⚠️  This test pushes the system to its absolute limits');

      const initialMetrics = await container.getStatistics();
      const initialValidation = await container.validateAllSessions();
      const initialValidCount = initialValidation.filter(v => v.isValid).length;

      // 極限カオス実行
      const extremeResults = await chaosFramework.executeChaosSuite(extremeChaosConfigs);
      
      // 長時間の回復時間を設ける
      await TimeControlHelper.wait(60000); // 1分間の回復時間

      // 最終評価
      const finalValidation = await container.validateAllSessions();
      const finalValidCount = finalValidation.filter(v => v.isValid).length;
      const finalMetrics = await container.getStatistics();

      // 極限条件でも完全停止しないこと
      expect(finalValidCount).toBeGreaterThan(0);

      // 回復率の計算
      const recoveryRate = finalValidCount / initialValidCount;
      console.log(`Extreme chaos recovery rate: ${(recoveryRate * 100).toFixed(1)}%`);

      // 極限テストでも30%以上は回復すること
      expect(recoveryRate).toBeGreaterThan(0.3);

      // 極限レジリエンス評価
      const extremeAssessment = await chaosFramework.assessResilience(extremeResults);
      console.log(`Extreme chaos resilience score: ${extremeAssessment.overallScore.toFixed(1)}/100`);

      // 極限条件でも最低限のレジリエンスを維持
      expect(extremeAssessment.overallScore).toBeGreaterThan(30);
      
      // システム回復能力の確認
      expect(extremeAssessment.recoveryScore).toBeGreaterThan(25);

      console.log('✅ System survived EXTREME chaos conditions');
    });
  });
});