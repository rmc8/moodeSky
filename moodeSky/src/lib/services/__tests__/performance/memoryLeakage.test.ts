/**
 * Memory Leakage Detection Test Suite
 * Issue #92 Phase 4 Wave 1: メモリリーク検出・防止テスト
 * 
 * セッション管理システムのメモリリーク検出と防止機能を検証
 * - 長時間動作でのメモリ増加監視
 * - リーク検出アルゴリズムの検証
 * - ガベージコレクション効果測定
 * - セッション循環参照検出
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceBenchmarkSuite, type PerformanceTestConfig, PerformanceTestHelpers } from '../../../test-utils/performanceBenchmarkSuite.js';
import { IntegrationTestContainer } from '../../../test-utils/integrationTestContainer.js';
import { TimeControlHelper, AccountTestFactory } from '../../../test-utils/sessionTestUtils.js';

describe('Memory Leakage Detection Tests', () => {
  let container: IntegrationTestContainer;
  let performanceSuite: PerformanceBenchmarkSuite;

  beforeEach(async () => {
    // メモリリークテスト用の設定
    container = new IntegrationTestContainer({
      initialAccountCount: 15, // 適度なアカウント数
      enableJWTManager: true,
      enableBackgroundMonitor: false, // バックグラウンド処理によるメモリ変動を回避
      logLevel: 'error',
      memoryMonitoring: true // メモリ監視を有効化
    });
    await container.setup();

    performanceSuite = new PerformanceBenchmarkSuite(container);
  });

  afterEach(async () => {
    await performanceSuite.stopAllTests();
    await container.teardown();
  });

  // ===================================================================
  // 基本メモリリーク検出テスト
  // ===================================================================

  describe('Basic Memory Leak Detection', () => {
    it('should detect memory leaks in session operations', async () => {
      console.log('Testing memory leak detection in session operations...');

      const leakDetectionConfig = {
        testDuration: 300000, // 5分間のテスト
        samplingInterval: 10000, // 10秒間隔でサンプリング
        operationInterval: 1000, // 1秒間隔で操作実行
        leakThreshold: {
          totalIncreaseMB: 150, // 総増加150MB以下
          ratePerMinuteMB: 10, // 1分あたり10MB以下の増加率
          trendSlope: 0.5 // 傾向線の勾配
        }
      };

      const memorySnapshots: Array<{
        timestamp: number;
        heapUsed: number;
        heapTotal: number;
        external: number;
        operationCount: number;
      }> = [];

      // 初期メモリ状態の記録
      const initialMemory = process.memoryUsage();
      memorySnapshots.push({
        timestamp: Date.now(),
        heapUsed: initialMemory.heapUsed / 1024 / 1024,
        heapTotal: initialMemory.heapTotal / 1024 / 1024,
        external: initialMemory.external / 1024 / 1024,
        operationCount: 0
      });

      console.log(`Initial memory: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(1)}MB heap used`);

      // 長期間の連続操作実行
      const testStartTime = Date.now();
      let operationCount = 0;
      let lastSamplingTime = Date.now();

      while (Date.now() - testStartTime < leakDetectionConfig.testDuration) {
        // セッション操作の実行
        try {
          await container.validateAllSessions();
          operationCount++;

          // 定期的なメモリサンプリング
          if (Date.now() - lastSamplingTime >= leakDetectionConfig.samplingInterval) {
            const currentMemory = process.memoryUsage();
            memorySnapshots.push({
              timestamp: Date.now(),
              heapUsed: currentMemory.heapUsed / 1024 / 1024,
              heapTotal: currentMemory.heapTotal / 1024 / 1024,
              external: currentMemory.external / 1024 / 1024,
              operationCount
            });

            const latestSnapshot = memorySnapshots[memorySnapshots.length - 1];
            console.log(`  ${Math.floor((Date.now() - testStartTime) / 1000)}s: ${latestSnapshot.heapUsed.toFixed(1)}MB heap, ${operationCount} ops`);

            lastSamplingTime = Date.now();
          }

          // 操作間隔
          await TimeControlHelper.wait(leakDetectionConfig.operationInterval);

        } catch (error) {
          console.warn(`Operation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // ガベージコレクションの実行
      if (global.gc) {
        console.log('Running garbage collection...');
        global.gc();
        await TimeControlHelper.wait(3000);

        const postGcMemory = process.memoryUsage();
        memorySnapshots.push({
          timestamp: Date.now(),
          heapUsed: postGcMemory.heapUsed / 1024 / 1024,
          heapTotal: postGcMemory.heapTotal / 1024 / 1024,
          external: postGcMemory.external / 1024 / 1024,
          operationCount
        });
      }

      // メモリリーク分析
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
      const totalMemoryIncrease = lastSnapshot.heapUsed - firstSnapshot.heapUsed;
      const testDurationMinutes = (lastSnapshot.timestamp - firstSnapshot.timestamp) / 1000 / 60;
      const memoryIncreaseRate = totalMemoryIncrease / testDurationMinutes;

      console.log('\nMemory Leak Analysis:');
      console.log(`  Test duration: ${testDurationMinutes.toFixed(1)} minutes`);
      console.log(`  Total operations: ${operationCount}`);
      console.log(`  Memory increase: ${totalMemoryIncrease.toFixed(1)}MB`);
      console.log(`  Increase rate: ${memoryIncreaseRate.toFixed(2)}MB/min`);
      console.log(`  Operations per MB: ${(operationCount / Math.max(1, totalMemoryIncrease)).toFixed(0)}`);

      // メモリ増加傾向の分析（線形回帰）
      const memoryTrend = this.calculateMemoryTrend(memorySnapshots);
      console.log(`  Memory trend slope: ${memoryTrend.slope.toFixed(4)}MB/sample`);
      console.log(`  R-squared: ${memoryTrend.rSquared.toFixed(3)}`);

      // リーク検出基準の確認
      expect(totalMemoryIncrease).toBeLessThan(leakDetectionConfig.leakThreshold.totalIncreaseMB);
      expect(memoryIncreaseRate).toBeLessThan(leakDetectionConfig.leakThreshold.ratePerMinuteMB);
      expect(Math.abs(memoryTrend.slope)).toBeLessThan(leakDetectionConfig.leakThreshold.trendSlope);

      // 最低限の動作実行確認
      expect(operationCount).toBeGreaterThan(100);

      console.log('✅ No significant memory leaks detected in session operations');
    });

    it('should identify specific memory leak patterns', async () => {
      console.log('Testing identification of specific memory leak patterns...');

      const patternTests = [
        {
          name: 'Session Creation Pattern',
          operation: async () => {
            // 一時的なセッション作成とクリーンアップ
            const tempAccount = await container.addAccount(`did:plc:temp${Date.now()}`, `temp${Date.now()}.bsky.social`);
            await container.removeAccount(tempAccount.id);
          },
          expectedLeakMB: 2 // 一時セッションで2MB以下のリーク
        },
        {
          name: 'Token Refresh Pattern',
          operation: async () => {
            const accounts = container.state.activeAccounts;
            if (accounts.length > 0) {
              await container.sessionManager.proactiveRefresh(accounts[0].profile.did);
            }
          },
          expectedLeakMB: 1 // トークンリフレッシュで1MB以下のリーク
        },
        {
          name: 'Validation Cycle Pattern',
          operation: async () => {
            await container.validateAllSessions();
          },
          expectedLeakMB: 0.5 // セッション検証で0.5MB以下のリーク
        }
      ];

      const patternResults: Array<{
        pattern: string;
        memoryLeakMB: number;
        operationsCount: number;
        leakPerOperation: number;
        withinThreshold: boolean;
      }> = [];

      for (const pattern of patternTests) {
        console.log(`\nTesting ${pattern.name}...`);

        const beforeMemory = process.memoryUsage();
        const startTime = Date.now();
        let operationsCount = 0;

        // パターンを100回実行
        for (let i = 0; i < 100; i++) {
          try {
            await pattern.operation();
            operationsCount++;
          } catch (error) {
            console.warn(`Pattern operation failed: ${error instanceof Error ? error.message : String(error)}`);
          }

          // 10回ごとに短い休憩
          if (i % 10 === 0) {
            await TimeControlHelper.wait(100);
          }
        }

        // 強制ガベージコレクション
        if (global.gc) {
          global.gc();
          await TimeControlHelper.wait(1000);
        }

        const afterMemory = process.memoryUsage();
        const memoryLeakMB = (afterMemory.heapUsed - beforeMemory.heapUsed) / 1024 / 1024;
        const leakPerOperation = memoryLeakMB / operationsCount;
        const withinThreshold = memoryLeakMB <= pattern.expectedLeakMB;

        const result = {
          pattern: pattern.name,
          memoryLeakMB,
          operationsCount,
          leakPerOperation,
          withinThreshold
        };

        patternResults.push(result);

        console.log(`  Operations: ${operationsCount}`);
        console.log(`  Memory leak: ${memoryLeakMB.toFixed(2)}MB`);
        console.log(`  Leak per operation: ${(leakPerOperation * 1024).toFixed(2)}KB`);
        console.log(`  Within threshold: ${withinThreshold ? 'Yes' : 'No'}`);

        expect(memoryLeakMB).toBeLessThan(pattern.expectedLeakMB);
      }

      // パターン分析の要約
      console.log('\nMemory Leak Pattern Analysis:');
      patternResults.forEach(result => {
        console.log(`${result.pattern}: ${result.memoryLeakMB.toFixed(2)}MB total, ${(result.leakPerOperation * 1024).toFixed(2)}KB/op`);
      });

      const totalPatternLeak = patternResults.reduce((sum, r) => sum + r.memoryLeakMB, 0);
      console.log(`Total pattern leakage: ${totalPatternLeak.toFixed(2)}MB`);

      expect(totalPatternLeak).toBeLessThan(5); // 全パターンで5MB以下
      expect(patternResults.filter(r => r.withinThreshold).length).toBe(patternResults.length);

      console.log('✅ Specific memory leak patterns identified and within thresholds');
    });

    it('should validate garbage collection effectiveness', async () => {
      console.log('Testing garbage collection effectiveness...');

      const gcEffectivenessTest = {
        preloadOperations: 200, // メモリを意図的に増加させる操作数
        gcCycles: 3, // ガベージコレクション実行回数
        expectedCleanupRatio: 0.6 // 期待されるクリーンアップ率（60%以上）
      };

      console.log('Phase 1: Memory preloading...');
      const initialMemory = process.memoryUsage();

      // メモリを意図的に増加させる
      const temporaryData: any[] = [];
      for (let i = 0; i < gcEffectivenessTest.preloadOperations; i++) {
        try {
          // セッション操作とデータ蓄積
          await container.validateAllSessions();
          
          // 一時的なデータ構造の作成（リークのシミュレーション）
          temporaryData.push({
            id: `temp_${i}`,
            data: new Array(1000).fill(`data_${i}`),
            timestamp: Date.now()
          });

          if (i % 20 === 0) {
            console.log(`  Preload progress: ${((i / gcEffectivenessTest.preloadOperations) * 100).toFixed(0)}%`);
          }

        } catch (error) {
          console.warn(`Preload operation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      const afterPreloadMemory = process.memoryUsage();
      const preloadIncrease = (afterPreloadMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
      console.log(`Memory after preload: ${preloadIncrease.toFixed(1)}MB increase`);

      console.log('\nPhase 2: Garbage collection testing...');
      const gcResults: Array<{
        cycle: number;
        beforeGC: number;
        afterGC: number;
        cleanedMB: number;
        cleanupRatio: number;
      }> = [];

      for (let cycle = 1; cycle <= gcEffectivenessTest.gcCycles; cycle++) {
        const beforeGC = process.memoryUsage();

        // 参照を削除してGCを促進
        if (cycle === 1) {
          temporaryData.length = 0; // 配列をクリア
        }

        // 強制ガベージコレクション
        if (global.gc) {
          global.gc();
          await TimeControlHelper.wait(2000);
        } else {
          // GCが利用できない場合は他の方法でメモリ圧迫
          await TimeControlHelper.wait(5000);
        }

        const afterGC = process.memoryUsage();
        const cleanedMB = (beforeGC.heapUsed - afterGC.heapUsed) / 1024 / 1024;
        const cleanupRatio = cleanedMB / (beforeGC.heapUsed / 1024 / 1024);

        const gcResult = {
          cycle,
          beforeGC: beforeGC.heapUsed / 1024 / 1024,
          afterGC: afterGC.heapUsed / 1024 / 1024,
          cleanedMB,
          cleanupRatio
        };

        gcResults.push(gcResult);

        console.log(`  GC Cycle ${cycle}: ${gcResult.beforeGC.toFixed(1)}MB → ${gcResult.afterGC.toFixed(1)}MB (${gcResult.cleanedMB.toFixed(1)}MB cleaned, ${(cleanupRatio * 100).toFixed(1)}%)`);
      }

      console.log('\nPhase 3: System validation...');
      // GC後のシステム動作確認
      const postGcValidation = await container.validateAllSessions();
      const finalMemory = process.memoryUsage();

      // GC効果の分析
      const maxCleanedMB = Math.max(...gcResults.map(r => r.cleanedMB));
      const avgCleanupRatio = gcResults.reduce((sum, r) => sum + r.cleanupRatio, 0) / gcResults.length;
      const finalMemoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;

      console.log('\nGarbage Collection Effectiveness Analysis:');
      console.log(`  Maximum cleaned in single cycle: ${maxCleanedMB.toFixed(1)}MB`);
      console.log(`  Average cleanup ratio: ${(avgCleanupRatio * 100).toFixed(1)}%`);
      console.log(`  Final memory increase: ${finalMemoryIncrease.toFixed(1)}MB`);
      console.log(`  System operational: ${postGcValidation.length > 0 ? 'Yes' : 'No'}`);

      // GC効果の基準確認
      expect(maxCleanedMB).toBeGreaterThan(5); // 最低5MB以上クリーンアップ
      expect(avgCleanupRatio).toBeGreaterThan(0.1); // 平均10%以上のクリーンアップ
      expect(finalMemoryIncrease).toBeLessThan(preloadIncrease * 0.7); // プリロード増加の70%以下に削減
      expect(postGcValidation.length).toBeGreaterThan(0); // システムは正常動作

      console.log('✅ Garbage collection effectiveness validated');
    });

    // ヘルパーメソッド：メモリ増加傾向の計算（線形回帰）
    private calculateMemoryTrend(snapshots: Array<{ timestamp: number; heapUsed: number }>): {
      slope: number;
      intercept: number;
      rSquared: number;
    } {
      const n = snapshots.length;
      if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };

      // 時間を0からの経過秒に正規化
      const startTime = snapshots[0].timestamp;
      const xValues = snapshots.map(s => (s.timestamp - startTime) / 1000);
      const yValues = snapshots.map(s => s.heapUsed);

      // 線形回帰の計算
      const sumX = xValues.reduce((sum, x) => sum + x, 0);
      const sumY = yValues.reduce((sum, y) => sum + y, 0);
      const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
      const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
      const sumYY = yValues.reduce((sum, y) => sum + y * y, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // 決定係数（R²）の計算
      const yMean = sumY / n;
      const ssRes = yValues.reduce((sum, y, i) => {
        const predicted = slope * xValues[i] + intercept;
        return sum + Math.pow(y - predicted, 2);
      }, 0);
      const ssTot = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
      const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

      return { slope, intercept, rSquared };
    }
  });

  // ===================================================================
  // 長期間メモリ監視テスト
  // ===================================================================

  describe('Long-term Memory Monitoring', () => {
    it('should maintain stable memory usage over extended periods', async () => {
      console.log('Testing stable memory usage over extended periods...');

      const longTermConfig = {
        testDuration: 600000, // 10分間
        samplingInterval: 30000, // 30秒間隔
        operationInterval: 2000, // 2秒間隔で操作
        stabilityThreshold: {
          maxTotalIncreaseMB: 100, // 総増加100MB以下
          maxSampleVariationMB: 20, // サンプル間変動20MB以下
          steadyStateRatio: 0.7 // 70%以上のサンプルが安定状態
        }
      };

      const longTermSnapshots: Array<{
        timestamp: number;
        memoryMB: number;
        operationCount: number;
        intervalSinceStart: number;
      }> = [];

      console.log(`Starting long-term monitoring (${longTermConfig.testDuration / 60000} minutes)...`);
      
      const startTime = Date.now();
      const initialMemory = process.memoryUsage();
      let operationCount = 0;
      let lastSamplingTime = Date.now();

      longTermSnapshots.push({
        timestamp: startTime,
        memoryMB: initialMemory.heapUsed / 1024 / 1024,
        operationCount: 0,
        intervalSinceStart: 0
      });

      while (Date.now() - startTime < longTermConfig.testDuration) {
        // 定期的なセッション操作
        try {
          await container.validateAllSessions();
          operationCount++;

          // 定期的なメモリサンプリング
          if (Date.now() - lastSamplingTime >= longTermConfig.samplingInterval) {
            const currentMemory = process.memoryUsage();
            const intervalSinceStart = Math.floor((Date.now() - startTime) / 60000);

            longTermSnapshots.push({
              timestamp: Date.now(),
              memoryMB: currentMemory.heapUsed / 1024 / 1024,
              operationCount,
              intervalSinceStart
            });

            const latestSnapshot = longTermSnapshots[longTermSnapshots.length - 1];
            const memoryIncrease = latestSnapshot.memoryMB - longTermSnapshots[0].memoryMB;
            
            console.log(`  ${intervalSinceStart}min: ${latestSnapshot.memoryMB.toFixed(1)}MB (+${memoryIncrease.toFixed(1)}MB), ${operationCount} ops`);

            lastSamplingTime = Date.now();
          }

          await TimeControlHelper.wait(longTermConfig.operationInterval);

        } catch (error) {
          console.warn(`Long-term operation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // 長期間安定性の分析
      const totalMemoryIncrease = longTermSnapshots[longTermSnapshots.length - 1].memoryMB - longTermSnapshots[0].memoryMB;
      const maxMemoryUsage = Math.max(...longTermSnapshots.map(s => s.memoryMB));
      const minMemoryUsage = Math.min(...longTermSnapshots.map(s => s.memoryMB));
      const memoryVariation = maxMemoryUsage - minMemoryUsage;

      // 安定状態の判定（連続するサンプル間の変動が閾値以下）
      let stableSampleCount = 0;
      for (let i = 1; i < longTermSnapshots.length; i++) {
        const variation = Math.abs(longTermSnapshots[i].memoryMB - longTermSnapshots[i - 1].memoryMB);
        if (variation <= longTermConfig.stabilityThreshold.maxSampleVariationMB) {
          stableSampleCount++;
        }
      }
      const steadyStateRatio = stableSampleCount / (longTermSnapshots.length - 1);

      console.log('\nLong-term Memory Stability Analysis:');
      console.log(`  Test duration: ${((Date.now() - startTime) / 60000).toFixed(1)} minutes`);
      console.log(`  Total operations: ${operationCount}`);
      console.log(`  Total memory increase: ${totalMemoryIncrease.toFixed(1)}MB`);
      console.log(`  Memory variation range: ${memoryVariation.toFixed(1)}MB`);
      console.log(`  Steady state ratio: ${(steadyStateRatio * 100).toFixed(1)}%`);
      console.log(`  Operations per minute: ${(operationCount / ((Date.now() - startTime) / 60000)).toFixed(0)}`);

      // 長期安定性基準の確認
      expect(totalMemoryIncrease).toBeLessThan(longTermConfig.stabilityThreshold.maxTotalIncreaseMB);
      expect(memoryVariation).toBeLessThan(longTermConfig.stabilityThreshold.maxSampleVariationMB * 2);
      expect(steadyStateRatio).toBeGreaterThan(longTermConfig.stabilityThreshold.steadyStateRatio);
      expect(operationCount).toBeGreaterThan(100); // 最低限の動作確認

      console.log('✅ Stable memory usage maintained over extended periods');
    });

    it('should handle memory pressure cycles gracefully', async () => {
      console.log('Testing memory pressure cycles handling...');

      const pressureCycles = [
        { name: 'Light Pressure', operations: 50, interval: 100 },
        { name: 'Medium Pressure', operations: 100, interval: 50 },
        { name: 'High Pressure', operations: 200, interval: 25 },
        { name: 'Recovery Period', operations: 10, interval: 1000 }
      ];

      const pressureResults: Array<{
        cycle: string;
        beforeMemoryMB: number;
        afterMemoryMB: number;
        memoryIncreaseMB: number;
        operationsCompleted: number;
        avgOperationTime: number;
      }> = [];

      for (const cycle of pressureCycles) {
        console.log(`\nExecuting ${cycle.name}...`);

        const beforeMemory = process.memoryUsage();
        const beforeTime = Date.now();
        let operationsCompleted = 0;
        const operationTimes: number[] = [];

        for (let i = 0; i < cycle.operations; i++) {
          try {
            const opStart = Date.now();
            await container.validateAllSessions();
            operationTimes.push(Date.now() - opStart);
            operationsCompleted++;

            await TimeControlHelper.wait(cycle.interval);
          } catch (error) {
            console.warn(`Pressure cycle operation failed: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        // 圧力サイクル後の小休憩
        await TimeControlHelper.wait(5000);

        const afterMemory = process.memoryUsage();
        const avgOperationTime = operationTimes.reduce((sum, time) => sum + time, 0) / operationTimes.length || 0;

        const result = {
          cycle: cycle.name,
          beforeMemoryMB: beforeMemory.heapUsed / 1024 / 1024,
          afterMemoryMB: afterMemory.heapUsed / 1024 / 1024,
          memoryIncreaseMB: (afterMemory.heapUsed - beforeMemory.heapUsed) / 1024 / 1024,
          operationsCompleted,
          avgOperationTime
        };

        pressureResults.push(result);

        console.log(`  Operations: ${result.operationsCompleted}/${cycle.operations}`);
        console.log(`  Memory: ${result.beforeMemoryMB.toFixed(1)}MB → ${result.afterMemoryMB.toFixed(1)}MB (+${result.memoryIncreaseMB.toFixed(1)}MB)`);
        console.log(`  Avg operation time: ${result.avgOperationTime.toFixed(0)}ms`);
      }

      // 圧力サイクルの分析
      console.log('\nMemory Pressure Cycles Analysis:');
      pressureResults.forEach(result => {
        console.log(`${result.cycle}: +${result.memoryIncreaseMB.toFixed(1)}MB, ${result.avgOperationTime.toFixed(0)}ms avg`);
      });

      // 回復期間での改善確認
      const recoveryResult = pressureResults[pressureResults.length - 1];
      const highPressureResult = pressureResults[pressureResults.length - 2];

      expect(recoveryResult.memoryIncreaseMB).toBeLessThan(highPressureResult.memoryIncreaseMB);
      expect(recoveryResult.avgOperationTime).toBeLessThan(highPressureResult.avgOperationTime * 0.8);

      // 全体的なメモリ増加の確認
      const totalMemoryIncrease = pressureResults.reduce((sum, r) => sum + r.memoryIncreaseMB, 0);
      expect(totalMemoryIncrease).toBeLessThan(50); // 総増加50MB未満

      console.log('✅ Memory pressure cycles handled gracefully');
    });
  });

  // ===================================================================
  // セッション特化メモリリークテスト
  // ===================================================================

  describe('Session-specific Memory Leak Testing', () => {
    it('should prevent leaks in session lifecycle operations', async () => {
      console.log('Testing session lifecycle memory leak prevention...');

      const lifecycleOperations = [
        {
          name: 'Session Creation and Destruction',
          operation: async () => {
            const tempAccount = await container.addAccount(`did:plc:lifecycle${Date.now()}`, `lifecycle${Date.now()}.bsky.social`);
            await TimeControlHelper.wait(100);
            await container.removeAccount(tempAccount.id);
          },
          cycles: 50,
          expectedLeakPerCycleMB: 0.1
        },
        {
          name: 'Token Refresh Cycles',
          operation: async () => {
            const accounts = container.state.activeAccounts;
            if (accounts.length > 0) {
              for (const account of accounts.slice(0, 3)) {
                await container.sessionManager.proactiveRefresh(account.profile.did);
              }
            }
          },
          cycles: 30,
          expectedLeakPerCycleMB: 0.05
        },
        {
          name: 'Session State Updates',
          operation: async () => {
            const accounts = container.state.activeAccounts;
            for (const account of accounts) {
              const sessionState = container.sessionManager.getSessionState(account.profile.did);
              if (sessionState) {
                // セッション状態の更新をシミュレート
                await container.sessionManager.validateAllSessions();
              }
            }
          },
          cycles: 40,
          expectedLeakPerCycleMB: 0.03
        }
      ];

      const lifecycleResults: Array<{
        operation: string;
        cycles: number;
        totalLeakMB: number;
        leakPerCycleMB: number;
        withinThreshold: boolean;
        avgCycleTime: number;
      }> = [];

      for (const lifecycleOp of lifecycleOperations) {
        console.log(`\nTesting ${lifecycleOp.name}...`);

        const beforeMemory = process.memoryUsage();
        const startTime = Date.now();
        const cycleTimes: number[] = [];

        for (let cycle = 0; cycle < lifecycleOp.cycles; cycle++) {
          const cycleStart = Date.now();

          try {
            await lifecycleOp.operation();
            cycleTimes.push(Date.now() - cycleStart);

            // サイクル間の短い休憩
            await TimeControlHelper.wait(50);

          } catch (error) {
            console.warn(`Lifecycle operation failed in cycle ${cycle}: ${error instanceof Error ? error.message : String(error)}`);
          }

          // 10サイクルごとに進捗表示
          if ((cycle + 1) % 10 === 0) {
            console.log(`    Progress: ${((cycle + 1) / lifecycleOp.cycles * 100).toFixed(0)}%`);
          }
        }

        // 強制ガベージコレクション
        if (global.gc) {
          global.gc();
          await TimeControlHelper.wait(2000);
        }

        const afterMemory = process.memoryUsage();
        const totalLeakMB = (afterMemory.heapUsed - beforeMemory.heapUsed) / 1024 / 1024;
        const leakPerCycleMB = totalLeakMB / lifecycleOp.cycles;
        const withinThreshold = leakPerCycleMB <= lifecycleOp.expectedLeakPerCycleMB;
        const avgCycleTime = cycleTimes.reduce((sum, time) => sum + time, 0) / cycleTimes.length || 0;

        const result = {
          operation: lifecycleOp.name,
          cycles: lifecycleOp.cycles,
          totalLeakMB,
          leakPerCycleMB,
          withinThreshold,
          avgCycleTime
        };

        lifecycleResults.push(result);

        console.log(`  Cycles completed: ${lifecycleOp.cycles}`);
        console.log(`  Total memory leak: ${totalLeakMB.toFixed(2)}MB`);
        console.log(`  Leak per cycle: ${(leakPerCycleMB * 1024).toFixed(1)}KB`);
        console.log(`  Within threshold: ${withinThreshold ? 'Yes' : 'No'}`);
        console.log(`  Average cycle time: ${avgCycleTime.toFixed(0)}ms`);

        expect(leakPerCycleMB).toBeLessThan(lifecycleOp.expectedLeakPerCycleMB);
      }

      // ライフサイクル操作の総合評価
      console.log('\nSession Lifecycle Memory Analysis:');
      lifecycleResults.forEach(result => {
        console.log(`${result.operation}: ${(result.leakPerCycleMB * 1024).toFixed(1)}KB/cycle, ${result.avgCycleTime.toFixed(0)}ms avg`);
      });

      const totalLifecycleLeak = lifecycleResults.reduce((sum, r) => sum + r.totalLeakMB, 0);
      const allWithinThreshold = lifecycleResults.every(r => r.withinThreshold);

      console.log(`Total lifecycle leakage: ${totalLifecycleLeak.toFixed(2)}MB`);
      console.log(`All within thresholds: ${allWithinThreshold ? 'Yes' : 'No'}`);

      expect(totalLifecycleLeak).toBeLessThan(10); // 総ライフサイクルリーク10MB未満
      expect(allWithinThreshold).toBe(true);

      console.log('✅ Session lifecycle memory leaks prevented');
    });

    it('should detect and handle circular references in session data', async () => {
      console.log('Testing circular reference detection in session data...');

      // 循環参照検出のためのテストデータ構造作成
      const circularReferenceTest = {
        iterations: 100,
        expectedMaxLeakMB: 5,
        detectionAccuracy: 0.9 // 90%以上の精度で検出
      };

      const beforeMemory = process.memoryUsage();
      let circularReferences: any[] = [];
      let detectedReferences = 0;

      console.log('Creating potential circular references...');

      for (let i = 0; i < circularReferenceTest.iterations; i++) {
        try {
          // セッション関連のオブジェクト作成
          const sessionObj: any = {
            id: `session_${i}`,
            account: null,
            manager: null,
            state: {},
            callbacks: []
          };

          const accountObj: any = {
            id: `account_${i}`,
            session: sessionObj,
            profile: { did: `did:plc:circular${i}` }
          };

          // 意図的な循環参照の作成
          sessionObj.account = accountObj;
          sessionObj.manager = {
            sessions: [sessionObj],
            getSession: () => sessionObj
          };

          // コールバック関数での循環参照
          sessionObj.callbacks.push(() => {
            return sessionObj.account;
          });

          circularReferences.push({ session: sessionObj, account: accountObj });

          // 循環参照検出の試行（簡易実装）
          try {
            JSON.stringify(sessionObj);
          } catch (error) {
            if (error instanceof Error ? error.message : String(error).includes('circular') || error instanceof Error ? error.message : String(error).includes('Converting circular structure')) {
              detectedReferences++;
            }
          }

          // 実際のセッション操作と組み合わせ
          if (i % 10 === 0) {
            await container.validateAllSessions();
          }

        } catch (error) {
          console.warn(`Circular reference test iteration ${i} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // 参照のクリーンアップ
      console.log('Cleaning up circular references...');
      for (const ref of circularReferences) {
        try {
          ref.session.account = null;
          ref.session.manager = null;
          ref.session.callbacks = [];
          ref.account.session = null;
        } catch (error) {
          // クリーンアップエラーは無視
        }
      }
      circularReferences = [];

      // 強制ガベージコレクション
      if (global.gc) {
        global.gc();
        await TimeControlHelper.wait(3000);
      }

      const afterMemory = process.memoryUsage();
      const circularTestLeakMB = (afterMemory.heapUsed - beforeMemory.heapUsed) / 1024 / 1024;
      const detectionAccuracy = detectedReferences / circularReferenceTest.iterations;

      console.log('\nCircular Reference Analysis:');
      console.log(`  Test iterations: ${circularReferenceTest.iterations}`);
      console.log(`  Circular references detected: ${detectedReferences}`);
      console.log(`  Detection accuracy: ${(detectionAccuracy * 100).toFixed(1)}%`);
      console.log(`  Memory leak from test: ${circularTestLeakMB.toFixed(2)}MB`);

      // 循環参照検出の基準確認
      expect(detectionAccuracy).toBeGreaterThan(circularReferenceTest.detectionAccuracy);
      expect(circularTestLeakMB).toBeLessThan(circularReferenceTest.expectedMaxLeakMB);

      // システムの正常動作確認
      const finalValidation = await container.validateAllSessions();
      expect(finalValidation.length).toBeGreaterThan(0);

      console.log('✅ Circular references detected and handled properly');
    });
  });
});