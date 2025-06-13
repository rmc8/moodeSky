// Flutter imports:
import 'package:flutter/foundation.dart';

// Package imports:
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Project imports:
import 'package:moodesky/core/providers/database_provider.dart';
import 'package:moodesky/services/database/daos/deck_dao.dart';
import 'package:moodesky/services/database/database.dart';

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

  // distinct()を削除して全ての更新を通知するようにする
  // デッキの追加・削除・更新が即座に反映される
  return dao.watchAllDecks();
});

/// 🚀 最適化: キャッシュ済みデッキプロバイダー（再ビルド最小化）
final cachedDecksProvider =
    StateNotifierProvider<CachedDecksNotifier, List<Deck>>((ref) {
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
      if (listEquals(state, newDecks)) return;

      state = newDecks;
    } catch (error) {
      // エラー時も現在の状態を保持
    }
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

      // Get existing decks to determine the next order number
      final existingDecks = await dao.getAllDecks();
      final nextOrder = existingDecks.isEmpty
          ? 0
          : existingDecks
                    .map((d) => d.deckOrder)
                    .reduce((a, b) => a > b ? a : b) +
                1;

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
        deckOrder: Value(nextOrder), // Set proper order
      );

      await dao.createDeck(deck);

      // キャッシュと提供者を更新
      ref.read(cachedDecksProvider.notifier).refreshDecks();
      ref.invalidate(decksStreamProvider);
      ref.invalidate(allDecksProvider);

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

    // 更新後にキャッシュをリフレッシュ
    ref.read(cachedDecksProvider.notifier).refreshDecks();
    ref.invalidate(decksStreamProvider);
    ref.invalidate(allDecksProvider);
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
    final deletedRows = await dao.deleteDeck(deckId);

    debugPrint('🗑️ DAO deleteDeck result: $deletedRows rows deleted');

    if (deletedRows > 0) {
      // データベースから削除された後、キャッシュされているリストからも削除する
      ref.read(cachedDecksProvider.notifier).removeDeck(deckId);
      // StreamProviderも無効化して最新データを取得
      ref.invalidate(decksStreamProvider);
      ref.invalidate(allDecksProvider);
    } else {
      throw Exception('No deck found with ID: $deckId');
    }
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

    // 更新後にキャッシュをリフレッシュ
    ref.read(cachedDecksProvider.notifier).refreshDecks();
    ref.invalidate(decksStreamProvider);
    ref.invalidate(allDecksProvider);
  }
}
