// Package imports:
import 'package:flutter_test/flutter_test.dart';

// Project imports:
import 'package:moodesky/shared/models/auth_models.dart';

void main() {
  group('AuthMethod', () {
    test('enum has correct values', () {
      expect(AuthMethod.values, hasLength(2));
      expect(AuthMethod.values, contains(AuthMethod.oauth));
      expect(AuthMethod.values, contains(AuthMethod.appPassword));
    });
  });

  group('AuthCredentials', () {
    test('creates instance with required parameters', () {
      const credentials = AuthCredentials(
        identifier: 'user@example.com',
        password: 'password123',
        serviceUrl: 'https://bsky.social',
        method: AuthMethod.appPassword,
      );

      expect(credentials.identifier, 'user@example.com');
      expect(credentials.password, 'password123');
      expect(credentials.serviceUrl, 'https://bsky.social');
      expect(credentials.method, AuthMethod.appPassword);
    });

    test('copyWith works correctly', () {
      const original = AuthCredentials(
        identifier: 'user@example.com',
        password: 'password123',
        serviceUrl: 'https://bsky.social',
        method: AuthMethod.appPassword,
      );

      final updated = original.copyWith(
        method: AuthMethod.oauth,
        serviceUrl: 'https://custom.server.com',
      );

      expect(updated.identifier, 'user@example.com'); // 変更されない
      expect(updated.password, 'password123'); // 変更されない
      expect(updated.serviceUrl, 'https://custom.server.com'); // 変更される
      expect(updated.method, AuthMethod.oauth); // 変更される
    });

    test('JSON serialization works', () {
      const credentials = AuthCredentials(
        identifier: 'test@example.com',
        password: 'test-password',
        serviceUrl: 'https://test.com',
        method: AuthMethod.oauth,
      );

      final json = credentials.toJson();
      final fromJson = AuthCredentials.fromJson(json);

      expect(fromJson.identifier, credentials.identifier);
      expect(fromJson.password, credentials.password);
      expect(fromJson.serviceUrl, credentials.serviceUrl);
      expect(fromJson.method, credentials.method);
    });
  });

  group('UserProfile', () {
    test('creates instance with required parameters', () {
      const profile = UserProfile(
        did: 'did:plc:example123',
        handle: 'user.bsky.social',
      );

      expect(profile.did, 'did:plc:example123');
      expect(profile.handle, 'user.bsky.social');
      expect(profile.displayName, null);
      expect(profile.isVerified, null);
    });

    test('creates instance with all parameters', () {
      final createdAt = DateTime.now();
      final profile = UserProfile(
        did: 'did:plc:example123',
        handle: 'user.bsky.social',
        displayName: 'User Name',
        description: 'User bio',
        avatar: 'https://example.com/avatar.jpg',
        email: 'user@example.com',
        isVerified: true,
        followersCount: 100,
        followsCount: 50,
        postsCount: 25,
        createdAt: createdAt,
      );

      expect(profile.did, 'did:plc:example123');
      expect(profile.handle, 'user.bsky.social');
      expect(profile.displayName, 'User Name');
      expect(profile.description, 'User bio');
      expect(profile.avatar, 'https://example.com/avatar.jpg');
      expect(profile.email, 'user@example.com');
      expect(profile.isVerified, true);
      expect(profile.followersCount, 100);
      expect(profile.followsCount, 50);
      expect(profile.postsCount, 25);
      expect(profile.createdAt, createdAt);
    });

    test('JSON serialization works', () {
      const profile = UserProfile(
        did: 'did:plc:test123',
        handle: 'test.bsky.social',
        displayName: 'Test User',
        isVerified: true,
      );

      final json = profile.toJson();
      final fromJson = UserProfile.fromJson(json);

      expect(fromJson.did, profile.did);
      expect(fromJson.handle, profile.handle);
      expect(fromJson.displayName, profile.displayName);
      expect(fromJson.isVerified, profile.isVerified);
    });
  });

  group('AuthErrorType', () {
    test('enum has all expected values', () {
      const expectedValues = [
        AuthErrorType.networkError,
        AuthErrorType.invalidCredentials,
        AuthErrorType.tokenExpired,
        AuthErrorType.serverError,
        AuthErrorType.userCancelled,
        AuthErrorType.unknownError,
        AuthErrorType.dpopError,
        AuthErrorType.refreshError,
      ];

      for (final value in expectedValues) {
        expect(AuthErrorType.values, contains(value));
      }
    });
  });

  group('AuthState', () {
    test('initial state', () {
      const state = AuthState.initial();
      expect(state, isA<AuthInitial>());
    });

    test('loading state', () {
      const state = AuthState.loading();
      expect(state, isA<AuthLoading>());
    });

    test('authenticated state', () {
      const profiles = [
        UserProfile(did: 'did:1', handle: 'user1.bsky.social'),
        UserProfile(did: 'did:2', handle: 'user2.bsky.social'),
      ];
      
      const state = AuthState.authenticated(
        activeAccountDid: 'did:1',
        accounts: profiles,
      );
      
      expect(state, isA<AuthAuthenticated>());
      state.when(
        initial: () => fail('Should be authenticated'),
        loading: () => fail('Should be authenticated'),
        authenticated: (activeAccountDid, accounts) {
          expect(activeAccountDid, 'did:1');
          expect(accounts, profiles);
        },
        unauthenticated: () => fail('Should be authenticated'),
        error: (_, __) => fail('Should be authenticated'),
      );
    });

    test('unauthenticated state', () {
      const state = AuthState.unauthenticated();
      expect(state, isA<AuthUnauthenticated>());
    });

    test('error state', () {
      const state = AuthState.error(
        message: 'Test error',
        errorType: AuthErrorType.networkError,
      );
      
      expect(state, isA<AuthError>());
      state.when(
        initial: () => fail('Should be error'),
        loading: () => fail('Should be error'),
        authenticated: (_, __) => fail('Should be error'),
        unauthenticated: () => fail('Should be error'),
        error: (message, errorType) {
          expect(message, 'Test error');
          expect(errorType, AuthErrorType.networkError);
        },
      );
    });
  });

  group('LoginRequest', () {
    test('oauth login request', () {
      const request = LoginRequest.oauth(
        userIdentifier: 'user@bsky.social',
        pdsHost: 'bsky.social',
      );

      expect(request, isA<OAuthLoginRequest>());
      request.when(
        oauth: (userIdentifier, pdsHost) {
          expect(userIdentifier, 'user@bsky.social');
          expect(pdsHost, 'bsky.social');
        },
        appPassword: (_, __, ___) => fail('Should be OAuth request'),
      );
    });

    test('app password login request', () {
      const request = LoginRequest.appPassword(
        identifier: 'user@bsky.social',
        password: 'app-password',
        pdsHost: 'bsky.social',
      );

      expect(request, isA<AppPasswordLoginRequest>());
      request.when(
        oauth: (_, __) => fail('Should be App Password request'),
        appPassword: (identifier, password, pdsHost) {
          expect(identifier, 'user@bsky.social');
          expect(password, 'app-password');
          expect(pdsHost, 'bsky.social');
        },
      );
    });
  });

  group('AuthResult', () {
    test('success result', () {
      final sessionData = OAuthSessionData(
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        dpopPublicKey: 'dpop-public',
        dpopPrivateKey: 'dpop-private',
        dpopNonce: 'nonce',
        tokenType: 'DPoP',
        expiresAt: DateTime.now().add(const Duration(hours: 1)),
        sub: 'did:plc:example',
      );
      
      const userProfile = UserProfile(
        did: 'did:plc:example',
        handle: 'user.bsky.social',
      );
      
      final authSession = AuthSessionData.oauth(
        oauthSession: sessionData,
        profile: userProfile,
      );
      
      final result = AuthResult.success(
        session: authSession,
        accountDid: 'did:plc:example',
      );

      expect(result, isA<AuthSuccess>());
      result.when(
        success: (session, accountDid) {
          expect(accountDid, 'did:plc:example');
          expect(session, authSession);
        },
        failure: (_, __, ___) => fail('Should be success'),
        cancelled: () => fail('Should be success'),
      );
    });

    test('failure result', () {
      const result = AuthResult.failure(
        error: 'Invalid credentials',
        errorDescription: 'Username or password is incorrect',
        errorType: AuthErrorType.invalidCredentials,
      );

      expect(result, isA<AuthFailure>());
      result.when(
        success: (_, __) => fail('Should be failure'),
        failure: (error, errorDescription, errorType) {
          expect(error, 'Invalid credentials');
          expect(errorDescription, 'Username or password is incorrect');
          expect(errorType, AuthErrorType.invalidCredentials);
        },
        cancelled: () => fail('Should be failure'),
      );
    });

    test('cancelled result', () {
      const result = AuthResult.cancelled();
      expect(result, isA<AuthCancelled>());
    });
  });
}