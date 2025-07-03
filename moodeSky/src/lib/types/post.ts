/**
 * シンプルなPost型定義
 * 段階的実装: 基本表示に必要な最小限のフィールドのみ
 * 埋め込みコンテンツ（images, video, external, record）対応
 * facets（リッチテキスト機能）対応
 */

import type { AppBskyRichtextFacet } from '@atproto/api';
import type { Embed, EmbedView } from '$lib/components/embeddings/types.js';

/**
 * 投稿作者の基本情報
 */
export interface PostAuthor {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

/**
 * リポスト理由情報
 * AT Protocol app.bsky.feed.defs#reasonRepost準拠
 */
export interface RepostReason {
  $type: 'app.bsky.feed.defs#reasonRepost';
  by: PostAuthor;
  indexedAt: string;
}

/**
 * 投稿の基本情報
 */
export interface SimplePost {
  // 基本識別子
  uri: string;
  cid: string;
  
  // 作者情報
  author: PostAuthor;
  
  // 投稿内容
  text: string;
  createdAt: string;
  
  // リッチテキスト（facets）
  facets?: AppBskyRichtextFacet.Main[];
  
  // 埋め込みコンテンツ
  embed?: Embed | EmbedView;
  embeds?: (Embed | EmbedView)[];
  
  // 基本統計
  replyCount?: number;
  repostCount?: number;
  likeCount?: number;
  
  // リポスト情報（リポストされた投稿の場合のみ）
  reason?: RepostReason;
  
  // インデックス日時
  indexedAt: string;
}

/**
 * タイムラインの投稿アイテム
 * AT ProtocolのFeedViewPostをシンプル化
 */
export interface TimelineItem {
  post: SimplePost;
}

/**
 * タイムライン取得結果
 */
export interface TimelineResult {
  feed: TimelineItem[];
  cursor?: string;
}