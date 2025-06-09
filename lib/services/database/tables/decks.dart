// Package imports:
import 'package:drift/drift.dart';

@DataClassName('Deck')
class Decks extends Table {
  // Primary key
  IntColumn get id => integer().autoIncrement()();
  
  // Deck identification
  TextColumn get deckId => text().withLength(min: 1, max: 100)(); // Unique deck identifier
  TextColumn get title => text().withLength(min: 1, max: 200)();
  TextColumn get description => text().nullable()();
  
  // Deck type and configuration
  TextColumn get deckType => text()(); // 'home', 'notifications', 'search', 'list', 'profile', 'thread', 'custom_feed', 'local', 'hashtag', 'mentions'
  TextColumn get targetIdentifier => text().nullable()(); // List URI, user DID, hashtag, search query, etc.
  TextColumn get config => text().nullable()(); // JSON configuration for deck-specific settings
  
  // Account association
  TextColumn get accountDid => text().nullable()(); // Associated account DID (null for cross-account decks)
  BoolColumn get isCrossAccount => boolean().withDefault(const Constant(false))(); // Multi-account deck flag
  TextColumn get accountDids => text().nullable()(); // JSON array of account DIDs for cross-account decks
  
  // Display and layout
  IntColumn get deckOrder => integer().withDefault(const Constant(0))(); // Display order
  IntColumn get width => integer().nullable()(); // Column width (pixels, for desktop)
  BoolColumn get isVisible => boolean().withDefault(const Constant(true))();
  BoolColumn get isFavorite => boolean().withDefault(const Constant(false))();
  
  // Grouping and organization
  TextColumn get groupId => text().nullable()(); // Deck group identifier
  TextColumn get groupName => text().nullable()(); // Deck group name
  TextColumn get tags => text().nullable()(); // JSON array of user-defined tags
  
  // Content filtering and display options
  TextColumn get filters => text().nullable()(); // JSON configuration for content filters
  BoolColumn get showReplies => boolean().withDefault(const Constant(true))();
  BoolColumn get showReposts => boolean().withDefault(const Constant(true))();
  BoolColumn get showQuotes => boolean().withDefault(const Constant(true))();
  TextColumn get contentLanguages => text().nullable()(); // JSON array of preferred languages
  
  // Refresh and sync settings
  BoolColumn get autoRefresh => boolean().withDefault(const Constant(true))();
  IntColumn get refreshInterval => integer().withDefault(const Constant(60))(); // Seconds
  DateTimeColumn get lastRefresh => dateTime().nullable()();
  DateTimeColumn get lastRead => dateTime().nullable()();
  
  // Notification settings
  BoolColumn get notificationsEnabled => boolean().withDefault(const Constant(false))();
  TextColumn get notificationConfig => text().nullable()(); // JSON notification settings
  
  // Performance and caching
  IntColumn get maxCachedPosts => integer().withDefault(const Constant(200))();
  BoolColumn get enableCache => boolean().withDefault(const Constant(true))();
  
  // Timestamps
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
  
  @override
  List<Set<Column>> get uniqueKeys => [
    {deckId}, // Deck ID must be unique
  ];
}

// Enum for deck types
enum DeckType {
  home('home'),
  notifications('notifications'),
  search('search'),
  list('list'),
  profile('profile'),
  thread('thread'),
  customFeed('custom_feed'),
  local('local'),
  hashtag('hashtag'),
  mentions('mentions');

  const DeckType(this.value);
  final String value;
  
  static DeckType fromString(String value) {
    return DeckType.values.firstWhere(
      (type) => type.value == value,
      orElse: () => DeckType.home,
    );
  }
}

// TODO: Extension for additional functionality (uncomment when Drift code generation is fixed)
// extension DeckExtensions on Deck {
//   // Get deck type enum
//   DeckType get typeEnum => DeckType.fromString(deckType);
//   
//   // Check if deck is account-specific
//   bool get isAccountSpecific => accountDid != null && !isCrossAccount;
//   
//   // Check if deck supports real-time updates
//   bool get supportsRealTime => deckType == 'home' || deckType == 'notifications';
//   
//   // Check if deck needs target identifier
//   bool get requiresTarget => [
//     'search', 'list', 'profile', 'thread', 
//     'custom_feed', 'hashtag', 'mentions'
//   ].contains(deckType);
//   
//   // Check if deck is favorited
//   bool get favorited => isFavorite;
//   
//   // Get display title with fallback
//   String get displayTitle {
//     if (title.isNotEmpty) return title;
//     
//     switch (deckType) {
//       case 'home':
//         return 'Home';
//       case 'notifications':
//         return 'Notifications';
//       case 'search':
//         return 'Search: ${targetIdentifier ?? ""}';
//       case 'list':
//         return 'List';
//       case 'profile':
//         return 'Profile';
//       case 'thread':
//         return 'Thread';
//       case 'custom_feed':
//         return 'Custom Feed';
//       case 'local':
//         return 'Local Timeline';
//       case 'hashtag':
//         return '#${targetIdentifier ?? ""}';
//       case 'mentions':
//         return 'Mentions';
//       default:
//         return 'Deck';
//     }
//   }
//   
//   // Check if deck has unread content
//   bool get hasUnread => lastRefresh != null && 
//       (lastRead == null || lastRead!.isBefore(lastRefresh!));
// }
