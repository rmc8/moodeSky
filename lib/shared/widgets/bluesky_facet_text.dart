// Flutter imports:
import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';

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

    final spans = <TextSpan>[];
    var lastIndex = 0;

    // Sort facets by byte start position
    final sortedFacets = [...facets]..sort((a, b) => a.index.byteStart.compareTo(b.index.byteStart));

    for (final facet in sortedFacets) {
      final start = facet.index.byteStart;
      final end = facet.index.byteEnd;

      // Add text before this facet
      if (start > lastIndex) {
        spans.add(TextSpan(
          text: text.substring(lastIndex, start),
          style: style,
        ));
      }

      // Add the facet text with appropriate styling
      final facetText = text.substring(start, end);
      spans.add(_buildFacetSpan(context, facetText, facet));

      lastIndex = end;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      spans.add(TextSpan(
        text: text.substring(lastIndex),
        style: style,
      ));
    }

    return RichText(
      text: TextSpan(
        children: spans,
        style: style,
      ),
    );
  }

  TextSpan _buildFacetSpan(BuildContext context, String text, bsky.Facet facet) {
    // Handle different facet types
    for (final feature in facet.features) {
      if (feature is bsky.FacetMention) {
        return TextSpan(
          text: text,
          style: style?.copyWith(
            color: Theme.of(context).colorScheme.primary,
            fontWeight: FontWeight.w600,
          ),
          recognizer: TapGestureRecognizer()
            ..onTap = () => onMentionTap?.call((feature as bsky.FacetMention).did),
        );
      } else if (feature is bsky.FacetLink) {
        return TextSpan(
          text: text,
          style: style?.copyWith(
            color: Theme.of(context).colorScheme.primary,
            decoration: TextDecoration.underline,
          ),
          recognizer: TapGestureRecognizer()
            ..onTap = () => onLinkTap?.call((feature as bsky.FacetLink).uri.toString()),
        );
      } else if (feature is bsky.FacetTag) {
        return TextSpan(
          text: text,
          style: style?.copyWith(
            color: Theme.of(context).colorScheme.primary,
            fontWeight: FontWeight.w600,
          ),
          recognizer: TapGestureRecognizer()
            ..onTap = () => onHashtagTap?.call((feature as bsky.FacetTag).tag),
        );
      }
    }

    // Fallback for unknown facet types
    return TextSpan(text: text, style: style);
  }
}