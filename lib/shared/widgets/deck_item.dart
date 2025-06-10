// Flutter imports:
import 'package:flutter/material.dart';

// Project imports:
import 'package:moodesky/core/theme/app_themes.dart';
import 'package:moodesky/l10n/app_localizations.dart';

/// デッキアイテムの基本レイアウト - PostItemと統一されたデザイン
class DeckItem extends StatelessWidget {
  final Widget avatar;
  final String title;
  final String subtitle;
  final String? timestamp;
  final String content;
  final List<Widget>? actionButtons;
  final VoidCallback? onTap;
  final Widget? trailing;
  final Color? accentColor;

  const DeckItem({
    super.key,
    required this.avatar,
    required this.title,
    required this.subtitle,
    this.timestamp,
    required this.content,
    this.actionButtons,
    this.onTap,
    this.trailing,
    this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ユーザー情報行（PostItemと同じレイアウト）
          Row(
            children: [
              // アバター
              avatar,

              const SizedBox(width: 12),

              // タイトルとサブタイトル
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      subtitle,
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

              // タイムスタンプまたはトレイリング
              if (timestamp != null)
                Text(
                  timestamp!,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).brightness == Brightness.light 
                        ? const Color(0xFF424242) 
                        : const Color(0xFFCCCCCC),
                  ),
                ),
              if (trailing != null) trailing!,
            ],
          ),

          const SizedBox(height: 12),

          // コンテンツ
          Text(
            content, 
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
              color: Theme.of(context).brightness == Brightness.light 
                  ? const Color(0xFF000000) // 純粋な黒
                  : const Color(0xFFF5F5F5),
              fontWeight: FontWeight.w400, // Regular
            ),
          ),

          if (actionButtons != null && actionButtons!.isNotEmpty) ...[
            const SizedBox(height: 16),

            // アクションボタン行
            Row(
              children: [
                ...actionButtons!
                    .expand((widget) => [widget, const SizedBox(width: 24)])
                    .take(actionButtons!.length * 2 - 1),

                const Spacer(),

                // メニュー
                IconButton(
                  icon: Icon(
                    Icons.more_horiz,
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
        ],
      ),
    );
  }
}

/// 通知アイテム
class NotificationItem extends StatelessWidget {
  final String type; // 'like', 'repost', 'follow', 'mention', 'reply'
  final String actorName;
  final String actorHandle;
  final String? actorAvatar;
  final String? postContent;
  final DateTime timestamp;
  final VoidCallback? onTap;

  const NotificationItem({
    super.key,
    required this.type,
    required this.actorName,
    required this.actorHandle,
    this.actorAvatar,
    this.postContent,
    required this.timestamp,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final (icon, color, text) = _getNotificationInfo(context);

    return DeckItem(
      avatar: CircleAvatar(
        radius: 20,
        backgroundImage: actorAvatar != null
            ? NetworkImage(actorAvatar!)
            : null,
        child: actorAvatar == null
            ? Text(
                actorName.substring(0, 1).toUpperCase(),
                style: const TextStyle(fontWeight: FontWeight.bold),
              )
            : null,
      ),
      title: actorName,
      subtitle: '@$actorHandle',
      timestamp: _formatTimestamp(timestamp),
      content: text,
      trailing: Icon(icon, color: color, size: 16),
      onTap: onTap,
      accentColor: color,
    );
  }

  (IconData, Color, String) _getNotificationInfo(BuildContext context) {
    switch (type) {
      case 'like':
        return (
          Icons.favorite_rounded,
          Theme.of(context).colorScheme.likeColor,
          '${AppLocalizations.of(context).notificationLike}${postContent != null ? '\n"$postContent"' : ''}',
        );
      case 'repost':
        return (
          Icons.repeat_rounded,
          Theme.of(context).colorScheme.repostColor,
          '${AppLocalizations.of(context).notificationRepost}${postContent != null ? '\n"$postContent"' : ''}',
        );
      case 'follow':
        return (
          Icons.person_add_rounded,
          Theme.of(context).colorScheme.secondary,
          AppLocalizations.of(context).notificationFollow,
        );
      case 'mention':
        return (
          Icons.alternate_email_rounded,
          Theme.of(context).colorScheme.tertiary,
          '${AppLocalizations.of(context).notificationMention}${postContent != null ? '\n"$postContent"' : ''}',
        );
      case 'reply':
        return (
          Icons.chat_bubble_rounded,
          Theme.of(context).colorScheme.primary,
          '${AppLocalizations.of(context).notificationReply}${postContent != null ? '\n"$postContent"' : ''}',
        );
      default:
        return (
          Icons.notifications_rounded,
          Theme.of(context).colorScheme.onSurfaceVariant,
          AppLocalizations.of(context).notification,
        );
    }
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
}

/// プロフィールポストアイテム
class ProfilePostItem extends StatelessWidget {
  final String authorName;
  final String authorHandle;
  final String? authorAvatar;
  final String content;
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

  const ProfilePostItem({
    super.key,
    required this.authorName,
    required this.authorHandle,
    this.authorAvatar,
    required this.content,
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
    return DeckItem(
      avatar: CircleAvatar(
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
      title: authorName,
      subtitle: '@$authorHandle',
      timestamp: _formatTimestamp(timestamp),
      content: content,
      actionButtons: [
        _buildActionButton(
          context: context,
          icon: Icons.chat_bubble_outline_rounded,
          count: replyCount,
          onTap: onReply,
        ),
        _buildActionButton(
          context: context,
          icon: Icons.repeat_rounded,
          count: repostCount,
          isActive: isReposted,
          activeColor: Theme.of(context).colorScheme.repostColor,
          onTap: onRepost,
        ),
        _buildActionButton(
          context: context,
          icon: isLiked ? Icons.favorite_rounded : Icons.favorite_border_rounded,
          count: likeCount,
          isActive: isLiked,
          activeColor: Theme.of(context).colorScheme.likeColor,
          onTap: onLike,
        ),
      ],
      onTap: onTap,
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
        width: 60,
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
                  style: Theme.of(
                    context,
                  ).textTheme.bodySmall?.copyWith(
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

/// 検索結果アイテム
class SearchResultItem extends StatelessWidget {
  final String type; // 'user', 'post', 'hashtag'
  final String title;
  final String subtitle;
  final String? avatar;
  final String content;
  final String? metadata;
  final VoidCallback? onTap;

  const SearchResultItem({
    super.key,
    required this.type,
    required this.title,
    required this.subtitle,
    this.avatar,
    required this.content,
    this.metadata,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final (icon, color) = _getSearchTypeInfo(context);

    return DeckItem(
      avatar: avatar != null
          ? CircleAvatar(radius: 20, backgroundImage: NetworkImage(avatar!))
          : CircleAvatar(radius: 20, child: Icon(icon, color: color)),
      title: title,
      subtitle: subtitle,
      timestamp: metadata,
      content: content,
      onTap: onTap,
      accentColor: color,
    );
  }

  (IconData, Color) _getSearchTypeInfo(BuildContext context) {
    switch (type) {
      case 'user':
        return (Icons.person, Theme.of(context).colorScheme.primary);
      case 'post':
        return (Icons.article, Theme.of(context).colorScheme.secondary);
      case 'hashtag':
        return (Icons.tag, Theme.of(context).colorScheme.tertiary);
      default:
        return (Icons.search, Theme.of(context).colorScheme.onSurfaceVariant);
    }
  }
}

/// リストアイテム
class ListMemberItem extends StatelessWidget {
  final String name;
  final String handle;
  final String? avatar;
  final String? bio;
  final bool isFollowing;
  final VoidCallback? onFollow;
  final VoidCallback? onTap;

  const ListMemberItem({
    super.key,
    required this.name,
    required this.handle,
    this.avatar,
    this.bio,
    this.isFollowing = false,
    this.onFollow,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return DeckItem(
      avatar: CircleAvatar(
        radius: 20,
        backgroundImage: avatar != null ? NetworkImage(avatar!) : null,
        child: avatar == null
            ? Text(
                name.substring(0, 1).toUpperCase(),
                style: const TextStyle(fontWeight: FontWeight.bold),
              )
            : null,
      ),
      title: name,
      subtitle: '@$handle',
      content: bio ?? AppLocalizations.of(context).noProfileInfo,
      trailing: OutlinedButton(
        onPressed: onFollow,
        child: Text(isFollowing ? AppLocalizations.of(context).following : AppLocalizations.of(context).follow),
      ),
      onTap: onTap,
    );
  }
}
