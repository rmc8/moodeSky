import { BskyAgent } from '@atproto/api';
import type { 
  IAgent, 
  AgentInfo, 
  AgentStatus,
  AgentResult
} from '../types/agent.js';
import type { Account } from '../types/auth.js';

/**
 * Bluesky Agent のラッパークラス
 * tokimekibluesky の Agent クラスを参考に Tauri 環境用に最適化
 * タイムライン取得機能は除外し、基本的なプロフィール・通知機能のみ実装
 */
export class Agent implements IAgent {
  public readonly agent: BskyAgent;
  public readonly account: Account;
  public status: AgentStatus = 'active';
  
  private lastUsedAt: string;

  constructor(account: Account) {
    this.account = account;
    this.lastUsedAt = new Date().toISOString();
    
    // BskyAgent を初期化（セッション付き）
    this.agent = new BskyAgent({
      service: account.service
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
    try {
      this.updateLastUsed();
      
      const res = await this.agent.api.app.bsky.actor.getProfile({ actor });
      return res.data;
    } catch (error) {
      console.error('Failed to get profile:', error);
      this.handleApiError(error);
      throw error;
    }
  }

  /**
   * 通知数を取得
   */
  async getNotificationCount(): Promise<number> {
    try {
      this.updateLastUsed();
      
      const res = await this.agent.api.app.bsky.notification.getUnreadCount();
      return res.data.count;
    } catch (error) {
      console.error('Failed to get notification count:', error);
      this.handleApiError(error);
      return 0;
    }
  }

  /**
   * ユーザー設定を取得
   */
  async getPreferences(): Promise<any[]> {
    try {
      this.updateLastUsed();
      
      const res = await this.agent.api.app.bsky.actor.getPreferences();
      return res.data.preferences;
    } catch (error) {
      console.error('Failed to get preferences:', error);
      this.handleApiError(error);
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
      await this.agent.api.app.bsky.actor.getPreferences();
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
   * リソースを解放
   */
  dispose(): void {
    this.status = 'disposed';
    // BskyAgent にはリソース解放メソッドがないため、状態のみ更新
  }

  /**
   * 最終使用時刻を更新
   */
  private updateLastUsed(): void {
    this.lastUsedAt = new Date().toISOString();
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