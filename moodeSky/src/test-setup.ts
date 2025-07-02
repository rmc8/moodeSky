/**
 * Vitest テストセットアップファイル
 * テスト実行前にグローバルな設定を行う
 */

import '@testing-library/jest-dom/vitest';

// jest-domマッチャーをVitestに追加
// これにより toBeInTheDocument, toHaveClass などが使用可能になる
// 注: @testing-library/jest-dom/vitest が自動的に型定義を提供するため、
// 手動でのグローバル型定義は不要です