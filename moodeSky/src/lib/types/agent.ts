import type { BskyAgent } from '@atproto/api';
import type { Account } from './auth.js';

/**
 * Bluesky Agent のラッパークラス型定義
 * tokimekibluesky の Agent クラスを参考に Tauri 環境用に最適化
 */
export interface AgentInfo {
  /** 一意識別子 (Account.id と対応) */
  id: string;
  
  /** BskyAgent インスタンス */
  agent: BskyAgent;
  
  /** 関連するアカウント情報 */
  account: Account;
  
  /** エージェント作成日時 */
  createdAt: string;
  
  /** 最後にAPI呼び出しした日時 */
  lastUsedAt: string;
}

/**
 * Agent Manager の結果型
 */
export interface AgentResult<T = void> {
  success: boolean;
  data?: T;
  error?: {
    type: AgentError;
    message: string;
  };
}

/**
 * Agent 操作エラー種別
 */
export type AgentError = 
  | 'AGENT_CREATION_FAILED'
  | 'AGENT_NOT_FOUND'
  | 'SESSION_INVALID'
  | 'API_ERROR'
  | 'NETWORK_ERROR';

/**
 * Agent Manager の設定オプション
 */
export interface AgentManagerOptions {
  /** エージェントの最大保持数 (デフォルト: 10) */
  maxAgents?: number;
  
  /** 未使用エージェントの自動削除時間 (ms, デフォルト: 30分) */
  autoCleanupInterval?: number;
  
  /** API エラー時のリトライ回数 (デフォルト: 3) */
  retryCount?: number;
}

/**
 * Agent の基本操作インターフェース
 */
export interface IAgent {
  /** DID を取得 */
  did(): string | undefined;
  
  /** ハンドル名を取得 */
  handle(): string | undefined;
  
  /** サービス URL を取得 */
  service(): string | undefined;
  
  /** アクセストークンを取得 */
  getToken(): string | undefined;
  
  /** PDS URL を取得 */
  getPdsUrl(): Promise<string | undefined>;
  
  /** プロフィール情報を取得 */
  getProfile(actor: string): Promise<any>;
  
  /** 通知数を取得 */
  getNotificationCount(): Promise<number>;
}

/**
 * Agent のステータス
 */
export type AgentStatus = 
  | 'active'     // アクティブ・使用可能
  | 'inactive'   // 非アクティブ・セッション期限切れの可能性
  | 'error'      // エラー状態・要再認証
  | 'disposed';  // 削除済み・使用不可