// Package imports:
import 'package:drift/drift.dart';

// Project imports:
import 'package:moodesky/services/database/connection/connection.dart';
import 'package:moodesky/services/database/daos/account_dao.dart';
import 'package:moodesky/services/database/daos/deck_dao.dart';
import 'package:moodesky/services/database/daos/preferences_dao.dart';
import 'package:moodesky/services/database/tables/accounts.dart';
import 'package:moodesky/services/database/tables/decks.dart';
import 'package:moodesky/services/database/tables/user_preferences.dart';

part 'database.g.dart';

@DriftDatabase(tables: [Accounts, Decks, UserPreferences], daos: [AccountDao, DeckDao, PreferencesDao])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(openConnection());

  @override
  int get schemaVersion => 3;

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
        if (from < 3) {
          // Add UserPreferences table in version 3
          await m.createTable(userPreferences);
        }
      },
    );
  }
}

