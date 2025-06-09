// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for German (`de`).
class AppLocalizationsDe extends AppLocalizations {
  AppLocalizationsDe([String locale = 'de']) : super(locale);

  @override
  String get appTitle => 'MoodeSky';

  @override
  String get loginTitle => 'Anmelden';

  @override
  String get addAccountTitle => 'Konto hinzufügen';

  @override
  String get loginMethod => 'Anmeldemethode';

  @override
  String get authMethodOAuth => 'OAuth';

  @override
  String get authMethodAppPassword => 'App-Passwort';

  @override
  String get oAuthInfo =>
      'OAuth-Funktion ist in Entwicklung. Bitte verwenden Sie derzeit App-Passwort.';

  @override
  String get appPasswordRecommended =>
      'App-Passwort ist die empfohlene Anmeldemethode. Es ist sicher und einfach zu widerrufen.';

  @override
  String get serverSelectionTitle => 'Server auswählen';

  @override
  String get customServerOption => 'Benutzerdefinierter Server...';

  @override
  String get customServerDescription => 'Selbst gehosteten Server hinzufügen';

  @override
  String get customServerComingSoon =>
      'Benutzerdefinierte Server-Funktion ist in Entwicklung';

  @override
  String get identifierLabel => 'Handle oder E-Mail';

  @override
  String get identifierHint => 'user.bsky.social';

  @override
  String get passwordLabel => 'App-Passwort';

  @override
  String get passwordHint => 'App-Passwort eingeben';

  @override
  String get identifierRequired =>
      'Bitte geben Sie Ihr Handle oder Ihre E-Mail ein';

  @override
  String get passwordRequired => 'Bitte geben Sie Ihr App-Passwort ein';

  @override
  String get signInButton => 'Anmelden';

  @override
  String get oAuthInDevelopment => 'OAuth in Entwicklung';

  @override
  String get addAccountButton => 'Konto hinzufügen';

  @override
  String get aboutAppPassword => 'Über App-Passwort';

  @override
  String get appPasswordDescription =>
      'App-Passwort ist ein sicheres Passwort nur für Apps. Es ist sicherer als Ihr normales Passwort.';

  @override
  String get generateAppPassword => 'App-Passwort generieren →';

  @override
  String get copyButton => 'Kopieren';

  @override
  String get loginError => 'Anmeldefehler';

  @override
  String get accountAddError => 'Fehler beim Hinzufügen des Kontos';

  @override
  String get retryButton => 'Erneut versuchen';

  @override
  String get helpTextOAuth =>
      'OAuth kommt bald. Bitte verwenden Sie vorerst App-Passwort zur Anmeldung.';

  @override
  String get helpTextAppPassword =>
      'App-Passwort kann in Ihren Bluesky-Einstellungen generiert werden. Bitte verwenden Sie App-Passwort anstelle Ihres regulären Passworts.';

  @override
  String get multiAccountInfo =>
      'MoodeSky kann mehrere Bluesky-Konten gleichzeitig verwalten. Geben Sie Ihre neuen Kontoanmeldedaten ein.';

  @override
  String get newAccountInfo => 'Neues Konto hinzufügen';

  @override
  String get multiAccountHelpText =>
      'Sie können sich bei mehreren Konten gleichzeitig anmelden und einfach zwischen ihnen wechseln.';

  @override
  String get accountAddedSuccess => 'Konto erfolgreich hinzugefügt';

  @override
  String accountAddedSuccessWithName(String name) {
    return 'Konto \"$name\" wurde hinzugefügt';
  }

  @override
  String accountAddFailed(String error) {
    return 'Fehler beim Hinzufügen des Kontos: $error';
  }

  @override
  String get accountAddCancelled => 'Hinzufügen des Kontos wurde abgebrochen';

  @override
  String get switchAccount => 'Konto wechseln';

  @override
  String get signOutAll => 'Alle abmelden';

  @override
  String get signOutAllConfirmTitle => 'Von allen Konten abmelden';

  @override
  String get signOutAllConfirmMessage =>
      'Sind Sie sicher, dass Sie sich von allen Konten abmelden möchten? Sie müssen sich erneut anmelden.';

  @override
  String get cancelButton => 'Abbrechen';

  @override
  String get signOutButton => 'Abmelden';

  @override
  String get loadingText => 'Wird geladen...';

  @override
  String get errorTitle => 'Etwas ist schiefgelaufen';

  @override
  String get languageLabel => 'Sprache';

  @override
  String get languageDescription =>
      'Wählen Sie Ihre bevorzugte Sprache für die App';

  @override
  String get selectLanguage => 'Sprache auswählen';

  @override
  String get languageSettings => 'Spracheinstellungen';

  @override
  String get appearanceSettings => 'Darstellungseinstellungen';

  @override
  String get settingsTitle => 'Einstellungen';

  @override
  String get accountSettings => 'Kontoeinstellungen';

  @override
  String get manageAccounts => 'Konten verwalten';

  @override
  String get manageAccountsDescription =>
      'Konten hinzufügen, entfernen oder wechseln';

  @override
  String get signOutAllDescription =>
      'Von allen Konten abmelden und zum Anmeldebildschirm zurückkehren';

  @override
  String get appInformation => 'App-Informationen';

  @override
  String get aboutApp => 'Über MoodeSky';

  @override
  String appVersion(String version) {
    return 'Version $version';
  }

  @override
  String get aboutAppDescription =>
      'MoodeSky ist ein moderner Bluesky-Client mit deck-basierter Benutzeroberfläche und Multi-Account-Unterstützung.';

  @override
  String get privacyPolicy => 'Datenschutzrichtlinie';

  @override
  String get termsOfService => 'Nutzungsbedingungen';

  @override
  String get comingSoon => 'Demnächst verfügbar';

  @override
  String get themeLabel => 'Design';

  @override
  String get themeDescription =>
      'Wählen Sie Ihr bevorzugtes Design für die App';

  @override
  String get selectTheme => 'Design auswählen';

  @override
  String get themeSettings => 'Design-Einstellungen';

  @override
  String get themeLight => 'Hell';

  @override
  String get themeDark => 'Dunkel';

  @override
  String get themeSystem => 'System';

  @override
  String get themeLightDescription =>
      'Himmelblau-Akzent mit heller, sauberer Benutzeroberfläche';

  @override
  String get themeDarkDescription =>
      'Sonnenuntergang-Orange-Akzent mit komfortabler dunkler Benutzeroberfläche';

  @override
  String get themeSystemDescription =>
      'Automatisch den Systemdesign-Einstellungen folgen';
}
