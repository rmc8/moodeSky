/// <reference types="@testing-library/jest-dom" />

/**
 * Vitest型定義ファイル（プロジェクトルート）
 * jest-domマッチャーのTypeScript型定義を包括的に提供
 * CI/CD環境での確実な型読み込みを保証
 */

import 'vitest'
import '@testing-library/jest-dom'

// jest-domマッチャーの完全な型定義
interface JestDomMatchers<R = unknown> {
  // DOM要素の存在確認
  toBeInTheDocument(): R
  
  // CSSクラスの確認
  toHaveClass(...classNames: string[]): R
  
  // 属性の確認
  toHaveAttribute(attr: string, value?: string): R
  
  // 有効/無効状態の確認
  toBeDisabled(): R
  toBeEnabled(): R
  
  // DOM要素の内容確認
  toBeEmptyDOMElement(): R
  
  // 可視性の確認
  toBeVisible(): R
  
  // 要素の包含関係確認
  toContainElement(element: HTMLElement | SVGElement | null): R
  
  // HTMLコンテンツの確認
  toContainHTML(htmlText: string): R
  
  // アクセシビリティ関連
  toHaveAccessibleDescription(expectedDescription?: string | RegExp): R
  toHaveAccessibleName(expectedName?: string | RegExp): R
  toHaveAccessibleErrorMessage(message?: string | RegExp): R
  
  // フォーム要素の値確認
  toHaveDisplayValue(value: string | RegExp | Array<string | RegExp>): R
  toHaveValue(value?: string | string[] | number): R
  toHaveFormValues(expectedValues: Record<string, any>): R
  
  // フォーカス状態の確認
  toHaveFocus(): R
  
  // スタイルの確認
  toHaveStyle(css: string | Record<string, any>): R
  
  // テキストコンテンツの確認
  toHaveTextContent(text: string | RegExp, options?: { normalizeWhitespace: boolean }): R
  
  // チェックボックス/ラジオボタンの状態確認
  toBeChecked(): R
  toBePartiallyChecked(): R
  
  // エラーメッセージの確認
  toHaveErrorMessage(text?: string | RegExp): R
  
  // その他のDOM関連マッチャー
  toBeInvalid(): R
  toBeRequired(): R
  toBeValid(): R
  toHaveDescription(text?: string | RegExp): R
  toHaveRole(role: string): R
  toHaveSelection(text?: string): R
}

// Vitestの型システムを包括的に拡張
declare module 'vitest' {
  // expect()の戻り値型を拡張（最重要）
  interface Assertion<T = any> extends JestDomMatchers<Assertion<T>> {}
  
  // 非対称マッチャーの型を拡張
  interface AsymmetricMatchersContaining extends JestDomMatchers {}
  
  // Vitest 3.2+の新しいMatchersインターフェースも拡張
  interface Matchers<T = any> extends JestDomMatchers<T> {}
}