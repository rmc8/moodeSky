# CLAUDE.md

**Speak in Japanese!**

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Tauri マルチプラットフォームアプリケーション** combining SvelteKit frontend with Rust backend. The project targets **desktop (macOS, Windows, Linux)** and **mobile (iOS, Android)** platforms using Tauri 2.0 and Tauri Mobile Alpha.

### 技術スタック
- **フロントエンド**: SvelteKit + TypeScript (SPA構成)
- **バックエンド**: Rust (Tauri 2.0)
- **モバイル**: Tauri Mobile Alpha (iOS/Android)
- **目的**: Bluesky クライアントアプリ (AT Protocol統合)

## Development Commands

### Desktop Development
- `npm run tauri dev` - **メイン開発コマンド** (フロントエンド + バックエンド)
- `npm run dev` - SvelteKit開発サーバーのみ (localhost:1420)
- `npm run build` - フロントエンド本番用ビルド
- `npm run preview` - 本番ビルドプレビュー
- `npm run check` - TypeScript/Svelte型チェック
- `npm run check:watch` - 型チェック (watch モード)

### Desktop Build
- `npm run tauri build` - デスクトップアプリ本番ビルド (現在のプラットフォーム)
- `npm run tauri build --target all` - 全プラットフォーム向けビルド

### Mobile Development (Tauri Mobile Alpha)

**Android:**
- `npm run tauri android init` - Android プロジェクト初期化
- `npm run tauri android dev` - Android 開発 (エミュレータ)
- `npm run tauri android build` - Android APK/AAB生成
- `npm run tauri android build --debug` - デバッグAPK生成
- `npm run tauri android build --release` - リリースAPK生成

**iOS (macOS のみ):**
- `npm run tauri ios init` - iOS プロジェクト初期化
- `npm run tauri ios dev` - iOS 開発 (シミュレータ)
- `npm run tauri ios build` - iOS IPA生成
- `npm run tauri ios build --debug` - デバッグIPA生成
- `npm run tauri ios build --release` - リリースIPA生成

### Backend (Rust)
Navigate to `src-tauri/` directory:
- `cargo check` - Rust コードエラーチェック
- `cargo build` - Rust バックエンドビルド
- `cargo test` - Rust テスト実行
- `cargo clippy` - Rust リント (推奨)
- `cargo fmt` - Rust コードフォーマット

## Architecture

### Frontend (`src/`) - SvelteKit SPA
- **SPA構成**: `@sveltejs/adapter-static` (SSR無効)
- **ルーティング**: SvelteKit標準ルーティング (`src/routes/`)
- **TypeScript**: `svelte-check`による完全型チェック
- **通信**: Tauri `invoke()` でRust関数呼び出し
- **状態管理**: Svelte stores使用

### Backend (`src-tauri/`) - Rust
- **メインロジック**: `src/lib.rs` (コア機能実装)
- **Tauriコマンド**: `#[tauri::command]` マクロでフロントエンド連携
- **エントリーポイント**: `src/main.rs` (Tauriアプリ初期化)
- **AT Protocol**: atrium-api クレート使用
- **セキュリティ**: セキュアストレージ (キーリング) 

### Mobile Integration (Tauri Mobile Alpha)
- **共通コードベース**: デスクトップとモバイルで同一コード
- **プラットフォーム分岐**: `#[cfg(mobile)]` / `#[cfg(desktop)]` 使用
- **ネイティブ機能**: SwiftUI (iOS) / Kotlin (Android) ブリッジ
- **レスポンシブUI**: CSS Grid/Flexbox + メディアクエリ

### Key Configuration Files
- `tauri.conf.json` - Tauri設定 (アプリ設定、ビルド、セキュリティ、モバイル対応)
- `svelte.config.js` - SvelteKit SPA設定
- `Cargo.toml` - Rust依存関係 + モバイルライブラリ設定
- `src-tauri/gen/android/` - Android プロジェクト (生成)
- `src-tauri/gen/apple/` - iOS プロジェクト (生成)

## Development Workflow

### 開発優先順位
1. **デスクトップ版先行開発** - Mac/Windows/Linux対応
2. **コア機能実装** - AT Protocol統合、基本UI/UX
3. **モバイル対応** - Tauri Mobile Alpha導入  
4. **プラットフォーム最適化** - レスポンシブデザイン調整

### 開発フロー
1. **メイン開発**: `npm run tauri dev` (フロントエンド + バックエンド)
2. **フロントエンドのみ**: `npm run dev` (Tauri機能不要時のUI開発)
3. **型チェック**: `npm run check` (TypeScript/Svelteコード検証)
4. **デスクトップビルド**: `npm run tauri build` (配布可能デスクトップアプリ生成)

### モバイル開発フロー
1. **環境準備**: Android Studio + Xcode インストール
2. **プロジェクト初期化**: `npm run tauri [android|ios] init`
3. **モバイル開発**: `npm run tauri [android|ios] dev`
4. **モバイルビルド**: `npm run tauri [android|ios] build`

## Package Manager

プロジェクトは **pnpm** を想定 (`tauri.conf.json` 設定) していますが、**npm** コマンドでも動作します。

## Frontend-Backend Communication

### 通信パターン
- **フロントエンド**: `invoke('function_name', { args })` でRust関数呼び出し
- **バックエンド**: `#[tauri::command]` アノテーション + `main.rs` 登録必須
- **データ通信**: `serde` でJSON シリアライゼーション/デシリアライゼーション

### AT Protocol統合
- **認証**: App Password使用推奨
- **API呼び出し**: atrium-api クレート経由
- **リアルタイム更新**: WebSocket + CAR ファイル処理
- **セキュリティ**: 認証情報をセキュアストレージ保存

## 品質管理・開発ルール

### 必須チェック
- **TypeScript型チェック**: `npm run check` (コミット前必須)
- **Rust コードチェック**: `cargo check`, `cargo test`, `cargo clippy`
- **コードフォーマット**: `cargo fmt` (Rust), Prettier (TypeScript)

### モバイル対応考慮事項
- **レスポンシブデザイン**: モバイルファースト設計
- **タッチUI**: ジェスチャー・タッチ操作対応
- **パフォーマンス**: モバイル環境でのメモリ・CPU使用量最適化
- **プラットフォーム分岐**: `#[cfg(mobile)]` / `#[cfg(desktop)]` 適切な使用