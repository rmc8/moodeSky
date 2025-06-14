// Flutter imports:
import 'package:flutter/material.dart';

// Project imports:
import 'app_spacing.dart';
import 'common_button.dart';
import 'common_container.dart';

/// エラー表示用の共通ウィジェット集
class ErrorWidgets {
  ErrorWidgets._();

  /// 基本的なエラーメッセージ表示
  static Widget message({
    required String message,
    IconData? icon,
    Color? iconColor,
    TextStyle? textStyle,
    EdgeInsets? padding,
  }) {
    return Padding(
      padding: padding ?? AppSpacing.allMd,
      child: Row(
        children: [
          if (icon != null) ...[
            Icon(
              icon,
              color: iconColor,
              size: 20,
            ),
            const SizedBox(width: AppSpacing.sm),
          ],
          Expanded(
            child: Text(
              message,
              style: textStyle,
            ),
          ),
        ],
      ),
    );
  }

  /// 中央配置されたエラーメッセージ
  static Widget center({
    required String message,
    String? subtitle,
    IconData? icon,
    Color? iconColor,
    TextStyle? titleStyle,
    TextStyle? subtitleStyle,
    VoidCallback? onRetry,
    String? retryButtonText,
    String? retryLabel, // retryButtonTextのエイリアス
  }) {
    final effectiveRetryText = retryLabel ?? retryButtonText ?? 'Retry';
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (icon != null) ...[
            Icon(
              icon,
              size: 48,
              color: iconColor,
            ),
            const SizedBox(height: AppSpacing.md),
          ],
          Text(
            message,
            style: titleStyle,
            textAlign: TextAlign.center,
          ),
          if (subtitle != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              subtitle,
              style: subtitleStyle,
              textAlign: TextAlign.center,
            ),
          ],
          if (onRetry != null) ...[
            const SizedBox(height: AppSpacing.lg),
            CommonButtonFactories.primary(
              onPressed: onRetry,
              child: Text(effectiveRetryText),
            ),
          ],
        ],
      ),
    );
  }

  /// カード形式のエラー表示
  static Widget card({
    required String title,
    String? message,
    IconData? icon,
    Color? iconColor,
    VoidCallback? onRetry,
    VoidCallback? onDismiss,
    String? retryButtonText,
    String? retryLabel, // retryButtonTextのエイリアス
    String? dismissButtonText,
    EdgeInsets? margin,
  }) {
    final effectiveRetryText = retryLabel ?? retryButtonText ?? 'Retry';
    return Builder(
      builder: (context) {
        final theme = Theme.of(context);
        final colorScheme = theme.colorScheme;
        
        return CommonContainerFactories.card(
          margin: margin ?? AppSpacing.allMd,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  if (icon != null) ...[
                    Icon(
                      icon,
                      color: iconColor ?? colorScheme.error,
                      size: 24,
                    ),
                    const SizedBox(width: AppSpacing.sm),
                  ],
                  Expanded(
                    child: Text(
                      title,
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: colorScheme.error,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  if (onDismiss != null)
                    IconButton(
                      onPressed: onDismiss,
                      icon: const Icon(Icons.close),
                      iconSize: 20,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                ],
              ),
              if (message != null) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(
                  message,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
              if (onRetry != null) ...[
                const SizedBox(height: AppSpacing.md),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    CommonButtonFactories.text(
                      onPressed: onRetry,
                      size: CommonButtonSize.small,
                      child: Text(effectiveRetryText),
                    ),
                  ],
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  /// バナー形式のエラー表示
  static Widget banner({
    required String message,
    IconData? icon,
    Color? backgroundColor,
    Color? textColor,
    VoidCallback? onDismiss,
    EdgeInsets? padding,
  }) {
    return Builder(
      builder: (context) {
        final theme = Theme.of(context);
        final colorScheme = theme.colorScheme;
        
        return Container(
          width: double.infinity,
          padding: padding ?? AppSpacing.allMd,
          decoration: BoxDecoration(
            color: backgroundColor ?? colorScheme.errorContainer,
            borderRadius: const BorderRadius.all(Radius.circular(4)),
          ),
          child: Row(
            children: [
              if (icon != null) ...[
                Icon(
                  icon,
                  color: textColor ?? colorScheme.onErrorContainer,
                  size: 20,
                ),
                const SizedBox(width: AppSpacing.sm),
              ],
              Expanded(
                child: Text(
                  message,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: textColor ?? colorScheme.onErrorContainer,
                  ),
                ),
              ),
              if (onDismiss != null) ...[
                const SizedBox(width: AppSpacing.sm),
                IconButton(
                  onPressed: onDismiss,
                  icon: Icon(
                    Icons.close,
                    color: textColor ?? colorScheme.onErrorContainer,
                  ),
                  iconSize: 20,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  /// ネットワークエラー専用
  static Widget networkError({
    String? message,
    VoidCallback? onRetry,
    String? retryButtonText,
  }) {
    return center(
      message: message ?? 'Network connection failed',
      subtitle: 'Please check your internet connection and try again.',
      icon: Icons.wifi_off,
      onRetry: onRetry,
      retryButtonText: retryButtonText,
    );
  }

  /// データ取得エラー専用
  static Widget dataLoadError({
    String? message,
    VoidCallback? onRetry,
    String? retryButtonText,
  }) {
    return center(
      message: message ?? 'Failed to load data',
      subtitle: 'Something went wrong while loading the data.',
      icon: Icons.error_outline,
      onRetry: onRetry,
      retryButtonText: retryButtonText,
    );
  }

  /// 認証エラー専用
  static Widget authenticationError({
    String? message,
    VoidCallback? onSignIn,
    String? signInButtonText,
  }) {
    return center(
      message: message ?? 'Authentication failed',
      subtitle: 'Please sign in to continue.',
      icon: Icons.lock_outline,
      onRetry: onSignIn,
      retryButtonText: signInButtonText ?? 'Sign In',
    );
  }

  /// 権限エラー専用
  static Widget permissionError({
    String? message,
    VoidCallback? onRequestPermission,
    String? requestButtonText,
  }) {
    return center(
      message: message ?? 'Permission required',
      subtitle: 'This feature requires permission to continue.',
      icon: Icons.security,
      onRetry: onRequestPermission,
      retryButtonText: requestButtonText ?? 'Grant Permission',
    );
  }

  /// 404エラー専用
  static Widget notFound({
    String? message,
    VoidCallback? onGoBack,
    String? backButtonText,
  }) {
    return center(
      message: message ?? 'Page not found',
      subtitle: 'The page you are looking for does not exist.',
      icon: Icons.search_off,
      onRetry: onGoBack,
      retryButtonText: backButtonText ?? 'Go Back',
    );
  }
}