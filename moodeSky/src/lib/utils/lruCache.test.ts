/**
 * LRU Cache テストスイート
 * O(1)パフォーマンスとLRU動作の検証
 */

import { describe, it, expect } from 'vitest';
import { LRUCache } from './lruCache.js';

describe('LRU Cache', () => {
  // ===================================================================
  // 基本動作テスト
  // ===================================================================

  it('should initialize with correct capacity', () => {
    const cache = new LRUCache<string, number>(3);
    expect(cache.currentSize).toBe(0);
  });

  it('should set and get values', () => {
    const cache = new LRUCache<string, number>(3);
    
    cache.set('a', 1);
    cache.set('b', 2);
    
    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBeUndefined();
    expect(cache.currentSize).toBe(2);
  });

  it('should check if key exists', () => {
    const cache = new LRUCache<string, number>(3);
    
    cache.set('a', 1);
    
    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
  });

  it('should delete values', () => {
    const cache = new LRUCache<string, number>(3);
    
    cache.set('a', 1);
    cache.set('b', 2);
    
    expect(cache.delete('a')).toBe(true);
    expect(cache.delete('c')).toBe(false);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.currentSize).toBe(1);
  });

  it('should clear all values', () => {
    const cache = new LRUCache<string, number>(3);
    
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    
    expect(cache.currentSize).toBe(0);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });

  // ===================================================================
  // LRU 動作テスト
  // ===================================================================

  it('should evict least recently used item when capacity exceeded', () => {
    const cache = new LRUCache<string, number>(2);
    
    cache.set('a', 1); // a: most recent
    cache.set('b', 2); // b: most recent, a: least recent
    cache.set('c', 3); // c: most recent, b: middle, a: evicted
    
    expect(cache.get('a')).toBeUndefined(); // evicted
    expect(cache.get('b')).toBe(2);         // still exists
    expect(cache.get('c')).toBe(3);         // still exists
    expect(cache.currentSize).toBe(2);
  });

  it('should update access order on get', () => {
    const cache = new LRUCache<string, number>(2);
    
    cache.set('a', 1); // a: most recent
    cache.set('b', 2); // b: most recent, a: least recent
    cache.get('a');    // a: most recent, b: least recent
    cache.set('c', 3); // c: most recent, a: middle, b: evicted
    
    expect(cache.get('a')).toBe(1);         // still exists (was accessed)
    expect(cache.get('b')).toBeUndefined(); // evicted
    expect(cache.get('c')).toBe(3);         // still exists
  });

  it('should update access order on set with existing key', () => {
    const cache = new LRUCache<string, number>(2);
    
    cache.set('a', 1); // a: most recent
    cache.set('b', 2); // b: most recent, a: least recent
    cache.set('a', 10); // a: updated and most recent, b: least recent
    cache.set('c', 3);  // c: most recent, a: middle, b: evicted
    
    expect(cache.get('a')).toBe(10);        // updated value, still exists
    expect(cache.get('b')).toBeUndefined(); // evicted
    expect(cache.get('c')).toBe(3);         // still exists
  });

  // ===================================================================
  // イテレーション機能テスト
  // ===================================================================

  it('should return all keys in access order', () => {
    const cache = new LRUCache<string, number>(3);
    
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.get('a'); // Move 'a' to front
    
    const keys = cache.keys();
    expect(keys).toEqual(['a', 'c', 'b']); // 'a' is most recent, then 'c', then 'b'
  });

  it('should return all values in access order', () => {
    const cache = new LRUCache<string, number>(3);
    
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.get('a'); // Move 'a' to front
    
    const values = cache.values();
    expect(values).toEqual([1, 3, 2]); // 'a'=1 is most recent, then 'c'=3, then 'b'=2
  });

  it('should return all entries in access order', () => {
    const cache = new LRUCache<string, number>(3);
    
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.get('a'); // Move 'a' to front
    
    const entries = cache.entries();
    expect(entries).toEqual([['a', 1], ['c', 3], ['b', 2]]); // Access order: a, c, b
  });

  // ===================================================================
  // エッジケーステスト
  // ===================================================================

  it('should handle capacity of 1', () => {
    const cache = new LRUCache<string, number>(1);
    
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
    
    cache.set('b', 2);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.currentSize).toBe(1);
  });

  it('should handle zero capacity gracefully', () => {
    const cache = new LRUCache<string, number>(0);
    
    cache.set('a', 1);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.currentSize).toBe(0);
  });

  it('should handle large number of operations', () => {
    const cache = new LRUCache<number, number>(100);
    
    // Fill cache
    for (let i = 0; i < 100; i++) {
      cache.set(i, i * 2);
    }
    expect(cache.currentSize).toBe(100);
    
    // Overflow - should evict first items
    for (let i = 100; i < 150; i++) {
      cache.set(i, i * 2);
    }
    expect(cache.currentSize).toBe(100);
    
    // First 50 items should be evicted
    for (let i = 0; i < 50; i++) {
      expect(cache.get(i)).toBeUndefined();
    }
    
    // Last 100 items should still exist
    for (let i = 50; i < 150; i++) {
      expect(cache.get(i)).toBe(i * 2);
    }
  });

  // ===================================================================
  // パフォーマンス特性テスト
  // ===================================================================

  it('should maintain O(1) performance characteristics', () => {
    const cache = new LRUCache<number, string>(1000);
    
    // 大量のデータでの操作時間を測定
    const start = performance.now();
    
    // 大量の書き込み
    for (let i = 0; i < 1000; i++) {
      cache.set(i, `value-${i}`);
    }
    
    // 大量の読み込み
    for (let i = 0; i < 1000; i++) {
      cache.get(i % 500); // 一部のキーを繰り返しアクセス
    }
    
    const end = performance.now();
    const duration = end - start;
    
    // O(1)なので1000回の操作が数十ミリ秒以内に完了するはず
    expect(duration).toBeLessThan(100); // 100ms未満
    expect(cache.currentSize).toBe(1000);
  });
});