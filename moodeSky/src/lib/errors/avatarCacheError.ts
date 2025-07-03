/**
 * アバターキャッシュ専用エラークラス
 * 統一されたエラーハンドリングとデバッグサポート
 */

/**
 * エラーの種類
 */
export enum AvatarCacheErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',           // ネットワーク関連エラー
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',           // タイムアウトエラー
  API_ERROR = 'API_ERROR',                   // AT Protocol APIエラー
  CACHE_ERROR = 'CACHE_ERROR',               // キャッシュ操作エラー
  VALIDATION_ERROR = 'VALIDATION_ERROR',     // データ検証エラー
  PERMISSION_ERROR = 'PERMISSION_ERROR',     // 認証・権限エラー
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',     // レート制限エラー
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'            // 不明なエラー
}

/**
 * エラーの重要度レベル
 */
export enum AvatarCacheErrorSeverity {
  LOW = 'LOW',           // 低重要度（ログのみ）
  MEDIUM = 'MEDIUM',     // 中重要度（警告表示）
  HIGH = 'HIGH',         // 高重要度（エラー通知）
  CRITICAL = 'CRITICAL'  // 致命的（システム停止）
}

/**
 * エラー情報の詳細
 */
export interface AvatarCacheErrorDetails {
  did?: string;                    // 関連するDID
  operation?: string;              // 実行中の操作
  retryCount?: number;             // リトライ回数
  timestamp?: number;              // エラー発生時刻
  stackTrace?: string;             // スタックトレース
  context?: Record<string, any>;   // 追加のコンテキスト情報
}

/**
 * アバターキャッシュエラークラス
 */
export class AvatarCacheError extends Error {
  public readonly type: AvatarCacheErrorType;
  public readonly severity: AvatarCacheErrorSeverity;
  public readonly details: AvatarCacheErrorDetails;
  public readonly isRetryable: boolean;
  public readonly timestamp: number;

  constructor(
    message: string,
    type: AvatarCacheErrorType = AvatarCacheErrorType.UNKNOWN_ERROR,
    severity: AvatarCacheErrorSeverity = AvatarCacheErrorSeverity.MEDIUM,
    details: AvatarCacheErrorDetails = {},
    isRetryable: boolean = false
  ) {
    super(message);
    
    this.name = 'AvatarCacheError';
    this.type = type;
    this.severity = severity;
    this.details = {
      timestamp: Date.now(),
      ...details
    };
    this.isRetryable = isRetryable;
    this.timestamp = Date.now();

    // Error.captureStackTrace が利用可能な場合（Node.js環境など）
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AvatarCacheError);
    }
  }

  /**
   * エラーの簡潔な説明を取得
   */
  get shortDescription(): string {
    return `[${this.type}] ${this.message}`;
  }

  /**
   * デバッグ用の詳細情報を取得
   */
  get debugInfo(): string {
    const info = [
      `Type: ${this.type}`,
      `Severity: ${this.severity}`,
      `Retryable: ${this.isRetryable}`,
      `Timestamp: ${new Date(this.timestamp).toISOString()}`
    ];

    if (this.details.did) {
      info.push(`DID: ${this.details.did}`);
    }

    if (this.details.operation) {
      info.push(`Operation: ${this.details.operation}`);
    }

    if (this.details.retryCount !== undefined) {
      info.push(`Retry Count: ${this.details.retryCount}`);
    }

    return info.join(', ');
  }

  /**
   * ログ出力用の構造化データを取得
   */
  toLogObject(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      isRetryable: this.isRetryable,
      timestamp: this.timestamp,
      details: this.details,
      stack: this.stack
    };
  }

  /**
   * JSON文字列に変換
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      isRetryable: this.isRetryable,
      timestamp: this.timestamp,
      details: this.details
    };
  }
}

/**
 * 事前定義されたエラーファクトリ関数
 */
export class AvatarCacheErrorFactory {
  /**
   * ネットワークエラーを作成
   */
  static createNetworkError(
    message: string,
    details: AvatarCacheErrorDetails = {}
  ): AvatarCacheError {
    return new AvatarCacheError(
      message,
      AvatarCacheErrorType.NETWORK_ERROR,
      AvatarCacheErrorSeverity.MEDIUM,
      details,
      true // ネットワークエラーはリトライ可能
    );
  }

  /**
   * タイムアウトエラーを作成
   */
  static createTimeoutError(
    message: string,
    details: AvatarCacheErrorDetails = {}
  ): AvatarCacheError {
    return new AvatarCacheError(
      message,
      AvatarCacheErrorType.TIMEOUT_ERROR,
      AvatarCacheErrorSeverity.MEDIUM,
      details,
      true // タイムアウトはリトライ可能
    );
  }

  /**
   * API エラーを作成
   */
  static createApiError(
    message: string,
    details: AvatarCacheErrorDetails = {}
  ): AvatarCacheError {
    return new AvatarCacheError(
      message,
      AvatarCacheErrorType.API_ERROR,
      AvatarCacheErrorSeverity.HIGH,
      details,
      false // APIエラーは通常リトライ不可
    );
  }

  /**
   * キャッシュエラーを作成
   */
  static createCacheError(
    message: string,
    details: AvatarCacheErrorDetails = {}
  ): AvatarCacheError {
    return new AvatarCacheError(
      message,
      AvatarCacheErrorType.CACHE_ERROR,
      AvatarCacheErrorSeverity.MEDIUM,
      details,
      false // キャッシュエラーは通常リトライ不可
    );
  }

  /**
   * レート制限エラーを作成
   */
  static createRateLimitError(
    message: string,
    details: AvatarCacheErrorDetails = {}
  ): AvatarCacheError {
    return new AvatarCacheError(
      message,
      AvatarCacheErrorType.RATE_LIMIT_ERROR,
      AvatarCacheErrorSeverity.HIGH,
      details,
      true // レート制限はリトライ可能
    );
  }

  /**
   * 権限エラーを作成
   */
  static createPermissionError(
    message: string,
    details: AvatarCacheErrorDetails = {}
  ): AvatarCacheError {
    return new AvatarCacheError(
      message,
      AvatarCacheErrorType.PERMISSION_ERROR,
      AvatarCacheErrorSeverity.HIGH,
      details,
      false // 権限エラーはリトライ不可
    );
  }

  /**
   * 汎用エラーから適切なAvatarCacheErrorを作成
   */
  static fromError(
    error: unknown,
    details: AvatarCacheErrorDetails = {}
  ): AvatarCacheError {
    if (error instanceof AvatarCacheError) {
      return error;
    }

    if (error instanceof Error) {
      let type = AvatarCacheErrorType.UNKNOWN_ERROR;
      let isRetryable = false;

      // エラーメッセージから種類を推定
      const message = (error instanceof Error ? error.message : '').toLowerCase();
      
      if (message.includes('network') || message.includes('fetch')) {
        type = AvatarCacheErrorType.NETWORK_ERROR;
        isRetryable = true;
      } else if (message.includes('timeout')) {
        type = AvatarCacheErrorType.TIMEOUT_ERROR;
        isRetryable = true;
      } else if (message.includes('rate limit')) {
        type = AvatarCacheErrorType.RATE_LIMIT_ERROR;
        isRetryable = true;
      } else if (message.includes('unauthorized') || message.includes('forbidden')) {
        type = AvatarCacheErrorType.PERMISSION_ERROR;
        isRetryable = false;
      }

      return new AvatarCacheError(
        error instanceof Error ? error.message : 'Unknown error',
        type,
        AvatarCacheErrorSeverity.MEDIUM,
        {
          stackTrace: error.stack,
          ...details
        },
        isRetryable
      );
    }

    // 不明なエラー型の場合
    return new AvatarCacheError(
      String(error),
      AvatarCacheErrorType.UNKNOWN_ERROR,
      AvatarCacheErrorSeverity.LOW,
      details,
      false
    );
  }
}

/**
 * エラーログ記録ユーティリティ
 */
export class AvatarCacheErrorLogger {
  /**
   * エラーの重要度に応じてコンソールに出力
   */
  static log(error: AvatarCacheError): void {
    const logObject = error.toLogObject();
    
    switch (error.severity) {
      case AvatarCacheErrorSeverity.LOW:
        console.debug('🎭 [AvatarCache] Debug:', logObject);
        break;
      case AvatarCacheErrorSeverity.MEDIUM:
        console.warn('🎭 [AvatarCache] Warning:', logObject);
        break;
      case AvatarCacheErrorSeverity.HIGH:
        console.error('🎭 [AvatarCache] Error:', logObject);
        break;
      case AvatarCacheErrorSeverity.CRITICAL:
        console.error('🎭 [AvatarCache] CRITICAL:', logObject);
        // 本番環境では外部ログサービスに送信することも可能
        break;
    }
  }

  /**
   * エラー統計の収集（将来のモニタリング用）
   */
  static collectErrorStats(error: AvatarCacheError): void {
    // ここで外部の分析サービスにエラー情報を送信できる
    // 例: Sentry, DataDog, Custom Analytics
    
    if (typeof window !== 'undefined' && (window as any).__AVATAR_CACHE_ERROR_STATS__) {
      const stats = (window as any).__AVATAR_CACHE_ERROR_STATS__;
      stats[error.type] = (stats[error.type] || 0) + 1;
    }
  }
}