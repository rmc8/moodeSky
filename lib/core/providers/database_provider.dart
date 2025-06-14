// Package imports:
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Project imports:
import 'package:moodesky/services/database/database.dart';

/// Singleton provider for the database - using regular Provider to ensure single instance
final databaseProvider = Provider<AppDatabase>((ref) {
  // Create and keep the database instance alive
  final db = AppDatabase();

  // Keep this provider alive to ensure database singleton
  ref.keepAlive();

  // Dispose the database when the provider is disposed
  ref.onDispose(() {
    db.close();
  });

  return db;
});
