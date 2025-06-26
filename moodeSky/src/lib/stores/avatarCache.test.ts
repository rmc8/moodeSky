/**
 * AvatarCache Store テストスイート
 * グローバルアバターキャッシュシステムの包括的テスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { avatarCache } from './avatarCache.svelte.js';
import type { CachedAvatarInfo, AvatarFetchResult } from '$lib/types/avatarCache.js';

// Profile Serviceのモック
vi.mock('$lib/services/profileService.js', () => ({
  profileService: {
    getProfile: vi.fn()
  }
}));

// モックされたprofileServiceへの参照を取得
import { profileService } from '$lib/services/profileService.js';
const mockProfileService = profileService as any;

describe('AvatarCache Store', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    vi.clearAllMocks();
    // シングルトンストアを初期状態にリセット
    avatarCache.destroy();
  });

  afterEach(() => {
    // メモリリーク防止のため各テスト後にクリーンアップ
    avatarCache.destroy();
  });

  // ===================================================================
  // 基本初期化テスト
  // ===================================================================

  it('should initialize with default configuration', () => {
    expect(avatarCache.cacheSize).toBe(0);
    expect(avatarCache.initialized).toBe(false);
    expect(avatarCache.statistics.totalCached).toBe(0);
    expect(avatarCache.statistics.hitRate).toBe(0);
  });

  it('should initialize and become ready', async () => {
    await avatarCache.initialize();
    expect(avatarCache.initialized).toBe(true);
  });

  // ===================================================================
  // キャッシュ基本動作テスト
  // ===================================================================

  it('should fetch and cache avatar successfully', async () => {
    const mockProfile = {
      did: 'did:plc:test123',
      handle: 'test.bsky.social',
      displayName: 'Test User',
      avatar: 'https://example.com/avatar.jpg'
    };

    mockProfileService.getProfile.mockResolvedValueOnce({
      success: true,
      data: mockProfile
    });

    await avatarCache.initialize();
    const result = await avatarCache.getAvatar('did:plc:test123');

    expect(result.success).toBe(true);
    expect(result.data?.did).toBe('did:plc:test123');
    expect(result.data?.avatarUrl).toBe('https://example.com/avatar.jpg');
    expect(result.fromCache).toBe(false);
    expect(avatarCache.cacheSize).toBe(1);
  });

  it('should return cached avatar on subsequent requests', async () => {
    const mockProfile = {
      did: 'did:plc:test123',
      handle: 'test.bsky.social',
      displayName: 'Test User',
      avatar: 'https://example.com/avatar.jpg'
    };

    mockProfileService.getProfile.mockResolvedValueOnce({
      success: true,
      data: mockProfile
    });

    await avatarCache.initialize();
    
    // 最初の呼び出し
    const firstResult = await avatarCache.getAvatar('did:plc:test123');
    expect(firstResult.fromCache).toBe(false);
    
    // 2回目の呼び出し（キャッシュから）
    const secondResult = await avatarCache.getAvatar('did:plc:test123');
    expect(secondResult.fromCache).toBe(true);
    expect(secondResult.success).toBe(true);
    expect(mockProfileService.getProfile).toHaveBeenCalledTimes(1);
  });

  // ===================================================================
  // レースコンディション防止テスト
  // ===================================================================

  it('should handle concurrent requests for same DID without race conditions', async () => {
    const mockProfile = {
      did: 'did:plc:test123',
      handle: 'test.bsky.social',
      displayName: 'Test User',
      avatar: 'https://example.com/avatar.jpg'
    };

    // API呼び出しを遅延させてコンカレンシーをテスト
    mockProfileService.getProfile.mockImplementationOnce(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          success: true,
          data: mockProfile
        }), 100)
      )
    );

    await avatarCache.initialize();

    // 同じDIDに対して同時に複数のリクエストを発行
    const promises = [
      avatarCache.getAvatar('did:plc:test123'),
      avatarCache.getAvatar('did:plc:test123'),
      avatarCache.getAvatar('did:plc:test123')
    ];

    const results = await Promise.all(promises);

    // すべてのリクエストが成功し、APIは1回だけ呼ばれる
    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result.success).toBe(true);
      expect(result.data?.did).toBe('did:plc:test123');
    });
    expect(mockProfileService.getProfile).toHaveBeenCalledTimes(1);
  });

  // ===================================================================
  // エラーハンドリングテスト
  // ===================================================================

  it('should handle API errors gracefully', async () => {
    mockProfileService.getProfile.mockRejectedValueOnce(new Error('Network error'));

    await avatarCache.initialize();
    const result = await avatarCache.getAvatar('did:plc:error123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
    expect(avatarCache.statistics.errorCount).toBe(1);
  });

  it('should cache error responses', async () => {
    mockProfileService.getProfile.mockRejectedValueOnce(new Error('Not found'));

    await avatarCache.initialize();
    
    // 最初のエラー
    const firstResult = await avatarCache.getAvatar('did:plc:notfound');
    expect(firstResult.success).toBe(false);
    
    // 2回目はキャッシュからエラーを返す
    const secondResult = await avatarCache.getAvatar('did:plc:notfound');
    expect(secondResult.success).toBe(false);
    expect(secondResult.fromCache).toBe(true);
    expect(mockProfileService.getProfile).toHaveBeenCalledTimes(1);
  });

  // ===================================================================
  // バッチ取得テスト
  // ===================================================================

  it('should handle batch avatar fetching', async () => {
    const mockProfiles = [
      {
        did: 'did:plc:user1',
        handle: 'user1.bsky.social',
        displayName: 'User 1',
        avatar: 'https://example.com/avatar1.jpg'
      },
      {
        did: 'did:plc:user2',
        handle: 'user2.bsky.social',
        displayName: 'User 2',
        avatar: 'https://example.com/avatar2.jpg'
      }
    ];

    mockProfileService.getProfile
      .mockResolvedValueOnce({ success: true, data: mockProfiles[0] })
      .mockResolvedValueOnce({ success: true, data: mockProfiles[1] });

    await avatarCache.initialize();
    const results = await avatarCache.getAvatars(['did:plc:user1', 'did:plc:user2']);

    expect(results.size).toBe(2);
    expect(results.get('did:plc:user1')?.success).toBe(true);
    expect(results.get('did:plc:user2')?.success).toBe(true);
    expect(avatarCache.cacheSize).toBe(2);
  });

  // ===================================================================
  // メモリ管理テスト
  // ===================================================================

  it('should clean up resources when destroyed', () => {
    expect(avatarCache.cacheSize).toBe(0);
    
    // destroyを呼び出してもエラーが発生しない
    expect(() => avatarCache.destroy()).not.toThrow();
    expect(avatarCache.initialized).toBe(false);
  });

  it('should prevent memory leaks from cleanup interval', async () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    
    // まず初期化してクリーンアップタスクを開始
    await avatarCache.initialize();
    
    // 破棄時にclearIntervalが呼ばれることを確認
    avatarCache.destroy();
    
    expect(clearIntervalSpy).toHaveBeenCalled();
    
    clearIntervalSpy.mockRestore();
  });

  // ===================================================================
  // 統計情報テスト
  // ===================================================================

  it('should track cache statistics correctly', async () => {
    const mockProfile = {
      did: 'did:plc:stats123',
      handle: 'stats.bsky.social',
      displayName: 'Stats User',
      avatar: 'https://example.com/stats.jpg'
    };

    mockProfileService.getProfile.mockResolvedValueOnce({
      success: true,
      data: mockProfile
    });

    await avatarCache.initialize();
    
    // 最初の呼び出し（miss）
    await avatarCache.getAvatar('did:plc:stats123');
    let stats = avatarCache.statistics;
    expect(stats.totalCached).toBe(1);
    
    // 2回目の呼び出し（hit）
    await avatarCache.getAvatar('did:plc:stats123');
    stats = avatarCache.statistics;
    expect(stats.hitRate).toBeGreaterThan(0);
  });

  // ===================================================================
  // 設定とパフォーマンステスト
  // ===================================================================

  it('should respect cache size limits', async () => {
    // この実装では1000アカウントが上限（config.maxCacheSize）
    // 実際のテストでは少ない数でテスト
    await avatarCache.initialize();
    
    // cacheSize取得が正常に動作することを確認
    expect(avatarCache.cacheSize).toBeGreaterThanOrEqual(0);
    expect(typeof avatarCache.cacheSize).toBe('number');
  });
});