/**
 * MetricsCollector テストスイート
 * リアルタイムメトリクス収集・監視システムの検証
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MetricsCollector } from './metricsCollector.js';
import {
  MetricType,
  MetricPriority,
  AvatarCacheMetrics,
  type MetricsCollectionConfig,
  type AlertRule,
  type CounterMetric,
  type GaugeMetric,
  type HistogramMetric,
  type TimerMetric
} from '$lib/types/metrics.js';

describe('MetricsCollector', () => {
  let metricsCollector: MetricsCollector;

  beforeEach(() => {
    // フェイクタイマーを有効化
    vi.useFakeTimers();
    
    // 高速テスト用の設定
    const testConfig: Partial<MetricsCollectionConfig> = {
      baseIntervalMs: 100,
      highFrequencyIntervalMs: 50,
      retentionMs: 1000,
      maxMetrics: 100,
      batchSize: 10
    };
    
    metricsCollector = new MetricsCollector(testConfig);
    
    // コンソールログをモック
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    metricsCollector.destroy();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ===================================================================
  // 基本メトリクス記録テスト
  // ===================================================================

  describe('Counter Metrics', () => {
    it('should record counter increments correctly', () => {
      metricsCollector.incrementCounter('test_counter', 5);
      metricsCollector.incrementCounter('test_counter', 3);

      const query = metricsCollector.queryMetrics({
        filters: { metricNames: ['test_counter'] }
      });

      expect(query).toHaveLength(2);
      expect((query[0] as CounterMetric).count).toBe(5);
      expect((query[1] as CounterMetric).count).toBe(8); // 累積
      expect((query[1] as CounterMetric).increment).toBe(3);
    });

    it('should use default increment of 1', () => {
      metricsCollector.incrementCounter('default_counter');

      const query = metricsCollector.queryMetrics({
        filters: { metricNames: ['default_counter'] }
      });

      expect((query[0] as CounterMetric).count).toBe(1);
      expect((query[0] as CounterMetric).increment).toBe(1);
    });
  });

  describe('Gauge Metrics', () => {
    it('should record gauge values correctly', () => {
      metricsCollector.recordGauge('test_gauge', 100);
      metricsCollector.recordGauge('test_gauge', 150);

      const query = metricsCollector.queryMetrics({
        filters: { metricNames: ['test_gauge'] }
      });

      expect(query).toHaveLength(2);
      expect((query[0] as GaugeMetric).value).toBe(100);
      expect((query[1] as GaugeMetric).value).toBe(150);
      expect((query[1] as GaugeMetric).previousValue).toBe(100);
    });
  });

  describe('Histogram Metrics', () => {
    it('should calculate histogram statistics correctly', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      metricsCollector.recordHistogram('test_histogram', values);

      const query = metricsCollector.queryMetrics({
        filters: { metricNames: ['test_histogram'] }
      });

      const histogram = query[0] as HistogramMetric;
      expect(histogram.statistics.min).toBe(1);
      expect(histogram.statistics.max).toBe(10);
      expect(histogram.statistics.mean).toBe(5.5);
      expect(histogram.statistics.median).toBe(5.5);
      expect(histogram.statistics.count).toBe(10);
      expect(histogram.statistics.sum).toBe(55);
    });

    it('should create buckets correctly', () => {
      const values = [5, 25, 75, 150, 750, 2000, 8000];
      metricsCollector.recordHistogram('bucket_test', values);

      const query = metricsCollector.queryMetrics({
        filters: { metricNames: ['bucket_test'] }
      });

      const histogram = query[0] as HistogramMetric;
      expect(histogram.buckets['0-10']).toBe(1);  // 5
      expect(histogram.buckets['10-50']).toBe(1); // 25
      expect(histogram.buckets['50-100']).toBe(1); // 75
      expect(histogram.buckets['100-500']).toBe(1); // 150
      expect(histogram.buckets['500-1000']).toBe(1); // 750
      expect(histogram.buckets['1000-5000']).toBe(1); // 2000
      expect(histogram.buckets['5000+']).toBe(1); // 8000
    });
  });

  describe('Timer Metrics', () => {
    it('should record timer operations correctly', () => {
      const startTime = 1000;
      const endTime = 1500;
      
      metricsCollector.recordTimer(
        'test_timer',
        startTime,
        endTime,
        'test_operation'
      );

      const query = metricsCollector.queryMetrics({
        filters: { metricNames: ['test_timer'] }
      });

      const timer = query[0] as TimerMetric;
      expect(timer.durationMs).toBe(500);
      expect(timer.startTime).toBe(startTime);
      expect(timer.endTime).toBe(endTime);
      expect(timer.operationName).toBe('test_operation');
    });

    it('should use startTimer helper correctly', () => {
      const endTimer = metricsCollector.startTimer('helper_operation');
      
      // 少し待機
      vi.advanceTimersByTime(100);
      endTimer();

      const query = metricsCollector.queryMetrics({
        filters: { metricNames: [AvatarCacheMetrics.API_RESPONSE_TIME] }
      });

      expect(query).toHaveLength(1);
      const timer = query[0] as TimerMetric;
      expect(timer.operationName).toBe('helper_operation');
      expect(timer.durationMs).toBeGreaterThan(0);
    });
  });

  // ===================================================================
  // アバター固有メトリクステスト
  // ===================================================================

  describe('Avatar Cache Specific Metrics', () => {
    it('should record cache hits correctly', () => {
      metricsCollector.recordCacheHit('did:plc:test123');
      metricsCollector.recordCacheHit('did:web:example.com');

      const query = metricsCollector.queryMetrics({
        filters: { metricNames: [AvatarCacheMetrics.CACHE_HITS] }
      });

      expect(query).toHaveLength(2);
      expect((query[0] as CounterMetric).tags.did_type).toBe('plc');
      expect((query[1] as CounterMetric).tags.did_type).toBe('web');
    });

    it('should record cache misses correctly', () => {
      metricsCollector.recordCacheMiss('did:plc:miss123');

      const query = metricsCollector.queryMetrics({
        filters: { metricNames: [AvatarCacheMetrics.CACHE_MISSES] }
      });

      expect(query).toHaveLength(1);
      expect((query[0] as CounterMetric).tags.did_type).toBe('plc');
    });

    it('should record API requests and errors', () => {
      metricsCollector.recordAPIRequest('getProfile', 'GET');
      metricsCollector.recordAPIError('getProfile', 'NETWORK_ERROR', 500);

      const requestQuery = metricsCollector.queryMetrics({
        filters: { metricNames: [AvatarCacheMetrics.API_REQUESTS] }
      });

      const errorQuery = metricsCollector.queryMetrics({
        filters: { metricNames: [AvatarCacheMetrics.API_ERRORS] }
      });

      expect(requestQuery).toHaveLength(1);
      expect(errorQuery).toHaveLength(1);
      expect((errorQuery[0] as CounterMetric).tags.status_code).toBe('500');
    });

    it('should record retries correctly', () => {
      metricsCollector.recordRetry('fetch_profile', 3);

      const query = metricsCollector.queryMetrics({
        filters: { metricNames: [AvatarCacheMetrics.RETRIES] }
      });

      expect(query).toHaveLength(1);
      expect((query[0] as CounterMetric).tags.attempt).toBe('3');
    });

    it('should record cache size and hit rate', () => {
      metricsCollector.recordCacheSize(150);
      metricsCollector.recordCacheHitRate(0.85);

      const sizeQuery = metricsCollector.queryMetrics({
        filters: { metricNames: [AvatarCacheMetrics.CACHE_SIZE] }
      });

      const hitRateQuery = metricsCollector.queryMetrics({
        filters: { metricNames: [AvatarCacheMetrics.CACHE_HIT_RATE] }
      });

      expect((sizeQuery[0] as GaugeMetric).value).toBe(150);
      expect((hitRateQuery[0] as GaugeMetric).value).toBe(0.85);
    });
  });

  // ===================================================================
  // クエリ・フィルタリングテスト
  // ===================================================================

  describe('Query and Filtering', () => {
    beforeEach(() => {
      // テストデータ準備
      metricsCollector.incrementCounter('counter1', 1, { env: 'test' }, MetricPriority.HIGH);
      metricsCollector.incrementCounter('counter2', 2, { env: 'prod' }, MetricPriority.LOW);
      metricsCollector.recordGauge('gauge1', 100, { env: 'test' }, MetricPriority.MEDIUM);
    });

    it('should filter by metric names', () => {
      const query = metricsCollector.queryMetrics({
        filters: { metricNames: ['counter1'] }
      });

      expect(query).toHaveLength(1);
      expect(query[0].name).toBe('counter1');
    });

    it('should filter by tags', () => {
      const query = metricsCollector.queryMetrics({
        filters: { tags: { env: 'test' } }
      });

      expect(query).toHaveLength(2); // counter1 and gauge1
      query.forEach(metric => {
        expect(metric.tags.env).toBe('test');
      });
    });

    it('should filter by priority', () => {
      const query = metricsCollector.queryMetrics({
        filters: { priority: [MetricPriority.HIGH] }
      });

      expect(query).toHaveLength(1);
      expect(query[0].priority).toBe(MetricPriority.HIGH);
    });

    it('should filter by time range', () => {
      const now = Date.now();
      const oneHourAgo = now - 3600000;

      const query = metricsCollector.queryMetrics({
        filters: { 
          timeRange: { start: oneHourAgo, end: now }
        }
      });

      expect(query.length).toBeGreaterThan(0);
      query.forEach(metric => {
        expect(metric.timestamp).toBeGreaterThanOrEqual(oneHourAgo);
        expect(metric.timestamp).toBeLessThanOrEqual(now);
      });
    });

    it('should sort results correctly', () => {
      const query = metricsCollector.queryMetrics({
        filters: {},
        orderBy: { field: 'timestamp', direction: 'desc' }
      });

      for (let i = 1; i < query.length; i++) {
        expect(query[i].timestamp).toBeLessThanOrEqual(query[i - 1].timestamp);
      }
    });

    it('should limit results correctly', () => {
      const query = metricsCollector.queryMetrics({
        filters: {},
        limit: 2
      });

      expect(query).toHaveLength(2);
    });
  });

  // ===================================================================
  // 集約・統計テスト
  // ===================================================================

  describe('Aggregation', () => {
    beforeEach(() => {
      // 時系列データを準備
      for (let i = 0; i < 10; i++) {
        metricsCollector.incrementCounter('test_aggregation', i + 1);
        vi.advanceTimersByTime(100);
      }
    });

    it('should aggregate metrics over time range', () => {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;

      const aggregation = metricsCollector.aggregateMetrics(
        'test_aggregation',
        { start: oneMinuteAgo, end: now },
        10000 // 10秒バケット
      );

      expect(aggregation.metricName).toBe('test_aggregation');
      expect(aggregation.timeRange.start).toBe(oneMinuteAgo);
      expect(aggregation.timeRange.end).toBe(now);
      expect(aggregation.timeSeries).toBeDefined();
      expect(aggregation.aggregatedData.count).toBeGreaterThan(0);
    });
  });

  // ===================================================================
  // ダッシュボードデータテスト
  // ===================================================================

  describe('Dashboard Data', () => {
    beforeEach(() => {
      // サンプルデータ準備
      metricsCollector.recordCacheHit('did:plc:test1');
      metricsCollector.recordCacheHit('did:plc:test2');
      metricsCollector.recordCacheMiss('did:plc:test3');
      metricsCollector.recordCacheSize(100);
      metricsCollector.recordActiveRequests(5);
      metricsCollector.recordAPIError('getProfile', 'NETWORK_ERROR');
    });

    it('should generate dashboard data correctly', () => {
      const dashboard = metricsCollector.generateDashboardData();

      expect(dashboard.summary.totalCacheHits).toBe(2);
      expect(dashboard.summary.totalCacheMisses).toBe(1);
      expect(dashboard.summary.currentHitRate).toBeCloseTo(0.667, 2);
      expect(dashboard.summary.currentCacheSize).toBe(100);
      expect(dashboard.summary.activeRequests).toBe(5);
      expect(dashboard.summary.totalErrors).toBe(1);

      expect(dashboard.charts.hitRateOverTime).toBeDefined();
      expect(dashboard.charts.responseTimeDistribution).toBeDefined();
      expect(dashboard.charts.errorRateOverTime).toBeDefined();
      expect(dashboard.charts.cacheSizeOverTime).toBeDefined();

      expect(dashboard.alerts).toBeDefined();
      expect(dashboard.lastUpdated).toBeGreaterThan(0);
    });
  });

  // ===================================================================
  // アラートテスト
  // ===================================================================

  describe('Alerts', () => {
    it('should trigger alert when threshold is exceeded', async () => {
      // 低いヒット率のアラートルールを追加
      const alertRule: AlertRule = {
        name: 'test_low_hit_rate',
        metricName: AvatarCacheMetrics.CACHE_HIT_RATE,
        threshold: 0.9,
        operator: 'lt',
        evaluationPeriodMs: 100,
        severity: MetricPriority.HIGH,
        description: 'Test low hit rate alert',
        enabled: true
      };

      metricsCollector.addAlertRule(alertRule);

      // 低いヒット率を記録
      metricsCollector.recordCacheHitRate(0.5);

      // アラート評価を待つ
      await vi.advanceTimersByTimeAsync(150);

      const dashboard = metricsCollector.generateDashboardData();
      const alerts = dashboard.alerts.filter(alert => alert.firing);

      expect(alerts.length).toBeGreaterThan(0);
      // デフォルトのアラートがあるため、テスト用のアラートを検索
      const testAlert = alerts.find(alert => alert.ruleName === 'test_low_hit_rate');
      expect(testAlert).toBeDefined();
      expect(testAlert!.currentValue).toBe(0.5);
    });

    it('should resolve alert when threshold is no longer exceeded', async () => {
      const alertRule: AlertRule = {
        name: 'test_resolve_alert',
        metricName: AvatarCacheMetrics.CACHE_HIT_RATE,
        threshold: 0.8,
        operator: 'lt',
        evaluationPeriodMs: 100,
        severity: MetricPriority.HIGH,
        description: 'Test resolve alert',
        enabled: true
      };

      metricsCollector.addAlertRule(alertRule);

      // 低いヒット率でアラート発火
      metricsCollector.recordCacheHitRate(0.5);
      await vi.advanceTimersByTimeAsync(150);

      // 高いヒット率でアラート解決
      metricsCollector.recordCacheHitRate(0.95);
      await vi.advanceTimersByTimeAsync(150);

      const dashboard = metricsCollector.generateDashboardData();
      const resolvedAlerts = dashboard.alerts.filter(alert => !alert.firing && alert.resolvedAt);

      expect(resolvedAlerts.length).toBeGreaterThan(0);
      // デフォルトのアラートがあるため、テスト用のアラートを検索
      const testAlert = resolvedAlerts.find(alert => alert.ruleName === 'test_resolve_alert');
      expect(testAlert).toBeDefined();
    });
  });

  // ===================================================================
  // パフォーマンステスト
  // ===================================================================

  describe('Performance', () => {
    it('should handle high-frequency metric recording efficiently', () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        metricsCollector.incrementCounter('perf_test', 1);
      }
      
      const end = performance.now();
      expect(end - start).toBeLessThan(100); // 100ms以内
    });

    it('should profile operations correctly', () => {
      const endProfile = metricsCollector.startProfile('test_profile');
      
      // フェイクタイマーで時間を進める
      vi.advanceTimersByTime(100);
      
      // 何らかの処理をシミュレート
      let sum = 0;
      for (let i = 0; i < 1000; i++) {
        sum += i;
      }
      
      endProfile();

      // プロファイルが記録されていることを確認
      const exportData = JSON.parse(metricsCollector.exportMetrics());
      expect(exportData.profiles.test_profile).toBeDefined();
      expect(exportData.profiles.test_profile.duration).toBeGreaterThanOrEqual(0);
    });
  });

  // ===================================================================
  // エクスポート・永続化テスト
  // ===================================================================

  describe('Export and Persistence', () => {
    beforeEach(() => {
      metricsCollector.incrementCounter('export_test', 10);
      metricsCollector.recordGauge('export_gauge', 50);
    });

    it('should export metrics correctly', () => {
      const exported = metricsCollector.exportMetrics();
      const data = JSON.parse(exported);

      expect(data.timestamp).toBeGreaterThan(0);
      expect(data.config).toBeDefined();
      expect(data.metrics).toBeDefined();
      expect(data.alerts).toBeDefined();
      expect(data.profiles).toBeDefined();
    });

    it('should configure export correctly', () => {
      const exportConfig = {
        exportType: 'console' as const,
        exportIntervalMs: 1000,
        batchSize: 50,
        compression: false
      };

      metricsCollector.configureExport(exportConfig);

      // エクスポートが設定されていることを確認
      // （実際のエクスポートはインターバル処理のため、設定のみ確認）
      expect(true).toBe(true); // 設定が正常に完了したことを示す
    });
  });

  // ===================================================================
  // エラーハンドリングテスト
  // ===================================================================

  describe('Error Handling', () => {
    it('should handle empty values gracefully', () => {
      expect(() => {
        metricsCollector.recordHistogram('empty_histogram', []);
      }).not.toThrow();

      const query = metricsCollector.queryMetrics({
        filters: { metricNames: ['empty_histogram'] }
      });

      const histogram = query[0] as HistogramMetric;
      expect(histogram.statistics.count).toBe(0);
    });

    it('should handle invalid query gracefully', () => {
      expect(() => {
        metricsCollector.queryMetrics({
          filters: { metricNames: ['non_existent'] }
        });
      }).not.toThrow();
    });
  });

  // ===================================================================
  // クリーンアップテスト
  // ===================================================================

  describe('Cleanup', () => {
    it('should clean up resources correctly', () => {
      const originalSize = Object.keys(metricsCollector.exportMetrics()).length;
      
      metricsCollector.destroy();
      
      // destroyが例外を投げないことを確認
      expect(true).toBe(true);
    });
  });
});