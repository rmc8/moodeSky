// Flutter imports:
import 'package:flutter/material.dart';

/// Scroll buttons for timeline navigation - 上のみ表示
class TimelineScrollButtons extends StatelessWidget {
  final ScrollController scrollController;
  final bool showScrollToTop;
  final bool showScrollToBottom; // 下位互換性のため残すが使用しない
  final VoidCallback? onScrollToTop;

  const TimelineScrollButtons({
    super.key,
    required this.scrollController,
    required this.showScrollToTop,
    required this.showScrollToBottom,
    this.onScrollToTop,
  });

  @override
  Widget build(BuildContext context) {
    return Positioned(
      right: 16,
      bottom: 16,
      child: AnimatedOpacity(
        opacity: showScrollToTop ? 0.9 : 0.0,
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeOutCubic,
        child: AnimatedSlide(
          offset: showScrollToTop ? Offset.zero : const Offset(0, 0.5),
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeOutCubic,
          child: AnimatedScale(
            scale: showScrollToTop ? 1.0 : 0.8,
            duration: const Duration(milliseconds: 400),
            curve: Curves.elasticOut,
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.15),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                    spreadRadius: 1,
                  ),
                ],
              ),
              child: FloatingActionButton.small(
                onPressed: showScrollToTop ? (onScrollToTop ?? _scrollToTop) : null,
                backgroundColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.85),
                foregroundColor: Theme.of(context).colorScheme.onPrimary,
                elevation: 0,
                heroTag: 'scroll_to_top',
                tooltip: 'Scroll to top',
                child: Icon(
                  Icons.keyboard_arrow_up_rounded,
                  size: 22,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _scrollToTop() {
    scrollController.animateTo(
      0,
      duration: const Duration(milliseconds: 500),
      curve: Curves.easeOutCubic,
    );
  }

  void _scrollToBottom() {
    scrollController.animateTo(
      scrollController.position.maxScrollExtent,
      duration: const Duration(milliseconds: 500),
      curve: Curves.easeOutCubic,
    );
  }
}

/// Enhanced scroll buttons with additional navigation features
class EnhancedTimelineScrollButtons extends StatelessWidget {
  final ScrollController scrollController;
  final bool showScrollToTop;
  final bool showScrollToBottom;
  final VoidCallback? onRefresh;
  final VoidCallback? onScrollToLatest;

  const EnhancedTimelineScrollButtons({
    super.key,
    required this.scrollController,
    required this.showScrollToTop,
    required this.showScrollToBottom,
    this.onRefresh,
    this.onScrollToLatest,
  });

  @override
  Widget build(BuildContext context) {
    return Positioned(
      right: 16,
      bottom: 16,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Scroll to latest button (if different from top)
          if (onScrollToLatest != null)
            AnimatedOpacity(
              opacity: showScrollToTop ? 1.0 : 0.0,
              duration: const Duration(milliseconds: 300),
              child: Container(
                margin: const EdgeInsets.only(bottom: 8),
                child: FloatingActionButton.small(
                  onPressed: showScrollToTop ? onScrollToLatest : null,
                  backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                  foregroundColor: Theme.of(context).colorScheme.onPrimaryContainer,
                  elevation: 1,
                  heroTag: 'scroll_to_latest',
                  tooltip: 'Scroll to latest',
                  child: const Icon(Icons.refresh_rounded),
                ),
              ),
            ),

          // Scroll to top button
          AnimatedOpacity(
            opacity: showScrollToTop ? 1.0 : 0.0,
            duration: const Duration(milliseconds: 300),
            child: AnimatedSlide(
              offset: showScrollToTop ? Offset.zero : const Offset(0, 0.5),
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOutCubic,
              child: Container(
                margin: const EdgeInsets.only(bottom: 8),
                child: FloatingActionButton.small(
                  onPressed: showScrollToTop ? _scrollToTop : null,
                  backgroundColor: Theme.of(context).colorScheme.secondaryContainer,
                  foregroundColor: Theme.of(context).colorScheme.onSecondaryContainer,
                  elevation: 1,
                  heroTag: 'scroll_to_top',
                  tooltip: 'Scroll to top',
                  child: const Icon(Icons.keyboard_arrow_up_rounded),
                ),
              ),
            ),
          ),

          // Scroll to bottom button
          AnimatedOpacity(
            opacity: showScrollToBottom ? 1.0 : 0.0,
            duration: const Duration(milliseconds: 300),
            child: AnimatedSlide(
              offset: showScrollToBottom ? Offset.zero : const Offset(0, -0.5),
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOutCubic,
              child: FloatingActionButton.small(
                onPressed: showScrollToBottom ? _scrollToBottom : null,
                backgroundColor: Theme.of(context).colorScheme.secondaryContainer,
                foregroundColor: Theme.of(context).colorScheme.onSecondaryContainer,
                elevation: 2,
                heroTag: 'scroll_to_bottom',
                tooltip: 'Scroll to bottom',
                child: const Icon(Icons.keyboard_arrow_down_rounded),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _scrollToTop() {
    scrollController.animateTo(
      0,
      duration: const Duration(milliseconds: 500),
      curve: Curves.easeOutCubic,
    );
  }

  void _scrollToBottom() {
    scrollController.animateTo(
      scrollController.position.maxScrollExtent,
      duration: const Duration(milliseconds: 500),
      curve: Curves.easeOutCubic,
    );
  }
}