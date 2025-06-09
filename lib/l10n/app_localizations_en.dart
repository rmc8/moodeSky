// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'MoodeSky';

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
      'MoodeSky can manage multiple Bluesky accounts simultaneously. Enter your new account credentials.';

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
  String get manageAccountsDescription =>
      'Add, remove, or switch between accounts';

  @override
  String get signOutAllDescription =>
      'Sign out of all accounts and return to login screen';

  @override
  String get appInformation => 'App Information';

  @override
  String get aboutApp => 'About MoodeSky';

  @override
  String appVersion(String version) {
    return 'Version $version';
  }

  @override
  String get aboutAppDescription =>
      'MoodeSky is a modern Bluesky client with deck-based interface and multi-account support.';

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
}
