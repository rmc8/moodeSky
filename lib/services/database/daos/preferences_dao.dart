// Package imports:
import 'package:drift/drift.dart';

// Project imports:
import 'package:moodesky/services/database/database.dart';
import 'package:moodesky/services/database/tables/user_preferences.dart';

part 'preferences_dao.g.dart';

@DriftAccessor(tables: [UserPreferences])
class PreferencesDao extends DatabaseAccessor<AppDatabase>
    with _$PreferencesDaoMixin {
  PreferencesDao(super.db);

  /// 設定値を取得
  Future<UserPreference?> getPreference(String key) async {
    return await (select(userPreferences)
          ..where((tbl) => tbl.key.equals(key)))
        .getSingleOrNull();
  }

  /// 設定値を保存/更新
  Future<void> setPreference(String key, String value, String type) async {
    await into(userPreferences).insertOnConflictUpdate(
      UserPreferencesCompanion(
        key: Value(key),
        value: Value(value),
        type: Value(type),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  /// 設定値を削除
  Future<void> removePreference(String key) async {
    await (delete(userPreferences)..where((tbl) => tbl.key.equals(key))).go();
  }

  /// 全設定を取得
  Future<List<UserPreference>> getAllPreferences() async {
    return await select(userPreferences).get();
  }

  /// 特定のタイプの設定を取得
  Future<List<UserPreference>> getPreferencesByType(String type) async {
    return await (select(userPreferences)
          ..where((tbl) => tbl.type.equals(type)))
        .get();
  }
}