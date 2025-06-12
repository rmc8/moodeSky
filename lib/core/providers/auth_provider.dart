// Flutter imports:
import 'package:flutter/foundation.dart';

// Package imports:
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

// Project imports:
import 'package:moodesky/core/providers/database_provider.dart';
import 'package:moodesky/features/auth/models/server_config.dart';
import 'package:moodesky/services/bluesky/bluesky_service_v2.dart';
import 'package:moodesky/services/database/database.dart';
import 'package:moodesky/shared/models/auth_models.dart';

part 'auth_provider.g.dart';

/// Utility class for authentication-related operations
class _AuthUtils {
  /// Converts a list of accounts to UserProfile objects
  static List<UserProfile> convertAccountsToProfiles(List<Account> accounts) {
    return accounts
        .map(
          (account) => UserProfile(
            did: account.did,
            handle: account.handle,
            displayName: account.displayName,
            description: account.description,
            avatar: account.avatar,
            banner: account.banner,
            email: account.email,
            isVerified: account.isVerified,
          ),
        )
        .toList();
  }

  /// Converts a single account to UserProfile
  static UserProfile convertAccountToProfile(Account account) {
    return UserProfile(
      did: account.did,
      handle: account.handle,
      displayName: account.displayName,
      description: account.description,
      avatar: account.avatar,
      banner: account.banner,
      email: account.email,
      isVerified: account.isVerified,
    );
  }

  /// Creates a standardized error state
  static AuthState createErrorState(
    String message, [
    AuthErrorType? errorType,
  ]) {
    return AuthState.error(
      message: message,
      errorType: errorType ?? AuthErrorType.unknownError,
    );
  }

  /// Wraps async operations with standardized error handling
  static Future<T?> safeExecute<T>(
    Future<T> Function() operation,
    String errorMessage, {
    T? fallback,
    bool logError = true,
  }) async {
    try {
      return await operation();
    } catch (e) {
      if (logError) {
        // TODO: Replace with proper logging system
        debugPrint('$errorMessage: $e');
      }
      return fallback;
    }
  }

  /// Safe execute for void operations with error callback
  static Future<bool> safeExecuteVoid(
    Future<void> Function() operation,
    String errorMessage, {
    void Function(String)? onError,
    bool logError = true,
  }) async {
    try {
      await operation();
      return true;
    } catch (e) {
      if (logError) {
        // TODO: Replace with proper logging system
        debugPrint('$errorMessage: $e');
      }
      onError?.call(errorMessage);
      return false;
    }
  }
}

// Basic auth configuration
@Riverpod(keepAlive: true)
AuthConfig authConfig(Ref ref) {
  return AuthConfig(defaultPdsHost: 'bsky.social');
}

// Note: Database provider is now provided by database_provider.dart

// Secure storage provider
@Riverpod(keepAlive: true)
FlutterSecureStorage secureStorage(Ref ref) {
  return const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );
}

// Bluesky service provider
@Riverpod(keepAlive: true)
BlueskyServiceV2 blueskyService(Ref ref) {
  final database = ref.watch(databaseProvider);
  final secureStorage = ref.watch(secureStorageProvider);
  final authConfig = ref.watch(authConfigProvider);

  return BlueskyServiceV2(
    database: database,
    secureStorage: secureStorage,
    authConfig: authConfig,
  );
}

// Auth state provider
@Riverpod(keepAlive: true)
class AuthNotifier extends _$AuthNotifier {
  late BlueskyServiceV2 _blueskyService;

  @override
  AuthState build() {
    _blueskyService = ref.watch(blueskyServiceProvider);
    _initializeAuth();
    return const AuthState.initial();
  }

  // Initialize authentication state
  Future<void> _initializeAuth() async {
    state = const AuthState.loading();

    try {
      // BlueskyServiceV2を初期化
      await _blueskyService.initialize();
      
      // アクティブアカウントを取得
      final activeAccount = await _blueskyService.getActiveAccount();

      if (activeAccount == null) {
        state = const AuthState.unauthenticated();
        return;
      }

      // バックグラウンドで全アカウントのプロフィール情報を強制更新（アプリ起動を妨げない）
      _scheduleBackgroundProfileRefresh();

      // 認証状態を更新
      await _updateAuthenticatedState();
    } catch (e) {
      debugPrint('Authentication initialization failed: $e');
      // エラーが発生した場合は未認証状態にしてログイン画面を表示
      state = const AuthState.unauthenticated();
    }
  }

  /// バックグラウンドでプロフィール更新を実行
  void _scheduleBackgroundProfileRefresh() {
    Future.microtask(() async {
      final success = await _AuthUtils.safeExecute<bool>(
        () async {
          // TODO: Replace with proper logging system
          debugPrint('Starting background profile refresh for all accounts...');
          // TODO: プロフィールリフレッシュ機能は将来の実装で追加予定
          await _updateAuthenticatedState();
          // TODO: Replace with proper logging system
          debugPrint('Background profile refresh completed successfully');
          return true;
        },
        'Background profile refresh failed',
        fallback: false,
      );

      if (success != true) {
        // フォールバックとして認証状態の更新のみ試行
        await _AuthUtils.safeExecute<void>(() async {
          await _updateAuthenticatedState();
        }, 'Fallback profile refresh also failed');
      }
    });
  }

  // Generic login method (App Password only)
  Future<bool> login(AuthCredentials credentials) async {
    await signInWithAppPassword(
      identifier: credentials.identifier,
      password: credentials.password,
      pdsHost: Uri.parse(credentials.serviceUrl).host,
    );

    // Return true if authentication succeeded
    final currentState = state;
    return currentState is AuthAuthenticated;
  }

  // Sign in with app password
  Future<void> signInWithAppPassword({
    required String identifier,
    required String password,
    String? pdsHost,
  }) async {
    state = const AuthState.loading();

    await _AuthUtils.safeExecuteVoid(
      () async {
        final authResult = await _blueskyService.auth.signInWithAppPassword(
          identifier: identifier,
          password: password,
          pdsHost: pdsHost,
        );

        authResult.when(
          success: (session, accountDid) async {
            // プロフィール情報を取得・更新
            await _fetchAndUpdateProfileInfo(accountDid);
            // 認証状態を更新（新規ログインフラグ付き）
            await _updateAuthenticatedState(isNewLogin: true);
          },
          failure: (error, errorDescription, errorType) {
            state = AuthState.error(message: error, errorType: errorType);
          },
          cancelled: () {
            state = const AuthState.unauthenticated();
          },
        );
      },
      'App password sign in failed',
      onError: _setErrorState,
    );
  }

  /// エラー状態を設定するヘルパーメソッド
  void _setErrorState(String message, [AuthErrorType? errorType]) {
    state = _AuthUtils.createErrorState(message, errorType);
  }

  // Switch account
  Future<void> switchAccount(String targetAccountDid) async {
    await _AuthUtils.safeExecuteVoid(
      () async {
        await _blueskyService.switchAccount(targetAccountDid);
        await _updateAuthenticatedState();
      },
      'Failed to switch account',
      onError: _setErrorState,
    );
  }

  // Sign out current account
  Future<void> signOut() async {
    await _AuthUtils.safeExecuteVoid(
      () async {
        await _blueskyService.signOut();
        state = const AuthState.unauthenticated();
      },
      'Sign out failed',
      onError: _setErrorState,
    );
  }

  // Sign out all accounts
  Future<void> signOutAll() async {
    await _AuthUtils.safeExecuteVoid(
      () async {
        await _blueskyService.signOutAll();
        state = const AuthState.unauthenticated();
      },
      'Sign out all failed',
      onError: _setErrorState,
    );
  }

  // Add account (multi-account support - App Password only)
  Future<AuthResult> addAccount({
    required String identifier,
    required String password,
    required ServerConfig serverConfig,
  }) async {
    final result = await _AuthUtils.safeExecute<AuthResult>(
      () async {
        // App Password flow for additional account
        final authResult = await _blueskyService.auth.signInWithAppPassword(
          identifier: identifier,
          password: password,
          pdsHost: Uri.parse(serverConfig.serviceUrl).host,
          isAdditionalAccount:
              true, // Flag to indicate this is an additional account
        );

        final result = authResult.when(
          success: (session, accountDid) =>
              AuthResult.success(session: session, accountDid: accountDid),
          failure: (error, errorDescription, errorType) => AuthResult.failure(
            error: error,
            errorDescription: errorDescription,
            errorType: errorType,
          ),
          cancelled: () => AuthResult.failure(
            error: 'Authentication cancelled',
            errorType: AuthErrorType.userCancelled,
          ),
        );

        // If successful, fetch profile information and update state
        result.whenOrNull(
          success: (session, accountDid) async {
            await _fetchAndUpdateProfileInfo(accountDid);
            await _updateAuthenticatedState();
          },
        );

        return result;
      },
      'Failed to add account',
      fallback: AuthResult.failure(
        error: 'Failed to add account',
        errorType: AuthErrorType.unknownError,
      ),
    );

    return result ??
        AuthResult.failure(
          error: 'Failed to add account',
          errorType: AuthErrorType.unknownError,
        );
  }

  // Remove account
  Future<void> removeAccount(String accountDid) async {
    await _AuthUtils.safeExecuteVoid(
      () async {
        await _blueskyService.removeAccount(accountDid);

        // Update state after account removal
        final currentState = state;
        if (currentState is AuthAuthenticated) {
          if (currentState.activeAccountDid == accountDid) {
            // If active account was removed, try to switch to another account
            final accounts = await _blueskyService.getAllAccounts();
            if (accounts.isNotEmpty) {
              await switchAccount(accounts.first.did);
            } else {
              state = const AuthState.unauthenticated();
            }
          } else {
            // Update accounts list
            await _updateAuthenticatedState();
          }
        }
      },
      'Failed to remove account',
      onError: _setErrorState,
    );
  }

  // Refresh authentication state
  Future<void> refresh() async {
    await _initializeAuth();
  }

  // Clear new login flag (to prevent duplicate notifications)
  void clearNewLoginFlag() {
    final currentState = state;
    if (currentState is AuthAuthenticated && currentState.isNewLogin) {
      state = currentState.copyWith(isNewLogin: false);
    }
  }

  // Fetch and update profile information for a specific account
  Future<void> _fetchAndUpdateProfileInfo(String accountDid) async {
    try {
      // TODO: プロフィール取得機能は将来の実装で追加予定
      // TODO: Replace with proper logging system
      debugPrint('Profile info fetching for account $accountDid (placeholder)');
    } catch (e) {
      // プロフィール取得に失敗した場合でも、アカウント作成は成功とみなす
      // TODO: Replace with proper logging system
      debugPrint('Failed to fetch profile info for $accountDid: $e');
    }
  }

  // 全アカウントのプロフィール情報を更新する
  Future<void> refreshAllProfiles() async {
    await _AuthUtils.safeExecute<void>(() async {
      // TODO: プロフィール更新機能は将来の実装で追加予定
      // 状態を更新してUIに反映
      await _updateAuthenticatedState();
    }, 'Failed to refresh all profiles');
  }

  // 必要なアカウントのプロフィール情報のみを更新する
  Future<void> refreshProfilesIfNeeded() async {
    await _AuthUtils.safeExecute<void>(() async {
      // TODO: プロフィール更新機能は将来の実装で追加予定
      // 状態を更新してUIに反映
      await _updateAuthenticatedState();
    }, 'Failed to refresh profiles if needed');
  }

  // Update authenticated state with current account information
  Future<void> _updateAuthenticatedState({bool isNewLogin = false}) async {
    final activeAccount = await _blueskyService.getActiveAccount();

    if (activeAccount == null) {
      state = const AuthState.unauthenticated();
      return;
    }

    final accounts = await _blueskyService.getAllAccounts();
    final profiles = _AuthUtils.convertAccountsToProfiles(accounts);

    state = AuthState.authenticated(
      activeAccountDid: activeAccount.did,
      accounts: profiles,
      isNewLogin: isNewLogin,
    );
  }
}

// Active account provider
@riverpod
UserProfile? activeAccount(Ref ref) {
  final authState = ref.watch(authNotifierProvider);

  return authState.maybeWhen(
    authenticated: (activeAccountDid, accounts, isNewLogin) {
      return accounts.firstWhere(
        (account) => account.did == activeAccountDid,
        orElse: () => accounts.first,
      );
    },
    orElse: () => null,
  );
}

// Available accounts provider
@riverpod
List<UserProfile> availableAccounts(Ref ref) {
  final authState = ref.watch(authNotifierProvider);

  return authState.maybeWhen(
    authenticated: (_, accounts, __) => accounts,
    orElse: () => [],
  );
}

// Authentication status provider
@riverpod
bool isAuthenticated(Ref ref) {
  final authState = ref.watch(authNotifierProvider);
  return authState is AuthAuthenticated;
}

// Multi-account status provider
@riverpod
Future<MultiAccountStatus?> multiAccountStatus(Ref ref) async {
  final authState = ref.watch(authNotifierProvider);

  if (authState is! AuthAuthenticated) return null;

  final blueskyService = ref.watch(blueskyServiceProvider);
  final accounts = await blueskyService.getAllAccounts();

  final accountProfiles = <String, UserProfile>{};
  final accountTokenStatus = <String, bool>{};

  for (final account in accounts) {
    accountProfiles[account.did] = _AuthUtils.convertAccountToProfile(account);

    accountTokenStatus[account.did] =
        (account.accessJwt != null) ||
        (account.accessJwt != null && account.refreshJwt != null);
  }

  return MultiAccountStatus(
    activeAccountDid: authState.activeAccountDid,
    availableAccountDids: accounts.map((a) => a.did).toList(),
    totalAccounts: accounts.length,
    accountProfiles: accountProfiles,
    accountTokenStatus: accountTokenStatus,
  );
}

// Note: BlueskyService provider is already defined above as blueskyServiceProvider
