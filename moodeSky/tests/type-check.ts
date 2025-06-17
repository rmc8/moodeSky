// Phase 2 Store Plugin API基本動作確認用

import type { AtpSessionData } from '@atproto/api';
import { authService } from '../src/lib/services/authStore.js';

// 基本的な型定義の動作確認
const testSessionData: AtpSessionData = {
  did: 'did:plc:test',
  handle: 'test.bsky.social',
  accessJwt: 'test-jwt',
  refreshJwt: 'test-refresh',
  active: true,
};

const testProfile = {
  did: 'did:plc:test',
  handle: 'test.bsky.social',
  displayName: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
};

// AuthService基本メソッドの型チェック
async function basicTypeCheck() {
  console.log('=== Store Plugin 基本動作確認 ===');
  
  // 1. ストア初期化
  const loadResult = await authService.loadStore();
  console.log('1. Store load result:', loadResult);

  // 2. 認証ストア読み込み
  const authStoreResult = await authService.loadAuthStore();
  console.log('2. Auth store result:', authStoreResult);

  // 3. 既存アカウント確認
  const existingAccounts = await authService.getAllAccounts();
  console.log('3. Existing accounts:', existingAccounts);

  // 4. アカウント保存テスト
  const saveResult = await authService.saveAccount(
    'https://bsky.social',
    testSessionData,
    testProfile
  );
  console.log('4. Save result:', saveResult);
  
  // 5. アクティブアカウント取得
  const activeAccount = await authService.getActiveAccount();
  console.log('5. Active account:', activeAccount);
  
  // 6. localStorage移行テスト
  const migrationResult = await authService.migrateFromLocalStorage();
  console.log('6. Migration result:', migrationResult);
}

export { basicTypeCheck };