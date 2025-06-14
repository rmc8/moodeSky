// Flutter imports:
import 'package:flutter/material.dart';

// Package imports:
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Project imports:
import 'package:moodesky/core/providers/deck_provider.dart';
import 'package:moodesky/services/database/database.dart';

/// Utility class for deck-related operations
class DeckUtils {
  /// Handle deck menu actions
  static Future<void> handleDeckMenuAction(
    BuildContext context,
    WidgetRef ref,
    String action,
    Deck deck,
    int currentIndex,
    int totalDecks,
  ) async {
    switch (action) {
      case 'moveLeft':
        if (currentIndex > 0) {
          final updater = ref.read(deckOrderUpdaterProvider);
          await updater.updateOrder(deck.deckId, currentIndex - 1);
        }
        break;
      case 'moveRight':
        if (currentIndex < totalDecks - 1) {
          final updater = ref.read(deckOrderUpdaterProvider);
          await updater.updateOrder(deck.deckId, currentIndex + 1);
        }
        break;
      case 'settings':
        // TODO: Show deck settings dialog
        break;
      case 'delete':
        await _showDeleteConfirmation(context, ref, deck);
        break;
    }
  }

  /// Build deck menu items
  static List<PopupMenuEntry<String>> buildDeckMenuItems(
    BuildContext context,
    int currentIndex,
    int totalDecks,
  ) {
    return [
      PopupMenuItem<String>(
        value: 'moveLeft',
        enabled: currentIndex > 0,
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
        enabled: currentIndex < totalDecks - 1,
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
    ];
  }

  /// Show delete confirmation dialog
  static Future<void> _showDeleteConfirmation(
    BuildContext context,
    WidgetRef ref,
    Deck deck,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Deck'),
        content: Text('Are you sure you want to delete "${deck.title}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final deleter = ref.read(deckDeleterProvider);
      await deleter.deleteDeck(deck.deckId);
    }
  }
}