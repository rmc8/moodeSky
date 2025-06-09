// Package imports:
import 'package:flutter_test/flutter_test.dart';

// Project imports:
import 'package:moodesky/features/auth/models/server_config.dart';

void main() {
  group('ServerConfig', () {
    test('creates instance with required parameters', () {
      const config = ServerConfig(
        serviceUrl: 'https://test.example.com',
        displayName: 'Test Server',
      );

      expect(config.serviceUrl, 'https://test.example.com');
      expect(config.displayName, 'Test Server');
      expect(config.supportsOAuth, true); // デフォルト値
      expect(config.supportsAppPasswords, true); // デフォルト値
      expect(config.timeoutSeconds, 30); // デフォルト値
    });

    test('creates instance with all parameters', () {
      const config = ServerConfig(
        serviceUrl: 'https://custom.example.com',
        displayName: 'Custom Server',
        description: 'A custom AT Protocol server',
        supportsOAuth: false,
        supportsAppPasswords: true,
        supportsChat: true,
        timeoutSeconds: 60,
      );

      expect(config.serviceUrl, 'https://custom.example.com');
      expect(config.displayName, 'Custom Server');
      expect(config.description, 'A custom AT Protocol server');
      expect(config.supportsOAuth, false);
      expect(config.supportsAppPasswords, true);
      expect(config.supportsChat, true);
      expect(config.timeoutSeconds, 60);
    });

    test('copyWith works correctly', () {
      const original = ServerConfig(
        serviceUrl: 'https://original.com',
        displayName: 'Original',
      );

      final updated = original.copyWith(
        displayName: 'Updated',
        description: 'Updated description',
      );

      expect(updated.serviceUrl, 'https://original.com'); // 変更されない
      expect(updated.displayName, 'Updated'); // 変更される
      expect(updated.description, 'Updated description'); // 変更される
    });

    test('JSON serialization works', () {
      const config = ServerConfig(
        serviceUrl: 'https://test.com',
        displayName: 'Test',
        description: 'Test server',
        supportsOAuth: true,
        supportsAppPasswords: false,
      );

      final json = config.toJson();
      final fromJson = ServerConfig.fromJson(json);

      expect(fromJson.serviceUrl, config.serviceUrl);
      expect(fromJson.displayName, config.displayName);
      expect(fromJson.description, config.description);
      expect(fromJson.supportsOAuth, config.supportsOAuth);
      expect(fromJson.supportsAppPasswords, config.supportsAppPasswords);
    });
  });

  group('ServerPresets', () {
    test('contains predefined servers', () {
      expect(ServerPresets.predefinedServers, isNotEmpty);
      expect(ServerPresets.predefinedServers.length, greaterThanOrEqualTo(2));
    });

    test('blueskyOfficial has correct properties', () {
      final server = ServerPresets.blueskyOfficial;

      expect(server.serviceUrl, 'https://bsky.social');
      expect(server.displayName, 'Bluesky Social');
      expect(server.isOfficial, true);
      expect(server.supportsOAuth, true);
      expect(server.supportsAppPasswords, true);
    });

    test('blueskyStaging has correct properties', () {
      final server = ServerPresets.blueskyStaging;

      expect(server.serviceUrl, 'https://staging.bsky.dev');
      expect(server.displayName, 'Bluesky Staging');
      expect(server.isOfficial, true);
      expect(server.supportsOAuth, true);
      expect(server.supportsAppPasswords, true);
    });

    test('customServer factory works', () {
      final server = ServerPresets.customServer(
        serviceUrl: 'https://my-server.com',
        displayName: 'My Server',
        description: 'My custom server',
      );

      expect(server.serviceUrl, 'https://my-server.com');
      expect(server.displayName, 'My Server');
      expect(server.description, 'My custom server');
      expect(server.isCustom, true);
      expect(server.isOfficial, false);
      expect(server.supportsOAuth, false); // デフォルトで検出される
      expect(server.supportsAppPasswords, true); // ほとんどのサーバーで対応
    });
  });

  group('ServerConfigExtensions', () {
    test('appPasswordUrl for Bluesky official', () {
      final server = ServerPresets.blueskyOfficial;
      expect(server.appPasswordUrl, 'https://bsky.app/settings/app-passwords');
    });

    test('appPasswordUrl for custom server', () {
      final server = ServerPresets.customServer(
        serviceUrl: 'https://custom.example.com',
        displayName: 'Custom',
      );
      expect(
        server.appPasswordUrl,
        'https://custom.example.com/settings/app-passwords',
      );
    });

    test('oauthAuthUrl for custom server', () {
      final server = ServerPresets.customServer(
        serviceUrl: 'https://custom.example.com',
        displayName: 'Custom',
      );
      expect(server.oauthAuthUrl, 'https://custom.example.com/oauth/authorize');
    });

    test('isHealthy returns correct status', () {
      const onlineServer = ServerConfig(
        serviceUrl: 'https://test.com',
        displayName: 'Test',
        status: ServerStatus.online,
      );
      expect(onlineServer.isHealthy, true);

      const offlineServer = ServerConfig(
        serviceUrl: 'https://test.com',
        displayName: 'Test',
        status: ServerStatus.offline,
      );
      expect(offlineServer.isHealthy, false);
    });

    test('timeout returns correct Duration', () {
      const server = ServerConfig(
        serviceUrl: 'https://test.com',
        displayName: 'Test',
        timeoutSeconds: 45,
      );
      expect(server.timeout, const Duration(seconds: 45));
    });

    test('statusText returns correct strings', () {
      const cases = [
        (ServerStatus.online, 'Online'),
        (ServerStatus.offline, 'Offline'),
        (ServerStatus.error, 'Error'),
        (ServerStatus.checking, 'Checking...'),
        (ServerStatus.unknown, 'Unknown'),
      ];

      for (final (status, expectedText) in cases) {
        final server = ServerConfig(
          serviceUrl: 'https://test.com',
          displayName: 'Test',
          status: status,
        );
        expect(server.statusText, expectedText);
      }
    });
  });

  group('ServerStatus', () {
    test('enum has all expected values', () {
      const statuses = ServerStatus.values;
      expect(statuses, contains(ServerStatus.unknown));
      expect(statuses, contains(ServerStatus.online));
      expect(statuses, contains(ServerStatus.offline));
      expect(statuses, contains(ServerStatus.error));
      expect(statuses, contains(ServerStatus.checking));
    });
  });
}
