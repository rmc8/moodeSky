import 'package:drift/drift.dart';

@DataClassName('Post')
class Posts extends Table {
  // Primary key
  IntColumn get id => integer().autoIncrement()();
  
  // AT Protocol identifiers
  TextColumn get uri => text().withLength(min: 1, max: 500)();
  TextColumn get cid => text().withLength(min: 1, max: 200)();
  TextColumn get rkey => text().withLength(min: 1, max: 200)();
  
  // Account association
  TextColumn get accountDid => text().withLength(min: 1, max: 500)();
  
  // Author information
  TextColumn get authorDid => text().withLength(min: 1, max: 500)();
  TextColumn get authorHandle => text().withLength(min: 1, max: 253)();
  TextColumn get authorDisplayName => text().nullable()();
  TextColumn get authorAvatar => text().nullable()();
  
  // Post content
  TextColumn get text => text()();
  TextColumn get facets => text().nullable()(); // JSON format for links, mentions, etc.
  TextColumn get embed => text().nullable()(); // JSON format for images, videos, etc.
  TextColumn get tags => text().nullable()(); // JSON array of hashtags
  TextColumn get langs => text().nullable()(); // JSON array of language codes
  
  // Post metadata
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get indexedAt => dateTime()();
  
  // Reply/Thread information
  TextColumn get replyParent => text().nullable()(); // Parent post URI
  TextColumn get replyRoot => text().nullable()(); // Root post URI
  
  // Engagement metrics
  IntColumn get replyCount => integer().withDefault(const Constant(0))();
  IntColumn get repostCount => integer().withDefault(const Constant(0))();
  IntColumn get likeCount => integer().withDefault(const Constant(0))();
  IntColumn get quoteCount => integer().withDefault(const Constant(0))();
  
  // User interactions
  BoolColumn get isLiked => boolean().withDefault(const Constant(false))();
  BoolColumn get isReposted => boolean().withDefault(const Constant(false))();
  TextColumn get userRepostUri => text().nullable()(); // User's repost URI if reposted
  TextColumn get userLikeUri => text().nullable()(); // User's like URI if liked
  
  // Content classification
  TextColumn get labels => text().nullable()(); // JSON array of content labels
  BoolColumn get isMuted => boolean().withDefault(const Constant(false))();
  BoolColumn get isBlocked => boolean().withDefault(const Constant(false))();
  
  // Cache management
  TextColumn get deckType => text().nullable()(); // Which deck this post belongs to
  TextColumn get deckIdentifier => text().nullable()(); // Specific deck identifier (e.g., list URI)
  DateTimeColumn get fetchedAt => dateTime().withDefault(currentDateAndTime)();
  BoolColumn get isRead => boolean().withDefault(const Constant(false))();
  BoolColumn get isPinned => boolean().withDefault(const Constant(false))();
  
  @override
  Set<Column> get primaryKey => {id};
  
  @override
  List<Set<Column>> get uniqueKeys => [
    {uri}, // Post URI must be unique
    {accountDid, cid}, // CID per account must be unique
  ];
  
  @override
  List<String> get customConstraints => [
    'FOREIGN KEY (accountDid) REFERENCES accounts (did) ON DELETE CASCADE',
  ];
}

// Extension for additional functionality
extension PostExtensions on Post {
  // Check if post is a reply
  bool get isReply => replyParent != null;
  
  // Check if post is a root post
  bool get isRootPost => replyParent == null;
  
  // Check if post is part of a thread
  bool get isInThread => replyRoot != null;
  
  // Get total engagement count
  int get totalEngagement => replyCount + repostCount + likeCount + quoteCount;
  
  // Check if post has media embed
  bool get hasMedia => embed != null && embed!.isNotEmpty;
  
  // Check if post has content labels/warnings
  bool get hasContentLabels => labels != null && labels!.isNotEmpty;
  
  // Get author identifier for display
  String get authorIdentifier => 
      authorDisplayName?.isNotEmpty == true ? authorDisplayName! : authorHandle;
}