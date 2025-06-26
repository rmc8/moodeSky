/**
 * Logger テストスイート
 * プロダクション対応ログシステムの検証
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  Logger,
  LogLevel,
  ConsoleTransport,
  LocalStorageTransport,
  MetricsTransport,
  getLogger,
  createLogger,
  type LogEntry,
  type LogContext,
  type LogTransport
} from './logger.js';

describe('Logger System', () => {
  let logger: Logger;
  let mockTransport: LogTransport;

  beforeEach(() => {
    vi.useFakeTimers();
    
    // モックTransport
    mockTransport = {
      name: 'mock',
      minLevel: LogLevel.DEBUG,
      maxLevel: LogLevel.CRITICAL,
      enabled: true,
      log: vi.fn()
    };

    logger = new Logger({
      environment: 'test',
      transports: [mockTransport],
      bufferSize: 3,
      flushInterval: 1000
    });

    // コンソールメソッドをモック
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logger.destroy();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ===================================================================
  // 基本ログ機能テスト
  // ===================================================================

  describe('Basic Logging', () => {
    it('should log messages at different levels', () => {
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      
      // バッファサイズ3なので最初の3つはまだバッファ内
      expect(mockTransport.log).toHaveBeenCalledTimes(3);
      
      logger.error('Error message');
      logger.critical('Critical message');

      // クリティカルで即座にフラッシュされる
      expect(mockTransport.log).toHaveBeenCalledTimes(5);
    });

    it('should respect minimum log level', () => {
      const restrictiveLogger = new Logger({
        minLevel: LogLevel.WARN,
        transports: [mockTransport],
        bufferSize: 1
      });

      restrictiveLogger.debug('Debug message');
      restrictiveLogger.info('Info message');
      restrictiveLogger.warn('Warn message');

      // WARN以上のみログ出力
      expect(mockTransport.log).toHaveBeenCalledTimes(1);
      
      restrictiveLogger.destroy();
    });

    it('should include context in log entries', () => {
      const testLogger = new Logger({
        transports: [mockTransport],
        bufferSize: 1
      });
      
      const context: LogContext = {
        userId: 'user123',
        operation: 'test_operation',
        duration: 150
      };

      testLogger.info('Test message', context);

      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.INFO,
          message: 'Test message',
          context: expect.objectContaining({
            userId: expect.any(String), // ハッシュ化される
            operation: 'test_operation',
            duration: 150,
            sessionId: expect.any(String)
          })
        })
      );
      
      testLogger.destroy();
    });

    it('should include source information', () => {
      const testLogger = new Logger({
        transports: [mockTransport],
        bufferSize: 1
      });
      
      testLogger.info('Test message', {}, 'test_module');

      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'test_module'
        })
      );
      
      testLogger.destroy();
    });
  });

  // ===================================================================
  // バッファリング・フラッシュテスト
  // ===================================================================

  describe('Buffering and Flushing', () => {
    it('should buffer logs until buffer size limit', () => {
      // バッファサイズ3に設定済み
      logger.info('Message 1');
      logger.info('Message 2');
      
      // まだバッファ内
      expect(mockTransport.log).not.toHaveBeenCalled();

      logger.info('Message 3');
      
      // バッファサイズに達したのでフラッシュ
      expect(mockTransport.log).toHaveBeenCalledTimes(3);
    });

    it('should flush immediately on critical level', () => {
      logger.info('Regular message');
      expect(mockTransport.log).not.toHaveBeenCalled();

      logger.critical('Critical message');
      
      // クリティカルレベルで即座にフラッシュ
      expect(mockTransport.log).toHaveBeenCalledTimes(2);
    });

    it('should flush on timer interval', () => {
      logger.info('Buffered message');
      expect(mockTransport.log).not.toHaveBeenCalled();

      // タイマーを進める
      vi.advanceTimersByTime(1000);

      expect(mockTransport.log).toHaveBeenCalledTimes(1);
    });
  });

  // ===================================================================
  // タイマー機能テスト
  // ===================================================================

  describe('Timer Functionality', () => {
    it('should measure operation duration', () => {
      const endTimer = logger.startTimer('test_operation', { userId: 'user123' });

      // 時間を進める
      vi.advanceTimersByTime(250);
      endTimer();

      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.DEBUG,
          message: 'Operation started: test_operation'
        })
      );

      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.INFO,
          message: 'Operation completed: test_operation',
          context: expect.objectContaining({
            operation: 'test_operation',
            duration: expect.any(Number)
          })
        })
      );
    });
  });

  // ===================================================================
  // エラーハンドリングテスト
  // ===================================================================

  describe('Error Handling', () => {
    it('should log errors with stack trace', () => {
      const error = new Error('Test error');
      error.name = 'TestError';

      logger.logError(error, 'test_operation', { userId: 'user123' });

      expect(mockTransport.log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.ERROR,
          message: 'Error in test_operation: Test error',
          context: expect.objectContaining({
            operation: 'test_operation',
            errorCode: 'TestError',
            stack: expect.any(String)
          })
        })
      );
    });
  });

  // ===================================================================
  // 機密情報フィルタテスト
  // ===================================================================

  describe('Sensitive Data Filtering', () => {
    it('should hash DID and user ID', () => {
      const context: LogContext = {
        userId: 'very_long_user_id_12345',
        did: 'did:plc:very_long_identifier_67890'
      };

      logger.info('Test message', context);

      const logCall = (mockTransport.log as any).mock.calls[0][0];
      expect(logCall.context.userId).toMatch(/^very_lon\*\*\*\*45$/);
      expect(logCall.context.did).toMatch(/^did:plc:\*\*\*\*90$/);
    });

    it('should redact sensitive metadata keys', () => {
      const context: LogContext = {
        metadata: {
          password: 'secret123',
          authToken: 'token456',
          normalData: 'public_info'
        }
      };

      logger.info('Test message', context);

      const logCall = (mockTransport.log as any).mock.calls[0][0];
      expect(logCall.context.metadata.password).toBe('[REDACTED]');
      expect(logCall.context.metadata.authToken).toBe('[REDACTED]');
      expect(logCall.context.metadata.normalData).toBe('public_info');
    });

    it('should disable filtering when configured', () => {
      const unfiltereredLogger = new Logger({
        enableSensitiveDataFilter: false,
        transports: [mockTransport]
      });

      const context: LogContext = {
        userId: 'original_user_id',
        metadata: { password: 'secret123' }
      };

      unfiltereredLogger.info('Test message', context);

      const logCall = (mockTransport.log as any).mock.calls[0][0];
      expect(logCall.context.userId).toBe('original_user_id');
      expect(logCall.context.metadata.password).toBe('secret123');
      
      unfiltereredLogger.destroy();
    });
  });

  // ===================================================================
  // サンプリングテスト
  // ===================================================================

  describe('Sampling', () => {
    it('should respect sampling rate', () => {
      const sampledLogger = new Logger({
        samplingRate: 0.0, // 0% サンプリング
        transports: [mockTransport]
      });

      // 複数回ログを出力しても何も記録されない
      for (let i = 0; i < 10; i++) {
        sampledLogger.info(`Message ${i}`);
      }

      expect(mockTransport.log).not.toHaveBeenCalled();
      
      sampledLogger.destroy();
    });
  });
});

// ===================================================================
// Transport テスト
// ===================================================================

describe('Transports', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ConsoleTransport', () => {
    it('should output to appropriate console method', () => {
      const transport = new ConsoleTransport();
      const mockEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        levelName: 'INFO',
        message: 'Test message',
        context: {},
        source: 'test',
        environment: 'test',
        version: '1.0.0'
      };

      transport.log(mockEntry);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[test]'),
        'Test message',
        {}
      );
    });

    it('should respect level filtering', () => {
      const transport = new ConsoleTransport(LogLevel.WARN);
      const debugEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.DEBUG,
        levelName: 'DEBUG',
        message: 'Debug message',
        context: {},
        source: 'test',
        environment: 'test',
        version: '1.0.0'
      };

      transport.log(debugEntry);

      expect(console.debug).not.toHaveBeenCalled();
    });
  });

  describe('LocalStorageTransport', () => {
    let mockLocalStorage: { [key: string]: string };

    beforeEach(() => {
      mockLocalStorage = {};
      
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn((key) => mockLocalStorage[key] || null),
          setItem: vi.fn((key, value) => { mockLocalStorage[key] = value; }),
          removeItem: vi.fn((key) => { delete mockLocalStorage[key]; })
        },
        writable: true
      });
    });

    it('should store logs in localStorage', () => {
      const transport = new LocalStorageTransport(LogLevel.INFO, 5);
      const mockEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        levelName: 'INFO',
        message: 'Test message',
        context: {},
        source: 'test',
        environment: 'test',
        version: '1.0.0'
      };

      transport.log(mockEntry);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'avatar_cache_logs',
        expect.stringContaining('Test message')
      );
    });

    it('should limit stored entries', () => {
      const transport = new LocalStorageTransport(LogLevel.INFO, 2);
      
      // 3つのエントリを追加
      for (let i = 1; i <= 3; i++) {
        const entry: LogEntry = {
          timestamp: new Date().toISOString(),
          level: LogLevel.INFO,
          levelName: 'INFO',
          message: `Message ${i}`,
          context: {},
          source: 'test',
          environment: 'test',
          version: '1.0.0'
        };
        transport.log(entry);
      }

      const logs = transport.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('Message 2'); // 最初のエントリは削除済み
      expect(logs[1].message).toBe('Message 3');
    });

    it('should export logs as JSON', () => {
      const transport = new LocalStorageTransport();
      
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        levelName: 'INFO',
        message: 'Export test',
        context: {},
        source: 'test',
        environment: 'test',
        version: '1.0.0'
      };
      
      transport.log(entry);
      const exported = transport.exportLogs();
      
      expect(exported).toContain('Export test');
      expect(JSON.parse(exported)).toHaveLength(1);
    });
  });

  describe('MetricsTransport', () => {
    it('should call metrics callback', () => {
      const mockCallback = vi.fn();
      const transport = new MetricsTransport(mockCallback);
      
      const mockEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.ERROR,
        levelName: 'ERROR',
        message: 'Error message',
        context: {},
        source: 'test',
        environment: 'test',
        version: '1.0.0'
      };

      transport.log(mockEntry);

      expect(mockCallback).toHaveBeenCalledWith(mockEntry);
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      
      const transport = new MetricsTransport(errorCallback);
      const mockEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.ERROR,
        levelName: 'ERROR',
        message: 'Test message',
        context: {},
        source: 'test',
        environment: 'test',
        version: '1.0.0'
      };

      // エラーが投げられないことを確認
      expect(() => transport.log(mockEntry)).not.toThrow();
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to send log to metrics:',
        expect.any(Error)
      );
    });
  });
});

// ===================================================================
// ファクトリ関数テスト
// ===================================================================

describe('Factory Functions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getLogger', () => {
    it('should return singleton instance', () => {
      const logger1 = getLogger();
      const logger2 = getLogger();

      expect(logger1).toBe(logger2);
    });
  });

  describe('createLogger', () => {
    it('should create development logger', () => {
      const logger = createLogger('development');
      
      // 開発環境の設定が適用されているかテスト
      expect(logger).toBeInstanceOf(Logger);
      
      logger.destroy();
    });

    it('should create production logger', () => {
      const logger = createLogger('production');
      
      expect(logger).toBeInstanceOf(Logger);
      
      logger.destroy();
    });

    it('should create test logger', () => {
      const logger = createLogger('test');
      
      expect(logger).toBeInstanceOf(Logger);
      
      logger.destroy();
    });
  });
});

// ===================================================================
// Transport管理テスト
// ===================================================================

describe('Transport Management', () => {
  let logger: Logger;
  let mockTransport1: LogTransport;
  let mockTransport2: LogTransport;

  beforeEach(() => {
    mockTransport1 = {
      name: 'mock1',
      minLevel: LogLevel.DEBUG,
      maxLevel: LogLevel.CRITICAL,
      enabled: true,
      log: vi.fn()
    };

    mockTransport2 = {
      name: 'mock2',
      minLevel: LogLevel.DEBUG,
      maxLevel: LogLevel.CRITICAL,
      enabled: true,
      log: vi.fn()
    };

    logger = new Logger({
      transports: [mockTransport1]
    });
  });

  afterEach(() => {
    logger.destroy();
  });

  it('should add transport', () => {
    logger.addTransport(mockTransport2);
    logger.info('Test message');

    expect(mockTransport1.log).toHaveBeenCalled();
    expect(mockTransport2.log).toHaveBeenCalled();
  });

  it('should remove transport', () => {
    logger.addTransport(mockTransport2);
    logger.removeTransport('mock1');
    logger.info('Test message');

    expect(mockTransport1.log).not.toHaveBeenCalled();
    expect(mockTransport2.log).toHaveBeenCalled();
  });
});