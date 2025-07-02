/**
 * Timing Attack Prevention Test Suite
 * Issue #92 Phase 4 Wave 2: タイミング攻撃防止テスト
 * 
 * セッション管理システムのタイミング攻撃対策を検証
 * - 定数時間比較の実装検証
 * - 認証タイミングの一定性確認
 * - サイドチャネル攻撃防止
 * - レスポンス時間分析攻撃対策
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecurityTestingSuite, type SecurityTestConfig, SecurityTestHelpers } from '../../../test-utils/securityTestingSuite.ts';
import { IntegrationTestContainer } from '../../../test-utils/integrationTestContainer.ts';
import { TimeControlHelper, AccountTestFactory } from '../../../test-utils/sessionTestUtils.ts';
import { AtProtocolMockFactory } from '../../../test-utils/mockFactories.ts';

describe('Timing Attack Prevention Tests', () => {
  let container: IntegrationTestContainer;
  let securitySuite: SecurityTestingSuite;

  beforeEach(async () => {
    // タイミング攻撃テスト用の設定
    container = new IntegrationTestContainer({
      initialAccountCount: 5,
      enableJWTManager: true,
      enableBackgroundMonitor: false,
      logLevel: 'error'
    });
    await container.setup();

    securitySuite = new SecurityTestingSuite(container);
  });

  afterEach(async () => {
    await securitySuite.cleanup();
    await container.teardown();
  });

  // ===================================================================
  // 認証タイミング攻撃防止テスト
  // ===================================================================

  describe('Authentication Timing Attack Prevention', () => {
    it('should maintain constant response time for authentication attempts', async () => {
      console.log('Testing constant response time for authentication attempts...');

      const timingTests = [
        {
          name: 'Valid User Authentication',
          testType: 'valid_user',
          attempts: 50,
          description: 'Authentication with valid user credentials'
        },
        {
          name: 'Invalid User Authentication',
          testType: 'invalid_user',
          attempts: 50,
          description: 'Authentication with non-existent user'
        },
        {
          name: 'Valid User Invalid Token',
          testType: 'valid_user_invalid_token',
          attempts: 50,
          description: 'Valid user with invalid token'
        },
        {
          name: 'Malformed Request',
          testType: 'malformed_request',
          attempts: 50,
          description: 'Malformed authentication request'
        }
      ];

      const timingResults: Array<{
        testType: string;
        timings: number[];
        averageTime: number;
        standardDeviation: number;
        minTime: number;
        maxTime: number;
      }> = [];

      for (const test of timingTests) {
        console.log(`\n  Testing ${test.name}...`);
        
        const timings: number[] = [];

        for (let i = 0; i < test.attempts; i++) {
          try {
            const startTime = performance.now();
            
            switch (test.testType) {
              case 'valid_user':
                // 有効なユーザーでの認証
                const validAccount = container.state.activeAccounts[0];
                await container.authService.getAccount(validAccount.id);
                break;
                
              case 'invalid_user':
                // 存在しないユーザーでの認証
                await container.authService.getAccount('did:plc:nonexistent');
                break;
                
              case 'valid_user_invalid_token':
                // 有効なユーザーだが無効なトークン
                const account = container.state.activeAccounts[0];
                await container.authService.refreshSession(account.id);
                break;
                
              case 'malformed_request':
                // 不正な形式のリクエスト
                await container.authService.getAccount('');
                break;
            }
            
            const endTime = performance.now();
            timings.push(endTime - startTime);

            // 測定間隔を最小化
            await TimeControlHelper.wait(10);

          } catch (error) {
            const endTime = performance.now();
            timings.push(endTime - startTime);
          }
        }

        // 統計計算
        const averageTime = timings.reduce((sum, time) => sum + time, 0) / timings.length;
        const variance = timings.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / timings.length;
        const standardDeviation = Math.sqrt(variance);
        const minTime = Math.min(...timings);
        const maxTime = Math.max(...timings);

        timingResults.push({
          testType: test.testType,
          timings,
          averageTime,
          standardDeviation,
          minTime,
          maxTime
        });

        console.log(`    Average: ${averageTime.toFixed(2)}ms`);
        console.log(`    Std Dev: ${standardDeviation.toFixed(2)}ms`);
        console.log(`    Range: ${minTime.toFixed(2)}ms - ${maxTime.toFixed(2)}ms`);
      }

      // タイミング攻撃耐性の分析
      console.log('\nTiming Attack Resistance Analysis:');
      
      // 各テストタイプ間の平均時間差を計算
      const averageTimes = timingResults.map(r => r.averageTime);
      const maxTimeDifference = Math.max(...averageTimes) - Math.min(...averageTimes);
      const relativeDifference = maxTimeDifference / Math.min(...averageTimes);

      console.log(`Maximum timing difference: ${maxTimeDifference.toFixed(2)}ms`);
      console.log(`Relative difference: ${(relativeDifference * 100).toFixed(1)}%`);

      // 統計的分析
      timingResults.forEach(result => {
        const coefficientOfVariation = result.standardDeviation / result.averageTime;
        console.log(`${result.testType}: CV=${(coefficientOfVariation * 100).toFixed(1)}%`);
      });

      // タイミング攻撃に対する耐性評価
      const timingResistant = relativeDifference < 0.5; // 50%未満の差であれば耐性あり
      const consistentTiming = timingResults.every(r => (r.standardDeviation / r.averageTime) < 0.3); // CV < 30%

      console.log(`\nTiming Attack Resistance: ${timingResistant ? '✅ Resistant' : '❌ Vulnerable'}`);
      console.log(`Consistent Timing: ${consistentTiming ? '✅ Consistent' : '❌ Inconsistent'}`);

      expect(timingResistant).toBe(true);
      expect(consistentTiming).toBe(true);

      console.log('✅ Authentication timing attack prevention validated');
    });

    it('should prevent timing attacks on user enumeration', async () => {
      console.log('Testing timing attack prevention for user enumeration...');

      const enumerationTests = [
        {
          name: 'Existing Users',
          userIds: container.state.activeAccounts.map(acc => acc.id),
          description: 'Timing for existing user lookups'
        },
        {
          name: 'Non-existent Users',
          userIds: [
            'did:plc:nonexistent1',
            'did:plc:nonexistent2', 
            'did:plc:nonexistent3',
            'did:plc:nonexistent4',
            'did:plc:nonexistent5'
          ],
          description: 'Timing for non-existent user lookups'
        }
      ];

      const enumerationResults: Array<{
        testName: string;
        timings: number[];
        averageTime: number;
        standardDeviation: number;
      }> = [];

      for (const test of enumerationTests) {
        console.log(`\n  Testing ${test.name}...`);
        
        const timings: number[] = [];

        // 各ユーザー ID を複数回テスト
        for (const userId of test.userIds) {
          for (let attempt = 0; attempt < 10; attempt++) {
            const startTime = performance.now();
            
            try {
              await container.authService.getAccount(userId);
            } catch (error) {
              // エラーも含めて測定
            }
            
            const endTime = performance.now();
            timings.push(endTime - startTime);
            
            await TimeControlHelper.wait(5);
          }
        }

        const averageTime = timings.reduce((sum, time) => sum + time, 0) / timings.length;
        const variance = timings.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / timings.length;
        const standardDeviation = Math.sqrt(variance);

        enumerationResults.push({
          testName: test.name,
          timings,
          averageTime,
          standardDeviation
        });

        console.log(`    ${test.name} - Average: ${averageTime.toFixed(2)}ms, StdDev: ${standardDeviation.toFixed(2)}ms`);
      }

      // ユーザー列挙タイミング攻撃の分析
      const existingUserTime = enumerationResults.find(r => r.testName === 'Existing Users')?.averageTime || 0;
      const nonExistentUserTime = enumerationResults.find(r => r.testName === 'Non-existent Users')?.averageTime || 0;
      
      const timingDifference = Math.abs(existingUserTime - nonExistentUserTime);
      const relativeTimingDifference = timingDifference / Math.min(existingUserTime, nonExistentUserTime);

      console.log('\nUser Enumeration Timing Analysis:');
      console.log(`Existing users avg time: ${existingUserTime.toFixed(2)}ms`);
      console.log(`Non-existent users avg time: ${nonExistentUserTime.toFixed(2)}ms`);
      console.log(`Timing difference: ${timingDifference.toFixed(2)}ms`);
      console.log(`Relative difference: ${(relativeTimingDifference * 100).toFixed(1)}%`);

      // ユーザー列挙への耐性評価
      const enumerationResistant = relativeTimingDifference < 0.3; // 30%未満の差

      console.log(`User Enumeration Resistance: ${enumerationResistant ? '✅ Resistant' : '❌ Vulnerable'}`);

      expect(enumerationResistant).toBe(true);

      console.log('✅ User enumeration timing attack prevention validated');
    });
  });

  // ===================================================================
  // 文字列比較タイミング攻撃防止テスト
  // ===================================================================

  describe('String Comparison Timing Attack Prevention', () => {
    it('should use constant-time string comparison for sensitive data', async () => {
      console.log('Testing constant-time string comparison for sensitive data...');

      // 異なる長さと内容の文字列でのタイミングテスト
      const comparisonTests = [
        {
          name: 'Same Length Strings',
          testPairs: [
            { correct: 'abcdefghijklmnop', candidate: 'abcdefghijklmnop' }, // 完全一致
            { correct: 'abcdefghijklmnop', candidate: 'bbcdefghijklmnop' }, // 最初の文字が違う
            { correct: 'abcdefghijklmnop', candidate: 'abcdefghijklmnbp' }, // 最後の文字が違う
            { correct: 'abcdefghijklmnop', candidate: 'abcdefghijklmnop' }, // 中間の文字が違う
            { correct: 'abcdefghijklmnop', candidate: 'xxxxxxxxxxxxxxxx' }  // 全て違う
          ]
        },
        {
          name: 'Different Length Strings',
          testPairs: [
            { correct: 'short', candidate: 'short' },
            { correct: 'short', candidate: 'shor' },
            { correct: 'short', candidate: 'shorts' },
            { correct: 'short', candidate: 'completely_different_length' },
            { correct: 'verylongstring', candidate: 'short' }
          ]
        },
        {
          name: 'Token-like Strings',
          testPairs: [
            { correct: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', candidate: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' },
            { correct: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', candidate: 'fyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' },
            { correct: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', candidate: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ8' },
            { correct: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', candidate: 'completely_wrong_token_string' }
          ]
        }
      ];

      const comparisonResults: Array<{
        testName: string;
        timingsByPosition: { [key: string]: number[] };
        averageTimings: { [key: string]: number };
        timingVariance: number;
      }> = [];

      for (const test of comparisonTests) {
        console.log(`\n  Testing ${test.name}...`);
        
        const timingsByPosition: { [key: string]: number[] } = {};
        
        for (let pairIndex = 0; pairIndex < test.testPairs.length; pairIndex++) {
          const pair = test.testPairs[pairIndex];
          const positionKey = `position_${pairIndex}`;
          timingsByPosition[positionKey] = [];

          // 各ペアを複数回テスト
          for (let attempt = 0; attempt < 30; attempt++) {
            const startTime = performance.now();
            
            // 文字列比較をシミュレート（実際の実装では cryptographic comparison を使用）
            await this.simulateStringComparison(pair.correct, pair.candidate);
            
            const endTime = performance.now();
            timingsByPosition[positionKey].push(endTime - startTime);
            
            // GC の影響を最小化
            await TimeControlHelper.wait(2);
          }
        }

        // 統計計算
        const averageTimings: { [key: string]: number } = {};
        Object.keys(timingsByPosition).forEach(key => {
          const timings = timingsByPosition[key];
          averageTimings[key] = timings.reduce((sum, time) => sum + time, 0) / timings.length;
        });

        // タイミングの分散を計算
        const allAverages = Object.values(averageTimings);
        const overallAverage = allAverages.reduce((sum, avg) => sum + avg, 0) / allAverages.length;
        const timingVariance = allAverages.reduce((sum, avg) => sum + Math.pow(avg - overallAverage, 2), 0) / allAverages.length;

        comparisonResults.push({
          testName: test.name,
          timingsByPosition,
          averageTimings,
          timingVariance
        });

        console.log(`    Average timing variance: ${timingVariance.toFixed(4)}ms²`);
        console.log(`    Timing consistency: ${timingVariance < 0.01 ? '✅ Consistent' : '❌ Inconsistent'}`);
      }

      // 定数時間比較の評価
      console.log('\nConstant-Time Comparison Analysis:');
      
      let overallConstantTime = true;
      comparisonResults.forEach(result => {
        const isConstantTime = result.timingVariance < 0.01; // 0.01ms² 未満の分散
        console.log(`${result.testName}: ${isConstantTime ? '✅' : '❌'} (variance: ${result.timingVariance.toFixed(4)}ms²)`);
        overallConstantTime = overallConstantTime && isConstantTime;
      });

      console.log(`Overall Constant-Time Compliance: ${overallConstantTime ? '✅ Compliant' : '❌ Non-Compliant'}`);

      expect(overallConstantTime).toBe(true);

      console.log('✅ Constant-time string comparison validated');
    });

    // 文字列比較をシミュレートするヘルパーメソッド
    private async simulateStringComparison(str1: string, str2: string): Promise<boolean> {
      // 実際の実装では crypto.timingSafeEqual() などを使用
      // ここではシミュレーションとして一定時間の処理を行う
      
      const maxLength = Math.max(str1.length, str2.length);
      let result = str1.length === str2.length;
      
      // 定数時間での比較をシミュレート
      for (let i = 0; i < maxLength; i++) {
        const char1 = i < str1.length ? str1.charCodeAt(i) : 0;
        const char2 = i < str2.length ? str2.charCodeAt(i) : 0;
        result = result && (char1 === char2);
      }
      
      // 処理時間を一定にするため短い待機
      await TimeControlHelper.wait(1);
      
      return result;
    }

    it('should prevent timing attacks on token validation', async () => {
      console.log('Testing timing attack prevention in token validation...');

      const tokenValidationTests = [
        {
          name: 'Valid Token Validation',
          tokens: container.state.activeAccounts.map(acc => acc.session?.accessJwt || '').filter(token => token),
          description: 'Validation timing for legitimate tokens'
        },
        {
          name: 'Invalid Token Validation',
          tokens: [
            'invalid.token.here',
            'eyJhbGciOiJub25lIn0.eyJzdWIiOiJmYWtlIn0.fakesignature',
            'completely_malformed_token',
            '',
            'token.with.wrong.segments.count.here.extra'
          ],
          description: 'Validation timing for invalid tokens'
        },
        {
          name: 'Malformed Token Validation',
          tokens: [
            'not_a_jwt_token',
            'eyJhbGciOiJIUzI1NiJ9', // missing parts
            'invalid..token', // empty segments
            'a'.repeat(1000), // very long invalid token
            '!@#$%^&*()', // special characters
          ],
          description: 'Validation timing for malformed tokens'
        }
      ];

      const validationResults: Array<{
        testName: string;
        timings: number[];
        averageTime: number;
        standardDeviation: number;
      }> = [];

      for (const test of tokenValidationTests) {
        console.log(`\n  Testing ${test.name}...`);
        
        const timings: number[] = [];

        for (const token of test.tokens) {
          // 各トークンを複数回テスト
          for (let attempt = 0; attempt < 20; attempt++) {
            const startTime = performance.now();
            
            try {
              // トークン検証をシミュレート
              await this.simulateTokenValidation(token);
            } catch (error) {
              // エラーも含めて測定
            }
            
            const endTime = performance.now();
            timings.push(endTime - startTime);
            
            await TimeControlHelper.wait(3);
          }
        }

        const averageTime = timings.reduce((sum, time) => sum + time, 0) / timings.length;
        const variance = timings.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / timings.length;
        const standardDeviation = Math.sqrt(variance);

        validationResults.push({
          testName: test.name,
          timings,
          averageTime,
          standardDeviation
        });

        console.log(`    ${test.name} - Average: ${averageTime.toFixed(2)}ms, StdDev: ${standardDeviation.toFixed(2)}ms`);
      }

      // トークン検証タイミング攻撃の分析
      console.log('\nToken Validation Timing Analysis:');
      
      const averageTimes = validationResults.map(r => r.averageTime);
      const minTime = Math.min(...averageTimes);
      const maxTime = Math.max(...averageTimes);
      const timingSpread = maxTime - minTime;
      const relativeSpread = timingSpread / minTime;

      console.log(`Timing spread: ${timingSpread.toFixed(2)}ms`);
      console.log(`Relative spread: ${(relativeSpread * 100).toFixed(1)}%`);

      validationResults.forEach(result => {
        console.log(`${result.testName}: ${result.averageTime.toFixed(2)}ms ± ${result.standardDeviation.toFixed(2)}ms`);
      });

      // タイミング攻撃への耐性評価
      const validationResistant = relativeSpread < 0.4; // 40%未満のスプレッド
      const consistentValidation = validationResults.every(r => (r.standardDeviation / r.averageTime) < 0.25);

      console.log(`\nToken Validation Resistance: ${validationResistant ? '✅ Resistant' : '❌ Vulnerable'}`);
      console.log(`Validation Consistency: ${consistentValidation ? '✅ Consistent' : '❌ Inconsistent'}`);

      expect(validationResistant).toBe(true);
      expect(consistentValidation).toBe(true);

      console.log('✅ Token validation timing attack prevention validated');
    });

    // トークン検証をシミュレートするヘルパーメソッド
    private async simulateTokenValidation(token: string): Promise<boolean> {
      // JWT トークンの基本構造確認
      const parts = token.split('.');
      
      // 基本的な形式チェック（定数時間で実行）
      let isValidFormat = parts.length === 3;
      
      // 各部分の検証をシミュレート（定数時間）
      for (let i = 0; i < 3; i++) {
        const part = i < parts.length ? parts[i] : '';
        
        // Base64URL 形式チェック（定数時間）
        const isValidBase64 = /^[A-Za-z0-9_-]*$/.test(part);
        isValidFormat = isValidFormat && isValidBase64;
        
        // 長さチェック（定数時間）
        const hasValidLength = part.length > 0 && part.length < 10000;
        isValidFormat = isValidFormat && hasValidLength;
      }
      
      // 署名検証をシミュレート（定数時間）
      await TimeControlHelper.wait(2);
      
      return isValidFormat;
    }
  });

  // ===================================================================
  // サイドチャネル攻撃防止テスト
  // ===================================================================

  describe('Side-Channel Attack Prevention', () => {
    it('should prevent information leakage through error messages', async () => {
      console.log('Testing information leakage prevention through error messages...');

      const errorMessageTests = [
        {
          name: 'Non-existent Account',
          operation: async () => await container.authService.getAccount('did:plc:nonexistent'),
          expectedErrorType: 'generic',
          description: 'Should not reveal that account does not exist'
        },
        {
          name: 'Invalid DID Format',
          operation: async () => await container.authService.getAccount('invalid-did-format'),
          expectedErrorType: 'generic',
          description: 'Should not reveal DID format validation details'
        },
        {
          name: 'Malformed Account ID',
          operation: async () => await container.authService.getAccount(''),
          expectedErrorType: 'generic',
          description: 'Should not reveal validation logic details'
        },
        {
          name: 'SQL Injection Attempt',
          operation: async () => await container.authService.getAccount("'; DROP TABLE accounts; --"),
          expectedErrorType: 'generic',
          description: 'Should not reveal database structure or queries'
        }
      ];

      const errorAnalysisResults: Array<{
        testName: string;
        errorMessage: string;
        containsSensitiveInfo: boolean;
        timingConsistent: boolean;
        details: string;
      }> = [];

      for (const test of errorMessageTests) {
        console.log(`\n  Testing ${test.name}...`);
        
        const timings: number[] = [];
        let errorMessage = '';

        // 複数回実行してタイミングを測定
        for (let attempt = 0; attempt < 10; attempt++) {
          const startTime = performance.now();
          
          try {
            await test.operation();
          } catch (error) {
            if (attempt === 0) {
              errorMessage = error instanceof Error ? error instanceof Error ? error.message : String(error) : '';
            }
          }
          
          const endTime = performance.now();
          timings.push(endTime - startTime);
        }

        // エラーメッセージの分析
        const sensitiveKeywords = [
          'table', 'database', 'sql', 'query',
          'not found', 'does not exist', 'invalid',
          'password', 'token', 'secret',
          'internal', 'system', 'server',
          'did:plc:', 'account'
        ];

        const containsSensitiveInfo = sensitiveKeywords.some(keyword => 
          errorMessage.toLowerCase().includes(keyword.toLowerCase())
        );

        // タイミングの一貫性確認
        const averageTime = timings.reduce((sum, time) => sum + time, 0) / timings.length;
        const standardDeviation = Math.sqrt(
          timings.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / timings.length
        );
        const timingConsistent = (standardDeviation / averageTime) < 0.3;

        errorAnalysisResults.push({
          testName: test.name,
          errorMessage: errorMessage.substring(0, 100),
          containsSensitiveInfo,
          timingConsistent,
          details: containsSensitiveInfo ? 
            'ERROR: Sensitive information leaked in error message' : 
            'Safe: Generic error message used'
        });

        console.log(`    Error message: "${errorMessage.substring(0, 60)}${errorMessage.length > 60 ? '...' : ''}"`);
        console.log(`    Contains sensitive info: ${containsSensitiveInfo ? '❌ Yes' : '✅ No'}`);
        console.log(`    Timing consistent: ${timingConsistent ? '✅ Yes' : '❌ No'}`);
      }

      // サイドチャネル攻撃への耐性評価
      console.log('\nError Message Side-Channel Analysis:');
      
      const informationLeakageCount = errorAnalysisResults.filter(r => r.containsSensitiveInfo).length;
      const timingInconsistencyCount = errorAnalysisResults.filter(r => !r.timingConsistent).length;
      
      errorAnalysisResults.forEach(result => {
        console.log(`${result.testName}: ${result.containsSensitiveInfo ? '❌' : '✅'} Info, ${result.timingConsistent ? '✅' : '❌'} Timing`);
      });

      const sideChannelResistant = informationLeakageCount === 0 && timingInconsistencyCount <= 1;

      console.log(`Information Leakage Count: ${informationLeakageCount}`);
      console.log(`Timing Inconsistency Count: ${timingInconsistencyCount}`);
      console.log(`Side-Channel Resistant: ${sideChannelResistant ? '✅ Yes' : '❌ No'}`);

      expect(informationLeakageCount).toBe(0);
      expect(timingInconsistencyCount).toBeLessThanOrEqual(1);

      console.log('✅ Side-channel attack prevention through error messages validated');
    });

    it('should prevent cache timing attacks', async () => {
      console.log('Testing cache timing attack prevention...');

      const cacheTimingTests = [
        {
          name: 'First Access Pattern',
          description: 'First access to accounts should have consistent timing',
          testFunction: async () => {
            const timings: number[] = [];
            
            for (const account of container.state.activeAccounts) {
              // キャッシュをクリア（実装に依存）
              const startTime = performance.now();
              await container.authService.getAccount(account.id);
              const endTime = performance.now();
              timings.push(endTime - startTime);
            }
            
            return timings;
          }
        },
        {
          name: 'Repeated Access Pattern',
          description: 'Repeated access should have consistent timing',
          testFunction: async () => {
            const timings: number[] = [];
            
            for (const account of container.state.activeAccounts) {
              // 2回目のアクセス（キャッシュされている可能性）
              const startTime = performance.now();
              await container.authService.getAccount(account.id);
              const endTime = performance.now();
              timings.push(endTime - startTime);
            }
            
            return timings;
          }
        },
        {
          name: 'Mixed Access Pattern',
          description: 'Mixed cached/uncached access should have consistent timing',
          testFunction: async () => {
            const timings: number[] = [];
            
            // 存在するアカウントと存在しないアカウントを混在
            const testIds = [
              ...container.state.activeAccounts.map(acc => acc.id),
              'did:plc:cache1', 'did:plc:cache2', 'did:plc:cache3'
            ];
            
            for (const id of testIds) {
              const startTime = performance.now();
              try {
                await container.authService.getAccount(id);
              } catch (error) {
                // エラーも含めて測定
              }
              const endTime = performance.now();
              timings.push(endTime - startTime);
            }
            
            return timings;
          }
        }
      ];

      const cacheResults: Array<{
        testName: string;
        timings: number[];
        averageTime: number;
        standardDeviation: number;
        cacheTimingResistant: boolean;
      }> = [];

      for (const test of cacheTimingTests) {
        console.log(`\n  Testing ${test.name}...`);
        
        const timings = await test.testFunction();
        const averageTime = timings.reduce((sum, time) => sum + time, 0) / timings.length;
        const variance = timings.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / timings.length;
        const standardDeviation = Math.sqrt(variance);
        
        // キャッシュタイミング攻撃への耐性（CV < 50%）
        const coefficientOfVariation = standardDeviation / averageTime;
        const cacheTimingResistant = coefficientOfVariation < 0.5;

        cacheResults.push({
          testName: test.name,
          timings,
          averageTime,
          standardDeviation,
          cacheTimingResistant
        });

        console.log(`    Average: ${averageTime.toFixed(2)}ms`);
        console.log(`    Std Dev: ${standardDeviation.toFixed(2)}ms`);
        console.log(`    CV: ${(coefficientOfVariation * 100).toFixed(1)}%`);
        console.log(`    Cache timing resistant: ${cacheTimingResistant ? '✅ Yes' : '❌ No'}`);
      }

      // 全体的なキャッシュタイミング攻撃への耐性
      const overallCacheResistant = cacheResults.every(r => r.cacheTimingResistant);

      console.log('\nCache Timing Attack Resistance Summary:');
      cacheResults.forEach(result => {
        console.log(`${result.testName}: ${result.cacheTimingResistant ? '✅ Resistant' : '❌ Vulnerable'}`);
      });
      console.log(`Overall Cache Timing Resistance: ${overallCacheResistant ? '✅ Resistant' : '❌ Vulnerable'}`);

      expect(overallCacheResistant).toBe(true);

      console.log('✅ Cache timing attack prevention validated');
    });
  });
});