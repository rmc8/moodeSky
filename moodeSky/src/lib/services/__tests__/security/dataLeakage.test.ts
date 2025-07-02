import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Data Leakage Prevention Tests', () => {
  let originalNodeEnv: string | undefined;
  let originalConsoleDebug: typeof console.debug;
  let originalConsoleLog: typeof console.log;

  beforeEach(() => {
    // テスト環境設定の保存
    originalNodeEnv = process.env.NODE_ENV;
    originalConsoleDebug = console.debug;
    originalConsoleLog = console.log;
  });

  afterEach(() => {
    // テスト環境設定の復元
    process.env.NODE_ENV = originalNodeEnv;
    console.debug = originalConsoleDebug;
    console.log = originalConsoleLog;
  });

  describe('Sensitive Data Sanitization', () => {
    it('should sanitize sensitive data in logs and outputs', async () => {
      console.log('\n🔒 Testing Sensitive Data Sanitization...');
      
      // 機密データのサンプル
      const sensitiveDataSamples = [
        { 
          type: 'JWT Token',
          original: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
          expected: 'eyJ0eXAi...***REDACTED***'
        },
        {
          type: 'DID',
          original: 'did:plc:abcd1234567890efghij',
          expected: 'did:plc:abcd12...***'
        },
        {
          type: 'Email',
          original: 'user@example.com',
          expected: 'u***@example.com'
        },
        {
          type: 'Session ID',
          original: 'sess_1234567890abcdef',
          expected: 'sess_***REDACTED***'
        },
        {
          type: 'Long Token',
          original: 'abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGH',
          expected: 'abcdefgh...***REDACTED***'
        }
      ];

      // サニタイゼーション結果の検証
      const sanitizationResults: Array<{
        type: string;
        original: string;
        sanitized: string;
        isProperlyMasked: boolean;
      }> = [];

      sensitiveDataSamples.forEach(sample => {
        const sanitized = this.sanitizeSensitiveData(sample.original);
        const isProperlyMasked = sanitized !== sample.original && 
                                sanitized.includes('***') || 
                                sanitized.length < sample.original.length;
        
        sanitizationResults.push({
          type: sample.type,
          original: sample.original,
          sanitized,
          isProperlyMasked
        });

        console.log(`    ${sample.type}: ${isProperlyMasked ? '✅' : '❌'} ${sample.original.substring(0, 10)}... → ${sanitized}`);
      });

      // サニタイゼーション効果の評価
      const properlyMaskedCount = sanitizationResults.filter(r => r.isProperlyMasked).length;
      const sanitizationScore = properlyMaskedCount / sanitizationResults.length;

      sanitizationResults.forEach(result => {
        if (!result.isProperlyMasked) {
          console.log(`    ⚠️ ${result.type}: Not properly masked - "${result.sanitized}"`);
        }
      });
      console.log(`Sanitization Score: ${(sanitizationScore * 100).toFixed(1)}%`);

      expect(sanitizationScore).toBeGreaterThan(0.8); // 80%以上のサニタイゼーション

      console.log('✅ Sensitive data sanitization validated');
    });

    it('should prevent debug information sensitive data exposure', async () => {
      console.log('\n🔍 Testing Debug Information Protection...');
      
      // NODE_ENVを一時的に開発モードに設定
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // デバッグ保護テスト
      const debugProtectionTests = [
        {
          name: 'Console Output Protection',
          operation: async () => {
            // コンソール出力での情報露出確認
            const debugOutput = await this.captureDebugOutput(async () => {
              console.debug('Processing token:', 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...');
              console.debug('User DID:', 'did:plc:1234567890abcdef');
              console.debug('Session:', 'sess_secret_session_id');
            });
            return debugOutput.join('\n');
          },
          description: 'Console output should not expose sensitive data'
        },
        {
          name: 'Error Stack Trace Protection',
          operation: async () => {
            // エラースタックトレースでの情報露出確認
            try {
              throw new Error('Authentication failed for did:plc:example123');
            } catch (error) {
              return (error as Error).message;
            }
          },
          description: 'Error messages should not expose sensitive identifiers'
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

      debugResults.forEach(result => {
        if (result.sensitiveDataFound.length > 0) {
          console.log(`    ⚠️ ${result.testName}: Found ${result.sensitiveDataFound.length} sensitive items`);
          console.log(`    Exposed data: ${result.sensitiveDataFound.slice(0, 3).join(', ')}${result.sensitiveDataFound.length > 3 ? '...' : ''}`);
        }
      });

      console.log(`Debug Protection Score: ${(debugProtectionScore * 100).toFixed(1)}%`);

      expect(debugProtectionScore).toBeGreaterThan(0.7); // 70%以上の高保護レベル

      console.log('✅ Debug information sensitive data protection validated');
    });

    // Helper methods for sanitization and debug protection
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
        return 'sess_***REDACTED***';
      }

      // 一般的な長いトークンのサニタイゼーション
      if (data.length > 32 && data.match(/^[a-zA-Z0-9+/=]+$/)) {
        return data.substring(0, 8) + '...***REDACTED***';
      }

      return data;
    }

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

    // デバッグ情報内の機密データ分析
    private analyzeSensitiveDataInDebugInfo(debugContent: string): string[] {
      const sensitivePatterns = [
        /eyJ[A-Za-z0-9+/=]+/, // JWT tokens
        /sess_[a-zA-Z0-9_]+/, // Session IDs
        /did:plc:[a-z0-9]+/, // DID identifiers
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email addresses
        /pk_[a-zA-Z0-9_]+/, // Private keys
        /api_key_[a-zA-Z0-9_]+/ // API keys
      ];

      const foundSensitiveData: string[] = [];
      
      sensitivePatterns.forEach(pattern => {
        const matches = debugContent.match(pattern);
        if (matches) {
          foundSensitiveData.push(...matches);
        }
      });

      return [...new Set(foundSensitiveData)]; // 重複除去
    }
  });

  describe('Memory-based Data Protection', () => {
    it('should prevent memory-based data leakage during processing', async () => {
      console.log('\n🧠 Testing Memory-based Data Leakage Prevention...');
      
      // メモリリークテストのセットアップ
      const sensitiveTestData = {
        accessToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
        refreshToken: 'rt_1234567890abcdef...',
        did: 'did:plc:abcd1234567890',
        sessionId: 'sess_sensitive_session_12345',
        userEmail: 'user@example.com',
        privateKey: 'pk_super_secret_key_data_here',
        internalApiKey: 'api_key_internal_service_access'
      };

      // 機密データを使用する処理のシミュレーション
      const processingSamples = [
        {
          name: 'Authentication Processing',
          operation: async () => {
            // 認証処理での機密データ使用をシミュレート
            const token = sensitiveTestData.accessToken;
            const processedToken = token.substring(0, 20); // 処理のシミュレート
            return processedToken;
          },
          description: 'Should not expose tokens in memory'
        },
        {
          name: 'Session Management',
          operation: async () => {
            // セッション管理での機密データ使用をシミュレート
            const sessionData = { 
              id: sensitiveTestData.sessionId,
              user: sensitiveTestData.did,
              created: Date.now()
            };
            return JSON.stringify(sessionData);
          },
          description: 'Should not expose session data in memory'
        },
        {
          name: 'User Profile Processing',
          operation: async () => {
            // ユーザープロファイル処理での機密データ使用をシミュレート
            const profile = {
              email: sensitiveTestData.userEmail,
              did: sensitiveTestData.did,
              preferences: { theme: 'dark' }
            };
            return JSON.stringify(profile);
          },
          description: 'Should not expose user data in memory'
        }
      ];

      // 各処理のメモリリーク検証
      const memoryLeakageResults: Array<{
        processName: string;
        sensitiveDataFound: string[];
        memoryCleanStatus: 'clean' | 'leaked' | 'partial';
      }> = [];

      for (const sample of processingSamples) {
        console.log(`\n  Processing ${sample.name}...`);
        
        // 処理実行
        await sample.operation();
        
        // メモリクリーンアップ試行
        await this.simulateMemoryCleanup();
        
        // クリーンアップ後のメモリ状態分析
        const afterProcessing = await this.captureMemorySnapshot();
        
        // メモリ内の機密データ検出
        const sensitiveDataFound = this.analyzeSensitiveDataInMemory(afterProcessing);
        
        let memoryCleanStatus: 'clean' | 'leaked' | 'partial' = 'clean';
        if (sensitiveDataFound.length > 3) {
          memoryCleanStatus = 'leaked';
        } else if (sensitiveDataFound.length > 0) {
          memoryCleanStatus = 'partial';
        }

        memoryLeakageResults.push({
          processName: sample.name,
          sensitiveDataFound,
          memoryCleanStatus
        });

        console.log(`    Memory Status: ${memoryCleanStatus.toUpperCase()}`);
        console.log(`    Sensitive items: ${sensitiveDataFound.length}`);
        console.log(`    ${sensitiveDataFound.length === 0 ? '✅' : '❌'} ${sample.description}`);
      }

      // メモリリーク防止の評価
      const cleanProcesses = memoryLeakageResults.filter(r => r.memoryCleanStatus === 'clean').length;
      const memorySecurityScore = cleanProcesses / memoryLeakageResults.length;

      memoryLeakageResults.forEach(result => {
        if (result.sensitiveDataFound.length > 0) {
          console.log(`    ⚠️ ${result.processName}: Found ${result.sensitiveDataFound.length} sensitive items`);
          console.log(`    Leaked data: ${result.sensitiveDataFound.slice(0, 2).join(', ')}${result.sensitiveDataFound.length > 2 ? '...' : ''}`);
        }
      });

      console.log(`Memory Security Score: ${(memorySecurityScore * 100).toFixed(1)}%`);

      expect(memorySecurityScore).toBeGreaterThan(0.7); // 70%以上のプロセスでメモリクリーン

      console.log('✅ Memory-based data leakage prevention validated');
    });
  });
});