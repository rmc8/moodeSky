/**
 * RichText Helper Functions
 * AT Protocol facets処理のためのヘルパー関数
 * TokimekiBlueskyの実装を参考
 */

import { RichText, type AppBskyRichtextFacet } from '@atproto/api';

/**
 * テキストとfacetsからRichTextセグメントの配列を生成
 * @param text - 投稿テキスト
 * @param facets - AT Protocol facets配列
 * @returns RichTextセグメントの配列
 */
export function getTextSegments(text: string, facets?: AppBskyRichtextFacet.Main[]) {
  try {
    // デバッグ用ログ（開発モードのみ）
    if (import.meta.env?.DEV) {
      console.log('[getTextSegments] Input:', {
        text,
        facets,
        facetsCount: facets?.length || 0
      });
    }

    const rt = new RichText({
      text,
      facets: facets || []
    });
    
    const segments = [];
    for (const segment of rt.segments()) {
      segments.push(segment);
    }
    
    // デバッグ用ログ（開発モードのみ）
    if (import.meta.env?.DEV) {
      console.log('[getTextSegments] Generated segments:', segments.length, 'segments');
    }
    
    return segments;
  } catch (error) {
    console.warn('[getTextSegments] RichText parsing error:', error);
    // フォールバック: プレーンテキストとして返す
    return [{
      text,
      isLink: () => false,
      isMention: () => false,
      isTag: () => false
    }];
  }
}

/**
 * URLがローカル（同一ドメイン）かどうかを判定
 * @param uri - チェックするURL
 * @returns ローカルURLの場合true
 */
export function isUriLocal(uri: string): boolean {
  try {
    const url = new URL(uri);
    return url.hostname === 'bsky.app' || url.hostname === 'staging.bsky.app';
  } catch (error) {
    console.warn('URL parsing error:', error);
    return false;
  }
}

/**
 * セグメントがリンクタイプかどうかの型ガード
 */
export function isLinkSegment(segment: any): segment is { text: string; isLink(): boolean; link?: { uri: string } } {
  return segment && typeof segment.isLink === 'function' && typeof segment.text === 'string';
}

/**
 * セグメントがメンションタイプかどうかの型ガード
 */
export function isMentionSegment(segment: any): segment is { text: string; isMention(): boolean; mention?: { did: string } } {
  return segment && typeof segment.isMention === 'function' && typeof segment.text === 'string';
}

/**
 * セグメントがハッシュタグタイプかどうかの型ガード
 */
export function isTagSegment(segment: any): segment is { text: string; isTag(): boolean; tag?: { tag: string } } {
  return segment && typeof segment.isTag === 'function' && typeof segment.text === 'string';
}