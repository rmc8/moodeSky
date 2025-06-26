/**
 * メトリクス・モニタリングシステムの型定義
 * パフォーマンス追跡と可視化のためのデータ構造
 */

/**
 * メトリクスの種類
 */
export enum MetricType {
  COUNTER = 'COUNTER',         // カウンター（増加のみ）
  GAUGE = 'GAUGE',             // ゲージ（増減する値）
  HISTOGRAM = 'HISTOGRAM',     // ヒストグラム（分布）
  TIMER = 'TIMER'              // タイマー（実行時間）
}

/**
 * メトリクスの重要度
 */
export enum MetricPriority {
  LOW = 'LOW',                 // 低優先度（詳細分析用）
  MEDIUM = 'MEDIUM',           // 中優先度（運用監視）
  HIGH = 'HIGH',               // 高優先度（アラート対象）
  CRITICAL = 'CRITICAL'        // 重要（即座の対応必要）
}

/**
 * 基本メトリクス情報
 */
export interface BaseMetric {
  /** メトリクス名 */
  name: string;
  /** メトリクスの種類 */
  type: MetricType;
  /** 優先度 */
  priority: MetricPriority;
  /** 説明 */
  description: string;
  /** タグ（フィルタリング用） */
  tags: Record<string, string>;
  /** タイムスタンプ */
  timestamp: number;
}

/**
 * カウンターメトリクス
 */
export interface CounterMetric extends BaseMetric {
  type: MetricType.COUNTER;
  /** カウント値 */
  count: number;
  /** 増分値 */
  increment: number;
}

/**
 * ゲージメトリクス
 */
export interface GaugeMetric extends BaseMetric {
  type: MetricType.GAUGE;
  /** 現在値 */
  value: number;
  /** 前回値 */
  previousValue?: number;
}

/**
 * ヒストグラムメトリクス
 */
export interface HistogramMetric extends BaseMetric {
  type: MetricType.HISTOGRAM;
  /** データ値の配列 */
  values: number[];
  /** バケット（範囲別の分布） */
  buckets: Record<string, number>;
  /** 統計情報 */
  statistics: {
    min: number;
    max: number;
    mean: number;
    median: number;
    p95: number;
    p99: number;
    count: number;
    sum: number;
  };
}

/**
 * タイマーメトリクス
 */
export interface TimerMetric extends BaseMetric {
  type: MetricType.TIMER;
  /** 実行時間（ミリ秒） */
  durationMs: number;
  /** 開始時刻 */
  startTime: number;
  /** 終了時刻 */
  endTime: number;
  /** 操作名 */
  operationName: string;
}

/**
 * すべてのメトリクス型の共用体
 */
export type Metric = CounterMetric | GaugeMetric | HistogramMetric | TimerMetric;

/**
 * アバターキャッシュ固有のメトリクス名
 */
export enum AvatarCacheMetrics {
  // カウンター系
  CACHE_HITS = 'avatar_cache_hits',
  CACHE_MISSES = 'avatar_cache_misses',
  API_REQUESTS = 'avatar_api_requests',
  API_ERRORS = 'avatar_api_errors',
  RETRIES = 'avatar_retries',
  CACHE_EVICTIONS = 'avatar_cache_evictions',

  // ゲージ系
  CACHE_SIZE = 'avatar_cache_size',
  CACHE_HIT_RATE = 'avatar_cache_hit_rate',
  ACTIVE_REQUESTS = 'avatar_active_requests',
  MEMORY_USAGE = 'avatar_memory_usage',

  // ヒストグラム系
  RESPONSE_TIME_DISTRIBUTION = 'avatar_response_time_distribution',
  CACHE_KEY_SIZE_DISTRIBUTION = 'avatar_cache_key_size_distribution',

  // タイマー系
  API_RESPONSE_TIME = 'avatar_api_response_time',
  CACHE_OPERATION_TIME = 'avatar_cache_operation_time',
  BATCH_FETCH_TIME = 'avatar_batch_fetch_time'
}

/**
 * メトリクス収集間隔設定
 */
export interface MetricsCollectionConfig {
  /** 基本収集間隔（ミリ秒） */
  baseIntervalMs: number;
  /** 高頻度メトリクス収集間隔（ミリ秒） */
  highFrequencyIntervalMs: number;
  /** 低頻度メトリクス収集間隔（ミリ秒） */
  lowFrequencyIntervalMs: number;
  /** メトリクス保持期間（ミリ秒） */
  retentionMs: number;
  /** 最大メトリクス数 */
  maxMetrics: number;
  /** バッチサイズ */
  batchSize: number;
}

/**
 * アラート設定
 */
export interface AlertRule {
  /** アラート名 */
  name: string;
  /** 対象メトリクス */
  metricName: string;
  /** 閾値 */
  threshold: number;
  /** 比較演算子 */
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  /** 評価期間（ミリ秒） */
  evaluationPeriodMs: number;
  /** アラート重要度 */
  severity: MetricPriority;
  /** 説明 */
  description: string;
  /** 有効フラグ */
  enabled: boolean;
}

/**
 * アラート状態
 */
export interface AlertStatus {
  /** ルール名 */
  ruleName: string;
  /** 発火状態 */
  firing: boolean;
  /** 発火時刻 */
  firedAt?: number;
  /** 解決時刻 */
  resolvedAt?: number;
  /** 現在値 */
  currentValue: number;
  /** 閾値 */
  threshold: number;
  /** メッセージ */
  message: string;
}

/**
 * メトリクス集約結果
 */
export interface MetricsAggregation {
  /** 期間 */
  timeRange: {
    start: number;
    end: number;
  };
  /** メトリクス名 */
  metricName: string;
  /** 集約データ */
  aggregatedData: {
    count: number;
    sum: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  /** タイムシリーズデータ */
  timeSeries: Array<{
    timestamp: number;
    value: number;
  }>;
}

/**
 * ダッシュボードデータ
 */
export interface DashboardData {
  /** 概要統計 */
  summary: {
    totalCacheHits: number;
    totalCacheMisses: number;
    currentHitRate: number;
    currentCacheSize: number;
    activeRequests: number;
    totalErrors: number;
  };
  /** チャートデータ */
  charts: {
    hitRateOverTime: MetricsAggregation;
    responseTimeDistribution: MetricsAggregation;
    errorRateOverTime: MetricsAggregation;
    cacheSizeOverTime: MetricsAggregation;
  };
  /** アラート状況 */
  alerts: AlertStatus[];
  /** 最終更新時刻 */
  lastUpdated: number;
}

/**
 * エクスポート設定
 */
export interface MetricsExportConfig {
  /** エクスポート先の種類 */
  exportType: 'console' | 'localStorage' | 'indexedDB' | 'external' | 'webhook';
  /** エクスポート間隔（ミリ秒） */
  exportIntervalMs: number;
  /** バッチサイズ */
  batchSize: number;
  /** 外部エンドポイント（external/webhook用） */
  endpoint?: string;
  /** 認証ヘッダー */
  authHeaders?: Record<string, string>;
  /** 圧縮有効フラグ */
  compression: boolean;
  /** フィルタ（指定メトリクスのみエクスポート） */
  includeMetrics?: string[];
  /** 除外フィルタ */
  excludeMetrics?: string[];
}

/**
 * パフォーマンスプロファイル
 */
export interface PerformanceProfile {
  /** プロファイル名 */
  name: string;
  /** 期間 */
  duration: number;
  /** 操作詳細 */
  operations: Array<{
    name: string;
    startTime: number;
    endTime: number;
    duration: number;
    tags: Record<string, string>;
  }>;
  /** メモリ使用量 */
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
  };
  /** リソース使用量 */
  resourceUsage: {
    cpuTime: number;
    networkRequests: number;
    diskOperations: number;
  };
}

/**
 * メトリクス関連のユーティリティ型
 */
export type MetricFilter = {
  metricNames?: string[];
  tags?: Record<string, string>;
  timeRange?: {
    start: number;
    end: number;
  };
  priority?: MetricPriority[];
};

export type MetricQuery = {
  filters: MetricFilter;
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
  groupBy?: string[];
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  limit?: number;
};