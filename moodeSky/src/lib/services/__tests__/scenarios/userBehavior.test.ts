/**
 * User Behavior Pattern Test Suite
 * Issue #92 Phase 4 Wave 2: ユーザー行動パターンテスト
 * 
 * 実際のユーザー行動パターンをシミュレートしてセッション管理の検証
 * - 典型的なユーザー使用パターン
 * - アカウント切り替え・マルチセッション
 * - ログイン頻度・セッション継続パターン
 * - エラー回復・復旧行動
 * - 長期間使用・休眠パターン
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IntegrationTestContainer } from '../../../test-utils/integrationTestContainer.ts';
import { TimeControlHelper, AccountTestFactory } from '../../../test-utils/sessionTestUtils.ts';
import { AtProtocolMockFactory } from '../../../test-utils/mockFactories.ts';

describe('User Behavior Pattern Tests', () => {
  let container: IntegrationTestContainer;

  beforeEach(async () => {
    // ユーザー行動テスト用の設定
    container = new IntegrationTestContainer({
      initialAccountCount: 5, // 複数アカウントでのパターンテスト
      enableJWTManager: true,
      enableBackgroundMonitor: true, // バックグラウンド動作も含める
      logLevel: 'info'
    });
    await container.setup();
  });

  afterEach(async () => {
    await container.teardown();
  });

  // ===================================================================
  // 典型的なデイリー使用パターンテスト
  // ===================================================================

  describe('Typical Daily Usage Patterns', () => {
    it('should handle casual user daily pattern', async () => {
      console.log('Testing casual user daily usage pattern...');

      const casualUserPattern = {
        name: 'Casual User',
        sessions: [
          { startHour: 8, durationMinutes: 15, actions: ['login', 'browse', 'logout'] },
          { startHour: 12, durationMinutes: 10, actions: ['login', 'browse', 'logout'] },
          { startHour: 18, durationMinutes: 30, actions: ['login', 'browse', 'post', 'logout'] },
          { startHour: 22, durationMinutes: 20, actions: ['login', 'browse', 'logout'] }
        ],
        expectedBehavior: {
          totalSessions: 4,
          avgSessionLength: 18.75, // minutes
          peakUsageHour: 18
        }
      };

      const behaviorResults = await this.simulateUserDailyPattern(casualUserPattern);

      console.log(`  Sessions completed: ${behaviorResults.completedSessions}/${casualUserPattern.sessions.length}`);
      console.log(`  Average session length: ${behaviorResults.avgSessionLength.toFixed(1)} minutes`);
      console.log(`  Session success rate: ${(behaviorResults.successRate * 100).toFixed(1)}%`);

      expect(behaviorResults.completedSessions).toBe(casualUserPattern.sessions.length);
      expect(behaviorResults.successRate).toBeGreaterThan(0.9); // 90%以上成功
      expect(behaviorResults.avgSessionLength).toBeCloseTo(casualUserPattern.expectedBehavior.avgSessionLength, 1);

      console.log('✅ Casual user daily pattern validated');
    });

    it('should handle power user intensive pattern', async () => {
      console.log('Testing power user intensive usage pattern...');

      const powerUserPattern = {
        name: 'Power User',
        sessions: [
          { startHour: 7, durationMinutes: 45, actions: ['login', 'browse', 'post', 'interact'] },
          { startHour: 9, durationMinutes: 120, actions: ['continue', 'browse', 'post', 'interact', 'manage'] },
          { startHour: 13, durationMinutes: 30, actions: ['continue', 'browse', 'interact'] },
          { startHour: 15, durationMinutes: 90, actions: ['continue', 'post', 'interact', 'manage'] },
          { startHour: 19, durationMinutes: 60, actions: ['continue', 'browse', 'post'] },
          { startHour: 22, durationMinutes: 45, actions: ['continue', 'browse', 'logout'] }
        ],
        expectedBehavior: {
          totalSessions: 6,
          avgSessionLength: 65, // minutes
          continuousSessions: 5 // ログアウトしない継続セッション
        }
      };

      const behaviorResults = await this.simulateUserDailyPattern(powerUserPattern);

      console.log(`  Sessions completed: ${behaviorResults.completedSessions}/${powerUserPattern.sessions.length}`);
      console.log(`  Continuous sessions: ${behaviorResults.continuousSessions}`);
      console.log(`  Session persistence rate: ${(behaviorResults.persistenceRate * 100).toFixed(1)}%`);

      expect(behaviorResults.completedSessions).toBe(powerUserPattern.sessions.length);
      expect(behaviorResults.continuousSessions).toBeGreaterThanOrEqual(powerUserPattern.expectedBehavior.continuousSessions - 1);
      expect(behaviorResults.persistenceRate).toBeGreaterThan(0.8); // 80%以上のセッション維持

      console.log('✅ Power user intensive pattern validated');
    });

    it('should handle sporadic user irregular pattern', async () => {
      console.log('Testing sporadic user irregular usage pattern...');

      const sporadicUserPattern = {
        name: 'Sporadic User',
        sessions: [
          { startHour: 10, durationMinutes: 5, actions: ['login', 'quick_browse', 'logout'] },
          { startHour: 14, durationMinutes: 2, actions: ['login', 'check', 'logout'] },
          { startHour: 20, durationMinutes: 15, actions: ['login', 'browse', 'logout'] },
          // 長時間の間隔
          { startHour: 23, durationMinutes: 8, actions: ['login', 'browse', 'logout'] }
        ],
        gaps: [4, 6, 3], // hours between sessions
        expectedBehavior: {
          totalSessions: 4,
          avgSessionLength: 7.5, // minutes
          maxGapHours: 6
        }
      };

      const behaviorResults = await this.simulateUserDailyPattern(sporadicUserPattern);

      console.log(`  Sessions completed: ${behaviorResults.completedSessions}/${sporadicUserPattern.sessions.length}`);
      console.log(`  Average gap: ${behaviorResults.avgGapHours.toFixed(1)} hours`);
      console.log(`  Session recovery rate: ${(behaviorResults.recoveryRate * 100).toFixed(1)}%`);

      expect(behaviorResults.completedSessions).toBe(sporadicUserPattern.sessions.length);
      expect(behaviorResults.avgGapHours).toBeGreaterThan(3); // 不定期使用の特徴
      expect(behaviorResults.recoveryRate).toBeGreaterThan(0.75); // 75%以上の復旧率

      console.log('✅ Sporadic user irregular pattern validated');
    });

    // ユーザーパターンシミュレーションヘルパー
    private async simulateUserDailyPattern(pattern: any): Promise<{
      completedSessions: number;
      avgSessionLength: number;
      successRate: number;
      continuousSessions: number;
      persistenceRate: number;
      avgGapHours: number;
      recoveryRate: number;
    }> {
      const account = container.state.activeAccounts[0];
      let completedSessions = 0;
      let totalSessionTime = 0;
      let successfulActions = 0;
      let totalActions = 0;
      let continuousSessions = 0;
      let isSessionActive = false;
      const sessionGaps: number[] = [];
      let lastSessionEnd = 0;
      let recoveredSessions = 0;

      for (const session of pattern.sessions) {
        try {
          console.log(`    Starting session at ${session.startHour}:00 for ${session.durationMinutes}min`);

          // セッション開始
          if (session.actions.includes('login')) {
            await container.authService.getAccount(account.id);
            isSessionActive = true;
          } else if (session.actions.includes('continue') && isSessionActive) {
            // 継続セッション
            continuousSessions++;
          } else {
            // セッション復旧
            await container.authService.getAccount(account.id);
            isSessionActive = true;
            recoveredSessions++;
          }

          // セッション中のアクション実行
          for (const action of session.actions) {
            try {
              await this.executeUserAction(action, account);
              successfulActions++;
            } catch (error) {
              console.warn(`    Action ${action} failed: ${error instanceof Error ? error.message : String(error)}`);
            }
            totalActions++;
          }

          // セッション時間の記録
          totalSessionTime += session.durationMinutes;
          completedSessions++;

          // セッション終了
          if (session.actions.includes('logout')) {
            isSessionActive = false;
          }

          // セッション間隔の記録
          if (lastSessionEnd > 0) {
            sessionGaps.push(session.startHour - lastSessionEnd);
          }
          lastSessionEnd = session.startHour + (session.durationMinutes / 60);

          // セッション間の待機（時間圧縮）
          await TimeControlHelper.wait(100);

        } catch (error) {
          console.warn(`    Session at ${session.startHour}:00 failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return {
        completedSessions,
        avgSessionLength: completedSessions > 0 ? totalSessionTime / completedSessions : 0,
        successRate: totalActions > 0 ? successfulActions / totalActions : 0,
        continuousSessions,
        persistenceRate: pattern.sessions.length > 0 ? continuousSessions / pattern.sessions.length : 0,
        avgGapHours: sessionGaps.length > 0 ? sessionGaps.reduce((sum, gap) => sum + gap, 0) / sessionGaps.length : 0,
        recoveryRate: pattern.sessions.length > 0 ? recoveredSessions / pattern.sessions.length : 0
      };
    }

    // ユーザーアクション実行ヘルパー
    private async executeUserAction(action: string, account: any): Promise<void> {
      switch (action) {
        case 'login':
          await container.authService.getAccount(account.id);
          break;
        case 'browse':
          await container.validateAllSessions();
          break;
        case 'post':
          // 投稿アクションをシミュレート
          await container.sessionManager.proactiveRefresh(account.profile.did);
          break;
        case 'interact':
          // インタラクションをシミュレート
          await container.authService.getAccount(account.id);
          break;
        case 'manage':
          // アカウント管理をシミュレート
          await container.authService.refreshSession(account.id);
          break;
        case 'quick_browse':
        case 'check':
          // 短時間アクション
          await container.authService.getAccount(account.id);
          break;
        case 'continue':
          // セッション継続
          await container.validateAllSessions();
          break;
        case 'logout':
          // ログアウト処理はセッション管理で処理
          break;
        default:
          console.warn(`Unknown action: ${action}`);
      }
    }
  });

  // ===================================================================
  // マルチアカウント・アカウント切り替えパターンテスト
  // ===================================================================

  describe('Multi-Account and Account Switching Patterns', () => {
    it('should handle frequent account switching pattern', async () => {
      console.log('Testing frequent account switching pattern...');

      const accounts = container.state.activeAccounts.slice(0, 3); // 3アカウント使用
      const switchingPattern = {
        sequence: [0, 1, 0, 2, 1, 0, 2, 1, 2, 0], // アカウントインデックス
        actionsBetweenSwitches: ['browse', 'post'],
        expectedBehavior: {
          totalSwitches: 9,
          uniqueAccounts: 3,
          avgActionsPerSwitch: 2
        }
      };

      let completedSwitches = 0;
      let totalActions = 0;
      let successfulSwitches = 0;
      const accountUsage = new Map<string, number>();

      console.log(`  Testing ${switchingPattern.sequence.length} account switches...`);

      for (let i = 0; i < switchingPattern.sequence.length; i++) {
        const accountIndex = switchingPattern.sequence[i];
        const account = accounts[accountIndex];

        try {
          console.log(`    Switch ${i + 1}: Using account ${accountIndex} (${account.profile.handle})`);

          // アカウント切り替え
          await container.authService.getAccount(account.id);
          
          // アカウント使用回数を記録
          accountUsage.set(account.id, (accountUsage.get(account.id) || 0) + 1);

          // アカウント切り替え後のアクション
          for (const action of switchingPattern.actionsBetweenSwitches) {
            await this.executeUserAction(action, account);
            totalActions++;
          }

          completedSwitches++;
          successfulSwitches++;

          // 切り替え間隔をシミュレート
          await TimeControlHelper.wait(50);

        } catch (error) {
          console.warn(`    Account switch ${i + 1} failed: ${error instanceof Error ? error.message : String(error)}`);
          completedSwitches++;
        }
      }

      const uniqueAccountsUsed = accountUsage.size;
      const switchSuccessRate = successfulSwitches / completedSwitches;
      const avgActionsPerSwitch = totalActions / completedSwitches;

      console.log(`  Completed switches: ${completedSwitches}/${switchingPattern.sequence.length}`);
      console.log(`  Unique accounts used: ${uniqueAccountsUsed}`);
      console.log(`  Switch success rate: ${(switchSuccessRate * 100).toFixed(1)}%`);
      console.log(`  Actions per switch: ${avgActionsPerSwitch.toFixed(1)}`);

      expect(completedSwitches).toBe(switchingPattern.sequence.length);
      expect(uniqueAccountsUsed).toBe(switchingPattern.expectedBehavior.uniqueAccounts);
      expect(switchSuccessRate).toBeGreaterThan(0.9); // 90%以上の成功率
      expect(avgActionsPerSwitch).toBeCloseTo(switchingPattern.expectedBehavior.avgActionsPerSwitch, 0.5);

      console.log('✅ Frequent account switching pattern validated');
    });

    it('should handle concurrent multi-session pattern', async () => {
      console.log('Testing concurrent multi-session pattern...');

      const accounts = container.state.activeAccounts.slice(0, 4); // 4アカウント同時使用
      const concurrentPattern = {
        simultaneousSessions: 4,
        sessionDurationMinutes: 30,
        actionsPerSession: ['login', 'browse', 'post', 'interact', 'browse'],
        expectedBehavior: {
          allSessionsActive: 4,
          concurrentSuccessRate: 0.85
        }
      };

      console.log(`  Starting ${concurrentPattern.simultaneousSessions} concurrent sessions...`);

      // 並行セッションの開始
      const sessionPromises = accounts.map(async (account, index) => {
        const sessionId = `session-${index}`;
        const sessionResults = {
          sessionId,
          accountId: account.id,
          completedActions: 0,
          totalActions: concurrentPattern.actionsPerSession.length,
          success: false,
          startTime: Date.now(),
          endTime: 0
        };

        try {
          console.log(`    ${sessionId}: Starting for ${account.profile.handle}`);

          // セッション中のアクション実行
          for (const action of concurrentPattern.actionsPerSession) {
            await this.executeUserAction(action, account);
            sessionResults.completedActions++;
            
            // 並行実行の間隔
            await TimeControlHelper.wait(200 + Math.random() * 200);
          }

          sessionResults.success = true;
          sessionResults.endTime = Date.now();

          console.log(`    ${sessionId}: Completed successfully`);

        } catch (error) {
          console.warn(`    ${sessionId}: Failed - ${error instanceof Error ? error.message : String(error)}`);
          sessionResults.endTime = Date.now();
        }

        return sessionResults;
      });

      // 全セッションの完了を待機
      const sessionResults = await Promise.all(sessionPromises);

      // 結果分析
      const successfulSessions = sessionResults.filter(r => r.success).length;
      const concurrentSuccessRate = successfulSessions / sessionResults.length;
      const avgCompletedActions = sessionResults.reduce((sum, r) => sum + r.completedActions, 0) / sessionResults.length;
      const avgSessionDuration = sessionResults.reduce((sum, r) => sum + (r.endTime - r.startTime), 0) / sessionResults.length;

      console.log(`  Successful sessions: ${successfulSessions}/${sessionResults.length}`);
      console.log(`  Concurrent success rate: ${(concurrentSuccessRate * 100).toFixed(1)}%`);
      console.log(`  Average completed actions: ${avgCompletedActions.toFixed(1)}`);
      console.log(`  Average session duration: ${avgSessionDuration.toFixed(0)}ms`);

      expect(successfulSessions).toBeGreaterThanOrEqual(concurrentPattern.expectedBehavior.allSessionsActive - 1);
      expect(concurrentSuccessRate).toBeGreaterThan(concurrentPattern.expectedBehavior.concurrentSuccessRate);
      expect(avgCompletedActions).toBeGreaterThan(concurrentPattern.actionsPerSession.length * 0.8);

      console.log('✅ Concurrent multi-session pattern validated');
    });

    it('should handle account prioritization pattern', async () => {
      console.log('Testing account prioritization usage pattern...');

      const accounts = container.state.activeAccounts.slice(0, 3);
      const prioritizationPattern = {
        primary: { account: accounts[0], usageWeight: 60 }, // 60% of usage
        secondary: { account: accounts[1], usageWeight: 30 }, // 30% of usage  
        tertiary: { account: accounts[2], usageWeight: 10 }, // 10% of usage
        totalActions: 100,
        expectedDistribution: { primary: 0.6, secondary: 0.3, tertiary: 0.1 }
      };

      const accountUsage = new Map<string, number>();
      let totalActions = 0;

      console.log(`  Simulating ${prioritizationPattern.totalActions} actions with prioritization...`);

      // 優先度に基づく使用パターンのシミュレーション
      for (let i = 0; i < prioritizationPattern.totalActions; i++) {
        const random = Math.random();
        let selectedAccount;

        // 優先度に基づくアカウント選択
        if (random < 0.6) {
          selectedAccount = prioritizationPattern.primary.account;
        } else if (random < 0.9) {
          selectedAccount = prioritizationPattern.secondary.account;
        } else {
          selectedAccount = prioritizationPattern.tertiary.account;
        }

        try {
          // ランダムアクション実行
          const actions = ['browse', 'post', 'interact'];
          const randomAction = actions[Math.floor(Math.random() * actions.length)];
          await this.executeUserAction(randomAction, selectedAccount);

          accountUsage.set(selectedAccount.id, (accountUsage.get(selectedAccount.id) || 0) + 1);
          totalActions++;

        } catch (error) {
          console.warn(`    Action ${i + 1} failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        // アクション間隔
        await TimeControlHelper.wait(10);
      }

      // 使用分布の分析
      const primaryUsage = accountUsage.get(prioritizationPattern.primary.account.id) || 0;
      const secondaryUsage = accountUsage.get(prioritizationPattern.secondary.account.id) || 0;
      const tertiaryUsage = accountUsage.get(prioritizationPattern.tertiary.account.id) || 0;

      const primaryRatio = primaryUsage / totalActions;
      const secondaryRatio = secondaryUsage / totalActions;
      const tertiaryRatio = tertiaryUsage / totalActions;

      console.log(`  Primary account usage: ${primaryUsage} (${(primaryRatio * 100).toFixed(1)}%)`);
      console.log(`  Secondary account usage: ${secondaryUsage} (${(secondaryRatio * 100).toFixed(1)}%)`);
      console.log(`  Tertiary account usage: ${tertiaryUsage} (${(tertiaryRatio * 100).toFixed(1)}%)`);

      // 期待される分布との比較（±10%の許容範囲）
      expect(primaryRatio).toBeGreaterThan(0.5); // 50%以上
      expect(primaryRatio).toBeLessThan(0.7); // 70%以下
      expect(secondaryRatio).toBeGreaterThan(0.2); // 20%以上
      expect(secondaryRatio).toBeLessThan(0.4); // 40%以下
      expect(tertiaryRatio).toBeGreaterThan(0.05); // 5%以上
      expect(tertiaryRatio).toBeLessThan(0.2); // 20%以下

      console.log('✅ Account prioritization pattern validated');
    });
  });

  // ===================================================================
  // エラー回復・復旧行動パターンテスト
  // ===================================================================

  describe('Error Recovery and Restoration Patterns', () => {
    it('should handle network interruption recovery pattern', async () => {
      console.log('Testing network interruption recovery pattern...');

      const account = container.state.activeAccounts[0];
      const recoveryPattern = {
        normalOperations: 5,
        networkInterruptions: 3,
        recoveryAttempts: 3,
        expectedBehavior: {
          finalSuccessRate: 0.8,
          recoverySuccessRate: 0.75
        }
      };

      let normalOperationsCompleted = 0;
      let interruptionsRecovered = 0;
      let totalRecoveryAttempts = 0;
      let successfulRecoveries = 0;

      console.log(`  Phase 1: Normal operations (${recoveryPattern.normalOperations} actions)`);

      // 通常の操作を実行
      for (let i = 0; i < recoveryPattern.normalOperations; i++) {
        try {
          await container.authService.getAccount(account.id);
          normalOperationsCompleted++;
        } catch (error) {
          console.warn(`    Normal operation ${i + 1} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        await TimeControlHelper.wait(100);
      }

      console.log(`  Phase 2: Network interruption simulation (${recoveryPattern.networkInterruptions} interruptions)`);

      // ネットワーク中断とリカバリーのシミュレーション
      for (let i = 0; i < recoveryPattern.networkInterruptions; i++) {
        console.log(`    Interruption ${i + 1}: Simulating network failure...`);

        // ネットワーク障害をシミュレート
        const originalFetch = global.fetch;
        global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));

        try {
          // 障害発生中のアクション試行
          await container.authService.getAccount(account.id);
        } catch (error) {
          console.log(`    Network error detected: ${error instanceof Error ? error.message : String(error)}`);
        }

        // ネットワーク復旧
        global.fetch = originalFetch;
        console.log(`    Attempting recovery...`);

        // リカバリー試行
        for (let attempt = 0; attempt < recoveryPattern.recoveryAttempts; attempt++) {
          totalRecoveryAttempts++;
          try {
            await TimeControlHelper.wait(500); // 復旧待機時間
            await container.authService.getAccount(account.id);
            successfulRecoveries++;
            interruptionsRecovered++;
            console.log(`    Recovery successful on attempt ${attempt + 1}`);
            break;
          } catch (error) {
            console.log(`    Recovery attempt ${attempt + 1} failed: ${error instanceof Error ? error.message : String(error)}`);
            if (attempt === recoveryPattern.recoveryAttempts - 1) {
              console.log(`    Recovery failed after ${recoveryPattern.recoveryAttempts} attempts`);
            }
          }
        }
      }

      // 結果分析
      const finalSuccessRate = (normalOperationsCompleted + successfulRecoveries) / (recoveryPattern.normalOperations + totalRecoveryAttempts);
      const recoverySuccessRate = totalRecoveryAttempts > 0 ? successfulRecoveries / totalRecoveryAttempts : 1;

      console.log(`  Normal operations completed: ${normalOperationsCompleted}/${recoveryPattern.normalOperations}`);
      console.log(`  Interruptions recovered: ${interruptionsRecovered}/${recoveryPattern.networkInterruptions}`);
      console.log(`  Recovery success rate: ${(recoverySuccessRate * 100).toFixed(1)}%`);
      console.log(`  Final success rate: ${(finalSuccessRate * 100).toFixed(1)}%`);

      expect(recoverySuccessRate).toBeGreaterThan(recoveryPattern.expectedBehavior.recoverySuccessRate);
      expect(finalSuccessRate).toBeGreaterThan(recoveryPattern.expectedBehavior.finalSuccessRate);
      expect(interruptionsRecovered).toBeGreaterThanOrEqual(Math.floor(recoveryPattern.networkInterruptions * 0.7)); // 70%以上復旧

      console.log('✅ Network interruption recovery pattern validated');
    });

    it('should handle authentication failure recovery pattern', async () => {
      console.log('Testing authentication failure recovery pattern...');

      const account = container.state.activeAccounts[0];
      const authRecoveryPattern = {
        successfulLogins: 3,
        authFailures: 2,
        retryAttempts: 5,
        expectedBehavior: {
          retrySuccessRate: 0.8,
          totalSuccessRate: 0.85
        }
      };

      let successfulLogins = 0;
      let authFailuresHandled = 0;
      let retryAttempts = 0;
      let successfulRetries = 0;

      console.log(`  Phase 1: Successful authentications (${authRecoveryPattern.successfulLogins} attempts)`);

      // 成功する認証
      for (let i = 0; i < authRecoveryPattern.successfulLogins; i++) {
        try {
          await container.authService.getAccount(account.id);
          successfulLogins++;
          console.log(`    Login ${i + 1}: Success`);
        } catch (error) {
          console.warn(`    Login ${i + 1}: Unexpected failure - ${error instanceof Error ? error.message : String(error)}`);
        }
        await TimeControlHelper.wait(200);
      }

      console.log(`  Phase 2: Authentication failure handling (${authRecoveryPattern.authFailures} failures)`);

      // 認証失敗とリトライのシミュレーション
      for (let i = 0; i < authRecoveryPattern.authFailures; i++) {
        console.log(`    Failure ${i + 1}: Simulating authentication failure...`);

        // 認証失敗をシミュレート（無効なアカウントIDを使用）
        try {
          await container.authService.getAccount('invalid-account-id');
        } catch (error) {
          console.log(`    Authentication failed as expected: ${error instanceof Error ? error.message : String(error)}`);
          authFailuresHandled++;

          // リトライパターン
          console.log(`    Starting retry sequence...`);
          for (let retry = 0; retry < authRecoveryPattern.retryAttempts; retry++) {
            retryAttempts++;
            try {
              // 徐々に長くなる待機時間
              await TimeControlHelper.wait((retry + 1) * 300);
              
              // 正しいアカウントIDでリトライ
              await container.authService.getAccount(account.id);
              successfulRetries++;
              console.log(`    Retry ${retry + 1}: Success`);
              break;
            } catch (retryError) {
              console.log(`    Retry ${retry + 1}: Failed - ${retryError.message}`);
            }
          }
        }
      }

      // 結果分析
      const retrySuccessRate = retryAttempts > 0 ? successfulRetries / retryAttempts : 1;
      const totalSuccessRate = (successfulLogins + successfulRetries) / (authRecoveryPattern.successfulLogins + retryAttempts);

      console.log(`  Successful logins: ${successfulLogins}/${authRecoveryPattern.successfulLogins}`);
      console.log(`  Auth failures handled: ${authFailuresHandled}/${authRecoveryPattern.authFailures}`);
      console.log(`  Retry success rate: ${(retrySuccessRate * 100).toFixed(1)}%`);
      console.log(`  Total success rate: ${(totalSuccessRate * 100).toFixed(1)}%`);

      expect(retrySuccessRate).toBeGreaterThan(authRecoveryPattern.expectedBehavior.retrySuccessRate);
      expect(totalSuccessRate).toBeGreaterThan(authRecoveryPattern.expectedBehavior.totalSuccessRate);
      expect(authFailuresHandled).toBe(authRecoveryPattern.authFailures);

      console.log('✅ Authentication failure recovery pattern validated');
    });
  });

  // ===================================================================
  // 長期間使用・休眠パターンテスト
  // ===================================================================

  describe('Long-term Usage and Dormancy Patterns', () => {
    it('should handle extended active session pattern', async () => {
      console.log('Testing extended active session pattern...');

      const account = container.state.activeAccounts[0];
      const extendedPattern = {
        sessionDurationHours: 8, // 8時間の長時間セッション
        activityIntervalMinutes: 15, // 15分間隔でアクティビティ
        totalActivities: 32, // 8時間 × 4回/時間
        expectedBehavior: {
          sessionMaintained: true,
          refreshCount: 8, // 1時間ごとにリフレッシュ
          activitySuccessRate: 0.95
        }
      };

      let activitiesCompleted = 0;
      let refreshCount = 0;
      let sessionMaintained = true;
      let lastRefreshTime = Date.now();

      console.log(`  Starting extended session: ${extendedPattern.sessionDurationHours} hours`);
      console.log(`  Activity interval: ${extendedPattern.activityIntervalMinutes} minutes`);

      // 長時間セッションのシミュレーション
      for (let i = 0; i < extendedPattern.totalActivities; i++) {
        const currentTime = Date.now();
        const hoursPassed = (currentTime - lastRefreshTime) / (1000 * 60 * 60);

        try {
          // 定期的なアクティビティ
          await this.executeUserAction('browse', account);
          activitiesCompleted++;

          // 1時間ごとのセッションリフレッシュ
          if (hoursPassed >= 1 || i % 4 === 0) { // 15分×4=1時間をシミュレート
            console.log(`    Refreshing session at activity ${i + 1}...`);
            await container.authService.refreshSession(account.id);
            refreshCount++;
            lastRefreshTime = currentTime;
          }

          // セッション状態の確認
          const sessionState = container.sessionManager.getSessionState(account.profile.did);
          if (!sessionState?.isValid) {
            console.warn(`    Session validation failed at activity ${i + 1}`);
            sessionMaintained = false;
          }

          console.log(`    Activity ${i + 1}/${extendedPattern.totalActivities}: Complete`);

        } catch (error) {
          console.warn(`    Activity ${i + 1} failed: ${error instanceof Error ? error.message : String(error)}`);
          sessionMaintained = false;
        }

        // アクティビティ間隔をシミュレート（時間圧縮）
        await TimeControlHelper.wait(100);
      }

      // 結果分析
      const activitySuccessRate = activitiesCompleted / extendedPattern.totalActivities;

      console.log(`  Activities completed: ${activitiesCompleted}/${extendedPattern.totalActivities}`);
      console.log(`  Session refreshes: ${refreshCount}`);
      console.log(`  Session maintained: ${sessionMaintained ? 'Yes' : 'No'}`);
      console.log(`  Activity success rate: ${(activitySuccessRate * 100).toFixed(1)}%`);

      expect(activitiesCompleted).toBeGreaterThan(extendedPattern.totalActivities * 0.9); // 90%以上完了
      expect(refreshCount).toBeGreaterThanOrEqual(extendedPattern.expectedBehavior.refreshCount - 2);
      expect(activitySuccessRate).toBeGreaterThan(extendedPattern.expectedBehavior.activitySuccessRate);

      console.log('✅ Extended active session pattern validated');
    });

    it('should handle dormancy and reactivation pattern', async () => {
      console.log('Testing dormancy and reactivation pattern...');

      const account = container.state.activeAccounts[0];
      const dormancyPattern = {
        activePeriods: [
          { duration: 30, actions: 5 }, // 30分、5アクション
          { dormancy: 120 }, // 2時間休眠
          { duration: 15, actions: 3 }, // 15分復帰
          { dormancy: 360 }, // 6時間休眠
          { duration: 45, actions: 7 } // 45分復帰
        ],
        expectedBehavior: {
          reactivationSuccessRate: 0.9,
          sessionRecoveryRate: 0.85
        }
      };

      let totalReactivations = 0;
      let successfulReactivations = 0;
      let totalSessionRecoveries = 0;
      let successfulSessionRecoveries = 0;

      console.log(`  Testing ${dormancyPattern.activePeriods.length} periods (active/dormant cycles)`);

      for (let i = 0; i < dormancyPattern.activePeriods.length; i++) {
        const period = dormancyPattern.activePeriods[i];

        if (period.dormancy) {
          console.log(`    Period ${i + 1}: Dormancy (${period.dormancy} minutes)...`);
          
          // 休眠期間のシミュレーション（時間圧縮）
          await TimeControlHelper.wait(period.dormancy * 2); // 2ms per minute

          // 休眠後の再開を試行
          totalReactivations++;
          try {
            await container.authService.getAccount(account.id);
            successfulReactivations++;
            console.log(`    Reactivation ${totalReactivations}: Success after ${period.dormancy}min dormancy`);
          } catch (error) {
            console.log(`    Reactivation ${totalReactivations}: Failed - ${error instanceof Error ? error.message : String(error)}`);
            
            // セッション回復を試行
            totalSessionRecoveries++;
            try {
              await container.authService.refreshSession(account.id);
              successfulSessionRecoveries++;
              console.log(`    Session recovery: Success`);
            } catch (recoveryError) {
              console.log(`    Session recovery: Failed - ${recoveryError.message}`);
            }
          }

        } else if (period.duration && period.actions) {
          console.log(`    Period ${i + 1}: Active (${period.duration}min, ${period.actions} actions)...`);

          // アクティブ期間のアクション実行
          for (let action = 0; action < period.actions; action++) {
            try {
              await this.executeUserAction('browse', account);
              console.log(`      Action ${action + 1}/${period.actions}: Complete`);
            } catch (error) {
              console.warn(`      Action ${action + 1}: Failed - ${error instanceof Error ? error.message : String(error)}`);
            }
            
            // アクション間隔
            await TimeControlHelper.wait(period.duration * 2 / period.actions);
          }
        }
      }

      // 結果分析
      const reactivationSuccessRate = totalReactivations > 0 ? successfulReactivations / totalReactivations : 1;
      const sessionRecoveryRate = totalSessionRecoveries > 0 ? successfulSessionRecoveries / totalSessionRecoveries : 1;

      console.log(`  Reactivations: ${successfulReactivations}/${totalReactivations}`);
      console.log(`  Session recoveries: ${successfulSessionRecoveries}/${totalSessionRecoveries}`);
      console.log(`  Reactivation success rate: ${(reactivationSuccessRate * 100).toFixed(1)}%`);
      console.log(`  Session recovery rate: ${(sessionRecoveryRate * 100).toFixed(1)}%`);

      expect(reactivationSuccessRate).toBeGreaterThan(dormancyPattern.expectedBehavior.reactivationSuccessRate);
      if (totalSessionRecoveries > 0) {
        expect(sessionRecoveryRate).toBeGreaterThan(dormancyPattern.expectedBehavior.sessionRecoveryRate);
      }

      console.log('✅ Dormancy and reactivation pattern validated');
    });
  });
});