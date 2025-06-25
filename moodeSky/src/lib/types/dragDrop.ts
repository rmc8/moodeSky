/**
 * dragDrop.ts
 * ドラッグ&ドロップ機能の型定義
 * 
 * svelte-dnd-actionライブラリとの統合用型定義
 * 型安全性を確立し、any型の使用を排除
 */

import type { Column } from '../deck/types.js';
import type { DndEvent, SOURCES } from 'svelte-dnd-action';
import { TRIGGERS } from 'svelte-dnd-action';

/**
 * svelte-dnd-actionのイベント詳細（Column型に特化）
 */
export type ColumnDndEvent = DndEvent<Column>;

/**
 * ドラッグ&ドロップイベント情報の型ガード
 */
export function isDraggedEntered(trigger: TRIGGERS): boolean {
  return trigger === TRIGGERS.DRAGGED_ENTERED;
}

export function isDroppedIntoZone(trigger: TRIGGERS): boolean {
  return trigger === TRIGGERS.DROPPED_INTO_ZONE;
}

/**
 * タブ同期イベントの詳細情報
 */
export interface TabSyncEventDetail {
  /** アクティブにするカラムのID */
  columnId: string;
}

/**
 * デスクトップスクロールイベントの詳細情報
 */
export interface DesktopScrollEventDetail {
  /** スクロール対象カラムのID */
  columnId: string;
  /** スクロール対象カラムのインデックス */
  columnIndex: number;
}

/**
 * ドラッグ&ドロップの設定オプション
 */
export interface DragDropOptions {
  /** アニメーション時間（ミリ秒） */
  flipDurationMs?: number;
  /** ドロップゾーンのスタイル */
  dropTargetStyle?: Record<string, string>;
  /** ドラッグを無効にするかどうか */
  dragDisabled?: boolean;
}

/**
 * エラーハンドリング用の結果型
 */
export interface DragDropResult {
  /** 操作が成功したかどうか */
  success: boolean;
  /** エラーメッセージ（失敗時） */
  error?: string;
  /** 元の状態（ロールバック用） */
  previousState?: Column[];
}

/**
 * ドラッグ&ドロップイベントハンドラーの型定義
 */
export type DndEventHandler = (event: CustomEvent<ColumnDndEvent>) => void | Promise<void>;

/**
 * タブ同期イベントハンドラーの型定義
 */
export type TabSyncEventHandler = (event: CustomEvent<TabSyncEventDetail>) => void;

/**
 * カスタムイベント型の拡張
 */
declare global {
  interface WindowEventMap {
    'tabColumnSwitch': CustomEvent<TabSyncEventDetail>;
    'desktopScrollToColumn': CustomEvent<DesktopScrollEventDetail>;
  }
}