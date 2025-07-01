/**
 * E2Eテストフレームワーク
 * アバターキャッシュシステムの統合テスト用ヘルパー
 */

import type { Page, Browser, BrowserContext, Route } from '@playwright/test';

/**
 * テストコンテキスト
 */
export interface TestContext {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

/**
 * アバターキャッシュテスト結果
 */
export interface AvatarCacheTestResult {
  success: boolean;
  metrics: {
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    totalRequests: number;
    avgResponseTime: number;
    errors: number;
  };
  errors: string[];
  duration: number;
}

/**
 * パフォーマンステスト設定
 */
export interface PerformanceTestConfig {
  /** テスト対象DIDリスト */
  targetDids: string[];
  /** 同時実行数 */
  concurrency: number;
  /** テスト期間（ミリ秒） */
  duration: number;
  /** 期待ヒット率 */
  expectedHitRate: number;
  /** 期待レスポンス時間（ミリ秒） */
  expectedResponseTime: number;
}

/**
 * モックBlueskyAPIレスポンス
 */
export interface MockAPIResponse {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  delay?: number;
  error?: boolean;
  errorType?: 'network' | 'rate_limit' | 'not_found' | 'server_error';
}

/**
 * E2Eテストヘルパークラス
 */
export class AvatarCacheE2EHelper {
  constructor(private testContext: TestContext) {}

  /**
   * アプリケーションを初期化
   */
  async initializeApp(options: {
    clearCache?: boolean;
    mockResponses?: MockAPIResponse[];
    logLevel?: string;
  } = {}): Promise<void> {
    const { page } = this.testContext;

    // ローカルストレージをクリア
    if (options.clearCache) {
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    }

    // モックAPIレスポンスを設定
    if (options.mockResponses) {
      await this.setupMockAPI(options.mockResponses);
    }

    // ログレベルを設定
    if (options.logLevel) {
      await page.evaluate((level: string) => {
        (window as any).__AVATAR_CACHE_LOG_LEVEL__ = level;
      }, options.logLevel);
    }

    // アプリケーションページに移動
    await page.goto('/');
    
    // アプリケーション初期化完了を待機
    await page.waitForFunction(() => {
      return (window as any).__AVATAR_CACHE_INITIALIZED__ === true;
    }, { timeout: 10000 });
  }

  /**
   * モックAPIを設定
   */
  async setupMockAPI(responses: MockAPIResponse[]): Promise<void> {
    const { page } = this.testContext;

    await page.route('**/xrpc/com.atproto.repo.getRecord*', async (route: Route) => {
      const url = new URL(route.request().url());
      const did = url.searchParams.get('repo');
      
      const mockResponse = responses.find(r => r.did === did);
      
      if (!mockResponse) {
        await route.continue();
        return;
      }

      // 遅延をシミュレート
      if (mockResponse.delay) {
        await new Promise(resolve => setTimeout(resolve, mockResponse.delay));
      }

      // エラーレスポンスをシミュレート
      if (mockResponse.error) {
        const statusCode = this.getErrorStatusCode(mockResponse.errorType);
        await route.fulfill({
          status: statusCode,
          body: JSON.stringify({
            error: mockResponse.errorType || 'unknown_error',
            message: `Mock error for ${did}`
          })
        });
        return;
      }

      // 正常レスポンス
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          uri: `at://${did}/app.bsky.actor.profile/self`,
          value: {
            displayName: mockResponse.displayName,
            handle: mockResponse.handle,
            avatar: mockResponse.avatar
          }
        })
      });
    });
  }

  /**
   * エラータイプに応じたステータスコードを取得
   */
  private getErrorStatusCode(errorType?: string): number {
    switch (errorType) {
      case 'not_found': return 404;
      case 'rate_limit': return 429;
      case 'server_error': return 500;
      case 'network': return 0;
      default: return 500;
    }
  }

  /**
   * アバターを取得してキャッシュをテスト
   */
  async testAvatarFetch(did: string): Promise<{
    success: boolean;
    fromCache: boolean;
    duration: number;
    error?: string;
  }> {
    const { page } = this.testContext;

    const result = await page.evaluate(async (targetDid: string) => {
      const startTime = performance.now();
      
      try {
        // アバターキャッシュから取得
        const avatarCache = (window as any).__AVATAR_CACHE__;
        if (!avatarCache) {
          throw new Error('Avatar cache not initialized');
        }

        const result = await avatarCache.getAvatar(targetDid);
        const endTime = performance.now();

        return {
          success: result.success,
          fromCache: result.fromCache,
          duration: endTime - startTime,
          error: result.error
        };
      } catch (error) {
        const endTime = performance.now();
        return {
          success: false,
          fromCache: false,
          duration: endTime - startTime,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }, did);

    return result;
  }

  /**
   * 複数アバターのバッチ取得をテスト
   */
  async testBatchAvatarFetch(dids: string[]): Promise<Map<string, {
    success: boolean;
    fromCache: boolean;
    error?: string;
  }>> {
    const { page } = this.testContext;

    const result = await page.evaluate(async (targetDids: string[]) => {
      const avatarCache = (window as any).__AVATAR_CACHE__;
      if (!avatarCache) {
        throw new Error('Avatar cache not initialized');
      }

      const results = await avatarCache.getAvatars(targetDids);
      
      // Map を Object に変換（JSONシリアライズ可能にするため）
      const resultObject: Record<string, any> = {};
      for (const [did, result] of results.entries()) {
        resultObject[did] = {
          success: result.success,
          fromCache: result.fromCache,
          error: result.error
        };
      }
      
      return resultObject;
    }, dids);

    // Object を Map に戻す
    return new Map(Object.entries(result));
  }

  /**
   * キャッシュメトリクスを取得
   */
  async getCacheMetrics(): Promise<{
    cacheSize: number;
    hitRate: number;
    totalRequests: number;
    errors: number;
    dashboardData: any;
  }> {
    const { page } = this.testContext;

    return await page.evaluate(() => {
      const avatarCache = (window as any).__AVATAR_CACHE__;
      if (!avatarCache) {
        throw new Error('Avatar cache not initialized');
      }

      const stats = avatarCache.statistics;
      const dashboardData = avatarCache.dashboardData;

      return {
        cacheSize: avatarCache.cacheSize,
        hitRate: stats.hitRate,
        totalRequests: stats.totalCached + stats.missCount,
        errors: stats.errorCount,
        dashboardData
      };
    });
  }

  /**
   * キャッシュをクリア
   */
  async clearCache(): Promise<void> {
    const { page } = this.testContext;

    await page.evaluate(() => {
      const avatarCache = (window as any).__AVATAR_CACHE__;
      if (avatarCache) {
        avatarCache.clearCache();
      }
    });
  }

  /**
   * パフォーマンステストを実行
   */
  async runPerformanceTest(config: PerformanceTestConfig): Promise<AvatarCacheTestResult> {
    const startTime = performance.now();
    const errors: string[] = [];
    const metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      hitRate: 0,
      totalRequests: 0,
      avgResponseTime: 0,
      errors: 0
    };

    try {
      // 初期キャッシュクリア
      await this.clearCache();

      // 複数回のリクエストを並行実行
      const testPromises: Promise<void>[] = [];
      const responseTimes: number[] = [];

      const endTime = Date.now() + config.duration;
      
      while (Date.now() < endTime) {
        // 同時実行数分のタスクを作成
        for (let i = 0; i < config.concurrency; i++) {
          const randomDid = config.targetDids[Math.floor(Math.random() * config.targetDids.length)];
          
          const testPromise = this.testAvatarFetch(randomDid).then(result => {
            if (result.success) {
              if (result.fromCache) {
                metrics.cacheHits++;
              } else {
                metrics.cacheMisses++;
              }
              responseTimes.push(result.duration);
            } else {
              metrics.errors++;
              if (result.error) {
                errors.push(result.error);
              }
            }
          }).catch(error => {
            metrics.errors++;
            errors.push(error instanceof Error ? error.message : String(error));
          });

          testPromises.push(testPromise);
        }

        // 少し待機してから次のバッチ
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 全てのリクエスト完了を待機
      await Promise.all(testPromises);

      // メトリクス計算
      metrics.totalRequests = metrics.cacheHits + metrics.cacheMisses;
      metrics.hitRate = metrics.totalRequests > 0 ? metrics.cacheHits / metrics.totalRequests : 0;
      metrics.avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0;

      const duration = performance.now() - startTime;

      // 期待値との比較
      const success = 
        metrics.hitRate >= config.expectedHitRate &&
        metrics.avgResponseTime <= config.expectedResponseTime &&
        errors.length === 0;

      return {
        success,
        metrics,
        errors,
        duration
      };

    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      
      return {
        success: false,
        metrics,
        errors,
        duration: performance.now() - startTime
      };
    }
  }

  /**
   * ネットワーク状況をシミュレート
   */
  async simulateNetworkConditions(options: {
    offline?: boolean;
    latency?: number;
    downloadSpeed?: number;
    uploadSpeed?: number;
  }): Promise<void> {
    const { context } = this.testContext;

    if (options.offline) {
      await context.setOffline(true);
    } else {
      await context.setOffline(false);
      
      // ネットワーク速度制限（Chromiumでのみサポート）
      if (options.latency || options.downloadSpeed || options.uploadSpeed) {
        const cdpSession = await context.newCDPSession((await context.pages())[0]);
        await cdpSession.send('Network.emulateNetworkConditions', {
          offline: false,
          latency: options.latency || 0,
          downloadThroughput: options.downloadSpeed || -1,
          uploadThroughput: options.uploadSpeed || -1
        });
      }
    }
  }

  /**
   * レート制限シナリオをテスト
   */
  async testRateLimitHandling(dids: string[], requestsPerSecond: number = 10): Promise<{
    success: boolean;
    retryCount: number;
    errors: string[];
    duration: number;
  }> {
    const startTime = performance.now();
    const errors: string[] = [];
    let retryCount = 0;

    try {
      // レート制限レスポンスを設定
      await this.setupMockAPI(dids.map(did => ({
        did,
        handle: `${did}.bsky.social`,
        error: true,
        errorType: 'rate_limit'
      })));

      // 短期間で大量リクエスト
      const promises = dids.map(async (did) => {
        try {
          const result = await this.testAvatarFetch(did);
          if (!result.success && result.error?.includes('rate limit')) {
            retryCount++;
          }
          return result;
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
          return { success: false, fromCache: false, duration: 0 };
        }
      });

      await Promise.all(promises);

      // メトリクス確認
      const metrics = await this.getCacheMetrics();
      
      return {
        success: retryCount > 0 && errors.length === 0, // リトライが発生し、エラーがないことを確認
        retryCount,
        errors,
        duration: performance.now() - startTime
      };

    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      
      return {
        success: false,
        retryCount,
        errors,
        duration: performance.now() - startTime
      };
    }
  }

  /**
   * メモリリークテスト
   */
  async testMemoryUsage(operations: number = 1000): Promise<{
    initialMemory: number;
    finalMemory: number;
    memoryIncrease: number;
    success: boolean;
  }> {
    const { page } = this.testContext;

    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // 大量の操作を実行
    for (let i = 0; i < operations; i++) {
      await this.testAvatarFetch(`did:plc:test${i % 10}`);
      
      // ガベージコレクションを促す
      if (i % 100 === 0) {
        await page.evaluate(() => {
          if ((window as any).gc) {
            (window as any).gc();
          }
        });
      }
    }

    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    const memoryIncrease = finalMemory - initialMemory;
    const success = memoryIncrease < (10 * 1024 * 1024); // 10MB以下の増加を許容

    return {
      initialMemory,
      finalMemory,
      memoryIncrease,
      success
    };
  }

  /**
   * ログを取得
   */
  async getLogs(): Promise<any[]> {
    const { page } = this.testContext;

    return await page.evaluate(() => {
      const logger = (window as any).__AVATAR_CACHE_LOGGER__;
      if (!logger) {
        return [];
      }

      // LocalStorageTransportからログを取得
      const transports = logger.config?.transports || [];
      const localStorageTransport = transports.find((t: any) => t.name === 'localStorage');
      
      if (localStorageTransport) {
        return localStorageTransport.getLogs();
      }

      return [];
    });
  }

  /**
   * パフォーマンス指標を取得
   */
  async getPerformanceMetrics(): Promise<{
    loadTime: number;
    domContentLoaded: number;
    firstPaint: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
  }> {
    const { page } = this.testContext;

    return await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        largestContentfulPaint: 0 // LCPは別途測定が必要
      };
    });
  }
}