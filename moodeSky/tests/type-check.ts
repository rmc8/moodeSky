// Phase 5: localStorage移行最適化＆Store Plugin API動作確認用

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
}

// Phase 5: 移行機能テスト（最適化版）
async function migrationOptimizationTest() {
  console.log('=== Phase 5: localStorage移行最適化テスト ===');
  
  // 1. 移行状態の初期確認
  const initialStatus = await authService.getMigrationStatus();
  console.log('1. Initial migration status:', initialStatus);
  
  // 2. 移行状態リセット（テスト用）
  const resetResult = await authService.resetMigrationStatus();
  console.log('2. Migration status reset:', resetResult);
  
  // 3. レガシーデータ設定（テスト用）
  localStorage.setItem('authDid', 'did:plc:testuser123');
  localStorage.setItem('authHandle', 'testuser.bsky.social');
  localStorage.setItem('authAccessJwt', 'test-access-jwt-token-12345');
  localStorage.setItem('authDisplayName', 'Test User');
  console.log('3. Test legacy data set in localStorage');
  
  // 4. 移行処理実行
  const migrationResult = await authService.migrateFromLocalStorage();
  console.log('4. Migration result:', migrationResult);
  
  // 5. 移行後状態確認
  const finalStatus = await authService.getMigrationStatus();
  console.log('5. Final migration status:', finalStatus);
  
  // 6. 移行後のアカウント確認
  const migratedAccounts = await authService.getAllAccounts();
  console.log('6. Migrated accounts:', migratedAccounts);
  
  // 7. localStorage クリーンアップ確認
  const legacyDataRemaining = {
    authDid: localStorage.getItem('authDid'),
    authHandle: localStorage.getItem('authHandle'),
    authAccessJwt: localStorage.getItem('authAccessJwt'),
    authDisplayName: localStorage.getItem('authDisplayName'),
    authAvatar: localStorage.getItem('authAvatar'),
  };
  console.log('7. Legacy data remaining:', legacyDataRemaining);
  
  // 8. 重複移行防止テスト
  const duplicateMigrationResult = await authService.migrateFromLocalStorage();
  console.log('8. Duplicate migration attempt result:', duplicateMigrationResult);
}

// 不正データ検証テスト
async function validationTest() {
  console.log('=== データ検証テスト ===');
  
  // テスト用に移行状態をリセット
  await authService.resetMigrationStatus();
  
  // 1. 不正なDIDテスト
  localStorage.setItem('authDid', 'invalid-did-format');
  localStorage.setItem('authHandle', 'testuser.bsky.social');
  localStorage.setItem('authAccessJwt', 'test-jwt');
  
  const invalidDidResult = await authService.migrateFromLocalStorage();
  console.log('1. Invalid DID migration result:', invalidDidResult);
  
  // 2. 不正なハンドルテスト
  localStorage.clear();
  await authService.resetMigrationStatus();
  localStorage.setItem('authDid', 'did:plc:validtest');
  localStorage.setItem('authHandle', 'x'); // 短すぎるハンドル
  localStorage.setItem('authAccessJwt', 'test-jwt');
  
  const invalidHandleResult = await authService.migrateFromLocalStorage();
  console.log('2. Invalid handle migration result:', invalidHandleResult);
  
  // 3. 危険なスクリプト注入テスト
  localStorage.clear();
  await authService.resetMigrationStatus();
  localStorage.setItem('authDid', 'did:plc:validtest');
  localStorage.setItem('authHandle', 'testuser.bsky.social');
  localStorage.setItem('authAccessJwt', '<script>alert("xss")</script>');
  
  const xssTestResult = await authService.migrateFromLocalStorage();
  console.log('3. XSS injection test result:', xssTestResult);
  
  // クリーンアップ
  localStorage.clear();
}

// 全テスト実行
async function runAllTests() {
  try {
    await basicTypeCheck();
    console.log('\n');
    await migrationOptimizationTest();
    console.log('\n');
    await validationTest();
    console.log('\n=== 全テスト完了 ===');
  } catch (error) {
    console.error('テスト実行エラー:', error);
  }
}

export { basicTypeCheck, migrationOptimizationTest, validationTest, runAllTests };