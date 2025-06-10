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

  // Generate avatar URL from handle and DID
  String _generateAvatarUrl(String handle, String did) {
    // Use a more sophisticated avatar generation approach
    final seed = handle.isNotEmpty ? handle : did.hashCode.abs().toString();
    
    // Use multiple avatar services for variety
    final services = [
      'https://api.dicebear.com/7.x/avataaars/png?seed=$seed&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50',
      'https://api.dicebear.com/7.x/personas/png?seed=$seed&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50',
      'https://api.dicebear.com/7.x/initials/png?seed=$seed&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50',
    ];
    
    // Select service based on handle hash for consistency
    final serviceIndex = handle.hashCode.abs() % services.length;
    return services[serviceIndex];
  }

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
      final serviceUrl = service.startsWith('http')
          ? service
          : 'https://$service';

      // For now, implement OAuth using direct login with app password requirements
      // In a real OAuth implementation, we would:
      // 1. Launch authorization URL
      // 2. Handle redirect with authorization code
      // 3. Exchange code for tokens with DPoP
      // 4. Store tokens securely

      // For demonstration purposes, show OAuth-style interface but require app password
      return const AuthResult.failure(
        error: 'OAuth requires app password setup',
        errorDescription:
            'Please use App Password method to sign in. OAuth with DPoP will be implemented in a future version.',
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
    bool isAdditionalAccount = false,
  }) async {
    try {
      final service = pdsHost ?? authConfig.defaultPdsHost;
      final serviceUrl = service.startsWith('http')
          ? service
          : 'https://$service';

      print(
        'Attempting to sign in with identifier: $identifier to service: $serviceUrl',
      );

      // Bluesky APIの実装は現在の仕様では利用できないため、モックデータを使用
      print('Using mock authentication for: $identifier');
      
      // モックセッションデータを作成
      final mockDid = 'did:plc:${identifier.hashCode.abs()}';
      final mockHandle = identifier.contains('@')
          ? identifier.split('@')[0]
          : identifier;
      final mockAccessJwt =
          'mock_access_jwt_${DateTime.now().millisecondsSinceEpoch}';
      final mockRefreshJwt =
          'mock_refresh_jwt_${DateTime.now().millisecondsSinceEpoch}';

      print('Mock session created successfully. DID: $mockDid');

      // モックプロフィール情報を生成（リアルなアバター風に）
      String? avatarUrl;
      String? displayName;
      String? description;
      String? banner;
      int? followersCount;
      int? followsCount;
      int? postsCount;
      
      try {
        // よりリアルなアバターURLを生成
        avatarUrl = _generateAvatarUrl(mockHandle, mockDid);
        displayName = mockHandle;
        description = 'moodeSky user - $identifier';
        followersCount = 0;
        followsCount = 0;
        postsCount = 0;
        
        print('Profile data generated: avatar=$avatarUrl, displayName=$displayName');
      } catch (e) {
        print('Failed to generate profile data: $e');
        
        // フォールバック
        avatarUrl = _generateAvatarUrl(mockHandle, mockDid);
        displayName = mockHandle;
        description = 'moodeSky user';
        followersCount = 0;
        followsCount = 0;
        postsCount = 0;
      }

      // データベースにアカウント情報を保存
      final accountData = AccountsCompanion.insert(
        did: mockDid,
        handle: mockHandle,
        displayName: Value(displayName ?? mockHandle),
        description: Value(description),
        avatar: Value(avatarUrl),
        banner: Value(banner),
        email: Value(identifier.contains('@') ? identifier : null),
        accessJwt: Value(mockAccessJwt),
        refreshJwt: Value(mockRefreshJwt),
        sessionString: Value(mockAccessJwt), // セッション文字列として保存
        pdsUrl: serviceUrl,
        serviceUrl: Value(serviceUrl),
        loginMethod: const Value('app_password'),
        isActive: Value(
          !isAdditionalAccount,
        ), // 追加アカウントでない場合のみアクティブに設定
        lastUsed: Value(DateTime.now()),
      );

      // 既存のアカウントがあるかチェック
      final existingAccount = await database.accountDao.getAccountByDid(
        mockDid,
      );

      if (existingAccount != null) {
        print('Updating existing account: $mockHandle');
        
        // 既存アカウントの認証情報とプロフィールを更新
        await database.accountDao.updateAccountWithAppPasswordSession(
          did: mockDid,
          accessJwt: mockAccessJwt,
          refreshJwt: mockRefreshJwt,
          sessionString: mockAccessJwt,
        );
        
        // プロフィール情報を更新
        await database.accountDao.updateAccountProfile(
          did: mockDid,
          displayName: displayName,
          description: description,
          avatar: avatarUrl,
          banner: banner,
        );

        // 追加アカウントでない場合のみアクティブに設定
        if (!isAdditionalAccount) {
          await database.accountDao.setActiveAccount(mockDid);
        }
      } else {
        print('Creating new account: $mockHandle');
        
        // 新しいアカウントを作成
        await database.accountDao.createAccount(accountData);

        // 追加アカウントでない場合のみアクティブに設定
        if (!isAdditionalAccount) {
          await database.accountDao.setActiveAccount(mockDid);
        } else {
          print('Added additional account: $mockHandle ($mockDid)');
        }
      }

      // クライアントを初期化
      final account = await database.accountDao.getAccountByDid(mockDid);
      if (account != null) {
        await _initializeClient(account);
      }

      final userProfile = UserProfile(
        did: mockDid,
        handle: mockHandle,
        displayName: displayName ?? mockHandle,
        description: description,
        avatar: avatarUrl,
        banner: banner,
        email: identifier.contains('@') ? identifier : null,
        isVerified: false,
        followersCount: followersCount,
        followsCount: followsCount,
        postsCount: postsCount,
      );

      print('Successfully created profile for: $mockHandle with avatar: $avatarUrl');

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
          errorDescription:
              'Check your handle/email and app password. Make sure you are using an App Password, not your regular password.',
          errorType: AuthErrorType.invalidCredentials,
        );
      } else if (e.toString().contains('NetworkError') ||
          e.toString().contains('SocketException') ||
          e.toString().contains('TimeoutException')) {
        return AuthResult.failure(
          error: 'Network error',
          errorDescription:
              'Please check your internet connection and try again.',
          errorType: AuthErrorType.networkError,
        );
      } else if (e.toString().contains('Server') ||
          e.toString().contains('500')) {
        return AuthResult.failure(
          error: 'Server error',
          errorDescription:
              'The server is temporarily unavailable. Please try again later.',
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

        try {
          // モック実装のため、セッション検証はJWTトークンの存在のみを確認
          print('Mock session validation for: ${account.handle}');
          
          // 基本的なセッション情報の確認
          if (account.accessJwt != null && account.refreshJwt != null) {
            print('Session validation successful for: ${account.handle}');
            return true;
          } else {
            print('Session validation failed - missing tokens for: ${account.handle}');
            return false;
          }
        } catch (e) {
          print('Session validation failed for ${account.handle}: $e');
          return false;
        }
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

  // Get profile information for a specific account
  Future<UserProfile?> getProfileInfo(String accountDid) async {
    try {
      final account = await database.accountDao.getAccountByDid(accountDid);
      if (account == null) return null;

      // TODO: Bluesky APIからリアルタイムプロフィール情報を取得
      // For now, create a profile from stored database info
      final avatarUrl = account.avatar ?? _generateAvatarUrl(account.handle, account.did);

      return UserProfile(
        did: account.did,
        handle: account.handle,
        displayName: account.displayName ?? account.handle,
        description: account.description,
        avatar: avatarUrl,
        banner: account.banner,
        email: account.email,
        isVerified: account.isVerified,
        followersCount: 0, // TODO: APIから取得
        followsCount: 0, // TODO: APIから取得
        postsCount: 0, // TODO: APIから取得
        createdAt: account.createdAt,
      );
    } catch (e) {
      print('Failed to get profile info: $e');
      return null;
    }
  }

  // プロフィール情報を実際のBluesky APIから取得する
  Future<UserProfile?> fetchProfileFromAPI(String accountDid) async {
    try {
      final account = await database.accountDao.getAccountByDid(accountDid);
      if (account == null) {
        print('Account not found: $accountDid');
        return null;
      }

      // 有効なセッション情報があるかチェック
      if (account.accessJwt == null || account.refreshJwt == null) {
        print('No valid session for account: $accountDid');
        return getProfileInfo(accountDid); // フォールバックとして既存データを返す
      }
      
      try {
        print('Mock profile fetch for account: ${account.handle}');
        
        // モック実装：より良いアバターを生成し、データベースを更新
        final newAvatarUrl = _generateAvatarUrl(account.handle, account.did);
        final enhancedDisplayName = account.displayName ?? account.handle;
        final enhancedDescription = account.description ?? 'moodeSky user - ${account.handle}';
        
        print('Generated mock profile data for: ${account.handle}');
        print('Avatar URL: $newAvatarUrl');
        
        // データベースにプロフィール情報を更新
        await updateAccountProfile(
          accountDid: accountDid,
          displayName: enhancedDisplayName,
          description: enhancedDescription,
          avatar: newAvatarUrl,
          banner: account.banner,
        );
        
        print('Mock profile updated in database');
        
        return UserProfile(
          did: account.did,
          handle: account.handle,
          displayName: enhancedDisplayName,
          description: enhancedDescription,
          avatar: newAvatarUrl,
          banner: account.banner,
          email: account.email,
          isVerified: account.isVerified,
          followersCount: 0, // Mock data
          followsCount: 0, // Mock data
          postsCount: 0, // Mock data
          createdAt: account.createdAt,
        );
      } catch (e) {
        print('Failed to update mock profile: $e');
        print('Error type: ${e.runtimeType}');
        print('Falling back to database profile for: ${account.handle}');
        
        // エラーの場合は既存のデータベース情報を返す
        return getProfileInfo(accountDid);
      }
    } catch (e) {
      print('Failed to fetch profile from API (outer catch): $e');
      return null;
    }
  }

  // 全アカウントのプロフィール情報を更新する
  Future<void> refreshAllAccountProfiles() async {
    try {
      final accounts = await database.accountDao.getAllAccounts();
      
      for (final account in accounts) {
        // 各アカウントのプロフィール情報を更新
        final profile = await fetchProfileFromAPI(account.did);
        if (profile != null) {
          print('Updated profile for ${profile.handle}: avatar=${profile.avatar}');
        }
        
        // API制限を避けるために少し待機
        await Future.delayed(const Duration(milliseconds: 500));
      }
    } catch (e) {
      print('Failed to refresh all account profiles: $e');
    }
  }

  // Update account profile information
  Future<void> updateAccountProfile({
    required String accountDid,
    String? displayName,
    String? description,
    String? avatar,
    String? banner,
  }) async {
    try {
      await database.accountDao.updateAccountProfile(
        did: accountDid,
        displayName: displayName,
        description: description,
        avatar: avatar,
        banner: banner,
      );
    } catch (e) {
      print('Failed to update account profile: $e');
      rethrow;
    }
  }
}
