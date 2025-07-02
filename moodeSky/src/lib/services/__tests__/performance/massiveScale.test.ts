/**
 * Massive Scale Performance Test Suite
 * Issue #92 Phase 4 Wave 1: 大規模スケールテスト
 * 
 * セッション管理システムの極限スケーラビリティを検証
 * - 大量アカウント・セッション管理
 * - 高スループット・高並行性
 * - メモリ効率・リソース最適化
 * - スケーラビリティ限界の特定
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceBenchmarkSuite, type PerformanceTestConfig, PerformanceTestHelpers } from '../../../test-utils/performanceBenchmarkSuite.js';
import { IntegrationTestContainer } from '../../../test-utils/integrationTestContainer.js';
import { TimeControlHelper, AccountTestFactory } from '../../../test-utils/sessionTestUtils.js';

describe('Massive Scale Performance Tests', () => {
  let container: IntegrationTestContainer;
  let performanceSuite: PerformanceBenchmarkSuite;

  beforeEach(async () => {
    // 大規模テスト用の特別な設定
    container = new IntegrationTestContainer({
      initialAccountCount: 50, // 初期50アカウント
      enableJWTManager: true,
      enableBackgroundMonitor: false, // パフォーマンステストでは無効化
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
  // 大量アカウントスケールテスト
  // ===================================================================

  describe('Massive Account Scale Testing', () => {
    it('should handle 100 concurrent accounts efficiently', async () => {
      console.log('Testing 100 concurrent accounts...');

      const targetAccountCount = 100;
      const currentAccountCount = container.state.activeAccounts.length;
      const accountsToAdd = targetAccountCount - currentAccountCount;

      console.log(`Adding ${accountsToAdd} accounts to reach ${targetAccountCount} total...`);

      // アカウント追加のベンチマーク
      const addAccountsConfig: PerformanceTestConfig = {
        type: 'load',
        name: 'Massive Account Addition',
        durationMs: 60000, // 1分
        concurrentUsers: 20, // 並行での追加処理
        requestRate: 30,
        dataVolume: {
          accountCount: targetAccountCount,
          sessionCount: targetAccountCount,
          tokenCount: targetAccountCount * 2
        },
        loadPattern: 'constant',
        expectations: {
          maxResponseTimeMs: 3000,
          maxMemoryUsageMB: 300,
          maxCpuUsage: 80,
          maxErrorRate: 5,
          minThroughput: 15
        },
        options: {
          enableProfiling: true,
          samplingIntervalMs: 2000
        }
      };

      const initialMemory = process.memoryUsage();
      const addStartTime = Date.now();

      // アカウント追加の実行
      for (let i = currentAccountCount; i < targetAccountCount; i++) {
        try {
          await container.addAccount(`did:plc:scale${i}`, `scale${i}.bsky.social`);
          
          // 進捗表示（10アカウントごと）
          if ((i + 1) % 10 === 0) {
            const progress = ((i + 1 - currentAccountCount) / accountsToAdd * 100).toFixed(1);
            console.log(`  Progress: ${progress}% (${i + 1}/${targetAccountCount} accounts)`);
          }
        } catch (error) {
          console.warn(`Failed to add account ${i}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      const addDuration = Date.now() - addStartTime;
      const finalAccountCount = container.state.activeAccounts.length;

      console.log(`Account addition completed: ${finalAccountCount} accounts in ${addDuration}ms`);

      // 大量アカウントでのパフォーマンステスト
      const massiveScaleMetrics = await performanceSuite.runPerformanceTest(addAccountsConfig);

      // スケールパフォーマンスの評価
      expect(massiveScaleMetrics.throughput.avgRps).toBeGreaterThan(10); // 最低10req/s
      expect(massiveScaleMetrics.responseTime.avg).toBeLessThan(5000); // 平均5秒以内
      expect(massiveScaleMetrics.errors.errorRate).toBeLessThan(10); // エラー率10%未満

      // メモリ効率の確認
      const memoryAfterScale = process.memoryUsage();
      const memoryPerAccount = (memoryAfterScale.heapUsed - initialMemory.heapUsed) / accountsToAdd / 1024; // KB per account
      
      console.log(`Memory per account: ${memoryPerAccount.toFixed(2)}KB`);
      expect(memoryPerAccount).toBeLessThan(500); // アカウントあたり500KB未満

      // 全アカウントの整合性確認
      const validationResults = await container.validateAllSessions();
      expect(validationResults.length).toBe(finalAccountCount);
      
      const validSessionCount = validationResults.filter(v => v.isValid).length;
      const validationRate = validSessionCount / finalAccountCount;
      
      console.log(`Session validation rate: ${(validationRate * 100).toFixed(1)}% (${validSessionCount}/${finalAccountCount})`);
      expect(validationRate).toBeGreaterThan(0.9); // 90%以上有効

      console.log('✅ Successfully handled 100 concurrent accounts');
    });

    it('should scale to 200 accounts with linear performance degradation', async () => {
      console.log('Testing linear scaling to 200 accounts...');

      const scalingSteps = [
        { target: 75, label: '75 accounts' },
        { target: 100, label: '100 accounts' },
        { target: 150, label: '150 accounts' },
        { target: 200, label: '200 accounts' }
      ];

      const scalingMetrics: Array<{
        accountCount: number;
        responseTime: number;
        throughput: number;
        memoryUsageMB: number;
        errorRate: number;
      }> = [];

      for (const step of scalingSteps) {
        const currentCount = container.state.activeAccounts.length;
        const toAdd = step.target - currentCount;

        if (toAdd > 0) {
          console.log(`Scaling to ${step.label}...`);
          
          // アカウント追加
          for (let i = currentCount; i < step.target; i++) {
            try {
              await container.addAccount(`did:plc:linear${i}`, `linear${i}.bsky.social`);
            } catch (error) {
              console.warn(`Failed to add account ${i}: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
        }

        // このスケールでのパフォーマンス測定
        const stepStartTime = Date.now();
        await container.validateAllSessions();
        const stepResponseTime = Date.now() - stepStartTime;

        const stepMemory = process.memoryUsage();
        const actualCount = container.state.activeAccounts.length;

        // スループットテスト（5回実行の平均）
        const throughputTests = [];
        for (let i = 0; i < 5; i++) {
          const testStart = Date.now();
          try {
            await container.validateAllSessions();
            throughputTests.push(Date.now() - testStart);
          } catch (error) {
            throughputTests.push(30000); // タイムアウトとして30秒
          }
          await TimeControlHelper.wait(500);
        }

        const avgThroughputTime = throughputTests.reduce((sum, time) => sum + time, 0) / throughputTests.length;
        const throughputRps = 1000 / avgThroughputTime;
        const errorCount = throughputTests.filter(time => time > 10000).length;
        const errorRate = (errorCount / throughputTests.length) * 100;

        scalingMetrics.push({
          accountCount: actualCount,
          responseTime: stepResponseTime,
          throughput: throughputRps,
          memoryUsageMB: stepMemory.heapUsed / 1024 / 1024,
          errorRate
        });

        console.log(`${step.label}: ${stepResponseTime}ms response, ${throughputRps.toFixed(2)} req/s, ${(stepMemory.heapUsed / 1024 / 1024).toFixed(1)}MB`);
      }

      // 線形スケーリング分析
      console.log('\nScaling Analysis:');
      scalingMetrics.forEach((metric, index) => {
        console.log(`${metric.accountCount} accounts: ${metric.responseTime}ms, ${metric.throughput.toFixed(2)} req/s, ${metric.memoryUsageMB.toFixed(1)}MB, ${metric.errorRate.toFixed(1)}% errors`);
      });

      // スケーラビリティの評価
      const firstMetric = scalingMetrics[0];
      const lastMetric = scalingMetrics[scalingMetrics.length - 1];

      const accountRatio = lastMetric.accountCount / firstMetric.accountCount;
      const responseTimeRatio = lastMetric.responseTime / firstMetric.responseTime;
      const throughputRatio = lastMetric.throughput / firstMetric.throughput;
      const memoryRatio = lastMetric.memoryUsageMB / firstMetric.memoryUsageMB;

      console.log(`\nScaling Ratios (${firstMetric.accountCount} → ${lastMetric.accountCount} accounts):`);
      console.log(`  Account ratio: ${accountRatio.toFixed(2)}x`);
      console.log(`  Response time ratio: ${responseTimeRatio.toFixed(2)}x`);
      console.log(`  Throughput ratio: ${throughputRatio.toFixed(2)}x`);
      console.log(`  Memory ratio: ${memoryRatio.toFixed(2)}x`);

      // 線形性の評価（理想的には比例関係）
      expect(responseTimeRatio).toBeLessThan(accountRatio * 1.5); // 応答時間は1.5倍以内の増加
      expect(throughputRatio).toBeGreaterThan(0.5); // スループットは50%以上維持
      expect(memoryRatio).toBeLessThan(accountRatio * 1.2); // メモリは1.2倍以内の増加

      // 最大スケールでもエラー率は合理的
      expect(lastMetric.errorRate).toBeLessThan(15); // 15%未満のエラー率

      console.log('✅ Linear scaling validated up to 200 accounts');
    });

    it('should find the scalability breaking point', async () => {
      console.log('Finding scalability breaking point...');

      const breakingPointTest = {
        maxAttempts: 500, // 最大500アカウント
        incrementSize: 25, // 25アカウントずつ増加
        failureThreshold: {
          responseTimeMs: 15000, // 15秒以上
          errorRate: 50, // 50%以上のエラー率
          memoryMB: 1000 // 1GB以上
        }
      };

      let currentCount = container.state.activeAccounts.length;
      let breakingPoint: {
        accountCount: number;
        reason: string;
        metrics: any;
      } | null = null;

      console.log(`Starting from ${currentCount} accounts, testing up to ${breakingPointTest.maxAttempts}...`);

      while (currentCount < breakingPointTest.maxAttempts && !breakingPoint) {
        const targetCount = Math.min(currentCount + breakingPointTest.incrementSize, breakingPointTest.maxAttempts);
        
        // アカウント追加
        for (let i = currentCount; i < targetCount; i++) {
          try {
            await container.addAccount(`did:plc:breaking${i}`, `breaking${i}.bsky.social`);
          } catch (error) {
            console.warn(`Failed to add account ${i}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        currentCount = container.state.activeAccounts.length;
        console.log(`Testing with ${currentCount} accounts...`);

        // パフォーマンス測定
        const testStartTime = Date.now();
        let testSuccess = true;
        let errorCount = 0;
        const testIterations = 3;

        for (let i = 0; i < testIterations; i++) {
          try {
            const iterationStart = Date.now();
            await container.validateAllSessions();
            const iterationTime = Date.now() - iterationStart;
            
            if (iterationTime > breakingPointTest.failureThreshold.responseTimeMs) {
              testSuccess = false;
              console.log(`  Response time threshold exceeded: ${iterationTime}ms`);
            }
          } catch (error) {
            errorCount++;
            testSuccess = false;
          }
          
          await TimeControlHelper.wait(1000);
        }

        const totalTestTime = Date.now() - testStartTime;
        const currentMemory = process.memoryUsage();
        const memoryMB = currentMemory.heapUsed / 1024 / 1024;
        const errorRate = (errorCount / testIterations) * 100;

        // 破綻点の判定
        if (!testSuccess || errorRate >= breakingPointTest.failureThreshold.errorRate) {
          breakingPoint = {
            accountCount: currentCount,
            reason: `High error rate: ${errorRate.toFixed(1)}%`,
            metrics: {
              responseTime: totalTestTime / testIterations,
              errorRate,
              memoryMB,
              accountCount: currentCount
            }
          };
        } else if (memoryMB >= breakingPointTest.failureThreshold.memoryMB) {
          breakingPoint = {
            accountCount: currentCount,
            reason: `Memory threshold exceeded: ${memoryMB.toFixed(1)}MB`,
            metrics: {
              responseTime: totalTestTime / testIterations,
              errorRate,
              memoryMB,
              accountCount: currentCount
            }
          };
        }

        if (!breakingPoint) {
          console.log(`  ✅ ${currentCount} accounts: ${(totalTestTime / testIterations).toFixed(0)}ms avg, ${errorRate.toFixed(1)}% errors, ${memoryMB.toFixed(1)}MB`);
        }
      }

      if (breakingPoint) {
        console.log(`\n🔴 Breaking point found at ${breakingPoint.accountCount} accounts:`);
        console.log(`  Reason: ${breakingPoint.reason}`);
        console.log(`  Metrics: ${JSON.stringify(breakingPoint.metrics, null, 2)}`);

        // 破綻点は少なくとも100アカウント以上であること
        expect(breakingPoint.accountCount).toBeGreaterThanOrEqual(100);
      } else {
        console.log(`\n✅ No breaking point found up to ${currentCount} accounts`);
        
        // 最大テスト数に達してもシステムが動作していること
        expect(currentCount).toBeGreaterThanOrEqual(200);
        
        const finalValidation = await container.validateAllSessions();
        expect(finalValidation.length).toBeGreaterThan(0);
      }

      console.log('✅ Scalability breaking point analysis completed');
    });
  });

  // ===================================================================
  // 高スループット・高並行性テスト
  // ===================================================================

  describe('High Throughput and Concurrency Testing', () => {
    it('should achieve high throughput with massive concurrent operations', async () => {
      console.log('Testing high throughput with massive concurrent operations...');

      const throughputTestConfig: PerformanceTestConfig = {
        type: 'stress',
        name: 'Massive Throughput Test',
        durationMs: 120000, // 2分間
        concurrentUsers: 100, // 100並行ユーザー
        requestRate: 500, // 500 req/s目標
        dataVolume: {
          accountCount: container.state.activeAccounts.length,
          sessionCount: container.state.activeAccounts.length,
          tokenCount: container.state.activeAccounts.length * 2
        },
        loadPattern: 'constant',
        expectations: {
          maxResponseTimeMs: 10000,
          maxMemoryUsageMB: 500,
          maxCpuUsage: 95,
          maxErrorRate: 20,
          minThroughput: 300 // 最低300 req/s
        },
        options: {
          enableProfiling: true,
          samplingIntervalMs: 5000
        }
      };

      console.log(`Starting massive throughput test with ${throughputTestConfig.concurrentUsers} concurrent operations...`);

      const throughputMetrics = await performanceSuite.runPerformanceTest(throughputTestConfig);

      // スループット性能の評価
      console.log(`Throughput Results:`);
      console.log(`  Average RPS: ${throughputMetrics.throughput.avgRps.toFixed(2)}`);
      console.log(`  Max RPS: ${throughputMetrics.throughput.maxRps.toFixed(2)}`);
      console.log(`  Total Requests: ${throughputMetrics.throughput.totalRequests}`);
      console.log(`  Success Rate: ${((throughputMetrics.throughput.successfulRequests / throughputMetrics.throughput.totalRequests) * 100).toFixed(1)}%`);
      console.log(`  Average Response Time: ${throughputMetrics.responseTime.avg.toFixed(2)}ms`);
      console.log(`  95th Percentile: ${throughputMetrics.responseTime.p95.toFixed(2)}ms`);
      console.log(`  99th Percentile: ${throughputMetrics.responseTime.p99.toFixed(2)}ms`);

      // 高スループット基準の確認
      expect(throughputMetrics.throughput.avgRps).toBeGreaterThan(200); // 平均200 req/s以上
      expect(throughputMetrics.throughput.successfulRequests / throughputMetrics.throughput.totalRequests).toBeGreaterThan(0.8); // 80%以上成功
      expect(throughputMetrics.responseTime.p95).toBeLessThan(15000); // 95%タイルが15秒以内

      // リソース使用効率の確認
      console.log(`Resource Usage:`);
      console.log(`  Average Memory: ${throughputMetrics.resourceUsage.memory.avg.toFixed(1)}MB`);
      console.log(`  Peak Memory: ${throughputMetrics.resourceUsage.memory.peak.toFixed(1)}MB`);
      console.log(`  Average CPU: ${throughputMetrics.resourceUsage.cpu.avg.toFixed(1)}%`);
      console.log(`  Peak CPU: ${throughputMetrics.resourceUsage.cpu.peak.toFixed(1)}%`);

      expect(throughputMetrics.resourceUsage.memory.peak).toBeLessThan(600); // ピークメモリ600MB未満
      expect(throughputMetrics.resourceUsage.cpu.avg).toBeLessThan(90); // 平均CPU90%未満

      console.log('✅ High throughput achieved with massive concurrent operations');
    });

    it('should maintain performance under extreme concurrency bursts', async () => {
      console.log('Testing performance under extreme concurrency bursts...');

      const concurrencyLevels = [
        { concurrent: 25, duration: 30000, label: 'Moderate burst' },
        { concurrent: 50, duration: 30000, label: 'High burst' },
        { concurrent: 100, duration: 20000, label: 'Extreme burst' }
      ];

      const burstResults: Array<{
        level: number;
        responseTime: number;
        throughput: number;
        errorRate: number;
        memoryUsage: number;
      }> = [];

      for (const level of concurrencyLevels) {
        console.log(`Testing ${level.label}: ${level.concurrent} concurrent operations for ${level.duration}ms...`);

        const burstConfig: PerformanceTestConfig = {
          type: 'spike',
          name: `Concurrency Burst - ${level.concurrent}`,
          durationMs: level.duration,
          concurrentUsers: level.concurrent,
          requestRate: level.concurrent * 2,
          dataVolume: {
            accountCount: container.state.activeAccounts.length,
            sessionCount: container.state.activeAccounts.length,
            tokenCount: container.state.activeAccounts.length * 2
          },
          loadPattern: 'spike',
          expectations: {
            maxResponseTimeMs: 20000,
            maxMemoryUsageMB: 700,
            maxCpuUsage: 95,
            maxErrorRate: 30,
            minThroughput: level.concurrent * 0.5
          }
        };

        const burstMetrics = await performanceSuite.runPerformanceTest(burstConfig);

        const result = {
          level: level.concurrent,
          responseTime: burstMetrics.responseTime.avg,
          throughput: burstMetrics.throughput.avgRps,
          errorRate: burstMetrics.errors.errorRate,
          memoryUsage: burstMetrics.resourceUsage.memory.avg
        };

        burstResults.push(result);

        console.log(`  Results: ${result.responseTime.toFixed(0)}ms avg, ${result.throughput.toFixed(1)} req/s, ${result.errorRate.toFixed(1)}% errors`);

        // 各レベルでの最低基準
        expect(result.throughput).toBeGreaterThan(level.concurrent * 0.3); // 最低30%のスループット
        expect(result.errorRate).toBeLessThan(40); // エラー率40%未満

        // 次のテストまでの回復時間
        await TimeControlHelper.wait(10000);
      }

      // バースト耐性の分析
      console.log('\nConcurrency Burst Analysis:');
      burstResults.forEach(result => {
        console.log(`${result.level} concurrent: ${result.responseTime.toFixed(0)}ms, ${result.throughput.toFixed(1)} req/s, ${result.errorRate.toFixed(1)}% errors, ${result.memoryUsage.toFixed(1)}MB`);
      });

      // 最高並行度でも最低限の性能維持
      const extremeResult = burstResults[burstResults.length - 1];
      expect(extremeResult.throughput).toBeGreaterThan(20); // 最低20 req/s
      expect(extremeResult.responseTime).toBeLessThan(30000); // 30秒以内

      console.log('✅ Performance maintained under extreme concurrency bursts');
    });

    it('should demonstrate linear throughput scaling with optimal resource utilization', async () => {
      console.log('Testing linear throughput scaling with resource optimization...');

      const scalingSteps = [
        { users: 10, expectedRps: 20 },
        { users: 25, expectedRps: 45 },
        { users: 50, expectedRps: 80 },
        { users: 75, expectedRps: 110 }
      ];

      const scalingData: Array<{
        users: number;
        actualRps: number;
        expectedRps: number;
        efficiency: number;
        resourceRatio: number;
      }> = [];

      const baselineMemory = process.memoryUsage().heapUsed / 1024 / 1024;

      for (const step of scalingSteps) {
        console.log(`Testing ${step.users} concurrent users (expected: ${step.expectedRps} req/s)...`);

        const scalingConfig: PerformanceTestConfig = {
          type: 'load',
          name: `Linear Scaling Test - ${step.users} users`,
          durationMs: 45000,
          concurrentUsers: step.users,
          requestRate: step.expectedRps,
          dataVolume: {
            accountCount: container.state.activeAccounts.length,
            sessionCount: container.state.activeAccounts.length,
            tokenCount: container.state.activeAccounts.length * 2
          },
          loadPattern: 'constant',
          expectations: {
            maxResponseTimeMs: 8000,
            maxMemoryUsageMB: 400,
            maxCpuUsage: 85,
            maxErrorRate: 15,
            minThroughput: step.expectedRps * 0.7
          }
        };

        const scalingMetrics = await performanceSuite.runPerformanceTest(scalingConfig);
        const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;

        const efficiency = (scalingMetrics.throughput.avgRps / step.expectedRps) * 100;
        const resourceRatio = (currentMemory - baselineMemory) / step.users;

        scalingData.push({
          users: step.users,
          actualRps: scalingMetrics.throughput.avgRps,
          expectedRps: step.expectedRps,
          efficiency,
          resourceRatio
        });

        console.log(`  Result: ${scalingMetrics.throughput.avgRps.toFixed(1)} req/s (${efficiency.toFixed(1)}% efficiency), ${resourceRatio.toFixed(2)}MB/user`);

        // 各ステップでの効率基準
        expect(efficiency).toBeGreaterThan(60); // 最低60%の効率
        expect(resourceRatio).toBeLessThan(5); // ユーザーあたり5MB未満

        await TimeControlHelper.wait(5000); // 次のテストまでの間隔
      }

      // 線形スケーリングの分析
      console.log('\nLinear Scaling Analysis:');
      scalingData.forEach(data => {
        console.log(`${data.users} users: ${data.actualRps.toFixed(1)}/${data.expectedRps} req/s (${data.efficiency.toFixed(1)}%), ${data.resourceRatio.toFixed(2)}MB/user`);
      });

      // 全体的な効率性の確認
      const avgEfficiency = scalingData.reduce((sum, data) => sum + data.efficiency, 0) / scalingData.length;
      const avgResourceRatio = scalingData.reduce((sum, data) => sum + data.resourceRatio, 0) / scalingData.length;

      console.log(`\nOverall Performance:`);
      console.log(`  Average Efficiency: ${avgEfficiency.toFixed(1)}%`);
      console.log(`  Average Resource Ratio: ${avgResourceRatio.toFixed(2)}MB/user`);

      expect(avgEfficiency).toBeGreaterThan(70); // 平均70%以上の効率
      expect(avgResourceRatio).toBeLessThan(3); // 平均3MB/user未満

      console.log('✅ Linear throughput scaling with optimal resource utilization demonstrated');
    });
  });

  // ===================================================================
  // メモリ効率・最適化テスト
  // ===================================================================

  describe('Memory Efficiency and Optimization Testing', () => {
    it('should demonstrate optimal memory usage patterns', async () => {
      console.log('Testing optimal memory usage patterns...');

      const memoryTestScenarios = [
        { accountCount: 50, expectedMemoryMB: 100, label: 'Medium load' },
        { accountCount: 100, expectedMemoryMB: 180, label: 'High load' },
        { accountCount: 150, expectedMemoryMB: 250, label: 'Very high load' }
      ];

      const memoryEfficiencyData: Array<{
        accountCount: number;
        actualMemoryMB: number;
        expectedMemoryMB: number;
        efficiency: number;
        memoryPerAccount: number;
      }> = [];

      for (const scenario of memoryTestScenarios) {
        const currentAccountCount = container.state.activeAccounts.length;
        
        // 必要に応じてアカウントを追加
        if (currentAccountCount < scenario.accountCount) {
          console.log(`Scaling to ${scenario.accountCount} accounts for ${scenario.label}...`);
          
          for (let i = currentAccountCount; i < scenario.accountCount; i++) {
            await container.addAccount(`did:plc:memory${i}`, `memory${i}.bsky.social`);
          }
        }

        // ガベージコレクションを実行（可能な場合）
        if (global.gc) {
          global.gc();
          await TimeControlHelper.wait(2000);
        }

        const beforeMemory = process.memoryUsage();
        
        // メモリ使用量測定のためのセッション操作
        await container.validateAllSessions();
        await TimeControlHelper.wait(1000);
        await container.validateAllSessions();

        const afterMemory = process.memoryUsage();
        const actualMemoryMB = afterMemory.heapUsed / 1024 / 1024;
        const memoryPerAccount = actualMemoryMB / scenario.accountCount;
        const efficiency = (scenario.expectedMemoryMB / actualMemoryMB) * 100;

        memoryEfficiencyData.push({
          accountCount: scenario.accountCount,
          actualMemoryMB,
          expectedMemoryMB: scenario.expectedMemoryMB,
          efficiency: Math.min(100, efficiency), // 100%を上限
          memoryPerAccount
        });

        console.log(`${scenario.label}: ${actualMemoryMB.toFixed(1)}MB total, ${memoryPerAccount.toFixed(2)}MB/account (${efficiency.toFixed(1)}% efficiency)`);

        // メモリ効率基準
        expect(actualMemoryMB).toBeLessThan(scenario.expectedMemoryMB * 1.3); // 期待値の130%以内
        expect(memoryPerAccount).toBeLessThan(3); // アカウントあたり3MB未満
      }

      // メモリ効率の総合評価
      console.log('\nMemory Efficiency Summary:');
      memoryEfficiencyData.forEach(data => {
        console.log(`${data.accountCount} accounts: ${data.actualMemoryMB.toFixed(1)}MB (${data.efficiency.toFixed(1)}% efficiency), ${data.memoryPerAccount.toFixed(2)}MB/account`);
      });

      const avgEfficiency = memoryEfficiencyData.reduce((sum, data) => sum + data.efficiency, 0) / memoryEfficiencyData.length;
      const avgMemoryPerAccount = memoryEfficiencyData.reduce((sum, data) => sum + data.memoryPerAccount, 0) / memoryEfficiencyData.length;

      console.log(`Overall: ${avgEfficiency.toFixed(1)}% average efficiency, ${avgMemoryPerAccount.toFixed(2)}MB average per account`);

      expect(avgEfficiency).toBeGreaterThan(60); // 平均60%以上の効率
      expect(avgMemoryPerAccount).toBeLessThan(2.5); // 平均2.5MB/account未満

      console.log('✅ Optimal memory usage patterns demonstrated');
    });

    it('should show memory leak resistance under sustained operations', async () => {
      console.log('Testing memory leak resistance under sustained operations...');

      const sustainedTestDuration = 180000; // 3分間
      const operationInterval = 2000; // 2秒間隔
      const memorySnapshots: Array<{ time: number; memoryMB: number; accountCount: number }> = [];

      console.log(`Running sustained operations for ${sustainedTestDuration / 1000} seconds...`);

      const startTime = Date.now();
      const initialMemory = process.memoryUsage();
      let operationCount = 0;

      while (Date.now() - startTime < sustainedTestDuration) {
        const currentTime = Date.now() - startTime;
        
        try {
          // 継続的な操作実行
          await container.validateAllSessions();
          operationCount++;

          // メモリスナップショット（10秒ごと）
          if (currentTime % 10000 < operationInterval) {
            const currentMemory = process.memoryUsage();
            const memoryMB = currentMemory.heapUsed / 1024 / 1024;
            const accountCount = container.state.activeAccounts.length;

            memorySnapshots.push({
              time: currentTime,
              memoryMB,
              accountCount
            });

            console.log(`  ${(currentTime / 1000).toFixed(0)}s: ${memoryMB.toFixed(1)}MB, ${operationCount} ops`);
          }

          // 定期的なガベージコレクション（1分ごと）
          if (currentTime % 60000 < operationInterval && global.gc) {
            global.gc();
          }

        } catch (error) {
          console.warn(`Operation failed at ${currentTime}ms: ${error instanceof Error ? error.message : String(error)}`);
        }

        await TimeControlHelper.wait(operationInterval);
      }

      // メモリリーク分析
      const finalMemory = process.memoryUsage();
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
      const memoryIncreaseRate = memoryIncrease / (sustainedTestDuration / 1000 / 60); // MB/分

      console.log(`\nMemory Leak Analysis:`);
      console.log(`  Total operations: ${operationCount}`);
      console.log(`  Initial memory: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(1)}MB`);
      console.log(`  Final memory: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(1)}MB`);
      console.log(`  Memory increase: ${memoryIncrease.toFixed(1)}MB`);
      console.log(`  Increase rate: ${memoryIncreaseRate.toFixed(2)}MB/min`);

      // メモリ傾向の分析
      if (memorySnapshots.length > 5) {
        const firstHalf = memorySnapshots.slice(0, Math.floor(memorySnapshots.length / 2));
        const secondHalf = memorySnapshots.slice(Math.floor(memorySnapshots.length / 2));

        const firstHalfAvg = firstHalf.reduce((sum, snap) => sum + snap.memoryMB, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, snap) => sum + snap.memoryMB, 0) / secondHalf.length;
        const memoryTrend = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

        console.log(`  Memory trend: ${memoryTrend.toFixed(1)}% increase over time`);

        // メモリリーク基準
        expect(memoryIncreaseRate).toBeLessThan(5); // 5MB/分未満の増加
        expect(memoryTrend).toBeLessThan(50); // 50%未満の傾向的増加
      }

      expect(memoryIncrease).toBeLessThan(100); // 総増加100MB未満
      expect(operationCount).toBeGreaterThan(50); // 最低50回の操作実行

      console.log('✅ Memory leak resistance demonstrated under sustained operations');
    });
  });
});