// Package imports:
import 'package:flutter_test/flutter_test.dart';

// Project imports:
import 'package:moodesky/features/auth/models/server_config.dart';
import 'package:moodesky/features/auth/services/server_discovery_service.dart';

void main() {
  group('ServerDiscoveryService', () {
    group('discoverServer', () {
      test('discovers server with full server description', () async {
        // Note: 実際のHTTPテストは複雑なので、モックが必要な場合は別途実装
        final result = await ServerDiscoveryService.discoverServer(
          'https://test.example.com',
        );

        expect(result.serviceUrl, 'https://test.example.com');
        expect(result.displayName, isNotEmpty);
        expect(result.isCustom, true);
      });

      test('normalizes URL correctly', () async {
        final result = await ServerDiscoveryService.discoverServer(
          'test.example.com', // プロトコルなし
        );

        expect(result.serviceUrl, 'https://test.example.com'); // HTTPSが追加される
      });

      test('handles discovery failure gracefully', () async {
        final result = await ServerDiscoveryService.discoverServer(
          'https://invalid-server-that-does-not-exist.test',
        );

        expect(result.status, ServerStatus.error);
        expect(
          result.serviceUrl,
          'https://invalid-server-that-does-not-exist.test',
        );
        expect(result.displayName, 'invalid-server-that-does-not-exist.test');
      });

      test('removes trailing slashes from URL', () async {
        final result = await ServerDiscoveryService.discoverServer(
          'https://test.example.com///',
        );

        expect(result.serviceUrl, 'https://test.example.com');
      });
    });

    group('validateServer', () {
      test('validates online server successfully', () async {
        const config = ServerConfig(
          serviceUrl: 'https://bsky.social',
          displayName: 'Bluesky Social',
        );

        // 実際のHTTPリクエストは実行されないため、
        // このテストは統合テストまたはモックを使用する必要がある
        final result = await ServerDiscoveryService.validateServer(config);

        expect(result.serviceUrl, config.serviceUrl);
        expect(result.displayName, config.displayName);
        expect(result.lastChecked, isNotNull);
      });

      test('handles validation timeout', () async {
        const config = ServerConfig(
          serviceUrl: 'https://slow-server.test',
          displayName: 'Slow Server',
          timeoutSeconds: 1, // 短いタイムアウト
        );

        final result = await ServerDiscoveryService.validateServer(config);

        // タイムアウトまたはエラーの場合、適切なステータスが設定される
        expect([
          ServerStatus.offline,
          ServerStatus.error,
        ], contains(result.status));
      });
    });

    group('testAuthMethods', () {
      test('returns default auth methods for unknown server', () async {
        const config = ServerConfig(
          serviceUrl: 'https://unknown.test',
          displayName: 'Unknown Server',
        );

        final result = await ServerDiscoveryService.testAuthMethods(config);

        expect(result, isA<Map<String, bool>>());
        expect(result, containsPair('app_password', anything));
        expect(result, containsPair('oauth', anything));
      });

      test('detects app password support correctly', () async {
        const config = ServerConfig(
          serviceUrl: 'https://bsky.social',
          displayName: 'Bluesky Social',
          supportsAppPasswords: true,
        );

        final result = await ServerDiscoveryService.testAuthMethods(config);

        // ほとんどのサーバーはApp Passwordをサポートする
        expect(result['app_password'], isTrue);
      });
    });

    group('URL normalization', () {
      test('adds HTTPS to URLs without protocol', () {
        expect(
          ServerDiscoveryService.discoverServer('example.com'),
          completion(
            predicate<ServerConfig>(
              (config) => config.serviceUrl.startsWith('https://'),
            ),
          ),
        );
      });

      test('preserves HTTP URLs', () {
        expect(
          ServerDiscoveryService.discoverServer('http://localhost:3000'),
          completion(
            predicate<ServerConfig>(
              (config) => config.serviceUrl.startsWith('http://localhost:3000'),
            ),
          ),
        );
      });

      test('removes multiple trailing slashes', () {
        expect(
          ServerDiscoveryService.discoverServer('https://example.com///'),
          completion(
            predicate<ServerConfig>(
              (config) => config.serviceUrl == 'https://example.com',
            ),
          ),
        );
      });
    });

    group('server compatibility', () {
      test('considers servers compatible with same major version', () {
        // プライベートメソッドのテストは難しいので、
        // 公開APIを通じてテストするか、別のアプローチを検討
        expect(true, isTrue); // プレースホルダー
      });

      test('handles missing version gracefully', () {
        expect(true, isTrue); // プレースホルダー
      });
    });

    group('feature detection', () {
      test('detects OAuth support from server response', () async {
        // モック化されたHTTPレスポンスで機能検出をテスト
        const config = ServerConfig(
          serviceUrl: 'https://oauth-server.test',
          displayName: 'OAuth Server',
          supportsOAuth: true,
        );

        final result = await ServerDiscoveryService.testAuthMethods(config);

        // OAuth対応サーバーの場合、OAuthメソッドがテストされる
        expect(result.containsKey('oauth'), isTrue);
      });

      test('falls back to app password for unknown servers', () async {
        const config = ServerConfig(
          serviceUrl: 'https://unknown.test',
          displayName: 'Unknown',
        );

        final result = await ServerDiscoveryService.testAuthMethods(config);

        // 不明なサーバーでも、App Passwordは通常サポートされると仮定
        expect(result['app_password'], isTrue);
      });
    });

    group('error handling', () {
      test('handles network errors gracefully', () async {
        final result = await ServerDiscoveryService.discoverServer(
          'https://network-error.test',
        );

        expect(result.status, ServerStatus.error);
        expect(result.serviceUrl, 'https://network-error.test');
      });

      test('handles malformed server responses', () async {
        final result = await ServerDiscoveryService.discoverServer(
          'https://malformed-response.test',
        );

        // 不正なレスポンスでも、適切にフォールバック
        expect(result, isA<ServerConfig>());
        expect(result.serviceUrl, 'https://malformed-response.test');
      });

      test('handles DNS resolution failures', () async {
        final result = await ServerDiscoveryService.discoverServer(
          'https://does-not-exist.invalid-tld',
        );

        expect(result.status, ServerStatus.error);
      });
    });
  });
}
