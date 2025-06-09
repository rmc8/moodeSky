// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Korean (`ko`).
class AppLocalizationsKo extends AppLocalizations {
  AppLocalizationsKo([String locale = 'ko']) : super(locale);

  @override
  String get appTitle => 'MoodeSky';

  @override
  String get loginTitle => '로그인';

  @override
  String get addAccountTitle => '계정 추가';

  @override
  String get loginMethod => '로그인 방법';

  @override
  String get authMethodOAuth => 'OAuth';

  @override
  String get authMethodAppPassword => '앱 비밀번호';

  @override
  String get oAuthInfo => 'OAuth 기능은 개발 중입니다. 현재는 앱 비밀번호를 사용해 주세요.';

  @override
  String get appPasswordRecommended => '앱 비밀번호는 권장되는 로그인 방법입니다. 안전하고 취소도 쉽습니다.';

  @override
  String get serverSelectionTitle => '서버 선택';

  @override
  String get customServerOption => '사용자 지정 서버...';

  @override
  String get customServerDescription => '셀프 호스팅 서버 추가';

  @override
  String get customServerComingSoon => '사용자 지정 서버 기능은 개발 중입니다';

  @override
  String get identifierLabel => '핸들 또는 이메일';

  @override
  String get identifierHint => 'user.bsky.social';

  @override
  String get passwordLabel => '앱 비밀번호';

  @override
  String get passwordHint => '앱 비밀번호를 입력하세요';

  @override
  String get identifierRequired => '핸들 또는 이메일을 입력해 주세요';

  @override
  String get passwordRequired => '앱 비밀번호를 입력해 주세요';

  @override
  String get signInButton => '로그인';

  @override
  String get oAuthInDevelopment => 'OAuth 개발 중';

  @override
  String get addAccountButton => '계정 추가';

  @override
  String get aboutAppPassword => '앱 비밀번호 정보';

  @override
  String get appPasswordDescription =>
      '앱 비밀번호는 앱 전용 보안 비밀번호입니다. 일반 비밀번호보다 안전합니다.';

  @override
  String get generateAppPassword => '앱 비밀번호 생성 →';

  @override
  String get copyButton => '복사';

  @override
  String get loginError => '로그인 오류';

  @override
  String get accountAddError => '계정 추가 오류';

  @override
  String get retryButton => '재시도';

  @override
  String get helpTextOAuth => 'OAuth는 곧 제공될 예정입니다. 지금은 앱 비밀번호로 로그인해 주세요.';

  @override
  String get helpTextAppPassword =>
      '앱 비밀번호는 Bluesky 설정에서 생성할 수 있습니다. 일반 비밀번호 대신 앱 비밀번호를 사용해 주세요.';

  @override
  String get multiAccountInfo =>
      'MoodeSky는 여러 Bluesky 계정을 동시에 관리할 수 있습니다. 새 계정 자격 증명을 입력하세요.';

  @override
  String get newAccountInfo => '새 계정 추가';

  @override
  String get multiAccountHelpText => '여러 계정에 동시에 로그인하고 쉽게 전환할 수 있습니다.';

  @override
  String get accountAddedSuccess => '계정이 추가되었습니다';

  @override
  String accountAddedSuccessWithName(String name) {
    return '\"$name\" 계정이 추가되었습니다';
  }

  @override
  String accountAddFailed(String error) {
    return '계정 추가 실패: $error';
  }

  @override
  String get accountAddCancelled => '계정 추가가 취소되었습니다';

  @override
  String get switchAccount => '계정 전환';

  @override
  String get signOutAll => '모두 로그아웃';

  @override
  String get signOutAllConfirmTitle => '모든 계정에서 로그아웃';

  @override
  String get signOutAllConfirmMessage => '모든 계정에서 로그아웃하시겠습니까? 다시 로그인해야 합니다.';

  @override
  String get cancelButton => '취소';

  @override
  String get signOutButton => '로그아웃';

  @override
  String get loadingText => '로딩 중...';

  @override
  String get errorTitle => '문제가 발생했습니다';

  @override
  String get languageLabel => '언어';

  @override
  String get languageDescription => '앱에서 사용할 언어를 선택하세요';

  @override
  String get selectLanguage => '언어 선택';

  @override
  String get languageSettings => '언어 설정';

  @override
  String get appearanceSettings => '외관 설정';

  @override
  String get settingsTitle => '설정';

  @override
  String get accountSettings => '계정 설정';

  @override
  String get manageAccounts => '계정 관리';

  @override
  String get manageAccountsDescription => '계정 추가, 삭제, 전환';

  @override
  String get signOutAllDescription => '모든 계정에서 로그아웃하고 로그인 화면으로 돌아갑니다';

  @override
  String get appInformation => '앱 정보';

  @override
  String get aboutApp => 'MoodeSky 정보';

  @override
  String appVersion(String version) {
    return '버전 $version';
  }

  @override
  String get aboutAppDescription =>
      'MoodeSky는 덱 기반 인터페이스와 멀티 계정 지원을 갖춤 모던 Bluesky 클라이언트입니다.';

  @override
  String get privacyPolicy => '개인정보 보호정책';

  @override
  String get termsOfService => '서비스 이용약관';

  @override
  String get comingSoon => '곧 출시 예정';

  @override
  String get themeLabel => '테마';

  @override
  String get themeDescription => '앱에서 사용할 테마를 선택하세요';

  @override
  String get selectTheme => '테마 선택';

  @override
  String get themeSettings => '테마 설정';

  @override
  String get themeLight => '라이트';

  @override
  String get themeDark => '다크';

  @override
  String get themeSystem => '시스템';

  @override
  String get themeLightDescription => '하늘 블루 액센트로 밝고 깔끔한 인터페이스';

  @override
  String get themeDarkDescription => '일몰 오렌지 액센트로 편안한 다크 인터페이스';

  @override
  String get themeSystemDescription => '시스템 테마 설정을 자동으로 따릅니다';
}
