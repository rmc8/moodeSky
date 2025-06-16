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

### 🌍 多言語対応
- **5言語サポート**: 日本語, 英語, ポルトガル語(ブラジル), 韓国語, ドイツ語
- **動的切り替え**: リアルタイム言語変更
- **ローカライゼーション**: 日付・時間・数値の地域化

### 🎨 テーマシステム
- **基本テーマ**: ライト・ダーク
- **拡張テーマ**: ハイコントラスト・カスタム・システム連動
- **リアルタイム切り替え**: 時間帯自動・カラム毎設定

### 🔗 外部ツール連携
- **Notion**: ブックマーク・メモ管理
- **Obsidian**: 知識管理
- **Zapier/IFTTT**: ワークフロー自動化
- **Discord/Slack**: 通知連携

### 🤖 AIエージェント機能
- **投稿生成支援**: 文章改善・要約・翻訳
- **感情分析**: 投稿のトーン分析
- **トレンド分析**: 話題の自動検出
- **課金方式**: サブスクリプション or 個人APIキー

## 🚀 技術スタック

- **フロントエンド**: [SvelteKit](https://kit.svelte.dev/) + TypeScript
- **バックエンド**: [Rust](https://www.rust-lang.org/) + [Tauri 2.0](https://tauri.app/)
- **AT Protocol**: [atrium-api](https://crates.io/crates/atrium-api)
- **モバイル**: [Tauri Mobile Alpha](https://tauri.app/v1/guides/getting-started/mobile/)
- **CI/CD**: GitHub Actions
- **パッケージ管理**: npm (フロントエンド), Cargo (バックエンド), uv (dev_rag)

## 📦 プロジェクト構成

```
moodeSky/
├── moodeSky/              # Tauri デスクトップ・モバイルアプリ
│   ├── src/               # SvelteKit フロントエンド
│   ├── src-tauri/         # Rust バックエンド
│   └── package.json
├── dev_rag/               # 開発支援RAGツール
│   ├── main.py            # Python CLI
│   ├── dev_rag/           # ベクトル化・検索機能
│   └── pyproject.toml
├── docs/                  # プロジェクトドキュメント
├── .github/               # GitHub Templates・Actions
└── CLAUDE.md              # 包括的開発ガイド
```

## 🛠 開発環境セットアップ

### 必要要件
- **Node.js**: 20+ (npm included)
- **Rust**: 1.75+ (with `rustup`)
- **Python**: 3.12+ (dev_ragツール用)
- **uv**: 0.1+ (Python パッケージ管理)

### デスクトップ開発

```bash
# リポジトリクローン
git clone https://github.com/YOUR_USERNAME/moodeSky.git
cd moodeSky

# メインアプリ開発
cd moodeSky
npm install
npm run tauri dev  # 推奨: フルアプリ開発
# または
npm run dev        # フロントエンドのみ開発
```

### RAG開発支援ツール

```bash
# RAGツールセットアップ
cd dev_rag
uv sync

# Qdrant起動 (Docker必要)
docker run -p 6333:6333 qdrant/qdrant

# ドキュメント vectorization
uv run dev-rag vector_all
```

### モバイル開発 (将来対応)

```bash
# Android開発環境
npm run tauri android init
npm run tauri android dev

# iOS開発環境 (macOS のみ)
npm run tauri ios init
npm run tauri ios dev
```

## 📋 開発コマンド

### 品質チェック
```bash
# TypeScript型チェック
npm run check

# Rust品質チェック
cd src-tauri
cargo check
cargo clippy
cargo test
```

### ビルド
```bash
# デスクトップアプリビルド
npm run tauri build

# プラットフォーム別ビルド
npm run tauri build --target x86_64-apple-darwin  # macOS Intel
npm run tauri build --target aarch64-apple-darwin # macOS ARM
```

## 🎯 開発ロードマップ

### Phase 1: コア機能 (3-4ヶ月)
- [ ] AT Protocol認証システム
- [ ] 基本UI・テーマシステム
- [ ] シングルアカウント対応
- [ ] 基本的なタイムライン表示
- [ ] 投稿作成・削除機能

### Phase 2: マルチアカウント・デッキ (2-3ヶ月)
- [ ] マルチアカウント認証管理
- [ ] デッキシステム実装
- [ ] カラム管理機能
- [ ] クロスアカウント操作

### Phase 3: 多言語・外部連携 (2-3ヶ月)
- [ ] i18n実装・翻訳
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

### コード品質
- **TypeScript**: 型エラーゼロ必須
- **Rust**: clippy警告ゼロ必須
- **テスト**: 新機能は必ずテスト追加
- **ドキュメント**: API変更時は必ず更新

詳細は [CLAUDE.md](CLAUDE.md) の「改良版開発フロー」を参照してください。

## 📚 ドキュメント

- **[CLAUDE.md](CLAUDE.md)**: 包括的開発ガイド・プロダクト仕様
- **[開発ルール](docs/DEVELOPMENT_RULES.md)**: 詳細な開発ワークフロー
- **[プラットフォーム対応](docs/PLATFORM_SUPPORT.md)**: マルチプラットフォーム戦略
- **[Bluesky統合](docs/BLUESKY_INTEGRATION.md)**: AT Protocol統合ガイド
- **[PEP原則](docs/PEP_PRINCIPLES.md)**: コード品質・設計哲学

## 🏆 差別化要素

### 技術的優位性
- **Tauri活用**: Web技術 + ネイティブパフォーマンス
- **メモリ効率**: Electronより軽量
- **セキュリティ**: Rust言語の安全性
- **マルチプラットフォーム**: 単一コードベースで全対応

### UX/UI優位性
- **デッキ特化**: パワーユーザー向け専用設計
- **カスタマイズ性**: 高度な個人化機能
- **アクセシビリティ**: 包括的なユーザビリティ
- **レスポンシブ**: 全デバイスで一貫したUX

### 機能的優位性
- **外部連携**: 豊富なサードパーティ統合
- **AIエージェント**: 次世代のSNS管理支援
- **プライバシー重視**: ユーザーデータ保護
- **オープンソース**: 透明性とコミュニティ

## 📄 ライセンス

このプロジェクトは [MIT License](LICENSE) のもとで公開されています。

## 🙏 謝辞

- **[Tauri Team](https://tauri.app/)**: 素晴らしいフレームワーク
- **[Bluesky Team](https://bsky.app/)**: AT Protocolの開発
- **[SvelteKit Team](https://kit.svelte.dev/)**: 優秀なフロントエンドフレームワーク
- **[Rust Community](https://www.rust-lang.org/)**: 安全で高速な言語

---

**moodeSky** で、より良いソーシャルメディア体験を 🌟