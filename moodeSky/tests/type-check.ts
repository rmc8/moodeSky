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
  // ストア読み込み
  const loadResult = await authService.loadStore();
  console.log('Load result:', loadResult);

  // 認証ストア読み込み
  const authStoreResult = await authService.loadAuthStore();
  console.log('Auth store result:', authStoreResult);

  // アカウント保存（型チェックのみ）
  const saveResult = await authService.saveAccount(
    'https://bsky.social',
    testSessionData,
    testProfile
  );
  console.log('Save result:', saveResult);
}

export { basicTypeCheck };