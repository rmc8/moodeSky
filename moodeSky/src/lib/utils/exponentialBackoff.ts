/**
 * 指数バックオフ（Exponential Backoff）実装
 * レート制限やネットワークエラーに対する効率的なリトライ戦略
 */

/**
 * バックオフ設定オプション
 */
export interface ExponentialBackoffOptions {
  /** 初期遅延時間（ミリ秒） */
  initialDelayMs?: number;
  /** 最大遅延時間（ミリ秒） */
  maxDelayMs?: number;
  /** 指数の底（通常2.0） */
  multiplier?: number;
  /** 最大リトライ回数 */
  maxRetries?: number;
  /** ジッター係数（0-1、ランダム要素の強さ） */
  jitterFactor?: number;
  /** ジッターの種類 */
  jitterType?: 'none' | 'full' | 'equal' | 'decorrelated';
}

/**
 * リトライ結果の型
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDelayMs: number;
}

/**
 * リトライ可能エラーの判定関数型
 */
export type RetryableErrorPredicate = (error: Error) => boolean;

/**
 * 指数バックオフクラス
 */
export class ExponentialBackoff {
  private readonly options: Required<ExponentialBackoffOptions>;

  constructor(options: ExponentialBackoffOptions = {}) {
    this.options = {
      initialDelayMs: options.initialDelayMs ?? 1000,
      maxDelayMs: options.maxDelayMs ?? 30000,
      multiplier: options.multiplier ?? 2.0,
      maxRetries: options.maxRetries ?? 5,
      jitterFactor: options.jitterFactor ?? 0.1,
      jitterType: options.jitterType ?? 'equal'
    };

    // 設定値の検証
    this.validateOptions();
  }

  /**
   * 指定された回数の遅延時間を計算
   */
  calculateDelay(attempt: number): number {
    if (attempt < 0) {
      throw new Error('Attempt number must be non-negative');
    }

    if (attempt === 0) {
      return 0; // 初回は遅延なし
    }

    // 基本的な指数バックオフ計算
    const baseDelay = this.options.initialDelayMs * Math.pow(this.options.multiplier, attempt - 1);
    
    // 最大遅延時間でクランプ
    const clampedDelay = Math.min(baseDelay, this.options.maxDelayMs);
    
    // ジッター適用
    return this.applyJitter(clampedDelay);
  }

  /**
   * 非同期操作をリトライ実行
   */
  async execute<T>(
    operation: () => Promise<T>,
    isRetryableError?: RetryableErrorPredicate
  ): Promise<RetryResult<T>> {
    let lastError: Error | undefined;
    let totalDelayMs = 0;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        // 遅延の適用（初回はスキップ）
        if (attempt > 0) {
          const delayMs = this.calculateDelay(attempt);
          totalDelayMs += delayMs;
          await this.delay(delayMs);
        }

        // 操作実行
        const result = await operation();
        
        return {
          success: true,
          result,
          attempts: attempt + 1,
          totalDelayMs
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // リトライ可能エラーかチェック（最後の試行前にチェック）
        if (isRetryableError && !isRetryableError(lastError)) {
          return {
            success: false,
            error: lastError,
            attempts: attempt + 1,
            totalDelayMs
          };
        }
        
        // 最後の試行の場合はエラーを返す
        if (attempt === this.options.maxRetries) {
          break;
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: this.options.maxRetries + 1,
      totalDelayMs
    };
  }

  /**
   * HTTPレスポンス用のリトライ判定
   */
  static isRetryableHttpError(error: Error): boolean {
    const message = (error instanceof Error ? error.message : '').toLowerCase();
    
    // ネットワークエラー
    if (message.includes('network') || message.includes('fetch')) {
      return true;
    }

    // タイムアウトエラー
    if (message.includes('timeout')) {
      return true;
    }

    // レート制限エラー
    if (message.includes('rate limit') || message.includes('429')) {
      return true;
    }

    // 一時的なサーバーエラー
    if (message.includes('502') || message.includes('503') || message.includes('504')) {
      return true;
    }

    return false;
  }

  /**
   * AT Protocol用のリトライ判定
   */
  static isRetryableATProtoError(error: Error): boolean {
    const message = (error instanceof Error ? error.message : '').toLowerCase();
    
    // AT Protocol固有のリトライ可能エラー
    if (message.includes('ratelimitexceeded')) {
      return true;
    }

    if (message.includes('temporarilyunavailable')) {
      return true;
    }

    // 基本的なHTTPエラーもチェック
    return ExponentialBackoff.isRetryableHttpError(error);
  }

  /**
   * レート制限情報の解析（Retry-Afterヘッダー対応）
   */
  static parseRetryAfter(headers: Record<string, string>): number | null {
    const retryAfter = headers['retry-after'] || headers['Retry-After'];
    
    if (!retryAfter) {
      return null;
    }

    // 秒数での指定
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000; // ミリ秒に変換
    }

    // 日時での指定（RFC 1123形式）
    const date = new Date(retryAfter);
    if (!isNaN(date.getTime())) {
      return Math.max(0, date.getTime() - Date.now());
    }

    return null;
  }

  /**
   * 設定のバリデーション
   */
  private validateOptions(): void {
    if (this.options.initialDelayMs <= 0) {
      throw new Error('Initial delay must be positive');
    }

    if (this.options.maxDelayMs <= 0) {
      throw new Error('Max delay must be positive');
    }

    if (this.options.maxDelayMs < this.options.initialDelayMs) {
      throw new Error('Max delay must be greater than or equal to initial delay');
    }

    if (this.options.multiplier <= 1) {
      throw new Error('Multiplier must be greater than 1');
    }

    if (this.options.maxRetries < 0) {
      throw new Error('Max retries must be non-negative');
    }

    if (this.options.jitterFactor < 0 || this.options.jitterFactor > 1) {
      throw new Error('Jitter factor must be between 0 and 1');
    }
  }

  /**
   * ジッターの適用
   */
  private applyJitter(delay: number): number {
    if (this.options.jitterType === 'none' || this.options.jitterFactor === 0) {
      return delay;
    }

    const jitter = this.options.jitterFactor;
    
    switch (this.options.jitterType) {
      case 'full':
        // 0 から delay までのランダム値
        return Math.random() * delay;
        
      case 'equal':
        // delay の ±jitter% の範囲でランダム
        const variation = delay * jitter;
        return delay + (Math.random() * 2 - 1) * variation;
        
      case 'decorrelated':
        // 前回の遅延時間を考慮した装飾相関ジッター
        // 簡略化：equal と同じ実装
        const decorrelatedVariation = delay * jitter;
        return delay + (Math.random() * 2 - 1) * decorrelatedVariation;
        
      default:
        return delay;
    }
  }

  /**
   * 遅延実行
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 現在の設定を取得
   */
  getOptions(): Required<ExponentialBackoffOptions> {
    return { ...this.options };
  }

  /**
   * 設定を更新した新しいインスタンスを作成
   */
  withOptions(options: Partial<ExponentialBackoffOptions>): ExponentialBackoff {
    return new ExponentialBackoff({
      ...this.options,
      ...options
    });
  }
}

/**
 * 便利なファクトリ関数
 */
export const createBackoff = (options?: ExponentialBackoffOptions): ExponentialBackoff => {
  return new ExponentialBackoff(options);
};

/**
 * 事前定義された設定
 */
export const BACKOFF_PRESETS = {
  /** 高速リトライ（テスト用） */
  fast: {
    initialDelayMs: 100,
    maxDelayMs: 1000,
    maxRetries: 3,
    jitterFactor: 0.1
  },

  /** 標準設定 */
  standard: {
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    maxRetries: 5,
    jitterFactor: 0.2
  },

  /** 慎重なリトライ（本番用） */
  conservative: {
    initialDelayMs: 2000,
    maxDelayMs: 60000,
    maxRetries: 7,
    jitterFactor: 0.3
  },

  /** レート制限対応 */
  rateLimit: {
    initialDelayMs: 5000,
    maxDelayMs: 120000,
    maxRetries: 10,
    jitterFactor: 0.5,
    jitterType: 'decorrelated' as const
  }
} as const;