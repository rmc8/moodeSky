// Package imports:
import 'package:drift/drift.dart';

// Project imports:
import 'package:moodesky/services/database/database.dart';
import 'package:moodesky/services/database/tables/settings.dart';

part 'settings_dao.g.dart';

@DriftAccessor(tables: [Settings])
class SettingsDao extends DatabaseAccessor<AppDatabase> with _$SettingsDaoMixin {
  SettingsDao(AppDatabase db) : super(db);

  // Get setting by key
  Future<Setting?> getSetting(String key, {String? accountDid}) {
    return (select(settings)
          ..where((t) => 
              t.key.equals(key) &
              (accountDid != null 
                  ? t.accountDid.equals(accountDid)
                  : t.accountDid.isNull())))
        .getSingleOrNull();
  }

  // Get all settings for account (or global if accountDid is null)
  Future<List<Setting>> getSettings({String? accountDid}) {
    return (select(settings)
          ..where((t) => accountDid != null 
              ? t.accountDid.equals(accountDid)
              : t.accountDid.isNull()))
        .get();
  }

  // Set setting value
  Future<void> setSetting(String key, String value, String type, {String? accountDid}) {
    return into(settings).insertOnConflictUpdate(
      SettingsCompanion.insert(
        key: key,
        value: value,
        type: type,
        accountDid: Value(accountDid),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  // Set string setting
  Future<void> setStringSetting(String key, String value, {String? accountDid}) {
    return setSetting(key, value, 'string', accountDid: accountDid);
  }

  // Set int setting
  Future<void> setIntSetting(String key, int value, {String? accountDid}) {
    return setSetting(key, value.toString(), 'int', accountDid: accountDid);
  }

  // Set bool setting
  Future<void> setBoolSetting(String key, bool value, {String? accountDid}) {
    return setSetting(key, value.toString(), 'bool', accountDid: accountDid);
  }

  // Set double setting
  Future<void> setDoubleSetting(String key, double value, {String? accountDid}) {
    return setSetting(key, value.toString(), 'double', accountDid: accountDid);
  }

  // Get string setting
  Future<String?> getStringSetting(String key, {String? accountDid}) async {
    final setting = await getSetting(key, accountDid: accountDid);
    return setting?.stringValue;
  }

  // Get int setting
  Future<int?> getIntSetting(String key, {String? accountDid}) async {
    final setting = await getSetting(key, accountDid: accountDid);
    return setting?.intValue;
  }

  // Get bool setting
  Future<bool?> getBoolSetting(String key, {String? accountDid}) async {
    final setting = await getSetting(key, accountDid: accountDid);
    return setting?.boolValue;
  }

  // Get double setting
  Future<double?> getDoubleSetting(String key, {String? accountDid}) async {
    final setting = await getSetting(key, accountDid: accountDid);
    return setting?.doubleValue;
  }

  // Delete setting
  Future<int> deleteSetting(String key, {String? accountDid}) {
    return (delete(settings)
          ..where((t) => 
              t.key.equals(key) &
              (accountDid != null 
                  ? t.accountDid.equals(accountDid)
                  : t.accountDid.isNull())))
        .go();
  }

  // Delete all settings for account
  Future<int> deleteAccountSettings(String accountDid) {
    return (delete(settings)..where((t) => t.accountDid.equals(accountDid))).go();
  }

  // Watch setting changes
  Stream<Setting?> watchSetting(String key, {String? accountDid}) {
    return (select(settings)
          ..where((t) => 
              t.key.equals(key) &
              (accountDid != null 
                  ? t.accountDid.equals(accountDid)
                  : t.accountDid.isNull())))
        .watchSingleOrNull();
  }

  // Watch all settings
  Stream<List<Setting>> watchSettings({String? accountDid}) {
    return (select(settings)
          ..where((t) => accountDid != null 
              ? t.accountDid.equals(accountDid)
              : t.accountDid.isNull()))
        .watch();
  }
}
