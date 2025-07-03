/// <reference types="@testing-library/jest-dom" />

/**
 * Ambient type definitions for jest-dom matchers
 * This file ensures jest-dom types are available globally for svelte-check
 */

import '@testing-library/jest-dom/vitest';

declare global {
  namespace Vi {
    interface Assertion<T = any> {
      // DOM element existence
      toBeInTheDocument(): void;
      
      // CSS class checks
      toHaveClass(...classNames: string[]): void;
      
      // Attribute checks
      toHaveAttribute(attr: string, value?: string): void;
      
      // State checks
      toBeDisabled(): void;
      toBeEnabled(): void;
      toBeEmptyDOMElement(): void;
      toBeVisible(): void;
      toBeChecked(): void;
      toBePartiallyChecked(): void;
      
      // Content checks
      toContainElement(element: HTMLElement | SVGElement | null): void;
      toContainHTML(htmlText: string): void;
      toHaveTextContent(text: string | RegExp, options?: { normalizeWhitespace: boolean }): void;
      
      // Accessibility checks
      toHaveAccessibleDescription(expectedDescription?: string | RegExp): void;
      toHaveAccessibleName(expectedName?: string | RegExp): void;
      toHaveAccessibleErrorMessage(message?: string | RegExp): void;
      
      // Form value checks
      toHaveDisplayValue(value: string | RegExp | Array<string | RegExp>): void;
      toHaveValue(value?: string | string[] | number): void;
      toHaveFormValues(expectedValues: Record<string, any>): void;
      
      // Focus checks
      toHaveFocus(): void;
      
      // Style checks
      toHaveStyle(css: string | Record<string, any>): void;
      
      // Validation checks
      toBeInvalid(): void;
      toBeRequired(): void;
      toBeValid(): void;
      
      // ARIA checks
      toHaveDescription(text?: string | RegExp): void;
      toHaveRole(role: string): void;
      toHaveSelection(text?: string): void;
      toHaveErrorMessage(text?: string | RegExp): void;
    }
  }
}

export {};