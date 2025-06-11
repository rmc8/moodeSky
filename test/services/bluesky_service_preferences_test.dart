// Package imports:
import 'package:bluesky/bluesky.dart' as bsky;
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:drift/native.dart';
import 'package:mocktail/mocktail.dart';

// Project imports:
import 'package:moodesky/services/bluesky_service.dart';
import 'package:moodesky/services/database/database.dart';
import 'package:moodesky/shared/models/auth_models.dart';
import 'package:moodesky/shared/models/preferences_models.dart';

// Mock classes
class MockFlutterSecureStorage extends Mock implements FlutterSecureStorage {}

void main() {
  group('BlueskyService Preferences', () {
    late BlueskyService blueskyService;
    late AppDatabase database;
    late MockFlutterSecureStorage mockSecureStorage;
    late AuthConfig authConfig;

    setUp(() {
      // テスト用のインメモリデータベース
      database = AppDatabase.test(NativeDatabase.memory());
      mockSecureStorage = MockFlutterSecureStorage();
      authConfig = const AuthConfig(
        clientMetadataUrl: 'test://metadata',
        callbackUrlScheme: 'test',
        defaultPdsHost: 'test.bsky.social',
      );

      blueskyService = BlueskyService(
        database: database,
        secureStorage: mockSecureStorage,
        authConfig: authConfig,
      );
    });

    tearDown(() async {
      await database.close();
    });

    test('should cache preferences correctly', () async {
      const accountDid = 'did:plc:test123';
      
      // テスト用のpreferences
      final preferences = [
        bsky.Preference(
          type: 'app.bsky.actor.defs#adultContentPref',
          data: {'enabled': true},
        ),
      ];
      
      final userPrefs = UserPreferences(
        preferences: preferences,
        lastUpdated: DateTime.now(),
        accountDid: accountDid,
      );

      // キャッシュに保存
      await database.preferencesDao.savePreferences(accountDid, userPrefs);

      // キャッシュから取得
      final cached = await database.preferencesDao.getCachedPreferences(accountDid);
      
      expect(cached, isNotNull);
      expect(cached!.preferences.length, 1);
      expect(cached.accountDid, accountDid);
    });

    test('should check cache validity correctly', () async {
      const accountDid = 'did:plc:test123';
      
      // 古いキャッシュ
      final oldPrefs = UserPreferences(
        preferences: [],
        lastUpdated: DateTime.now().subtract(const Duration(hours: 8)),
        accountDid: accountDid,
      );

      await database.preferencesDao.savePreferences(accountDid, oldPrefs);
      
      final isValid = await database.preferencesDao.isCacheValid(accountDid);
      expect(isValid, false);

      // 新しいキャッシュ
      final newPrefs = UserPreferences(
        preferences: [],
        lastUpdated: DateTime.now(),
        accountDid: accountDid,
      );

      await database.preferencesDao.savePreferences(accountDid, newPrefs);
      
      final isValidNow = await database.preferencesDao.isCacheValid(accountDid);
      expect(isValidNow, true);
    });

    test('should extract moderation preferences correctly', () async {
      final preferences = [
        bsky.Preference(
          type: 'app.bsky.actor.defs#adultContentPref',
          data: {'enabled': false},
        ),
        bsky.Preference(
          type: 'app.bsky.actor.defs#contentLabelPref',
          data: {
            'label': 'sexual',
            'visibility': 'warn',
          },
        ),
        bsky.Preference(
          type: 'app.bsky.actor.defs#mutedWordsPref',
          data: {
            'items': [
              {
                'value': 'spam',
                'targets': ['content'],
                'actorTarget': 'all',
              }
            ]
          },
        ),
      ];

      final moderationPrefs = PreferencesParser.extractModerationPrefs(preferences);

      expect(moderationPrefs.adultContentEnabled, false);
      expect(moderationPrefs.labels.containsKey('sexual'), true);
      expect(moderationPrefs.labels['sexual'], isA<LabelWarn>());
      expect(moderationPrefs.mutedWords.length, 1);
      expect(moderationPrefs.mutedWords.first.value, 'spam');
    });

    test('should handle empty preferences correctly', () async {
      final moderationPrefs = PreferencesParser.extractModerationPrefs([]);

      expect(moderationPrefs.adultContentEnabled, false);
      expect(moderationPrefs.labels.isEmpty, true);
      expect(moderationPrefs.mutedWords.isEmpty, true);
      expect(moderationPrefs.hiddenPosts.isEmpty, true);
      expect(moderationPrefs.labelers.isEmpty, true);
    });
  });
}

extension on AppDatabase {
  static AppDatabase test(QueryExecutor e) {
    return AppDatabase.internal(e);
  }
}