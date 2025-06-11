// Flutter imports:
import 'package:flutter/material.dart';

// Package imports:
import 'package:bluesky/bluesky.dart' as bsky;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

// Project imports:
import 'package:moodesky/core/providers/theme_provider.dart';
import 'package:moodesky/core/theme/app_themes.dart';
import 'package:moodesky/shared/widgets/bluesky_facet_text.dart';
import 'package:moodesky/shared/widgets/rich_text_widget.dart';

/// ポストアイテムの表示ウィジェット
class PostItem extends StatelessWidget {
  final String authorName;
  final String authorHandle;
  final String? authorAvatar;
  final String content;
  final List<bsky.Facet>? facets;
  final DateTime timestamp;
  final int likeCount;
  final int repostCount;
  final int replyCount;
  final bool isLiked;
  final bool isReposted;
  final VoidCallback? onLike;
  final VoidCallback? onRepost;
  final VoidCallback? onReply;
  final VoidCallback? onTap;

  const PostItem({
    super.key,
    required this.authorName,
    required this.authorHandle,
    this.authorAvatar,
    required this.content,
    this.facets,
    required this.timestamp,
    this.likeCount = 0,
    this.repostCount = 0,
    this.replyCount = 0,
    this.isLiked = false,
    this.isReposted = false,
    this.onLike,
    this.onRepost,
    this.onReply,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ユーザー情報行
          Row(
            children: [
              // アバター
              CircleAvatar(
                radius: 20,
                backgroundImage: authorAvatar != null
                    ? NetworkImage(authorAvatar!)
                    : null,
                child: authorAvatar == null
                    ? Text(
                        authorName.substring(0, 1).toUpperCase(),
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      )
                    : null,
              ),

              const SizedBox(width: 12),

              // 名前とハンドル
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      authorName,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      '@$authorHandle',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).brightness == Brightness.light
                            ? const Color(0xFF424242)
                            : const Color(0xFFCCCCCC),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),

              // タイムスタンプ
              Text(
                _formatTimestamp(timestamp),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).brightness == Brightness.light
                      ? const Color(0xFF424242)
                      : const Color(0xFFCCCCCC),
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // ポスト内容 - facetsがある場合はBlueskyFacetText、ない場合はBlueskyRichText
          facets != null && facets!.isNotEmpty
            ? BlueskyFacetText(
                text: content,
                facets: facets,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Theme.of(context).brightness == Brightness.light
                      ? const Color(0xFF111111) // より濃い黒
                      : const Color(0xFFF5F5F5), // 明るい白
                  fontWeight: FontWeight.w400, // Regular
                ),
                onMentionTap: (did) {
                  // TODO: プロフィール画面へ遷移
                  print('Mention tapped: $did');
                },
                onLinkTap: (url) {
                  PostItem._launchUrl(url);
                },
                onHashtagTap: (tag) {
                  // TODO: ハッシュタグ検索画面へ遷移
                  print('Hashtag tapped: #$tag');
                },
              )
            : BlueskyRichText(
                text: content,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Theme.of(context).brightness == Brightness.light
                      ? const Color(0xFF111111) // より濃い黒
                      : const Color(0xFFF5F5F5), // 明るい白
                  fontWeight: FontWeight.w400, // Regular
                ),
                onMentionTap: (handle) {
                  // TODO: プロフィール画面へ遷移
                  print('Mention tapped: @$handle');
                },
                onLinkTap: (url) {
                  PostItem._launchUrl(url);
                },
                onHashtagTap: (tag) {
                  // TODO: ハッシュタグ検索画面へ遷移
                  print('Hashtag tapped: #$tag');
                },
              ),

          const SizedBox(height: 16),

          // アクションボタン行
          Row(
            children: [
              // リプライ
              _buildActionButton(
                context: context,
                icon: Icons.chat_bubble_outline_rounded,
                count: replyCount,
                onTap: onReply,
              ),

              const SizedBox(width: 24),

              // リポスト
              _buildActionButton(
                context: context,
                icon: Icons.repeat_rounded,
                count: repostCount,
                isActive: isReposted,
                activeColor: Theme.of(context).colorScheme.repostColor,
                onTap: onRepost,
              ),

              const SizedBox(width: 24),

              // いいね
              _buildActionButton(
                context: context,
                icon: isLiked
                    ? Icons.favorite_rounded
                    : Icons.favorite_border_rounded,
                count: likeCount,
                isActive: isLiked,
                activeColor: Theme.of(context).colorScheme.likeColor,
                onTap: onLike,
              ),

              const Spacer(),

              // メニュー
              IconButton(
                icon: Icon(
                  Icons.more_horiz_rounded,
                  color: Theme.of(context).brightness == Brightness.light
                      ? const Color(0xFF424242)
                      : const Color(0xFFCCCCCC),
                ),
                onPressed: () {
                  // TODO: メニューを表示
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required BuildContext context,
    required IconData icon,
    required int count,
    bool isActive = false,
    Color? activeColor,
    VoidCallback? onTap,
  }) {
    final color = isActive && activeColor != null
        ? activeColor
        : (Theme.of(context).brightness == Brightness.light
              ? const Color(0xFF424242)
              : const Color(0xFFCCCCCC));

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: 60, // 固定幅を設定
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: color),
            if (count > 0) ...[
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  _formatCount(count),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: color,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d';
    } else {
      return '${timestamp.month}/${timestamp.day}';
    }
  }

  static Future<void> _launchUrl(String url) async {
    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        print('Could not launch URL: $url');
      }
    } catch (e) {
      print('Failed to launch URL: $e');
    }
  }

  String _formatCount(int count) {
    if (count < 1000) {
      return count.toString();
    } else if (count < 1000000) {
      final k = count / 1000;
      if (k == k.round()) {
        return '${k.round()}K';
      } else {
        return '${k.toStringAsFixed(1)}K';
      }
    } else {
      final m = count / 1000000;
      if (m == m.round()) {
        return '${m.round()}M';
      } else {
        return '${m.toStringAsFixed(1)}M';
      }
    }
  }
}

/// デモ用のポストリスト
class PostListDemo extends ConsumerWidget {
  const PostListDemo({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // テーマ変更を監視して再描画をトリガー
    ref.watch(currentThemeModeProvider);

    final demoPosts = [
      PostItem(
        authorName: 'moodeSky Dev',
        authorHandle: 'moodesky.bsky.social',
        content:
            'moodeSkyのリッチテキスト機能が完成！@alice.bsky.social さんもお試しください ✨ #moodeSky #BlueskyClient 詳細は https://moodesky.app で確認できます 🚀',
        timestamp: DateTime.now().subtract(const Duration(minutes: 15)),
        likeCount: 42,
        repostCount: 8,
        replyCount: 5,
      ),
      PostItem(
        authorName: 'Alice Johnson',
        authorHandle: 'alice.bsky.social',
        content:
            'Hey @moodesky.bsky.social, loving the new #RichText features! Check out my blog at https://alice-dev.blog for more #Flutter tips 💙',
        timestamp: DateTime.now().subtract(const Duration(hours: 2)),
        likeCount: 23,
        repostCount: 3,
        replyCount: 7,
        isLiked: true,
      ),
      PostItem(
        authorName: 'Bob Wilson',
        authorHandle: 'bob.dev',
        content:
            'The @moodeSky design is amazing! 🎨 Check out the color themes at https://moodeSky.demo #UIDesign #BlueskyThemes #FlutterUI',
        timestamp: DateTime.now().subtract(const Duration(hours: 4)),
        likeCount: 156,
        repostCount: 24,
        replyCount: 12,
        isReposted: true,
      ),
      PostItem(
        authorName: 'Charlie Brown',
        authorHandle: 'charlie.bsky.social',
        content:
            'Multi-account support in @moodeSky.bsky.social is seamless! 👏 Thanks @alice.bsky.social for the recommendation. Download at https://github.com/moodeSky #MultiAccount #Productivity',
        timestamp: DateTime.now().subtract(const Duration(days: 1)),
        likeCount: 89,
        repostCount: 15,
        replyCount: 9,
      ),
    ];

    return ListView.builder(
      itemCount: demoPosts.length,
      itemBuilder: (context, index) {
        final post = demoPosts[index];
        // 各アイテムごとに最新のコンテキストでPostItemStyleを作成
        return Consumer(
          builder: (context, ref, child) {
            // テーマ変更を確実に検知
            ref.watch(currentThemeModeProvider);
            final itemPostStyle = PostItemStyle(context);

            return itemPostStyle.buildPostContainer(
              child: InkWell(
                onTap: post.onTap,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ユーザー情報行
                    Row(
                      children: [
                        // アバター
                        CircleAvatar(
                          radius: 20,
                          backgroundImage: post.authorAvatar != null
                              ? NetworkImage(post.authorAvatar!)
                              : null,
                          child: post.authorAvatar == null
                              ? Text(
                                  post.authorName.substring(0, 1).toUpperCase(),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                )
                              : null,
                        ),

                        const SizedBox(width: 12),

                        // 名前とハンドル
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                post.authorName,
                                style: Theme.of(context).textTheme.titleSmall
                                    ?.copyWith(fontWeight: FontWeight.w700),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                '@${post.authorHandle}',
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(
                                      color:
                                          Theme.of(context).brightness ==
                                              Brightness.light
                                          ? const Color(0xFF424242)
                                          : const Color(0xFFCCCCCC),
                                    ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),

                        // タイムスタンプ
                        Text(
                          _formatTimestampDemo(post.timestamp),
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(
                                color:
                                    Theme.of(context).brightness ==
                                        Brightness.light
                                    ? const Color(0xFF424242)
                                    : const Color(0xFFCCCCCC),
                              ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 12),

                    // ポスト内容
                    Text(
                      post.content,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Theme.of(context).brightness == Brightness.light
                            ? const Color(0xFF111111) // より濃い黒
                            : const Color(0xFFF5F5F5), // 明るい白
                        fontWeight: FontWeight.w400, // Regular
                      ),
                    ),

                    const SizedBox(height: 16),

                    // アクションボタン行
                    Row(
                      children: [
                        // リプライ
                        _buildActionButtonDemo(
                          context: context,
                          icon: Icons.chat_bubble_outline_rounded,
                          count: post.replyCount,
                          onTap: post.onReply,
                        ),

                        const SizedBox(width: 24),

                        // リポスト
                        _buildActionButtonDemo(
                          context: context,
                          icon: Icons.repeat_rounded,
                          count: post.repostCount,
                          isActive: post.isReposted,
                          activeColor: Theme.of(
                            context,
                          ).colorScheme.repostColor,
                          onTap: post.onRepost,
                        ),

                        const SizedBox(width: 24),

                        // いいね
                        _buildActionButtonDemo(
                          context: context,
                          icon: post.isLiked
                              ? Icons.favorite_rounded
                              : Icons.favorite_border_rounded,
                          count: post.likeCount,
                          isActive: post.isLiked,
                          activeColor: Theme.of(context).colorScheme.likeColor,
                          onTap: post.onLike,
                        ),

                        const Spacer(),

                        // メニュー
                        IconButton(
                          icon: Icon(
                            Icons.more_horiz_rounded,
                            color:
                                Theme.of(context).brightness == Brightness.light
                                ? const Color(0xFF424242)
                                : const Color(0xFFCCCCCC),
                          ),
                          onPressed: () {
                            // TODO: メニューを表示
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildActionButtonDemo({
    required BuildContext context,
    required IconData icon,
    required int count,
    bool isActive = false,
    Color? activeColor,
    VoidCallback? onTap,
  }) {
    final color = isActive && activeColor != null
        ? activeColor
        : (Theme.of(context).brightness == Brightness.light
              ? const Color(0xFF424242)
              : const Color(0xFFCCCCCC));

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: 60, // 固定幅を設定
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: color),
            if (count > 0) ...[
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  _formatCountDemo(count),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: color,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatTimestampDemo(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d';
    } else {
      return '${timestamp.month}/${timestamp.day}';
    }
  }

  String _formatCountDemo(int count) {
    if (count < 1000) {
      return count.toString();
    } else if (count < 1000000) {
      final k = count / 1000;
      if (k == k.round()) {
        return '${k.round()}K';
      } else {
        return '${k.toStringAsFixed(1)}K';
      }
    } else {
      final m = count / 1000000;
      if (m == m.round()) {
        return '${m.round()}M';
      } else {
        return '${m.toStringAsFixed(1)}M';
      }
    }
  }

  static Future<void> _launchUrl(String url) async {
    try {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        print('Could not launch URL: $url');
      }
    } catch (e) {
      print('Failed to launch URL: $e');
    }
  }
}
