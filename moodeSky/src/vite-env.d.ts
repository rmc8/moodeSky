/// <reference types="vite/client" />

/**
 * Vite環境変数の型定義
 * ImportMeta.envのプロパティを定義してTypeScriptエラーを解消
 */

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_LOG_LEVEL?: string;
  readonly VITE_USER_NODE_ENV?: string;
  // その他のカスタム環境変数はここに追加
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}