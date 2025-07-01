/**
 * Session Manager - プロアクティブなセッション管理システム
 * 
 * refreshSession問題の根本解決を目指す中核コンポーネント:
 * - 期限前自動リフレッシュによるセッション切断防止
 * - バックグラウンド監視による継続的ヘルスチェック  
 * - マルチアカウント対応の独立セッション管理
 * - AuthService・AgentManager・JWT Token Manager との統合
 */

import { jwtTokenManager } from '../utils/jwtTokenManager.js';
import { authService } from './authStore.js';
import { agentManager } from './agentManager.js';
import type { Account } from '../types/auth.js';
import { createComponentLogger } from '../utils/logger.js';
import { getTokenInfo } from '../utils/jwt.js';

// コンポーネント専用ログ
const log = createComponentLogger('SessionManager');

/**
 * セッション状態の詳細情報
 */
export interface SessionState {
  /** アカウントID (DID) */
  accountId: string;
  /** セッション有効性 */
  isValid: boolean;
  /** 最終検証時刻 */
  lastValidatedAt: Date;
  /** アクセストークン期限 */
  accessTokenExpiresAt: Date | null;
  /** リフレッシュトークン期限 */
  refreshTokenExpiresAt: Date | null;
  /** リフレッシュが必要かどうか */
  needsRefresh: boolean;
  /** 現在リフレッシュ処理中かどうか */
  refreshInProgress: boolean;
  /** 最終リフレッシュ試行時刻 */
  lastRefreshAttemptAt: Date | null;
  /** リフレッシュ失敗回数 */
  refreshFailureCount: number;
  /** エラー情報 */
  lastError: string | null;
}

/**
 * セッション検証結果
 */
export interface ValidationResult {
  /** アカウントID */
  accountId: string;
  /** ハンドル名 */
  handle: string;
  /** 検証成功かどうか */
  isValid: boolean;
  /** 検証時刻 */
  validatedAt: Date;
  /** アクション要求 */
  requiredAction: 'none' | 'refresh' | 'reauth';
  /** エラーメッセージ */
  error: string | null;
  /** セッション詳細情報 */
  sessionState: SessionState;
}

/**
 * SessionManager設定
 */
export interface SessionManagerConfig {
  /** リフレッシュ閾値（分）- この時間前にリフレッシュを実行 */
  refreshThresholdMinutes: number;
  /** バックグラウンド監視間隔（ミリ秒） */
  monitoringIntervalMs: number;
  /** 最大リトライ回数 */
  maxRetryAttempts: number;
  /** リトライ間隔（ミリ秒） */
  retryBackoffMs: number;
  /** リフレッシュタイムアウト（ミリ秒） */
  refreshTimeoutMs: number;
  /** バックグラウンド監視を有効にするか */
  enableBackgroundMonitoring: boolean;
  /** ネットワーク監視を有効にするか */
  enableNetworkMonitoring: boolean;
  /** フォーカス監視を有効にするか */
  enableFocusMonitoring: boolean;
}

/**
 * セッションイベント
 */
export type SessionEvent = 
  | { type: 'SessionRefreshed'; accountId: string; timestamp: Date }
  | { type: 'SessionExpired'; accountId: string; timestamp: Date }
  | { type: 'SessionError'; accountId: string; error: string; timestamp: Date }
  | { type: 'RefreshStarted'; accountId: string; timestamp: Date }
  | { type: 'RefreshCompleted'; accountId: string; success: boolean; timestamp: Date }
  | { type: 'MonitoringStarted'; timestamp: Date }
  | { type: 'MonitoringStopped'; timestamp: Date };

/**
 * Session Manager クラス
 * 
 * AT Protocol セッションのプロアクティブ管理を担当
 * JWT Token Manager と連携してトークン期限監視を行い、
 * AuthService を通じてセッションリフレッシュを実行
 */
export class SessionManager {
  private static instance: SessionManager | null = null;
  
  // 依存関係
  private jwtTokenManager = jwtTokenManager;
  private authService = authService;
  private agentManager = agentManager;
  
  // 状態管理
  private sessionStates = new Map<string, SessionState>();
  private refreshInProgress = new Map<string, Promise<void>>();
  private monitoringTimer: NodeJS.Timeout | null = null;
  private eventListeners: Array<(event: SessionEvent) => void> = [];
  
  // 設定
  private config: SessionManagerConfig;
  private isInitialized = false;

  constructor(config: Partial<SessionManagerConfig> = {}) {
    this.config = {
      refreshThresholdMinutes: 60,        // 1時間前
      monitoringIntervalMs: 300000,       // 5分間隔
      maxRetryAttempts: 3,                // 最大3回リトライ
      retryBackoffMs: 1000,               // 1秒間隔
      refreshTimeoutMs: 30000,            // 30秒タイムアウト
      enableBackgroundMonitoring: true,   // バックグラウンド監視有効
      enableNetworkMonitoring: false,     // ネットワーク監視（将来実装）
      enableFocusMonitoring: false,       // フォーカス監視（将来実装）
      ...config
    };

    log.info('Session Manager initialized', {
      refreshThresholdMinutes: this.config.refreshThresholdMinutes,
      monitoringIntervalMs: this.config.monitoringIntervalMs,
      maxRetryAttempts: this.config.maxRetryAttempts,
      backgroundMonitoring: this.config.enableBackgroundMonitoring
    });
  }

  /**
   * Singleton instance を取得
   */
  public static getInstance(config?: Partial<SessionManagerConfig>): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager(config);
    }
    return SessionManager.instance;
  }

  /**
   * SessionManager を初期化
   * アプリケーション起動時に呼び出し
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      log.warn('Session Manager already initialized');
      return;
    }

    try {
      log.info('Initializing Session Manager');

      // 既存のアカウントを取得してセッション状態を初期化
      await this.initializeExistingSessions();

      // BackgroundSessionMonitorを初期化および開始
      await this.initializeBackgroundMonitor();

      // バックグラウンド監視を開始
      if (this.config.enableBackgroundMonitoring) {
        this.startSessionMonitoring();
      }

      // ネットワーク・フォーカス監視を開始（将来実装）
      if (this.config.enableNetworkMonitoring) {
        this.startNetworkMonitoring();
      }
      
      if (this.config.enableFocusMonitoring) {
        this.startFocusMonitoring();
      }

      this.isInitialized = true;
      this.emitEvent({ type: 'MonitoringStarted', timestamp: new Date() });
      
      log.info('Session Manager initialization completed', {
        totalSessions: this.sessionStates.size,
        backgroundMonitoring: this.config.enableBackgroundMonitoring
      });
    } catch (error) {
      log.error('Failed to initialize Session Manager', { error });
      throw error;
    }
  }

  /**
   * BackgroundSessionMonitorを初期化
   */
  private async initializeBackgroundMonitor(): Promise<void> {
    try {
      const { backgroundSessionMonitor } = await import('./backgroundSessionMonitor.js');
      
      // BackgroundSessionMonitorを初期化および開始
      await backgroundSessionMonitor.initialize();
      await backgroundSessionMonitor.startMonitoring();
      
      log.info('BackgroundSessionMonitor initialized and started');
    } catch (error) {
      log.warn('Failed to initialize BackgroundSessionMonitor', { error });
    }
  }

  /**
   * SessionManager をシャットダウン
   * アプリケーション終了時に呼び出し
   */
  public dispose(): void {
    log.info('Disposing Session Manager');

    // BackgroundSessionMonitorを停止
    this.stopBackgroundMonitor();

    // バックグラウンド監視を停止
    this.stopSessionMonitoring();

    // ネットワーク・フォーカス監視を停止
    this.stopNetworkMonitoring();
    this.stopFocusMonitoring();

    // 進行中のリフレッシュをクリア
    this.refreshInProgress.clear();

    // セッション状態をクリア
    this.sessionStates.clear();

    // イベントリスナーをクリア
    this.eventListeners.length = 0;

    this.isInitialized = false;
    this.emitEvent({ type: 'MonitoringStopped', timestamp: new Date() });

    log.info('Session Manager disposed');
  }

  /**
   * BackgroundSessionMonitorを停止
   */
  private stopBackgroundMonitor(): void {
    try {
      // 動的インポートで循環依存を回避
      import('./backgroundSessionMonitor.js').then(({ backgroundSessionMonitor }) => {
        backgroundSessionMonitor.stopMonitoring();
      }).catch(error => {
        log.debug('Failed to stop BackgroundSessionMonitor', { error });
      });
    } catch (error) {
      log.debug('Failed to stop BackgroundSessionMonitor', { error });
    }
  }

  /**
   * セッション状態をリセット（テスト用）
   */
  public resetForTesting(): void {
    if (SessionManager.instance) {
      SessionManager.instance.dispose();
      SessionManager.instance = null;
    }
  }

  /**
   * 特定アカウントのプロアクティブリフレッシュを実行
   * 
   * @param accountId アカウントID (DID)
   * @returns リフレッシュ結果
   */
  public async proactiveRefresh(accountId: string): Promise<boolean> {
    try {
      log.info('Starting proactive refresh', { accountId });

      // 既に進行中の場合は待機
      const existingRefresh = this.refreshInProgress.get(accountId);
      if (existingRefresh) {
        log.debug('Refresh already in progress, waiting', { accountId });
        await existingRefresh;
        return this.getSessionState(accountId)?.isValid ?? false;
      }

      // リフレッシュ処理を開始
      const refreshPromise = this.executeRefresh(accountId);
      this.refreshInProgress.set(accountId, refreshPromise);

      try {
        await refreshPromise;
        const sessionState = this.getSessionState(accountId);
        const success = sessionState?.isValid ?? false;
        
        log.info('Proactive refresh completed', { 
          accountId, 
          success,
          isValid: sessionState?.isValid,
          failureCount: sessionState?.refreshFailureCount 
        });
        
        return success;
      } finally {
        this.refreshInProgress.delete(accountId);
      }
    } catch (error) {
      log.error('Proactive refresh failed', { error, accountId });
      this.refreshInProgress.delete(accountId);
      return false;
    }
  }

  /**
   * バックグラウンドセッション監視を開始
   */
  public startSessionMonitoring(): void {
    if (this.monitoringTimer) {
      log.warn('Session monitoring already started');
      return;
    }

    log.info('Starting background session monitoring', {
      intervalMs: this.config.monitoringIntervalMs
    });

    this.monitoringTimer = setInterval(async () => {
      try {
        await this.performBackgroundCheck();
      } catch (error) {
        log.error('Background check failed', { error });
      }
    }, this.config.monitoringIntervalMs);

    // 初回チェックを即座に実行
    setImmediate(() => this.performBackgroundCheck());
  }

  /**
   * バックグラウンドセッション監視を停止
   */
  public stopSessionMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
      log.info('Background session monitoring stopped');
    }
  }

  /**
   * 全セッションの検証を実行
   * 
   * @returns 検証結果の配列
   */
  public async validateAllSessions(): Promise<ValidationResult[]> {
    log.info('Validating all sessions');

    const results: ValidationResult[] = [];
    const accounts = await this.getAllAccounts();

    for (const account of accounts) {
      try {
        const result = await this.validateSession(account);
        results.push(result);
      } catch (error) {
        log.error('Session validation failed', { 
          error, 
          accountId: account.profile.did,
          handle: account.profile.handle 
        });
        
        results.push({
          accountId: account.profile.did,
          handle: account.profile.handle,
          isValid: false,
          validatedAt: new Date(),
          requiredAction: 'reauth',
          error: `Validation failed: ${error}`,
          sessionState: this.getOrCreateSessionState(account.profile.did)
        });
      }
    }

    log.info('All sessions validated', {
      totalSessions: results.length,
      validSessions: results.filter(r => r.isValid).length,
      invalidSessions: results.filter(r => !r.isValid).length,
      needsRefresh: results.filter(r => r.requiredAction === 'refresh').length
    });

    return results;
  }

  /**
   * イベントリスナーを追加
   * 
   * @param listener イベントリスナー関数
   */
  public addEventListener(listener: (event: SessionEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * イベントリスナーを削除
   * 
   * @param listener 削除するイベントリスナー関数
   */
  public removeEventListener(listener: (event: SessionEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * セッション統計を取得
   */
  public getStats(): {
    totalSessions: number;
    validSessions: number;
    invalidSessions: number;
    refreshInProgress: number;
    needsRefresh: number;
    monitoring: boolean;
  } {
    const states = Array.from(this.sessionStates.values());
    
    return {
      totalSessions: states.length,
      validSessions: states.filter(s => s.isValid).length,
      invalidSessions: states.filter(s => !s.isValid).length,
      refreshInProgress: this.refreshInProgress.size,
      needsRefresh: states.filter(s => s.needsRefresh).length,
      monitoring: this.monitoringTimer !== null
    };
  }

  /**
   * 特定アカウントのセッション状態を取得
   * 
   * @param accountId アカウントID
   * @returns セッション状態または null
   */
  public getSessionState(accountId: string): SessionState | null {
    return this.sessionStates.get(accountId) || null;
  }

  /**
   * セッション期限切れ通知 (AuthService から呼び出し)
   * 
   * @param accountId アカウントID
   */
  public async notifySessionExpired(accountId: string): Promise<void> {
    try {
      const sessionState = this.getOrCreateSessionState(accountId);
      sessionState.isValid = false;
      sessionState.lastError = 'Session expired';
      sessionState.lastValidatedAt = new Date();
      
      this.emitEvent({ 
        type: 'SessionExpired', 
        accountId, 
        timestamp: new Date() 
      });
      
      log.info('Session expiration notified', { accountId });
    } catch (error) {
      log.error('Failed to handle session expiration notification', { error, accountId });
    }
  }

  // ===== Private Methods =====

  /**
   * 既存セッションを初期化
   */
  private async initializeExistingSessions(): Promise<void> {
    try {
      const accounts = await this.getAllAccounts();
      
      log.debug('Initializing existing sessions', { accountCount: accounts.length });

      for (const account of accounts) {
        await this.registerSession(account);
      }

      log.info('Existing sessions initialized', { 
        totalSessions: this.sessionStates.size 
      });
    } catch (error) {
      log.error('Failed to initialize existing sessions', { error });
      throw error;
    }
  }

  /**
   * セッションを登録
   * 
   * @param account アカウント情報
   */
  private async registerSession(account: Account): Promise<void> {
    const accountId = account.profile.did;
    
    try {
      // セッション状態を作成
      const sessionState = this.getOrCreateSessionState(accountId);
      
      // JWT Token Manager にトークンを登録
      if (account.session?.accessJwt) {
        this.jwtTokenManager.registerToken(
          accountId, 
          account.session.accessJwt, 
          'access'
        );
        
        // プロアクティブリフレッシュのコールバックを登録
        this.jwtTokenManager.scheduleRefresh(
          accountId,
          'access',
          async () => {
            await this.proactiveRefresh(accountId);
          }
        );
      }

      if (account.session?.refreshJwt) {
        this.jwtTokenManager.registerToken(
          accountId, 
          account.session.refreshJwt, 
          'refresh'
        );
      }

      // セッション状態を更新
      await this.updateSessionState(account);

      log.debug('Session registered', { 
        accountId, 
        handle: account.profile.handle,
        hasAccessToken: !!account.session?.accessJwt,
        hasRefreshToken: !!account.session?.refreshJwt
      });
    } catch (error) {
      log.error('Failed to register session', { 
        error, 
        accountId, 
        handle: account.profile.handle 
      });
    }
  }

  /**
   * セッション状態を取得または作成
   * 
   * @param accountId アカウントID
   * @returns セッション状態
   */
  private getOrCreateSessionState(accountId: string): SessionState {
    let sessionState = this.sessionStates.get(accountId);
    
    if (!sessionState) {
      sessionState = {
        accountId,
        isValid: false,
        lastValidatedAt: new Date(),
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        needsRefresh: false,
        refreshInProgress: false,
        lastRefreshAttemptAt: null,
        refreshFailureCount: 0,
        lastError: null
      };
      
      this.sessionStates.set(accountId, sessionState);
    }
    
    return sessionState;
  }

  /**
   * セッション状態を更新
   * 
   * @param account アカウント情報
   */
  private async updateSessionState(account: Account): Promise<void> {
    const accountId = account.profile.did;
    const sessionState = this.getOrCreateSessionState(accountId);

    try {
      // JWT Token Manager からトークン情報を取得
      const accessTokenInfo = this.jwtTokenManager.getTokenInfo(accountId, 'access');
      const refreshTokenInfo = this.jwtTokenManager.getTokenInfo(accountId, 'refresh');

      // セッション状態を更新
      sessionState.lastValidatedAt = new Date();
      sessionState.accessTokenExpiresAt = accessTokenInfo?.expiresAt || null;
      sessionState.refreshTokenExpiresAt = refreshTokenInfo?.expiresAt || null;
      sessionState.needsRefresh = accessTokenInfo?.needsRefresh || false;
      sessionState.isValid = !!(accessTokenInfo && !accessTokenInfo.isExpired);

      // リフレッシュ閾値チェック
      if (accessTokenInfo) {
        const thresholdSeconds = this.config.refreshThresholdMinutes * 60;
        const needsRefresh = accessTokenInfo.remainingSeconds <= thresholdSeconds;
        sessionState.needsRefresh = needsRefresh;
      }

      log.debug('Session state updated', {
        accountId,
        isValid: sessionState.isValid,
        needsRefresh: sessionState.needsRefresh,
        accessTokenExpires: sessionState.accessTokenExpiresAt,
        refreshTokenExpires: sessionState.refreshTokenExpiresAt
      });
    } catch (error) {
      log.error('Failed to update session state', { error, accountId });
      sessionState.isValid = false;
      sessionState.lastError = `Update failed: ${error}`;
    }
  }

  /**
   * 全アカウント情報を取得
   * 
   * @returns アカウント配列
   */
  private async getAllAccounts(): Promise<Account[]> {
    try {
      const result = await this.authService.getAllAccounts();
      if (!result.success || !result.data) {
        log.warn('Failed to get accounts', { error: result.error });
        return [];
      }
      return result.data;
    } catch (error) {
      log.error('Error getting all accounts', { error });
      return [];
    }
  }

  /**
   * リフレッシュ処理を実行
   * 
   * @param accountId アカウントID
   */
  private async executeRefresh(accountId: string): Promise<void> {
    const sessionState = this.getOrCreateSessionState(accountId);
    
    try {
      sessionState.refreshInProgress = true;
      sessionState.lastRefreshAttemptAt = new Date();
      
      this.emitEvent({ 
        type: 'RefreshStarted', 
        accountId, 
        timestamp: new Date() 
      });

      // タイムアウト付きでリフレッシュを実行
      const refreshPromise = this.performRefreshWithTimeout(accountId);
      await refreshPromise;

      // 成功時の処理
      sessionState.refreshFailureCount = 0;
      sessionState.lastError = null;
      sessionState.isValid = true;
      
      this.emitEvent({ 
        type: 'RefreshCompleted', 
        accountId, 
        success: true, 
        timestamp: new Date() 
      });
      
      this.emitEvent({ 
        type: 'SessionRefreshed', 
        accountId, 
        timestamp: new Date() 
      });

      log.info('Session refresh successful', { accountId });
    } catch (error) {
      // 失敗時の処理
      sessionState.refreshFailureCount++;
      sessionState.lastError = `Refresh failed: ${error}`;
      
      if (sessionState.refreshFailureCount >= this.config.maxRetryAttempts) {
        sessionState.isValid = false;
        this.emitEvent({ 
          type: 'SessionExpired', 
          accountId, 
          timestamp: new Date() 
        });
      }
      
      this.emitEvent({ 
        type: 'RefreshCompleted', 
        accountId, 
        success: false, 
        timestamp: new Date() 
      });
      
      this.emitEvent({ 
        type: 'SessionError', 
        accountId, 
        error: `${error}`, 
        timestamp: new Date() 
      });

      log.error('Session refresh failed', { 
        error, 
        accountId, 
        attemptCount: sessionState.refreshFailureCount,
        maxAttempts: this.config.maxRetryAttempts
      });

      throw error;
    } finally {
      sessionState.refreshInProgress = false;
    }
  }

  /**
   * タイムアウト付きリフレッシュ実行
   * 
   * @param accountId アカウントID
   */
  private async performRefreshWithTimeout(accountId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Refresh timeout (${this.config.refreshTimeoutMs}ms)`));
      }, this.config.refreshTimeoutMs);

      try {
        // AuthService を通じてリフレッシュを実行
        const result = await this.authService.refreshSession(accountId);
        
        if (!result.success) {
          throw new Error(result.error?.message || 'Refresh failed');
        }

        // 成功時にトークンを再登録（単一アカウントの場合のみ）
        if (result.data && !Array.isArray(result.data)) {
          const account = result.data as Account;
          await this.updateSessionAfterRefresh(account);
        }

        clearTimeout(timeout);
        resolve();
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * リフレッシュ後のセッション更新 (AuthService から呼び出し)
   * 
   * @param account 更新されたアカウント情報
   */
  public async updateSessionAfterRefresh(account: Account): Promise<void> {
    const accountId = account.profile.did;
    
    try {
      // JWT Token Manager のトークンを更新
      if (account.session?.accessJwt) {
        this.jwtTokenManager.removeToken(accountId, 'access');
        this.jwtTokenManager.registerToken(accountId, account.session.accessJwt, 'access');
        
        // 新しいトークンでリフレッシュをスケジュール
        this.jwtTokenManager.scheduleRefresh(
          accountId,
          'access',
          async () => {
            await this.proactiveRefresh(accountId);
          }
        );
      }

      if (account.session?.refreshJwt) {
        this.jwtTokenManager.removeToken(accountId, 'refresh');
        this.jwtTokenManager.registerToken(accountId, account.session.refreshJwt, 'refresh');
      }

      // AgentManager の Agent も更新
      if (this.agentManager.hasAgent(account)) {
        const agent = await this.agentManager.getAgent(account);
        if (account.session) {
          agent.agent.resumeSession(account.session);
        }
      }

      // セッション状態を更新
      await this.updateSessionState(account);

      log.debug('Session updated after refresh', { 
        accountId, 
        handle: account.profile.handle 
      });
    } catch (error) {
      log.error('Failed to update session after refresh', { error, accountId });
      throw error;
    }
  }

  /**
   * 個別セッションを検証
   * 
   * @param account アカウント情報
   * @returns 検証結果
   */
  private async validateSession(account: Account): Promise<ValidationResult> {
    const accountId = account.profile.did;
    const handle = account.profile.handle;
    
    try {
      // セッション状態を更新
      await this.updateSessionState(account);
      const sessionState = this.getOrCreateSessionState(accountId);

      // Agent を通じてセッション検証
      if (this.agentManager.hasAgent(account)) {
        const agent = await this.agentManager.getAgent(account);
        const isAgentValid = await agent.validateSession();
        
        if (!isAgentValid) {
          sessionState.isValid = false;
        }
      }

      // 検証結果を決定
      let requiredAction: 'none' | 'refresh' | 'reauth' = 'none';
      
      if (!sessionState.isValid) {
        requiredAction = sessionState.refreshFailureCount >= this.config.maxRetryAttempts 
          ? 'reauth' 
          : 'refresh';
      } else if (sessionState.needsRefresh) {
        requiredAction = 'refresh';
      }

      return {
        accountId,
        handle,
        isValid: sessionState.isValid,
        validatedAt: new Date(),
        requiredAction,
        error: sessionState.lastError,
        sessionState: { ...sessionState }
      };
    } catch (error) {
      log.error('Session validation error', { error, accountId, handle });
      
      return {
        accountId,
        handle,
        isValid: false,
        validatedAt: new Date(),
        requiredAction: 'reauth',
        error: `Validation error: ${error}`,
        sessionState: this.getOrCreateSessionState(accountId)
      };
    }
  }

  /**
   * バックグラウンドチェックを実行
   */
  private async performBackgroundCheck(): Promise<void> {
    try {
      log.debug('Performing background session check');

      const validationResults = await this.validateAllSessions();
      
      // リフレッシュが必要なセッションを自動リフレッシュ
      const needsRefresh = validationResults.filter(r => 
        r.requiredAction === 'refresh' && !r.sessionState.refreshInProgress
      );

      if (needsRefresh.length > 0) {
        log.info('Starting automatic refresh for sessions', {
          count: needsRefresh.length,
          accounts: needsRefresh.map(r => ({ accountId: r.accountId, handle: r.handle }))
        });

        // 並列でリフレッシュを実行（但し個別に失敗しても継続）
        const refreshPromises = needsRefresh.map(async (result) => {
          try {
            await this.proactiveRefresh(result.accountId);
          } catch (error) {
            log.warn('Background refresh failed', { 
              error, 
              accountId: result.accountId, 
              handle: result.handle 
            });
          }
        });

        await Promise.allSettled(refreshPromises);
      }

      log.debug('Background session check completed', {
        totalSessions: validationResults.length,
        validSessions: validationResults.filter(r => r.isValid).length,
        refreshedSessions: needsRefresh.length
      });
    } catch (error) {
      log.error('Background check failed', { error });
    }
  }

  /**
   * イベントを発行
   * 
   * @param event セッションイベント
   */
  private emitEvent(event: SessionEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        log.error('Event listener failed', { error, eventType: event.type });
      }
    }
  }

  /**
   * ネットワーク監視を開始（将来実装）
   */
  private startNetworkMonitoring(): void {
    // TODO: ネットワーク状態変更の監視
    // navigator.onLine イベントなど
    log.debug('Network monitoring - future implementation');
  }

  /**
   * ネットワーク監視を停止（将来実装）
   */
  private stopNetworkMonitoring(): void {
    // TODO: ネットワーク監視の停止
    log.debug('Stop network monitoring - future implementation');
  }

  /**
   * フォーカス監視を開始（将来実装）
   */
  private startFocusMonitoring(): void {
    // TODO: アプリフォーカス変更の監視
    // document focus/blur イベントなど
    log.debug('Focus monitoring - future implementation');
  }

  /**
   * フォーカス監視を停止（将来実装）
   */
  private stopFocusMonitoring(): void {
    // TODO: フォーカス監視の停止
    log.debug('Stop focus monitoring - future implementation');
  }

  /**
   * AgentManagerからのセッション更新通知を処理
   * Issue #90: AgentManager統合強化
   */
  public async handleAgentSessionUpdate(accountId: string, event: any, session?: any): Promise<void> {
    try {
      log.debug('Received agent session update', { 
        accountId, 
        event: event?.type || event,
        hasSession: !!session 
      });

      // セッション状態を更新
      const currentState = this.sessionStates.get(accountId);
      if (currentState) {
        currentState.lastValidatedAt = new Date();
        
        // セッションイベントに応じて状態を更新
        if (event === 'session-update' || event?.type === 'session-update') {
          currentState.isValid = true;
          currentState.refreshFailureCount = 0;
          currentState.lastError = null;
          
          // JWT情報を更新
          if (session?.accessJwt) {
            const tokenInfo = getTokenInfo(session.accessJwt);
            if (tokenInfo.expiresAt) {
              currentState.accessTokenExpiresAt = tokenInfo.expiresAt;
            }
          }

          if (session?.refreshJwt) {
            const refreshTokenInfo = getTokenInfo(session.refreshJwt);
            if (refreshTokenInfo.expiresAt) {
              currentState.refreshTokenExpiresAt = refreshTokenInfo.expiresAt;
            }
          }

          this.emitEvent({
            type: 'SessionRefreshed',
            accountId,
            timestamp: new Date()
          });
        }
      } else {
        log.warn('Session state not found for agent update', { accountId });
        // 新しいセッション状態を作成
        await this.initializeSessionState(accountId);
      }

    } catch (error) {
      log.error('Failed to handle agent session update', { error, accountId, event });
      
      // エラー状態を記録
      const currentState = this.sessionStates.get(accountId);
      if (currentState) {
        currentState.lastError = error instanceof Error ? error.message : 'Unknown error';
        currentState.refreshFailureCount++;
      }
    }
  }

  /**
   * AgentManagerからのAgent削除通知を処理
   * Issue #90: AgentManager統合強化
   */
  public async handleAgentRemoval(accountKey: string): Promise<void> {
    try {
      log.debug('Received agent removal notification', { accountKey });

      // セッション状態をクリーンアップ
      const sessionState = this.sessionStates.get(accountKey);
      if (sessionState) {
        // 進行中のリフレッシュ処理をキャンセル
        const refreshPromise = this.refreshInProgress.get(accountKey);
        if (refreshPromise) {
          this.refreshInProgress.delete(accountKey);
          log.debug('Cancelled ongoing refresh for removed agent', { accountKey });
        }

        // セッション状態を削除
        this.sessionStates.delete(accountKey);
        
        this.emitEvent({
          type: 'SessionExpired',
          accountId: accountKey,
          timestamp: new Date()
        });

        log.info('Session state cleaned up for removed agent', { 
          accountKey,
          remainingSessions: this.sessionStates.size
        });
      } else {
        log.debug('No session state found for removed agent', { accountKey });
      }

    } catch (error) {
      log.error('Failed to handle agent removal', { error, accountKey });
    }
  }

  /**
   * 指定されたアカウントのセッション状態を初期化
   * AgentManager統合用のヘルパーメソッド
   */
  private async initializeSessionState(accountId: string): Promise<void> {
    try {
      // AuthServiceから現在のアカウント情報を取得
      const accountsResult = await this.authService.getAllAccounts();
      if (!accountsResult.success || !accountsResult.data) {
        log.warn('Failed to get accounts from AuthService', { accountId });
        return;
      }
      
      const account = accountsResult.data.find((acc: Account) => acc.id === accountId || acc.profile.did === accountId);
      
      if (account && account.session) {
        // 初期セッション状態を作成
        const now = new Date();
        const state: SessionState = {
          accountId,
          isValid: true,
          lastValidatedAt: now,
          accessTokenExpiresAt: null,
          refreshTokenExpiresAt: null,
          needsRefresh: false,
          refreshInProgress: false,
          lastRefreshAttemptAt: null,
          refreshFailureCount: 0,
          lastError: null
        };
        
        this.sessionStates.set(accountId, state);
        
        log.debug('Initialized session state for agent', { 
          accountId,
          handle: account.profile.handle
        });
      } else {
        log.warn('Could not initialize session state - account not found', { accountId });
      }
    } catch (error) {
      log.error('Failed to initialize session state', { error, accountId });
    }
  }
}

// シングルトンインスタンス
export const sessionManager = SessionManager.getInstance();