// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'moodeSky';

  @override
  String get loginTitle => 'Sign In';

  @override
  String get addAccountTitle => 'Add Account';

  @override
  String get loginMethod => 'Sign in method';

  @override
  String get authMethodOAuth => 'OAuth';

  @override
  String get authMethodAppPassword => 'App Password';

  @override
  String get oAuthInfo =>
      'OAuth feature is under development. Please use App Password for now.';

  @override
  String get appPasswordRecommended =>
      'App Password is the recommended sign-in method. It\'s secure and easy to revoke.';

  @override
  String get serverSelectionTitle => 'Select Server';

  @override
  String get customServerOption => 'Custom Server...';

  @override
  String get customServerDescription => 'Add self-hosted server';

  @override
  String get customServerComingSoon =>
      'Custom server feature is under development';

  @override
  String get identifierLabel => 'Handle or email';

  @override
  String get identifierHint => 'user.bsky.social';

  @override
  String get passwordLabel => 'App Password';

  @override
  String get passwordHint => 'Enter your app password';

  @override
  String get identifierRequired => 'Please enter your handle or email';

  @override
  String get passwordRequired => 'Please enter your app password';

  @override
  String get signInButton => 'Sign in';

  @override
  String get oAuthInDevelopment => 'OAuth in development';

  @override
  String get addAccountButton => 'Add Account';

  @override
  String get aboutAppPassword => 'About App Password';

  @override
  String get appPasswordDescription =>
      'App Password is a secure password for apps only. It\'s safer than your regular password.';

  @override
  String get generateAppPassword => 'Generate App Password →';

  @override
  String get copyButton => 'Copy';

  @override
  String get loginError => 'Sign in error';

  @override
  String get accountAddError => 'Account add error';

  @override
  String get retryButton => 'Retry';

  @override
  String get helpTextOAuth =>
      'OAuth is coming soon. Please use App Password to sign in for now.';

  @override
  String get helpTextAppPassword =>
      'App Password can be generated in your Bluesky settings. Please use App Password instead of your regular password.';

  @override
  String get multiAccountInfo =>
      'moodeSky can manage multiple Bluesky accounts simultaneously. Enter your new account credentials.';

  @override
  String get newAccountInfo => 'Add new account';

  @override
  String get multiAccountHelpText =>
      'You can log in to multiple accounts simultaneously and switch between them easily.';

  @override
  String get accountAddedSuccess => 'Account added successfully';

  @override
  String accountAddedSuccessWithName(String name) {
    return 'Account \"$name\" has been added';
  }

  @override
  String accountAddFailed(String error) {
    return 'Failed to add account: $error';
  }

  @override
  String get accountAddCancelled => 'Account addition was cancelled';

  @override
  String get switchAccount => 'Switch Account';

  @override
  String get signOutAll => 'Sign Out All';

  @override
  String get signOutAllConfirmTitle => 'Sign Out All Accounts';

  @override
  String get signOutAllConfirmMessage =>
      'Are you sure you want to sign out of all accounts? You will need to sign in again.';

  @override
  String get cancelButton => 'Cancel';

  @override
  String get signOutButton => 'Sign Out';

  @override
  String get loadingText => 'Loading...';

  @override
  String get errorTitle => 'Something went wrong';

  @override
  String get languageLabel => 'Language';

  @override
  String get languageDescription =>
      'Choose your preferred language for the app';

  @override
  String repostedBy(String name) {
    return 'Reposted by $name';
  }

  @override
  String get selectLanguage => 'Select Language';

  @override
  String get languageSettings => 'Language Settings';

  @override
  String get appearanceSettings => 'Appearance Settings';

  @override
  String get settingsTitle => 'Settings';

  @override
  String get accountSettings => 'Account Settings';

  @override
  String get manageAccounts => 'Manage Accounts';

  @override
  String get manageAccountsDescription => 'Add and remove accounts';

  @override
  String get refreshProfiles => 'Refresh Profiles';

  @override
  String get refreshProfilesDescription =>
      'Update profile information and avatars for all accounts';

  @override
  String get refreshingProfiles => 'Updating profile information...';

  @override
  String get profilesRefreshed => 'Profile information has been updated';

  @override
  String get refreshProfilesError => 'Failed to update profiles';

  @override
  String get signOutAllDescription =>
      'Sign out of all accounts and return to login screen';

  @override
  String get appInformation => 'App Information';

  @override
  String get aboutApp => 'About moodeSky';

  @override
  String appVersion(String version) {
    return 'Version $version';
  }

  @override
  String get aboutAppDescription =>
      'moodeSky is a modern Bluesky client with deck-based interface and multi-account support.';

  @override
  String get privacyPolicy => 'Privacy Policy';

  @override
  String get termsOfService => 'Terms of Service';

  @override
  String get comingSoon => 'Coming soon';

  @override
  String get themeLabel => 'Theme';

  @override
  String get themeDescription => 'Choose your preferred theme for the app';

  @override
  String get selectTheme => 'Select Theme';

  @override
  String get themeSettings => 'Theme Settings';

  @override
  String get themeLight => 'Light';

  @override
  String get themeDark => 'Dark';

  @override
  String get themeSystem => 'System';

  @override
  String get themeLightDescription =>
      'Sky blue accent with bright, clean interface';

  @override
  String get themeDarkDescription =>
      'Sunset orange accent with comfortable dark interface';

  @override
  String get themeSystemDescription =>
      'Automatically follow system theme settings';

  @override
  String get homeTitle => 'Home';

  @override
  String get decksEmptyTitle => 'No decks';

  @override
  String get decksEmptyDescription =>
      'Add decks from the navigation bar\nto display timelines';

  @override
  String get addDeckButton => 'Add Deck';

  @override
  String get addDeckTooltip => 'Add deck';

  @override
  String get composeTooltip => 'Create new post';

  @override
  String get settingsTooltip => 'Open settings';

  @override
  String get homeNavigation => 'Home';

  @override
  String get notificationsNavigation => 'Notifications';

  @override
  String get searchNavigation => 'Search';

  @override
  String get profileNavigation => 'Profile';

  @override
  String get composeNavigation => 'Post';

  @override
  String get deckNavigation => 'Deck';

  @override
  String get noLoggedInAccounts => 'No logged in accounts';

  @override
  String get notificationLike => 'liked your post';

  @override
  String get notificationRepost => 'reposted your post';

  @override
  String get notificationFollow => 'followed you';

  @override
  String get notificationMention => 'mentioned you';

  @override
  String get notificationReply => 'replied to your post';

  @override
  String get notification => 'Notification';

  @override
  String get followers => 'followers';

  @override
  String get posts => 'posts';

  @override
  String get trending => 'Trending';

  @override
  String get following => 'Following';

  @override
  String get follow => 'Follow';

  @override
  String get noProfileInfo => 'No profile information available';

  @override
  String get sampleContent => 'Sample content';

  @override
  String hoursAgo(int hours) {
    return '${hours}h ago';
  }

  @override
  String get closeDeckFeature => 'Deck closing feature is under development';

  @override
  String get composeFunctionUnderDev =>
      'Post creation function is under development';

  @override
  String get notificationsFunctionUnderDev =>
      'Notification function is under development';

  @override
  String get searchFunctionUnderDev => 'Search function is under development';

  @override
  String errorOccurred(String error) {
    return 'An error occurred: $error';
  }

  @override
  String get deckTypeHome => 'Home';

  @override
  String get deckTypeNotifications => 'Notifications';

  @override
  String get deckTypeSearch => 'Search';

  @override
  String get deckTypeList => 'List';

  @override
  String get deckTypeProfile => 'Profile';

  @override
  String get deckTypeThread => 'Thread';

  @override
  String get deckTypeCustomFeed => 'Custom Feed';

  @override
  String get deckTypeLocal => 'Local';

  @override
  String get deckTypeHashtag => 'Hashtag';

  @override
  String get deckTypeMentions => 'Mentions';

  @override
  String get addDeckDialogTitle => 'Add Deck';

  @override
  String get deckNameLabel => 'Deck name';

  @override
  String get deckNameHint => 'e.g. Home Timeline';

  @override
  String get deckTypeLabel => 'Deck type';

  @override
  String get accountLabel => 'Account';

  @override
  String get useAllAccounts => 'Use for all accounts';

  @override
  String get addButton => 'Add';

  @override
  String deckAddedSuccess(String deckName) {
    return 'Deck \"$deckName\" added';
  }

  @override
  String deckAddFailed(String error) {
    return 'Failed to add deck: $error';
  }

  @override
  String get timeNow => 'now';

  @override
  String timeMinutes(int minutes) {
    return '${minutes}m';
  }

  @override
  String timeHours(int hours) {
    return '${hours}h';
  }

  @override
  String timeDays(int days) {
    return '${days}d';
  }

  @override
  String get numberThousandSuffix => 'K';

  @override
  String get numberMillionSuffix => 'M';

  @override
  String get multiAccount => 'Multi Account';

  @override
  String get deckOptions => 'Deck Options';

  @override
  String get deckTypeCustom => 'Custom';

  @override
  String get moveDeckLeft => 'Move Left';

  @override
  String get moveDeckRight => 'Move Right';

  @override
  String get deckSettings => 'Deck Settings';

  @override
  String get deleteDeck => 'Delete Deck';

  @override
  String get deckMovedLeft => 'Deck moved left';

  @override
  String get deckMovedRight => 'Deck moved right';

  @override
  String get deckMoveError => 'Failed to move deck';

  @override
  String get deckSettingsComingSoon => 'Deck settings feature is coming soon';

  @override
  String get deleteDeckTitle => 'Delete Deck';

  @override
  String deleteDeckConfirm(String deckTitle) {
    return 'Delete \"$deckTitle\"? This action cannot be undone.';
  }

  @override
  String get deleteButton => 'Delete';

  @override
  String deckDeletedSuccess(String deckTitle) {
    return '\"$deckTitle\" has been deleted';
  }

  @override
  String get deckDeleteError => 'Failed to delete deck';

  @override
  String get richTextMentionLabel => 'Mention';

  @override
  String get richTextHashtagLabel => 'Hashtag';

  @override
  String get richTextUrlLabel => 'URL';

  @override
  String richTextMentionTapped(String handle) {
    return 'Mention @$handle tapped';
  }

  @override
  String richTextHashtagTapped(String tag) {
    return 'Hashtag #$tag tapped';
  }

  @override
  String richTextUrlTapped(String url) {
    return 'URL $url tapped';
  }

  @override
  String get richTextProfileView => 'View Profile';

  @override
  String get richTextHashtagSearch => 'Search Hashtag';

  @override
  String get richTextOpenUrl => 'Open URL';

  @override
  String get richTextCopyUrl => 'Copy URL';

  @override
  String get richTextUrlCopied => 'URL copied to clipboard';

  @override
  String get richTextUrlOpenFailed => 'Could not open URL';

  @override
  String get richTextProcessingError => 'Text processing error';

  @override
  String get richTextFeatureNotImplemented =>
      'This feature is under development';
}
