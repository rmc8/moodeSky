// Flutter imports:
import 'package:flutter/material.dart';

// Package imports:
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Project imports:
import 'package:moodesky/core/providers/deck_provider.dart';
import 'package:moodesky/features/home/widgets/add_deck_dialog.dart';
import 'package:moodesky/services/database/database.dart';

// Modular deck layout components
import 'deck_layout/deck_layout_exports.dart';

class DeckLayout extends ConsumerStatefulWidget {
  const DeckLayout({super.key});

  @override
  ConsumerState<DeckLayout> createState() => _DeckLayoutState();
}

class _DeckLayoutState extends ConsumerState<DeckLayout> {
  int _selectedTabIndex = 0;

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
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

        if (screenWidth >= 600) {
          // Desktop/Tablet: Use tab bar layout
          return _buildDesktopTabletLayout(decks);
        } else {
          // Mobile: Use mobile-specific layout
          return _buildMobileLayout(decks);
        }
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(
        child: Text(
          'Error: ${error.toString()}',
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
            'No decks available',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.5),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Add a deck to get started',
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
            label: const Text('Add Deck'),
          ),
        ],
      ),
    );
  }

  Widget _buildDesktopTabletLayout(List<Deck> decks) {
    return Column(
      children: [
        // Tab bar using modular component
        DeckTabBar(
          decks: decks,
          selectedTabIndex: _selectedTabIndex,
          onTabSelected: _onTabSelected,
          onDeckMoved: _onDeckMoved,
        ),

        // Selected deck content
        Expanded(child: _buildSelectedDeckContent(decks)),
      ],
    );
  }

  Widget _buildMobileLayout(List<Deck> decks) {
    return MobileLayout(
      decks: decks,
      selectedTabIndex: _selectedTabIndex,
      onTabSelected: _onTabSelected,
      onDeckMoved: _onDeckMoved,
      buildDeckContent: _buildDeckContent,
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
          // Tab scroll view with drag & drop support
          Expanded(
            child: ReorderableListView.builder(
              scrollController: _tabScrollController,
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.only(left: 12),
              itemCount: decks.length,
              onReorder: (oldIndex, newIndex) {
                _onDeckMoved(oldIndex, newIndex, decks);
              },
              itemBuilder: (context, index) {
                final deck = decks[index];
                final isSelected = _selectedTabIndex == index;
                
                return ReorderableDragStartListener(
                  key: ValueKey(deck.deckId),
                  index: index,
                  child: _buildTab(deck, index, isSelected),
                );
              },
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
              tooltip: 'Add Deck',
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
                child: _buildTabContent(context, deck, account, isSelected),
              ),
              // Close button
              GestureDetector(
                onTap: () {
                  _deleteDeck(deck);
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

  Widget _buildTabContent(BuildContext context, Deck deck, UserProfile? account, bool isSelected) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          deck.title,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
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
                    account.displayName?.substring(0, 1).toUpperCase() ??
                        account.handle.substring(0, 1).toUpperCase(),
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
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
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
                  'Multi-account',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
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
          // Deck header
          _buildDeckHeader(selectedDeck, decks),
          // Deck content
          Expanded(child: _buildDeckContent(selectedDeck)),
        ],
      ),
    );
  }

  Widget _buildDeckHeader(Deck deck, List<Deck> allDecks) {
    return Container(
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
          // アカウントアバター
          _buildCompactAccountAvatar(deck),
          if (_hasAccountInfo(deck)) const SizedBox(width: 8),

          // デッキタイプアイコン
          Icon(_getDeckIcon(deck.deckType), size: 16),
          const SizedBox(width: 8),

          // デッキラベル
          Expanded(
            child: Text(
              _buildCompactDeckLabel(deck),
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
            ),
          ),

          // メニューボタン
          _buildDeckMenuButton(deck, allDecks),
        ],
      ),
    );
  }

  Widget _buildCompactAccountAvatar(Deck deck, {bool isUltraCompact = false}) {
    final allAccounts = ref.watch(availableAccountsProvider);
    final account = deck.accountDid != null
        ? allAccounts.firstWhereOrNull((a) => a.did == deck.accountDid)
        : null;

    if (account == null) return const SizedBox.shrink();

    final radius = isUltraCompact ? 12.0 : 16.0;

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
            fontSize: isUltraCompact ? 10 : 12,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
      );
    }
  }

  bool _hasAccountInfo(Deck deck) {
    final allAccounts = ref.watch(availableAccountsProvider);
    return deck.accountDid != null &&
        allAccounts.any((a) => a.did == deck.accountDid);
  }

  String _buildCompactDeckLabel(Deck deck) {
    return deck.title;
  }

  Widget _buildDeckMenuButton(Deck deck, List<Deck> allDecks) {
    return SizedBox(
      width: 40,
      height: 40,
      child: PopupMenuButton<String>(
        icon: const Icon(Icons.more_vert_rounded, size: 18),
        tooltip: 'Deck Options',
        padding: const EdgeInsets.all(8),
        onSelected: (value) => _handleDeckMenuAction(value, deck),
        itemBuilder: (context) => [
          PopupMenuItem<String>(
            value: 'moveLeft',
            enabled: _selectedTabIndex > 0,
            child: Row(
              children: [
                const Icon(Icons.arrow_back_rounded, size: 18),
                const SizedBox(width: 12),
                const Text('Move Left'),
              ],
            ),
          ),
          PopupMenuItem<String>(
            value: 'moveRight',
            enabled: _selectedTabIndex < allDecks.length - 1,
            child: Row(
              children: [
                const Icon(Icons.arrow_forward_rounded, size: 18),
                const SizedBox(width: 12),
                const Text('Move Right'),
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
                const Text('Settings'),
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
                  'Delete',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.error,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMobileTabLayout(List<Deck> decks) {
    return Column(
      children: [
        // Mobile tab bar with drag & drop
        _buildMobileTabBar(decks),

        // PageView for deck content with infinite scrolling
        Expanded(
          child: PageView.builder(
            controller: _pageController,
            itemCount: decks.length * 1000,
            onPageChanged: (virtualIndex) {
              final realIndex = virtualIndex % decks.length;
              setState(() {
                _selectedTabIndex = realIndex;
              });
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
            child: ReorderableListView.builder(
              scrollController: _tabScrollController,
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.only(left: 8),
              itemCount: decks.length,
              onReorder: (oldIndex, newIndex) {
                _onDeckMoved(oldIndex, newIndex, decks);
              },
              itemBuilder: (context, index) {
                final deck = decks[index];
                final isSelected = _selectedTabIndex == index;
                
                return ReorderableDragStartListener(
                  key: ValueKey(deck.deckId),
                  index: index,
                  child: _buildMobileTab(deck, index, isSelected, decks),
                );
              },
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
              tooltip: 'Add Deck',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMobileTab(Deck deck, int index, bool isSelected, List<Deck> allDecks) {
    final allAccounts = ref.watch(availableAccountsProvider);
    final activeAccount = ref.watch(activeAccountProvider);

    var account = deck.accountDid != null
        ? allAccounts.firstWhereOrNull((a) => a.did == deck.accountDid)
        : null;
    account ??= activeAccount;

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
          final currentVirtualIndex = (_pageController.page?.round() ?? 500);
          final currentRealIndex = currentVirtualIndex % allDecks.length;
          final targetVirtualIndex = currentVirtualIndex - currentRealIndex + index;

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
                  : Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
              width: isSelected ? 2 : 1,
            ),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.25),
                      blurRadius: 6,
                      offset: const Offset(0, 3),
                      spreadRadius: 1,
                    ),
                  ]
                : [
                    BoxShadow(
                      color: Theme.of(context).colorScheme.shadow.withValues(alpha: 0.1),
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
                    : Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7),
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
          // Mobile deck header
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
                _buildCompactAccountAvatar(deck, isUltraCompact: true),
                if (_hasAccountInfo(deck)) const SizedBox(width: 6),
                Icon(_getDeckIcon(deck.deckType), size: 14),
                const SizedBox(width: 6),
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
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '${index + 1}/$totalDecks',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(fontSize: 9),
                  ),
                ),
                const SizedBox(width: 6),
                SizedBox(
                  width: 36,
                  height: 36,
                  child: PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert_rounded, size: 16),
                    tooltip: 'Deck Options',
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
                            const Text('Move Left'),
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
                            const Text('Move Right'),
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
                            const Text('Settings'),
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
                              'Delete',
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

  // Core functionality methods
  void _onDeckMoved(int oldIndex, int newIndex, List<Deck> decks) {
    // Immediately update UI state
    if (oldIndex < newIndex) {
      newIndex -= 1;
    }
    
    // Update selected index if needed
    if (_selectedTabIndex == oldIndex) {
      setState(() {
        _selectedTabIndex = newIndex;
      });
    } else if (_selectedTabIndex > oldIndex && _selectedTabIndex <= newIndex) {
      setState(() {
        _selectedTabIndex -= 1;
      });
    } else if (_selectedTabIndex < oldIndex && _selectedTabIndex >= newIndex) {
      setState(() {
        _selectedTabIndex += 1;
      });
    }

    // Update deck order in database
    final updater = ref.read(deckOrderUpdaterProvider);
    final deck = decks[oldIndex];
    updater.updateOrder(deck.deckId, newIndex);
  }

  void _scrollTabToVisible(int index) {
    const double tabWidth = 48.0;
    final double targetOffset = index * tabWidth - (MediaQuery.of(context).size.width / 4);

    _tabScrollController.animateTo(
      targetOffset.clamp(0.0, _tabScrollController.position.maxScrollExtent),
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  void _handleDeckMenuAction(String action, Deck deck) {
    switch (action) {
      case 'moveLeft':
        // TODO: Implement move left
        break;
      case 'moveRight':
        // TODO: Implement move right
        break;
      case 'settings':
        // TODO: Implement settings
        break;
      case 'delete':
        _deleteDeck(deck);
        break;
    }
  }

  void _deleteDeck(Deck deck) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Deck'),
        content: Text('Are you sure you want to delete "${deck.title}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              final deleter = ref.read(deckDeleterProvider);
              deleter.deleteDeck(deck.deckId);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
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

  Color _getAccountColor(String did) {
    final hash = did.hashCode;
    final colors = [
      Colors.blue,
      Colors.green,
      Colors.orange,
      Colors.purple,
      Colors.red,
      Colors.teal,
      Colors.indigo,
      Colors.pink,
    ];
    return colors[hash.abs() % colors.length];
  }

  Widget _buildDeckContent(Deck deck) {
    switch (deck.deckType) {
      case 'home':
        return _buildHomeTimelineDeck(deck);
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

  // Content builders
  Widget _buildHomeTimelineDeck(Deck deck) {
    // TODO: Implement BlueskyTimelineWidget when available
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.home_rounded, size: 64, color: Colors.blue),
          SizedBox(height: 16),
          Text('Home Timeline', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 8),
          Text('Timeline content will appear here'),
        ],
      ),
    );
  }

  Widget _buildNotificationsList() {
    final notifications = [
      NotificationItem(
        type: 'like',
        actorName: 'Alice Johnson',
        actorHandle: 'alice.bsky.social',
        postContent: 'Great app design!',
        timestamp: DateTime.now().subtract(const Duration(minutes: 30)),
      ),
      NotificationItem(
        type: 'repost',
        actorName: 'Bob Wilson',
        actorHandle: 'bob.dev',
        postContent: 'The deck interface is really intuitive',
        timestamp: DateTime.now().subtract(const Duration(hours: 1)),
      ),
      NotificationItem(
        type: 'follow',
        actorName: 'Charlie Brown',
        actorHandle: 'charlie.bsky.social',
        timestamp: DateTime.now().subtract(const Duration(hours: 2)),
      ),
    ];

    return ListView.builder(
      itemCount: notifications.length,
      itemBuilder: (context, index) => Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: notifications[index],
      ),
    );
  }

  Widget _buildProfilePostsList() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.person_rounded, size: 64, color: Colors.green),
          SizedBox(height: 16),
          Text('Profile Posts', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 8),
          Text('Profile posts will appear here'),
        ],
      ),
    );
  }

  Widget _buildSearchResults() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.search_rounded, size: 64, color: Colors.orange),
          SizedBox(height: 16),
          Text('Search Results', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 8),
          Text('Search results will appear here'),
        ],
      ),
    );
  }

  Widget _buildListMembers() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.list_rounded, size: 64, color: Colors.purple),
          SizedBox(height: 16),
          Text('List Members', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 8),
          Text('List members will appear here'),
        ],
      ),
    );
  }

  Widget _buildThreadView() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.forum_rounded, size: 64, color: Colors.indigo),
          SizedBox(height: 16),
          Text('Thread View', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 8),
          Text('Thread conversation will appear here'),
        ],
      ),
    );
  }

  Widget _buildCustomFeedList(Deck deck) {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.rss_feed, size: 64, color: Colors.teal),
          SizedBox(height: 16),
          Text('Custom Feed', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 8),
          Text('Custom feed content will appear here'),
        ],
      ),
    );
  }

  Widget _buildLocalTimelineList(Deck deck) {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.people_rounded, size: 64, color: Colors.red),
          SizedBox(height: 16),
          Text('Local Timeline', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 8),
          Text('Local timeline will appear here'),
        ],
      ),
    );
  }

  Widget _buildHashtagList(Deck deck) {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.tag_rounded, size: 64, color: Colors.pink),
          SizedBox(height: 16),
          Text('Hashtag Feed', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 8),
          Text('Hashtag posts will appear here'),
        ],
      ),
    );
  }

  Widget _buildMentionsList() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.alternate_email_rounded, size: 64, color: Colors.brown),
          SizedBox(height: 16),
          Text('Mentions', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 8),
          Text('Mentions will appear here'),
        ],
      ),
    );
  }

  Widget _buildGenericDeckContent(Deck deck) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            _getDeckIcon(deck.deckType),
            size: 64,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          const SizedBox(height: 16),
          Text(
            deck.title,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'Content for ${deck.deckType} deck',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class NotificationItem extends StatelessWidget {
  final String type;
  final String actorName;
  final String actorHandle;
  final String? postContent;
  final DateTime timestamp;

  const NotificationItem({
    super.key,
    required this.type,
    required this.actorName,
    required this.actorHandle,
    this.postContent,
    required this.timestamp,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              backgroundColor: _getTypeColor(),
              child: Icon(_getTypeIcon(), color: Colors.white, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _getNotificationText(),
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '@$actorHandle',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                  if (postContent != null) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surfaceVariant,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        postContent!,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  Text(
                    _formatTimestamp(),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getTypeIcon() {
    switch (type) {
      case 'like':
        return Icons.favorite;
      case 'repost':
        return Icons.repeat;
      case 'follow':
        return Icons.person_add;
      case 'mention':
        return Icons.alternate_email;
      default:
        return Icons.notifications;
    }
  }

  Color _getTypeColor() {
    switch (type) {
      case 'like':
        return Colors.red;
      case 'repost':
        return Colors.green;
      case 'follow':
        return Colors.blue;
      case 'mention':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  String _getNotificationText() {
    switch (type) {
      case 'like':
        return '$actorName liked your post';
      case 'repost':
        return '$actorName reposted your post';
      case 'follow':
        return '$actorName started following you';
      case 'mention':
        return '$actorName mentioned you';
      default:
        return '$actorName interacted with you';
    }
  }

  String _formatTimestamp() {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inDays < 1) {
      return '${difference.inHours}h ago';
    } else {
      return '${difference.inDays}d ago';
    }
  }
}
