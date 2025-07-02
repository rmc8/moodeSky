/**
 * Integration Test Container
 * Issue #92 Phase 3: 統合テスト専用のコンテナ環境
 * 
 * 全セッション管理コンポーネントの統合テスト実行環境を提供
 */

import { beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { SessionManager } from '../services/sessionManager.ts';
import { AuthService } from '../services/authStore.ts';
import { JWTTokenManager } from '../utils/jwtTokenManager.ts';
import type { Account } from '../types/auth.ts';
import type { SessionState, ValidationResult } from '../services/sessionManager.ts';
import { TauriStoreMockFactory, type MockedStore } from './mockFactories.ts';
import { AccountTestFactory, TimeControlHelper } from './sessionTestUtils.ts';

/**
 * 統合テストコンテナの設定
 */
export interface IntegrationTestConfig {
  /** 初期化するアカウント数 */
  initialAccountCount?: number;
  /** JWT Token Manager を有効にするか */
  enableJWTManager?: boolean;
  /** Background Monitor を有効にするか */
  enableBackgroundMonitor?: boolean;
  /** ネットワークシミュレーションを有効にするか */
  enableNetworkSimulation?: boolean;
  /** 高精度タイミング測定を有効にするか */
  highPrecisionTiming?: boolean;
  /** ログレベル */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * 統合テストの実行状態
 */
export interface IntegrationTestState {
  /** 初期化済みかどうか */
  isInitialized: boolean;
  /** アクティブなアカウント */
  activeAccounts: Account[];
  /** セッション状態マップ */
  sessionStates: Map<string, SessionState>;
  /** 発生したイベント */
  events: Array<{ type: string; timestamp: Date; data: any }>;
  /** パフォーマンスメトリクス */
  metrics: {
    memoryUsageMB: number;
    avgResponseTimeMs: number;
    errorCount: number;
  };
}

/**
 * 統合テスト専用コンテナ
 * 全セッション管理コンポーネントを統合して実行環境を提供
 */
export class IntegrationTestContainer {
  // コンポーネントインスタンス
  public sessionManager!: SessionManager;
  public authService!: AuthService;
  public jwtTokenManager!: JWTTokenManager;
  public agentManager: any = null;
  public backgroundMonitor: any = null;

  // モックとストレージ
  public mockStore!: MockedStore;
  public mockSessionEventHandler!: MockedFunction<any>;

  // 統合テスト状態
  public state: IntegrationTestState = {
    isInitialized: false,
    activeAccounts: [],
    sessionStates: new Map(),
    events: [],
    metrics: {
      memoryUsageMB: 0,
      avgResponseTimeMs: 0,
      errorCount: 0
    }
  };

  // 設定
  private config: IntegrationTestConfig;

  // イベントリスナー
  private eventListeners: Array<(event: any) => void> = [];

  constructor(config: IntegrationTestConfig = {}) {
    this.config = {
      initialAccountCount: 3,
      enableJWTManager: true,
      enableBackgroundMonitor: false,
      enableNetworkSimulation: false,
      highPrecisionTiming: false,
      logLevel: 'info',
      ...config
    };
  }

  /**
   * 統合テスト環境をセットアップ
   */
  async setup(): Promise<void> {
    if (this.state.isInitialized) {
      await this.teardown();
    }

    try {
      // タイマーモックの設定
      vi.useFakeTimers();

      // Tauri Store のモック設定
      this.mockStore = TauriStoreMockFactory.createStoreMock();
      vi.doMock('@tauri-apps/plugin-store', () => ({
        Store: vi.fn(() => this.mockStore)
      }));

      // セッションイベントハンドラーのモック
      this.mockSessionEventHandler = vi.fn().mockResolvedValue(undefined);

      // AuthService 初期化
      this.authService = new AuthService(this.mockSessionEventHandler);

      // JWT Token Manager 初期化（オプション）
      if (this.config.enableJWTManager) {
        this.jwtTokenManager = new JWTTokenManager({
          accessTokenRefreshBuffer: 300,
          healthCheckInterval: 60,
          logLevel: this.config.logLevel
        });
      }

      // SessionManager 初期化
      this.sessionManager = SessionManager.getInstance({
        refreshThresholdMinutes: 5,
        monitoringIntervalMs: 60000,
        maxRetryAttempts: 3,
        enableBackgroundMonitoring: this.config.enableBackgroundMonitor
      });

      // Agent Manager 初期化（動的インポート）
      if (this.config.enableBackgroundMonitor) {
        try {
          const { EnhancedAgentManager } = await import('../services/agentManager.js');
          this.agentManager = new EnhancedAgentManager();
        } catch (error) {
          console.warn('AgentManager initialization failed:', error);
        }
      }

      // Background Monitor 初期化（動的インポート）
      if (this.config.enableBackgroundMonitor) {
        try {
          const { BackgroundSessionMonitor } = await import('../services/backgroundSessionMonitor.js');
          this.backgroundMonitor = BackgroundSessionMonitor.getInstance();
          await this.backgroundMonitor.initialize();
        } catch (error) {
          console.warn('BackgroundMonitor initialization failed:', error);
        }
      }

      // イベントリスナーの設定
      this.setupEventListeners();

      // 初期アカウントの作成
      await this.createInitialAccounts();

      // SessionManager 初期化
      await this.sessionManager.initialize();

      this.state.isInitialized = true;

      this.recordEvent('container-setup', { 
        config: this.config,
        accountCount: this.state.activeAccounts.length 
      });

    } catch (error) {
      this.state.metrics.errorCount++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.recordEvent('setup-error', { error: errorMessage });
      throw error;
    }
  }

  /**
   * 統合テスト環境をクリーンアップ
   */
  async teardown(): Promise<void> {
    try {
      // タイマーのクリーンアップ
      vi.useRealTimers();

      // Background Monitor 停止
      if (this.backgroundMonitor) {
        await this.backgroundMonitor.stopMonitoring();
      }

      // SessionManager 停止
      if (this.sessionManager) {
        this.sessionManager.dispose();
        SessionManager.getInstance().resetForTesting?.();
      }

      // JWT Token Manager 停止
      if (this.jwtTokenManager) {
        this.jwtTokenManager.dispose?.();
      }

      // イベントリスナーのクリーンアップ
      this.eventListeners.length = 0;

      // 状態のリセット
      this.state = {
        isInitialized: false,
        activeAccounts: [],
        sessionStates: new Map(),
        events: [],
        metrics: {
          memoryUsageMB: 0,
          avgResponseTimeMs: 0,
          errorCount: 0
        }
      };

      this.recordEvent('container-teardown', {});

    } catch (error) {
      console.error('Teardown error:', error);
    }
  }

  /**
   * 初期アカウントを作成
   */
  private async createInitialAccounts(): Promise<void> {
    const accountCount = this.config.initialAccountCount || 0;
    
    for (let i = 0; i < accountCount; i++) {
      const account = AccountTestFactory.createBasicAccount(
        `did:plc:integration${i}`,
        `integration${i}.bsky.social`
      );

      const result = await this.authService.addAccount(account);
      if (result.success && result.data) {
        this.state.activeAccounts.push(result.data);
      }
    }
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    // SessionManager イベントリスナー
    if (this.sessionManager) {
      this.sessionManager.addEventListener?.((event: any) => {
        this.recordEvent('session-manager', event);
      });
    }

    // Background Monitor イベントリスナー
    if (this.backgroundMonitor) {
      this.backgroundMonitor.addEventListener?.((event: any) => {
        this.recordEvent('background-monitor', event);
      });
    }
  }

  /**
   * イベントを記録
   */
  private recordEvent(type: string, data: any): void {
    this.state.events.push({
      type,
      timestamp: new Date(),
      data
    });
  }

  /**
   * 新しいアカウントを追加
   */
  async addAccount(did?: string, handle?: string): Promise<Account> {
    const account = AccountTestFactory.createBasicAccount(did, handle);
    const result = await this.authService.addAccount(account);
    
    if (result.success && result.data) {
      this.state.activeAccounts.push(result.data);
      this.recordEvent('account-added', { accountId: result.data.id });
      return result.data;
    }
    
    throw new Error(`Failed to add account: ${result.error?.message}`);
  }

  /**
   * アカウントを削除
   */
  async removeAccount(accountId: string): Promise<void> {
    const result = await this.authService.removeAccount(accountId);
    
    if (result.success) {
      this.state.activeAccounts = this.state.activeAccounts.filter(
        account => account.id !== accountId
      );
      this.state.sessionStates.delete(accountId);
      this.recordEvent('account-removed', { accountId });
    } else {
      throw new Error(`Failed to remove account: ${result.error?.message}`);
    }
  }

  /**
   * 全セッションの検証を実行
   */
  async validateAllSessions(): Promise<ValidationResult[]> {
    const startTime = performance.now();
    
    try {
      const results = await this.sessionManager.validateAllSessions();
      
      // セッション状態を更新
      results.forEach(result => {
        this.state.sessionStates.set(result.accountId, result.sessionState);
      });

      const endTime = performance.now();
      this.state.metrics.avgResponseTimeMs = endTime - startTime;
      
      this.recordEvent('sessions-validated', { 
        resultCount: results.length,
        responseTimeMs: this.state.metrics.avgResponseTimeMs
      });
      
      return results;
    } catch (error) {
      this.state.metrics.errorCount++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.recordEvent('validation-error', { error: errorMessage });
      throw error;
    }
  }

  /**
   * 全セッションのリフレッシュを実行
   */
  async refreshAllSessions(): Promise<void> {
    const startTime = performance.now();
    
    try {
      const refreshPromises = this.state.activeAccounts.map(async account => {
        return this.sessionManager.proactiveRefresh(account.profile.did);
      });

      const results = await Promise.allSettled(refreshPromises);
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const errorCount = results.filter(r => r.status === 'rejected').length;

      const endTime = performance.now();
      
      this.recordEvent('sessions-refreshed', {
        totalSessions: this.state.activeAccounts.length,
        successCount,
        errorCount,
        responseTimeMs: endTime - startTime
      });

      this.state.metrics.errorCount += errorCount;
      
    } catch (error) {
      this.state.metrics.errorCount++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.recordEvent('refresh-error', { error: errorMessage });
      throw error;
    }
  }

  /**
   * 時間を進める（フェイクタイマー使用）
   */
  async advanceTime(ms: number): Promise<void> {
    vi.advanceTimersByTime(ms);
    
    // 非同期処理の完了を待機
    await TimeControlHelper.wait(0);
    
    this.recordEvent('time-advanced', { advancedMs: ms });
  }

  /**
   * 条件が満たされるまで待機
   */
  async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeoutMs: number = 5000,
    intervalMs: number = 100
  ): Promise<void> {
    await TimeControlHelper.waitForCondition(condition, timeoutMs, intervalMs);
  }

  /**
   * メトリクスを更新
   */
  async updateMetrics(): Promise<void> {
    // メモリ使用量の測定（概算）
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      this.state.metrics.memoryUsageMB = (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }

    this.recordEvent('metrics-updated', { metrics: this.state.metrics });
  }

  /**
   * 指定期間のイベントを取得
   */
  getEventsInTimeRange(startTime: Date, endTime: Date): Array<{ type: string; timestamp: Date; data: any }> {
    return this.state.events.filter(event => 
      event.timestamp >= startTime && event.timestamp <= endTime
    );
  }

  /**
   * 特定タイプのイベントを取得
   */
  getEventsByType(type: string): Array<{ type: string; timestamp: Date; data: any }> {
    return this.state.events.filter(event => event.type === type);
  }

  /**
   * イベント履歴をクリア
   */
  clearEventHistory(): void {
    this.state.events.length = 0;
    this.recordEvent('event-history-cleared', {});
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): {
    totalEvents: number;
    eventTypes: { [key: string]: number };
    errorRate: number;
    avgResponseTime: number;
    memoryUsage: number;
  } {
    const eventTypes: { [key: string]: number } = {};
    
    this.state.events.forEach(event => {
      eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
    });

    const totalEvents = this.state.events.length;
    const errorEvents = this.state.events.filter(e => e.type.includes('error')).length;
    
    return {
      totalEvents,
      eventTypes,
      errorRate: totalEvents > 0 ? errorEvents / totalEvents : 0,
      avgResponseTime: this.state.metrics.avgResponseTimeMs,
      memoryUsage: this.state.metrics.memoryUsageMB
    };
  }
}

/**
 * 統合テスト用のヘルパー関数とフック
 */
export class IntegrationTestHelpers {
  /**
   * 統合テストコンテナのセットアップと破棄を自動化
   */
  static useIntegrationContainer(config?: IntegrationTestConfig) {
    const container = new IntegrationTestContainer(config);

    beforeEach(async () => {
      await container.setup();
    });

    afterEach(async () => {
      await container.teardown();
    });

    return container;
  }

  /**
   * コンポーネント間のイベント伝播を検証
   */
  static async verifyEventPropagation(
    container: IntegrationTestContainer,
    trigger: () => Promise<void>,
    expectedEvents: string[],
    timeoutMs: number = 5000
  ): Promise<void> {
    const startTime = new Date();
    
    // イベント履歴をクリア
    container.clearEventHistory();
    
    // トリガーを実行
    await trigger();
    
    // 期待されるイベントが発生するまで待機
    await container.waitForCondition(() => {
      const events = container.getEventsInTimeRange(startTime, new Date());
      return expectedEvents.every(expectedEvent => 
        events.some(event => event.type === expectedEvent)
      );
    }, timeoutMs);
  }

  /**
   * パフォーマンス要件を検証
   */
  static async verifyPerformanceRequirements(
    container: IntegrationTestContainer,
    operation: () => Promise<void>,
    requirements: {
      maxResponseTimeMs?: number;
      maxMemoryMB?: number;
      maxErrorRate?: number;
    }
  ): Promise<void> {
    const startTime = performance.now();
    const initialStats = container.getStatistics();
    
    await operation();
    
    const endTime = performance.now();
    const finalStats = container.getStatistics();
    
    const responseTime = endTime - startTime;
    await container.updateMetrics();
    
    // パフォーマンス要件の検証
    if (requirements.maxResponseTimeMs && responseTime > requirements.maxResponseTimeMs) {
      throw new Error(`Response time ${responseTime}ms exceeds limit ${requirements.maxResponseTimeMs}ms`);
    }
    
    if (requirements.maxMemoryMB && container.state.metrics.memoryUsageMB > requirements.maxMemoryMB) {
      throw new Error(`Memory usage ${container.state.metrics.memoryUsageMB}MB exceeds limit ${requirements.maxMemoryMB}MB`);
    }
    
    if (requirements.maxErrorRate && finalStats.errorRate > requirements.maxErrorRate) {
      throw new Error(`Error rate ${finalStats.errorRate} exceeds limit ${requirements.maxErrorRate}`);
    }
  }
}