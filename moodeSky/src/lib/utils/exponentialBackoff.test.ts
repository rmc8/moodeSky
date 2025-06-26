/**
 * ExponentialBackoff テストスイート
 * リトライ戦略とレート制限対応の検証
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ExponentialBackoff,
  createBackoff,
  BACKOFF_PRESETS,
  type ExponentialBackoffOptions,
  type RetryResult
} from './exponentialBackoff.js';

describe('ExponentialBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ===================================================================
  // 基本設定テスト
  // ===================================================================

  it('should initialize with default options', () => {
    const backoff = new ExponentialBackoff();
    const options = backoff.getOptions();

    expect(options.initialDelayMs).toBe(1000);
    expect(options.maxDelayMs).toBe(30000);
    expect(options.multiplier).toBe(2.0);
    expect(options.maxRetries).toBe(5);
    expect(options.jitterFactor).toBe(0.1);
    expect(options.jitterType).toBe('equal');
  });

  it('should initialize with custom options', () => {
    const customOptions: ExponentialBackoffOptions = {
      initialDelayMs: 500,
      maxDelayMs: 10000,
      multiplier: 3.0,
      maxRetries: 3,
      jitterFactor: 0.2,
      jitterType: 'full'
    };

    const backoff = new ExponentialBackoff(customOptions);
    const options = backoff.getOptions();

    expect(options.initialDelayMs).toBe(500);
    expect(options.maxDelayMs).toBe(10000);
    expect(options.multiplier).toBe(3.0);
    expect(options.maxRetries).toBe(3);
    expect(options.jitterFactor).toBe(0.2);
    expect(options.jitterType).toBe('full');
  });

  it('should validate options and throw errors for invalid values', () => {
    expect(() => new ExponentialBackoff({ initialDelayMs: -1 }))
      .toThrow('Initial delay must be positive');

    expect(() => new ExponentialBackoff({ maxDelayMs: -1 }))
      .toThrow('Max delay must be positive');

    expect(() => new ExponentialBackoff({ 
      initialDelayMs: 1000, 
      maxDelayMs: 500 
    })).toThrow('Max delay must be greater than or equal to initial delay');

    expect(() => new ExponentialBackoff({ multiplier: 1.0 }))
      .toThrow('Multiplier must be greater than 1');

    expect(() => new ExponentialBackoff({ maxRetries: -1 }))
      .toThrow('Max retries must be non-negative');

    expect(() => new ExponentialBackoff({ jitterFactor: 1.5 }))
      .toThrow('Jitter factor must be between 0 and 1');
  });

  // ===================================================================
  // 遅延計算テスト
  // ===================================================================

  it('should calculate exponential delays correctly', () => {
    const backoff = new ExponentialBackoff({
      initialDelayMs: 1000,
      multiplier: 2.0,
      maxDelayMs: 16000,
      jitterType: 'none'
    });

    expect(backoff.calculateDelay(0)).toBe(0);      // 初回は遅延なし
    expect(backoff.calculateDelay(1)).toBe(1000);   // 1秒
    expect(backoff.calculateDelay(2)).toBe(2000);   // 2秒
    expect(backoff.calculateDelay(3)).toBe(4000);   // 4秒
    expect(backoff.calculateDelay(4)).toBe(8000);   // 8秒
    expect(backoff.calculateDelay(5)).toBe(16000);  // 16秒（上限）
    expect(backoff.calculateDelay(6)).toBe(16000);  // 上限維持
  });

  it('should apply jitter correctly', () => {
    const backoff = new ExponentialBackoff({
      initialDelayMs: 1000,
      jitterFactor: 0.5,
      jitterType: 'equal'
    });

    // ジッターがあるので完全に同じ値にはならない
    const delay1 = backoff.calculateDelay(1);
    const delay2 = backoff.calculateDelay(1);
    
    // 基本遅延の±50%の範囲内であることを確認
    expect(delay1).toBeGreaterThanOrEqual(500);
    expect(delay1).toBeLessThanOrEqual(1500);
    expect(delay2).toBeGreaterThanOrEqual(500);
    expect(delay2).toBeLessThanOrEqual(1500);
  });

  it('should handle full jitter correctly', () => {
    const backoff = new ExponentialBackoff({
      initialDelayMs: 1000,
      jitterFactor: 1.0,
      jitterType: 'full'
    });

    const delay = backoff.calculateDelay(1);
    // フルジッターでは0から基本遅延の間の値
    expect(delay).toBeGreaterThanOrEqual(0);
    expect(delay).toBeLessThanOrEqual(1000);
  });

  it('should throw error for negative attempt number', () => {
    const backoff = new ExponentialBackoff();
    expect(() => backoff.calculateDelay(-1))
      .toThrow('Attempt number must be non-negative');
  });

  // ===================================================================
  // リトライ実行テスト
  // ===================================================================

  it('should succeed on first attempt', async () => {
    const backoff = new ExponentialBackoff();
    const operation = vi.fn().mockResolvedValue('success');

    const result = await backoff.execute(operation);

    expect(result.success).toBe(true);
    expect(result.result).toBe('success');
    expect(result.attempts).toBe(1);
    expect(result.totalDelayMs).toBe(0);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    // このテストは実時間を使用
    vi.useRealTimers();
    
    const backoff = new ExponentialBackoff({
      initialDelayMs: 10, // 短い遅延でテスト高速化
      maxRetries: 3
    });

    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValue('success');

    const result = await backoff.execute(operation);

    expect(result.success).toBe(true);
    expect(result.result).toBe('success');
    expect(result.attempts).toBe(3);
    expect(operation).toHaveBeenCalledTimes(3);
    
    vi.useFakeTimers(); // 次のテスト用に戻す
  });

  it('should fail after max retries', async () => {
    // このテストは実時間を使用
    vi.useRealTimers();
    
    const backoff = new ExponentialBackoff({
      initialDelayMs: 10, // 短い遅延でテスト高速化
      maxRetries: 2
    });

    const operation = vi.fn().mockRejectedValue(new Error('Persistent failure'));

    const result = await backoff.execute(operation);

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Persistent failure');
    expect(result.attempts).toBe(3); // 初回 + 2回のリトライ
    expect(operation).toHaveBeenCalledTimes(3);
    
    vi.useFakeTimers(); // 次のテスト用に戻す
  });

  it('should stop retrying for non-retryable errors', async () => {
    const backoff = new ExponentialBackoff({
      initialDelayMs: 100,
      maxRetries: 5
    });

    const isRetryable = vi.fn().mockReturnValue(false);
    const operation = vi.fn().mockRejectedValue(new Error('Non-retryable error'));

    const result = await backoff.execute(operation, isRetryable);

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1); // リトライせずに停止
    expect(isRetryable).toHaveBeenCalledWith(expect.any(Error));
    expect(operation).toHaveBeenCalledTimes(1);
  });

  // ===================================================================
  // エラー判定テスト
  // ===================================================================

  it('should identify retryable HTTP errors', () => {
    const networkError = new Error('Network request failed');
    const timeoutError = new Error('Connection timeout');
    const rateLimitError = new Error('Rate limit exceeded (429)');
    const serverError = new Error('Server error (503)');

    expect(ExponentialBackoff.isRetryableHttpError(networkError)).toBe(true);
    expect(ExponentialBackoff.isRetryableHttpError(timeoutError)).toBe(true);
    expect(ExponentialBackoff.isRetryableHttpError(rateLimitError)).toBe(true);
    expect(ExponentialBackoff.isRetryableHttpError(serverError)).toBe(true);
  });

  it('should identify non-retryable HTTP errors', () => {
    const authError = new Error('Unauthorized (401)');
    const notFoundError = new Error('Not found (404)');
    const validationError = new Error('Bad request (400)');

    expect(ExponentialBackoff.isRetryableHttpError(authError)).toBe(false);
    expect(ExponentialBackoff.isRetryableHttpError(notFoundError)).toBe(false);
    expect(ExponentialBackoff.isRetryableHttpError(validationError)).toBe(false);
  });

  it('should identify retryable AT Protocol errors', () => {
    const rateLimitError = new Error('RateLimitExceeded');
    const unavailableError = new Error('TemporarilyUnavailable');
    const networkError = new Error('Network fetch failed');

    expect(ExponentialBackoff.isRetryableATProtoError(rateLimitError)).toBe(true);
    expect(ExponentialBackoff.isRetryableATProtoError(unavailableError)).toBe(true);
    expect(ExponentialBackoff.isRetryableATProtoError(networkError)).toBe(true);
  });

  // ===================================================================
  // Retry-Afterヘッダー解析テスト
  // ===================================================================

  it('should parse Retry-After header with seconds', () => {
    const headers = { 'Retry-After': '30' };
    const delay = ExponentialBackoff.parseRetryAfter(headers);
    expect(delay).toBe(30000); // 30秒 = 30000ミリ秒
  });

  it('should parse Retry-After header with date', () => {
    const futureDate = new Date(Date.now() + 60000); // 1分後
    const headers = { 'Retry-After': futureDate.toUTCString() };
    const delay = ExponentialBackoff.parseRetryAfter(headers);
    
    expect(delay).toBeGreaterThan(50000); // 約1分
    expect(delay).toBeLessThan(70000);
  });

  it('should handle missing Retry-After header', () => {
    const headers = {};
    const delay = ExponentialBackoff.parseRetryAfter(headers);
    expect(delay).toBeNull();
  });

  it('should handle invalid Retry-After header', () => {
    const headers = { 'Retry-After': 'invalid' };
    const delay = ExponentialBackoff.parseRetryAfter(headers);
    expect(delay).toBeNull();
  });

  // ===================================================================
  // ファクトリ関数とプリセットテスト
  // ===================================================================

  it('should create backoff with factory function', () => {
    const backoff = createBackoff({ maxRetries: 10 });
    expect(backoff.getOptions().maxRetries).toBe(10);
  });

  it('should provide valid presets', () => {
    expect(BACKOFF_PRESETS.fast.maxRetries).toBe(3);
    expect(BACKOFF_PRESETS.fast.initialDelayMs).toBe(100);

    expect(BACKOFF_PRESETS.standard.maxRetries).toBe(5);
    expect(BACKOFF_PRESETS.standard.initialDelayMs).toBe(1000);

    expect(BACKOFF_PRESETS.conservative.maxRetries).toBe(7);
    expect(BACKOFF_PRESETS.conservative.initialDelayMs).toBe(2000);

    expect(BACKOFF_PRESETS.rateLimit.maxRetries).toBe(10);
    expect(BACKOFF_PRESETS.rateLimit.initialDelayMs).toBe(5000);
  });

  it('should create new instance with modified options', () => {
    const originalBackoff = new ExponentialBackoff({ maxRetries: 3 });
    const modifiedBackoff = originalBackoff.withOptions({ maxRetries: 10 });

    expect(originalBackoff.getOptions().maxRetries).toBe(3);
    expect(modifiedBackoff.getOptions().maxRetries).toBe(10);
    expect(originalBackoff).not.toBe(modifiedBackoff);
  });

  // ===================================================================
  // パフォーマンステスト
  // ===================================================================

  it('should handle high-frequency calculations efficiently', () => {
    const backoff = new ExponentialBackoff();
    
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      backoff.calculateDelay(i % 10);
    }
    const end = performance.now();

    // 1000回の計算が100ms以内に完了することを確認
    expect(end - start).toBeLessThan(100);
  });

  it('should handle concurrent operations correctly', async () => {
    const backoff = new ExponentialBackoff({
      initialDelayMs: 10,
      maxRetries: 2
    });

    let callCount = 0;
    const operation = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount <= 2) {
        throw new Error('Temporary failure');
      }
      return `success-${callCount}`;
    });

    // 並行実行
    const promises = [
      backoff.execute(operation),
      backoff.execute(operation),
      backoff.execute(operation)
    ];

    // タイマーを進める
    await vi.advanceTimersByTimeAsync(50);

    const results = await Promise.all(promises);

    // すべて成功することを確認
    results.forEach(result => {
      expect(result.success).toBe(true);
      expect(result.result).toMatch(/^success-\d+$/);
    });
  });
});