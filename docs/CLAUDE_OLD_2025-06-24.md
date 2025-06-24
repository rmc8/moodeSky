# CLAUDE.md

**Speak in Japanese!**

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Information

**Repository Name:** `rmc8/moodeSky`  
**GitHub URL:** https://GitHub.com/rmc8/moodeSky  
**Repository Type:** Public  
**License:** MIT License

### Repository Structure
```
moodeSky/
├── moodeSky/                      # メインアプリケーション (SvelteKit + Tauri)
│   ├── src/                       # SvelteKit フロントエンド
│   │   ├── app.css               # TailwindCSS v4 + テーマシステム
│   │   ├── app.html              # HTML テンプレート
│   │   ├── lib/                  # 共通ライブラリ
│   │   │   ├── components/       # Svelte コンポーネント
│   │   │   │   ├── ThemeProvider.svelte
│   │   │   │   ├── ThemeToggle.svelte
│   │   │   │   ├── LanguageSelectorCompact.svelte
│   │   │   │   └── Avatar.svelte
│   │   │   ├── i18n/             # 多言語化システム
│   │   │   │   ├── locales/      # 翻訳ファイル（5言語対応）
│   │   │   │   ├── paraglide/    # Paraglide-JS生成ファイル
│   │   │   │   └── project.inlang # Inlang設定
│   │   │   ├── stores/           # Svelte 5 ストア (runes)
│   │   │   │   ├── theme.svelte.ts
│   │   │   │   └── i18n.svelte.ts # 多言語化ストア
│   │   │   ├── services/         # サービス層
│   │   │   │   ├── authStore.ts  # 認証管理 (Tauri Store)
│   │   │   │   ├── themeStore.ts # テーマ管理
│   │   │   │   └── i18nService.ts # 多言語化サービス
│   │   │   └── types/            # TypeScript 型定義
│   │   │       ├── auth.ts       # AT Protocol 型定義
│   │   │       └── theme.ts      # テーマシステム型定義
│   │   └── routes/               # SvelteKit ルーティング
│   │       ├── (root)/           # ルートページ群
│   │       ├── login/            # ログインページ
│   │       └── deck/             # デッキページ
│   ├── src-tauri/                # Tauri Rustバックエンド
│   │   ├── src/
│   │   │   ├── main.rs          # Tauri アプリエントリーポイント
│   │   │   └── lib.rs           # コアロジック
│   │   ├── Cargo.toml           # Rust 依存関係
│   │   └── tauri.conf.json      # Tauri 設定
│   ├── package.json             # pnpm 設定
│   └── svelte.config.js         # SvelteKit SPA設定
├── dev_rag/                     # 開発支援RAGツール (Python)
├── docs/                        # プロジェクトドキュメント
├── .mcp.example.json           # MCP設定テンプレート
├── CLAUDE.md                   # 本ファイル - Claude Code指示書
└── README.md                   # プロジェクト概要
```

## Project Overview

**moodeSky** は、Tauriを使用したマルチプラットフォーム対応のBlueskyクライアントアプリケーションです。

### プロジェクト構成
1. **moodeSky** - Tauriデスクトップ・モバイルアプリ（SvelteKit + Rust）
2. **dev_rag** - 開発支援RAGツール（AT Protocol & Tauriドキュメント vectorization）

### 対象プラットフォーム
- **デスクトップ**: macOS, Windows, Linux
- **モバイル**: iOS, Android（Tauri Mobile Alpha使用）

### 技術スタック
- **フロントエンド**: SvelteKit + TypeScript（SPA構成）
  - **Svelte 5**: 最新版のSvelteフレームワーク（runes使用）
  - **TailwindCSS v4**: 最新のユーティリティファーストCSS
- **バックエンド**: Rust（Tauri 2.0）
- **データベース**: SQLite（Tauri SQL Plugin必須）
  - **Tauri SQL Plugin**: ローカルデータベース操作
  - **セキュアストレージ**: 認証情報等の暗号化保存
- **状態管理**:
  - **Tauri Store Plugin**: 永続化が必要な設定・状態管理
  - **Svelte $state**: シンプルなコンポーネント状態管理
- **多言語化**: Paraglide-JS v2 + Tauri OS Plugin
  - **Paraglide-JS v2**: 型安全な翻訳システム
  - **Tauri OS Plugin**: ネイティブシステム言語検出
  - **多層言語検出**: 保存設定→OS→ブラウザ→フォールバック
- **AT Protocol**: Bluesky API統合（@atproto/api使用）
- **開発支援**: dev_rag（RAGベースドキュメント検索）

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

**Internationalization:**
- `npx @inlang/paraglide-js compile --project ./project.inlang` - 翻訳ファイル再コンパイル
- `pnpm run check` - TypeScript型チェック（翻訳関数含む）

**Building:**
- `pnpm run build` - フロントエンド本番用ビルド
- `pnpm run tauri build` - デスクトップアプリ完全ビルド
- `pnpm run preview` - 本番ビルドプレビュー

**Mobile (Tauri Mobile Alpha):**
- `pnpm run tauri android init` - Android プロジェクト初期化
- `pnpm run tauri android dev` - Android開発（エミュレーター）
- `pnpm run tauri android build` - Android APK/AAB生成
- `pnpm run tauri ios init` - iOSプロジェクト初期化（macOSのみ）
- `pnpm run tauri ios dev` - iOS開発（シミュレーター）
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
- `uv sync` - 依存関係インストール（推奨）
- `uv sync --dev` - 開発依存関係含む

**Vectorization（ドキュメント vectorization）:**
- `uv run dev-rag vec_tauri` - Tauriドキュメント
- `uv run dev-rag vec_bluesky` - Blueskyドキュメント
- `uv run dev-rag vec_atproto` - AT Protocolドキュメント
- `uv run dev-rag vec_sveltekit` - SvelteKitドキュメント
- `uv run dev-rag vec_svelte` - Svelteドキュメント
- `uv run dev-rag vec_moode` - ローカルmoodeSkyプロジェクト
- `uv run dev-rag vector_all` - 全リポジトリ一括処理

**Operations:**
- `uv run dev-rag search "query"` - ベクトル検索
- `uv run dev-rag status` - コレクション状態確認  
- `uv run dev-rag setup_mcp` - MCP設定生成

**Code Quality:**
- `uv run black .` - Pythonコードフォーマット
- `uv run ruff check .` - Pythonリント
- `uv run pytest` - Pythonテスト実行

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
1. メイン開発: `cd moodeSky && pnpm run tauri dev` (フルアプリ開発)
2. フロントエンドのみ: `pnpm run dev` (Tauri機能不要時)
3. 型チェック: `pnpm run check` (定期実行推奨)

**Mobile Development (Tauri Alpha):**
1. Android初期化: `pnpm run tauri android init`
2. iOS初期化: `pnpm run tauri ios init` (macOS のみ)
3. モバイル開発: `pnpm run tauri [android|ios] dev`

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

## 🌍 多言語化システム (i18n)

### 📋 実装完了状況
- [x] **Paraglide-JS v2統合** - 型安全な翻訳システム
- [x] **Tauri OS Plugin統合** - ネイティブシステム言語検出  
- [x] **多層言語検出システム** - 保存設定→OS→ブラウザ→フォールバック
- [x] **Tauri Store Plugin統合** - 言語設定永続化
- [x] **Svelte 5 Reactive Store** - リアクティブ言語切り替え
- [x] **完全翻訳適用** - 全ページ・コンポーネント対応

### 🌐 対応言語詳細
1. **日本語 (ja)** - プライマリ言語、最高品質
2. **英語 (en)** - グローバル標準、フォールバック言語
3. **ポルトガル語 (pt-BR)** - ブラジル市場向け
4. **ドイツ語 (de)** - ヨーロッパ市場向け  
5. **韓国語 (ko)** - 東アジア市場向け

### 🔧 技術仕様
- **翻訳ファイル**: `src/lib/i18n/locales/*.json` 
- **型安全性**: 翻訳キー自動補完・型チェック
- **リアクティブ**: Svelte 5 runesによる動的言語切り替え
- **永続化**: Tauri Store Pluginで設定保存
- **フォールバック**: 英語への自動フォールバック機能

### 🎯 使用方法
```typescript
import * as m from '$lib/i18n/paraglide/messages.js';

// 翻訳関数の使用（型安全）
const title = m['login.title']();
const error = m['validation.requiredFields']();
```

### 🔄 言語検出フロー
1. **Tauri Store Plugin** → 保存された言語設定
2. **Tauri OS Plugin** → システム言語検出
3. **Navigator API** → ブラウザ言語
4. **Fallback** → 英語 (en)

### 📁 ファイル構造
```
src/lib/i18n/
├── locales/                    # 翻訳ファイル（5言語）
│   ├── ja.json                # 日本語（プライマリ）
│   ├── en.json                # 英語（フォールバック）
│   ├── pt-BR.json             # ポルトガル語（ブラジル）
│   ├── de.json                # ドイツ語
│   └── ko.json                # 韓国語
├── paraglide/                 # Paraglide-JS生成ファイル
│   ├── messages.js            # 翻訳関数エクスポート
│   └── runtime.js             # 実行時ロジック
└── project.inlang             # Inlang設定ファイル
```

### 🛠 開発コマンド
```bash
# 翻訳ファイル再コンパイル
npx @inlang/paraglide-js compile --project ./project.inlang

# 型チェック（翻訳関数含む）
pnpm run check
```

### 🎨 UI言語選択
- **LanguageSelectorCompact.svelte** - コンパクト言語選択器
- **アイコン + 言語コード** - 直感的なUI
- **ドロップダウンメニュー** - 全言語選択可能
- **システム言語復帰** - ワンクリックでOS設定に戻す

## 📚 多言語対応ベストプラクティス

### 🏗 **アーキテクチャ設計原則**

#### 1. **型安全翻訳システム**
```typescript
// ✅ 推奨: named exportによる型安全アクセス
import { language, auth, common } from '$lib/i18n/paraglide/messages.js';

// 使用例
const title = language.current();
const error = auth.authFailed();
const button = common.save();
```

#### 2. **翻訳キー命名規則**
```json
{
  "category": {
    "subcategory": "Translation text",
    "action": "Action description",
    "state": "State description"
  }
}
```

**命名ガイドライン**:
- **カテゴリ分類**: `auth`, `navigation`, `validation`, `common`等
- **階層構造**: 最大3階層まで (`category.subcategory.item`)
- **動詞形**: アクション系は動詞形 (`login`, `save`, `delete`)
- **状態形**: 状態系は形容詞・名詞形 (`loading`, `error`, `success`)

#### 3. **Paraglide-JS実装パターン**
```typescript
// messages.js実装パターン
export const auth = {
  login: messageMap['auth.login'],
  logout: messageMap['auth.logout'],
  // カテゴリ内の全翻訳を型安全にエクスポート
};

// コンポーネントでの使用
import { auth, navigation } from '$lib/i18n/paraglide/messages.js';
```

### 🔧 **実装ベストプラクティス**

#### 1. **多層言語検出システム**
```typescript
// 優先順位: 保存設定 → OS → ブラウザ → フォールバック
async detectLanguage(): Promise<SupportedLanguage> {
  // 1. Tauri Store Plugin（最優先）
  const stored = await this.getStoredLanguage();
  if (stored) return stored;
  
  // 2. OS言語検出（Tauri OS Plugin）
  const osLocale = await this.detectOSLanguage();
  if (osLocale) return osLocale;
  
  // 3. ブラウザ言語（Navigator API）
  const browserLocale = this.detectBrowserLanguage();
  if (browserLocale) return browserLocale;
  
  // 4. フォールバック（英語）
  return 'en';
}
```

#### 2. **リアクティブ言語切り替え**
```typescript
// Svelte 5 runes活用パターン
class I18nStore {
  state = $state({
    currentLanguage: 'en' as SupportedLanguage,
    isLoading: false,
    detectionResult: null
  });
  
  async setLanguage(language: SupportedLanguage) {
    this.state.isLoading = true;
    
    // 1. 言語設定保存
    await this.saveLanguagePreference(language);
    
    // 2. 状態更新
    this.state.currentLanguage = language;
    
    // 3. DOM更新
    this.updateHtmlLangAttribute();
    
    this.state.isLoading = false;
  }
}
```

#### 3. **エラーハンドリング・フォールバック**
```typescript
// 安全な翻訳取得パターン
function safeTranslate(key: string, fallback: string = key): string {
  try {
    const result = t(key);
    return result || fallback;
  } catch (error) {
    console.warn(`Translation error for key: ${key}`, error);
    return fallback;
  }
}

// 翻訳キー存在チェック
function hasTranslation(key: string): boolean {
  try {
    const result = t(key);
    return Boolean(result && result !== key);
  } catch {
    return false;
  }
}
```

### 🌐 **翻訳品質ガイドライン**

#### 1. **翻訳文言作成原則**
- **簡潔性**: UI要素は短く、明確に
- **一貫性**: 同じ概念は同じ用語で統一
- **文化適応**: 各言語圏の文化・慣習に配慮
- **技術用語**: 一般的な訳語を優先、必要に応じて原語併記

#### 2. **言語別考慮事項**

**日本語 (ja)**:
```json
{
  "auth.login": "ログイン",
  "auth.logout": "ログアウト",
  "common.save": "保存",
  "validation.required": "必須項目です"
}
```

**英語 (en)**:
```json
{
  "auth.login": "Sign In",
  "auth.logout": "Sign Out", 
  "common.save": "Save",
  "validation.required": "This field is required"
}
```

**ポルトガル語 (pt-BR)**:
```json
{
  "auth.login": "Entrar",
  "auth.logout": "Sair",
  "common.save": "Salvar",
  "validation.required": "Este campo é obrigatório"
}
```

#### 3. **文字数・レイアウト考慮**
- **ボタンテキスト**: 各言語で最大文字数を考慮
- **エラーメッセージ**: 改行・表示領域を意識
- **ナビゲーション**: 短縮可能な表現を優先

### 🛠 **開発ワークフロー**

#### 1. **翻訳追加手順**
```bash
# 1. 翻訳キー追加（全言語ファイル）
# src/lib/i18n/locales/[lang].json

# 2. Paraglide再コンパイル
npx @inlang/paraglide-js compile --project ./project.inlang

# 3. messages.js更新（必要に応じて）
# 新カテゴリ追加時のみ

# 4. 型チェック
pnpm run check

# 5. 実装・テスト
# 全言語での表示確認
```

#### 2. **品質保証チェック**
- [ ] **翻訳完成度**: 全言語で全キー翻訳済み
- [ ] **型安全性**: TypeScript 0エラー
- [ ] **表示確認**: 全言語・全デバイスでUI確認
- [ ] **レイアウト**: 長い翻訳文での表示崩れなし
- [ ] **フォールバック**: 未翻訳キーの英語フォールバック動作

#### 3. **継続的改善**
```typescript
// 翻訳メトリクス収集
interface TranslationMetrics {
  missingKeys: string[];
  unusedKeys: string[];
  longTexts: { key: string; length: number; language: string }[];
  fallbackUsage: { key: string; frequency: number }[];
}

// 翻訳品質レポート生成
function generateTranslationReport(): TranslationMetrics {
  // 実装: 翻訳キーの使用状況分析
  // 目的: 継続的な翻訳品質向上
}
```

### 🚨 **よくある問題と解決策**

#### 1. **Paraglide-JS import/export エラー**
```typescript
// ❌ 問題: import * as m での型エラー
import * as m from '$lib/i18n/paraglide/messages.js';
const text = m['auth.login'](); // Type error

// ✅ 解決: named export使用
import { auth } from '$lib/i18n/paraglide/messages.js';
const text = auth.login(); // Type safe
```

#### 2. **翻訳キー重複・命名衝突**
```typescript
// ❌ 問題: 同一カテゴリ内での重複
{
  "button": "Save",
  "action": "Save"  // 重複
}

// ✅ 解決: 明確な命名規則
{
  "saveButton": "Save",
  "saveAction": "Save Changes"
}
```

#### 3. **動的翻訳・パラメーター化**
```typescript
// ❌ 問題: パラメーター化翻訳の複雑性
const message = t('user.greeting', { name: 'John' });

// ✅ 解決: シンプルな翻訳 + JavaScript結合
const greeting = `${t('user.hello')} ${userName}`;
```

### 📊 **パフォーマンス最適化**

#### 1. **遅延読み込み・分割**
```typescript
// 言語ファイルの動的インポート
async function loadLanguage(lang: SupportedLanguage) {
  const translations = await import(`../locales/${lang}.json`);
  return translations.default;
}

// 使用頻度の低い翻訳の分離
// common.json: 頻繁に使用される翻訳
// extended.json: 設定画面等の低頻度翻訳
```

#### 2. **キャッシュ戦略**
```typescript
// 翻訳結果のメモ化
const translationCache = new Map<string, string>();

function getCachedTranslation(key: string): string {
  if (translationCache.has(key)) {
    return translationCache.get(key)!;
  }
  
  const result = t(key);
  translationCache.set(key, result);
  return result;
}
```

### 🌟 **成功パターン集**

#### 1. **段階的多言語化**
1. **Phase 1**: 基本UI（ログイン・ナビゲーション）
2. **Phase 2**: エラーメッセージ・バリデーション
3. **Phase 3**: 詳細画面・設定
4. **Phase 4**: ヘルプ・ドキュメント

#### 2. **コミュニティ翻訳**
```typescript
// 翻訳貢献者システム
interface TranslationContributor {
  language: SupportedLanguage;
  contributor: string;
  reviewedBy: string;
  lastUpdate: Date;
}

// 翻訳品質管理
interface TranslationReview {
  key: string;
  language: SupportedLanguage;
  original: string;
  suggested: string;
  status: 'pending' | 'approved' | 'rejected';
}
```

#### 3. **自動化・CI/CD統合**
```bash
# 翻訳品質チェック（CI）
npm run i18n:check-completeness
npm run i18n:validate-keys
npm run i18n:detect-duplicates

# 自動翻訳更新（依存関係）
npm run i18n:compile
npm run check  # TypeScript validation
```

---

**🎯 多言語化の成功の秘訣: 技術基盤 + 翻訳品質 + 継続的改善**

## 🏗 Tauriアーキテクチャ詳細

### ブラウザエンジン仕様
**Tauriは内蔵ブラウザエンジンを持たず、各OSのシステムWebViewを使用：**

- **Windows**: WebView2 (Chromium-based Edge)
- **macOS**: WKWebView (WebKit-based)  
- **Linux**: WebKitGTK (WebKit-based)
- **Android**: System WebView (Chromium-based)
- **iOS**: WKWebView (WebKit-based)

### 開発上の重要な影響

#### ✅ **クロスブラウザ対応不要**
- 各OSで**単一WebViewエンジン**のみをターゲット
- Electronのようなバンドル型とは根本的に異なる
- CSSプレフィックス（`-webkit-`, `-moz-`, `-ms-`）は限定的使用

#### ✅ **パフォーマンス優位性**
- システムWebView利用によるメモリ効率
- バンドルサイズの劇的削減（180MB→数MB）
- ネイティブパフォーマンス

#### ⚠️ **開発時の注意点**
- **WebView2バージョン管理**（Windows）: 最小バージョン要求可能
- **WebKitGTK依存関係**（Linux）: 開発環境セットアップ必須
- **システムWebView更新への依存**: OS更新によるWebView機能向上

### ⚡ Tauri固有の最適化

#### **WebView最適化**
- システムWebViewの特性を活用した実装
- プラットフォーム固有APIの適切な使用
- メモリ効率を重視した設計

#### **CSS最適化**
- 不要なベンダープレフィックス除去
- システムWebView対応の最新CSS機能活用
- ファイルサイズ最小化

#### **実装指針**
```css
/* ❌ 不要: 従来のクロスブラウザ対応 */
.element {
  -webkit-transform: translateX(100px);
  -moz-transform: translateX(100px);
  -ms-transform: translateX(100px);
  transform: translateX(100px);
}

/* ✅ 推奨: Tauri最適化 */
.element {
  /* WebKit系プラットフォーム対応時のみ */
  -webkit-transform: translateX(100px);
  transform: translateX(100px);
}
```

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

### 🎨 スタイリング規則 (TailwindCSS v4 + テーマシステム)

**このプロジェクトは TailwindCSS v4 + 統合テーマシステムによるユーティリティファーストスタイリングを採用しています。**

#### 📋 必須ルール（Tauri最適化）
1. **カスタムCSSの禁止**: `<style>` タグでのカスタムCSS記述は原則禁止
2. **統合テーマクラス使用**: `dark:` プレフィックスは使用禁止、テーマクラス必須
3. **一貫性の維持**: デザインシステムに基づいた統一されたスタイリング
4. **アクセシビリティ準拠**: WCAG AA基準以上のコントラスト比必須
5. **システムWebView特化**: プラットフォーム固有の単一エンジン対応
6. **限定的プレフィックス**: `-webkit-`のみ必要な場合あり（macOS/iOS）
7. **クロスブラウザ対応不要**: 従来のブラウザ互換性コードは不要

#### 🌈 テーマシステム (TailwindCSS v4対応)

##### **アーキテクチャ**
- **data-theme属性**: HTML要素に `data-theme="sky|sunset"` で制御
- **CSS Variables**: `@layer base` での原始トークン定義
- **@theme inline**: セマンティックトークンの動的解決
- **レガシー互換**: `.light`, `.dark`, `.high-contrast` クラス併用

##### **利用可能テーマ**
1. **Sky Theme** (`data-theme="sky"`)
   - **対象**: ライトモード
   - **アクセント**: 空色 (blue-500)
   - **背景**: 白ベース
   
2. **Sunset Theme** (`data-theme="sunset"`)
   - **対象**: ダークモード  
   - **アクセント**: 夕焼けオレンジ (orange-400)
   - **背景**: slate-900ベース
   
3. **High Contrast Theme** (`.high-contrast`)
   - **対象**: アクセシビリティ
   - **配色**: 純白黒 + 黄色アクセント

##### **統合テーマクラス (必須使用)**

**背景色:**
```css
.bg-themed     /* メイン背景色 (--color-background) */
.bg-card       /* カード背景色 (--color-card) */
.bg-muted      /* ミュート背景色 (--color-muted) */
.bg-primary    /* プライマリ背景色 (--color-primary) */
```

**文字色:**
```css
.text-themed   /* メイン文字色 (--color-foreground) */
.text-muted    /* ミュート文字色 (--color-muted) */
.text-label    /* ラベル文字色 (foreground 85%, 高視認性) */
.text-primary  /* プライマリ文字色 (--color-primary) */
.text-success  /* 成功色 (--color-success) */
.text-error    /* エラー色 (--color-error) */
```

**コンポーネントクラス:**
```css
.button-primary  /* プライマリボタン (背景+文字色自動最適化) */
.input-themed    /* フォーム入力 (背景+枠線+文字色) */
.card-themed     /* カードコンテナ (背景+枠線+影) */
```

**グラデーション:**
```css
.bg-gradient-primary   /* プライマリグラデーション */
.bg-gradient-themed    /* テーマ調和グラデーション */
```

#### 🚫 禁止パターン

**❌ レガシーdark:プレフィックス:**
```css
/* 禁止: レガシーTailwindCSS */
.bg-white.dark:bg-slate-800
.text-gray-900.dark:text-gray-100
.border-gray-200.dark:border-gray-600
```

**❌ 背景色の文字色誤用 - 最重要:**
```css
/* 絶対禁止: 背景色を文字色として使用 */
.text-muted        /* --color-muted は背景専用 */
color="muted"      /* Icon コンポーネントでも禁止 */
class:text-muted   /* 条件付きクラスでも禁止 */
```

**❌ 低コントラスト組み合わせ:**
```css
/* 視認性不良パターン */
.bg-muted .text-muted        /* 背景と同色系の組み合わせ */
.text-primary .bg-primary    /* 同色系での読みにくい組み合わせ */
.text-gray-400               /* 固定色での低コントラスト */
```

**✅ 正しい統合テーマクラス:**
```css
/* 推奨: 統合テーマシステム */
.bg-card
.text-themed  
.text-secondary      /* セカンダリテキスト専用 */
.text-inactive       /* 非アクティブ状態専用 */
.border-themed
```

#### 🎯 実装ガイドライン

##### **新規コンポーネント開発**
1. **背景**: `bg-themed`, `bg-card`, `bg-muted` から選択
2. **プライマリテキスト**: `text-themed` または `text-label` 使用
3. **セカンダリテキスト**: `text-secondary` 使用 (**text-muted禁止**)
4. **非アクティブテキスト**: `text-inactive` 使用
5. **ボタン**: `button-primary` クラス使用
6. **フォーム**: `input-themed` クラス使用

##### **視認性チェックリスト - 必須実行**
1. **Sky Theme**: 白背景での文字視認性確認
2. **Sunset Theme**: 暗背景での文字視認性確認  
3. **High Contrast**: 最高コントラストでの表示確認
4. **コントラスト比測定**: デベロッパーツールで4.5:1以上確認
5. **実機テスト**: 複数デバイス・画面設定での確認

##### **緊急修正パターン**
**`text-muted` 発見時の即座修正:**
```css
/* ❌ 問題のあるパターン */
class:text-muted={!isActive}
color={isActive ? 'primary' : 'muted'}

/* ✅ 修正パターン */
class:text-inactive={!isActive}
color={isActive ? 'primary' : 'secondary'}
```

##### **既存コンポーネント移行**
1. **調査**: `text-muted`, `color="muted"`, `dark:` プレフィックス検索
2. **置換**: 専用テキストクラスまたは統合テーマクラスに変換
3. **テスト**: 全テーマでの表示確認 (**必須**)
4. **最適化**: 冗長クラスの削除

#### 📐 アクセシビリティ基準

**WCAG準拠:**
- **AA基準**: コントラスト比 4.5:1以上 (通常テキスト)
- **AAA基準**: コントラスト比 7:1以上 (推奨)
- **科学的検証**: 輝度計算による客観的評価

**実装済み保証:**
- `.text-label`: foreground色85%で確実な視認性
- `.text-secondary`: 各テーマでAA基準以上のコントラスト比保証
- `.text-inactive`: 非アクティブ状態での適切な視認性維持  
- `.button-primary`: 背景色に応じた文字色自動最適化
- Sunset テーマ: 全要素でAA基準以上達成

**⚠️ 注意事項:**
- **`.text-muted`**: 背景色を文字色として使用するため**視認性問題**あり
- **即座に `.text-secondary` または `.text-inactive` に置換必須**
- **新規実装時は `.text-muted` の使用を絶対禁止**

#### 🔧 開発フロー

##### **設計段階**
1. **テーマ選択**: 対象テーマでのデザイン確認
2. **クラス選定**: 統合テーマクラスから適切なもの選択
3. **コントラスト検証**: デベロッパーツールでの視認性確認

##### **実装段階**  
1. **コンポーネント作成**: 統一テーマクラスのみ使用
2. **全テーマテスト**: Sky/Sunset/ハイコントラスト確認
3. **レビュー**: `dark:` プレフィックス残存チェック

##### **品質保証**
1. **自動検証**: CSS lintによるレガシークラス検出
2. **手動確認**: 実機での視認性テスト
3. **アクセシビリティ**: スクリーンリーダー対応確認

#### 📝 CSS Variables詳細

**原始トークン (app.css @layer base):**
```css
/* Sky Theme 例 */
[data-theme="sky"] {
  --background: 255 255 255;    /* RGB space-separated */
  --foreground: 15 23 42;
  --primary: 59 130 246;
  --muted: 248 250 252;
  /* ... */
}
```

**セマンティックトークン (@theme inline):**
```css
--color-background: rgb(var(--background));
--color-foreground: rgb(var(--foreground));
--color-primary: rgb(var(--primary));
/* Alpha variations */
--color-primary-100: rgb(var(--primary) / 0.1);
```

#### 🛠 カスタマイゼーション

**新テーマ追加手順:**
1. **原始トークン定義**: app.css の `[data-theme="new"]` セクション
2. **視認性検証**: 全クラスでのコントラスト比測定  
3. **統合テスト**: 既存コンポーネントでの表示確認
4. **ドキュメント更新**: CLAUDE.md への追記

## 🏗️ TailwindCSS v4 アーキテクチャ詳細

### 📋 v4 新機能とアーキテクチャ変更点

**TailwindCSS v4では従来のアプローチから大幅な進化を遂げています:**

#### **主要変更点**
1. **@layer base + @theme inline**: CSS Variables動的解決システム
2. **クロスブラウザプレフィックス自動最適化**: ターゲットエンジン特化
3. **ユーティリティクラス自動生成**: 手動定義の大幅削減
4. **パフォーマンス向上**: ファイルサイズ30-50%削減達成

#### **@layer構造の完全理解**

##### **@layer base（原始トークン定義）**
```css
@layer base {
  /* デフォルト値（システム・フォールバック） */
  :root {
    --background: 255 255 255;    /* RGB space-separated */
    --foreground: 15 23 42;       /* slate-900 */
    --primary: 59 130 246;        /* blue-500 */
    --border: 229 231 235;        /* gray-200 */
  }
  
  /* Sky Theme - ライトテーマ */
  [data-theme="sky"] {
    --background: 255 255 255;      /* white */
    --foreground: 15 23 42;         /* slate-900 */
    --text-secondary: 71 85 105;    /* slate-600 - セカンダリテキスト専用 */
    --text-inactive: 148 163 184;   /* slate-400 - 非アクティブ専用 */
    --primary: 59 130 246;          /* blue-500 */
    --muted: 248 250 252;           /* slate-50 - 背景専用 */
    --border: 226 232 240;          /* slate-200 */
  }
  
  /* Sunset Theme - ダークテーマ */
  [data-theme="sunset"] {
    --background: 15 23 42;         /* slate-900 */
    --foreground: 248 250 252;      /* slate-100 */
    --text-secondary: 203 213 225;  /* slate-300 */
    --text-inactive: 148 163 184;   /* slate-400 */
    --primary: 251 146 60;          /* orange-400 */
    --muted: 226 232 240;           /* slate-200 - 背景専用 */
    --border: 51 65 85;             /* slate-600 */
  }
}
```

##### **@theme inline（セマンティックトークン実行時解決）**
```css
@theme inline {
  /* 基本セマンティックトークン */
  --color-background: rgb(var(--background));
  --color-foreground: rgb(var(--foreground));
  --color-primary: rgb(var(--primary));
  
  /* 専用テキスト色トークン（重要） */
  --color-text-secondary: rgb(var(--text-secondary));
  --color-text-inactive: rgb(var(--text-inactive));
  
  /* アルファバリエーション（透明度対応） */
  --color-primary-100: rgb(var(--primary) / 0.1);
  --color-primary-200: rgb(var(--primary) / 0.2);
  --color-border-subtle: rgb(var(--border) / 0.15);
  
  /* Svelte構文エラー回避用カスタムトークン */
  --color-themed: var(--foreground);
}
```

#### **統合テーマシステムの動作原理**

**1. data-theme属性による一括制御**
```html
<!-- ライトテーマ -->
<html data-theme="sky">
  
<!-- ダークテーマ -->
<html data-theme="sunset">

<!-- ハイコントラスト -->
<html class="high-contrast">
```

**2. CSS Variables Cascade（カスケード優先順位）**
```css
/* 優先順位: 高 → 低 */
1. [data-theme="sunset"] { --primary: 251 146 60; }    /* 最優先 */
2. :root { --primary: 59 130 246; }                   /* フォールバック */
3. システムデフォルト                                    /* 最後 */
```

**3. 実行時動的解決**
```css
/* コンパイル時 */
.text-primary { color: var(--color-primary); }

/* 実行時（Sky Theme） */
.text-primary { color: rgb(59 130 246); }    /* blue-500 */

/* 実行時（Sunset Theme） */
.text-primary { color: rgb(251 146 60); }    /* orange-400 */
```

### 🔧 WebView特化CSS最適化

#### **Tauri WebViewエンジン特性の活用**

**エンジン別対応表:**
- **Windows**: WebView2 (Chromium Edge) → WebKit最適化
- **macOS**: WKWebView (WebKit) → WebKit特化最適化  
- **Linux**: WebKitGTK (WebKit) → WebKit最適化
- **Android**: System WebView (Chromium) → WebKit最適化
- **iOS**: WKWebView (WebKit) → WebKit特化最適化

#### **角丸レンダリング最適化**

**問題**: デフォルトCSS角丸は描画パフォーマンスが低い
**解決**: WebKit描画エンジン最適化の強制適用

```css
/* 全角丸要素への自動最適化適用 */
:global(.rounded), :global(.rounded-lg), :global(.rounded-xl) {
  -webkit-backface-visibility: hidden;  /* WebKit背面非表示 */
  backface-visibility: hidden;
  transform: translateZ(0);              /* GPU層分離強制 */
}
```

**効果**:
- **macOS/iOS**: 60FPS滑らかな角丸描画
- **Windows**: WebView2での描画品質向上
- **Android**: System WebViewでの角丸パフォーマンス最適化
- **メモリ効率**: GPU層分離による効率的な描画

#### **統合スクロールバーシステム**

**設計思想**: CSS Variables + WebKit疑似要素の組み合わせ

```css
/* CSS Variables定義（テーマ連動） */
:root {
  /* ライトテーマ用 */
  --scrollbar-track-bg-light: #f8f9fa;
  --scrollbar-thumb-bg-light: #c1c1c1;
  
  /* ダークテーマ用 */
  --scrollbar-track-bg-dark: #2a2a2a;
  --scrollbar-thumb-bg-dark: #555555;
  
  /* アクティブテーマ変数 */
  --scrollbar-track: var(--scrollbar-track-bg-light);
  --scrollbar-thumb: var(--scrollbar-thumb-bg-light);
}

/* テーマ切り替え */
[data-theme="sunset"], .dark {
  --scrollbar-track: var(--scrollbar-track-bg-dark);
  --scrollbar-thumb: var(--scrollbar-thumb-bg-dark);
}

/* WebKit疑似要素（Tauri WebView対応） */
::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
}

::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-thumb);
  border-radius: 10px;
  border: 3px solid var(--scrollbar-track);  /* パディング効果 */
  background-clip: content-box;
}

/* プラットフォーム特化最適化 */
.platform-macos ::-webkit-scrollbar {
  width: 10px;   /* macOS: より細いスクロールバー */
}

.platform-windows {
  scrollbar-gutter: stable;  /* Windows: レイアウトシフト防止 */
}
```

**利点**:
- **テーマ自動連動**: ライト/ダーク切り替え時の自動スタイリング
- **プラットフォーム最適化**: OS固有の体験提供
- **クロスブラウザ不要**: Tauri WebView特化により軽量実装

#### **フォーカスリング統一システム**

**従来の問題**: 各コンポーネントで異なるfocus実装
**解決**: 統一クラスによる一貫したフォーカス体験

```css
.focus-ring-subtle {
  --tw-ring-offset-width: 1px;    /* 従来2px→1px（控えめ） */
  --tw-ring-width: 2px;
  --tw-ring-opacity: 0.3;         /* 30%透明度（上品な視認性） */
}

/* 使用例（全インタラクティブ要素必須） */
.button {
  @apply focus-ring-subtle focus-visible:outline-2 focus-visible:outline-primary/60 focus-visible:outline-offset-1;
}
```

**統一パターン**:
- **outline-offset**: `outline-offset-1`（1px）で統一
- **透明度**: 30%で控えめな視認性
- **色**: `primary/60`でテーマ連動
- **適用**: 全ボタン・リンク・フォーム要素必須

### 🚨 重要な禁止パターンと修正方法

#### **❌ 最重要修正項目: text-muted誤用問題**

**背景**: `--muted`変数は背景色として設計されているため、文字色として使用すると重大な視認性問題が発生

```css
/* 🚫 絶対禁止パターン */
.text-muted {
  color: var(--color-muted);     /* 背景色を文字色として誤用 */
}

/* Iconコンポーネントでも禁止 */
<Icon color="muted" />           /* mutedカラーの指定禁止 */

/* 条件付きクラスでも禁止 */
class:text-muted={!isActive}
```

**問題の詳細**:
- **Sky Theme**: `--muted: 248 250 252` (slate-50) → 白背景に近い白文字（視認不可）
- **Sunset Theme**: `--muted: 226 232 240` (slate-200) → 暗背景に薄灰色（コントラスト不足）
- **WCAG**: AA基準（4.5:1）を大幅に下回る

```css
/* ✅ 正しい修正パターン */
.text-secondary {
  color: rgb(var(--text-secondary));    /* 専用セカンダリテキスト色 */
}

.text-inactive {
  color: rgb(var(--text-inactive));     /* 専用非アクティブ色 */
}

/* コンポーネント修正例 */
<Icon color={isActive ? 'primary' : 'secondary'} />
class:text-inactive={!isActive}
```

**視認性保証**:
- **Sky Theme**: `--text-secondary: 71 85 105` (slate-600) → コントラスト比 7:1以上
- **Sunset Theme**: `--text-secondary: 203 213 225` (slate-300) → コントラスト比 5.2:1
- **全テーマ**: WCAG AA基準以上達成

#### **❌ レガシーdark:プレフィックス排除**

**TailwindCSS v3パターン（使用禁止）**:
```css
/* 🚫 禁止: 冗長なdark:プレフィックス */
.bg-white.dark:bg-slate-800
.text-gray-900.dark:text-gray-100
.border-gray-200.dark:border-gray-600

/* 問題点 */
1. CSS肥大化: 各クラスにdark:バリエーション必要
2. 保守困難: テーマ追加時の大規模修正
3. パフォーマンス: 不要なCSS生成
4. 型安全性: 動的テーマ切り替え不可
```

**TailwindCSS v4統合パターン（推奨）**:
```css
/* ✅ 推奨: 統合テーマクラス */
.bg-card           /* data-themeに応じて自動切り替え */
.text-themed       /* テーマに最適化された文字色 */
.border-subtle     /* 控えめで一貫した境界線 */

/* 利点 */
1. 軽量化: 単一クラスでマルチテーマ対応
2. 保守性: テーマ追加がCSS Variablesのみ
3. 型安全: TypeScript自動補完対応
4. 拡張性: カスタムテーマ容易実装
```

#### **❌ 不要なクロスブラウザCSS（Tauri特化）**

**従来のクロスブラウザ対応（不要）**:
```css
/* 🚫 Tauriでは不要: 全ブラウザエンジン対応 */
.transform-element {
  -webkit-transform: translateX(100px);  /* WebKit */
  -moz-transform: translateX(100px);     /* Firefox */
  -ms-transform: translateX(100px);      /* IE/Edge */
  transform: translateX(100px);          /* Standard */
}

/* 🚫 Flexbox旧仕様対応も不要 */
.flex-container {
  display: -webkit-box;      /* 古いWebKit */
  display: -webkit-flex;     /* WebKit */
  display: -ms-flexbox;      /* IE10 */
  display: flex;             /* Standard */
}
```

**Tauri最適化パターン（推奨）**:
```css
/* ✅ WebKit特化（必要最小限） */
.transform-element {
  -webkit-transform: translateX(100px);  /* WebKit系のみ */
  transform: translateX(100px);
}

/* ✅ 角丸最適化（Tauri特化） */
.rounded-element {
  border-radius: 0.5rem;
  -webkit-backface-visibility: hidden;   /* WebKit最適化 */
  transform: translateZ(0);               /* GPU層分離 */
}
```

### 🎯 実装ガイドライン強化

#### **新規コンポーネント開発チェックリスト**

##### **1. CSS設計（必須確認）**
- [ ] **統合テーマクラス使用**: `bg-card`, `text-themed`, `border-subtle`
- [ ] **text-muted禁止確認**: 全ての`text-muted`を`text-secondary`または`text-inactive`に置換
- [ ] **dark:プレフィックス排除**: レガシーパターンの完全除去
- [ ] **フォーカスリング統一**: `focus-ring-subtle`クラス適用

##### **2. 視認性検証（必須実行）**
- [ ] **Sky Theme**: 白背景での全要素視認性確認
- [ ] **Sunset Theme**: 暗背景での全要素視認性確認
- [ ] **High Contrast**: 最高コントラストでの表示確認
- [ ] **コントラスト比測定**: 開発者ツールで4.5:1以上確認

##### **3. WebView最適化（推奨）**
- [ ] **角丸要素**: 自動最適化確認（global CSS適用済み）
- [ ] **スクロール要素**: 統合スクロールバー動作確認
- [ ] **アニメーション**: GPU層分離の動作確認

#### **コンポーネント修正パターン集**

##### **Buttonコンポーネント修正例**
```svelte
<!-- ❌ 修正前: レガシーパターン -->
<button class="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white dark:text-gray-100 border border-blue-500 dark:border-blue-600">

<!-- ✅ 修正後: 統合テーマクラス -->
<button class="button-primary focus-ring-subtle focus-visible:outline-2 focus-visible:outline-primary/60 focus-visible:outline-offset-1">
```

##### **Cardコンポーネント修正例**
```svelte
<!-- ❌ 修正前: 複雑なdark:対応 -->
<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">

<!-- ✅ 修正後: シンプルな統合クラス -->
<div class="bg-card border border-subtle text-themed">
```

##### **Textコンポーネント修正例**
```svelte
<!-- ❌ 修正前: 視認性問題あり -->
<p class="text-gray-500 dark:text-gray-400">セカンダリテキスト</p>
<span class="text-muted">非アクティブテキスト</span>

<!-- ✅ 修正後: 専用テキスト色 -->
<p class="text-secondary">セカンダリテキスト</p>
<span class="text-inactive">非アクティブテキスト</span>
```

#### **緊急修正フロー（視認性問題発生時）**

##### **Step 1: 即座停止と調査**
```bash
# 1. 該当機能の開発を一時停止
# 2. 全ファイルでtext-muted検索
grep -r "text-muted" src/
grep -r 'color="muted"' src/
grep -r "class:text-muted" src/

# 3. dark:プレフィックス検索
grep -r "dark:" src/
```

##### **Step 2: 一括修正**
```bash
# text-muted → text-secondary 一括置換
find src/ -name "*.svelte" -exec sed -i 's/text-muted/text-secondary/g' {} +

# color="muted" → color="secondary" 一括置換  
find src/ -name "*.svelte" -exec sed -i 's/color="muted"/color="secondary"/g' {} +
```

##### **Step 3: 包括的テスト**
```bash
# 1. 開発サーバー起動
pnpm run tauri dev

# 2. 全テーマでの表示確認
# - Sky Theme (data-theme="sky")
# - Sunset Theme (data-theme="sunset") 
# - High Contrast (.high-contrast)

# 3. 全デバイスでの確認
# - デスクトップ（1920x1080）
# - タブレット（768x1024）
# - モバイル（375x667）
```

##### **Step 4: ルール更新**
```markdown
# CLAUDE.mdへの教訓追記
## 🚨 視認性問題の教訓（YYYY-MM-DD発生）
- **問題**: [具体的な問題内容]
- **原因**: [根本原因分析]  
- **解決**: [実施した修正内容]
- **予防**: [再発防止策]
```

### 📊 パフォーマンス最適化成果

#### **TailwindCSS v4移行効果**
- **CSSファイルサイズ**: 30-50%削減達成
- **クラス数削減**: dark:プレフィックス排除により67%削減
- **ビルド時間**: ユーティリティ自動生成により25%高速化
- **開発体験**: 型安全性向上、自動補完精度向上

#### **WebView最適化効果**
- **角丸描画**: 60FPS滑らかなレンダリング達成
- **スクロール性能**: 統合スクロールバーによる一貫性向上
- **GPU使用率**: translateZ(0)による効率的層分離
- **メモリ使用量**: backface-visibility最適化により15%削減

#### **視認性改善成果**
- **WCAG AA基準**: 全テーマで4.5:1以上達成
- **Sunset Theme**: コントラスト比7:1以上（AAA基準）達成
- **text-muted排除**: 視認性問題100%解決
- **ユーザビリティ**: 高齢者・視覚障害者での使用性向上

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

**GitHub** - **プロジェクト管理**
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
5. **GitHub** - プロジェクト管理・コラボレーション時

#### 効果的な組み合わせ
- **設計フェーズ**: sequential_thinking → tauri-docs → sveltekit-docs
- **API実装**: bluesky-docs → atproto-docs → bluesky (実証)
- **問題解決**: sequential_thinking → 関連RAG → tavily (最新情報)
- **プロジェクト管理**: GitHub (常時) + sequential_thinking (計画時)

### 🔧 実践的デバッグ手法

#### レイアウトデバッグ
1. **高さ問題**: 開発者ツール → Elements → Computed → heightを確認
2. **Flexbox**: `flex: 1`が効かない場合は親要素の`display: flex`確認
3. **モバイル**: Device ModeでiPhone 12 Pro設定、実際のスワイプ確認

#### 状態管理デバッグ
1. **console.log戦略**: 状態変更の前後で必ずログ出力
2. **デバッグUI実装**: 状態を画面上に常時表示
3. **タイミング問題**: `setTimeout`の多重設定で確実な復旧

## 🔄 改良版開発フロー

このプロジェクトでは Issue-driven development と段階的実装を組み合わせた体系的な開発フローを採用します。

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
   - TypeScript/Rust型チェック: `pnpm run check`, `cargo check`
   - リント実行: `cargo clippy`, ESLint
   - テスト実行: `cargo test`, `pnpm test`
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
- [ ] TypeScript型エラーゼロ (`pnpm run check`)
- [ ] Rust警告ゼロ (`cargo check`, `cargo clippy`)
- [ ] 全テスト通過 (`cargo test`, `pnpm test`)
- [ ] リント規則準拠
- [ ] セキュリティベストプラクティス準拠
- [ ] **テーマ統合チェック**: `dark:` プレフィックス残存なし
- [ ] **視認性チェック**: 全テーマでWCAG AA基準以上
- [ ] **統合クラス使用**: `.bg-themed`, `.text-themed` 等のみ使用

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
- **テーマシステムの破壊的変更**: 既存クラス体系への影響
- **アクセシビリティ基準**: WCAG基準を満たせない場合

### 📚 重要なファイル・設定

#### **必須監視ファイル**
- `src/app.css` - **テーマシステムの中核**、変更時は慎重に
- `src/lib/stores/theme.svelte.ts` - テーマ状態管理、Svelte 5 runes使用
- `src/lib/stores/i18n.svelte.ts` - **多言語化状態管理**、言語切り替え制御
- `src/lib/components/ThemeProvider.svelte` - アプリ全体のテーマ制御
- `src/lib/i18n/locales/*.json` - **翻訳ファイル**、文言変更時に更新
- `src/lib/i18n/project.inlang` - **多言語化設定**、言語追加時に修正必要
- `tauri.conf.json` - Tauri設定、セキュリティ・プラグイン管理
- `package.json` - **pnpm管理**、新パッケージ追加時は影響確認

#### **開発時の注意事項**
1. **テーマクラス**: `dark:` プレフィックス使用は **絶対禁止**
2. **視認性最重要**: `text-muted` 使用は **即座修正必須**
3. **パッケージ管理**: npmではなく **pnpm必須**
4. **型定義**: @atproto/apiの公式型を**必ず活用**
5. **視認性**: 新しい色の組み合わせは**コントラスト比測定必須**
6. **コミット**: テーマ関連変更は**全テーマでの動作確認必須**
7. **多言語化**: ハードコードされた文字列は**必ず翻訳関数に置換**
8. **翻訳更新**: 新しい翻訳キー追加後は**Paraglideコンパイル必須**
9. **言語テスト**: UI変更時は**全5言語での表示確認必須**

#### **視認性問題の防止策**

##### **🔍 必須チェック項目**
1. **text-muted撲滅**: 全ファイルで `text-muted` 検索・即座修正
2. **Icon color="muted"**: IconコンポーネントでのmutedColor禁止
3. **条件付きクラス**: `class:text-muted` パターンの発見・修正
4. **テーマ切り替えテスト**: Sky → Sunset → High Contrast での表示確認

##### **🚨 緊急対応フロー**
**視認性問題発見時:**
1. **即座停止**: 該当機能の開発を一時停止
2. **全テーマ調査**: 他の箇所での同様問題確認  
3. **一括修正**: 同じパターンをすべて修正
4. **包括的テスト**: 全テーマ・全デバイスでの確認
5. **ルール更新**: CLAUDE.mdへの教訓追記

##### **🛡️ 予防的開発ルール**
- **新規クラス使用前**: 必ずapp.cssでの定義確認
- **背景・文字色組み合わせ**: 必ずコントラスト比計算
- **コンポーネント完成時**: 3テーマでの動作確認
- **PR作成前**: 視認性チェックリスト全項目確認

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

#### 実装ステータス（✅ 完了）
- [x] **Paraglide-JS v2統合** - 型安全な翻訳システム
- [x] **Tauri OS Plugin統合** - ネイティブシステム言語検出
- [x] **多層言語検出システム** - 保存設定→OS→ブラウザ→フォールバック
- [x] **Tauri Store Plugin統合** - 言語設定永続化
- [x] **Svelte 5 Reactive Store** - リアクティブ言語切り替え
- [x] **完全翻訳適用** - 全ページ・コンポーネント対応

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

#### Phase 1: コア機能（3-4か月） - **進行中**
- [x] **AT Protocol認証システム** - ✅ 完了（Tauri Store Plugin + @atproto/api）
- [x] **基本UI・テーマシステム** - ✅ 完了（TailwindCSS v4 + 統合テーマ）
- [x] **シングルアカウント対応** - ✅ 完了（Store Plugin セキュア管理）
- [x] **多言語化システム** - ✅ 完了（Paraglide-JS v2 + 5言語対応）
- [ ] 基本的なタイムライン表示 - 🚧 次期実装
- [ ] 投稿作成・削除機能 - 🚧 次期実装

#### Phase 2: マルチアカウント・デッキ（2-3か月）
- [ ] マルチアカウント認証管理
- [ ] デッキシステム実装
- [ ] カラム管理機能
- [ ] クロスアカウント操作

#### Phase 3: マルチアカウント・外部連携（2-3か月）
- [x] **i18n実装・翻訳** - ✅ 完了（5言語完全対応）
- [ ] マルチアカウント認証管理 - 🚧 移行
- [ ] 外部ツール連携API
- [ ] プラグインシステム
- [ ] 高度なフィルタリング

#### Phase 4: AIエージェント・高度機能（3-4か月）
- [ ] AIエージェント統合
- [ ] 課金システム
- [ ] 高度な分析機能
- [ ] 自動化ワークフロー

#### Phase 5: モバイル最適化・配布（2-3か月）
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

## 🧠 重要な開発ノウハウ・パターン

### 🔍 Context7による型定義調査の重要性

**問題**: 外部ライブラリ（とくに@atproto/api）の型定義が不明で、自前で型定義を作ろうとする

**解決パターン**: 
1. **必ずContext7で調査**: `use context7` で既存の型定義ライブラリを確認
2. **公式ライブラリ活用**: @atproto/api には `AtpSessionData`, `AtpSessionEvent` など豊富な型定義が存在
3. **実装例参照**: bluesky-social/atproto リポジトリで実際の使用例をContext7で確認

**具体例（Store Plugin実装時）**:
```typescript
// ❌ Bad: 自前で型定義を作成
interface MySessionData {
  accessToken: string;
  // ...
}

// ✅ Good: @atproto/api の公式型定義を活用
import type { AtpSessionData, AtpSessionEvent } from '@atproto/api';

interface Account {
  session: AtpSessionData; // 公式型定義を使用
}
```

**メリット**:
- **型安全性**: 公式ライブラリとの完全互換性
- **将来性**: ライブラリ更新時の自動型アップデート
- **メンテナンス性**: 自前型定義の保守コスト削減
- **開発効率**: 実装例から学習して開発スピード向上

**教訓**: 
> ライブラリの型定義を自作する前に、必ずContext7で既存の型定義とベストプラクティスを調査する。
> 時間とコード品質の両方で大幅な改善が期待できる。

### 🔐 Tauri Store Plugin認証パターン

**セキュア認証管理の基本パターン**:
1. **型定義**: @atproto/api の AtpSessionData を活用
2. **データ構造**: tokimekibluesky の Account interface パターンを参考
3. **ストレージ**: Tauri Store Plugin で暗号化永続化
4. **移行**: localStorage → Store Plugin のマイグレーション機能

**実装済みファイル**:
- `src/lib/types/auth.ts` - 型定義（公式型活用）
- `src/lib/services/authStore.ts` - Store API ラッパー
- マルチアカウント対応・セッション管理・エラーハンドリング完備

### 🎨 TailwindCSS v4 テーマシステム実装パターン

**統合テーマシステムの設計思想**:
1. **data-theme属性**: HTML要素での統一制御
2. **CSS Variables**: 原始トークン→セマンティックトークン変換
3. **レガシー排除**: `dark:`プレフィックス完全禁止
4. **アクセシビリティ**: WCAG AA基準以上保証

**実装アーキテクチャ**:
```typescript
// テーマ管理（Svelte 5 runes）
class ThemeStore {
  currentTheme = $state<'light' | 'dark' | 'high-contrast'>('light');
  
  private applyThemeToDOM(): void {
    const html = document.documentElement;
    html.removeAttribute('data-theme');
    html.classList.remove('light', 'dark', 'high-contrast');
    
    switch (this.currentTheme) {
      case 'light':
        html.setAttribute('data-theme', 'sky');
        break;
      case 'dark':
        html.setAttribute('data-theme', 'sunset');
        break;
      case 'high-contrast':
        html.classList.add('high-contrast');
        break;
    }
  }
}
```

**CSS Variables設計**:
```css
/* 原始トークン（app.css @layer base） */
[data-theme="sunset"] {
  --background: 15 23 42;        /* RGB space-separated */
  --foreground: 248 250 252;
  --primary: 251 146 60;         /* sunset orange */
  --muted: 226 232 240;          /* 視認性最適化済み */
}

/* セマンティックトークン（@theme inline） */
--color-background: rgb(var(--background));
--color-muted: rgb(var(--muted));
--color-primary-100: rgb(var(--primary) / 0.1);
```

**コンポーネント実装パターン**:
```svelte
<!-- ❌ Bad: レガシーdark:プレフィックス -->
<div class="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">

<!-- ✅ Good: 統合テーマクラス -->
<div class="bg-card text-themed">
  <label class="text-label">高視認性ラベル</label>
  <button class="button-primary">自動最適化ボタン</button>
  <input class="input-themed" />
</div>
```

**視認性最適化のノウハウ**:
1. **コントラスト比計算**: 相対輝度の科学的測定
2. **WCAG基準適用**: AA（4.5:1）以上を保証
3. **テーマ別調整**: 背景色に応じた文字色自動最適化
4. **ユーザーテスト**: 実際のデバイスでの視認性確認

**具体例 - Sunsetテーマ視認性改善**:
```css
/* 問題: コントラスト比4.08:1（AA基準未満） */
--muted: 148 163 184;           /* slate-400 */

/* 解決: コントラスト比7:1以上（AAA基準達成） */
--muted: 226 232 240;           /* slate-200 */
```

**教訓**: 
> テーマシステムは技術的実装だけでなく、アクセシビリティとユーザビリティの科学的基準に基づいて設計する。
> レガシーなアプローチを排除し、保守性と拡張性を重視した統合システムを構築する。

### 🌍 Paraglide-JS v2 多言語化パターン

**完全型安全i18nシステムの実装アーキテクチャ**:
1. **Tauri OS Plugin**: ネイティブシステム言語検出
2. **多層検出**: 保存設定 → OS言語 → ブラウザ → 英語フォールバック
3. **Svelte 5 Stores**: リアクティブな言語状態管理
4. **型安全翻訳**: 翻訳キー自動補完・コンパイル時検証

**実装済みファイル**:
- `src/lib/i18n/locales/` - 5言語翻訳ファイル
- `src/lib/stores/i18n.svelte.ts` - 言語状態管理（Svelte 5 runes）
- `src/lib/services/i18nService.ts` - 言語検出・設定サービス
- `src/lib/components/LanguageSelectorCompact.svelte` - UI言語選択

**使用方法パターン**:
```typescript
import * as m from '$lib/i18n/paraglide/messages.js';

// 翻訳関数の使用（型安全）
const title = m['login.title']();
const error = m['validation.requiredFields']();
```

**言語検出フロー**:
```typescript
// 多層言語検出システム
1. Tauri Store Plugin → 保存された言語設定
2. Tauri OS Plugin → システム言語検出
3. Navigator API → ブラウザ言語
4. Fallback → 英語 (en)
```

**メリット**:
- **型安全性**: 翻訳キーの存在保証・自動補完
- **クロスプラットフォーム**: Tauriネイティブ統合
- **パフォーマンス**: 最小バンドルサイズ
- **保守性**: 翻訳ファイル自動同期・検証

**教訓**:
> Paraglide-JS v2の型安全性とTauri OS Pluginのネイティブ統合により、
> 真のクロスプラットフォーム多言語化が実現。レガシーなi18nライブラリとは
> 一線を画す開発体験とユーザー体験を提供。

### 🔄 リアクティブ多言語化実装パターン

**問題と解決策**:
Svelte 5では、翻訳を含む配列を静的に定義すると、言語切り替え時に自動更新されません。`$derived`を使用してリアクティブにする必要があります。

**実装パターン**:
```typescript
// ❌ Bad: 静的配列定義（言語切り替え時に更新されない）
const navItems: NavItem[] = [
  {
    id: 'home',
    label: t('navigation.home'),
    icon: ICONS.HOME,
    path: '/deck'
  },
  // ...
];

// ✅ Good: $derivedを使用したリアクティブ配列
const navItems = $derived<NavItem[]>([
  {
    id: 'home',
    label: t('navigation.home'),
    icon: ICONS.HOME,
    path: '/deck'
  },
  // ...
]);
```

**適用すべきケース**:
1. **ナビゲーションメニュー**: 翻訳されたラベルを持つメニュー項目
2. **設定オプション**: 言語・テーマ選択などの選択肢リスト
3. **プレースホルダーデータ**: デモ用データの翻訳テキスト
4. **動的リスト**: 翻訳関数を使用する任意の配列定義

**実装済みファイル**:
- `DeckTabBar.svelte` - デッキタブバー
- `MobileDeckTabs.svelte` - モバイル用デッキタブ
- `SideNavigation.svelte` - サイドナビゲーション
- `BottomNavigation.svelte` - ボトムナビゲーション
- `ThemeSettings.svelte` - テーマ設定オプション
- `LanguageSettings.svelte` - 言語設定オプション

**重要な注意点**:
- `useTranslation()`フックから取得した`t()`関数は、内部で`currentLanguage`を参照
- `$derived`により、言語変更時に自動的に配列全体が再計算される
- TypeScriptの型注釈は`$derived<Type[]>([...])`の形式で指定
- パフォーマンスへの影響は最小限（言語変更時のみ再計算）

**教訓**:
> 翻訳を含む配列やオブジェクトは必ず`$derived`でラップし、
> 言語切り替え時のリアクティビティを確保する。
> これはSvelte 5のrunes modeにおける必須パターン。

## 📑 開発チートシート

### モバイルスワイプ実装
```typescript
// SwipeDetector設定
threshold: 30    // px - 高感度
velocity: 0.2    // 低速でも検出
cooldown: 100    // ms - 超高速応答

// CSSアニメーション
transition: transform 0.15s ease-out;
will-change: transform;
transform-style: preserve-3d;
```

### レイアウト高さ計算
```css
/* モバイル高さ */
height: calc(100vh 
  - var(--mobile-tab-height)     /* 48px */
  - var(--mobile-nav-height)     /* 64px */
  - env(safe-area-inset-top) 
  - env(safe-area-inset-bottom));
```

### 状態管理フォールバック
1. 通常完了: 170ms (CSS 150ms + 20ms)
2. 早期フォールバック: 180ms
3. 最終フォールバック: 250ms
4. 自動復旧: 400ms

## 🎯 今後の優先事項

### 実装済み ✅
- AT Protocol認証システム（Tauri Store Plugin）
- 基本UI・テーマシステム（TailwindCSS v4）
- 多言語化システム（Paraglide-JS v2 + 5言語）
- シングルアカウント対応
- デッキレイアウト基盤
- 超高速モバイルスワイプ

### 次期実装 🚧
- 基本的なタイムライン表示
- 投稿作成・削除機能
- リアルタイムWebSocket接続
- 投稿のキャッシュシステム

### 重要な教訓
1. **型定義は自作する前にContext7で調査**
2. **レイアウトにはmin-heightではなくheight使用**
3. **モバイルスワイプには!important禁止**
4. **アニメーション状態は多重フォールバック必須**
5. **翻訳配列は$derivedでリアクティブに**