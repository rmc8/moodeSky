# Deep Reset Procedure

## Complete Application State Reset

この手順は、drag & drop重複エラーやその他の永続的な状態の問題を解決するための徹底的なリセット手順です。

### Step 1: 全プロセス停止
```bash
# 開発サーバーを停止
Ctrl+C

# 全てのTauriプロセスを強制終了
pkill -f tauri
pkill -f moodesky
pkill -f cargo

# ポートを解放
lsof -ti:1420 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### Step 2: Tauri アプリケーションデータ完全削除
```bash
# メインアプリデータ
rm -rf ~/Library/Application\ Support/com.rmc8.moodesky.app/
rm -rf ~/Library/Caches/com.rmc8.moodesky.app/
rm -rf ~/Library/WebKit/com.rmc8.moodesky.app/

# 開発用データ
rm -rf ~/.local/share/com.rmc8.moodesky.app/
rm -rf ~/Library/Preferences/com.rmc8.moodesky.app.plist

# WebKit共通データ
rm -rf ~/Library/WebKit/tauri-app/

# Tauri開発キャッシュ
rm -rf ~/.tauri/
```

### Step 3: ブラウザ関連データクリア
```bash
# WebView関連
find ~/Library -name "*webkit*" -type d | grep -i tauri | xargs rm -rf 2>/dev/null || true
find ~/Library -name "*webview*" -type d | grep -i tauri | xargs rm -rf 2>/dev/null || true

# Safari WebView データ
rm -rf ~/Library/Safari/LocalStorage/*tauri*
rm -rf ~/Library/Safari/Databases/*tauri*
```

### Step 4: 開発環境キャッシュクリア
```bash
cd /path/to/moodeSky/moodeSky

# フロントエンドビルドキャッシュ
rm -rf build/
rm -rf .svelte-kit/
rm -rf node_modules/.vite/
rm -rf node_modules/.cache/

# TypeScript キャッシュ
rm -rf .tsbuildinfo
rm -rf tsconfig.tsbuildinfo
```

### Step 5: Rust完全クリア
```bash
cd /path/to/moodeSky/moodeSky/src-tauri

# Rustビルドキャッシュ
cargo clean

# Cargoキャッシュも削除
rm -rf ~/.cargo/registry/cache/
rm -rf target/
```

### Step 6: Node.js キャッシュクリア
```bash
cd /path/to/moodeSky/moodeSky

# pnpm キャッシュ
pnpm store prune

# Node.js モジュールキャッシュ
rm -rf node_modules/
```

### Step 7: 依存関係再インストール
```bash
cd /path/to/moodeSky/moodeSky

# 依存関係を再インストール
pnpm install
```

### Step 8: 完全な再起動
```bash
# 環境変数をクリアしてTauriを起動
unset TAURI_ENV_PLATFORM_VERSION
unset TAURI_ENV_PLATFORM
unset RUST_LOG

# 新しいターミナルセッションで実行推奨
pnpm run tauri dev
```

## 確認手順

### 成功の指標
1. **コンソールログ**: 
   - `🔍 [Device Detection]` ログが表示される
   - `🔧 [DND Config]` ログで一意なtype生成が確認できる
   - `each_key_duplicate` エラーが発生しない

2. **ドラッグ&ドロップ**:
   - タブの「吸い取り」現象が発生しない
   - 正常にタブの並び替えができる

3. **アプリ状態**:
   - 完全に新しい状態から開始
   - 既存のデッキ/カラムデータなし

### トラブルシューティング

**問題**: まだ重複エラーが発生する
**解決**: `docs/TROUBLESHOOTING.md`を参照してコードレベルの問題を確認

**問題**: アプリが起動しない
**解決**: 
```bash
# ポート確認
lsof -i:1420
# プロセス確認
ps aux | grep tauri
```

**問題**: 権限エラー
**解決**: 
```bash
# 一部のシステムディレクトリは保護されているため、管理者権限が必要な場合があります
sudo rm -rf /path/to/protected/directory
```

## 注意事項

- この手順は**全てのアプリデータを削除**します
- 本番環境では実行しないでください
- バックアップが必要なデータがある場合は事前に保存してください
- 手順実行後は完全に新しい状態からの開始となります