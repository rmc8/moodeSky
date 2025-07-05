import type { 
  ModerationSettings, 
  MutedKeyword, 
  ContentLabel, 
  ModerationAction,
  FilterResult,
  FilterableContent,
  ModerationStats
} from '../types/moderation.js';
import { DEFAULT_MODERATION_SETTINGS } from '../types/moderation.js';
import { moderationStoreService } from '../services/moderationStore.js';

/**
 * Svelte 5 $state runesを使ったモデレーションストア
 * コンテンツフィルタリング、キーワードミュート、ラベルモデレーションの状態管理
 */
class ModerationStore {
  /** 現在のモデレーション設定 */
  settings = $state<ModerationSettings>(DEFAULT_MODERATION_SETTINGS);

  /** モデレーション統計 */
  stats = $state<ModerationStats | null>(null);

  /** 初期化状態 */
  isInitialized = $state<boolean>(false);

  /** ローディング状態 */
  isLoading = $state<boolean>(false);

  /** エラー状態 */
  error = $state<string | null>(null);

  /** 設定変更中フラグ */
  isUpdating = $state<boolean>(false);

  constructor() {}

  /**
   * ストアを初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      // 保存された設定を読み込み
      const settingsResult = await moderationStoreService.loadModerationSettings();
      if (settingsResult.success && settingsResult.data) {
        this.settings = settingsResult.data;
      }

      // 統計を読み込み
      const statsResult = await moderationStoreService.getStats();
      if (statsResult.success && statsResult.data) {
        this.stats = statsResult.data;
      }

      this.isInitialized = true;
    } catch (error) {
      this.error = `Failed to initialize moderation store: ${error}`;
      console.error('Moderation store initialization error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * キーワードミュートを追加
   */
  async addMutedKeyword(keyword: Omit<MutedKeyword, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> {
    this.isUpdating = true;
    this.error = null;

    try {
      const result = await moderationStoreService.addMutedKeyword(keyword);
      if (result.success && result.data) {
        // ローカル状態を更新
        this.settings = {
          ...this.settings,
          mutedKeywords: [...this.settings.mutedKeywords, result.data],
        };
        return true;
      } else {
        this.error = result.error?.message || 'キーワードの追加に失敗しました';
        return false;
      }
    } catch (error) {
      this.error = `キーワード追加エラー: ${error}`;
      console.error('Add muted keyword error:', error);
      return false;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * キーワードミュートを更新
   */
  async updateMutedKeyword(id: string, updates: Partial<MutedKeyword>): Promise<boolean> {
    this.isUpdating = true;
    this.error = null;

    try {
      const result = await moderationStoreService.updateMutedKeyword(id, updates);
      if (result.success && result.data) {
        // ローカル状態を更新
        const keywordIndex = this.settings.mutedKeywords.findIndex(k => k.id === id);
        if (keywordIndex !== -1) {
          const updatedKeywords = [...this.settings.mutedKeywords];
          updatedKeywords[keywordIndex] = result.data;
          this.settings = {
            ...this.settings,
            mutedKeywords: updatedKeywords,
          };
        }
        return true;
      } else {
        this.error = result.error?.message || 'キーワードの更新に失敗しました';
        return false;
      }
    } catch (error) {
      this.error = `キーワード更新エラー: ${error}`;
      console.error('Update muted keyword error:', error);
      return false;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * キーワードミュートを削除
   */
  async removeMutedKeyword(id: string): Promise<boolean> {
    this.isUpdating = true;
    this.error = null;

    try {
      const result = await moderationStoreService.removeMutedKeyword(id);
      if (result.success) {
        // ローカル状態を更新
        this.settings = {
          ...this.settings,
          mutedKeywords: this.settings.mutedKeywords.filter(k => k.id !== id),
        };
        return true;
      } else {
        this.error = result.error?.message || 'キーワードの削除に失敗しました';
        return false;
      }
    } catch (error) {
      this.error = `キーワード削除エラー: ${error}`;
      console.error('Remove muted keyword error:', error);
      return false;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * キーワードミュートの有効/無効を切り替え
   */
  async toggleMutedKeyword(id: string): Promise<boolean> {
    const keyword = this.settings.mutedKeywords.find(k => k.id === id);
    if (!keyword) {
      this.error = 'キーワードが見つかりません';
      return false;
    }

    return await this.updateMutedKeyword(id, { enabled: !keyword.enabled });
  }

  /**
   * ラベルモデレーション設定を更新
   */
  async updateLabelModeration(label: ContentLabel, action: ModerationAction, enabled: boolean): Promise<boolean> {
    this.isUpdating = true;
    this.error = null;

    try {
      const result = await moderationStoreService.updateLabelModeration(label, action, enabled);
      if (result.success) {
        // ローカル状態を更新
        const labelIndex = this.settings.labelModeration.findIndex(l => l.label === label);
        const updatedLabels = [...this.settings.labelModeration];

        if (labelIndex === -1) {
          // 新しいラベル設定を追加
          updatedLabels.push({
            label,
            action,
            enabled,
            isCustom: true,
          });
        } else {
          // 既存の設定を更新
          updatedLabels[labelIndex] = {
            ...updatedLabels[labelIndex],
            action,
            enabled,
            isCustom: true,
          };
        }

        this.settings = {
          ...this.settings,
          labelModeration: updatedLabels,
        };
        return true;
      } else {
        this.error = result.error?.message || 'ラベル設定の更新に失敗しました';
        return false;
      }
    } catch (error) {
      this.error = `ラベル設定更新エラー: ${error}`;
      console.error('Update label moderation error:', error);
      return false;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * アダルトコンテンツ設定を切り替え
   */
  async toggleAdultContent(): Promise<boolean> {
    this.isUpdating = true;
    this.error = null;

    try {
      const updatedSettings = {
        ...this.settings,
        adultContentEnabled: !this.settings.adultContentEnabled,
      };

      const result = await moderationStoreService.saveModerationSettings(updatedSettings);
      if (result.success) {
        this.settings = updatedSettings;
        return true;
      } else {
        this.error = result.error?.message || 'アダルトコンテンツ設定の変更に失敗しました';
        return false;
      }
    } catch (error) {
      this.error = `アダルトコンテンツ設定エラー: ${error}`;
      console.error('Toggle adult content error:', error);
      return false;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * 政治コンテンツレベルを設定
   */
  async setPoliticalContentLevel(level: 'hide' | 'warn' | 'show'): Promise<boolean> {
    this.isUpdating = true;
    this.error = null;

    try {
      const updatedSettings = {
        ...this.settings,
        politicalContentLevel: level,
      };

      const result = await moderationStoreService.saveModerationSettings(updatedSettings);
      if (result.success) {
        this.settings = updatedSettings;
        return true;
      } else {
        this.error = result.error?.message || '政治コンテンツ設定の変更に失敗しました';
        return false;
      }
    } catch (error) {
      this.error = `政治コンテンツ設定エラー: ${error}`;
      console.error('Set political content level error:', error);
      return false;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * コンテンツをフィルタリング
   */
  async filterContent(content: FilterableContent): Promise<FilterResult | null> {
    try {
      const result = await moderationStoreService.filterContent(content);
      if (result.success && result.data) {
        // 統計を更新（フィルタされた場合のみ）
        if (result.data.filtered) {
          await moderationStoreService.updateStats(result.data);
          // 統計を再読み込み
          await this.refreshStats();
        }
        return result.data;
      } else {
        console.error('Content filtering error:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Filter content error:', error);
      return null;
    }
  }

  /**
   * 統計を再読み込み
   */
  async refreshStats(): Promise<void> {
    try {
      const result = await moderationStoreService.getStats();
      if (result.success) {
        this.stats = result.data;
      }
    } catch (error) {
      console.error('Refresh stats error:', error);
    }
  }

  /**
   * 設定をデフォルトにリセット
   */
  async resetToDefaults(): Promise<boolean> {
    this.isUpdating = true;
    this.error = null;

    try {
      const result = await moderationStoreService.saveModerationSettings(DEFAULT_MODERATION_SETTINGS);
      if (result.success) {
        this.settings = { ...DEFAULT_MODERATION_SETTINGS };
        return true;
      } else {
        this.error = result.error?.message || '設定のリセットに失敗しました';
        return false;
      }
    } catch (error) {
      this.error = `設定リセットエラー: ${error}`;
      console.error('Reset moderation settings error:', error);
      return false;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * エラーをクリア
   */
  clearError(): void {
    this.error = null;
  }

  /**
   * 特定のラベルが有効かどうかを判定
   */
  isLabelEnabled(label: ContentLabel): boolean {
    const labelConfig = this.settings.labelModeration.find(l => l.label === label);
    return labelConfig?.enabled || false;
  }

  /**
   * 特定のラベルのアクションを取得
   */
  getLabelAction(label: ContentLabel): ModerationAction {
    const labelConfig = this.settings.labelModeration.find(l => l.label === label);
    return labelConfig?.action || 'show';
  }

  /**
   * アクティブなキーワード数を取得
   */
  get activeKeywordCount(): number {
    return this.settings.mutedKeywords.filter(k => k.enabled).length;
  }

  /**
   * アクティブなラベル数を取得
   */
  get activeLabelCount(): number {
    return this.settings.labelModeration.filter(l => l.enabled && l.action !== 'show').length;
  }

  /**
   * フィルタリングが有効かどうかを判定
   */
  get isFilteringActive(): boolean {
    return this.settings.autoFilterEnabled && 
           (this.activeKeywordCount > 0 || this.activeLabelCount > 0);
  }

  /**
   * 今日のフィルタ数を取得
   */
  get todayFilteredCount(): number {
    if (!this.stats) return 0;
    const today = new Date().toDateString();
    const statsDate = new Date(this.stats.lastUpdated).toDateString();
    return today === statsDate ? this.stats.totalFiltered : 0;
  }
}

// シングルトンインスタンス
export const moderationStore = new ModerationStore();