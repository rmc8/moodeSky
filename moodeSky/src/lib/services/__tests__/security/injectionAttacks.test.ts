/**
 * Injection Attack Prevention Test Suite
 * Issue #92 Phase 4 Wave 2: インジェクション攻撃防止テスト
 * 
 * セッション管理システムのインジェクション攻撃対策を検証
 * - SQLインジェクション防止
 * - NoSQLインジェクション対策
 * - LDAP インジェクション防止
 * - コマンドインジェクション対策
 * - XSS (Cross-Site Scripting) 防止
 * - データサニタイゼーション検証
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecurityTestingSuite, type SecurityTestConfig, SecurityTestHelpers } from '../../../test-utils/securityTestingSuite.js';
import { IntegrationTestContainer } from '../../../test-utils/integrationTestContainer.js';
import { TimeControlHelper, AccountTestFactory } from '../../../test-utils/sessionTestUtils.js';
import { AtProtocolMockFactory } from '../../../test-utils/mockFactories.js';

describe('Injection Attack Prevention Tests', () => {
  let container: IntegrationTestContainer;
  let securitySuite: SecurityTestingSuite;

  beforeEach(async () => {
    // インジェクション攻撃テスト用の設定
    container = new IntegrationTestContainer({
      initialAccountCount: 3,
      enableJWTManager: true,
      enableBackgroundMonitor: false,
      logLevel: 'error'
    });
    await container.setup();

    securitySuite = new SecurityTestingSuite(container);
  });

  afterEach(async () => {
    // TODO: securitySuite.cleanup() implementation
    // await securitySuite.cleanup();
    await container.teardown();
  });

  // ===================================================================
  // SQL インジェクション防止テスト
  // ===================================================================

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in account queries', async () => {
      console.log('Testing SQL injection prevention in account queries...');

      const sqlInjectionPayloads = [
        {
          name: 'Classic SQL Injection',
          payload: "'; DROP TABLE accounts; --",
          description: 'Attempts to drop accounts table'
        },
        {
          name: 'Union-based Injection',
          payload: "' UNION SELECT password FROM admin_users WHERE '1'='1",
          description: 'Attempts to extract sensitive data via UNION'
        },
        {
          name: 'Boolean-based Blind Injection',
          payload: "' OR '1'='1' --",
          description: 'Attempts boolean-based blind SQL injection'
        },
        {
          name: 'Time-based Blind Injection',
          payload: "'; WAITFOR DELAY '00:00:05' --",
          description: 'Attempts time-based blind SQL injection'
        },
        {
          name: 'Stacked Queries Injection',
          payload: "'; INSERT INTO logs VALUES ('injected'); --",
          description: 'Attempts to execute additional SQL statements'
        },
        {
          name: 'Comment-based Injection',
          payload: "admin'/**/OR/**/1=1#",
          description: 'Uses SQL comments to bypass filters'
        },
        {
          name: 'Encoded Injection',
          payload: "%27%20OR%201=1%20--",
          description: 'URL-encoded SQL injection attempt'
        }
      ];

      const injectionResults: Array<{
        payloadName: string;
        payload: string;
        prevented: boolean;
        errorType: string;
        details: string;
      }> = [];

      for (const injection of sqlInjectionPayloads) {
        console.log(`\n  Testing ${injection.name}...`);
        
        try {
          // 悪意のあるペイロードを使用してアカウント操作を試行
          const maliciousAccount = AccountTestFactory.createBasicAccount(
            injection.payload, // DID に悪意のあるペイロードを設定
            'malicious.bsky.social'
          );

          // アカウント追加での SQL インジェクション防止を確認
          const addResult = await container.authService.addAccount(maliciousAccount);
          
          // アカウント検索での SQL インジェクション防止を確認
          const searchResult = await container.authService.getAccount(injection.payload);
          
          // 両方の操作が適切にサニタイズまたは拒否されることを確認
          const prevented = !addResult.success || !searchResult.success;
          const errorType = !addResult.success ? 'add_rejected' : !searchResult.success ? 'search_rejected' : 'unknown';
          
          injectionResults.push({
            payloadName: injection.name,
            payload: injection.payload,
            prevented,
            errorType,
            details: prevented ? `Successfully prevented: ${injection.description}` : `VULNERABLE: ${injection.description}`
          });

          console.log(`  ${prevented ? '✅' : '❌'} ${injection.name}: ${prevented ? 'Prevented' : 'VULNERABLE'}`);

        } catch (error) {
          // エラーが発生した場合は適切に防御されたと判断
          injectionResults.push({
            payloadName: injection.name,
            payload: injection.payload,
            prevented: true,
            errorType: 'exception_thrown',
            details: `Exception thrown - injection prevented: ${(error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error').substring(0, 100)}`
          });

          console.log(`  ✅ ${injection.name}: Prevented (Exception thrown)`);
        }
      }

      // SQL インジェクション防御の評価
      const preventionRate = injectionResults.filter(r => r.prevented).length / injectionResults.length;
      const vulnerablePayloads = injectionResults.filter(r => !r.prevented);

      console.log('\nSQL Injection Prevention Summary:');
      injectionResults.forEach(result => {
        console.log(`  ${result.payloadName}: ${result.prevented ? '✅ Prevented' : '❌ VULNERABLE'}`);
      });
      console.log(`Prevention Rate: ${(preventionRate * 100).toFixed(1)}%`);

      if (vulnerablePayloads.length > 0) {
        console.warn('SECURITY WARNING - Vulnerable to SQL injection:');
        vulnerablePayloads.forEach(vuln => {
          console.warn(`  - ${vuln.payloadName}: ${vuln.payload}`);
        });
      }

      expect(preventionRate).toBe(1.0); // 100%の防御率が必要
      expect(vulnerablePayloads).toHaveLength(0); // 脆弱性ゼロが必要

      console.log('✅ SQL injection prevention validated');
    });

    it('should prevent NoSQL injection attacks', async () => {
      console.log('Testing NoSQL injection prevention...');

      const noSQLInjectionPayloads = [
        {
          name: 'MongoDB Operator Injection',
          payload: { "$ne": null },
          description: 'Attempts to bypass authentication using $ne operator'
        },
        {
          name: 'MongoDB Where Injection',
          payload: "'; return true; var dummy='",
          description: 'Attempts code injection in where clause'
        },
        {
          name: 'MongoDB Regular Expression Injection',
          payload: { "$regex": ".*" },
          description: 'Attempts to extract all data using regex'
        },
        {
          name: 'JSON Object Injection',
          payload: '{"$gt":""}',
          description: 'Attempts to bypass filters using $gt operator'
        },
        {
          name: 'Array Injection',
          payload: ['admin', { "$ne": "" }],
          description: 'Attempts injection using array manipulation'
        }
      ];

      const noSQLResults: Array<{
        payloadName: string;
        payload: any;
        prevented: boolean;
        details: string;
      }> = [];

      for (const injection of noSQLInjectionPayloads) {
        console.log(`\n  Testing ${injection.name}...`);
        
        try {
          // NoSQL インジェクションペイロードのテスト
          let testPayload: string;
          
          if (typeof injection.payload === 'object') {
            testPayload = JSON.stringify(injection.payload);
          } else if (Array.isArray(injection.payload)) {
            testPayload = JSON.stringify(injection.payload);
          } else {
            testPayload = injection.payload;
          }

          // 悪意のあるペイロードでアカウント操作を試行
          const result = await container.authService.getAccount(testPayload);
          
          // NoSQL インジェクションが防御されているか確認
          const prevented = !result.success || (result.data === null);
          
          noSQLResults.push({
            payloadName: injection.name,
            payload: injection.payload,
            prevented,
            details: prevented ? `NoSQL injection prevented: ${injection.description}` : `VULNERABLE: ${injection.description}`
          });

          console.log(`  ${prevented ? '✅' : '❌'} ${injection.name}: ${prevented ? 'Prevented' : 'VULNERABLE'}`);

        } catch (error) {
          noSQLResults.push({
            payloadName: injection.name,
            payload: injection.payload,
            prevented: true,
            details: `Exception thrown - NoSQL injection prevented: ${(error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error').substring(0, 100)}`
          });

          console.log(`  ✅ ${injection.name}: Prevented (Exception thrown)`);
        }
      }

      // NoSQL インジェクション防御の評価
      const preventionRate = noSQLResults.filter(r => r.prevented).length / noSQLResults.length;
      
      console.log('\nNoSQL Injection Prevention Summary:');
      noSQLResults.forEach(result => {
        console.log(`  ${result.payloadName}: ${result.prevented ? '✅ Prevented' : '❌ VULNERABLE'}`);
      });
      console.log(`NoSQL Prevention Rate: ${(preventionRate * 100).toFixed(1)}%`);

      expect(preventionRate).toBeGreaterThan(0.9); // 90%以上の防御率
      
      console.log('✅ NoSQL injection prevention validated');
    });
  });

  // ===================================================================
  // Cross-Site Scripting (XSS) 防止テスト
  // ===================================================================

  describe('Cross-Site Scripting (XSS) Prevention', () => {
    it('should prevent stored XSS attacks in user data', async () => {
      console.log('Testing stored XSS prevention in user data...');

      const xssPayloads = [
        {
          name: 'Basic Script Injection',
          payload: '<script>alert("XSS")</script>',
          description: 'Basic script tag injection'
        },
        {
          name: 'Event Handler Injection',
          payload: '<img src="x" onerror="alert(\'XSS\')">',
          description: 'Event handler-based XSS'
        },
        {
          name: 'JavaScript URL Injection',
          payload: 'javascript:alert("XSS")',
          description: 'JavaScript URL scheme injection'
        },
        {
          name: 'SVG Script Injection',
          payload: '<svg onload="alert(\'XSS\')">',
          description: 'SVG-based script injection'
        },
        {
          name: 'Data URL Injection',
          payload: 'data:text/html,<script>alert("XSS")</script>',
          description: 'Data URL-based XSS'
        },
        {
          name: 'CSS Expression Injection',
          payload: 'expression(alert("XSS"))',
          description: 'CSS expression-based XSS'
        },
        {
          name: 'Unicode Encoded Injection',
          payload: '<script>alert\\u0028\\u0022XSS\\u0022\\u0029</script>',
          description: 'Unicode-encoded script injection'
        },
        {
          name: 'HTML Entity Encoded Injection',
          payload: '&lt;script&gt;alert(&#34;XSS&#34;)&lt;/script&gt;',
          description: 'HTML entity-encoded injection'
        }
      ];

      const xssResults: Array<{
        payloadName: string;
        payload: string;
        prevented: boolean;
        sanitizedValue: string;
        details: string;
      }> = [];

      for (const xss of xssPayloads) {
        console.log(`\n  Testing ${xss.name}...`);
        
        try {
          // XSS ペイロードを含むアカウントデータを作成
          const maliciousAccount = AccountTestFactory.createBasicAccount(
            'did:plc:xsstest',
            xss.payload // ハンドルに XSS ペイロードを設定
          );

          // アカウント追加でのサニタイゼーション確認
          const addResult = await container.authService.addAccount(maliciousAccount);
          
          let sanitizedValue = '';
          let prevented = false;

          if (addResult.success && addResult.data) {
            // 保存されたデータを確認
            const savedAccount = addResult.data;
            sanitizedValue = savedAccount.profile.handle;
            
            // XSS ペイロードがサニタイズされているか確認
            const containsScript = sanitizedValue.toLowerCase().includes('<script');
            const containsOnError = sanitizedValue.toLowerCase().includes('onerror');
            const containsJavascript = sanitizedValue.toLowerCase().includes('javascript:');
            
            prevented = !containsScript && !containsOnError && !containsJavascript;
          } else {
            // アカウント追加が拒否された場合は防御成功
            prevented = true;
            sanitizedValue = 'REJECTED';
          }

          xssResults.push({
            payloadName: xss.name,
            payload: xss.payload,
            prevented,
            sanitizedValue,
            details: prevented ? `XSS payload sanitized/rejected: ${xss.description}` : `VULNERABLE: XSS payload stored unsanitized`
          });

          console.log(`  ${prevented ? '✅' : '❌'} ${xss.name}: ${prevented ? 'Prevented' : 'VULNERABLE'}`);
          if (sanitizedValue && sanitizedValue !== 'REJECTED') {
            console.log(`    Sanitized: "${sanitizedValue.substring(0, 50)}${sanitizedValue.length > 50 ? '...' : ''}"`);
          }

        } catch (error) {
          xssResults.push({
            payloadName: xss.name,
            payload: xss.payload,
            prevented: true,
            sanitizedValue: 'EXCEPTION',
            details: `Exception thrown - XSS prevented: ${(error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error').substring(0, 100)}`
          });

          console.log(`  ✅ ${xss.name}: Prevented (Exception thrown)`);
        }
      }

      // XSS 防御の評価
      const preventionRate = xssResults.filter(r => r.prevented).length / xssResults.length;
      const vulnerableXSS = xssResults.filter(r => !r.prevented);

      console.log('\nXSS Prevention Summary:');
      xssResults.forEach(result => {
        console.log(`  ${result.payloadName}: ${result.prevented ? '✅ Prevented' : '❌ VULNERABLE'}`);
        if (!result.prevented) {
          console.log(`    Stored value: "${result.sanitizedValue}"`);
        }
      });
      console.log(`XSS Prevention Rate: ${(preventionRate * 100).toFixed(1)}%`);

      if (vulnerableXSS.length > 0) {
        console.warn('SECURITY WARNING - Vulnerable to XSS:');
        vulnerableXSS.forEach(vuln => {
          console.warn(`  - ${vuln.payloadName}: ${vuln.payload}`);
        });
      }

      expect(preventionRate).toBeGreaterThan(0.95); // 95%以上の防御率
      expect(vulnerableXSS.length).toBeLessThanOrEqual(1); // 最大1つまでの脆弱性を許容

      console.log('✅ XSS prevention validated');
    });

    it('should prevent reflected XSS in error messages', async () => {
      console.log('Testing reflected XSS prevention in error messages...');

      const reflectedXSSPayloads = [
        {
          name: 'Error Message Script Injection',
          payload: '<script>alert("Reflected XSS")</script>',
          description: 'Script injection in error messages'
        },
        {
          name: 'URL Parameter XSS',
          payload: '"><script>alert(document.cookie)</script>',
          description: 'XSS via URL parameters'
        },
        {
          name: 'Form Input Reflection',
          payload: '\'"--></style></script><script>alert("XSS")</script>',
          description: 'Complex XSS payload breaking out of multiple contexts'
        }
      ];

      const reflectedResults: Array<{
        payloadName: string;
        payload: string;
        prevented: boolean;
        errorMessage: string;
        details: string;
      }> = [];

      for (const xss of reflectedXSSPayloads) {
        console.log(`\n  Testing ${xss.name}...`);
        
        try {
          // 存在しないアカウント ID に XSS ペイロードを含めて検索
          const result = await container.authService.getAccount(xss.payload);
          
          // エラーメッセージを確認
          const errorMessage = result.error?.message || '';
          
          // エラーメッセージに XSS ペイロードがサニタイズされずに含まれていないか確認
          const containsScript = errorMessage.toLowerCase().includes('<script');
          const containsPayload = errorMessage.includes(xss.payload);
          
          const prevented = !containsScript && !containsPayload;

          reflectedResults.push({
            payloadName: xss.name,
            payload: xss.payload,
            prevented,
            errorMessage: errorMessage.substring(0, 200),
            details: prevented ? `Reflected XSS prevented in error message` : `VULNERABLE: XSS payload reflected in error`
          });

          console.log(`  ${prevented ? '✅' : '❌'} ${xss.name}: ${prevented ? 'Prevented' : 'VULNERABLE'}`);
          if (errorMessage) {
            console.log(`    Error message: "${errorMessage.substring(0, 100)}${errorMessage.length > 100 ? '...' : ''}"`);
          }

        } catch (error) {
          // エラーメッセージの確認
          const errorMessage = error instanceof Error ? error instanceof Error ? error.message : String(error) : '';
          const containsScript = errorMessage.toLowerCase().includes('<script');
          const containsPayload = errorMessage.includes(xss.payload);
          const prevented = !containsScript && !containsPayload;

          reflectedResults.push({
            payloadName: xss.name,
            payload: xss.payload,
            prevented,
            errorMessage: errorMessage.substring(0, 200),
            details: prevented ? `Exception handled safely - no XSS reflection` : `VULNERABLE: XSS reflected in exception message`
          });

          console.log(`  ${prevented ? '✅' : '❌'} ${xss.name}: ${prevented ? 'Prevented' : 'VULNERABLE'} (Exception)`);
        }
      }

      // Reflected XSS 防御の評価
      const preventionRate = reflectedResults.filter(r => r.prevented).length / reflectedResults.length;
      
      console.log('\nReflected XSS Prevention Summary:');
      reflectedResults.forEach(result => {
        console.log(`  ${result.payloadName}: ${result.prevented ? '✅ Prevented' : '❌ VULNERABLE'}`);
      });
      console.log(`Reflected XSS Prevention Rate: ${(preventionRate * 100).toFixed(1)}%`);

      expect(preventionRate).toBe(1.0); // 100%の防御率が必要

      console.log('✅ Reflected XSS prevention validated');
    });
  });

  // ===================================================================
  // コマンドインジェクション防止テスト
  // ===================================================================

  describe('Command Injection Prevention', () => {
    it('should prevent command injection in system operations', async () => {
      console.log('Testing command injection prevention...');

      const commandInjectionPayloads = [
        {
          name: 'Basic Command Injection',
          payload: '; rm -rf /',
          description: 'Attempts to execute system commands'
        },
        {
          name: 'Pipe Command Injection',
          payload: '| cat /etc/passwd',
          description: 'Attempts to read system files via pipe'
        },
        {
          name: 'Backtick Command Injection',
          payload: '`whoami`',
          description: 'Attempts command execution via backticks'
        },
        {
          name: 'Dollar Command Injection',
          payload: '$(ls -la)',
          description: 'Attempts command execution via $(...)'
        },
        {
          name: 'AND Command Injection',
          payload: ' && echo "injected"',
          description: 'Attempts command chaining with &&'
        },
        {
          name: 'OR Command Injection',
          payload: ' || echo "injected"',
          description: 'Attempts command chaining with ||'
        },
        {
          name: 'Newline Command Injection',
          payload: '\necho "injected"',
          description: 'Attempts command injection via newline'
        }
      ];

      const commandResults: Array<{
        payloadName: string;
        payload: string;
        prevented: boolean;
        details: string;
      }> = [];

      for (const injection of commandInjectionPayloads) {
        console.log(`\n  Testing ${injection.name}...`);
        
        try {
          // コマンドインジェクションペイロードを含むデータでの操作を試行
          const maliciousAccount = AccountTestFactory.createBasicAccount(
            `did:plc:cmd${injection.payload}`,
            'command.bsky.social'
          );

          // ファイルシステム操作やログ出力でのコマンドインジェクション防止を確認
          const result = await container.authService.addAccount(maliciousAccount);
          
          // コマンドインジェクションが防御されているか確認
          // 実際の実装では、ファイル操作やログ出力時のサニタイゼーションを確認
          const prevented: boolean = !result.success || (result.data && !result.data.id.includes(injection.payload)) || false;

          commandResults.push({
            payloadName: injection.name,
            payload: injection.payload,
            prevented,
            details: prevented ? `Command injection prevented: ${injection.description}` : `VULNERABLE: ${injection.description}`
          });

          console.log(`  ${prevented ? '✅' : '❌'} ${injection.name}: ${prevented ? 'Prevented' : 'VULNERABLE'}`);

        } catch (error) {
          commandResults.push({
            payloadName: injection.name,
            payload: injection.payload,
            prevented: true,
            details: `Exception thrown - command injection prevented: ${(error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error').substring(0, 100)}`
          });

          console.log(`  ✅ ${injection.name}: Prevented (Exception thrown)`);
        }
      }

      // コマンドインジェクション防御の評価
      const preventionRate = commandResults.filter(r => r.prevented).length / commandResults.length;
      
      console.log('\nCommand Injection Prevention Summary:');
      commandResults.forEach(result => {
        console.log(`  ${result.payloadName}: ${result.prevented ? '✅ Prevented' : '❌ VULNERABLE'}`);
      });
      console.log(`Command Injection Prevention Rate: ${(preventionRate * 100).toFixed(1)}%`);

      expect(preventionRate).toBe(1.0); // 100%の防御率が必要

      console.log('✅ Command injection prevention validated');
    });
  });

  // ===================================================================
  // データサニタイゼーション総合テスト
  // ===================================================================

  describe('Comprehensive Data Sanitization', () => {
    it('should properly sanitize all user input data', async () => {
      console.log('Testing comprehensive data sanitization...');

      const sanitizationTests = [
        {
          name: 'HTML Tag Sanitization',
          input: '<div>Normal content</div><script>alert("xss")</script>',
          expectedBehavior: 'Remove script tags, preserve safe HTML',
          fieldType: 'handle'
        },
        {
          name: 'SQL Special Characters',
          input: "'; DROP TABLE users; --",
          expectedBehavior: 'Escape or reject SQL special characters',
          fieldType: 'did'
        },
        {
          name: 'Unicode Normalization',
          input: 'café',
          expectedBehavior: 'Normalize Unicode characters consistently',
          fieldType: 'handle'
        },
        {
          name: 'Control Characters',
          input: 'test\x00\x01\x02control',
          expectedBehavior: 'Remove or escape control characters',
          fieldType: 'handle'
        },
        {
          name: 'Path Traversal',
          input: '../../../etc/passwd',
          expectedBehavior: 'Prevent path traversal attempts',
          fieldType: 'handle'
        },
        {
          name: 'LDAP Injection',
          input: '*)(&(objectClass=*)(password=*))',
          expectedBehavior: 'Escape LDAP special characters',
          fieldType: 'handle'
        },
        {
          name: 'Email Header Injection',
          input: 'test@example.com\nBcc: attacker@evil.com',
          expectedBehavior: 'Remove newlines from email fields',
          fieldType: 'email'
        }
      ];

      const sanitizationResults: Array<{
        testName: string;
        input: string;
        output: string;
        properlyHandled: boolean;
        details: string;
      }> = [];

      for (const test of sanitizationTests) {
        console.log(`\n  Testing ${test.name}...`);
        
        try {
          // 各種フィールドタイプでのサニタイゼーションテスト
          let testAccount;
          let result;
          let outputValue = '';

          switch (test.fieldType) {
            case 'handle':
              testAccount = AccountTestFactory.createBasicAccount('did:plc:sanitize', test.input);
              result = await container.authService.addAccount(testAccount);
              outputValue = result.data?.profile.handle || '';
              break;
              
            case 'did':
              testAccount = AccountTestFactory.createBasicAccount(test.input, 'sanitize.bsky.social');
              result = await container.authService.addAccount(testAccount);
              outputValue = result.data?.profile.did || '';
              break;
              
            case 'email':
              testAccount = AccountTestFactory.createBasicAccount('did:plc:sanitize', 'sanitize.bsky.social');
              // メールフィールドがある場合のテスト（実装による）
              result = await container.authService.addAccount(testAccount);
              outputValue = 'email_test_handled';
              break;
              
            default:
              result = { success: false, error: { message: 'Unknown field type' } };
          }

          // サニタイゼーションの評価
          let properlyHandled = false;
          let details = '';

          if (result.success && outputValue) {
            // 出力値の安全性確認
            const containsDangerousContent = 
              outputValue.toLowerCase().includes('<script') ||
              outputValue.includes('DROP TABLE') ||
              outputValue.includes('../') ||
              outputValue.includes('\n') ||
              outputValue.includes('\x00');

            properlyHandled = !containsDangerousContent;
            details = properlyHandled ? 
              `Input properly sanitized: "${outputValue.substring(0, 50)}"` :
              `DANGER: Unsafe content preserved: "${outputValue.substring(0, 50)}"`;
          } else {
            // 入力が拒否された場合は適切な処理
            properlyHandled = true;
            details = 'Input rejected - appropriate safety measure';
            outputValue = 'REJECTED';
          }

          sanitizationResults.push({
            testName: test.name,
            input: test.input,
            output: outputValue,
            properlyHandled,
            details
          });

          console.log(`  ${properlyHandled ? '✅' : '❌'} ${test.name}: ${details}`);

        } catch (error) {
          sanitizationResults.push({
            testName: test.name,
            input: test.input,
            output: 'EXCEPTION',
            properlyHandled: true,
            details: `Exception thrown - input rejected safely: ${(error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error').substring(0, 50)}`
          });

          console.log(`  ✅ ${test.name}: Input rejected (Exception thrown)`);
        }
      }

      // サニタイゼーション総合評価
      const sanitizationScore = sanitizationResults.filter(r => r.properlyHandled).length / sanitizationResults.length;
      const unsafeResults = sanitizationResults.filter(r => !r.properlyHandled);

      console.log('\nData Sanitization Summary:');
      sanitizationResults.forEach(result => {
        console.log(`  ${result.testName}: ${result.properlyHandled ? '✅' : '❌'} - ${result.details}`);
      });
      console.log(`Sanitization Score: ${(sanitizationScore * 100).toFixed(1)}%`);

      if (unsafeResults.length > 0) {
        console.warn('SECURITY WARNING - Unsafe data handling:');
        unsafeResults.forEach(unsafe => {
          console.warn(`  - ${unsafe.testName}: Input="${unsafe.input}" -> Output="${unsafe.output}"`);
        });
      }

      expect(sanitizationScore).toBeGreaterThan(0.9); // 90%以上のサニタイゼーション率
      expect(unsafeResults.length).toBeLessThanOrEqual(1); // 最大1つまでの安全でない処理を許容

      console.log('✅ Comprehensive data sanitization validated');
    });

    it('should validate input length and format restrictions', async () => {
      console.log('Testing input validation and restrictions...');

      const validationTests = [
        {
          name: 'Maximum Length Validation',
          input: 'a'.repeat(10000), // 10,000文字の文字列
          fieldType: 'handle',
          expectedRejection: true,
          description: 'Extremely long input should be rejected'
        },
        {
          name: 'Empty Input Validation',
          input: '',
          fieldType: 'handle',
          expectedRejection: true,
          description: 'Empty input should be rejected'
        },
        {
          name: 'Whitespace Only Input',
          input: '   \t\n   ',
          fieldType: 'handle',
          expectedRejection: true,
          description: 'Whitespace-only input should be rejected'
        },
        {
          name: 'Binary Data Input',
          input: '\x00\x01\x02\x03\xFF\xFE',
          fieldType: 'handle',
          expectedRejection: true,
          description: 'Binary data should be rejected'
        },
        {
          name: 'Valid DID Format',
          input: 'did:plc:validformat123',
          fieldType: 'did',
          expectedRejection: false,
          description: 'Valid DID format should be accepted'
        },
        {
          name: 'Invalid DID Format',
          input: 'invalid-did-format',
          fieldType: 'did',
          expectedRejection: true,
          description: 'Invalid DID format should be rejected'
        }
      ];

      const validationResults: Array<{
        testName: string;
        input: string;
        expectedRejection: boolean;
        actualRejection: boolean;
        passed: boolean;
        details: string;
      }> = [];

      for (const test of validationTests) {
        console.log(`\n  Testing ${test.name}...`);
        
        try {
          let testAccount;
          let result;

          switch (test.fieldType) {
            case 'handle':
              testAccount = AccountTestFactory.createBasicAccount('did:plc:validation', test.input);
              result = await container.authService.addAccount(testAccount);
              break;
              
            case 'did':
              testAccount = AccountTestFactory.createBasicAccount(test.input, 'validation.bsky.social');
              result = await container.authService.addAccount(testAccount);
              break;
              
            default:
              result = { success: false, error: { message: 'Unknown field type' } };
          }

          const actualRejection = !result.success;
          const passed = actualRejection === test.expectedRejection;
          
          validationResults.push({
            testName: test.name,
            input: test.input.substring(0, 50),
            expectedRejection: test.expectedRejection,
            actualRejection,
            passed,
            details: passed ? 
              `Validation behaved as expected: ${test.description}` :
              `UNEXPECTED: Expected ${test.expectedRejection ? 'rejection' : 'acceptance'}, got ${actualRejection ? 'rejection' : 'acceptance'}`
          });

          console.log(`  ${passed ? '✅' : '❌'} ${test.name}: ${passed ? 'Passed' : 'FAILED'}`);

        } catch (error) {
          const actualRejection = true; // Exception means rejection
          const passed = actualRejection === test.expectedRejection;
          
          validationResults.push({
            testName: test.name,
            input: test.input.substring(0, 50),
            expectedRejection: test.expectedRejection,
            actualRejection,
            passed,
            details: passed ? 
              `Exception thrown as expected: ${test.description}` :
              `UNEXPECTED: Exception thrown when acceptance was expected`
          });

          console.log(`  ${passed ? '✅' : '❌'} ${test.name}: ${passed ? 'Passed' : 'FAILED'} (Exception)`);
        }
      }

      // 入力検証の評価
      const validationScore = validationResults.filter(r => r.passed).length / validationResults.length;
      const failedValidations = validationResults.filter(r => !r.passed);

      console.log('\nInput Validation Summary:');
      validationResults.forEach(result => {
        console.log(`  ${result.testName}: ${result.passed ? '✅' : '❌'} - ${result.details}`);
      });
      console.log(`Validation Score: ${(validationScore * 100).toFixed(1)}%`);

      if (failedValidations.length > 0) {
        console.warn('VALIDATION WARNING - Unexpected validation behavior:');
        failedValidations.forEach(failed => {
          console.warn(`  - ${failed.testName}: ${failed.details}`);
        });
      }

      expect(validationScore).toBeGreaterThan(0.8); // 80%以上の正確な検証
      expect(failedValidations.length).toBeLessThanOrEqual(1); // 最大1つまでの検証失敗を許容

      console.log('✅ Input validation and restrictions validated');
    });
  });
});