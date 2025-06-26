/**
 * アバターキャッシュ設定システム テストスイート
 * 環境検出と動的設定生成の検証
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DEFAULT_AVATAR_CACHE_CONFIG,
  ENVIRONMENT_CONFIGS,
  BROWSER_PERFORMANCE_CONFIGS,
  detectEnvironment,
  detectBrowserPerformance,
  createOptimalConfig,
  createCustomConfig
} from './avatarCache.js';

describe('Avatar Cache Configuration', () => {
  // ===================================================================
  // デフォルト設定テスト
  // ===================================================================

  it('should have valid default configuration', () => {
    expect(DEFAULT_AVATAR_CACHE_CONFIG.ttl).toBeGreaterThan(0);
    expect(DEFAULT_AVATAR_CACHE_CONFIG.staleTtl).toBeGreaterThan(DEFAULT_AVATAR_CACHE_CONFIG.ttl);
    expect(DEFAULT_AVATAR_CACHE_CONFIG.maxCacheSize).toBeGreaterThan(0);
    expect(DEFAULT_AVATAR_CACHE_CONFIG.batchSize).toBeGreaterThan(0);
    expect(DEFAULT_AVATAR_CACHE_CONFIG.maxRetries).toBeGreaterThan(0);
    expect(DEFAULT_AVATAR_CACHE_CONFIG.retryDelay).toBeGreaterThan(0);
  });

  it('should have development configuration with shorter TTL', () => {
    const devConfig = ENVIRONMENT_CONFIGS.development;
    expect(devConfig?.ttl).toBeLessThan(DEFAULT_AVATAR_CACHE_CONFIG.ttl);
    expect(devConfig?.maxCacheSize).toBeLessThan(DEFAULT_AVATAR_CACHE_CONFIG.maxCacheSize);
  });

  it('should have production configuration with longer TTL', () => {
    const prodConfig = ENVIRONMENT_CONFIGS.production;
    expect(prodConfig?.ttl).toBeGreaterThan(DEFAULT_AVATAR_CACHE_CONFIG.ttl);
    expect(prodConfig?.maxCacheSize).toBeGreaterThan(DEFAULT_AVATAR_CACHE_CONFIG.maxCacheSize);
  });

  it('should have test configuration with minimal settings', () => {
    const testConfig = ENVIRONMENT_CONFIGS.test;
    expect(testConfig?.ttl).toBeLessThan(DEFAULT_AVATAR_CACHE_CONFIG.ttl);
    expect(testConfig?.maxRetries).toBeLessThan(DEFAULT_AVATAR_CACHE_CONFIG.maxRetries);
    expect(testConfig?.retryDelay).toBeLessThan(DEFAULT_AVATAR_CACHE_CONFIG.retryDelay);
  });

  // ===================================================================
  // 環境検出テスト
  // ===================================================================

  it('should detect development environment in DEV mode', () => {
    // Vite環境変数をモック
    vi.stubGlobal('import', {
      meta: {
        env: {
          DEV: true,
          VITE_USER_NODE_ENV: undefined
        }
      }
    });

    const env = detectEnvironment();
    expect(env).toBe('development');
  });

  it('should detect test environment with VITE_USER_NODE_ENV', () => {
    vi.stubGlobal('import', {
      meta: {
        env: {
          DEV: false,
          VITE_USER_NODE_ENV: 'test'
        }
      }
    });

    const env = detectEnvironment();
    expect(env).toBe('test');
  });

  it('should detect production environment by default', () => {
    vi.stubGlobal('import', {
      meta: {
        env: {
          DEV: false,
          VITE_USER_NODE_ENV: undefined
        }
      }
    });

    const env = detectEnvironment();
    expect(env).toBe('production');
  });

  // ===================================================================
  // ブラウザパフォーマンス検出テスト
  // ===================================================================

  it('should detect mobile devices', () => {
    // User Agentをモック
    Object.defineProperty(global.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      configurable: true
    });

    const perf = detectBrowserPerformance();
    expect(perf).toBe('mobile');
  });

  it('should detect desktop by default', () => {
    Object.defineProperty(global.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      configurable: true
    });

    const perf = detectBrowserPerformance();
    expect(perf).toBe('desktop');
  });

  it('should detect low-end devices with limited memory', () => {
    Object.defineProperty(global.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      configurable: true
    });

    // メモリ情報をモック（低スペック）
    Object.defineProperty(global.performance, 'memory', {
      value: {
        jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
      },
      configurable: true
    });

    const perf = detectBrowserPerformance();
    expect(perf).toBe('lowEnd');
  });

  // ===================================================================
  // 最適設定生成テスト
  // ===================================================================

  it('should create optimal configuration for development', () => {
    vi.stubGlobal('import', {
      meta: {
        env: {
          DEV: true,
          VITE_USER_NODE_ENV: undefined
        }
      }
    });

    Object.defineProperty(global.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      configurable: true
    });

    const config = createOptimalConfig();
    
    // 開発環境設定が適用されているか確認
    expect(config.ttl).toBe(ENVIRONMENT_CONFIGS.development?.ttl);
    expect(config.maxCacheSize).toBe(BROWSER_PERFORMANCE_CONFIGS.desktop?.maxCacheSize);
  });

  it('should create optimal configuration for production mobile', () => {
    vi.stubGlobal('import', {
      meta: {
        env: {
          DEV: false,
          VITE_USER_NODE_ENV: undefined
        }
      }
    });

    Object.defineProperty(global.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      configurable: true
    });

    const config = createOptimalConfig();
    
    // 本番環境 + モバイル設定が適用されているか確認
    expect(config.ttl).toBe(BROWSER_PERFORMANCE_CONFIGS.mobile?.ttl); // モバイル設定が優先
    expect(config.maxRetries).toBe(ENVIRONMENT_CONFIGS.production?.maxRetries);
  });

  // ===================================================================
  // カスタム設定テスト
  // ===================================================================

  it('should create custom configuration with overrides', () => {
    const customOverrides = {
      ttl: 60000,
      maxCacheSize: 500,
      batchSize: 15
    };

    const config = createCustomConfig(customOverrides);
    
    expect(config.ttl).toBe(customOverrides.ttl);
    expect(config.maxCacheSize).toBe(customOverrides.maxCacheSize);
    expect(config.batchSize).toBe(customOverrides.batchSize);
    
    // オーバーライドされていない値はデフォルトが使用される
    expect(config.maxRetries).toBeDefined();
    expect(config.retryDelay).toBeDefined();
  });

  // ===================================================================
  // ブラウザパフォーマンス設定テスト
  // ===================================================================

  it('should have mobile configuration with reduced cache size', () => {
    const mobileConfig = BROWSER_PERFORMANCE_CONFIGS.mobile;
    expect(mobileConfig?.maxCacheSize).toBeLessThan(DEFAULT_AVATAR_CACHE_CONFIG.maxCacheSize);
    expect(mobileConfig?.batchSize).toBeLessThan(DEFAULT_AVATAR_CACHE_CONFIG.batchSize);
  });

  it('should have desktop configuration with enhanced settings', () => {
    const desktopConfig = BROWSER_PERFORMANCE_CONFIGS.desktop;
    expect(desktopConfig?.maxCacheSize).toBeGreaterThan(DEFAULT_AVATAR_CACHE_CONFIG.maxCacheSize);
    expect(desktopConfig?.batchSize).toBeGreaterThan(DEFAULT_AVATAR_CACHE_CONFIG.batchSize);
  });

  it('should have low-end configuration with minimal resources', () => {
    const lowEndConfig = BROWSER_PERFORMANCE_CONFIGS.lowEnd;
    expect(lowEndConfig?.maxCacheSize).toBeLessThan(DEFAULT_AVATAR_CACHE_CONFIG.maxCacheSize);
    expect(lowEndConfig?.maxRetries).toBeLessThan(DEFAULT_AVATAR_CACHE_CONFIG.maxRetries);
  });

  // ===================================================================
  // 設定値の一貫性テスト
  // ===================================================================

  it('should ensure stale TTL is always greater than TTL', () => {
    const environments = ['development', 'test', 'production'];
    
    environments.forEach(env => {
      const envConfig = ENVIRONMENT_CONFIGS[env];
      if (envConfig?.ttl && envConfig?.staleTtl) {
        expect(envConfig.staleTtl).toBeGreaterThan(envConfig.ttl);
      }
    });
  });

  it('should ensure batch size is reasonable for cache size', () => {
    const configs = Object.values(BROWSER_PERFORMANCE_CONFIGS);
    
    configs.forEach(config => {
      if (config?.batchSize && config?.maxCacheSize) {
        // バッチサイズはキャッシュサイズの1/4以下であるべき
        expect(config.batchSize).toBeLessThanOrEqual(config.maxCacheSize / 4);
      }
    });
  });
});