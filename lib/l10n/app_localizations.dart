import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_de.dart';
import 'app_localizations_en.dart';
import 'app_localizations_ja.dart';
import 'app_localizations_ko.dart';
import 'app_localizations_pt.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('de'),
    Locale('en'),
    Locale('ja'),
    Locale('ko'),
    Locale('pt'),
    Locale('pt', 'BR'),
  ];

  /// The title of the application
  ///
  /// In en, this message translates to:
  /// **'moodeSky'**
  String get appTitle;

  /// Title for the login screen
  ///
  /// In en, this message translates to:
  /// **'Sign In'**
  String get loginTitle;

  /// Title for the add account screen
  ///
  /// In en, this message translates to:
  /// **'Add Account'**
  String get addAccountTitle;

  /// Label for authentication method selection
  ///
  /// In en, this message translates to:
  /// **'Sign in method'**
  String get loginMethod;

  /// OAuth authentication method
  ///
  /// In en, this message translates to:
  /// **'OAuth'**
  String get authMethodOAuth;

  /// App Password authentication method
  ///
  /// In en, this message translates to:
  /// **'App Password'**
  String get authMethodAppPassword;

  /// Information about OAuth development status
  ///
  /// In en, this message translates to:
  /// **'OAuth feature is under development. Please use App Password for now.'**
  String get oAuthInfo;

  /// Information about App Password recommendation
  ///
  /// In en, this message translates to:
  /// **'App Password is the recommended sign-in method. It\'s secure and easy to revoke.'**
  String get appPasswordRecommended;

  /// Title for server selection
  ///
  /// In en, this message translates to:
  /// **'Select Server'**
  String get serverSelectionTitle;

  /// Option to add custom server
  ///
  /// In en, this message translates to:
  /// **'Custom Server...'**
  String get customServerOption;

  /// Description for custom server option
  ///
  /// In en, this message translates to:
  /// **'Add self-hosted server'**
  String get customServerDescription;

  /// Message when custom server is clicked
  ///
  /// In en, this message translates to:
  /// **'Custom server feature is under development'**
  String get customServerComingSoon;

  /// Label for identifier field
  ///
  /// In en, this message translates to:
  /// **'Handle or email'**
  String get identifierLabel;

  /// Hint for identifier field
  ///
  /// In en, this message translates to:
  /// **'user.bsky.social'**
  String get identifierHint;

  /// Label for password field
  ///
  /// In en, this message translates to:
  /// **'App Password'**
  String get passwordLabel;

  /// Hint for password field
  ///
  /// In en, this message translates to:
  /// **'Enter your app password'**
  String get passwordHint;

  /// Validation message for empty identifier
  ///
  /// In en, this message translates to:
  /// **'Please enter your handle or email'**
  String get identifierRequired;

  /// Validation message for empty password
  ///
  /// In en, this message translates to:
  /// **'Please enter your app password'**
  String get passwordRequired;

  /// Text for sign in button
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signInButton;

  /// Button text when OAuth is selected
  ///
  /// In en, this message translates to:
  /// **'OAuth in development'**
  String get oAuthInDevelopment;

  /// Text for add account button
  ///
  /// In en, this message translates to:
  /// **'Add Account'**
  String get addAccountButton;

  /// Title for App Password information
  ///
  /// In en, this message translates to:
  /// **'About App Password'**
  String get aboutAppPassword;

  /// Description of App Password
  ///
  /// In en, this message translates to:
  /// **'App Password is a secure password for apps only. It\'s safer than your regular password.'**
  String get appPasswordDescription;

  /// Link text to generate App Password
  ///
  /// In en, this message translates to:
  /// **'Generate App Password →'**
  String get generateAppPassword;

  /// Button text for copy action
  ///
  /// In en, this message translates to:
  /// **'Copy'**
  String get copyButton;

  /// Title for login error
  ///
  /// In en, this message translates to:
  /// **'Sign in error'**
  String get loginError;

  /// Title for account add error
  ///
  /// In en, this message translates to:
  /// **'Account add error'**
  String get accountAddError;

  /// Button text for retry action
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get retryButton;

  /// Help text when OAuth is selected
  ///
  /// In en, this message translates to:
  /// **'OAuth is coming soon. Please use App Password to sign in for now.'**
  String get helpTextOAuth;

  /// Help text when App Password is selected
  ///
  /// In en, this message translates to:
  /// **'App Password can be generated in your Bluesky settings. Please use App Password instead of your regular password.'**
  String get helpTextAppPassword;

  /// Information about multi-account support
  ///
  /// In en, this message translates to:
  /// **'moodeSky can manage multiple Bluesky accounts simultaneously. Enter your new account credentials.'**
  String get multiAccountInfo;

  /// Title for new account information
  ///
  /// In en, this message translates to:
  /// **'Add new account'**
  String get newAccountInfo;

  /// Help text for multi-account feature
  ///
  /// In en, this message translates to:
  /// **'You can log in to multiple accounts simultaneously and switch between them easily.'**
  String get multiAccountHelpText;

  /// Success message when account is added
  ///
  /// In en, this message translates to:
  /// **'Account added successfully'**
  String get accountAddedSuccess;

  /// Success message with account name
  ///
  /// In en, this message translates to:
  /// **'Account \"{name}\" has been added'**
  String accountAddedSuccessWithName(String name);

  /// Error message when account add fails
  ///
  /// In en, this message translates to:
  /// **'Failed to add account: {error}'**
  String accountAddFailed(String error);

  /// Message when account addition is cancelled
  ///
  /// In en, this message translates to:
  /// **'Account addition was cancelled'**
  String get accountAddCancelled;

  /// Title for account switcher
  ///
  /// In en, this message translates to:
  /// **'Switch Account'**
  String get switchAccount;

  /// Button text to sign out all accounts
  ///
  /// In en, this message translates to:
  /// **'Sign Out All'**
  String get signOutAll;

  /// Title for sign out all confirmation dialog
  ///
  /// In en, this message translates to:
  /// **'Sign Out All Accounts'**
  String get signOutAllConfirmTitle;

  /// Confirmation message for signing out all accounts
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to sign out of all accounts? You will need to sign in again.'**
  String get signOutAllConfirmMessage;

  /// Button text for cancel action
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancelButton;

  /// Button text for sign out action
  ///
  /// In en, this message translates to:
  /// **'Sign Out'**
  String get signOutButton;

  /// Text shown during loading
  ///
  /// In en, this message translates to:
  /// **'Loading...'**
  String get loadingText;

  /// Title for error screen
  ///
  /// In en, this message translates to:
  /// **'Something went wrong'**
  String get errorTitle;

  /// Label for language selection
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get languageLabel;

  /// Description for language selection
  ///
  /// In en, this message translates to:
  /// **'Choose your preferred language for the app'**
  String get languageDescription;

  /// Displayed when a post has been reposted by someone
  ///
  /// In en, this message translates to:
  /// **'Reposted by {name}'**
  String repostedBy(String name);

  /// Title for language selection dialog
  ///
  /// In en, this message translates to:
  /// **'Select Language'**
  String get selectLanguage;

  /// Title for language settings section
  ///
  /// In en, this message translates to:
  /// **'Language Settings'**
  String get languageSettings;

  /// Title for appearance settings section
  ///
  /// In en, this message translates to:
  /// **'Appearance Settings'**
  String get appearanceSettings;

  /// Title for settings screen
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settingsTitle;

  /// Title for account settings section
  ///
  /// In en, this message translates to:
  /// **'Account Settings'**
  String get accountSettings;

  /// Label for manage accounts option
  ///
  /// In en, this message translates to:
  /// **'Manage Accounts'**
  String get manageAccounts;

  /// Description for manage accounts option
  ///
  /// In en, this message translates to:
  /// **'Add and remove accounts'**
  String get manageAccountsDescription;

  /// Label for refresh profiles option
  ///
  /// In en, this message translates to:
  /// **'Refresh Profiles'**
  String get refreshProfiles;

  /// Description for refresh profiles option
  ///
  /// In en, this message translates to:
  /// **'Update profile information and avatars for all accounts'**
  String get refreshProfilesDescription;

  /// Message shown while refreshing profiles
  ///
  /// In en, this message translates to:
  /// **'Updating profile information...'**
  String get refreshingProfiles;

  /// Success message after profiles are refreshed
  ///
  /// In en, this message translates to:
  /// **'Profile information has been updated'**
  String get profilesRefreshed;

  /// Error message when profile refresh fails
  ///
  /// In en, this message translates to:
  /// **'Failed to update profiles'**
  String get refreshProfilesError;

  /// Description for sign out all option
  ///
  /// In en, this message translates to:
  /// **'Sign out of all accounts and return to login screen'**
  String get signOutAllDescription;

  /// Login success notification message
  ///
  /// In en, this message translates to:
  /// **'Login successful: {userName}'**
  String loginSuccess(String userName);

  /// Close button text
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get close;

  /// Title for app information section
  ///
  /// In en, this message translates to:
  /// **'App Information'**
  String get appInformation;

  /// Label for about app option
  ///
  /// In en, this message translates to:
  /// **'About moodeSky'**
  String get aboutApp;

  /// App version display
  ///
  /// In en, this message translates to:
  /// **'Version {version}'**
  String appVersion(String version);

  /// Description shown in about dialog
  ///
  /// In en, this message translates to:
  /// **'moodeSky is a modern Bluesky client with deck-based interface and multi-account support.'**
  String get aboutAppDescription;

  /// Label for privacy policy option
  ///
  /// In en, this message translates to:
  /// **'Privacy Policy'**
  String get privacyPolicy;

  /// Label for terms of service option
  ///
  /// In en, this message translates to:
  /// **'Terms of Service'**
  String get termsOfService;

  /// Message for features not yet implemented
  ///
  /// In en, this message translates to:
  /// **'Coming soon'**
  String get comingSoon;

  /// Label for theme selection
  ///
  /// In en, this message translates to:
  /// **'Theme'**
  String get themeLabel;

  /// Description for theme selection
  ///
  /// In en, this message translates to:
  /// **'Choose your preferred theme for the app'**
  String get themeDescription;

  /// Title for theme selection dialog
  ///
  /// In en, this message translates to:
  /// **'Select Theme'**
  String get selectTheme;

  /// Title for theme settings section
  ///
  /// In en, this message translates to:
  /// **'Theme Settings'**
  String get themeSettings;

  /// Light theme option
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get themeLight;

  /// Dark theme option
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get themeDark;

  /// System theme option
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get themeSystem;

  /// Description for light theme
  ///
  /// In en, this message translates to:
  /// **'Sky blue accent with bright, clean interface'**
  String get themeLightDescription;

  /// Description for dark theme
  ///
  /// In en, this message translates to:
  /// **'Sunset orange accent with comfortable dark interface'**
  String get themeDarkDescription;

  /// Description for system theme
  ///
  /// In en, this message translates to:
  /// **'Automatically follow system theme settings'**
  String get themeSystemDescription;

  /// Title for home screen
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get homeTitle;

  /// Title when no decks are available
  ///
  /// In en, this message translates to:
  /// **'No decks'**
  String get decksEmptyTitle;

  /// Description when no decks are available
  ///
  /// In en, this message translates to:
  /// **'Add decks from the navigation bar\nto display timelines'**
  String get decksEmptyDescription;

  /// Button text to add a deck
  ///
  /// In en, this message translates to:
  /// **'Add Deck'**
  String get addDeckButton;

  /// Tooltip for add deck button
  ///
  /// In en, this message translates to:
  /// **'Add deck'**
  String get addDeckTooltip;

  /// Tooltip for compose button
  ///
  /// In en, this message translates to:
  /// **'Create new post'**
  String get composeTooltip;

  /// Tooltip for settings button
  ///
  /// In en, this message translates to:
  /// **'Open settings'**
  String get settingsTooltip;

  /// Navigation label for home
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get homeNavigation;

  /// Navigation label for notifications
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notificationsNavigation;

  /// Navigation label for search
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get searchNavigation;

  /// Navigation label for profile
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profileNavigation;

  /// Navigation label for compose
  ///
  /// In en, this message translates to:
  /// **'Post'**
  String get composeNavigation;

  /// Navigation label for deck
  ///
  /// In en, this message translates to:
  /// **'Deck'**
  String get deckNavigation;

  /// Message when no accounts are logged in
  ///
  /// In en, this message translates to:
  /// **'No logged in accounts'**
  String get noLoggedInAccounts;

  /// Notification text for like action
  ///
  /// In en, this message translates to:
  /// **'liked your post'**
  String get notificationLike;

  /// Notification text for repost action
  ///
  /// In en, this message translates to:
  /// **'reposted your post'**
  String get notificationRepost;

  /// Notification text for follow action
  ///
  /// In en, this message translates to:
  /// **'followed you'**
  String get notificationFollow;

  /// Notification text for mention action
  ///
  /// In en, this message translates to:
  /// **'mentioned you'**
  String get notificationMention;

  /// Notification text for reply action
  ///
  /// In en, this message translates to:
  /// **'replied to your post'**
  String get notificationReply;

  /// Generic notification text
  ///
  /// In en, this message translates to:
  /// **'Notification'**
  String get notification;

  /// Text for followers count
  ///
  /// In en, this message translates to:
  /// **'followers'**
  String get followers;

  /// Text for posts count
  ///
  /// In en, this message translates to:
  /// **'posts'**
  String get posts;

  /// Text for trending content
  ///
  /// In en, this message translates to:
  /// **'Trending'**
  String get trending;

  /// Text for following status
  ///
  /// In en, this message translates to:
  /// **'Following'**
  String get following;

  /// Text for follow button
  ///
  /// In en, this message translates to:
  /// **'Follow'**
  String get follow;

  /// Text when profile info is not available
  ///
  /// In en, this message translates to:
  /// **'No profile information available'**
  String get noProfileInfo;

  /// Text for sample content
  ///
  /// In en, this message translates to:
  /// **'Sample content'**
  String get sampleContent;

  /// Text for hours ago timestamp
  ///
  /// In en, this message translates to:
  /// **'{hours}h ago'**
  String hoursAgo(int hours);

  /// Message when close deck is clicked
  ///
  /// In en, this message translates to:
  /// **'Deck closing feature is under development'**
  String get closeDeckFeature;

  /// Message when compose is clicked
  ///
  /// In en, this message translates to:
  /// **'Post creation function is under development'**
  String get composeFunctionUnderDev;

  /// Message when notifications is clicked
  ///
  /// In en, this message translates to:
  /// **'Notification function is under development'**
  String get notificationsFunctionUnderDev;

  /// Message when search is clicked
  ///
  /// In en, this message translates to:
  /// **'Search function is under development'**
  String get searchFunctionUnderDev;

  /// Error message with error details
  ///
  /// In en, this message translates to:
  /// **'An error occurred: {error}'**
  String errorOccurred(String error);

  /// Home deck type
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get deckTypeHome;

  /// Notifications deck type
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get deckTypeNotifications;

  /// Search deck type
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get deckTypeSearch;

  /// List deck type
  ///
  /// In en, this message translates to:
  /// **'List'**
  String get deckTypeList;

  /// Profile deck type
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get deckTypeProfile;

  /// Thread deck type
  ///
  /// In en, this message translates to:
  /// **'Thread'**
  String get deckTypeThread;

  /// Custom feed deck type
  ///
  /// In en, this message translates to:
  /// **'Custom Feed'**
  String get deckTypeCustomFeed;

  /// Local deck type
  ///
  /// In en, this message translates to:
  /// **'Local'**
  String get deckTypeLocal;

  /// Hashtag deck type
  ///
  /// In en, this message translates to:
  /// **'Hashtag'**
  String get deckTypeHashtag;

  /// Mentions deck type
  ///
  /// In en, this message translates to:
  /// **'Mentions'**
  String get deckTypeMentions;

  /// Title for add deck dialog
  ///
  /// In en, this message translates to:
  /// **'Add Deck'**
  String get addDeckDialogTitle;

  /// Label for deck name field
  ///
  /// In en, this message translates to:
  /// **'Deck name'**
  String get deckNameLabel;

  /// Hint for deck name field
  ///
  /// In en, this message translates to:
  /// **'e.g. Home Timeline'**
  String get deckNameHint;

  /// Label for deck type selection
  ///
  /// In en, this message translates to:
  /// **'Deck type'**
  String get deckTypeLabel;

  /// Label for account selection
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get accountLabel;

  /// Option to use deck for all accounts
  ///
  /// In en, this message translates to:
  /// **'Use for all accounts'**
  String get useAllAccounts;

  /// Add button text
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get addButton;

  /// Success message when deck is added
  ///
  /// In en, this message translates to:
  /// **'Deck \"{deckName}\" added'**
  String deckAddedSuccess(String deckName);

  /// Error message when deck add fails
  ///
  /// In en, this message translates to:
  /// **'Failed to add deck: {error}'**
  String deckAddFailed(String error);

  /// Time format for 'now'
  ///
  /// In en, this message translates to:
  /// **'now'**
  String get timeNow;

  /// Time format for minutes
  ///
  /// In en, this message translates to:
  /// **'{minutes}m'**
  String timeMinutes(int minutes);

  /// Time format for hours
  ///
  /// In en, this message translates to:
  /// **'{hours}h'**
  String timeHours(int hours);

  /// Time format for days
  ///
  /// In en, this message translates to:
  /// **'{days}d'**
  String timeDays(int days);

  /// Suffix for numbers in thousands (e.g., 1.5K)
  ///
  /// In en, this message translates to:
  /// **'K'**
  String get numberThousandSuffix;

  /// Suffix for numbers in millions (e.g., 1.5M)
  ///
  /// In en, this message translates to:
  /// **'M'**
  String get numberMillionSuffix;

  /// Multi account indicator
  ///
  /// In en, this message translates to:
  /// **'Multi Account'**
  String get multiAccount;

  /// Tooltip for deck options menu
  ///
  /// In en, this message translates to:
  /// **'Deck Options'**
  String get deckOptions;

  /// Custom deck type
  ///
  /// In en, this message translates to:
  /// **'Custom'**
  String get deckTypeCustom;

  /// Menu item to move deck left
  ///
  /// In en, this message translates to:
  /// **'Move Left'**
  String get moveDeckLeft;

  /// Menu item to move deck right
  ///
  /// In en, this message translates to:
  /// **'Move Right'**
  String get moveDeckRight;

  /// Menu item to open deck settings
  ///
  /// In en, this message translates to:
  /// **'Deck Settings'**
  String get deckSettings;

  /// Menu item to delete deck
  ///
  /// In en, this message translates to:
  /// **'Delete Deck'**
  String get deleteDeck;

  /// Success message when deck is moved left
  ///
  /// In en, this message translates to:
  /// **'Deck moved left'**
  String get deckMovedLeft;

  /// Success message when deck is moved right
  ///
  /// In en, this message translates to:
  /// **'Deck moved right'**
  String get deckMovedRight;

  /// Error message when deck move fails
  ///
  /// In en, this message translates to:
  /// **'Failed to move deck'**
  String get deckMoveError;

  /// Message when deck settings is not yet implemented
  ///
  /// In en, this message translates to:
  /// **'Deck settings feature is coming soon'**
  String get deckSettingsComingSoon;

  /// Title for delete deck confirmation dialog
  ///
  /// In en, this message translates to:
  /// **'Delete Deck'**
  String get deleteDeckTitle;

  /// Confirmation message for deck deletion
  ///
  /// In en, this message translates to:
  /// **'Delete \"{deckTitle}\"? This action cannot be undone.'**
  String deleteDeckConfirm(String deckTitle);

  /// Delete button text
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get deleteButton;

  /// Success message when deck is deleted
  ///
  /// In en, this message translates to:
  /// **'\"{deckTitle}\" has been deleted'**
  String deckDeletedSuccess(String deckTitle);

  /// Error message when deck deletion fails
  ///
  /// In en, this message translates to:
  /// **'Failed to delete deck'**
  String get deckDeleteError;

  /// Label for mention text elements
  ///
  /// In en, this message translates to:
  /// **'Mention'**
  String get richTextMentionLabel;

  /// Label for hashtag text elements
  ///
  /// In en, this message translates to:
  /// **'Hashtag'**
  String get richTextHashtagLabel;

  /// Label for URL text elements
  ///
  /// In en, this message translates to:
  /// **'URL'**
  String get richTextUrlLabel;

  /// Message when mention is tapped
  ///
  /// In en, this message translates to:
  /// **'Mention @{handle} tapped'**
  String richTextMentionTapped(String handle);

  /// Message when hashtag is tapped
  ///
  /// In en, this message translates to:
  /// **'Hashtag #{tag} tapped'**
  String richTextHashtagTapped(String tag);

  /// Message when URL is tapped
  ///
  /// In en, this message translates to:
  /// **'URL {url} tapped'**
  String richTextUrlTapped(String url);

  /// Action to view profile when mention is tapped
  ///
  /// In en, this message translates to:
  /// **'View Profile'**
  String get richTextProfileView;

  /// Action to search hashtag when hashtag is tapped
  ///
  /// In en, this message translates to:
  /// **'Search Hashtag'**
  String get richTextHashtagSearch;

  /// Action to open URL when URL is tapped
  ///
  /// In en, this message translates to:
  /// **'Open URL'**
  String get richTextOpenUrl;

  /// Action to copy URL to clipboard
  ///
  /// In en, this message translates to:
  /// **'Copy URL'**
  String get richTextCopyUrl;

  /// Message when URL is copied
  ///
  /// In en, this message translates to:
  /// **'URL copied to clipboard'**
  String get richTextUrlCopied;

  /// Error message when URL cannot be opened
  ///
  /// In en, this message translates to:
  /// **'Could not open URL'**
  String get richTextUrlOpenFailed;

  /// Error message when text processing fails
  ///
  /// In en, this message translates to:
  /// **'Text processing error'**
  String get richTextProcessingError;

  /// Message when a feature is not yet implemented
  ///
  /// In en, this message translates to:
  /// **'This feature is under development'**
  String get richTextFeatureNotImplemented;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['de', 'en', 'ja', 'ko', 'pt'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when language+country codes are specified.
  switch (locale.languageCode) {
    case 'pt':
      {
        switch (locale.countryCode) {
          case 'BR':
            return AppLocalizationsPtBr();
        }
        break;
      }
  }

  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'de':
      return AppLocalizationsDe();
    case 'en':
      return AppLocalizationsEn();
    case 'ja':
      return AppLocalizationsJa();
    case 'ko':
      return AppLocalizationsKo();
    case 'pt':
      return AppLocalizationsPt();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
