// Flutter imports:
import 'package:flutter/foundation.dart';

// Package imports:
import 'package:atproto/atproto.dart' as atproto;
import 'package:atproto_core/atproto_core.dart' as atcore;
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
      debugPrint('🔐 Attempting app password sign in for: $identifier');
      debugPrint('   PDS Host: ${pdsHost ?? authConfig.defaultPdsHost}');
      
      // 実際のAT Protocol認証を実行
      final sessionResponse = await atproto.createSession(
        identifier: identifier,
        password: password,
        service: pdsHost ?? authConfig.defaultPdsHost,
      );

      final sessionData = sessionResponse.data;
      debugPrint('✅ Authentication successful for: ${sessionData.handle}');
      debugPrint('   DID: ${sessionData.did}');
      debugPrint('   Email: ${sessionData.email ?? 'N/A'}');

      // セッションデータを作成
      final appPasswordSession = AppPasswordSessionData(
        accessJwt: sessionData.accessJwt,
        refreshJwt: sessionData.refreshJwt,
        did: sessionData.did,
        handle: sessionData.handle,
        email: sessionData.email,
        sessionString: null,
      );

      // ユーザープロフィールを作成
      final profile = UserProfile(
        did: sessionData.did,
        handle: sessionData.handle,
        displayName: sessionData.handle, // 初期値としてhandleを使用
        description: null,
        avatar: null,
        banner: null,
        email: sessionData.email,
        isVerified: false,
      );

      final authSessionData = AuthSessionData.appPassword(
        appPasswordSession: appPasswordSession,
        profile: profile,
      );

      // アカウント情報をデータベースに保存
      await _storeAccount(appPasswordSession, profile, isAdditionalAccount);

      debugPrint('✅ Account stored successfully in database');

      return AuthResult.success(
        session: authSessionData,
        accountDid: appPasswordSession.did,
      );
    } catch (e) {
      debugPrint('❌ App password sign in failed: $e');
      
      // エラータイプを詳細に分析
      final errorType = _detectErrorType(e.toString());
      final errorMessage = _createUserFriendlyErrorMessage(e.toString(), errorType);
      
      debugPrint('   Error type: $errorType');
      debugPrint('   User message: $errorMessage');
      
      return AuthResult.failure(
        error: errorMessage,
        errorDescription: e.toString(),
        errorType: errorType,
      );
    }
  }

  /// エラータイプを自動検出
  AuthErrorType _detectErrorType(String errorMessage) {
    final lowercaseError = errorMessage.toLowerCase();
    
    // トークン検証関連エラー
    if (lowercaseError.contains('token could not be verified') ||
        lowercaseError.contains('invalid token') ||
        lowercaseError.contains('expired token') ||
        lowercaseError.contains('token verification failed')) {
      return AuthErrorType.tokenVerificationFailed;
    }
    
    // 認証情報エラー
    if (lowercaseError.contains('invalid credentials') ||
        lowercaseError.contains('invalid identifier') ||
        lowercaseError.contains('invalid password') ||
        lowercaseError.contains('authentication failed')) {
      return AuthErrorType.invalidCredentials;
    }
    
    // ネットワークエラー
    if (lowercaseError.contains('network') ||
        lowercaseError.contains('connection') ||
        lowercaseError.contains('timeout')) {
      return AuthErrorType.networkError;
    }
    
    // サーバーエラー
    if (lowercaseError.contains('server error') ||
        lowercaseError.contains('internal error')) {
      return AuthErrorType.serverError;
    }
    
    return AuthErrorType.unknownError;
  }

  /// ユーザー向けのエラーメッセージを作成
  String _createUserFriendlyErrorMessage(String originalError, AuthErrorType errorType) {
    switch (errorType) {
      case AuthErrorType.tokenVerificationFailed:
        return 'トークンの検証に失敗しました。再度ログインしてください。';
      case AuthErrorType.invalidCredentials:
        return 'ユーザー名またはアプリパスワードが正しくありません。';
      case AuthErrorType.networkError:
        return 'ネットワークエラーが発生しました。接続を確認してください。';
      case AuthErrorType.serverError:
        return 'サーバーエラーが発生しました。しばらく後に再試行してください。';
      default:
        return '認証に失敗しました。入力内容を確認してください。';
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
      
      // Call AT Protocol refresh session endpoint
      final refreshResponse = await atproto.refreshSession(
        refreshJwt: account.refreshJwt!,
        service: authConfig.defaultPdsHost,
      );
      
      final refreshedSession = refreshResponse.data;
      if (refreshedSession.accessJwt.isEmpty || refreshedSession.refreshJwt.isEmpty) {
        debugPrint('Token refresh failed: Invalid response tokens');
        return null;
      }
      
      final newSessionData = AppPasswordSessionData(
        accessJwt: refreshedSession.accessJwt,
        refreshJwt: refreshedSession.refreshJwt,
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
      final errorString = e.toString();
      if (errorString.contains('RefreshTokenExpired') || 
          errorString.contains('InvalidRefreshToken') ||
          errorString.contains('TokenRevoked') ||
          errorString.contains('Token could not be verified') ||
          errorString.contains('TokenValidationFailed') ||
          errorString.contains('InvalidSignature')) {
        debugPrint('Refresh token expired/invalid/unverifiable for $accountDid, clearing session');
        // Clear the account session since refresh token is invalid or unverifiable
        await database.accountDao.clearAccountSession(accountDid);
      }
      
      return null;
    }
  }

  /// Validate if a session/token is still valid
  /// Returns true if valid, false if invalid
  Future<bool> validateSession(String accountDid) async {
    try {
      final account = await database.accountDao.getAccountByDid(accountDid);
      if (account == null) {
        debugPrint('❌ Account not found for validation: $accountDid');
        return false;
      }

      if (account.accessJwt == null) {
        debugPrint('❌ No access token available for validation: ${account.handle}');
        return false;
      }

      debugPrint('🔐 Validating session for account: ${account.handle}');
      
      // 実際のAT Protocol APIを使用してセッション検証
      try {
        // ATProtoクライアントでセッション検証を実行
        final session = atcore.Session(
          did: account.did,
          handle: account.handle,
          accessJwt: account.accessJwt!,
          refreshJwt: account.refreshJwt ?? '',
        );

        final client = atproto.ATProto.fromSession(session);
        final sessionResponse = await client.server.getSession();
        
        final sessionData = sessionResponse.data;
        debugPrint('✅ Session validation successful for: ${sessionData.handle}');
        debugPrint('   DID: ${sessionData.did}');
        debugPrint('   Active: ${sessionData.active}');
        
        return true;
      } catch (e) {
        final errorMessage = e.toString().toLowerCase();
        
        if (errorMessage.contains('token could not be verified') ||
            errorMessage.contains('invalid token') ||
            errorMessage.contains('expired token')) {
          debugPrint('❌ Token verification failed for ${account.handle}: $e');
          debugPrint('   This indicates the token has expired or is invalid');
          return false;
        }
        
        if (errorMessage.contains('unauthorized') ||
            errorMessage.contains('forbidden')) {
          debugPrint('❌ Authorization failed for ${account.handle}: $e');
          return false;
        }
        
        // その他のエラーの場合、ネットワークエラーの可能性があるため
        // 一時的な問題として有効とみなす（ただしログに記録）
        debugPrint('⚠️ Session validation inconclusive for ${account.handle}: $e');
        debugPrint('   Treating as valid due to potential network issues');
        return true;
      }
    } catch (e) {
      debugPrint('❌ Session validation failed for $accountDid: $e');
      return false;
    }
  }

  /// Clear invalid sessions automatically
  Future<void> clearInvalidSessions() async {
    try {
      final accounts = await database.accountDao.getAllAccounts();
      
      for (final account in accounts) {
        final isValid = await validateSession(account.did);
        if (!isValid && account.accessJwt != null) {
          debugPrint('Clearing invalid session for account: ${account.handle}');
          await database.accountDao.clearAccountSession(account.did);
        }
      }
    } catch (e) {
      debugPrint('Failed to clear invalid sessions: $e');
    }
  }
}