// Package imports:
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';

// Project imports:
import 'package:moodesky/core/providers/auth_provider.dart';
import 'package:moodesky/features/auth/models/server_config.dart';
import 'package:moodesky/services/bluesky_service.dart';
import 'package:moodesky/services/database/database.dart';
import 'package:moodesky/shared/models/auth_models.dart';

import '../../test_helpers.dart';
import 'auth_provider_add_account_test.mocks.dart';

@GenerateMocks([BlueskyService, AppDatabase])
void main() {
  group('AuthNotifier.addAccount', () {
    late AuthNotifier authNotifier;
    late MockBlueskyService mockBlueskyService;
    late MockAppDatabase mockDatabase;

    setUp(() {
      mockBlueskyService = MockBlueskyService();
      mockDatabase = MockAppDatabase();

      // AuthNotifierの初期化は実際の実装に依存するため、
      // ここではテスト用の簡略化されたセットアップを使用
      authNotifier = AuthNotifier();
    });

    group('with App Password authentication', () {
      testWidgets('successfully adds new account', (tester) async {
        // Arrange
        const identifier = 'newuser@bsky.social';
        const password = 'abcd-efgh-ijkl-mnop';
        final serverConfig = ServerPresets.blueskyOfficial;

        final expectedResult = AuthResult.success(
          session: AuthSessionData.appPassword(
            appPasswordSession: AppPasswordSessionData(
              accessJwt: 'new_access_jwt',
              refreshJwt: 'new_refresh_jwt',
              did: 'did:plc:newuser123',
              handle: 'newuser',
            ),
            profile: UserProfile(
              did: 'did:plc:newuser123',
              handle: 'newuser',
              displayName: 'New User',
            ),
          ),
          accountDid: 'did:plc:newuser123',
        );

        when(
          mockBlueskyService.signInWithAppPassword(
            identifier: identifier,
            password: password,
            pdsHost: anyNamed('pdsHost'),
            isAdditionalAccount: true,
          ),
        ).thenAnswer((_) async => expectedResult);

        when(
          mockBlueskyService.getProfileInfo('did:plc:newuser123'),
        ).thenAnswer(
          (_) async => UserProfile(
            did: 'did:plc:newuser123',
            handle: 'newuser',
            displayName: 'New User',
            avatar: 'https://example.com/avatar.jpg',
          ),
        );

        // Act
        final result = await authNotifier.addAccount(
          identifier: identifier,
          password: password,
          serverConfig: serverConfig,
          useOAuth: false,
        );

        // Assert
        expect(result, isA<AuthSuccess>());
        result.when(
          success: (session, accountDid) {
            expect(accountDid, equals('did:plc:newuser123'));
            expect(session, isA<AppPasswordSession>());
          },
          failure: (error, errorDescription, errorType) {
            fail('Expected success but got failure: $error');
          },
          cancelled: () {
            fail('Expected success but got cancelled');
          },
        );

        // Verify profile fetch was called
        verify(
          mockBlueskyService.getProfileInfo('did:plc:newuser123'),
        ).called(1);
      });

      testWidgets('updates existing account credentials', (tester) async {
        // Arrange
        const identifier = 'existing@bsky.social';
        const password = 'new-password-1234';
        final serverConfig = ServerPresets.blueskyOfficial;

        final expectedResult = AuthResult.success(
          session: AuthSessionData.appPassword(
            appPasswordSession: AppPasswordSessionData(
              accessJwt: 'updated_access_jwt',
              refreshJwt: 'updated_refresh_jwt',
              did: 'did:plc:existing123',
              handle: 'existing',
            ),
            profile: UserProfile(
              did: 'did:plc:existing123',
              handle: 'existing',
              displayName: 'Existing User',
            ),
          ),
          accountDid: 'did:plc:existing123',
        );

        when(
          mockBlueskyService.signInWithAppPassword(
            identifier: identifier,
            password: password,
            pdsHost: anyNamed('pdsHost'),
            isAdditionalAccount: true,
          ),
        ).thenAnswer((_) async => expectedResult);

        when(
          mockBlueskyService.getProfileInfo('did:plc:existing123'),
        ).thenAnswer(
          (_) async => UserProfile(
            did: 'did:plc:existing123',
            handle: 'existing',
            displayName: 'Updated User',
            avatar: 'https://example.com/new-avatar.jpg',
          ),
        );

        // Act
        final result = await authNotifier.addAccount(
          identifier: identifier,
          password: password,
          serverConfig: serverConfig,
          useOAuth: false,
        );

        // Assert
        expect(result, isA<AuthSuccess>());
        verify(
          mockBlueskyService.signInWithAppPassword(
            identifier: identifier,
            password: password,
            pdsHost: anyNamed('pdsHost'),
            isAdditionalAccount: true,
          ),
        ).called(1);
      });

      testWidgets('handles authentication failure', (tester) async {
        // Arrange
        const identifier = 'invalid@bsky.social';
        const password = 'wrong-password';
        final serverConfig = ServerPresets.blueskyOfficial;

        when(
          mockBlueskyService.signInWithAppPassword(
            identifier: identifier,
            password: password,
            pdsHost: anyNamed('pdsHost'),
            isAdditionalAccount: true,
          ),
        ).thenAnswer(
          (_) async => AuthResult.failure(
            error: 'Invalid credentials',
            errorType: AuthErrorType.invalidCredentials,
          ),
        );

        // Act
        final result = await authNotifier.addAccount(
          identifier: identifier,
          password: password,
          serverConfig: serverConfig,
          useOAuth: false,
        );

        // Assert
        expect(result, isA<AuthFailure>());
        result.when(
          success: (session, accountDid) {
            fail('Expected failure but got success');
          },
          failure: (error, errorDescription, errorType) {
            expect(error, equals('Invalid credentials'));
            expect(errorType, equals(AuthErrorType.invalidCredentials));
          },
          cancelled: () {
            fail('Expected failure but got cancelled');
          },
        );

        // Verify profile fetch was not called
        verifyNever(mockBlueskyService.getProfileInfo(any));
      });

      testWidgets('handles network error', (tester) async {
        // Arrange
        const identifier = 'user@bsky.social';
        const password = 'valid-password';
        final serverConfig = ServerPresets.blueskyOfficial;

        when(
          mockBlueskyService.signInWithAppPassword(
            identifier: identifier,
            password: password,
            pdsHost: anyNamed('pdsHost'),
            isAdditionalAccount: true,
          ),
        ).thenAnswer(
          (_) async => AuthResult.failure(
            error: 'Network error',
            errorType: AuthErrorType.networkError,
          ),
        );

        // Act
        final result = await authNotifier.addAccount(
          identifier: identifier,
          password: password,
          serverConfig: serverConfig,
          useOAuth: false,
        );

        // Assert
        expect(result, isA<AuthFailure>());
        result.when(
          success: (session, accountDid) {
            fail('Expected failure but got success');
          },
          failure: (error, errorDescription, errorType) {
            expect(error, equals('Network error'));
            expect(errorType, equals(AuthErrorType.networkError));
          },
          cancelled: () {
            fail('Expected failure but got cancelled');
          },
        );
      });

      testWidgets('handles profile fetch failure gracefully', (tester) async {
        // Arrange
        const identifier = 'user@bsky.social';
        const password = 'valid-password';
        final serverConfig = ServerPresets.blueskyOfficial;

        final expectedResult = AuthResult.success(
          session: AuthSessionData.appPassword(
            appPasswordSession: AppPasswordSessionData(
              accessJwt: 'access_jwt',
              refreshJwt: 'refresh_jwt',
              did: 'did:plc:user123',
              handle: 'user',
            ),
            profile: UserProfile(did: 'did:plc:user123', handle: 'user'),
          ),
          accountDid: 'did:plc:user123',
        );

        when(
          mockBlueskyService.signInWithAppPassword(
            identifier: identifier,
            password: password,
            pdsHost: anyNamed('pdsHost'),
            isAdditionalAccount: true,
          ),
        ).thenAnswer((_) async => expectedResult);

        // Profile fetch fails
        when(
          mockBlueskyService.getProfileInfo('did:plc:user123'),
        ).thenThrow(Exception('Profile fetch failed'));

        // Act
        final result = await authNotifier.addAccount(
          identifier: identifier,
          password: password,
          serverConfig: serverConfig,
          useOAuth: false,
        );

        // Assert - Account addition should still succeed
        expect(result, isA<AuthSuccess>());
        verify(mockBlueskyService.getProfileInfo('did:plc:user123')).called(1);
      });
    });

    group('with OAuth authentication', () {
      testWidgets('successfully adds OAuth account', (tester) async {
        // Arrange
        const identifier = 'oauthuser@bsky.social';
        const password = ''; // OAuth doesn't use password
        final serverConfig = ServerPresets.blueskyOfficial;

        final expectedResult = AuthResult.success(
          session: AuthSessionData.oauth(
            oauthSession: OAuthSessionData(
              accessToken: 'oauth_access_token',
              refreshToken: 'oauth_refresh_token',
              dpopPublicKey: 'dpop_public_key',
              dpopPrivateKey: 'dpop_private_key',
              dpopNonce: 'dpop_nonce',
              tokenType: 'DPoP',
              expiresAt: DateTime.now().add(Duration(hours: 1)),
              sub: 'did:plc:oauthuser123',
            ),
            profile: UserProfile(
              did: 'did:plc:oauthuser123',
              handle: 'oauthuser',
            ),
          ),
          accountDid: 'did:plc:oauthuser123',
        );

        when(
          mockBlueskyService.signInWithOAuth(
            userIdentifier: identifier,
            pdsHost: anyNamed('pdsHost'),
          ),
        ).thenAnswer((_) async => expectedResult);

        when(
          mockBlueskyService.getProfileInfo('did:plc:oauthuser123'),
        ).thenAnswer(
          (_) async => UserProfile(
            did: 'did:plc:oauthuser123',
            handle: 'oauthuser',
            displayName: 'OAuth User',
            avatar: 'https://example.com/oauth-avatar.jpg',
          ),
        );

        // Act
        final result = await authNotifier.addAccount(
          identifier: identifier,
          password: password,
          serverConfig: serverConfig,
          useOAuth: true,
        );

        // Assert
        expect(result, isA<AuthSuccess>());
        result.when(
          success: (session, accountDid) {
            expect(accountDid, equals('did:plc:oauthuser123'));
            expect(session, isA<OAuthSession>());
          },
          failure: (error, errorDescription, errorType) {
            fail('Expected success but got failure: $error');
          },
          cancelled: () {
            fail('Expected success but got cancelled');
          },
        );

        verify(
          mockBlueskyService.signInWithOAuth(
            userIdentifier: identifier,
            pdsHost: anyNamed('pdsHost'),
          ),
        ).called(1);
      });

      testWidgets('handles OAuth cancellation', (tester) async {
        // Arrange
        const identifier = 'user@bsky.social';
        const password = '';
        final serverConfig = ServerPresets.blueskyOfficial;

        when(
          mockBlueskyService.signInWithOAuth(
            userIdentifier: identifier,
            pdsHost: anyNamed('pdsHost'),
          ),
        ).thenAnswer((_) async => AuthResult.cancelled());

        // Act
        final result = await authNotifier.addAccount(
          identifier: identifier,
          password: password,
          serverConfig: serverConfig,
          useOAuth: true,
        );

        // Assert
        expect(
          result,
          isA<AuthFailure>(),
        ); // Cancelled is converted to failure in addAccount
        result.when(
          success: (session, accountDid) {
            fail('Expected failure but got success');
          },
          failure: (error, errorDescription, errorType) {
            expect(errorType, equals(AuthErrorType.userCancelled));
          },
          cancelled: () {
            // This should not happen as cancelled is converted to failure
          },
        );
      });
    });

    group('with custom server', () {
      testWidgets('successfully adds account to custom server', (tester) async {
        // Arrange
        const identifier = 'user@custom.social';
        const password = 'custom-password';
        final customServer = ServerConfig(
          serviceUrl: 'https://custom.social',
          displayName: 'Custom Server',
          isOfficial: false,
          appPasswordUrl: 'https://custom.social/settings/app-passwords',
        );

        final expectedResult = AuthResult.success(
          session: AuthSessionData.appPassword(
            appPasswordSession: AppPasswordSessionData(
              accessJwt: 'custom_access_jwt',
              refreshJwt: 'custom_refresh_jwt',
              did: 'did:plc:customuser123',
              handle: 'user',
            ),
            profile: UserProfile(did: 'did:plc:customuser123', handle: 'user'),
          ),
          accountDid: 'did:plc:customuser123',
        );

        when(
          mockBlueskyService.signInWithAppPassword(
            identifier: identifier,
            password: password,
            pdsHost: 'custom.social',
            isAdditionalAccount: true,
          ),
        ).thenAnswer((_) async => expectedResult);

        when(
          mockBlueskyService.getProfileInfo('did:plc:customuser123'),
        ).thenAnswer(
          (_) async => UserProfile(
            did: 'did:plc:customuser123',
            handle: 'user',
            displayName: 'Custom User',
          ),
        );

        // Act
        final result = await authNotifier.addAccount(
          identifier: identifier,
          password: password,
          serverConfig: customServer,
          useOAuth: false,
        );

        // Assert
        expect(result, isA<AuthSuccess>());
        verify(
          mockBlueskyService.signInWithAppPassword(
            identifier: identifier,
            password: password,
            pdsHost: 'custom.social',
            isAdditionalAccount: true,
          ),
        ).called(1);
      });
    });

    group('error handling', () {
      testWidgets('handles unexpected exceptions', (tester) async {
        // Arrange
        const identifier = 'user@bsky.social';
        const password = 'password';
        final serverConfig = ServerPresets.blueskyOfficial;

        when(
          mockBlueskyService.signInWithAppPassword(
            identifier: anyNamed('identifier'),
            password: anyNamed('password'),
            pdsHost: anyNamed('pdsHost'),
            isAdditionalAccount: anyNamed('isAdditionalAccount'),
          ),
        ).thenThrow(Exception('Unexpected error'));

        // Act
        final result = await authNotifier.addAccount(
          identifier: identifier,
          password: password,
          serverConfig: serverConfig,
          useOAuth: false,
        );

        // Assert
        expect(result, isA<AuthFailure>());
        result.when(
          success: (session, accountDid) {
            fail('Expected failure but got success');
          },
          failure: (error, errorDescription, errorType) {
            expect(error, contains('Failed to add account'));
            expect(errorType, equals(AuthErrorType.unknownError));
          },
          cancelled: () {
            fail('Expected failure but got cancelled');
          },
        );
      });

      testWidgets('handles profile update failure gracefully', (tester) async {
        // Arrange
        const identifier = 'user@bsky.social';
        const password = 'password';
        final serverConfig = ServerPresets.blueskyOfficial;

        final expectedResult = AuthResult.success(
          session: AuthSessionData.appPassword(
            appPasswordSession: AppPasswordSessionData(
              accessJwt: 'access_jwt',
              refreshJwt: 'refresh_jwt',
              did: 'did:plc:user123',
              handle: 'user',
            ),
            profile: UserProfile(did: 'did:plc:user123', handle: 'user'),
          ),
          accountDid: 'did:plc:user123',
        );

        when(
          mockBlueskyService.signInWithAppPassword(
            identifier: identifier,
            password: password,
            pdsHost: anyNamed('pdsHost'),
            isAdditionalAccount: true,
          ),
        ).thenAnswer((_) async => expectedResult);

        when(mockBlueskyService.getProfileInfo('did:plc:user123')).thenAnswer(
          (_) async => UserProfile(
            did: 'did:plc:user123',
            handle: 'user',
            avatar: 'https://example.com/avatar.jpg',
          ),
        );

        when(
          mockBlueskyService.updateAccountProfile(
            did: anyNamed('did'),
            displayName: anyNamed('displayName'),
            description: anyNamed('description'),
            avatar: anyNamed('avatar'),
            banner: anyNamed('banner'),
          ),
        ).thenThrow(Exception('Profile update failed'));

        // Act
        final result = await authNotifier.addAccount(
          identifier: identifier,
          password: password,
          serverConfig: serverConfig,
          useOAuth: false,
        );

        // Assert - Should still succeed despite profile update failure
        expect(result, isA<AuthSuccess>());
      });
    });
  });
}
