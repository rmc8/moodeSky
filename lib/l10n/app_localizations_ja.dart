// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Japanese (`ja`).
class AppLocalizationsJa extends AppLocalizations {
  AppLocalizationsJa([String locale = 'ja']) : super(locale);

  @override
  String get appTitle => 'MoodeSky';

  @override
  String get loginTitle => 'ログイン';

  @override
  String get addAccountTitle => 'アカウントを追加';

  @override
  String get loginMethod => 'ログイン方法';

  @override
  String get authMethodOAuth => 'OAuth';

  @override
  String get authMethodAppPassword => 'App Password';

  @override
  String get oAuthInfo => 'OAuth機能は開発中です。現在はApp Passwordをご利用ください。';

  @override
  String get appPasswordRecommended =>
      'App Passwordは推奨されるログイン方法です。安全で取り消しも簡単です。';

  @override
  String get serverSelectionTitle => 'サーバーを選択';

  @override
  String get customServerOption => 'カスタムサーバー...';

  @override
  String get customServerDescription => 'セルフホストサーバーを追加';

  @override
  String get customServerComingSoon => 'カスタムサーバー機能は開発中です';

  @override
  String get identifierLabel => 'ハンドルまたはメールアドレス';

  @override
  String get identifierHint => 'user.bsky.social';

  @override
  String get passwordLabel => 'App Password';

  @override
  String get passwordHint => 'App Passwordを入力';

  @override
  String get identifierRequired => 'ハンドルまたはメールアドレスを入力してください';

  @override
  String get passwordRequired => 'App Passwordを入力してください';

  @override
  String get signInButton => 'ログイン';

  @override
  String get oAuthInDevelopment => 'OAuth開発中';

  @override
  String get addAccountButton => 'アカウントを追加';

  @override
  String get aboutAppPassword => 'App Passwordについて';

  @override
  String get appPasswordDescription =>
      'App Passwordはアプリ専用の安全なパスワードです。通常のパスワードより安全です。';

  @override
  String get generateAppPassword => 'App Passwordを生成 →';

  @override
  String get copyButton => 'コピー';

  @override
  String get loginError => 'ログインエラー';

  @override
  String get accountAddError => 'アカウント追加エラー';

  @override
  String get retryButton => '再試行';

  @override
  String get helpTextOAuth => 'OAuth機能は近日公開予定です。現在はApp Passwordでログインしてください。';

  @override
  String get helpTextAppPassword =>
      'App PasswordはBlueskyの設定画面で生成できます。通常のパスワードではなく、App Passwordを使用してください。';

  @override
  String get multiAccountInfo =>
      'MoodeSkyでは複数のBlueskyアカウントを同時に管理できます。新しいアカウントの認証情報を入力してください。';

  @override
  String get newAccountInfo => '新しいアカウントを追加';

  @override
  String get multiAccountHelpText => '複数のアカウントを同時にログインして、簡単に切り替えることができます。';

  @override
  String get accountAddedSuccess => 'アカウントを追加しました';

  @override
  String accountAddedSuccessWithName(String name) {
    return 'アカウント「$name」を追加しました';
  }

  @override
  String accountAddFailed(String error) {
    return 'アカウント追加に失敗しました: $error';
  }

  @override
  String get accountAddCancelled => 'アカウント追加がキャンセルされました';

  @override
  String get switchAccount => 'アカウントを切り替え';

  @override
  String get signOutAll => 'すべてサインアウト';

  @override
  String get signOutAllConfirmTitle => 'すべてのアカウントからサインアウト';

  @override
  String get signOutAllConfirmMessage =>
      'すべてのアカウントからサインアウトしてもよろしいですか？再度サインインする必要があります。';

  @override
  String get cancelButton => 'キャンセル';

  @override
  String get signOutButton => 'サインアウト';

  @override
  String get loadingText => '読み込み中...';

  @override
  String get errorTitle => '問題が発生しました';

  @override
  String get languageLabel => '言語';

  @override
  String get languageDescription => 'アプリで使用する言語を選択してください';

  @override
  String get selectLanguage => '言語を選択';

  @override
  String get languageSettings => '言語設定';

  @override
  String get appearanceSettings => '外観設定';

  @override
  String get settingsTitle => '設定';

  @override
  String get accountSettings => 'アカウント設定';

  @override
  String get manageAccounts => 'アカウント管理';

  @override
  String get manageAccountsDescription => 'アカウントの追加、削除、切り替え';

  @override
  String get signOutAllDescription => 'すべてのアカウントからサインアウトしてログイン画面に戻ります';

  @override
  String get appInformation => 'アプリ情報';

  @override
  String get aboutApp => 'MoodeSkyについて';

  @override
  String appVersion(String version) {
    return 'バージョン $version';
  }

  @override
  String get aboutAppDescription =>
      'MoodeSkyは、デッキベースのインターフェースとマルチアカウントサポートを備えたモダンなBlueskyクライアントです。';

  @override
  String get privacyPolicy => 'プライバシーポリシー';

  @override
  String get termsOfService => '利用規約';

  @override
  String get comingSoon => '近日公開予定';

  @override
  String get themeLabel => 'テーマ';

  @override
  String get themeDescription => 'アプリで使用するテーマを選択してください';

  @override
  String get selectTheme => 'テーマを選択';

  @override
  String get themeSettings => 'テーマ設定';

  @override
  String get themeLight => 'ライト';

  @override
  String get themeDark => 'ダーク';

  @override
  String get themeSystem => 'システム';

  @override
  String get themeLightDescription => '空の青をアクセントにした明るくクリーンなインターフェース';

  @override
  String get themeDarkDescription => '夕焼けのオレンジをアクセントにした快適なダークインターフェース';

  @override
  String get themeSystemDescription => 'システムのテーマ設定に自動で従います';
}
