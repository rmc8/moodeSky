// Flutter imports:
import 'package:flutter/material.dart';

// Project imports:
import 'package:moodesky/core/theme/app_themes.dart';

/// テーマ関連のヘルパー拡張
extension BuildContextThemeHelpers on BuildContext {
  /// アプリのカラーパレットを取得
  AppColorScheme get appColors => AppThemes.getColorScheme(this);
  
  /// アプリのテキストスタイルを取得
  AppTextStyles get appTextStyles => AppThemes.getTextStyles(this);
  
  /// ライトモードかどうかを判定
  bool get isLight => Theme.of(this).brightness == Brightness.light;
  
  /// ダークモードかどうかを判定
  bool get isDark => Theme.of(this).brightness == Brightness.dark;
}