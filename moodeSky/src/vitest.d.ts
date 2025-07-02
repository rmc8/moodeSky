/**
 * Vitest型定義ファイル
 * jest-domマッチャーをVitestのMatchersインターフェースに追加
 * Vitest 3.2.0以降の新しい型拡張方法を使用
 */

import 'vitest'

// Vitest の Matchers インターフェースを jest-dom マッチャーで拡張
declare module 'vitest' {
  interface Matchers<T = any> {
    // DOM要素の存在確認
    toBeInTheDocument(): T
    
    // CSSクラスの確認
    toHaveClass(...classNames: string[]): T
    
    // 属性の確認
    toHaveAttribute(attr: string, value?: string): T
    
    // 有効/無効状態の確認
    toBeDisabled(): T
    toBeEnabled(): T
    
    // DOM要素の内容確認
    toBeEmptyDOMElement(): T
    
    // 可視性の確認
    toBeVisible(): T
    
    // 要素の包含関係確認
    toContainElement(element: HTMLElement | SVGElement | null): T
    
    // HTMLコンテンツの確認
    toContainHTML(htmlText: string): T
    
    // アクセシビリティ関連
    toHaveAccessibleDescription(expectedDescription?: string | RegExp): T
    toHaveAccessibleName(expectedName?: string | RegExp): T
    
    // フォーム要素の値確認
    toHaveDisplayValue(value: string | RegExp | Array<string | RegExp>): T
    toHaveValue(value?: string | string[] | number): T
    toHaveFormValues(expectedValues: Record<string, any>): T
    
    // フォーカス状態の確認
    toHaveFocus(): T
    
    // スタイルの確認
    toHaveStyle(css: string | Record<string, any>): T
    
    // テキストコンテンツの確認
    toHaveTextContent(text: string | RegExp, options?: { normalizeWhitespace: boolean }): T
    
    // チェックボックス/ラジオボタンの状態確認
    toBeChecked(): T
    toBePartiallyChecked(): T
    
    // エラーメッセージの確認
    toHaveErrorMessage(text?: string | RegExp): T
    
    // その他のDOM関連マッチャー
    toBeInvalid(): T
    toBeRequired(): T
    toBeValid(): T
    toHaveDescription(text?: string | RegExp): T
    toHaveRole(role: string): T
    toHaveSelection(text?: string): T
  }
}