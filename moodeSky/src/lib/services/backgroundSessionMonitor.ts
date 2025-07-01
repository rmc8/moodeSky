/**
 * Background Session Monitor - 包括的バックグラウンドセッション監視システム
 * 
 * Issue #91: バックグラウンドセッション監視システム実装
 * - 継続的セッションヘルス監視
 * - 自動問題検出と解決
 * - アプリライフサイクル対応監視
 * - パフォーマンス最適化されたバックグラウンドタスク
 */

import type { 
  MonitoringConfig, 
  NetworkStatus, 
  AppLifecycleEvent,
  HealthCheckResult,
  HealthCheckType,
  MonitoringStats,
  MonitoringEvent,
  NetworkHealth,
  BatteryStatus
} from '../types/backgroundMonitor.js';
import type { Account } from '../types/auth.js';
import { createComponentLogger } from '../utils/logger.js';

// コンポーネント専用ログ
const log = createComponentLogger('BackgroundSessionMonitor');

/**
 * BackgroundSessionMonitor クラス
 * 包括的なバックグラウンドセッション監視を提供するシングルトンサービス
 */
export class BackgroundSessionMonitor {
  private static instance: BackgroundSessionMonitor | null = null;

  // 依存関係（動的インポートで循環依存回避）
  private sessionManager: any = null;
  private agentManager: any = null;
  private authService: any = null;

  // 監視タイマー管理
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private networkCheckTimer: NodeJS.Timeout | null = null;
  private lifecycleTimer: NodeJS.Timeout | null = null;

  // 状態管理
  private isMonitoring = false;
  private isAppFocused = true;
  private networkStatus: NetworkStatus = 'unknown';
  private batteryStatus: BatteryStatus = {
    level: 1.0,
    isCharging: true,
    isLow: false,
    lastUpdatedAt: new Date()
  };

  // 設定管理
  private config: MonitoringConfig;
  private isInitialized = false;

  // 統計管理
  private stats: MonitoringStats;
  private eventListeners: Array<(event: MonitoringEvent) => void> = [];
  private recentHealthChecks: HealthCheckResult[] = [];
  private networkHealth: NetworkHealth;

  // パフォーマンス最適化
  private concurrentChecks = 0;
  private lastCleanupAt = new Date();

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      intervalMs: 300000,                    // 5分間隔
      enableOnFocus: true,                   // フォーカス時監視有効
      enableNetworkCheck: true,              // ネットワークチェック有効
      maxConcurrentChecks: 3,                // 最大3並列チェック
      retryIntervalMs: 30000,                // 30秒リトライ間隔
      enableBatteryOptimization: true,       // バッテリー最適化有効
      backgroundIntervalMultiplier: 2.0,     // バックグラウンド時は2倍間隔
      ...config
    };

    // 統計初期化
    this.stats = {
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      avgResponseTimeMs: 0,
      lastCheckAt: new Date(),
      startedAt: new Date(),
      errorRate: 0,
      activeAccounts: 0
    };

    // ネットワークヘルス初期化
    this.networkHealth = {
      isOnline: true,
      latencyMs: 0,
      errorRate: 0,
      lastCheckedAt: new Date()
    };

    log.info('Background Session Monitor initialized', {
      intervalMs: this.config.intervalMs,
      enableOnFocus: this.config.enableOnFocus,
      enableNetworkCheck: this.config.enableNetworkCheck,
      maxConcurrentChecks: this.config.maxConcurrentChecks
    });
  }

  /**
   * Singleton instance を取得
   */
  public static getInstance(config?: Partial<MonitoringConfig>): BackgroundSessionMonitor {
    if (!BackgroundSessionMonitor.instance) {
      BackgroundSessionMonitor.instance = new BackgroundSessionMonitor(config);
    }
    return BackgroundSessionMonitor.instance;
  }

  /**
   * バックグラウンド監視を初期化
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      log.warn('Background Session Monitor already initialized');
      return;
    }

    try {
      log.info('Initializing Background Session Monitor');

      // 依存関係を動的インポート
      await this.loadDependencies();

      // 初期状態を設定
      await this.initializeAppState();

      // イベントリスナーを設定
      this.setupEventListeners();

      this.isInitialized = true;
      
      this.emitEvent({
        type: 'MonitoringStarted',
        timestamp: new Date(),
        config: this.config
      });
      
      log.info('Background Session Monitor initialization completed');
    } catch (error) {
      log.error('Failed to initialize Background Session Monitor', { error });
      throw error;
    }
  }

  /**
   * バックグラウンド監視を開始
   */
  public async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      log.warn('Background monitoring already running');
      return;
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      log.info('Starting background monitoring');

      this.isMonitoring = true;
      this.stats.startedAt = new Date();

      // 主要監視タスクを開始
      this.startHealthCheckLoop();
      
      if (this.config.enableNetworkCheck) {
        this.startNetworkMonitoring();
      }

      // 初回ヘルスチェックを実行
      await this.performImmediateHealthCheck();

      log.info('Background monitoring started successfully');
    } catch (error) {
      log.error('Failed to start background monitoring', { error });
      this.isMonitoring = false;
      throw error;
    }
  }

  /**
   * バックグラウンド監視を停止
   */
  public async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      log.warn('Background monitoring not running');
      return;
    }

    try {
      log.info('Stopping background monitoring');

      this.isMonitoring = false;

      // 全タイマーを停止
      this.stopAllTimers();

      // 統計を更新
      this.stats.lastCheckAt = new Date();

      this.emitEvent({
        type: 'MonitoringStopped',
        timestamp: new Date(),
        stats: { ...this.stats }
      });

      log.info('Background monitoring stopped', {
        totalChecks: this.stats.totalChecks,
        successRate: this.stats.successfulChecks / this.stats.totalChecks,
        avgResponseTime: this.stats.avgResponseTimeMs
      });
    } catch (error) {
      log.error('Failed to stop background monitoring', { error });
    }
  }

  /**
   * 依存関係を動的インポート
   */
  private async loadDependencies(): Promise<void> {
    try {
      const [
        { sessionManager },
        { agentManager },
        { authService }
      ] = await Promise.all([
        import('./sessionManager.js'),
        import('./agentManager.js'),
        import('./authStore.js')
      ]);

      this.sessionManager = sessionManager;
      this.agentManager = agentManager;
      this.authService = authService;

      log.debug('Dependencies loaded successfully');
    } catch (error) {
      log.error('Failed to load dependencies', { error });
      throw error;
    }
  }

  /**
   * アプリ初期状態を設定
   */
  private async initializeAppState(): Promise<void> {
    try {
      // ネットワーク状態を確認
      this.networkStatus = await this.checkNetworkStatus();
      
      // バッテリー状態を確認（Tauri環境）
      await this.checkBatteryStatus();

      // アクティブアカウント数を取得
      if (this.authService) {
        const accountsResult = await this.authService.getAllAccounts();
        if (accountsResult.success && accountsResult.data) {
          this.stats.activeAccounts = accountsResult.data.length;
        }
      }

      log.debug('App state initialized', {
        networkStatus: this.networkStatus,
        batteryLevel: this.batteryStatus.level,
        activeAccounts: this.stats.activeAccounts
      });
    } catch (error) {
      log.warn('Failed to initialize app state', { error });
    }
  }

  /**
   * イベントリスナーを設定
   */
  private setupEventListeners(): void {
    try {
      // Tauri app focus/blur events
      if (typeof window !== 'undefined') {
        window.addEventListener('focus', this.handleAppFocus.bind(this));
        window.addEventListener('blur', this.handleAppBlur.bind(this));
        
        // ネットワーク状態変更
        window.addEventListener('online', this.handleNetworkOnline.bind(this));
        window.addEventListener('offline', this.handleNetworkOffline.bind(this));
      }

      log.debug('Event listeners setup completed');
    } catch (error) {
      log.warn('Failed to setup event listeners', { error });
    }
  }

  /**
   * ヘルスチェックループを開始
   */
  private startHealthCheckLoop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    const interval = this.calculateDynamicInterval();
    
    this.healthCheckTimer = setInterval(async () => {
      if (this.isMonitoring && this.concurrentChecks < this.config.maxConcurrentChecks) {
        await this.performScheduledHealthCheck();
      }
    }, interval);

    log.debug('Health check loop started', { intervalMs: interval });
  }

  /**
   * ネットワーク監視を開始
   */
  private startNetworkMonitoring(): void {
    if (this.networkCheckTimer) {
      clearInterval(this.networkCheckTimer);
    }

    // ネットワークチェックは通常より短い間隔
    const networkInterval = Math.min(this.config.intervalMs, 60000); // 最大1分

    this.networkCheckTimer = setInterval(async () => {
      if (this.isMonitoring) {
        await this.performNetworkHealthCheck();
      }
    }, networkInterval);

    log.debug('Network monitoring started', { intervalMs: networkInterval });
  }

  /**
   * 動的間隔を計算
   */
  private calculateDynamicInterval(): number {
    let baseInterval = this.config.intervalMs;

    // アプリがフォーカスされていない場合は間隔を伸ばす
    if (!this.isAppFocused) {
      baseInterval *= this.config.backgroundIntervalMultiplier;
    }

    // バッテリー最適化
    if (this.config.enableBatteryOptimization && this.batteryStatus.isLow) {
      baseInterval *= 2.0; // 低バッテリー時は間隔を2倍に
    }

    // ネットワーク状態に応じた調整
    if (this.networkStatus === 'offline') {
      baseInterval *= 1.5; // オフライン時は間隔を延長
    } else if (this.networkStatus === 'slow') {
      baseInterval *= 1.2; // 低速時は軽微に延長
    }

    return Math.max(baseInterval, 30000); // 最小30秒
  }

  /**
   * 即座にヘルスチェックを実行
   */
  private async performImmediateHealthCheck(): Promise<void> {
    try {
      log.debug('Performing immediate health check');
      await this.performComprehensiveHealthCheck();
    } catch (error) {
      log.warn('Immediate health check failed', { error });
    }
  }

  /**
   * スケジュールされたヘルスチェックを実行
   */
  private async performScheduledHealthCheck(): Promise<void> {
    try {
      // 同時実行制限チェック
      if (this.concurrentChecks >= this.config.maxConcurrentChecks) {
        log.debug('Skipping health check due to concurrent limit');
        return;
      }

      this.concurrentChecks++;
      
      await this.performComprehensiveHealthCheck();

      // 定期的なクリーンアップ
      if (Date.now() - this.lastCleanupAt.getTime() > 3600000) { // 1時間
        this.performPeriodicCleanup();
      }
    } catch (error) {
      log.warn('Scheduled health check failed', { error });
    } finally {
      this.concurrentChecks--;
    }
  }

  /**
   * 包括的ヘルスチェックを実行
   */
  private async performComprehensiveHealthCheck(): Promise<void> {
    try {
      if (!this.authService) return;

      const accountsResult = await this.authService.getAllAccounts();
      if (!accountsResult.success || !accountsResult.data) {
        log.warn('Failed to get accounts for health check');
        return;
      }

      const accounts: Account[] = accountsResult.data;
      this.stats.activeAccounts = accounts.length;

      // 各アカウントに対してヘルスチェックを実行
      const healthCheckPromises = accounts.map(account => 
        this.performAccountHealthCheck(account)
      );

      const results = await Promise.allSettled(healthCheckPromises);
      
      // 結果を処理
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          this.processHealthCheckResult(result.value);
        } else {
          log.warn('Health check failed for account', { 
            accountIndex: index,
            error: result.reason 
          });
        }
      });

      this.stats.lastCheckAt = new Date();
      
      log.debug('Comprehensive health check completed', {
        accountsChecked: accounts.length,
        totalChecks: this.stats.totalChecks
      });
    } catch (error) {
      log.error('Comprehensive health check failed', { error });
    }
  }

  /**
   * 個別アカウントのヘルスチェック
   */
  private async performAccountHealthCheck(account: Account): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    try {
      // 1. トークン有効性チェック
      const tokenResult = await this.checkTokenValidity(account);
      results.push(tokenResult);

      // 2. セッション整合性チェック
      const sessionResult = await this.checkSessionConsistency(account);
      results.push(sessionResult);

      // 3. Agent ヘルスチェック（AgentManagerがある場合）
      if (this.agentManager && this.agentManager.hasAgent(account)) {
        const agentResult = await this.checkAgentHealth(account);
        results.push(agentResult);
      }

      return results;
    } catch (error) {
      log.warn('Account health check failed', { 
        accountId: account.id,
        error: error instanceof Error ? error.message : error 
      });
      
      return [{
        accountId: account.id,
        checkType: 'agent-health',
        success: false,
        responseTimeMs: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      }];
    }
  }

  /**
   * トークン有効性をチェック
   */
  private async checkTokenValidity(account: Account): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // SessionManagerのバリデーション機能を使用
      if (this.sessionManager) {
        const validationResult = await this.sessionManager.validateAccountSession(account.id);
        
        return {
          accountId: account.id,
          checkType: 'token-validation',
          success: validationResult.isValid,
          responseTimeMs: Date.now() - startTime,
          error: validationResult.error,
          details: validationResult,
          timestamp: new Date()
        };
      }

      return {
        accountId: account.id,
        checkType: 'token-validation',
        success: false,
        responseTimeMs: Date.now() - startTime,
        error: 'SessionManager not available',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        accountId: account.id,
        checkType: 'token-validation',
        success: false,
        responseTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * セッション整合性をチェック
   */
  private async checkSessionConsistency(account: Account): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // AuthService と Agent の状態を比較
      const hasValidSession = !!(account.session?.accessJwt && account.session?.refreshJwt);
      
      return {
        accountId: account.id,
        checkType: 'session-consistency',
        success: hasValidSession,
        responseTimeMs: Date.now() - startTime,
        details: {
          hasAccessToken: !!account.session?.accessJwt,
          hasRefreshToken: !!account.session?.refreshJwt,
          sessionValid: hasValidSession
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        accountId: account.id,
        checkType: 'session-consistency',
        success: false,
        responseTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Agent ヘルスチェック
   */
  private async checkAgentHealth(account: Account): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      if (!this.agentManager) {
        throw new Error('AgentManager not available');
      }

      const agent = await this.agentManager.getAgent(account);
      const agentStats = agent.getApiStats();
      const isHealthy = agent.status === 'active' && agentStats.errorRate < 0.5;

      return {
        accountId: account.id,
        checkType: 'agent-health',
        success: isHealthy,
        responseTimeMs: Date.now() - startTime,
        details: {
          agentStatus: agent.status,
          apiStats: agentStats
        },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        accountId: account.id,
        checkType: 'agent-health',
        success: false,
        responseTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * ネットワークヘルスチェック
   */
  private async performNetworkHealthCheck(): Promise<void> {
    try {
      const networkStatus = await this.checkNetworkStatus();
      
      if (networkStatus !== this.networkStatus) {
        const previousStatus = this.networkStatus;
        this.networkStatus = networkStatus;
        
        this.emitEvent({
          type: 'NetworkStatusChanged',
          status: networkStatus,
          timestamp: new Date()
        });

        log.info('Network status changed', {
          from: previousStatus,
          to: networkStatus
        });
      }

      // ネットワークヘルス統計を更新
      this.networkHealth.lastCheckedAt = new Date();
      this.networkHealth.isOnline = networkStatus === 'online';
    } catch (error) {
      log.warn('Network health check failed', { error });
    }
  }

  /**
   * ネットワーク状態をチェック
   */
  private async checkNetworkStatus(): Promise<NetworkStatus> {
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return 'offline';
      }

      // 簡単なネットワークテスト
      const startTime = Date.now();
      const response = await fetch('https://bsky.social/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });

      const responseTime = Date.now() - startTime;
      this.networkHealth.latencyMs = responseTime;

      if (response.ok) {
        return responseTime > 3000 ? 'slow' : 'online';
      } else {
        return 'offline';
      }
    } catch (error) {
      log.debug('Network check failed', { error });
      return 'offline';
    }
  }

  /**
   * バッテリー状態をチェック
   */
  private async checkBatteryStatus(): Promise<void> {
    try {
      // Web Battery API (利用可能な場合)
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        
        this.batteryStatus = {
          level: battery.level,
          isCharging: battery.charging,
          isLow: battery.level < 0.2,
          lastUpdatedAt: new Date()
        };

        // バッテリー状態変更リスナー
        battery.addEventListener('levelchange', () => {
          this.batteryStatus.level = battery.level;
          this.batteryStatus.isLow = battery.level < 0.2;
          this.batteryStatus.lastUpdatedAt = new Date();
        });

        battery.addEventListener('chargingchange', () => {
          this.batteryStatus.isCharging = battery.charging;
          this.batteryStatus.lastUpdatedAt = new Date();
        });
      }
    } catch (error) {
      log.debug('Battery status check not supported', { error });
    }
  }

  /**
   * ヘルスチェック結果を処理
   */
  private processHealthCheckResult(results: HealthCheckResult[]): void {
    for (const result of results) {
      this.stats.totalChecks++;
      
      if (result.success) {
        this.stats.successfulChecks++;
      } else {
        this.stats.failedChecks++;
        
        this.emitEvent({
          type: 'HealthCheckFailed',
          accountId: result.accountId,
          error: result.error || 'Unknown error',
          timestamp: result.timestamp
        });
      }

      // レスポンス時間統計を更新
      this.updateResponseTimeStats(result.responseTimeMs);

      // 最近のチェック結果を保存（最大100件）
      this.recentHealthChecks.push(result);
      if (this.recentHealthChecks.length > 100) {
        this.recentHealthChecks = this.recentHealthChecks.slice(-100);
      }

      this.emitEvent({
        type: 'HealthCheckCompleted',
        result
      });
    }

    // エラー率を更新
    this.stats.errorRate = this.stats.failedChecks / this.stats.totalChecks;
  }

  /**
   * レスポンス時間統計を更新
   */
  private updateResponseTimeStats(responseTime: number): void {
    const totalTime = this.stats.avgResponseTimeMs * (this.stats.totalChecks - 1) + responseTime;
    this.stats.avgResponseTimeMs = totalTime / this.stats.totalChecks;
  }

  /**
   * 定期的クリーンアップを実行
   */
  private performPeriodicCleanup(): void {
    try {
      // 古いヘルスチェック結果をクリーンアップ
      const cutoffTime = Date.now() - 3600000; // 1時間前
      this.recentHealthChecks = this.recentHealthChecks.filter(
        result => result.timestamp.getTime() > cutoffTime
      );

      this.lastCleanupAt = new Date();
      
      log.debug('Periodic cleanup completed', {
        remainingResults: this.recentHealthChecks.length
      });
    } catch (error) {
      log.warn('Periodic cleanup failed', { error });
    }
  }

  /**
   * アプリフォーカスイベントハンドラー
   */
  private handleAppFocus(): void {
    if (!this.isAppFocused) {
      this.isAppFocused = true;
      
      this.emitEvent({
        type: 'AppLifecycleChanged',
        event: 'app-focus',
        timestamp: new Date()
      });

      // フォーカス時は監視間隔を短縮
      if (this.isMonitoring) {
        this.startHealthCheckLoop();
      }

      log.debug('App focused - monitoring interval adjusted');
    }
  }

  /**
   * アプリブラーイベントハンドラー
   */
  private handleAppBlur(): void {
    if (this.isAppFocused) {
      this.isAppFocused = false;
      
      this.emitEvent({
        type: 'AppLifecycleChanged',
        event: 'app-blur',
        timestamp: new Date()
      });

      // バックグラウンド時は監視間隔を延長
      if (this.isMonitoring) {
        this.startHealthCheckLoop();
      }

      log.debug('App blurred - monitoring interval adjusted');
    }
  }

  /**
   * ネットワークオンラインイベントハンドラー
   */
  private handleNetworkOnline(): void {
    this.emitEvent({
      type: 'AppLifecycleChanged',
      event: 'network-online',
      timestamp: new Date()
    });

    // ネットワーク復旧時は即座にヘルスチェック
    if (this.isMonitoring) {
      this.performImmediateHealthCheck();
    }

    log.info('Network came online - immediate health check triggered');
  }

  /**
   * ネットワークオフラインイベントハンドラー
   */
  private handleNetworkOffline(): void {
    this.emitEvent({
      type: 'AppLifecycleChanged',
      event: 'network-offline',
      timestamp: new Date()
    });

    log.info('Network went offline');
  }

  /**
   * 全タイマーを停止
   */
  private stopAllTimers(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.networkCheckTimer) {
      clearInterval(this.networkCheckTimer);
      this.networkCheckTimer = null;
    }

    if (this.lifecycleTimer) {
      clearInterval(this.lifecycleTimer);
      this.lifecycleTimer = null;
    }
  }

  /**
   * イベントを発行
   */
  private emitEvent(event: MonitoringEvent): void {
    try {
      this.eventListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          log.warn('Event listener error', { error, eventType: event.type });
        }
      });
    } catch (error) {
      log.error('Failed to emit event', { error, eventType: event.type });
    }
  }

  /**
   * イベントリスナーを追加
   */
  public addEventListener(listener: (event: MonitoringEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * イベントリスナーを削除
   */
  public removeEventListener(listener: (event: MonitoringEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * 現在の統計を取得
   */
  public getStats(): MonitoringStats {
    return { ...this.stats };
  }

  /**
   * 現在のネットワークヘルス情報を取得
   */
  public getNetworkHealth(): NetworkHealth {
    return { ...this.networkHealth };
  }

  /**
   * 現在のバッテリー状態を取得
   */
  public getBatteryStatus(): BatteryStatus {
    return { ...this.batteryStatus };
  }

  /**
   * 最近のヘルスチェック結果を取得
   */
  public getRecentHealthChecks(limit = 10): HealthCheckResult[] {
    return this.recentHealthChecks.slice(-limit);
  }

  /**
   * 特定アカウントのセッション検証を実行
   * SessionManagerから呼び出されるパブリックメソッド
   * 
   * @param accountId アカウントID
   * @returns 検証結果
   */
  public async validateAccountSession(accountId: string): Promise<{
    isValid: boolean;
    error?: string;
    details?: any;
  }> {
    try {
      log.debug('Validating account session', { accountId });
      
      // AuthServiceから対象アカウントを取得
      if (!this.authService) {
        return { isValid: false, error: 'AuthService not available' };
      }
      
      const accountsResult = await this.authService.getAllAccounts();
      if (!accountsResult.success || !accountsResult.data) {
        return { isValid: false, error: 'Failed to get accounts' };
      }
      
      const account = accountsResult.data.find((acc: Account) => 
        acc.id === accountId || acc.profile.did === accountId
      );
      
      if (!account) {
        return { isValid: false, error: 'Account not found' };
      }
      
      // BackgroundSessionMonitorのヘルスチェック機能を活用
      const healthResults = await this.performAccountHealthCheck(account);
      
      // 検証結果を統合
      const tokenResult = healthResults.find(r => r.checkType === 'token-validation');
      const sessionResult = healthResults.find(r => r.checkType === 'session-consistency');
      const agentResult = healthResults.find(r => r.checkType === 'agent-health');
      
      const isValid = healthResults.every(r => r.success);
      
      return {
        isValid,
        error: isValid ? undefined : 'Session validation failed',
        details: {
          tokenValidation: tokenResult,
          sessionConsistency: sessionResult,
          agentHealth: agentResult,
          overallHealthy: isValid
        }
      };
      
    } catch (error) {
      log.warn('Account session validation failed', { error, accountId });
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * パフォーマンス最適化設定を動的に調整
   * システム状態に基づいて監視間隔やリソース使用量を最適化
   */
  public optimizePerformance(): void {
    try {
      const currentStats = this.getStats();
      const networkHealth = this.getNetworkHealth();
      const batteryStatus = this.getBatteryStatus();
      
      // パフォーマンスメトリクスに基づく最適化
      let optimizedConfig = { ...this.config };
      
      // バッテリー最適化
      if (batteryStatus.isLow && !batteryStatus.isCharging) {
        optimizedConfig.intervalMs = Math.max(optimizedConfig.intervalMs * 2, 600000); // 最低10分
        optimizedConfig.maxConcurrentChecks = Math.max(1, Math.floor(optimizedConfig.maxConcurrentChecks / 2));
        log.info('Battery optimization applied', { 
          newInterval: optimizedConfig.intervalMs,
          newMaxConcurrent: optimizedConfig.maxConcurrentChecks
        });
      }
      
      // ネットワーク状態に基づく最適化
      if (!networkHealth.isOnline || this.networkStatus === 'offline') {
        optimizedConfig.intervalMs = Math.max(optimizedConfig.intervalMs * 1.5, 450000); // 最低7.5分
        log.info('Offline optimization applied', { newInterval: optimizedConfig.intervalMs });
      } else if (networkHealth.latencyMs > 3000) {
        optimizedConfig.retryIntervalMs = Math.max(optimizedConfig.retryIntervalMs * 1.5, 45000);
        log.info('High latency optimization applied', { newRetryInterval: optimizedConfig.retryIntervalMs });
      }
      
      // エラー率に基づく最適化
      if (currentStats.errorRate > 0.3) {
        optimizedConfig.retryIntervalMs = Math.min(optimizedConfig.retryIntervalMs * 2, 120000);
        optimizedConfig.maxConcurrentChecks = Math.max(1, optimizedConfig.maxConcurrentChecks - 1);
        log.warn('High error rate optimization applied', {
          errorRate: currentStats.errorRate,
          newRetryInterval: optimizedConfig.retryIntervalMs,
          newMaxConcurrent: optimizedConfig.maxConcurrentChecks
        });
      }
      
      // 設定を更新（差分がある場合のみ）
      if (JSON.stringify(optimizedConfig) !== JSON.stringify(this.config)) {
        this.updateConfiguration(optimizedConfig);
      }
      
    } catch (error) {
      log.warn('Performance optimization failed', { error });
    }
  }
  
  /**
   * 設定を動的に更新
   */
  private updateConfiguration(newConfig: any): void {
    try {
      const oldConfig = { ...this.config };
      Object.assign(this.config, newConfig);
      
      // 監視タイマーを再起動（間隔が変更された場合）
      if (oldConfig.intervalMs !== newConfig.intervalMs && this.isMonitoring) {
        this.startHealthCheckLoop();
      }
      
      log.debug('Configuration updated', {
        oldConfig: oldConfig,
        newConfig: this.config
      });
      
      this.emitEvent({
        type: 'MonitoringStarted', // 設定変更イベント
        timestamp: new Date(),
        config: this.config
      });
    } catch (error) {
      log.error('Failed to update configuration', { error });
    }
  }
  
  /**
   * 統計レポートを生成
   */
  public generatePerformanceReport(): {
    summary: string;
    metrics: MonitoringStats;
    networkHealth: NetworkHealth;
    batteryStatus: BatteryStatus;
    recommendations: string[];
  } {
    const stats = this.getStats();
    const networkHealth = this.getNetworkHealth();
    const batteryStatus = this.getBatteryStatus();
    const recommendations: string[] = [];
    
    // 推奨事項を生成
    if (stats.errorRate > 0.2) {
      recommendations.push('エラー率が高いため、リトライ間隔の調整を推奨します');
    }
    
    if (!networkHealth.isOnline) {
      recommendations.push('ネットワーク接続を確認してください');
    } else if (networkHealth.latencyMs > 2000) {
      recommendations.push('ネットワークレスポンスが遅いため、タイムアウト設定の調整を推奨します');
    }
    
    if (batteryStatus.isLow) {
      recommendations.push('バッテリー残量が少ないため、監視間隔を延長することを推奨します');
    }
    
    if (stats.activeAccounts > 10) {
      recommendations.push('アカウント数が多いため、並行チェック数の制限を検討してください');
    }
    
    // サマリーを生成
    const summary = `監視統計: ${stats.totalChecks}回実行、成功率${((stats.successfulChecks / stats.totalChecks) * 100).toFixed(1)}%、平均レスポンス${stats.avgResponseTimeMs.toFixed(0)}ms`;
    
    return {
      summary,
      metrics: stats,
      networkHealth,
      batteryStatus,
      recommendations
    };
  }

  /**
   * デバッグ用: 現在の状態を表示
   */
  public debugStatus(): void {
    const status = {
      isMonitoring: this.isMonitoring,
      isAppFocused: this.isAppFocused,
      networkStatus: this.networkStatus,
      concurrentChecks: this.concurrentChecks,
      stats: this.stats,
      config: this.config,
      recentChecks: this.recentHealthChecks.length,
      eventListeners: this.eventListeners.length
    };
    
    log.debug('Background Session Monitor Status', status);
    
    // パフォーマンスレポートも表示
    const report = this.generatePerformanceReport();
    log.debug('Performance Report', report);
  }
}

// シングルトンインスタンス
export const backgroundSessionMonitor = BackgroundSessionMonitor.getInstance();