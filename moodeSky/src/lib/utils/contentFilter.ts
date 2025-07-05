/**
 * コンテンツフィルタリングユーティリティ関数
 * AT Protocol投稿データから必要な情報を抽出してフィルタリング判定を行う
 */

import type { 
  FilterableContent, 
  ContentType,
  FilterResult 
} from '../types/moderation.js';
import { moderationStore } from '../stores/moderation.svelte.js';

/**
 * AT Protocol投稿データの型定義（簡略版）
 */
export interface AtProtoPost {
  uri: string;
  cid: string;
  record: {
    text?: string;
    facets?: Array<{
      features: Array<{
        $type: string;
        tag?: string;
        did?: string;
        uri?: string;
      }>;
    }>;
    embed?: any;
    createdAt: string;
  };
  author: {
    did: string;
    handle: string;
    displayName?: string;
  };
  labels?: Array<{
    val: string;
    neg?: boolean;
  }>;
  embed?: {
    images?: Array<{
      alt?: string;
    }>;
    external?: {
      title?: string;
      description?: string;
    };
  };
}

/**
 * AT Protocol投稿からFilterableContentを構築
 */
export function extractFilterableContent(post: AtProtoPost): FilterableContent {
  const content: FilterableContent = {
    type: 'post',
    authorDid: post.author.did,
    createdAt: post.record.createdAt,
  };

  // テキスト内容を抽出
  if (post.record.text) {
    content.text = post.record.text;
  }

  // ハッシュタグとメンションを抽出
  if (post.record.facets) {
    const hashtags: string[] = [];
    const mentions: string[] = [];

    for (const facet of post.record.facets) {
      for (const feature of facet.features) {
        if (feature.$type === 'app.bsky.richtext.facet#tag' && feature.tag) {
          hashtags.push(feature.tag);
        } else if (feature.$type === 'app.bsky.richtext.facet#mention' && feature.did) {
          mentions.push(feature.did);
        }
      }
    }

    if (hashtags.length > 0) content.hashtags = hashtags;
    if (mentions.length > 0) content.mentions = mentions;
  }

  // 画像のaltテキストを抽出
  if (post.embed?.images) {
    const altTexts: string[] = [];
    for (const image of post.embed.images) {
      if (image.alt) {
        altTexts.push(image.alt);
      }
    }
    if (altTexts.length > 0) content.altText = altTexts;
  }

  // ラベルを抽出
  if (post.labels) {
    const labels: string[] = [];
    for (const label of post.labels) {
      if (!label.neg) { // 否定されていないラベルのみ
        labels.push(label.val);
      }
    }
    if (labels.length > 0) content.labels = labels;
  }

  return content;
}

/**
 * 投稿をフィルタリング
 */
export async function filterPost(post: AtProtoPost): Promise<FilterResult | null> {
  const content = extractFilterableContent(post);
  return await moderationStore.filterContent(content);
}

/**
 * 複数の投稿を一括フィルタリング
 */
export async function filterPosts(posts: AtProtoPost[]): Promise<Array<{post: AtProtoPost, filterResult: FilterResult | null}>> {
  const results = [];
  
  for (const post of posts) {
    const filterResult = await filterPost(post);
    results.push({ post, filterResult });
  }
  
  return results;
}

/**
 * プロフィール情報からFilterableContentを構築
 */
export function extractProfileContent(profile: {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  labels?: Array<{ val: string; neg?: boolean }>;
}): FilterableContent {
  const content: FilterableContent = {
    type: 'profile',
    authorDid: profile.did,
  };

  // 表示名とbioを結合してテキストとして扱う
  const textParts: string[] = [];
  if (profile.displayName) textParts.push(profile.displayName);
  if (profile.description) textParts.push(profile.description);
  
  if (textParts.length > 0) {
    content.text = textParts.join(' ');
  }

  // ラベルを抽出
  if (profile.labels) {
    const labels: string[] = [];
    for (const label of profile.labels) {
      if (!label.neg) {
        labels.push(label.val);
      }
    }
    if (labels.length > 0) content.labels = labels;
  }

  return content;
}

/**
 * プロフィールをフィルタリング
 */
export async function filterProfile(profile: {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  labels?: Array<{ val: string; neg?: boolean }>;
}): Promise<FilterResult | null> {
  const content = extractProfileContent(profile);
  return await moderationStore.filterContent(content);
}

/**
 * 外部リンクの情報からFilterableContentを構築
 */
export function extractLinkContent(link: {
  uri: string;
  title: string;
  description: string;
}): FilterableContent {
  return {
    type: 'link',
    text: `${link.title} ${link.description}`,
  };
}

/**
 * 外部リンクをフィルタリング
 */
export async function filterLink(link: {
  uri: string;
  title: string;
  description: string;
}): Promise<FilterResult | null> {
  const content = extractLinkContent(link);
  return await moderationStore.filterContent(content);
}

/**
 * フィルタ結果に基づいてコンテンツを表示するかどうかを判定
 */
export function shouldShowContent(filterResult: FilterResult | null): boolean {
  if (!filterResult || !filterResult.filtered) {
    return true; // フィルタされていない場合は表示
  }

  // アクションに基づいて判定
  switch (filterResult.action) {
    case 'show':
      return true;
    case 'warn':
    case 'blur':
      return true; // 警告やぼかしありで表示
    case 'hide':
    case 'filter':
      return false; // 非表示
    default:
      return true;
  }
}

/**
 * フィルタ結果に基づいてコンテンツにぼかしを適用するかどうかを判定
 */
export function shouldBlurContent(filterResult: FilterResult | null): boolean {
  if (!filterResult || !filterResult.filtered) {
    return false;
  }

  return filterResult.action === 'blur';
}

/**
 * フィルタ結果に基づいて警告を表示するかどうかを判定
 */
export function shouldShowWarning(filterResult: FilterResult | null): boolean {
  if (!filterResult || !filterResult.filtered) {
    return false;
  }

  return filterResult.action === 'warn';
}

/**
 * フィルタ理由のユーザーフレンドリーなメッセージを生成
 */
export function getFilterMessage(filterResult: FilterResult): string {
  if (!filterResult.filtered) {
    return '';
  }

  const reasons: string[] = [];

  if (filterResult.matchedLabels && filterResult.matchedLabels.length > 0) {
    const labelNames = filterResult.matchedLabels.map(label => {
      switch (label) {
        case 'adult': return 'アダルトコンテンツ';
        case 'sexual': return '性的コンテンツ';
        case 'violence': return '暴力的コンテンツ';
        case 'graphic': return 'グロテスクなコンテンツ';
        case 'spam': return 'スパム';
        case 'political': return '政治的コンテンツ';
        default: return label;
      }
    });
    reasons.push(`ラベル: ${labelNames.join(', ')}`);
  }

  if (filterResult.matchedKeywords && filterResult.matchedKeywords.length > 0) {
    reasons.push(`キーワード: ${filterResult.matchedKeywords.join(', ')}`);
  }

  return reasons.join(' / ');
}

/**
 * フィルタリング設定のクイック切り替え用ヘルパー
 */
export class FilterToggleHelper {
  /**
   * アダルトコンテンツの表示切り替え
   */
  static async toggleAdultContent(): Promise<boolean> {
    return await moderationStore.toggleAdultContent();
  }

  /**
   * 政治コンテンツの表示レベル変更
   */
  static async setPoliticalLevel(level: 'hide' | 'warn' | 'show'): Promise<boolean> {
    return await moderationStore.setPoliticalContentLevel(level);
  }

  /**
   * 特定のキーワードミュートの切り替え
   */
  static async toggleKeyword(id: string): Promise<boolean> {
    return await moderationStore.toggleMutedKeyword(id);
  }
}

/**
 * フィルタリング統計のヘルパー
 */
export class FilterStatsHelper {
  /**
   * 今日のフィルタ数を取得
   */
  static getTodayFilteredCount(): number {
    return moderationStore.todayFilteredCount;
  }

  /**
   * アクティブなフィルタ数を取得
   */
  static getActiveFilterCount(): number {
    return moderationStore.activeKeywordCount + moderationStore.activeLabelCount;
  }

  /**
   * フィルタリングが有効かどうかを判定
   */
  static isFilteringActive(): boolean {
    return moderationStore.isFilteringActive;
  }
}