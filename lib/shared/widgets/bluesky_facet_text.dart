// Flutter imports:
import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';
import 'dart:convert';

// Package imports:
import 'package:bluesky/bluesky.dart' as bsky;

/// Widget for displaying Bluesky text with facets (mentions, links, hashtags)
class BlueskyFacetText extends StatelessWidget {
  final String text;
  final List<bsky.Facet> facets;
  final TextStyle? style;
  final Function(String)? onMentionTap;
  final Function(String)? onLinkTap;
  final Function(String)? onHashtagTap;

  const BlueskyFacetText({
    super.key,
    required this.text,
    required this.facets,
    this.style,
    this.onMentionTap,
    this.onLinkTap,
    this.onHashtagTap,
  });

  @override
  Widget build(BuildContext context) {
    if (facets.isEmpty) {
      return Text(text, style: style);
    }

    // UTF-8 byte長を計算（デバッグ用）
    final utf8Bytes = utf8.encode(text);
    debugPrint('🔍 Processing ${facets.length} facets for text (${text.length} chars, ${utf8Bytes.length} UTF-8 bytes)');

    final spans = <TextSpan>[];
    var lastIndex = 0;
    int validFacets = 0;
    int invalidFacets = 0;

    // Sort facets by byte start position
    final sortedFacets = [...facets]..sort((a, b) => a.index.byteStart.compareTo(b.index.byteStart));

    for (int i = 0; i < sortedFacets.length; i++) {
      final facet = sortedFacets[i];
      final start = facet.index.byteStart;
      final end = facet.index.byteEnd;

      // Byte位置をDart string indexに変換
      final stringStart = _byteToStringIndex(text, start);
      final stringEnd = _byteToStringIndex(text, end);
      
      debugPrint('  🔍 Facet #$i: bytes($start-$end) → chars($stringStart-$stringEnd)');

      // Validate converted positions
      if (stringStart < 0 || stringEnd < 0 || stringStart >= text.length || stringEnd > text.length || stringStart >= stringEnd) {
        debugPrint('⚠️ Skipping invalid facet: ${_getValidationReason(stringStart, stringEnd, text.length)}');
        invalidFacets++;
        continue;
      }

      // Add text before this facet
      if (stringStart > lastIndex) {
        spans.add(TextSpan(
          text: text.substring(lastIndex, stringStart),
          style: style,
        ));
      }

      // Add the facet text with appropriate styling
      final facetText = text.substring(stringStart, stringEnd);
      spans.add(_buildFacetSpan(context, facetText, facet));
      lastIndex = stringEnd;
      validFacets++;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      spans.add(TextSpan(
        text: text.substring(lastIndex),
        style: style,
      ));
    }

    // 処理結果の統計
    if (invalidFacets > 0) {
      debugPrint('🔍 Facets: $validFacets valid, $invalidFacets invalid → ${spans.length} spans');
    }

    // Fallback to plain text if no valid spans were created
    if (spans.isEmpty) {
      debugPrint('❌ No spans created, falling back to plain Text');
      return Text(text, style: style);
    }
    
    debugPrint('✅ Creating RichText with ${spans.length} spans');
    return RichText(
      text: TextSpan(
        children: spans,
        // styleを設定しないことで、各spanが独自のスタイルを持つようにする
      ),
    );
  }

  /// バリデーション失敗の理由を返す
  String _getValidationReason(int start, int end, int textLength) {
    if (start < 0) return 'start < 0';
    if (end < 0) return 'end < 0';
    if (start >= textLength) return 'start >= textLength';
    if (end > textLength) return 'end > textLength';
    if (start >= end) return 'start >= end';
    return 'unknown';
  }

  /// UTF-8 byte位置をDart string indexに変換
  /// Bluesky公式ドキュメントに基づくbyte-level indexing
  int _byteToStringIndex(String text, int byteIndex) {
    if (byteIndex <= 0) return 0;
    
    // UTF-8 bytesに変換
    final utf8Bytes = utf8.encode(text);
    if (byteIndex >= utf8Bytes.length) return text.length;
    
    // byteIndexまでのUTF-8 bytesを文字列に戻す
    try {
      final byteSlice = utf8Bytes.sublist(0, byteIndex);
      final partialString = utf8.decode(byteSlice, allowMalformed: true);
      return partialString.length.clamp(0, text.length);
    } catch (e) {
      debugPrint('⚠️ UTF-8 conversion error: $e');
      return byteIndex.clamp(0, text.length); // フォールバック
    }
  }

  TextSpan _buildFacetSpan(BuildContext context, String text, bsky.Facet facet) {
    // Primary colorを明示的に取得
    final primaryColor = Theme.of(context).colorScheme.primary;
    debugPrint('🎨 Primary color: $primaryColor for text: "$text"');
    
    // ベーススタイルからcolorを除外してfacet専用スタイルを作成
    final baseStyle = style?.copyWith(color: null) ?? const TextStyle();
    
    // facet.featuresの内容を確認
    debugPrint('🔍 Facet has ${facet.features.length} features');
    
    // Handle different facet types
    for (final feature in facet.features) {
      debugPrint('🔍 Feature type: ${feature.runtimeType}');
      
      // Union型のパターンマッチング
      final featureType = feature.runtimeType.toString();
      
      if (featureType.contains('Mention')) {
        debugPrint('🎨 Processing Mention facet');
        final facetStyle = baseStyle.copyWith(
          color: primaryColor,
          fontWeight: FontWeight.w600,
        );
        debugPrint('🎨 Mention style applied: $facetStyle');
        return TextSpan(
          text: text,
          style: facetStyle,
          recognizer: TapGestureRecognizer()
            ..onTap = () {
              debugPrint('👆 Mention tapped');
              // TODO: Extract DID from feature if possible
              onMentionTap?.call(text);
            },
        );
      } else if (featureType.contains('Link')) {
        debugPrint('🎨 Processing Link facet');
        final facetStyle = baseStyle.copyWith(
          color: primaryColor,
          // decorationを削除して、下線なしに統一
        );
        debugPrint('🎨 Link style applied: $facetStyle');
        return TextSpan(
          text: text,
          style: facetStyle,
          recognizer: TapGestureRecognizer()
            ..onTap = () {
              debugPrint('👆 Link tapped');
              // TODO: Extract URI from feature if possible
              onLinkTap?.call(text);
            },
        );
      } else if (featureType.contains('Tag')) {
        debugPrint('🎨 Processing Tag/Hashtag facet');
        final facetStyle = baseStyle.copyWith(
          color: primaryColor,
          fontWeight: FontWeight.w600,
        );
        debugPrint('🎨 Hashtag style applied: $facetStyle');
        return TextSpan(
          text: text,
          style: facetStyle,
          recognizer: TapGestureRecognizer()
            ..onTap = () {
              debugPrint('👆 Hashtag tapped: $text');
              // ハッシュタグのテキストからタグ名を抽出
              final tag = text.startsWith('#') ? text.substring(1) : text;
              onHashtagTap?.call(tag);
            },
        );
      }
    }

    // Fallback for unknown facet types
    return TextSpan(text: text, style: style);
  }
}