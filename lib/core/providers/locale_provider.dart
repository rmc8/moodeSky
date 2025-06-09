// Flutter imports:
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

// Package imports:
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'locale_provider.g.dart';

/// サポートしている言語のリスト
class SupportedLocales {
  static const List<Locale> locales = [
    Locale('en', 'US'), // English (デフォルト)
    Locale('ja', 'JP'), // Japanese
    Locale('ko', 'KR'), // Korean
    Locale('de', 'DE'), // German
    Locale('pt', 'BR'), // Brazilian Portuguese
  ];

  /// ロケールに対応する表示名を取得
  static String getDisplayName(Locale locale) {
    switch (locale.languageCode) {
      case 'en':
        return 'English';
      case 'ja':
        return '日本語';
      case 'ko':
        return '한국어';
      case 'de':
        return 'Deutsch';
      case 'pt':
        return 'Português (Brasil)';
      default:
        return locale.languageCode.toUpperCase();
    }
  }

  /// ロケールに対応するフラグ絵文字を取得
  static String getFlag(Locale locale) {
    switch (locale.languageCode) {
      case 'en':
        return '🇺🇸';
      case 'ja':
        return '🇯🇵';
      case 'ko':
        return '🇰🇷';
      case 'de':
        return '🇩🇪';
      case 'pt':
        return '🇧🇷';
      default:
        return '🌐';
    }
  }

  /// サポートされているロケールかチェック
  static bool isSupported(Locale locale) {
    return locales.any(
      (supported) =>
          supported.languageCode == locale.languageCode &&
          (supported.countryCode == locale.countryCode ||
              supported.languageCode == 'pt' && locale.countryCode == 'BR'),
    );
  }

  /// 端末の言語設定から最適なロケールを選択
  static Locale getBestMatch() {
    final deviceLocale = ui.PlatformDispatcher.instance.locale;

    // 完全一致を探す
    for (final supported in locales) {
      if (supported.languageCode == deviceLocale.languageCode &&
          supported.countryCode == deviceLocale.countryCode) {
        return supported;
      }
    }

    // 言語コードのみ一致を探す
    for (final supported in locales) {
      if (supported.languageCode == deviceLocale.languageCode) {
        return supported;
      }
    }

    // デフォルトは英語
    return const Locale('en', 'US');
  }
}

/// SharedPreferencesから言語設定を読み込むProvider
@riverpod
Future<SharedPreferences> sharedPreferences(SharedPreferencesRef ref) async {
  return await SharedPreferences.getInstance();
}

/// 現在選択されている言語を管理するProvider
@riverpod
class LocaleNotifier extends _$LocaleNotifier {
  static const String _localeKey = 'selected_locale';

  @override
  Future<Locale> build() async {
    final prefs = await ref.watch(sharedPreferencesProvider.future);

    // 保存された言語設定を読み込む
    final savedLanguageCode = prefs.getString('${_localeKey}_language');
    final savedCountryCode = prefs.getString('${_localeKey}_country');

    if (savedLanguageCode != null && savedCountryCode != null) {
      final savedLocale = Locale(savedLanguageCode, savedCountryCode);
      if (SupportedLocales.isSupported(savedLocale)) {
        return savedLocale;
      }
    }

    // 保存された設定がない場合は端末設定から最適なロケールを選択
    return SupportedLocales.getBestMatch();
  }

  /// 言語を変更する
  Future<void> setLocale(Locale locale) async {
    if (!SupportedLocales.isSupported(locale)) {
      throw ArgumentError('Unsupported locale: $locale');
    }

    final prefs = await ref.read(sharedPreferencesProvider.future);

    // SharedPreferencesに保存
    await prefs.setString('${_localeKey}_language', locale.languageCode);
    await prefs.setString('${_localeKey}_country', locale.countryCode ?? '');

    // 状態を更新
    state = AsyncData(locale);
  }

  /// 言語設定をリセット（端末設定を使用）
  Future<void> resetToSystemLocale() async {
    final prefs = await ref.read(sharedPreferencesProvider.future);

    // 保存された設定を削除
    await prefs.remove('${_localeKey}_language');
    await prefs.remove('${_localeKey}_country');

    // システムロケールを設定
    final systemLocale = SupportedLocales.getBestMatch();
    state = AsyncData(systemLocale);
  }
}

/// 現在のロケールを簡単に取得するためのProvider
@riverpod
Locale? currentLocale(CurrentLocaleRef ref) {
  final asyncLocale = ref.watch(localeNotifierProvider);
  return asyncLocale.maybeWhen(data: (locale) => locale, orElse: () => null);
}
