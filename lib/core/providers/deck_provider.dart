// Package imports:
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Project imports:
import 'package:moodesky/core/providers/database_provider.dart';
import 'package:moodesky/services/database/database.dart';
import 'package:moodesky/services/database/daos/deck_dao.dart';

/// Provider for deck DAO
final deckDaoProvider = Provider<DeckDao>((ref) {
  final database = ref.watch(databaseProvider);
  return database.deckDao;
});

/// Provider for all decks across all logged-in accounts
final allDecksProvider = StreamProvider<List<Deck>>((ref) {
  final dao = ref.watch(deckDaoProvider);
  return dao.watchAllDecks();
});

/// Provider for all decks as Future (for non-streaming use)
final allDecksFutureProvider = FutureProvider<List<Deck>>((ref) async {
  final dao = ref.watch(deckDaoProvider);
  return dao.getAllDecks();
});

/// Provider to create a new deck
final deckCreatorProvider = StateNotifierProvider<DeckCreator, AsyncValue<void>>((ref) {
  return DeckCreator(ref);
});

class DeckCreator extends StateNotifier<AsyncValue<void>> {
  final Ref ref;

  DeckCreator(this.ref) : super(const AsyncValue.data(null));

  Future<void> createDeck({
    required String title,
    required String deckType,
    required String accountDid,
    String? description,
    String? targetIdentifier,
  }) async {
    state = const AsyncValue.loading();
    
    try {
      final dao = ref.read(deckDaoProvider);
      
      // Generate unique deck ID
      final deckId = '${accountDid}_${deckType}_${DateTime.now().millisecondsSinceEpoch}';
      
      final deck = DecksCompanion.insert(
        deckId: deckId,
        title: title,
        deckType: deckType,
        accountDid: Value(accountDid.isEmpty ? null : accountDid),
        description: Value(description),
        targetIdentifier: Value(targetIdentifier),
        isCrossAccount: Value(accountDid.isEmpty),
      );
      
      await dao.createDeck(deck);
      state = const AsyncValue.data(null);
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }
}

/// Provider to update deck order
final deckOrderUpdaterProvider = Provider<DeckOrderUpdater>((ref) {
  return DeckOrderUpdater(ref);
});

class DeckOrderUpdater {
  final Ref ref;
  
  DeckOrderUpdater(this.ref);

  Future<void> updateOrder(String deckId, int newOrder) async {
    final dao = ref.read(deckDaoProvider);
    await dao.updateDeckOrder(deckId, newOrder);
  }
}

/// Provider to delete a deck
final deckDeleterProvider = Provider<DeckDeleter>((ref) {
  return DeckDeleter(ref);
});

class DeckDeleter {
  final Ref ref;
  
  DeckDeleter(this.ref);

  Future<void> deleteDeck(String deckId) async {
    final dao = ref.read(deckDaoProvider);
    await dao.deleteDeck(deckId);
  }
}

/// Provider to toggle deck favorite status
final deckFavoriteTogglerProvider = Provider<DeckFavoriteToggler>((ref) {
  return DeckFavoriteToggler(ref);
});

class DeckFavoriteToggler {
  final Ref ref;
  
  DeckFavoriteToggler(this.ref);

  Future<void> toggleFavorite(String deckId, bool isFavorite) async {
    final dao = ref.read(deckDaoProvider);
    await dao.updateDeckFavorite(deckId, isFavorite);
  }
}