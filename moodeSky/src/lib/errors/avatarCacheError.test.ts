/**
 * AvatarCacheError テストスイート
 * 統一エラーハンドリングシステムの検証
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AvatarCacheError,
  AvatarCacheErrorType,
  AvatarCacheErrorSeverity,
  AvatarCacheErrorFactory,
  AvatarCacheErrorLogger
} from './avatarCacheError.js';

describe('AvatarCacheError', () => {
  // ===================================================================
  // 基本エラークラステスト
  // ===================================================================

  it('should create error with basic properties', () => {
    const error = new AvatarCacheError(
      'Test error message',
      AvatarCacheErrorType.NETWORK_ERROR,
      AvatarCacheErrorSeverity.HIGH
    );

    expect(error.message).toBe('Test error message');
    expect(error.type).toBe(AvatarCacheErrorType.NETWORK_ERROR);
    expect(error.severity).toBe(AvatarCacheErrorSeverity.HIGH);
    expect(error.name).toBe('AvatarCacheError');
    expect(error.timestamp).toBeGreaterThan(0);
  });

  it('should use default values when not specified', () => {
    const error = new AvatarCacheError('Default test');

    expect(error.type).toBe(AvatarCacheErrorType.UNKNOWN_ERROR);
    expect(error.severity).toBe(AvatarCacheErrorSeverity.MEDIUM);
    expect(error.isRetryable).toBe(false);
    expect(error.details).toBeDefined();
  });

  it('should include details with timestamp', () => {
    const customDetails = {
      did: 'did:plc:test123',
      operation: 'test_operation'
    };

    const error = new AvatarCacheError(
      'Test with details',
      AvatarCacheErrorType.API_ERROR,
      AvatarCacheErrorSeverity.MEDIUM,
      customDetails
    );

    expect(error.details.did).toBe('did:plc:test123');
    expect(error.details.operation).toBe('test_operation');
    expect(error.details.timestamp).toBeGreaterThan(0);
  });

  // ===================================================================
  // エラー情報出力テスト
  // ===================================================================

  it('should generate short description', () => {
    const error = new AvatarCacheError(
      'Network connection failed',
      AvatarCacheErrorType.NETWORK_ERROR
    );

    expect(error.shortDescription).toBe('[NETWORK_ERROR] Network connection failed');
  });

  it('should generate debug info', () => {
    const error = new AvatarCacheError(
      'Debug test',
      AvatarCacheErrorType.CACHE_ERROR,
      AvatarCacheErrorSeverity.LOW,
      {
        did: 'did:plc:debug123',
        operation: 'cache_write',
        retryCount: 2
      },
      true
    );

    const debugInfo = error.debugInfo;
    expect(debugInfo).toContain('Type: CACHE_ERROR');
    expect(debugInfo).toContain('Severity: LOW');
    expect(debugInfo).toContain('Retryable: true');
    expect(debugInfo).toContain('DID: did:plc:debug123');
    expect(debugInfo).toContain('Operation: cache_write');
    expect(debugInfo).toContain('Retry Count: 2');
  });

  it('should convert to log object', () => {
    const error = new AvatarCacheError(
      'Log test',
      AvatarCacheErrorType.TIMEOUT_ERROR,
      AvatarCacheErrorSeverity.MEDIUM,
      { did: 'did:plc:log123' }
    );

    const logObject = error.toLogObject();
    expect(logObject.name).toBe('AvatarCacheError');
    expect(logObject.message).toBe('Log test');
    expect(logObject.type).toBe(AvatarCacheErrorType.TIMEOUT_ERROR);
    expect(logObject.severity).toBe(AvatarCacheErrorSeverity.MEDIUM);
    expect(logObject.details.did).toBe('did:plc:log123');
  });

  it('should serialize to JSON', () => {
    const error = new AvatarCacheError(
      'JSON test',
      AvatarCacheErrorType.VALIDATION_ERROR
    );

    const json = error.toJSON();
    expect(json.name).toBe('AvatarCacheError');
    expect(json.message).toBe('JSON test');
    expect(json.type).toBe(AvatarCacheErrorType.VALIDATION_ERROR);
    expect(json.stack).toBeUndefined(); // JSON にはスタックトレースは含まれない
  });

  // ===================================================================
  // エラーファクトリテスト
  // ===================================================================

  it('should create network error with factory', () => {
    const error = AvatarCacheErrorFactory.createNetworkError(
      'Connection failed',
      { did: 'did:plc:network123' }
    );

    expect(error.type).toBe(AvatarCacheErrorType.NETWORK_ERROR);
    expect(error.severity).toBe(AvatarCacheErrorSeverity.MEDIUM);
    expect(error.isRetryable).toBe(true);
    expect(error.details.did).toBe('did:plc:network123');
  });

  it('should create timeout error with factory', () => {
    const error = AvatarCacheErrorFactory.createTimeoutError(
      'Request timed out'
    );

    expect(error.type).toBe(AvatarCacheErrorType.TIMEOUT_ERROR);
    expect(error.isRetryable).toBe(true);
  });

  it('should create API error with factory', () => {
    const error = AvatarCacheErrorFactory.createApiError(
      'API returned 500'
    );

    expect(error.type).toBe(AvatarCacheErrorType.API_ERROR);
    expect(error.severity).toBe(AvatarCacheErrorSeverity.HIGH);
    expect(error.isRetryable).toBe(false);
  });

  it('should create cache error with factory', () => {
    const error = AvatarCacheErrorFactory.createCacheError(
      'Cache corruption detected'
    );

    expect(error.type).toBe(AvatarCacheErrorType.CACHE_ERROR);
    expect(error.isRetryable).toBe(false);
  });

  it('should create rate limit error with factory', () => {
    const error = AvatarCacheErrorFactory.createRateLimitError(
      'Rate limit exceeded'
    );

    expect(error.type).toBe(AvatarCacheErrorType.RATE_LIMIT_ERROR);
    expect(error.severity).toBe(AvatarCacheErrorSeverity.HIGH);
    expect(error.isRetryable).toBe(true);
  });

  it('should create permission error with factory', () => {
    const error = AvatarCacheErrorFactory.createPermissionError(
      'Access denied'
    );

    expect(error.type).toBe(AvatarCacheErrorType.PERMISSION_ERROR);
    expect(error.severity).toBe(AvatarCacheErrorSeverity.HIGH);
    expect(error.isRetryable).toBe(false);
  });

  // ===================================================================
  // エラー変換テスト
  // ===================================================================

  it('should return existing AvatarCacheError unchanged', () => {
    const originalError = new AvatarCacheError(
      'Original error',
      AvatarCacheErrorType.NETWORK_ERROR
    );

    const convertedError = AvatarCacheErrorFactory.fromError(originalError);
    expect(convertedError).toBe(originalError);
  });

  it('should convert network error correctly', () => {
    const networkError = new Error('Network request failed');
    const convertedError = AvatarCacheErrorFactory.fromError(networkError);

    expect(convertedError.type).toBe(AvatarCacheErrorType.NETWORK_ERROR);
    expect(convertedError.isRetryable).toBe(true);
    expect(convertedError.message).toBe('Network request failed');
  });

  it('should convert timeout error correctly', () => {
    const timeoutError = new Error('Connection timeout');
    const convertedError = AvatarCacheErrorFactory.fromError(timeoutError);

    expect(convertedError.type).toBe(AvatarCacheErrorType.TIMEOUT_ERROR);
    expect(convertedError.isRetryable).toBe(true);
  });

  it('should convert rate limit error correctly', () => {
    const rateLimitError = new Error('Rate limit exceeded');
    const convertedError = AvatarCacheErrorFactory.fromError(rateLimitError);

    expect(convertedError.type).toBe(AvatarCacheErrorType.RATE_LIMIT_ERROR);
    expect(convertedError.isRetryable).toBe(true);
  });

  it('should convert permission error correctly', () => {
    const permissionError = new Error('Unauthorized access');
    const convertedError = AvatarCacheErrorFactory.fromError(permissionError);

    expect(convertedError.type).toBe(AvatarCacheErrorType.PERMISSION_ERROR);
    expect(convertedError.isRetryable).toBe(false);
  });

  it('should convert unknown error to UNKNOWN_ERROR type', () => {
    const unknownError = new Error('Some unexpected error');
    const convertedError = AvatarCacheErrorFactory.fromError(unknownError);

    expect(convertedError.type).toBe(AvatarCacheErrorType.UNKNOWN_ERROR);
    expect(convertedError.isRetryable).toBe(false);
  });

  it('should handle non-Error objects', () => {
    const stringError = 'String error message';
    const convertedError = AvatarCacheErrorFactory.fromError(stringError);

    expect(convertedError.type).toBe(AvatarCacheErrorType.UNKNOWN_ERROR);
    expect(convertedError.message).toBe('String error message');
  });

  // ===================================================================
  // エラーログ記録テスト
  // ===================================================================

  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log LOW severity as debug', () => {
    const error = new AvatarCacheError(
      'Debug message',
      AvatarCacheErrorType.UNKNOWN_ERROR,
      AvatarCacheErrorSeverity.LOW
    );

    AvatarCacheErrorLogger.log(error);
    expect(console.debug).toHaveBeenCalledWith('🎭 [AvatarCache] Debug:', error.toLogObject());
  });

  it('should log MEDIUM severity as warning', () => {
    const error = new AvatarCacheError(
      'Warning message',
      AvatarCacheErrorType.NETWORK_ERROR,
      AvatarCacheErrorSeverity.MEDIUM
    );

    AvatarCacheErrorLogger.log(error);
    expect(console.warn).toHaveBeenCalledWith('🎭 [AvatarCache] Warning:', error.toLogObject());
  });

  it('should log HIGH severity as error', () => {
    const error = new AvatarCacheError(
      'Error message',
      AvatarCacheErrorType.API_ERROR,
      AvatarCacheErrorSeverity.HIGH
    );

    AvatarCacheErrorLogger.log(error);
    expect(console.error).toHaveBeenCalledWith('🎭 [AvatarCache] Error:', error.toLogObject());
  });

  it('should log CRITICAL severity as error', () => {
    const error = new AvatarCacheError(
      'Critical message',
      AvatarCacheErrorType.CACHE_ERROR,
      AvatarCacheErrorSeverity.CRITICAL
    );

    AvatarCacheErrorLogger.log(error);
    expect(console.error).toHaveBeenCalledWith('🎭 [AvatarCache] CRITICAL:', error.toLogObject());
  });

  it('should collect error statistics', () => {
    // グローバル統計オブジェクトを設定
    (global as any).window = {
      __AVATAR_CACHE_ERROR_STATS__: {}
    };

    const error = new AvatarCacheError(
      'Stats test',
      AvatarCacheErrorType.NETWORK_ERROR
    );

    AvatarCacheErrorLogger.collectErrorStats(error);
    
    const stats = (global as any).window.__AVATAR_CACHE_ERROR_STATS__;
    expect(stats[AvatarCacheErrorType.NETWORK_ERROR]).toBe(1);

    // 同じタイプのエラーを再度記録
    AvatarCacheErrorLogger.collectErrorStats(error);
    expect(stats[AvatarCacheErrorType.NETWORK_ERROR]).toBe(2);
  });
});