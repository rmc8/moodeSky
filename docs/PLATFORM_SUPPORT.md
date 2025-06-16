# プラットフォーム対応戦略

## 対応プラットフォーム

### デスクトップ (Tauri 2.0)
- **macOS**: Intel (x86_64) / Apple Silicon (aarch64)
- **Windows**: x64 / ARM64  
- **Linux**: x86_64 / ARM64

### モバイル (Tauri Mobile Alpha)
- **iOS**: 12.0+ (iPhone/iPad)
- **Android**: API Level 24+ (Android 7.0+)

## 開発フェーズ

### Phase 1: デスクトップ先行開発
**目標**: 安定したデスクトップ版の完成

#### 優先順位
1. **macOS** - 主要開発環境
2. **Windows** - ユーザーベース大
3. **Linux** - オープンソースコミュニティ

#### 技術的考慮事項
```json
// tauri.conf.json
{
  "bundle": {
    "targets": ["dmg", "msi", "appimage", "deb"]
  }
}
```

### Phase 2: モバイル対応導入
**目標**: Tauri Mobile Alphaでモバイル版実装

#### セットアップ手順
```bash
# Tauri Mobile CLI インストール
cargo install tauri-cli --version "2.0.0-alpha"

# Android 開発環境
# - Android Studio
# - Android SDK/NDK
# - Java 11/17

# iOS 開発環境 (macOS のみ)
# - Xcode 14+
# - iOS Simulator

# プロジェクト初期化
npm run tauri android init
npm run tauri ios init
```

#### 開発コマンド
```bash
# Android
npm run tauri android dev    # エミュレータで開発
npm run tauri android build  # APK/AAB生成

# iOS  
npm run tauri ios dev        # シミュレータで開発
npm run tauri ios build      # IPA生成
```

## プラットフォーム別最適化

### デスクトップ共通
```rust
// src-tauri/src/lib.rs
#[cfg(desktop)]
#[tauri::command]
async fn desktop_specific_feature() -> Result<String, String> {
    // デスクトップ専用機能
}
```

#### ウィンドウ管理
```json
// tauri.conf.json
{
  "app": {
    "windows": [
      {
        "title": "moodeSky",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "maximizable": true
      }
    ]
  }
}
```

### macOS 最適化
#### ネイティブ統合
- **システムメニュー** 統合
- **Dock Badge** 通知数表示
- **Touch Bar** 対応検討
- **macOS Big Sur+** デザイン準拠

#### 権限要求
```json
// tauri.conf.json
{
  "bundle": {
    "macOS": {
      "entitlements": "app.entitlements",
      "frameworks": ["WebKit"],
      "providerShortName": "RMC8",
      "signingIdentity": "Developer ID Application: ..."
    }
  }
}
```

### Windows 最適化
#### システム統合
- **Windows 11** Fluent Design対応
- **システム通知** (WinRT)
- **タスクバー** 統合
- **Windows Store** 配布準備

#### MSI パッケージング
```json
{
  "bundle": {
    "windows": {
      "wix": {
        "language": ["ja-JP", "en-US"]
      }
    }
  }
}
```

### Linux 最適化
#### デスクトップ環境対応
- **GNOME/KDE** テーマ適応
- **D-Bus** 通知システム
- **AppImage/Flatpak** 配布
- **Wayland/X11** 対応

### モバイル共通
```rust
// src-tauri/src/lib.rs
#[cfg(mobile)]
#[tauri::command]
unsafe fn mobile_specific_feature() -> Result<String, String> {
    // モバイル専用機能
}
```

### iOS 最適化
#### ネイティブ統合
- **iOS 12+** サポート  
- **Safe Arae** 対応
- **SwiftUI** ブリッジ検討
- **App Store** 申請準備

#### 権限・機能
```xml
<!-- src-tauri/gen/apple/Info.plist -->
<key>NSCameraUsageDescription</key>
<string>QRコード読み取りに使用</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>画像投稿に使用</string>
```

### Android 最適化
#### ネイティブ統合
- **Material Design 3** 準拠
- **Android 7.0+** サポート
- **Kotlin** ブリッジ検討
- **Google Play** 申請準備

#### 権限・機能
```xml
<!-- src-tauri/gen/android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

## レスポンシブデザイン戦略

### ブレークポイント設計
```css
/* src/app.css */
:root {
  /* Mobile First */
  --mobile: 768px;
  --tablet: 1024px; 
  --desktop: 1200px;
}

@media (max-width: 768px) {
  /* モバイル特化UI */
}

@media (min-width: 769px) and (max-width: 1024px) {
  /* タブレット最適化 */
}

@media (min-width: 1025px) {
  /* デスクトップUI */
}
```

### コンポーネント設計
```svelte
<!-- src/lib/components/AdaptiveLayout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  
  let isMobile = false;
  let isTablet = false;
  
  onMount(() => {
    const updateLayout = () => {
      isMobile = window.innerWidth <= 768;
      isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
    };
    
    updateLayout();
    window.addEventListener('resize', updateLayout);
    
    return () => window.removeEventListener('resize', updateLayout);
  });
</script>

{#if isMobile}
  <MobileLayout />
{:else if isTablet}
  <TabletLayout />
{:else}
  <DesktopLayout />
{/if}
```

## ビルド・CI/CD 戦略

### GitHub Actions 設定
```yaml
# .github/workflows/build.yml
name: Build and Test

on: [push, pull_request]

jobs:
  desktop:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - uses: dtolnay/rust-toolchain@stable
      
      - name: Install dependencies
        run: npm ci
        
      - name: Build desktop app
        run: npm run tauri build

  mobile:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      
      # iOS ビルド
      - name: Build iOS
        run: npm run tauri ios build
        
      # Android ビルド要 Linux runner
      - name: Build Android
        run: npm run tauri android build
```

### リリース自動化
```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Create Release
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          releaseId: ${{ steps.create_release.outputs.id }}
```

## テスト戦略

### プラットフォーム別テスト
```rust
// src-tauri/src/tests/platform_tests.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(desktop)]
    #[test]
    fn test_desktop_features() {
        // デスクトップ専用機能テスト
    }

    #[cfg(mobile)]  
    #[test]
    fn test_mobile_features() {
        // モバイル専用機能テスト
    }
}
```

### E2E テスト
```typescript
// tests/cross-platform.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Cross-platform functionality', () => {
  test('login works on all platforms', async ({ page }) => {
    // 全プラットフォーム共通テスト
  });
});
```

## デプロイ・ストア申請

### App Store (iOS)
1. **Apple Developer Program** 登録
2. **App Store Connect** 設定
3. **TestFlight** ベータテスト
4. **審査申請** 

### Google Play (Android)  
1. **Google Play Console** 設定
2. **内部テスト** → **クローズドテスト** → **オープンテスト**
3. **リリース**

### デスクトップ配布
- **GitHub Releases**: メイン配布チャネル
- **Homebrew**: macOS パッケージ管理
- **Chocolatey**: Windows パッケージ管理
- **AUR**: Arch Linux ユーザーリポジトリ