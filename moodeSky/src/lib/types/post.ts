/**
 * シンプルなPost型定義
 * 段階的実装: 基本表示に必要な最小限のフィールドのみ
 */

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
  
  // 基本統計
  replyCount?: number;
  repostCount?: number;
  likeCount?: number;
  
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