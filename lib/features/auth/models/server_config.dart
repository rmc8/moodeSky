// Package imports:
import 'package:freezed_annotation/freezed_annotation.dart';

part 'server_config.freezed.dart';
part 'server_config.g.dart';

@freezed
class ServerConfig with _$ServerConfig {
  const factory ServerConfig({
    // Server identification
    required String serviceUrl,
    String? pdsUrl,
    String? oauthUrl,
    String? xrpcUrl,
    
    // Server metadata
    required String displayName,
    String? description,
    String? icon,
    String? contactEmail,
    
    // Protocol support
    @Default(['com.atproto.server.createSession']) List<String> supportedMethods,
    @Default('0.4.0') String protocolVersion,
    @Default(true) bool supportsOAuth,
    @Default(true) bool supportsAppPasswords,
    
    // Network configuration
    @Default({}) Map<String, String> headers,
    @Default(30) int timeoutSeconds,
    @Default(false) bool allowSelfSigned,
    
    // Feature flags
    @Default(false) bool supportsChat,
    @Default(false) bool supportsNotifications,
    @Default(false) bool supportsModeration,
    @Default(false) bool supportsCustomFeeds,
    
    // Server status
    @Default(ServerStatus.unknown) ServerStatus status,
    DateTime? lastChecked,
    int? latencyMs,
    
    // UI properties
    @Default(false) bool isOfficial,
    @Default(false) bool isCustom,
  }) = _ServerConfig;

  factory ServerConfig.fromJson(Map<String, dynamic> json) =>
      _$ServerConfigFromJson(json);
}

enum ServerStatus {
  unknown,
  online,
  offline,
  error,
  checking,
}

class ServerPresets {
  static final ServerConfig blueskyOfficial = ServerConfig(
    serviceUrl: 'https://bsky.social',
    displayName: 'Bluesky Social',
    description: 'Official Bluesky social network',
    icon: 'https://bsky.social/static/favicon-32x32.png',
    protocolVersion: '0.4.0',
    supportsOAuth: true,
    supportsAppPasswords: true,
    supportsChat: true,
    supportsNotifications: true,
    supportsModeration: true,
    supportsCustomFeeds: true,
    isOfficial: true,
  );
  
  static final ServerConfig blueskyStaging = ServerConfig(
    serviceUrl: 'https://staging.bsky.dev',
    displayName: 'Bluesky Staging',
    description: 'Bluesky development staging environment',
    protocolVersion: '0.4.0',
    supportsOAuth: true,
    supportsAppPasswords: true,
    isOfficial: true,
  );
  
  static final List<ServerConfig> predefinedServers = [
    blueskyOfficial,
    blueskyStaging,
  ];
  
  static ServerConfig customServer({
    required String serviceUrl,
    required String displayName,
    String? description,
  }) => ServerConfig(
    serviceUrl: serviceUrl,
    displayName: displayName,
    description: description,
    protocolVersion: '0.4.0',
    supportsOAuth: false, // Will be detected
    supportsAppPasswords: true, // Most servers support this
    timeoutSeconds: 30,
    allowSelfSigned: false,
    isCustom: true,
  );
}

extension ServerConfigExtensions on ServerConfig {
  String get appPasswordUrl {
    if (serviceUrl.contains('bsky.social')) {
      return 'https://bsky.app/settings/app-passwords';
    }
    
    try {
      final uri = Uri.parse(serviceUrl);
      return '${uri.scheme}://${uri.host}/settings/app-passwords';
    } catch (e) {
      return '$serviceUrl/settings/app-passwords';
    }
  }
  
  String get oauthAuthUrl {
    if (oauthUrl != null) return oauthUrl!;
    
    try {
      final uri = Uri.parse(serviceUrl);
      return '${uri.scheme}://${uri.host}/oauth/authorize';
    } catch (e) {
      return '$serviceUrl/oauth/authorize';
    }
  }
  
  bool get isHealthy => status == ServerStatus.online;
  
  String get statusText {
    switch (status) {
      case ServerStatus.online:
        return 'Online';
      case ServerStatus.offline:
        return 'Offline';
      case ServerStatus.error:
        return 'Error';
      case ServerStatus.checking:
        return 'Checking...';
      case ServerStatus.unknown:
        return 'Unknown';
    }
  }
  
  Duration get timeout => Duration(seconds: timeoutSeconds);
}