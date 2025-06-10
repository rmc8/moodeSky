// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for German (`de`).
class AppLocalizationsDe extends AppLocalizations {
  AppLocalizationsDe([String locale = 'de']) : super(locale);

  @override
  String get appTitle => 'moodeSky';

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
      'moodeSky kann mehrere Bluesky-Konten gleichzeitig verwalten. Geben Sie Ihre neuen Kontoanmeldedaten ein.';

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
  String get refreshProfiles => 'Profile aktualisieren';

  @override
  String get refreshProfilesDescription =>
      'Profilinformationen und Avatare für alle Konten aktualisieren';

  @override
  String get refreshingProfiles => 'Profilinformationen werden aktualisiert...';

  @override
  String get profilesRefreshed => 'Profilinformationen wurden aktualisiert';

  @override
  String get refreshProfilesError => 'Fehler beim Aktualisieren der Profile';

  @override
  String get signOutAllDescription =>
      'Von allen Konten abmelden und zum Anmeldebildschirm zurückkehren';

  @override
  String get appInformation => 'App-Informationen';

  @override
  String get aboutApp => 'Über moodeSky';

  @override
  String appVersion(String version) {
    return 'Version $version';
  }

  @override
  String get aboutAppDescription =>
      'moodeSky ist ein moderner Bluesky-Client mit deck-basierter Benutzeroberfläche und Multi-Account-Unterstützung.';

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

  @override
  String get homeTitle => 'Startseite';

  @override
  String get decksEmptyTitle => 'Keine Decks';

  @override
  String get decksEmptyDescription =>
      'Fügen Sie Decks über die Schaltfläche \"Deck\" in der Navigationsleiste hinzu,\num Ihre Timeline anzuzeigen';

  @override
  String get addDeckButton => 'Deck hinzufügen';

  @override
  String get addDeckTooltip => 'Deck hinzufügen';

  @override
  String get composeTooltip => 'Neuen Beitrag erstellen';

  @override
  String get settingsTooltip => 'Einstellungen öffnen';

  @override
  String get homeNavigation => 'Startseite';

  @override
  String get notificationsNavigation => 'Benachrichtigungen';

  @override
  String get searchNavigation => 'Suche';

  @override
  String get profileNavigation => 'Profil';

  @override
  String get composeNavigation => 'Verfassen';

  @override
  String get deckNavigation => 'Decks';

  @override
  String get noLoggedInAccounts => 'Keine angemeldeten Konten';

  @override
  String get notificationLike => 'hat Ihren Beitrag geliked';

  @override
  String get notificationRepost => 'hat Ihren Beitrag repostet';

  @override
  String get notificationFollow => 'folgt Ihnen jetzt';

  @override
  String get notificationMention => 'hat Sie erwähnt';

  @override
  String get notificationReply => 'hat auf Ihren Beitrag geantwortet';

  @override
  String get notification => 'Benachrichtigung';

  @override
  String get followers => 'Follower';

  @override
  String get posts => ' Beiträge';

  @override
  String get trending => 'Trending';

  @override
  String get following => 'Folge ich';

  @override
  String get follow => 'Folgen';

  @override
  String get noProfileInfo => 'Keine Profilinformationen';

  @override
  String get sampleContent => 'Beispielinhalt';

  @override
  String hoursAgo(int hours) {
    return 'vor $hours Stunden';
  }

  @override
  String get closeDeckFeature => 'Deck-Schließfunktion ist in Vorbereitung';

  @override
  String get composeFunctionUnderDev =>
      'Beitragserstellungsfunktion ist in Vorbereitung';

  @override
  String get notificationsFunctionUnderDev =>
      'Benachrichtigungsfunktion ist in Vorbereitung';

  @override
  String get searchFunctionUnderDev => 'Suchfunktion ist in Vorbereitung';

  @override
  String errorOccurred(String error) {
    return 'Ein Fehler ist aufgetreten: $error';
  }

  @override
  String get deckTypeHome => 'Startseite';

  @override
  String get deckTypeNotifications => 'Benachrichtigungen';

  @override
  String get deckTypeSearch => 'Suche';

  @override
  String get deckTypeList => 'Liste';

  @override
  String get deckTypeProfile => 'Profil';

  @override
  String get deckTypeThread => 'Thread';

  @override
  String get deckTypeCustomFeed => 'Benutzerdefinierter Feed';

  @override
  String get deckTypeLocal => 'Lokal';

  @override
  String get deckTypeHashtag => 'Hashtag';

  @override
  String get deckTypeMentions => 'Erwähnungen';

  @override
  String get addDeckDialogTitle => 'Deck hinzufügen';

  @override
  String get deckNameLabel => 'Deck-Name';

  @override
  String get deckNameHint => 'z.B. Startseiten-Timeline';

  @override
  String get deckTypeLabel => 'Deck-Typ';

  @override
  String get accountLabel => 'Konto';

  @override
  String get useAllAccounts => 'Für alle Konten verwenden';

  @override
  String get addButton => 'Hinzufügen';

  @override
  String deckAddedSuccess(String deckName) {
    return 'Deck \"$deckName\" hinzugefügt';
  }

  @override
  String deckAddFailed(String error) {
    return 'Fehler beim Hinzufügen des Decks: $error';
  }

  @override
  String get timeNow => 'jetzt';

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
    return '${days}T';
  }

  @override
  String get numberThousandSuffix => 'T';

  @override
  String get numberMillionSuffix => 'M';

  @override
  String get multiAccount => 'Multi-Konto';

  @override
  String get deckOptions => 'Deck-Optionen';

  @override
  String get deckTypeCustom => 'Benutzerdefiniert';
}
