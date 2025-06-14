# CLAUDE.md

**Speak in Japanese!**

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

**moodeSky** is a deck-style Bluesky client built on the AT Protocol, featuring a TweetDeck-like multi-column interface. It provides multi-account management, OAuth/App Password authentication, Drift ORM database persistence, and comprehensive internationalization support.

### Key Features

- **Deck-based UI**: Multi-column timeline interface for simultaneous timeline viewing
- **Multi-account support**: Manage multiple Bluesky accounts simultaneously
- **Responsive design**: Mobile, tablet, and desktop optimized layouts
- **Internationalization**: Japanese, English, Korean, German, Portuguese (Brazil) support
- **Modern Flutter architecture**: Riverpod code generation with Clean Architecture patterns

## Essential Commands

### Development Setup

```bash
# Install dependencies
flutter pub get

# Optimized build (recommended - uses build_optimization.yaml)
./scripts/optimized_build.sh

# Watch mode for development
./scripts/optimized_build.sh --watch

# Clean build with analysis
./scripts/optimized_build.sh --clean --analyze
```

### Code Generation (Critical)

This project heavily relies on Riverpod and Drift code generation:

```bash
# Generate all code (uses optimized config)
dart run build_runner build --delete-conflicting-outputs --config=build_optimization.yaml

# Watch mode during development
dart run build_runner watch --delete-conflicting-outputs --config=build_optimization.yaml

# Clean and rebuild
dart run build_runner clean
dart run build_runner build --delete-conflicting-outputs
```

### Testing & Quality

```bash
flutter test                    # Run all tests
flutter analyze                 # Static analysis
dart format .                   # Format code
dart run import_sorter:main     # Organize imports
```

## Architecture Overview

### Project Structure

- **`lib/core/`**: Cross-cutting concerns (providers, themes, utilities)
- **`lib/features/`**: Feature modules (auth, home, settings)
- **`lib/services/`**: External integrations (database, Bluesky API)
- **`lib/shared/`**: Reusable components and models

### State Management with Riverpod Code Generation

Always use `@riverpod` annotations for providers:

```dart
// Class-based provider (recommended for complex state)
@riverpod
class AuthNotifier extends _$AuthNotifier {
  // Auto-generated providers handle dependencies
}

// Function-based provider (for simple data fetching)
@riverpod
Future<List<Post>> timelinePosts(TimelinePostsRef ref) async {
  final api = ref.watch(blueskyApiProvider);
  return api.getTimeline();
}

// Widget usage with proper AsyncValue handling
class MyWidget extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authNotifierProvider);
    return authState.when(
      data: (user) => Text('Hello ${user.handle}'),
      loading: () => CircularProgressIndicator(),
      error: (error, stack) => Text('Error: $error'),
    );
  }
}
```

### Database Architecture (Drift ORM)

- **Migration-based schema**: See `lib/services/database/database.dart`
- **DAO pattern**: Data access in `lib/services/database/daos/`
- **Generated classes**: Use `@DataClassName` annotations

Key tables: `Accounts` (multi-account), `Decks` (timeline columns), `UserPreferences`

### Deck System (Core Feature)

Multi-column timeline interface with:

- **Responsive breakpoints**: Mobile (<600px), Tablet (600-1200px), Desktop (>1200px)
- **Drag & drop support**: ReorderableListView for deck reordering
- **Infinite scroll**: Virtual PageView for seamless navigation
- **Account integration**: Per-deck or cross-account timelines

## MCP Integration

Leverage MCP servers for development (configured in `.mcp.json`):

### Todoist Task Management (Required Workflow)

```bash
# 1. Create task before starting work (save TaskID!)
mcp_todoist_create_task "moodeSky: Fix deck drag & drop"
# Returns TaskID: "2024xxxxx" - SAVE THIS!

# 2. Close task when complete
mcp_todoist_close_task --id "2024xxxxx"

# 3. Add comments during development
mcp_todoist_create_task_comment --task-id "2024xxxxx" --content "Implementation complete"
```

**Critical**: Always save the TaskID returned from task creation. Required for closing, commenting, and creating subtasks.

### Bluesky API 実装・検証ワークフロー（必須）

**Bluesky API 関連の実装時は必ず以下の順序で仕様確認**：

#### 1. RAG 検索（AT Protocol 情報）

```bash
# API仕様・メソッド詳細を検索
mcp_atproto_dart_rag_find --query "app.bsky.feed.getTimeline parameters"
mcp_atproto_dart_rag_find --query "com.atproto.repo.createRecord lexicon"
mcp_atproto_dart_rag_find --query "DID resolution authentication"

# 実装例・エラーハンドリングを検索
mcp_atproto_dart_rag_find --query "bluesky post creation implementation example"
mcp_atproto_dart_rag_find --query "OAuth DPoP token refresh error handling"
```

#### 2. Web 検索（公式ドキュメント・仕様確認）

```bash
# Lexicon仕様確認
WebSearch --query "site:atproto.com lexicon app.bsky.feed.getTimeline"
WebSearch --query "site:github.com/bluesky-social/atproto lexicon"

# atproto.dart実装参考
WebSearch --query "site:github.com/myConsciousness/atproto.dart"
WebSearch --query "atproto.dart bluesky client implementation example"

# AT Protocol公式ドキュメント
WebFetch --url "https://atproto.com/guides/applications"
WebFetch --url "https://atproto.com/lexicons/app-bsky"
```

#### 3. 実際の API 検証・テスト

```bash
# 基本API動作確認
mcp_bluesky_get_timeline     # Timeline取得テスト
mcp_bluesky_get_profile      # Profile構造確認
mcp_bluesky_search_posts     # 検索機能テスト

# データ作成・更新系のテスト
mcp_bluesky_post --text "API実装テスト投稿"
mcp_bluesky_like --uri "at://..." --cid "..."

# エラーパターンの確認
mcp_bluesky_get_profile --actor "invalid-handle"  # エラーレスポンス確認
```

#### 4. 重要な参照先

- **AT Protocol Lexicons**: <https://atproto.com/lexicons/>
- **atproto.dart Repository**: <https://github.com/myConsciousness/atproto.dart>
- **Bluesky API Guide**: <https://docs.bsky.app/>
- **AT Protocol Specs**: <https://atproto.com/specs/>

**実装時の注意**：新しい API エンドポイント使用前は必ず上記 1→2→3 の順序で仕様確認を実行

### Advanced MCP Tools (必須活用)

#### Sequential Thinking (必須)

複雑なタスクには必ず sequential-thinking を使用：

```bash
# 複雑な問題の分析・設計時に使用
mcp_sequential_thinking --thought "タスクの複雑性を分析し、実装戦略を立てる"
```

**使用すべき場面**：

- 新機能の設計・実装前の思考整理
- バグ修正の原因分析
- アーキテクチャ変更の影響範囲検討
- 複数の解決策を比較検討する場合

#### Context7 (コンテキスト管理)

Upstash ベースのコンテキスト保存・検索システム：

```bash
# 重要な情報を保存
mcp_context7_store --information "実装詳細や決定事項"

# 過去の情報を検索
mcp_context7_find --query "関連する実装や課題"
```

#### その他の MCP ツール

- **dart-sdk**: Dart/Flutter development assistance

## Development Practices

### EffectiveDart Compliance (Required)

```dart
// Good: Clear naming
final userTimeline = await getTimeline(userId);

// Good: Proper null safety
String? get displayName => user?.profile?.displayName;

// Good: Const constructors
const AppTheme({
  required this.primaryColor,
  required this.backgroundColor,
});
```

### Test-Driven Development (Mandatory)

Write tests before implementation:

```dart
// test/features/auth/auth_service_test.dart
void main() {
  group('AuthService', () {
    test('should login successfully with valid credentials', () async {
      // Given
      final authService = AuthService();

      // When
      final result = await authService.login('user', 'pass');

      // Then
      expect(result.isSuccess, true);
    });
  });
}
```

### Required Workflow (必須プロセス)

**任意のタスクを開始する前に必ず実行**：

1. **Sequential Thinking** でタスクを分析

    ```bash
    # 複雑性・実装戦略・リスクを事前分析
    mcp_sequential_thinking --thought "タスクの分析開始"
    ```

2. **Todoist Task 作成**（TaskID 保存必須）

    ```bash
    # メインタスク作成
    mcp_todoist_create_task "[moodeSky] 具体的なタスク名"
    # 返却されたTaskIDを必ず記録
    ```

3. **Context7 でコンテキスト確認**

    ```bash
    # 関連する過去の実装・決定事項を検索
    mcp_context7_find --query "関連キーワード"
    ```

4. **Test-Driven Development**

    - テストを先に記述
    - EffectiveDart 準拠で実装

5. **品質チェック**

    - `flutter analyze`で static analysis
    - `flutter test`でテスト実行

6. **タスク完了処理**

    ```bash
    # 重要な実装情報をContext7に保存
    mcp_context7_store --information "実装詳細・注意点・決定事項"

    # TodoistタスクをClose
    mcp_todoist_close_task --id "保存したTaskID"
    ```

**重要**: 上記プロセスを省略せず、必ず全ステップを実行すること。

### Continuous Refactoring

- Daily code reviews for readability/maintainability
- Address TODO/FIXME comments regularly
- Monitor build times and app performance

## Internationalization

### Adding Strings

1. Add to `.arb` files in `lib/l10n/`
2. Run `flutter gen-l10n`
3. Use: `AppLocalizations.of(context).myStringKey`

### Supported Locales

English (primary), Japanese, Korean, German, Portuguese (Brazil)

## Common Issues & Solutions

### Code Generation Failures

Run `flutter clean && flutter pub get` before `build_runner` if generation fails.

### Import Conflicts

```dart
// When Drift Column conflicts with Flutter Column
import 'package:drift/drift.dart' hide Column;
```

### OAuth Development

Mobile OAuth requires ngrok setup。See `DEVELOPMENT.md` for configuration。

### Database Migrations

Validate with: `dart run drift_dev schema validate lib/services/database/database.dart`

## Performance Optimization

### Build Performance

- Use `./scripts/optimized_build.sh` for faster builds
- Leverage `build_optimization.yaml` configuration
- Use `--watch` mode during development

### Runtime Performance

- Prefer `AsyncValue` for loading states
- Use `family` providers for parameterized data
- Implement proper disposal in `StateNotifier` classes
- Index frequently queried database columns

### Monitoring

```bash
time ./scripts/optimized_build.sh    # Build time measurement
flutter run --profile                # Performance profiling
flutter run --trace-startup          # Startup analysis
```
