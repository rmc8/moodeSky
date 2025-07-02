/**
 * Mobile Constraints Test Suite
 * Issue #92 Phase 4 Wave 3: モバイル制約テスト
 * 
 * モバイル環境での制約条件下でのセッション管理システム動作を検証
 * - メモリ制限下でのセッション管理
 * - バックグラウンド実行制限への対応
 * - 画面サイズ・タッチ操作への適応
 * - モバイルネットワーク制約対応
 * - アプリライフサイクルイベント処理
 * - iOS/Android固有制約への適応
 * - ストレージ制限とキャッシュ戦略
 * - CPU/バッテリー効率最適化
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IntegrationTestContainer } from '../../../test-utils/integrationTestContainer.js';
import { TimeControlHelper, AccountTestFactory } from '../../../test-utils/sessionTestUtils.js';
import { AtProtocolMockFactory } from '../../../test-utils/mockFactories.js';

describe('Mobile Constraints Tests', () => {
  let container: IntegrationTestContainer;

  beforeEach(async () => {
    // モバイル制約テスト用の設定
    container = new IntegrationTestContainer({
      initialAccountCount: 3,
      enableJWTManager: true,
      enableBackgroundMonitor: true,
      logLevel: 'info'
    });
    await container.setup();

    // モバイル環境シミュレーションの初期化
    await this.setupMobileEnvironment();
  });

  afterEach(async () => {
    await this.teardownMobileEnvironment();
    await container.teardown();
  });

  // ===================================================================
  // メモリ制限下でのセッション管理テスト
  // ===================================================================

  describe('Memory Constrained Session Management', () => {
    it('should handle session management under memory constraints', async () => {
      console.log('Testing session management under memory constraints...');

      const memoryConstraintTests = [
        {
          name: 'Low Memory Environment',
          availableMemory: 256, // MB
          maxSessions: 3,
          expectedBehavior: {
            sessionMaintenance: true,
            cacheEviction: true,
            gracefulDegradation: true
          },
          description: 'Low memory should trigger cache eviction but maintain sessions'
        },
        {
          name: 'Very Low Memory Environment',
          availableMemory: 128, // MB
          maxSessions: 2,
          expectedBehavior: {
            sessionMaintenance: true,
            cacheEviction: true,
            gracefulDegradation: true
          },
          description: 'Very low memory should aggressively manage cache'
        },
        {
          name: 'Critical Memory Environment',
          availableMemory: 64, // MB
          maxSessions: 1,
          expectedBehavior: {
            sessionMaintenance: true,
            cacheEviction: true,
            gracefulDegradation: true
          },
          description: 'Critical memory should maintain only essential sessions'
        },
        {
          name: 'Memory Pressure Recovery',
          availableMemory: 512, // MB (Recovery)
          maxSessions: 3,
          expectedBehavior: {
            sessionMaintenance: true,
            cacheEviction: false,
            gracefulDegradation: false
          },
          description: 'Memory recovery should restore full functionality'
        }
      ];

      const memoryResults: Array<{
        testName: string;
        availableMemory: number;
        sessionsActive: number;
        cacheEfficiency: number;
        memoryUsage: number;
        performanceDegradation: number;
        details: string;
      }> = [];

      for (const test of memoryConstraintTests) {
        console.log(`\n  Testing ${test.name}...`);

        // メモリ制約をシミュレート
        await this.simulateMemoryConstraint(test.availableMemory);

        const beforeMemory = await this.measureMemoryUsage();
        
        // 複数セッションでの動作確認
        const accounts = container.state.activeAccounts.slice(0, test.maxSessions);
        let activeSessionCount = 0;
        let totalResponseTime = 0;
        let operationCount = 0;

        console.log(`    Testing with ${accounts.length} accounts under ${test.availableMemory}MB constraint...`);

        for (const account of accounts) {
          try {
            const startTime = Date.now();
            
            // セッション操作の実行
            const sessionState = container.sessionManager.getSessionState(account.profile.did);
            const accountData = await container.authService.getAccount(account.id);
            
            const responseTime = Date.now() - startTime;
            totalResponseTime += responseTime;
            operationCount++;

            if (sessionState?.isValid && accountData.success) {
              activeSessionCount++;
            }

            console.log(`      Account ${account.profile.handle}: ${sessionState?.isValid ? 'Active' : 'Inactive'} (${responseTime}ms)`);

          } catch (error) {
            console.log(`      Account ${account.profile.handle}: Error - ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        const afterMemory = await this.measureMemoryUsage();
        const memoryUsage = afterMemory.used;
        const averageResponseTime = operationCount > 0 ? totalResponseTime / operationCount : 0;
        
        // キャッシュ効率の測定
        const cacheEfficiency = await this.measureCacheEfficiency();

        // パフォーマンス劣化の計算
        const baselineResponseTime = 100; // ベースライン応答時間（ms）
        const performanceDegradation = Math.max(0, (averageResponseTime - baselineResponseTime) / baselineResponseTime);

        memoryResults.push({
          testName: test.name,
          availableMemory: test.availableMemory,
          sessionsActive: activeSessionCount,
          cacheEfficiency,
          memoryUsage,
          performanceDegradation,
          details: `Sessions: ${activeSessionCount}/${accounts.length}, Memory: ${memoryUsage.toFixed(1)}MB, Response: ${averageResponseTime.toFixed(0)}ms`
        });

        console.log(`    ${activeSessionCount >= 1 ? '✅' : '❌'} Sessions maintained: ${activeSessionCount}/${accounts.length}`);
        console.log(`    Memory usage: ${memoryUsage.toFixed(1)}MB`);
        console.log(`    Cache efficiency: ${(cacheEfficiency * 100).toFixed(1)}%`);
        console.log(`    Performance degradation: ${(performanceDegradation * 100).toFixed(1)}%`);

        // テスト間の待機
        await TimeControlHelper.wait(1000);
      }

      // メモリ制約下でのパフォーマンス評価
      console.log('\nMemory Constraint Analysis:');
      
      const sessionMaintenanceRate = memoryResults.filter(r => r.sessionsActive > 0).length / memoryResults.length;
      const averageCacheEfficiency = memoryResults.reduce((sum, r) => sum + r.cacheEfficiency, 0) / memoryResults.length;
      const maxPerformanceDegradation = Math.max(...memoryResults.map(r => r.performanceDegradation));

      console.log(`Session Maintenance Rate: ${(sessionMaintenanceRate * 100).toFixed(1)}%`);
      console.log(`Average Cache Efficiency: ${(averageCacheEfficiency * 100).toFixed(1)}%`);
      console.log(`Max Performance Degradation: ${(maxPerformanceDegradation * 100).toFixed(1)}%`);

      memoryResults.forEach(result => {
        console.log(`  ${result.sessionsActive > 0 ? '✅' : '❌'} ${result.testName}: ${result.details}`);
      });

      expect(sessionMaintenanceRate).toBeGreaterThan(0.8); // 80%以上のセッション維持
      expect(averageCacheEfficiency).toBeGreaterThan(0.6); // 60%以上のキャッシュ効率
      expect(maxPerformanceDegradation).toBeLessThan(2.0); // 最大200%の性能劣化まで許容

      console.log('✅ Memory constrained session management validated');
    });

    it('should implement intelligent cache eviction under memory pressure', async () => {
      console.log('Testing intelligent cache eviction under memory pressure...');

      const cacheEvictionTests = [
        {
          name: 'LRU Cache Eviction',
          strategy: 'lru',
          memoryPressure: 80, // %
          expectedEvictionOrder: 'least_recently_used',
          description: 'Should evict least recently used cache entries first'
        },
        {
          name: 'Priority-based Eviction',
          strategy: 'priority',
          memoryPressure: 90, // %
          expectedEvictionOrder: 'low_priority_first',
          description: 'Should evict low priority cache entries first'
        },
        {
          name: 'Size-based Eviction',
          strategy: 'size',
          memoryPressure: 95, // %
          expectedEvictionOrder: 'largest_first',
          description: 'Should evict largest cache entries first'
        },
        {
          name: 'Emergency Eviction',
          strategy: 'emergency',
          memoryPressure: 98, // %
          expectedEvictionOrder: 'all_non_essential',
          description: 'Should evict all non-essential cache entries'
        }
      ];

      const evictionResults: Array<{
        testName: string;
        strategy: string;
        memoryPressure: number;
        entriesEvicted: number;
        memoryFreed: number;
        essentialDataPreserved: boolean;
        evictionTime: number;
        details: string;
      }> = [];

      for (const test of cacheEvictionTests) {
        console.log(`\n  Testing ${test.name}...`);

        // キャッシュデータの準備
        await this.populateTestCache();
        const initialCacheSize = await this.measureCacheSize();

        // メモリプレッシャーをシミュレート
        await this.simulateMemoryPressure(test.memoryPressure);

        const evictionStartTime = Date.now();
        
        // キャッシュエビクションをトリガー
        const evictionResult = await this.triggerCacheEviction(test.strategy);
        
        const evictionTime = Date.now() - evictionStartTime;
        const finalCacheSize = await this.measureCacheSize();
        
        const entriesEvicted = initialCacheSize.entryCount - finalCacheSize.entryCount;
        const memoryFreed = initialCacheSize.sizeBytes - finalCacheSize.sizeBytes;

        // 必須データの保持確認
        const essentialDataPreserved = await this.verifyEssentialDataPreservation();

        evictionResults.push({
          testName: test.name,
          strategy: test.strategy,
          memoryPressure: test.memoryPressure,
          entriesEvicted,
          memoryFreed,
          essentialDataPreserved,
          evictionTime,
          details: `Evicted: ${entriesEvicted} entries, Freed: ${(memoryFreed / 1024 / 1024).toFixed(1)}MB, Time: ${evictionTime}ms`
        });

        console.log(`    ${entriesEvicted > 0 ? '✅' : '❌'} Entries evicted: ${entriesEvicted}`);
        console.log(`    ${memoryFreed > 0 ? '✅' : '❌'} Memory freed: ${(memoryFreed / 1024 / 1024).toFixed(1)}MB`);
        console.log(`    ${essentialDataPreserved ? '✅' : '❌'} Essential data preserved: ${essentialDataPreserved}`);
        console.log(`    Eviction time: ${evictionTime}ms`);

        // テスト間の待機
        await TimeControlHelper.wait(500);
      }

      // キャッシュエビクションの評価
      console.log('\nCache Eviction Analysis:');
      
      const successfulEvictions = evictionResults.filter(r => r.entriesEvicted > 0 && r.essentialDataPreserved).length;
      const evictionSuccessRate = successfulEvictions / evictionResults.length;
      const averageEvictionTime = evictionResults.reduce((sum, r) => sum + r.evictionTime, 0) / evictionResults.length;
      const totalMemoryFreed = evictionResults.reduce((sum, r) => sum + r.memoryFreed, 0);

      console.log(`Eviction Success Rate: ${(evictionSuccessRate * 100).toFixed(1)}%`);
      console.log(`Average Eviction Time: ${averageEvictionTime.toFixed(0)}ms`);
      console.log(`Total Memory Freed: ${(totalMemoryFreed / 1024 / 1024).toFixed(1)}MB`);

      evictionResults.forEach(result => {
        const success = result.entriesEvicted > 0 && result.essentialDataPreserved;
        console.log(`  ${success ? '✅' : '❌'} ${result.testName}: ${result.details}`);
      });

      expect(evictionSuccessRate).toBeGreaterThan(0.8); // 80%以上の成功率
      expect(averageEvictionTime).toBeLessThan(1000); // 1秒以内のエビクション時間
      expect(totalMemoryFreed).toBeGreaterThan(1024 * 1024); // 最低1MBのメモリ解放

      console.log('✅ Intelligent cache eviction under memory pressure validated');
    });
  });

  // ===================================================================
  // バックグラウンド実行制限への対応テスト
  // ===================================================================

  describe('Background Execution Restrictions', () => {
    it('should handle iOS background app refresh limitations', async () => {
      console.log('Testing iOS background app refresh limitations...');

      const iOSBackgroundTests = [
        {
          name: 'Background App Refresh Disabled',
          backgroundRefreshEnabled: false,
          appState: 'background',
          expectedBehavior: {
            sessionPersistence: true,
            periodicRefresh: false,
            immediateResponse: false
          },
          description: 'Should maintain sessions without background refresh'
        },
        {
          name: 'Background App Refresh Enabled',
          backgroundRefreshEnabled: true,
          appState: 'background',
          expectedBehavior: {
            sessionPersistence: true,
            periodicRefresh: true,
            immediateResponse: true
          },
          description: 'Should maintain sessions with background refresh'
        },
        {
          name: 'App State Transition to Background',
          backgroundRefreshEnabled: true,
          appState: 'transitioning',
          expectedBehavior: {
            sessionPersistence: true,
            periodicRefresh: false,
            immediateResponse: false
          },
          description: 'Should handle graceful transition to background'
        },
        {
          name: 'App State Return to Foreground',
          backgroundRefreshEnabled: true,
          appState: 'foreground',
          expectedBehavior: {
            sessionPersistence: true,
            periodicRefresh: true,
            immediateResponse: true
          },
          description: 'Should restore full functionality on foreground return'
        }
      ];

      const iOSResults: Array<{
        testName: string;
        appState: string;
        sessionValid: boolean;
        backgroundActivityLimited: boolean;
        dataConsistency: boolean;
        batteryImpact: number;
        details: string;
      }> = [];

      for (const test of iOSBackgroundTests) {
        console.log(`\n  Testing ${test.name}...`);

        // iOS環境とバックグラウンド制限をシミュレート
        await this.simulateiOSEnvironment({
          backgroundAppRefresh: test.backgroundRefreshEnabled,
          appState: test.appState
        });

        const account = container.state.activeAccounts[0];
        let sessionValid = false;
        let dataConsistency = false;
        let backgroundActivityLimited = false;
        let batteryImpact = 0;

        try {
          // バックグラウンド状態でのセッション確認
          const sessionState = container.sessionManager.getSessionState(account.profile.did);
          sessionValid = sessionState?.isValid || false;

          // データ整合性の確認
          const accountData = await container.authService.getAccount(account.id);
          dataConsistency = accountData.success;

          // バックグラウンド活動制限の測定
          backgroundActivityLimited = await this.measureBackgroundActivityRestriction();

          // バッテリー影響の測定
          batteryImpact = await this.measureBatteryImpact();

          console.log(`    Session valid: ${sessionValid}`);
          console.log(`    Data consistency: ${dataConsistency}`);
          console.log(`    Background activity limited: ${backgroundActivityLimited}`);

        } catch (error) {
          console.log(`    Error in background state: ${error instanceof Error ? error.message : String(error)}`);
        }

        iOSResults.push({
          testName: test.name,
          appState: test.appState,
          sessionValid,
          backgroundActivityLimited,
          dataConsistency,
          batteryImpact,
          details: `Session: ${sessionValid ? 'Valid' : 'Invalid'}, Data: ${dataConsistency ? 'Consistent' : 'Inconsistent'}, Battery: ${batteryImpact.toFixed(1)}%`
        });

        console.log(`    ${sessionValid ? '✅' : '❌'} Session maintained: ${sessionValid}`);
        console.log(`    ${dataConsistency ? '✅' : '❌'} Data consistency: ${dataConsistency}`);
        console.log(`    Battery impact: ${batteryImpact.toFixed(1)}%`);

        // テスト間の待機
        await TimeControlHelper.wait(1000);
      }

      // iOS バックグラウンド制限の評価
      console.log('\niOS Background Restrictions Analysis:');
      
      const sessionPersistenceRate = iOSResults.filter(r => r.sessionValid).length / iOSResults.length;
      const dataConsistencyRate = iOSResults.filter(r => r.dataConsistency).length / iOSResults.length;
      const averageBatteryImpact = iOSResults.reduce((sum, r) => sum + r.batteryImpact, 0) / iOSResults.length;

      console.log(`Session Persistence Rate: ${(sessionPersistenceRate * 100).toFixed(1)}%`);
      console.log(`Data Consistency Rate: ${(dataConsistencyRate * 100).toFixed(1)}%`);
      console.log(`Average Battery Impact: ${averageBatteryImpact.toFixed(1)}%`);

      iOSResults.forEach(result => {
        const success = result.sessionValid && result.dataConsistency;
        console.log(`  ${success ? '✅' : '❌'} ${result.testName}: ${result.details}`);
      });

      expect(sessionPersistenceRate).toBeGreaterThan(0.8); // 80%以上のセッション維持
      expect(dataConsistencyRate).toBeGreaterThan(0.8); // 80%以上のデータ整合性
      expect(averageBatteryImpact).toBeLessThan(5.0); // 5%未満のバッテリー影響

      console.log('✅ iOS background app refresh limitations validated');
    });

    it('should handle Android doze mode and app standby', async () => {
      console.log('Testing Android doze mode and app standby...');

      const androidPowerTests = [
        {
          name: 'Doze Mode Entry',
          powerState: 'doze',
          networkAccess: false,
          expectedBehavior: {
            sessionMaintenance: true,
            networkActivity: false,
            localDataAccess: true
          },
          description: 'Should maintain local functionality in doze mode'
        },
        {
          name: 'App Standby Mode',
          powerState: 'standby',
          networkAccess: true,
          expectedBehavior: {
            sessionMaintenance: true,
            networkActivity: false,
            localDataAccess: true
          },
          description: 'Should limit network activity in standby mode'
        },
        {
          name: 'Doze Mode Exit',
          powerState: 'active',
          networkAccess: true,
          expectedBehavior: {
            sessionMaintenance: true,
            networkActivity: true,
            localDataAccess: true
          },
          description: 'Should restore full functionality when exiting doze'
        },
        {
          name: 'Maintenance Window',
          powerState: 'maintenance',
          networkAccess: true,
          expectedBehavior: {
            sessionMaintenance: true,
            networkActivity: true,
            localDataAccess: true
          },
          description: 'Should utilize maintenance windows for sync'
        }
      ];

      const androidResults: Array<{
        testName: string;
        powerState: string;
        sessionMaintained: boolean;
        networkActivityAllowed: boolean;
        localDataAccessible: boolean;
        syncCompleted: boolean;
        details: string;
      }> = [];

      for (const test of androidPowerTests) {
        console.log(`\n  Testing ${test.name}...`);

        // Android 電源管理をシミュレート
        await this.simulateAndroidPowerManagement({
          powerState: test.powerState,
          networkAccess: test.networkAccess
        });

        const account = container.state.activeAccounts[0];
        let sessionMaintained = false;
        let networkActivityAllowed = false;
        let localDataAccessible = false;
        let syncCompleted = false;

        try {
          // セッション維持の確認
          const sessionState = container.sessionManager.getSessionState(account.profile.did);
          sessionMaintained = sessionState?.isValid || false;

          // ローカルデータアクセスの確認
          try {
            const localData = await container.authService.getAccount(account.id);
            localDataAccessible = localData.success;
          } catch (error) {
            localDataAccessible = false;
          }

          // ネットワーク活動の制限確認
          networkActivityAllowed = await this.checkNetworkActivityPermission();

          // 同期処理の完了確認
          if (networkActivityAllowed) {
            try {
              syncCompleted = await this.attemptDataSync(account.id);
            } catch (error) {
              syncCompleted = false;
            }
          }

          console.log(`    Session maintained: ${sessionMaintained}`);
          console.log(`    Network activity allowed: ${networkActivityAllowed}`);
          console.log(`    Local data accessible: ${localDataAccessible}`);
          console.log(`    Sync completed: ${syncCompleted}`);

        } catch (error) {
          console.log(`    Power management error: ${error instanceof Error ? error.message : String(error)}`);
        }

        androidResults.push({
          testName: test.name,
          powerState: test.powerState,
          sessionMaintained,
          networkActivityAllowed,
          localDataAccessible,
          syncCompleted,
          details: `Session: ${sessionMaintained}, Network: ${networkActivityAllowed}, Local: ${localDataAccessible}, Sync: ${syncCompleted}`
        });

        console.log(`    ${sessionMaintained ? '✅' : '❌'} Session maintained`);
        console.log(`    ${localDataAccessible ? '✅' : '❌'} Local data accessible`);

        // テスト間の待機
        await TimeControlHelper.wait(1000);
      }

      // Android 電源管理の評価
      console.log('\nAndroid Power Management Analysis:');
      
      const sessionMaintenanceRate = androidResults.filter(r => r.sessionMaintained).length / androidResults.length;
      const localDataAccessRate = androidResults.filter(r => r.localDataAccessible).length / androidResults.length;
      const appropriateNetworkRestriction = androidResults.filter(r => 
        (r.powerState === 'doze' && !r.networkActivityAllowed) || 
        (r.powerState === 'active' && r.networkActivityAllowed)
      ).length / androidResults.length;

      console.log(`Session Maintenance Rate: ${(sessionMaintenanceRate * 100).toFixed(1)}%`);
      console.log(`Local Data Access Rate: ${(localDataAccessRate * 100).toFixed(1)}%`);
      console.log(`Appropriate Network Restriction: ${(appropriateNetworkRestriction * 100).toFixed(1)}%`);

      androidResults.forEach(result => {
        const success = result.sessionMaintained && result.localDataAccessible;
        console.log(`  ${success ? '✅' : '❌'} ${result.testName}: ${result.details}`);
      });

      expect(sessionMaintenanceRate).toBeGreaterThan(0.9); // 90%以上のセッション維持
      expect(localDataAccessRate).toBeGreaterThan(0.9); // 90%以上のローカルデータアクセス
      expect(appropriateNetworkRestriction).toBeGreaterThan(0.8); // 80%以上の適切なネットワーク制限

      console.log('✅ Android doze mode and app standby validated');
    });
  });

  // ===================================================================
  // モバイルネットワーク制約対応テスト
  // ===================================================================

  describe('Mobile Network Constraints', () => {
    it('should optimize for cellular data limitations', async () => {
      console.log('Testing cellular data optimization...');

      const cellularDataTests = [
        {
          name: 'High-speed 5G Connection',
          networkType: '5g',
          bandwidth: 1000, // Mbps
          latency: 10, // ms
          dataLimitMB: 10000, // 10GB
          expectedOptimization: 'minimal',
          description: 'Should use full functionality on high-speed connection'
        },
        {
          name: 'Standard 4G LTE Connection',
          networkType: '4g',
          bandwidth: 50, // Mbps
          latency: 30, // ms
          dataLimitMB: 5000, // 5GB
          expectedOptimization: 'moderate',
          description: 'Should optimize for moderate data usage'
        },
        {
          name: 'Slow 3G Connection',
          networkType: '3g',
          bandwidth: 1, // Mbps
          latency: 200, // ms
          dataLimitMB: 1000, // 1GB
          expectedOptimization: 'aggressive',
          description: 'Should aggressively optimize for slow connection'
        },
        {
          name: 'Data Saver Mode',
          networkType: '4g',
          bandwidth: 50, // Mbps
          latency: 30, // ms
          dataLimitMB: 500, // 500MB
          expectedOptimization: 'maximum',
          description: 'Should minimize data usage in data saver mode'
        }
      ];

      const cellularResults: Array<{
        testName: string;
        networkType: string;
        dataUsageMB: number;
        responseTime: number;
        optimizationLevel: string;
        functionalityReduced: boolean;
        details: string;
      }> = [];

      for (const test of cellularDataTests) {
        console.log(`\n  Testing ${test.name}...`);

        // セルラーネットワーク条件をシミュレート
        await this.simulateCellularNetwork({
          type: test.networkType,
          bandwidth: test.bandwidth,
          latency: test.latency,
          dataLimit: test.dataLimitMB
        });

        const account = container.state.activeAccounts[0];
        const startTime = Date.now();
        const initialDataUsage = await this.measureDataUsage();

        let functionalityReduced = false;
        let optimizationLevel = 'none';

        try {
          // ネットワーク最適化の実行
          optimizationLevel = await this.determineOptimizationLevel(test.networkType, test.bandwidth, test.dataLimitMB);
          
          // セッション操作を実行
          const operations = [
            () => container.authService.getAccount(account.id),
            () => container.sessionManager.getSessionState(account.profile.did),
            () => container.authService.refreshSession(account.id)
          ];

          for (const operation of operations) {
            try {
              await operation();
            } catch (error) {
              // 最適化により一部機能が制限される可能性
              functionalityReduced = true;
            }
          }

          const responseTime = Date.now() - startTime;
          const finalDataUsage = await this.measureDataUsage();
          const dataUsageMB = (finalDataUsage - initialDataUsage) / 1024 / 1024;

          cellularResults.push({
            testName: test.name,
            networkType: test.networkType,
            dataUsageMB,
            responseTime,
            optimizationLevel,
            functionalityReduced,
            details: `Data: ${dataUsageMB.toFixed(2)}MB, Time: ${responseTime}ms, Optimization: ${optimizationLevel}`
          });

          console.log(`    Data usage: ${dataUsageMB.toFixed(2)}MB`);
          console.log(`    Response time: ${responseTime}ms`);
          console.log(`    Optimization level: ${optimizationLevel}`);
          console.log(`    ${!functionalityReduced ? '✅' : '⚠️'} Core functionality: ${!functionalityReduced ? 'Maintained' : 'Reduced'}`);

        } catch (error) {
          cellularResults.push({
            testName: test.name,
            networkType: test.networkType,
            dataUsageMB: 0,
            responseTime: Date.now() - startTime,
            optimizationLevel: 'error',
            functionalityReduced: true,
            details: `Error: ${error instanceof Error ? error.message : String(error).substring(0, 50)}`
          });

          console.log(`    Error: ${error instanceof Error ? error.message : String(error)}`);
        }

        // テスト間の待機
        await TimeControlHelper.wait(1000);
      }

      // セルラーデータ最適化の評価
      console.log('\nCellular Data Optimization Analysis:');
      
      const totalDataUsage = cellularResults.reduce((sum, r) => sum + r.dataUsageMB, 0);
      const averageResponseTime = cellularResults.reduce((sum, r) => sum + r.responseTime, 0) / cellularResults.length;
      const coreFeaturesMaintained = cellularResults.filter(r => !r.functionalityReduced).length / cellularResults.length;

      console.log(`Total Data Usage: ${totalDataUsage.toFixed(2)}MB`);
      console.log(`Average Response Time: ${averageResponseTime.toFixed(0)}ms`);
      console.log(`Core Features Maintained: ${(coreFeaturesMaintained * 100).toFixed(1)}%`);

      cellularResults.forEach(result => {
        const efficient = result.dataUsageMB < 10 && result.responseTime < 5000; // 10MB未満、5秒未満
        console.log(`  ${efficient ? '✅' : '⚠️'} ${result.testName}: ${result.details}`);
      });

      expect(totalDataUsage).toBeLessThan(50); // 合計50MB未満
      expect(averageResponseTime).toBeLessThan(3000); // 平均3秒未満
      expect(coreFeaturesMaintained).toBeGreaterThan(0.7); // 70%以上のコア機能維持

      console.log('✅ Cellular data optimization validated');
    });

    it('should handle network switching and roaming', async () => {
      console.log('Testing network switching and roaming scenarios...');

      const networkSwitchingTests = [
        {
          name: 'WiFi to Cellular Transition',
          fromNetwork: 'wifi',
          toNetwork: 'cellular',
          transitionType: 'seamless',
          expectedBehavior: {
            sessionContinuity: true,
            dataOptimization: true,
            reconnectionTime: 'fast'
          },
          description: 'Should seamlessly transition from WiFi to cellular'
        },
        {
          name: 'Cellular to WiFi Transition',
          fromNetwork: 'cellular',
          toNetwork: 'wifi',
          transitionType: 'seamless',
          expectedBehavior: {
            sessionContinuity: true,
            dataOptimization: false,
            reconnectionTime: 'fast'
          },
          description: 'Should restore full functionality on WiFi'
        },
        {
          name: 'Roaming Network Change',
          fromNetwork: 'home_cellular',
          toNetwork: 'roaming_cellular',
          transitionType: 'roaming',
          expectedBehavior: {
            sessionContinuity: true,
            dataOptimization: true,
            reconnectionTime: 'medium'
          },
          description: 'Should handle international roaming carefully'
        },
        {
          name: 'Network Carrier Switch',
          fromNetwork: 'carrier_a',
          toNetwork: 'carrier_b',
          transitionType: 'carrier_switch',
          expectedBehavior: {
            sessionContinuity: true,
            dataOptimization: false,
            reconnectionTime: 'medium'
          },
          description: 'Should maintain sessions across carriers'
        }
      ];

      const switchingResults: Array<{
        testName: string;
        fromNetwork: string;
        toNetwork: string;
        sessionContinuity: boolean;
        reconnectionTime: number;
        dataUsageIncrease: number;
        switchingLatency: number;
        details: string;
      }> = [];

      for (const test of networkSwitchingTests) {
        console.log(`\n  Testing ${test.name}...`);

        const account = container.state.activeAccounts[0];
        
        // 初期ネットワーク状態の設定
        await this.simulateNetworkType(test.fromNetwork);
        
        // セッション状態の確認
        const initialSessionState = container.sessionManager.getSessionState(account.profile.did);
        const initialDataUsage = await this.measureDataUsage();

        console.log(`    Switching from ${test.fromNetwork} to ${test.toNetwork}...`);

        // ネットワーク切り替えの実行
        const switchStartTime = Date.now();
        await this.simulateNetworkSwitch(test.fromNetwork, test.toNetwork, test.transitionType);
        const switchingLatency = Date.now() - switchStartTime;

        // 切り替え後の状態確認
        const reconnectionStartTime = Date.now();
        let sessionContinuity = false;
        let reconnectionTime = 0;

        try {
          // セッション継続性の確認
          const postSwitchSessionState = container.sessionManager.getSessionState(account.profile.did);
          sessionContinuity = postSwitchSessionState?.isValid && 
                             (postSwitchSessionState.accessJwt === initialSessionState?.accessJwt);

          // 再接続時間の測定
          await container.authService.getAccount(account.id);
          reconnectionTime = Date.now() - reconnectionStartTime;

          const finalDataUsage = await this.measureDataUsage();
          const dataUsageIncrease = (finalDataUsage - initialDataUsage) / 1024 / 1024;

          switchingResults.push({
            testName: test.name,
            fromNetwork: test.fromNetwork,
            toNetwork: test.toNetwork,
            sessionContinuity,
            reconnectionTime,
            dataUsageIncrease,
            switchingLatency,
            details: `Continuity: ${sessionContinuity}, Reconnect: ${reconnectionTime}ms, Data: +${dataUsageIncrease.toFixed(2)}MB`
          });

          console.log(`    ${sessionContinuity ? '✅' : '❌'} Session continuity: ${sessionContinuity}`);
          console.log(`    Reconnection time: ${reconnectionTime}ms`);
          console.log(`    Switching latency: ${switchingLatency}ms`);
          console.log(`    Data usage increase: ${dataUsageIncrease.toFixed(2)}MB`);

        } catch (error) {
          switchingResults.push({
            testName: test.name,
            fromNetwork: test.fromNetwork,
            toNetwork: test.toNetwork,
            sessionContinuity: false,
            reconnectionTime: Date.now() - reconnectionStartTime,
            dataUsageIncrease: 0,
            switchingLatency,
            details: `Failed: ${error instanceof Error ? error.message : String(error).substring(0, 50)}`
          });

          console.log(`    ❌ Network switch failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        // テスト間の待機
        await TimeControlHelper.wait(1500);
      }

      // ネットワーク切り替えの評価
      console.log('\nNetwork Switching Analysis:');
      
      const sessionContinuityRate = switchingResults.filter(r => r.sessionContinuity).length / switchingResults.length;
      const averageReconnectionTime = switchingResults.reduce((sum, r) => sum + r.reconnectionTime, 0) / switchingResults.length;
      const averageSwitchingLatency = switchingResults.reduce((sum, r) => sum + r.switchingLatency, 0) / switchingResults.length;

      console.log(`Session Continuity Rate: ${(sessionContinuityRate * 100).toFixed(1)}%`);
      console.log(`Average Reconnection Time: ${averageReconnectionTime.toFixed(0)}ms`);
      console.log(`Average Switching Latency: ${averageSwitchingLatency.toFixed(0)}ms`);

      switchingResults.forEach(result => {
        const success = result.sessionContinuity && result.reconnectionTime < 5000;
        console.log(`  ${success ? '✅' : '❌'} ${result.testName}: ${result.details}`);
      });

      expect(sessionContinuityRate).toBeGreaterThan(0.8); // 80%以上のセッション継続
      expect(averageReconnectionTime).toBeLessThan(3000); // 3秒以内の再接続
      expect(averageSwitchingLatency).toBeLessThan(2000); // 2秒以内の切り替え

      console.log('✅ Network switching and roaming validated');
    });
  });
});

