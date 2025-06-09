// Flutter imports:
import 'package:flutter/material.dart';

// Package imports:
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Project imports:
import 'package:moodesky/core/providers/auth_provider.dart';
import 'package:moodesky/core/providers/theme_provider.dart';
import 'package:moodesky/shared/widgets/post_item.dart';

class DeckLayout extends ConsumerStatefulWidget {
  const DeckLayout({super.key});

  @override
  ConsumerState<DeckLayout> createState() => _DeckLayoutState();
}

class _DeckLayoutState extends ConsumerState<DeckLayout> {
  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // テーマ変更を監視して再描画をトリガー
    final currentTheme = ref.watch(currentThemeModeProvider);
    final brightness = Theme.of(context).brightness;
    
    final screenWidth = MediaQuery.of(context).size.width;

    // Determine layout based on screen size
    if (screenWidth >= 1200) {
      // Desktop: Multi-column deck layout
      return _buildDesktopLayout();
    } else if (screenWidth >= 600) {
      // Tablet: 2-3 column layout
      return _buildTabletLayout();
    } else {
      // Mobile: Single column with swipe navigation
      return _buildMobileLayout();
    }
  }

  Widget _buildDesktopLayout() {
    // For now, show placeholder decks
    final decks = _getPlaceholderDecks();

    return Row(
      children: decks
          .map(
            (deck) => Expanded(
              child: Container(
                margin: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  border: Border.all(
                    color: Theme.of(
                      context,
                    ).colorScheme.outline.withValues(alpha: 0.2),
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  children: [
                    // Deck header
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surfaceContainer,
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(8),
                          topRight: Radius.circular(8),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(deck.icon),
                          const SizedBox(width: 8),
                          Text(
                            deck.title,
                            style: Theme.of(context).textTheme.titleMedium
                                ?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          const Spacer(),
                          IconButton(
                            icon: const Icon(Icons.more_vert),
                            onPressed: () {
                              // TODO: Show deck options
                            },
                          ),
                        ],
                      ),
                    ),

                    // Deck content
                    Expanded(child: _buildDeckContent(deck)),
                  ],
                ),
              ),
            ),
          )
          .toList(),
    );
  }

  Widget _buildTabletLayout() {
    final decks = _getPlaceholderDecks().take(3).toList();

    return Row(
      children: decks
          .map(
            (deck) => Expanded(
              child: Container(
                margin: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  border: Border.all(
                    color: Theme.of(
                      context,
                    ).colorScheme.outline.withValues(alpha: 0.2),
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  children: [
                    // Deck header
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surfaceContainer,
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(8),
                          topRight: Radius.circular(8),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(deck.icon, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            deck.title,
                            style: Theme.of(context).textTheme.titleSmall
                                ?.copyWith(fontWeight: FontWeight.bold),
                          ),
                          const Spacer(),
                          IconButton(
                            icon: const Icon(Icons.more_vert, size: 20),
                            onPressed: () {
                              // TODO: Show deck options
                            },
                          ),
                        ],
                      ),
                    ),

                    // Deck content
                    Expanded(child: _buildDeckContent(deck)),
                  ],
                ),
              ),
            ),
          )
          .toList(),
    );
  }

  Widget _buildMobileLayout() {
    final decks = _getPlaceholderDecks();

    return PageView.builder(
      controller: PageController(),
      itemCount: decks.length,
      itemBuilder: (context, index) {
        final deck = decks[index];
        return Container(
          margin: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            border: Border.all(
              color: Theme.of(
                context,
              ).colorScheme.outline.withValues(alpha: 0.2),
            ),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            children: [
              // Deck header with page indicator
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainer,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(8),
                    topRight: Radius.circular(8),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(deck.icon),
                    const SizedBox(width: 8),
                    Text(
                      deck.title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Spacer(),
                    // Page indicator
                    Text(
                      '${index + 1} / ${decks.length}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.more_vert),
                      onPressed: () {
                        // TODO: Show deck options
                      },
                    ),
                  ],
                ),
              ),

              // Deck content
              Expanded(child: _buildDeckContent(deck)),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDeckContent(DeckInfo deck) {
    if (deck.type == DeckType.home) {
      return const PostListDemo();
    }
    
    // Placeholder content for other deck types
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 5,
      itemBuilder: (context, index) {
        return Container(
          margin: const EdgeInsets.symmetric(vertical: 8),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            border: Border.all(
              color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.2),
            ),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${deck.title} Item ${index + 1}',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'This is placeholder content for the ${deck.title} deck.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
          ),
        );
      },
    );
  }

  List<DeckInfo> _getPlaceholderDecks() {
    return [
      DeckInfo(
        id: 'home',
        title: 'Home',
        icon: Icons.home,
        type: DeckType.home,
      ),
      DeckInfo(
        id: 'notifications',
        title: 'Notifications',
        icon: Icons.notifications,
        type: DeckType.notifications,
      ),
      DeckInfo(
        id: 'search',
        title: 'Search',
        icon: Icons.search,
        type: DeckType.search,
      ),
    ];
  }
}

// Deck information model
class DeckInfo {
  final String id;
  final String title;
  final IconData icon;
  final DeckType type;

  DeckInfo({
    required this.id,
    required this.title,
    required this.icon,
    required this.type,
  });
}

// Deck types enum
enum DeckType { home, notifications, search, profile, list, hashtag, mentions }
