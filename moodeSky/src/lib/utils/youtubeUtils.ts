/**
 * YouTube関連のユーティリティ関数
 * YouTube URL判定、Video ID抽出、メタデータ取得
 */

/**
 * URLがYouTubeのURLかどうかを判定
 * @param url チェックするURL
 * @returns YouTubeのURLかどうか
 */
export function isYouTubeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // YouTube関連ドメインを判定
    return (
      hostname === 'youtube.com' ||
      hostname === 'www.youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname === 'youtu.be' ||
      hostname === 'music.youtube.com'
    );
  } catch {
    return false;
  }
}

/**
 * YouTube URLからVideo IDを抽出
 * @param url YouTube URL
 * @returns Video ID（見つからない場合はnull）
 */
export function extractYouTubeId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // youtu.be短縮URL形式
    if (hostname === 'youtu.be') {
      const videoId = urlObj.pathname.slice(1); // 先頭の'/'を除去
      return isValidVideoId(videoId) ? videoId : null;
    }
    
    // youtube.com標準URL形式
    if (hostname.includes('youtube.com')) {
      // /watch?v=VIDEO_ID 形式
      const videoId = urlObj.searchParams.get('v');
      if (videoId && isValidVideoId(videoId)) {
        return videoId;
      }
      
      // /embed/VIDEO_ID 形式
      const embedMatch = urlObj.pathname.match(/^\/embed\/([a-zA-Z0-9_-]+)/);
      if (embedMatch && isValidVideoId(embedMatch[1])) {
        return embedMatch[1];
      }
      
      // /v/VIDEO_ID 形式
      const vMatch = urlObj.pathname.match(/^\/v\/([a-zA-Z0-9_-]+)/);
      if (vMatch && isValidVideoId(vMatch[1])) {
        return vMatch[1];
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Video IDが有効な形式かチェック
 * @param videoId チェックするVideo ID
 * @returns 有効かどうか
 */
function isValidVideoId(videoId: string): boolean {
  // YouTube Video IDは通常11文字の英数字・ハイフン・アンダースコア
  return /^[a-zA-Z0-9_-]{10,12}$/.test(videoId);
}

/**
 * YouTube動画のサムネイルURLを生成
 * @param videoId YouTube Video ID
 * @param quality サムネイル品質 ('default' | 'medium' | 'high' | 'standard' | 'maxres')
 * @returns サムネイルURL
 */
export function getYouTubeThumbnail(
  videoId: string, 
  quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'high'
): string {
  const qualityMap = {
    'default': 'default.jpg',      // 120x90
    'medium': 'mqdefault.jpg',     // 320x180
    'high': 'hqdefault.jpg',       // 480x360
    'standard': 'sddefault.jpg',   // 640x480
    'maxres': 'maxresdefault.jpg'  // 1280x720
  };
  
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}`;
}

/**
 * YouTube動画のメタデータ型定義
 */
export interface YouTubeMetadata {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration?: string;
  channelName?: string;
  viewCount?: number;
}

/**
 * YouTube動画のメタデータを取得（簡易版）
 * @param url YouTube URL
 * @returns メタデータ（基本情報のみ）
 */
export function getYouTubeMetadata(url: string): YouTubeMetadata | null {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    return null;
  }
  
  return {
    videoId,
    title: 'YouTube動画', // 実際のAPIからの取得は将来実装
    description: '',
    thumbnailUrl: getYouTubeThumbnail(videoId, 'high')
  };
}

/**
 * YouTube埋め込み用のオプション
 */
export interface YouTubeEmbedOptions {
  /** 自動再生するかどうか */
  autoplay?: boolean;
  /** コントロール表示するかどうか */
  showControls?: boolean;
  /** YouTube UIを隠すかどうか */
  modestBranding?: boolean;
  /** 関連動画を表示するかどうか */
  showRelated?: boolean;
  /** プライバシー強化モード */
  enablePrivacyEnhancedMode?: boolean;
}

/**
 * YouTube埋め込み用URLを生成
 * @param videoId Video ID
 * @param options 埋め込みオプション
 * @returns 埋め込み用URL
 */
export function generateYouTubeEmbedUrl(
  videoId: string, 
  options: YouTubeEmbedOptions = {}
): string {
  const {
    autoplay = false,
    showControls = true,
    modestBranding = true,
    showRelated = false,
    enablePrivacyEnhancedMode = true
  } = options;
  
  const baseUrl = enablePrivacyEnhancedMode 
    ? 'https://www.youtube-nocookie.com/embed/' 
    : 'https://www.youtube.com/embed/';
  
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    controls: showControls ? '1' : '0',
    modestbranding: modestBranding ? '1' : '0',
    rel: showRelated ? '1' : '0'
  });
  
  return `${baseUrl}${videoId}?${params.toString()}`;
}

/**
 * YouTubeチャンネルURLかどうかを判定
 * @param url チェックするURL
 * @returns チャンネルURLかどうか
 */
export function isYouTubeChannelUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    if (!hostname.includes('youtube.com')) {
      return false;
    }
    
    // チャンネルURL形式を判定
    return (
      urlObj.pathname.startsWith('/channel/') ||
      urlObj.pathname.startsWith('/c/') ||
      urlObj.pathname.startsWith('/user/') ||
      urlObj.pathname.startsWith('/@')
    );
  } catch {
    return false;
  }
}

/**
 * YouTubeプレイリストURLかどうかを判定
 * @param url チェックするURL
 * @returns プレイリストURLかどうか
 */
export function isYouTubePlaylistUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    if (!hostname.includes('youtube.com')) {
      return false;
    }
    
    // プレイリストURL形式を判定
    return (
      urlObj.pathname === '/playlist' ||
      urlObj.searchParams.has('list')
    );
  } catch {
    return false;
  }
}

/**
 * YouTube URL情報を包括的に解析
 * @param url 解析するURL
 * @returns URL情報
 */
export function analyzeYouTubeUrl(url: string) {
  return {
    isYouTube: isYouTubeUrl(url),
    isVideo: isYouTubeUrl(url) && extractYouTubeId(url) !== null,
    isChannel: isYouTubeChannelUrl(url),
    isPlaylist: isYouTubePlaylistUrl(url),
    videoId: extractYouTubeId(url),
    metadata: getYouTubeMetadata(url)
  };
}