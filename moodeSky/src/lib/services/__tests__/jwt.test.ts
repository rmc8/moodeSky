/**
 * JWT Utilities Test Suite
 * Issue #92 Phase 2: JWT ユーティリティの包括的テスト
 * 
 * JWT デコード、期限管理、エラーハンドリングの全シナリオをカバー
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  decodeJWT,
  getTokenExpiration,
  isTokenExpired,
  getTokenRemainingSeconds,
  getTokenInfo,
  JWTDecodeError,
  type JWTPayload
} from '../../utils/jwt.js';
import { JWTTestFactory } from '../../test-utils/sessionTestUtils.js';

describe('JWT Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // タイムゾーンを UTC に固定してテストの安定性を保証
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===================================================================
  // decodeJWT テスト
  // ===================================================================

  describe('decodeJWT', () => {
    it('should decode valid JWT token correctly', () => {
      const token = JWTTestFactory.createValidAccessToken(60);
      const payload = decodeJWT(token);

      expect(payload).toBeDefined();
      expect(payload).toHaveProperty('iss', 'https://bsky.social');
      expect(payload).toHaveProperty('aud', 'did:plc:test');
      expect(payload).toHaveProperty('sub', 'did:plc:test123');
      expect(payload).toHaveProperty('scope', 'com.atproto.access');
      expect(payload).toHaveProperty('exp');
      expect(payload).toHaveProperty('iat');
    });

    it('should return null for invalid token format', () => {
      const invalidTokens = [
        '', // 空文字列
        'invalid', // 単一文字列
        'header.payload', // 2部分のみ
        'header.payload.signature.extra', // 4部分以上
        'invalid.token.format'
      ];

      invalidTokens.forEach(token => {
        expect(decodeJWT(token)).toBeNull();
      });
    });

    it('should return null for malformed JWT', () => {
      const malformedToken = JWTTestFactory.createMalformedToken();
      expect(decodeJWT(malformedToken)).toBeNull();
    });

    it('should handle non-string input gracefully', () => {
      // @ts-ignore - 意図的な型エラーテスト
      expect(decodeJWT(null)).toBeNull();
      // @ts-ignore - 意図的な型エラーテスト
      expect(decodeJWT(undefined)).toBeNull();
      // @ts-ignore - 意図的な型エラーテスト
      expect(decodeJWT(123)).toBeNull();
      // @ts-ignore - 意図的な型エラーテスト
      expect(decodeJWT({})).toBeNull();
    });

    it('should decode JWT with custom claims correctly', () => {
      const customClaims = {
        role: 'admin',
        permissions: ['read', 'write'],
        custom_field: 'test_value'
      };
      
      const token = JWTTestFactory.createTokenWithCustomClaims(customClaims);
      const payload = decodeJWT(token);

      expect(payload).toBeDefined();
      expect(payload?.role).toBe('admin');
      expect(payload?.permissions).toEqual(['read', 'write']);
      expect(payload?.custom_field).toBe('test_value');
    });

    it('should handle Base64URL decoding correctly', () => {
      // Base64URLエンコーディングに特殊文字（-, _）を含むペイロードをテスト
      const specialPayload = {
        'special-claim': 'value_with_underscores',
        'another+claim': 'value/with/slashes'
      };
      
      const token = JWTTestFactory.createTokenWithCustomClaims(specialPayload);
      const decoded = decodeJWT(token);

      expect(decoded).toBeDefined();
      expect(decoded?.['special-claim']).toBe('value_with_underscores');
      expect(decoded?.['another+claim']).toBe('value/with/slashes');
    });
  });

  // ===================================================================
  // getTokenExpiration テスト
  // ===================================================================

  describe('getTokenExpiration', () => {
    it('should return correct expiration date for valid token', () => {
      const expiresInMinutes = 60;
      const token = JWTTestFactory.createValidAccessToken(expiresInMinutes);
      const expiration = getTokenExpiration(token);

      expect(expiration).toBeInstanceOf(Date);
      
      // 現在時刻から約60分後であることを確認（±1分の誤差を許容）
      const expectedTime = Date.now() + (expiresInMinutes * 60 * 1000);
      const actualTime = expiration!.getTime();
      expect(Math.abs(actualTime - expectedTime)).toBeLessThan(60000); // 1分以内の誤差
    });

    it('should return null for token without exp claim', () => {
      const tokenWithoutExp = JWTTestFactory.createTokenWithCustomClaims({
        iss: 'https://bsky.social',
        sub: 'did:plc:test123'
        // exp クレームを意図的に除外
      });
      
      const expiration = getTokenExpiration(tokenWithoutExp);
      expect(expiration).toBeNull();
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'invalid.token.format';
      const expiration = getTokenExpiration(invalidToken);
      expect(expiration).toBeNull();
    });

    it('should handle edge case expiration times', () => {
      // 1970年1月1日（Unix epoch）
      const epochToken = JWTTestFactory.createTokenWithCustomClaims({ exp: 0 });
      const epochExpiration = getTokenExpiration(epochToken);
      expect(epochExpiration).toEqual(new Date(0));

      // 遠い未来（2038年問題対応）
      const futureToken = JWTTestFactory.createTokenWithCustomClaims({ exp: 2147483647 });
      const futureExpiration = getTokenExpiration(futureToken);
      expect(futureExpiration).toEqual(new Date(2147483647 * 1000));
    });
  });

  // ===================================================================
  // isTokenExpired テスト
  // ===================================================================

  describe('isTokenExpired', () => {
    it('should return false for valid non-expired token', () => {
      const token = JWTTestFactory.createValidAccessToken(60); // 60分後に期限切れ
      expect(isTokenExpired(token)).toBe(false);
    });

    it('should return true for expired token', () => {
      const expiredToken = JWTTestFactory.createExpiredAccessToken();
      expect(isTokenExpired(expiredToken)).toBe(true);
    });

    it('should return true for invalid token', () => {
      const invalidToken = 'invalid.token.format';
      expect(isTokenExpired(invalidToken)).toBe(true);
    });

    it('should handle token without exp claim', () => {
      const tokenWithoutExp = JWTTestFactory.createTokenWithCustomClaims({
        iss: 'https://bsky.social',
        sub: 'did:plc:test123'
      });
      
      // exp クレームがない場合は期限切れとして扱う
      expect(isTokenExpired(tokenWithoutExp)).toBe(true);
    });

    it('should handle boundary cases around expiration time', () => {
      const now = Math.floor(Date.now() / 1000);
      
      // 現在時刻ちょうどに期限切れ
      const exactlyExpiredToken = JWTTestFactory.createTokenWithCustomClaims({ exp: now });
      expect(isTokenExpired(exactlyExpiredToken)).toBe(true);
      
      // 1秒後に期限切れ
      const almostExpiredToken = JWTTestFactory.createTokenWithCustomClaims({ exp: now + 1 });
      expect(isTokenExpired(almostExpiredToken)).toBe(false);
      
      // 1秒前に期限切れ
      const justExpiredToken = JWTTestFactory.createTokenWithCustomClaims({ exp: now - 1 });
      expect(isTokenExpired(justExpiredToken)).toBe(true);
    });
  });

  // ===================================================================
  // getTokenRemainingSeconds テスト
  // ===================================================================

  describe('getTokenRemainingSeconds', () => {
    it('should return correct remaining seconds for valid token', () => {
      const expiresInMinutes = 30;
      const token = JWTTestFactory.createValidAccessToken(expiresInMinutes);
      const remainingSeconds = getTokenRemainingSeconds(token);

      // 約30分（1800秒）残っていることを確認（±10秒の誤差を許容）
      const expectedSeconds = expiresInMinutes * 60;
      expect(Math.abs(remainingSeconds - expectedSeconds)).toBeLessThan(10);
    });

    it('should return 0 for expired token', () => {
      const expiredToken = JWTTestFactory.createExpiredAccessToken();
      const remainingSeconds = getTokenRemainingSeconds(expiredToken);
      expect(remainingSeconds).toBe(0);
    });

    it('should return 0 for invalid token', () => {
      const invalidToken = 'invalid.token.format';
      const remainingSeconds = getTokenRemainingSeconds(invalidToken);
      expect(remainingSeconds).toBe(0);
    });

    it('should return 0 for token without exp claim', () => {
      const tokenWithoutExp = JWTTestFactory.createTokenWithCustomClaims({
        iss: 'https://bsky.social',
        sub: 'did:plc:test123'
      });
      
      const remainingSeconds = getTokenRemainingSeconds(tokenWithoutExp);
      expect(remainingSeconds).toBe(0);
    });

    it('should handle negative remaining time correctly', () => {
      const now = Math.floor(Date.now() / 1000);
      const expiredToken = JWTTestFactory.createTokenWithCustomClaims({ 
        exp: now - 3600 // 1時間前に期限切れ
      });
      
      const remainingSeconds = getTokenRemainingSeconds(expiredToken);
      expect(remainingSeconds).toBe(0); // 負の値ではなく0を返す
    });
  });

  // ===================================================================
  // getTokenInfo テスト
  // ===================================================================

  describe('getTokenInfo', () => {
    it('should return comprehensive token info for valid token', () => {
      const expiresInMinutes = 45;
      const token = JWTTestFactory.createValidAccessToken(expiresInMinutes);
      const tokenInfo = getTokenInfo(token);

      expect(tokenInfo).toBeDefined();
      expect(tokenInfo.payload).toBeDefined();
      expect(tokenInfo.isValid).toBe(true);
      expect(tokenInfo.isExpired).toBe(false);
      expect(tokenInfo.expiresAt).toBeInstanceOf(Date);
      expect(tokenInfo.remainingSeconds).toBeGreaterThan(0);
      
      // 期限が約45分後であることを確認
      const expectedTime = Date.now() + (expiresInMinutes * 60 * 1000);
      const actualTime = tokenInfo.expiresAt!.getTime();
      expect(Math.abs(actualTime - expectedTime)).toBeLessThan(60000);
    });

    it('should return invalid token info for expired token', () => {
      const expiredToken = JWTTestFactory.createExpiredAccessToken();
      const tokenInfo = getTokenInfo(expiredToken);

      expect(tokenInfo.isValid).toBe(false);
      expect(tokenInfo.isExpired).toBe(true);
      expect(tokenInfo.remainingSeconds).toBe(0);
      expect(tokenInfo.expiresAt).toBeInstanceOf(Date);
      expect(tokenInfo.expiresAt!.getTime()).toBeLessThan(Date.now());
    });

    it('should return invalid token info for malformed token', () => {
      const invalidToken = 'invalid.token.format';
      const tokenInfo = getTokenInfo(invalidToken);

      expect(tokenInfo.isValid).toBe(false);
      expect(tokenInfo.isExpired).toBe(true);
      expect(tokenInfo.payload).toBeNull();
      expect(tokenInfo.expiresAt).toBeNull();
      expect(tokenInfo.remainingSeconds).toBe(0);
    });

    it('should handle token without exp claim', () => {
      const tokenWithoutExp = JWTTestFactory.createTokenWithCustomClaims({
        iss: 'https://bsky.social',
        sub: 'did:plc:test123'
      });
      
      const tokenInfo = getTokenInfo(tokenWithoutExp);
      expect(tokenInfo.isValid).toBe(false);
      expect(tokenInfo.isExpired).toBe(true);
      expect(tokenInfo.expiresAt).toBeNull();
      expect(tokenInfo.remainingSeconds).toBe(0);
      expect(tokenInfo.payload).toBeDefined(); // ペイロード自体は有効
    });
  });

  // ===================================================================
  // JWTDecodeError テスト
  // ===================================================================

  describe('JWTDecodeError', () => {
    it('should create error with correct name and message', () => {
      const errorMessage = 'Test decode error';
      const error = new JWTDecodeError(errorMessage);

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('JWTDecodeError');
      const actualErrorMessage = error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error';
      expect(actualErrorMessage).toBe(errorMessage);
    });

    it('should be throwable and catchable', () => {
      const errorMessage = 'Decode failed';
      
      expect(() => {
        throw new JWTDecodeError(errorMessage);
      }).toThrow(JWTDecodeError);
      
      expect(() => {
        throw new JWTDecodeError(errorMessage);
      }).toThrow(errorMessage);
    });
  });

  // ===================================================================
  // エッジケースとパフォーマンステスト
  // ===================================================================

  describe('Edge Cases and Performance', () => {
    it('should handle very large JWT tokens', () => {
      // 大きなペイロードを持つJWTトークンをテスト
      const largeClaims = {
        largeArray: new Array(1000).fill('test-value'),
        largeObject: Object.fromEntries(
          new Array(100).fill(0).map((_, i) => [`key${i}`, `value${i}`])
        )
      };
      
      const largeToken = JWTTestFactory.createTokenWithCustomClaims(largeClaims);
      const decoded = decodeJWT(largeToken);

      expect(decoded).toBeDefined();
      expect(decoded?.largeArray).toHaveLength(1000);
      expect(Object.keys(decoded?.largeObject || {})).toHaveLength(100);
    });

    it('should handle concurrent token operations', async () => {
      const tokens = Array.from({ length: 100 }, (_, i) => 
        JWTTestFactory.createValidAccessToken(60 + i)
      );

      // 並行してトークンを処理
      const results = await Promise.all(
        tokens.map(async token => ({
          decoded: decodeJWT(token),
          expired: isTokenExpired(token),
          remaining: getTokenRemainingSeconds(token),
          info: getTokenInfo(token)
        }))
      );

      results.forEach((result, index) => {
        expect(result.decoded).toBeDefined();
        expect(result.expired).toBe(false);
        expect(result.remaining).toBeGreaterThan(0);
        expect(result.info.isValid).toBe(true);
      });
    });

    it('should maintain consistent results across multiple calls', () => {
      const token = JWTTestFactory.createValidAccessToken(60);

      // 同じトークンを複数回処理して一貫性を確認
      const results = Array.from({ length: 10 }, () => ({
        decoded: decodeJWT(token),
        expired: isTokenExpired(token),
        expiration: getTokenExpiration(token),
        remaining: getTokenRemainingSeconds(token)
      }));

      // 全ての結果が一致することを確認
      const firstResult = results[0];
      results.slice(1).forEach(result => {
        expect(result.decoded).toEqual(firstResult.decoded);
        expect(result.expired).toBe(firstResult.expired);
        expect(result.expiration?.getTime()).toBe(firstResult.expiration?.getTime());
        // 残り時間は呼び出し時間で微妙に変わる可能性があるため範囲チェック
        expect(Math.abs(result.remaining - firstResult.remaining)).toBeLessThan(2);
      });
    });
  });
});