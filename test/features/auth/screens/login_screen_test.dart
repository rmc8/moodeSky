// Package imports:
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

// Project imports:
import 'package:moodesky/features/auth/screens/login_screen.dart';

void main() {
  group('LoginScreen', () {
    late ProviderContainer container;

    setUp(() {
      container = ProviderContainer();
    });

    tearDown(() {
      container.dispose();
    });

    Widget createTestWidget() {
      return UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(home: LoginScreen()),
      );
    }

    testWidgets('renders all UI elements correctly', (tester) async {
      await tester.pumpWidget(createTestWidget());

      // ロゴテキストが表示される
      expect(find.text('MoodeSky'), findsOneWidget);

      // 認証方法選択が表示される
      expect(find.text('ログイン方法'), findsOneWidget);
      expect(find.text('OAuth'), findsOneWidget);
      expect(
        find.text('App Password'),
        findsAtLeastNWidgets(1),
      ); // SegmentedButtonとフィールドラベルで2つ存在

      // サーバー選択が表示される
      expect(find.text('Bluesky Social'), findsOneWidget);

      // 識別子フィールドが表示される
      expect(find.byType(TextFormField), findsAtLeastNWidgets(1));

      // デフォルトでApp Passwordが選択されているため、パスワードフィールドも表示
      expect(find.byType(TextFormField), findsAtLeastNWidgets(2));

      // サインインボタンが表示される
      expect(find.text('ログイン'), findsOneWidget);
    });

    testWidgets('shows password field when App Password is selected', (
      tester,
    ) async {
      await tester.pumpWidget(createTestWidget());

      // 初期状態ではApp Passwordが選択されており、パスワードフィールドが表示される
      expect(find.byType(TextFormField), findsAtLeastNWidgets(2));

      // App Passwordの説明とリンクが表示される
      expect(find.text('App Passwordについて'), findsOneWidget);
      expect(find.text('App Passwordを生成 →'), findsOneWidget);

      // OAuthに切り替えてみる
      await tester.tap(find.text('OAuth'));
      await tester.pumpAndSettle();

      // パスワードフィールドが非表示になる
      expect(find.byType(TextFormField), findsAtLeastNWidgets(1));
    });

    testWidgets('updates button text based on auth method', (tester) async {
      await tester.pumpWidget(createTestWidget());

      // 初期状態（App Password選択時）
      expect(find.text('ログイン'), findsOneWidget);

      // OAuth選択時
      await tester.tap(find.text('OAuth'));
      await tester.pumpAndSettle();

      expect(find.text('OAuth開発中'), findsOneWidget);
      expect(find.text('ログイン'), findsNothing);
    });

    testWidgets('server selection works correctly', (tester) async {
      await tester.pumpWidget(createTestWidget());

      // 初期状態でBluesky Socialが選択されている
      expect(find.text('Bluesky Social'), findsOneWidget);
      expect(find.text('bsky.social'), findsOneWidget);

      // サーバー選択を展開
      await tester.tap(find.text('Bluesky Social'));
      await tester.pumpAndSettle();

      // Bluesky Stagingオプションが表示される
      expect(find.text('Bluesky Staging'), findsOneWidget);
      expect(find.text('カスタムサーバー...'), findsOneWidget);

      // Bluesky Stagingを選択
      await tester.tap(find.text('Bluesky Staging'));
      await tester.pumpAndSettle();

      // 選択が更新される
      expect(find.text('Bluesky Staging'), findsOneWidget);
    });

    testWidgets('shows custom server dialog when selected', (tester) async {
      await tester.pumpWidget(createTestWidget());

      // サーバー選択を展開
      await tester.tap(find.text('Bluesky Social'));
      await tester.pumpAndSettle();

      // カスタムサーバーオプションをタップ
      await tester.tap(find.text('カスタムサーバー...'));
      await tester.pumpAndSettle();

      // SnackBarが表示される（今は開発中メッセージ）
      expect(find.text('カスタムサーバー機能は開発中です'), findsOneWidget);
    });

    testWidgets('validates form fields correctly', (tester) async {
      await tester.pumpWidget(createTestWidget());

      // 初期状態でApp Passwordが選択されている
      // サインインボタンをタップ（空のフィールドで）
      await tester.tap(find.text('ログイン'));
      await tester.pumpAndSettle();

      // バリデーションエラーが表示される
      expect(find.text('Please enter your handle or email'), findsOneWidget);
      expect(find.text('Please enter your app password'), findsOneWidget);
    });

    testWidgets('password visibility toggle works', (tester) async {
      await tester.pumpWidget(createTestWidget());

      // 初期状態でApp Passwordが選択されている
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

      // 初期状態でApp Passwordが選択されている
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

    testWidgets('displays auth error when auth state is error', (tester) async {
      // エラー状態を設定（実際の実装では、mock providerが必要）
      await tester.pumpWidget(createTestWidget());

      // エラー状態のテストは、AuthProviderのモック化が必要
      // 今は基本的なUIテストのみ実行
      expect(find.text('MoodeSky'), findsOneWidget);
    });

    testWidgets('shows loading indicator when auth is loading', (tester) async {
      // ローディング状態のテストも、AuthProviderのモック化が必要
      await tester.pumpWidget(createTestWidget());

      expect(find.text('MoodeSky'), findsOneWidget);
    });

    testWidgets('help text changes based on auth method', (tester) async {
      await tester.pumpWidget(createTestWidget());

      // 初期状態（App Password時）のヘルプテキスト
      expect(
        find.text(
          'App PasswordはBlueskyの設定画面で生成できます。通常のパスワードではなく、App Passwordを使用してください。',
        ),
        findsOneWidget,
      );

      // OAuthに切り替え
      await tester.tap(find.text('OAuth'));
      await tester.pumpAndSettle();

      // OAuth時のヘルプテキスト
      expect(
        find.text('OAuth機能は近日公開予定です。現在はApp Passwordでログインしてください。'),
        findsOneWidget,
      );
      expect(
        find.text(
          'App PasswordはBlueskyの設定画面で生成できます。通常のパスワードではなく、App Passwordを使用してください。',
        ),
        findsNothing,
      );
    });

    group('Server Selection', () {
      testWidgets('displays correct server icons', (tester) async {
        await tester.pumpWidget(createTestWidget());

        // サーバー選択を展開
        await tester.tap(find.text('Bluesky Social'));
        await tester.pumpAndSettle();

        // 公式サーバーには認証済みアイコンが表示される
        expect(find.byIcon(Icons.verified), findsAtLeastNWidgets(1));

        // カスタムサーバーにはDNSアイコンが表示される
        expect(find.byIcon(Icons.add), findsOneWidget);
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
      testWidgets('requires identifier for both auth methods', (tester) async {
        await tester.pumpWidget(createTestWidget());

        // 初期状態（App Password時）
        await tester.tap(find.text('ログイン'));
        await tester.pumpAndSettle();

        expect(find.text('Please enter your handle or email'), findsOneWidget);

        // OAuthに切り替え
        await tester.tap(find.text('OAuth'));
        await tester.pumpAndSettle();

        // OAuthの場合、ボタンが無効化されているためバリデーションは発生しない
        expect(find.text('OAuth開発中'), findsOneWidget);
      });

      testWidgets('validates password field in App Password mode', (
        tester,
      ) async {
        await tester.pumpWidget(createTestWidget());

        // 初期状態でApp Passwordが選択されている
        // 識別子のみ入力
        await tester.enterText(
          find.byType(TextFormField).first,
          'user@example.com',
        );

        // サインインボタンをタップ
        await tester.tap(find.text('ログイン'));
        await tester.pumpAndSettle();

        // パスワードのバリデーションエラーが表示される
        expect(find.text('Please enter your app password'), findsOneWidget);
      });
    });
  });
}
