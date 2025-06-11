// Package imports:
import 'package:bluesky/bluesky.dart' as bsky;
import 'package:flutter_test/flutter_test.dart';

// Project imports:
import 'package:moodesky/shared/models/preferences_models.dart';

void main() {
  group('UserPreferences', () {
    test('should create UserPreferences correctly', () {
      final preferences = [
        bsky.Preference(
          type: 'app.bsky.actor.defs#adultContentPref',
          data: {'enabled': true},
        ),
      ];
      
      final userPrefs = UserPreferences(
        preferences: preferences,
        lastUpdated: DateTime.now(),
        accountDid: 'did:plc:test123',
      );
      
      expect(userPrefs.preferences.length, 1);
      expect(userPrefs.accountDid, 'did:plc:test123');
      expect(userPrefs.lastUpdated, isNotNull);
    });

    test('should serialize and deserialize correctly', () {
      final preferences = [
        bsky.Preference(
          type: 'app.bsky.actor.defs#adultContentPref',
          data: {'\$type': 'app.bsky.actor.defs#adultContentPref', 'enabled': true},
        ),
      ];
      
      final original = UserPreferences(
        preferences: preferences,
        lastUpdated: DateTime.parse('2024-01-01T00:00:00.000Z'),
        accountDid: 'did:plc:test123',
      );
      
      final json = original.toJson();
      final deserialized = UserPreferences.fromJson(json);
      
      expect(deserialized.preferences.length, original.preferences.length);
      expect(deserialized.accountDid, original.accountDid);
      expect(deserialized.lastUpdated, original.lastUpdated);
    });
  });

  group('PreferencesParser', () {
    test('should extract ModerationPrefs correctly', () {
      final preferences = [
        bsky.Preference(
          type: 'app.bsky.actor.defs#adultContentPref',
          data: {'enabled': true},
        ),
        bsky.Preference(
          type: 'app.bsky.actor.defs#contentLabelPref',
          data: {
            'label': 'porn',
            'visibility': 'hide',
          },
        ),
      ];
      
      final moderationPrefs = PreferencesParser.extractModerationPrefs(preferences);
      
      expect(moderationPrefs.adultContentEnabled, true);
      expect(moderationPrefs.labels.containsKey('porn'), true);
      expect(moderationPrefs.labels['porn'], isA<LabelHide>());
    });

    test('should extract FeedViewPrefs correctly', () {
      final preferences = [
        bsky.Preference(
          type: 'app.bsky.actor.defs#feedViewPref',
          data: {
            'feed': 'home',
            'hideReplies': true,
            'hideReposts': false,
          },
        ),
      ];
      
      final feedViewPrefs = PreferencesParser.extractFeedViewPrefs(preferences);
      
      expect(feedViewPrefs.length, 1);
      expect(feedViewPrefs.first.feed, 'home');
      expect(feedViewPrefs.first.hideReplies, true);
      expect(feedViewPrefs.first.hideReposts, false);
    });
  });

  group('LabelPreference', () {
    test('should create different types correctly', () {
      const hide = LabelPreference.hide();
      const warn = LabelPreference.warn();
      const ignore = LabelPreference.ignore();
      
      expect(hide, isA<LabelHide>());
      expect(warn, isA<LabelWarn>());
      expect(ignore, isA<LabelIgnore>());
    });

    test('should deserialize from JSON correctly', () {
      final hideJson = {'type': 'hide'};
      final warnJson = {'type': 'warn'};
      final ignoreJson = {'type': 'ignore'};
      
      final hide = LabelPreference.fromJson(hideJson);
      final warn = LabelPreference.fromJson(warnJson);
      final ignore = LabelPreference.fromJson(ignoreJson);
      
      expect(hide, isA<LabelHide>());
      expect(warn, isA<LabelWarn>());
      expect(ignore, isA<LabelIgnore>());
    });
  });

  group('ModerationResult', () {
    test('should create different types correctly', () {
      const allow = ModerationResult.allow();
      const filter = ModerationResult.filter('test reason');
      const blur = ModerationResult.blur('blur reason');
      
      expect(allow, isA<ModerationAllow>());
      expect(filter, isA<ModerationFilter>());
      expect(blur, isA<ModerationBlur>());
    });

    test('should deserialize from JSON correctly', () {
      final allowJson = {'type': 'allow'};
      final filterJson = {'type': 'filter', 'reason': 'filtered'};
      final blurJson = {'type': 'blur', 'reason': 'blurred'};
      
      final allow = ModerationResult.fromJson(allowJson);
      final filter = ModerationResult.fromJson(filterJson);
      final blur = ModerationResult.fromJson(blurJson);
      
      expect(allow, isA<ModerationAllow>());
      expect(filter, isA<ModerationFilter>());
      expect(blur, isA<ModerationBlur>());
    });
  });
}