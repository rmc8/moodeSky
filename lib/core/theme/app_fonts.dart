// Flutter imports:
import 'package:flutter/material.dart';

/// アプリケーション全体のフォント管理クラス
class AppFonts {
  AppFonts._();

  /// ロケールに応じたフォントファミリーを取得
  static String getFontFamilyForLocale(Locale locale) {
    switch (locale.languageCode) {
      case 'ja':
        return 'NotoSansJP';
      case 'ko':
        return 'NotoSansKR';
      case 'zh':
        return 'NotoSansSC';
      default:
        return 'Inter';
    }
  }

  /// モノスペースフォントスタイルを取得
  static TextStyle getMonospaceStyle(
    TextStyle baseStyle,
    String languageCode,
  ) {
    return baseStyle.copyWith(
      fontFamily: _getMonospaceFontFamily(languageCode),
      letterSpacing: 0.0,
    );
  }

  /// CJK言語に対してフォントウェイトを調整
  static FontWeight adjustFontWeightForCJK(
    FontWeight baseWeight,
    String languageCode,
  ) {
    // CJK言語の場合、フォントウェイトを少し軽くする
    if (['ja', 'ko', 'zh'].contains(languageCode)) {
      switch (baseWeight) {
        case FontWeight.w900:
          return FontWeight.w800;
        case FontWeight.w800:
          return FontWeight.w700;
        case FontWeight.w700:
          return FontWeight.w600;
        case FontWeight.w600:
          return FontWeight.w500;
        default:
          return baseWeight;
      }
    }
    return baseWeight;
  }

  /// モノスペースフォントファミリーを取得（内部用）
  static String _getMonospaceFontFamily(String languageCode) {
    switch (languageCode) {
      case 'ja':
        return 'NotoSansMonoJP';
      case 'ko':
        return 'NotoSansMonoKR';
      case 'zh':
        return 'NotoSansMonoSC';
      default:
        return 'JetBrainsMono';
    }
  }
}

/// ThemeDataにロケール対応フォントを適用する拡張
extension ThemeDataFontExtensions on ThemeData {
  /// ロケールに応じたフォントを適用したThemeDataを返す
  ThemeData withLocaleFonts(Locale locale) {
    final fontFamily = AppFonts.getFontFamilyForLocale(locale);
    
    return copyWith(
      textTheme: textTheme.apply(fontFamily: fontFamily),
      primaryTextTheme: primaryTextTheme.apply(fontFamily: fontFamily),
    );
  }
}