// Flutter imports:
import 'package:flutter/foundation.dart';

// Package imports:
import 'package:atproto/atproto.dart' as atproto;
import 'package:drift/drift.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// Project imports:
import 'package:moodesky/services/database/database.dart';
import 'package:moodesky/shared/models/auth_models.dart';

/// AuthService - Authentication service for AT Protocol
/// 
/// Handles authentication operations including:
/// - App Password authentication
/// - Session management
/// - Token storage and retrieval
/// - Account management
class AuthService {
  final AppDatabase database;
  final FlutterSecureStorage secureStorage;
  final AuthConfig authConfig;

  AuthService({
    required this.database,
    required this.secureStorage,
    required this.authConfig,
  });

  /// Initialize the authentication service
  Future<void> initialize() async {
    try {
      // TODO: Implement initialization logic
      debugPrint('AuthService initialized');
    } catch (e) {
      debugPrint('Failed to initialize AuthService: $e');
      rethrow;
    }
  }

  /// Sign in with app password
  Future<AuthResult> signInWithAppPassword({
    required String identifier,
    required String password,
    String? pdsHost,
    bool isAdditionalAccount = false,
  }) async {
    try {
      // TODO: Implement actual authentication with AT Protocol
      // For now, return a mock success result
      
      debugPrint('Attempting app password sign in for: $identifier');
      
      // Mock session data
      final sessionData = AppPasswordSessionData(
        accessJwt: 'mock_access_jwt',
        refreshJwt: 'mock_refresh_jwt',
        did: 'did:plc:mock_did_$identifier',
        handle: identifier,
        email: null,
        sessionString: null,
      );

      // Mock user profile
      final profile = UserProfile(
        did: sessionData.did,
        handle: sessionData.handle,
        displayName: identifier,
        description: null,
        avatar: null,
        banner: null,
        email: sessionData.email,
        isVerified: false,
      );

      final authSessionData = AuthSessionData.appPassword(
        appPasswordSession: sessionData,
        profile: profile,
      );

      // Store account in database
      await _storeAccount(sessionData, profile, isAdditionalAccount);

      return AuthResult.success(
        session: authSessionData,
        accountDid: sessionData.did,
      );
    } catch (e) {
      debugPrint('App password sign in failed: $e');
      return AuthResult.failure(
        error: 'Authentication failed: $e',
        errorType: AuthErrorType.invalidCredentials,
      );
    }
  }

  /// Store account information in database
  Future<void> _storeAccount(
    AppPasswordSessionData sessionData,
    UserProfile profile,
    bool isAdditionalAccount,
  ) async {
    try {
      await database.accountDao.upsertAccountByDid(
        AccountsCompanion.insert(
          did: sessionData.did,
          handle: sessionData.handle,
          displayName: Value(profile.displayName),
          description: Value(profile.description),
          avatar: Value(profile.avatar),
          banner: Value(profile.banner),
          email: Value(profile.email),
          accessJwt: Value(sessionData.accessJwt),
          refreshJwt: Value(sessionData.refreshJwt),
          sessionString: Value(sessionData.sessionString),
          pdsUrl: authConfig.defaultPdsHost,
          loginMethod: const Value('app_password'),
          isActive: Value(!isAdditionalAccount), // Set as active if not additional
          lastUsed: Value(DateTime.now()),
        ),
      );
      
      debugPrint('Account stored successfully: ${sessionData.did}');
    } catch (e) {
      debugPrint('Failed to store account: $e');
      rethrow;
    }
  }

  /// Sign out a specific account
  Future<void> signOut(String accountDid) async {
    try {
      // Clear tokens from secure storage
      await secureStorage.delete(key: 'access_token_$accountDid');
      await secureStorage.delete(key: 'refresh_token_$accountDid');
      
      // Update account status in database
      await database.accountDao.clearAccountSession(accountDid);
      
      debugPrint('Signed out account: $accountDid');
    } catch (e) {
      debugPrint('Failed to sign out account: $e');
      rethrow;
    }
  }

  /// Sign out all accounts
  Future<void> signOutAll() async {
    try {
      final accounts = await database.accountDao.getAllAccounts();
      
      for (final account in accounts) {
        await signOut(account.did);
      }
      
      // Clear all secure storage
      await secureStorage.deleteAll();
      
      debugPrint('Signed out all accounts');
    } catch (e) {
      debugPrint('Failed to sign out all accounts: $e');
      rethrow;
    }
  }

  /// Remove an account
  Future<void> removeAccount(String accountDid) async {
    try {
      // Sign out first
      await signOut(accountDid);
      
      // Remove from database
      await database.accountDao.deleteAccount(accountDid);
      
      debugPrint('Removed account: $accountDid');
    } catch (e) {
      debugPrint('Failed to remove account: $e');
      rethrow;
    }
  }

  /// Refresh session for a specific account
  Future<AppPasswordSessionData?> refreshSession(String accountDid) async {
    try {
      final account = await database.accountDao.getAccountByDid(accountDid);
      if (account == null) {
        debugPrint('Account not found for refresh: $accountDid');
        return null;
      }

      if (account.refreshJwt == null) {
        debugPrint('No refresh token available for account: ${account.handle}');
        return null;
      }

      debugPrint('Attempting token refresh for account: ${account.handle}');
      
      // Call AT Protocol refresh session endpoint directly
      final refreshResponse = await atproto.refreshSession(
        refreshJwt: account.refreshJwt!,
      );
      
      if (refreshResponse.data.accessJwt.isEmpty || refreshResponse.data.refreshJwt.isEmpty) {
        debugPrint('Token refresh failed: Invalid response tokens');
        return null;
      }
      
      final newSessionData = AppPasswordSessionData(
        accessJwt: refreshResponse.data.accessJwt,
        refreshJwt: refreshResponse.data.refreshJwt,
        did: account.did,
        handle: account.handle,
        email: account.email,
        sessionString: account.sessionString,
      );

      // Update account in database with new tokens
      await database.accountDao.updateAccountWithAppPasswordSession(
        did: accountDid,
        accessJwt: newSessionData.accessJwt,
        refreshJwt: newSessionData.refreshJwt,
        sessionString: newSessionData.sessionString ?? '',
      );

      debugPrint('Token refresh successful for account: ${account.handle}');
      return newSessionData;
    } catch (e) {
      debugPrint('Failed to refresh session for $accountDid: $e');
      
      // Handle specific refresh token failure cases
      if (e.toString().contains('RefreshTokenExpired') || 
          e.toString().contains('InvalidRefreshToken') ||
          e.toString().contains('TokenRevoked')) {
        debugPrint('Refresh token expired/invalid for $accountDid, clearing session');
        // Clear the account session since refresh token is invalid
        await database.accountDao.clearAccountSession(accountDid);
      }
      
      return null;
    }
  }
}