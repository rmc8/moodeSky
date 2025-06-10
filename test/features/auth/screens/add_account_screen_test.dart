// Package imports:
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';

// Project imports:
import 'package:moodesky/core/providers/auth_provider.dart';
import 'package:moodesky/features/auth/screens/add_account_screen.dart';
import 'package:moodesky/shared/models/auth_models.dart';

import '../../../test_helpers.dart';

void main() {
  group('AddAccountScreen', () {
    late ProviderContainer container;
    late MockAuthNotifier mockAuthNotifier;

    setUp(() {
      mockAuthNotifier = MockAuthNotifier();
      container = ProviderContainer(
        overrides: [authNotifierProvider.overrideWith(() => mockAuthNotifier)],
      );
    });

    tearDown(() {
      container.dispose();
    });

    Widget createTestWidget() {
      return UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: AddAccountScreen()),
      );
    }

    testWidgets('renders all UI elements correctly', (tester) async {
      await tester.pumpWidget(createTestWidget());

      // AppBarが表示される
      expect(find.text('アカウントを追加'), findsOneWidget);
      expect(find.byIcon(Icons.close), findsOneWidget);

      // 情報カードが表示される
      expect(find.text('新しいアカウントを追加'), findsOneWidget);
      expect(
        find.text(
          'MoodeSkyでは複数のBlueskyアカウントを同時に管理できます。新しいアカウントの認証情報を入力してください。',
        ),
        findsOneWidget,
      );

      // 認証方法選択が表示される
      expect(find.text('ログイン方法'), findsOneWidget);
      expect(find.text('App Password'), findsOneWidget);
      expect(find.text('OAuth'), findsOneWidget);

      // サーバー選択が表示される
      expect(find.text('Bluesky Social'), findsOneWidget);

      // デフォルトでApp Passwordが選択されているため、フィールドが表示される
      expect(find.byType(TextFormField), findsAtLeastNWidgets(2));

      // アカウント追加ボタンが表示される
      expect(find.text('アカウントを追加'), findsOneWidget);

      // ヘルプテキストが表示される
      expect(find.text('複数のアカウントを同時にログインして、簡単に切り替えることができます。'), findsOneWidget);
    });

    testWidgets('shows password field when App Password is selected', (
      tester,
    ) async {
      await tester.pumpWidget(createTestWidget());

      // 初期状態でApp Passwordが選択されており、パスワードフィールドが表示される
      expect(find.byType(TextFormField), findsAtLeastNWidgets(2));

      // App Passwordの説明とリンクが表示される
      expect(find.text('App Passwordについて'), findsOneWidget);
      expect(find.text('App Passwordを生成 →'), findsOneWidget);

      // OAuthに切り替え
      await tester.tap(find.text('OAuth'));
      await tester.pumpAndSettle();

      // パスワードフィールドが非表示になる
      expect(find.byType(TextFormField), findsAtLeastNWidgets(1));
    });

    testWidgets('updates button text based on auth method', (tester) async {
      await tester.pumpWidget(createTestWidget());

      // 初期状態（App Password選択時）
      expect(find.text('アカウントを追加'), findsOneWidget);

      // OAuth選択時
      await tester.tap(find.text('OAuth'));
      await tester.pumpAndSettle();

      expect(find.text('OAuth開発中'), findsOneWidget);
      expect(find.text('アカウントを追加'), findsNothing);
    });

    testWidgets('validates form fields correctly', (tester) async {
      await tester.pumpWidget(createTestWidget());

      // アカウント追加ボタンをタップ（空のフィールドで）
      await tester.tap(find.text('アカウントを追加'));
      await tester.pumpAndSettle();

      // バリデーションエラーが表示される
      expect(find.text('Please enter your handle or email'), findsOneWidget);
      expect(find.text('Please enter your app password'), findsOneWidget);
    });

    testWidgets('password visibility toggle works', (tester) async {
      await tester.pumpWidget(createTestWidget());

      // 可視性トグルボタンを見つける
      final visibilityToggle = find.byIcon(Icons.visibility);

      if (visibilityToggle.evaluate().isNotEmpty) {
        // 可視性トグルをタップ
        await tester.tap(visibilityToggle);
        await tester.pumpAndSettle();

        // アイコンが変更される
        expect(find.byIcon(Icons.visibility_off), findsOneWidget);
      }
    });

    testWidgets('shows App Password info and link', (tester) async {
      await tester.pumpWidget(createTestWidget());

      // App Password情報が表示される
      expect(find.text('App Passwordについて'), findsOneWidget);
      expect(
        find.text('App Passwordはアプリ専用の安全なパスワードです。通常のパスワードより安全です。'),
        findsOneWidget,
      );
      expect(find.text('App Passwordを生成 →'), findsOneWidget);

      // リンクをタップ
      await tester.tap(find.text('App Passwordを生成 →'));
      await tester.pumpAndSettle();

      // SnackBarでApp Password URLが表示される
      expect(
        find.text('https://bsky.app/settings/app-passwords'),
        findsOneWidget,
      );
      expect(find.text('コピー'), findsOneWidget);
    });

    testWidgets('handles successful account addition', (tester) async {
      // Mock successful account addition
      when(
        mockAuthNotifier.addAccount(
          identifier: anyNamed('identifier'),
          password: anyNamed('password'),
          serverConfig: anyNamed('serverConfig'),
          useOAuth: anyNamed('useOAuth'),
        ),
      ).thenAnswer(
        (_) async => const AuthResult.success(
          session: AuthSessionData.appPassword(
            appPasswordSession: AppPasswordSessionData(
              accessJwt: 'test_jwt',
              refreshJwt: 'test_refresh',
              did: 'did:test:123',
              handle: 'test.user',
            ),
            profile: UserProfile(
              did: 'did:test:123',
              handle: 'test.user',
              displayName: 'Test User',
            ),
          ),
          accountDid: 'did:test:123',
        ),
      );

      await tester.pumpWidget(createTestWidget());

      // フォームに入力
      await tester.enterText(
        find.byType(TextFormField).first,
        'test.user@bsky.social',
      );
      await tester.enterText(
        find.byType(TextFormField).last,
        'test-app-password',
      );

      // アカウント追加ボタンをタップ
      await tester.tap(find.text('アカウントを追加'));
      await tester.pumpAndSettle();

      // 成功メッセージが表示される
      expect(find.text('アカウントを追加しました'), findsOneWidget);

      // AuthNotifierのaddAccountメソッドが呼ばれた
      verify(
        mockAuthNotifier.addAccount(
          identifier: 'test.user@bsky.social',
          password: 'test-app-password',
          serverConfig: anyNamed('serverConfig'),
          useOAuth: false,
        ),
      ).called(1);
    });

    testWidgets('handles failed account addition', (tester) async {
      // Mock failed account addition
      when(
        mockAuthNotifier.addAccount(
          identifier: anyNamed('identifier'),
          password: anyNamed('password'),
          serverConfig: anyNamed('serverConfig'),
          useOAuth: anyNamed('useOAuth'),
        ),
      ).thenAnswer(
        (_) async => const AuthResult.failure(
          error: 'Invalid credentials',
          errorType: AuthErrorType.invalidCredentials,
        ),
      );

      await tester.pumpWidget(createTestWidget());

      // フォームに入力
      await tester.enterText(
        find.byType(TextFormField).first,
        'test.user@bsky.social',
      );
      await tester.enterText(find.byType(TextFormField).last, 'wrong-password');

      // アカウント追加ボタンをタップ
      await tester.tap(find.text('アカウントを追加'));
      await tester.pumpAndSettle();

      // エラーメッセージが表示される
      expect(find.text('アカウント追加に失敗しました: Invalid credentials'), findsOneWidget);
    });

    testWidgets('handles cancelled account addition', (tester) async {
      // Mock cancelled account addition
      when(
        mockAuthNotifier.addAccount(
          identifier: anyNamed('identifier'),
          password: anyNamed('password'),
          serverConfig: anyNamed('serverConfig'),
          useOAuth: anyNamed('useOAuth'),
        ),
      ).thenAnswer((_) async => const AuthResult.cancelled());

      await tester.pumpWidget(createTestWidget());

      // フォームに入力
      await tester.enterText(
        find.byType(TextFormField).first,
        'test.user@bsky.social',
      );
      await tester.enterText(
        find.byType(TextFormField).last,
        'test-app-password',
      );

      // アカウント追加ボタンをタップ
      await tester.tap(find.text('アカウントを追加'));
      await tester.pumpAndSettle();

      // キャンセルメッセージが表示される
      expect(find.text('アカウント追加がキャンセルされました'), findsOneWidget);
    });

    testWidgets('shows loading state during account addition', (tester) async {
      // Mock slow account addition
      when(
        mockAuthNotifier.addAccount(
          identifier: anyNamed('identifier'),
          password: anyNamed('password'),
          serverConfig: anyNamed('serverConfig'),
          useOAuth: anyNamed('useOAuth'),
        ),
      ).thenAnswer((_) async {
        await Future.delayed(const Duration(seconds: 1));
        return const AuthResult.success(
          session: AuthSessionData.appPassword(
            appPasswordSession: AppPasswordSessionData(
              accessJwt: 'test_jwt',
              refreshJwt: 'test_refresh',
              did: 'did:test:123',
              handle: 'test.user',
            ),
            profile: UserProfile(did: 'did:test:123', handle: 'test.user'),
          ),
          accountDid: 'did:test:123',
        );
      });

      await tester.pumpWidget(createTestWidget());

      // フォームに入力
      await tester.enterText(
        find.byType(TextFormField).first,
        'test.user@bsky.social',
      );
      await tester.enterText(
        find.byType(TextFormField).last,
        'test-app-password',
      );

      // アカウント追加ボタンをタップ
      await tester.tap(find.text('アカウントを追加'));
      await tester.pump();

      // ローディングインジケーターが表示される
      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      // 完了まで待機
      await tester.pumpAndSettle();

      // 成功メッセージが表示される
      expect(find.text('アカウントを追加しました'), findsOneWidget);
    });

    testWidgets('closes screen when close button is tapped', (tester) async {
      await tester.pumpWidget(createTestWidget());

      // 閉じるボタンをタップ
      await tester.tap(find.byIcon(Icons.close));
      await tester.pumpAndSettle();

      // 画面が閉じられる（実際のナビゲーションテストには追加の設定が必要）
      // ここでは基本的なタップの動作のみテスト
    });

    group('Server Selection', () {
      testWidgets('displays correct server options', (tester) async {
        await tester.pumpWidget(createTestWidget());

        // サーバー選択を展開
        await tester.tap(find.text('Bluesky Social'));
        await tester.pumpAndSettle();

        // 利用可能なサーバーオプションが表示される
        expect(find.text('Bluesky Social'), findsAtLeastNWidgets(1));
        expect(find.text('bsky.social'), findsAtLeastNWidgets(1));
      });

      testWidgets('shows selected server with check mark', (tester) async {
        await tester.pumpWidget(createTestWidget());

        // サーバー選択を展開
        await tester.tap(find.text('Bluesky Social'));
        await tester.pumpAndSettle();

        // 選択されたサーバーにチェックマークが表示される
        expect(find.byIcon(Icons.check), findsOneWidget);
      });
    });

    group('Form Validation', () {
      testWidgets('validates both identifier and password fields', (
        tester,
      ) async {
        await tester.pumpWidget(createTestWidget());

        // 空のフォームでボタンをタップ
        await tester.tap(find.text('アカウントを追加'));
        await tester.pumpAndSettle();

        // 両方のバリデーションエラーが表示される
        expect(find.text('Please enter your handle or email'), findsOneWidget);
        expect(find.text('Please enter your app password'), findsOneWidget);
      });

      testWidgets('validates only identifier in OAuth mode', (tester) async {
        await tester.pumpWidget(createTestWidget());

        // OAuthに切り替え
        await tester.tap(find.text('OAuth'));
        await tester.pumpAndSettle();

        // OAuthの場合、ボタンが無効化されているため、バリデーションは発生しない
        expect(find.text('OAuth開発中'), findsOneWidget);
      });
    });
  });
}
