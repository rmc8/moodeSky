// Package imports:
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

// Project imports:
import 'package:moodesky/core/providers/database_provider.dart';
import 'package:moodesky/features/auth/models/server_config.dart';
import 'package:moodesky/services/bluesky_service.dart';
import 'package:moodesky/shared/models/auth_models.dart';

part 'auth_provider.g.dart';

// Auth configuration provider
@Riverpod(keepAlive: true)
AuthConfig authConfig(AuthConfigRef ref) {
  return const AuthConfig(
    clientMetadataUrl: 'https://moodesky.app/oauth/client-metadata.json',
    callbackUrlScheme: 'com.moodesky.app',
    defaultPdsHost: 'bsky.social',
  );
}

// Note: Database provider is now provided by database_provider.dart

// Secure storage provider
@Riverpod(keepAlive: true)
FlutterSecureStorage secureStorage(SecureStorageRef ref) {
  return const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );
}

// Bluesky service provider
@Riverpod(keepAlive: true)
BlueskyService blueskyService(Ref ref) {
  final database = ref.watch(databaseProvider);
  final secureStorage = ref.watch(secureStorageProvider);
  final authConfig = ref.watch(authConfigProvider);

  return BlueskyService(
    database: database,
    secureStorage: secureStorage,
    authConfig: authConfig,
  );
}

// Auth state provider
@Riverpod(keepAlive: true)
class AuthNotifier extends _$AuthNotifier {
  late BlueskyService _blueskyService;

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
      final activeAccount = await _blueskyService.getActiveAccount();

      if (activeAccount == null) {
        state = const AuthState.unauthenticated();
        return;
      }

      // Check if session is valid and refresh if needed
      final isValid = await _blueskyService.validateAndRefreshSession(
        activeAccount.did,
      );

      if (!isValid) {
        // セッションが無効でリフレッシュも失敗した場合、ログアウト状態にする
        print('Session validation failed, signing out user: ${activeAccount.handle}');
        state = const AuthState.unauthenticated();
        return;
      }

      final accounts = await _blueskyService.getAllAccounts();
      
      // バックグラウンドで全アカウントのプロフィール情報を強制更新（アプリ起動を妨げない）
      Future.microtask(() async {
        try {
          print('Starting background profile refresh for all accounts...');
          await _blueskyService.refreshAllAccountProfiles();
          // 更新後に状態を再更新
          await _updateAuthenticatedState();
          print('Background profile refresh completed successfully');
        } catch (e) {
          print('Background profile refresh failed: $e');
          // フォールバックとして必要最小限の更新を試行
          try {
            await _blueskyService.refreshProfilesIfNeeded();
            await _updateAuthenticatedState();
          } catch (fallbackError) {
            print('Fallback profile refresh also failed: $fallbackError');
          }
        }
      });
      
      final profiles = accounts
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

      state = AuthState.authenticated(
        activeAccountDid: activeAccount.did,
        accounts: profiles,
      );
    } catch (e) {
      state = AuthState.error(
        message: 'Failed to initialize authentication: $e',
        errorType: AuthErrorType.unknownError,
      );
    }
  }

  // Sign in with OAuth
  Future<void> signInWithOAuth({
    String? userIdentifier,
    String? pdsHost,
  }) async {
    state = const AuthState.loading();

    try {
      final result = await _blueskyService.signInWithOAuth(
        userIdentifier: userIdentifier,
        pdsHost: pdsHost,
      );

      result.when(
        success: (session, accountDid) async {
          // プロフィール情報を取得・更新
          await _fetchAndUpdateProfileInfo(accountDid);
          // 認証状態を更新
          await _updateAuthenticatedState();
        },
        failure: (error, errorDescription, errorType) {
          state = AuthState.error(message: error, errorType: errorType);
        },
        cancelled: () {
          state = const AuthState.unauthenticated();
        },
      );
    } catch (e) {
      state = AuthState.error(
        message: 'OAuth sign in failed: $e',
        errorType: AuthErrorType.unknownError,
      );
    }
  }

  // Generic login method
  Future<bool> login(AuthCredentials credentials) async {
    switch (credentials.method) {
      case AuthMethod.oauth:
        await signInWithOAuth(
          userIdentifier: credentials.identifier.isNotEmpty
              ? credentials.identifier
              : null,
          pdsHost: Uri.parse(credentials.serviceUrl).host,
        );
        break;
      case AuthMethod.appPassword:
        await signInWithAppPassword(
          identifier: credentials.identifier,
          password: credentials.password,
          pdsHost: Uri.parse(credentials.serviceUrl).host,
        );
        break;
    }

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

    try {
      final result = await _blueskyService.signInWithAppPassword(
        identifier: identifier,
        password: password,
        pdsHost: pdsHost,
      );

      result.when(
        success: (session, accountDid) async {
          // プロフィール情報を取得・更新
          await _fetchAndUpdateProfileInfo(accountDid);
          // 認証状態を更新
          await _updateAuthenticatedState();
        },
        failure: (error, errorDescription, errorType) {
          state = AuthState.error(message: error, errorType: errorType);
        },
        cancelled: () {
          state = const AuthState.unauthenticated();
        },
      );
    } catch (e) {
      state = AuthState.error(
        message: 'App password sign in failed: $e',
        errorType: AuthErrorType.unknownError,
      );
    }
  }

  // Switch account
  Future<void> switchAccount(String targetAccountDid) async {
    try {
      await _blueskyService.switchAccount(targetAccountDid);
      await _updateAuthenticatedState();
    } catch (e) {
      state = AuthState.error(
        message: 'Failed to switch account: $e',
        errorType: AuthErrorType.unknownError,
      );
    }
  }

  // Sign out current account
  Future<void> signOut() async {
    try {
      await _blueskyService.signOut();
      state = const AuthState.unauthenticated();
    } catch (e) {
      state = AuthState.error(
        message: 'Sign out failed: $e',
        errorType: AuthErrorType.unknownError,
      );
    }
  }

  // Sign out all accounts
  Future<void> signOutAll() async {
    try {
      await _blueskyService.signOutAll();
      state = const AuthState.unauthenticated();
    } catch (e) {
      state = AuthState.error(
        message: 'Sign out all failed: $e',
        errorType: AuthErrorType.unknownError,
      );
    }
  }

  // Add account (multi-account support)
  Future<AuthResult> addAccount({
    required String identifier,
    required String password,
    required ServerConfig serverConfig,
    bool useOAuth = false,
  }) async {
    try {
      late AuthResult result;

      if (useOAuth) {
        // OAuth flow for additional account
        final authResult = await _blueskyService.signInWithOAuth(
          userIdentifier: identifier.isNotEmpty ? identifier : null,
          pdsHost: Uri.parse(serverConfig.serviceUrl).host,
        );

        result = authResult.when(
          success: (session, accountDid) =>
              AuthResult.success(session: session, accountDid: accountDid),
          failure: (error, errorDescription, errorType) => AuthResult.failure(
            error: error,
            errorDescription: errorDescription,
            errorType: errorType,
          ),
          cancelled: () => AuthResult.failure(
            error: 'OAuth cancelled',
            errorType: AuthErrorType.userCancelled,
          ),
        );
      } else {
        // App Password flow for additional account
        final authResult = await _blueskyService.signInWithAppPassword(
          identifier: identifier,
          password: password,
          pdsHost: Uri.parse(serverConfig.serviceUrl).host,
          isAdditionalAccount:
              true, // Flag to indicate this is an additional account
        );

        result = authResult.when(
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
      }

      // If successful, fetch profile information and update state
      result.whenOrNull(
        success: (session, accountDid) async {
          await _fetchAndUpdateProfileInfo(accountDid);
          await _updateAuthenticatedState();
        },
      );

      return result;
    } catch (e) {
      return AuthResult.failure(
        error: 'Failed to add account: $e',
        errorType: AuthErrorType.unknownError,
      );
    }
  }

  // Remove account
  Future<void> removeAccount(String accountDid) async {
    try {
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
    } catch (e) {
      state = AuthState.error(
        message: 'Failed to remove account: $e',
        errorType: AuthErrorType.unknownError,
      );
    }
  }

  // Refresh authentication state
  Future<void> refresh() async {
    await _initializeAuth();
  }

  // Fetch and update profile information for a specific account
  Future<void> _fetchAndUpdateProfileInfo(String accountDid) async {
    try {
      // 最新のプロフィール情報をAPIから取得（現在はモック実装）
      final profileInfo = await _blueskyService.fetchProfileFromAPI(accountDid);
      if (profileInfo != null) {
        print('Fetched profile for ${profileInfo.handle}: avatar=${profileInfo.avatar}');
        
        // データベースに最新の情報を保存
        await _blueskyService.updateAccountProfile(
          accountDid: accountDid,
          displayName: profileInfo.displayName,
          description: profileInfo.description,
          avatar: profileInfo.avatar,
          banner: profileInfo.banner,
        );
        
        print('Profile updated in database for ${profileInfo.handle}');
      }
    } catch (e) {
      // プロフィール取得に失敗した場合でも、アカウント作成は成功とみなす
      print('Failed to fetch profile info for $accountDid: $e');
    }
  }

  // 全アカウントのプロフィール情報を更新する
  Future<void> refreshAllProfiles() async {
    try {
      await _blueskyService.refreshAllAccountProfiles();
      // 状態を更新してUIに反映
      await _updateAuthenticatedState();
    } catch (e) {
      print('Failed to refresh all profiles: $e');
    }
  }
  
  // 必要なアカウントのプロフィール情報のみを更新する
  Future<void> refreshProfilesIfNeeded() async {
    try {
      await _blueskyService.refreshProfilesIfNeeded();
      // 状態を更新してUIに反映
      await _updateAuthenticatedState();
    } catch (e) {
      print('Failed to refresh profiles if needed: $e');
    }
  }

  // Update authenticated state with current account information
  Future<void> _updateAuthenticatedState() async {
    final activeAccount = await _blueskyService.getActiveAccount();

    if (activeAccount == null) {
      state = const AuthState.unauthenticated();
      return;
    }

    final accounts = await _blueskyService.getAllAccounts();
    final profiles = accounts
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

    state = AuthState.authenticated(
      activeAccountDid: activeAccount.did,
      accounts: profiles,
    );
  }
}

// Active account provider
@riverpod
UserProfile? activeAccount(ActiveAccountRef ref) {
  final authState = ref.watch(authNotifierProvider);

  return authState.maybeWhen(
    authenticated: (activeAccountDid, accounts) {
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
List<UserProfile> availableAccounts(AvailableAccountsRef ref) {
  final authState = ref.watch(authNotifierProvider);

  return authState.maybeWhen(
    authenticated: (_, accounts) => accounts,
    orElse: () => [],
  );
}

// Authentication status provider
@riverpod
bool isAuthenticated(IsAuthenticatedRef ref) {
  final authState = ref.watch(authNotifierProvider);
  return authState is AuthAuthenticated;
}

// Multi-account status provider
@riverpod
Future<MultiAccountStatus?> multiAccountStatus(
  MultiAccountStatusRef ref,
) async {
  final authState = ref.watch(authNotifierProvider);

  if (authState is! AuthAuthenticated) return null;

  final blueskyService = ref.watch(blueskyServiceProvider);
  final accounts = await blueskyService.getAllAccounts();

  final accountProfiles = <String, UserProfile>{};
  final accountTokenStatus = <String, bool>{};

  for (final account in accounts) {
    accountProfiles[account.did] = UserProfile(
      did: account.did,
      handle: account.handle,
      displayName: account.displayName,
      description: account.description,
      avatar: account.avatar,
      banner: account.banner,
      email: account.email,
      isVerified: account.isVerified,
    );

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

/// BlueskyService provider
@Riverpod(keepAlive: true)
BlueskyService blueskyServiceApi(Ref ref) {
  final database = ref.watch(databaseProvider);
  final secureStorage = ref.watch(secureStorageProvider);
  final authConfig = ref.watch(authConfigProvider);

  return BlueskyService(
    database: database,
    secureStorage: secureStorage,
    authConfig: authConfig,
  );
}
