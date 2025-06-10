// Package imports:
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';

// Project imports:
import 'package:moodesky/services/bluesky_service.dart';
import 'package:moodesky/services/database/database.dart';
import 'package:moodesky/services/database/daos/account_dao.dart';
import 'package:moodesky/shared/models/auth_models.dart';

import '../test_helpers.dart';
import 'bluesky_service_profile_test.mocks.dart';

@GenerateMocks([AppDatabase, AccountDao])
void main() {
  group('BlueskyService Profile Methods', () {
    late BlueskyService blueskyService;
    late MockAppDatabase mockDatabase;
    late MockAccountDao mockAccountDao;
    late AuthConfig authConfig;

    setUp(() {
      mockDatabase = MockAppDatabase();
      mockAccountDao = MockAccountDao();
      authConfig = const AuthConfig(
        clientMetadataUrl: 'https://test.com/oauth/client-metadata.json',
        callbackUrlScheme: 'com.test.app',
        defaultPdsHost: 'bsky.social',
      );

      when(mockDatabase.accountDao).thenReturn(mockAccountDao);

      blueskyService = BlueskyService(
        database: mockDatabase,
        secureStorage: MockSecureStorage(),
        authConfig: authConfig,
      );
    });

    group('getProfileInfo', () {
      testWidgets('returns profile info for existing account', (tester) async {
        // Arrange
        const accountDid = 'did:plc:test123';
        final mockAccount = Account(
          id: 1,
          did: accountDid,
          handle: 'test.bsky.social',
          displayName: 'Test User',
          description: 'A test user',
          avatar: null,
          banner: null,
          email: 'test@example.com',
          accessJwt: 'test_jwt',
          refreshJwt: 'test_refresh',
          sessionString: 'test_session',
          pdsUrl: 'https://bsky.social',
          serviceUrl: 'https://bsky.social',
          loginMethod: 'app_password',
          isActive: true,
          lastUsed: DateTime.now(),
          accountOrder: 0,
          accountLabel: null,
          isVerified: false,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );

        when(
          mockAccountDao.getAccountByDid(accountDid),
        ).thenAnswer((_) async => mockAccount);

        // Act
        final result = await blueskyService.getProfileInfo(accountDid);

        // Assert
        expect(result, isNotNull);
        expect(result!.did, equals(accountDid));
        expect(result.handle, equals('test.bsky.social'));
        expect(result.displayName, equals('Test User'));
        expect(result.description, equals('A test user'));
        expect(result.email, equals('test@example.com'));
        expect(result.isVerified, isFalse);

        // Check that avatar URL was generated
        expect(result.avatar, isNotNull);
        expect(result.avatar, contains('dicebear.com'));
        expect(result.avatar, contains('test.bsky.social'));

        // Check that mock data is included
        expect(result.followersCount, equals(0));
        expect(result.followsCount, equals(0));
        expect(result.postsCount, equals(0));

        verify(mockAccountDao.getAccountByDid(accountDid)).called(1);
      });

      testWidgets('returns null for non-existent account', (tester) async {
        // Arrange
        const accountDid = 'did:plc:nonexistent';

        when(
          mockAccountDao.getAccountByDid(accountDid),
        ).thenAnswer((_) async => null);

        // Act
        final result = await blueskyService.getProfileInfo(accountDid);

        // Assert
        expect(result, isNull);
        verify(mockAccountDao.getAccountByDid(accountDid)).called(1);
      });

      testWidgets('handles database exception gracefully', (tester) async {
        // Arrange
        const accountDid = 'did:plc:test123';

        when(
          mockAccountDao.getAccountByDid(accountDid),
        ).thenThrow(Exception('Database error'));

        // Act
        final result = await blueskyService.getProfileInfo(accountDid);

        // Assert
        expect(result, isNull);
        verify(mockAccountDao.getAccountByDid(accountDid)).called(1);
      });

      testWidgets('uses handle as display name when display name is null', (
        tester,
      ) async {
        // Arrange
        const accountDid = 'did:plc:test123';
        final mockAccount = Account(
          id: 1,
          did: accountDid,
          handle: 'no-display-name.bsky.social',
          displayName: null, // No display name
          description: null,
          avatar: null,
          banner: null,
          email: null,
          accessJwt: 'test_jwt',
          refreshJwt: 'test_refresh',
          sessionString: 'test_session',
          pdsUrl: 'https://bsky.social',
          serviceUrl: 'https://bsky.social',
          loginMethod: 'app_password',
          isActive: true,
          lastUsed: DateTime.now(),
          accountOrder: 0,
          accountLabel: null,
          isVerified: false,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );

        when(
          mockAccountDao.getAccountByDid(accountDid),
        ).thenAnswer((_) async => mockAccount);

        // Act
        final result = await blueskyService.getProfileInfo(accountDid);

        // Assert
        expect(result, isNotNull);
        expect(result!.displayName, equals('no-display-name.bsky.social'));
        expect(result.handle, equals('no-display-name.bsky.social'));
      });

      testWidgets('generates correct avatar URL based on handle', (
        tester,
      ) async {
        // Arrange
        const accountDid = 'did:plc:test123';
        const handle = 'unique.handle.bsky.social';
        final mockAccount = Account(
          id: 1,
          did: accountDid,
          handle: handle,
          displayName: 'Test User',
          description: null,
          avatar: null,
          banner: null,
          email: null,
          accessJwt: 'test_jwt',
          refreshJwt: 'test_refresh',
          sessionString: 'test_session',
          pdsUrl: 'https://bsky.social',
          serviceUrl: 'https://bsky.social',
          loginMethod: 'app_password',
          isActive: true,
          lastUsed: DateTime.now(),
          accountOrder: 0,
          accountLabel: null,
          isVerified: false,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );

        when(
          mockAccountDao.getAccountByDid(accountDid),
        ).thenAnswer((_) async => mockAccount);

        // Act
        final result = await blueskyService.getProfileInfo(accountDid);

        // Assert
        expect(result, isNotNull);
        expect(result!.avatar, contains(handle));
        expect(
          result.avatar,
          startsWith('https://api.dicebear.com/7.x/avataaars/svg?seed='),
        );
      });
    });

    group('updateAccountProfile', () {
      testWidgets('successfully updates account profile', (tester) async {
        // Arrange
        const accountDid = 'did:plc:test123';
        const newDisplayName = 'Updated Display Name';
        const newDescription = 'Updated description';
        const newAvatar = 'https://example.com/new-avatar.jpg';
        const newBanner = 'https://example.com/new-banner.jpg';

        when(
          mockAccountDao.updateAccountProfile(
            did: accountDid,
            displayName: newDisplayName,
            description: newDescription,
            avatar: newAvatar,
            banner: newBanner,
          ),
        ).thenAnswer((_) async => 1); // Return 1 to indicate success

        // Act
        await blueskyService.updateAccountProfile(
          accountDid: accountDid,
          displayName: newDisplayName,
          description: newDescription,
          avatar: newAvatar,
          banner: newBanner,
        );

        // Assert
        verify(
          mockAccountDao.updateAccountProfile(
            did: accountDid,
            displayName: newDisplayName,
            description: newDescription,
            avatar: newAvatar,
            banner: newBanner,
          ),
        ).called(1);
      });

      testWidgets('successfully updates partial profile information', (
        tester,
      ) async {
        // Arrange
        const accountDid = 'did:plc:test123';
        const newDisplayName = 'New Name Only';

        when(
          mockAccountDao.updateAccountProfile(
            did: accountDid,
            displayName: newDisplayName,
            description: null,
            avatar: null,
            banner: null,
          ),
        ).thenAnswer((_) async => 1);

        // Act
        await blueskyService.updateAccountProfile(
          accountDid: accountDid,
          displayName: newDisplayName,
        );

        // Assert
        verify(
          mockAccountDao.updateAccountProfile(
            did: accountDid,
            displayName: newDisplayName,
            description: null,
            avatar: null,
            banner: null,
          ),
        ).called(1);
      });

      testWidgets('handles database update failure', (tester) async {
        // Arrange
        const accountDid = 'did:plc:test123';
        const newDisplayName = 'Updated Name';

        when(
          mockAccountDao.updateAccountProfile(
            did: accountDid,
            displayName: newDisplayName,
            description: null,
            avatar: null,
            banner: null,
          ),
        ).thenThrow(Exception('Database update failed'));

        // Act & Assert
        expect(
          () => blueskyService.updateAccountProfile(
            accountDid: accountDid,
            displayName: newDisplayName,
          ),
          throwsA(isA<Exception>()),
        );

        verify(
          mockAccountDao.updateAccountProfile(
            did: accountDid,
            displayName: newDisplayName,
            description: null,
            avatar: null,
            banner: null,
          ),
        ).called(1);
      });

      testWidgets('clears profile information when null values provided', (
        tester,
      ) async {
        // Arrange
        const accountDid = 'did:plc:test123';

        when(
          mockAccountDao.updateAccountProfile(
            did: accountDid,
            displayName: null,
            description: null,
            avatar: null,
            banner: null,
          ),
        ).thenAnswer((_) async => 1);

        // Act
        await blueskyService.updateAccountProfile(
          accountDid: accountDid,
          displayName: null,
          description: null,
          avatar: null,
          banner: null,
        );

        // Assert
        verify(
          mockAccountDao.updateAccountProfile(
            did: accountDid,
            displayName: null,
            description: null,
            avatar: null,
            banner: null,
          ),
        ).called(1);
      });

      testWidgets('handles empty strings as updates', (tester) async {
        // Arrange
        const accountDid = 'did:plc:test123';
        const emptyDisplayName = '';
        const emptyDescription = '';

        when(
          mockAccountDao.updateAccountProfile(
            did: accountDid,
            displayName: emptyDisplayName,
            description: emptyDescription,
            avatar: null,
            banner: null,
          ),
        ).thenAnswer((_) async => 1);

        // Act
        await blueskyService.updateAccountProfile(
          accountDid: accountDid,
          displayName: emptyDisplayName,
          description: emptyDescription,
        );

        // Assert
        verify(
          mockAccountDao.updateAccountProfile(
            did: accountDid,
            displayName: emptyDisplayName,
            description: emptyDescription,
            avatar: null,
            banner: null,
          ),
        ).called(1);
      });
    });

    group('integration tests', () {
      testWidgets('getProfileInfo and updateAccountProfile work together', (
        tester,
      ) async {
        // Arrange
        const accountDid = 'did:plc:test123';
        final originalAccount = Account(
          id: 1,
          did: accountDid,
          handle: 'test.bsky.social',
          displayName: 'Original Name',
          description: 'Original description',
          avatar: null,
          banner: null,
          email: 'test@example.com',
          accessJwt: 'test_jwt',
          refreshJwt: 'test_refresh',
          sessionString: 'test_session',
          pdsUrl: 'https://bsky.social',
          serviceUrl: 'https://bsky.social',
          loginMethod: 'app_password',
          isActive: true,
          lastUsed: DateTime.now(),
          accountOrder: 0,
          accountLabel: null,
          isVerified: false,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );

        final updatedAccount = Account(
          id: 1,
          did: accountDid,
          handle: 'test.bsky.social',
          displayName: 'Updated Name',
          description: 'Updated description',
          avatar: 'https://example.com/avatar.jpg',
          banner: 'https://example.com/banner.jpg',
          email: 'test@example.com',
          accessJwt: 'test_jwt',
          refreshJwt: 'test_refresh',
          sessionString: 'test_session',
          pdsUrl: 'https://bsky.social',
          serviceUrl: 'https://bsky.social',
          loginMethod: 'app_password',
          isActive: true,
          lastUsed: DateTime.now(),
          accountOrder: 0,
          accountLabel: null,
          isVerified: false,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );

        // First call returns original account
        when(
          mockAccountDao.getAccountByDid(accountDid),
        ).thenAnswer((_) async => originalAccount);

        when(
          mockAccountDao.updateAccountProfile(
            did: accountDid,
            displayName: 'Updated Name',
            description: 'Updated description',
            avatar: 'https://example.com/avatar.jpg',
            banner: 'https://example.com/banner.jpg',
          ),
        ).thenAnswer((_) async => 1);

        // Act
        final originalProfile = await blueskyService.getProfileInfo(accountDid);

        await blueskyService.updateAccountProfile(
          accountDid: accountDid,
          displayName: 'Updated Name',
          description: 'Updated description',
          avatar: 'https://example.com/avatar.jpg',
          banner: 'https://example.com/banner.jpg',
        );

        // Mock the updated account for the second call
        when(
          mockAccountDao.getAccountByDid(accountDid),
        ).thenAnswer((_) async => updatedAccount);

        final updatedProfile = await blueskyService.getProfileInfo(accountDid);

        // Assert
        expect(originalProfile, isNotNull);
        expect(originalProfile!.displayName, equals('Original Name'));
        expect(originalProfile.description, equals('Original description'));

        expect(updatedProfile, isNotNull);
        expect(updatedProfile!.displayName, equals('Updated Name'));
        expect(updatedProfile.description, equals('Updated description'));
        expect(updatedProfile.avatar, equals('https://example.com/avatar.jpg'));
        expect(updatedProfile.banner, equals('https://example.com/banner.jpg'));

        verify(mockAccountDao.getAccountByDid(accountDid)).called(2);
        verify(
          mockAccountDao.updateAccountProfile(
            did: accountDid,
            displayName: 'Updated Name',
            description: 'Updated description',
            avatar: 'https://example.com/avatar.jpg',
            banner: 'https://example.com/banner.jpg',
          ),
        ).called(1);
      });
    });
  });
}

// Mock SecureStorage for testing
class MockSecureStorage {
  // Basic mock implementation
}
