/**
 * アバターキャッシュ設定
 * 環境変数やビルド設定で動的に調整可能
 */

import type { AvatarCacheConfig } from '$lib/types/avatarCache.js';

/**
 * デフォルトのアバターキャッシュ設定
 */
export const DEFAULT_AVATAR_CACHE_CONFIG: AvatarCacheConfig = {
  ttl: 30 * 60 * 1000,          // 30分（有効期限）
  staleTtl: 2 * 60 * 60 * 1000, // 2時間（stale期限）
  maxCacheSize: 1000,           // 最大1000アカウント
  batchSize: 25,                // 一度に25アカウントまで取得
  maxRetries: 3,                // 最大3回リトライ
  retryDelay: 1000              // 1秒間隔
};

/**
 * 環境に応じたアバターキャッシュ設定
 */
export const ENVIRONMENT_CONFIGS: Record<string, Partial<AvatarCacheConfig>> = {
  development: {
    ttl: 5 * 60 * 1000,         // 開発環境：5分（短い有効期限）
    maxCacheSize: 100,           // 開発環境：小さなキャッシュ
    batchSize: 10                // 開発環境：小さなバッチサイズ
  },
  
  test: {
    ttl: 1 * 60 * 1000,         // テスト環境：1分（非常に短い）
    staleTtl: 2 * 60 * 1000,    // テスト環境：2分
    maxCacheSize: 50,            // テスト環境：最小限のキャッシュ
    batchSize: 5,                // テスト環境：小さなバッチ
    maxRetries: 1,               // テスト環境：リトライ最小限
    retryDelay: 100              // テスト環境：高速リトライ
  },
  
  production: {
    ttl: 60 * 60 * 1000,        // 本番環境：1時間（長い有効期限）
    staleTtl: 4 * 60 * 60 * 1000, // 本番環境：4時間
    maxCacheSize: 2000,          // 本番環境：大きなキャッシュ
    batchSize: 50,               // 本番環境：大きなバッチサイズ
    maxRetries: 5,               // 本番環境：多めのリトライ
    retryDelay: 2000             // 本番環境：安全なリトライ間隔
  }
};

/**
 * ブラウザ環境での設定調整
 */
export const BROWSER_PERFORMANCE_CONFIGS: Record<string, Partial<AvatarCacheConfig>> = {
  // モバイル端末での軽量設定
  mobile: {
    maxCacheSize: 200,
    batchSize: 10,
    ttl: 15 * 60 * 1000         // 15分（メモリ節約）
  },
  
  // デスクトップでの高性能設定
  desktop: {
    maxCacheSize: 1500,
    batchSize: 30,
    ttl: 45 * 60 * 1000         // 45分（長めのキャッシュ）
  },
  
  // 低スペック端末での最小設定
  lowEnd: {
    maxCacheSize: 100,
    batchSize: 5,
    ttl: 10 * 60 * 1000,        // 10分
    maxRetries: 2
  }
};

/**
 * 現在の環境を検出
 */
export function detectEnvironment(): string {
  if (typeof window === 'undefined') {
    return 'development'; // SSRやテスト環境
  }
  
  // Vite環境変数からの検出
  if (import.meta.env.DEV) {
    return 'development';
  }
  
  if (import.meta.env.VITE_USER_NODE_ENV === 'test') {
    return 'test';
  }
  
  return 'production';
}

/**
 * ブラウザのパフォーマンス特性を検出
 */
export function detectBrowserPerformance(): string {
  if (typeof window === 'undefined') {
    return 'desktop'; // デフォルト
  }
  
  // モバイル端末の検出
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  if (isMobile) {
    return 'mobile';
  }
  
  // メモリ情報がある場合は低スペック端末を検出
  if ('memory' in performance && (performance as any).memory) {
    const memoryInfo = (performance as any).memory;
    // 4GB未満のメモリの場合は低スペック扱い
    if (memoryInfo.jsHeapSizeLimit < 4 * 1024 * 1024 * 1024) {
      return 'lowEnd';
    }
  }
  
  return 'desktop';
}

/**
 * 環境とブラウザ特性に基づいて最適な設定を生成
 */
export function createOptimalConfig(): AvatarCacheConfig {
  const environment = detectEnvironment();
  const browserPerf = detectBrowserPerformance();
  
  const envConfig = ENVIRONMENT_CONFIGS[environment] || {};
  const perfConfig = BROWSER_PERFORMANCE_CONFIGS[browserPerf] || {};
  
  // デフォルト設定に環境設定とブラウザ設定を適用
  const finalConfig: AvatarCacheConfig = {
    ...DEFAULT_AVATAR_CACHE_CONFIG,
    ...envConfig,
    ...perfConfig
  };
  
  console.log(`🎭 [AvatarCache] Config: env=${environment}, perf=${browserPerf}`, finalConfig);
  
  return finalConfig;
}

/**
 * カスタム設定での上書き
 */
export function createCustomConfig(overrides: Partial<AvatarCacheConfig>): AvatarCacheConfig {
  const baseConfig = createOptimalConfig();
  
  return {
    ...baseConfig,
    ...overrides
  };
}