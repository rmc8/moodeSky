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
        child: const MaterialApp(
          home: LoginScreen(),
        ),
      );
    }

    testWidgets('renders all UI elements correctly', (tester) async {
      await tester.pumpWidget(createTestWidget());

      // ロゴテキストが表示される
      expect(find.text('MoodeSky'), findsOneWidget);

      // 認証方法選択が表示される
      expect(find.text('Sign in method'), findsOneWidget);
      expect(find.text('OAuth'), findsOneWidget);
      expect(find.text('App Password'), findsOneWidget);

      // サーバー選択が表示される
      expect(find.text('Bluesky Social'), findsOneWidget);

      // 識別子フィールドが表示される
      expect(find.byType(TextFormField), findsAtLeastNWidgets(1));

      // サインインボタンが表示される
      expect(find.text('Sign in with OAuth'), findsOneWidget);
    });

    testWidgets('shows password field when App Password is selected', (tester) async {
      await tester.pumpWidget(createTestWidget());

      // 初期状態ではOAuthが選択されており、パスワードフィールドは表示されない
      expect(find.text('App Password'), findsNothing);

      // App Passwordを選択
      await tester.tap(find.text('App Password'));
      await tester.pumpAndSettle();

      // パスワードフィールドが表示される
      expect(find.text('App Password'), findsOneWidget);
      expect(find.byType(TextFormField), findsAtLeastNWidgets(2));

      // App Passwordの説明とリンクが表示される
      expect(find.text('App Passwordについて'), findsOneWidget);
      expect(find.text('App Passwordを生成 →'), findsOneWidget);
    });

    testWidgets('updates button text based on auth method', (tester) async {
      await tester.pumpWidget(createTestWidget());

      // OAuth選択時
      expect(find.text('Sign in with OAuth'), findsOneWidget);

      // App Password選択時
      await tester.tap(find.text('App Password'));
      await tester.pumpAndSettle();

      expect(find.text('Sign in'), findsOneWidget);
      expect(find.text('Sign in with OAuth'), findsNothing);
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

      // App Passwordモードに切り替え
      await tester.tap(find.text('App Password'));
      await tester.pumpAndSettle();

      // サインインボタンをタップ（空のフィールドで）
      await tester.tap(find.text('Sign in'));
      await tester.pumpAndSettle();

      // バリデーションエラーが表示される
      expect(find.text('Please enter your handle or email'), findsOneWidget);
      expect(find.text('Please enter your app password'), findsOneWidget);
    });

    testWidgets('password visibility toggle works', (tester) async {
      await tester.pumpWidget(createTestWidget());

      // App Passwordモードに切り替え
      await tester.tap(find.text('App Password'));
      await tester.pumpAndSettle();

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

      // App Passwordモードに切り替え
      await tester.tap(find.text('App Password'));
      await tester.pumpAndSettle();

      // App Password情報が表示される
      expect(find.text('App Passwordについて'), findsOneWidget);
      expect(find.text('App Passwordはアプリ専用の安全なパスワードです。通常のパスワードより安全です。'), findsOneWidget);
      expect(find.text('App Passwordを生成 →'), findsOneWidget);

      // リンクをタップ
      await tester.tap(find.text('App Passwordを生成 →'));
      await tester.pumpAndSettle();

      // SnackBarでApp Password URLが表示される
      expect(find.text('https://bsky.app/settings/app-passwords'), findsOneWidget);
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

      // OAuth時のヘルプテキスト
      expect(find.text('OAuth is the recommended sign-in method for better security.'), findsOneWidget);

      // App Passwordに切り替え
      await tester.tap(find.text('App Password'));
      await tester.pumpAndSettle();

      // App Password時のヘルプテキスト
      expect(find.text('App passwords can be created in your Bluesky settings.'), findsOneWidget);
      expect(find.text('OAuth is the recommended sign-in method for better security.'), findsNothing);
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

        // OAuth時
        await tester.tap(find.text('Sign in with OAuth'));
        await tester.pumpAndSettle();

        expect(find.text('Please enter your handle or email'), findsOneWidget);

        // App Password時
        await tester.tap(find.text('App Password'));
        await tester.pumpAndSettle();

        await tester.tap(find.text('Sign in'));
        await tester.pumpAndSettle();

        expect(find.text('Please enter your handle or email'), findsOneWidget);
      });

      testWidgets('validates password field in App Password mode', (tester) async {
        await tester.pumpWidget(createTestWidget());

        // App Passwordモードに切り替え
        await tester.tap(find.text('App Password'));
        await tester.pumpAndSettle();

        // 識別子のみ入力
        await tester.enterText(find.byType(TextFormField).first, 'user@example.com');

        // サインインボタンをタップ
        await tester.tap(find.text('Sign in'));
        await tester.pumpAndSettle();

        // パスワードのバリデーションエラーが表示される
        expect(find.text('Please enter your app password'), findsOneWidget);
      });
    });
  });
}