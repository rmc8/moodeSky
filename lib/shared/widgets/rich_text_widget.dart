// Flutter imports:
import 'package:flutter/material.dart';

/// Bluesky-style rich text widget
class BlueskyRichText extends StatelessWidget {
  final String text;
  final TextStyle? style;
  final int? maxLines;
  final TextOverflow? overflow;
  final TextAlign? textAlign;
  final VoidCallback? onMentionTap;
  final VoidCallback? onHashtagTap;
  final VoidCallback? onLinkTap;

  const BlueskyRichText({
    super.key,
    required this.text,
    this.style,
    this.maxLines,
    this.overflow,
    this.textAlign,
    this.onMentionTap,
    this.onHashtagTap,
    this.onLinkTap,
  });

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: style,
      maxLines: maxLines,
      overflow: overflow,
      textAlign: textAlign,
    );
  }
}