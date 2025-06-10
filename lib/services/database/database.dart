// Dart imports:
import 'dart:io';

// Package imports:
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

// Project imports:
import 'package:moodesky/services/database/daos/account_dao.dart';
import 'package:moodesky/services/database/daos/deck_dao.dart';
import 'package:moodesky/services/database/tables/accounts.dart';
import 'package:moodesky/services/database/tables/decks.dart';

part 'database.g.dart';

@DriftDatabase(tables: [Accounts, Decks], daos: [AccountDao, DeckDao])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration {
    return MigrationStrategy(
      onCreate: (Migrator m) async {
        await m.createAll();
      },
      onUpgrade: (Migrator m, int from, int to) async {
        // Handle database migrations here
        if (from < 2) {
          // Add Decks table in version 2
          await m.createTable(decks);
        }
      },
    );
  }
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'moodesky.db'));

    return NativeDatabase.createInBackground(file);
  });
}
