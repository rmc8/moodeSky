import 'package:drift/drift.dart';

@DataClassName('Setting')
class Settings extends Table {
  // Primary key
  IntColumn get id => integer().autoIncrement()();
  
  // Setting identification
  TextColumn get key => text().withLength(min: 1, max: 200)();
  TextColumn get value => text()();
  TextColumn get type => text().withDefault(const Constant('string'))(); // 'string', 'int', 'bool', 'double', 'json'
  
  // Account association (null for global settings)
  TextColumn get accountDid => text().nullable()();
  
  // Setting metadata
  TextColumn get category => text().withDefault(const Constant('general'))(); // 'general', 'theme', 'notification', 'privacy', 'accessibility'
  TextColumn get description => text().nullable()();
  BoolColumn get isUserModifiable => boolean().withDefault(const Constant(true))();
  
  // Timestamps
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
  
  @override
  Set<Column> get primaryKey => {id};
  
  @override
  List<Set<Column>> get uniqueKeys => [
    {key, accountDid}, // Key per account must be unique (accountDid can be null for global)
  ];
  
  @override
  List<String> get customConstraints => [
    'FOREIGN KEY (accountDid) REFERENCES accounts (did) ON DELETE CASCADE',
  ];
}

// Extension for type-safe value access
extension SettingExtensions on Setting {
  // Get string value
  String get stringValue => value;
  
  // Get integer value
  int? get intValue {
    if (type != 'int') return null;
    return int.tryParse(value);
  }
  
  // Get boolean value
  bool? get boolValue {
    if (type != 'bool') return null;
    return value.toLowerCase() == 'true';
  }
  
  // Get double value
  double? get doubleValue {
    if (type != 'double') return null;
    return double.tryParse(value);
  }
  
  // Check if setting is global (not account-specific)
  bool get isGlobal => accountDid == null;
  
  // Check if setting is account-specific
  bool get isAccountSpecific => accountDid != null;
}

// Predefined setting keys
class SettingKeys {
  // Global app settings
  static const String appTheme = 'app_theme';
  static const String appLanguage = 'app_language';
  static const String defaultDeckLayout = 'default_deck_layout';
  static const String maxDeckCount = 'max_deck_count';
  static const String autoRefreshInterval = 'auto_refresh_interval';
  static const String enableAnalytics = 'enable_analytics';
  static const String enableCrashReporting = 'enable_crash_reporting';
  
  // Theme settings
  static const String lightThemeVariant = 'light_theme_variant';
  static const String darkThemeVariant = 'dark_theme_variant';
  static const String useSystemTheme = 'use_system_theme';
  static const String customAccentColor = 'custom_accent_color';
  static const String fontSize = 'font_size';
  static const String fontFamily = 'font_family';
  
  // Notification settings (global)
  static const String enableNotifications = 'enable_notifications';
  static const String notificationSound = 'notification_sound';
  static const String enableVibration = 'enable_vibration';
  static const String quietHoursStart = 'quiet_hours_start';
  static const String quietHoursEnd = 'quiet_hours_end';
  
  // Privacy settings
  static const String enableAnalyticsTracking = 'enable_analytics_tracking';
  static const String shareUsageData = 'share_usage_data';
  static const String enableLocationServices = 'enable_location_services';
  
  // Accessibility settings
  static const String enableHighContrast = 'enable_high_contrast';
  static const String enableReducedMotion = 'enable_reduced_motion';
  static const String enableScreenReader = 'enable_screen_reader';
  static const String largeTextMode = 'large_text_mode';
  
  // Performance settings
  static const String enableImagePreloading = 'enable_image_preloading';
  static const String maxCacheSize = 'max_cache_size';
  static const String enableDataSaver = 'enable_data_saver';
  static const String autoPlayVideos = 'auto_play_videos';
  
  // Account-specific settings (require accountDid)
  static const String accountTheme = 'account_theme';
  static const String accountLanguage = 'account_language';
  static const String enableMentionNotifications = 'enable_mention_notifications';
  static const String enableFollowNotifications = 'enable_follow_notifications';
  static const String enableLikeNotifications = 'enable_like_notifications';
  static const String enableRepostNotifications = 'enable_repost_notifications';
  static const String defaultPostVisibility = 'default_post_visibility';
  static const String enableAutoLike = 'enable_auto_like';
  static const String contentLanguageFilter = 'content_language_filter';
  static const String blockList = 'block_list';
  static const String muteList = 'mute_list';
  static const String contentFilters = 'content_filters';
  
  // AI Agent settings (account-specific)
  static const String enableAiAgent = 'enable_ai_agent';
  static const String aiAgentProvider = 'ai_agent_provider';
  static const String aiAgentModel = 'ai_agent_model';
  static const String aiAgentPersonality = 'ai_agent_personality';
  static const String aiAgentAutoReply = 'ai_agent_auto_reply';
  static const String aiAgentApiKey = 'ai_agent_api_key'; // Encrypted
  
  // Deck-specific settings
  static const String deckRefreshInterval = 'deck_refresh_interval';
  static const String deckMaxPosts = 'deck_max_posts';
  static const String deckShowReplies = 'deck_show_replies';
  static const String deckShowReposts = 'deck_show_reposts';
  static const String deckNotifications = 'deck_notifications';
}