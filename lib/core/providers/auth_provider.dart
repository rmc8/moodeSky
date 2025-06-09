// Package imports:
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

// Project imports:
import 'package:moodesky/services/bluesky_service.dart';
import 'package:moodesky/services/database/database.dart';
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

// Database provider
@Riverpod(keepAlive: true)
AppDatabase database(DatabaseRef ref) {
  return AppDatabase();
}

// Secure storage provider
@Riverpod(keepAlive: true)
FlutterSecureStorage secureStorage(SecureStorageRef ref) {
  return const FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );
}

// Bluesky service provider
@Riverpod(keepAlive: true)
BlueskyService blueskyService(BlueskyServiceRef ref) {
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
      final isValid = await _blueskyService.validateAndRefreshSession(activeAccount.did);
      
      if (!isValid) {
        state = const AuthState.unauthenticated();
        return;
      }
      
      final accounts = await _blueskyService.getAllAccounts();
      final profiles = accounts.map((account) => UserProfile(
        did: account.did,
        handle: account.handle,
        displayName: account.displayName,
        description: account.description,
        avatar: account.avatar,
        banner: account.banner,
        email: account.email,
        isVerified: account.isVerified,
      )).toList();
      
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
  Future<void> signInWithOAuth({String? userIdentifier, String? pdsHost}) async {
    state = const AuthState.loading();
    
    try {
      final result = await _blueskyService.signInWithOAuth(
        userIdentifier: userIdentifier,
        pdsHost: pdsHost,
      );
      
      result.when(
        success: (session, accountDid) async {
          await _updateAuthenticatedState();
        },
        failure: (error, errorDescription, errorType) {
          state = AuthState.error(
            message: error,
            errorType: errorType,
          );
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
          await _updateAuthenticatedState();
        },
        failure: (error, errorDescription, errorType) {
          state = AuthState.error(
            message: error,
            errorType: errorType,
          );
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
  
  // Update authenticated state with current account information
  Future<void> _updateAuthenticatedState() async {
    final activeAccount = await _blueskyService.getActiveAccount();
    
    if (activeAccount == null) {
      state = const AuthState.unauthenticated();
      return;
    }
    
    final accounts = await _blueskyService.getAllAccounts();
    final profiles = accounts.map((account) => UserProfile(
      did: account.did,
      handle: account.handle,
      displayName: account.displayName,
      description: account.description,
      avatar: account.avatar,
      banner: account.banner,
      email: account.email,
      isVerified: account.isVerified,
    )).toList();
    
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
Future<MultiAccountStatus?> multiAccountStatus(MultiAccountStatusRef ref) async {
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
    
    accountTokenStatus[account.did] = (account.accessJwt != null) ||
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
