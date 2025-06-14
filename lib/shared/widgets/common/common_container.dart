// Flutter imports:
import 'package:flutter/material.dart';

// Project imports:
import 'app_border_radius.dart';
import 'app_spacing.dart';

/// 共通コンテナスタイルの列挙型
enum CommonContainerStyle {
  card,
  elevated,
  outlined,
  filled,
  transparent,
  none,
}

/// 共通コンテナウィジェット
class CommonContainer extends StatelessWidget {
  const CommonContainer({
    super.key,
    required this.child,
    this.style = CommonContainerStyle.card,
    this.padding,
    this.margin,
    this.width,
    this.height,
    this.backgroundColor,
    this.borderColor,
    this.borderRadius,
    this.shadow,
    this.onTap,
    this.color, // backgroundColor のエイリアス
    this.border, // カスタムボーダー
  });

  final Widget child;
  final CommonContainerStyle style;
  final EdgeInsets? padding;
  final EdgeInsets? margin;
  final double? width;
  final double? height;
  final Color? backgroundColor;
  final Color? borderColor;
  final BorderRadius? borderRadius;
  final List<BoxShadow>? shadow;
  final VoidCallback? onTap;
  final Color? color; // backgroundColor のエイリアス
  final Border? border; // カスタムボーダー

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    // スタイルに基づくデフォルト値の決定
    Color defaultBackgroundColor;
    BorderRadius defaultBorderRadius;
    List<BoxShadow>? defaultShadow;
    
    switch (style) {
      case CommonContainerStyle.card:
        defaultBackgroundColor = colorScheme.surface;
        defaultBorderRadius = AppBorderRadius.cardRadius;
        defaultShadow = [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ];
        break;
      case CommonContainerStyle.elevated:
        defaultBackgroundColor = colorScheme.surface;
        defaultBorderRadius = AppBorderRadius.mdRadius;
        defaultShadow = [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ];
        break;
      case CommonContainerStyle.outlined:
        defaultBackgroundColor = Colors.transparent;
        defaultBorderRadius = AppBorderRadius.mdRadius;
        break;
      case CommonContainerStyle.filled:
        defaultBackgroundColor = colorScheme.surfaceContainerHighest;
        defaultBorderRadius = AppBorderRadius.mdRadius;
        break;
      case CommonContainerStyle.transparent:
        defaultBackgroundColor = Colors.transparent;
        defaultBorderRadius = BorderRadius.zero;
        break;
      case CommonContainerStyle.none:
        defaultBackgroundColor = Colors.transparent;
        defaultBorderRadius = BorderRadius.zero;
        break;
    }

    // color パラメータの優先処理
    final effectiveBackgroundColor = color ?? backgroundColor ?? defaultBackgroundColor;
    
    // border パラメータの優先処理
    final effectiveBorder = border ?? 
        (style == CommonContainerStyle.outlined 
            ? Border.all(
                color: borderColor ?? colorScheme.outline,
                width: 1,
              )
            : null);

    final container = Container(
      width: width,
      height: height,
      margin: margin,
      padding: padding ?? AppSpacing.allMd,
      decoration: BoxDecoration(
        color: effectiveBackgroundColor,
        borderRadius: borderRadius ?? defaultBorderRadius,
        boxShadow: shadow ?? defaultShadow,
        border: effectiveBorder,
      ),
      child: child,
    );

    if (onTap != null) {
      return InkWell(
        onTap: onTap,
        borderRadius: borderRadius ?? defaultBorderRadius,
        child: container,
      );
    }

    return container;
  }
}

/// 共通コンテナファクトリクラス
class CommonContainerFactories {
  CommonContainerFactories._();

  /// カードスタイルのコンテナ
  static Widget card({
    required Widget child,
    EdgeInsets? padding,
    EdgeInsets? margin,
    double? width,
    double? height,
    Color? backgroundColor,
    VoidCallback? onTap,
  }) {
    return CommonContainer(
      style: CommonContainerStyle.card,
      padding: padding,
      margin: margin,
      width: width,
      height: height,
      backgroundColor: backgroundColor,
      onTap: onTap,
      child: child,
    );
  }

  /// エレベーションありのコンテナ
  static Widget elevated({
    required Widget child,
    EdgeInsets? padding,
    EdgeInsets? margin,
    double? width,
    double? height,
    Color? backgroundColor,
    VoidCallback? onTap,
  }) {
    return CommonContainer(
      style: CommonContainerStyle.elevated,
      padding: padding,
      margin: margin,
      width: width,
      height: height,
      backgroundColor: backgroundColor,
      onTap: onTap,
      child: child,
    );
  }

  /// アウトラインスタイルのコンテナ
  static Widget outlined({
    required Widget child,
    EdgeInsets? padding,
    EdgeInsets? margin,
    double? width,
    double? height,
    Color? backgroundColor,
    Color? borderColor,
    VoidCallback? onTap,
  }) {
    return CommonContainer(
      style: CommonContainerStyle.outlined,
      padding: padding,
      margin: margin,
      width: width,
      height: height,
      backgroundColor: backgroundColor,
      borderColor: borderColor,
      onTap: onTap,
      child: child,
    );
  }

  /// フィルドスタイルのコンテナ
  static Widget filled({
    required Widget child,
    EdgeInsets? padding,
    EdgeInsets? margin,
    double? width,
    double? height,
    Color? backgroundColor,
    VoidCallback? onTap,
  }) {
    return CommonContainer(
      style: CommonContainerStyle.filled,
      padding: padding,
      margin: margin,
      width: width,
      height: height,
      backgroundColor: backgroundColor,
      onTap: onTap,
      child: child,
    );
  }

  /// 透明なコンテナ
  static Widget transparent({
    required Widget child,
    EdgeInsets? padding,
    EdgeInsets? margin,
    double? width,
    double? height,
    VoidCallback? onTap,
  }) {
    return CommonContainer(
      style: CommonContainerStyle.transparent,
      padding: padding,
      margin: margin,
      width: width,
      height: height,
      onTap: onTap,
      child: child,
    );
  }
}