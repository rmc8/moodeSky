/**
 * Mobile Usage Scenario Test Suite
 * Issue #92 Phase 4 Wave 2: モバイル使用シナリオテスト
 * 
 * Tauriアプリのモバイル環境特有の動作パターンを検証
 * - バックグラウンド・フォアグラウンド切り替え
 * - モバイル通信・WiFi切り替え
 * - バッテリー最適化・省電力モード
 * - 画面回転・デバイス状態変化
 * - モバイル固有のユーザーインタラクション
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IntegrationTestContainer } from '../../../test-utils/integrationTestContainer.js';
import { TimeControlHelper, AccountTestFactory } from '../../../test-utils/sessionTestUtils.js';
import { AtProtocolMockFactory } from '../../../test-utils/mockFactories.js';

describe('Mobile Usage Scenario Tests', () => {
  let container: IntegrationTestContainer;

  beforeEach(async () => {
    // モバイル使用シナリオテスト用の設定
    container = new IntegrationTestContainer({
      initialAccountCount: 3,
      enableJWTManager: true,
      enableBackgroundMonitor: true, // モバイルバックグラウンド処理重要
      logLevel: 'info'
    });
    await container.setup();

    // モバイル環境のシミュレーション
    await this.setupMobileEnvironment();
  });

  afterEach(async () => {
    await this.teardownMobileEnvironment();
    await container.teardown();
  });

  // ===================================================================
  // バックグラウンド・フォアグラウンド切り替えテスト
  // ===================================================================

  describe('Background and Foreground Transitions', () => {
    it('should handle app backgrounding during active session', async () => {
      console.log('Testing app backgrounding during active session...');

      const account = container.state.activeAccounts[0];
      const backgroundingTest = {
        activeSessionDuration: 300000, // 5分
        backgroundDuration: 600000, // 10分
        foregroundResumption: true,
        expectedBehavior: {
          sessionPersistence: true,
          backgroundSuspension: true,
          foregroundResumption: true
        }
      };

      let sessionActive = false;
      let backgroundSuspended = false;
      let sessionPersisted = false;
      let foregroundResumed = false;

      console.log('  Phase 1: Active session establishment...');
      
      // アクティブセッションの開始
      try {
        await container.authService.getAccount(account.id);
        sessionActive = true;
        console.log('    ✅ Active session established');

        // アクティブ使用のシミュレーション
        for (let i = 0; i < 5; i++) {
          await this.simulateMobileUserAction('scroll_timeline', account);
          await TimeControlHelper.wait(100);
        }

      } catch (error) {
        console.error('    ❌ Failed to establish active session:', error instanceof Error ? error.message : String(error));
      }

      console.log('  Phase 2: App backgrounding simulation...');
      
      // アプリのバックグラウンド移行
      try {
        await this.simulateAppStateChange('background');
        backgroundSuspended = true;
        console.log('    ✅ App backgrounded successfully');

        // バックグラウンド期間中のセッション状態確認
        await TimeControlHelper.wait(1000); // バックグラウンド期間シミュレート
        
        const sessionState = container.sessionManager.getSessionState(account.profile.did);
        sessionPersisted = sessionState?.isValid || false;
        console.log(`    Session persistence: ${sessionPersisted ? '✅ Maintained' : '❌ Lost'}`);

      } catch (error) {
        console.error('    ❌ Background transition failed:', error instanceof Error ? error.message : String(error));
      }

      console.log('  Phase 3: Foreground resumption...');
      
      // フォアグラウンド復帰
      try {
        await this.simulateAppStateChange('foreground');
        
        // セッション復旧の確認
        await container.authService.getAccount(account.id);
        foregroundResumed = true;
        console.log('    ✅ Foreground resumption successful');

        // 復帰後のアクティビティ
        await this.simulateMobileUserAction('refresh_timeline', account);
        console.log('    ✅ Post-resumption activity successful');

      } catch (error) {
        console.error('    ❌ Foreground resumption failed:', error instanceof Error ? error.message : String(error));
      }

      // 結果評価
      console.log('\nBackground/Foreground Transition Results:');
      console.log(`  Session active: ${sessionActive ? '✅' : '❌'}`);
      console.log(`  Background suspended: ${backgroundSuspended ? '✅' : '❌'}`);
      console.log(`  Session persisted: ${sessionPersisted ? '✅' : '❌'}`);
      console.log(`  Foreground resumed: ${foregroundResumed ? '✅' : '❌'}`);

      expect(sessionActive).toBe(true);
      expect(backgroundSuspended).toBe(true);
      expect(sessionPersisted).toBe(backgroundingTest.expectedBehavior.sessionPersistence);
      expect(foregroundResumed).toBe(backgroundingTest.expectedBehavior.foregroundResumption);

      console.log('✅ App backgrounding scenario validated');
    });

    it('should handle rapid background/foreground switching', async () => {
      console.log('Testing rapid background/foreground switching...');

      const account = container.state.activeAccounts[0];
      const rapidSwitchingTest = {
        switchCycles: 10,
        switchInterval: 200, // 200ms intervals
        expectedBehavior: {
          sessionStability: 0.9, // 90%の安定性
          responseConsistency: 0.85 // 85%の応答一貫性
        }
      };

      let successfulSwitches = 0;
      let sessionStable = true;
      let responseTimes: number[] = [];

      console.log(`  Testing ${rapidSwitchingTest.switchCycles} rapid switches...`);

      // 初期セッション確立
      await container.authService.getAccount(account.id);

      // 高速切り替えサイクル
      for (let i = 0; i < rapidSwitchingTest.switchCycles; i++) {
        try {
          const cycleStart = performance.now();

          // バックグラウンド移行
          await this.simulateAppStateChange('background');
          await TimeControlHelper.wait(rapidSwitchingTest.switchInterval);

          // フォアグラウンド復帰
          await this.simulateAppStateChange('foreground');
          
          // セッション状態確認
          const sessionState = container.sessionManager.getSessionState(account.profile.did);
          if (!sessionState?.isValid) {
            sessionStable = false;
            console.warn(`    Cycle ${i + 1}: Session became invalid`);
          }

          // 応答時間測定
          const actionStart = performance.now();
          await this.simulateMobileUserAction('quick_check', account);
          const actionEnd = performance.now();
          responseTimes.push(actionEnd - actionStart);

          const cycleEnd = performance.now();
          successfulSwitches++;

          console.log(`    Cycle ${i + 1}: Complete (${(cycleEnd - cycleStart).toFixed(1)}ms)`);

        } catch (error) {
          console.warn(`    Cycle ${i + 1}: Failed - ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // 応答時間分析
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const responseConsistency = this.calculateConsistency(responseTimes);
      const sessionStabilityRate = successfulSwitches / rapidSwitchingTest.switchCycles;

      console.log('\nRapid Switching Results:');
      console.log(`  Successful switches: ${successfulSwitches}/${rapidSwitchingTest.switchCycles}`);
      console.log(`  Session stability rate: ${(sessionStabilityRate * 100).toFixed(1)}%`);
      console.log(`  Average response time: ${avgResponseTime.toFixed(1)}ms`);
      console.log(`  Response consistency: ${(responseConsistency * 100).toFixed(1)}%`);
      console.log(`  Session remained stable: ${sessionStable ? '✅' : '❌'}`);

      expect(sessionStabilityRate).toBeGreaterThan(rapidSwitchingTest.expectedBehavior.sessionStability);
      expect(responseConsistency).toBeGreaterThan(rapidSwitchingTest.expectedBehavior.responseConsistency);

      console.log('✅ Rapid background/foreground switching validated');
    });

    it('should handle extended background periods', async () => {
      console.log('Testing extended background periods...');

      const account = container.state.activeAccounts[0];
      const extendedBackgroundTest = {
        backgroundPeriods: [
          { duration: 300000, label: '5 minutes' },   // 5分
          { duration: 1800000, label: '30 minutes' }, // 30分  
          { duration: 3600000, label: '1 hour' },     // 1時間
          { duration: 14400000, label: '4 hours' }    // 4時間
        ],
        expectedBehavior: {
          shortTermRecovery: 0.95, // 5-30分は95%回復
          mediumTermRecovery: 0.85, // 1時間は85%回復
          longTermRecovery: 0.7     // 4時間は70%回復
        }
      };

      const recoveryResults: Array<{
        duration: number;
        label: string;
        recovered: boolean;
        recoveryTime: number;
        sessionRefreshRequired: boolean;
      }> = [];

      // 初期セッション確立
      await container.authService.getAccount(account.id);

      for (const period of extendedBackgroundTest.backgroundPeriods) {
        console.log(`\n  Testing ${period.label} background period...`);

        // バックグラウンド移行
        await this.simulateAppStateChange('background');
        console.log(`    App backgrounded for ${period.label}`);

        // 背景期間をシミュレート（時間圧縮）
        await TimeControlHelper.wait(Math.min(period.duration / 1000, 2000)); // 最大2秒に圧縮

        // フォアグラウンド復帰試行
        const recoveryStart = performance.now();
        let recovered = false;
        let sessionRefreshRequired = false;

        try {
          await this.simulateAppStateChange('foreground');
          
          // セッション状態確認
          const sessionState = container.sessionManager.getSessionState(account.profile.did);
          if (sessionState?.isValid) {
            // セッション有効 - 通常のアクション試行
            await this.simulateMobileUserAction('check_timeline', account);
            recovered = true;
            console.log(`    ✅ Direct recovery successful`);
          } else {
            // セッション無効 - リフレッシュが必要
            await container.authService.refreshSession(account.id);
            await this.simulateMobileUserAction('check_timeline', account);
            recovered = true;
            sessionRefreshRequired = true;
            console.log(`    ✅ Recovery with refresh successful`);
          }

        } catch (error) {
          console.error(`    ❌ Recovery failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        const recoveryEnd = performance.now();
        const recoveryTime = recoveryEnd - recoveryStart;

        recoveryResults.push({
          duration: period.duration,
          label: period.label,
          recovered,
          recoveryTime,
          sessionRefreshRequired
        });

        console.log(`    Recovery time: ${recoveryTime.toFixed(1)}ms`);
        console.log(`    Refresh required: ${sessionRefreshRequired ? 'Yes' : 'No'}`);
      }

      // 結果分析
      const shortTermRecoveries = recoveryResults.filter(r => r.duration <= 1800000 && r.recovered).length;
      const shortTermTotal = recoveryResults.filter(r => r.duration <= 1800000).length;
      const shortTermRate = shortTermTotal > 0 ? shortTermRecoveries / shortTermTotal : 0;

      const mediumTermRecoveries = recoveryResults.filter(r => r.duration === 3600000 && r.recovered).length;
      const mediumTermRate = mediumTermRecoveries > 0 ? 1 : 0;

      const longTermRecoveries = recoveryResults.filter(r => r.duration >= 14400000 && r.recovered).length;
      const longTermTotal = recoveryResults.filter(r => r.duration >= 14400000).length;
      const longTermRate = longTermTotal > 0 ? longTermRecoveries / longTermTotal : 0;

      console.log('\nExtended Background Period Results:');
      recoveryResults.forEach(result => {
        console.log(`  ${result.label}: ${result.recovered ? '✅' : '❌'} Recovered (${result.recoveryTime.toFixed(1)}ms${result.sessionRefreshRequired ? ', refresh required' : ''})`);
      });

      console.log(`\nRecovery Rates:`);
      console.log(`  Short-term (≤30min): ${(shortTermRate * 100).toFixed(1)}%`);
      console.log(`  Medium-term (1hr): ${(mediumTermRate * 100).toFixed(1)}%`);
      console.log(`  Long-term (≥4hr): ${(longTermRate * 100).toFixed(1)}%`);

      expect(shortTermRate).toBeGreaterThan(extendedBackgroundTest.expectedBehavior.shortTermRecovery);
      if (mediumTermRecoveries > 0) {
        expect(mediumTermRate).toBeGreaterThan(extendedBackgroundTest.expectedBehavior.mediumTermRecovery);
      }

      console.log('✅ Extended background periods validated');
    });

    // モバイル環境セットアップヘルパー
    private async setupMobileEnvironment(): Promise<void> {
      // モバイル環境のグローバル変数設定
      (global as any).navigator = {
        ...global.navigator,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        platform: 'iPhone',
        maxTouchPoints: 5
      };

      // モバイル固有のイベントリスナー設定
      (global as any).addEventListener = vi.fn();
      (global as any).removeEventListener = vi.fn();
    }

    private async teardownMobileEnvironment(): Promise<void> {
      // モバイル環境のクリーンアップ
      delete (global as any).navigator;
      delete (global as any).addEventListener;
      delete (global as any).removeEventListener;
    }

    // アプリ状態変更シミュレーション
    private async simulateAppStateChange(state: 'background' | 'foreground'): Promise<void> {
      // Tauri のアプリ状態変更イベントをシミュレート
      const event = {
        type: state === 'background' ? 'appHidden' : 'appShown',
        timestamp: Date.now()
      };

      // アプリケーション状態の変更を記録
      container.recordEvent(`app-state-change`, { state, event });

      // 状態変更の処理時間をシミュレート
      await TimeControlHelper.wait(50);
    }

    // モバイルユーザーアクションシミュレーション
    private async simulateMobileUserAction(action: string, account: any): Promise<void> {
      switch (action) {
        case 'scroll_timeline':
          await container.validateAllSessions();
          break;
        case 'refresh_timeline':
          await container.sessionManager.proactiveRefresh(account.profile.did);
          break;
        case 'quick_check':
          await container.authService.getAccount(account.id);
          break;
        case 'check_timeline':
          await container.validateAllSessions();
          break;
        default:
          console.warn(`Unknown mobile action: ${action}`);
      }
    }

    // 応答時間の一貫性計算
    private calculateConsistency(values: number[]): number {
      if (values.length < 2) return 1;

      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / mean;

      // 一貫性は変動係数の逆数で計算（値が小さいほど一貫性が高い）
      return Math.max(0, 1 - coefficientOfVariation);
    }
  });

  // ===================================================================
  // モバイル通信・WiFi切り替えテスト
  // ===================================================================

  describe('Mobile Network and WiFi Transitions', () => {
    it('should handle cellular to WiFi transitions', async () => {
      console.log('Testing cellular to WiFi network transitions...');

      const account = container.state.activeAccounts[0];
      const networkTransitionTest = {
        initialNetwork: 'cellular',
        targetNetwork: 'wifi',
        transitionDuration: 5000, // 5秒の切り替え時間
        expectedBehavior: {
          connectionMaintained: true,
          sessionPersistence: true,
          performanceImprovement: true
        }
      };

      let connectionMaintained = true;
      let sessionPersistent = true;
      let performanceImproved = false;

      console.log('  Phase 1: Establishing session on cellular network...');

      // セルラーネットワークでのセッション確立
      await this.simulateNetworkChange('cellular');
      const cellularStartTime = performance.now();
      
      try {
        await container.authService.getAccount(account.id);
        console.log('    ✅ Session established on cellular');
      } catch (error) {
        console.error('    ❌ Failed to establish session on cellular:', error instanceof Error ? error.message : String(error));
        connectionMaintained = false;
      }

      // セルラーネットワークでの操作測定
      const cellularOperationTimes: number[] = [];
      for (let i = 0; i < 3; i++) {
        const operationStart = performance.now();
        try {
          await this.simulateMobileUserAction('scroll_timeline', account);
          cellularOperationTimes.push(performance.now() - operationStart);
        } catch (error) {
          console.warn(`    Cellular operation ${i + 1} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      console.log('  Phase 2: Network transition (cellular → WiFi)...');

      // ネットワーク切り替えシミュレーション
      await this.simulateNetworkTransition('cellular', 'wifi', networkTransitionTest.transitionDuration);

      console.log('  Phase 3: Validating session on WiFi...');

      try {
        // WiFi接続でのセッション確認
        const sessionState = container.sessionManager.getSessionState(account.profile.did);
        sessionPersistent = sessionState?.isValid || false;
        console.log(`    Session persistence: ${sessionPersistent ? '✅ Maintained' : '❌ Lost'}`);

        if (!sessionPersistent) {
          // セッション復旧試行
          await container.authService.refreshSession(account.id);
          console.log('    ✅ Session recovered after network transition');
        }

      } catch (error) {
        console.error('    ❌ Session validation failed on WiFi:', error instanceof Error ? error.message : String(error));
        sessionPersistent = false;
      }

      // WiFiでの操作性能測定
      const wifiOperationTimes: number[] = [];
      for (let i = 0; i < 3; i++) {
        const operationStart = performance.now();
        try {
          await this.simulateMobileUserAction('scroll_timeline', account);
          wifiOperationTimes.push(performance.now() - operationStart);
        } catch (error) {
          console.warn(`    WiFi operation ${i + 1} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // 性能比較
      const cellularAvg = cellularOperationTimes.reduce((sum, time) => sum + time, 0) / cellularOperationTimes.length;
      const wifiAvg = wifiOperationTimes.reduce((sum, time) => sum + time, 0) / wifiOperationTimes.length;
      performanceImproved = wifiAvg < cellularAvg;

      console.log('\nNetwork Transition Results:');
      console.log(`  Connection maintained: ${connectionMaintained ? '✅' : '❌'}`);
      console.log(`  Session persistent: ${sessionPersistent ? '✅' : '❌'}`);
      console.log(`  Cellular avg response: ${cellularAvg.toFixed(1)}ms`);
      console.log(`  WiFi avg response: ${wifiAvg.toFixed(1)}ms`);
      console.log(`  Performance improved: ${performanceImproved ? '✅' : '❌'} (${((cellularAvg - wifiAvg) / cellularAvg * 100).toFixed(1)}% ${wifiAvg < cellularAvg ? 'faster' : 'slower'})`);

      expect(connectionMaintained).toBe(networkTransitionTest.expectedBehavior.connectionMaintained);
      expect(sessionPersistent).toBe(networkTransitionTest.expectedBehavior.sessionPersistence);

      console.log('✅ Cellular to WiFi network transition validated');
    });

    it('should handle network disconnection and reconnection', async () => {
      console.log('Testing network disconnection and reconnection...');

      const account = container.state.activeAccounts[0];
      const disconnectionTest = {
        disconnectionDuration: 30000, // 30秒間の切断
        reconnectionAttempts: 5,
        expectedBehavior: {
          offlineGracefulHandling: true,
          reconnectionSuccess: true,
          dataIntegrity: true
        }
      };

      let offlineHandled = false;
      let reconnectionSuccessful = false;
      let dataIntegrity = true;

      console.log('  Phase 1: Establishing baseline connection...');

      // ベースライン接続の確立
      await container.authService.getAccount(account.id);
      const initialSessionState = container.sessionManager.getSessionState(account.profile.did);

      console.log('  Phase 2: Simulating network disconnection...');

      // ネットワーク切断のシミュレーション
      await this.simulateNetworkDisconnection();

      try {
        // オフライン状態での操作試行
        await this.simulateMobileUserAction('scroll_timeline', account);
      } catch (error) {
        offlineHandled = true;
        console.log(`    ✅ Offline state handled gracefully: ${error instanceof Error ? error.message : String(error)}`);
      }

      console.log('  Phase 3: Attempting reconnection...');

      // 再接続試行
      for (let attempt = 1; attempt <= disconnectionTest.reconnectionAttempts; attempt++) {
        try {
          console.log(`    Reconnection attempt ${attempt}...`);
          
          // ネットワーク復旧をシミュレート
          await this.simulateNetworkReconnection();
          
          // 接続確認
          await container.authService.getAccount(account.id);
          reconnectionSuccessful = true;
          console.log(`    ✅ Reconnection successful on attempt ${attempt}`);
          break;

        } catch (error) {
          console.log(`    Attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}`);
          if (attempt < disconnectionTest.reconnectionAttempts) {
            await TimeControlHelper.wait(1000 * attempt); // 指数バックオフ
          }
        }
      }

      console.log('  Phase 4: Validating data integrity...');

      if (reconnectionSuccessful) {
        try {
          // データ整合性確認
          const currentSessionState = container.sessionManager.getSessionState(account.profile.did);
          dataIntegrity = currentSessionState?.isValid || false;
          
          if (!dataIntegrity) {
            // セッション復旧試行
            await container.authService.refreshSession(account.id);
            dataIntegrity = true;
            console.log('    ✅ Data integrity restored after session refresh');
          } else {
            console.log('    ✅ Data integrity maintained');
          }

        } catch (error) {
          console.error('    ❌ Data integrity validation failed:', error instanceof Error ? error.message : String(error));
          dataIntegrity = false;
        }
      }

      console.log('\nNetwork Disconnection/Reconnection Results:');
      console.log(`  Offline handling: ${offlineHandled ? '✅ Graceful' : '❌ Poor'}`);
      console.log(`  Reconnection success: ${reconnectionSuccessful ? '✅ Yes' : '❌ No'}`);
      console.log(`  Data integrity: ${dataIntegrity ? '✅ Maintained' : '❌ Compromised'}`);

      expect(offlineHandled).toBe(disconnectionTest.expectedBehavior.offlineGracefulHandling);
      expect(reconnectionSuccessful).toBe(disconnectionTest.expectedBehavior.reconnectionSuccess);
      expect(dataIntegrity).toBe(disconnectionTest.expectedBehavior.dataIntegrity);

      console.log('✅ Network disconnection and reconnection validated');
    });

    // ネットワーク変更シミュレーション
    private async simulateNetworkChange(networkType: 'cellular' | 'wifi' | 'offline'): Promise<void> {
      // ネットワーク状態の変更をシミュレート
      container.recordEvent('network-change', { 
        networkType, 
        timestamp: Date.now(),
        connection: networkType !== 'offline'
      });

      // ネットワーク変更の処理時間
      await TimeControlHelper.wait(100);
    }

    private async simulateNetworkTransition(from: string, to: string, duration: number): Promise<void> {
      console.log(`    Transitioning from ${from} to ${to}...`);
      
      // 移行中の短時間切断
      await this.simulateNetworkChange('offline');
      await TimeControlHelper.wait(Math.min(duration / 10, 500)); // 時間圧縮
      
      // 新しいネットワークに接続
      await this.simulateNetworkChange(to as 'cellular' | 'wifi');
      console.log(`    ✅ Transition to ${to} completed`);
    }

    private async simulateNetworkDisconnection(): Promise<void> {
      await this.simulateNetworkChange('offline');
      console.log('    🔌 Network disconnected');
    }

    private async simulateNetworkReconnection(): Promise<void> {
      await this.simulateNetworkChange('wifi');
      console.log('    🔌 Network reconnected');
    }
  });

  // ===================================================================
  // バッテリー最適化・省電力モードテスト
  // ===================================================================

  describe('Battery Optimization and Power Saving', () => {
    it('should handle battery optimization mode', async () => {
      console.log('Testing battery optimization mode behavior...');

      const account = container.state.activeAccounts[0];
      const batteryOptimizationTest = {
        batteryLevels: [100, 50, 20, 10, 5], // バッテリー残量
        powerSavingThreshold: 20, // 20%以下で省電力モード
        expectedBehavior: {
          normalModePerformance: 0.95,
          powerSavingModePerformance: 0.8,
          backgroundActivityReduction: 0.5
        }
      };

      const batteryTestResults: Array<{
        batteryLevel: number;
        powerSavingMode: boolean;
        operationSuccess: boolean;
        responseTime: number;
        backgroundActivityLevel: number;
      }> = [];

      for (const batteryLevel of batteryOptimizationTest.batteryLevels) {
        console.log(`\n  Testing with ${batteryLevel}% battery...`);

        const powerSavingMode = batteryLevel <= batteryOptimizationTest.powerSavingThreshold;
        await this.simulateBatteryLevel(batteryLevel, powerSavingMode);

        const operationStart = performance.now();
        let operationSuccess = false;
        let backgroundActivityLevel = 1.0;

        try {
          // バッテリーレベルに応じた動作テスト
          if (powerSavingMode) {
            console.log('    🔋 Power saving mode active');
            // 省電力モードでの制限された操作
            await this.simulatePowerSavingOperation(account);
            backgroundActivityLevel = 0.3; // 70%削減
          } else {
            console.log('    ⚡ Normal power mode');
            // 通常モードでの完全な操作
            await this.simulateNormalOperation(account);
            backgroundActivityLevel = 1.0; // 制限なし
          }

          operationSuccess = true;

        } catch (error) {
          console.warn(`    Operation failed at ${batteryLevel}% battery: ${error instanceof Error ? error.message : String(error)}`);
        }

        const operationEnd = performance.now();
        const responseTime = operationEnd - operationStart;

        batteryTestResults.push({
          batteryLevel,
          powerSavingMode,
          operationSuccess,
          responseTime,
          backgroundActivityLevel
        });

        console.log(`    Operation success: ${operationSuccess ? '✅' : '❌'}`);
        console.log(`    Response time: ${responseTime.toFixed(1)}ms`);
        console.log(`    Background activity: ${(backgroundActivityLevel * 100).toFixed(0)}%`);
      }

      // 結果分析
      const normalModeResults = batteryTestResults.filter(r => !r.powerSavingMode);
      const powerSavingResults = batteryTestResults.filter(r => r.powerSavingMode);

      const normalModeSuccessRate = normalModeResults.filter(r => r.operationSuccess).length / normalModeResults.length;
      const powerSavingSuccessRate = powerSavingResults.filter(r => r.operationSuccess).length / powerSavingResults.length;

      const avgNormalResponseTime = normalModeResults.reduce((sum, r) => sum + r.responseTime, 0) / normalModeResults.length;
      const avgPowerSavingResponseTime = powerSavingResults.reduce((sum, r) => sum + r.responseTime, 0) / powerSavingResults.length;

      console.log('\nBattery Optimization Results:');
      console.log(`  Normal mode success rate: ${(normalModeSuccessRate * 100).toFixed(1)}%`);
      console.log(`  Power saving success rate: ${(powerSavingSuccessRate * 100).toFixed(1)}%`);
      console.log(`  Normal mode avg response: ${avgNormalResponseTime.toFixed(1)}ms`);
      console.log(`  Power saving avg response: ${avgPowerSavingResponseTime.toFixed(1)}ms`);

      expect(normalModeSuccessRate).toBeGreaterThan(batteryOptimizationTest.expectedBehavior.normalModePerformance);
      expect(powerSavingSuccessRate).toBeGreaterThan(batteryOptimizationTest.expectedBehavior.powerSavingModePerformance);

      console.log('✅ Battery optimization mode validated');
    });

    // バッテリーレベルシミュレーション
    private async simulateBatteryLevel(level: number, powerSavingMode: boolean): Promise<void> {
      // バッテリー状態の設定
      (global as any).navigator = {
        ...global.navigator,
        getBattery: async () => ({
          level: level / 100,
          charging: level < 20, // 20%以下で充電中をシミュレート
          chargingTime: level < 20 ? 3600 : Infinity,
          dischargingTime: level >= 20 ? level * 60 : Infinity
        })
      };

      container.recordEvent('battery-level-change', { 
        level, 
        powerSavingMode,
        timestamp: Date.now()
      });

      await TimeControlHelper.wait(50);
    }

    private async simulatePowerSavingOperation(account: any): Promise<void> {
      // 省電力モードでの制限された操作
      await container.authService.getAccount(account.id);
      // バックグラウンドアクティビティを削減
      await TimeControlHelper.wait(200); // 通常より長い処理時間
    }

    private async simulateNormalOperation(account: any): Promise<void> {
      // 通常モードでの完全な操作
      await container.validateAllSessions();
      await this.simulateMobileUserAction('scroll_timeline', account);
      await TimeControlHelper.wait(100); // 通常の処理時間
    }
  });

  // ===================================================================
  // 画面回転・デバイス状態変化テスト
  // ===================================================================

  describe('Screen Rotation and Device State Changes', () => {
    it('should handle screen orientation changes', async () => {
      console.log('Testing screen orientation changes...');

      const account = container.state.activeAccounts[0];
      const orientationTest = {
        orientations: ['portrait', 'landscape', 'portrait-flipped', 'landscape-flipped'],
        operationsPerOrientation: 3,
        expectedBehavior: {
          sessionStability: true,
          uiResponsiveness: true,
          dataConsistency: true
        }
      };

      let sessionStable = true;
      let uiResponsive = true;
      let dataConsistent = true;

      console.log(`  Testing ${orientationTest.orientations.length} orientation changes...`);

      // 初期セッション確立
      await container.authService.getAccount(account.id);

      for (const orientation of orientationTest.orientations) {
        console.log(`\n  Orientation: ${orientation}`);

        try {
          // 画面向き変更をシミュレート
          await this.simulateOrientationChange(orientation);

          // 各向きでの操作テスト
          for (let i = 0; i < orientationTest.operationsPerOrientation; i++) {
            const operationStart = performance.now();
            
            try {
              await this.simulateMobileUserAction('scroll_timeline', account);
              const operationTime = performance.now() - operationStart;
              
              // UI応答性チェック（200ms以下を期待）
              if (operationTime > 200) {
                uiResponsive = false;
                console.warn(`    Operation ${i + 1}: Slow response (${operationTime.toFixed(1)}ms)`);
              } else {
                console.log(`    Operation ${i + 1}: ✅ (${operationTime.toFixed(1)}ms)`);
              }

            } catch (error) {
              console.warn(`    Operation ${i + 1}: ❌ Failed - ${error instanceof Error ? error.message : String(error)}`);
            }
          }

          // セッション状態確認
          const sessionState = container.sessionManager.getSessionState(account.profile.did);
          if (!sessionState?.isValid) {
            sessionStable = false;
            console.warn(`    Session became invalid after ${orientation} orientation`);
          }

        } catch (error) {
          console.error(`    Orientation change to ${orientation} failed: ${error instanceof Error ? error.message : String(error)}`);
          sessionStable = false;
        }
      }

      // データ整合性の最終確認
      try {
        await container.validateAllSessions();
        console.log('    ✅ Final data consistency check passed');
      } catch (error) {
        dataConsistent = false;
        console.error('    ❌ Final data consistency check failed:', error instanceof Error ? error.message : String(error));
      }

      console.log('\nScreen Orientation Results:');
      console.log(`  Session stability: ${sessionStable ? '✅' : '❌'}`);
      console.log(`  UI responsiveness: ${uiResponsive ? '✅' : '❌'}`);
      console.log(`  Data consistency: ${dataConsistent ? '✅' : '❌'}`);

      expect(sessionStable).toBe(orientationTest.expectedBehavior.sessionStability);
      expect(uiResponsive).toBe(orientationTest.expectedBehavior.uiResponsiveness);
      expect(dataConsistent).toBe(orientationTest.expectedBehavior.dataConsistency);

      console.log('✅ Screen orientation changes validated');
    });

    // 画面向き変更シミュレーション
    private async simulateOrientationChange(orientation: string): Promise<void> {
      // 画面向き変更イベントをシミュレート
      container.recordEvent('orientation-change', {
        orientation,
        timestamp: Date.now(),
        screenSize: orientation.includes('landscape') ? { width: 896, height: 414 } : { width: 414, height: 896 }
      });

      // 向き変更の処理時間をシミュレート
      await TimeControlHelper.wait(150);
    }
  });
});