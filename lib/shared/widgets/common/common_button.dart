// Flutter imports:
import 'package:flutter/material.dart';

// Project imports:
import 'app_border_radius.dart';
import 'app_spacing.dart';

/// 共通ボタンサイズの列挙型
enum CommonButtonSize {
  small,
  medium,
  large,
}

/// 共通ボタンウィジェット
class CommonButton extends StatelessWidget {
  const CommonButton({
    super.key,
    required this.onPressed,
    required this.child,
    this.size = CommonButtonSize.medium,
    this.isOutlined = false,
    this.isText = false,
    this.backgroundColor,
    this.foregroundColor,
    this.borderColor,
    this.borderRadius,
    this.padding,
    this.isLoading = false,
    this.isEnabled = true,
  });

  final VoidCallback? onPressed;
  final Widget child;
  final CommonButtonSize size;
  final bool isOutlined;
  final bool isText;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final Color? borderColor;
  final BorderRadius? borderRadius;
  final EdgeInsets? padding;
  final bool isLoading;
  final bool isEnabled;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    // サイズに基づくパディング
    EdgeInsets defaultPadding;
    double iconSize;
    
    switch (size) {
      case CommonButtonSize.small:
        defaultPadding = const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: AppSpacing.xs,
        );
        iconSize = 16;
        break;
      case CommonButtonSize.medium:
        defaultPadding = const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        );
        iconSize = 20;
        break;
      case CommonButtonSize.large:
        defaultPadding = const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.md,
        );
        iconSize = 24;
        break;
    }

    Widget buttonChild = child;
    
    // ローディング状態の処理
    if (isLoading) {
      buttonChild = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: iconSize,
            height: iconSize,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: foregroundColor ?? 
                (isText ? colorScheme.primary : colorScheme.onPrimary),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          child,
        ],
      );
    }

    final bool enabled = isEnabled && onPressed != null && !isLoading;

    // テキストボタンの場合
    if (isText) {
      return TextButton(
        onPressed: enabled ? onPressed : null,
        style: TextButton.styleFrom(
          foregroundColor: foregroundColor ?? colorScheme.primary,
          padding: padding ?? defaultPadding,
          shape: RoundedRectangleBorder(
            borderRadius: borderRadius ?? AppBorderRadius.buttonRadius,
          ),
        ),
        child: buttonChild,
      );
    }

    // アウトラインボタンの場合
    if (isOutlined) {
      return OutlinedButton(
        onPressed: enabled ? onPressed : null,
        style: OutlinedButton.styleFrom(
          foregroundColor: foregroundColor ?? colorScheme.primary,
          backgroundColor: backgroundColor,
          padding: padding ?? defaultPadding,
          side: BorderSide(
            color: borderColor ?? colorScheme.outline,
            width: 1,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: borderRadius ?? AppBorderRadius.buttonRadius,
          ),
        ),
        child: buttonChild,
      );
    }

    // 通常のボタン
    return ElevatedButton(
      onPressed: enabled ? onPressed : null,
      style: ElevatedButton.styleFrom(
        backgroundColor: backgroundColor ?? colorScheme.primary,
        foregroundColor: foregroundColor ?? colorScheme.onPrimary,
        padding: padding ?? defaultPadding,
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: borderRadius ?? AppBorderRadius.buttonRadius,
        ),
      ),
      child: buttonChild,
    );
  }
}

/// 共通ボタンファクトリクラス
class CommonButtonFactories {
  CommonButtonFactories._();

  /// 主要アクション用のボタン
  static Widget primary({
    required VoidCallback? onPressed,
    required Widget child,
    CommonButtonSize size = CommonButtonSize.medium,
    bool isLoading = false,
    bool isEnabled = true,
    Color? backgroundColor,
    Color? foregroundColor,
    EdgeInsets? padding,
    double? width,
  }) {
    Widget button = CommonButton(
      onPressed: onPressed,
      size: size,
      isLoading: isLoading,
      isEnabled: isEnabled,
      backgroundColor: backgroundColor,
      foregroundColor: foregroundColor,
      padding: padding,
      child: child,
    );
    
    if (width != null) {
      return SizedBox(width: width, child: button);
    }
    
    return button;
  }

  /// 副次アクション用のアウトラインボタン
  static Widget secondary({
    required VoidCallback? onPressed,
    required Widget child,
    CommonButtonSize size = CommonButtonSize.medium,
    bool isLoading = false,
    bool isEnabled = true,
    Color? foregroundColor,
    Color? borderColor,
    EdgeInsets? padding,
  }) {
    return CommonButton(
      onPressed: onPressed,
      size: size,
      isOutlined: true,
      isLoading: isLoading,
      isEnabled: isEnabled,
      foregroundColor: foregroundColor,
      borderColor: borderColor,
      padding: padding,
      child: child,
    );
  }

  /// テキストボタン
  static Widget text({
    required VoidCallback? onPressed,
    required Widget child,
    CommonButtonSize size = CommonButtonSize.medium,
    bool isLoading = false,
    bool isEnabled = true,
    Color? foregroundColor,
    EdgeInsets? padding,
  }) {
    return CommonButton(
      onPressed: onPressed,
      size: size,
      isText: true,
      isLoading: isLoading,
      isEnabled: isEnabled,
      foregroundColor: foregroundColor,
      padding: padding,
      child: child,
    );
  }

  /// 危険なアクション用のボタン（削除など）
  static Widget destructive({
    required VoidCallback? onPressed,
    required Widget child,
    CommonButtonSize size = CommonButtonSize.medium,
    bool isLoading = false,
    bool isEnabled = true,
    bool isOutlined = false,
    EdgeInsets? padding,
  }) {
    return Builder(
      builder: (context) {
        final colorScheme = Theme.of(context).colorScheme;
        return CommonButton(
          onPressed: onPressed,
          size: size,
          isOutlined: isOutlined,
          isLoading: isLoading,
          isEnabled: isEnabled,
          backgroundColor: isOutlined ? null : colorScheme.error,
          foregroundColor: isOutlined ? colorScheme.error : colorScheme.onError,
          borderColor: isOutlined ? colorScheme.error : null,
          padding: padding,
          child: child,
        );
      },
    );
  }

  /// 成功アクション用のボタン
  static Widget success({
    required VoidCallback? onPressed,
    required Widget child,
    CommonButtonSize size = CommonButtonSize.medium,
    bool isLoading = false,
    bool isEnabled = true,
    bool isOutlined = false,
    EdgeInsets? padding,
  }) {
    return Builder(
      builder: (context) {
        final colorScheme = Theme.of(context).colorScheme;
        // Material 3では成功色は通常primary colorを使用
        final successColor = colorScheme.primary;
        final onSuccessColor = colorScheme.onPrimary;
        
        return CommonButton(
          onPressed: onPressed,
          size: size,
          isOutlined: isOutlined,
          isLoading: isLoading,
          isEnabled: isEnabled,
          backgroundColor: isOutlined ? null : successColor,
          foregroundColor: isOutlined ? successColor : onSuccessColor,
          borderColor: isOutlined ? successColor : null,
          padding: padding,
          child: child,
        );
      },
    );
  }

  /// アイコン付きボタン
  static Widget withIcon({
    required VoidCallback? onPressed,
    required IconData icon,
    required String text,
    CommonButtonSize size = CommonButtonSize.medium,
    bool isLoading = false,
    bool isEnabled = true,
    bool isOutlined = false,
    bool isText = false,
    Color? backgroundColor,
    Color? foregroundColor,
    EdgeInsets? padding,
  }) {
    return CommonButton(
      onPressed: onPressed,
      size: size,
      isOutlined: isOutlined,
      isText: isText,
      isLoading: isLoading,
      isEnabled: isEnabled,
      backgroundColor: backgroundColor,
      foregroundColor: foregroundColor,
      padding: padding,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: size == CommonButtonSize.small ? 16 : 
                      size == CommonButtonSize.medium ? 20 : 24),
          const SizedBox(width: AppSpacing.sm),
          Text(text),
        ],
      ),
    );
  }
}