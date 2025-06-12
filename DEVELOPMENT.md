# MoodeSky Development Guide

## OAuth開発環境セットアップ

### 課題
モバイルアプリのOAuth開発では以下の課題があります：
- `localhost`はモバイルデバイスからアクセス不可
- BlueskyはRFC 8252でlocalhost URLを拒否
- HTTPSが必要

### 解決策：ngrok + Vercel

#### 1. 事前準備

```bash
# 必要なツールをインストール
npm install -g ngrok vercel

# ngrok認証（無料アカウント登録）
ngrok authtoken YOUR_TOKEN  # https://dashboard.ngrok.com から取得
```

#### 2. 開発環境起動

```bash
# 自動セットアップスクリプト使用
./scripts/dev-oauth-setup.sh

# または手動セットアップ:
vercel dev --port 3000 &
ngrok http 3000
```

#### 3. Flutter設定更新

取得したngrok URLで以下を更新：

```dart
// lib/core/providers/auth_provider.dart
clientMetadataUrl: 'https://YOUR-SUBDOMAIN.ngrok.app/oauth/client-metadata-dev.json'
```

```json
// web/oauth/client-metadata-dev.json
{
  "client_id": "https://YOUR-SUBDOMAIN.ngrok.app/oauth/client-metadata-dev.json",
  "redirect_uris": [
    "https://YOUR-SUBDOMAIN.ngrok.app/oauth/callback",
    "moodesky://oauth/callback"
  ]
}
```

#### 4. アプリ起動

```bash
# モバイルデバイスで実行
flutter run

# OAuth認証をテスト
# ブラウザがngrok URLで開き、モバイルアプリにコールバック
```

### 環境設定

#### 開発環境
- **Client Metadata**: `https://your-subdomain.ngrok.app/oauth/client-metadata-dev.json`
- **Callback URL**: `https://your-subdomain.ngrok.app/oauth/callback`
- **App Scheme**: `moodesky://oauth/callback`

#### 本番環境
- **Client Metadata**: `https://moodesky.app/oauth/client-metadata.json`
- **Callback URL**: `https://moodesky.app/oauth/callback`
- **App Scheme**: `moodesky://oauth/callback`

### トラブルシューティング

#### Q: ngrok URLにアクセスできない
```bash
# ngrok状態確認
curl http://localhost:4040/api/tunnels

# ファイアウォール確認
sudo ufw status  # Ubuntu
```

#### Q: OAuth認証が失敗する
```bash
# client-metadata-dev.jsonの内容確認
curl https://your-subdomain.ngrok.app/oauth/client-metadata-dev.json

# リダイレクトURI確認
grep -r "redirect_uris" web/oauth/
```

#### Q: モバイルアプリでコールバックされない
```bash
# Android Intent Filter確認
adb shell am start -W -a android.intent.action.VIEW -d "moodesky://oauth/callback?code=test"

# iOS URL Scheme確認
xcrun simctl openurl booted "moodesky://oauth/callback?code=test"
```

### セキュリティ注意事項

- ngrok URLは開発専用（本番使用禁止）
- トンネルは必要時のみ起動
- client-metadata-dev.jsonには機密情報を含めない
- 開発完了後はngrokセッションを終了

### パフォーマンス最適化

- ngrok有料プランで固定ドメイン使用
- Vercel Previewブランチデプロイ活用
- ローカルHTTPS証明書（mkcert）の検討