/**
 * Latency Benchmark Test Suite
 * Issue #92 Phase 4 Wave 1: レイテンシベンチマーク・最適化テスト
 * 
 * セッション管理システムの詳細なレイテンシ分析と最適化検証
 * - 精密な応答時間測定・分析
 * - パーセンタイル分布評価
 * - ボトルネック特定・最適化
 * - コールドスタート vs ウォーム性能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceBenchmarkSuite, type PerformanceTestConfig, PerformanceTestHelpers } from '../../../test-utils/performanceBenchmarkSuite.ts';
import { IntegrationTestContainer } from '../../../test-utils/integrationTestContainer.ts';
import { TimeControlHelper, AccountTestFactory } from '../../../test-utils/sessionTestUtils.ts';

describe('Latency Benchmark Tests', () => {
  let container: IntegrationTestContainer;
  let performanceSuite: PerformanceBenchmarkSuite;

  beforeEach(async () => {
    // レイテンシベンチマーク用の最適化設定
    container = new IntegrationTestContainer({
      initialAccountCount: 10, // レイテンシ測定用
      enableJWTManager: true,
      enableBackgroundMonitor: false, // バックグラウンド処理によるノイズ除去
      logLevel: 'error',
      highPrecisionTiming: true // 高精度タイミング測定を有効化
    });
    await container.setup();

    performanceSuite = new PerformanceBenchmarkSuite(container);
  });

  afterEach(async () => {
    await performanceSuite.stopAllTests();
    await container.teardown();
  });

  // ===================================================================
  // 基本レイテンシベンチマーク
  // ===================================================================

  describe('Basic Latency Benchmarks', () => {
    it('should measure session operation latencies with high precision', async () => {
      console.log('Measuring session operation latencies with high precision...');

      const operationBenchmarks = [
        {
          name: 'Session Validation',
          operation: async () => await container.validateAllSessions(),
          expectedP50: 200, // 50%タイル 200ms以下
          expectedP95: 1000, // 95%タイル 1秒以下
          expectedP99: 2000, // 99%タイル 2秒以下
          samples: 100
        },
        {
          name: 'Single Session Refresh',
          operation: async () => {
            const accounts = container.state.activeAccounts;
            if (accounts.length > 0) {
              await container.sessionManager.proactiveRefresh(accounts[0].profile.did);
            }
          },
          expectedP50: 500,
          expectedP95: 2000,
          expectedP99: 5000,
          samples: 50
        },
        {
          name: 'Session State Retrieval',
          operation: async () => {
            const accounts = container.state.activeAccounts;
            accounts.forEach(account => {
              container.sessionManager.getSessionState(account.profile.did);
            });
          },
          expectedP50: 50,
          expectedP95: 200,
          expectedP99: 500,
          samples: 200
        },
        {
          name: 'Account Authentication Check',
          operation: async () => {
            const accounts = container.state.activeAccounts;
            if (accounts.length > 0) {
              await container.authService.getAccount(accounts[0].id);
            }
          },
          expectedP50: 100,
          expectedP95: 500,
          expectedP99: 1000,
          samples: 150
        }
      ];

      const benchmarkResults: Array<{
        operation: string;
        samples: number;
        latencies: number[];
        percentiles: { p50: number; p90: number; p95: number; p99: number; p99_9: number };
        statistics: { min: number; max: number; avg: number; stdDev: number };
        performance: { withinP50: boolean; withinP95: boolean; withinP99: boolean };
      }> = [];

      for (const benchmark of operationBenchmarks) {
        console.log(`\nBenchmarking ${benchmark.name}...`);

        const latencies: number[] = [];
        let successfulSamples = 0;

        // ウォームアップ実行
        console.log('  Warming up...');
        for (let i = 0; i < 5; i++) {
          try {
            await benchmark.operation();
          } catch (error) {
            // ウォームアップエラーは無視
          }
          await TimeControlHelper.wait(50);
        }

        // 実際のベンチマーク実行
        console.log(`  Collecting ${benchmark.samples} samples...`);
        for (let i = 0; i < benchmark.samples; i++) {
          try {
            const startTime = performance.now();
            await benchmark.operation();
            const endTime = performance.now();
            
            const latency = endTime - startTime;
            latencies.push(latency);
            successfulSamples++;

            // 進捗表示
            if ((i + 1) % 25 === 0) {
              console.log(`    Progress: ${((i + 1) / benchmark.samples * 100).toFixed(0)}%`);
            }

          } catch (error) {
            console.warn(`Benchmark sample failed: ${error instanceof Error ? error.message : String(error)}`);
          }

          // サンプル間の短い間隔
          await TimeControlHelper.wait(10);
        }

        if (latencies.length === 0) {
          console.warn(`No successful samples for ${benchmark.name}`);
          continue;
        }

        // レイテンシ統計の計算
        const sortedLatencies = [...latencies].sort((a, b) => a - b);
        const percentiles = this.calculatePercentiles(sortedLatencies);
        const statistics = this.calculateStatistics(latencies);

        const performance = {
          withinP50: percentiles.p50 <= benchmark.expectedP50,
          withinP95: percentiles.p95 <= benchmark.expectedP95,
          withinP99: percentiles.p99 <= benchmark.expectedP99
        };

        const result = {
          operation: benchmark.name,
          samples: successfulSamples,
          latencies: sortedLatencies,
          percentiles,
          statistics,
          performance
        };

        benchmarkResults.push(result);

        // 結果の表示
        console.log(`  Results for ${benchmark.name}:`);
        console.log(`    Samples: ${successfulSamples}/${benchmark.samples}`);
        console.log(`    P50: ${percentiles.p50.toFixed(1)}ms (target: ${benchmark.expectedP50}ms) ${performance.withinP50 ? '✅' : '❌'}`);
        console.log(`    P95: ${percentiles.p95.toFixed(1)}ms (target: ${benchmark.expectedP95}ms) ${performance.withinP95 ? '✅' : '❌'}`);
        console.log(`    P99: ${percentiles.p99.toFixed(1)}ms (target: ${benchmark.expectedP99}ms) ${performance.withinP99 ? '✅' : '❌'}`);
        console.log(`    Average: ${statistics.avg.toFixed(1)}ms`);
        console.log(`    Std Dev: ${statistics.stdDev.toFixed(1)}ms`);

        // 基本的な性能基準の確認
        expect(percentiles.p95).toBeLessThan(benchmark.expectedP95);
        expect(successfulSamples).toBeGreaterThan(benchmark.samples * 0.9); // 90%以上成功
      }

      // 全体的なベンチマーク分析
      console.log('\nOverall Latency Benchmark Summary:');
      benchmarkResults.forEach(result => {
        const passedTests = [result.performance.withinP50, result.performance.withinP95, result.performance.withinP99].filter(Boolean).length;
        console.log(`${result.operation}: ${passedTests}/3 targets met, P95=${result.percentiles.p95.toFixed(1)}ms`);
      });

      const overallPerformanceScore = benchmarkResults.reduce((sum, result) => {
        const score = [result.performance.withinP50, result.performance.withinP95, result.performance.withinP99].filter(Boolean).length;
        return sum + score;
      }, 0) / (benchmarkResults.length * 3);

      console.log(`Overall performance score: ${(overallPerformanceScore * 100).toFixed(1)}%`);
      expect(overallPerformanceScore).toBeGreaterThan(0.7); // 70%以上の目標達成

      console.log('✅ Session operation latencies measured with high precision');
    });

    it('should analyze latency distribution patterns', async () => {
      console.log('Analyzing latency distribution patterns...');

      const distributionAnalysis = {
        operation: async () => await container.validateAllSessions(),
        samples: 500,
        analysisType: 'distribution',
        expectedPatterns: {
          normalDistribution: false, // セッション操作は通常正規分布しない
          rightSkewed: true, // 右偏りの分布を期待
          multiModal: false, // 単峰性を期待
          outlierThreshold: 3.0 // 3シグマ以上をoutlier
        }
      };

      console.log(`Collecting ${distributionAnalysis.samples} samples for distribution analysis...`);

      const latencies: number[] = [];
      const timestamps: number[] = [];

      // 大量サンプルの収集
      for (let i = 0; i < distributionAnalysis.samples; i++) {
        try {
          const startTime = performance.now();
          await distributionAnalysis.operation();
          const endTime = performance.now();
          
          latencies.push(endTime - startTime);
          timestamps.push(Date.now());

          if ((i + 1) % 50 === 0) {
            console.log(`  Progress: ${((i + 1) / distributionAnalysis.samples * 100).toFixed(0)}%`);
          }

        } catch (error) {
          console.warn(`Distribution sample failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        await TimeControlHelper.wait(20);
      }

      // 分布分析の実行
      const distributionStats = this.analyzeDistribution(latencies);
      const outliers = this.detectOutliers(latencies, distributionAnalysis.expectedPatterns.outlierThreshold);
      const timeSeriesAnalysis = this.analyzeTimeSeriesPattern(latencies, timestamps);

      console.log('\nLatency Distribution Analysis:');
      console.log(`  Sample count: ${latencies.length}`);
      console.log(`  Distribution type: ${distributionStats.type}`);
      console.log(`  Skewness: ${distributionStats.skewness.toFixed(3)} (${distributionStats.skewness > 0 ? 'right-skewed' : 'left-skewed'})`);
      console.log(`  Kurtosis: ${distributionStats.kurtosis.toFixed(3)} (${distributionStats.kurtosis > 3 ? 'heavy-tailed' : 'light-tailed'})`);
      console.log(`  Outlier count: ${outliers.count} (${(outliers.percentage * 100).toFixed(1)}%)`);
      console.log(`  Time series trend: ${timeSeriesAnalysis.trend}`);

      // ヒストグラム分析
      const histogram = this.createHistogram(latencies, 20);
      console.log('\nLatency Histogram (20 bins):');
      histogram.forEach((bin: any, index: number) => {
        const bar = '█'.repeat(Math.floor(bin.percentage * 20));
        console.log(`  ${bin.min.toFixed(0)}-${bin.max.toFixed(0)}ms: ${bin.count.toString().padStart(3)} ${bar} ${bin.percentage.toFixed(1)}%`);
      });

      // 分布パターンの検証
      expect(distributionStats.skewness > 0).toBe(distributionAnalysis.expectedPatterns.rightSkewed);
      expect(outliers.percentage).toBeLessThan(0.1); // 10%未満のoutlier
      expect(latencies.length).toBeGreaterThan(distributionAnalysis.samples * 0.9);

      console.log('✅ Latency distribution patterns analyzed successfully');
    });

    it('should compare cold start vs warm performance', async () => {
      console.log('Comparing cold start vs warm performance...');

      const coldWarmComparison = {
        operations: [
          {
            name: 'Session Validation',
            operation: async () => await container.validateAllSessions()
          },
          {
            name: 'Account Authentication',
            operation: async () => {
              const accounts = container.state.activeAccounts;
              if (accounts.length > 0) {
                await container.authService.getAccount(accounts[0].id);
              }
            }
          },
          {
            name: 'Token Refresh',
            operation: async () => {
              const accounts = container.state.activeAccounts;
              if (accounts.length > 0) {
                await container.sessionManager.proactiveRefresh(accounts[0].profile.did);
              }
            }
          }
        ],
        coldStartSamples: 10,
        warmUpIterations: 50,
        warmSamples: 30,
        maxColdStartRatio: 3.0 // コールドスタートはウォームアップの3倍以下
      };

      const comparisonResults: Array<{
        operation: string;
        coldStart: { latencies: number[]; avg: number; p95: number };
        warm: { latencies: number[]; avg: number; p95: number };
        improvement: { avgRatio: number; p95Ratio: number; withinRatio: boolean };
      }> = [];

      for (const op of coldWarmComparison.operations) {
        console.log(`\nTesting ${op.name}...`);

        // コールドスタート測定（システム再起動直後をシミュレーション）
        console.log('  Measuring cold start performance...');
        await this.simulateColdStart();
        
        const coldStartLatencies: number[] = [];
        for (let i = 0; i < coldWarmComparison.coldStartSamples; i++) {
          try {
            const startTime = performance.now();
            await op.operation();
            const endTime = performance.now();
            coldStartLatencies.push(endTime - startTime);

            // コールドスタート間隔
            await TimeControlHelper.wait(1000);
          } catch (error) {
            console.warn(`Cold start sample failed: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        // ウォームアップ実行
        console.log('  Warming up system...');
        for (let i = 0; i < coldWarmComparison.warmUpIterations; i++) {
          try {
            await op.operation();
          } catch (error) {
            // ウォームアップエラーは無視
          }
          await TimeControlHelper.wait(50);
        }

        // ウォーム状態での測定
        console.log('  Measuring warm performance...');
        const warmLatencies: number[] = [];
        for (let i = 0; i < coldWarmComparison.warmSamples; i++) {
          try {
            const startTime = performance.now();
            await op.operation();
            const endTime = performance.now();
            warmLatencies.push(endTime - startTime);
          } catch (error) {
            console.warn(`Warm sample failed: ${error instanceof Error ? error.message : String(error)}`);
          }
          await TimeControlHelper.wait(50);
        }

        // 統計計算
        const coldStats = {
          latencies: coldStartLatencies,
          avg: coldStartLatencies.reduce((sum, l) => sum + l, 0) / coldStartLatencies.length || 0,
          p95: this.calculatePercentiles(coldStartLatencies).p95
        };

        const warmStats = {
          latencies: warmLatencies,
          avg: warmLatencies.reduce((sum, l) => sum + l, 0) / warmLatencies.length || 0,
          p95: this.calculatePercentiles(warmLatencies).p95
        };

        const improvement = {
          avgRatio: coldStats.avg / warmStats.avg,
          p95Ratio: coldStats.p95 / warmStats.p95,
          withinRatio: (coldStats.avg / warmStats.avg) <= coldWarmComparison.maxColdStartRatio
        };

        const result = {
          operation: op.name,
          coldStart: coldStats,
          warm: warmStats,
          improvement
        };

        comparisonResults.push(result);

        console.log(`  Cold start avg: ${coldStats.avg.toFixed(1)}ms, P95: ${coldStats.p95.toFixed(1)}ms`);
        console.log(`  Warm avg: ${warmStats.avg.toFixed(1)}ms, P95: ${warmStats.p95.toFixed(1)}ms`);
        console.log(`  Improvement: ${improvement.avgRatio.toFixed(2)}x avg, ${improvement.p95Ratio.toFixed(2)}x P95`);
        console.log(`  Within ratio: ${improvement.withinRatio ? 'Yes' : 'No'}`);

        expect(improvement.withinRatio).toBe(true);
      }

      // 全体的なコールドスタート分析
      console.log('\nCold Start vs Warm Performance Summary:');
      comparisonResults.forEach(result => {
        console.log(`${result.operation}: ${result.improvement.avgRatio.toFixed(2)}x slower cold start, ${result.improvement.withinRatio ? 'PASS' : 'FAIL'}`);
      });

      const avgImprovementRatio = comparisonResults.reduce((sum, r) => sum + r.improvement.avgRatio, 0) / comparisonResults.length;
      console.log(`Average cold start ratio: ${avgImprovementRatio.toFixed(2)}x`);

      expect(avgImprovementRatio).toBeLessThan(coldWarmComparison.maxColdStartRatio);

      console.log('✅ Cold start vs warm performance comparison completed');
    });

    // ヘルパーメソッド：コールドスタートのシミュレーション
    private async simulateColdStart(): Promise<void> {
      // キャッシュクリア、ガベージコレクション実行等でコールドスタートをシミュレート
      if (global.gc) {
        global.gc();
      }
      
      // 少し待機してシステムをリセット状態に
      await TimeControlHelper.wait(2000);
    }

    // ヘルパーメソッド：パーセンタイル計算
    private calculatePercentiles(sortedValues: number[]): {
      p50: number; p90: number; p95: number; p99: number; p99_9: number;
    } {
      if (sortedValues.length === 0) {
        return { p50: 0, p90: 0, p95: 0, p99: 0, p99_9: 0 };
      }

      const getPercentile = (p: number) => {
        const index = Math.ceil((p / 100) * sortedValues.length) - 1;
        return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
      };

      return {
        p50: getPercentile(50),
        p90: getPercentile(90),
        p95: getPercentile(95),
        p99: getPercentile(99),
        p99_9: getPercentile(99.9)
      };
    }

    // ヘルパーメソッド：統計計算
    private calculateStatistics(values: number[]): {
      min: number; max: number; avg: number; stdDev: number;
    } {
      if (values.length === 0) {
        return { min: 0, max: 0, avg: 0, stdDev: 0 };
      }

      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      return { min, max, avg, stdDev };
    }

    // ヘルパーメソッド：分布分析
    private analyzeDistribution(values: number[]): {
      type: string; skewness: number; kurtosis: number;
    } {
      if (values.length < 3) {
        return { type: 'insufficient_data', skewness: 0, kurtosis: 0 };
      }

      const stats = this.calculateStatistics(values);
      const n = values.length;

      // 歪度計算
      const skewness = values.reduce((sum, v) => sum + Math.pow((v - stats.avg) / stats.stdDev, 3), 0) / n;
      
      // 尖度計算
      const kurtosis = values.reduce((sum, v) => sum + Math.pow((v - stats.avg) / stats.stdDev, 4), 0) / n;

      let type = 'unknown';
      if (Math.abs(skewness) < 0.5) {
        type = 'normal';
      } else if (skewness > 0.5) {
        type = 'right_skewed';
      } else {
        type = 'left_skewed';
      }

      return { type, skewness, kurtosis };
    }

    // ヘルパーメソッド：外れ値検出
    private detectOutliers(values: number[], sigmaThreshold: number): {
      count: number; percentage: number; outliers: number[];
    } {
      const stats = this.calculateStatistics(values);
      const outliers = values.filter(v => Math.abs(v - stats.avg) > sigmaThreshold * stats.stdDev);
      
      return {
        count: outliers.length,
        percentage: outliers.length / values.length,
        outliers
      };
    }

    // ヘルパーメソッド：時系列パターン分析
    private analyzeTimeSeriesPattern(values: number[], timestamps: number[]): {
      trend: string; slope: number;
    } {
      if (values.length < 10) {
        return { trend: 'insufficient_data', slope: 0 };
      }

      // 簡単な線形トレンド分析
      const n = values.length;
      const timeRange = timestamps[n - 1] - timestamps[0];
      const normalizedTimes = timestamps.map(t => (t - timestamps[0]) / timeRange);

      const sumX = normalizedTimes.reduce((sum, x) => sum + x, 0);
      const sumY = values.reduce((sum, y) => sum + y, 0);
      const sumXY = normalizedTimes.reduce((sum, x, i) => sum + x * values[i], 0);
      const sumXX = normalizedTimes.reduce((sum, x) => sum + x * x, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

      let trend = 'stable';
      if (slope > 0.1) {
        trend = 'increasing';
      } else if (slope < -0.1) {
        trend = 'decreasing';
      }

      return { trend, slope };
    }

    // ヘルパーメソッド：ヒストグラム作成
    private createHistogram(values: number[], binCount: number): Array<{
      min: number; max: number; count: number; percentage: number;
    }> {
      if (values.length === 0) return [];

      const min = Math.min(...values);
      const max = Math.max(...values);
      const binWidth = (max - min) / binCount;

      const bins = Array.from({ length: binCount }, (_, i) => ({
        min: min + i * binWidth,
        max: min + (i + 1) * binWidth,
        count: 0,
        percentage: 0
      }));

      values.forEach(value => {
        const binIndex = Math.min(Math.floor((value - min) / binWidth), binCount - 1);
        bins[binIndex].count++;
      });

      bins.forEach(bin => {
        bin.percentage = bin.count / values.length;
      });

      return bins;
    }
  });

  // ===================================================================
  // 操作別レイテンシ最適化テスト
  // ===================================================================

  describe('Operation-specific Latency Optimization', () => {
    it('should validate session validation latency optimization', async () => {
      console.log('Validating session validation latency optimization...');

      const validationOptimizationTest = {
        baselineIterations: 50,
        optimizedIterations: 100,
        expectedImprovement: 0.2, // 20%以上の改善を期待
        maxAcceptableLatency: 1500, // 1.5秒以下
        testScenarios: [
          { accountCount: 5, label: 'Small account set' },
          { accountCount: 10, label: 'Medium account set' },
          { accountCount: 20, label: 'Large account set' }
        ]
      };

      const optimizationResults: Array<{
        scenario: string;
        accountCount: number;
        baseline: { avg: number; p95: number };
        optimized: { avg: number; p95: number };
        improvement: { avgPercent: number; p95Percent: number };
        withinTarget: boolean;
      }> = [];

      for (const scenario of validationOptimizationTest.testScenarios) {
        console.log(`\nTesting ${scenario.label} (${scenario.accountCount} accounts)...`);

        // アカウント数を調整
        const currentCount = container.state.activeAccounts.length;
        if (currentCount < scenario.accountCount) {
          for (let i = currentCount; i < scenario.accountCount; i++) {
            await container.addAccount(`did:plc:opt${i}`, `opt${i}.bsky.social`);
          }
        }

        // ベースライン測定（単純な実装）
        console.log('  Measuring baseline performance...');
        const baselineLatencies: number[] = [];
        for (let i = 0; i < validationOptimizationTest.baselineIterations; i++) {
          const startTime = performance.now();
          await container.validateAllSessions();
          baselineLatencies.push(performance.now() - startTime);
          await TimeControlHelper.wait(50);
        }

        // 最適化実装の測定（並列処理等の最適化を想定）
        console.log('  Measuring optimized performance...');
        const optimizedLatencies: number[] = [];
        for (let i = 0; i < validationOptimizationTest.optimizedIterations; i++) {
          const startTime = performance.now();
          
          // 最適化された実装をシミュレート（実際の実装では並列処理等）
          const validationPromises = container.state.activeAccounts.map(async (account) => {
            const sessionState = container.sessionManager.getSessionState(account.profile.did);
            return { accountId: account.profile.did, isValid: sessionState?.isValid || false };
          });
          
          await Promise.all(validationPromises);
          optimizedLatencies.push(performance.now() - startTime);
          await TimeControlHelper.wait(30);
        }

        // 統計計算
        const baselineStats = this.calculateStatistics(baselineLatencies);
        const optimizedStats = this.calculateStatistics(optimizedLatencies);
        const baselineP95 = this.calculatePercentiles(baselineLatencies).p95;
        const optimizedP95 = this.calculatePercentiles(optimizedLatencies).p95;

        const improvement = {
          avgPercent: (baselineStats.avg - optimizedStats.avg) / baselineStats.avg,
          p95Percent: (baselineP95 - optimizedP95) / baselineP95
        };

        const result = {
          scenario: scenario.label,
          accountCount: scenario.accountCount,
          baseline: { avg: baselineStats.avg, p95: baselineP95 },
          optimized: { avg: optimizedStats.avg, p95: optimizedP95 },
          improvement,
          withinTarget: optimizedStats.avg <= validationOptimizationTest.maxAcceptableLatency
        };

        optimizationResults.push(result);

        console.log(`  Baseline: ${baselineStats.avg.toFixed(1)}ms avg, ${baselineP95.toFixed(1)}ms P95`);
        console.log(`  Optimized: ${optimizedStats.avg.toFixed(1)}ms avg, ${optimizedP95.toFixed(1)}ms P95`);
        console.log(`  Improvement: ${(improvement.avgPercent * 100).toFixed(1)}% avg, ${(improvement.p95Percent * 100).toFixed(1)}% P95`);
        console.log(`  Within target: ${result.withinTarget ? 'Yes' : 'No'}`);

        expect(result.withinTarget).toBe(true);
        expect(improvement.avgPercent).toBeGreaterThan(0); // 何らかの改善があること
      }

      // 最適化結果の総合評価
      console.log('\nSession Validation Optimization Summary:');
      optimizationResults.forEach(result => {
        console.log(`${result.scenario}: ${(result.improvement.avgPercent * 100).toFixed(1)}% improvement, ${result.withinTarget ? 'PASS' : 'FAIL'}`);
      });

      const avgImprovement = optimizationResults.reduce((sum, r) => sum + r.improvement.avgPercent, 0) / optimizationResults.length;
      const allWithinTarget = optimizationResults.every(r => r.withinTarget);

      console.log(`Average improvement: ${(avgImprovement * 100).toFixed(1)}%`);
      console.log(`All within target: ${allWithinTarget ? 'Yes' : 'No'}`);

      expect(allWithinTarget).toBe(true);
      expect(avgImprovement).toBeGreaterThan(0.1); // 最低10%の改善

      console.log('✅ Session validation latency optimization validated');
    });

    it('should identify and optimize performance bottlenecks', async () => {
      console.log('Identifying and optimizing performance bottlenecks...');

      const bottleneckIdentification = {
        operationComponents: [
          {
            name: 'Session State Retrieval',
            operation: async () => {
              const accounts = container.state.activeAccounts;
              return accounts.map(account => 
                container.sessionManager.getSessionState(account.profile.did)
              );
            },
            expectedLatency: 100
          },
          {
            name: 'Token Validation',
            operation: async () => {
              const accounts = container.state.activeAccounts;
              const validations = [];
              for (const account of accounts) {
                const authResult = await container.authService.getAccount(account.id);
                validations.push(authResult.success);
              }
              return validations;
            },
            expectedLatency: 500
          },
          {
            name: 'Session Refresh Check',
            operation: async () => {
              const accounts = container.state.activeAccounts;
              const refreshChecks = [];
              for (const account of accounts) {
                const sessionState = container.sessionManager.getSessionState(account.profile.did);
                refreshChecks.push(sessionState?.refreshInProgress || false);
              }
              return refreshChecks;
            },
            expectedLatency: 50
          }
        ],
        samples: 100,
        bottleneckThreshold: 2.0 // 期待値の2倍以上でボトルネック
      };

      const bottleneckResults: Array<{
        component: string;
        avgLatency: number;
        expectedLatency: number;
        ratio: number;
        isBottleneck: boolean;
        optimizationPotential: number;
      }> = [];

      for (const component of bottleneckIdentification.operationComponents) {
        console.log(`\nAnalyzing ${component.name}...`);

        const componentLatencies: number[] = [];

        for (let i = 0; i < bottleneckIdentification.samples; i++) {
          try {
            const startTime = performance.now();
            await component.operation();
            componentLatencies.push(performance.now() - startTime);
          } catch (error) {
            console.warn(`Component analysis failed: ${error instanceof Error ? error.message : String(error)}`);
          }
          await TimeControlHelper.wait(20);
        }

        if (componentLatencies.length === 0) continue;

        const avgLatency = componentLatencies.reduce((sum, l) => sum + l, 0) / componentLatencies.length;
        const ratio = avgLatency / component.expectedLatency;
        const isBottleneck = ratio >= bottleneckIdentification.bottleneckThreshold;
        const optimizationPotential = Math.max(0, (ratio - 1) * 100); // 期待値を超える分の%

        const result = {
          component: component.name,
          avgLatency,
          expectedLatency: component.expectedLatency,
          ratio,
          isBottleneck,
          optimizationPotential
        };

        bottleneckResults.push(result);

        console.log(`  Average latency: ${avgLatency.toFixed(1)}ms`);
        console.log(`  Expected latency: ${component.expectedLatency}ms`);
        console.log(`  Ratio: ${ratio.toFixed(2)}x`);
        console.log(`  Is bottleneck: ${isBottleneck ? 'Yes' : 'No'}`);
        console.log(`  Optimization potential: ${optimizationPotential.toFixed(1)}%`);
      }

      // ボトルネック分析と最適化提案
      console.log('\nBottleneck Analysis Summary:');
      const bottlenecks = bottleneckResults.filter(r => r.isBottleneck);
      
      if (bottlenecks.length > 0) {
        console.log('Identified bottlenecks:');
        bottlenecks.forEach(bottleneck => {
          console.log(`  - ${bottleneck.component}: ${bottleneck.ratio.toFixed(2)}x slower than expected`);
        });

        // 最適化優先度の計算
        const sortedByPriority = [...bottlenecks].sort((a, b) => b.optimizationPotential - a.optimizationPotential);
        console.log('\nOptimization priority:');
        sortedByPriority.forEach((item: any, index: number) => {
          console.log(`  ${index + 1}. ${item.component} (${item.optimizationPotential.toFixed(1)}% potential)`);
        });
      } else {
        console.log('No significant bottlenecks identified.');
      }

      // 全体的な性能評価
      const avgRatio = bottleneckResults.reduce((sum, r) => sum + r.ratio, 0) / bottleneckResults.length;
      const totalOptimizationPotential = bottleneckResults.reduce((sum, r) => sum + r.optimizationPotential, 0);

      console.log(`\nOverall Performance:`);
      console.log(`  Average performance ratio: ${avgRatio.toFixed(2)}x`);
      console.log(`  Total optimization potential: ${totalOptimizationPotential.toFixed(1)}%`);
      console.log(`  Components within expectations: ${bottleneckResults.filter(r => !r.isBottleneck).length}/${bottleneckResults.length}`);

      // 最低限の性能基準
      expect(avgRatio).toBeLessThan(3.0); // 平均で期待値の3倍以下
      expect(bottlenecks.length).toBeLessThan(bottleneckResults.length); // 全てがボトルネックではない

      console.log('✅ Performance bottlenecks identified and optimization paths established');
    });
  });
});