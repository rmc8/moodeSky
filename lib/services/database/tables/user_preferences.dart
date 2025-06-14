// Package imports:
import 'package:drift/drift.dart';

/// ユーザー設定テーブル
class UserPreferences extends Table {
  @override
  String get tableName => 'user_preferences';

  /// 設定キー（主キー）
  TextColumn get key => text()();

  /// 設定値（JSON文字列として保存）
  TextColumn get value => text()();

  /// 設定の種類
  TextColumn get type => text().withDefault(const Constant('string'))();

  /// 作成日時
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();

  /// 更新日時
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {key};
}