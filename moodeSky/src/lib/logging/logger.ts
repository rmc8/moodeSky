/**
 * プロダクション対応ログシステム
 * 構造化ログ、環境別設定、パフォーマンス最適化を提供
 */

/**
 * ログレベル
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

/**
 * ログコンテキスト
 */
export interface LogContext {
  /** ユーザーID（プライバシー配慮） */
  userId?: string;
  /** セッションID */
  sessionId?: string;
  /** リクエストID */
  requestId?: string;
  /** 操作名 */
  operation?: string;
  /** DID（ハッシュ化推奨） */
  did?: string;
  /** 実行時間 */
  duration?: number;
  /** エラーコード */
  errorCode?: string;
  /** スタックトレース */
  stack?: string;
  /** キャッシュサイズ */
  cacheSize?: number;
  /** キャッシュされたアバター数 */
  cachedAvatars?: number;
  /** TTL設定 */
  ttl?: number;
  /** 全設定情報 */
  totalConfig?: any;
  /** 追加メタデータ */
  metadata?: Record<string, any>;
}

/**
 * 構造化ログエントリ
 */
export interface LogEntry {
  /** タイムスタンプ（ISO 8601） */
  timestamp: string;
  /** ログレベル */
  level: LogLevel;
  /** ログレベル名 */
  levelName: string;
  /** メッセージ */
  message: string;
  /** コンテキスト情報 */
  context: LogContext;
  /** ソースモジュール */
  source: string;
  /** 環境名 */
  environment: string;
  /** アプリケーションバージョン */
  version: string;
  /** スタックトレース（エラー時） */
  stack?: string;
}

/**
 * ログ出力先インターフェース
 */
export interface LogTransport {
  name: string;
  minLevel: LogLevel;
  maxLevel: LogLevel;
  enabled: boolean;
  log(entry: LogEntry): Promise<void> | void;
  flush?(): Promise<void>;
  close?(): Promise<void>;
}

/**
 * ログ設定
 */
export interface LoggerConfig {
  /** 最小ログレベル */
  minLevel: LogLevel;
  /** 環境名 */
  environment: string;
  /** アプリケーションバージョン */
  version: string;
  /** 出力先リスト */
  transports: LogTransport[];
  /** サンプリング率（0.0-1.0） */
  samplingRate: number;
  /** バッファサイズ */
  bufferSize: number;
  /** フラッシュ間隔（ミリ秒） */
  flushInterval: number;
  /** 機密情報フィルタ */
  enableSensitiveDataFilter: boolean;
}

/**
 * コンソール出力Transport
 */
export class ConsoleTransport implements LogTransport {
  name = 'console';
  minLevel: LogLevel;
  maxLevel: LogLevel;
  enabled: boolean;

  constructor(
    minLevel: LogLevel = LogLevel.DEBUG,
    maxLevel: LogLevel = LogLevel.CRITICAL,
    enabled: boolean = true
  ) {
    this.minLevel = minLevel;
    this.maxLevel = maxLevel;
    this.enabled = enabled;
  }

  log(entry: LogEntry): void {
    if (!this.enabled || entry.level < this.minLevel || entry.level > this.maxLevel) {
      return;
    }

    const emoji = this.getLogEmoji(entry.level);
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `${emoji} [${timestamp}] [${entry.source}]`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.context);
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.context);
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.context);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(prefix, entry.message, entry.context, entry.stack);
        break;
    }
  }

  private getLogEmoji(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return '🔍';
      case LogLevel.INFO: return 'ℹ️';
      case LogLevel.WARN: return '⚠️';
      case LogLevel.ERROR: return '❌';
      case LogLevel.CRITICAL: return '🚨';
      default: return '📝';
    }
  }
}

/**
 * ローカルストレージTransport
 */
export class LocalStorageTransport implements LogTransport {
  name = 'localStorage';
  minLevel: LogLevel;
  maxLevel: LogLevel;
  enabled: boolean;
  private readonly maxEntries: number;
  private readonly storageKey: string;

  constructor(
    minLevel: LogLevel = LogLevel.WARN,
    maxEntries: number = 1000,
    storageKey: string = 'avatar_cache_logs'
  ) {
    this.minLevel = minLevel;
    this.maxLevel = LogLevel.CRITICAL;
    this.enabled = typeof window !== 'undefined' && !!window.localStorage;
    this.maxEntries = maxEntries;
    this.storageKey = storageKey;
  }

  log(entry: LogEntry): void {
    if (!this.enabled || entry.level < this.minLevel || entry.level > this.maxLevel) {
      return;
    }

    try {
      const logs = this.getLogs();
      logs.push(entry);

      // 古いログを削除
      if (logs.length > this.maxEntries) {
        logs.splice(0, logs.length - this.maxEntries);
      }

      localStorage.setItem(this.storageKey, JSON.stringify(logs));
    } catch (error) {
      console.warn('Failed to write log to localStorage:', error);
    }
  }

  getLogs(): LogEntry[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to read logs from localStorage:', error);
      return [];
    }
  }

  clearLogs(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('Failed to clear logs from localStorage:', error);
    }
  }

  exportLogs(): string {
    return JSON.stringify(this.getLogs(), null, 2);
  }
}

/**
 * メトリクス連携Transport
 */
export class MetricsTransport implements LogTransport {
  name = 'metrics';
  minLevel: LogLevel;
  maxLevel: LogLevel;
  enabled: boolean;
  private metricsCallback: (entry: LogEntry) => void;

  constructor(
    metricsCallback: (entry: LogEntry) => void,
    minLevel: LogLevel = LogLevel.WARN
  ) {
    this.minLevel = minLevel;
    this.maxLevel = LogLevel.CRITICAL;
    this.enabled = true;
    this.metricsCallback = metricsCallback;
  }

  log(entry: LogEntry): void {
    if (!this.enabled || entry.level < this.minLevel || entry.level > this.maxLevel) {
      return;
    }

    try {
      this.metricsCallback(entry);
    } catch (error) {
      console.warn('Failed to send log to metrics:', error);
    }
  }
}

/**
 * プロダクション対応ロガー
 */
export class Logger {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private sessionId: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: LogLevel.INFO,
      environment: 'development',
      version: '1.0.0',
      transports: [new ConsoleTransport()],
      samplingRate: 1.0,
      bufferSize: 100,
      flushInterval: 5000,
      enableSensitiveDataFilter: true,
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.startFlushTimer();
  }

  /**
   * DEBUGレベルログ
   */
  debug(message: string, context: LogContext = {}, source: string = 'unknown'): void {
    this.log(LogLevel.DEBUG, message, context, source);
  }

  /**
   * INFOレベルログ
   */
  info(message: string, context: LogContext = {}, source: string = 'unknown'): void {
    this.log(LogLevel.INFO, message, context, source);
  }

  /**
   * WARNレベルログ
   */
  warn(message: string, context: LogContext = {}, source: string = 'unknown'): void {
    this.log(LogLevel.WARN, message, context, source);
  }

  /**
   * ERRORレベルログ
   */
  error(message: string, context: LogContext = {}, source: string = 'unknown', error?: Error): void {
    const errorContext = {
      ...context,
      stack: error?.stack,
      errorCode: context.errorCode || error?.name
    };
    this.log(LogLevel.ERROR, message, errorContext, source);
  }

  /**
   * CRITICALレベルログ
   */
  critical(message: string, context: LogContext = {}, source: string = 'unknown', error?: Error): void {
    const errorContext = {
      ...context,
      stack: error?.stack,
      errorCode: context.errorCode || error?.name
    };
    this.log(LogLevel.CRITICAL, message, errorContext, source);
  }

  /**
   * 操作タイマー開始
   */
  startTimer(operation: string, context: LogContext = {}): () => void {
    const startTime = performance.now();
    const requestId = this.generateRequestId();

    this.debug(`Operation started: ${operation}`, {
      ...context,
      requestId,
      operation
    }, 'timer');

    return () => {
      const duration = performance.now() - startTime;
      this.info(`Operation completed: ${operation}`, {
        ...context,
        requestId,
        operation,
        duration: Math.round(duration * 100) / 100
      }, 'timer');
    };
  }

  /**
   * エラー用ヘルパー
   */
  logError(error: Error, operation: string, context: LogContext = {}): void {
    this.error(`Error in ${operation}: ${error.message}`, {
      ...context,
      operation,
      errorCode: error.name
    }, 'error', error);
  }

  /**
   * 基本ログメソッド
   */
  private log(level: LogLevel, message: string, context: LogContext, source: string): void {
    // レベルフィルタ
    if (level < this.config.minLevel) {
      return;
    }

    // サンプリング
    if (Math.random() > this.config.samplingRate) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      levelName: LogLevel[level],
      message,
      context: {
        sessionId: this.sessionId,
        ...this.filterSensitiveData(context)
      },
      source,
      environment: this.config.environment,
      version: this.config.version
    };

    // スタックトレースを追加（エラー系のみ）
    if (level >= LogLevel.ERROR && context.stack) {
      entry.stack = context.stack;
    }

    // バッファに追加
    this.logBuffer.push(entry);

    // 即座に出力（クリティカルレベル）またはバッファサイズ上限
    if (level === LogLevel.CRITICAL || this.logBuffer.length >= this.config.bufferSize) {
      this.flush();
    }
  }

  /**
   * 機密情報フィルタ
   */
  private filterSensitiveData(context: LogContext): LogContext {
    if (!this.config.enableSensitiveDataFilter) {
      return context;
    }

    const filtered = { ...context };

    // DIDのハッシュ化
    if (filtered.did) {
      filtered.did = this.hashSensitiveData(filtered.did);
    }

    // ユーザーIDのハッシュ化
    if (filtered.userId) {
      filtered.userId = this.hashSensitiveData(filtered.userId);
    }

    // メタデータから機密情報を除去
    if (filtered.metadata) {
      const sanitizedMetadata = { ...filtered.metadata };
      const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
      
      for (const key of Object.keys(sanitizedMetadata)) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          sanitizedMetadata[key] = '[REDACTED]';
        }
      }
      
      filtered.metadata = sanitizedMetadata;
    }

    return filtered;
  }

  /**
   * 機密データのハッシュ化
   */
  private hashSensitiveData(data: string): string {
    if (data.length <= 8) {
      return data.slice(0, 4) + '****';
    }
    return data.slice(0, 8) + '****' + data.slice(-4);
  }

  /**
   * ログのフラッシュ
   */
  private flush(): void {
    if (this.logBuffer.length === 0) {
      return;
    }

    const entries = [...this.logBuffer];
    this.logBuffer = [];

    // 各Transportに送信
    for (const transport of this.config.transports) {
      for (const entry of entries) {
        try {
          transport.log(entry);
        } catch (error) {
          console.error(`Log transport ${transport.name} failed:`, error);
        }
      }
    }
  }

  /**
   * フラッシュタイマー開始
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * セッションID生成
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * リクエストID生成
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Transport追加
   */
  addTransport(transport: LogTransport): void {
    this.config.transports.push(transport);
  }

  /**
   * Transport除去
   */
  removeTransport(name: string): void {
    this.config.transports = this.config.transports.filter(t => t.name !== name);
  }

  /**
   * ログ設定更新
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * リソースクリーンアップ
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // 最終フラッシュ
    this.flush();

    // Transport終了処理
    for (const transport of this.config.transports) {
      if (transport.close) {
        transport.close();
      }
    }
  }
}

// デフォルトロガーインスタンス
let defaultLogger: Logger;

/**
 * デフォルトロガーを取得
 */
export function getLogger(): Logger {
  if (!defaultLogger) {
    defaultLogger = createLogger();
  }
  return defaultLogger;
}

/**
 * 環境別ロガー作成
 */
export function createLogger(environment?: string): Logger {
  const env = environment || (typeof window !== 'undefined' 
    ? (window as any).__AVATAR_CACHE_ENV__ || 'development'
    : 'development');

  const transports: LogTransport[] = [];

  switch (env) {
    case 'development':
      transports.push(
        new ConsoleTransport(LogLevel.DEBUG),
        new LocalStorageTransport(LogLevel.WARN)
      );
      break;

    case 'production':
      transports.push(
        new ConsoleTransport(LogLevel.WARN),
        new LocalStorageTransport(LogLevel.ERROR, 500)
      );
      break;

    case 'test':
      transports.push(
        new ConsoleTransport(LogLevel.ERROR, LogLevel.CRITICAL, false)
      );
      break;

    default:
      transports.push(new ConsoleTransport(LogLevel.INFO));
  }

  return new Logger({
    environment: env,
    version: '1.0.0',
    minLevel: env === 'production' ? LogLevel.WARN : LogLevel.DEBUG,
    transports,
    samplingRate: env === 'production' ? 0.1 : 1.0,
    bufferSize: env === 'production' ? 200 : 50,
    flushInterval: env === 'production' ? 10000 : 5000,
    enableSensitiveDataFilter: env === 'production'
  });
}