import { AtpAgent } from '@atproto/api';
import type { 
  IAgent, 
  AgentInfo, 
  AgentStatus,
  AgentResult,
  PersistSessionHandler
} from '../types/agent.js';
import type { Account } from '../types/auth.js';
import { authService } from './authStore.js';

/**
 * Bluesky Agent のラッパークラス
 * tokimekibluesky の Agent クラスを参考に Tauri 環境用に最適化
 * タイムライン取得機能は除外し、基本的なプロフィール・通知機能のみ実装
 */
export class Agent implements IAgent {
  public readonly agent: AtpAgent;
  public readonly account: Account;
  public status: AgentStatus = 'active';
  
  private lastUsedAt: string;
  
  // API呼び出し統計 (Issue #90)
  private apiStats = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    responseTimes: [] as number[],
    lastError: null as string | null,
    errorRate: 0
  };

  constructor(account: Account, persistSessionHandler?: PersistSessionHandler) {
    this.account = account;
    this.lastUsedAt = new Date().toISOString();
    
    // AtpAgent を初期化（セッション付き、persistSession対応）
    this.agent = new AtpAgent({
      service: account.service,
      persistSession: persistSessionHandler || authService.createPersistSessionHandler(account.id)
    });
    
    // セッション情報を復元（resumeSession を使用）
    if (account.session) {
      this.agent.resumeSession(account.session);
    }
  }

  /**
   * DID を取得
   */
  did(): string | undefined {
    return this.agent.session?.did || this.account.profile.did;
  }

  /**
   * ハンドル名を取得
   */
  handle(): string | undefined {
    return this.agent.session?.handle || this.account.profile.handle;
  }

  /**
   * サービス URL を取得
   */
  service(): string | undefined {
    return this.account.service;
  }

  /**
   * アクセストークンを取得
   */
  getToken(): string | undefined {
    return this.agent.session?.accessJwt;
  }

  /**
   * PDS URL を取得
   */
  async getPdsUrl(): Promise<string | undefined> {
    try {
      this.updateLastUsed();
      
      if (this.agent.pdsUrl) {
        return this.agent.pdsUrl.origin;
      }
      
      const did = this.did();
      if (!did) {
        return undefined;
      }
      
      const res = await fetch(`https://plc.directory/${did}`);
      const json = await res.json();
      return json?.service?.[0]?.serviceEndpoint;
    } catch (error) {
      console.error('Failed to get PDS URL:', error);
      this.status = 'error';
      return undefined;
    }
  }

  /**
   * プロフィール情報を取得
   */
  async getProfile(actor: string): Promise<any> {
    this.updateLastUsed();
    
    return this.executeApiCall(async () => {
      const res = await this.agent.api.app.bsky.actor.getProfile({ actor });
      return res.data;
    });
  }

  /**
   * 通知数を取得
   */
  async getNotificationCount(): Promise<number> {
    this.updateLastUsed();
    
    try {
      return await this.executeApiCall(async () => {
        const res = await this.agent.api.app.bsky.notification.getUnreadCount();
        return res.data.count;
      });
    } catch (error) {
      console.error('Failed to get notification count:', error);
      return 0;
    }
  }

  /**
   * ユーザー設定を取得
   */
  async getPreferences(): Promise<any[]> {
    this.updateLastUsed();
    
    try {
      return await this.executeApiCall(async () => {
        const res = await this.agent.api.app.bsky.actor.getPreferences();
        return res.data.preferences;
      });
    } catch (error) {
      console.error('Failed to get preferences:', error);
      return [];
    }
  }

  /**
   * アバター画像 URL を取得
   */
  async getAvatar(did: string): Promise<string | undefined> {
    try {
      this.updateLastUsed();
      
      const profile = await this.getProfile(did);
      return profile?.avatar;
    } catch (error) {
      console.error('Failed to get avatar:', error);
      return undefined;
    }
  }

  /**
   * セッションが有効かどうかを確認
   */
  async validateSession(): Promise<boolean> {
    try {
      if (!this.agent.session) {
        this.status = 'inactive';
        return false;
      }

      // 簡単な API 呼び出しでセッションを検証
      await this.executeApiCall(async () => {
        return await this.agent.api.app.bsky.actor.getPreferences();
      });
      
      this.status = 'active';
      return true;
    } catch (error) {
      console.error('Session validation failed:', error);
      this.status = 'inactive';
      return false;
    }
  }

  /**
   * Agent の詳細情報を取得
   */
  getInfo(): AgentInfo {
    return {
      id: this.account.id,
      agent: this.agent,
      account: this.account,
      createdAt: this.account.createdAt,
      lastUsedAt: this.lastUsedAt
    };
  }

  /**
   * API統計情報を取得 (Issue #90)
   */
  getApiStats() {
    const responseTimes = this.apiStats.responseTimes;
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;
    
    return {
      totalCalls: this.apiStats.totalCalls,
      successfulCalls: this.apiStats.successfulCalls,
      failedCalls: this.apiStats.failedCalls,
      errorRate: this.apiStats.errorRate,
      avgResponseTime: Math.round(avgResponseTime),
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      lastError: this.apiStats.lastError
    };
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    this.status = 'disposed';
    // AtpAgent にはリソース解放メソッドがないため、状態のみ更新
  }

  /**
   * 最終使用時刻を更新
   */
  private updateLastUsed(): void {
    this.lastUsedAt = new Date().toISOString();
  }

  /**
   * API呼び出しを計測実行するラッパー (Issue #90)
   */
  private async executeApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    this.apiStats.totalCalls++;
    
    try {
      const result = await apiCall();
      
      // 成功統計を記録
      this.apiStats.successfulCalls++;
      const responseTime = Date.now() - startTime;
      this.apiStats.responseTimes.push(responseTime);
      
      // 直近100回のレスポンス時間のみ保持
      if (this.apiStats.responseTimes.length > 100) {
        this.apiStats.responseTimes = this.apiStats.responseTimes.slice(-100);
      }
      
      // エラー率を更新
      this.updateErrorRate();
      
      return result;
    } catch (error) {
      // 失敗統計を記録
      this.apiStats.failedCalls++;
      this.apiStats.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.updateErrorRate();
      
      this.handleApiError(error);
      throw error;
    }
  }

  /**
   * エラー率を更新
   */
  private updateErrorRate(): void {
    if (this.apiStats.totalCalls > 0) {
      this.apiStats.errorRate = this.apiStats.failedCalls / this.apiStats.totalCalls;
    }
  }

  /**
   * API エラーを処理
   */
  private handleApiError(error: any): void {
    if (error?.status === 401 || error?.error === 'ExpiredToken') {
      this.status = 'inactive';
    } else {
      this.status = 'error';
    }
  }
}