// Package imports:
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

// Project imports:
import 'package:moodesky/shared/models/auth_models.dart';

/// テスト用のヘルパー関数とモッククラス

/// テスト用のWidget作成ヘルパー
class TestWidgetBuilder {
  static Widget createApp({
    Widget? home,
    List<Override>? providerOverrides,
  }) {
    return ProviderScope(
      overrides: providerOverrides ?? [],
      child: MaterialApp(
        home: home ?? const Scaffold(body: Text('Test Widget')),
      ),
    );
  }

  static Widget createScreenWithProviders({
    required Widget screen,
    List<Override>? providerOverrides,
  }) {
    return createApp(
      home: screen,
      providerOverrides: providerOverrides,
    );
  }
}

/// モック用のAuthState作成ヘルパー
class MockAuthStates {
  static const AuthState initial = AuthState.initial();
  static const AuthState loading = AuthState.loading();
  static const AuthState unauthenticated = AuthState.unauthenticated();
  
  static AuthState authenticated({
    String activeAccountDid = 'did:plc:test123',
    List<UserProfile>? accounts,
  }) {
    final defaultAccounts = accounts ?? [
      const UserProfile(
        did: 'did:plc:test123',
        handle: 'test.bsky.social',
        displayName: 'Test User',
      ),
    ];
    
    return AuthState.authenticated(
      activeAccountDid: activeAccountDid,
      accounts: defaultAccounts,
    );
  }
  
  static AuthState error({
    String message = 'Test error',
    AuthErrorType? errorType,
  }) {
    return AuthState.error(
      message: message,
      errorType: errorType ?? AuthErrorType.unknownError,
    );
  }
}

/// テスト用のプロファイル作成ヘルパー
class TestProfiles {
  static const UserProfile defaultUser = UserProfile(
    did: 'did:plc:test123',
    handle: 'test.bsky.social',
    displayName: 'Test User',
    description: 'A test user profile',
    isVerified: true,
  );
  
  static const UserProfile secondUser = UserProfile(
    did: 'did:plc:test456',
    handle: 'test2.bsky.social',
    displayName: 'Second Test User',
    description: 'Another test user profile',
    isVerified: false,
  );
  
  static List<UserProfile> multipleUsers = [defaultUser, secondUser];
}

/// テスト用のAuthCredentials作成ヘルパー
class TestCredentials {
  static const AuthCredentials oauthCredentials = AuthCredentials(
    identifier: 'test@bsky.social',
    password: '', // OAuthではパスワード不要
    serviceUrl: 'https://bsky.social',
    method: AuthMethod.oauth,
  );
  
  static const AuthCredentials appPasswordCredentials = AuthCredentials(
    identifier: 'test@bsky.social',
    password: 'abcd-efgh-ijkl-mnop',
    serviceUrl: 'https://bsky.social',
    method: AuthMethod.appPassword,
  );
  
  static AuthCredentials customServerCredentials({
    String serviceUrl = 'https://custom.server.com',
    AuthMethod method = AuthMethod.appPassword,
  }) {
    return AuthCredentials(
      identifier: 'user@custom.com',
      password: method == AuthMethod.appPassword ? 'test-password' : '',
      serviceUrl: serviceUrl,
      method: method,
    );
  }
}

/// ウィジェットテスト用の共通アサーション
class TestAssertions {
  /// 基本的なログインフォーム要素が存在することを確認
  static void expectLoginFormElements(WidgetTester tester) {
    expect(find.text('MoodeSky'), findsOneWidget);
    expect(find.text('Sign in method'), findsOneWidget);
    expect(find.byType(TextFormField), findsAtLeastNWidgets(1));
  }
  
  /// エラー表示が正しく機能することを確認
  static void expectErrorDisplay(WidgetTester tester, String errorMessage) {
    expect(find.byIcon(Icons.error_outline), findsOneWidget);
    expect(find.text(errorMessage), findsOneWidget);
  }
  
  /// ローディング状態が正しく表示されることを確認
  static void expectLoadingState(WidgetTester tester) {
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  }
}

/// テストデータ生成ユーティリティ
class TestDataGenerator {
  /// ランダムなDIDを生成
  static String generateDid() {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    return 'did:plc:test$timestamp';
  }
  
  /// ランダムなハンドルを生成
  static String generateHandle({String domain = 'bsky.social'}) {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    return 'user$timestamp.$domain';
  }
  
  /// テスト用のUserProfileを生成
  static UserProfile generateProfile({
    String? did,
    String? handle,
    String? displayName,
  }) {
    final generatedDid = did ?? generateDid();
    final generatedHandle = handle ?? generateHandle();
    
    return UserProfile(
      did: generatedDid,
      handle: generatedHandle,
      displayName: displayName ?? 'Test User',
      description: 'Generated test profile',
      isVerified: false,
    );
  }
}

/// テスト用のProvider オーバーライド
class TestProviders {
  /// 認証状態をモックするためのオーバーライド
  /// 注意: 実際のプロバイダーのオーバーライドは、具体的な実装に依存します
  static List<Override> createAuthOverrides(AuthState state) {
    // Riverpod v2の新しいオーバーライド方法
    return [];
  }
}

/// モックのAuthNotifier  
class MockAuthNotifier extends StateNotifier<AuthState> {
  MockAuthNotifier(super.initialState);
  
  void setState(AuthState newState) {
    state = newState;
  }
  
  Future<bool> mockLogin(AuthCredentials credentials) async {
    state = const AuthState.loading();
    await Future.delayed(const Duration(milliseconds: 100)); // 非同期操作をシミュレート
    
    // 成功パターン
    if (credentials.identifier.isNotEmpty && 
        (credentials.method == AuthMethod.oauth || credentials.password.isNotEmpty)) {
      state = MockAuthStates.authenticated();
      return true;
    }
    
    // 失敗パターン
    state = MockAuthStates.error(message: 'Invalid credentials');
    return false;
  }
}

/// テスト用の定数
class TestConstants {
  static const String testServerUrl = 'https://test.server.com';
  static const String testDisplayName = 'Test Server';
  static const String testUserHandle = 'test.bsky.social';
  static const String testUserDid = 'did:plc:test123';
  static const String testAppPassword = 'abcd-efgh-ijkl-mnop';
  static const String validEmail = 'test@example.com';
  static const String invalidEmail = 'invalid-email';
}

/// テスト用のMatcher拡張
class CustomMatchers {
  /// AuthStateの型をチェックするMatcher
  static Matcher isAuthState<T extends AuthState>() {
    return isA<T>();
  }
  
  /// UserProfileの特定フィールドをチェックするMatcher
  static Matcher hasUserHandle(String handle) {
    return predicate<UserProfile>(
      (profile) => profile.handle == handle,
      'has handle "$handle"',
    );
  }
  
  /// ServerConfigの特定フィールドをチェックするMatcher
  static Matcher hasServerUrl(String url) {
    return predicate<dynamic>(
      (server) => server.serviceUrl == url,
      'has service URL "$url"',
    );
  }
}