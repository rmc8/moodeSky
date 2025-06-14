// Flutter imports:
import 'package:flutter/material.dart';

/// アプリケーション全体で使用するボーダーラディウス定数
class AppBorderRadius {
  AppBorderRadius._();
  
  // 基本ボーダーラディウス値
  static const double none = 0.0;
  static const double xs = 2.0;
  static const double sm = 4.0;
  static const double md = 8.0;
  static const double lg = 12.0;
  static const double xl = 16.0;
  static const double xxl = 24.0;
  static const double full = 999.0; // 完全な丸み
  
  // 特定用途のボーダーラディウス
  static const double button = md;
  static const double card = lg;
  static const double dialog = xl;
  static const double avatar = full;
  static const double textField = sm;
  
  // BorderRadius ヘルパー
  static const BorderRadius noneRadius = BorderRadius.zero;
  static const BorderRadius xsRadius = BorderRadius.all(Radius.circular(xs));
  static const BorderRadius smRadius = BorderRadius.all(Radius.circular(sm));
  static const BorderRadius mdRadius = BorderRadius.all(Radius.circular(md));
  static const BorderRadius lgRadius = BorderRadius.all(Radius.circular(lg));
  static const BorderRadius xlRadius = BorderRadius.all(Radius.circular(xl));
  static const BorderRadius xxlRadius = BorderRadius.all(Radius.circular(xxl));
  static const BorderRadius fullRadius = BorderRadius.all(Radius.circular(full));
  
  // 特定用途のBorderRadius
  static const BorderRadius buttonRadius = BorderRadius.all(Radius.circular(button));
  static const BorderRadius cardRadius = BorderRadius.all(Radius.circular(card));
  static const BorderRadius dialogRadius = BorderRadius.all(Radius.circular(dialog));
  static const BorderRadius avatarRadius = BorderRadius.all(Radius.circular(avatar));
  static const BorderRadius textFieldRadius = BorderRadius.all(Radius.circular(textField));
  
  // 動的ボーダーラディウス
  static BorderRadius all(double radius) => BorderRadius.circular(radius);
  
  static BorderRadius only({
    double topLeft = 0,
    double topRight = 0,
    double bottomLeft = 0,
    double bottomRight = 0,
  }) =>
      BorderRadius.only(
        topLeft: Radius.circular(topLeft),
        topRight: Radius.circular(topRight),
        bottomLeft: Radius.circular(bottomLeft),
        bottomRight: Radius.circular(bottomRight),
      );
  
  static BorderRadius top(double radius) => BorderRadius.only(
        topLeft: Radius.circular(radius),
        topRight: Radius.circular(radius),
      );
  
  static BorderRadius bottom(double radius) => BorderRadius.only(
        bottomLeft: Radius.circular(radius),
        bottomRight: Radius.circular(radius),
      );
  
  static BorderRadius left(double radius) => BorderRadius.only(
        topLeft: Radius.circular(radius),
        bottomLeft: Radius.circular(radius),
      );
  
  static BorderRadius right(double radius) => BorderRadius.only(
        topRight: Radius.circular(radius),
        bottomRight: Radius.circular(radius),
      );
}