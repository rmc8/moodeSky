# CLAUDE.md

**Speak in Japanese!**

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**moodeSky** は、Tauriを使用したマルチプラットフォーム対応のBlueskyクライアントアプリケーションです。

### プロジェクト構成
1. **moodeSky** - Tauri デスクトップ・モバイルアプリ (SvelteKit + Rust)
2. **dev_rag** - 開発支援RAGツール (AT Protocol & Tauri ドキュメント vectorization)

### 対象プラットフォーム
- **デスクトップ**: macOS, Windows, Linux
- **モバイル**: iOS, Android (Tauri Mobile Alpha使用)

### 技術スタック
- **フロントエンド**: SvelteKit + TypeScript (SPA構成)
  - **Svelte 5**: 最新版のSvelteフレームワーク (runes使用)
  - **TailwindCSS v4**: 最新のユーティリティファーストCSS
- **バックエンド**: Rust (Tauri 2.0)
- **データベース**: SQLite (Tauri SQL Plugin必須)
  - **Tauri SQL Plugin**: ローカルデータベース操作
  - **セキュアストレージ**: 認証情報等の暗号化保存
- **状態管理**:
  - **Tauri Store Plugin**: 永続化が必要な設定・状態管理
  - **Svelte $state**: シンプルなコンポーネント状態管理
- **AT Protocol**: Bluesky API統合 (@atproto/api使用)
- **開発支援**: dev_rag (RAGベース ドキュメント検索)

## Development Commands

### Main Project (moodeSky)
Navigate to `moodeSky/` directory for all commands:

**Package Manager:** このプロジェクトは **pnpm** で管理されています。
- パッケージ追加: `pnpm add <package>`
- 依存関係インストール: `pnpm install`
- **npm ではなく pnpm を使用してください**

**Development:**
- `pnpm run tauri dev` - **メイン開発コマンド** (フロントエンド + バックエンド)
- `pnpm run dev` - SvelteKit開発サーバーのみ (Tauri機能不要時)
- `pnpm run check` - TypeScript/Svelte型チェック
- `pnpm run check:watch` - 型チェック (watch モード)

**Building:**
- `pnpm run build` - フロントエンド本番用ビルド
- `pnpm run tauri build` - デスクトップアプリ完全ビルド
- `pnpm run preview` - 本番ビルドプレビュー

**Mobile (Tauri Mobile Alpha):**
- `pnpm run tauri android init` - Android プロジェクト初期化
- `pnpm run tauri android dev` - Android 開発 (エミュレータ)
- `pnpm run tauri android build` - Android APK/AAB生成
- `pnpm run tauri ios init` - iOS プロジェクト初期化 (macOS のみ)
- `pnpm run tauri ios dev` - iOS 開発 (シミュレータ)
- `pnpm run tauri ios build` - iOS IPA生成

**Backend (Rust) - from src-tauri/ directory:**
- `cargo check` - Rust コードエラーチェック
- `cargo build` - Rust バックエンドビルド
- `cargo test` - Rust テスト実行
- `cargo clippy` - Rust リント
- `cargo fmt` - Rust コードフォーマット

### Documentation RAG (dev_rag)
Navigate to `dev_rag/` directory:

**Setup:**
- `uv sync` - 依存関係インストール (推奨)
- `uv sync --dev` - 開発依存関係含む

**Vectorization (ドキュメント vectorization):**
- `uv run dev-rag vec_tauri` - Tauri ドキュメント
- `uv run dev-rag vec_bluesky` - Bluesky ドキュメント
- `uv run dev-rag vec_atproto` - AT Protocol ドキュメント
- `uv run dev-rag vec_sveltekit` - SvelteKit ドキュメント
- `uv run dev-rag vec_svelte` - Svelte ドキュメント
- `uv run dev-rag vec_moode` - ローカル moodeSky プロジェクト
- `uv run dev-rag vector_all` - 全リポジトリ一括処理

**Operations:**
- `uv run dev-rag search "query"` - ベクトル検索
- `uv run dev-rag status` - コレクション状態確認  
- `uv run dev-rag setup_mcp` - MCP設定生成

**Code Quality:**
- `uv run black .` - Python コードフォーマット
- `uv run ruff check .` - Python リント
- `uv run pytest` - Python テスト実行

## Architecture

### moodeSky (Tauri マルチプラットフォームアプリ)

**Frontend (SvelteKit SPA):**
- ディレクトリ: `moodeSky/src/`
- SPA構成: `@sveltejs/adapter-static` (SSR無効)
- TypeScript: 完全型チェック有効
- 通信: Tauri `invoke()` API経由でRustバックエンドと連携

**Backend (Rust):**  
- ディレクトリ: `moodeSky/src-tauri/src/`
- エントリーポイント: `main.rs` (Tauriアプリ初期化)
- コアロジック: `lib.rs` (主要機能実装)
- Tauriコマンド: `#[tauri::command]` マクロでフロントエンド連携
- シリアライゼーション: serde使用

**AT Protocol統合:**
- Bluesky API: @atproto/api パッケージ使用
- 認証管理: Tauri Store Plugin (セキュアストレージ)
- リアルタイム更新: WebSocket接続
- データキャッシュ: Tauri SQL Plugin (SQLite) + メモリキャッシュ

**Key Configuration:**
- `tauri.conf.json` - Tauri設定 (セキュリティ、ビルド、モバイル対応)
- `svelte.config.js` - SvelteKit SPA設定  
- `Cargo.toml` - Rust依存関係 + モバイルライブラリ設定

### dev_rag (Python RAG開発支援ツール)

**Architecture:**
- `main.py` - Fire-based CLI (複数 vectorization コマンド)
- `dev_rag/models.py` - Pydantic データモデル (設定・ドキュメントチャンク)
- `dev_rag/vectorizer.py` - FastEmbed + Qdrant vectorization コア

**Data Flow:**
1. GitPython でリポジトリクローン・更新
2. Rust, TypeScript, Svelte, Markdown, JSON, YAML ファイルからチャンク抽出
3. FastEmbed (BAAI/bge-small-en-v1.5) で embeddings 生成
4. Qdrant コレクションにベクトル保存
5. MCP統合でClaude Code RAG検索有効化

**Supported Collections:**
- `tauri-docs` - Tauri 公式ドキュメント
- `bluesky-docs` - Bluesky 公式ドキュメント
- `atproto-docs` - AT Protocol 公式ドキュメント
- `sveltekit-docs` - SvelteKit 公式ドキュメント
- `svelte-docs` - Svelte 公式ドキュメント
- `moodeSky-local` - ローカル moodeSky プロジェクト (SvelteKit + Tauri)

## Development Workflow

**開発優先順位:**
1. **デスクトップ版先行開発** - Mac/Windows/Linux対応
2. **コア機能実装** - AT Protocol統合、基本UI/UX  
3. **モバイル対応** - Tauri Mobile Alpha導入
4. **プラットフォーム最適化** - レスポンシブデザイン調整

**Primary Development:**
1. メイン開発: `cd moodeSky && npm run tauri dev` (フルアプリ開発)
2. フロントエンドのみ: `npm run dev` (Tauri機能不要時)
3. 型チェック: `npm run check` (定期実行推奨)

**Mobile Development (Tauri Alpha):**
1. Android初期化: `npm run tauri android init`
2. iOS初期化: `npm run tauri ios init` (macOS のみ)
3. モバイル開発: `npm run tauri [android|ios] dev`

**RAG Setup (Optional):**
1. Qdrant起動: `docker run -p 6333:6333 qdrant/qdrant`
2. ドキュメント vectorization: `cd dev_rag && uv run dev-rag vector_all`
3. MCP統合: Claude Code RAG有効化

## Package Managers

- **moodeSky**: pnpm (package.json) - **pnpmを使用してください**
- **dev_rag**: uv (推奨) or pip (pyproject.toml)

## Communication Patterns

**Frontend ↔ Backend (Tauri):**
- フロントエンド: `invoke('command_name', { args })`
- バックエンド: `#[tauri::command]` + main.rs登録
- データ通信: serde JSON シリアライゼーション

**AT Protocol統合:**
- @atproto/api パッケージ使用
- 認証: App Password推奨
- リアルタイム: WebSocket + CAR ファイル処理

**データ永続化:**
- **SQLデータベース**: Tauri SQL Plugin必須 (SQLite)
- **設定・状態管理**: Tauri Store Plugin推奨
- **シンプルな状態**: Svelte $state runes使用

**RAG Integration:**
- MCP (Model Context Protocol) でClaude Code統合
- Qdrant ベクトルDB で類似検索
- FastEmbed で効率的 embedding 生成

## 開発ルール・ドキュメント

### 詳細ドキュメント (docs/)
- `docs/DEVELOPMENT_RULES.md` - 開発ルール・ワークフロー詳細
- `docs/PLATFORM_SUPPORT.md` - プラットフォーム対応戦略
- `docs/BLUESKY_INTEGRATION.md` - AT Protocol統合ガイド

### 品質管理
- **TypeScript**: `pnpm run check` (型チェック必須)
- **Rust**: `cargo check`, `cargo test`, `cargo clippy` (コードチェック必須)
- **コミット前チェック**: 型チェック・テスト実行必須

### セキュリティ
- **認証情報**: Tauri Store Plugin (セキュアストレージ)
- **API Keys**: 環境変数管理、ログ出力禁止
- **CSP設定**: Tauri セキュリティ設定準拠

## MCP (Model Context Protocol) 使用ルール

このプロジェクトでは複数のMCPサーバーを統合して効率的な開発を行います。以下のツールを適切に活用してください。

### 🧠 思考・問題解決
**sequential_thinking** - **積極的使用推奨**
- いかなる時も積極的に使用してください
- 使わない方がメリットがある場合のみ使用をせず、それ以外は原則として使用
- 複雑な問題解決、設計判断、段階的な実装計画に活用

### 🐦 Bluesky API 検証
**bluesky** - **実環境での動作確認**
- 実際にBlueskyのAPIを叩いてレスポンスを確認
- 実際の操作を検証・テスト
- Blueskyの本番環境でクイック動作確認に使用
- APIの仕様確認やデータ構造検証に活用

### 📚 技術ドキュメント検索 (RAG)

**sveltekit-docs** - **SvelteKit 専用**
- このプロジェクトではSvelteKitを使用
- SvelteKitでわからないことがあれば積極的に活用
- ルーティング、コンポーネント、API、チュートリアル、ベストプラクティス検索

**svelte-docs** - **Svelte 5 専用**
- 本プロジェクトでは**Svelte 5**を使用
- 古いSvelteと混同すると動作しないため、積極的にSvelte 5の仕様を確認
- コンポーネント、リアクティビティ、ストア、アクション、トランジション参照

**tauri-docs** - **Tauri 2 専用**
- Tauri 2を使ってデスクトップ・モバイルアプリ開発
- 比較的新しく積極的に新機能が追加されているため、積極的に最新情報を確認
- デスクトップ/モバイル開発、コマンド、イベント、プラグイン、セキュリティ参照

**bluesky-docs** - **Bluesky 仕様**
- Blueskyの基本的な仕様がまとめられたドキュメント
- APIについて調査したいときに活用
- プロトコル仕様、API、スキーマ、フェデレーション、認証参照

**atproto-docs** - **AT Protocol TypeScript**
- TypeScriptでBluesky APIを効率的に利用できるライブラリ
- APIや型の扱い方を参照する際に積極的に活用
- プロトコル仕様、lexicon、XRPC、リポジトリ、実装例参照

### 🔍 外部情報検索

**tavily** - **最新情報・一般検索**
- 外部の情報を検索したいときに便利
- 最新の情報やわからないことがあれば積極的に活用
- Web検索、最新ニュース、技術動向調査に使用

**context7** - **動的ライブラリ参照**
- 知識にない最新の情報を動的に参照
- **"use context7"と宣言された時には必須レベルで使用**
- 最新ライブラリドキュメント、API仕様の動的取得

### 🐙 GitHub 連携

**github** - **プロジェクト管理**
- GitHubの操作が可能
- **Issue を使って開発の設計や管理** - 常に確認し情報を最新に
- プルリクエスト作成、レビュー、マージ
- **GitHubを使ったコラボレーションには必須**
- リポジトリ管理、ブランチ操作、リリース管理

### 🎯 使用ガイドライン

#### 優先順位
1. **sequential_thinking** - 複雑なタスクでは最初に使用
2. **技術固有のRAG** (sveltekit-docs, svelte-docs, tauri-docs) - 実装時
3. **bluesky/atproto-docs** - API統合作業時
4. **tavily/context7** - 不明な点や最新情報が必要な時
5. **github** - プロジェクト管理・コラボレーション時

#### 効果的な組み合わせ
- **設計フェーズ**: sequential_thinking → tauri-docs → sveltekit-docs
- **API実装**: bluesky-docs → atproto-docs → bluesky (実証)
- **問題解決**: sequential_thinking → 関連RAG → tavily (最新情報)
- **プロジェクト管理**: github (常時) + sequential_thinking (計画時)

## 🔄 改良版開発フロー

このプロジェクトでは Issue-driven development と Test-Driven Development を組み合わせた体系的な開発フローを採用します。

### 📋 完全開発フロー

#### Phase 1: 計画・設計
1. **事前分析** (`sequential_thinking` **必須使用**)
   - 要件整理、技術調査、影響分析
   - アーキテクチャへの影響評価
   - 実装方針の検討

2. **GitHub Issue作成** (テンプレート使用)
   - 機能定義、受け入れ条件明記
   - 優先度・ラベル設定
   - 実装方針・技術選択の記録

3. **情報収集** (体系的アプローチ)
   - **1st**: 関連RAG検索 (sveltekit-docs, svelte-docs, tauri-docs, bluesky-docs, atproto-docs)
   - **2nd**: Tavily検索 (最新情報・補足調査)
   - **3rd**: context7活用 (情報が古い場合)
   - **Last**: ユーザー相談 (どうしても解決しない場合)

4. **Issue更新** (収集情報を反映)
   - 技術仕様の詳細化
   - 実装アプローチの最終決定

#### Phase 2: 実装準備
5. **ブランチ作成** 
   - 命名規則: `feature/issue-123-description`
   - ベースブランチから最新取得

6. **アーキテクチャ設計** (大きな変更時)
   - コンポーネント設計
   - データフロー設計
   - API仕様設計

7. **テスト設計・作成** (TDD)
   - ユニットテスト作成
   - 統合テスト設計
   - E2Eテスト検討

#### Phase 3: 実装・検証
8. **機能実装**
   - テスト駆動での実装
   - 段階的な機能追加

9. **品質チェック**
   - TypeScript/Rust型チェック: `npm run check`, `cargo check`
   - リント実行: `cargo clippy`, ESLint
   - テスト実行: `cargo test`, `npm test`
   - E2Eテスト (必要時)

10. **デバッグ・改善**
    - テスト失敗時: ドキュメント再検索 → ユーザー相談
    - パフォーマンス最適化
    - エラーハンドリング強化

#### Phase 4: 統合・デプロイ
11. **PR作成** (テンプレート使用)
    - 変更内容の説明
    - テスト結果の記載
    - スクリーンショット添付 (UI変更時)

12. **レビュー・承認**
    - コードレビュー
    - CI/CD 自動チェック通過確認

13. **マージ・Issue クローズ**
    - PRマージ
    - **Issue必ずクローズ**
    - リリースノート更新 (必要時)

14. **ドキュメント更新** (必要時)
    - README更新
    - API仕様更新
    - 開発ガイド更新

### 🎯 品質保証基準

#### 必須チェック項目
- [ ] TypeScript型エラーゼロ (`npm run check`)
- [ ] Rust警告ゼロ (`cargo check`, `cargo clippy`)
- [ ] 全テスト通過 (`cargo test`, `npm test`)
- [ ] リント規則準拠
- [ ] セキュリティベストプラクティス準拠

#### Bluesky/AT Protocol 特有チェック
- [ ] API仕様準拠 (LEXICON確認)
- [ ] 認証フロー正常動作
- [ ] リアルタイム機能検証 (WebSocket)
- [ ] エラーハンドリング適切
- [ ] レート制限対応

#### マルチプラットフォーム考慮
- [ ] デスクトップ動作確認 (macOS/Windows/Linux)
- [ ] モバイル動作確認 (iOS/Android) ※該当時
- [ ] レスポンシブデザイン検証
- [ ] パフォーマンス要件満足

### 🚀 継続的改善

#### メトリクス追跡
- 開発速度 (Issue → PR → Merge時間)
- 品質指標 (バグ発生率、テストカバレッジ)
- パフォーマンス (応答時間、メモリ使用量)

#### 定期レビュー
- 開発プロセス振り返り (週次/月次)
- 技術的負債の管理
- ツール・ライブラリの更新検討

### ⚠️ エスカレーション基準

以下の場合はユーザーに相談：
- 技術仕様が不明確
- AT Protocol仕様の解釈が困難
- パフォーマンス要件を満たせない
- セキュリティリスクの懸念
- アーキテクチャの大幅変更が必要

## 🎨 moodeSky プロダクト仕様

### 📱 アプリケーション概要

**moodeSky** は、AT Protocol (Bluesky) 専用のマルチプラットフォーム対応デッキ型クライアントアプリケーションです。

#### 🎯 コンセプト
- **デッキ方式UI**: TweetDeck風の複数カラム同時表示
- **マルチアカウント**: アカウント切り替えではなく同時運用
- **クロスプラットフォーム**: モバイルからデスクトップまで一貫したUX
- **パワーユーザー向け**: 高効率なソーシャルメディア管理

### 🌐 対応プラットフォーム

#### デスクトップ
- **macOS**: Intel (x86_64) / Apple Silicon (aarch64)
- **Windows**: x64 / ARM64
- **Linux**: x86_64 / ARM64

#### モバイル (Tauri Mobile Alpha)
- **iOS**: 12.0+ (iPhone/iPad)
- **Android**: API Level 24+ (Android 7.0+)

#### 非対応
- **Webブラウザ**: ネイティブアプリ専用戦略

### 🌍 多言語対応

#### 対応言語
- **日本語** (ja) - Primary
- **英語** (en) - Global
- **ポルトガル語（ブラジル）** (pt-BR) - 南米市場
- **韓国語** (ko) - 東アジア市場
- **ドイツ語** (de) - ヨーロッパ市場

#### ローカライゼーション機能
- 動的言語切り替え
- 日付・時間・数値の地域化
- 文字密度に対応したレスポンシブデザイン
- RTL言語は対象外（LTR言語のみ）

### 🎨 テーマシステム

#### 基本テーマ
- **ライトテーマ**: 明るく清潔な標準UI
- **ダークテーマ**: 目に優しい暗色基調UI

#### 拡張テーマ
- **ハイコントラストテーマ**: アクセシビリティ重視
- **カスタムテーマ**: ユーザー定義色設定
- **システム連動**: OS設定に自動追従

#### テーマ機能
- リアルタイム切り替え
- 時間帯自動切り替え
- カラム毎のテーマ設定（将来機能）
- アクセントカラーカスタマイズ

### 👥 マルチアカウント対応

#### アーキテクチャ
- **同時セッション管理**: 複数アカウントの並行処理
- **統合タイムライン**: 全アカウントの投稿を統合表示
- **アカウント別カラム**: 個別アカウントのタイムライン表示
- **クロスアカウント操作**: 異なるアカウントでの相互作用

#### セキュリティ
- **独立認証**: アカウント毎の個別セッション管理
- **セキュアストレージ**: 暗号化された認証情報保存
- **権限分離**: アカウント間のデータ隔離

### 🔗 外部ツール連携

#### 対応予定サービス
- **Notion**: ブックマーク・メモ管理
- **Obsidian**: 知識管理・メモ
- **Zapier/IFTTT**: ワークフロー自動化
- **Discord/Slack**: 通知連携
- **Google Sheets/Airtable**: データ分析・エクスポート

#### 連携方式
- **OAuth認証**: 安全なAPI連携
- **Webhook**: リアルタイム通知
- **REST API**: データ同期
- **プラグインシステム**: サードパーティ拡張

### 🤖 AIエージェント機能

#### 提供方式
- **有償サブスクリプション**: 月額課金制
- **個人APIキー**: ユーザー自身のAI API使用

#### 機能候補
- **投稿生成支援**: 文章改善・要約・翻訳
- **感情分析**: 投稿のトーン分析
- **トレンド分析**: 話題の自動検出
- **自動分類**: 投稿の自動タグ付け
- **スケジューリング最適化**: 投稿タイミング提案

#### 対応AI API
- OpenAI GPT-4/GPT-4o
- Anthropic Claude
- Google Gemini
- ローカルLLM (将来対応)

### 🏗 デッキシステム仕様

#### デッキ構成
- **可変幅カラム**: ユーザー定義でサイズ調整
- **無限スクロール**: 効率的な大量データ表示
- **ドラッグ&ドロップ**: カラムの並び替え
- **カラムタイプ**: ホーム・通知・検索・リスト・ハッシュタグ

#### レスポンシブ対応
- **デスクトップ**: 3-5カラム同時表示
- **タブレット**: 1-3カラム表示
- **スマートフォン**: 1カラム + スワイプ切り替え
- **適応的レイアウト**: 画面サイズに応じた自動調整

### 🔒 セキュリティ・プライバシー

#### データ保護
- **エンドツーエンド暗号化**: ローカルデータの暗号化
- **ゼロ知識原則**: サーバーでの個人データ非保存
- **自動データ削除**: 設定可能な保持期間
- **匿名化モード**: 追跡防止機能

#### コンプライアンス
- **GDPR準拠**: EU一般データ保護規則
- **CCPA準拠**: カリフォルニア州消費者プライバシー法
- **個人情報保護法**: 日本の個人情報保護法
- **データポータビリティ**: データエクスポート機能

### ⚡ パフォーマンス要件

#### 応答性能
- **アプリ起動時間**: 3秒以内
- **API応答時間**: 2秒以内
- **UI操作応答**: 100ms以内
- **メモリ使用量**: アイドル時100MB以下

#### スケーラビリティ
- **同時アカウント数**: 最大10アカウント
- **同時カラム数**: 最大20カラム
- **キャッシュ投稿数**: アカウント毎5000投稿
- **リアルタイム接続**: 複数WebSocket管理

### 🎯 開発ロードマップ

#### Phase 1: コア機能 (3-4ヶ月)
- [ ] AT Protocol認証システム
- [ ] 基本UI・テーマシステム
- [ ] シングルアカウント対応
- [ ] 基本的なタイムライン表示
- [ ] 投稿作成・削除機能

#### Phase 2: マルチアカウント・デッキ (2-3ヶ月)
- [ ] マルチアカウント認証管理
- [ ] デッキシステム実装
- [ ] カラム管理機能
- [ ] クロスアカウント操作

#### Phase 3: 多言語・外部連携 (2-3ヶ月)
- [ ] i18n実装・翻訳
- [ ] 外部ツール連携API
- [ ] プラグインシステム
- [ ] 高度なフィルタリング

#### Phase 4: AIエージェント・高度機能 (3-4ヶ月)
- [ ] AIエージェント統合
- [ ] 課金システム
- [ ] 高度な分析機能
- [ ] 自動化ワークフロー

#### Phase 5: モバイル最適化・配布 (2-3ヶ月)
- [ ] Tauri Mobile完全対応
- [ ] モバイルUI最適化
- [ ] アプリストア申請・配布
- [ ] パフォーマンス最適化

### 🏆 差別化要素

#### 技術的優位性
- **Tauri活用**: Web技術 + ネイティブパフォーマンス
- **マルチプラットフォーム**: 単一コードベースで全プラットフォーム
- **メモリ効率**: Electronより軽量
- **セキュリティ**: Rust言語の安全性

#### UX/UI優位性
- **デッキ特化**: パワーユーザー向け専用設計
- **カスタマイズ性**: 高度な個人化機能
- **アクセシビリティ**: 包括的なユーザビリティ
- **レスポンシブ**: 全デバイスで一貫したUX

#### 機能的優位性
- **外部連携**: 豊富なサードパーティ統合
- **AIエージェント**: 次世代のSNS管理支援
- **プライバシー重視**: ユーザーデータ保護
- **オープンソース**: 透明性とコミュニティ