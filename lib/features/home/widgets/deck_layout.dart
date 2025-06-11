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
import 'package:moodesky/features/home/widgets/bluesky_timeline_widget.dart';
import 'package:moodesky/l10n/app_localizations.dart';
import 'package:moodesky/services/database/database.dart';
import 'package:moodesky/shared/widgets/deck_item.dart';
import 'package:moodesky/shared/widgets/post_item.dart';
import 'package:moodesky/shared/widgets/timeline_widget.dart';

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
      error: (error, stack) => Center(
        child: Text(
          AppLocalizations.of(context).errorOccurred(error.toString()),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.dashboard_rounded,
            size: 80,
            color: Theme.of(
              context,
            ).colorScheme.onSurface.withValues(alpha: 0.3),
          ),
          const SizedBox(height: 16),
          Text(
            AppLocalizations.of(context).decksEmptyTitle,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.5),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            AppLocalizations.of(context).decksEmptyDescription,
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
            icon: const Icon(Icons.add_rounded),
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
              padding: const EdgeInsets.only(left: 12), // 左側に余白を追加
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
              icon: const Icon(Icons.add_rounded, size: 20),
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
    final activeAccount = ref.watch(activeAccountProvider);

    // デッキに関連付けられたアカウントを取得
    var account = deck.accountDid != null
        ? allAccounts.firstWhereOrNull((a) => a.did == deck.accountDid)
        : null;

    // 対応するアカウントが見つからない場合はアクティブアカウントを使用
    account ??= activeAccount;

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
                          // アバターアイコン（タブ用適切サイズ）
                          if (account.avatar != null) ...[
                            CircleAvatar(
                              radius: 8,
                              backgroundImage: NetworkImage(account.avatar!),
                            ),
                          ] else ...[
                            CircleAvatar(
                              radius: 8,
                              backgroundColor: _getAccountColor(account.did),
                              child: Text(
                                account.displayName
                                        ?.substring(0, 1)
                                        .toUpperCase() ??
                                    account.handle
                                        .substring(0, 1)
                                        .toUpperCase(),
                                style: const TextStyle(
                                  fontSize: 8,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ],
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              '@${account.handle}',
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(
                                    fontSize: 10,
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurface
                                        .withValues(alpha: 0.7),
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
                            Icons.group_rounded,
                            size: 12,
                            color: Theme.of(
                              context,
                            ).colorScheme.onSurface.withValues(alpha: 0.6),
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              AppLocalizations.of(context).multiAccount,
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(
                                    fontSize: 10,
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurface
                                        .withValues(alpha: 0.6),
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
                    SnackBar(
                      content: Text(
                        AppLocalizations.of(context).closeDeckFeature,
                      ),
                    ),
                  );
                },
                child: Padding(
                  padding: const EdgeInsets.all(2),
                  child: Icon(
                    Icons.close_rounded,
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
          // Compact deck header - single line with proper touch targets
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainer,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(8),
                topRight: Radius.circular(8),
              ),
            ),
            child: Row(
              children: [
                // アカウントアバター（適切なサイズ）
                _buildCompactAccountAvatar(selectedDeck),
                if (_hasAccountInfo(selectedDeck)) const SizedBox(width: 8),

                // デッキタイプアイコン
                Icon(_getDeckIcon(selectedDeck.deckType), size: 16),
                const SizedBox(width: 8),

                // ワンライナーのラベル
                Expanded(
                  child: Text(
                    _buildCompactDeckLabel(selectedDeck),
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                  ),
                ),

                // メニューボタン（タップしやすいサイズ）
                SizedBox(
                  width: 40,
                  height: 40,
                  child: PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert_rounded, size: 18),
                    tooltip: AppLocalizations.of(context).deckOptions,
                    padding: const EdgeInsets.all(8),
                    onSelected: (value) =>
                        _handleDeckMenuAction(value, selectedDeck),
                    itemBuilder: (context) => [
                      PopupMenuItem<String>(
                        value: 'moveLeft',
                        enabled: _selectedTabIndex > 0,
                        child: Row(
                          children: [
                            const Icon(Icons.arrow_back_rounded, size: 18),
                            const SizedBox(width: 12),
                            Text(AppLocalizations.of(context).moveDeckLeft),
                          ],
                        ),
                      ),
                      PopupMenuItem<String>(
                        value: 'moveRight',
                        enabled: _selectedTabIndex < decks.length - 1,
                        child: Row(
                          children: [
                            const Icon(Icons.arrow_forward_rounded, size: 18),
                            const SizedBox(width: 12),
                            Text(AppLocalizations.of(context).moveDeckRight),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      PopupMenuItem<String>(
                        value: 'settings',
                        child: Row(
                          children: [
                            const Icon(Icons.settings_rounded, size: 18),
                            const SizedBox(width: 12),
                            Text(AppLocalizations.of(context).deckSettings),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      PopupMenuItem<String>(
                        value: 'delete',
                        child: Row(
                          children: [
                            Icon(
                              Icons.delete_rounded,
                              size: 18,
                              color: Theme.of(context).colorScheme.error,
                            ),
                            const SizedBox(width: 12),
                            Text(
                              AppLocalizations.of(context).deleteDeck,
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.error,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
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
              padding: const EdgeInsets.only(left: 8), // モバイルは少し狭めの余白
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
              icon: const Icon(Icons.add_rounded, size: 18),
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
    final activeAccount = ref.watch(activeAccountProvider);

    // デッキに関連付けられたアカウントを取得
    var account = deck.accountDid != null
        ? allAccounts.firstWhereOrNull((a) => a.did == deck.accountDid)
        : null;

    // 対応するアカウントが見つからない場合はアクティブアカウントを使用
    account ??= activeAccount;

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
          // Mobile deck header - single line with touch-friendly controls
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainer,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(8),
                topRight: Radius.circular(8),
              ),
            ),
            child: Row(
              children: [
                // アカウントアバター（モバイル適切サイズ）
                _buildCompactAccountAvatar(deck, isUltraCompact: true),
                if (_hasAccountInfo(deck)) const SizedBox(width: 6),

                // デッキタイプアイコン
                Icon(_getDeckIcon(deck.deckType), size: 14),
                const SizedBox(width: 6),

                // ワンライナーのラベル
                Expanded(
                  child: Text(
                    _buildCompactDeckLabel(deck),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                  ),
                ),

                // ページインジケーター（コンパクト）
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
                    ).textTheme.bodySmall?.copyWith(fontSize: 9),
                  ),
                ),
                const SizedBox(width: 6),

                // メニューボタン（モバイルタップ対応）
                SizedBox(
                  width: 36,
                  height: 36,
                  child: PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert_rounded, size: 16),
                    tooltip: AppLocalizations.of(context).deckOptions,
                    padding: const EdgeInsets.all(6),
                    onSelected: (value) => _handleDeckMenuAction(value, deck),
                    itemBuilder: (context) => [
                      PopupMenuItem<String>(
                        value: 'moveLeft',
                        enabled: index > 0,
                        child: Row(
                          children: [
                            const Icon(Icons.arrow_back_rounded, size: 16),
                            const SizedBox(width: 12),
                            Text(AppLocalizations.of(context).moveDeckLeft),
                          ],
                        ),
                      ),
                      PopupMenuItem<String>(
                        value: 'moveRight',
                        enabled: index < totalDecks - 1,
                        child: Row(
                          children: [
                            const Icon(Icons.arrow_forward_rounded, size: 16),
                            const SizedBox(width: 12),
                            Text(AppLocalizations.of(context).moveDeckRight),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      PopupMenuItem<String>(
                        value: 'settings',
                        child: Row(
                          children: [
                            const Icon(Icons.settings_rounded, size: 16),
                            const SizedBox(width: 12),
                            Text(AppLocalizations.of(context).deckSettings),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      PopupMenuItem<String>(
                        value: 'delete',
                        child: Row(
                          children: [
                            Icon(
                              Icons.delete_rounded,
                              size: 16,
                              color: Theme.of(context).colorScheme.error,
                            ),
                            const SizedBox(width: 12),
                            Text(
                              AppLocalizations.of(context).deleteDeck,
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.error,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
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
        return Icons.home_rounded;
      case 'notifications':
        return Icons.notifications_rounded;
      case 'search':
        return Icons.search_rounded;
      case 'list':
        return Icons.list_rounded;
      case 'profile':
        return Icons.person_rounded;
      case 'thread':
        return Icons.forum_rounded;
      case 'custom_feed':
        return Icons.tag_rounded;
      case 'local':
        return Icons.people_rounded;
      case 'hashtag':
        return Icons.tag_rounded;
      case 'mentions':
        return Icons.alternate_email_rounded;
      default:
        return Icons.dashboard_rounded;
    }
  }

  Widget _buildDeckContent(Deck deck) {
    switch (deck.deckType) {
      case 'home':
        return deck.accountDid != null 
          ? BlueskyTimelineWidget(accountDid: deck.accountDid!)
          : const Center(child: Text('No account selected'));
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
        return _buildCustomFeedList(deck);
      case 'local':
        return _buildLocalTimelineList(deck);
      case 'hashtag':
        return _buildHashtagList(deck);
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
        return postStyle.buildPostContainer(child: notification);
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
        return postStyle.buildPostContainer(child: post);
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
        return postStyle.buildPostContainer(child: result);
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
        return postStyle.buildPostContainer(child: member);
      },
    );
  }

  Widget _buildThreadView() {
    // Thread view is similar to profile posts but shows conversation flow
    return _buildProfilePostsList();
  }

  Widget _buildCustomFeedList(Deck deck) {
    // Custom feed shows curated posts - similar to home timeline
    return TimelineWidget(accountDid: deck.accountDid);
  }

  Widget _buildLocalTimelineList(Deck deck) {
    // Local timeline shows server-specific posts - similar to home timeline
    return TimelineWidget(accountDid: deck.accountDid);
  }

  Widget _buildHashtagList(Deck deck) {
    // Hashtag timeline shows hashtag-filtered posts - similar to home timeline
    return TimelineWidget(accountDid: deck.accountDid);
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

  /// デッキタイプの日本語名を取得
  String _getDeckTypeName(String deckType) {
    switch (deckType) {
      case 'home':
        return AppLocalizations.of(context).deckTypeHome;
      case 'notifications':
        return AppLocalizations.of(context).deckTypeNotifications;
      case 'search':
        return AppLocalizations.of(context).deckTypeSearch;
      case 'list':
        return AppLocalizations.of(context).deckTypeList;
      case 'profile':
        return AppLocalizations.of(context).deckTypeProfile;
      case 'thread':
        return AppLocalizations.of(context).deckTypeThread;
      case 'custom_feed':
        return AppLocalizations.of(context).deckTypeCustomFeed;
      case 'local':
        return AppLocalizations.of(context).deckTypeLocal;
      case 'hashtag':
        return AppLocalizations.of(context).deckTypeHashtag;
      case 'mentions':
        return AppLocalizations.of(context).deckTypeMentions;
      default:
        return AppLocalizations.of(context).deckTypeCustom;
    }
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

  /// コンパクトなアカウントアバターを構築（アイキャッチとして適切なサイズ）
  Widget _buildCompactAccountAvatar(Deck deck, {bool isUltraCompact = false}) {
    final allAccounts = ref.watch(availableAccountsProvider);
    final activeAccount = ref.watch(activeAccountProvider);

    // デッキに関連付けられたアカウントを取得
    // accountDidが指定されていて、有効なアカウントに対応する場合はそれを使用
    // そうでなければアクティブアカウントを使用
    var account = deck.accountDid != null
        ? allAccounts.firstWhereOrNull((a) => a.did == deck.accountDid)
        : null;

    // 対応するアカウントが見つからない場合はアクティブアカウントを使用
    account ??= activeAccount;

    // アイキャッチとして少し大きめに調整
    final radius = isUltraCompact ? 10.0 : 12.0;
    final fontSize = isUltraCompact ? 10.0 : 12.0;
    final iconSize = isUltraCompact ? 12.0 : 14.0;

    if (account != null) {
      if (account.avatar != null) {
        return CircleAvatar(
          radius: radius,
          backgroundImage: NetworkImage(account.avatar!),
        );
      } else {
        return CircleAvatar(
          radius: radius,
          backgroundColor: _getAccountColor(account.did),
          child: Text(
            account.displayName?.substring(0, 1).toUpperCase() ??
                account.handle.substring(0, 1).toUpperCase(),
            style: TextStyle(
              fontSize: fontSize,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        );
      }
    } else if (deck.isCrossAccount) {
      return CircleAvatar(
        radius: radius,
        backgroundColor: Theme.of(context).colorScheme.primary,
        child: Icon(Icons.group_rounded, size: iconSize, color: Colors.white),
      );
    }

    return const SizedBox.shrink();
  }

  /// アカウント情報があるかチェック
  bool _hasAccountInfo(Deck deck) {
    if (deck.isCrossAccount) return true;

    final allAccounts = ref.watch(availableAccountsProvider);
    final activeAccount = ref.watch(activeAccountProvider);

    // デッキに関連付けられたアカウントを取得
    var account = deck.accountDid != null
        ? allAccounts.firstWhereOrNull((a) => a.did == deck.accountDid)
        : null;

    // 対応するアカウントが見つからない場合はアクティブアカウントを使用
    account ??= activeAccount;

    return account != null;
  }

  /// コンパクトなデッキラベルを構築
  String _buildCompactDeckLabel(Deck deck) {
    final allAccounts = ref.watch(availableAccountsProvider);
    final activeAccount = ref.watch(activeAccountProvider);

    // デッキに関連付けられたアカウントを取得
    var account = deck.accountDid != null
        ? allAccounts.firstWhereOrNull((a) => a.did == deck.accountDid)
        : null;

    // 対応するアカウントが見つからない場合はアクティブアカウントを使用
    account ??= activeAccount;

    final deckTypeName = _getDeckTypeName(deck.deckType);

    if (account != null) {
      return '$deckTypeName • @${account.handle}';
    } else if (deck.isCrossAccount) {
      return '$deckTypeName • ${AppLocalizations.of(context).multiAccount}';
    } else {
      return deckTypeName;
    }
  }

  /// デッキメニューアクションを処理
  Future<void> _handleDeckMenuAction(String action, Deck deck) async {
    switch (action) {
      case 'moveLeft':
        await _moveDeck(deck, -1);
        break;
      case 'moveRight':
        await _moveDeck(deck, 1);
        break;
      case 'settings':
        _showDeckSettings(deck);
        break;
      case 'delete':
        await _confirmAndDeleteDeck(deck);
        break;
    }
  }

  /// デッキを移動
  Future<void> _moveDeck(Deck deck, int direction) async {
    try {
      final decks = await ref.read(allDecksFutureProvider.future);
      final currentIndex = decks.indexWhere((d) => d.deckId == deck.deckId);

      if (currentIndex == -1) return;

      final newIndex = currentIndex + direction;
      if (newIndex < 0 || newIndex >= decks.length) return;

      // 隣接するデッキと位置を入れ替え
      final orderUpdater = ref.read(deckOrderUpdaterProvider);
      final currentOrder = deck.deckOrder;
      final adjacentDeck = decks[newIndex];
      final adjacentOrder = adjacentDeck.deckOrder;

      // 位置を交換
      await orderUpdater.updateOrder(deck.deckId, adjacentOrder);
      await orderUpdater.updateOrder(adjacentDeck.deckId, currentOrder);

      // 新しい位置にタブを移動
      setState(() {
        _selectedTabIndex = newIndex;
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            direction < 0
                ? AppLocalizations.of(context).deckMovedLeft
                : AppLocalizations.of(context).deckMovedRight,
          ),
          duration: const Duration(seconds: 1),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppLocalizations.of(context).deckMoveError),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    }
  }

  /// デッキ設定を表示
  void _showDeckSettings(Deck deck) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(AppLocalizations.of(context).deckSettingsComingSoon),
      ),
    );
  }

  /// デッキの削除確認と実行
  Future<void> _confirmAndDeleteDeck(Deck deck) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(AppLocalizations.of(context).deleteDeckTitle),
        content: Text(
          AppLocalizations.of(context).deleteDeckConfirm(deck.title),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(AppLocalizations.of(context).cancelButton),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            child: Text(AppLocalizations.of(context).deleteButton),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      final deleter = ref.read(deckDeleterProvider);
      await deleter.deleteDeck(deck.deckId);

      // 削除後、選択インデックスを調整
      if (_selectedTabIndex > 0) {
        setState(() {
          _selectedTabIndex--;
        });
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            AppLocalizations.of(context).deckDeletedSuccess(deck.title),
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AppLocalizations.of(context).deckDeleteError),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    }
  }
}
