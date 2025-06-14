// Flutter imports:
import 'package:flutter/material.dart';

/// アプリケーション全体で使用するスペーシング定数
class AppSpacing {
  AppSpacing._();
  
  // 基本スペーシング値
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 16.0;
  static const double lg = 24.0;
  static const double xl = 32.0;
  static const double xxl = 48.0;
  
  // 特定用途のスペーシング
  static const double cardPadding = md;
  static const double listItemPadding = sm;
  static const double buttonPadding = md;
  static const double sectionSpacing = lg;
  static const double pageMargin = md;
  
  // SizedBox ウィジェット用のヘルパー
  static const Widget verticalXs = SizedBox(height: xs);
  static const Widget verticalSm = SizedBox(height: sm);
  static const Widget verticalMd = SizedBox(height: md);
  static const Widget verticalLg = SizedBox(height: lg);
  static const Widget verticalXl = SizedBox(height: xl);
  static const Widget verticalXxl = SizedBox(height: xxl);
  
  static const Widget horizontalXs = SizedBox(width: xs);
  static const Widget horizontalSm = SizedBox(width: sm);
  static const Widget horizontalMd = SizedBox(width: md);
  static const Widget horizontalLg = SizedBox(width: lg);
  static const Widget horizontalXl = SizedBox(width: xl);
  static const Widget horizontalXxl = SizedBox(width: xxl);
  
  // 後方互換性のためのエイリアス
  static const Widget verticalSpacerXS = verticalXs;
  static const Widget verticalSpacerSM = verticalSm;
  static const Widget verticalSpacerMD = verticalMd;
  static const Widget verticalSpacerLG = verticalLg;
  static const Widget verticalSpacerXL = verticalXl;
  
  static const Widget horizontalSpacerXS = horizontalXs;
  static const Widget horizontalSpacerSM = horizontalSm;
  static const Widget horizontalSpacerMD = horizontalMd;
  static const Widget horizontalSpacerLG = horizontalLg;
  static const Widget horizontalSpacerXL = horizontalXl;
  
  // EdgeInsets ヘルパー
  static const EdgeInsets allXs = EdgeInsets.all(xs);
  static const EdgeInsets allSm = EdgeInsets.all(sm);
  static const EdgeInsets allMd = EdgeInsets.all(md);
  static const EdgeInsets allLg = EdgeInsets.all(lg);
  static const EdgeInsets allXl = EdgeInsets.all(xl);
  static const EdgeInsets allXxl = EdgeInsets.all(xxl);
  
  static const EdgeInsets paddingHorizontalXs = EdgeInsets.symmetric(horizontal: xs);
  static const EdgeInsets paddingHorizontalSm = EdgeInsets.symmetric(horizontal: sm);
  static const EdgeInsets paddingHorizontalMd = EdgeInsets.symmetric(horizontal: md);
  static const EdgeInsets paddingHorizontalLg = EdgeInsets.symmetric(horizontal: lg);
  static const EdgeInsets paddingHorizontalXl = EdgeInsets.symmetric(horizontal: xl);
  
  static const EdgeInsets paddingVerticalXs = EdgeInsets.symmetric(vertical: xs);
  static const EdgeInsets paddingVerticalSm = EdgeInsets.symmetric(vertical: sm);
  static const EdgeInsets paddingVerticalMd = EdgeInsets.symmetric(vertical: md);
  static const EdgeInsets paddingVerticalLg = EdgeInsets.symmetric(vertical: lg);
  static const EdgeInsets paddingVerticalXl = EdgeInsets.symmetric(vertical: xl);
  
  // 後方互換性のためのEdgeInsetsエイリアス
  static const EdgeInsets paddingXS = allXs;
  static const EdgeInsets paddingSM = allSm;
  static const EdgeInsets paddingMD = allMd;
  static const EdgeInsets paddingLG = allLg;
  static const EdgeInsets paddingXL = allXl;
  
  // 動的スペーシング
  static Widget vertical(double height) => SizedBox(height: height);
  static Widget horizontal(double width) => SizedBox(width: width);
  static EdgeInsets all(double value) => EdgeInsets.all(value);
  static EdgeInsets symmetric({double horizontal = 0, double vertical = 0}) =>
      EdgeInsets.symmetric(horizontal: horizontal, vertical: vertical);
  static EdgeInsets only({
    double left = 0,
    double top = 0,
    double right = 0,
    double bottom = 0,
  }) =>
      EdgeInsets.only(left: left, top: top, right: right, bottom: bottom);
}