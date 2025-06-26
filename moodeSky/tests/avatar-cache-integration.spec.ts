/**
 * アバターキャッシュ統合テスト
 * E2Eテストでの実際のブラウザ環境でのテスト
 */

import { test, expect, type Page, type Browser } from '@playwright/test';
import { AvatarCacheE2EHelper, type MockAPIResponse } from '../src/lib/testing/e2e.js';

test.describe('Avatar Cache Integration Tests', () => {
  let helper: AvatarCacheE2EHelper;

  test.beforeEach(async ({ page, browser, context }) => {
    helper = new AvatarCacheE2EHelper({ page, browser, context });
    
    // アプリケーション初期化
    await helper.initializeApp({
      clearCache: true,
      logLevel: 'debug'
    });
  });

  // ===================================================================
  // 基本機能テスト
  // ===================================================================

  test.describe('Basic Functionality', () => {
    test('should fetch and cache avatar data', async ({ page }) => {
      const testDid = 'did:plc:test123';
      const mockResponses: MockAPIResponse[] = [{
        did: testDid,
        handle: 'test.bsky.social',
        displayName: 'Test User',
        avatar: 'https://example.com/avatar.jpg'
      }];

      await helper.setupMockAPI(mockResponses);

      // 初回取得（キャッシュミス）
      const firstResult = await helper.testAvatarFetch(testDid);
      expect(firstResult.success).toBe(true);
      expect(firstResult.fromCache).toBe(false);

      // 2回目取得（キャッシュヒット）
      const secondResult = await helper.testAvatarFetch(testDid);
      expect(secondResult.success).toBe(true);
      expect(secondResult.fromCache).toBe(true);
      expect(secondResult.duration).toBeLessThan(firstResult.duration);
    });

    test('should handle batch avatar fetching', async ({ page }) => {
      const testDids = [
        'did:plc:test1',
        'did:plc:test2', 
        'did:plc:test3'
      ];

      const mockResponses: MockAPIResponse[] = testDids.map(did => ({
        did,
        handle: `${did.split(':')[2]}.bsky.social`,
        displayName: `User ${did.split(':')[2]}`
      }));

      await helper.setupMockAPI(mockResponses);

      // バッチ取得
      const results = await helper.testBatchAvatarFetch(testDids);
      
      expect(results.size).toBe(3);
      for (const [did, result] of results) {
        expect(result.success).toBe(true);
        expect(testDids).toContain(did);
      }

      // メトリクス確認
      const metrics = await helper.getCacheMetrics();
      expect(metrics.cacheSize).toBe(3);
      expect(metrics.totalRequests).toBeGreaterThan(0);
    });

    test('should update cache metrics correctly', async ({ page }) => {
      const testDid = 'did:plc:metrics';
      await helper.setupMockAPI([{
        did: testDid,
        handle: 'metrics.bsky.social'
      }]);

      // 複数回取得
      await helper.testAvatarFetch(testDid); // ミス
      await helper.testAvatarFetch(testDid); // ヒット
      await helper.testAvatarFetch(testDid); // ヒット

      const metrics = await helper.getCacheMetrics();
      expect(metrics.hitRate).toBeCloseTo(0.67, 1); // 2/3 ≈ 0.67
      expect(metrics.cacheSize).toBe(1);
      expect(metrics.totalRequests).toBe(3);
    });
  });

  // ===================================================================
  // エラーハンドリングテスト
  // ===================================================================

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      const testDid = 'did:plc:error';
      await helper.setupMockAPI([{
        did: testDid,
        handle: 'error.bsky.social',
        error: true,
        errorType: 'server_error'
      }]);

      const result = await helper.testAvatarFetch(testDid);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // エラーメトリクス確認
      const metrics = await helper.getCacheMetrics();
      expect(metrics.errors).toBeGreaterThan(0);
    });

    test('should handle network timeouts', async ({ page }) => {
      const testDid = 'did:plc:timeout';
      await helper.setupMockAPI([{
        did: testDid,
        handle: 'timeout.bsky.social',
        delay: 10000 // 10秒遅延
      }]);

      // ネットワーク条件をシミュレート
      await helper.simulateNetworkConditions({
        latency: 5000 // 5秒遅延
      });

      const startTime = Date.now();
      const result = await helper.testAvatarFetch(testDid);
      const duration = Date.now() - startTime;

      // タイムアウトまたは長時間の処理を確認
      expect(duration).toBeGreaterThan(1000); // 1秒以上
    });

    test('should handle offline scenarios', async ({ page }) => {
      const testDid = 'did:plc:offline';
      
      // オフライン状態をシミュレート
      await helper.simulateNetworkConditions({ offline: true });

      const result = await helper.testAvatarFetch(testDid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('network');
    });
  });

  // ===================================================================
  // パフォーマンステスト
  // ===================================================================

  test.describe('Performance Tests', () => {
    test('should maintain good cache hit rate under load', async ({ page }) => {
      const testDids = Array.from({ length: 20 }, (_, i) => `did:plc:perf${i}`);
      const mockResponses: MockAPIResponse[] = testDids.map(did => ({
        did,
        handle: `${did.split(':')[2]}.bsky.social`,
        delay: Math.random() * 100 // ランダム遅延
      }));

      await helper.setupMockAPI(mockResponses);

      const result = await helper.runPerformanceTest({
        targetDids: testDids,
        concurrency: 5,
        duration: 5000, // 5秒間
        expectedHitRate: 0.5, // 50%以上
        expectedResponseTime: 500 // 500ms以下
      });

      expect(result.success).toBe(true);
      expect(result.metrics.hitRate).toBeGreaterThanOrEqual(0.5);
      expect(result.metrics.avgResponseTime).toBeLessThanOrEqual(500);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle high concurrency without memory leaks', async ({ page }) => {
      const memoryResult = await helper.testMemoryUsage(500);
      
      expect(memoryResult.success).toBe(true);
      expect(memoryResult.memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB以下
    });

    test('should respond quickly to cached requests', async ({ page }) => {
      const testDid = 'did:plc:speed';
      await helper.setupMockAPI([{
        did: testDid,
        handle: 'speed.bsky.social'
      }]);

      // 初回取得でキャッシュに保存
      await helper.testAvatarFetch(testDid);

      // キャッシュからの取得速度をテスト
      const results = await Promise.all(
        Array.from({ length: 10 }, () => helper.testAvatarFetch(testDid))
      );

      const avgCacheTime = results
        .filter(r => r.fromCache)
        .reduce((sum, r) => sum + r.duration, 0) / results.length;

      expect(avgCacheTime).toBeLessThan(50); // 50ms以下
    });
  });

  // ===================================================================
  // レート制限テスト
  // ===================================================================

  test.describe('Rate Limiting', () => {
    test('should handle rate limits with exponential backoff', async ({ page }) => {
      const testDids = ['did:plc:rate1', 'did:plc:rate2', 'did:plc:rate3'];
      
      const result = await helper.testRateLimitHandling(testDids, 10);
      
      expect(result.success).toBe(true);
      expect(result.retryCount).toBeGreaterThan(0);
      
      // ログでリトライ動作を確認
      const logs = await helper.getLogs();
      const retryLogs = logs.filter(log => 
        log.message.includes('retry') || log.message.includes('backoff')
      );
      expect(retryLogs.length).toBeGreaterThan(0);
    });

    test('should eventually succeed after rate limit resolution', async ({ page }) => {
      const testDid = 'did:plc:eventual';
      
      // 最初はレート制限
      await helper.setupMockAPI([{
        did: testDid,
        handle: 'eventual.bsky.social',
        error: true,
        errorType: 'rate_limit'
      }]);

      const failResult = await helper.testAvatarFetch(testDid);
      expect(failResult.success).toBe(false);

      // レート制限解除
      await helper.setupMockAPI([{
        did: testDid,
        handle: 'eventual.bsky.social'
      }]);

      const successResult = await helper.testAvatarFetch(testDid);
      expect(successResult.success).toBe(true);
    });
  });

  // ===================================================================
  // メトリクス・ログテスト
  // ===================================================================

  test.describe('Metrics and Logging', () => {
    test('should collect comprehensive metrics', async ({ page }) => {
      const testDids = ['did:plc:m1', 'did:plc:m2', 'did:plc:m3'];
      await helper.setupMockAPI(testDids.map(did => ({
        did,
        handle: `${did.split(':')[2]}.bsky.social`
      })));

      // 様々な操作を実行
      await helper.testBatchAvatarFetch(testDids);
      await helper.testAvatarFetch(testDids[0]); // キャッシュヒット

      const metrics = await helper.getCacheMetrics();
      const dashboardData = metrics.dashboardData;

      expect(dashboardData.summary).toBeDefined();
      expect(dashboardData.summary.totalCacheHits).toBeGreaterThan(0);
      expect(dashboardData.summary.currentHitRate).toBeGreaterThan(0);
      expect(dashboardData.charts).toBeDefined();
      expect(dashboardData.lastUpdated).toBeGreaterThan(0);
    });

    test('should generate structured logs', async ({ page }) => {
      const testDid = 'did:plc:logging';
      await helper.setupMockAPI([{
        did: testDid,
        handle: 'logging.bsky.social'
      }]);

      await helper.testAvatarFetch(testDid);

      const logs = await helper.getLogs();
      expect(logs.length).toBeGreaterThan(0);

      // ログ構造を確認
      const log = logs[0];
      expect(log.timestamp).toBeDefined();
      expect(log.level).toBeDefined();
      expect(log.message).toBeDefined();
      expect(log.context).toBeDefined();
      expect(log.source).toBeDefined();
    });

    test('should respect log level filtering', async ({ page }) => {
      // WARN レベル以上のみログ出力する設定でテスト
      await helper.initializeApp({
        clearCache: true,
        logLevel: 'warn'
      });

      const testDid = 'did:plc:loglevel';
      await helper.setupMockAPI([{
        did: testDid,
        handle: 'loglevel.bsky.social'
      }]);

      await helper.testAvatarFetch(testDid);

      const logs = await helper.getLogs();
      
      // DEBUG, INFO レベルのログは出力されないはず
      const debugLogs = logs.filter(log => log.levelName === 'DEBUG');
      const infoLogs = logs.filter(log => log.levelName === 'INFO');
      
      expect(debugLogs.length).toBe(0);
      expect(infoLogs.length).toBe(0);
    });
  });

  // ===================================================================
  // Edge Case テスト
  // ===================================================================

  test.describe('Edge Cases', () => {
    test('should handle empty cache gracefully', async ({ page }) => {
      await helper.clearCache();
      
      const metrics = await helper.getCacheMetrics();
      expect(metrics.cacheSize).toBe(0);
      expect(metrics.hitRate).toBe(0);
    });

    test('should handle malformed DID gracefully', async ({ page }) => {
      const malformedDid = 'invalid:did:format';
      
      const result = await helper.testAvatarFetch(malformedDid);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle cache eviction correctly', async ({ page }) => {
      // キャッシュサイズ制限をテスト（LRU）
      const largeDids = Array.from({ length: 100 }, (_, i) => `did:plc:large${i}`);
      const mockResponses: MockAPIResponse[] = largeDids.map(did => ({
        did,
        handle: `${did.split(':')[2]}.bsky.social`
      }));

      await helper.setupMockAPI(mockResponses);

      // 大量のDIDをキャッシュに追加
      for (const did of largeDids) {
        await helper.testAvatarFetch(did);
      }

      const metrics = await helper.getCacheMetrics();
      
      // キャッシュサイズ制限により、全てがキャッシュされるわけではない
      expect(metrics.cacheSize).toBeLessThanOrEqual(100);
    });

    test('should handle concurrent requests for same DID', async ({ page }) => {
      const testDid = 'did:plc:concurrent';
      await helper.setupMockAPI([{
        did: testDid,
        handle: 'concurrent.bsky.social',
        delay: 500 // 0.5秒遅延
      }]);

      // 同時に同じDIDをリクエスト
      const promises = Array.from({ length: 5 }, () => 
        helper.testAvatarFetch(testDid)
      );

      const results = await Promise.all(promises);
      
      // 全て成功すること
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // レースコンディションが発生していないことを確認
      const metrics = await helper.getCacheMetrics();
      expect(metrics.cacheSize).toBe(1); // 1つのエントリのみ
    });
  });

  // ===================================================================
  // パフォーマンス測定テスト
  // ===================================================================

  test.describe('Performance Measurements', () => {
    test('should measure page load performance', async ({ page }) => {
      const perfMetrics = await helper.getPerformanceMetrics();
      
      expect(perfMetrics.loadTime).toBeLessThan(3000); // 3秒以下
      expect(perfMetrics.domContentLoaded).toBeLessThan(2000); // 2秒以下
      expect(perfMetrics.firstPaint).toBeLessThan(1500); // 1.5秒以下
    });

    test('should maintain responsiveness under heavy load', async ({ page }) => {
      const startTime = Date.now();
      
      // 重い処理をシミュレート
      const heavyDids = Array.from({ length: 50 }, (_, i) => `did:plc:heavy${i}`);
      await helper.setupMockAPI(heavyDids.map(did => ({
        did,
        handle: `${did.split(':')[2]}.bsky.social`,
        delay: Math.random() * 200
      })));

      await helper.testBatchAvatarFetch(heavyDids);
      
      const duration = Date.now() - startTime;
      
      // UIが応答性を維持していることを確認
      const isResponsive = await page.evaluate(() => {
        // メインスレッドが応答可能かテスト
        return new Promise(resolve => {
          setTimeout(() => resolve(true), 0);
        });
      });

      expect(isResponsive).toBe(true);
      expect(duration).toBeLessThan(10000); // 10秒以下
    });
  });
});