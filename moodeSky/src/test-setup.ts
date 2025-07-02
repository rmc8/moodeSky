/// <reference types="@testing-library/jest-dom" />
/// <reference types="vitest/globals" />

/**
 * Vitest テストセットアップファイル
 * テスト実行前にグローバルな設定を行う
 * CI/CD環境での確実な型読み込みを保証
 */

import '@testing-library/jest-dom/vitest';

// jest-domマッチャーをVitestに追加
// これにより toBeInTheDocument, toHaveClass などが使用可能になる
// triple-slash directives により確実な型定義の読み込みを保証

// CI/CD環境での型定義確保のため、明示的に型を宣言
declare global {
  namespace Vi {
    interface JestAssertion<T = any> extends jest.Matchers<void, T> {}
  }
}