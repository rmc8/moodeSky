/**
 * AT Protocol 埋め込みコンテンツ処理サービス
 * BlobRef から CDN URL への変換とユーティリティ関数
 */

import type { BlobRef, Embed, EmbedView } from '$lib/components/embeddings/types.js';

/**
 * AT Protocol の公式 CDN エンドポイント
 */
const CDN_BASE_URL = 'https://cdn.bsky.app';

/**
 * BlobRef から画像 CDN URL を生成
 */
export function generateImageUrls(blobRef: BlobRef | string): { thumbnail: string; fullsize: string } {
  console.log('🔄 [EmbedService] generateImageUrls called with:', {
    type: typeof blobRef,
    isString: typeof blobRef === 'string',
    blobRef: blobRef
  });

  if (typeof blobRef === 'string') {
    // 既に URL の場合はそのまま返す
    console.log('✅ [EmbedService] Using existing URL:', blobRef);
    return {
      thumbnail: blobRef,
      fullsize: blobRef
    };
  }

  if (!blobRef || typeof blobRef !== 'object') {
    console.warn('🚫 [EmbedService] Invalid BlobRef - not an object:', blobRef);
    return {
      thumbnail: '',
      fullsize: ''
    };
  }

  if (!blobRef.ref || typeof blobRef.ref !== 'object') {
    console.warn('🚫 [EmbedService] Invalid BlobRef - missing ref:', blobRef);
    return {
      thumbnail: '',
      fullsize: ''
    };
  }

  if (!blobRef.ref.$link || typeof blobRef.ref.$link !== 'string') {
    console.warn('🚫 [EmbedService] Invalid BlobRef - missing $link:', blobRef);
    return {
      thumbnail: '',
      fullsize: ''
    };
  }

  const hash = blobRef.ref.$link;
  
  const result = {
    thumbnail: `${CDN_BASE_URL}/img/feed_thumbnail/plain/${hash}`,
    fullsize: `${CDN_BASE_URL}/img/feed_fullsize/plain/${hash}`
  };

  console.log('✅ [EmbedService] Generated CDN URLs:', {
    hash,
    thumbnail: result.thumbnail,
    fullsize: result.fullsize
  });
  
  return result;
}

/**
 * BlobRef から動画 CDN URL を生成
 */
export function generateVideoUrls(blobRef: BlobRef | string): { playlist: string; thumbnail?: string } {
  console.log('🔄 [EmbedService] generateVideoUrls called with:', {
    type: typeof blobRef,
    isString: typeof blobRef === 'string',
    blobRef: blobRef
  });

  if (typeof blobRef === 'string') {
    // 既に URL の場合はそのまま返す
    console.log('✅ [EmbedService] Using existing video URL:', blobRef);
    return {
      playlist: blobRef
    };
  }

  if (!blobRef || typeof blobRef !== 'object') {
    console.warn('🚫 [EmbedService] Invalid video BlobRef - not an object:', blobRef);
    return {
      playlist: ''
    };
  }

  if (!blobRef.ref || typeof blobRef.ref !== 'object') {
    console.warn('🚫 [EmbedService] Invalid video BlobRef - missing ref:', blobRef);
    return {
      playlist: ''
    };
  }

  if (!blobRef.ref.$link || typeof blobRef.ref.$link !== 'string') {
    console.warn('🚫 [EmbedService] Invalid video BlobRef - missing $link:', blobRef);
    return {
      playlist: ''
    };
  }

  const hash = blobRef.ref.$link;
  
  const result = {
    playlist: `${CDN_BASE_URL}/vid/feed_fullsize/plain/${hash}/playlist.m3u8`,
    thumbnail: `${CDN_BASE_URL}/img/feed_thumbnail/plain/${hash}`
  };

  console.log('✅ [EmbedService] Generated video CDN URLs:', {
    hash,
    playlist: result.playlist,
    thumbnail: result.thumbnail
  });
  
  return result;
}

/**
 * 外部リンクのサムネイル URL を生成
 */
export function generateExternalThumbnailUrl(blobRef: BlobRef | string): string {
  if (typeof blobRef === 'string') {
    return blobRef;
  }

  if (!blobRef || typeof blobRef !== 'object' || !blobRef.ref || !blobRef.ref.$link) {
    console.warn('🚫 [EmbedService] Invalid external thumbnail BlobRef:', blobRef);
    return '';
  }

  return `${CDN_BASE_URL}/img/feed_thumbnail/plain/${blobRef.ref.$link}`;
}

/**
 * Embed オブジェクトを EmbedView 形式に正規化
 * BlobRef を適切な CDN URL に変換
 */
export function normalizeEmbedToView(embed: Embed | EmbedView): EmbedView | null {
  try {
    console.log('🔄 [EmbedService] Normalizing embed:', {
      type: embed.$type,
      hasViewSuffix: embed.$type.includes('#view')
    });

    // 既に View 形式の場合はそのまま返す
    if (embed.$type.includes('#view')) {
      console.log('✅ [EmbedService] Already a view object, returning as-is');
      return embed as EmbedView;
    }

    // Raw Embed を EmbedView に変換
    switch (embed.$type) {
      case 'app.bsky.embed.images': {
        const imageEmbed = embed as any;
        const normalizedImages = imageEmbed.images?.map((img: any, index: number) => {
          const { thumbnail, fullsize } = generateImageUrls(img.image);
          
          console.log(`🖼️ [EmbedService] Image ${index} normalization:`, {
            originalHasImage: !!img.image,
            originalImageType: typeof img.image,
            generatedThumbnail: thumbnail,
            generatedFullsize: fullsize,
            hasValidUrls: !!(thumbnail && fullsize)
          });
          
          return {
            thumb: thumbnail,
            fullsize: fullsize,
            alt: img.alt || '',
            aspectRatio: img.aspectRatio
          };
        }) || [];

        const result = {
          $type: 'app.bsky.embed.images#view' as const,
          images: normalizedImages
        };

        console.log('🖼️ [EmbedService] Images embed normalized:', {
          originalCount: imageEmbed.images?.length || 0,
          normalizedCount: normalizedImages.length,
          validUrls: normalizedImages.filter((img: any) => img.thumb && img.fullsize).length
        });

        return result;
      }

      case 'app.bsky.embed.video': {
        const videoEmbed = embed as any;
        const { playlist, thumbnail } = generateVideoUrls(videoEmbed.video);
        
        console.log('🎥 [EmbedService] Video normalization:', {
          originalHasVideo: !!videoEmbed.video,
          originalVideoType: typeof videoEmbed.video,
          generatedPlaylist: playlist,
          generatedThumbnail: thumbnail,
          hasValidPlaylist: !!playlist
        });

        const result = {
          $type: 'app.bsky.embed.video#view' as const,
          cid: videoEmbed.cid || '',
          playlist: playlist,
          thumbnail: thumbnail,
          alt: videoEmbed.alt,
          aspectRatio: videoEmbed.aspectRatio
        };

        return result;
      }

      case 'app.bsky.embed.external': {
        const externalEmbed = embed as any;
        const external = externalEmbed.external;
        
        const result = {
          $type: 'app.bsky.embed.external#view' as const,
          external: {
            uri: external.uri,
            title: external.title,
            description: external.description,
            thumb: external.thumb ? generateExternalThumbnailUrl(external.thumb) : undefined
          }
        };

        console.log('🔗 [EmbedService] External link normalized:', {
          uri: external.uri,
          hasThumb: !!external.thumb,
          generatedThumb: result.external.thumb
        });

        return result;
      }

      case 'app.bsky.embed.record': {
        // Record embeds は基本的にそのまま View 形式として扱う
        const result = {
          ...embed,
          $type: 'app.bsky.embed.record#view' as const
        };

        console.log('📝 [EmbedService] Record embed normalized');
        return result as EmbedView;
      }

      case 'app.bsky.embed.recordWithMedia': {
        const recordWithMediaEmbed = embed as any;
        
        // メディア部分を再帰的に正規化
        const normalizedMedia = recordWithMediaEmbed.media 
          ? normalizeEmbedToView(recordWithMediaEmbed.media)
          : null;

        if (!normalizedMedia) {
            return null;
        }

        const result = {
          $type: 'app.bsky.embed.recordWithMedia#view' as const,
          record: recordWithMediaEmbed.record,
          media: normalizedMedia
        };

        return result as EmbedView;
      }

      default:
        return null;
    }
  } catch (error) {
    return null;
  }
}

/**
 * 複数の埋め込みを一括で正規化
 */
export function normalizeEmbeds(embeds: (Embed | EmbedView)[]): EmbedView[] {
  if (!Array.isArray(embeds)) {
    return [];
  }

  return embeds
    .map((embed) => normalizeEmbedToView(embed))
    .filter((embed): embed is EmbedView => embed !== null);
}

/**
 * Embed が有効な BlobRef 構造を持っているかチェック
 */
export function hasValidBlobRef(blobRef: unknown): blobRef is BlobRef {
  return !!(
    blobRef && 
    typeof blobRef === 'object' && 
    'ref' in blobRef && 
    blobRef.ref && 
    typeof blobRef.ref === 'object' &&
    '$link' in blobRef.ref &&
    typeof blobRef.ref.$link === 'string' &&
    blobRef.ref.$link.length > 0
  );
}

/**
 * デバッグ用: Embed の構造を分析
 */
export function analyzeEmbedStructure(embed: unknown): {
  isValid: boolean;
  type: string;
  hasBlobs: boolean;
  blobCount: number;
  issues: string[];
} {
  const analysis = {
    isValid: false,
    type: 'unknown',
    hasBlobs: false,
    blobCount: 0,
    issues: [] as string[]
  };

  if (!embed || typeof embed !== 'object') {
    analysis.issues.push('Not an object');
    return analysis;
  }

  const embedObj = embed as any;
  
  if (!embedObj.$type || typeof embedObj.$type !== 'string') {
    analysis.issues.push('Missing or invalid $type');
    return analysis;
  }

  analysis.type = embedObj.$type;

  // タイプ別の分析
  switch (embedObj.$type) {
    case 'app.bsky.embed.images':
    case 'app.bsky.embed.images#view':
      if (!embedObj.images || !Array.isArray(embedObj.images)) {
        analysis.issues.push('Missing or invalid images array');
      } else {
        analysis.blobCount = embedObj.images.length;
        analysis.hasBlobs = embedObj.images.some((img: any) => 
          img.image ? hasValidBlobRef(img.image) : !!img.thumb
        );
        analysis.isValid = analysis.hasBlobs;
      }
      break;

    case 'app.bsky.embed.video':
    case 'app.bsky.embed.video#view':
      if (embedObj.$type.includes('#view')) {
        analysis.hasBlobs = !!embedObj.playlist;
        analysis.blobCount = analysis.hasBlobs ? 1 : 0;
      } else {
        analysis.hasBlobs = hasValidBlobRef(embedObj.video);
        analysis.blobCount = analysis.hasBlobs ? 1 : 0;
      }
      analysis.isValid = analysis.hasBlobs;
      break;

    case 'app.bsky.embed.external':
    case 'app.bsky.embed.external#view':
      analysis.isValid = !!(embedObj.external && embedObj.external.uri);
      analysis.hasBlobs = !!(embedObj.external?.thumb);
      analysis.blobCount = analysis.hasBlobs ? 1 : 0;
      break;

    default:
      analysis.issues.push(`Unsupported embed type: ${embedObj.$type}`);
  }

  return analysis;
}