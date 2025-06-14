// Flutter imports:
import 'package:flutter/material.dart';

// Package imports:
import 'package:bluesky/bluesky.dart' as bsky;

// Project imports:
import 'package:moodesky/l10n/app_localizations.dart';
import 'package:moodesky/shared/utils/user_display_utils.dart';

/// Simple widget to display repost information above posts
class SimpleRepostWidget extends StatelessWidget {
  final bsky.ReasonRepost repost;

  const SimpleRepostWidget({
    super.key,
    required this.repost,
  });

  @override
  Widget build(BuildContext context) {
    final reposterDisplayName = UserDisplayUtils.getDisplayName(repost.by.displayName, repost.by.handle);
    
    return Container(
      padding: const EdgeInsets.fromLTRB(10, 16, 10, 2),
      decoration: const BoxDecoration(
        color: Colors.transparent,
      ),
      child: Row(
        children: [
          Icon(
            Icons.repeat,
            size: 16,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              AppLocalizations.of(context).repostedBy(reposterDisplayName),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w500,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}