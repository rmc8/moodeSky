// Package imports:
import 'dart:convert';
import 'package:http/http.dart' as http;

// Project imports:
import 'package:moodesky/features/auth/models/server_config.dart';

class ServerDiscoveryService {
  static const Duration _defaultTimeout = Duration(seconds: 10);

  /// Discover server capabilities and configuration
  static Future<ServerConfig> discoverServer(
    String serviceUrl, {
    Duration? timeout,
  }) async {
    timeout ??= _defaultTimeout;

    try {
      // Normalize URL
      final normalizedUrl = _normalizeUrl(serviceUrl);

      // Try to fetch server description
      final serverInfo = await _fetchServerDescription(normalizedUrl, timeout);

      return ServerConfig(
        serviceUrl: normalizedUrl,
        displayName: serverInfo['name'] ?? _extractHostname(normalizedUrl),
        description: serverInfo['description'],
        icon: serverInfo['icon'],
        contactEmail: serverInfo['contact']?['email'],
        protocolVersion: serverInfo['version'] ?? '0.4.0',
        supportedMethods: _parseSupportedMethods(serverInfo['methods']),
        supportsOAuth: _supportsFeature(serverInfo, 'oauth'),
        supportsAppPasswords: _supportsFeature(
          serverInfo,
          'app_passwords',
          defaultValue: true,
        ),
        supportsChat: _supportsFeature(serverInfo, 'chat'),
        supportsNotifications: _supportsFeature(serverInfo, 'notifications'),
        supportsModeration: _supportsFeature(serverInfo, 'moderation'),
        supportsCustomFeeds: _supportsFeature(serverInfo, 'custom_feeds'),
        status: ServerStatus.online,
        lastChecked: DateTime.now(),
        isCustom: !_isOfficialServer(normalizedUrl),
      );
    } catch (e) {
      // Return fallback configuration for servers without discovery
      return ServerPresets.customServer(
        serviceUrl: _normalizeUrl(serviceUrl),
        displayName: _extractHostname(serviceUrl),
        description: 'Custom AT Protocol server',
      ).copyWith(status: ServerStatus.error, lastChecked: DateTime.now());
    }
  }

  /// Validate server connectivity and compatibility
  static Future<ServerConfig> validateServer(ServerConfig config) async {
    try {
      final stopwatch = Stopwatch()..start();

      // Test basic connectivity with server description endpoint
      final response = await http
          .get(
            Uri.parse(
              '${config.serviceUrl}/xrpc/com.atproto.server.describeServer',
            ),
            headers: {'User-Agent': 'MoodeSky/1.0', ...config.headers},
          )
          .timeout(config.timeout);

      stopwatch.stop();

      if (response.statusCode == 200) {
        final serverDesc = json.decode(response.body);
        final version = serverDesc['version'] as String?;

        final isCompatible = _isCompatibleVersion(
          version,
          config.protocolVersion,
        );

        return config.copyWith(
          status: isCompatible ? ServerStatus.online : ServerStatus.error,
          lastChecked: DateTime.now(),
          latencyMs: stopwatch.elapsedMilliseconds,
        );
      } else {
        return config.copyWith(
          status: ServerStatus.error,
          lastChecked: DateTime.now(),
          latencyMs: stopwatch.elapsedMilliseconds,
        );
      }
    } catch (e) {
      return config.copyWith(
        status: ServerStatus.offline,
        lastChecked: DateTime.now(),
      );
    }
  }

  /// Test authentication methods available on server
  static Future<Map<String, bool>> testAuthMethods(ServerConfig config) async {
    final results = <String, bool>{'app_password': false, 'oauth': false};

    try {
      // Test app password support (try to get session creation endpoint)
      final sessionResponse = await http
          .get(
            Uri.parse(
              '${config.serviceUrl}/xrpc/com.atproto.server.createSession',
            ),
            headers: {'User-Agent': 'MoodeSky/1.0'},
          )
          .timeout(config.timeout);

      // If we get a method-not-allowed or similar, the endpoint exists
      results['app_password'] =
          sessionResponse.statusCode == 405 ||
          sessionResponse.statusCode == 400 ||
          sessionResponse.statusCode == 401;

      // Test OAuth support (check for OAuth endpoints)
      if (config.supportsOAuth) {
        final oauthResponse = await http
            .get(
              Uri.parse(
                '${config.serviceUrl}/.well-known/oauth-authorization-server',
              ),
              headers: {'User-Agent': 'MoodeSky/1.0'},
            )
            .timeout(config.timeout);

        results['oauth'] = oauthResponse.statusCode == 200;
      }
    } catch (e) {
      // If we can't test, assume app_password works (most common)
      results['app_password'] = true;
    }

    return results;
  }

  // Private helper methods

  static String _normalizeUrl(String url) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://$url';
    }

    // Remove trailing slash
    return url.replaceAll(RegExp(r'/+$'), '');
  }

  static String _extractHostname(String url) {
    try {
      final uri = Uri.parse(url);
      return uri.host;
    } catch (e) {
      return url;
    }
  }

  static bool _isOfficialServer(String url) {
    return url.contains('bsky.social') ||
        url.contains('bsky.dev') ||
        url.contains('blueskyweb.xyz');
  }

  static Future<Map<String, dynamic>> _fetchServerDescription(
    String serviceUrl,
    Duration timeout,
  ) async {
    // Try multiple endpoints for server information
    final endpoints = [
      '$serviceUrl/.well-known/atproto-server',
      '$serviceUrl/.well-known/atproto_did',
      '$serviceUrl/xrpc/com.atproto.server.describeServer',
    ];

    for (final endpoint in endpoints) {
      try {
        final response = await http
            .get(Uri.parse(endpoint), headers: {'User-Agent': 'MoodeSky/1.0'})
            .timeout(timeout);

        if (response.statusCode == 200) {
          return json.decode(response.body) as Map<String, dynamic>;
        }
      } catch (e) {
        continue; // Try next endpoint
      }
    }

    throw Exception('No server description available');
  }

  static List<String> _parseSupportedMethods(dynamic methods) {
    if (methods is List) {
      return methods.cast<String>();
    }
    return ['com.atproto.server.createSession']; // Default
  }

  static bool _supportsFeature(
    Map<String, dynamic> serverInfo,
    String feature, {
    bool defaultValue = false,
  }) {
    final features = serverInfo['features'];
    if (features is List) {
      return features.contains(feature);
    }

    final auth = serverInfo['auth'];
    if (auth is List && (feature == 'oauth' || feature == 'app_passwords')) {
      return auth.contains(feature);
    }

    return defaultValue;
  }

  static bool _isCompatibleVersion(
    String? serverVersion,
    String clientVersion,
  ) {
    if (serverVersion == null) return true; // Assume compatible

    try {
      final serverParts = serverVersion.split('.').map(int.parse).toList();
      final clientParts = clientVersion.split('.').map(int.parse).toList();

      // Check major version compatibility
      if (serverParts.isNotEmpty && clientParts.isNotEmpty) {
        return serverParts[0] == clientParts[0];
      }
    } catch (e) {
      // If we can't parse versions, assume compatible
    }

    return true;
  }
}
