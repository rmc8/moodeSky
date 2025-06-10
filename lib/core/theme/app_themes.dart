// Flutter imports:
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// MoodeSkyアプリのテーマ定義
class AppThemes {
  /// 空をイメージした爽やかな青（ライトテーマ用）
  static const Color skyBlue = Color(0xFF2196F3); // Material Blue 500
  static const Color skyBlueLight = Color(0xFF64B5F6); // Material Blue 400
  static const Color skyBlueDark = Color(0xFF1976D2); // Material Blue 700
  
  /// 夕焼けをイメージしたオレンジ（ダークテーマ用）
  static const Color sunsetOrange = Color(0xFFFF7043); // Material Deep Orange 400
  static const Color sunsetOrangeLight = Color(0xFFFF8A65); // Material Deep Orange 300
  static const Color sunsetOrangeDark = Color(0xFFFF5722); // Material Deep Orange 500

  /// アクション用カラー
  static const Color repostGreen = Color(0xFF4CAF50); // Material Green 500
  static const Color likeRed = Color(0xFFF44336); // Material Red 500

  /// ライトテーマ - 空の青をアクセントに
  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    
    // カラースキーム
    colorScheme: ColorScheme.fromSeed(
      seedColor: skyBlue,
      brightness: Brightness.light,
    ).copyWith(
      primary: skyBlue,
      primaryContainer: skyBlueLight.withValues(alpha: 0.1),
      onPrimaryContainer: skyBlueDark,
      secondary: skyBlueLight,
      tertiary: const Color(0xFF4FC3F7), // Light Blue 300
      surface: Colors.white,
      surfaceContainer: const Color(0xFFF8F9FA),
      surfaceContainerHighest: const Color(0xFFE3F2FD),
      onSurface: const Color(0xFF1A1A1A),
      onSurfaceVariant: const Color(0xFF616161),
      outline: const Color(0xFFE0E0E0),
      outlineVariant: const Color(0xFFF5F5F5),
    ),
    
    // AppBar
    appBarTheme: const AppBarTheme(
      elevation: 0,
      centerTitle: true,
      backgroundColor: Colors.transparent,
      foregroundColor: Color(0xFF1A1A1A),
      titleTextStyle: TextStyle(
        color: Color(0xFF1A1A1A),
        fontSize: 20,
        fontWeight: FontWeight.w600,
      ),
    ),
    
    // カード
    cardTheme: CardThemeData(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: Colors.grey.shade200,
          width: 1,
        ),
      ),
    ),
    
    // リストタイル
    listTileTheme: const ListTileThemeData(
      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      horizontalTitleGap: 16,
    ),
    
    // 区切り線
    dividerTheme: const DividerThemeData(
      color: Color(0xFFE0E0E0),
      thickness: 0.5,
      space: 1,
    ),
    
    // インプットフィールド
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFFF8F9FA),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: skyBlue, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    ),
    
    // スナックバー
    snackBarTheme: SnackBarThemeData(
      backgroundColor: const Color(0xFF1A1A1A),
      contentTextStyle: const TextStyle(color: Colors.white),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      behavior: SnackBarBehavior.floating,
    ),
  );

  /// ダークテーマ - 夕焼けのオレンジをアクセントに
  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    
    // カラースキーム
    colorScheme: ColorScheme.fromSeed(
      seedColor: sunsetOrange,
      brightness: Brightness.dark,
    ).copyWith(
      primary: sunsetOrange,
      primaryContainer: sunsetOrange.withValues(alpha: 0.2),
      onPrimaryContainer: sunsetOrangeLight,
      secondary: sunsetOrangeLight,
      tertiary: const Color(0xFFFFAB91), // Deep Orange 200
      surface: const Color(0xFF121212),
      surfaceContainer: const Color(0xFF1E1E1E),
      surfaceContainerHighest: const Color(0xFF2D2D2D),
      onSurface: const Color(0xFFE0E0E0),
      onSurfaceVariant: const Color(0xFFBDBDBD),
      outline: const Color(0xFF3D3D3D),
      outlineVariant: const Color(0xFF2D2D2D),
    ),
    
    // AppBar
    appBarTheme: const AppBarTheme(
      elevation: 0,
      centerTitle: true,
      backgroundColor: Colors.transparent,
      foregroundColor: Color(0xFFE0E0E0),
      titleTextStyle: TextStyle(
        color: Color(0xFFE0E0E0),
        fontSize: 20,
        fontWeight: FontWeight.w600,
      ),
    ),
    
    // カード
    cardTheme: const CardThemeData(
      elevation: 0,
      color: Color(0xFF1E1E1E),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(12)),
        side: BorderSide(
          color: Color(0xFF3D3D3D),
          width: 1,
        ),
      ),
    ),
    
    // リストタイル
    listTileTheme: const ListTileThemeData(
      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      horizontalTitleGap: 16,
    ),
    
    // 区切り線
    dividerTheme: const DividerThemeData(
      color: Color(0xFF3D3D3D),
      thickness: 0.5,
      space: 1,
    ),
    
    // インプットフィールド
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFF2D2D2D),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF3D3D3D)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF3D3D3D)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: sunsetOrange, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    ),
    
    // スナックバー
    snackBarTheme: SnackBarThemeData(
      backgroundColor: const Color(0xFF2D2D2D),
      contentTextStyle: const TextStyle(color: Color(0xFFE0E0E0)),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      behavior: SnackBarBehavior.floating,
    ),
  );

  /// ライトテーマ用のシステムUIオーバーレイスタイル
  static const SystemUiOverlayStyle lightSystemUiOverlayStyle = SystemUiOverlayStyle(
    statusBarColor: Colors.white,
    statusBarIconBrightness: Brightness.dark,
    statusBarBrightness: Brightness.light,
    systemNavigationBarColor: Colors.white,
    systemNavigationBarIconBrightness: Brightness.dark,
    systemNavigationBarDividerColor: Color(0xFFE0E0E0),
  );

  /// ダークテーマ用のシステムUIオーバーレイスタイル  
  static const SystemUiOverlayStyle darkSystemUiOverlayStyle = SystemUiOverlayStyle(
    statusBarColor: Color(0xFF121212),
    statusBarIconBrightness: Brightness.light,
    statusBarBrightness: Brightness.dark,
    systemNavigationBarColor: Color(0xFF121212),
    systemNavigationBarIconBrightness: Brightness.light,
    systemNavigationBarDividerColor: Color(0xFF3D3D3D),
  );

  /// 現在のテーマに基づいてシステムUIオーバーレイスタイルを取得
  static SystemUiOverlayStyle getSystemUiOverlayStyle(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final baseStyle = brightness == Brightness.light
        ? lightSystemUiOverlayStyle
        : darkSystemUiOverlayStyle;
    
    // プラットフォーム固有の調整
    return baseStyle.copyWith(
      // iOS用の追加設定
      statusBarBrightness: brightness == Brightness.light 
          ? Brightness.light 
          : Brightness.dark,
      // 確実にアイコンの色を設定
      statusBarIconBrightness: brightness == Brightness.light 
          ? Brightness.dark 
          : Brightness.light,
    );
  }

  /// システムUIオーバーレイスタイルを適用
  static void setSystemUiOverlayStyle(BuildContext context) {
    SystemChrome.setSystemUIOverlayStyle(getSystemUiOverlayStyle(context));
  }
}

/// ポストアイテム用のスタイル
class PostItemStyle {
  final BuildContext context;
  
  const PostItemStyle(this.context);
  
  /// ポストアイテムの装飾（上下線のみ）
  BoxDecoration getPostDecoration() {
    return BoxDecoration(
      color: Theme.of(context).colorScheme.surface,
      border: Border(
        top: BorderSide(color: Theme.of(context).colorScheme.outline, width: 0.5),
        bottom: BorderSide(color: Theme.of(context).colorScheme.outline, width: 0.5),
      ),
    );
  }
  
  /// ポストアイテムの内側パディング
  static const EdgeInsets postPadding = EdgeInsets.symmetric(
    horizontal: 20,
    vertical: 16,
  );
  
  /// ポストアイテム間のマージン
  static const EdgeInsets postMargin = EdgeInsets.zero;
  
  /// ポストの区切り線用Widget
  Widget buildPostDivider() {
    return Container(
      height: 0.5,
      color: Theme.of(context).colorScheme.outline,
    );
  }
  
  /// ポストアイテムのContainer（下ボーダーのみ統一）
  Widget buildPostContainer({
    required Widget child,
    bool showTopBorder = false, // 非推奨：後方互換のため残す
    bool showBottomBorder = true, // 常に下ボーダーを表示
  }) {
    return Container(
      width: double.infinity,
      padding: postPadding,
      margin: postMargin,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          // 上ボーダーは廃止（重複による太線を防ぐ）
          bottom: showBottomBorder 
              ? BorderSide(color: Theme.of(context).colorScheme.outline, width: 0.5)
              : BorderSide.none,
        ),
      ),
      child: child,
    );
  }
  
  // 静的なファクトリーメソッドを後方互換性のために残す
  static Widget buildPostContainerStatic({
    required BuildContext context,
    required Widget child,
    bool showTopBorder = false, // 非推奨：後方互換のため残す
    bool showBottomBorder = true, // 常に下ボーダーを表示
  }) {
    return PostItemStyle(context).buildPostContainer(
      child: child,
      showTopBorder: showTopBorder,
      showBottomBorder: showBottomBorder,
    );
  }
}

/// アクション用カラーのエクステンション
extension AppActionColors on ColorScheme {
  /// リポスト用の緑色
  Color get repostColor => AppThemes.repostGreen;
  
  /// いいね用の赤色
  Color get likeColor => AppThemes.likeRed;
}