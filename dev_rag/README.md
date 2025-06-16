# atproto-rag

AT Protocol repository vectorization for RAG with Qdrant MCP

## 概要

AT Protocol関連のリポジトリ（atproto.dart）とFlutter公式ドキュメントをベクトル化してQdrantに保存し、Claude Code MCPでRAG検索を可能にするツールです。

## 特徴

- **リポジトリ対応**: GitHub リポジトリの自動クローンと更新
- **多形式対応**: Dart、Markdown、MDX、JSON、YAMLファイルの処理
- **埋め込み**: 高性能なFastEmbedライブラリ（BAAI/bge-small-en-v1.5）使用
- **Qdrant統合**: ベクトルデータベースQdrantとの完全統合
- **MCP対応**: Claude Code MCP経由での検索機能

## 必要条件

- Python 3.12+
- [Qdrant](http://localhost:6333)サーバーが起動している必要があります
- uvまたはpip

## インストール

```bash
# 依存関係のインストール
uv sync

# または
pip install -e .
```

## 使用方法

### 1. Qdrantサーバーの起動

```bash
# Dockerで起動（推奨）
docker run -p 6333:6333 qdrant/qdrant
```

### 2. リポジトリのベクトル化

#### AT Protocol (atproto.dart)

```bash
# デフォルト設定で実行
uv run atproto-rag vectorize

# カスタム設定で実行
uv run atproto-rag vectorize \
  --repo-url https://github.com/myConsciousness/atproto.dart.git \
  --collection atproto-dart \
  --embedding-model BAAI/bge-small-en-v1.5 \
  --include-tests
```

#### Flutter公式ドキュメント

```bash
# デフォルト設定で実行
uv run atproto-rag vec-flutter

# カスタム設定で実行
uv run atproto-rag vec-flutter \
  --repo-url https://github.com/flutter/website.git \
  --collection flutter-docs \
  --batch-size 50 \
  --include-tests
```

#### ローカルFlutterプロジェクト

```bash
# 現在のFlutterプロジェクトをベクトル化
uv run atproto-rag vec-moode \
  --flutter-dir /path/to/flutter/project \
  --collection my-flutter-project
```

### 3. 検索

```bash
# ベクトル化されたデータの検索
uv run atproto-rag search "how to authenticate with atproto" --collection atproto-dart
uv run atproto-rag search "Flutter widget lifecycle" --collection flutter-docs
uv run atproto-rag search "create a post" --collection atproto-dart
uv run atproto-rag search "websocket connection" --collection atproto-dart
```

### 4. ステータス確認

```bash
# コレクションのステータス確認
uv run atproto-rag status --collection atproto-dart
uv run atproto-rag status --collection flutter-docs
uv run atproto-rag status --collection moodeSky
```

## Claude Code MCP統合

### ステップ1: MCP設定生成

```bash
# AT Protocol用のMCP設定
uv run atproto-rag setup-mcp --collection atproto-dart

# Flutter公式ドキュメント用のMCP設定
uv run atproto-rag setup-mcp --collection flutter-docs

# ローカルFlutterプロジェクト用のMCP設定
uv run atproto-rag setup-mcp --collection moodeSky
```

### ステップ2: Claude Codeへの追加

```bash
# AT Protocol RAG
claude mcp add atproto-dart-rag \
  -e QDRANT_URL="http://localhost:6333" \
  -e COLLECTION_NAME="atproto-dart" \
  -e EMBEDDING_MODEL="BAAI/bge-small-en-v1.5" \
  -e TOOL_STORE_DESCRIPTION="Store atproto.dart documentation, API references, and code examples." \
  -e TOOL_FIND_DESCRIPTION="Search for atproto.dart related information including API usage, method descriptions, implementation examples, and documentation." \
  -- uvx mcp-server-qdrant

# Flutter公式ドキュメントRAG
claude mcp add flutter-docs-rag \
  -e QDRANT_URL="http://localhost:6333" \
  -e COLLECTION_NAME="flutter-docs" \
  -e EMBEDDING_MODEL="BAAI/bge-small-en-v1.5" \
  -e TOOL_STORE_DESCRIPTION="Store Flutter official documentation, guides, and examples." \
  -e TOOL_FIND_DESCRIPTION="Search for Flutter documentation including widgets, APIs, tutorials, and best practices." \
  -- uvx mcp-server-qdrant
```

### ステップ3: .mcp.json設定

複数のコレクションを一度に設定する場合は`.mcp.json`ファイルに追加してClaude Codeで使用できます。

## Claude Code での使用例

ベクトル化完了後、Claude Code で以下のような質問が可能になります：

```
> atproto.dartでの認証方法を教えて

> Flutterのウィジェットライフサイクルについて

> BlueSkyのPost作成方法は？

> atproto.dartのWebSocket接続の実装

> FeedGeneratorの作成方法を教えて

> FlutterのStateManagementのベストプラクティス
```

## 利用可能なコマンド

| コマンド | 説明 | 対応ファイル形式 |
|----------|------|------------------|
| `vectorize` | AT Protocol関連リポジトリをベクトル化 | .dart, .md, .json |
| `vec-flutter` | Flutter公式ドキュメントをベクトル化 | .md, .mdx, .dart, .json, .yaml/.yml |
| `vec-moode` | ローカルFlutterプロジェクトをベクトル化 | .dart, .md, .json |
| `search` | ベクトルデータの検索 | - |
| `status` | コレクションのステータス確認 | - |
| `setup-mcp` | MCP設定の生成 | - |

## プロジェクト構造 

```
atproto_rag/
├── __init__.py          # パッケージ初期化
├── main.py             # CLIエントリーポイント
├── models.py           # データモデル（Pydantic）
└── vectorizer.py       # ベクトル化処理
```

## コマンドオプション

### 共通オプション

| オプション | デフォルト | 説明 |
|-----------|------------|------|
| `--qdrant-url` | `http://localhost:6333` | Qdrantサーバー URL |
| `--embedding-model` | `BAAI/bge-small-en-v1.5` | 埋め込みモデル |
| `--batch-size` | `100` | ベクトル化バッチサイズ |
| `--include-tests` | `False` | テストファイル含める |
| `--include-generated` | `False` | ファイル（.g.dart）含める |

### vectorize コマンド

| オプション | デフォルト | 説明 |
|-----------|------------|------|
| `--repo-url` | atproto.dartのURL | 対象リポジトリURL |
| `--clone-dir` | `~/.cache/atproto-rag/repos` | クローン先ディレクトリ |
| `--collection` | `atproto-dart` | Qdrantコレクション名 |

### vec-flutter コマンド

| オプション | デフォルト | 説明 |
|-----------|------------|------|
| `--repo-url` | Flutter website URL | Flutter公式ドキュメントURL |
| `--clone-dir` | `~/.cache/atproto-rag/repos` | クローン先ディレクトリ |
| `--collection` | `flutter-docs` | Qdrantコレクション名 |

### vec-moode コマンド

| オプション | デフォルト | 説明 |
|-----------|------------|------|
| `--flutter-dir` | `../` | Flutterプロジェクトディレクトリ |
| `--collection` | `moodeSky` | Qdrantコレクション名 |

## 開発

```bash
# 開発環境での依存関係インストール
uv sync --dev

# コード品質チェック
uv run black .
uv run ruff check .

# テスト実行
uv run pytest
```

## トラブルシューティング

### Qdrant接続エラー
- Qdrantサーバーが起動していることを確認
- URLとポート番号が正しいことを確認

### 埋め込みエラー
- メモリ不足の場合は`--batch-size`を小さくする
- ネットワーク接続を確認

### パフォーマンス
- `--batch-size`を調整してパフォーマンス最適化
- 大きなリポジトリの場合は`--include-tests false`を使用

## ライセンス

このプロジェクトはMITライセンスの下で提供されています。