// Flutter imports:
import 'package:flutter/material.dart';

// Package imports:
import 'package:collection/collection.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Project imports:
import 'package:moodesky/core/providers/auth_provider.dart';
import 'package:moodesky/core/providers/deck_provider.dart';
import 'package:moodesky/core/theme/app_themes.dart';
import 'package:moodesky/features/home/widgets/add_deck_dialog.dart';
import 'package:moodesky/l10n/app_localizations.dart';
import 'package:moodesky/services/database/database.dart';
import 'package:moodesky/shared/widgets/deck_item.dart';
import 'package:moodesky/shared/widgets/post_item.dart';

class DeckLayout extends ConsumerStatefulWidget {
  const DeckLayout({super.key});

  @override
  ConsumerState<DeckLayout> createState() => _DeckLayoutState();
}

class _DeckLayoutState extends ConsumerState<DeckLayout> {
  final ScrollController _scrollController = ScrollController();
  final ScrollController _tabScrollController = ScrollController();
  late PageController _pageController;
  int _selectedTabIndex = 0;

  @override
  void initState() {
    super.initState();
    // 中央付近から開始して循環スワイプを自然にする
    _pageController = PageController(initialPage: 500);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _tabScrollController.dispose();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // 全てのログイン中アカウントのデッキを取得
    final decksAsync = ref.watch(allDecksProvider);

    final screenWidth = MediaQuery.of(context).size.width;

    // Determine layout based on screen size
    return decksAsync.when(
      data: (decks) {
        if (decks.isEmpty) {
          return _buildEmptyState();
        }

        if (screenWidth >= 1200) {
          // Desktop: Multi-column deck layout
          return _buildDesktopLayout(decks);
        } else if (screenWidth >= 600) {
          // Tablet: 2-3 column layout
          return _buildTabletLayout(decks);
        } else {
          // Mobile: Tab bar + PageView for better navigation
          return _buildMobileTabLayout(decks);
        }
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(child: Text(AppLocalizations.of(context).errorOccurred(error.toString()))),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.dashboard,
            size: 80,
            color: Theme.of(
              context,
            ).colorScheme.onSurface.withValues(alpha: 0.3),
          ),
          const SizedBox(height: 16),
          Text(
            AppLocalizations.of(context)!.decksEmptyTitle,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.5),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            AppLocalizations.of(context)!.decksEmptyDescription,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.5),
            ),
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: () {
              showDialog(
                context: context,
                builder: (context) => const AddDeckDialog(),
              );
            },
            icon: const Icon(Icons.add),
            label: Text(AppLocalizations.of(context).addDeckButton),
          ),
        ],
      ),
    );
  }

  Widget _buildDesktopLayout(List<Deck> decks) {
    return Column(
      children: [
        // Tab bar
        _buildTabBar(decks),

        // Selected deck content
        Expanded(child: _buildSelectedDeckContent(decks)),
      ],
    );
  }

  Widget _buildTabletLayout(List<Deck> decks) {
    return Column(
      children: [
        // Tab bar
        _buildTabBar(decks),

        // Selected deck content
        Expanded(child: _buildSelectedDeckContent(decks)),
      ],
    );
  }

  Widget _buildTabBar(List<Deck> decks) {
    return Container(
      height: 48,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          bottom: BorderSide(
            color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
          ),
        ),
      ),
      child: Row(
        children: [
          // Tab scroll view
          Expanded(
            child: SingleChildScrollView(
              controller: _tabScrollController,
              scrollDirection: Axis.horizontal,
              child: Row(
                children: decks.asMap().entries.map((entry) {
                  final index = entry.key;
                  final deck = entry.value;
                  final isSelected = _selectedTabIndex == index;

                  return _buildTab(deck, index, isSelected);
                }).toList(),
              ),
            ),
          ),

          // Add deck button
          SizedBox(
            width: 48,
            child: IconButton(
              icon: const Icon(Icons.add, size: 20),
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (context) => const AddDeckDialog(),
                );
              },
              tooltip: AppLocalizations.of(context).addDeckTooltip,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTab(Deck deck, int index, bool isSelected) {
    final allAccounts = ref.watch(availableAccountsProvider);
    final account = deck.accountDid != null
        ? allAccounts.firstWhereOrNull((a) => a.did == deck.accountDid)
        : null;

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedTabIndex = index;
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeInOut,
        constraints: const BoxConstraints(minWidth: 120, maxWidth: 200),
        margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected
              ? Theme.of(context).colorScheme.primaryContainer
              : Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected
                ? Theme.of(context).colorScheme.primary
                : Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: Theme.of(
                      context,
                    ).colorScheme.primary.withValues(alpha: 0.2),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                    spreadRadius: 1,
                  ),
                ]
              : [
                  BoxShadow(
                    color: Theme.of(
                      context,
                    ).colorScheme.shadow.withValues(alpha: 0.08),
                    blurRadius: 3,
                    offset: const Offset(0, 2),
                  ),
                ],
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                _getDeckIcon(deck.deckType),
                size: 16,
                color: isSelected
                    ? Theme.of(context).colorScheme.primary
                    : Theme.of(
                        context,
                      ).colorScheme.onSurface.withValues(alpha: 0.7),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      deck.title,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontWeight: isSelected
                            ? FontWeight.w600
                            : FontWeight.normal,
                        color: isSelected
                            ? Theme.of(context).colorScheme.primary
                            : Theme.of(context).colorScheme.onSurface,
                      ),
                      overflow: TextOverflow.ellipsis,
                      maxLines: 1,
                    ),
                    if (account != null) ...[
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: _getAccountColor(account.did),
                            ),
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              '@${account.handle}',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                fontSize: 10,
                                color: Theme.of(
                                  context,
                                ).colorScheme.onSurface.withValues(alpha: 0.7),
                                fontWeight: FontWeight.w500,
                              ),
                              overflow: TextOverflow.ellipsis,
                              maxLines: 1,
                            ),
                          ),
                        ],
                      ),
                    ] else if (deck.isCrossAccount) ...[
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Icon(
                            Icons.group,
                            size: 12,
                            color: Theme.of(
                              context,
                            ).colorScheme.onSurface.withValues(alpha: 0.6),
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              'マルチアカウント', // TODO: 多言語化が必要な場合はAppLocalizations.of(context)を使用
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                fontSize: 10,
                                color: Theme.of(
                                  context,
                                ).colorScheme.onSurface.withValues(alpha: 0.6),
                                fontStyle: FontStyle.italic,
                              ),
                              overflow: TextOverflow.ellipsis,
                              maxLines: 1,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              // Close button
              GestureDetector(
                onTap: () {
                  // TODO: Close deck
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(AppLocalizations.of(context).closeDeckFeature)),
                  );
                },
                child: Padding(
                  padding: const EdgeInsets.all(2),
                  child: Icon(
                    Icons.close,
                    size: 14,
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSelectedDeckContent(List<Deck> decks) {
    if (decks.isEmpty || _selectedTabIndex >= decks.length) {
      return _buildEmptyState();
    }

    final selectedDeck = decks[_selectedTabIndex];

    return Container(
      margin: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border.all(
          color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          // Compact deck header with account info
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainer,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(8),
                topRight: Radius.circular(8),
              ),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Icon(_getDeckIcon(selectedDeck.deckType), size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        selectedDeck.title,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.more_vert, size: 18),
                      onPressed: () {
                        // TODO: Show deck options
                      },
                      constraints: const BoxConstraints(
                        minWidth: 32,
                        minHeight: 32,
                      ),
                      padding: const EdgeInsets.all(4),
                    ),
                  ],
                ),
                // Account information row
                _buildDeckAccountInfo(selectedDeck),
              ],
            ),
          ),

          // Deck content
          Expanded(child: _buildDeckContent(selectedDeck)),
        ],
      ),
    );
  }

  Widget _buildMobileTabLayout(List<Deck> decks) {
    return Column(
      children: [
        // Mobile tab bar
        _buildMobileTabBar(decks),

        // PageView for deck content with infinite scrolling
        Expanded(
          child: PageView.builder(
            controller: _pageController,
            itemCount: decks.length * 1000, // 実質無限スクロール用の大きな数値
            onPageChanged: (virtualIndex) {
              final realIndex = virtualIndex % decks.length;
              setState(() {
                _selectedTabIndex = realIndex;
              });
              // Auto-scroll tab bar to keep selected tab visible
              _scrollTabToVisible(realIndex);
            },
            itemBuilder: (context, virtualIndex) {
              final realIndex = virtualIndex % decks.length;
              final deck = decks[realIndex];
              return _buildMobileDeckPage(deck, realIndex, decks.length);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildMobileTabBar(List<Deck> decks) {
    return Container(
      height: 44,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          bottom: BorderSide(
            color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
          ),
        ),
      ),
      child: Row(
        children: [
          // Tab scroll view
          Expanded(
            child: SingleChildScrollView(
              controller: _tabScrollController,
              scrollDirection: Axis.horizontal,
              child: Row(
                children: decks.asMap().entries.map((entry) {
                  final index = entry.key;
                  final deck = entry.value;
                  final isSelected = _selectedTabIndex == index;

                  return _buildMobileTab(deck, index, isSelected, decks);
                }).toList(),
              ),
            ),
          ),

          // Add deck button
          SizedBox(
            width: 44,
            child: IconButton(
              icon: const Icon(Icons.add, size: 18),
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (context) => const AddDeckDialog(),
                );
              },
              tooltip: AppLocalizations.of(context).addDeckTooltip,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMobileTab(
    Deck deck,
    int index,
    bool isSelected,
    List<Deck> allDecks,
  ) {
    final allAccounts = ref.watch(availableAccountsProvider);
    final account = deck.accountDid != null
        ? allAccounts.firstWhereOrNull((a) => a.did == deck.accountDid)
        : null;

    // Create tooltip text with deck title and account info
    String tooltipText = deck.title;
    if (account != null) {
      tooltipText += '\n@${account.handle}';
    }

    return Tooltip(
      message: tooltipText,
      preferBelow: false,
      child: GestureDetector(
        onTap: () {
          setState(() {
            _selectedTabIndex = index;
          });
          // 循環スワイプ対応のページ移動
          final currentVirtualIndex = (_pageController.page?.round() ?? 500)
              .toInt();
          final currentRealIndex = currentVirtualIndex % allDecks.length;
          final targetVirtualIndex =
              currentVirtualIndex - currentRealIndex + index;

          _pageController.animateToPage(
            targetVirtualIndex,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeInOut,
          );
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeInOut,
          width: 48,
          margin: const EdgeInsets.symmetric(horizontal: 2, vertical: 4),
          decoration: BoxDecoration(
            color: isSelected
                ? Theme.of(context).colorScheme.primaryContainer
                : Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected
                  ? Theme.of(context).colorScheme.primary
                  : Theme.of(
                      context,
                    ).colorScheme.outline.withValues(alpha: 0.2),
              width: isSelected ? 2 : 1,
            ),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: Theme.of(
                        context,
                      ).colorScheme.primary.withValues(alpha: 0.25),
                      blurRadius: 6,
                      offset: const Offset(0, 3),
                      spreadRadius: 1,
                    ),
                  ]
                : [
                    BoxShadow(
                      color: Theme.of(
                        context,
                      ).colorScheme.shadow.withValues(alpha: 0.1),
                      blurRadius: 2,
                      offset: const Offset(0, 1),
                    ),
                  ],
          ),
          child: Center(
            child: AnimatedScale(
              scale: isSelected ? 1.1 : 1.0,
              duration: const Duration(milliseconds: 200),
              curve: Curves.easeInOut,
              child: Icon(
                _getDeckIcon(deck.deckType),
                size: 20,
                color: isSelected
                    ? Theme.of(context).colorScheme.primary
                    : Theme.of(
                        context,
                      ).colorScheme.onSurface.withValues(alpha: 0.7),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMobileDeckPage(Deck deck, int index, int totalDecks) {
    return Container(
      margin: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border.all(
          color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          // Compact deck header with page indicator and account info
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainer,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(8),
                topRight: Radius.circular(8),
              ),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Icon(_getDeckIcon(deck.deckType), size: 16),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        deck.title,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                      ),
                    ),
                    // Compact page indicator
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 4,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: Theme.of(
                          context,
                        ).colorScheme.outline.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '${index + 1}/$totalDecks',
                        style: Theme.of(
                          context,
                        ).textTheme.bodySmall?.copyWith(fontSize: 10),
                      ),
                    ),
                    const SizedBox(width: 4),
                    IconButton(
                      icon: const Icon(Icons.more_vert, size: 16),
                      onPressed: () {
                        // TODO: Show deck options
                      },
                      constraints: const BoxConstraints(
                        minWidth: 28,
                        minHeight: 28,
                      ),
                      padding: const EdgeInsets.all(2),
                    ),
                  ],
                ),
                // Account information row for mobile
                _buildDeckAccountInfo(deck, isMobile: true),
              ],
            ),
          ),

          // Deck content
          Expanded(child: _buildDeckContent(deck)),
        ],
      ),
    );
  }

  void _scrollTabToVisible(int index) {
    // Calculate exact tab width for icon-only tabs
    const double tabWidth = 48.0; // Fixed width for icon-only tabs
    final double targetOffset =
        index * tabWidth - (MediaQuery.of(context).size.width / 4);

    _tabScrollController.animateTo(
      targetOffset.clamp(0.0, _tabScrollController.position.maxScrollExtent),
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  IconData _getDeckIcon(String deckType) {
    switch (deckType) {
      case 'home':
        return Icons.home;
      case 'notifications':
        return Icons.notifications;
      case 'search':
        return Icons.search;
      case 'list':
        return Icons.list;
      case 'profile':
        return Icons.person;
      case 'thread':
        return Icons.forum;
      case 'custom_feed':
        return Icons.rss_feed;
      case 'local':
        return Icons.people;
      case 'hashtag':
        return Icons.tag;
      case 'mentions':
        return Icons.alternate_email;
      default:
        return Icons.dashboard;
    }
  }

  Widget _buildDeckContent(Deck deck) {
    switch (deck.deckType) {
      case 'home':
        return const PostListDemo();
      case 'notifications':
        return _buildNotificationsList();
      case 'profile':
        return _buildProfilePostsList();
      case 'search':
        return _buildSearchResults();
      case 'list':
        return _buildListMembers();
      case 'thread':
        return _buildThreadView();
      case 'custom_feed':
        return _buildCustomFeedList();
      case 'local':
        return _buildLocalTimelineList();
      case 'hashtag':
        return _buildHashtagList();
      case 'mentions':
        return _buildMentionsList();
      default:
        return _buildGenericDeckContent(deck);
    }
  }

  Widget _buildNotificationsList() {
    final postStyle = PostItemStyle(context);

    final notifications = [
      NotificationItem(
        type: 'like',
        actorName: 'Alice Johnson',
        actorHandle: 'alice.bsky.social',
        postContent: 'MoodeSkyのテーマシステムが完成しました！',
        timestamp: DateTime.now().subtract(const Duration(minutes: 30)),
      ),
      NotificationItem(
        type: 'repost',
        actorName: 'Bob Wilson',
        actorHandle: 'bob.dev',
        postContent: 'デッキインターフェースが使いやすいです',
        timestamp: DateTime.now().subtract(const Duration(hours: 1)),
      ),
      NotificationItem(
        type: 'follow',
        actorName: 'Charlie Brown',
        actorHandle: 'charlie.bsky.social',
        timestamp: DateTime.now().subtract(const Duration(hours: 2)),
      ),
      NotificationItem(
        type: 'mention',
        actorName: 'Diana Prince',
        actorHandle: 'diana.social',
        postContent: '@moodesky.dev いいアプリですね！',
        timestamp: DateTime.now().subtract(const Duration(hours: 4)),
      ),
      NotificationItem(
        type: 'reply',
        actorName: 'Eve Smith',
        actorHandle: 'eve.bsky.social',
        postContent: 'ありがとうございます！引き続き改善していきます',
        timestamp: DateTime.now().subtract(const Duration(days: 1)),
      ),
    ];

    return ListView.builder(
      itemCount: notifications.length,
      itemBuilder: (context, index) {
        final notification = notifications[index];
        return postStyle.buildPostContainer(
          showTopBorder: index > 0,
          child: notification,
        );
      },
    );
  }

  Widget _buildProfilePostsList() {
    final postStyle = PostItemStyle(context);

    final profilePosts = [
      ProfilePostItem(
        authorName: 'MoodeSky Dev',
        authorHandle: 'moodesky.bsky.social',
        content: 'MoodeSkyの新機能開発中です。マルチアカウント機能がとても便利になりました！',
        timestamp: DateTime.now().subtract(const Duration(hours: 3)),
        likeCount: 45,
        repostCount: 12,
        replyCount: 8,
      ),
      ProfilePostItem(
        authorName: 'MoodeSky Dev',
        authorHandle: 'moodesky.bsky.social',
        content: 'デッキベースのUIで複数のタイムラインを同時に確認できます。デスクトップでは最大8列まで表示可能！',
        timestamp: DateTime.now().subtract(const Duration(days: 1)),
        likeCount: 67,
        repostCount: 23,
        replyCount: 15,
        isLiked: true,
      ),
      ProfilePostItem(
        authorName: 'MoodeSky Dev',
        authorHandle: 'moodesky.bsky.social',
        content: 'ダークテーマとライトテーマの切り替えがスムーズになりました。夕焼けのオレンジアクセントが美しいです 🌅',
        timestamp: DateTime.now().subtract(const Duration(days: 2)),
        likeCount: 89,
        repostCount: 31,
        replyCount: 22,
        isReposted: true,
      ),
    ];

    return ListView.builder(
      itemCount: profilePosts.length,
      itemBuilder: (context, index) {
        final post = profilePosts[index];
        return postStyle.buildPostContainer(
          showTopBorder: index > 0,
          child: post,
        );
      },
    );
  }

  Widget _buildSearchResults() {
    final postStyle = PostItemStyle(context);

    final searchResults = [
      SearchResultItem(
        type: 'user',
        title: 'Alice Johnson',
        subtitle: '@alice.bsky.social',
        content: 'UI/UX デザイナー。美しいアプリデザインが好き。MoodeSkyのファンです！',
        metadata: '1.2Kフォロワー',
      ),
      SearchResultItem(
        type: 'post',
        title: 'Bob Wilson',
        subtitle: '@bob.dev',
        content: 'MoodeSkyのマルチアカウント機能が素晴らしい。仕事用とプライベート用のアカウントを簡単に切り替えられる。',
        metadata: '2時間前',
      ),
      SearchResultItem(
        type: 'hashtag',
        title: '#MoodeSky',
        subtitle: 'トレンド',
        content: 'MoodeSkyに関する最新の投稿とディスカッション',
        metadata: '234件の投稿',
      ),
      SearchResultItem(
        type: 'user',
        title: 'Charlie Brown',
        subtitle: '@charlie.bsky.social',
        content: 'ソフトウェア開発者。オープンソースプロジェクトに貢献しています。',
        metadata: '856フォロワー',
      ),
    ];

    return ListView.builder(
      itemCount: searchResults.length,
      itemBuilder: (context, index) {
        final result = searchResults[index];
        return postStyle.buildPostContainer(
          showTopBorder: index > 0,
          child: result,
        );
      },
    );
  }

  Widget _buildListMembers() {
    final postStyle = PostItemStyle(context);

    final listMembers = [
      ListMemberItem(
        name: 'Diana Prince',
        handle: 'diana.social',
        bio: 'グラフィックデザイナー。ブランディングとUI/UXデザインを専門としています。',
        isFollowing: true,
      ),
      ListMemberItem(
        name: 'Eve Smith',
        handle: 'eve.bsky.social',
        bio: 'フロントエンド開発者。React、Flutter、Vue.jsが得意です。',
        isFollowing: false,
      ),
      ListMemberItem(
        name: 'Frank Miller',
        handle: 'frank.dev',
        bio: 'バックエンド開発者。Node.js、Python、Goでサーバーサイド開発をしています。',
        isFollowing: true,
      ),
      ListMemberItem(
        name: 'Grace Hopper',
        handle: 'grace.tech',
        bio: 'データサイエンティスト。機械学習とAIの研究をしています。',
        isFollowing: false,
      ),
    ];

    return ListView.builder(
      itemCount: listMembers.length,
      itemBuilder: (context, index) {
        final member = listMembers[index];
        return postStyle.buildPostContainer(
          showTopBorder: index > 0,
          child: member,
        );
      },
    );
  }

  Widget _buildThreadView() {
    // Thread view is similar to profile posts but shows conversation flow
    return _buildProfilePostsList();
  }

  Widget _buildCustomFeedList() {
    // Custom feed shows curated posts - similar to home timeline
    return const PostListDemo();
  }

  Widget _buildLocalTimelineList() {
    // Local timeline shows server-specific posts - similar to home timeline
    return const PostListDemo();
  }

  Widget _buildHashtagList() {
    // Hashtag timeline shows hashtag-filtered posts - similar to home timeline
    return const PostListDemo();
  }

  Widget _buildMentionsList() {
    // Mentions are similar to notifications but specifically for mentions
    return _buildNotificationsList();
  }

  Widget _buildGenericDeckContent(Deck deck) {
    final postStyle = PostItemStyle(context);

    // Generic fallback for unknown deck types
    return ListView.builder(
      itemCount: 5,
      itemBuilder: (context, index) {
        return postStyle.buildPostContainer(
          showTopBorder: index > 0,
          child: DeckItem(
            avatar: CircleAvatar(
              radius: 20,
              child: Icon(_getDeckIcon(deck.deckType)),
            ),
            title: '${deck.title} Item ${index + 1}',
            subtitle: 'サンプルコンテンツ',
            content: 'This is placeholder content for the ${deck.title} deck.',
            timestamp: '${index + 1}時間前',
          ),
        );
      },
    );
  }

  /// デッキのアカウント情報表示ウィジェットを構築
  Widget _buildDeckAccountInfo(Deck deck, {bool isMobile = false}) {
    final allAccounts = ref.watch(availableAccountsProvider);
    final account = deck.accountDid != null
        ? allAccounts.firstWhereOrNull((a) => a.did == deck.accountDid)
        : null;

    // アカウント情報がない場合は空のウィジェットを返す
    if (account == null && !deck.isCrossAccount) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.only(top: 4),
      child: Row(
        children: [
          // アカウントインジケーター
          if (account != null) ...[
            Container(
              width: isMobile ? 8 : 10,
              height: isMobile ? 8 : 10,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _getAccountColor(account.did),
              ),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                '@${account.handle}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontSize: isMobile ? 10 : 11,
                  color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7),
                  fontWeight: FontWeight.w500,
                ),
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
              ),
            ),
          ] else if (deck.isCrossAccount) ...[
            Icon(
              Icons.group,
              size: isMobile ? 10 : 12,
              color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                'マルチアカウント', // TODO: 多言語化が必要な場合はAppLocalizations.of(context)を使用
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontSize: isMobile ? 10 : 11,
                  color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
                  fontStyle: FontStyle.italic,
                ),
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// アカウントごとの識別カラーを取得
  Color _getAccountColor(String accountDid) {
    final colors = [
      Theme.of(context).colorScheme.primary,
      Theme.of(context).colorScheme.secondary,
      Theme.of(context).colorScheme.tertiary,
      Colors.green,
      Colors.orange,
      Colors.purple,
      Colors.teal,
      Colors.pink,
    ];
    
    // accountDidのハッシュコードを使用してカラーを決定
    final index = accountDid.hashCode.abs() % colors.length;
    return colors[index];
  }

}
