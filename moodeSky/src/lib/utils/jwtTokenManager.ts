/**
 * JWT Token Manager - プロアクティブなトークン管理とリフレッシュスケジューリング
 * 
 * refreshSession問題を解決するための中核コンポーネント:
 * - アクセストークンとリフレッシュトークンの監視
 * - 期限切れ前の自動リフレッシュスケジューリング
 * - マルチアカウント対応のトークン管理
 * - 既存のjwt.tsユーティリティを基盤として構築
 */

import { 
  getTokenExpiration, 
  isTokenExpired, 
  getTokenRemainingSeconds, 
  getTokenInfo,
  type JWTPayload 
} from './jwt.js';
import { createComponentLogger } from './logger.js';

// コンポーネント専用ログ
const log = createComponentLogger('JWTTokenManager');

/**
 * トークン情報の詳細
 */
export interface TokenInfo {
  /** JWT トークン文字列 */
  token: string;
  /** アカウントID (DIDベース推奨) */
  accountId: string;
  /** トークンタイプ */
  type: 'access' | 'refresh';
  /** 有効期限 */
  expiresAt: Date | null;
  /** 残り有効時間（秒） */
  remainingSeconds: number;
  /** 期限切れかどうか */
  isExpired: boolean;
  /** リフレッシュが必要かどうか（バッファ時間内） */
  needsRefresh: boolean;
  /** トークン登録時刻 */
  registeredAt: Date;
  /** 最終チェック時刻 */
  lastCheckedAt: Date;
}

/**
 * リフレッシュスケジュール情報
 */
export interface RefreshSchedule {
  /** アカウントID */
  accountId: string;
  /** トークンタイプ */
  tokenType: 'access' | 'refresh';
  /** スケジュール時刻（milliseconds） */
  scheduleTime: number;
  /** リフレッシュコールバック */
  refreshCallback: () => Promise<void>;
  /** タイマーID */
  timerId: NodeJS.Timeout;
}

/**
 * トークンマネージャー設定
 */
export interface TokenManagerConfig {
  /** アクセストークンリフレッシュバッファ（秒）- デフォルト: 300秒（5分） */
  accessTokenRefreshBuffer: number;
  /** リフレッシュトークンリフレッシュバッファ（秒）- デフォルト: 3600秒（1時間） */
  refreshTokenRefreshBuffer: number;
  /** ヘルスチェック間隔（秒）- デフォルト: 60秒 */
  healthCheckInterval: number;
  /** ログ出力レベル */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * JWT Token Manager
 * 
 * AT Protocol セッション管理の中核となるトークン管理システム
 * 期限切れ前の自動リフレッシュにより、セッション切断を防止
 */
export class JWTTokenManager {
  private tokens = new Map<string, TokenInfo>();
  private refreshSchedules = new Map<string, RefreshSchedule>();
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private config: TokenManagerConfig;

  constructor(config: Partial<TokenManagerConfig> = {}) {
    this.config = {
      accessTokenRefreshBuffer: 300, // 5分
      refreshTokenRefreshBuffer: 3600, // 1時間
      healthCheckInterval: 60, // 1分
      logLevel: 'info',
      ...config
    };

    log.info('JWT Token Manager initialized', {
      accessTokenRefreshBuffer: this.config.accessTokenRefreshBuffer,
      refreshTokenRefreshBuffer: this.config.refreshTokenRefreshBuffer,
      healthCheckInterval: this.config.healthCheckInterval
    });

    // 定期ヘルスチェックを開始
    this.startHealthCheck();
  }

  /**
   * トークンを登録して監視を開始
   * 
   * @param accountId アカウントID（DID推奨）
   * @param token JWT トークン文字列
   * @param type トークンタイプ
   */
  public registerToken(accountId: string, token: string, type: 'access' | 'refresh'): void {
    try {
      const key = this.getTokenKey(accountId, type);
      
      // 既存のスケジュールをキャンセル
      this.cancelRefresh(accountId, type);

      // トークン情報を解析
      const tokenInfo = this.analyzeToken(accountId, token, type);
      
      if (!tokenInfo) {
        log.error('Failed to register invalid token', { accountId, type });
        return;
      }

      // トークンを登録
      this.tokens.set(key, tokenInfo);
      
      log.info('Token registered', {
        accountId,
        type,
        expiresAt: tokenInfo.expiresAt,
        remainingSeconds: tokenInfo.remainingSeconds,
        needsRefresh: tokenInfo.needsRefresh
      });

      // 必要に応じて自動リフレッシュをスケジュール
      if (tokenInfo.needsRefresh) {
        log.warn('Token registered but already needs refresh', {
          accountId,
          type,
          remainingSeconds: tokenInfo.remainingSeconds
        });
      }
    } catch (error) {
      log.error('Error registering token', { error, accountId, type });
    }
  }

  /**
   * トークンを削除して監視を停止
   * 
   * @param accountId アカウントID
   * @param type トークンタイプ
   */
  public removeToken(accountId: string, type: 'access' | 'refresh'): void {
    const key = this.getTokenKey(accountId, type);
    
    // スケジュールをキャンセル
    this.cancelRefresh(accountId, type);
    
    // トークンを削除
    const removed = this.tokens.delete(key);
    
    if (removed) {
      log.info('Token removed', { accountId, type });
    }
  }

  /**
   * トークン情報を取得
   * 
   * @param accountId アカウントID
   * @param type トークンタイプ
   * @returns トークン情報または null
   */
  public getTokenInfo(accountId: string, type: 'access' | 'refresh'): TokenInfo | null {
    const key = this.getTokenKey(accountId, type);
    const tokenInfo = this.tokens.get(key);
    
    if (!tokenInfo) {
      return null;
    }

    // 最新状態で情報を更新
    return this.refreshTokenInfo(tokenInfo);
  }

  /**
   * リフレッシュをスケジュール
   * 
   * @param accountId アカウントID
   * @param tokenType トークンタイプ
   * @param callback リフレッシュコールバック
   */
  public scheduleRefresh(
    accountId: string, 
    tokenType: 'access' | 'refresh', 
    callback: () => Promise<void>
  ): void {
    try {
      const tokenInfo = this.getTokenInfo(accountId, tokenType);
      
      if (!tokenInfo) {
        log.warn('Cannot schedule refresh for unregistered token', { accountId, tokenType });
        return;
      }

      // 既存のスケジュールをキャンセル
      this.cancelRefresh(accountId, tokenType);

      // リフレッシュタイミングを計算
      const buffer = this.getRefreshBuffer(tokenType);
      const refreshTime = Math.max(0, tokenInfo.remainingSeconds - buffer) * 1000;

      if (refreshTime <= 0) {
        // 即座にリフレッシュが必要
        log.warn('Token needs immediate refresh', {
          accountId,
          tokenType,
          remainingSeconds: tokenInfo.remainingSeconds
        });
        
        // 非同期でコールバックを実行
        setImmediate(async () => {
          try {
            await callback();
          } catch (error) {
            log.error('Immediate refresh callback failed', { error, accountId, tokenType });
          }
        });
        
        return;
      }

      // タイマーを設定
      const timerId = setTimeout(async () => {
        log.info('Executing scheduled refresh', { accountId, tokenType });
        
        try {
          await callback();
        } catch (error) {
          log.error('Scheduled refresh callback failed', { error, accountId, tokenType });
        } finally {
          // スケジュールを削除
          const scheduleKey = this.getTokenKey(accountId, tokenType);
          this.refreshSchedules.delete(scheduleKey);
        }
      }, refreshTime);

      // スケジュール情報を保存
      const schedule: RefreshSchedule = {
        accountId,
        tokenType,
        scheduleTime: Date.now() + refreshTime,
        refreshCallback: callback,
        timerId
      };

      const scheduleKey = this.getTokenKey(accountId, tokenType);
      this.refreshSchedules.set(scheduleKey, schedule);

      log.info('Refresh scheduled', {
        accountId,
        tokenType,
        refreshInSeconds: Math.floor(refreshTime / 1000),
        scheduledAt: new Date(schedule.scheduleTime)
      });
    } catch (error) {
      log.error('Error scheduling refresh', { error, accountId, tokenType });
    }
  }

  /**
   * リフレッシュスケジュールをキャンセル
   * 
   * @param accountId アカウントID
   * @param tokenType トークンタイプ
   */
  public cancelRefresh(accountId: string, tokenType: 'access' | 'refresh'): void {
    const scheduleKey = this.getTokenKey(accountId, tokenType);
    const schedule = this.refreshSchedules.get(scheduleKey);
    
    if (schedule) {
      clearTimeout(schedule.timerId);
      this.refreshSchedules.delete(scheduleKey);
      
      log.debug('Refresh schedule cancelled', { accountId, tokenType });
    }
  }

  /**
   * 全てのトークンをチェック
   * 
   * @returns 全トークン情報の配列
   */
  public checkAllTokens(): Array<TokenInfo> {
    const allTokens: Array<TokenInfo> = [];
    
    for (const tokenInfo of this.tokens.values()) {
      const updated = this.refreshTokenInfo(tokenInfo);
      allTokens.push(updated);
    }
    
    return allTokens;
  }

  /**
   * 期限切れトークンを取得
   * 
   * @returns 期限切れトークンの配列
   */
  public getExpiredTokens(): Array<TokenInfo> {
    return this.checkAllTokens().filter(token => token.isExpired);
  }

  /**
   * リフレッシュが必要なトークンを取得
   * 
   * @returns リフレッシュが必要なトークンの配列
   */
  public getTokensNeedingRefresh(): Array<TokenInfo> {
    return this.checkAllTokens().filter(token => token.needsRefresh && !token.isExpired);
  }

  /**
   * 特定アカウントのトークンを全て削除
   * 
   * @param accountId アカウントID
   */
  public removeAllTokensForAccount(accountId: string): void {
    this.removeToken(accountId, 'access');
    this.removeToken(accountId, 'refresh');
    
    log.info('All tokens removed for account', { accountId });
  }

  /**
   * 統計情報を取得
   */
  public getStats(): {
    totalTokens: number;
    accessTokens: number;
    refreshTokens: number;
    expiredTokens: number;
    tokensNeedingRefresh: number;
    scheduledRefreshes: number;
  } {
    const allTokens = this.checkAllTokens();
    
    return {
      totalTokens: allTokens.length,
      accessTokens: allTokens.filter(t => t.type === 'access').length,
      refreshTokens: allTokens.filter(t => t.type === 'refresh').length,
      expiredTokens: allTokens.filter(t => t.isExpired).length,
      tokensNeedingRefresh: allTokens.filter(t => t.needsRefresh).length,
      scheduledRefreshes: this.refreshSchedules.size
    };
  }

  /**
   * リソースを解放
   */
  public dispose(): void {
    log.info('Disposing JWT Token Manager');
    
    // 全てのリフレッシュスケジュールをキャンセル
    for (const schedule of this.refreshSchedules.values()) {
      clearTimeout(schedule.timerId);
    }
    this.refreshSchedules.clear();
    
    // ヘルスチェックタイマーを停止
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    // トークンをクリア
    this.tokens.clear();
    
    log.info('JWT Token Manager disposed');
  }

  /**
   * トークンキーを生成
   * 
   * @param accountId アカウントID
   * @param type トークンタイプ
   * @returns トークンキー
   */
  private getTokenKey(accountId: string, type: 'access' | 'refresh'): string {
    return `${accountId}:${type}`;
  }

  /**
   * トークンを解析
   * 
   * @param accountId アカウントID
   * @param token JWT トークン
   * @param type トークンタイプ
   * @returns トークン情報または null
   */
  private analyzeToken(accountId: string, token: string, type: 'access' | 'refresh'): TokenInfo | null {
    try {
      const info = getTokenInfo(token);
      
      if (!info.isValid) {
        return null;
      }

      const buffer = this.getRefreshBuffer(type);
      const needsRefresh = info.remainingSeconds <= buffer;
      const now = new Date();

      return {
        token,
        accountId,
        type,
        expiresAt: info.expiresAt,
        remainingSeconds: info.remainingSeconds,
        isExpired: info.isExpired,
        needsRefresh,
        registeredAt: now,
        lastCheckedAt: now
      };
    } catch (error) {
      log.error('Error analyzing token', { error, accountId, type });
      return null;
    }
  }

  /**
   * トークン情報を更新
   * 
   * @param tokenInfo 既存のトークン情報
   * @returns 更新されたトークン情報
   */
  private refreshTokenInfo(tokenInfo: TokenInfo): TokenInfo {
    const info = getTokenInfo(tokenInfo.token);
    const buffer = this.getRefreshBuffer(tokenInfo.type);
    const needsRefresh = info.remainingSeconds <= buffer;
    
    return {
      ...tokenInfo,
      remainingSeconds: info.remainingSeconds,
      isExpired: info.isExpired,
      needsRefresh,
      lastCheckedAt: new Date()
    };
  }

  /**
   * トークンタイプに応じたリフレッシュバッファを取得
   * 
   * @param type トークンタイプ
   * @returns バッファ時間（秒）
   */
  private getRefreshBuffer(type: 'access' | 'refresh'): number {
    return type === 'access' 
      ? this.config.accessTokenRefreshBuffer 
      : this.config.refreshTokenRefreshBuffer;
  }

  /**
   * 定期ヘルスチェックを開始
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval * 1000);
  }

  /**
   * ヘルスチェックを実行
   */
  private performHealthCheck(): void {
    try {
      const stats = this.getStats();
      
      if (this.config.logLevel === 'debug') {
        log.debug('Health check completed', stats);
      }

      // 期限切れトークンの警告
      const expiredTokens = this.getExpiredTokens();
      if (expiredTokens.length > 0) {
        log.warn('Found expired tokens', {
          count: expiredTokens.length,
          tokens: expiredTokens.map(t => ({
            accountId: t.accountId,
            type: t.type,
            expiredAt: t.expiresAt
          }))
        });
      }

      // リフレッシュが必要なトークンの警告
      const tokensNeedingRefresh = this.getTokensNeedingRefresh();
      if (tokensNeedingRefresh.length > 0) {
        log.warn('Found tokens needing refresh', {
          count: tokensNeedingRefresh.length,
          tokens: tokensNeedingRefresh.map(t => ({
            accountId: t.accountId,
            type: t.type,
            remainingSeconds: t.remainingSeconds
          }))
        });
      }
    } catch (error) {
      log.error('Health check failed', { error });
    }
  }
}

// シングルトンインスタンス
export const jwtTokenManager = new JWTTokenManager();