/**
 * MCP Data Converter
 * MCPから取得したBlueskyデータをSimplePost型に変換するユーティリティ
 */

import type { SimplePost, PostAuthor, RepostReason } from '$lib/types/post.js';

/**
 * MCPから取得したポストデータをSimplePost型に変換
 * @param mcpPostItem - MCPのfeedアイテム
 * @returns SimplePost型のデータ
 */
export function convertMcpPostToSimplePost(mcpPostItem: any): SimplePost {
  const post = mcpPostItem.post;
  const record = post.record;
  
  // 作者情報の変換
  const author: PostAuthor = {
    did: post.author.did,
    handle: post.author.handle,
    displayName: post.author.displayName || undefined,
    avatar: post.author.avatar || undefined
  };

  // リポスト理由の変換（存在する場合）
  let reason: RepostReason | undefined;
  if (mcpPostItem.reason && mcpPostItem.reason.$type === 'app.bsky.feed.defs#reasonRepost') {
    reason = {
      $type: 'app.bsky.feed.defs#reasonRepost',
      by: {
        did: mcpPostItem.reason.by.did,
        handle: mcpPostItem.reason.by.handle,
        displayName: mcpPostItem.reason.by.displayName || undefined,
        avatar: mcpPostItem.reason.by.avatar || undefined
      },
      indexedAt: mcpPostItem.reason.indexedAt
    };
  }

  // SimplePost型のデータを構築
  const simplePost: SimplePost = {
    // 基本識別子
    uri: post.uri,
    cid: post.cid,
    
    // 作者情報
    author,
    
    // 投稿内容
    text: record.text || '',
    createdAt: record.createdAt,
    
    // ★ 重要: facetsデータをrecordから取得してトップレベルに移動
    facets: record.facets || undefined,
    
    // 埋め込みコンテンツ
    embed: post.embed || undefined,
    
    // 基本統計
    replyCount: post.replyCount || 0,
    repostCount: post.repostCount || 0,
    likeCount: post.likeCount || 0,
    
    // リポスト情報
    reason,
    
    // インデックス日時
    indexedAt: post.indexedAt
  };

  console.log('[mcpDataConverter] Converted post:', {
    uri: simplePost.uri,
    text: simplePost.text,
    facets: simplePost.facets,
    facetsCount: simplePost.facets?.length || 0
  });

  return simplePost;
}

/**
 * MCPから取得したタイムラインデータをSimplePost配列に変換
 * @param mcpTimelineData - MCPのタイムラインレスポンス
 * @returns SimplePost配列
 */
export function convertMcpTimelineToSimplePosts(mcpTimelineData: any): SimplePost[] {
  if (!mcpTimelineData?.data?.feed || !Array.isArray(mcpTimelineData.data.feed)) {
    console.warn('[mcpDataConverter] Invalid MCP timeline data structure');
    return [];
  }

  const posts = mcpTimelineData.data.feed.map((item: any) => {
    try {
      return convertMcpPostToSimplePost(item);
    } catch (error) {
      console.warn('[mcpDataConverter] Failed to convert post:', error, item);
      return null;
    }
  }).filter((post: SimplePost | null): post is SimplePost => post !== null);

  console.log('[mcpDataConverter] Converted timeline:', {
    totalItems: mcpTimelineData.data.feed.length,
    convertedPosts: posts.length,
    postsWithFacets: posts.filter((p: SimplePost) => p.facets && p.facets.length > 0).length
  });

  return posts;
}