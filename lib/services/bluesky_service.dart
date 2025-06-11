// Dart imports:
import 'dart:convert';

// Package imports:
import 'package:bluesky/bluesky.dart' as bsky;
import 'package:atproto/atproto.dart' as atp;
import 'package:atproto_core/atproto_core.dart' as atcore;
import 'package:bluesky_text/bluesky_text.dart';
import 'package:drift/drift.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// Project imports:
import 'package:moodesky/services/database/database.dart';
import 'package:moodesky/shared/models/auth_models.dart';
import 'package:moodesky/shared/models/preferences_models.dart';

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
      // 認証情報が有効かチェック
      if (account.accessJwt == null || account.refreshJwt == null) {
        print('No valid session tokens for account: ${account.handle}');
        return false;
      }

      // 実際のBluesky クライアントを初期化
      try {
        // createSessionで初期化する代わりに、既存のトークンでクライアントを作成
        _currentClient = bsky.Bluesky.fromSession(
          atcore.Session(
            did: account.did,
            handle: account.handle,
            accessJwt: account.accessJwt!,
            refreshJwt: account.refreshJwt!,
          ),
        );
        _currentAccount = account;

        print('Real Bluesky client initialized for: ${account.handle}');
        return true;
      } catch (e) {
        print('Failed to initialize real Bluesky client: $e');
        print('Error details: ${e.toString()}');
        _currentClient = null;
        return false;
      }
    } catch (e) {
      print('Client initialization error: $e');
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

      // 実際のBluesky APIで認証を実行
      print('Using real Bluesky authentication for: $identifier');

      try {
        // 実際のBluesky認証セッションを作成
        // serviceUrlからホスト名を抽出
        final uri = Uri.parse(serviceUrl);
        final host = uri.host.isNotEmpty ? uri.host : service;

        final sessionResponse = await atp.createSession(
          identifier: identifier,
          password: password,
          service: host, // ホスト名のみを渡す
        );

        final session = sessionResponse.data;
        print('Real session created successfully. DID: ${session.did}');

        // プロフィール情報を取得
        final client = bsky.Bluesky.fromSession(session);
        final profileResponse = await client.actor.getProfile(
          actor: session.did,
        );

        final profile = profileResponse.data;
        print(
          'Profile fetched: ${profile.displayName}, avatar: ${profile.avatar}',
        );

        // 実際のプロフィール情報を使用
        final avatarUrl = profile.avatar;
        final displayName = profile.displayName ?? session.handle;
        final description = profile.description;
        final banner = profile.banner;
        final followersCount = profile.followersCount ?? 0;
        final followsCount = profile.followsCount ?? 0;
        final postsCount = profile.postsCount ?? 0;

        print('Real profile data: avatar=$avatarUrl, displayName=$displayName');

        // SessionからJWT文字列を取得してデータベースに保存
        final accessJwtString = session.accessJwt;
        final refreshJwtString = session.refreshJwt;

        // データベースにアカウント情報を保存
        final accountData = AccountsCompanion.insert(
          did: session.did,
          handle: session.handle,
          displayName: Value(displayName),
          description: Value(description),
          avatar: Value(avatarUrl),
          banner: Value(banner),
          email: Value(identifier.contains('@') ? identifier : null),
          accessJwt: Value(accessJwtString),
          refreshJwt: Value(refreshJwtString),
          sessionString: Value(accessJwtString),
          pdsUrl: serviceUrl,
          serviceUrl: Value(serviceUrl),
          loginMethod: const Value('app_password'),
          isActive: Value(!isAdditionalAccount),
          lastUsed: Value(DateTime.now()),
        );

        // DIDで既存のアカウントがあるかチェック
        final existingAccount = await database.accountDao.getAccountByDid(
          session.did,
        );

        if (existingAccount != null) {
          print(
            'Updating existing account: ${session.handle} (${session.did})',
          );

          // 既存アカウントの認証情報とプロフィールを更新
          await database.accountDao.updateAccountWithAppPasswordSession(
            did: session.did,
            accessJwt: session.accessJwt,
            refreshJwt: session.refreshJwt,
            sessionString: session.accessJwt,
          );

          // プロフィール情報を更新
          await database.accountDao.updateAccountProfile(
            did: session.did,
            displayName: displayName,
            description: description,
            avatar: avatarUrl,
            banner: banner,
          );

          // 追加アカウントでない場合のみアクティブに設定
          if (!isAdditionalAccount) {
            await database.accountDao.setActiveAccount(session.did);
          }
        } else {
          print('Creating new account: ${session.handle} (${session.did})');

          try {
            // 新しいアカウントを作成
            await database.accountDao.createAccount(accountData);
          } catch (e) {
            // UNIQUE制約エラーの場合、handleが重複している可能性がある
            if (e.toString().contains(
              'UNIQUE constraint failed: accounts.handle',
            )) {
              print(
                'Handle ${session.handle} already exists, removing old account',
              );

              // 同じhandleの既存アカウントを削除
              final existingByHandle = await database.accountDao
                  .getAccountByHandle(session.handle);
              if (existingByHandle != null) {
                await database.accountDao.deleteAccount(existingByHandle.did);
              }

              // 再度新しいアカウントを作成
              await database.accountDao.createAccount(accountData);
            } else {
              rethrow;
            }
          }

          // 追加アカウントでない場合のみアクティブに設定
          if (!isAdditionalAccount) {
            await database.accountDao.setActiveAccount(session.did);
          } else {
            print(
              'Added additional account: ${session.handle} (${session.did})',
            );
          }
        }

        // クライアントを初期化
        final account = await database.accountDao.getAccountByDid(session.did);
        if (account != null) {
          await _initializeClient(account);
        }

        final userProfile = UserProfile(
          did: session.did,
          handle: session.handle,
          displayName: displayName ?? session.handle,
          description: description,
          avatar: avatarUrl,
          banner: banner,
          email: identifier.contains('@') ? identifier : null,
          isVerified: false,
          followersCount: followersCount,
          followsCount: followsCount,
          postsCount: postsCount,
        );

        print(
          'Successfully created profile for: ${session.handle} with avatar: $avatarUrl',
        );

        return AuthResult.success(
          session: AuthSessionData.appPassword(
            appPasswordSession: AppPasswordSessionData(
              accessJwt: session.accessJwt,
              refreshJwt: session.refreshJwt,
              did: session.did,
              handle: session.handle,
              email: identifier.contains('@') ? identifier : null,
              sessionString: session.accessJwt,
            ),
            profile: userProfile,
          ),
          accountDid: session.did,
        );
      } catch (sessionError) {
        // 実際の認証に失敗した場合のエラーハンドリング
        print('Real Bluesky authentication failed: $sessionError');
        throw sessionError;
      }
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

  // アクセストークンの期限をチェック（JWT文字列から）
  bool _isAccessTokenExpired(String? accessJwtString) {
    if (accessJwtString == null || accessJwtString.isEmpty) return true;

    // モックトークンの場合は常に有効とする
    if (accessJwtString.startsWith('mock_') || accessJwtString == 'test_jwt') {
      return false;
    }

    try {
      // atcore.decodeJwtを試行
      final jwt = atcore.decodeJwt(accessJwtString);
      return jwt.isExpired;
    } catch (e) {
      // atcore.decodeJwtが失敗した場合、手動でJWTをデコード
      try {
        return _manualJwtExpirationCheck(accessJwtString);
      } catch (manualError) {
        print(
          'Failed to decode access token: $e, manual check also failed: $manualError',
        );
        return true; // パースに失敗した場合は期限切れとして扱う
      }
    }
  }

  // リフレッシュトークンの期限をチェック（JWT文字列から）
  bool _isRefreshTokenExpired(String? refreshJwtString) {
    if (refreshJwtString == null || refreshJwtString.isEmpty) return true;

    // モックトークンの場合は常に有効とする
    if (refreshJwtString.startsWith('mock_') ||
        refreshJwtString == 'test_refresh') {
      return false;
    }

    try {
      // atcore.decodeJwtを試行
      final jwt = atcore.decodeJwt(refreshJwtString);
      return jwt.isExpired;
    } catch (e) {
      // atcore.decodeJwtが失敗した場合、手動でJWTをデコード
      try {
        return _manualJwtExpirationCheck(refreshJwtString);
      } catch (manualError) {
        print(
          'Failed to decode refresh token: $e, manual check also failed: $manualError',
        );
        return true; // パースに失敗した場合は期限切れとして扱う
      }
    }
  }

  // 手動でJWTの期限をチェックするヘルパーメソッド
  bool _manualJwtExpirationCheck(String jwtString) {
    final parts = jwtString.split('.');
    if (parts.length != 3) {
      throw const FormatException('Invalid JWT format: does not have 3 parts');
    }

    // JWTペイロード部分（2番目の部分）をデコード
    final payload = parts[1];
    // Base64パディングを調整
    String normalizedPayload = payload;
    while (normalizedPayload.length % 4 != 0) {
      normalizedPayload += '=';
    }

    // Base64デコードを試行
    final decodedBytes = base64.decode(normalizedPayload);
    final payloadJson = utf8.decode(decodedBytes);
    final payloadMap = json.decode(payloadJson) as Map<String, dynamic>;

    // 期限（exp）フィールドをチェック
    if (payloadMap.containsKey('exp')) {
      final exp = payloadMap['exp'] as int;
      final expirationTime = DateTime.fromMillisecondsSinceEpoch(exp * 1000);
      return DateTime.now().isAfter(expirationTime);
    } else {
      // expフィールドがない場合は期限切れとして扱う
      return true;
    }
  }

  // リフレッシュトークンを使用してアクセストークンを更新
  Future<bool> refreshSession(String accountDid) async {
    try {
      final account = await database.accountDao.getAccountByDid(accountDid);
      if (account == null || account.refreshJwt == null) {
        print('No account or refresh token found for: $accountDid');
        return false;
      }

      // リフレッシュトークンの期限チェック
      if (_isRefreshTokenExpired(account.refreshJwt)) {
        print('Refresh token is expired for: ${account.handle}');
        return false;
      }

      print('Refreshing session for: ${account.handle}');
      print('Current refresh token: ${account.refreshJwt?.substring(0, 20)}...');

      // リフレッシュトークンを使用してセッションを更新
      // refreshSession は文字列のrefreshTokenを受け取り、新しいSessionを返す
      final refreshResponse = await atp.refreshSession(
        refreshJwt: account.refreshJwt!,
      );

      final newSession = refreshResponse.data;
      print('Session refreshed successfully for: ${account.handle}');

      // Sessionオブジェクトからアクセストークンとリフレッシュトークンの文字列を取得
      final newAccessJwtString = newSession.accessJwt;
      final newRefreshJwtString = newSession.refreshJwt;
      
      print('New access token: ${newAccessJwtString.substring(0, 20)}...');
      print('New refresh token: ${newRefreshJwtString.substring(0, 20)}...');

      // データベースの認証情報を更新（JWT文字列として保存）
      await database.accountDao.updateAccountWithAppPasswordSession(
        did: accountDid,
        accessJwt: newAccessJwtString,
        refreshJwt: newRefreshJwtString,
        sessionString: newAccessJwtString,
      );

      // 現在のクライアントを再初期化
      if (_currentAccount?.did == accountDid) {
        final updatedAccount = await database.accountDao.getAccountByDid(
          accountDid,
        );
        if (updatedAccount != null) {
          await _initializeClient(updatedAccount);
        }
      }

      print('Session tokens updated in database for: ${account.handle}');
      return true;
    } catch (e) {
      print('Failed to refresh session for $accountDid: $e');
      return false;
    }
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
        // App password session validation and refresh
        if (account.accessJwt == null || account.refreshJwt == null) {
          return false;
        }

        try {
          // トークンの存在と期限をチェック
          if (account.accessJwt != null && account.refreshJwt != null) {
            // アクセストークンの期限をチェック
            if (_isAccessTokenExpired(account.accessJwt)) {
              print(
                'Access token expired for ${account.handle}, checking refresh token...',
              );

              // リフレッシュトークンの期限もチェック
              if (_isRefreshTokenExpired(account.refreshJwt)) {
                print(
                  'Both tokens expired for ${account.handle}, session invalid',
                );
                return false;
              }

              // リフレッシュトークンが有効な場合、セッションは有効（必要時にリフレッシュ可能）
              print(
                'Access token expired but refresh token valid for: ${account.handle}',
              );
              return true;
            }

            print('Session tokens valid for: ${account.handle}');
            return true;
          } else {
            print(
              'Session validation failed - missing tokens for: ${account.handle}',
            );
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

  // タイムラインを取得（リトライ機能付き）
  Future<List<dynamic>> getTimeline({String? cursor, int limit = 50}) async {
    if (_currentClient == null || _currentAccount == null) {
      throw Exception('No active session');
    }

    try {
      final response = await _callAPIWithRetry(() async {
        return await _currentClient!.feed.getTimeline(
          cursor: cursor,
          limit: limit,
        );
      }, _currentAccount!.did);

      return response.data.feed;
    } catch (e) {
      print('Failed to get timeline: $e');
      rethrow;
    }
  }

  // 通知を取得（リトライ機能付き）
  Future<List<dynamic>> getNotifications({
    String? cursor,
    int limit = 50,
  }) async {
    if (_currentClient == null || _currentAccount == null) {
      throw Exception('No active session');
    }

    try {
      final response = await _callAPIWithRetry(() async {
        return await _currentClient!.notification.listNotifications(
          cursor: cursor,
          limit: limit,
        );
      }, _currentAccount!.did);

      return response.data.notifications;
    } catch (e) {
      print('Failed to get notifications: $e');
      rethrow;
    }
  }

  // 投稿を作成（リトライ機能付き）
  Future<bool> createPost({
    required String text,
    List<String>? images,
    String? replyTo,
  }) async {
    if (_currentClient == null || _currentAccount == null) {
      throw Exception('No active session');
    }

    try {
      await _callAPIWithRetry(() async {
        return await _currentClient!.feed.post(text: text);
      }, _currentAccount!.did);

      print('Post created successfully');
      return true;
    } catch (e) {
      print('Failed to create post: $e');
      return false;
    }
  }

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
      final avatarUrl =
          account.avatar ?? _generateAvatarUrl(account.handle, account.did);

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

  // API呼び出し前にトークンの期限をチェックし、必要に応じてリフレッシュ
  Future<bool> _ensureValidToken(String accountDid) async {
    final account = await database.accountDao.getAccountByDid(accountDid);
    if (account == null) return false;

    // アクセストークンの期限チェック
    if (_isAccessTokenExpired(account.accessJwt)) {
      print('Access token expired, refreshing for: ${account.handle}');
      return await refreshSession(accountDid);
    }

    return true; // トークンは有効
  }

  // API呼び出しでのリトライ機能付きヘルパー（効率的なトークン管理）
  Future<T> _callAPIWithRetry<T>(
    Future<T> Function() apiCall,
    String accountDid,
  ) async {
    // 事前にトークンの期限をチェックして、期限切れの場合は先にリフレッシュ
    final tokenValid = await _ensureValidToken(accountDid);
    if (!tokenValid) {
      throw Exception('Failed to ensure valid token for API call');
    }

    try {
      // アクセストークンが有効な状態でAPI呼び出しを実行
      return await apiCall();
    } catch (e) {
      // 認証エラーの場合のみ、追加でリフレッシュを試行（稀なケース）
      if (e.toString().contains('Token could not be verified') ||
          e.toString().contains('401') ||
          e.toString().contains('InvalidRequestException')) {
        print(
          'API call failed with auth error despite valid token, attempting refresh...',
        );

        final refreshed = await refreshSession(accountDid);
        if (refreshed) {
          print('Session refreshed, retrying API call...');
          return await apiCall();
        } else {
          print('Failed to refresh session, API call failed');
          rethrow;
        }
      }
      // 認証エラー以外の場合はそのまま例外を投げる
      rethrow;
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
        // アカウントのクライアントを初期化または使用
        bsky.Bluesky? clientToUse = _currentClient;

        // 現在のクライアントがない、または別のアカウントの場合、一時的にクライアントを作成
        if (_currentClient == null || _currentAccount?.did != accountDid) {
          print(
            'Creating temporary client for profile fetch: ${account.handle}',
          );

          try {
            // 一時的なクライアントを作成
            clientToUse = bsky.Bluesky.fromSession(
              atcore.Session(
                did: account.did,
                handle: account.handle,
                accessJwt: account.accessJwt!,
                refreshJwt: account.refreshJwt!,
              ),
            );
          } catch (e) {
            print('Failed to create temporary client: $e');
            clientToUse = null;
          }
        }

        // 実際のBluesky APIクライアントが利用可能な場合の実装
        if (clientToUse != null) {
          print('Fetching profile from Bluesky API for: ${account.handle}');

          try {
            // すべてのAPI呼び出しでリトライ機能を使用
            final response = await _callAPIWithRetry(() async {
              // 最新のアカウント情報を取得してクライアントを再作成
              final latestAccount = await database.accountDao.getAccountByDid(accountDid);
              if (latestAccount?.accessJwt == null) {
                throw Exception('No valid access token after refresh for profile fetch');
              }

              final freshClient = bsky.Bluesky.fromSession(
                atcore.Session(
                  did: latestAccount!.did,
                  handle: latestAccount.handle,
                  accessJwt: latestAccount.accessJwt!,
                  refreshJwt: latestAccount.refreshJwt!,
                ),
              );

              return await freshClient.actor.getProfile(
                actor: latestAccount.did, // didまたはhandleを指定
              );
            }, accountDid);

            if (response.data != null) {
              final profile = response.data!;
              print('Successfully fetched profile from API: ${profile.handle}');
              print('API Avatar URL: ${profile.avatar}');

              // APIから取得したプロフィール情報でデータベースを更新
              await updateAccountProfile(
                accountDid: accountDid,
                displayName: profile.displayName,
                description: profile.description,
                avatar: profile.avatar,
                banner: profile.banner,
              );

              return UserProfile(
                did: profile.did,
                handle: profile.handle,
                displayName: profile.displayName ?? profile.handle,
                description: profile.description,
                avatar: profile.avatar,
                banner: profile.banner,
                email: account.email,
                isVerified: false, // TODO: APIから取得
                followersCount: profile.followersCount,
                followsCount: profile.followsCount,
                postsCount: profile.postsCount,
                createdAt: profile.createdAt ?? account.createdAt,
              );
            }
          } catch (apiError) {
            print('API call failed for profile fetch: $apiError');
            // APIエラーの場合、モック実装にフォールバック
          }
        }

        // フォールバック：モック実装
        print('Using mock profile fetch for account: ${account.handle}');

        // モック実装：より良いアバターを生成し、データベースを更新
        final newAvatarUrl = _generateAvatarUrl(account.handle, account.did);
        final enhancedDisplayName = account.displayName ?? account.handle;
        final enhancedDescription =
            account.description ?? 'moodeSky user - ${account.handle}';

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
        print('Failed to fetch profile from API: $e');
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

  // 全アカウントのプロフィール情報を更新する（強制更新）
  Future<void> refreshAllAccountProfiles() async {
    try {
      final accounts = await database.accountDao.getAllAccounts();

      for (final account in accounts) {
        // 各アカウントのプロフィール情報を更新
        final profile = await fetchProfileFromAPI(account.did);
        if (profile != null) {
          print(
            'Updated profile for ${profile.handle}: avatar=${profile.avatar}',
          );
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

  // アバター情報が未取得または古いかどうかを判定
  Future<bool> shouldRefreshProfile(String accountDid) async {
    try {
      final account = await database.accountDao.getAccountByDid(accountDid);
      if (account == null) return false;

      // アバター情報が設定されていない場合は取得が必要
      if (account.avatar == null || account.avatar!.isEmpty) {
        return true;
      }

      // 生成アバター（dicebear）の場合は実際のプロフィールが存在する可能性があるため更新
      if (account.avatar!.contains('dicebear.com')) {
        return true;
      }

      // 最終更新から一定時間（24時間）経過している場合は更新
      if (account.lastUsed != null) {
        final lastUpdate = account.lastUsed!;
        final hoursSinceUpdate = DateTime.now().difference(lastUpdate).inHours;
        if (hoursSinceUpdate > 24) {
          return true;
        }
      }

      return false;
    } catch (e) {
      print('Failed to check if profile refresh is needed: $e');
      return false;
    }
  }

  // 必要なアカウントのみプロフィール情報を更新
  Future<void> refreshProfilesIfNeeded() async {
    try {
      final accounts = await database.accountDao.getAllAccounts();

      for (final account in accounts) {
        final shouldRefresh = await shouldRefreshProfile(account.did);
        if (shouldRefresh) {
          print(
            'Refreshing profile for ${account.handle} (avatar missing or outdated)',
          );
          await fetchProfileFromAPI(account.did);

          // API制限を避けるために少し待機
          await Future.delayed(const Duration(milliseconds: 300));
        } else {
          print(
            'Profile for ${account.handle} is up to date, skipping refresh',
          );
        }
      }
    } catch (e) {
      print('Failed to refresh profiles if needed: $e');
    }
  }

  /// Get timeline for a specific account (returns original Bluesky API structure)
  Future<({List<bsky.FeedView> feed, String? cursor})> getTimelineFeed({
    required String accountDid,
    String? cursor,
    int limit = 50,
  }) async {
    try {
      // Get account and validate
      final account = await database.accountDao.getAccountByDid(accountDid);
      if (account == null) {
        throw Exception('Account not found: $accountDid');
      }

      if (account.accessJwt == null) {
        throw Exception('No access token for account: ${account.handle}');
      }

      print(
        'BlueskyService: Fetching timeline for ${account.handle} (limit: $limit, cursor: $cursor)',
      );

      // Use retry mechanism with token refresh for API call
      final response = await _callAPIWithRetry(() async {
        // Get the latest account data (in case tokens were refreshed)
        final latestAccount = await database.accountDao.getAccountByDid(accountDid);
        if (latestAccount?.accessJwt == null) {
          throw Exception('No valid access token after refresh');
        }

        // Create fresh client with latest tokens
        final session = atcore.Session(
          did: latestAccount!.did,
          handle: latestAccount.handle,
          accessJwt: latestAccount.accessJwt!,
          refreshJwt: latestAccount.refreshJwt ?? '',
        );

        final client = bsky.Bluesky.fromSession(session);

        // Make the API call
        return await client.feed.getTimeline(
          limit: limit,
          cursor: cursor,
        );
      }, accountDid);

      print(
        'BlueskyService: Timeline API response received: ${response.data.feed.length} posts',
      );

      // Return both feed data and cursor for proper pagination
      // Create a mutable copy of the feed list to avoid unmodifiable list issues
      return (
        feed: List<bsky.FeedView>.from(response.data.feed),
        cursor: response.data.cursor,
      );
    } catch (e) {
      print('Failed to get timeline for $accountDid: $e');
      rethrow;
    }
  }

  /// テキスト解析機能
  
  /// テキストを分析してファセットを生成
  Future<List<Map<String, dynamic>>> analyzeTextAndGenerateFacets(String text) async {
    try {
      final blueskyText = BlueskyText(text);
      return await blueskyText.entities.toFacets();
    } catch (e) {
      print('Failed to generate facets: $e');
      return [];
    }
  }

  /// テキストの文字数をカウント（Unicode Grapheme Clusters）
  int countTextLength(String text) {
    try {
      final blueskyText = BlueskyText(text);
      return blueskyText.length;
    } catch (e) {
      print('Failed to count text length: $e');
      // フォールバック：通常の文字数カウント
      return text.length;
    }
  }

  /// 投稿用テキストの検証
  bool validatePostText(String text) {
    const maxLength = 300; // Blueskyの文字数制限
    return countTextLength(text) <= maxLength;
  }

  /// テキストからメンションを抽出
  List<String> extractMentions(String text) {
    // 正規表現による抽出
    final mentionRegex = RegExp(r'@[\w.-]+\.[\w.-]+');
    return mentionRegex.allMatches(text)
        .map((m) => m.group(0)!.replaceFirst('@', ''))
        .toList();
  }

  /// テキストからハッシュタグを抽出
  List<String> extractHashtags(String text) {
    // 正規表現による抽出
    final hashtagRegex = RegExp(r'#[\w]+');
    return hashtagRegex.allMatches(text)
        .map((m) => m.group(0)!.replaceFirst('#', ''))
        .toList();
  }

  /// テキストからURLを抽出
  List<String> extractUrls(String text) {
    // 正規表現による抽出
    final urlRegex = RegExp(r'https?://[\w\-./?=#&%]+');
    return urlRegex.allMatches(text)
        .map((m) => m.group(0)!)
        .toList();
  }

  /// テキストが投稿可能かチェック（長さ + 内容検証）
  bool canPostText(String text) {
    if (text.trim().isEmpty) return false;
    if (!validatePostText(text)) return false;
    
    // 基本的な内容チェック（必要に応じて拡張）
    if (text.trim().length < 1) return false;
    
    return true;
  }

  // ========================================
  // User Preferences 関連機能
  // ========================================

  /// ユーザーの設定を取得（6時間TTLキャッシュ付き）
  Future<UserPreferences?> getUserPreferences({
    required String accountDid,
    bool forceRefresh = false,
  }) async {
    try {
      // キャッシュチェック（6時間TTL）
      if (!forceRefresh) {
        final cached = await database.preferencesDao.getCachedPreferences(accountDid);
        if (cached != null && cached.lastUpdated != null) {
          final age = DateTime.now().difference(cached.lastUpdated!).inHours;
          if (age < 6) {
            print('設定をキャッシュから取得: アカウント $accountDid (${cached.preferences.length}項目)');
            return cached;
          }
        }
      }

      print('Bluesky APIから設定を取得中: $accountDid');
      
      // API呼び出し（既存の_callAPIWithRetryパターン使用）
      final response = await _callAPIWithRetry(() async {
        final latestAccount = await database.accountDao.getAccountByDid(accountDid);
        if (latestAccount?.accessJwt == null) {
          throw Exception('有効なアクセストークンがありません');
        }

        final client = bsky.Bluesky.fromSession(
          atcore.Session(
            did: latestAccount!.did,
            handle: latestAccount.handle,
            accessJwt: latestAccount.accessJwt!,
            refreshJwt: latestAccount.refreshJwt ?? '',
          ),
        );

        return await client.actor.getPreferences();
      }, accountDid);

      final userPrefs = UserPreferences(
        preferences: response.data.preferences,
        lastUpdated: DateTime.now(),
        accountDid: accountDid,
      );

      // データベースキャッシュ保存
      await database.preferencesDao.savePreferences(accountDid, userPrefs);

      print('設定取得完了: ${response.data.preferences.length}項目');
      return userPrefs;
    } catch (e) {
      print('設定取得失敗: $e');
      
      // エラー時はキャッシュデータを返す
      final cached = await database.preferencesDao.getCachedPreferences(accountDid);
      if (cached != null) {
        print('エラー時のフォールバック: キャッシュデータを使用');
        return cached;
      }
      
      return null;
    }
  }

  /// 統合的なコンテンツモデレーション
  Future<ModerationResult> moderateContent({
    required bsky.PostView post,
    required String accountDid,
    required String context, // 'contentList' or 'contentMedia'
  }) async {
    try {
      final preferences = await getUserPreferences(accountDid: accountDid);
      if (preferences == null) {
        return const ModerationResult.allow();
      }

      final moderationPrefs = PreferencesParser.extractModerationPrefs(preferences.preferences);
      
      // ContentModeratorを使用して判定
      return ContentModerator.moderatePost(post, moderationPrefs);
    } catch (e) {
      print('モデレーション処理エラー: $e');
      return const ModerationResult.allow(); // エラー時は表示許可
    }
  }

  /// 投稿がワードミュート対象かチェック
  Future<bool> isPostMuted({
    required bsky.PostView post,
    required String accountDid,
  }) async {
    try {
      final preferences = await getUserPreferences(accountDid: accountDid);
      if (preferences == null) return false;

      final mutedWords = PreferencesParser.extractModerationPrefs(preferences.preferences).mutedWords;
      return ContentModerator.isPostMuted(post, mutedWords);
    } catch (e) {
      print('ワードミュートチェックエラー: $e');
      return false;
    }
  }

  /// フィード表示設定を取得
  Future<List<FeedViewPrefs>> getFeedViewPrefs(String accountDid) async {
    try {
      final preferences = await getUserPreferences(accountDid: accountDid);
      if (preferences == null) return [];

      return PreferencesParser.extractFeedViewPrefs(preferences.preferences);
    } catch (e) {
      print('フィード表示設定取得エラー: $e');
      return [];
    }
  }

  /// スレッド表示設定を取得
  Future<ThreadViewPrefs?> getThreadViewPrefs(String accountDid) async {
    try {
      final preferences = await getUserPreferences(accountDid: accountDid);
      if (preferences == null) return null;

      return PreferencesParser.extractThreadViewPrefs(preferences.preferences);
    } catch (e) {
      print('スレッド表示設定取得エラー: $e');
      return null;
    }
  }

  /// 保存されたフィード設定を取得
  Future<SavedFeedsPrefs?> getSavedFeedsPrefs(String accountDid) async {
    try {
      final preferences = await getUserPreferences(accountDid: accountDid);
      if (preferences == null) return null;

      return PreferencesParser.extractSavedFeedsPrefs(preferences.preferences);
    } catch (e) {
      print('保存フィード設定取得エラー: $e');
      return null;
    }
  }

  /// キャッシュが有効かチェック
  bool _isCacheValid(DateTime? lastUpdated) {
    if (lastUpdated == null) return false;
    const ttl = Duration(hours: 6);
    final age = DateTime.now().difference(lastUpdated);
    return age < ttl;
  }

  /// 設定キャッシュをクリア
  Future<void> clearPreferencesCache(String accountDid) async {
    try {
      await database.preferencesDao.clearCacheForAccount(accountDid);
      print('設定キャッシュクリア完了: $accountDid');
    } catch (e) {
      print('設定キャッシュクリアエラー: $e');
    }
  }

  /// 全アカウントの設定キャッシュをクリア
  Future<void> clearAllPreferencesCache() async {
    try {
      await database.preferencesDao.clearAllCache();
      print('全設定キャッシュクリア完了');
    } catch (e) {
      print('全設定キャッシュクリアエラー: $e');
    }
  }
}
