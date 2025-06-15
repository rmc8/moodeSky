# moodeSky 開発ルール

## プロジェクト概要

**moodeSky**は、Tauriを使用したマルチプラットフォーム対応のBlueskyクライアントアプリケーションです。

### 対象プラットフォーム
- **デスクトップ**: macOS, Windows, Linux
- **モバイル**: iOS, Android (Tauri Mobile Alpha使用)

### 技術スタック
- **フロントエンド**: SvelteKit + TypeScript (SPA構成)
- **バックエンド**: Rust (Tauri 2.0)
- **開発支援**: dev_rag (RAGツール)

## 開発ワークフロー

### 1. 開発環境セットアップ

```bash
# プロジェクトクローン後
cd moodeSky

# 依存関係インストール
npm install

# 開発サーバー起動（推奨）
npm run tauri dev  # フロントエンド + バックエンド

# フロントエンドのみ開発
npm run dev  # Tauri機能不要な場合
```

### 2. 開発優先順位

1. **デスクトップ版先行開発** - Mac/Windows/Linux対応
2. **コア機能実装** - AT Protocol統合、基本UI/UX
3. **モバイル対応** - Tauri Mobile Alpha導入
4. **プラットフォーム最適化** - レスポンシブデザイン調整

### 3. 品質管理

#### 必須チェック項目
```bash
# TypeScript型チェック
npm run check

# Rust コードチェック (src-tauri/ディレクトリで)
cd src-tauri
cargo check
cargo test
```

#### コードスタイル
- **TypeScript**: Prettier + ESLint (SvelteKit標準)
- **Rust**: rustfmt + clippy
- **コミット前**: 型チェック・テスト必須実行

## アーキテクチャガイドライン

### 1. フロントエンド設計

#### ディレクトリ構造
```
src/
├── routes/           # SvelteKitルーティング
├── lib/              # 共通コンポーネント・ユーティリティ
├── stores/           # Svelte stores (状態管理)
└── types/            # TypeScript型定義
```

#### 状態管理
- **Svelte stores**使用
- **AT Protocol データ**はRust側で処理、フロントエンドは描画に集中
- **リアクティブプログラミング**パターン採用

### 2. バックエンド設計

#### Tauri コマンド設計
```rust
#[tauri::command]
async fn bluesky_login(handle: String, password: String) -> Result<AuthSession, String>

#[tauri::command] 
async fn fetch_timeline(session: AuthSession) -> Result<Vec<Post>, String>

#[tauri::command]
async fn create_post(session: AuthSession, text: String) -> Result<PostResult, String>
```

#### データ層
- **AT Protocol Client**実装（Rust）
- **オフライン対応**検討（ローカルDB使用）
- **エラーハンドリング**統一

### 3. プラットフォーム対応戦略

#### デスクトップ
- **ネイティブメニュー**統合
- **システム通知**対応
- **ウィンドウ管理**最適化

#### モバイル
- **タッチUI**最適化
- **ジェスチャー**対応
- **プッシュ通知**実装

## AT Protocol統合

### 1. 認証フロー
1. **ユーザー認証** (handle + password or App Password)
2. **セッション管理** (Rust側で安全に保存)
3. **API呼び出し** (atrium-api使用)

### 2. 主要機能実装順
1. **ログイン・ログアウト**
2. **タイムライン表示**
3. **投稿作成・削除**
4. **いいね・リポスト**
5. **通知機能**
6. **プロフィール管理**

### 3. データ同期
- **リアルタイム更新** (WebSocket or polling)
- **オフライン対応** (ローカルキャッシュ)
- **同期エラー処理**

## 開発支援ツール (dev_rag)

### RAGツール活用
```bash
cd dev_rag

# ドキュメント vectorization
uv run dev-rag vec_tauri      # Tauri ドキュメント
uv run dev-rag vec_bluesky    # Bluesky ドキュメント  
uv run dev-rag vec_sveltekit  # SvelteKit ドキュメント
uv run dev-rag vec_moode      # ローカルプロジェクト

# 全部一括
uv run dev-rag vector_all

# 検索
uv run dev-rag search "Tauri mobile iOS setup"
```

### MCP統合
- **Bluesky MCP**: AT Protocol API統合支援
- **Context7**: ライブラリドキュメント検索
- **Tavily**: 最新情報リサーチ

## テスト戦略

### 1. フロントエンド
- **Vitest**: ユニットテスト
- **Playwright**: E2Eテスト
- **Svelte Testing Library**: コンポーネントテスト

### 2. バックエンド
- **Rust標準テスト**: ユニット・統合テスト
- **AT Protocol**: モックサーバー使用

### 3. クロスプラットフォーム
- **CI/CD**: GitHub Actions
- **自動ビルド**: 全プラットフォーム対応

## デプロイ・配布

### 1. ビルド
```bash
# デスクトップ
npm run tauri build

# 特定プラットフォーム
npm run tauri build --target x86_64-apple-darwin  # macOS Intel
npm run tauri build --target aarch64-apple-darwin # macOS ARM
```

### 2. 配布
- **GitHub Releases**: デスクトップ版配布
- **App Store**: iOS版申請準備
- **Google Play**: Android版申請準備

## セキュリティ考慮事項

### 1. 認証情報管理
- **App Passwords**使用推奨
- **セッション暗号化**保存
- **機密情報ログ出力禁止**

### 2. CSP設定
```json
{
  "security": {
    "csp": "default-src 'self'; connect-src 'self' https://bsky.social https://*.bsky.social"
  }
}
```

### 3. プライバシー
- **最小限データ収集**
- **ローカルデータ暗号化**
- **通信TLS必須**

## パフォーマンス最適化

### 1. フロントエンド
- **コード分割** (SvelteKit)
- **画像最適化**
- **仮想スクロール** (大量データ)

### 2. バックエンド
- **非同期処理** (tokio)
- **接続プール**
- **キャッシュ戦略**

## 今後の拡張計画

### Phase 1: コア機能
- AT Protocol基本機能実装
- デスクトップ版安定化

### Phase 2: モバイル対応
- Tauri Mobile導入
- タッチUI最適化

### Phase 3: 高度機能
- マルチアカウント対応
- カスタムフィード
- 高度な通知機能