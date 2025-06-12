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

/// 🚀 パフォーマンス最適化: 段階的デッキロードプロバイダー
final allDecksProvider = FutureProvider<List<Deck>>((ref) async {
  final dao = ref.watch(deckDaoProvider);
  return dao.getAllDecks();
});

/// 🚀 互換性: 既存コード対応のエイリアス
final allDecksFutureProvider = allDecksProvider;

/// 🚀 最適化: ストリーミング監視は必要な場合のみ
final decksStreamProvider = StreamProvider<List<Deck>>((ref) {
  final dao = ref.watch(deckDaoProvider);
  return dao.watchAllDecks();
});

/// 🚀 最適化: キャッシュ済みデッキプロバイダー（再ビルド最小化）
final cachedDecksProvider = StateNotifierProvider<CachedDecksNotifier, List<Deck>>((ref) {
  return CachedDecksNotifier(ref);
});

/// 🚀 キャッシュ済みデッキ通知クラス（再ビルド最小化）
class CachedDecksNotifier extends StateNotifier<List<Deck>> {
  final Ref ref;
  
  CachedDecksNotifier(this.ref) : super([]) {
    _initializeDecks();
  }

  /// 初期デッキロード（非同期）
  Future<void> _initializeDecks() async {
    try {
      final dao = ref.read(deckDaoProvider);
      final decks = await dao.getAllDecks();
      state = decks;
    } catch (error) {
      // エラーハンドリング: 空リストを維持
      state = [];
    }
  }

  /// 🚀 効率的なデッキ更新（必要な場合のみ状態更新）
  Future<void> refreshDecks() async {
    try {
      final dao = ref.read(deckDaoProvider);
      final newDecks = await dao.getAllDecks();
      
      // リスト内容が同じ場合は更新をスキップ
      if (_areDecksEqual(state, newDecks)) return;
      
      state = newDecks;
    } catch (error) {
      // エラー時も現在の状態を保持
    }
  }

  /// デッキリストの内容比較（パフォーマンス最適化）
  bool _areDecksEqual(List<Deck> oldDecks, List<Deck> newDecks) {
    if (oldDecks.length != newDecks.length) return false;
    
    for (int i = 0; i < oldDecks.length; i++) {
      final oldDeck = oldDecks[i];
      final newDeck = newDecks[i];
      
      // 重要なフィールドのみ比較
      if (oldDeck.deckId != newDeck.deckId ||
          oldDeck.title != newDeck.title ||
          oldDeck.deckOrder != newDeck.deckOrder ||
          oldDeck.isVisible != newDeck.isVisible) {
        return false;
      }
    }
    
    return true;
  }

  /// 手動でデッキ追加（UIで即座に反映）
  void addDeck(Deck deck) {
    state = [...state, deck];
  }

  /// 手動でデッキ削除（UIで即座に反映）
  void removeDeck(String deckId) {
    state = state.where((deck) => deck.deckId != deckId).toList();
  }

  /// 手動でデッキ更新（UIで即座に反映）
  void updateDeck(Deck updatedDeck) {
    state = state.map((deck) {
      return deck.deckId == updatedDeck.deckId ? updatedDeck : deck;
    }).toList();
  }
}

/// Provider to create a new deck
final deckCreatorProvider =
    StateNotifierProvider<DeckCreator, AsyncValue<void>>((ref) {
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
      final deckId =
          '${accountDid}_${deckType}_${DateTime.now().millisecondsSinceEpoch}';

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
