/// <reference types="@sveltejs/kit" />

/**
 * SvelteKitアプリケーションの型定義
 * $app/navigation, $app/stores などのモジュール宣言
 */

declare module '$app/navigation' {
  export function goto(
    url: string | URL,
    opts?: {
      replaceState?: boolean;
      noScroll?: boolean;
      keepFocus?: boolean;
      invalidateAll?: boolean;
      state?: any;
    }
  ): Promise<void>;
  
  export function invalidate(url: string | URL | ((url: URL) => boolean)): Promise<void>;
  export function invalidateAll(): Promise<void>;
  export function prefetch(url: string | URL): Promise<void>;
  export function prefetchRoutes(urls?: string[]): Promise<void>;
  export function afterNavigate(callback: (navigation: Navigation) => void): () => void;
  export function beforeNavigate(callback: (navigation: BeforeNavigate) => void): () => void;
  
  interface Navigation {
    from: NavigationTarget | null;
    to: NavigationTarget | null;
    type: NavigationType;
    willUnload: boolean;
    delta?: number;
  }
  
  interface BeforeNavigate extends Navigation {
    cancel(): void;
  }
  
  interface NavigationTarget {
    params: Record<string, string>;
    route: { id: string | null };
    url: URL;
  }
  
  type NavigationType = 'load' | 'unload' | 'link' | 'goto' | 'popstate';
}

declare module '$app/stores' {
  import { Readable, Writable } from 'svelte/store';
  
  export const page: Readable<{
    url: URL;
    params: Record<string, string>;
    route: {
      id: string | null;
    };
    status: number;
    error: any | null;
    data: Record<string, any>;
    form: any;
  }>;
  
  export const navigating: Readable<{
    from: {
      params: Record<string, string>;
      route: { id: string | null };
      url: URL;
    };
    to: {
      params: Record<string, string>;
      route: { id: string | null };
      url: URL;
    };
    type: NavigationType;
  } | null>;
  
  export const updated: Readable<boolean> & { check(): Promise<boolean> };
  
  type NavigationType = 'load' | 'unload' | 'link' | 'goto' | 'popstate';
}

declare module '$app/environment' {
  export const browser: boolean;
  export const dev: boolean;
  export const building: boolean;
  export const version: string;
}

declare module '$app/paths' {
  export const base: string;
  export const assets: string;
}

// Namespace declarations
declare namespace App {
  interface Locals {}
  interface PageData {}
  interface Error {}
  interface Platform {}
}