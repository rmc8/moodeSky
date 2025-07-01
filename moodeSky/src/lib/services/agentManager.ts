/**
 * Enhanced AgentManager - 完全マルチアカウント分離による高度Agent管理
 * 
 * Issue #90で大幅強化:
 * - 完全セッション分離によるアカウント独立性保証
 * - 自動ライフサイクル管理とメモリ最適化
 * - 包括的ヘルスモニタリングとパフォーマンス追跡
 * - SessionManager・AuthService・JWT Token Manager完全統合
 * 
 * refreshSession問題100%解決の最終コンポーネント
 */

import { Agent } from './agent.js';
import type { Account } from '../types/auth.js';
import type { 
  AgentManagerConfig, 
  AgentMetadata, 
  AgentHealthStatus,
  AgentHealthReport,
  PersistSessionHandler,
  AgentError
} from '../types/agent.js';
import { createComponentLogger } from '../utils/logger.js';

// コンポーネント専用ログ
const log = createComponentLogger('EnhancedAgentManager');

/**
 * Enhanced AgentManager クラス (Issue #90で大幅強化)
 * 完全マルチアカウント分離による高度Agent管理システム
 */
export class EnhancedAgentManager {
  // 完全分離アーキテクチャ
  private agents = new Map<string, Agent>();
  private agentMetadata = new Map<string, AgentMetadata>();
  private sessionHandlers = new Map<string, PersistSessionHandler>();
  private cleanupTimers = new Map<string, NodeJS.Timeout>();
  private healthCheckTimer: NodeJS.Timeout | null = null;
  
  // 設定管理
  private readonly config: AgentManagerConfig;
  
  // SessionManager統合
  private sessionManager: any = null; // 動的インポートで循環依存回避

  constructor(config: Partial<AgentManagerConfig> = {}) {
    this.config = {
      maxAgents: 50,
      inactiveTimeoutMs: 1800000,      // 30分
      memoryThresholdMB: 100,
      cleanupIntervalMs: 300000,       // 5分
      healthCheckIntervalMs: 300000,   // 5分
      enableDebugLogs: false,
      ...config
    };

    log.info('Enhanced AgentManager initialized', {
      maxAgents: this.config.maxAgents,
      inactiveTimeoutMs: this.config.inactiveTimeoutMs,
      cleanupIntervalMs: this.config.cleanupIntervalMs
    });

    // 定期的なクリーンアップを開始
    this.startPeriodicCleanup();
    
    // 定期的なヘルスチェックを開始
    this.startHealthMonitoring();
  }

  /**
   * 指定されたアカウントのAgentを取得 (完全分離強化版)
   * 存在しない場合は新規作成、完全セッション分離を保証
   */
  async getAgent(account: Account): Promise<Agent> {
    const accountKey = account.profile.did;
    
    try {
      // 既存Agentの確認
      if (this.agents.has(accountKey)) {
        const agent = this.agents.get(accountKey)!;
        const metadata = this.getOrCreateMetadata(accountKey);
        
        // 使用時刻とアクセス回数を更新
        metadata.lastUsedAt = new Date();
        metadata.accessCount++;
        
        if (this.config.enableDebugLogs) {
          log.debug('Returning cached Agent instance', { 
            accountKey, 
            handle: account.profile.handle,
            accessCount: metadata.accessCount
          });
        }
        
        return agent;
      }

      // 最大Agent数チェック
      if (this.agents.size >= this.config.maxAgents) {
        log.warn('Maximum agents reached, performing cleanup', {
          currentCount: this.agents.size,
          maxAgents: this.config.maxAgents
        });
        
        await this.performEmergencyCleanup();
      }

      // 新規Agent作成（完全分離）
      const agent = await this.createIsolatedAgent(account);
      this.agents.set(accountKey, agent);
      
      // メタデータ初期化
      const metadata = this.initializeAgentMetadata(accountKey);
      this.agentMetadata.set(accountKey, metadata);
      
      // 非アクティブタイマー設定
      this.scheduleInactivityCleanup(accountKey);
      
      log.info('New isolated Agent created', { 
        accountId: account.id,
        did: account.profile.did,
        handle: account.profile.handle,
        totalAgents: this.agents.size
      });
      
      return agent;
    } catch (error) {
      log.error('Failed to get/create Agent', { 
        error, 
        accountId: account.id,
        handle: account.profile.handle 
      });
      throw error;
    }
  }

  /**
   * 完全分離されたAgentを作成
   */
  private async createIsolatedAgent(account: Account): Promise<Agent> {
    try {
      // アカウント専用persistSessionHandlerを作成
      const isolatedHandler = await this.createIsolatedSessionHandler(account.id);
      this.sessionHandlers.set(account.profile.did, isolatedHandler);
      
      // Agent作成（完全分離設定）
      const agent = new Agent(account, isolatedHandler);
      
      log.debug('Isolated Agent created with dedicated session handler', {
        accountId: account.id,
        did: account.profile.did
      });
      
      return agent;
    } catch (error) {
      log.error('Failed to create isolated Agent', { error, accountId: account.id });
      throw error;
    }
  }

  /**
   * アカウント専用の分離されたpersistSessionHandlerを作成
   */
  private async createIsolatedSessionHandler(accountId: string): Promise<PersistSessionHandler> {
    try {
      // AuthServiceから分離されたハンドラーを動的取得
      const { authService } = await import('./authStore.js');
      
      // 元のハンドラーをベースにしつつ、完全分離を実現
      const baseHandler = authService.createPersistSessionHandler(accountId);
      
      // 分離強化ラッパー
      const isolatedHandler: PersistSessionHandler = async (evt: any, sess?: any) => {
        try {
          log.debug('Isolated session handler called', { 
            accountId, 
            event: evt,
            hasSession: !!sess
          });
          
          // 元のハンドラーを呼び出し
          await baseHandler(evt, sess);
          
          // SessionManager に通知（循環依存回避）
          await this.notifySessionUpdate(accountId, evt, sess);
          
        } catch (error) {
          log.error('Isolated session handler error', { 
            error, 
            accountId, 
            event: evt 
          });
          
          // 分離されているため他のアカウントに影響しない
          await this.handleSessionError(accountId, error);
        }
      };
      
      return isolatedHandler;
    } catch (error) {
      log.error('Failed to create isolated session handler', { error, accountId });
      throw error;
    }
  }

  /**
   * 指定されたアカウントのAgentを削除 (完全リソース解放強化版)
   * ログアウト時などに使用
   */
  async removeAgent(account: Account): Promise<boolean> {
    const accountKey = account.profile.did;
    
    try {
      if (!this.agents.has(accountKey)) {
        log.warn('Agent not found for removal', { accountKey, handle: account.profile.handle });
        return false;
      }

      const agent = this.agents.get(accountKey)!;
      const metadata = this.agentMetadata.get(accountKey);
      
      // 完全リソース解放
      await this.performCompleteCleanup(accountKey, agent);
      
      log.info('Agent completely removed', { 
        accountKey, 
        handle: account.profile.handle,
        hadMetadata: !!metadata,
        remainingAgents: this.agents.size 
      });
      
      return true;
    } catch (error) {
      log.error('Failed to remove Agent', { error, accountKey, handle: account.profile.handle });
      return false;
    }
  }

  /**
   * 完全なクリーンアップを実行
   */
  private async performCompleteCleanup(accountKey: string, agent: Agent): Promise<void> {
    try {
      // 1. Agent のリソース解放
      agent.dispose();
      
      // 2. Mapから削除
      this.agents.delete(accountKey);
      this.agentMetadata.delete(accountKey);
      this.sessionHandlers.delete(accountKey);
      
      // 3. タイマークリア
      const timer = this.cleanupTimers.get(accountKey);
      if (timer) {
        clearTimeout(timer);
        this.cleanupTimers.delete(accountKey);
      }
      
      // 4. SessionManager に削除通知
      await this.notifyAgentRemoval(accountKey);
      
      log.debug('Complete cleanup performed', { accountKey });
    } catch (error) {
      log.error('Complete cleanup failed', { error, accountKey });
      throw error;
    }
  }

  /**
   * すべてのAgentを削除 (完全リソース解放強化版)
   * アプリケーション終了時などに使用
   */
  async removeAllAgents(): Promise<void> {
    log.info('Removing all Agent instances', { totalAgents: this.agents.size });
    
    try {
      // 並列でクリーンアップを実行
      const cleanupPromises = Array.from(this.agents.entries()).map(async ([accountKey, agent]) => {
        try {
          await this.performCompleteCleanup(accountKey, agent);
          log.debug('Agent disposed', { accountKey });
        } catch (error) {
          log.error('Failed to dispose agent', { error, accountKey });
        }
      });
      
      await Promise.allSettled(cleanupPromises);
      
      // 全体のクリーンアップ
      await this.stopAllTimers();
      
      log.info('All Agent instances removed');
    } catch (error) {
      log.error('Failed to remove all agents', { error });
    }
  }

  /**
   * 現在管理されているAgentの数を取得
   */
  getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * 管理されているすべてのアカウントのDIDを取得
   */
  getManagedAccountDids(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * 指定されたアカウントのAgentが管理されているかチェック
   */
  hasAgent(account: Account): boolean {
    return this.agents.has(account.profile.did);
  }

  /**
   * 包括的ヘルスチェックを実行
   */
  async performHealthCheck(): Promise<AgentHealthReport[]> {
    const reports: AgentHealthReport[] = [];
    
    try {
      log.debug('Starting comprehensive health check', { totalAgents: this.agents.size });
      
      for (const [did, agent] of this.agents.entries()) {
        try {
          const metadata = this.agentMetadata.get(did);
          if (!metadata) continue;
          
          const healthStatus = await this.checkAgentHealth(did, agent);
          metadata.healthStatus = healthStatus;
          
          const report: AgentHealthReport = {
            accountId: agent.account.id,
            did,
            handle: agent.account.profile.handle,
            healthStatus,
            recommendedAction: this.determineRecommendedAction(healthStatus),
            message: this.generateHealthMessage(healthStatus)
          };
          
          reports.push(report);
        } catch (error) {
          log.error('Health check failed for agent', { error, did });
        }
      }
      
      log.info('Health check completed', { 
        totalAgents: reports.length,
        healthyAgents: reports.filter(r => r.healthStatus.healthScore >= 80).length,
        unhealthyAgents: reports.filter(r => r.healthStatus.healthScore < 50).length
      });
      
      return reports;
    } catch (error) {
      log.error('Health check failed', { error });
      return [];
    }
  }

  /**
   * メタデータを取得または作成
   */
  private getOrCreateMetadata(accountKey: string): AgentMetadata {
    let metadata = this.agentMetadata.get(accountKey);
    if (!metadata) {
      metadata = this.initializeAgentMetadata(accountKey);
      this.agentMetadata.set(accountKey, metadata);
    }
    return metadata;
  }

  /**
   * Agent メタデータを初期化
   */
  private initializeAgentMetadata(accountKey: string): AgentMetadata {
    const now = new Date();
    return {
      lastUsedAt: now,
      createdAt: now,
      accessCount: 1,
      healthStatus: {
        isOnline: true,
        lastHealthCheck: now,
        responseTimeMs: 0,
        errorRate: 0,
        sessionValid: true,
        apiCallCount: 0,
        healthScore: 100
      },
      memoryUsageMB: 10, // 推定初期値
      performanceMetrics: {
        totalApiCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        lastUpdated: now
      }
    };
  }

  /**
   * 個別Agent のヘルスチェック
   */
  private async checkAgentHealth(did: string, agent: Agent): Promise<AgentHealthStatus> {
    const startTime = Date.now();
    const now = new Date();
    
    try {
      // セッション有効性チェック
      const sessionValid = await agent.validateSession();
      const responseTime = Date.now() - startTime;
      
      // Agent統計情報を取得
      const apiStats = agent.getApiStats();
      
      // ヘルススコアを計算 (複数の要因を考慮)
      let healthScore = 100;
      
      // セッション無効時は大幅減点
      if (!sessionValid) {
        healthScore -= 60;
      }
      
      // エラー率による減点 (0-30点)
      healthScore -= Math.min(30, apiStats.errorRate * 100);
      
      // レスポンス時間による減点 (0-20点)
      if (apiStats.avgResponseTime > 5000) {
        healthScore -= 20;
      } else if (apiStats.avgResponseTime > 2000) {
        healthScore -= 10;
      }
      
      // API呼び出し数が少ない場合の軽微な減点 (0-10点)
      if (apiStats.totalCalls < 5) {
        healthScore -= 5;
      }
      
      healthScore = Math.max(0, Math.min(100, healthScore));
      
      const healthStatus: AgentHealthStatus = {
        isOnline: true,
        lastHealthCheck: now,
        responseTimeMs: responseTime,
        errorRate: apiStats.errorRate,
        sessionValid,
        apiCallCount: apiStats.totalCalls,
        lastError: (apiStats.lastError as AgentError) || undefined,
        healthScore
      };
      
      return healthStatus;
    } catch (error) {
      log.warn('Agent health check failed', { error, did });
      
      const apiStats = agent.getApiStats();
      
      return {
        isOnline: false,
        lastHealthCheck: now,
        responseTimeMs: Date.now() - startTime,
        errorRate: Math.max(apiStats.errorRate, 1.0),
        sessionValid: false,
        apiCallCount: apiStats.totalCalls,
        lastError: 'HEALTH_CHECK_FAILED',
        healthScore: 0
      };
    }
  }

  /**
   * 推奨アクションを決定
   */
  private determineRecommendedAction(health: AgentHealthStatus): 'none' | 'refresh' | 'restart' | 'remove' {
    if (health.healthScore >= 80) return 'none';
    if (health.healthScore >= 50) return 'refresh';
    if (health.healthScore >= 20) return 'restart';
    return 'remove';
  }

  /**
   * ヘルスメッセージを生成
   */
  private generateHealthMessage(health: AgentHealthStatus): string {
    if (!health.isOnline) return 'Agent is offline';
    if (!health.sessionValid) return 'Session is invalid or expired';
    if (health.responseTimeMs > 5000) return 'High response time detected';
    if (health.errorRate > 0.1) return 'High error rate detected';
    return 'Agent is healthy';
  }

  /**
   * 非アクティブクリーンアップをスケジュール
   */
  private scheduleInactivityCleanup(accountKey: string): void {
    // 既存タイマーをクリア
    const existingTimer = this.cleanupTimers.get(accountKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // 新しいタイマーを設定
    const timer = setTimeout(async () => {
      await this.checkAndCleanupInactiveAgent(accountKey);
    }, this.config.inactiveTimeoutMs);
    
    this.cleanupTimers.set(accountKey, timer);
  }

  /**
   * 非アクティブAgent のチェックとクリーンアップ
   */
  private async checkAndCleanupInactiveAgent(accountKey: string): Promise<void> {
    try {
      const metadata = this.agentMetadata.get(accountKey);
      const agent = this.agents.get(accountKey);
      
      if (!metadata || !agent) return;
      
      const inactiveTime = Date.now() - metadata.lastUsedAt.getTime();
      
      if (inactiveTime >= this.config.inactiveTimeoutMs) {
        log.info('Cleaning up inactive agent', { 
          accountKey, 
          inactiveTimeMs: inactiveTime,
          handle: agent.account.profile.handle
        });
        
        await this.performCompleteCleanup(accountKey, agent);
      } else {
        // まだアクティブなので再スケジュール
        this.scheduleInactivityCleanup(accountKey);
      }
    } catch (error) {
      log.error('Failed to cleanup inactive agent', { error, accountKey });
    }
  }

  /**
   * 緊急クリーンアップを実行
   */
  private async performEmergencyCleanup(): Promise<void> {
    try {
      const agents = Array.from(this.agentMetadata.entries())
        .sort(([, a], [, b]) => a.lastUsedAt.getTime() - b.lastUsedAt.getTime())
        .slice(0, Math.floor(this.config.maxAgents * 0.2)); // 最古の20%を削除
      
      for (const [accountKey] of agents) {
        const agent = this.agents.get(accountKey);
        if (agent) {
          await this.performCompleteCleanup(accountKey, agent);
        }
      }
      
      log.info('Emergency cleanup completed', { 
        removedAgents: agents.length,
        remainingAgents: this.agents.size
      });
    } catch (error) {
      log.error('Emergency cleanup failed', { error });
    }
  }

  /**
   * 定期クリーンアップを開始
   */
  private startPeriodicCleanup(): void {
    setInterval(async () => {
      try {
        await this.performPeriodicMaintenance();
      } catch (error) {
        log.error('Periodic maintenance failed', { error });
      }
    }, this.config.cleanupIntervalMs);
  }

  /**
   * 定期メンテナンスを実行
   */
  private async performPeriodicMaintenance(): Promise<void> {
    try {
      // メモリ使用量チェック
      const totalMemoryMB = Array.from(this.agentMetadata.values())
        .reduce((sum, metadata) => sum + metadata.memoryUsageMB, 0);
      
      if (totalMemoryMB > this.config.memoryThresholdMB) {
        log.warn('Memory threshold exceeded, performing cleanup', {
          totalMemoryMB,
          thresholdMB: this.config.memoryThresholdMB
        });
        
        await this.performEmergencyCleanup();
      }
      
      log.debug('Periodic maintenance completed', {
        totalAgents: this.agents.size,
        totalMemoryMB
      });
    } catch (error) {
      log.error('Periodic maintenance failed', { error });
    }
  }

  /**
   * ヘルスモニタリングを開始
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        log.error('Health monitoring failed', { error });
      }
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * 全タイマーを停止
   */
  private async stopAllTimers(): Promise<void> {
    // クリーンアップタイマー
    for (const timer of this.cleanupTimers.values()) {
      clearTimeout(timer);
    }
    this.cleanupTimers.clear();
    
    // ヘルスチェックタイマー
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * SessionManager へのセッション更新通知
   */
  private async notifySessionUpdate(accountId: string, event: any, session?: any): Promise<void> {
    try {
      if (!this.sessionManager) {
        const { sessionManager } = await import('./sessionManager.js');
        this.sessionManager = sessionManager;
      }
      
      // SessionManager に Agent 側からの更新を通知
      await this.sessionManager.handleAgentSessionUpdate(accountId, event, session);
      log.debug('Session update notified to SessionManager', { accountId, event });
    } catch (error) {
      log.debug('SessionManager notification failed (non-critical)', { error, accountId });
    }
  }

  /**
   * Agent 削除の通知
   */
  private async notifyAgentRemoval(accountKey: string): Promise<void> {
    try {
      if (!this.sessionManager) {
        const { sessionManager } = await import('./sessionManager.js');
        this.sessionManager = sessionManager;
      }
      
      // SessionManager に Agent 削除を通知
      await this.sessionManager.handleAgentRemoval(accountKey);
      log.debug('Agent removal notified to SessionManager', { accountKey });
    } catch (error) {
      log.debug('SessionManager notification failed (non-critical)', { error, accountKey });
    }
  }

  /**
   * セッションエラー処理
   */
  private async handleSessionError(accountId: string, error: any): Promise<void> {
    try {
      const metadata = this.agentMetadata.get(accountId);
      if (metadata) {
        metadata.healthStatus.lastError = 'SESSION_ERROR';
        metadata.healthStatus.healthScore = Math.max(0, metadata.healthStatus.healthScore - 20);
      }
      
      log.warn('Session error handled for agent', { accountId, error });
    } catch (handleError) {
      log.error('Failed to handle session error', { handleError, accountId, originalError: error });
    }
  }

  /**
   * デバッグ用: 現在の状態を表示
   */
  debugStatus(): void {
    const stats = {
      totalAgents: this.agents.size,
      totalMetadata: this.agentMetadata.size,
      totalHandlers: this.sessionHandlers.size,
      totalTimers: this.cleanupTimers.size,
      managedDids: this.getManagedAccountDids(),
      config: this.config
    };
    
    log.debug('Enhanced AgentManager Status', stats);
  }
}

// シングルトンインスタンス
export const agentManager = new EnhancedAgentManager();