/**
 * Resource Chaos Test Suite
 * Issue #92 Phase 4 Wave 1: リソース制限テスト
 * 
 * セッション管理システムのリソース制約下での動作を検証
 * - メモリ圧迫・リークシミュレーション
 * - CPU負荷・スパイクテスト
 * - ディスク容量・I/O制限
 * - リソース枯渇からの回復
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChaosTestingFramework, type ChaosInjectionConfig } from '../../../test-utils/chaosTestingFramework.js';
import { IntegrationTestContainer } from '../../../test-utils/integrationTestContainer.js';
import { TimeControlHelper } from '../../../test-utils/sessionTestUtils.js';

describe('Resource Chaos Engineering Tests', () => {
  let container: IntegrationTestContainer;
  let chaosFramework: ChaosTestingFramework;

  beforeEach(async () => {
    container = new IntegrationTestContainer({
      initialAccountCount: 6,
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
  // メモリ圧迫テスト
  // ===================================================================

  describe('Memory Pressure Testing', () => {
    it('should handle gradual memory pressure gracefully', async () => {
      const gradualMemoryPressure: ChaosInjectionConfig[] = [
        // 軽度メモリ圧迫
        {
          type: 'memory_pressure',
          durationMs: 8000,
          intensity: 0.3, // 30MB消費
          pattern: 'constant',
          delayMs: 0
        },
        // 中度メモリ圧迫
        {
          type: 'memory_pressure',
          durationMs: 10000,
          intensity: 0.6, // 60MB消費
          pattern: 'escalating',
          delayMs: 4000
        },
        // 高度メモリ圧迫
        {
          type: 'memory_pressure',
          durationMs: 6000,
          intensity: 0.9, // 90MB消費
          pattern: 'constant',
          delayMs: 12000
        }
      ];

      console.log('Testing gradual memory pressure escalation...');

      // メモリ使用量の監視開始
      const initialMemory = process.memoryUsage();
      console.log(`Initial memory usage: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(1)}MB`);

      const beforeValidation = await container.validateAllSessions();
      const initialValidCount = beforeValidation.filter(v => v.isValid).length;

      // 段階的メモリ圧迫の実行
      const results = await chaosFramework.executeChaosSuite(gradualMemoryPressure);
      expect(results.length).toBe(3);

      // 各段階での影響評価
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const stage = i + 1;
        
        console.log(`Memory pressure stage ${stage}:`);
        console.log(`  Recovery time: ${result.systemImpact.recoveryTimeMs || 'N/A'}ms`);
        console.log(`  Performance degradation: ${(result.systemImpact.performanceDegradation * 100).toFixed(1)}%`);

        // 高度な圧迫でも完全停止しないこと
        expect(result.recoveryValidation.autoRecoverySuccessful).toBe(true);
      }

      // 最終的な回復確認
      await TimeControlHelper.wait(5000); // 回復時間
      const afterValidation = await container.validateAllSessions();
      const recoveredCount = afterValidation.filter(v => v.isValid).length;

      // メモリ圧迫後の回復率確認
      const recoveryRate = recoveredCount / initialValidCount;
      console.log(`Memory pressure recovery rate: ${(recoveryRate * 100).toFixed(1)}%`);
      expect(recoveryRate).toBeGreaterThan(0.7);

      // メモリリークの確認
      const finalMemory = process.memoryUsage();
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
      console.log(`Memory increase after test: ${memoryIncrease.toFixed(1)}MB`);
      
      // メモリリークが深刻でないこと（50MB以下の増加）
      expect(memoryIncrease).toBeLessThan(50);
    });

    it('should recover from extreme memory pressure', async () => {
      console.log('Testing extreme memory pressure recovery...');

      const extremeMemoryConfig: ChaosInjectionConfig = {
        type: 'memory_pressure',
        durationMs: 15000,
        intensity: 1.0, // 最大100MB消費
        pattern: 'constant'
      };

      const beforeExtreme = await container.validateAllSessions();
      const beforeMemory = process.memoryUsage();

      // 極限メモリ圧迫注入
      const injectionId = await chaosFramework.injectChaos(extremeMemoryConfig);

      // 圧迫中のシステム動作確認
      let operationsDuringPressure = 0;
      let successfulOperations = 0;

      for (let i = 0; i < 5; i++) {
        operationsDuringPressure++;
        
        try {
          const duringPressure = await container.validateAllSessions();
          if (duringPressure && duringPressure.length > 0) {
            successfulOperations++;
          }
        } catch (error) {
          // メモリ圧迫中のエラーは許容される
        }

        await TimeControlHelper.wait(2000);
      }

      // 圧迫終了まで待機
      await TimeControlHelper.wait(18000);

      // 強制的なガベージコレクション（可能な場合）
      if (global.gc) {
        global.gc();
        await TimeControlHelper.wait(2000);
      }

      // 回復後の動作確認
      const afterExtreme = await container.validateAllSessions();
      const afterMemory = process.memoryUsage();

      // 極限状況でも一部は動作していたこと
      const operationalRate = successfulOperations / operationsDuringPressure;
      console.log(`Operations during extreme pressure: ${(operationalRate * 100).toFixed(1)}%`);
      expect(operationalRate).toBeGreaterThan(0.2); // 20%以上は動作

      // 最終的に回復すること
      const finalValidCount = afterExtreme.filter(v => v.isValid).length;
      expect(finalValidCount).toBeGreaterThan(0);

      // メモリ使用量の確認
      const memoryDelta = (afterMemory.heapUsed - beforeMemory.heapUsed) / 1024 / 1024;
      console.log(`Memory delta after extreme pressure: ${memoryDelta.toFixed(1)}MB`);
      
      console.log('✅ System recovered from extreme memory pressure');
    });

    it('should detect and handle memory leaks', async () => {
      console.log('Testing memory leak detection and handling...');

      const memoryLeakSimulation: ChaosInjectionConfig[] = [
        // 継続的なメモリ消費パターン
        {
          type: 'memory_pressure',
          durationMs: 6000,
          intensity: 0.4,
          pattern: 'escalating',
          delayMs: 0
        },
        {
          type: 'memory_pressure',
          durationMs: 6000,
          intensity: 0.5,
          pattern: 'escalating',
          delayMs: 2000
        },
        {
          type: 'memory_pressure',
          durationMs: 6000,
          intensity: 0.6,
          pattern: 'escalating',
          delayMs: 6000
        }
      ];

      const memorySnapshots: Array<{ time: number; usage: number }> = [];
      
      // 初期メモリ状態
      const initialMemory = process.memoryUsage();
      memorySnapshots.push({ 
        time: 0, 
        usage: initialMemory.heapUsed / 1024 / 1024 
      });

      // メモリリークシミュレーション実行
      const results = await chaosFramework.executeChaosSuite(memoryLeakSimulation);

      // 実行中のメモリ監視
      for (let i = 0; i < 8; i++) {
        await TimeControlHelper.wait(2000);
        const currentMemory = process.memoryUsage();
        memorySnapshots.push({
          time: (i + 1) * 2000,
          usage: currentMemory.heapUsed / 1024 / 1024
        });
      }

      // メモリ増加傾向の分析
      const memoryTrend = memorySnapshots.map((snapshot, index) => {
        if (index === 0) return 0;
        return snapshot.usage - memorySnapshots[0].usage;
      });

      console.log('Memory usage trend:');
      memorySnapshots.forEach((snapshot, index) => {
        console.log(`  ${(snapshot.time / 1000).toFixed(1)}s: ${snapshot.usage.toFixed(1)}MB (+${memoryTrend[index].toFixed(1)}MB)`);
      });

      // 強制的なクリーンアップ
      if (global.gc) {
        global.gc();
        await TimeControlHelper.wait(3000);
      }

      const cleanupMemory = process.memoryUsage();
      const finalIncrease = (cleanupMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
      
      console.log(`Final memory increase: ${finalIncrease.toFixed(1)}MB`);

      // メモリリークが制御されていること
      expect(finalIncrease).toBeLessThan(100); // 100MB以下の増加

      // システムは引き続き動作可能であること
      const finalValidation = await container.validateAllSessions();
      expect(finalValidation.filter(v => v.isValid).length).toBeGreaterThan(0);
    });
  });

  // ===================================================================
  // CPU負荷テスト
  // ===================================================================

  describe('CPU Load Testing', () => {
    it('should handle high CPU load with graceful degradation', async () => {
      const cpuLoadLevels = [
        { intensity: 0.3, description: 'Light CPU load (30%)' },
        { intensity: 0.6, description: 'Medium CPU load (60%)' },
        { intensity: 0.9, description: 'Heavy CPU load (90%)' }
      ];

      for (const level of cpuLoadLevels) {
        console.log(`Testing ${level.description}...`);

        const cpuLoadConfig: ChaosInjectionConfig = {
          type: 'cpu_spike',
          durationMs: 8000,
          intensity: level.intensity,
          pattern: 'constant'
        };

        const beforeLoad = Date.now();
        const beforeValidation = await container.validateAllSessions();
        const baselineTime = Date.now() - beforeLoad;

        // CPU負荷注入
        const injectionId = await chaosFramework.injectChaos(cpuLoadConfig);

        // 負荷中の応答時間測定
        const duringLoadStart = Date.now();
        const duringValidation = await container.validateAllSessions();
        const loadedTime = Date.now() - duringLoadStart;

        // 負荷終了まで待機
        await TimeControlHelper.wait(10000);

        // 負荷解除後の応答時間測定
        const afterLoadStart = Date.now();
        const afterValidation = await container.validateAllSessions();
        const recoveryTime = Date.now() - afterLoadStart;

        // 性能影響の評価
        const performanceImpact = (loadedTime - baselineTime) / baselineTime;
        const recoveryRatio = recoveryTime / baselineTime;

        console.log(`  Baseline: ${baselineTime}ms, Under load: ${loadedTime}ms, After load: ${recoveryTime}ms`);
        console.log(`  Performance impact: ${(performanceImpact * 100).toFixed(1)}%, Recovery ratio: ${recoveryRatio.toFixed(2)}x`);

        // CPU負荷に応じた性能劣化は許容されるが、完全停止はしない
        expect(duringValidation.length).toBeGreaterThan(0);
        
        // 回復後は性能が戻ること
        expect(recoveryRatio).toBeLessThan(3.0); // ベースラインの3倍以内に回復

        // セッション有効性は維持されること
        const validSessions = afterValidation.filter(v => v.isValid).length;
        expect(validSessions).toBeGreaterThan(0);
      }
    });

    it('should handle CPU spikes and bursts', async () => {
      console.log('Testing CPU spike and burst patterns...');

      const cpuSpikeConfig: ChaosInjectionConfig = {
        type: 'cpu_spike',
        durationMs: 12000,
        intensity: 1.0, // 最大負荷
        pattern: 'spike' // スパイクパターン
      };

      const responseTimeBefore: number[] = [];
      const responseTimeDuring: number[] = [];
      const responseTimeAfter: number[] = [];

      // スパイク前の応答時間測定
      for (let i = 0; i < 3; i++) {
        const start = Date.now();
        await container.validateAllSessions();
        responseTimeBefore.push(Date.now() - start);
        await TimeControlHelper.wait(1000);
      }

      // CPUスパイク注入
      const injectionId = await chaosFramework.injectChaos(cpuSpikeConfig);

      // スパイク中の応答時間測定
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        try {
          await container.validateAllSessions();
          responseTimeDuring.push(Date.now() - start);
        } catch (error) {
          responseTimeDuring.push(30000); // タイムアウトとして30秒
        }
        await TimeControlHelper.wait(2000);
      }

      // スパイク終了まで待機
      await TimeControlHelper.wait(15000);

      // スパイク後の応答時間測定
      for (let i = 0; i < 3; i++) {
        const start = Date.now();
        await container.validateAllSessions();
        responseTimeAfter.push(Date.now() - start);
        await TimeControlHelper.wait(1000);
      }

      // 統計計算
      const avgBefore = responseTimeBefore.reduce((sum, time) => sum + time, 0) / responseTimeBefore.length;
      const avgDuring = responseTimeDuring.reduce((sum, time) => sum + time, 0) / responseTimeDuring.length;
      const avgAfter = responseTimeAfter.reduce((sum, time) => sum + time, 0) / responseTimeAfter.length;

      console.log(`Response times - Before: ${avgBefore.toFixed(0)}ms, During: ${avgDuring.toFixed(0)}ms, After: ${avgAfter.toFixed(0)}ms`);

      // CPUスパイク中は遅延が発生するが、完全停止はしない
      expect(avgDuring).toBeGreaterThan(avgBefore);
      expect(avgDuring).toBeLessThan(60000); // 1分以内には応答

      // スパイク後は性能が回復
      expect(avgAfter).toBeLessThan(avgDuring * 0.5);
      expect(avgAfter / avgBefore).toBeLessThan(2.0); // ベースラインの2倍以内

      console.log('✅ System survived CPU spike and burst patterns');
    });

    it('should maintain CPU performance under sustained load', async () => {
      console.log('Testing sustained CPU performance...');

      const sustainedCpuConfig: ChaosInjectionConfig = {
        type: 'cpu_spike',
        durationMs: 30000, // 30秒の継続負荷
        intensity: 0.7, // 70%負荷
        pattern: 'constant'
      };

      const performanceMetrics: Array<{ timestamp: number; responseTime: number; success: boolean }> = [];

      // 継続負荷注入
      const injectionId = await chaosFramework.injectChaos(sustainedCpuConfig);

      // 負荷中の継続的なパフォーマンス測定
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        let success = false;
        
        try {
          const validation = await container.validateAllSessions();
          success = validation && validation.length > 0;
        } catch (error) {
          success = false;
        }

        performanceMetrics.push({
          timestamp: Date.now(),
          responseTime: Date.now() - start,
          success
        });

        await TimeControlHelper.wait(3000);
      }

      // 負荷終了まで待機
      await TimeControlHelper.wait(35000);

      // パフォーマンス分析
      const successfulOperations = performanceMetrics.filter(m => m.success);
      const failedOperations = performanceMetrics.filter(m => !m.success);
      const avgResponseTime = successfulOperations.reduce((sum, m) => sum + m.responseTime, 0) / successfulOperations.length || 0;

      console.log(`Sustained load results:`);
      console.log(`  Successful operations: ${successfulOperations.length}/${performanceMetrics.length}`);
      console.log(`  Average response time: ${avgResponseTime.toFixed(0)}ms`);
      console.log(`  Success rate: ${(successfulOperations.length / performanceMetrics.length * 100).toFixed(1)}%`);

      // 継続負荷下でも最低限の動作は維持
      const successRate = successfulOperations.length / performanceMetrics.length;
      expect(successRate).toBeGreaterThan(0.5); // 50%以上は成功

      // 応答時間が異常に長くないこと
      expect(avgResponseTime).toBeLessThan(15000); // 15秒以内

      // 最終的な回復確認
      const finalValidation = await container.validateAllSessions();
      expect(finalValidation.filter(v => v.isValid).length).toBeGreaterThan(0);
    });
  });

  // ===================================================================
  // 複合リソース制約テスト
  // ===================================================================

  describe('Combined Resource Constraints', () => {
    it('should handle simultaneous memory and CPU pressure', async () => {
      console.log('Testing simultaneous memory and CPU pressure...');

      const combinedResourceConfig: ChaosInjectionConfig[] = [
        {
          type: 'memory_pressure',
          durationMs: 15000,
          intensity: 0.7, // 70MB
          pattern: 'constant',
          delayMs: 0
        },
        {
          type: 'cpu_spike',
          durationMs: 12000,
          intensity: 0.8, // 80%負荷
          pattern: 'constant',
          delayMs: 2000
        }
      ];

      const beforeCombined = await container.validateAllSessions();
      const initialValidCount = beforeCombined.filter(v => v.isValid).length;
      const initialMemory = process.memoryUsage();

      // 複合リソース圧迫実行
      const results = await chaosFramework.executeChaosSuite(combinedResourceConfig);
      expect(results.length).toBe(2);

      // 圧迫終了まで待機
      await TimeControlHelper.wait(18000);

      // 回復後の評価
      const afterCombined = await container.validateAllSessions();
      const finalValidCount = afterCombined.filter(v => v.isValid).length;
      const finalMemory = process.memoryUsage();

      // 複合圧迫からの回復率
      const recoveryRate = finalValidCount / initialValidCount;
      console.log(`Combined pressure recovery rate: ${(recoveryRate * 100).toFixed(1)}%`);

      // メモリ使用量の変化
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
      console.log(`Memory increase: ${memoryIncrease.toFixed(1)}MB`);

      // 複合圧迫でも最低限の回復は期待
      expect(recoveryRate).toBeGreaterThan(0.5); // 50%以上回復

      // レジリエンス評価
      const assessment = await chaosFramework.assessResilience(results);
      console.log(`Combined pressure resilience score: ${assessment.overallScore.toFixed(1)}/100`);

      expect(assessment.overallScore).toBeGreaterThan(40); // 複合圧迫では基準を下げる
    });

    it('should prioritize critical operations under resource constraints', async () => {
      console.log('Testing operation prioritization under resource constraints...');

      const resourceConstraintConfig: ChaosInjectionConfig[] = [
        {
          type: 'memory_pressure',
          durationMs: 10000,
          intensity: 0.8,
          pattern: 'constant'
        },
        {
          type: 'cpu_spike',
          durationMs: 8000,
          intensity: 0.9,
          pattern: 'constant',
          delayMs: 1000
        }
      ];

      // 優先度の高い操作（セッション検証）と低い操作を定義
      const criticalOperationResults: boolean[] = [];
      const normalOperationResults: boolean[] = [];

      // リソース制約注入
      const injectionPromises = resourceConstraintConfig.map(config => 
        chaosFramework.injectChaos(config)
      );
      await Promise.all(injectionPromises);

      // 制約下での操作実行
      for (let i = 0; i < 6; i++) {
        // 重要な操作：セッション検証
        try {
          const validation = await container.validateAllSessions();
          criticalOperationResults.push(validation && validation.length > 0);
        } catch (error) {
          criticalOperationResults.push(false);
        }

        // 通常の操作：統計取得
        try {
          const stats = container.getStatistics();
          normalOperationResults.push(stats && typeof stats.totalEvents === 'number');
        } catch (error) {
          normalOperationResults.push(false);
        }

        await TimeControlHelper.wait(1500);
      }

      // 制約終了まで待機
      await TimeControlHelper.wait(12000);

      // 優先度による成功率の差を評価
      const criticalSuccessRate = criticalOperationResults.filter(success => success).length / criticalOperationResults.length;
      const normalSuccessRate = normalOperationResults.filter(success => success).length / normalOperationResults.length;

      console.log(`Critical operations success rate: ${(criticalSuccessRate * 100).toFixed(1)}%`);
      console.log(`Normal operations success rate: ${(normalSuccessRate * 100).toFixed(1)}%`);

      // 重要な操作は優先的に成功すること
      expect(criticalSuccessRate).toBeGreaterThan(normalSuccessRate * 0.8);
      expect(criticalSuccessRate).toBeGreaterThan(0.3); // 最低30%は成功

      console.log('✅ Operation prioritization working under resource constraints');
    });

    it('should implement adaptive resource management', async () => {
      console.log('Testing adaptive resource management...');

      const adaptiveResourceTest: ChaosInjectionConfig[] = [
        // 段階的なリソース制約
        {
          type: 'memory_pressure',
          durationMs: 6000,
          intensity: 0.4,
          pattern: 'escalating',
          delayMs: 0
        },
        {
          type: 'cpu_spike',
          durationMs: 6000,
          intensity: 0.5,
          pattern: 'escalating',
          delayMs: 2000
        },
        {
          type: 'memory_pressure',
          durationMs: 8000,
          intensity: 0.8,
          pattern: 'constant',
          delayMs: 6000
        }
      ];

      const adaptationMetrics: Array<{
        phase: string;
        responseTime: number;
        memoryUsage: number;
        successRate: number;
      }> = [];

      // フェーズ1：ベースライン
      const baselineResults = await this.measurePhasePerformance(container, 'baseline', 3);
      adaptationMetrics.push(baselineResults);

      // リソース制約の段階的適用
      const results = await chaosFramework.executeChaosSuite(adaptiveResourceTest);

      // フェーズ2：軽度制約
      await TimeControlHelper.wait(2000);
      const lightConstraintResults = await this.measurePhasePerformance(container, 'light-constraint', 2);
      adaptationMetrics.push(lightConstraintResults);

      // フェーズ3：中度制約
      await TimeControlHelper.wait(3000);
      const mediumConstraintResults = await this.measurePhasePerformance(container, 'medium-constraint', 2);
      adaptationMetrics.push(mediumConstraintResults);

      // 制約終了まで待機
      await TimeControlHelper.wait(15000);

      // フェーズ4：回復後
      const recoveryResults = await this.measurePhasePerformance(container, 'recovery', 3);
      adaptationMetrics.push(recoveryResults);

      // 適応性能の分析
      console.log('\nAdaptive performance metrics:');
      adaptationMetrics.forEach(metric => {
        console.log(`${metric.phase}: ${metric.responseTime.toFixed(0)}ms, ${metric.memoryUsage.toFixed(1)}MB, ${(metric.successRate * 100).toFixed(1)}% success`);
      });

      // 適応性の評価
      const baseline = adaptationMetrics[0];
      const recovery = adaptationMetrics[adaptationMetrics.length - 1];

      // 制約下でも完全停止しないこと
      adaptationMetrics.forEach(metric => {
        expect(metric.successRate).toBeGreaterThan(0);
      });

      // 回復後はベースラインに近い性能まで戻ること
      const recoveryRatio = recovery.responseTime / baseline.responseTime;
      expect(recoveryRatio).toBeLessThan(3.0); // ベースラインの3倍以内

      console.log(`Performance recovery ratio: ${recoveryRatio.toFixed(2)}x`);
      console.log('✅ Adaptive resource management validated');
    });

    // ヘルパーメソッド：フェーズ性能測定
    async function measurePhasePerformance(
      container: IntegrationTestContainer, 
      phase: string, 
      iterations: number
    ): Promise<{ phase: string; responseTime: number; memoryUsage: number; successRate: number }> {
      const responseTimes: number[] = [];
      let successCount = 0;

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        
        try {
          const validation = await container.validateAllSessions();
          responseTimes.push(Date.now() - start);
          
          if (validation && validation.length > 0) {
            successCount++;
          }
        } catch (error) {
          responseTimes.push(30000); // タイムアウトとして
        }

        await TimeControlHelper.wait(500);
      }

      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
      const successRate = successCount / iterations;

      return {
        phase,
        responseTime: avgResponseTime,
        memoryUsage,
        successRate
      };
    }
  });

  // ===================================================================
  // リソース回復・最適化テスト
  // ===================================================================

  describe('Resource Recovery and Optimization', () => {
    let container: IntegrationTestContainer;
    let chaosFramework: ChaosTestingFramework;

    beforeEach(async () => {
      container = new IntegrationTestContainer({
        initialAccountCount: 6,
        enableJWTManager: true,
        enableBackgroundMonitor: true,
        logLevel: 'warn'
      });
      await container.setup();

      chaosFramework = new ChaosTestingFramework(container);
    });

    afterEach(async () => {
      await container.teardown();
    });

    it('should implement intelligent resource cleanup', async () => {
      console.log('Testing intelligent resource cleanup...');

      // リソース蓄積フェーズ
      const resourceAccumulationConfig: ChaosInjectionConfig[] = [
        {
          type: 'memory_pressure',
          durationMs: 8000,
          intensity: 0.6,
          pattern: 'escalating'
        },
        {
          type: 'memory_pressure',
          durationMs: 6000,
          intensity: 0.4,
          pattern: 'constant',
          delayMs: 5000
        }
      ];

      const beforeAccumulation = process.memoryUsage();
      
      // リソース蓄積の実行
      await chaosFramework.executeChaosSuite(resourceAccumulationConfig);
      
      const afterAccumulation = process.memoryUsage();
      const memoryIncrease = (afterAccumulation.heapUsed - beforeAccumulation.heapUsed) / 1024 / 1024;
      
      console.log(`Memory increase after accumulation: ${memoryIncrease.toFixed(1)}MB`);

      // クリーンアップフェーズ
      console.log('Triggering cleanup mechanisms...');
      
      // 明示的なガベージコレクション
      if (global.gc) {
        global.gc();
      }

      // システムの自然なクリーンアップを待機
      await TimeControlHelper.wait(10000);

      // 軽負荷での動作を続けてクリーンアップを促進
      for (let i = 0; i < 5; i++) {
        await container.validateAllSessions();
        await TimeControlHelper.wait(2000);
      }

      const afterCleanup = process.memoryUsage();
      const finalMemoryIncrease = (afterCleanup.heapUsed - beforeAccumulation.heapUsed) / 1024 / 1024;
      const cleanupEfficiency = (memoryIncrease - finalMemoryIncrease) / memoryIncrease;

      console.log(`Memory increase after cleanup: ${finalMemoryIncrease.toFixed(1)}MB`);
      console.log(`Cleanup efficiency: ${(cleanupEfficiency * 100).toFixed(1)}%`);

      // クリーンアップが効果的であること
      expect(cleanupEfficiency).toBeGreaterThan(0.3); // 30%以上のクリーンアップ
      expect(finalMemoryIncrease).toBeLessThan(memoryIncrease * 0.8); // 80%以下に削減

      // システムは正常動作すること
      const finalValidation = await container.validateAllSessions();
      expect(finalValidation.filter(v => v.isValid).length).toBeGreaterThan(0);

      console.log('✅ Intelligent resource cleanup validated');
    });

    it('should provide comprehensive resource resilience assessment', async () => {
      console.log('Conducting comprehensive resource resilience assessment...');

      const comprehensiveResourceTests: ChaosInjectionConfig[] = [
        {
          type: 'memory_pressure',
          durationMs: 8000,
          intensity: 0.7,
          pattern: 'constant'
        },
        {
          type: 'cpu_spike',
          durationMs: 6000,
          intensity: 0.8,
          pattern: 'spike',
          delayMs: 3000
        },
        {
          type: 'memory_pressure',
          durationMs: 10000,
          intensity: 0.9,
          pattern: 'escalating',
          delayMs: 8000
        }
      ];

      const testResults = await chaosFramework.executeChaosSuite(comprehensiveResourceTests);
      expect(testResults.length).toBe(3);

      // リソース耐性評価
      const assessment = await chaosFramework.assessResilience(testResults);

      console.log(`Resource resilience assessment:`);
      console.log(`  Overall Score: ${assessment.overallScore.toFixed(1)}/100`);
      console.log(`  Fault Tolerance: ${assessment.faultToleranceScore.toFixed(1)}/100`);
      console.log(`  Recovery Capability: ${assessment.recoveryScore.toFixed(1)}/100`);
      console.log(`  Performance Maintenance: ${assessment.performanceMaintenanceScore.toFixed(1)}/100`);
      console.log(`  Data Integrity: ${assessment.dataIntegrityScore.toFixed(1)}/100`);

      // リソース制約特化の評価基準
      expect(assessment.overallScore).toBeGreaterThan(55); // リソース制約では少し緩い基準
      expect(assessment.recoveryScore).toBeGreaterThan(60); // 回復力は重要
      expect(assessment.performanceMaintenanceScore).toBeGreaterThan(50); // 性能維持

      // 推奨事項の有用性確認
      expect(assessment.recommendations.length).toBeGreaterThan(0);
      
      console.log('\nResource optimization recommendations:');
      assessment.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });

      // 最終システム状態の確認
      const finalValidation = await container.validateAllSessions();
      const finalMemory = process.memoryUsage();
      
      console.log(`Final state - Valid sessions: ${finalValidation.filter(v => v.isValid).length}/${finalValidation.length}`);
      console.log(`Final memory usage: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(1)}MB`);

      expect(finalValidation.filter(v => v.isValid).length).toBeGreaterThan(0);

      console.log('✅ Comprehensive resource resilience assessment completed');
    });
  });
});