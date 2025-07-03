/**
 * MCP Data Test Utility
 * ブラウザの開発者コンソールでMCPデータ変換をテストするためのユーティリティ
 */

import { convertMcpTimelineToSimplePosts } from './mcpDataConverter.js';

/**
 * グローバルウィンドウオブジェクトにテスト関数を追加
 */
declare global {
  interface Window {
    testMcpDataConversion: (mcpData: any) => void;
  }
}

// テスト用のMCPデータサンプル（最初のポストのみ）
const sampleMcpData = {
  "data": {
    "feed": [
      {
        "post": {
          "uri": "at://did:plc:vvofetwazumrfvwsbngzkqqr/app.bsky.feed.post/3lt2cra5iak2e",
          "cid": "bafyreibfjnrafqqapnq5u6oe35y2gudx6h3tnkqbcxlgqjmob4vsxwlpmu",
          "author": {
            "did": "did:plc:vvofetwazumrfvwsbngzkqqr",
            "handle": "moodesky.bsky.social",
            "displayName": "",
            "avatar": "https://cdn.bsky.app/img/avatar/plain/did:plc:vvofetwazumrfvwsbngzkqqr/bafkreibrlhukpyvaej2ramd4kdcspa2orrjdvg57mwkktxur6577kqkvle@jpeg"
          },
          "record": {
            "$type": "app.bsky.feed.post",
            "createdAt": "2025-07-03T08:29:51.136Z",
            "facets": [
              {
                "$type": "app.bsky.richtext.facet",
                "features": [
                  {
                    "$type": "app.bsky.richtext.facet#mention",
                    "did": "did:plc:vvofetwazumrfvwsbngzkqqr"
                  }
                ],
                "index": {
                  "byteEnd": 21,
                  "byteStart": 0
                }
              },
              {
                "features": [
                  {
                    "$type": "app.bsky.richtext.facet#tag",
                    "tag": "apple"
                  }
                ],
                "index": {
                  "byteEnd": 32,
                  "byteStart": 26
                }
              },
              {
                "features": [
                  {
                    "$type": "app.bsky.richtext.facet#link",
                    "uri": "https://rmc-8.com"
                  }
                ],
                "index": {
                  "byteEnd": 49,
                  "byteStart": 40
                }
              }
            ],
            "langs": ["ja"],
            "text": "@moodesky.bsky.social tes #apple t\nPost rmc-8.com ppppp"
          },
          "replyCount": 0,
          "repostCount": 0,
          "likeCount": 0,
          "quoteCount": 0,
          "indexedAt": "2025-07-03T08:29:50.439Z"
        }
      }
    ]
  }
};

/**
 * MCPデータ変換をテストする関数
 */
export function testMcpDataConversion(mcpData: any = sampleMcpData) {
  console.log('=== MCP Data Conversion Test ===');
  console.log('Input MCP Data:', mcpData);
  
  const convertedPosts = convertMcpTimelineToSimplePosts(mcpData);
  console.log('Converted Posts:', convertedPosts);
  
  if (convertedPosts.length > 0) {
    const firstPost = convertedPosts[0];
    console.log('First Post Details:');
    console.log('- Text:', firstPost.text);
    console.log('- Facets:', firstPost.facets);
    console.log('- Author:', firstPost.author);
  }
  
  return convertedPosts;
}

// 開発モードでグローバルにテスト関数を公開
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  window.testMcpDataConversion = testMcpDataConversion;
}