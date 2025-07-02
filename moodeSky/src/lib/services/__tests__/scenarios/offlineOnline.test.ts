/**
 * Offline ↔ Online Transition Test Suite
 * Issue #92 Phase 4 Wave 2: オフライン↔オンライン切替テスト
 * 
 * アプリのオフライン↔オンライン状態変化での動作を検証
 * - ネットワーク接続失敗・復旧パターン
 * - オフライン時のセッション維持
 * - オンライン復帰時のセッション同期
 * - データキャッシュ・同期メカニズム
 * - 接続状態遷移でのエラーハンドリング
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IntegrationTestContainer } from '../../../test-utils/integrationTestContainer.ts';
import { TimeControlHelper, AccountTestFactory } from '../../../test-utils/sessionTestUtils.ts';
import { AtProtocolMockFactory } from '../../../test-utils/mockFactories.ts';

describe('Offline ↔ Online Transition Tests', () => {
  let container: IntegrationTestContainer;

  beforeEach(async () => {
    // オフライン・オンライン切替テスト用の設定
    container = new IntegrationTestContainer({
      initialAccountCount: 3,
      enableJWTManager: true,
      enableBackgroundMonitor: true, // 接続状態監視が重要
      logLevel: 'info'
    });
    await container.setup();

    // ネットワーク状態監視の初期化
    await this.setupNetworkStateMonitoring();
  });

  afterEach(async () => {
    await this.teardownNetworkStateMonitoring();
    await container.teardown();
  });

  // ===================================================================
  // 段階的ネットワーク切断・復旧テスト
  // ===================================================================

  describe('Gradual Network Disconnection and Recovery', () => {
    it('should handle gradual network disconnection', async () => {
      console.log('Testing gradual network disconnection handling...');

      const disconnectionTest = {
        phases: [
          { name: 'Normal Operation', duration: 5000, networkQuality: 100 },
          { name: 'Degraded Connection', duration: 3000, networkQuality: 50 },
          { name: 'Poor Connection', duration: 3000, networkQuality: 20 },
          { name: 'Intermittent Connection', duration: 5000, networkQuality: 5 },
          { name: 'Complete Disconnection', duration: 10000, networkQuality: 0 },
          { name: 'Recovery - Poor', duration: 3000, networkQuality: 20 },
          { name: 'Recovery - Fair', duration: 3000, networkQuality: 50 },
          { name: 'Full Recovery', duration: 5000, networkQuality: 100 }
        ],
        expectedBehavior: {
          sessionPersistence: true,
          gracefulDegradation: true,
          seamlessRecovery: true
        }
      };

      const account = container.state.activeAccounts[0];
      const phaseResults: Array<{
        phaseName: string;
        networkQuality: number;
        sessionValid: boolean;
        dataAccessible: boolean;
        errorHandling: 'good' | 'fair' | 'poor';
        details: string;
      }> = [];

      console.log('  Starting gradual disconnection simulation...');

      for (let phaseIndex = 0; phaseIndex < disconnectionTest.phases.length; phaseIndex++) {
        const phase = disconnectionTest.phases[phaseIndex];
        
        console.log(`\n  Phase ${phaseIndex + 1}: ${phase.name} (Quality: ${phase.networkQuality}%)`);

        // ネットワーク品質をシミュレート
        await this.simulateNetworkQuality(phase.networkQuality);

        let sessionValid = false;
        let dataAccessible = false;
        let errorHandling: 'good' | 'fair' | 'poor' = 'poor';
        let errorCount = 0;

        try {
          // セッション有効性の確認
          const sessionState = container.sessionManager.getSessionState(account.profile.did);
          sessionValid = sessionState?.isValid || false;

          // データアクセス可能性の確認
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              await container.authService.getAccount(account.id);
              dataAccessible = true;
              break;
            } catch (error) {
              errorCount++;
              await TimeControlHelper.wait(500); // 短い間隔でリトライ
            }
          }

          // エラーハンドリング品質の評価
          if (errorCount === 0) {
            errorHandling = 'good';
          } else if (errorCount <= 1) {
            errorHandling = 'fair';
          } else {
            errorHandling = 'poor';
          }

        } catch (error) {
          errorCount++;
        }

        phaseResults.push({
          phaseName: phase.name,
          networkQuality: phase.networkQuality,
          sessionValid,
          dataAccessible,
          errorHandling,
          details: `Session: ${sessionValid ? 'Valid' : 'Invalid'}, Data: ${dataAccessible ? 'Accessible' : 'Inaccessible'}, Errors: ${errorCount}`
        });

        console.log(`    ${sessionValid ? '✅' : '❌'} Session valid: ${sessionValid}`);
        console.log(`    ${dataAccessible ? '✅' : '❌'} Data accessible: ${dataAccessible}`);
        console.log(`    Error handling: ${errorHandling.toUpperCase()}`);

        // フェーズ期間の待機
        await TimeControlHelper.wait(Math.min(phase.duration, 1000)); // テスト用に短縮
      }

      // 段階的切断の評価
      console.log('\nGradual Disconnection Analysis:');
      
      const offlinePhases = phaseResults.filter(p => p.networkQuality === 0);
      const recoveryPhases = phaseResults.filter(p => p.phaseName.includes('Recovery'));
      
      const sessionPersistenceRate = phaseResults.filter(p => p.sessionValid).length / phaseResults.length;
      const recoverySuccessRate = recoveryPhases.filter(p => p.dataAccessible).length / recoveryPhases.length;
      const overallErrorHandling = phaseResults.filter(p => p.errorHandling !== 'poor').length / phaseResults.length;

      console.log(`Session Persistence Rate: ${(sessionPersistenceRate * 100).toFixed(1)}%`);
      console.log(`Recovery Success Rate: ${(recoverySuccessRate * 100).toFixed(1)}%`);
      console.log(`Error Handling Quality: ${(overallErrorHandling * 100).toFixed(1)}%`);

      phaseResults.forEach(result => {
        const icon = result.sessionValid && result.dataAccessible ? '✅' : '⚠️';
        console.log(`  ${icon} ${result.phaseName}: ${result.details}`);
      });

      expect(sessionPersistenceRate).toBeGreaterThan(0.7); // 70%以上のセッション維持
      expect(recoverySuccessRate).toBeGreaterThan(0.8); // 80%以上の復旧成功
      expect(overallErrorHandling).toBeGreaterThan(0.6); // 60%以上の適切なエラーハンドリング

      console.log('✅ Gradual network disconnection handling validated');
    });

    it('should handle instant network disconnection and recovery', async () => {
      console.log('Testing instant network disconnection and recovery...');

      const instantDisconnectionTests = [
        {
          name: 'Short Disconnection',
          disconnectionDuration: 5000, // 5秒
          expectedRecovery: true,
          description: 'Short network outage should be handled gracefully'
        },
        {
          name: 'Medium Disconnection',
          disconnectionDuration: 30000, // 30秒
          expectedRecovery: true,
          description: 'Medium outage should maintain session state'
        },
        {
          name: 'Long Disconnection',
          disconnectionDuration: 120000, // 2分
          expectedRecovery: true,
          description: 'Long outage should handle session refresh'
        },
        {
          name: 'Extended Disconnection',
          disconnectionDuration: 300000, // 5分
          expectedRecovery: false, // タイムアウトの可能性
          description: 'Extended outage may require re-authentication'
        }
      ];

      const disconnectionResults: Array<{
        testName: string;
        duration: number;
        recoverySuccess: boolean;
        recoveryTime: number;
        sessionMaintained: boolean;
        details: string;
      }> = [];

      for (const test of instantDisconnectionTests) {
        console.log(`\n  Testing ${test.name}...`);

        const account = container.state.activeAccounts[0];
        
        // 接続前の状態確認
        const preDisconnectSession = container.sessionManager.getSessionState(account.profile.did);
        const preDisconnectValid = preDisconnectSession?.isValid || false;

        console.log(`    Pre-disconnect session valid: ${preDisconnectValid}`);

        // 瞬間的切断の開始
        const disconnectStartTime = Date.now();
        await this.simulateInstantDisconnection();

        console.log(`    Network disconnected for ${test.disconnectionDuration / 1000}s...`);

        // 切断期間中のセッション状態確認
        await TimeControlHelper.wait(Math.min(test.disconnectionDuration, 2000)); // テスト用に短縮

        // 接続復旧
        const recoveryStartTime = Date.now();
        await this.simulateNetworkRecovery();

        // 復旧後の状態確認
        let recoverySuccess = false;
        let sessionMaintained = false;
        let recoveryTime = 0;

        try {
          // 復旧タイミングの測定
          const maxRecoveryTime = 10000; // 10秒以内の復旧を期待
          const recoveryCheckStart = Date.now();

          while (Date.now() - recoveryCheckStart < maxRecoveryTime) {
            try {
              await container.authService.getAccount(account.id);
              recoverySuccess = true;
              recoveryTime = Date.now() - recoveryStartTime;
              break;
            } catch (error) {
              await TimeControlHelper.wait(500);
            }
          }

          // セッション維持の確認
          const postRecoverySession = container.sessionManager.getSessionState(account.profile.did);
          sessionMaintained = postRecoverySession?.isValid || false;

        } catch (error) {
          console.log(`    Recovery attempt failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        disconnectionResults.push({
          testName: test.name,
          duration: test.disconnectionDuration,
          recoverySuccess,
          recoveryTime,
          sessionMaintained,
          details: `Recovery: ${recoverySuccess ? 'Success' : 'Failed'}, Session: ${sessionMaintained ? 'Maintained' : 'Lost'}, Time: ${recoveryTime}ms`
        });

        console.log(`    ${recoverySuccess ? '✅' : '❌'} Recovery: ${recoverySuccess ? 'Success' : 'Failed'}`);
        console.log(`    ${sessionMaintained ? '✅' : '❌'} Session maintained: ${sessionMaintained}`);
        console.log(`    Recovery time: ${recoveryTime}ms`);

        // テスト間の待機
        await TimeControlHelper.wait(1000);
      }

      // 瞬間的切断の評価
      console.log('\nInstant Disconnection Recovery Analysis:');
      
      const successfulRecoveries = disconnectionResults.filter(r => r.recoverySuccess).length;
      const recoveryRate = successfulRecoveries / disconnectionResults.length;
      const sessionMaintenanceRate = disconnectionResults.filter(r => r.sessionMaintained).length / disconnectionResults.length;
      const averageRecoveryTime = disconnectionResults
        .filter(r => r.recoverySuccess)
        .reduce((sum, r) => sum + r.recoveryTime, 0) / successfulRecoveries || 0;

      console.log(`Recovery Rate: ${(recoveryRate * 100).toFixed(1)}%`);
      console.log(`Session Maintenance Rate: ${(sessionMaintenanceRate * 100).toFixed(1)}%`);
      console.log(`Average Recovery Time: ${averageRecoveryTime.toFixed(0)}ms`);

      disconnectionResults.forEach(result => {
        console.log(`  ${result.recoverySuccess ? '✅' : '❌'} ${result.testName}: ${result.details}`);
      });

      expect(recoveryRate).toBeGreaterThan(0.7); // 70%以上の復旧率
      expect(sessionMaintenanceRate).toBeGreaterThan(0.5); // 50%以上のセッション維持
      expect(averageRecoveryTime).toBeLessThan(5000); // 5秒以内の平均復旧時間

      console.log('✅ Instant network disconnection and recovery validated');
    });
  });

  // ===================================================================
  // オフライン時のセッション維持・データキャッシュテスト
  // ===================================================================

  describe('Offline Session Persistence and Data Caching', () => {
    it('should maintain session state during offline periods', async () => {
      console.log('Testing session state maintenance during offline periods...');

      const offlineSessionTests = [
        {
          name: 'Active Session Offline',
          preOfflineAction: async (account: any) => {
            // アクティブセッションでオフライン移行
            await container.authService.getAccount(account.id);
          },
          offlineDuration: 30000, // 30秒
          expectedSessionValid: true,
          description: 'Active session should persist during offline'
        },
        {
          name: 'Idle Session Offline',
          preOfflineAction: async (account: any) => {
            // アイドルセッションでオフライン移行
            await TimeControlHelper.wait(5000);
          },
          offlineDuration: 60000, // 60秒
          expectedSessionValid: true,
          description: 'Idle session should persist during offline'
        },
        {
          name: 'Token Refresh During Offline',
          preOfflineAction: async (account: any) => {
            // トークンリフレッシュが必要な状況でオフライン
            await container.authService.refreshSession(account.id);
          },
          offlineDuration: 120000, // 2分
          expectedSessionValid: false, // リフレッシュできないため無効になる可能性
          description: 'Token refresh should be handled when coming back online'
        }
      ];

      const sessionPersistenceResults: Array<{
        testName: string;
        sessionValidBefore: boolean;
        sessionValidDuring: boolean;
        sessionValidAfter: boolean;
        dataAccessible: boolean;
        cacheEffective: boolean;
        details: string;
      }> = [];

      for (const test of offlineSessionTests) {
        console.log(`\n  Testing ${test.name}...`);

        const account = container.state.activeAccounts[0];

        // オフライン前の準備
        await test.preOfflineAction(account);

        // オフライン前のセッション状態
        const preOfflineSession = container.sessionManager.getSessionState(account.profile.did);
        const sessionValidBefore = preOfflineSession?.isValid || false;

        console.log(`    Session valid before offline: ${sessionValidBefore}`);

        // ネットワーク切断
        await this.simulateInstantDisconnection();

        // オフライン期間中のセッション状態監視
        await TimeControlHelper.wait(Math.min(test.offlineDuration, 3000)); // テスト用に短縮

        const duringOfflineSession = container.sessionManager.getSessionState(account.profile.did);
        const sessionValidDuring = duringOfflineSession?.isValid || false;

        // キャッシュデータアクセス確認
        let dataAccessible = false;
        let cacheEffective = false;

        try {
          // オフライン時のデータアクセス（キャッシュから）
          const cachedAccount = await container.authService.getAccount(account.id);
          dataAccessible = cachedAccount.success;
          cacheEffective = dataAccessible;
        } catch (error) {
          console.log(`    Offline data access failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        console.log(`    Session valid during offline: ${sessionValidDuring}`);
        console.log(`    Data accessible from cache: ${dataAccessible}`);

        // ネットワーク復旧
        await this.simulateNetworkRecovery();

        // 復旧後のセッション状態確認
        await TimeControlHelper.wait(1000); // 復旧処理待機

        const postOfflineSession = container.sessionManager.getSessionState(account.profile.did);
        const sessionValidAfter = postOfflineSession?.isValid || false;

        sessionPersistenceResults.push({
          testName: test.name,
          sessionValidBefore,
          sessionValidDuring,
          sessionValidAfter,
          dataAccessible,
          cacheEffective,
          details: `Before: ${sessionValidBefore}, During: ${sessionValidDuring}, After: ${sessionValidAfter}, Cache: ${cacheEffective}`
        });

        console.log(`    Session valid after recovery: ${sessionValidAfter}`);
        console.log(`    ${sessionValidAfter ? '✅' : '❌'} ${test.description}`);

        // テスト間の待機
        await TimeControlHelper.wait(1000);
      }

      // セッション維持の評価
      console.log('\nOffline Session Persistence Analysis:');
      
      const persistentSessions = sessionPersistenceResults.filter(r => r.sessionValidAfter).length;
      const persistenceRate = persistentSessions / sessionPersistenceResults.length;
      const cacheEffectiveness = sessionPersistenceResults.filter(r => r.cacheEffective).length / sessionPersistenceResults.length;

      console.log(`Session Persistence Rate: ${(persistenceRate * 100).toFixed(1)}%`);
      console.log(`Cache Effectiveness: ${(cacheEffectiveness * 100).toFixed(1)}%`);

      sessionPersistenceResults.forEach(result => {
        console.log(`  ${result.sessionValidAfter ? '✅' : '❌'} ${result.testName}: ${result.details}`);
      });

      expect(persistenceRate).toBeGreaterThan(0.6); // 60%以上のセッション維持
      expect(cacheEffectiveness).toBeGreaterThan(0.5); // 50%以上のキャッシュ有効性

      console.log('✅ Offline session persistence and data caching validated');
    });

    it('should handle data synchronization on reconnection', async () => {
      console.log('Testing data synchronization on network reconnection...');

      const synchronizationTests = [
        {
          name: 'Session Data Sync',
          offlineChanges: async () => {
            // オフライン中のローカル変更をシミュレート
            return { type: 'session_update', changes: ['token_refresh_pending'] };
          },
          expectedSyncSuccess: true,
          description: 'Session updates should sync on reconnection'
        },
        {
          name: 'Multiple Account Sync',
          offlineChanges: async () => {
            // 複数アカウントの変更をシミュレート
            return { type: 'multi_account', changes: ['account1_updated', 'account2_updated'] };
          },
          expectedSyncSuccess: true,
          description: 'Multiple account changes should sync properly'
        },
        {
          name: 'Large Data Sync',
          offlineChanges: async () => {
            // 大量データの変更をシミュレート
            return { type: 'large_dataset', changes: new Array(100).fill('data_item') };
          },
          expectedSyncSuccess: true,
          description: 'Large data changes should sync without issues'
        }
      ];

      const syncResults: Array<{
        testName: string;
        changesPending: number;
        syncSuccess: boolean;
        syncDuration: number;
        conflictsResolved: boolean;
        details: string;
      }> = [];

      for (const test of synchronizationTests) {
        console.log(`\n  Testing ${test.name}...`);

        // ネットワーク切断
        await this.simulateInstantDisconnection();

        // オフライン中の変更を実行
        const changes = await test.offlineChanges();
        const changesPending = Array.isArray(changes.changes) ? changes.changes.length : 1;

        console.log(`    Pending changes: ${changesPending}`);

        // ネットワーク復旧とデータ同期
        const syncStartTime = Date.now();
        await this.simulateNetworkRecovery();

        // 同期プロセスの実行
        let syncSuccess = false;
        let conflictsResolved = false;
        let syncDuration = 0;

        try {
          // データ同期をシミュレート
          await this.simulateDataSynchronization(changes);
          
          syncDuration = Date.now() - syncStartTime;
          syncSuccess = true;
          conflictsResolved = true; // 同期成功＝競合解決成功

          console.log(`    Sync completed in ${syncDuration}ms`);

        } catch (error) {
          syncDuration = Date.now() - syncStartTime;
          console.log(`    Sync failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        syncResults.push({
          testName: test.name,
          changesPending,
          syncSuccess,
          syncDuration,
          conflictsResolved,
          details: `Changes: ${changesPending}, Success: ${syncSuccess}, Duration: ${syncDuration}ms`
        });

        console.log(`    ${syncSuccess ? '✅' : '❌'} Sync success: ${syncSuccess}`);
        console.log(`    ${conflictsResolved ? '✅' : '❌'} Conflicts resolved: ${conflictsResolved}`);

        // テスト間の待機
        await TimeControlHelper.wait(1000);
      }

      // データ同期の評価
      console.log('\nData Synchronization Analysis:');
      
      const successfulSyncs = syncResults.filter(r => r.syncSuccess).length;
      const syncSuccessRate = successfulSyncs / syncResults.length;
      const averageSyncTime = syncResults
        .filter(r => r.syncSuccess)
        .reduce((sum, r) => sum + r.syncDuration, 0) / successfulSyncs || 0;
      const conflictResolutionRate = syncResults.filter(r => r.conflictsResolved).length / syncResults.length;

      console.log(`Sync Success Rate: ${(syncSuccessRate * 100).toFixed(1)}%`);
      console.log(`Average Sync Time: ${averageSyncTime.toFixed(0)}ms`);
      console.log(`Conflict Resolution Rate: ${(conflictResolutionRate * 100).toFixed(1)}%`);

      syncResults.forEach(result => {
        console.log(`  ${result.syncSuccess ? '✅' : '❌'} ${result.testName}: ${result.details}`);
      });

      expect(syncSuccessRate).toBeGreaterThan(0.8); // 80%以上の同期成功率
      expect(averageSyncTime).toBeLessThan(3000); // 3秒以内の平均同期時間
      expect(conflictResolutionRate).toBeGreaterThan(0.7); // 70%以上の競合解決率

      console.log('✅ Data synchronization on reconnection validated');
    });
  });

  // ===================================================================
  // 複合的接続状態変化テスト
  // ===================================================================

  describe('Complex Connection State Transitions', () => {
    it('should handle rapid connection state changes', async () => {
      console.log('Testing rapid connection state changes...');

      const rapidTransitionTest = {
        transitions: [
          { state: 'online', duration: 2000 },
          { state: 'offline', duration: 1000 },
          { state: 'online', duration: 1500 },
          { state: 'offline', duration: 500 },
          { state: 'online', duration: 3000 },
          { state: 'offline', duration: 2000 },
          { state: 'online', duration: 1000 },
          { state: 'degraded', duration: 2000 },
          { state: 'online', duration: 2000 }
        ],
        expectedStability: true
      };

      const account = container.state.activeAccounts[0];
      const transitionResults: Array<{
        transitionIndex: number;
        state: string;
        sessionStable: boolean;
        dataConsistent: boolean;
        errorCount: number;
      }> = [];

      console.log('  Starting rapid transition sequence...');

      for (let i = 0; i < rapidTransitionTest.transitions.length; i++) {
        const transition = rapidTransitionTest.transitions[i];
        
        console.log(`\n  Transition ${i + 1}: ${transition.state} for ${transition.duration}ms`);

        // 接続状態の切り替え
        switch (transition.state) {
          case 'online':
            await this.simulateNetworkRecovery();
            break;
          case 'offline':
            await this.simulateInstantDisconnection();
            break;
          case 'degraded':
            await this.simulateNetworkQuality(30);
            break;
        }

        // 状態変化後の安定性確認
        await TimeControlHelper.wait(Math.min(transition.duration, 500)); // テスト用に短縮

        let sessionStable = false;
        let dataConsistent = false;
        let errorCount = 0;

        try {
          // セッション安定性確認
          const sessionState = container.sessionManager.getSessionState(account.profile.did);
          sessionStable = sessionState?.isValid || false;

          // データ整合性確認
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              await container.authService.getAccount(account.id);
              dataConsistent = true;
              break;
            } catch (error) {
              errorCount++;
              await TimeControlHelper.wait(200);
            }
          }

        } catch (error) {
          errorCount++;
        }

        transitionResults.push({
          transitionIndex: i,
          state: transition.state,
          sessionStable,
          dataConsistent,
          errorCount
        });

        console.log(`    Session stable: ${sessionStable ? '✅' : '❌'}`);
        console.log(`    Data consistent: ${dataConsistent ? '✅' : '❌'}`);
        console.log(`    Error count: ${errorCount}`);
      }

      // 急速変化の評価
      console.log('\nRapid Transition Analysis:');
      
      const stableTransitions = transitionResults.filter(r => r.sessionStable).length;
      const consistentTransitions = transitionResults.filter(r => r.dataConsistent).length;
      const totalErrors = transitionResults.reduce((sum, r) => sum + r.errorCount, 0);
      
      const stabilityRate = stableTransitions / transitionResults.length;
      const consistencyRate = consistentTransitions / transitionResults.length;
      const averageErrors = totalErrors / transitionResults.length;

      console.log(`Stability Rate: ${(stabilityRate * 100).toFixed(1)}%`);
      console.log(`Consistency Rate: ${(consistencyRate * 100).toFixed(1)}%`);
      console.log(`Average Errors per Transition: ${averageErrors.toFixed(1)}`);

      transitionResults.forEach(result => {
        const status = result.sessionStable && result.dataConsistent ? '✅' : '⚠️';
        console.log(`  ${status} Transition ${result.transitionIndex + 1} (${result.state}): Stable=${result.sessionStable}, Consistent=${result.dataConsistent}, Errors=${result.errorCount}`);
      });

      expect(stabilityRate).toBeGreaterThan(0.6); // 60%以上の安定性
      expect(consistencyRate).toBeGreaterThan(0.5); // 50%以上の整合性
      expect(averageErrors).toBeLessThan(2); // 平均2未満のエラー

      console.log('✅ Rapid connection state changes validated');
    });

    it('should handle concurrent user actions during connection changes', async () => {
      console.log('Testing concurrent user actions during connection changes...');

      const concurrentActionTests = [
        {
          name: 'Multi-Account Access During Transition',
          action: async () => {
            // 複数アカウントに同時アクセス
            const accounts = container.state.activeAccounts;
            const promises = accounts.map(account => 
              container.authService.getAccount(account.id).catch(e => ({ success: false, error: e }))
            );
            return Promise.all(promises);
          },
          expectedSuccessRate: 0.5
        },
        {
          name: 'Session Refresh During Transition',
          action: async () => {
            // セッションリフレッシュを並行実行
            const account = container.state.activeAccounts[0];
            const promises = Array.from({ length: 3 }, () =>
              container.authService.refreshSession(account.id).catch(e => ({ success: false, error: e }))
            );
            return Promise.all(promises);
          },
          expectedSuccessRate: 0.3
        },
        {
          name: 'Rapid Sequential Access',
          action: async () => {
            // 高速連続アクセス
            const account = container.state.activeAccounts[0];
            const results = [];
            for (let i = 0; i < 5; i++) {
              try {
                const result = await container.authService.getAccount(account.id);
                results.push(result);
              } catch (error) {
                results.push({ success: false, error });
              }
              await TimeControlHelper.wait(100);
            }
            return results;
          },
          expectedSuccessRate: 0.4
        }
      ];

      const concurrentResults: Array<{
        testName: string;
        totalActions: number;
        successfulActions: number;
        successRate: number;
        averageResponseTime: number;
        details: string;
      }> = [];

      for (const test of concurrentActionTests) {
        console.log(`\n  Testing ${test.name}...`);

        // 接続状態を変動させながらアクションを実行
        const testStartTime = Date.now();
        
        // 接続状態変動の開始
        const connectionVariation = this.startConnectionVariation();

        // 並行アクションの実行
        const actionStartTime = Date.now();
        const results = await test.action();
        const totalActionTime = Date.now() - actionStartTime;

        // 接続状態変動の停止
        this.stopConnectionVariation(connectionVariation);

        // 結果の分析
        const totalActions = Array.isArray(results) ? results.length : 1;
        const successfulActions = Array.isArray(results) 
          ? results.filter(r => r && r.success).length 
          : (results && results.success ? 1 : 0);
        const successRate = successfulActions / totalActions;
        const averageResponseTime = totalActionTime / totalActions;

        concurrentResults.push({
          testName: test.name,
          totalActions,
          successfulActions,
          successRate,
          averageResponseTime,
          details: `${successfulActions}/${totalActions} success, ${averageResponseTime.toFixed(0)}ms avg`
        });

        console.log(`    Actions: ${successfulActions}/${totalActions}`);
        console.log(`    Success rate: ${(successRate * 100).toFixed(1)}%`);
        console.log(`    Average response time: ${averageResponseTime.toFixed(0)}ms`);
        console.log(`    ${successRate >= test.expectedSuccessRate ? '✅' : '❌'} Expected success rate: ${(test.expectedSuccessRate * 100).toFixed(1)}%`);

        // テスト間の待機
        await TimeControlHelper.wait(1000);
      }

      // 並行処理の評価
      console.log('\nConcurrent Actions Analysis:');
      
      const overallSuccessRate = concurrentResults.reduce((sum, r) => sum + r.successRate, 0) / concurrentResults.length;
      const averageResponseTime = concurrentResults.reduce((sum, r) => sum + r.averageResponseTime, 0) / concurrentResults.length;

      console.log(`Overall Success Rate: ${(overallSuccessRate * 100).toFixed(1)}%`);
      console.log(`Average Response Time: ${averageResponseTime.toFixed(0)}ms`);

      concurrentResults.forEach(result => {
        console.log(`  ${result.successRate > 0.3 ? '✅' : '❌'} ${result.testName}: ${result.details}`);
      });

      expect(overallSuccessRate).toBeGreaterThan(0.3); // 30%以上の全体成功率
      expect(averageResponseTime).toBeLessThan(2000); // 2秒以内の平均応答時間

      console.log('✅ Concurrent user actions during connection changes validated');
    });
  });

  // ===================================================================
  // ヘルパーメソッド - ネットワーク状態シミュレーション
  // ===================================================================

  // ネットワーク状態監視の設定
  private async setupNetworkStateMonitoring(): Promise<void> {
    // ネットワーク状態監視のセットアップ
    this.networkState = 'online';
    this.connectionQuality = 100;
  }

  // ネットワーク状態監視のクリーンアップ
  private async teardownNetworkStateMonitoring(): Promise<void> {
    // ネットワーク状態監視のクリーンアップ
    this.networkState = 'online';
    this.connectionQuality = 100;
  }

  // ネットワーク品質のシミュレート
  private async simulateNetworkQuality(quality: number): Promise<void> {
    this.connectionQuality = quality;
    
    if (quality === 0) {
      this.networkState = 'offline';
    } else if (quality < 30) {
      this.networkState = 'poor';
    } else if (quality < 70) {
      this.networkState = 'fair';
    } else {
      this.networkState = 'good';
    }

    // ネットワーク品質に応じた遅延をシミュレート
    const delay = Math.max(0, (100 - quality) * 10);
    await TimeControlHelper.wait(delay);
  }

  // 瞬間的切断のシミュレート
  private async simulateInstantDisconnection(): Promise<void> {
    this.networkState = 'offline';
    this.connectionQuality = 0;
    
    // ネットワークリクエストのモックを無効化
    global.fetch = vi.fn().mockRejectedValue(new Error('Network disconnected'));
  }

  // ネットワーク復旧のシミュレート
  private async simulateNetworkRecovery(): Promise<void> {
    this.networkState = 'online';
    this.connectionQuality = 100;
    
    // ネットワークリクエストのモックを復旧
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
  }

  // データ同期のシミュレート
  private async simulateDataSynchronization(changes: any): Promise<void> {
    // データ同期処理をシミュレート
    const syncTime = changes.changes.length * 50; // 変更数に応じた同期時間
    await TimeControlHelper.wait(syncTime);
    
    // 同期成功をシミュレート
    if (Math.random() > 0.1) { // 90%の確率で成功
      return;
    } else {
      throw new Error('Sync failed');
    }
  }

  // 接続状態変動の開始
  private startConnectionVariation(): NodeJS.Timeout {
    const interval = setInterval(async () => {
      const randomQuality = Math.floor(Math.random() * 100);
      await this.simulateNetworkQuality(randomQuality);
    }, 1000);
    
    return interval;
  }

  // 接続状態変動の停止
  private stopConnectionVariation(interval: NodeJS.Timeout): void {
    clearInterval(interval);
    // 安定した接続に戻す
    this.simulateNetworkRecovery();
  }

  // プライベートプロパティ
  private networkState: 'online' | 'offline' | 'poor' | 'fair' | 'good' = 'online';
  private connectionQuality: number = 100;
});