/**
 * AT Protocol 埋め込みコンテンツの型定義
 * Bluesky で使用される埋め込みタイプの包括的な型定義システム
 */

/**
 * 基本的な埋め込みタイプ識別子
 */
export type EmbedType = 'images' | 'video' | 'external' | 'record' | 'recordWithMedia';

/**
 * アスペクト比定義（画像・動画用）
 */
export interface AspectRatio {
  width: number;
  height: number;
}

/**
 * Blob参照（AT Protocol）
 * 実際の実装では @atproto/api の BlobRef を使用予定
 */
export interface BlobRef {
  $type: 'blob';
  ref: {
    $link: string;
  };
  mimeType: string;
  size: number;
}

/**
 * 画像埋め込み（app.bsky.embed.images）
 */
export interface ImageEmbed {
  $type: 'app.bsky.embed.images';
  images: Array<{
    image: BlobRef;
    alt: string;
    aspectRatio?: AspectRatio;
  }>;
}

/**
 * 動画埋め込み（app.bsky.embed.video）
 * 最大100MBサイズ制限
 */
export interface VideoEmbed {
  $type: 'app.bsky.embed.video';
  video: BlobRef;
  alt?: string;
  aspectRatio?: AspectRatio;
  captions?: Array<{
    lang: string;
    file: BlobRef;
  }>;
}

/**
 * 外部リンク埋め込み（app.bsky.embed.external）
 */
export interface ExternalEmbed {
  $type: 'app.bsky.embed.external';
  external: {
    uri: string;
    title: string;
    description: string;
    thumb?: BlobRef;
  };
}

/**
 * 記録参照（AT URI + CID）
 */
export interface RecordRef {
  uri: string;
  cid: string;
}

/**
 * 記録埋め込み（app.bsky.embed.record）
 */
export interface RecordEmbed {
  $type: 'app.bsky.embed.record';
  record: RecordRef;
}

/**
 * 記録+メディア複合埋め込み（app.bsky.embed.recordWithMedia）
 */
export interface RecordWithMediaEmbed {
  $type: 'app.bsky.embed.recordWithMedia';
  record: RecordEmbed['record'];
  media: ImageEmbed | VideoEmbed | ExternalEmbed;
}

/**
 * すべての埋め込みタイプのユニオン型
 */
export type Embed = ImageEmbed | VideoEmbed | ExternalEmbed | RecordEmbed | RecordWithMediaEmbed;

/**
 * 埋め込み表示用のView型（API レスポンス）
 */

/**
 * 画像埋め込み表示用
 */
export interface ImageEmbedView {
  $type: 'app.bsky.embed.images#view';
  images: Array<{
    thumb: string;    // URL
    fullsize: string; // URL  
    alt: string;
    aspectRatio?: AspectRatio;
  }>;
}

/**
 * 動画埋め込み表示用
 */
export interface VideoEmbedView {
  $type: 'app.bsky.embed.video#view';
  cid: string;
  playlist: string; // m3u8 URL
  thumbnail?: string; // URL
  alt?: string;
  aspectRatio?: AspectRatio;
}

/**
 * 外部リンク埋め込み表示用
 */
export interface ExternalEmbedView {
  $type: 'app.bsky.embed.external#view';
  external: {
    uri: string;
    title: string;
    description: string;
    thumb?: string; // URL
  };
}

/**
 * 記録埋め込み表示用
 */
export interface RecordEmbedView {
  $type: 'app.bsky.embed.record#view';
  record: {
    uri: string;
    cid: string;
    author: {
      did: string;
      handle: string;
      displayName?: string;
      avatar?: string;
    };
    value: any; // 実際の記録データ
    indexedAt: string;
    embeds?: EmbedView[];
  };
}

/**
 * 記録+メディア複合埋め込み表示用
 */
export interface RecordWithMediaEmbedView {
  $type: 'app.bsky.embed.recordWithMedia#view';
  record: RecordEmbedView['record'];
  media: ImageEmbedView | VideoEmbedView | ExternalEmbedView;
}

/**
 * すべての埋め込み表示タイプのユニオン型
 */
export type EmbedView = 
  | ImageEmbedView 
  | VideoEmbedView 
  | ExternalEmbedView 
  | RecordEmbedView 
  | RecordWithMediaEmbedView;

/**
 * タイプガード関数群
 */

export function isImageEmbed(embed: Embed): embed is ImageEmbed {
  return embed.$type === 'app.bsky.embed.images';
}

export function isVideoEmbed(embed: Embed): embed is VideoEmbed {
  return embed.$type === 'app.bsky.embed.video';
}

export function isExternalEmbed(embed: Embed): embed is ExternalEmbed {
  return embed.$type === 'app.bsky.embed.external';
}

export function isRecordEmbed(embed: Embed): embed is RecordEmbed {
  return embed.$type === 'app.bsky.embed.record';
}

export function isRecordWithMediaEmbed(embed: Embed): embed is RecordWithMediaEmbed {
  return embed.$type === 'app.bsky.embed.recordWithMedia';
}

/**
 * View タイプ用のタイプガード関数群
 */

export function isImageEmbedView(embed: EmbedView): embed is ImageEmbedView {
  return embed.$type === 'app.bsky.embed.images#view';
}

export function isVideoEmbedView(embed: EmbedView): embed is VideoEmbedView {
  return embed.$type === 'app.bsky.embed.video#view';
}

export function isExternalEmbedView(embed: EmbedView): embed is ExternalEmbedView {
  return embed.$type === 'app.bsky.embed.external#view';
}

export function isRecordEmbedView(embed: EmbedView): embed is RecordEmbedView {
  return embed.$type === 'app.bsky.embed.record#view';
}

export function isRecordWithMediaEmbedView(embed: EmbedView): embed is RecordWithMediaEmbedView {
  return embed.$type === 'app.bsky.embed.recordWithMedia#view';
}

/**
 * 埋め込みタイプ判定ユーティリティ
 */
export function getEmbedType(embed: Embed | EmbedView): EmbedType {
  const type = embed.$type;
  
  if (type.includes('images')) return 'images';
  if (type.includes('video')) return 'video';
  if (type.includes('external')) return 'external';
  if (type.includes('recordWithMedia')) return 'recordWithMedia';
  if (type.includes('record')) return 'record';
  
  throw new Error(`Unknown embed type: ${type}`);
}

/**
 * 埋め込みコンテンツの妥当性検証
 */
export function validateEmbed(embed: unknown): embed is Embed {
  if (!embed || typeof embed !== 'object') {
    return false;
  }
  
  const embedObj = embed as any;
  const validTypes = [
    'app.bsky.embed.images',
    'app.bsky.embed.video', 
    'app.bsky.embed.external',
    'app.bsky.embed.record',
    'app.bsky.embed.recordWithMedia'
  ];
  
  return validTypes.includes(embedObj.$type);
}

/**
 * 埋め込みコンテンツのメタデータ
 */
export interface EmbedMetadata {
  type: EmbedType;
  hasMedia: boolean;
  mediaCount?: number;
  hasAlt: boolean;
  aspectRatio?: AspectRatio;
  size?: number; // bytes
  duration?: number; // seconds (video)
}

/**
 * 埋め込みコンテンツからメタデータを抽出
 * 注意: 型安全性のため、実行時の型チェックに依存
 */
export function extractEmbedMetadata(embed: Embed | EmbedView): EmbedMetadata {
  const type = getEmbedType(embed);
  
  const metadata: EmbedMetadata = {
    type,
    hasMedia: false,
    hasAlt: false
  };
  
  try {
    // 画像埋め込みの処理
    if (type === 'images') {
      const imageEmbed = embed as any;
      metadata.hasMedia = true;
      metadata.mediaCount = imageEmbed.images?.length || 0;
      metadata.hasAlt = imageEmbed.images?.some((img: any) => img.alt && img.alt.trim() !== '') || false;
      metadata.aspectRatio = imageEmbed.images?.[0]?.aspectRatio;
    }
    // 動画埋め込みの処理
    else if (type === 'video') {
      const videoEmbed = embed as any;
      metadata.hasMedia = true;
      metadata.mediaCount = 1;
      metadata.hasAlt = !!(videoEmbed.alt && videoEmbed.alt.trim() !== '');
      metadata.aspectRatio = videoEmbed.aspectRatio;
    }
    // 外部リンク埋め込みの処理
    else if (type === 'external') {
      const externalEmbed = embed as any;
      metadata.hasMedia = !!externalEmbed.external?.thumb;
      metadata.mediaCount = metadata.hasMedia ? 1 : 0;
    }
    // RecordWithMedia埋め込みの処理
    else if (type === 'recordWithMedia') {
      const recordWithMediaEmbed = embed as any;
      if (recordWithMediaEmbed.media) {
        const mediaMetadata = extractEmbedMetadata(recordWithMediaEmbed.media);
        metadata.hasMedia = mediaMetadata.hasMedia;
        metadata.mediaCount = mediaMetadata.mediaCount;
        metadata.hasAlt = mediaMetadata.hasAlt;
        metadata.aspectRatio = mediaMetadata.aspectRatio;
      }
    }
  } catch (error) {
    console.warn('Error extracting embed metadata:', error);
  }
  
  return metadata;
}

/**
 * 埋め込みコンテンツの表示設定
 */
export interface EmbedDisplayOptions {
  maxWidth?: number;
  maxHeight?: number;
  showAlt?: boolean;
  lazy?: boolean;
  rounded?: boolean;
  shadow?: boolean;
  interactive?: boolean;
  clickable?: boolean;
  showImageCount?: boolean;
}

/**
 * デフォルト表示設定
 */
export const DEFAULT_EMBED_DISPLAY_OPTIONS: EmbedDisplayOptions = {
  maxWidth: 600,
  maxHeight: 400,
  showAlt: true,
  lazy: true,
  rounded: true,
  shadow: false,
  interactive: true,
  clickable: true,
  showImageCount: true
};