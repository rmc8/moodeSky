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
  DeckSettings,
  ColumnType,
  ColumnAlgorithm,
  ColumnSettings
} from './types.js';
import type { Account } from '$lib/types/auth.js';
import { createColumn, DEFAULT_DECK_LAYOUT, DEFAULT_DECK_SETTINGS } from './types.js';

// ===================================================================
// デッキストアクラス（Svelte 5 runes）
// ===================================================================

export class DeckStore {
  // リアクティブ状態
  state = $state<DeckState>({
    layout: structuredClone(DEFAULT_DECK_LAYOUT),
    deckSettings: structuredClone(DEFAULT_DECK_SETTINGS),
    lastSavedAt: new Date().toISOString(),
    version: 2
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
    // v1からv2: deckSettings追加
    if (savedState.version === 1 && !savedState.deckSettings) {
      console.log('🎛️ [DeckStore] Migrating state v1 → v2: Adding deckSettings');
      return {
        ...savedState,
        deckSettings: structuredClone(DEFAULT_DECK_SETTINGS),
        version: 2
      };
    }
    
    // 不明なバージョンの場合は警告
    if (savedState.version > 2) {
      console.warn('🎛️ [DeckStore] Unknown state version:', savedState.version);
    }
    
    return savedState;
  }

  // ===================================================================
  // カラム操作
  // ===================================================================

  /**
   * カラムを追加（マルチアカウント対応）
   */
  async addColumn(
    accountId: string,
    algorithm: ColumnAlgorithm,
    settings?: Partial<ColumnSettings>,
    algorithmConfig?: any,
    targetAccounts?: Account[]
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
    
    // マルチアカウント対応：対象アカウント配列を設定
    if (targetAccounts && targetAccounts.length > 0) {
      column.targetAccounts = targetAccounts;
      console.log('🎛️ [DeckStore] Setting targetAccounts for column:', targetAccounts.length);
    }
    
    this.state.layout.columns.push(column);
    this.state.activeColumnId = column.id;
    
    await this.save();
    
    console.log('🎛️ [DeckStore] Column added:', column);
    return column;
  }

  /**
   * カラムを削除
   * エッジケース対応: アクティブカラム削除時の同期イベント発行
   */
  async removeColumn(columnId: string): Promise<void> {
    const index = this.state.layout.columns.findIndex(col => col.id === columnId);
    
    if (index === -1) {
      console.warn('🎛️ [DeckStore] Column not found for removal:', columnId);
      return;
    }

    const wasActiveColumn = this.state.activeColumnId === columnId;
    const oldActiveId = this.state.activeColumnId;
    
    this.state.layout.columns.splice(index, 1);
    
    // アクティブカラムが削除された場合の処理
    if (wasActiveColumn) {
      this.state.activeColumnId = this.state.layout.columns[0]?.id;
      console.log('🔄 [DeckStore] Active column was deleted, switched to:', this.state.activeColumnId);
    }

    await this.save();
    console.log('🎛️ [DeckStore] Column removed:', columnId);
    
    // カラム削除による同期イベントを発行（アクティブカラム変更時のみ）
    if (wasActiveColumn && typeof window !== 'undefined') {
      const syncEvent = new CustomEvent('columnOrderChanged', {
        detail: {
          newColumnOrder: this.state.layout.columns.map(col => col.id),
          activeColumnId: this.state.activeColumnId,
          activeColumnIndex: this.getActiveColumnIndex(),
          timestamp: Date.now(),
          source: 'DeckStore-removeColumn',
          reason: 'activeColumnDeleted',
          deletedColumnId: columnId,
          oldActiveId
        },
        bubbles: true
      });
      window.dispatchEvent(syncEvent);
      
      console.log('🔄 [DeckStore] Column deletion sync event emitted:', {
        deletedColumnId: columnId,
        newActiveColumnId: this.state.activeColumnId,
        newActiveColumnIndex: this.getActiveColumnIndex()
      });
    }
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
   * カラムタイトルを更新
   */
  async updateColumnTitle(columnId: string, title: string): Promise<void> {
    const column = this.state.layout.columns.find(col => col.id === columnId);
    
    if (!column) {
      console.warn('🎛️ [DeckStore] Column not found for title update:', columnId);
      return;
    }

    column.settings.title = title.trim();
    column.updatedAt = new Date().toISOString();

    await this.save();
    console.log('🎛️ [DeckStore] Column title updated:', columnId, title);
  }

  /**
   * カラムのアカウントを更新（マルチアカウント対応）
   */
  async updateColumnAccount(columnId: string, accountId: string | 'all', targetAccounts?: Account[]): Promise<void> {
    const column = this.state.layout.columns.find(col => col.id === columnId);
    
    if (!column) {
      console.warn('🎛️ [DeckStore] Column not found for account update:', columnId);
      return;
    }

    column.accountId = accountId;
    column.updatedAt = new Date().toISOString();
    
    // 全アカウント選択時は対象アカウント配列を設定
    if (accountId === 'all' && targetAccounts && targetAccounts.length > 0) {
      column.targetAccounts = targetAccounts;
      console.log('🎛️ [DeckStore] Setting targetAccounts for column:', targetAccounts.length);
    } else {
      // 単一アカウント選択時は対象アカウント配列をクリア
      column.targetAccounts = undefined;
    }

    await this.save();
    console.log('🎛️ [DeckStore] Column account updated:', columnId, accountId);
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
   * デッキグローバル設定を更新
   */
  async updateDeckSettings(settings: Partial<DeckSettings>): Promise<void> {
    this.state.deckSettings = { ...this.state.deckSettings, ...settings };
    await this.save();
    console.log('🎛️ [DeckStore] Deck settings updated:', settings);
  }

  /**
   * デッキレイアウト設定を更新
   */
  async updateDeckLayoutSettings(settings: Partial<DeckLayout['settings']>): Promise<void> {
    this.state.layout.settings = { ...this.state.layout.settings, ...settings };
    await this.save();
    console.log('🎛️ [DeckStore] Deck layout settings updated:', settings);
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
   * デッキグローバル設定
   */
  get deckSettings(): DeckSettings {
    return this.state.deckSettings;
  }

  /**
   * デッキレイアウト設定
   */
  get deckLayoutSettings(): DeckLayout['settings'] {
    return this.state.layout.settings;
  }

  // ===================================================================
  // タブ/デッキ同期システム
  // ===================================================================

  /**
   * アクティブカラムの現在のインデックスを取得
   * ドラッグ&ドロップでの並び替え後の同期に使用
   * エッジケース対応: 削除・空状態・無効ID
   */
  getActiveColumnIndex(): number {
    // 空のデッキ状態
    if (this.state.layout.columns.length === 0) {
      console.log('🔄 [DeckStore] Empty deck - returning index 0');
      return 0;
    }
    
    // アクティブIDが未設定の場合
    if (!this.state.activeColumnId) {
      console.log('🔄 [DeckStore] No active column ID - defaulting to first column');
      this.state.activeColumnId = this.state.layout.columns[0]?.id;
      return 0;
    }
    
    // アクティブIDに対応するカラムを検索
    const index = this.state.layout.columns.findIndex(col => col.id === this.state.activeColumnId);
    
    // 無効なアクティブID（削除されたカラム等）
    if (index === -1) {
      console.warn('🔄 [DeckStore] Active column ID not found - resetting to first available column:', {
        invalidId: this.state.activeColumnId,
        availableColumns: this.state.layout.columns.length
      });
      
      // 最初の利用可能なカラムにフォールバック
      this.state.activeColumnId = this.state.layout.columns[0]?.id;
      return 0;
    }
    
    return index;
  }

  /**
   * アクティブカラムIDの現在位置を計算（リアクティブ）
   * Svelte 5 runesでの自動同期用
   */
  get activeColumnIndex(): number {
    return this.getActiveColumnIndex();
  }

  /**
   * 指定インデックスのカラムをアクティブに設定
   * モバイルナビゲーションとの同期用
   */
  setActiveColumnByIndex(index: number): void {
    const column = this.state.layout.columns[index];
    if (column) {
      this.state.activeColumnId = column.id;
      console.log('🔄 [DeckStore] Active column updated by index:', { index, columnId: column.id });
    } else {
      console.warn('🔄 [DeckStore] Invalid column index for activation:', index);
    }
  }

  /**
   * カラム並び替え後のアクティブインデックス同期
   * DeckContainerのactiveColumnIndexとの同期を確保
   */
  syncActiveColumnIndex(): number {
    const currentIndex = this.getActiveColumnIndex();
    console.log('🔄 [DeckStore] Active column index synced:', {
      activeColumnId: this.state.activeColumnId,
      currentIndex,
      totalColumns: this.state.layout.columns.length
    });
    return currentIndex;
  }
}

// ===================================================================
// グローバルインスタンス
// ===================================================================

export const deckStore = new DeckStore();