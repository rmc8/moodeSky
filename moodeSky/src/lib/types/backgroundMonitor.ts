/**
 * Background Session Monitor 型定義
 * Issue #91: バックグラウンドセッション監視システム
 */

/**
 * 監視設定
 */
export interface MonitoringConfig {
  /** 監視間隔（ミリ秒） */
  intervalMs: number;
  /** フォーカス時の監視を有効にするか */
  enableOnFocus: boolean;
  /** ネットワークチェックを有効にするか */
  enableNetworkCheck: boolean;
  /** 最大同時チェック数 */
  maxConcurrentChecks: number;
  /** リトライ間隔（ミリ秒） */
  retryIntervalMs: number;
  /** バッテリー最適化を有効にするか */
  enableBatteryOptimization: boolean;
  /** バックグラウンド時の監視間隔倍率 */
  backgroundIntervalMultiplier: number;
}

/**
 * ネットワーク状態
 */
export type NetworkStatus = 'online' | 'offline' | 'slow' | 'unknown';

/**
 * アプリライフサイクルイベント
 */
export type AppLifecycleEvent = 
  | 'app-focus'
  | 'app-blur' 
  | 'network-online'
  | 'network-offline'
  | 'system-wake'
  | 'system-sleep'
  | 'battery-low'
  | 'battery-normal';

/**
 * ヘルスチェック結果
 */
export interface HealthCheckResult {
  /** アカウントID */
  accountId: string;
  /** チェック種別 */
  checkType: HealthCheckType;
  /** チェック成功かどうか */
  success: boolean;
  /** レスポンス時間（ミリ秒） */
  responseTimeMs: number;
  /** エラーメッセージ */
  error?: string;
  /** 詳細データ */
  details?: any;
  /** チェック実行時刻 */
  timestamp: Date;
}

/**
 * ヘルスチェック種別
 */
export type HealthCheckType = 
  | 'token-validation'
  | 'network-connectivity' 
  | 'session-consistency'
  | 'performance-metrics'
  | 'agent-health';

/**
 * バックグラウンド監視統計
 */
export interface MonitoringStats {
  /** 総チェック実行回数 */
  totalChecks: number;
  /** 成功したチェック回数 */
  successfulChecks: number;
  /** 失敗したチェック回数 */
  failedChecks: number;
  /** 平均レスポンス時間 */
  avgResponseTimeMs: number;
  /** 最終チェック時刻 */
  lastCheckAt: Date;
  /** 開始時刻 */
  startedAt: Date;
  /** エラー率 */
  errorRate: number;
  /** アクティブなアカウント数 */
  activeAccounts: number;
}

/**
 * 監視イベント
 */
export type MonitoringEvent = 
  | { type: 'MonitoringStarted'; timestamp: Date; config: MonitoringConfig }
  | { type: 'MonitoringStopped'; timestamp: Date; stats: MonitoringStats }
  | { type: 'HealthCheckCompleted'; result: HealthCheckResult }
  | { type: 'HealthCheckFailed'; accountId: string; error: string; timestamp: Date }
  | { type: 'NetworkStatusChanged'; status: NetworkStatus; timestamp: Date }
  | { type: 'AppLifecycleChanged'; event: AppLifecycleEvent; timestamp: Date }
  | { type: 'ErrorPatternDetected'; pattern: string; accounts: string[]; timestamp: Date };

/**
 * ネットワーク健全性
 */
export interface NetworkHealth {
  /** オンライン状態 */
  isOnline: boolean;
  /** レスポンス時間（ミリ秒） */
  latencyMs: number;
  /** 帯域幅推定（Mbps） */
  estimatedBandwidthMbps?: number;
  /** エラー率 */
  errorRate: number;
  /** 最終チェック時刻 */
  lastCheckedAt: Date;
}

/**
 * バッテリー状態
 */
export interface BatteryStatus {
  /** バッテリー残量（0-1） */
  level: number;
  /** 充電中かどうか */
  isCharging: boolean;
  /** 低バッテリー状態かどうか */
  isLow: boolean;
  /** 最終更新時刻 */
  lastUpdatedAt: Date;
}