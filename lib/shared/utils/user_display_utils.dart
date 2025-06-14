/// Utility class for user display functionality
class UserDisplayUtils {
  /// Format a user's display name
  static String formatDisplayName(String? displayName, String handle) {
    return displayName?.isNotEmpty == true ? displayName! : '@$handle';
  }

  /// Get user's short handle without domain
  static String getShortHandle(String handle) {
    return handle.split('.').first;
  }

  /// Format user mention
  static String formatMention(String handle) {
    return '@${getShortHandle(handle)}';
  }

  /// Get display name (for backward compatibility)
  static String getDisplayName(String? displayName, String handle) {
    return formatDisplayName(displayName, handle);
  }
}