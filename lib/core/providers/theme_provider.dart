// Flutter imports:
import 'package:flutter/material.dart';

// Package imports:
import 'package:riverpod_annotation/riverpod_annotation.dart';

// Project imports:
import 'package:moodesky/core/providers/locale_provider.dart';
import 'package:moodesky/core/theme/app_fonts.dart';
import 'package:moodesky/core/theme/app_themes.dart';

part 'theme_provider.g.dart';

/// テーマモード設定
enum AppThemeMode {
  light,
  dark,
  system,
}

extension AppThemeModeExtension on AppThemeMode {
  String get displayName {
    switch (this) {
      case AppThemeMode.light:
        return 'Light';
      case AppThemeMode.dark:
        return 'Dark';
      case AppThemeMode.system:
        return 'System';
    }
  }
  
  String get localizedKey {
    switch (this) {
      case AppThemeMode.light:
        return 'themeLight';
      case AppThemeMode.dark:
        return 'themeDark';
      case AppThemeMode.system:
        return 'themeSystem';
    }
  }
  
  IconData get icon {
    switch (this) {
      case AppThemeMode.light:
        return Icons.light_mode;
      case AppThemeMode.dark:
        return Icons.dark_mode;
      case AppThemeMode.system:
        return Icons.brightness_auto;
    }
  }
  
  ThemeMode get flutterThemeMode {
    switch (this) {
      case AppThemeMode.light:
        return ThemeMode.light;
      case AppThemeMode.dark:
        return ThemeMode.dark;
      case AppThemeMode.system:
        return ThemeMode.system;
    }
  }
}

/// テーマ設定を管理するプロバイダー
@riverpod
class ThemeNotifier extends _$ThemeNotifier {
  static const String _themeKey = 'app_theme_mode';

  @override
  Future<AppThemeMode> build() async {
    final prefs = await ref.watch(sharedPreferencesProvider.future);
    
    // 保存されたテーマ設定を読み込む
    final savedThemeIndex = prefs.getInt(_themeKey);
    
    if (savedThemeIndex != null && 
        savedThemeIndex >= 0 && 
        savedThemeIndex < AppThemeMode.values.length) {
      return AppThemeMode.values[savedThemeIndex];
    }
    
    // デフォルトはシステム設定に従う
    return AppThemeMode.system;
  }

  /// テーマモードを変更する
  Future<void> setThemeMode(AppThemeMode themeMode) async {
    final prefs = await ref.read(sharedPreferencesProvider.future);
    
    // SharedPreferencesに保存
    await prefs.setInt(_themeKey, themeMode.index);
    
    // 状態を更新
    state = AsyncData(themeMode);
  }

  /// システム設定にリセット
  Future<void> resetToSystemTheme() async {
    await setThemeMode(AppThemeMode.system);
  }
}

/// 現在のテーマモードを簡単に取得するためのプロバイダー
@riverpod
AppThemeMode? currentThemeMode(AutoDisposeProviderRef<AppThemeMode?> ref) {
  final asyncThemeMode = ref.watch(themeNotifierProvider);
  return asyncThemeMode.maybeWhen(
    data: (themeMode) => themeMode,
    orElse: () => null,
  );
}

/// Flutter ThemeModeを取得するプロバイダー
@riverpod
ThemeMode flutterThemeMode(AutoDisposeProviderRef<ThemeMode> ref) {
  final themeMode = ref.watch(currentThemeModeProvider);
  return themeMode?.flutterThemeMode ?? ThemeMode.system;
}

/// ライトテーマを提供するプロバイダー（ロケールに応じたフォントを適用）
@riverpod
ThemeData lightTheme(AutoDisposeProviderRef<ThemeData> ref) {
  final locale = ref.watch(currentLocaleProvider);
  return AppThemes.lightTheme.withLocaleFonts(locale);
}

/// ダークテーマを提供するプロバイダー（ロケールに応じたフォントを適用）
@riverpod
ThemeData darkTheme(AutoDisposeProviderRef<ThemeData> ref) {
  final locale = ref.watch(currentLocaleProvider);
  return AppThemes.darkTheme.withLocaleFonts(locale);
}

/// 現在のフォントファミリーを取得するプロバイダー
@riverpod
String currentFontFamily(AutoDisposeProviderRef<String> ref) {
  final locale = ref.watch(currentLocaleProvider);
  return AppFonts.getFontFamilyForLocale(locale);
}

/// モノスペースフォント用のTextStyleを提供するプロバイダー
@riverpod
TextStyle monospaceTextStyle(
  AutoDisposeProviderRef<TextStyle> ref, {
  double fontSize = 14,
  FontWeight fontWeight = FontWeight.w400,
  Color? color,
}) {
  return AppFonts.getMonospaceStyle(
    fontSize: fontSize,
    fontWeight: fontWeight,
    color: color,
  );
}

/// 言語に応じて調整されたフォントウェイトを取得するプロバイダー
@riverpod
FontWeight adjustedFontWeight(AutoDisposeProviderRef<FontWeight> ref, FontWeight baseWeight) {
  final locale = ref.watch(currentLocaleProvider);
  final languageCode = locale?.languageCode ?? 'en';
  return AppFonts.adjustFontWeightForCJK(baseWeight, languageCode);
}