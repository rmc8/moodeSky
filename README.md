# 🌙 moodeSky

**AT Protocol (Bluesky) 専用のマルチプラットフォーム対応デッキ型クライアント**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Made with Tauri](https://img.shields.io/badge/Made%20with-Tauri-orange)](https://tauri.app)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?logo=svelte&logoColor=white)](https://kit.svelte.dev)
[![Rust](https://img.shields.io/badge/Rust-000000?logo=rust&logoColor=white)](https://www.rust-lang.org)

## ✨ 特徴

### 🏗 デッキ方式UI
- **TweetDeck風インターフェース**: 複数カラムの同時表示
- **カスタマイズ可能**: ドラッグ&ドロップでカラム配置調整
- **レスポンシブ対応**: デスクトップからモバイルまで最適化

### 👥 マルチアカウント対応
- **同時運用**: アカウント切り替えではなく並行処理
- **統合タイムライン**: 全アカウントの投稿を一括表示
- **独立セッション**: アカウント毎のセキュアな認証管理

### 🌐 マルチプラットフォーム
- **デスクトップ**: macOS, Windows, Linux
- **モバイル**: iOS, Android (Tauri Mobile Alpha)
- **単一コードベース**: 全プラットフォームで一貫したUX

### 🌍 多言語対応 ✅ **実装完了**
- **5言語サポート**: 日本語, 英語, ポルトガル語(ブラジル), 韓国語, ドイツ語
- **型安全翻訳**: Paraglide-JS v2による完全型安全システム
- **システム言語検出**: Tauri OS Pluginによるネイティブ言語検出
- **動的切り替え**: リアルタイム言語変更・永続化対応

### 🎨 テーマシステム ✅ **実装完了**
- **統合テーマシステム**: TailwindCSS v4 + CSS Variables
- **3テーマ対応**: Sky (ライト), Sunset (ダーク), ハイコントラスト
- **WCAG準拠**: AA基準以上のアクセシビリティ保証
- **レガシー排除**: `dark:` プレフィックス完全禁止の革新設計

### 🔐 認証システム ✅ **実装完了**
- **AT Protocol統合**: @atproto/api + 公式型定義活用
- **Tauri Store Plugin**: セキュア暗号化ストレージ
- **マイグレーション機能**: localStorage → Store Plugin自動移行
- **エラーハンドリング**: 堅牢な認証フロー・セッション管理

### 🔗 外部ツール連携 (将来対応)
- **Notion**: ブックマーク・メモ管理
- **Obsidian**: 知識管理
- **Zapier/IFTTT**: ワークフロー自動化
- **Discord/Slack**: 通知連携

### 🤖 AIエージェント機能 (将来対応)
- **投稿生成支援**: 文章改善・要約・翻訳
- **感情分析**: 投稿のトーン分析
- **トレンド分析**: 話題の自動検出
- **課金方式**: サブスクリプション or 個人APIキー

## 🚀 技術スタック

- **フロントエンド**: [SvelteKit](https://kit.svelte.dev/) + TypeScript (SPA構成)
  - **Svelte 5**: 最新版フレームワーク (runes使用)
  - **TailwindCSS v4**: 最新ユーティリティファーストCSS
- **バックエンド**: [Rust](https://www.rust-lang.org/) + [Tauri 2.0](https://tauri.app/)
- **多言語化**: [Paraglide-JS v2](https://inlang.com/m/gerre34r) + Tauri OS Plugin
- **状態管理**: 
  - **Tauri Store Plugin**: 永続化設定・認証管理
  - **Svelte 5 runes**: リアクティブ状態管理
- **AT Protocol**: [@atproto/api](https://github.com/bluesky-social/atproto) (公式TypeScript SDK)
- **モバイル**: [Tauri Mobile Alpha](https://tauri.app/v1/guides/getting-started/mobile/)
- **パッケージ管理**: **pnpm** (フロントエンド), Cargo (バックエンド), uv (dev_rag)

## 📦 プロジェクト構成

```
moodeSky/
├── moodeSky/              # Tauri デスクトップ・モバイルアプリ
│   ├── src/               # SvelteKit フロントエンド
│   │   ├── lib/
│   │   │   ├── i18n/      # 多言語化システム (Paraglide-JS v2)
│   │   │   ├── components/ # Svelte 5 コンポーネント
│   │   │   ├── stores/    # Svelte 5 runes ストア
│   │   │   └── services/  # ビジネスロジック
│   │   └── routes/        # SvelteKit ルーティング
│   ├── src-tauri/         # Rust バックエンド
│   └── package.json       # pnpm管理
├── dev_rag/               # 開発支援RAGツール
│   ├── main.py            # Python CLI
│   ├── dev_rag/           # ベクトル化・検索機能
│   └── pyproject.toml
├── docs/                  # プロジェクトドキュメント
├── .github/               # GitHub Templates・Actions
└── CLAUDE.md              # 包括的開発ガイド (最重要)
```

## 🛠 開発環境セットアップ

### 必要要件
- **Node.js**: 20+ 
- **pnpm**: 8+ (**重要**: npmではなくpnpm必須)
- **Rust**: 1.75+ (with `rustup`)
- **Python**: 3.12+ (dev_ragツール用, 任意)
- **uv**: 0.1+ (Python パッケージ管理, 任意)

### メイン開発

```bash
# リポジトリクローン
git clone https://github.com/rmc8/moodeSky.git
cd moodeSky/moodeSky

# 依存関係インストール (pnpm必須)
pnpm install

# 開発サーバー起動
pnpm run tauri dev  # 推奨: フルアプリ開発 (フロントエンド + バックエンド)
# または
pnpm run dev        # フロントエンドのみ開発 (Tauri機能不要時)
```

### RAG開発支援ツール (任意)

```bash
# RAGツールセットアップ
cd ../dev_rag
uv sync

# Qdrant起動 (Docker必要)
docker run -p 6333:6333 qdrant/qdrant

# ドキュメント vectorization
uv run dev-rag vector_all
```

### モバイル開発 (Tauri Mobile Alpha)

```bash
cd moodeSky

# Android開発環境
pnpm run tauri android init
pnpm run tauri android dev

# iOS開発環境 (macOS のみ)
pnpm run tauri ios init
pnpm run tauri ios dev
```

## 📋 開発コマンド

### 品質チェック
```bash
# TypeScript型チェック (翻訳関数含む)
pnpm run check

# Rust品質チェック
cd src-tauri
cargo check
cargo clippy
cargo test
```

### 多言語化
```bash
# 翻訳ファイル再コンパイル
npx @inlang/paraglide-js compile --project ./project.inlang

# 翻訳ファイルの場所: src/lib/i18n/locales/
```

### ビルド
```bash
# デスクトップアプリビルド
pnpm run tauri build

# プラットフォーム別ビルド
pnpm run tauri build --target x86_64-apple-darwin  # macOS Intel
pnpm run tauri build --target aarch64-apple-darwin # macOS ARM
```

## 🎯 開発ロードマップ

### Phase 1: コア機能 (3-4ヶ月) - **進行中**
- [x] **AT Protocol認証システム** - ✅ 完了 (Tauri Store Plugin + @atproto/api)
- [x] **基本UI・テーマシステム** - ✅ 完了 (TailwindCSS v4 + 統合テーマ)
- [x] **シングルアカウント対応** - ✅ 完了 (Store Plugin セキュア管理)
- [x] **多言語化システム** - ✅ 完了 (Paraglide-JS v2 + 5言語対応)
- [ ] 基本的なタイムライン表示 - 🚧 次期実装
- [ ] 投稿作成・削除機能 - 🚧 次期実装

### Phase 2: マルチアカウント・デッキ (2-3ヶ月)
- [ ] マルチアカウント認証管理
- [ ] デッキシステム実装
- [ ] カラム管理機能
- [ ] クロスアカウント操作

### Phase 3: マルチアカウント・外部連携 (2-3ヶ月)
- [x] **i18n実装・翻訳** - ✅ 完了 (5言語完全対応)
- [ ] マルチアカウント認証管理 - 🚧 移行
- [ ] 外部ツール連携API
- [ ] プラグインシステム
- [ ] 高度なフィルタリング

### Phase 4: AIエージェント・高度機能 (3-4ヶ月)
- [ ] AIエージェント統合
- [ ] 課金システム
- [ ] 高度な分析機能
- [ ] 自動化ワークフロー

### Phase 5: モバイル最適化・配布 (2-3ヶ月)
- [ ] Tauri Mobile完全対応
- [ ] モバイルUI最適化
- [ ] アプリストア申請・配布
- [ ] パフォーマンス最適化

## 🤝 貢献ガイド

### 開発フロー
1. **Issue作成**: 機能要件・バグ報告は[GitHub Issues](../../issues)で
2. **ブランチ作成**: `feature/issue-123-description` 形式
3. **開発**: Issue-driven + Test-Driven Development
4. **PR作成**: [PRテンプレート](.github/pull_request_template.md)使用
5. **レビュー**: CI/CD通過 + コードレビュー
6. **マージ**: Squash merge + Issue自動クローズ

### コード品質基準
- **TypeScript**: 型エラーゼロ必須 (`pnpm run check`)
- **Rust**: clippy警告ゼロ必須 (`cargo clippy`)
- **テーマ**: `dark:` プレフィックス使用**絶対禁止**
- **多言語化**: ハードコード文字列は翻訳関数必須
- **パッケージ管理**: npmではなく**pnpm必須**

詳細は [CLAUDE.md](CLAUDE.md) の「改良版開発フロー」を参照してください。

## 📚 ドキュメント

- **[CLAUDE.md](CLAUDE.md)**: 包括的開発ガイド・プロダクト仕様 (**最重要**)
- **[開発ルール](docs/DEVELOPMENT_RULES.md)**: 詳細な開発ワークフロー
- **[プラットフォーム対応](docs/PLATFORM_SUPPORT.md)**: マルチプラットフォーム戦略
- **[Bluesky統合](docs/BLUESKY_INTEGRATION.md)**: AT Protocol統合ガイド

## 🏆 差別化要素

### 技術的優位性
- **Tauri 2.0活用**: Web技術 + ネイティブパフォーマンス
- **メモリ効率**: Electronより軽量・高速
- **セキュリティ**: Rust言語の安全性 + Tauri Store暗号化
- **マルチプラットフォーム**: 単一コードベースで全対応

### UX/UI優位性
- **デッキ特化**: パワーユーザー向け専用設計
- **カスタマイズ性**: 高度な個人化機能
- **アクセシビリティ**: WCAG AA基準以上準拠
- **レスポンシブ**: 全デバイスで一貫したUX

### 機能的優位性
- **完全型安全**: TypeScript + Rust + Paraglide-JS
- **多言語ネイティブ**: OS言語検出 + 5言語対応
- **プライバシー重視**: ローカル暗号化 + ゼロ知識原則
- **オープンソース**: 透明性とコミュニティ

## 🛡️ セキュリティ

- **認証情報暗号化**: Tauri Store Pluginによるセキュアストレージ
- **ゼロ知識原則**: サーバーでの個人データ非保存
- **CSP設定**: Tauri セキュリティ設定準拠
- **定期監査**: 依存関係脆弱性チェック

## 📊 パフォーマンス目標

- **アプリ起動時間**: 3秒以内
- **API応答時間**: 2秒以内
- **UI操作応答**: 100ms以内
- **メモリ使用量**: アイドル時100MB以下

## 📄 ライセンス

このプロジェクトは [MIT License](LICENSE) のもとで公開されています。

## 🙏 謝辞

- **[Tauri Team](https://tauri.app/)**: 革新的なクロスプラットフォームフレームワーク
- **[Bluesky Team](https://bsky.app/)**: AT Protocolの開発と分散SNSの実現
- **[SvelteKit Team](https://kit.svelte.dev/)**: 高性能フロントエンドフレームワーク
- **[Paraglide-JS Team](https://inlang.com/m/gerre34r)**: 型安全多言語化システム
- **[Rust Community](https://www.rust-lang.org/)**: 安全で高速な言語とエコシステム

---

**moodeSky** で、より良いソーシャルメディア体験を 🌟