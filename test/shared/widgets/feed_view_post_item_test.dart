// Flutter imports:
import 'package:flutter/material.dart';

// Package imports:
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:bluesky/bluesky.dart' as bsky;

// Project imports:
import 'package:moodesky/shared/widgets/post_item.dart';
import 'package:moodesky/shared/utils/user_display_utils.dart';

void main() {
  group('FeedViewPostItem', () {
    late bsky.FeedView mockFeedView;
    late bsky.FeedView mockRepostFeedView;

    setUp(() {
      // モック通常投稿 - ネイティブ型を使用
      final postUri = 'at://did:plc:test/app.bsky.feed.post/test123';
      final authorDid = 'did:plc:test-author';
      final authorHandle = 'testuser.bsky.social';
      final createdAt = DateTime.now();
      
      mockFeedView = bsky.FeedView.fromJson({
        'post': {
          'uri': postUri,
          'cid': 'test-cid',
          'author': {
            'did': authorDid,
            'handle': authorHandle,
            'displayName': 'Test User',
          },
          'record': {
            '\$type': 'app.bsky.feed.post',
            'text': 'This is a test post',
            'createdAt': createdAt.toIso8601String(),
            'facets': [],
          },
          'indexedAt': createdAt.toIso8601String(),
          'likeCount': 5,
          'repostCount': 3,
          'replyCount': 2,
          'viewer': {
            'like': null,
            'repost': null,
          },
        },
        'reason': null,
      });

      // モックリポスト投稿 - ネイティブ型を使用
      final repostCreatedAt = DateTime.now();
      
      mockRepostFeedView = bsky.FeedView.fromJson({
        'post': mockFeedView.toJson()['post'],
        'reason': {
          '\$type': 'app.bsky.feed.defs#reasonRepost',
          'by': {
            'did': 'did:plc:reposter',
            'handle': 'reposter.bsky.social',
            'displayName': 'Reposter User',
          },
          'indexedAt': repostCreatedAt.toIso8601String(),
        },
      });
    });

    testWidgets('通常投稿を正しく表示する', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: FeedViewPostItem(feedView: mockFeedView),
            ),
          ),
        ),
      );

      // ユーザー名が表示されることを確認
      expect(find.text('Test User'), findsOneWidget);
      expect(find.text('@testuser.bsky.social'), findsOneWidget);
      
      // 投稿内容が表示されることを確認
      expect(find.text('This is a test post'), findsOneWidget);
      
      // アクションボタンのカウントが表示されることを確認
      expect(find.text('5'), findsOneWidget); // いいね数
      expect(find.text('3'), findsOneWidget); // リポスト数
      expect(find.text('2'), findsOneWidget); // リプライ数
      
      // リポストヘッダーが表示されないことを確認
      expect(find.textContaining('がリポストしました'), findsNothing);
    });

    testWidgets('リポスト投稿でリポストヘッダーを表示する', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: FeedViewPostItem(feedView: mockRepostFeedView),
            ),
          ),
        ),
      );

      // リポストヘッダーが表示されることを確認
      expect(find.textContaining('Reposter User'), findsOneWidget);
      expect(find.byIcon(Icons.repeat_rounded), findsAtLeastNWidgets(1));
      
      // 元の投稿内容も表示されることを確認
      expect(find.text('Test User'), findsOneWidget);
      expect(find.text('This is a test post'), findsOneWidget);
    });

    testWidgets('UserDisplayUtils でdisplayNameフォールバックが動作する', (WidgetTester tester) async {
      // displayNameがnullのユーザー - ネイティブ型を使用
      final testCreatedAt = DateTime.now();
      
      final feedViewWithoutDisplayName = bsky.FeedView.fromJson({
        'post': {
          'uri': 'at://did:plc:test/app.bsky.feed.post/test456',
          'cid': 'test-cid-2',
          'author': {
            'did': 'did:plc:test-author-2',
            'handle': 'noname.bsky.social',
            // displayNameなし
          },
          'record': {
            '\$type': 'app.bsky.feed.post',
            'text': 'Test post without display name',
            'createdAt': testCreatedAt.toIso8601String(),
            'facets': [],
          },
          'indexedAt': testCreatedAt.toIso8601String(),
          'viewer': {},
        },
        'reason': null,
      });

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: FeedViewPostItem(feedView: feedViewWithoutDisplayName),
            ),
          ),
        ),
      );

      // handleが表示名として使用されることを確認
      expect(find.text('noname.bsky.social'), findsOneWidget);
      expect(find.text('@noname.bsky.social'), findsOneWidget);
    });

    testWidgets('アクションボタンが正しく表示される', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: FeedViewPostItem(feedView: mockFeedView),
            ),
          ),
        ),
      );

      // リプライボタン
      expect(find.byIcon(Icons.chat_bubble_outline_rounded), findsOneWidget);
      
      // リポストボタン
      expect(find.byIcon(Icons.repeat_rounded), findsAtLeastNWidgets(1));
      
      // いいねボタン（まだいいねしていない状態）
      expect(find.byIcon(Icons.favorite_border_rounded), findsOneWidget);
      
      // メニューボタン
      expect(find.byIcon(Icons.more_horiz_rounded), findsOneWidget);
    });

    test('UserDisplayUtils.getDisplayName が正しく動作する', () {
      // displayNameがある場合 - ネイティブ型を使用
      final userWithDisplayName = bsky.ActorBasic.fromJson({
        'did': 'did:plc:test',
        'handle': 'test.bsky.social',
        'displayName': 'Test Display Name',
      });
      expect(
        UserDisplayUtils.getDisplayName(userWithDisplayName),
        equals('Test Display Name'),
      );

      // displayNameがない場合
      final userWithoutDisplayName = bsky.ActorBasic.fromJson({
        'did': 'did:plc:test',
        'handle': 'test.bsky.social',
        // displayNameなし
      });
      expect(
        UserDisplayUtils.getDisplayName(userWithoutDisplayName),
        equals('test.bsky.social'),
      );

      // displayNameが空文字の場合
      final userWithEmptyDisplayName = bsky.ActorBasic.fromJson({
        'did': 'did:plc:test',
        'handle': 'test.bsky.social',
        'displayName': '',
      });
      expect(
        UserDisplayUtils.getDisplayName(userWithEmptyDisplayName),
        equals('test.bsky.social'),
      );
    });
  });
}