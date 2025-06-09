// Package imports:
import 'package:bluesky/bluesky.dart' as bsky;
import 'package:drift/drift.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// Project imports:
import 'package:moodesky/services/database/database.dart';
import 'package:moodesky/shared/models/auth_models.dart';

class BlueskyService {
  final AppDatabase database;
  final FlutterSecureStorage secureStorage;
  final AuthConfig authConfig;
  
  bsky.Bluesky? _currentClient;
  Account? _currentAccount;

  BlueskyService({
    required this.database,
    required this.secureStorage,
    required this.authConfig,
  });

  // Get current Bluesky client
  bsky.Bluesky? get currentClient => _currentClient;
  
  // Get current account
  Account? get currentAccount => _currentAccount;

  // Initialize client with account session
  Future<bool> _initializeClient(Account account) async {
    try {
      // TODO: Fix Session constructor for BlueSky v0.11.1
      _currentAccount = account;
      return true;
    } catch (e) {
      print('Failed to initialize Bluesky client: $e');
      return false;
    }
  }

  // Get active account
  Future<Account?> getActiveAccount() async {
    final account = await database.accountDao.getActiveAccount();
    if (account != null) {
      await _initializeClient(account);
    }
    return account;
  }

  // Get all accounts
  Future<List<Account>> getAllAccounts() async {
    return database.accountDao.getAllAccounts();
  }

  // Sign in with OAuth
  Future<AuthResult> signInWithOAuth({
    String? userIdentifier,
    String? pdsHost,
  }) async {
    try {
      final service = pdsHost ?? authConfig.defaultPdsHost;
      final serviceUrl = service.startsWith('http') ? service : 'https://$service';

      // For now, implement OAuth using direct login with app password requirements
      // In a real OAuth implementation, we would:
      // 1. Launch authorization URL
      // 2. Handle redirect with authorization code
      // 3. Exchange code for tokens with DPoP
      // 4. Store tokens securely
      
      // For demonstration purposes, show OAuth-style interface but require app password
      return const AuthResult.failure(
        error: 'OAuth requires app password setup',
        errorDescription: 'Please use App Password method to sign in. OAuth with DPoP will be implemented in a future version.',
        errorType: AuthErrorType.unknownError,
      );
    } catch (e) {
      return AuthResult.failure(
        error: 'OAuth sign in failed',
        errorDescription: e.toString(),
        errorType: AuthErrorType.networkError,
      );
    }
  }

  // Sign in with app password
  Future<AuthResult> signInWithAppPassword({
    required String identifier,
    required String password,
    String? pdsHost,
  }) async {
    try {
      final service = pdsHost ?? authConfig.defaultPdsHost;
      final serviceUrl = service.startsWith('http') ? service : 'https://$service';

      print('Attempting to sign in with identifier: $identifier to service: $serviceUrl');

      // For now, simulate a successful login for testing
      // TODO: Replace with actual Bluesky API when the correct API is available
      print('Simulating login for identifier: $identifier');
      
      // Create mock session data for testing
      final mockDid = 'did:plc:${identifier.hashCode.abs()}';
      final mockHandle = identifier.contains('@') ? identifier.split('@')[0] : identifier;
      final mockAccessJwt = 'mock_access_jwt_${DateTime.now().millisecondsSinceEpoch}';
      final mockRefreshJwt = 'mock_refresh_jwt_${DateTime.now().millisecondsSinceEpoch}';

      print('Mock session created successfully. DID: $mockDid');

      // TODO: Get user profile once API methods are fixed
      // final profileResponse = await bsky.Bluesky.fromSession(
      //   session.data,
      //   service: serviceUrl,
      // ).actor.getProfile(actor: session.data.did);
      // final profile = profileResponse.data;

      // Save account to database
      final accountData = AccountsCompanion.insert(
        did: mockDid,
        handle: mockHandle,
        displayName: Value(mockHandle), // Use handle as display name
        description: const Value(null),
        avatar: const Value(null),
        banner: const Value(null),
        email: Value(identifier.contains('@') ? identifier : null),
        accessJwt: Value(mockAccessJwt),
        refreshJwt: Value(mockRefreshJwt),
        sessionString: Value(mockAccessJwt), // Store session string
        pdsUrl: serviceUrl,
        serviceUrl: Value(serviceUrl),
        loginMethod: const Value('app_password'),
        isActive: const Value(true),
        lastUsed: Value(DateTime.now()),
      );

      // Check if account already exists
      final existingAccount = await database.accountDao.getAccountByDid(mockDid);
      
      if (existingAccount != null) {
        // Update existing account
        await database.accountDao.updateAccountWithAppPasswordSession(
          did: mockDid,
          accessJwt: mockAccessJwt,
          refreshJwt: mockRefreshJwt,
          sessionString: mockAccessJwt,
        );
      } else {
        // Create new account
        await database.accountDao.createAccount(accountData);
      }

      // Set as active account
      await database.accountDao.setActiveAccount(mockDid);

      // Initialize client
      final account = await database.accountDao.getAccountByDid(mockDid);
      if (account != null) {
        await _initializeClient(account);
      }

      final userProfile = UserProfile(
        did: mockDid,
        handle: mockHandle,
        displayName: mockHandle, // Use handle as display name for now
        description: null,
        avatar: null,
        banner: null,
        email: identifier.contains('@') ? identifier : null,
        isVerified: false,
      );

      return AuthResult.success(
        session: AuthSessionData.appPassword(
          appPasswordSession: AppPasswordSessionData(
            accessJwt: mockAccessJwt,
            refreshJwt: mockRefreshJwt,
            did: mockDid,
            handle: mockHandle,
            email: identifier.contains('@') ? identifier : null,
            sessionString: mockAccessJwt,
          ),
          profile: userProfile,
        ),
        accountDid: mockDid,
      );
    } catch (e) {
      print('App password sign in failed: $e');
      
      // Provide specific error messages based on error type
      if (e.toString().contains('InvalidRequestError') || 
          e.toString().contains('AuthRequiredError') ||
          e.toString().contains('401')) {
        return AuthResult.failure(
          error: 'Invalid credentials',
          errorDescription: 'Check your handle/email and app password. Make sure you are using an App Password, not your regular password.',
          errorType: AuthErrorType.invalidCredentials,
        );
      } else if (e.toString().contains('NetworkError') || 
                 e.toString().contains('SocketException') ||
                 e.toString().contains('TimeoutException')) {
        return AuthResult.failure(
          error: 'Network error',
          errorDescription: 'Please check your internet connection and try again.',
          errorType: AuthErrorType.networkError,
        );
      } else if (e.toString().contains('Server') || e.toString().contains('500')) {
        return AuthResult.failure(
          error: 'Server error',
          errorDescription: 'The server is temporarily unavailable. Please try again later.',
          errorType: AuthErrorType.serverError,
        );
      } else {
        return AuthResult.failure(
          error: 'Sign in failed',
          errorDescription: 'An unexpected error occurred: ${e.toString()}',
          errorType: AuthErrorType.unknownError,
        );
      }
    }
  }

  // Switch account
  Future<void> switchAccount(String targetAccountDid) async {
    final account = await database.accountDao.getAccountByDid(targetAccountDid);
    if (account == null) {
      throw Exception('Account not found: $targetAccountDid');
    }

    await database.accountDao.setActiveAccount(targetAccountDid);
    await _initializeClient(account);
  }

  // Sign out current account
  Future<void> signOut() async {
    if (_currentAccount != null) {
      await database.accountDao.clearAccountSession(_currentAccount!.did);
      _currentClient = null;
      _currentAccount = null;
    }
  }

  // Sign out all accounts
  Future<void> signOutAll() async {
    final accounts = await database.accountDao.getAllAccounts();
    for (final account in accounts) {
      await database.accountDao.clearAccountSession(account.did);
    }
    _currentClient = null;
    _currentAccount = null;
  }

  // Remove account
  Future<void> removeAccount(String accountDid) async {
    if (_currentAccount?.did == accountDid) {
      _currentClient = null;
      _currentAccount = null;
    }
    await database.accountDao.deleteAccount(accountDid);
  }

  // Validate and refresh session
  Future<bool> validateAndRefreshSession(String accountDid) async {
    final account = await database.accountDao.getAccountByDid(accountDid);
    if (account == null) return false;

    try {
      if (account.loginMethod == 'oauth') {
        // OAuth token refresh logic
        // TODO: Implement OAuth token refresh when needed
        return (account.accessJwt != null && account.refreshJwt != null);
      } else {
        // App password session validation
        if (account.accessJwt == null || account.refreshJwt == null) {
          return false;
        }

        // TODO: Initialize client once API is fixed
        // final session = bsky.Session(
        //   accessJwt: account.accessJwt!,
        //   refreshJwt: account.refreshJwt!,
        //   did: account.did,
        //   handle: account.handle,
        // );
        // final client = bsky.Bluesky.fromSession(session, service: account.serviceUrl);
        // await client.actor.getProfile(actor: account.did);
        
        return true;
      }
    } catch (e) {
      print('Session validation failed: $e');
      return false;
    }
  }

  // TODO: Implement API methods once BlueSky package is working correctly
  
  // Get timeline posts
  // Future<List<bsky.FeedView>> getTimeline({
  //   String? cursor,
  //   int limit = 50,
  // }) async {
  //   if (_currentClient == null) {
  //     throw Exception('No active session');
  //   }
  //   try {
  //     final response = await _currentClient!.feed.getTimeline(
  //       cursor: cursor,
  //       limit: limit,
  //     );
  //     return response.data.feed;
  //   } catch (e) {
  //     print('Failed to get timeline: $e');
  //     rethrow;
  //   }
  // }

  // Simple logout
  Future<void> logout() async {
    final activeAccount = await getActiveAccount();
    if (activeAccount != null) {
      await database.accountDao.clearAccountSession(activeAccount.did);
    }
    _currentClient = null;
    _currentAccount = null;
  }

  // Check if user is authenticated
  Future<bool> isAuthenticated() async {
    final activeAccount = await getActiveAccount();
    return activeAccount?.accessJwt != null;
  }
}
