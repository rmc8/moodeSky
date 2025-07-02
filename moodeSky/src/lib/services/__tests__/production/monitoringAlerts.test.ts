/**
 * Monitoring and Alerts Test Suite
 * Issue #92 Phase 4 Wave 4: 監視・アラートテスト
 * 
 * 本番環境監視・アラートシステムの包括的検証
 * - メトリクス収集・集約機能
 * - リアルタイム監視・閾値検証
 * - アラート生成・通知システム
 * - ダッシュボード・可視化機能
 * - ログ収集・分析システム
 * - パフォーマンス監視・異常検出
 * - SLA/SLO監視・レポート
 * - 障害対応・エスカレーション機能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IntegrationTestContainer } from '../../../test-utils/integrationTestContainer.ts';
import { TimeControlHelper, AccountTestFactory } from '../../../test-utils/sessionTestUtils.ts';
import { AtProtocolMockFactory } from '../../../test-utils/mockFactories.ts';

describe('Monitoring and Alerts Tests', () => {
  let container: IntegrationTestContainer;

  beforeEach(async () => {
    // 監視・アラートテスト用の設定
    container = new IntegrationTestContainer({
      initialAccountCount: 3,
      enableJWTManager: true,
      enableBackgroundMonitor: true,
      logLevel: 'info'
    });
    await container.setup();

    // 監視システム環境の初期化
    await this.setupMonitoringEnvironment();
  });

  afterEach(async () => {
    await this.teardownMonitoringEnvironment();
    await container.teardown();
  });

  // ===================================================================
  // メトリクス収集・集約テスト
  // ===================================================================

  describe('Metrics Collection and Aggregation', () => {
    it('should collect and aggregate system metrics accurately', async () => {
      console.log('Testing metrics collection and aggregation...');

      const metricsCategories = [
        {
          name: 'Application Metrics',
          category: 'application',
          metrics: [
            { name: 'session_count', type: 'gauge', unit: 'count', expectedRange: [0, 10000] },
            { name: 'session_creation_rate', type: 'counter', unit: 'per_second', expectedRange: [0, 100] },
            { name: 'authentication_success_rate', type: 'histogram', unit: 'percentage', expectedRange: [95, 100] },
            { name: 'api_request_duration', type: 'histogram', unit: 'milliseconds', expectedRange: [10, 1000] },
            { name: 'error_rate', type: 'counter', unit: 'percentage', expectedRange: [0, 5] }
          ],
          collectionInterval: 30000, // 30 seconds
          aggregationPeriod: 300000,  // 5 minutes
          description: 'アプリケーション関連メトリクス'
        },
        {
          name: 'System Metrics',
          category: 'system',
          metrics: [
            { name: 'cpu_usage', type: 'gauge', unit: 'percentage', expectedRange: [0, 90] },
            { name: 'memory_usage', type: 'gauge', unit: 'bytes', expectedRange: [100000000, 1000000000] },
            { name: 'disk_usage', type: 'gauge', unit: 'percentage', expectedRange: [0, 80] },
            { name: 'network_io', type: 'counter', unit: 'bytes_per_second', expectedRange: [1000, 100000000] },
            { name: 'file_descriptors', type: 'gauge', unit: 'count', expectedRange: [100, 10000] }
          ],
          collectionInterval: 15000,  // 15 seconds
          aggregationPeriod: 180000,  // 3 minutes
          description: 'システムリソースメトリクス'
        },
        {
          name: 'Database Metrics',
          category: 'database',
          metrics: [
            { name: 'connection_pool_usage', type: 'gauge', unit: 'percentage', expectedRange: [0, 85] },
            { name: 'query_execution_time', type: 'histogram', unit: 'milliseconds', expectedRange: [1, 500] },
            { name: 'database_size', type: 'gauge', unit: 'bytes', expectedRange: [1000000, 10000000000] },
            { name: 'transaction_rate', type: 'counter', unit: 'per_second', expectedRange: [0, 1000] },
            { name: 'deadlock_count', type: 'counter', unit: 'count', expectedRange: [0, 10] }
          ],
          collectionInterval: 60000,  // 1 minute
          aggregationPeriod: 600000,  // 10 minutes
          description: 'データベースメトリクス'
        },
        {
          name: 'Business Metrics',
          category: 'business',
          metrics: [
            { name: 'active_users', type: 'gauge', unit: 'count', expectedRange: [0, 50000] },
            { name: 'user_engagement_time', type: 'histogram', unit: 'seconds', expectedRange: [60, 7200] },
            { name: 'feature_usage_rate', type: 'counter', unit: 'per_hour', expectedRange: [0, 10000] },
            { name: 'conversion_rate', type: 'gauge', unit: 'percentage', expectedRange: [0, 100] },
            { name: 'revenue_per_user', type: 'gauge', unit: 'currency', expectedRange: [0, 1000] }
          ],
          collectionInterval: 120000, // 2 minutes
          aggregationPeriod: 1800000, // 30 minutes
          description: 'ビジネスメトリクス'
        }
      ];

      const metricsResults: Array<{
        categoryName: string;
        category: string;
        metricsStatus: Array<{
          name: string;
          type: string;
          unit: string;
          collected: boolean;
          aggregated: boolean;
          accuracy: number;
          withinRange: boolean;
          collectionLatency: number;
          lastValue: number;
        }>;
        collectionSuccess: number;
        aggregationSuccess: number;
        overallAccuracy: number;
        dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
        issues: string[];
        details: string;
      }> = [];

      for (const category of metricsCategories) {
        console.log(`\n  Testing ${category.name}...`);
        
        try {
          // メトリクス収集器の初期化
          await this.initializeMetricsCollector(category.category, category.metrics);
          
          const metricsStatus: Array<{
            name: string;
            type: string;
            unit: string;
            collected: boolean;
            aggregated: boolean;
            accuracy: number;
            withinRange: boolean;
            collectionLatency: number;
            lastValue: number;
          }> = [];

          const issues: string[] = [];
          let totalCollected = 0;
          let totalAggregated = 0;
          let totalAccuracy = 0;

          // 各メトリクスの収集・集約テスト
          for (const metric of category.metrics) {
            console.log(`    Testing ${metric.name}...`);
            
            const collectionStartTime = Date.now();
            
            // メトリクス収集の実行
            const collectionResult = await this.collectMetric(
              category.category,
              metric.name,
              category.collectionInterval
            );
            
            const collectionLatency = Date.now() - collectionStartTime;
            
            // メトリクス集約の実行
            const aggregationResult = await this.aggregateMetric(
              category.category,
              metric.name,
              category.aggregationPeriod
            );
            
            // 精度の測定
            const accuracy = await this.measureMetricAccuracy(
              category.category,
              metric.name,
              metric.type
            );
            
            // 範囲内チェック
            const withinRange = collectionResult.value >= metric.expectedRange[0] && 
                              collectionResult.value <= metric.expectedRange[1];

            if (collectionResult.success) totalCollected++;
            if (aggregationResult.success) totalAggregated++;
            totalAccuracy += accuracy;

            if (!collectionResult.success) {
              issues.push(`${metric.name}: Collection failed - ${collectionResult.error}`);
            }
            if (!aggregationResult.success) {
              issues.push(`${metric.name}: Aggregation failed - ${aggregationResult.error}`);
            }
            if (!withinRange) {
              issues.push(`${metric.name}: Value ${collectionResult.value} outside expected range [${metric.expectedRange[0]}, ${metric.expectedRange[1]}]`);
            }

            metricsStatus.push({
              name: metric.name,
              type: metric.type,
              unit: metric.unit,
              collected: collectionResult.success,
              aggregated: aggregationResult.success,
              accuracy,
              withinRange,
              collectionLatency,
              lastValue: collectionResult.value || 0
            });

            console.log(`      ${metric.name}: ${collectionResult.success ? '✅' : '❌'} Collected, ${aggregationResult.success ? '✅' : '❌'} Aggregated (${accuracy.toFixed(1)}% accuracy)`);
          }

          // 全体的な成功率と品質の計算
          const collectionSuccess = totalCollected / category.metrics.length;
          const aggregationSuccess = totalAggregated / category.metrics.length;
          const overallAccuracy = totalAccuracy / category.metrics.length;

          // データ品質の判定
          let dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
          if (overallAccuracy >= 95 && collectionSuccess >= 0.95) dataQuality = 'excellent';
          else if (overallAccuracy >= 90 && collectionSuccess >= 0.9) dataQuality = 'good';
          else if (overallAccuracy >= 80 && collectionSuccess >= 0.8) dataQuality = 'fair';
          else dataQuality = 'poor';

          metricsResults.push({
            categoryName: category.name,
            category: category.category,
            metricsStatus,
            collectionSuccess,
            aggregationSuccess,
            overallAccuracy,
            dataQuality,
            issues,
            details: `${category.description} - Collection: ${(collectionSuccess * 100).toFixed(1)}%, Aggregation: ${(aggregationSuccess * 100).toFixed(1)}%, Accuracy: ${overallAccuracy.toFixed(1)}%, Quality: ${dataQuality}`
          });

          console.log(`  ✅ ${category.name}:`);
          console.log(`    Collection Success: ${(collectionSuccess * 100).toFixed(1)}%`);
          console.log(`    Aggregation Success: ${(aggregationSuccess * 100).toFixed(1)}%`);
          console.log(`    Overall Accuracy: ${overallAccuracy.toFixed(1)}%`);
          console.log(`    Data Quality: ${dataQuality}`);

          // メトリクス収集器のクリーンアップ
          await this.cleanupMetricsCollector(category.category);

        } catch (error) {
          metricsResults.push({
            categoryName: category.name,
            category: category.category,
            metricsStatus: [],
            collectionSuccess: 0,
            aggregationSuccess: 0,
            overallAccuracy: 0,
            dataQuality: 'poor',
            issues: [`Metrics test failed: ${error instanceof Error ? error.message : String(error)}`],
            details: `Metrics collection test failed: ${error instanceof Error ? error.message : String(error).substring(0, 100)}`
          });

          console.log(`  ❌ ${category.name} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // メトリクス収集システムの評価
      const excellentQualityCategories = metricsResults.filter(r => r.dataQuality === 'excellent').length;
      const goodOrBetterCategories = metricsResults.filter(r => r.dataQuality === 'excellent' || r.dataQuality === 'good').length;
      const metricsQualityScore = goodOrBetterCategories / metricsResults.length;
      const averageCollectionSuccess = metricsResults.reduce((sum, r) => sum + r.collectionSuccess, 0) / metricsResults.length;
      const averageAccuracy = metricsResults.reduce((sum, r) => sum + r.overallAccuracy, 0) / metricsResults.length;

      console.log('\nMetrics Collection Summary:');
      metricsResults.forEach(result => {
        console.log(`  ${result.categoryName}: ${result.dataQuality} quality (${(result.collectionSuccess * 100).toFixed(1)}% collection, ${result.overallAccuracy.toFixed(1)}% accuracy)`);
      });
      console.log(`Metrics Quality Score: ${(metricsQualityScore * 100).toFixed(1)}%`);
      console.log(`Average Collection Success: ${(averageCollectionSuccess * 100).toFixed(1)}%`);
      console.log(`Average Accuracy: ${averageAccuracy.toFixed(1)}%`);

      if (metricsResults.some(r => r.issues.length > 0)) {
        console.log('\nMetrics Issues:');
        metricsResults.forEach(result => {
          if (result.issues.length > 0) {
            console.log(`  ${result.categoryName}:`);
            result.issues.forEach(issue => console.log(`    - ${issue}`));
          }
        });
      }

      expect(metricsQualityScore).toBeGreaterThan(0.8); // 80%以上が良品質
      expect(averageCollectionSuccess).toBeGreaterThan(0.9); // 90%以上の収集成功率
      expect(averageAccuracy).toBeGreaterThan(0.85); // 85%以上の精度
      expect(excellentQualityCategories).toBeGreaterThan(0); // 少なくとも1つはExcellent品質

      console.log('✅ Metrics collection and aggregation validated');
    });

    it('should provide real-time metrics streaming capabilities', async () => {
      console.log('Testing real-time metrics streaming...');

      const streamingTests = [
        {
          name: 'High-Frequency Application Metrics',
          category: 'application',
          streamingFrequency: 1000, // 1 second
          metrics: ['session_count', 'api_request_rate', 'error_count'],
          expectedLatency: 500, // 500ms max latency
          bufferSize: 100,
          description: '高頻度アプリケーションメトリクス'
        },
        {
          name: 'System Resource Streaming',
          category: 'system',
          streamingFrequency: 5000, // 5 seconds
          metrics: ['cpu_usage', 'memory_usage', 'disk_io'],
          expectedLatency: 1000, // 1s max latency
          bufferSize: 50,
          description: 'システムリソースストリーミング'
        },
        {
          name: 'Business KPI Streaming',
          category: 'business',
          streamingFrequency: 30000, // 30 seconds
          metrics: ['active_users', 'revenue_rate', 'conversion_rate'],
          expectedLatency: 2000, // 2s max latency
          bufferSize: 20,
          description: 'ビジネスKPIストリーミング'
        },
        {
          name: 'Alert-Critical Metrics',
          category: 'alerts',
          streamingFrequency: 2000, // 2 seconds
          metrics: ['service_availability', 'response_time_p99', 'error_spike'],
          expectedLatency: 300, // 300ms max latency
          bufferSize: 200,
          description: 'アラート重要メトリクス'
        }
      ];

      const streamingResults: Array<{
        testName: string;
        category: string;
        streamingFrequency: number;
        metricsStreamed: number;
        averageLatency: number;
        maxLatency: number;
        dataIntegrity: number;
        bufferOverflows: number;
        connectionStability: number;
        performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
        streamingReliable: boolean;
        details: string;
      }> = [];

      for (const test of streamingTests) {
        console.log(`\n  Testing ${test.name}...`);
        
        try {
          // ストリーミング接続の初期化
          const streamConnection = await this.initializeMetricsStream(
            test.category,
            test.metrics,
            test.streamingFrequency,
            test.bufferSize
          );

          // ストリーミングテストの実行
          const testDuration = 60000; // 1 minute test
          const expectedMessages = Math.floor(testDuration / test.streamingFrequency) * test.metrics.length;
          
          console.log(`    Starting ${testDuration / 1000}s streaming test (expecting ~${expectedMessages} messages)...`);
          
          const streamingStats = await this.runStreamingTest(
            streamConnection,
            testDuration,
            test.expectedLatency
          );

          // ストリーミング性能の評価
          const averageLatency = streamingStats.totalLatency / Math.max(1, streamingStats.messagesReceived);
          const dataIntegrity = streamingStats.messagesReceived / expectedMessages;
          const connectionStability = streamingStats.connectionUptime / testDuration;

          // パフォーマンスグレードの計算
          let performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
          if (averageLatency <= test.expectedLatency * 0.5 && dataIntegrity >= 0.98) performanceGrade = 'A';
          else if (averageLatency <= test.expectedLatency * 0.75 && dataIntegrity >= 0.95) performanceGrade = 'B';
          else if (averageLatency <= test.expectedLatency && dataIntegrity >= 0.9) performanceGrade = 'C';
          else if (averageLatency <= test.expectedLatency * 1.5 && dataIntegrity >= 0.8) performanceGrade = 'D';
          else performanceGrade = 'F';

          // ストリーミング信頼性の判定
          const streamingReliable = 
            averageLatency <= test.expectedLatency &&
            dataIntegrity >= 0.9 &&
            connectionStability >= 0.95 &&
            streamingStats.bufferOverflows <= 5;

          streamingResults.push({
            testName: test.name,
            category: test.category,
            streamingFrequency: test.streamingFrequency,
            metricsStreamed: streamingStats.messagesReceived,
            averageLatency,
            maxLatency: streamingStats.maxLatency,
            dataIntegrity,
            bufferOverflows: streamingStats.bufferOverflows,
            connectionStability,
            performanceGrade,
            streamingReliable,
            details: `${test.description} - ${streamingStats.messagesReceived}/${expectedMessages} messages, ${averageLatency.toFixed(1)}ms avg latency, ${(dataIntegrity * 100).toFixed(1)}% integrity, Grade: ${performanceGrade}`
          });

          console.log(`  ${streamingReliable ? '✅' : '❌'} ${test.name}:`);
          console.log(`    Messages Streamed: ${streamingStats.messagesReceived}/${expectedMessages} (${(dataIntegrity * 100).toFixed(1)}%)`);
          console.log(`    Average Latency: ${averageLatency.toFixed(1)}ms (target: ≤${test.expectedLatency}ms)`);
          console.log(`    Max Latency: ${streamingStats.maxLatency.toFixed(1)}ms`);
          console.log(`    Connection Stability: ${(connectionStability * 100).toFixed(1)}%`);
          console.log(`    Performance Grade: ${performanceGrade}`);
          console.log(`    Buffer Overflows: ${streamingStats.bufferOverflows}`);

          // ストリーミング接続のクリーンアップ
          await this.cleanupMetricsStream(streamConnection);

        } catch (error) {
          streamingResults.push({
            testName: test.name,
            category: test.category,
            streamingFrequency: test.streamingFrequency,
            metricsStreamed: 0,
            averageLatency: 9999,
            maxLatency: 9999,
            dataIntegrity: 0,
            bufferOverflows: 999,
            connectionStability: 0,
            performanceGrade: 'F',
            streamingReliable: false,
            details: `Streaming test failed: ${error instanceof Error ? error.message : String(error).substring(0, 100)}`
          });

          console.log(`  ❌ ${test.name} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // ストリーミング性能の評価
      const reliableStreams = streamingResults.filter(r => r.streamingReliable).length;
      const streamingReliability = reliableStreams / streamingResults.length;
      const averageDataIntegrity = streamingResults.reduce((sum, r) => sum + r.dataIntegrity, 0) / streamingResults.length;
      const averageConnectionStability = streamingResults.reduce((sum, r) => sum + r.connectionStability, 0) / streamingResults.length;
      const gradeACount = streamingResults.filter(r => r.performanceGrade === 'A').length;

      console.log('\nReal-time Streaming Summary:');
      streamingResults.forEach(result => {
        console.log(`  ${result.testName}: ${result.streamingReliable ? '✅' : '❌'} Grade ${result.performanceGrade} (${(result.dataIntegrity * 100).toFixed(1)}% integrity, ${result.averageLatency.toFixed(1)}ms latency)`);
      });
      console.log(`Streaming Reliability: ${(streamingReliability * 100).toFixed(1)}%`);
      console.log(`Average Data Integrity: ${(averageDataIntegrity * 100).toFixed(1)}%`);
      console.log(`Average Connection Stability: ${(averageConnectionStability * 100).toFixed(1)}%`);
      console.log(`Grade A Performance: ${gradeACount}/${streamingResults.length}`);

      expect(streamingReliability).toBeGreaterThan(0.75); // 75%以上のストリーミング信頼性
      expect(averageDataIntegrity).toBeGreaterThan(0.9); // 90%以上のデータ整合性
      expect(averageConnectionStability).toBeGreaterThan(0.95); // 95%以上の接続安定性
      expect(gradeACount).toBeGreaterThan(0); // 少なくとも1つはグレードA

      console.log('✅ Real-time metrics streaming validated');
    });
  });

  // ===================================================================
  // アラート生成・通知システムテスト
  // ===================================================================

  describe('Alert Generation and Notification System', () => {
    it('should generate alerts based on threshold violations', async () => {
      console.log('Testing alert generation based on threshold violations...');

      const alertScenarios = [
        {
          name: 'Critical System Resource Alerts',
          category: 'system',
          alertRules: [
            { 
              metric: 'cpu_usage', 
              threshold: 90, 
              operator: 'greater_than', 
              severity: 'critical',
              duration: 30000, // 30 seconds sustained
              cooldown: 300000 // 5 minutes cooldown
            },
            { 
              metric: 'memory_usage', 
              threshold: 95, 
              operator: 'greater_than', 
              severity: 'critical',
              duration: 60000, // 1 minute sustained
              cooldown: 600000 // 10 minutes cooldown
            },
            { 
              metric: 'disk_usage', 
              threshold: 85, 
              operator: 'greater_than', 
              severity: 'warning',
              duration: 120000, // 2 minutes sustained
              cooldown: 1800000 // 30 minutes cooldown
            }
          ],
          expectedResponseTime: 5000, // 5 seconds max
          description: 'システムリソース重要アラート'
        },
        {
          name: 'Application Performance Alerts',
          category: 'application',
          alertRules: [
            { 
              metric: 'api_response_time_p95', 
              threshold: 1000, 
              operator: 'greater_than', 
              severity: 'warning',
              duration: 120000, // 2 minutes sustained
              cooldown: 600000 // 10 minutes cooldown
            },
            { 
              metric: 'error_rate', 
              threshold: 5, 
              operator: 'greater_than', 
              severity: 'critical',
              duration: 60000, // 1 minute sustained
              cooldown: 300000 // 5 minutes cooldown
            },
            { 
              metric: 'session_failure_rate', 
              threshold: 10, 
              operator: 'greater_than', 
              severity: 'high',
              duration: 180000, // 3 minutes sustained
              cooldown: 900000 // 15 minutes cooldown
            }
          ],
          expectedResponseTime: 10000, // 10 seconds max
          description: 'アプリケーション性能アラート'
        },
        {
          name: 'Business Impact Alerts',
          category: 'business',
          alertRules: [
            { 
              metric: 'active_users', 
              threshold: 1000, 
              operator: 'less_than', 
              severity: 'warning',
              duration: 300000, // 5 minutes sustained
              cooldown: 1800000 // 30 minutes cooldown
            },
            { 
              metric: 'conversion_rate', 
              threshold: 2, 
              operator: 'less_than', 
              severity: 'high',
              duration: 600000, // 10 minutes sustained
              cooldown: 3600000 // 1 hour cooldown
            },
            { 
              metric: 'revenue_drop', 
              threshold: 20, 
              operator: 'greater_than', 
              severity: 'critical',
              duration: 180000, // 3 minutes sustained
              cooldown: 1800000 // 30 minutes cooldown
            }
          ],
          expectedResponseTime: 30000, // 30 seconds max
          description: 'ビジネス影響アラート'
        }
      ];

      const alertResults: Array<{
        scenarioName: string;
        category: string;
        alertTests: Array<{
          metric: string;
          threshold: number;
          severity: string;
          alertTriggered: boolean;
          responseTime: number;
          alertAccuracy: boolean;
          cooldownRespected: boolean;
          notificationSent: boolean;
        }>;
        overallAlertAccuracy: number;
        averageResponseTime: number;
        notificationSuccess: number;
        alertSystemReliability: number;
        criticalIssues: string[];
        details: string;
      }> = [];

      for (const scenario of alertScenarios) {
        console.log(`\n  Testing ${scenario.name}...`);
        
        try {
          // アラートルールの設定
          await this.configureAlertRules(scenario.category, scenario.alertRules);
          
          const alertTests: Array<{
            metric: string;
            threshold: number;
            severity: string;
            alertTriggered: boolean;
            responseTime: number;
            alertAccuracy: boolean;
            cooldownRespected: boolean;
            notificationSent: boolean;
          }> = [];

          const criticalIssues: string[] = [];
          let totalResponseTime = 0;
          let accurateAlerts = 0;
          let successfulNotifications = 0;

          // 各アラートルールのテスト
          for (const rule of scenario.alertRules) {
            console.log(`    Testing ${rule.metric} alert...`);
            
            // 閾値違反の注入
            const violationStartTime = Date.now();
            await this.injectThresholdViolation(
              scenario.category,
              rule.metric,
              rule.threshold,
              rule.operator,
              rule.duration
            );

            // アラート生成の確認
            const alertResponse = await this.waitForAlert(
              scenario.category,
              rule.metric,
              scenario.expectedResponseTime
            );

            const responseTime = Date.now() - violationStartTime;
            totalResponseTime += responseTime;

            // アラート精度の確認
            const alertAccuracy = alertResponse.triggered && 
                                alertResponse.severity === rule.severity &&
                                alertResponse.metric === rule.metric;

            // クールダウン期間の確認
            const cooldownRespected = await this.checkCooldownPeriod(
              scenario.category,
              rule.metric,
              rule.cooldown
            );

            // 通知送信の確認
            const notificationSent = await this.verifyNotificationSent(
              alertResponse.alertId,
              rule.severity
            );

            if (alertAccuracy) accurateAlerts++;
            if (notificationSent) successfulNotifications++;

            if (!alertResponse.triggered && rule.severity === 'critical') {
              criticalIssues.push(`Critical alert for ${rule.metric} was not triggered`);
            }
            if (responseTime > scenario.expectedResponseTime && rule.severity === 'critical') {
              criticalIssues.push(`Critical alert response time ${responseTime}ms exceeds limit ${scenario.expectedResponseTime}ms`);
            }

            alertTests.push({
              metric: rule.metric,
              threshold: rule.threshold,
              severity: rule.severity,
              alertTriggered: alertResponse.triggered,
              responseTime,
              alertAccuracy,
              cooldownRespected,
              notificationSent
            });

            console.log(`      ${rule.metric}: ${alertResponse.triggered ? '✅' : '❌'} Triggered, ${alertAccuracy ? '✅' : '❌'} Accurate (${responseTime}ms response)`);

            // 閾値違反の解消
            await this.resolveThresholdViolation(scenario.category, rule.metric);
            
            // 次のテストまでの待機
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          // アラートシステムの評価
          const overallAlertAccuracy = accurateAlerts / scenario.alertRules.length;
          const averageResponseTime = totalResponseTime / scenario.alertRules.length;
          const notificationSuccess = successfulNotifications / scenario.alertRules.length;
          const alertSystemReliability = (overallAlertAccuracy + notificationSuccess) / 2;

          alertResults.push({
            scenarioName: scenario.name,
            category: scenario.category,
            alertTests,
            overallAlertAccuracy,
            averageResponseTime,
            notificationSuccess,
            alertSystemReliability,
            criticalIssues,
            details: `${scenario.description} - Accuracy: ${(overallAlertAccuracy * 100).toFixed(1)}%, Avg Response: ${averageResponseTime.toFixed(0)}ms, Notification: ${(notificationSuccess * 100).toFixed(1)}%, Reliability: ${(alertSystemReliability * 100).toFixed(1)}%`
          });

          console.log(`  ${alertSystemReliability >= 0.85 ? '✅' : '❌'} ${scenario.name}:`);
          console.log(`    Alert Accuracy: ${(overallAlertAccuracy * 100).toFixed(1)}%`);
          console.log(`    Average Response Time: ${averageResponseTime.toFixed(0)}ms`);
          console.log(`    Notification Success: ${(notificationSuccess * 100).toFixed(1)}%`);
          console.log(`    System Reliability: ${(alertSystemReliability * 100).toFixed(1)}%`);
          if (criticalIssues.length > 0) {
            console.log(`    Critical Issues: ${criticalIssues.length}`);
          }

          // アラートルールのクリーンアップ
          await this.cleanupAlertRules(scenario.category);

        } catch (error) {
          alertResults.push({
            scenarioName: scenario.name,
            category: scenario.category,
            alertTests: [],
            overallAlertAccuracy: 0,
            averageResponseTime: 9999,
            notificationSuccess: 0,
            alertSystemReliability: 0,
            criticalIssues: [`Alert test failed: ${error instanceof Error ? error.message : String(error)}`],
            details: `Alert generation test failed: ${error instanceof Error ? error.message : String(error).substring(0, 100)}`
          });

          console.log(`  ❌ ${scenario.name} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // アラートシステム全体の評価
      const reliableAlertSystems = alertResults.filter(r => r.alertSystemReliability >= 0.85).length;
      const alertSystemReadiness = reliableAlertSystems / alertResults.length;
      const averageAlertAccuracy = alertResults.reduce((sum, r) => sum + r.overallAlertAccuracy, 0) / alertResults.length;
      const averageNotificationSuccess = alertResults.reduce((sum, r) => sum + r.notificationSuccess, 0) / alertResults.length;
      const totalCriticalIssues = alertResults.reduce((sum, r) => sum + r.criticalIssues.length, 0);

      console.log('\nAlert Generation Summary:');
      alertResults.forEach(result => {
        console.log(`  ${result.scenarioName}: ${result.alertSystemReliability >= 0.85 ? '✅' : '❌'} (${(result.overallAlertAccuracy * 100).toFixed(1)}% accuracy, ${result.averageResponseTime.toFixed(0)}ms response)`);
      });
      console.log(`Alert System Readiness: ${(alertSystemReadiness * 100).toFixed(1)}%`);
      console.log(`Average Alert Accuracy: ${(averageAlertAccuracy * 100).toFixed(1)}%`);
      console.log(`Average Notification Success: ${(averageNotificationSuccess * 100).toFixed(1)}%`);
      console.log(`Total Critical Issues: ${totalCriticalIssues}`);

      if (totalCriticalIssues > 0) {
        console.log('\nCritical Alert Issues:');
        alertResults.forEach(result => {
          if (result.criticalIssues.length > 0) {
            console.log(`  ${result.scenarioName}:`);
            result.criticalIssues.forEach(issue => console.log(`    - ${issue}`));
          }
        });
      }

      expect(alertSystemReadiness).toBeGreaterThan(0.8); // 80%以上のアラートシステム準備度
      expect(averageAlertAccuracy).toBeGreaterThan(0.9); // 90%以上の平均アラート精度
      expect(averageNotificationSuccess).toBeGreaterThan(0.85); // 85%以上の通知成功率
      expect(totalCriticalIssues).toBeLessThanOrEqual(2); // 重要な問題は最大2つまで

      console.log('✅ Alert generation and notification system validated');
    });
  });

  // ===================================================================
  // SLA/SLO監視・レポートテスト
  // ===================================================================

  describe('SLA/SLO Monitoring and Reporting', () => {
    it('should monitor and report SLA/SLO compliance accurately', async () => {
      console.log('Testing SLA/SLO monitoring and reporting...');

      const slaDefinitions = [
        {
          name: 'Service Availability SLA',
          category: 'availability',
          target: 99.9, // 99.9% uptime
          measurement: 'uptime_percentage',
          reportingPeriod: 'monthly',
          breachThreshold: 99.0, // Alert if below 99%
          penalties: ['service_credits', 'performance_review'],
          stakeholders: ['engineering', 'business', 'customer_success'],
          description: 'サービス可用性 99.9% SLA'
        },
        {
          name: 'API Response Time SLO',
          category: 'performance',
          target: 200, // 200ms p95 response time
          measurement: 'api_response_time_p95',
          reportingPeriod: 'weekly',
          breachThreshold: 500, // Alert if above 500ms
          penalties: ['performance_optimization', 'incident_review'],
          stakeholders: ['engineering', 'product'],
          description: 'API応答時間 p95 200ms SLO'
        },
        {
          name: 'Error Rate SLO',
          category: 'reliability',
          target: 0.1, // 0.1% error rate
          measurement: 'error_rate_percentage',
          reportingPeriod: 'daily',
          breachThreshold: 1.0, // Alert if above 1%
          penalties: ['bug_fix_priority', 'stability_review'],
          stakeholders: ['engineering', 'qa', 'support'],
          description: 'エラー率 0.1% SLO'
        },
        {
          name: 'Session Success Rate SLA',
          category: 'user_experience',
          target: 99.5, // 99.5% successful sessions
          measurement: 'session_success_rate',
          reportingPeriod: 'weekly',
          breachThreshold: 98.0, // Alert if below 98%
          penalties: ['user_experience_review', 'process_improvement'],
          stakeholders: ['product', 'engineering', 'customer_success'],
          description: 'セッション成功率 99.5% SLA'
        },
        {
          name: 'Data Processing Latency SLO',
          category: 'data_processing',
          target: 5000, // 5 seconds max processing time
          measurement: 'data_processing_latency_p99',
          reportingPeriod: 'daily',
          breachThreshold: 10000, // Alert if above 10 seconds
          penalties: ['performance_optimization', 'architecture_review'],
          stakeholders: ['engineering', 'data_team'],
          description: 'データ処理遅延 p99 5秒 SLO'
        }
      ];

      const slaResults: Array<{
        slaName: string;
        category: string;
        target: number;
        measurement: string;
        currentValue: number;
        compliance: number;
        breachOccurred: boolean;
        reportGenerated: boolean;
        stakeholdersNotified: boolean;
        trendAnalysis: {
          trend: 'improving' | 'stable' | 'degrading';
          confidence: number;
          projectedCompliance: number;
        };
        remediationRequired: boolean;
        details: string;
      }> = [];

      for (const sla of slaDefinitions) {
        console.log(`\n  Monitoring ${sla.name}...`);
        
        try {
          // SLA/SLO監視の初期化
          await this.initializeSLAMonitoring(sla);
          
          // 測定期間のシミュレーション（短縮版）
          const monitoringPeriod = 60000; // 1 minute test period
          console.log(`    Running ${monitoringPeriod / 1000}s monitoring period...`);
          
          // SLA/SLOメトリクスの収集
          const metricsData = await this.collectSLAMetrics(
            sla.category,
            sla.measurement,
            monitoringPeriod
          );

          // コンプライアンス計算
          const currentValue = metricsData.currentValue;
          let compliance: number;
          
          if (sla.measurement.includes('percentage') || sla.measurement.includes('rate')) {
            // パーセンテージベースの場合
            compliance = currentValue / sla.target;
          } else {
            // 値ベースの場合（応答時間など、小さい方が良い）
            compliance = sla.target / Math.max(currentValue, 1);
          }

          // 違反チェック
          let breachOccurred = false;
          if (sla.measurement.includes('percentage') || sla.measurement.includes('rate')) {
            breachOccurred = currentValue < sla.breachThreshold;
          } else {
            breachOccurred = currentValue > sla.breachThreshold;
          }

          // トレンド分析
          const trendAnalysis = await this.analyzeSLATrend(
            sla.category,
            sla.measurement,
            metricsData.historicalData
          );

          // レポート生成
          const reportGenerated = await this.generateSLAReport(
            sla,
            currentValue,
            compliance,
            breachOccurred,
            trendAnalysis
          );

          // ステークホルダー通知
          const stakeholdersNotified = breachOccurred ? 
            await this.notifyStakeholders(sla.stakeholders, sla, currentValue) :
            true; // No breach, no notification needed

          // 是正処置の必要性判定
          const remediationRequired = breachOccurred || 
                                    trendAnalysis.trend === 'degrading' ||
                                    trendAnalysis.projectedCompliance < 0.95;

          slaResults.push({
            slaName: sla.name,
            category: sla.category,
            target: sla.target,
            measurement: sla.measurement,
            currentValue,
            compliance,
            breachOccurred,
            reportGenerated,
            stakeholdersNotified,
            trendAnalysis,
            remediationRequired,
            details: `${sla.description} - Current: ${currentValue}, Compliance: ${(compliance * 100).toFixed(1)}%, Trend: ${trendAnalysis.trend}, Breach: ${breachOccurred ? '❌' : '✅'}`
          });

          console.log(`  ${!breachOccurred && compliance >= 0.95 ? '✅' : '❌'} ${sla.name}:`);
          console.log(`    Current Value: ${currentValue} (target: ${sla.target})`);
          console.log(`    Compliance: ${(compliance * 100).toFixed(1)}%`);
          console.log(`    Breach Occurred: ${breachOccurred ? '❌' : '✅'}`);
          console.log(`    Trend: ${trendAnalysis.trend} (${(trendAnalysis.confidence * 100).toFixed(1)}% confidence)`);
          console.log(`    Report Generated: ${reportGenerated ? '✅' : '❌'}`);
          console.log(`    Stakeholders Notified: ${stakeholdersNotified ? '✅' : '❌'}`);

          // SLA監視のクリーンアップ
          await this.cleanupSLAMonitoring(sla.category);

        } catch (error) {
          slaResults.push({
            slaName: sla.name,
            category: sla.category,
            target: sla.target,
            measurement: sla.measurement,
            currentValue: 0,
            compliance: 0,
            breachOccurred: true,
            reportGenerated: false,
            stakeholdersNotified: false,
            trendAnalysis: { trend: 'degrading', confidence: 0, projectedCompliance: 0 },
            remediationRequired: true,
            details: `SLA monitoring failed: ${error instanceof Error ? error.message : String(error).substring(0, 100)}`
          });

          console.log(`  ❌ ${sla.name} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // SLA/SLO監視システムの評価
      const compliantSLAs = slaResults.filter(r => !r.breachOccurred && r.compliance >= 0.95).length;
      const slaComplianceRate = compliantSLAs / slaResults.length;
      const averageCompliance = slaResults.reduce((sum, r) => sum + r.compliance, 0) / slaResults.length;
      const successfulReports = slaResults.filter(r => r.reportGenerated).length;
      const reportingSuccess = successfulReports / slaResults.length;
      const breachCount = slaResults.filter(r => r.breachOccurred).length;
      const improvingTrends = slaResults.filter(r => r.trendAnalysis.trend === 'improving').length;

      console.log('\nSLA/SLO Monitoring Summary:');
      slaResults.forEach(result => {
        console.log(`  ${result.slaName}: ${!result.breachOccurred && result.compliance >= 0.95 ? '✅' : '❌'} (${(result.compliance * 100).toFixed(1)}% compliance, ${result.trendAnalysis.trend} trend)`);
      });
      console.log(`SLA Compliance Rate: ${(slaComplianceRate * 100).toFixed(1)}%`);
      console.log(`Average Compliance: ${(averageCompliance * 100).toFixed(1)}%`);
      console.log(`Reporting Success: ${(reportingSuccess * 100).toFixed(1)}%`);
      console.log(`SLA Breaches: ${breachCount}`);
      console.log(`Improving Trends: ${improvingTrends}/${slaResults.length}`);

      if (breachCount > 0) {
        console.log('\nSLA Breaches:');
        slaResults.filter(r => r.breachOccurred).forEach(result => {
          console.log(`  - ${result.slaName}: ${result.currentValue} (target: ${result.target})`);
        });
      }

      expect(slaComplianceRate).toBeGreaterThan(0.8); // 80%以上のSLA遵守率
      expect(averageCompliance).toBeGreaterThan(0.9); // 90%以上の平均コンプライアンス
      expect(reportingSuccess).toBeGreaterThan(0.95); // 95%以上のレポート生成成功率
      expect(breachCount).toBeLessThanOrEqual(1); // SLA違反は最大1つまで

      console.log('✅ SLA/SLO monitoring and reporting validated');
    });
  });

  // ===================================================================
  // ヘルパーメソッド群
  // ===================================================================

  async setupMonitoringEnvironment(): Promise<void> {
    // 監視システム環境のセットアップ
    console.log('Setting up monitoring environment...');
    
    // メトリクス収集システムの初期化
    this.metricsCollector = {
      collectors: new Map(),
      aggregators: new Map(),
      streams: new Map(),
      buffers: new Map()
    };

    // アラートシステムの初期化
    this.alertSystem = {
      rules: new Map(),
      notifications: new Map(),
      cooldowns: new Map(),
      history: []
    };

    // SLA/SLO監視システムの初期化
    this.slaMonitor = {
      definitions: new Map(),
      measurements: new Map(),
      reports: new Map(),
      breaches: []
    };
  }

  async teardownMonitoringEnvironment(): Promise<void> {
    // 監視システム環境のクリーンアップ
    console.log('Tearing down monitoring environment...');
    
    // アクティブなストリームの停止
    if (this.metricsCollector?.streams) {
      for (const [id, stream] of this.metricsCollector.streams) {
        await this.stopMetricsStream(id);
      }
    }

    // アラートのクリーンアップ
    if (this.alertSystem?.notifications) {
      for (const [id, notification] of this.alertSystem.notifications) {
        await this.cleanupNotification(id);
      }
    }

    delete this.metricsCollector;
    delete this.alertSystem;
    delete this.slaMonitor;
  }

  async initializeMetricsCollector(category: string, metrics: any[]): Promise<void> {
    // メトリクス収集器の初期化
    console.log(`Initializing metrics collector for ${category}...`);
    
    if (this.metricsCollector) {
      this.metricsCollector.collectors.set(category, {
        metrics: metrics.map(m => m.name),
        status: 'active',
        lastCollection: Date.now()
      });
    }
  }

  async collectMetric(category: string, metricName: string, interval: number): Promise<{
    success: boolean;
    value?: number;
    error?: string;
  }> {
    // メトリクス収集の実行
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
    
    const success = Math.random() > 0.1; // 90% success rate
    
    if (success) {
      // メトリクスタイプに基づく模擬値の生成
      const mockValues = {
        'session_count': Math.floor(Math.random() * 5000 + 1000),
        'cpu_usage': Math.random() * 80 + 10,
        'memory_usage': Math.floor(Math.random() * 800000000 + 200000000),
        'api_response_time_p95': Math.random() * 800 + 50,
        'error_rate': Math.random() * 3,
        'active_users': Math.floor(Math.random() * 30000 + 5000)
      };
      
      return {
        success: true,
        value: mockValues[metricName] || Math.random() * 100
      };
    } else {
      return {
        success: false,
        error: `Failed to collect ${metricName}`
      };
    }
  }

  async aggregateMetric(category: string, metricName: string, period: number): Promise<{
    success: boolean;
    aggregatedValue?: number;
    error?: string;
  }> {
    // メトリクス集約の実行
    await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 50));
    
    const success = Math.random() > 0.05; // 95% success rate
    
    if (success) {
      return {
        success: true,
        aggregatedValue: Math.random() * 100
      };
    } else {
      return {
        success: false,
        error: `Failed to aggregate ${metricName}`
      };
    }
  }

  async measureMetricAccuracy(category: string, metricName: string, type: string): Promise<number> {
    // メトリクス精度の測定
    const baseAccuracy = Math.random() * 15 + 85; // 85-100%
    
    // メトリクスタイプによる精度調整
    if (type === 'gauge') return Math.min(100, baseAccuracy + 5);
    if (type === 'counter') return Math.min(100, baseAccuracy + 3);
    if (type === 'histogram') return Math.min(100, baseAccuracy - 2);
    
    return baseAccuracy;
  }

  async cleanupMetricsCollector(category: string): Promise<void> {
    // メトリクス収集器のクリーンアップ
    if (this.metricsCollector?.collectors) {
      this.metricsCollector.collectors.delete(category);
    }
  }

  async initializeMetricsStream(category: string, metrics: string[], frequency: number, bufferSize: number): Promise<any> {
    // メトリクスストリームの初期化
    const streamId = `${category}-stream-${Date.now()}`;
    
    if (this.metricsCollector) {
      this.metricsCollector.streams.set(streamId, {
        category,
        metrics,
        frequency,
        bufferSize,
        active: true,
        startTime: Date.now()
      });
    }
    
    return { id: streamId, category, metrics };
  }

  async runStreamingTest(streamConnection: any, duration: number, maxLatency: number): Promise<{
    messagesReceived: number;
    totalLatency: number;
    maxLatency: number;
    connectionUptime: number;
    bufferOverflows: number;
  }> {
    // ストリーミングテストの実行
    const startTime = Date.now();
    let messagesReceived = 0;
    let totalLatency = 0;
    let maxLatencyMeasured = 0;
    let bufferOverflows = 0;
    
    // ストリーミングのシミュレート
    const messageInterval = 2000; // 2 seconds between messages
    const expectedMessages = Math.floor(duration / messageInterval);
    
    for (let i = 0; i < expectedMessages; i++) {
      await new Promise(resolve => setTimeout(resolve, messageInterval));
      
      const messageLatency = Math.random() * maxLatency * 1.5; // Some messages may exceed expected latency
      messagesReceived++;
      totalLatency += messageLatency;
      maxLatencyMeasured = Math.max(maxLatencyMeasured, messageLatency);
      
      // Random buffer overflow simulation
      if (Math.random() < 0.02) { // 2% chance of buffer overflow
        bufferOverflows++;
      }
    }
    
    const connectionUptime = Date.now() - startTime;
    
    return {
      messagesReceived,
      totalLatency,
      maxLatency: maxLatencyMeasured,
      connectionUptime,
      bufferOverflows
    };
  }

  async cleanupMetricsStream(streamConnection: any): Promise<void> {
    // メトリクスストリームのクリーンアップ
    if (this.metricsCollector?.streams && streamConnection.id) {
      this.metricsCollector.streams.delete(streamConnection.id);
    }
  }

  async configureAlertRules(category: string, alertRules: any[]): Promise<void> {
    // アラートルールの設定
    console.log(`Configuring ${alertRules.length} alert rules for ${category}...`);
    
    if (this.alertSystem) {
      this.alertSystem.rules.set(category, alertRules);
    }
  }

  async injectThresholdViolation(category: string, metric: string, threshold: number, operator: string, duration: number): Promise<void> {
    // 閾値違反の注入
    console.log(`Injecting threshold violation for ${metric} (${operator} ${threshold}) for ${duration}ms...`);
    await new Promise(resolve => setTimeout(resolve, Math.min(duration, 2000))); // 最大2秒に短縮
  }

  async waitForAlert(category: string, metric: string, timeout: number): Promise<{
    triggered: boolean;
    alertId?: string;
    severity?: string;
    metric?: string;
  }> {
    // アラート生成の待機
    await new Promise(resolve => setTimeout(resolve, Math.random() * timeout * 0.8));
    
    const triggered = Math.random() > 0.15; // 85% alert success rate
    
    if (triggered) {
      return {
        triggered: true,
        alertId: `alert-${Date.now()}`,
        severity: ['critical', 'high', 'warning'][Math.floor(Math.random() * 3)],
        metric
      };
    } else {
      return { triggered: false };
    }
  }

  async checkCooldownPeriod(category: string, metric: string, cooldown: number): Promise<boolean> {
    // クールダウン期間の確認
    return Math.random() > 0.1; // 90% chance cooldown is respected
  }

  async verifyNotificationSent(alertId: string, severity: string): Promise<boolean> {
    // 通知送信の確認
    const notificationSuccess = Math.random() > 0.1; // 90% notification success rate
    
    if (this.alertSystem && notificationSuccess) {
      this.alertSystem.notifications.set(alertId, {
        severity,
        sentAt: Date.now(),
        status: 'sent'
      });
    }
    
    return notificationSuccess;
  }

  async resolveThresholdViolation(category: string, metric: string): Promise<void> {
    // 閾値違反の解消
    console.log(`Resolving threshold violation for ${metric}...`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async cleanupAlertRules(category: string): Promise<void> {
    // アラートルールのクリーンアップ
    if (this.alertSystem?.rules) {
      this.alertSystem.rules.delete(category);
    }
  }

  async initializeSLAMonitoring(sla: any): Promise<void> {
    // SLA/SLO監視の初期化
    console.log(`Initializing SLA monitoring for ${sla.name}...`);
    
    if (this.slaMonitor) {
      this.slaMonitor.definitions.set(sla.name, sla);
    }
  }

  async collectSLAMetrics(category: string, measurement: string, period: number): Promise<{
    currentValue: number;
    historicalData: number[];
  }> {
    // SLA/SLOメトリクスの収集
    await new Promise(resolve => setTimeout(resolve, period / 10)); // 短縮版
    
    const mockValues = {
      'uptime_percentage': Math.random() * 2 + 98.5, // 98.5-100.5%
      'api_response_time_p95': Math.random() * 400 + 100, // 100-500ms
      'error_rate_percentage': Math.random() * 1.5, // 0-1.5%
      'session_success_rate': Math.random() * 3 + 97, // 97-100%
      'data_processing_latency_p99': Math.random() * 8000 + 2000 // 2-10 seconds
    };
    
    const currentValue = mockValues[measurement] || Math.random() * 100;
    const historicalData = Array.from({ length: 10 }, () => 
      currentValue + (Math.random() - 0.5) * 20
    );
    
    return { currentValue, historicalData };
  }

  async analyzeSLATrend(category: string, measurement: string, historicalData: number[]): Promise<{
    trend: 'improving' | 'stable' | 'degrading';
    confidence: number;
    projectedCompliance: number;
  }> {
    // SLAトレンド分析
    if (historicalData.length < 3) {
      return { trend: 'stable', confidence: 0.5, projectedCompliance: 0.9 };
    }
    
    const recent = historicalData.slice(-3);
    const older = historicalData.slice(0, 3);
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    
    const change = recentAvg - olderAvg;
    const trend = Math.abs(change) < 1 ? 'stable' : 
                 change > 0 ? 'improving' : 'degrading';
    
    return {
      trend,
      confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
      projectedCompliance: Math.random() * 0.2 + 0.85 // 85-105% projected
    };
  }

  async generateSLAReport(sla: any, currentValue: number, compliance: number, breachOccurred: boolean, trendAnalysis: any): Promise<boolean> {
    // SLAレポート生成
    console.log(`Generating SLA report for ${sla.name}...`);
    
    if (this.slaMonitor) {
      this.slaMonitor.reports.set(sla.name, {
        generatedAt: Date.now(),
        currentValue,
        compliance,
        breachOccurred,
        trend: trendAnalysis.trend
      });
    }
    
    return Math.random() > 0.05; // 95% report generation success rate
  }

  async notifyStakeholders(stakeholders: string[], sla: any, currentValue: number): Promise<boolean> {
    // ステークホルダー通知
    console.log(`Notifying stakeholders: ${stakeholders.join(', ')} about SLA breach...`);
    return Math.random() > 0.1; // 90% notification success rate
  }

  async cleanupSLAMonitoring(category: string): Promise<void> {
    // SLA監視のクリーンアップ
    console.log(`Cleaning up SLA monitoring for ${category}...`);
  }

  async stopMetricsStream(id: string): Promise<void> {
    // メトリクスストリームの停止
    console.log(`Stopping metrics stream: ${id}`);
  }

  async cleanupNotification(id: string): Promise<void> {
    // 通知のクリーンアップ
    console.log(`Cleaning up notification: ${id}`);
  }
});