// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Korean (`ko`).
class AppLocalizationsKo extends AppLocalizations {
  AppLocalizationsKo([String locale = 'ko']) : super(locale);

  @override
  String get appTitle => 'moodeSky';

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
  String get signingIn => 'Signing in...';

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
      'moodeSky는 여러 Bluesky 계정을 동시에 관리할 수 있습니다. 새 계정 자격 증명을 입력하세요.';

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
  String repostedBy(String name) {
    return '$name님이 리포스트했습니다';
  }

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
  String get refreshProfiles => '프로필 새로고침';

  @override
  String get refreshProfilesDescription => '모든 계정의 프로필 정보와 아바타 업데이트';

  @override
  String get refreshingProfiles => '프로필 정보를 업데이트하는 중...';

  @override
  String get profilesRefreshed => '프로필 정보가 업데이트되었습니다';

  @override
  String get refreshProfilesError => '프로필 업데이트에 실패했습니다';

  @override
  String get signOutAllDescription => '모든 계정에서 로그아웃하고 로그인 화면으로 돌아갑니다';

  @override
  String loginSuccess(String userName) {
    return 'Login successful: $userName';
  }

  @override
  String get close => 'Close';

  @override
  String get appInformation => '앱 정보';

  @override
  String get aboutApp => 'moodeSky 정보';

  @override
  String appVersion(String version) {
    return '버전 $version';
  }

  @override
  String get aboutAppDescription =>
      'moodeSky는 덱 기반 인터페이스와 멀티 계정 지원을 갖춤 모던 Bluesky 클라이언트입니다.';

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

  @override
  String get homeTitle => '홈';

  @override
  String get decksEmptyTitle => '덱이 없습니다';

  @override
  String get decksEmptyDescription =>
      '내비게이션 바의 \"덱\" 버튼으로\n덱을 추가해서 타임라인을 표시하세요';

  @override
  String get addDeckButton => '덱 추가';

  @override
  String get addDeckTooltip => '덱 추가';

  @override
  String get composeTooltip => '새 게시물 작성';

  @override
  String get settingsTooltip => '설정 화면 열기';

  @override
  String get homeNavigation => '홈';

  @override
  String get notificationsNavigation => '알림';

  @override
  String get searchNavigation => '검색';

  @override
  String get profileNavigation => '프로필';

  @override
  String get composeNavigation => '게시';

  @override
  String get deckNavigation => '덱';

  @override
  String get noLoggedInAccounts => '로그인된 계정이 없습니다';

  @override
  String get notificationLike => '당신의 게시물을 좋아합니다';

  @override
  String get notificationRepost => '당신의 게시물을 리포스트했습니다';

  @override
  String get notificationFollow => '당신을 팔로우했습니다';

  @override
  String get notificationMention => '당신을 멘션했습니다';

  @override
  String get notificationReply => '당신의 게시물에 답글을 남겼습니다';

  @override
  String get notification => '알림';

  @override
  String get followers => '팔로워';

  @override
  String get posts => '게시물';

  @override
  String get trending => '트렌딩';

  @override
  String get following => '팔로잉';

  @override
  String get follow => '팔로우';

  @override
  String get noProfileInfo => '프로필 정보가 없습니다';

  @override
  String get sampleContent => '샘플 콘텐츠';

  @override
  String hoursAgo(int hours) {
    return '$hours시간 전';
  }

  @override
  String get closeDeckFeature => '덱 닫기 기능은 개발 중입니다';

  @override
  String get composeFunctionUnderDev => '게시물 작성 기능은 개발 중입니다';

  @override
  String get notificationsFunctionUnderDev => '알림 기능은 개발 중입니다';

  @override
  String get searchFunctionUnderDev => '검색 기능은 개발 중입니다';

  @override
  String errorOccurred(String error) {
    return '오류가 발생했습니다: $error';
  }

  @override
  String get deckTypeHome => '홈';

  @override
  String get deckTypeNotifications => '알림';

  @override
  String get deckTypeSearch => '검색';

  @override
  String get deckTypeList => '리스트';

  @override
  String get deckTypeProfile => '프로필';

  @override
  String get deckTypeThread => '스레드';

  @override
  String get deckTypeCustomFeed => '커스텀 피드';

  @override
  String get deckTypeLocal => '로컬';

  @override
  String get deckTypeHashtag => '해시태그';

  @override
  String get deckTypeMentions => '멘션';

  @override
  String get addDeckDialogTitle => '덱 추가';

  @override
  String get deckNameLabel => '덱 이름';

  @override
  String get deckNameHint => '예: 홈 타임라인';

  @override
  String get deckTypeLabel => '덱 타입';

  @override
  String get accountLabel => '계정';

  @override
  String get useAllAccounts => '모든 계정에서 사용';

  @override
  String get addButton => '추가';

  @override
  String deckAddedSuccess(String deckName) {
    return '덱 \"$deckName\"이(가) 추가되었습니다';
  }

  @override
  String deckAddFailed(String error) {
    return '덱 추가에 실패했습니다: $error';
  }

  @override
  String get timeNow => '지금';

  @override
  String timeMinutes(int minutes) {
    return '$minutes분';
  }

  @override
  String timeHours(int hours) {
    return '$hours시간';
  }

  @override
  String timeDays(int days) {
    return '$days일';
  }

  @override
  String get numberThousandSuffix => '천';

  @override
  String get numberMillionSuffix => '백만';

  @override
  String get multiAccount => '멀티 계정';

  @override
  String get deckOptions => '덱 옵션';

  @override
  String get deckTypeCustom => '커스텀';

  @override
  String get moveDeckLeft => '왼쪽으로 이동';

  @override
  String get moveDeckRight => '오른쪽으로 이동';

  @override
  String get deckSettings => '덱 설정';

  @override
  String get deleteDeck => '덱 삭제';

  @override
  String get deckMovedLeft => '덱을 왼쪽으로 이동했습니다';

  @override
  String get deckMovedRight => '덱을 오른쪽으로 이동했습니다';

  @override
  String get deckMoveError => '덱 이동에 실패했습니다';

  @override
  String get deckSettingsComingSoon => '덱 설정 기능이 곧 출시됩니다';

  @override
  String get deleteDeckTitle => '덱 삭제';

  @override
  String deleteDeckConfirm(String deckTitle) {
    return '\"$deckTitle\"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.';
  }

  @override
  String get deleteButton => '삭제';

  @override
  String deckDeletedSuccess(String deckTitle) {
    return '\"$deckTitle\"이(가) 삭제되었습니다';
  }

  @override
  String get deckDeleteError => '덱 삭제에 실패했습니다';

  @override
  String get richTextMentionLabel => '멘션';

  @override
  String get richTextHashtagLabel => '해시태그';

  @override
  String get richTextUrlLabel => 'URL';

  @override
  String richTextMentionTapped(String handle) {
    return '멘션 @$handle을(를) 탭했습니다';
  }

  @override
  String richTextHashtagTapped(String tag) {
    return '해시태그 #$tag을(를) 탭했습니다';
  }

  @override
  String richTextUrlTapped(String url) {
    return 'URL $url을(를) 탭했습니다';
  }

  @override
  String get richTextProfileView => '프로필 보기';

  @override
  String get richTextHashtagSearch => '해시태그 검색';

  @override
  String get richTextOpenUrl => 'URL 열기';

  @override
  String get richTextCopyUrl => 'URL 복사';

  @override
  String get richTextUrlCopied => 'URL이 클립보드에 복사되었습니다';

  @override
  String get richTextUrlOpenFailed => 'URL을 열 수 없습니다';

  @override
  String get richTextProcessingError => '텍스트 처리 오류';

  @override
  String get richTextFeatureNotImplemented => '이 기능은 개발 중입니다';
}
