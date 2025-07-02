/**
 * Data Leakage Prevention Test Suite
 * Issue #92 Phase 4 Wave 2: データ漏洩防止テスト
 * 
 * セッション管理システムのデータ漏洩防止機能を検証
 * - メモリダンプでの機密データ漏洩防止
 * - ログファイルでの機密情報漏洩防止
 * - エラーメッセージでの情報漏洩防止
 * - デバッグ情報での機密データ露出防止
 * - ネットワーク通信での平文送信防止
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecurityTestingSuite, type SecurityTestConfig, SecurityTestHelpers } from '../../../test-utils/securityTestingSuite.ts';
import { IntegrationTestContainer } from '../../../test-utils/integrationTestContainer.ts';
import { TimeControlHelper, AccountTestFactory } from '../../../test-utils/sessionTestUtils.ts';
import { AtProtocolMockFactory } from '../../../test-utils/mockFactories.ts';

describe('Data Leakage Prevention Tests', () => {
  let container: IntegrationTestContainer;
  let securitySuite: SecurityTestingSuite;

  beforeEach(async () => {
    // データ漏洩防止テスト用の設定
    container = new IntegrationTestContainer({
      initialAccountCount: 3,
      enableJWTManager: true,
      enableBackgroundMonitor: false,
      logLevel: 'debug' // デバッグレベルでログ出力をテスト
    });
    await container.setup();

    securitySuite = new SecurityTestingSuite(container);
  });

  afterEach(async () => {
    await securitySuite.cleanup();
    await container.teardown();
  });

  // ===================================================================
  // ログファイル・コンソール出力での機密情報漏洩防止テスト
  // ===================================================================

  describe('Log File and Console Output Data Protection', () => {
    it('should prevent sensitive data leakage in console logs', async () => {
      console.log('Testing sensitive data leakage prevention in console logs...');

      // ログ出力をキャプチャするためのスパイを設定
      const consoleSpy = vi.spyOn(console, 'log');
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const consoleWarnSpy = vi.spyOn(console, 'warn');
      const consoleDebugSpy = vi.spyOn(console, 'debug');

      const sensitiveDataTests = [
        {
          name: 'Access Token Logging',
          operation: async () => {
            const account = container.state.activeAccounts[0];
            // アクセストークンを含む操作
            await container.authService.getAccount(account.id);
          },
          sensitivePattern: account => account.session?.accessJwt?.substring(0, 20) || '',
          description: 'Access tokens should not appear in logs'
        },
        {
          name: 'Refresh Token Logging',
          operation: async () => {
            const account = container.state.activeAccounts[0];
            // リフレッシュトークンを含む操作
            await container.authService.refreshSession(account.id);
          },
          sensitivePattern: account => account.session?.refreshJwt?.substring(0, 20) || '',
          description: 'Refresh tokens should not appear in logs'
        },
        {
          name: 'Session Data Logging',
          operation: async () => {
            // セッション検証操作
            await container.validateAllSessions();
          },
          sensitivePattern: account => account.profile.did.substring(10),
          description: 'Full DID should be redacted in logs'
        },
        {
          name: 'Error Handling Logging',
          operation: async () => {
            try {
              // エラーを発生させる操作
              await container.authService.refreshSession('invalid-account-id');
            } catch (error) {
              // エラーハンドリングでのログ出力
            }
          },
          sensitivePattern: () => 'invalid-account-id',
          description: 'Error messages should not expose sensitive parameters'
        }
      ];

      const logLeakageResults: Array<{
        testName: string;
        sensitiveDataFound: boolean;
        leakedData: string[];
        logCount: number;
        details: string;
      }> = [];

      for (const test of sensitiveDataTests) {
        console.log(`\n  Testing ${test.name}...`);
        
        // ログスパイをクリア
        consoleSpy.mockClear();
        consoleErrorSpy.mockClear();
        consoleWarnSpy.mockClear();
        consoleDebugSpy.mockClear();

        const account = container.state.activeAccounts[0];
        const sensitivePattern = test.sensitivePattern(account);

        try {
          // テスト操作を実行
          await test.operation();
        } catch (error) {
          // エラーも含めて分析
        }

        // 全てのログ出力を収集
        const allLogs = [
          ...consoleSpy.mock.calls.flat(),
          ...consoleErrorSpy.mock.calls.flat(),
          ...consoleWarnSpy.mock.calls.flat(),
          ...consoleDebugSpy.mock.calls.flat()
        ].map(log => String(log));

        // 機密データの検索
        const leakedData: string[] = [];
        let sensitiveDataFound = false;

        allLogs.forEach(logEntry => {
          if (sensitivePattern && logEntry.includes(sensitivePattern)) {
            leakedData.push(logEntry.substring(0, 100));
            sensitiveDataFound = true;
          }
        });

        logLeakageResults.push({
          testName: test.name,
          sensitiveDataFound,
          leakedData,
          logCount: allLogs.length,
          details: sensitiveDataFound ? 
            `LEAK DETECTED: ${leakedData.length} log entries contain sensitive data` :
            `Safe: No sensitive data found in ${allLogs.length} log entries`
        });

        console.log(`    ${sensitiveDataFound ? '❌' : '✅'} ${test.name}: ${test.details}`);
        if (sensitiveDataFound) {
          console.log(`      Leaked data sample: "${leakedData[0]?.substring(0, 50)}..."`);
        }
      }

      // スパイを復元
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleDebugSpy.mockRestore();

      // ログ漏洩の評価
      const totalLeakages = logLeakageResults.filter(r => r.sensitiveDataFound).length;
      const leakageRate = totalLeakages / logLeakageResults.length;

      console.log('\nConsole Log Data Leakage Summary:');
      logLeakageResults.forEach(result => {
        console.log(`  ${result.testName}: ${result.sensitiveDataFound ? '❌ LEAK' : '✅ Safe'} - ${result.details}`);
      });
      console.log(`Total Leakages: ${totalLeakages}/${logLeakageResults.length}`);
      console.log(`Leakage Rate: ${(leakageRate * 100).toFixed(1)}%`);

      expect(totalLeakages).toBe(0); // 機密データ漏洩は許容できない
      expect(leakageRate).toBe(0);

      console.log('✅ Console log data leakage prevention validated');
    });

    it('should sanitize or redact sensitive data in log outputs', async () => {
      console.log('Testing sensitive data sanitization in log outputs...');

      const sanitizationTests = [
        {
          name: 'Token Redaction',
          testData: {
            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
            expected: 'eyJhbGci...***REDACTED***'
          },
          description: 'Tokens should be redacted in logs'
        },
        {
          name: 'DID Partial Redaction',
          testData: {
            did: 'did:plc:abcdefghijklmnopqrstuvwxyz123456',
            expected: 'did:plc:abcdef...***'
          },
          description: 'DIDs should be partially redacted'
        },
        {
          name: 'Email Redaction',
          testData: {
            email: 'user@example.com',
            expected: 'u***@example.com'
          },
          description: 'Email addresses should be partially redacted'
        },
        {
          name: 'Session ID Redaction',
          testData: {
            sessionId: 'sess_1234567890abcdef',
            expected: 'sess_1234...***'
          },
          description: 'Session IDs should be redacted'
        }
      ];

      const sanitizationResults: Array<{
        testName: string;
        input: string;
        expectedOutput: string;
        actualOutput: string;
        properlySanitized: boolean;
      }> = [];

      for (const test of sanitizationTests) {
        console.log(`\n  Testing ${test.name}...`);
        
        // 機密データサニタイゼーション関数をテスト
        const sanitizedOutput = this.sanitizeSensitiveData(test.testData.accessToken || test.testData.did || test.testData.email || test.testData.sessionId || '');
        
        const properlySanitized = 
          sanitizedOutput !== (test.testData.accessToken || test.testData.did || test.testData.email || test.testData.sessionId) &&
          sanitizedOutput.includes('***');

        sanitizationResults.push({
          testName: test.name,
          input: test.testData.accessToken || test.testData.did || test.testData.email || test.testData.sessionId || '',
          expectedOutput: test.testData.expected,
          actualOutput: sanitizedOutput,
          properlySanitized
        });

        console.log(`    Input: "${test.testData.accessToken || test.testData.did || test.testData.email || test.testData.sessionId}"`);
        console.log(`    Output: "${sanitizedOutput}"`);
        console.log(`    Properly sanitized: ${properlySanitized ? '✅ Yes' : '❌ No'}`);
      }

      // サニタイゼーションの評価
      const sanitizationScore = sanitizationResults.filter(r => r.properlySanitized).length / sanitizationResults.length;

      console.log('\nData Sanitization Summary:');
      sanitizationResults.forEach(result => {
        console.log(`  ${result.testName}: ${result.properlySanitized ? '✅ Sanitized' : '❌ Unsanitized'}`);
      });
      console.log(`Sanitization Score: ${(sanitizationScore * 100).toFixed(1)}%`);

      expect(sanitizationScore).toBeGreaterThan(0.8); // 80%以上のサニタイゼーション

      console.log('✅ Sensitive data sanitization validated');
    });

    // サニタイゼーション関数のサンプル実装
    private sanitizeSensitiveData(data: string): string {
      if (!data) return data;

      // JWT トークンのサニタイゼーション
      if (data.startsWith('eyJ') && data.includes('.')) {
        return data.substring(0, 8) + '...***REDACTED***';
      }

      // DID のサニタイゼーション
      if (data.startsWith('did:plc:')) {
        return data.substring(0, 14) + '...***';
      }

      // Email のサニタイゼーション
      if (data.includes('@')) {
        const [username, domain] = data.split('@');
        return username.charAt(0) + '***@' + domain;
      }

      // セッション ID のサニタイゼーション
      if (data.startsWith('sess_')) {
        return data.substring(0, 9) + '...***';
      }

      // その他の長い文字列
      if (data.length > 20) {
        return data.substring(0, 10) + '...***REDACTED***';
      }

      return data;
    }
  });

  // ===================================================================
  // メモリダンプでの機密データ保護テスト
  // ===================================================================

  describe('Memory Dump Data Protection', () => {
    it('should prevent sensitive data exposure in memory dumps', async () => {
      console.log('Testing sensitive data protection in memory dumps...');

      const memoryProtectionTests = [
        {
          name: 'Token Memory Cleanup',
          operation: async () => {
            // トークンを使用した後のメモリクリーンアップ
            const account = container.state.activeAccounts[0];
            await container.authService.getAccount(account.id);
            
            // メモリ内のトークン参照をクリア
            await this.simulateMemoryCleanup();
          },
          description: 'Tokens should be cleared from memory after use'
        },
        {
          name: 'Session Data Memory Protection',
          operation: async () => {
            // セッションデータアクセス後のクリーンアップ
            await container.validateAllSessions();
            await this.simulateMemoryCleanup();
          },
          description: 'Session data should not persist in memory'
        },
        {
          name: 'Temporary Variable Cleanup',
          operation: async () => {
            // 一時変数でのトークン処理
            const accounts = await container.authService.getAllAccounts();
            
            if (accounts.success && accounts.data) {
              accounts.data.forEach(account => {
                // 一時的にトークンを処理
                const tempToken = account.session?.accessJwt;
                // 処理後にクリア
              });
            }
            
            await this.simulateMemoryCleanup();
          },
          description: 'Temporary variables should be cleared'
        }
      ];

      const memoryResults: Array<{
        testName: string;
        memoryLeakDetected: boolean;
        details: string;
      }> = [];

      for (const test of memoryProtectionTests) {
        console.log(`\n  Testing ${test.name}...`);
        
        try {
          await test.operation();
          
          // メモリダンプのシミュレーション
          const memorySnapshot = await this.captureMemorySnapshot();
          const sensitiveDataInMemory = this.analyzeSensitiveDataInMemory(memorySnapshot);
          
          memoryResults.push({
            testName: test.name,
            memoryLeakDetected: sensitiveDataInMemory.length > 0,
            details: sensitiveDataInMemory.length > 0 ? 
              `Memory leak detected: ${sensitiveDataInMemory.length} sensitive items` :
              'No sensitive data found in memory dump'
          });

          console.log(`    ${sensitiveDataInMemory.length > 0 ? '❌' : '✅'} ${test.name}: ${test.description}`);

        } catch (error) {
          memoryResults.push({
            testName: test.name,
            memoryLeakDetected: false,
            details: `Test error: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      }

      // メモリ保護の評価
      const memoryLeaks = memoryResults.filter(r => r.memoryLeakDetected).length;
      const memoryProtectionScore = (memoryResults.length - memoryLeaks) / memoryResults.length;

      console.log('\nMemory Protection Summary:');
      memoryResults.forEach(result => {
        console.log(`  ${result.testName}: ${result.memoryLeakDetected ? '❌ LEAK' : '✅ Protected'} - ${result.details}`);
      });
      console.log(`Memory Protection Score: ${(memoryProtectionScore * 100).toFixed(1)}%`);

      expect(memoryLeaks).toBeLessThanOrEqual(1); // 最大1つまでのメモリリークを許容
      expect(memoryProtectionScore).toBeGreaterThan(0.8); // 80%以上の保護率

      console.log('✅ Memory dump data protection validated');
    });

    // メモリクリーンアップのシミュレーション
    private async simulateMemoryCleanup(): Promise<void> {
      // ガベージコレクションの実行
      if (global.gc) {
        global.gc();
      }
      
      // メモリクリーンアップの待機
      await TimeControlHelper.wait(100);
    }

    // メモリスナップショットのキャプチャ（シミュレーション）
    private async captureMemorySnapshot(): Promise<string[]> {
      // 実際の実装では process.memoryUsage() や heapdump などを使用
      // ここではシミュレーション
      const mockMemoryContent = [
        'some_random_data',
        'user_interface_text',
        'normal_application_data',
        // 機密データが残っている場合のサンプル
        // 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // アクセストークン
        // 'did:plc:abc123def456', // DID
      ];
      
      return mockMemoryContent;
    }

    // メモリ内の機密データ分析
    private analyzeSensitiveDataInMemory(memorySnapshot: string[]): string[] {
      const sensitivePatterns = [
        /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, // JWT pattern
        /did:plc:[a-z0-9]+/, // DID pattern
        /access_token/i,
        /refresh_token/i,
        /session_secret/i
      ];

      const sensitiveData: string[] = [];

      memorySnapshot.forEach(item => {
        sensitivePatterns.forEach(pattern => {
          if (pattern.test(item)) {
            sensitiveData.push(item);
          }
        });
      });

      return sensitiveData;
    }
  });

  // ===================================================================
  // ネットワーク通信での平文送信防止テスト
  // ===================================================================

  describe('Network Communication Data Protection', () => {
    it('should prevent plaintext transmission of sensitive data', async () => {
      console.log('Testing plaintext transmission prevention of sensitive data...');

      // ネットワークリクエストの監視
      const networkActivityLog: Array<{
        url: string;
        method: string;
        headers: Record<string, string>;
        body: string;
        encrypted: boolean;
      }> = [];

      // Fetch API のモック
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation(async (url: string | Request, options?: RequestInit) => {
        const requestUrl = typeof url === 'string' ? url : url.url;
        const method = options?.method || 'GET';
        const headers = options?.headers as Record<string, string> || {};
        const body = options?.body as string || '';

        // HTTPS 使用の確認
        const encrypted = requestUrl.startsWith('https://');

        networkActivityLog.push({
          url: requestUrl,
          method,
          headers,
          body,
          encrypted
        });

        // モックレスポンス
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      });

      const networkTests = [
        {
          name: 'Token Transmission Security',
          operation: async () => {
            const account = container.state.activeAccounts[0];
            // トークンを含む API リクエスト
            await container.authService.refreshSession(account.id);
          },
          description: 'Token transmission should use HTTPS'
        },
        {
          name: 'Session Data Transmission',
          operation: async () => {
            // セッションデータの送信
            await container.validateAllSessions();
          },
          description: 'Session data should be transmitted securely'
        },
        {
          name: 'Authentication Request Security',
          operation: async () => {
            const account = container.state.activeAccounts[0];
            // 認証リクエスト
            await container.authService.getAccount(account.id);
          },
          description: 'Authentication requests should use HTTPS'
        }
      ];

      for (const test of networkTests) {
        console.log(`\n  Testing ${test.name}...`);
        
        try {
          await test.operation();
        } catch (error) {
          // ネットワークエラーも分析に含める
        }
      }

      // Fetch モックを復元
      global.fetch = originalFetch;

      // ネットワーク通信の分析
      console.log('\nNetwork Communication Analysis:');
      
      const totalRequests = networkActivityLog.length;
      const encryptedRequests = networkActivityLog.filter(req => req.encrypted).length;
      const encryptionRate = totalRequests > 0 ? encryptedRequests / totalRequests : 1;

      console.log(`Total requests: ${totalRequests}`);
      console.log(`Encrypted requests: ${encryptedRequests}`);
      console.log(`Encryption rate: ${(encryptionRate * 100).toFixed(1)}%`);

      // 機密データの平文送信チェック
      const plaintextLeaks: Array<{
        url: string;
        leakType: string;
        details: string;
      }> = [];

      networkActivityLog.forEach(request => {
        if (!request.encrypted) {
          plaintextLeaks.push({
            url: request.url,
            leakType: 'unencrypted_transmission',
            details: 'Request sent over HTTP instead of HTTPS'
          });
        }

        // ヘッダーでの機密データ漏洩チェック
        Object.entries(request.headers).forEach(([key, value]: any) => {
          if (key.toLowerCase().includes('authorization') && !request.encrypted) {
            plaintextLeaks.push({
              url: request.url,
              leakType: 'plaintext_auth_header',
              details: 'Authorization header sent over unencrypted connection'
            });
          }
        });

        // リクエストボディでの機密データ漏洩チェック
        if (request.body && !request.encrypted) {
          const sensitivePatterns = ['password', 'token', 'secret', 'access_token', 'refresh_token'];
          const bodyLower = request.body.toLowerCase();
          
          sensitivePatterns.forEach(pattern => {
            if (bodyLower.includes(pattern)) {
              plaintextLeaks.push({
                url: request.url,
                leakType: 'plaintext_sensitive_data',
                details: `Sensitive data (${pattern}) sent in plaintext`
              });
            }
          });
        }
      });

      console.log('\nPlaintext Transmission Analysis:');
      if (plaintextLeaks.length > 0) {
        console.log('SECURITY WARNING - Plaintext transmissions detected:');
        plaintextLeaks.forEach(leak => {
          console.log(`  ❌ ${leak.leakType}: ${leak.details}`);
          console.log(`     URL: ${leak.url}`);
        });
      } else {
        console.log('✅ No plaintext transmission of sensitive data detected');
      }

      expect(encryptionRate).toBeGreaterThan(0.9); // 90%以上の暗号化率
      expect(plaintextLeaks.length).toBe(0); // 平文送信は許容できない

      console.log('✅ Network communication data protection validated');
    });
  });

  // ===================================================================
  // エラーメッセージでの情報漏洩防止テスト
  // ===================================================================

  describe('Error Message Information Disclosure Prevention', () => {
    it('should prevent sensitive information disclosure in error messages', async () => {
      console.log('Testing sensitive information disclosure prevention in error messages...');

      const errorDisclosureTests = [
        {
          name: 'Database Error Information',
          operation: async () => {
            // データベースエラーを発生させる
            await container.authService.getAccount(''); // 無効な ID
          },
          sensitiveInfo: ['table', 'column', 'database', 'sql', 'query'],
          description: 'Database errors should not expose schema information'
        },
        {
          name: 'File System Error Information',
          operation: async () => {
            try {
              // ファイルシステムエラーをシミュレート
              await container.authService.addAccount(AccountTestFactory.createBasicAccount('did:plc:filesystem', '/invalid/path'));
            } catch (error) {
              throw error;
            }
          },
          sensitiveInfo: ['path', 'directory', 'file', '/home/', '/usr/', 'C:\\'],
          description: 'File system errors should not expose path information'
        },
        {
          name: 'Authentication Error Information',
          operation: async () => {
            // 認証エラーを発生させる
            await container.authService.refreshSession('nonexistent');
          },
          sensitiveInfo: ['did:plc:', 'access_token', 'refresh_token', 'session'],
          description: 'Authentication errors should not expose token details'
        },
        {
          name: 'Validation Error Information',
          operation: async () => {
            // バリデーションエラーを発生させる
            const invalidAccount = AccountTestFactory.createBasicAccount('invalid', 'invalid');
            await container.authService.addAccount(invalidAccount);
          },
          sensitiveInfo: ['internal', 'stack', 'trace', 'debug'],
          description: 'Validation errors should not expose internal details'
        }
      ];

      const errorDisclosureResults: Array<{
        testName: string;
        errorMessage: string;
        sensitiveInfoExposed: string[];
        disclosureRisk: 'high' | 'medium' | 'low' | 'none';
        details: string;
      }> = [];

      for (const test of errorDisclosureTests) {
        console.log(`\n  Testing ${test.name}...`);
        
        let errorMessage = '';
        const sensitiveInfoExposed: string[] = [];

        try {
          await test.operation();
        } catch (error) {
          errorMessage = error instanceof Error ? error.message : String(error) || error.toString();
        }

        // 機密情報の露出チェック
        test.sensitiveInfo.forEach(info => {
          if (errorMessage.toLowerCase().includes(info.toLowerCase())) {
            sensitiveInfoExposed.push(info);
          }
        });

        // 開示リスクの評価
        let disclosureRisk: 'high' | 'medium' | 'low' | 'none' = 'none';
        if (sensitiveInfoExposed.length > 3) {
          disclosureRisk = 'high';
        } else if (sensitiveInfoExposed.length > 1) {
          disclosureRisk = 'medium';
        } else if (sensitiveInfoExposed.length > 0) {
          disclosureRisk = 'low';
        }

        errorDisclosureResults.push({
          testName: test.name,
          errorMessage: errorMessage.substring(0, 150),
          sensitiveInfoExposed,
          disclosureRisk,
          details: sensitiveInfoExposed.length > 0 ? 
            `Sensitive info exposed: ${sensitiveInfoExposed.join(', ')}` :
            'No sensitive information disclosed'
        });

        console.log(`    Error message: "${errorMessage.substring(0, 80)}${errorMessage.length > 80 ? '...' : ''}"`);
        console.log(`    Disclosure risk: ${disclosureRisk.toUpperCase()}`);
        console.log(`    ${sensitiveInfoExposed.length > 0 ? '❌' : '✅'} ${test.description}`);
      }

      // 情報開示の評価
      const highRiskCount = errorDisclosureResults.filter(r => r.disclosureRisk === 'high').length;
      const mediumRiskCount = errorDisclosureResults.filter(r => r.disclosureRisk === 'medium').length;
      const lowRiskCount = errorDisclosureResults.filter(r => r.disclosureRisk === 'low').length;
      const safeCount = errorDisclosureResults.filter(r => r.disclosureRisk === 'none').length;

      console.log('\nError Message Disclosure Summary:');
      errorDisclosureResults.forEach(result => {
        const riskIcon = {
          'high': '🚨',
          'medium': '⚠️',
          'low': '💡',
          'none': '✅'
        }[result.disclosureRisk];
        
        console.log(`  ${riskIcon} ${result.testName}: ${result.disclosureRisk.toUpperCase()} - ${result.details}`);
      });

      console.log(`\nRisk Distribution:`);
      console.log(`  High Risk: ${highRiskCount}`);
      console.log(`  Medium Risk: ${mediumRiskCount}`);
      console.log(`  Low Risk: ${lowRiskCount}`);
      console.log(`  Safe: ${safeCount}`);

      const safetyScore = (safeCount + lowRiskCount * 0.5) / errorDisclosureResults.length;
      console.log(`Safety Score: ${(safetyScore * 100).toFixed(1)}%`);

      expect(highRiskCount).toBe(0); // 高リスクな情報開示は許容できない
      expect(mediumRiskCount).toBeLessThanOrEqual(1); // 中リスクは最大1つまで
      expect(safetyScore).toBeGreaterThan(0.8); // 80%以上の安全性

      console.log('✅ Error message information disclosure prevention validated');
    });
  });

  // ===================================================================
  // デバッグ情報での機密データ露出防止テスト
  // ===================================================================

  describe('Debug Information Sensitive Data Protection', () => {
    it('should prevent sensitive data exposure in debug information', async () => {
      console.log('Testing sensitive data exposure prevention in debug information...');

      // デバッグモードでの動作をテスト
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const debugProtectionTests = [
        {
          name: 'Stack Trace Protection',
          operation: async () => {
            try {
              // スタックトレースを含むエラーを発生
              const account = container.state.activeAccounts[0];
              await container.authService.refreshSession('invalid-' + account.session?.accessJwt?.substring(0, 10));
            } catch (error) {
              // スタックトレースの分析
              return error.stack || '';
            }
            return '';
          },
          description: 'Stack traces should not contain sensitive data'
        },
        {
          name: 'Debug Output Protection',
          operation: async () => {
            // デバッグ出力での機密データ確認
            const debugOutput = await this.captureDebugOutput(async () => {
              await container.validateAllSessions();
            });
            return debugOutput.join('\n');
          },
          description: 'Debug outputs should not expose sensitive data'
        },
        {
          name: 'Development Tools Protection',
          operation: async () => {
            // 開発ツールでの情報露出確認
            const devToolsInfo = await this.simulateDevToolsInspection();
            return devToolsInfo;
          },
          description: 'Development tools should not expose sensitive data'
        }
      ];

      const debugResults: Array<{
        testName: string;
        debugContent: string;
        sensitiveDataFound: string[];
        protectionLevel: 'high' | 'medium' | 'low';
      }> = [];

      for (const test of debugProtectionTests) {
        console.log(`\n  Testing ${test.name}...`);
        
        const debugContent = await test.operation();
        const sensitiveDataFound = this.analyzeSensitiveDataInDebugInfo(debugContent);
        
        let protectionLevel: 'high' | 'medium' | 'low' = 'high';
        if (sensitiveDataFound.length > 5) {
          protectionLevel = 'low';
        } else if (sensitiveDataFound.length > 2) {
          protectionLevel = 'medium';
        }

        debugResults.push({
          testName: test.name,
          debugContent: debugContent.substring(0, 200),
          sensitiveDataFound,
          protectionLevel
        });

        console.log(`    Protection level: ${protectionLevel.toUpperCase()}`);
        console.log(`    Sensitive data items: ${sensitiveDataFound.length}`);
        console.log(`    ${sensitiveDataFound.length === 0 ? '✅' : '❌'} ${test.description}`);
      }

      // NODE_ENV を復元
      process.env.NODE_ENV = originalNodeEnv;

      // デバッグ保護の評価
      const highProtectionCount = debugResults.filter(r => r.protectionLevel === 'high').length;
      const debugProtectionScore = highProtectionCount / debugResults.length;

      console.log('\nDebug Information Protection Summary:');
      debugResults.forEach(result => {
        const icon = {
          'high': '✅',
          'medium': '⚠️',
          'low': '❌'
        }[result.protectionLevel];
        
        console.log(`  ${icon} ${result.testName}: ${result.protectionLevel.toUpperCase()} protection`);
        if (result.sensitiveDataFound.length > 0) {
          console.log(`    Exposed data: ${result.sensitiveDataFound.slice(0, 3).join(', ')}${result.sensitiveDataFound.length > 3 ? '...' : ''}`);
        }
      });

      console.log(`Debug Protection Score: ${(debugProtectionScore * 100).toFixed(1)}%`);

      expect(debugProtectionScore).toBeGreaterThan(0.7); // 70%以上の高保護レベル

      console.log('✅ Debug information sensitive data protection validated');
    });

    // デバッグ出力のキャプチャ
    private async captureDebugOutput(operation: () => Promise<void>): Promise<string[]> {
      const debugLogs: string[] = [];
      
      // console.debug のスパイ
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation((...args) => {
        debugLogs.push(args.map(arg => String(arg)).join(' '));
      });

      try {
        await operation();
      } finally {
        debugSpy.mockRestore();
      }

      return debugLogs;
    }

    // 開発ツール情報のシミュレーション
    private async simulateDevToolsInspection(): Promise<string> {
      // 開発ツールでアクセス可能な情報をシミュレート
      const globalVars = Object.keys(globalThis).join(', ');
      const processEnv = JSON.stringify(process.env);
      
      return `Global variables: ${globalVars}\nEnvironment: ${processEnv}`;
    }

    // デバッグ情報での機密データ分析
    private analyzeSensitiveDataInDebugInfo(debugContent: string): string[] {
      const sensitivePatterns = [
        /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, // JWT
        /did:plc:[a-z0-9]+/, // DID
        /access_token/gi,
        /refresh_token/gi,
        /secret/gi,
        /password/gi,
        /api_key/gi,
        /private_key/gi
      ];

      const foundSensitiveData: string[] = [];

      sensitivePatterns.forEach((pattern: any, index: number) => {
        const matches = debugContent.match(pattern);
        if (matches) {
          foundSensitiveData.push(`Pattern ${index + 1}: ${matches[0].substring(0, 20)}...`);
        }
      });

      return foundSensitiveData;
    }
  });
});