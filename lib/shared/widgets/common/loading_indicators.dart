// Flutter imports:
import 'package:flutter/material.dart';

/// ローディングインジケーターの共通ウィジェット集
class LoadingIndicators {
  LoadingIndicators._();
  
  /// 標準的なローディングスピナー
  static Widget spinner({
    double? size,
    Color? color,
    double? strokeWidth,
  }) {
    return SizedBox(
      width: size ?? 24,
      height: size ?? 24,
      child: CircularProgressIndicator(
        color: color,
        strokeWidth: strokeWidth ?? 2.0,
      ),
    );
  }
  
  /// 標準サイズのローディングスピナー（standardエイリアス）
  static Widget standard({
    Color? color,
    double? strokeWidth,
    String? message,
  }) {
    if (message != null) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          spinner(
            size: 24,
            color: color,
            strokeWidth: strokeWidth,
          ),
          const SizedBox(height: 8),
          Text(
            message,
            style: const TextStyle(fontSize: 14),
          ),
        ],
      );
    }
    
    return spinner(
      size: 24,
      color: color,
      strokeWidth: strokeWidth,
    );
  }
  
  /// 中央配置されたローディングスピナー
  static Widget center({
    double? size,
    Color? color,
    double? strokeWidth,
  }) {
    return Center(
      child: spinner(
        size: size,
        color: color,
        strokeWidth: strokeWidth,
      ),
    );
  }
  
  /// カード形式のローディング
  static Widget card({
    double? height,
    EdgeInsets? margin,
    EdgeInsets? padding,
  }) {
    return Container(
      height: height ?? 120,
      margin: margin ?? const EdgeInsets.all(8.0),
      padding: padding ?? const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8.0),
      ),
      child: center(size: 32),
    );
  }
  
  /// リスト項目用のローディング
  static Widget listItem({
    double? height,
    EdgeInsets? margin,
  }) {
    return Container(
      height: height ?? 60,
      margin: margin ?? const EdgeInsets.symmetric(
        vertical: 4.0,
        horizontal: 16.0,
      ),
      child: Row(
        children: [
          spinner(size: 20),
          const SizedBox(width: 16),
          const Expanded(
            child: Text(
              'Loading...',
              style: TextStyle(color: Colors.grey),
            ),
          ),
        ],
      ),
    );
  }
  
  /// ページ全体のローディングオーバーレイ
  static Widget overlay({
    Color? backgroundColor,
    String? message,
  }) {
    return Container(
      color: backgroundColor ?? Colors.black26,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            spinner(size: 48, color: Colors.white),
            if (message != null) ...[
              const SizedBox(height: 16),
              Text(
                message,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}