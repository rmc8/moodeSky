/**
 * Stress Load Performance Test Suite
 * Issue #92 Phase 4 Wave 1: ストレス負荷パフォーマンステスト
 * 
 * セッション管理システムの極限負荷での動作を検証
 * - 段階的ストレス負荷増加
 * - 限界点・破綻点の特定
 * - 負荷回復パターンの検証
 * - リソース枯渇・復旧テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceBenchmarkSuite, type PerformanceTestConfig, PerformanceTestHelpers } from '../../../test-utils/performanceBenchmarkSuite.js';
import { IntegrationTestContainer } from '../../../test-utils/integrationTestContainer.js';
import { TimeControlHelper, AccountTestFactory } from '../../../test-utils/sessionTestUtils.js';

describe('Stress Load Performance Tests', () => {
  let container: IntegrationTestContainer;
  let performanceSuite: PerformanceBenchmarkSuite;

  beforeEach(async () => {
    // ストレステスト用の最適化設定
    container = new IntegrationTestContainer({
      initialAccountCount: 20, // ストレステスト用
      enableJWTManager: true,
      enableBackgroundMonitor: false, // ストレステスト中は無効化
      logLevel: 'error' // ログを最小限に
    });
    await container.setup();

    performanceSuite = new PerformanceBenchmarkSuite(container);
  });

  afterEach(async () => {
    await performanceSuite.stopAllTests();
    await container.teardown();
  });

  // ===================================================================
  // 段階的ストレス負荷テスト
  // ===================================================================

  describe('Progressive Stress Load Testing', () => {
    it('should handle progressive stress load increases', async () => {
      console.log('Testing progressive stress load increases...');

      const stressLevels = [
        { level: 1, concurrent: 10, requestRate: 50, duration: 30000, label: 'Light stress' },
        { level: 2, concurrent: 25, requestRate: 100, duration: 30000, label: 'Medium stress' },
        { level: 3, concurrent: 50, requestRate: 200, duration: 30000, label: 'High stress' },
        { level: 4, concurrent: 100, requestRate: 400, duration: 20000, label: 'Extreme stress' }
      ];

      const stressResults: Array<{
        level: number;
        throughput: number;
        responseTime: number;
        errorRate: number;
        memoryUsage: number;
        successful: boolean;
      }> = [];

      for (const stress of stressLevels) {
        console.log(`\nApplying ${stress.label} (Level ${stress.level})...`);
        console.log(`  Concurrent users: ${stress.concurrent}, Request rate: ${stress.requestRate}/s`);

        const stressConfig: PerformanceTestConfig = {
          type: 'stress',
          name: `Progressive Stress Level ${stress.level}`,
          durationMs: stress.duration,
          concurrentUsers: stress.concurrent,
          requestRate: stress.requestRate,
          dataVolume: {
            accountCount: container.state.activeAccounts.length,
            sessionCount: container.state.activeAccounts.length,
            tokenCount: container.state.activeAccounts.length * 2
          },
          loadPattern: 'escalating',
          expectations: {
            maxResponseTimeMs: 15000,
            maxMemoryUsageMB: 400 + (stress.level * 100),
            maxCpuUsage: 80 + (stress.level * 5),
            maxErrorRate: 10 + (stress.level * 10),
            minThroughput: stress.requestRate * 0.3
          },
          options: {
            enableProfiling: true,
            samplingIntervalMs: 3000
          }
        };

        const beforeMemory = process.memoryUsage();
        const beforeTime = Date.now();

        try {
          const stressMetrics = await performanceSuite.runPerformanceTest(stressConfig);
          const testDuration = Date.now() - beforeTime;
          const afterMemory = process.memoryUsage();

          const result = {
            level: stress.level,
            throughput: stressMetrics.throughput.avgRps,
            responseTime: stressMetrics.responseTime.avg,
            errorRate: stressMetrics.errors.errorRate,
            memoryUsage: afterMemory.heapUsed / 1024 / 1024,
            successful: stressMetrics.errors.errorRate < (stress.level * 15) // 許容エラー率
          };

          stressResults.push(result);

          console.log(`  Results: ${result.throughput.toFixed(1)} req/s, ${result.responseTime.toFixed(0)}ms avg, ${result.errorRate.toFixed(1)}% errors`);
          console.log(`  Memory: ${result.memoryUsage.toFixed(1)}MB, Success: ${result.successful ? 'Yes' : 'No'}`);

          // 各レベルでの基本要件
          expect(result.throughput).toBeGreaterThan(stress.requestRate * 0.2); // 最低20%のスループット
          expect(result.responseTime).toBeLessThan(30000); // 30秒以内

        } catch (error) {
          console.log(`  Level ${stress.level} failed: ${error instanceof Error ? error.message : String(error)}`);
          stressResults.push({
            level: stress.level,
            throughput: 0,
            responseTime: 30000,
            errorRate: 100,
            memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
            successful: false
          });
        }

        // レベル間の回復時間
        await TimeControlHelper.wait(10000);
      }

      // ストレス負荷進行の分析
      console.log('\nProgressive Stress Analysis:');
      stressResults.forEach(result => {
        console.log(`Level ${result.level}: ${result.throughput.toFixed(1)} req/s, ${result.responseTime.toFixed(0)}ms, ${result.errorRate.toFixed(1)}% errors, ${result.successful ? 'PASS' : 'FAIL'}`);
      });

      // 成功したレベルの数を確認
      const successfulLevels = stressResults.filter(r => r.successful).length;
      expect(successfulLevels).toBeGreaterThan(0); // 最低1レベルは成功

      // 段階的な劣化パターンの確認
      const performanceDecline = stressResults.reduce((decline, result, index) => {
        if (index === 0) return decline;
        const prevResult = stressResults[index - 1];
        if (prevResult.successful && result.successful) {
          const throughputDecline = (prevResult.throughput - result.throughput) / prevResult.throughput;
          decline.push(throughputDecline);
        }
        return decline;
      }, [] as number[]);

      console.log(`Successful stress levels: ${successfulLevels}/4`);
      console.log('✅ Progressive stress load testing completed');
    });

    it('should identify stress breaking points with precision', async () => {
      console.log('Identifying stress breaking points with precision...');

      const precisionBreakingPointTest = {
        startingConcurrent: 20,
        maxConcurrent: 200,
        incrementSize: 10,
        testDuration: 15000, // 15秒ずつテスト
        failureThreshold: {
          errorRate: 70, // 70%以上のエラー率
          responseTime: 25000, // 25秒以上の応答時間
          throughputDrop: 0.1 // スループットが期待値の10%以下
        }
      };

      let currentConcurrent = precisionBreakingPointTest.startingConcurrent;
      let breakingPoint: {
        concurrentUsers: number;
        reason: string;
        metrics: any;
        severity: 'soft' | 'hard';
      } | null = null;

      const breakingPointData: Array<{
        concurrent: number;
        throughput: number;
        responseTime: number;
        errorRate: number;
        successful: boolean;
      }> = [];

      console.log(`Starting breaking point search from ${currentConcurrent} to ${precisionBreakingPointTest.maxConcurrent} concurrent users...`);

      while (currentConcurrent <= precisionBreakingPointTest.maxConcurrent && !breakingPoint) {
        console.log(`Testing ${currentConcurrent} concurrent users...`);

        const testConfig: PerformanceTestConfig = {
          type: 'stress',
          name: `Breaking Point Test - ${currentConcurrent} users`,
          durationMs: precisionBreakingPointTest.testDuration,
          concurrentUsers: currentConcurrent,
          requestRate: currentConcurrent * 3, // 3 req/s per user
          dataVolume: {
            accountCount: container.state.activeAccounts.length,
            sessionCount: container.state.activeAccounts.length,
            tokenCount: container.state.activeAccounts.length * 2
          },
          loadPattern: 'spike',
          expectations: {
            maxResponseTimeMs: 30000,
            maxMemoryUsageMB: 600,
            maxCpuUsage: 95,
            maxErrorRate: 80,
            minThroughput: currentConcurrent * 0.5
          }
        };

        try {
          const testStart = Date.now();
          const metrics = await performanceSuite.runPerformanceTest(testConfig);
          const testTime = Date.now() - testStart;

          const dataPoint = {
            concurrent: currentConcurrent,
            throughput: metrics.throughput.avgRps,
            responseTime: metrics.responseTime.avg,
            errorRate: metrics.errors.errorRate,
            successful: metrics.errors.errorRate < precisionBreakingPointTest.failureThreshold.errorRate
          };

          breakingPointData.push(dataPoint);

          console.log(`  ${currentConcurrent} users: ${dataPoint.throughput.toFixed(1)} req/s, ${dataPoint.responseTime.toFixed(0)}ms, ${dataPoint.errorRate.toFixed(1)}% errors`);

          // 破綻点の判定
          if (dataPoint.errorRate >= precisionBreakingPointTest.failureThreshold.errorRate) {
            breakingPoint = {
              concurrentUsers: currentConcurrent,
              reason: `Error rate exceeded threshold: ${dataPoint.errorRate.toFixed(1)}%`,
              metrics: dataPoint,
              severity: dataPoint.errorRate > 90 ? 'hard' : 'soft'
            };
          } else if (dataPoint.responseTime >= precisionBreakingPointTest.failureThreshold.responseTime) {
            breakingPoint = {
              concurrentUsers: currentConcurrent,
              reason: `Response time exceeded threshold: ${dataPoint.responseTime.toFixed(0)}ms`,
              metrics: dataPoint,
              severity: dataPoint.responseTime > 40000 ? 'hard' : 'soft'
            };
          } else if (dataPoint.throughput < currentConcurrent * precisionBreakingPointTest.failureThreshold.throughputDrop) {
            breakingPoint = {
              concurrentUsers: currentConcurrent,
              reason: `Throughput below threshold: ${dataPoint.throughput.toFixed(1)} req/s`,
              metrics: dataPoint,
              severity: 'soft'
            };
          }

        } catch (error) {
          console.log(`  ${currentConcurrent} users: FAILED - ${error instanceof Error ? error.message : String(error)}`);
          breakingPoint = {
            concurrentUsers: currentConcurrent,
            reason: `Test execution failed: ${error instanceof Error ? error.message : String(error)}`,
            metrics: { errorRate: 100, responseTime: 30000, throughput: 0 },
            severity: 'hard'
          };
        }

        if (!breakingPoint) {
          currentConcurrent += precisionBreakingPointTest.incrementSize;
          await TimeControlHelper.wait(5000); // 次のテストまでの回復時間
        }
      }

      // 破綻点の分析
      if (breakingPoint) {
        console.log(`\n🔴 Breaking point identified:`);
        console.log(`  Concurrent Users: ${breakingPoint.concurrentUsers}`);
        console.log(`  Reason: ${breakingPoint.reason}`);
        console.log(`  Severity: ${breakingPoint.severity}`);
        console.log(`  Final metrics: ${JSON.stringify(breakingPoint.metrics, null, 2)}`);

        // 破綻点は最低50ユーザー以上であることを期待
        expect(breakingPoint.concurrentUsers).toBeGreaterThanOrEqual(50);
      } else {
        console.log(`\n✅ No breaking point found up to ${currentConcurrent} concurrent users`);
        expect(currentConcurrent).toBeGreaterThanOrEqual(150); // 150ユーザー以上まで耐える
      }

      // 破綻点前のデータの健全性確認
      const healthyDataPoints = breakingPointData.filter(d => d.successful);
      expect(healthyDataPoints.length).toBeGreaterThan(0);

      console.log('✅ Stress breaking point identification completed');
    });

    it('should demonstrate graceful degradation under extreme stress', async () => {
      console.log('Testing graceful degradation under extreme stress...');

      const degradationStages = [
        { stage: 1, concurrent: 30, expectedThroughput: 80, label: 'Normal operations' },
        { stage: 2, concurrent: 60, expectedThroughput: 140, label: 'Increased load' },
        { stage: 3, concurrent: 120, expectedThroughput: 200, label: 'High stress' },
        { stage: 4, concurrent: 200, expectedThroughput: 250, label: 'Extreme stress' }
      ];

      const degradationMetrics: Array<{
        stage: number;
        actualThroughput: number;
        expectedThroughput: number;
        efficiency: number;
        responseTime: number;
        degradationRatio: number;
      }> = [];

      for (const stage of degradationStages) {
        console.log(`\nStage ${stage.stage}: ${stage.label} (${stage.concurrent} concurrent users)`);

        const stageConfig: PerformanceTestConfig = {
          type: 'stress',
          name: `Degradation Stage ${stage.stage}`,
          durationMs: 25000,
          concurrentUsers: stage.concurrent,
          requestRate: stage.expectedThroughput,
          dataVolume: {
            accountCount: container.state.activeAccounts.length,
            sessionCount: container.state.activeAccounts.length,
            tokenCount: container.state.activeAccounts.length * 2
          },
          loadPattern: 'constant',
          expectations: {
            maxResponseTimeMs: 20000,
            maxMemoryUsageMB: 500 + (stage.stage * 100),
            maxCpuUsage: 90,
            maxErrorRate: stage.stage * 15,
            minThroughput: stage.expectedThroughput * 0.4
          }
        };

        try {
          const stageMetrics = await performanceSuite.runPerformanceTest(stageConfig);
          const efficiency = (stageMetrics.throughput.avgRps / stage.expectedThroughput) * 100;

          // 前段階との劣化比率を計算
          let degradationRatio = 0;
          if (degradationMetrics.length > 0) {
            const prevMetrics = degradationMetrics[degradationMetrics.length - 1];
            const prevEfficiency = prevMetrics.efficiency;
            degradationRatio = (prevEfficiency - efficiency) / prevEfficiency;
          }

          const degradationData = {
            stage: stage.stage,
            actualThroughput: stageMetrics.throughput.avgRps,
            expectedThroughput: stage.expectedThroughput,
            efficiency,
            responseTime: stageMetrics.responseTime.avg,
            degradationRatio
          };

          degradationMetrics.push(degradationData);

          console.log(`  Throughput: ${degradationData.actualThroughput.toFixed(1)}/${stage.expectedThroughput} req/s (${efficiency.toFixed(1)}%)`);
          console.log(`  Response time: ${degradationData.responseTime.toFixed(0)}ms`);
          console.log(`  Degradation: ${(degradationRatio * 100).toFixed(1)}%`);

          // 段階的劣化の期待値
          expect(degradationData.actualThroughput).toBeGreaterThan(stage.expectedThroughput * 0.3); // 最低30%のスループット
          expect(degradationData.efficiency).toBeGreaterThan(25); // 最低25%の効率

        } catch (error) {
          console.log(`  Stage ${stage.stage} failed: ${error instanceof Error ? error.message : String(error)}`);
          degradationMetrics.push({
            stage: stage.stage,
            actualThroughput: 0,
            expectedThroughput: stage.expectedThroughput,
            efficiency: 0,
            responseTime: 30000,
            degradationRatio: 1.0
          });
        }

        // ステージ間の回復時間
        await TimeControlHelper.wait(8000);
      }

      // 段階的劣化の分析
      console.log('\nGraceful Degradation Analysis:');
      degradationMetrics.forEach(metric => {
        console.log(`Stage ${metric.stage}: ${metric.actualThroughput.toFixed(1)} req/s (${metric.efficiency.toFixed(1)}% efficiency), ${metric.responseTime.toFixed(0)}ms, ${(metric.degradationRatio * 100).toFixed(1)}% degradation`);
      });

      // 少なくとも3ステージは動作すること
      const operationalStages = degradationMetrics.filter(m => m.efficiency > 0).length;
      expect(operationalStages).toBeGreaterThanOrEqual(3);

      // 最初の2ステージは高効率で動作すること
      expect(degradationMetrics[0].efficiency).toBeGreaterThan(60);
      if (degradationMetrics.length > 1) {
        expect(degradationMetrics[1].efficiency).toBeGreaterThan(50);
      }

      console.log('✅ Graceful degradation demonstrated under extreme stress');
    });
  });

  // ===================================================================
  // 負荷回復・安定性テスト
  // ===================================================================

  describe('Load Recovery and Stability Testing', () => {
    it('should recover quickly from stress load removal', async () => {
      console.log('Testing quick recovery from stress load removal...');

      // ベースライン性能の測定
      const baselineConfig: PerformanceTestConfig = {
        type: 'load',
        name: 'Baseline Performance',
        durationMs: 15000,
        concurrentUsers: 10,
        requestRate: 30,
        dataVolume: {
          accountCount: container.state.activeAccounts.length,
          sessionCount: container.state.activeAccounts.length,
          tokenCount: container.state.activeAccounts.length * 2
        },
        loadPattern: 'constant',
        expectations: {
          maxResponseTimeMs: 5000,
          maxMemoryUsageMB: 300,
          maxCpuUsage: 70,
          maxErrorRate: 5,
          minThroughput: 20
        }
      };

      const baselineMetrics = await performanceSuite.runPerformanceTest(baselineConfig);
      const baselineThroughput = baselineMetrics.throughput.avgRps;
      const baselineResponseTime = baselineMetrics.responseTime.avg;

      console.log(`Baseline: ${baselineThroughput.toFixed(1)} req/s, ${baselineResponseTime.toFixed(0)}ms`);

      // 高ストレス負荷の適用
      console.log('\nApplying high stress load...');
      const stressConfig: PerformanceTestConfig = {
        type: 'stress',
        name: 'High Stress Load',
        durationMs: 30000,
        concurrentUsers: 80,
        requestRate: 300,
        dataVolume: {
          accountCount: container.state.activeAccounts.length,
          sessionCount: container.state.activeAccounts.length,
          tokenCount: container.state.activeAccounts.length * 2
        },
        loadPattern: 'constant',
        expectations: {
          maxResponseTimeMs: 25000,
          maxMemoryUsageMB: 500,
          maxCpuUsage: 95,
          maxErrorRate: 50,
          minThroughput: 50
        }
      };

      const stressMetrics = await performanceSuite.runPerformanceTest(stressConfig);
      console.log(`Under stress: ${stressMetrics.throughput.avgRps.toFixed(1)} req/s, ${stressMetrics.responseTime.avg.toFixed(0)}ms`);

      // 回復期間の測定
      console.log('\nMeasuring recovery period...');
      const recoveryMeasurements: Array<{ timestamp: number; throughput: number; responseTime: number }> = [];

      for (let i = 0; i < 8; i++) {
        await TimeControlHelper.wait(3000);

        const recoveryStart = Date.now();
        try {
          const validation = await container.validateAllSessions();
          const recoveryTime = Date.now() - recoveryStart;
          const currentThroughput = 1000 / recoveryTime; // 簡易スループット計算

          recoveryMeasurements.push({
            timestamp: Date.now(),
            throughput: currentThroughput,
            responseTime: recoveryTime
          });

          console.log(`  Recovery ${i + 1}: ${currentThroughput.toFixed(1)} req/s, ${recoveryTime}ms`);
        } catch (error) {
          recoveryMeasurements.push({
            timestamp: Date.now(),
            throughput: 0,
            responseTime: 30000
          });
        }
      }

      // 回復分析
      const finalRecoveryMetrics = recoveryMeasurements[recoveryMeasurements.length - 1];
      const recoveryRate = finalRecoveryMetrics.throughput / baselineThroughput;
      const responseTimeRecovery = baselineResponseTime / finalRecoveryMetrics.responseTime;

      console.log(`\nRecovery Analysis:`);
      console.log(`  Throughput recovery: ${(recoveryRate * 100).toFixed(1)}%`);
      console.log(`  Response time recovery: ${(responseTimeRecovery * 100).toFixed(1)}%`);

      // 回復基準
      expect(recoveryRate).toBeGreaterThan(0.7); // 70%以上のスループット回復
      expect(finalRecoveryMetrics.responseTime).toBeLessThan(baselineResponseTime * 2); // 応答時間は2倍以内

      // 回復傾向の確認（改善していること）
      const midRecovery = recoveryMeasurements[Math.floor(recoveryMeasurements.length / 2)];
      expect(finalRecoveryMetrics.throughput).toBeGreaterThan(midRecovery.throughput * 0.9);

      console.log('✅ Quick recovery from stress load removal validated');
    });

    it('should maintain stability under sustained moderate stress', async () => {
      console.log('Testing stability under sustained moderate stress...');

      const sustainedStressConfig: PerformanceTestConfig = {
        type: 'endurance',
        name: 'Sustained Moderate Stress',
        durationMs: 120000, // 2分間の持続負荷
        concurrentUsers: 40,
        requestRate: 120,
        dataVolume: {
          accountCount: container.state.activeAccounts.length,
          sessionCount: container.state.activeAccounts.length,
          tokenCount: container.state.activeAccounts.length * 2
        },
        loadPattern: 'constant',
        expectations: {
          maxResponseTimeMs: 15000,
          maxMemoryUsageMB: 350,
          maxCpuUsage: 85,
          maxErrorRate: 25,
          minThroughput: 80
        },
        options: {
          enableProfiling: true,
          samplingIntervalMs: 10000 // 10秒間隔でサンプリング
        }
      };

      console.log('Starting 2-minute sustained stress test...');
      const sustainedMetrics = await performanceSuite.runPerformanceTest(sustainedStressConfig);

      // 持続性能の評価
      console.log(`Sustained stress results:`);
      console.log(`  Average throughput: ${sustainedMetrics.throughput.avgRps.toFixed(1)} req/s`);
      console.log(`  Min throughput: ${sustainedMetrics.throughput.minRps.toFixed(1)} req/s`);
      console.log(`  Max throughput: ${sustainedMetrics.throughput.maxRps.toFixed(1)} req/s`);
      console.log(`  Average response time: ${sustainedMetrics.responseTime.avg.toFixed(0)}ms`);
      console.log(`  95th percentile: ${sustainedMetrics.responseTime.p95.toFixed(0)}ms`);
      console.log(`  Error rate: ${sustainedMetrics.errors.errorRate.toFixed(1)}%`);

      // 安定性基準
      expect(sustainedMetrics.throughput.avgRps).toBeGreaterThan(60); // 平均60 req/s以上
      expect(sustainedMetrics.errors.errorRate).toBeLessThan(30); // エラー率30%未満
      expect(sustainedMetrics.responseTime.p95).toBeLessThan(20000); // 95%タイルが20秒以内

      // スループットの安定性（最大と最小の差が50%以内）
      const throughputVariation = (sustainedMetrics.throughput.maxRps - sustainedMetrics.throughput.minRps) / sustainedMetrics.throughput.avgRps;
      console.log(`  Throughput variation: ${(throughputVariation * 100).toFixed(1)}%`);
      expect(throughputVariation).toBeLessThan(0.6); // 60%以内の変動

      // メモリ安定性の確認
      console.log(`Resource usage:`);
      console.log(`  Average memory: ${sustainedMetrics.resourceUsage.memory.avg.toFixed(1)}MB`);
      console.log(`  Peak memory: ${sustainedMetrics.resourceUsage.memory.peak.toFixed(1)}MB`);
      console.log(`  Average CPU: ${sustainedMetrics.resourceUsage.cpu.avg.toFixed(1)}%`);

      expect(sustainedMetrics.resourceUsage.memory.peak).toBeLessThan(400); // ピークメモリ400MB未満
      expect(sustainedMetrics.resourceUsage.cpu.avg).toBeLessThan(90); // 平均CPU90%未満

      console.log('✅ Stability maintained under sustained moderate stress');
    });

    it('should handle stress load bursts with controlled impact', async () => {
      console.log('Testing stress load bursts with controlled impact...');

      const burstConfigurations = [
        { name: 'Short Burst', concurrent: 60, duration: 5000, interval: 15000 },
        { name: 'Medium Burst', concurrent: 100, duration: 8000, interval: 20000 },
        { name: 'Long Burst', concurrent: 80, duration: 12000, interval: 25000 }
      ];

      const burstResults: Array<{
        name: string;
        peakThroughput: number;
        avgResponseTime: number;
        errorRate: number;
        recoveryTime: number;
        impactScore: number;
      }> = [];

      for (const burst of burstConfigurations) {
        console.log(`\nExecuting ${burst.name} (${burst.concurrent} users for ${burst.duration}ms)...`);

        // バースト前のベースライン測定
        const preburstStart = Date.now();
        await container.validateAllSessions();
        const preburstTime = Date.now() - preburstStart;

        // バースト負荷の実行
        const burstConfig: PerformanceTestConfig = {
          type: 'spike',
          name: burst.name,
          durationMs: burst.duration,
          concurrentUsers: burst.concurrent,
          requestRate: burst.concurrent * 4,
          dataVolume: {
            accountCount: container.state.activeAccounts.length,
            sessionCount: container.state.activeAccounts.length,
            tokenCount: container.state.activeAccounts.length * 2
          },
          loadPattern: 'spike',
          expectations: {
            maxResponseTimeMs: 20000,
            maxMemoryUsageMB: 500,
            maxCpuUsage: 95,
            maxErrorRate: 40,
            minThroughput: burst.concurrent * 0.5
          }
        };

        const burstMetrics = await performanceSuite.runPerformanceTest(burstConfig);

        // バースト後の回復測定
        const recoveryStart = Date.now();
        let recovered = false;
        let recoveryAttempts = 0;
        const maxRecoveryAttempts = 10;

        while (!recovered && recoveryAttempts < maxRecoveryAttempts) {
          try {
            const recoveryTestStart = Date.now();
            await container.validateAllSessions();
            const recoveryTestTime = Date.now() - recoveryTestStart;

            // 回復基準：バースト前の1.5倍以内の応答時間
            if (recoveryTestTime <= preburstTime * 1.5) {
              recovered = true;
            }
          } catch (error) {
            // 回復中のエラーは許容
          }

          recoveryAttempts++;
          await TimeControlHelper.wait(2000);
        }

        const recoveryTime = Date.now() - recoveryStart;

        // インパクトスコアの計算（0-100、低いほど良い）
        const impactScore = Math.min(100, 
          (burstMetrics.errors.errorRate * 0.5) + 
          (Math.max(0, burstMetrics.responseTime.avg - 5000) / 200) + 
          (recoveryTime / 1000)
        );

        const burstResult = {
          name: burst.name,
          peakThroughput: burstMetrics.throughput.maxRps,
          avgResponseTime: burstMetrics.responseTime.avg,
          errorRate: burstMetrics.errors.errorRate,
          recoveryTime,
          impactScore
        };

        burstResults.push(burstResult);

        console.log(`  Peak throughput: ${burstResult.peakThroughput.toFixed(1)} req/s`);
        console.log(`  Avg response time: ${burstResult.avgResponseTime.toFixed(0)}ms`);
        console.log(`  Error rate: ${burstResult.errorRate.toFixed(1)}%`);
        console.log(`  Recovery time: ${burstResult.recoveryTime}ms`);
        console.log(`  Impact score: ${burstResult.impactScore.toFixed(1)}/100`);

        // バースト間の間隔
        await TimeControlHelper.wait(burst.interval);
      }

      // バースト耐性の総合評価
      console.log('\nBurst Load Analysis:');
      burstResults.forEach(result => {
        console.log(`${result.name}: ${result.peakThroughput.toFixed(1)} req/s peak, ${result.impactScore.toFixed(1)} impact score`);
      });

      const avgImpactScore = burstResults.reduce((sum, r) => sum + r.impactScore, 0) / burstResults.length;
      const maxRecoveryTime = Math.max(...burstResults.map(r => r.recoveryTime));

      console.log(`Average impact score: ${avgImpactScore.toFixed(1)}/100`);
      console.log(`Maximum recovery time: ${maxRecoveryTime}ms`);

      // バースト耐性基準
      expect(avgImpactScore).toBeLessThan(60); // 平均インパクトスコア60未満
      expect(maxRecoveryTime).toBeLessThan(30000); // 最大回復時間30秒未満
      expect(burstResults.filter(r => r.errorRate < 50).length).toBeGreaterThan(0); // 少なくとも1つは50%未満のエラー率

      console.log('✅ Stress load bursts handled with controlled impact');
    });
  });

  // ===================================================================
  // リソース枯渇・復旧テスト
  // ===================================================================

  describe('Resource Exhaustion and Recovery Testing', () => {
    it('should recover from resource exhaustion scenarios', async () => {
      console.log('Testing recovery from resource exhaustion scenarios...');

      const exhaustionScenarios = [
        {
          name: 'Memory Exhaustion',
          type: 'memory_exhaustion',
          concurrent: 150,
          duration: 20000,
          expectedMemoryIncrease: 200 // MB
        },
        {
          name: 'CPU Exhaustion',
          type: 'cpu_exhaustion', 
          concurrent: 200,
          duration: 15000,
          expectedCpuUsage: 90 // %
        },
        {
          name: 'Connection Exhaustion',
          type: 'connection_exhaustion',
          concurrent: 300,
          duration: 10000,
          expectedErrorRate: 60 // %
        }
      ];

      const exhaustionResults: Array<{
        scenario: string;
        exhaustionAchieved: boolean;
        recoveryTime: number;
        finalRecoveryRate: number;
        resourceCleanup: boolean;
      }> = [];

      for (const scenario of exhaustionScenarios) {
        console.log(`\nTesting ${scenario.name}...`);

        const initialMemory = process.memoryUsage();
        const initialValidation = await container.validateAllSessions();
        const initialValidCount = initialValidation.filter(v => v.isValid).length;

        // リソース枯渇テストの実行
        const exhaustionConfig: PerformanceTestConfig = {
          type: 'stress',
          name: scenario.name,
          durationMs: scenario.duration,
          concurrentUsers: scenario.concurrent,
          requestRate: scenario.concurrent * 2,
          dataVolume: {
            accountCount: container.state.activeAccounts.length,
            sessionCount: container.state.activeAccounts.length,
            tokenCount: container.state.activeAccounts.length * 2
          },
          loadPattern: 'spike',
          expectations: {
            maxResponseTimeMs: 30000,
            maxMemoryUsageMB: 800,
            maxCpuUsage: 95,
            maxErrorRate: 80,
            minThroughput: 10
          }
        };

        let exhaustionAchieved = false;
        let recoveryTime = 0;

        try {
          const exhaustionMetrics = await performanceSuite.runPerformanceTest(exhaustionConfig);
          const afterExhaustionMemory = process.memoryUsage();
          const memoryIncrease = (afterExhaustionMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;

          // 枯渇の判定
          switch (scenario.type) {
            case 'memory_exhaustion':
              exhaustionAchieved = memoryIncrease > (scenario.expectedMemoryIncrease || 100);
              break;
            case 'cpu_exhaustion':
              exhaustionAchieved = exhaustionMetrics.resourceUsage.cpu.peak > (scenario.expectedCpuUsage || 80);
              break;
            case 'connection_exhaustion':
              exhaustionAchieved = exhaustionMetrics.errors.errorRate > (scenario.expectedErrorRate || 50);
              break;
          }

          console.log(`  Exhaustion achieved: ${exhaustionAchieved ? 'Yes' : 'No'}`);
          console.log(`  Error rate: ${exhaustionMetrics.errors.errorRate.toFixed(1)}%`);
          console.log(`  Memory increase: ${memoryIncrease.toFixed(1)}MB`);

        } catch (error) {
          console.log(`  Exhaustion test failed: ${error instanceof Error ? error.message : String(error)}`);
          exhaustionAchieved = true; // 失敗も枯渇の一形態
        }

        // 回復プロセスの測定
        console.log(`  Measuring recovery...`);
        const recoveryStart = Date.now();
        let finalRecoveryRate = 0;
        let resourceCleanup = false;

        // 強制的なガベージコレクション（可能な場合）
        if (global.gc) {
          global.gc();
        }

        // 回復の段階的測定
        for (let attempt = 0; attempt < 12; attempt++) {
          await TimeControlHelper.wait(5000);

          try {
            const recoveryValidation = await container.validateAllSessions();
            const currentValidCount = recoveryValidation.filter(v => v.isValid).length;
            finalRecoveryRate = currentValidCount / initialValidCount;

            const currentMemory = process.memoryUsage();
            const memoryRecovery = (currentMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
            resourceCleanup = memoryRecovery < 100; // 100MB以下まで回復

            console.log(`    Attempt ${attempt + 1}: ${(finalRecoveryRate * 100).toFixed(1)}% sessions recovered, ${memoryRecovery.toFixed(1)}MB memory delta`);

            // 十分な回復が確認できたら終了
            if (finalRecoveryRate > 0.5 && resourceCleanup) {
              break;
            }

          } catch (error) {
            console.log(`    Attempt ${attempt + 1}: Recovery validation failed`);
          }
        }

        recoveryTime = Date.now() - recoveryStart;

        const result = {
          scenario: scenario.name,
          exhaustionAchieved,
          recoveryTime,
          finalRecoveryRate,
          resourceCleanup
        };

        exhaustionResults.push(result);

        console.log(`  Final recovery rate: ${(finalRecoveryRate * 100).toFixed(1)}%`);
        console.log(`  Recovery time: ${recoveryTime}ms`);
        console.log(`  Resource cleanup: ${resourceCleanup ? 'Yes' : 'No'}`);

        // 次のシナリオまでの待機時間
        await TimeControlHelper.wait(15000);
      }

      // 枯渇・回復テストの総合評価
      console.log('\nResource Exhaustion Recovery Analysis:');
      exhaustionResults.forEach(result => {
        console.log(`${result.scenario}: ${result.exhaustionAchieved ? 'EXHAUSTED' : 'PARTIAL'} → ${(result.finalRecoveryRate * 100).toFixed(1)}% recovered in ${result.recoveryTime}ms`);
      });

      // 回復基準
      const avgRecoveryRate = exhaustionResults.reduce((sum, r) => sum + r.finalRecoveryRate, 0) / exhaustionResults.length;
      const avgRecoveryTime = exhaustionResults.reduce((sum, r) => sum + r.recoveryTime, 0) / exhaustionResults.length;
      const cleanupSuccessCount = exhaustionResults.filter(r => r.resourceCleanup).length;

      console.log(`Average recovery rate: ${(avgRecoveryRate * 100).toFixed(1)}%`);
      console.log(`Average recovery time: ${avgRecoveryTime.toFixed(0)}ms`);
      console.log(`Resource cleanup success: ${cleanupSuccessCount}/${exhaustionResults.length}`);

      expect(avgRecoveryRate).toBeGreaterThan(0.4); // 平均40%以上回復
      expect(avgRecoveryTime).toBeLessThan(120000); // 平均2分以内で回復
      expect(cleanupSuccessCount).toBeGreaterThan(0); // 少なくとも1つはリソースクリーンアップ成功

      console.log('✅ Recovery from resource exhaustion scenarios validated');
    });
  });
});