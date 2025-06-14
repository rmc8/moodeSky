// Flutter imports:
import 'dart:async';
import 'package:flutter/material.dart';

// Package imports:
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Project imports:
import 'package:moodesky/services/database/database.dart';
import 'timeline_scroll_buttons.dart';

/// Base timeline widget that provides common timeline functionality
abstract class BaseTimelineWidget extends ConsumerStatefulWidget {
  final Deck deck;
  final bool showScrollButtons;
  
  /// 無限スクロールのトリガー距離（底部からのピクセル数）
  final double infiniteScrollThreshold;

  const BaseTimelineWidget({
    super.key,
    required this.deck,
    this.showScrollButtons = true,
    this.infiniteScrollThreshold = 300.0,
  });
}

abstract class BaseTimelineWidgetState<T extends BaseTimelineWidget> extends ConsumerState<T> {
  final ScrollController scrollController = ScrollController();
  bool _showScrollToTop = false;
  bool _showScrollToBottom = false;
  bool _isScrolling = false;
  Timer? _scrollingTimer;
  VoidCallback? _customScrollCallback;

  /// Set custom scroll callback for subclasses (e.g., infinite scroll)
  void setCustomScrollCallback(VoidCallback? callback) {
    _customScrollCallback = callback;
  }

  @override
  void initState() {
    super.initState();
    if (widget.showScrollButtons) {
      scrollController.addListener(_onScroll);
    }
  }

  @override
  void dispose() {
    _scrollingTimer?.cancel();
    if (widget.showScrollButtons) {
      scrollController.removeListener(_onScroll);
    }
    scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    final position = scrollController.position;
    
    // Call custom scroll callback first if provided
    _customScrollCallback?.call();
    
    // Mark as scrolling and reset the timer
    setState(() {
      _isScrolling = true;
      _showScrollToTop = position.pixels > 200 && !_isScrolling;
      _showScrollToBottom = false; // 下スクロールボタンは無効化
    });
    
    // Cancel previous timer and start a new one
    _scrollingTimer?.cancel();
    _scrollingTimer = Timer(const Duration(milliseconds: 500), () {
      if (mounted) {
        setState(() {
          _isScrolling = false;
          _showScrollToTop = position.pixels > 200;
        });
      }
    });
  }

  Widget buildContent();

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Main content
        buildContent(),
        
        // Scroll buttons
        if (widget.showScrollButtons)
          TimelineScrollButtons(
            scrollController: scrollController,
            showScrollToTop: _showScrollToTop && !_isScrolling,
            showScrollToBottom: _showScrollToBottom && !_isScrolling,
            onScrollToTop: scrollToTop,
          ),
      ],
    );
  }

  /// Scroll to top of timeline
  void scrollToTop() {
    setState(() {
      _isScrolling = true;
      _showScrollToTop = false;
    });
    
    scrollController.animateTo(
      0,
      duration: const Duration(milliseconds: 500),
      curve: Curves.easeOutCubic,
    ).then((_) {
      if (mounted) {
        setState(() {
          _isScrolling = false;
        });
      }
    });
  }

  /// Scroll to bottom of timeline
  void scrollToBottom() {
    scrollController.animateTo(
      scrollController.position.maxScrollExtent,
      duration: const Duration(milliseconds: 500),
      curve: Curves.easeOutCubic,
    );
  }

  /// Refresh timeline content
  Future<void> refresh() async {
    // To be implemented by subclasses
  }
}

/// Generic timeline widget for placeholder content
class GenericTimelineWidget extends BaseTimelineWidget {
  const GenericTimelineWidget({
    super.key,
    required super.deck,
    super.showScrollButtons = true,
  });

  @override
  ConsumerState<GenericTimelineWidget> createState() => _GenericTimelineWidgetState();
}

class _GenericTimelineWidgetState extends BaseTimelineWidgetState<GenericTimelineWidget> {
  @override
  Widget buildContent() {
    return RefreshIndicator(
      onRefresh: refresh,
      child: ListView.builder(
        controller: scrollController,
        padding: const EdgeInsets.all(16),
        itemCount: 20, // Placeholder count
        itemBuilder: (context, index) => _buildPlaceholderItem(index),
      ),
    );
  }

  Widget _buildPlaceholderItem(int index) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  child: Text(
                    '${index + 1}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Sample User ${index + 1}',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '@user${index + 1}.bsky.social',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  '${index + 1}h',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'This is a sample post for ${widget.deck.title} timeline. '
              'This placeholder content will be replaced with actual ${widget.deck.deckType} data.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildActionButton(Icons.favorite_border, '${index * 3}'),
                const SizedBox(width: 16),
                _buildActionButton(Icons.repeat, '${index * 2}'),
                const SizedBox(width: 16),
                _buildActionButton(Icons.chat_bubble_outline, '$index'),
                const SizedBox(width: 16),
                _buildActionButton(Icons.share, ''),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton(IconData icon, String count) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: 18,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
        if (count.isNotEmpty) ...[
          const SizedBox(width: 4),
          Text(
            count,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ],
    );
  }

  @override
  Future<void> refresh() async {
    // Simulate refresh delay
    await Future.delayed(const Duration(seconds: 1));
    setState(() {
      // Refresh state would go here
    });
  }
}