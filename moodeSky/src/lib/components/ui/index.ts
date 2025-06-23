/**
 * UI基本部品エクスポート管理
 * TailwindCSS v4統合テーマシステム + Svelte 5 runes対応
 * 
 * 統一されたインポートインターフェースを提供
 */

// ===================================================================
// コンポーネントエクスポート
// ===================================================================

/**
 * 統一ボタンコンポーネント
 * 4バリアント × 3サイズ × 状態管理 + ハイコントラスト対応
 */
export { default as Button } from './Button.svelte';

/**
 * 統一入力フィールドコンポーネント
 * 5タイプ × 4状態 × 機能統合 + アクセシビリティ完全対応
 */
export { default as Input } from './Input.svelte';

/**
 * 汎用カードコンポーネント
 * 4バリアント × 4状態 × レスポンシブ対応
 */
export { default as Card } from './Card.svelte';

/**
 * 統一モーダルコンポーネント
 * 5サイズ × slot-based設計 × 完全アクセシビリティ対応
 */
export { default as Modal } from './Modal.svelte';

// ===================================================================
// 型定義エクスポート
// ===================================================================

/**
 * Button関連型定義
 */
export type {
  ButtonVariant,
  ButtonSize,
  ButtonProps
} from './types.js';

/**
 * Modal関連型定義
 */
export type {
  ModalSize,
  ModalProps
} from './types.js';

/**
 * Input関連型定義
 */
export type {
  InputType,
  InputState,
  InputProps
} from './types.js';

/**
 * Card関連型定義
 */
export type {
  CardVariant,
  CardState,
  CardPadding,
  CardProps
} from './types.js';

/**
 * 共通型定義
 */
export type {
  ThemeColor,
  IconSize,
  CommonEventHandlers,
  ResponsiveValue
} from './types.js';

// ===================================================================
// 使用例・インポートパターン
// ===================================================================

/**
 * @example
 * // 基本的なインポート
 * import { Button, Modal, Input, Card } from '$lib/components/ui';
 * 
 * // 型定義付きインポート
 * import { Button, type ButtonProps } from '$lib/components/ui';
 * 
 * // 全コンポーネントインポート
 * import * as UI from '$lib/components/ui';
 * 
 * // 個別インポート
 * import Button from '$lib/components/ui/Button.svelte';
 * import type { ButtonVariant } from '$lib/components/ui/types.js';
 */

// ===================================================================
// バージョン情報
// ===================================================================

/**
 * UI基本部品ライブラリバージョン
 * Phase 1実装完了版
 */
export const UI_LIBRARY_VERSION = '1.0.0-phase1';

/**
 * 対応技術スタック
 */
export const TECH_STACK = {
  svelte: '5.x',
  tailwindcss: '4.x',
  typescript: '5.x',
  accessibility: 'WCAG AA',
  themes: ['Sky', 'Sunset', 'High Contrast']
} as const;

/**
 * コンポーネント一覧
 */
export const COMPONENT_LIST = [
  'Button',
  'Input', 
  'Card',
  'Modal'
] as const;

/**
 * 実装完了ステータス
 */
export const IMPLEMENTATION_STATUS = {
  'Button': '✅ 完了',
  'Input': '✅ 完了',
  'Card': '✅ 完了', 
  'Modal': '✅ 完了',
  'types': '✅ 完了',
  'index': '✅ 完了'
} as const;