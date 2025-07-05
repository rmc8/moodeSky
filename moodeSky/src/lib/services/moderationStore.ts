import { Store } from '@tauri-apps/plugin-store';
import type {
  ModerationSettings,
  MutedKeyword,
  LabelModeration,
  LabelerConfig,
  FilterResult,
  FilterableContent,
  ModerationError,
  ModerationStats,
  ContentLabel,
  ModerationAction,
} from '../types/moderation.js';
import { DEFAULT_MODERATION_SETTINGS } from '../types/moderation.js';

/**
 * モデレーション機能の結果型
 */
export interface ModerationResult<T = void> {
  success: boolean;
  data?: T;
  error?: {
    type: ModerationError;
    message: string;
  };
}

/**
 * Tauri Store Plugin モデレーション管理サービス
 * コンテンツフィルタリング、キーワードミュート、ラベルモデレーションを提供
 */
export class ModerationStoreService {
  private readonly STORE_NAME = 'moderation.json';
  private store?: Store;

  constructor() {}

  /**
   * Store インスタンスを取得・初期化
   */
  private async getStore(): Promise<Store> {
    if (!this.store) {
      this.store = await Store.load(this.STORE_NAME);
    }
    return this.store;
  }

  /**
   * Store Pluginからデータを読み込み
   */
  private async loadFromStore<T>(key: string): Promise<ModerationResult<T | null>> {
    try {
      const store = await this.getStore();
      const value = await store.get<T>(key);
      return { success: true, data: value };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORAGE_ERROR',
          message: `Failed to load ${key}: ${error}`,
        },
      };
    }
  }

  /**
   * Store Pluginにデータを保存
   */
  private async saveToStore<T>(key: string, value: T): Promise<ModerationResult> {
    try {
      const store = await this.getStore();
      await store.set(key, value);
      await store.save();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORAGE_ERROR',
          message: `Failed to save ${key}: ${error}`,
        },
      };
    }
  }

  /**
   * Store Pluginからキーを削除
   */
  private async deleteFromStore(key: string): Promise<ModerationResult> {
    try {
      const store = await this.getStore();
      await store.delete(key);
      await store.save();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORAGE_ERROR',
          message: `Failed to delete ${key}: ${error}`,
        },
      };
    }
  }

  /**
   * キーワードの妥当性を検証
   */
  private validateKeyword(keyword: MutedKeyword): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!keyword.keyword || keyword.keyword.trim().length === 0) {
      errors.push('キーワードを入力してください');
    }

    if (keyword.keyword.length > 100) {
      errors.push('キーワードは100文字以内で入力してください');
    }

    if (keyword.type === 'regex') {
      try {
        new RegExp(keyword.keyword);
      } catch (e) {
        errors.push('正規表現の構文が正しくありません');
      }
    }

    if (keyword.targets.length === 0) {
      errors.push('少なくとも1つの対象を選択してください');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * テキストがキーワードにマッチするかチェック
   */
  private matchesKeyword(text: string, keyword: MutedKeyword): boolean {
    if (!text || !keyword.enabled) {
      return false;
    }

    const targetText = keyword.caseSensitive ? text : text.toLowerCase();
    const keywordText = keyword.caseSensitive ? keyword.keyword : keyword.keyword.toLowerCase();

    switch (keyword.type) {
      case 'exact':
        return targetText === keywordText;
      
      case 'partial':
        return targetText.includes(keywordText);
      
      case 'regex':
        try {
          const flags = keyword.caseSensitive ? 'g' : 'gi';
          const regex = new RegExp(keyword.keyword, flags);
          return regex.test(text);
        } catch (e) {
          return false;
        }
      
      case 'wildcard':
        const pattern = keywordText
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\\\*/g, '.*')
          .replace(/\\\?/g, '.');
        try {
          const flags = keyword.caseSensitive ? '' : 'i';
          const regex = new RegExp(`^${pattern}$`, flags);
          return regex.test(targetText);
        } catch (e) {
          return false;
        }
      
      default:
        return false;
    }
  }

  /**
   * モデレーション設定を読み込み
   */
  async loadModerationSettings(): Promise<ModerationResult<ModerationSettings>> {
    const result = await this.loadFromStore<ModerationSettings>('moderation_settings');
    if (!result.success) {
      return result as ModerationResult<ModerationSettings>;
    }

    // デフォルト設定とマージ
    const moderationSettings: ModerationSettings = {
      ...DEFAULT_MODERATION_SETTINGS,
      ...result.data,
    };

    return { success: true, data: moderationSettings };
  }

  /**
   * モデレーション設定を保存
   */
  async saveModerationSettings(settings: ModerationSettings): Promise<ModerationResult> {
    // キーワードの検証
    for (const keyword of settings.mutedKeywords) {
      const validation = this.validateKeyword(keyword);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            type: 'INVALID_KEYWORD',
            message: `キーワード "${keyword.keyword}" の検証に失敗: ${validation.errors.join(', ')}`,
          },
        };
      }
    }

    // 更新日時を設定
    const updatedSettings: ModerationSettings = {
      ...settings,
      lastSyncAt: new Date().toISOString(),
      version: settings.version + 1,
    };

    return await this.saveToStore('moderation_settings', updatedSettings);
  }

  /**
   * キーワードミュートを追加
   */
  async addMutedKeyword(keyword: Omit<MutedKeyword, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModerationResult<MutedKeyword>> {
    // 新しいキーワードオブジェクトを作成
    const newKeyword: MutedKeyword = {
      ...keyword,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 検証
    const validation = this.validateKeyword(newKeyword);
    if (!validation.isValid) {
      return {
        success: false,
        error: {
          type: 'INVALID_KEYWORD',
          message: validation.errors.join(', '),
        },
      };
    }

    // 設定を読み込み
    const settingsResult = await this.loadModerationSettings();
    if (!settingsResult.success) {
      return {
        success: false,
        error: settingsResult.error,
      } as ModerationResult<MutedKeyword>;
    }

    const settings = settingsResult.data!;
    
    // キーワードを追加
    settings.mutedKeywords.push(newKeyword);

    // 保存
    const saveResult = await this.saveModerationSettings(settings);
    if (!saveResult.success) {
      return {
        success: false,
        error: saveResult.error,
      } as ModerationResult<MutedKeyword>;
    }

    return { success: true, data: newKeyword };
  }

  /**
   * キーワードミュートを更新
   */
  async updateMutedKeyword(id: string, updates: Partial<MutedKeyword>): Promise<ModerationResult<MutedKeyword>> {
    const settingsResult = await this.loadModerationSettings();
    if (!settingsResult.success) {
      return {
        success: false,
        error: settingsResult.error,
      } as ModerationResult<MutedKeyword>;
    }

    const settings = settingsResult.data!;
    const keywordIndex = settings.mutedKeywords.findIndex(k => k.id === id);
    
    if (keywordIndex === -1) {
      return {
        success: false,
        error: {
          type: 'INVALID_KEYWORD',
          message: `キーワード ID ${id} が見つかりません`,
        },
      };
    }

    // キーワードを更新
    const updatedKeyword: MutedKeyword = {
      ...settings.mutedKeywords[keywordIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // 検証
    const validation = this.validateKeyword(updatedKeyword);
    if (!validation.isValid) {
      return {
        success: false,
        error: {
          type: 'INVALID_KEYWORD',
          message: validation.errors.join(', '),
        },
      };
    }

    settings.mutedKeywords[keywordIndex] = updatedKeyword;

    // 保存
    const saveResult = await this.saveModerationSettings(settings);
    if (!saveResult.success) {
      return {
        success: false,
        error: saveResult.error,
      } as ModerationResult<MutedKeyword>;
    }

    return { success: true, data: updatedKeyword };
  }

  /**
   * キーワードミュートを削除
   */
  async removeMutedKeyword(id: string): Promise<ModerationResult> {
    const settingsResult = await this.loadModerationSettings();
    if (!settingsResult.success) {
      return settingsResult;
    }

    const settings = settingsResult.data!;
    const initialLength = settings.mutedKeywords.length;
    settings.mutedKeywords = settings.mutedKeywords.filter(k => k.id !== id);

    if (settings.mutedKeywords.length === initialLength) {
      return {
        success: false,
        error: {
          type: 'INVALID_KEYWORD',
          message: `キーワード ID ${id} が見つかりません`,
        },
      };
    }

    return await this.saveModerationSettings(settings);
  }

  /**
   * ラベルモデレーション設定を更新
   */
  async updateLabelModeration(label: ContentLabel, action: ModerationAction, enabled: boolean): Promise<ModerationResult> {
    const settingsResult = await this.loadModerationSettings();
    if (!settingsResult.success) {
      return settingsResult;
    }

    const settings = settingsResult.data!;
    const labelIndex = settings.labelModeration.findIndex(l => l.label === label);

    if (labelIndex === -1) {
      // 新しいラベル設定を追加
      settings.labelModeration.push({
        label,
        action,
        enabled,
        isCustom: true,
      });
    } else {
      // 既存の設定を更新
      settings.labelModeration[labelIndex] = {
        ...settings.labelModeration[labelIndex],
        action,
        enabled,
        isCustom: true,
      };
    }

    return await this.saveModerationSettings(settings);
  }

  /**
   * コンテンツをフィルタリング
   */
  async filterContent(content: FilterableContent): Promise<ModerationResult<FilterResult>> {
    try {
      const settingsResult = await this.loadModerationSettings();
      if (!settingsResult.success) {
        return {
          success: false,
          error: settingsResult.error,
        } as ModerationResult<FilterResult>;
      }

      const settings = settingsResult.data!;
      const result: FilterResult = {
        filtered: false,
        matchedLabels: [],
        matchedKeywords: [],
      };

      // ラベルベースのフィルタリング
      if (content.labels && content.labels.length > 0) {
        for (const label of content.labels) {
          const labelConfig = settings.labelModeration.find(l => l.label === label && l.enabled);
          if (labelConfig && labelConfig.action !== 'show') {
            result.filtered = true;
            result.action = labelConfig.action;
            result.matchedLabels!.push(label as ContentLabel);
            result.reason = `ラベル: ${label}`;
            break; // 最初にマッチしたラベルでアクションを決定
          }
        }
      }

      // キーワードベースのフィルタリング
      if (!result.filtered && settings.mutedKeywords.length > 0) {
        for (const keyword of settings.mutedKeywords.filter(k => k.enabled)) {
          let matched = false;

          // 投稿本文をチェック
          if (keyword.targets.includes('content') && content.text) {
            matched = this.matchesKeyword(content.text, keyword);
          }

          // ハッシュタグをチェック
          if (!matched && keyword.targets.includes('hashtags') && content.hashtags) {
            matched = content.hashtags.some(tag => this.matchesKeyword(tag, keyword));
          }

          // メンションをチェック
          if (!matched && keyword.targets.includes('mentions') && content.mentions) {
            matched = content.mentions.some(mention => this.matchesKeyword(mention, keyword));
          }

          // alt テキストをチェック
          if (!matched && keyword.targets.includes('alt-text') && content.altText) {
            matched = content.altText.some(alt => this.matchesKeyword(alt, keyword));
          }

          if (matched) {
            result.filtered = true;
            result.action = 'hide'; // キーワードマッチは基本的に非表示
            result.matchedKeywords!.push(keyword.keyword);
            result.reason = `キーワード: ${keyword.keyword}`;
            break; // 最初にマッチしたキーワードでアクションを決定
          }
        }
      }

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORAGE_ERROR',
          message: `コンテンツフィルタリングエラー: ${error}`,
        },
      };
    }
  }

  /**
   * モデレーション統計を更新
   */
  async updateStats(filteredContent: FilterResult): Promise<ModerationResult> {
    if (!filteredContent.filtered) {
      return { success: true };
    }

    try {
      const statsResult = await this.loadFromStore<ModerationStats>('moderation_stats');
      const currentStats: ModerationStats = statsResult.data || {
        totalFiltered: 0,
        filteredByLabel: {} as Record<ContentLabel, number>,
        filteredByKeyword: {},
        lastUpdated: new Date().toISOString(),
      };

      // 統計を更新
      currentStats.totalFiltered += 1;
      currentStats.lastUpdated = new Date().toISOString();

      // ラベル統計
      if (filteredContent.matchedLabels) {
        for (const label of filteredContent.matchedLabels) {
          currentStats.filteredByLabel[label] = (currentStats.filteredByLabel[label] || 0) + 1;
        }
      }

      // キーワード統計
      if (filteredContent.matchedKeywords) {
        for (const keyword of filteredContent.matchedKeywords) {
          currentStats.filteredByKeyword[keyword] = (currentStats.filteredByKeyword[keyword] || 0) + 1;
        }
      }

      return await this.saveToStore('moderation_stats', currentStats);
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORAGE_ERROR',
          message: `統計更新エラー: ${error}`,
        },
      };
    }
  }

  /**
   * モデレーション統計を取得
   */
  async getStats(): Promise<ModerationResult<ModerationStats | null>> {
    return await this.loadFromStore<ModerationStats>('moderation_stats');
  }

  /**
   * 全モデレーションデータをクリア
   */
  async clearAll(): Promise<ModerationResult> {
    try {
      await this.deleteFromStore('moderation_settings');
      await this.deleteFromStore('moderation_stats');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'STORAGE_ERROR',
          message: `モデレーションデータのクリアに失敗: ${error}`,
        },
      };
    }
  }
}

// シングルトンインスタンス
export const moderationStoreService = new ModerationStoreService();