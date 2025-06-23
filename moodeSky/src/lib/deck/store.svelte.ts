/**
 * deck/store.svelte.ts
 * デッキシステム状態管理
 * 
 * tokimekiblueskyのColumnStateを参考にしつつ、
 * Svelte 5 runes + Tauri Store Plugin統合
 */

import { Store, load } from '@tauri-apps/plugin-store';
import type { 
  Column, 
  DeckState, 
  DeckLayout, 
  ColumnType,
  ColumnAlgorithm,
  ColumnSettings
} from './types.js';
import { createColumn, DEFAULT_DECK_LAYOUT } from './types.js';

// ===================================================================
// デッキストアクラス（Svelte 5 runes）
// ===================================================================

export class DeckStore {
  // リアクティブ状態
  state = $state<DeckState>({
    layout: structuredClone(DEFAULT_DECK_LAYOUT),
    lastSavedAt: new Date().toISOString(),
    version: 1
  });

  isInitialized = $state(false);
  isLoading = $state(false);
  error = $state<string | null>(null);

  // Tauri Store
  private storeKey: string;

  constructor(accountId?: string) {
    // アカウント別ストアキー
    this.storeKey = accountId ? `deck_${accountId}` : 'deck_default';
  }

  // ===================================================================
  // 初期化・永続化
  // ===================================================================

  /**
   * ストアを初期化（保存データ読み込み）
   */
  async initialize(accountId?: string): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.isLoading = true;
      this.error = null;

      // アカウント変更時のストアキー更新
      if (accountId) {
        this.storeKey = `deck_${accountId}`;
      }

      // Tauri Store を読み込み
      const store = await load('deck.dat', { autoSave: false });
      
      // 保存されたデータ読み込み
      const savedState = await store.get<DeckState>(this.storeKey);
      
      if (savedState) {
        // マイグレーション処理（将来用）
        this.state = this.migrateState(savedState);
        console.log('🎛️ [DeckStore] Deck state loaded:', this.state);
      } else {
        console.log('🎛️ [DeckStore] No saved deck state, using defaults');
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('🎛️ [DeckStore] Failed to initialize:', error);
      this.error = 'デッキデータの読み込みに失敗しました';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * デッキ状態を保存
   */
  async save(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      this.state.lastSavedAt = new Date().toISOString();
      
      const store = await load('deck.dat', { autoSave: false });
      await store.set(this.storeKey, this.state);
      await store.save();
      
      console.log('🎛️ [DeckStore] Deck state saved');
    } catch (error) {
      console.error('🎛️ [DeckStore] Failed to save deck state:', error);
      this.error = 'デッキデータの保存に失敗しました';
    }
  }

  /**
   * 状態マイグレーション（将来のバージョン対応）
   */
  private migrateState(savedState: DeckState): DeckState {
    // 現在はv1のみ、将来的にマイグレーションロジック追加
    if (savedState.version !== 1) {
      console.warn('🎛️ [DeckStore] Unknown state version:', savedState.version);
    }
    
    return savedState;
  }

  // ===================================================================
  // カラム操作
  // ===================================================================

  /**
   * カラムを追加
   */
  async addColumn(
    accountId: string,
    algorithm: ColumnAlgorithm,
    settings?: Partial<ColumnSettings>,
    algorithmConfig?: any
  ): Promise<Column> {
    const column = createColumn(accountId, algorithm, settings);
    
    // アルゴリズム設定を追加
    if (algorithmConfig) {
      column.algorithmConfig = {
        type: algorithm === 'home' ? 'home' : 'custom',
        name: column.settings.title,
        ...algorithmConfig
      };
    }
    
    this.state.layout.columns.push(column);
    this.state.activeColumnId = column.id;
    
    await this.save();
    
    console.log('🎛️ [DeckStore] Column added:', column);
    return column;
  }

  /**
   * カラムを削除
   */
  async removeColumn(columnId: string): Promise<void> {
    const index = this.state.layout.columns.findIndex(col => col.id === columnId);
    
    if (index === -1) {
      console.warn('🎛️ [DeckStore] Column not found for removal:', columnId);
      return;
    }

    this.state.layout.columns.splice(index, 1);
    
    // アクティブカラムが削除された場合の処理
    if (this.state.activeColumnId === columnId) {
      this.state.activeColumnId = this.state.layout.columns[0]?.id;
    }

    await this.save();
    console.log('🎛️ [DeckStore] Column removed:', columnId);
  }

  /**
   * カラムを移動
   */
  async moveColumn(fromIndex: number, toIndex: number): Promise<void> {
    const columns = this.state.layout.columns;
    
    if (fromIndex < 0 || fromIndex >= columns.length || 
        toIndex < 0 || toIndex >= columns.length) {
      console.warn('🎛️ [DeckStore] Invalid column move indices:', fromIndex, toIndex);
      return;
    }

    const [movedColumn] = columns.splice(fromIndex, 1);
    columns.splice(toIndex, 0, movedColumn);

    await this.save();
    console.log('🎛️ [DeckStore] Column moved:', fromIndex, '→', toIndex);
  }

  /**
   * カラム設定を更新
   */
  async updateColumnSettings(columnId: string, settings: Partial<ColumnSettings>): Promise<void> {
    const column = this.state.layout.columns.find(col => col.id === columnId);
    
    if (!column) {
      console.warn('🎛️ [DeckStore] Column not found for settings update:', columnId);
      return;
    }

    column.settings = { ...column.settings, ...settings };
    column.updatedAt = new Date().toISOString();

    await this.save();
    console.log('🎛️ [DeckStore] Column settings updated:', columnId, settings);
  }

  /**
   * カラムデータを更新
   */
  updateColumnData(columnId: string, data: Partial<Column['data']>): void {
    const column = this.state.layout.columns.find(col => col.id === columnId);
    
    if (!column) {
      console.warn('🎛️ [DeckStore] Column not found for data update:', columnId);
      return;
    }

    column.data = { ...column.data, ...data };
    // データ更新は頻繁なので自動保存しない
  }

  // ===================================================================
  // デッキレイアウト操作
  // ===================================================================

  /**
   * デッキ設定を更新
   */
  async updateDeckSettings(settings: Partial<DeckLayout['settings']>): Promise<void> {
    this.state.layout.settings = { ...this.state.layout.settings, ...settings };
    await this.save();
    console.log('🎛️ [DeckStore] Deck settings updated:', settings);
  }

  /**
   * 全カラムをクリア
   */
  async clearAllColumns(): Promise<void> {
    this.state.layout.columns = [];
    this.state.activeColumnId = undefined;
    await this.save();
    console.log('🎛️ [DeckStore] All columns cleared');
  }

  // ===================================================================
  // ゲッター（derived）
  // ===================================================================

  /**
   * 現在のカラム一覧
   */
  get columns(): Column[] {
    return this.state.layout.columns;
  }

  /**
   * カラム数
   */
  get columnCount(): number {
    return this.state.layout.columns.length;
  }

  /**
   * カラムが空かどうか
   */
  get isEmpty(): boolean {
    return this.state.layout.columns.length === 0;
  }

  /**
   * アクティブカラム
   */
  get activeColumn(): Column | undefined {
    return this.state.layout.columns.find(col => col.id === this.state.activeColumnId);
  }

  /**
   * 指定IDのカラムを取得
   */
  getColumn(columnId: string): Column | undefined {
    return this.state.layout.columns.find(col => col.id === columnId);
  }

  /**
   * 指定インデックスのカラムを取得
   */
  getColumnByIndex(index: number): Column | undefined {
    return this.state.layout.columns[index];
  }

  /**
   * デッキ設定
   */
  get deckSettings(): DeckLayout['settings'] {
    return this.state.layout.settings;
  }
}

// ===================================================================
// グローバルインスタンス
// ===================================================================

export const deckStore = new DeckStore();