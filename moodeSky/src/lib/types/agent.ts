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
  | 'SESSION_ERROR'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'HEALTH_CHECK_FAILED';

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

/**
 * Enhanced AgentManager の設定 (Issue #90で追加)
 */
export interface AgentManagerConfig {
  /** 最大Agent保持数 */
  maxAgents: number;
  /** 非アクティブタイムアウト（ミリ秒） */
  inactiveTimeoutMs: number;
  /** メモリ使用量閾値（MB） */
  memoryThresholdMB: number;
  /** クリーンアップ間隔（ミリ秒） */
  cleanupIntervalMs: number;
  /** ヘルスチェック間隔（ミリ秒） */
  healthCheckIntervalMs: number;
  /** デバッグログを有効にするか */
  enableDebugLogs: boolean;
}

/**
 * Agent メタデータ (Issue #90で追加)
 */
export interface AgentMetadata {
  /** 最終使用時刻 */
  lastUsedAt: Date;
  /** 作成時刻 */
  createdAt: Date;
  /** API呼び出し回数 */
  accessCount: number;
  /** 現在のヘルス状態 */
  healthStatus: AgentHealthStatus;
  /** 推定メモリ使用量（MB） */
  memoryUsageMB: number;
  /** パフォーマンス統計 */
  performanceMetrics: PerformanceMetrics;
}

/**
 * Agent ヘルス状態 (Issue #90で追加)
 */
export interface AgentHealthStatus {
  /** オンライン状態 */
  isOnline: boolean;
  /** 最終ヘルスチェック時刻 */
  lastHealthCheck: Date;
  /** 平均応答時間（ミリ秒） */
  responseTimeMs: number;
  /** エラー率（0-1） */
  errorRate: number;
  /** セッション有効性 */
  sessionValid: boolean;
  /** API呼び出し成功回数 */
  apiCallCount: number;
  /** 最終エラー */
  lastError?: AgentError;
  /** ヘルススコア（0-100） */
  healthScore: number;
}

/**
 * パフォーマンス統計 (Issue #90で追加)
 */
export interface PerformanceMetrics {
  /** 総API呼び出し数 */
  totalApiCalls: number;
  /** 成功した呼び出し数 */
  successfulCalls: number;
  /** 失敗した呼び出し数 */
  failedCalls: number;
  /** 平均応答時間 */
  avgResponseTime: number;
  /** 最速応答時間 */
  minResponseTime: number;
  /** 最遅応答時間 */
  maxResponseTime: number;
  /** 最終統計更新時刻 */
  lastUpdated: Date;
}

/**
 * persistSession ハンドラー型 (Issue #90で追加)
 */
export type PersistSessionHandler = (evt: any, sess?: any) => Promise<void>;

/**
 * Agent ヘルスチェック結果 (Issue #90で追加)
 */
export interface AgentHealthReport {
  /** アカウントID */
  accountId: string;
  /** DID */
  did: string;
  /** ハンドル */
  handle: string;
  /** ヘルス状態 */
  healthStatus: AgentHealthStatus;
  /** 推奨アクション */
  recommendedAction: 'none' | 'refresh' | 'restart' | 'remove';
  /** 詳細メッセージ */
  message?: string;
}