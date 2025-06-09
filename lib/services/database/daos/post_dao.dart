// Package imports:
import 'package:drift/drift.dart';

// Project imports:
import 'package:moodesky/services/database/database.dart';
import 'package:moodesky/services/database/tables/posts.dart';

part 'post_dao.g.dart';

@DriftAccessor(tables: [Posts])
class PostDao extends DatabaseAccessor<AppDatabase> with _$PostDaoMixin {
  PostDao(AppDatabase db) : super(db);

  // Get posts for timeline
  Future<List<Post>> getTimelinePosts({
    required String accountDid,
    int limit = 50,
    DateTime? olderThan,
  }) {
    var query = select(posts)
      ..where((t) => t.accountDid.equals(accountDid))
      ..orderBy([
        (t) => OrderingTerm(expression: t.indexedAt, mode: OrderingMode.desc),
      ])
      ..limit(limit);

    if (olderThan != null) {
      query = query..where((t) => t.indexedAt.isSmallerThanValue(olderThan));
    }

    return query.get();
  }

  // Get posts for deck
  Future<List<Post>> getPostsForDeck({
    required String accountDid,
    required String deckType,
    String? deckIdentifier,
    int limit = 50,
    DateTime? olderThan,
  }) {
    var query = select(posts)
      ..where((t) => 
          t.accountDid.equals(accountDid) &
          t.deckType.equals(deckType))
      ..orderBy([
        (t) => OrderingTerm(expression: t.indexedAt, mode: OrderingMode.desc),
      ])
      ..limit(limit);

    if (deckIdentifier != null) {
      query = query..where((t) => t.deckIdentifier.equals(deckIdentifier));
    }

    if (olderThan != null) {
      query = query..where((t) => t.indexedAt.isSmallerThanValue(olderThan));
    }

    return query.get();
  }

  // Get post by URI
  Future<Post?> getPostByUri(String uri) {
    return (select(posts)..where((t) => t.uri.equals(uri))).getSingleOrNull();
  }

  // Create or update post
  Future<int> createOrUpdatePost(PostsCompanion post) {
    return into(posts).insertOnConflictUpdate(post);
  }

  // Update post engagement
  Future<bool> updatePostEngagement({
    required String uri,
    int? replyCount,
    int? repostCount,
    int? likeCount,
    int? quoteCount,
  }) {
    return (update(posts)..where((t) => t.uri.equals(uri))).write(
      PostsCompanion(
        replyCount: replyCount != null ? Value(replyCount) : const Value.absent(),
        repostCount: repostCount != null ? Value(repostCount) : const Value.absent(),
        likeCount: likeCount != null ? Value(likeCount) : const Value.absent(),
        quoteCount: quoteCount != null ? Value(quoteCount) : const Value.absent(),
      ),
    );
  }

  // Update user interactions
  Future<bool> updateUserInteraction({
    required String uri,
    bool? isLiked,
    bool? isReposted,
    String? userRepostUri,
    String? userLikeUri,
  }) {
    return (update(posts)..where((t) => t.uri.equals(uri))).write(
      PostsCompanion(
        isLiked: isLiked != null ? Value(isLiked) : const Value.absent(),
        isReposted: isReposted != null ? Value(isReposted) : const Value.absent(),
        userRepostUri: userRepostUri != null ? Value(userRepostUri) : const Value.absent(),
        userLikeUri: userLikeUri != null ? Value(userLikeUri) : const Value.absent(),
      ),
    );
  }

  // Mark post as read
  Future<bool> markPostAsRead(String uri) {
    return (update(posts)..where((t) => t.uri.equals(uri))).write(
      const PostsCompanion(
        isRead: Value(true),
      ),
    );
  }

  // Delete old posts (cache cleanup)
  Future<int> deleteOldPosts({
    required String accountDid,
    required DateTime olderThan,
    int? keepCount,
  }) async {
    if (keepCount != null) {
      // Keep most recent posts
      final recentPosts = await (select(posts)
            ..where((t) => t.accountDid.equals(accountDid))
            ..orderBy([
              (t) => OrderingTerm(expression: t.indexedAt, mode: OrderingMode.desc),
            ])
            ..limit(keepCount))
          .get();

      if (recentPosts.isNotEmpty) {
        final oldestRecentPost = recentPosts.last;
        return (delete(posts)
              ..where((t) => 
                  t.accountDid.equals(accountDid) &
                  t.indexedAt.isSmallerThanValue(oldestRecentPost.indexedAt)))
            .go();
      }
    }

    return (delete(posts)
          ..where((t) => 
              t.accountDid.equals(accountDid) &
              t.fetchedAt.isSmallerThanValue(olderThan)))
        .go();
  }

  // Get unread post count
  Future<int> getUnreadPostCount(String accountDid) async {
    final result = await (selectOnly(posts)
          ..addColumns([posts.id.count()])
          ..where(
              posts.accountDid.equals(accountDid) &
              posts.isRead.equals(false)))
        .getSingle();
    
    return result.read(posts.id.count()) ?? 0;
  }

  // Search posts
  Future<List<Post>> searchPosts({
    required String accountDid,
    required String searchTerm,
    int limit = 50,
  }) {
    return (select(posts)
          ..where((t) => 
              t.accountDid.equals(accountDid) &
              t.text.contains(searchTerm))
          ..orderBy([
            (t) => OrderingTerm(expression: t.indexedAt, mode: OrderingMode.desc),
          ])
          ..limit(limit))
        .get();
  }

  // Watch timeline posts
  Stream<List<Post>> watchTimelinePosts({
    required String accountDid,
    int limit = 50,
  }) {
    return (select(posts)
          ..where((t) => t.accountDid.equals(accountDid))
          ..orderBy([
            (t) => OrderingTerm(expression: t.indexedAt, mode: OrderingMode.desc),
          ])
          ..limit(limit))
        .watch();
  }
}
