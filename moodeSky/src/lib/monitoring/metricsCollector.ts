/**
 * メトリクス収集システム
 * アバターキャッシュのパフォーマンス監視とメトリクス収集
 */

import type {
  Metric,
  CounterMetric,
  GaugeMetric,
  HistogramMetric,
  TimerMetric,
  MetricType,
  MetricPriority,
  AvatarCacheMetrics,
  MetricsCollectionConfig,
  AlertRule,
  AlertStatus,
  MetricsAggregation,
  DashboardData,
  MetricsExportConfig,
  PerformanceProfile,
  MetricQuery,
  MetricFilter
} from '$lib/types/metrics.js';

/**
 * メトリクス収集・管理クラス
 */
export class MetricsCollector {
  private metrics: Map<string, Metric[]> = new Map();
  private config: MetricsCollectionConfig;
  private alertRules: Map<string, AlertRule> = new Map();
  private alertStatuses: Map<string, AlertStatus> = new Map();
  private collectionIntervals: Map<string, number> = new Map();
  private exportConfig?: MetricsExportConfig;
  private performanceProfiles: Map<string, PerformanceProfile> = new Map();

  constructor(config?: Partial<MetricsCollectionConfig>) {
    this.config = {
      baseIntervalMs: 30000,          // 30秒
      highFrequencyIntervalMs: 5000,  // 5秒
      lowFrequencyIntervalMs: 60000,  // 1分
      retentionMs: 24 * 60 * 60 * 1000, // 24時間
      maxMetrics: 10000,
      batchSize: 100,
      ...config
    };

    this.initializeDefaultAlerts();
    this.startCollection();
  }

  // ===================================================================
  // メトリクス記録メソッド
  // ===================================================================

  /**
   * カウンターメトリクスを記録
   */
  incrementCounter(
    name: string,
    increment: number = 1,
    tags: Record<string, string> = {},
    priority: MetricPriority = MetricPriority.MEDIUM
  ): void {
    const existing = this.getLatestMetric(name) as CounterMetric | undefined;
    const currentCount = existing?.count || 0;

    const metric: CounterMetric = {
      name,
      type: MetricType.COUNTER,
      priority,
      description: this.getMetricDescription(name),
      tags: { ...tags, source: 'avatar_cache' },
      timestamp: Date.now(),
      count: currentCount + increment,
      increment
    };

    this.recordMetric(metric);
  }

  /**
   * ゲージメトリクスを記録
   */
  recordGauge(
    name: string,
    value: number,
    tags: Record<string, string> = {},
    priority: MetricPriority = MetricPriority.MEDIUM
  ): void {
    const existing = this.getLatestMetric(name) as GaugeMetric | undefined;

    const metric: GaugeMetric = {
      name,
      type: MetricType.GAUGE,
      priority,
      description: this.getMetricDescription(name),
      tags: { ...tags, source: 'avatar_cache' },
      timestamp: Date.now(),
      value,
      previousValue: existing?.value
    };

    this.recordMetric(metric);
  }

  /**
   * ヒストグラムメトリクスを記録
   */
  recordHistogram(
    name: string,
    values: number[],
    tags: Record<string, string> = {},
    priority: MetricPriority = MetricPriority.MEDIUM
  ): void {
    const sortedValues = [...values].sort((a, b) => a - b);
    const statistics = this.calculateStatistics(sortedValues);
    const buckets = this.createBuckets(sortedValues);

    const metric: HistogramMetric = {
      name,
      type: MetricType.HISTOGRAM,
      priority,
      description: this.getMetricDescription(name),
      tags: { ...tags, source: 'avatar_cache' },
      timestamp: Date.now(),
      values: sortedValues,
      buckets,
      statistics
    };

    this.recordMetric(metric);
  }

  /**
   * タイマーメトリクスを記録
   */
  recordTimer(
    name: string,
    startTime: number,
    endTime: number,
    operationName: string,
    tags: Record<string, string> = {},
    priority: MetricPriority = MetricPriority.MEDIUM
  ): void {
    const metric: TimerMetric = {
      name,
      type: MetricType.TIMER,
      priority,
      description: this.getMetricDescription(name),
      tags: { ...tags, source: 'avatar_cache', operation: operationName },
      timestamp: Date.now(),
      durationMs: endTime - startTime,
      startTime,
      endTime,
      operationName
    };

    this.recordMetric(metric);
  }

  /**
   * タイマー開始
   */
  startTimer(operationName: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      this.recordTimer(
        AvatarCacheMetrics.API_RESPONSE_TIME,
        startTime,
        endTime,
        operationName,
        { operation: operationName }
      );
    };
  }

  // ===================================================================
  // 標準メトリクス記録メソッド（アバターキャッシュ専用）
  // ===================================================================

  /**
   * キャッシュヒットを記録
   */
  recordCacheHit(did: string): void {
    this.incrementCounter(
      AvatarCacheMetrics.CACHE_HITS,
      1,
      { did_type: this.getDIDType(did) },
      MetricPriority.HIGH
    );
  }

  /**
   * キャッシュミスを記録
   */
  recordCacheMiss(did: string): void {
    this.incrementCounter(
      AvatarCacheMetrics.CACHE_MISSES,
      1,
      { did_type: this.getDIDType(did) },
      MetricPriority.HIGH
    );
  }

  /**
   * API リクエストを記録
   */
  recordAPIRequest(endpoint: string, method: string = 'GET'): void {
    this.incrementCounter(
      AvatarCacheMetrics.API_REQUESTS,
      1,
      { endpoint, method },
      MetricPriority.MEDIUM
    );
  }

  /**
   * API エラーを記録
   */
  recordAPIError(endpoint: string, errorType: string, statusCode?: number): void {
    this.incrementCounter(
      AvatarCacheMetrics.API_ERRORS,
      1,
      { 
        endpoint, 
        error_type: errorType,
        status_code: statusCode?.toString() || 'unknown'
      },
      MetricPriority.HIGH
    );
  }

  /**
   * リトライを記録
   */
  recordRetry(operation: string, attemptNumber: number): void {
    this.incrementCounter(
      AvatarCacheMetrics.RETRIES,
      1,
      { operation, attempt: attemptNumber.toString() },
      MetricPriority.MEDIUM
    );
  }

  /**
   * キャッシュサイズを記録
   */
  recordCacheSize(size: number): void {
    this.recordGauge(
      AvatarCacheMetrics.CACHE_SIZE,
      size,
      {},
      MetricPriority.HIGH
    );
  }

  /**
   * キャッシュヒット率を記録
   */
  recordCacheHitRate(hitRate: number): void {
    this.recordGauge(
      AvatarCacheMetrics.CACHE_HIT_RATE,
      hitRate,
      {},
      MetricPriority.CRITICAL
    );
  }

  /**
   * アクティブリクエスト数を記録
   */
  recordActiveRequests(count: number): void {
    this.recordGauge(
      AvatarCacheMetrics.ACTIVE_REQUESTS,
      count,
      {},
      MetricPriority.MEDIUM
    );
  }

  // ===================================================================
  // メトリクス取得・集約メソッド
  // ===================================================================

  /**
   * メトリクスを検索
   */
  queryMetrics(query: MetricQuery): Metric[] {
    let results: Metric[] = [];

    // 全メトリクスを収集
    for (const [name, metrics] of this.metrics.entries()) {
      if (query.filters.metricNames && !query.filters.metricNames.includes(name)) {
        continue;
      }

      const filteredMetrics = metrics.filter(metric => this.matchesFilter(metric, query.filters));
      results.push(...filteredMetrics);
    }

    // 時間範囲でフィルタ
    if (query.filters.timeRange) {
      const { start, end } = query.filters.timeRange;
      results = results.filter(metric => metric.timestamp >= start && metric.timestamp <= end);
    }

    // 優先度でフィルタ
    if (query.filters.priority) {
      results = results.filter(metric => query.filters.priority!.includes(metric.priority));
    }

    // ソート
    if (query.orderBy) {
      results.sort((a, b) => {
        const aValue = this.getFieldValue(a, query.orderBy!.field);
        const bValue = this.getFieldValue(b, query.orderBy!.field);
        const direction = query.orderBy!.direction === 'asc' ? 1 : -1;
        return (aValue - bValue) * direction;
      });
    }

    // 制限
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * メトリクス集約
   */
  aggregateMetrics(
    metricName: string,
    timeRange: { start: number; end: number },
    bucketSize: number = 60000 // 1分間隔
  ): MetricsAggregation {
    const metrics = this.queryMetrics({
      filters: {
        metricNames: [metricName],
        timeRange
      }
    });

    const timeSeries: Array<{ timestamp: number; value: number }> = [];
    const buckets = new Map<number, number[]>();

    // バケットに分類
    for (const metric of metrics) {
      const bucketTime = Math.floor(metric.timestamp / bucketSize) * bucketSize;
      const value = this.extractValue(metric);
      
      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, []);
      }
      buckets.get(bucketTime)!.push(value);
    }

    // タイムシリーズデータ生成
    for (const [timestamp, values] of buckets.entries()) {
      const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;
      timeSeries.push({ timestamp, value: avgValue });
    }

    // 全体統計計算
    const allValues = Array.from(buckets.values()).flat();
    const aggregatedData = this.calculateStatistics(allValues);

    return {
      timeRange,
      metricName,
      aggregatedData: {
        count: aggregatedData.count,
        sum: aggregatedData.sum,
        min: aggregatedData.min,
        max: aggregatedData.max,
        avg: aggregatedData.mean,
        p50: aggregatedData.median,
        p95: aggregatedData.p95,
        p99: aggregatedData.p99
      },
      timeSeries: timeSeries.sort((a, b) => a.timestamp - b.timestamp)
    };
  }

  /**
   * ダッシュボードデータ生成
   */
  generateDashboardData(): DashboardData {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const timeRange = { start: now - oneHour, end: now };

    // 概要統計
    const hitCounter = this.getLatestMetric(AvatarCacheMetrics.CACHE_HITS) as CounterMetric;
    const missCounter = this.getLatestMetric(AvatarCacheMetrics.CACHE_MISSES) as CounterMetric;
    const cacheSize = this.getLatestMetric(AvatarCacheMetrics.CACHE_SIZE) as GaugeMetric;
    const activeRequests = this.getLatestMetric(AvatarCacheMetrics.ACTIVE_REQUESTS) as GaugeMetric;
    const errorCounter = this.getLatestMetric(AvatarCacheMetrics.API_ERRORS) as CounterMetric;

    const totalHits = hitCounter?.count || 0;
    const totalMisses = missCounter?.count || 0;
    const currentHitRate = totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0;

    return {
      summary: {
        totalCacheHits: totalHits,
        totalCacheMisses: totalMisses,
        currentHitRate,
        currentCacheSize: cacheSize?.value || 0,
        activeRequests: activeRequests?.value || 0,
        totalErrors: errorCounter?.count || 0
      },
      charts: {
        hitRateOverTime: this.aggregateMetrics(AvatarCacheMetrics.CACHE_HIT_RATE, timeRange),
        responseTimeDistribution: this.aggregateMetrics(AvatarCacheMetrics.API_RESPONSE_TIME, timeRange),
        errorRateOverTime: this.aggregateMetrics(AvatarCacheMetrics.API_ERRORS, timeRange),
        cacheSizeOverTime: this.aggregateMetrics(AvatarCacheMetrics.CACHE_SIZE, timeRange)
      },
      alerts: Array.from(this.alertStatuses.values()),
      lastUpdated: now
    };
  }

  // ===================================================================
  // アラート管理
  // ===================================================================

  /**
   * アラートルール追加
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.name, rule);
  }

  /**
   * アラート評価
   */
  private evaluateAlerts(): void {
    for (const [name, rule] of this.alertRules.entries()) {
      if (!rule.enabled) continue;

      const currentMetric = this.getLatestMetric(rule.metricName);
      if (!currentMetric) continue;

      const currentValue = this.extractValue(currentMetric);
      const isTriggered = this.evaluateThreshold(currentValue, rule.threshold, rule.operator);

      const existingStatus = this.alertStatuses.get(name);
      
      if (isTriggered && (!existingStatus || !existingStatus.firing)) {
        // アラート発火
        this.alertStatuses.set(name, {
          ruleName: name,
          firing: true,
          firedAt: Date.now(),
          currentValue,
          threshold: rule.threshold,
          message: `${rule.description}: ${currentValue} ${rule.operator} ${rule.threshold}`
        });

        this.onAlertFired(rule, currentValue);
      } else if (!isTriggered && existingStatus?.firing) {
        // アラート解決
        this.alertStatuses.set(name, {
          ...existingStatus,
          firing: false,
          resolvedAt: Date.now(),
          currentValue
        });

        this.onAlertResolved(rule, currentValue);
      }
    }
  }

  // ===================================================================
  // パフォーマンスプロファイリング
  // ===================================================================

  /**
   * パフォーマンスプロファイル開始
   */
  startProfile(name: string): () => void {
    const startTime = performance.now();
    const initialMemory = this.getMemoryUsage();

    return () => {
      const endTime = performance.now();
      const finalMemory = this.getMemoryUsage();

      const profile: PerformanceProfile = {
        name,
        duration: endTime - startTime,
        operations: [], // 実装で詳細操作を追加
        memoryUsage: {
          initial: initialMemory,
          peak: Math.max(initialMemory, finalMemory),
          final: finalMemory
        },
        resourceUsage: {
          cpuTime: endTime - startTime,
          networkRequests: 0, // 実装で追跡
          diskOperations: 0
        }
      };

      this.performanceProfiles.set(name, profile);
    };
  }

  // ===================================================================
  // エクスポート・永続化
  // ===================================================================

  /**
   * エクスポート設定
   */
  configureExport(config: MetricsExportConfig): void {
    this.exportConfig = config;
    this.startExport();
  }

  /**
   * メトリクスエクスポート
   */
  exportMetrics(): string {
    const exportData = {
      timestamp: Date.now(),
      config: this.config,
      metrics: Object.fromEntries(this.metrics),
      alerts: Object.fromEntries(this.alertStatuses),
      profiles: Object.fromEntries(this.performanceProfiles)
    };

    return JSON.stringify(exportData, null, 2);
  }

  // ===================================================================
  // 内部ヘルパーメソッド
  // ===================================================================

  private recordMetric(metric: Metric): void {
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }

    const metricArray = this.metrics.get(metric.name)!;
    metricArray.push(metric);

    // 保持期間を超えた古いメトリクスを削除
    const cutoffTime = Date.now() - this.config.retentionMs;
    const filteredMetrics = metricArray.filter(m => m.timestamp > cutoffTime);
    
    // 最大メトリクス数制限
    if (filteredMetrics.length > this.config.maxMetrics) {
      filteredMetrics.splice(0, filteredMetrics.length - this.config.maxMetrics);
    }

    this.metrics.set(metric.name, filteredMetrics);
  }

  private getLatestMetric(name: string): Metric | undefined {
    const metrics = this.metrics.get(name);
    return metrics && metrics.length > 0 ? metrics[metrics.length - 1] : undefined;
  }

  private calculateStatistics(values: number[]) {
    if (values.length === 0) {
      return {
        min: 0, max: 0, mean: 0, median: 0, p95: 0, p99: 0, count: 0, sum: 0
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / count;

    return {
      min: sorted[0],
      max: sorted[count - 1],
      mean,
      median: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
      count,
      sum
    };
  }

  private percentile(sortedArray: number[], p: number): number {
    const index = (sortedArray.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (lower === upper) {
      return sortedArray[lower];
    }

    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  private createBuckets(values: number[]): Record<string, number> {
    const buckets: Record<string, number> = {};
    const bucketRanges = [0, 10, 50, 100, 500, 1000, 5000, Infinity];

    for (let i = 0; i < bucketRanges.length - 1; i++) {
      const min = bucketRanges[i];
      const max = bucketRanges[i + 1];
      const key = max === Infinity ? `${min}+` : `${min}-${max}`;
      buckets[key] = values.filter(v => v >= min && v < max).length;
    }

    return buckets;
  }

  private getDIDType(did: string): string {
    if (did.startsWith('did:plc:')) return 'plc';
    if (did.startsWith('did:web:')) return 'web';
    return 'unknown';
  }

  private getMetricDescription(name: string): string {
    const descriptions: Record<string, string> = {
      [AvatarCacheMetrics.CACHE_HITS]: 'Number of cache hits',
      [AvatarCacheMetrics.CACHE_MISSES]: 'Number of cache misses',
      [AvatarCacheMetrics.API_REQUESTS]: 'Number of API requests',
      [AvatarCacheMetrics.API_ERRORS]: 'Number of API errors',
      [AvatarCacheMetrics.CACHE_SIZE]: 'Current cache size',
      [AvatarCacheMetrics.CACHE_HIT_RATE]: 'Cache hit rate percentage'
    };

    return descriptions[name] || 'Custom metric';
  }

  private matchesFilter(metric: Metric, filter: MetricFilter): boolean {
    if (filter.tags) {
      for (const [key, value] of Object.entries(filter.tags)) {
        if (metric.tags[key] !== value) return false;
      }
    }
    return true;
  }

  private getFieldValue(metric: Metric, field: string): number {
    switch (field) {
      case 'timestamp': return metric.timestamp;
      case 'value': return this.extractValue(metric);
      default: return 0;
    }
  }

  private extractValue(metric: Metric): number {
    switch (metric.type) {
      case MetricType.COUNTER: return (metric as CounterMetric).count;
      case MetricType.GAUGE: return (metric as GaugeMetric).value;
      case MetricType.TIMER: return (metric as TimerMetric).durationMs;
      case MetricType.HISTOGRAM: return (metric as HistogramMetric).statistics.mean;
      default: return 0;
    }
  }

  private evaluateThreshold(value: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      case 'neq': return value !== threshold;
      default: return false;
    }
  }

  private getMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private initializeDefaultAlerts(): void {
    // デフォルトアラートルール
    this.addAlertRule({
      name: 'low_cache_hit_rate',
      metricName: AvatarCacheMetrics.CACHE_HIT_RATE,
      threshold: 0.8,
      operator: 'lt',
      evaluationPeriodMs: 300000, // 5分
      severity: MetricPriority.HIGH,
      description: 'Cache hit rate is below 80%',
      enabled: true
    });

    this.addAlertRule({
      name: 'high_error_rate',
      metricName: AvatarCacheMetrics.API_ERRORS,
      threshold: 10,
      operator: 'gt',
      evaluationPeriodMs: 300000,
      severity: MetricPriority.CRITICAL,
      description: 'Error rate is above 10 per 5 minutes',
      enabled: true
    });
  }

  private startCollection(): void {
    // 高頻度メトリクス収集
    const highFreqInterval = setInterval(() => {
      this.evaluateAlerts();
    }, this.config.highFrequencyIntervalMs);

    this.collectionIntervals.set('high_freq', highFreqInterval as any);
  }

  private startExport(): void {
    if (!this.exportConfig) return;

    const exportInterval = setInterval(() => {
      const data = this.exportMetrics();
      
      switch (this.exportConfig!.exportType) {
        case 'console':
          console.log('📊 [Metrics]', data);
          break;
        case 'localStorage':
          localStorage.setItem('avatar_cache_metrics', data);
          break;
        // 他のエクスポート方法の実装
      }
    }, this.exportConfig.exportIntervalMs);

    this.collectionIntervals.set('export', exportInterval as any);
  }

  private onAlertFired(rule: AlertRule, value: number): void {
    console.warn(`🚨 [Alert] ${rule.name}: ${rule.description} (${value})`);
  }

  private onAlertResolved(rule: AlertRule, value: number): void {
    console.info(`✅ [Alert Resolved] ${rule.name}: ${value}`);
  }

  /**
   * リソースクリーンアップ
   */
  destroy(): void {
    for (const intervalId of this.collectionIntervals.values()) {
      clearInterval(intervalId);
    }
    this.collectionIntervals.clear();
    this.metrics.clear();
    this.alertStatuses.clear();
    this.performanceProfiles.clear();
  }
}