import type { AtpSessionData, AtpSessionEvent } from '@atproto/api';

/**
 * 単一アカウント情報
 * tokimekiblueskyのAccount interfaceを参考にTauri Store Plugin用に最適化
 * @atproto/api のAtpSessionDataを活用してセッション管理
 */
export interface Account {
  /** 一意識別子 (UUID) */
  id: string;
  
  /** AT Protocolサービス URL */
  service: string;
  
  /** @atproto/api セッション情報 (accessJwt, refreshJwt, handle, did等を含む) */
  session: AtpSessionData;
  
  /** プロフィール情報 */
  profile: {
    /** DID (Decentralized Identifier) */
    did: string;
    /** ハンドル名 (@username.domain) */
    handle: string;
    /** 表示名 */
    displayName?: string;
    /** アバター画像URL */
    avatar?: string;
    /** フォロワー数 */
    followersCount?: number;
    /** フォロー数 */
    followingCount?: number;
    /** ポスト数 */
    postsCount?: number;
  };
  
  /** アカウント作成日時 (ISO 8601) */
  createdAt: string;
  
  /** 最終アクセス日時 (ISO 8601) */
  lastAccessAt: string;
}

/**
 * プロフィール統計情報
 */
export interface ProfileStats {
  /** フォロワー数 */
  followersCount: number;
  /** フォロー中数 */
  followingCount: number;
  /** 投稿数 */
  postsCount: number;
  /** 最終更新日時 (ISO 8601) */
  lastUpdated: string;
}

/**
 * 認証ストレージのメインデータ構造
 * 最大100アカウントの同時管理（全アカウント同時アクティブ）
 */
export interface AuthStore {
  /** 登録済みアカウント一覧（最大100アカウント） */
  accounts: Account[];
  
  /** 最後にログインした日時 (ISO 8601) */
  lastLoginAt: string;
}

/**
 * Tauri Store Plugin のキー定義
 */
export const STORE_KEYS = {
  /** メイン認証データ */
  AUTH_STORE: 'auth_store',
  /** アクティブアカウントID */
  ACTIVE_ACCOUNT: 'active_account',
  /** 個別アカウントデータのプレフィックス */
  ACCOUNT_PREFIX: 'account_',
} as const;

/**
 * 認証エラー種別
 */
export type AuthError = 
  | 'STORE_LOAD_FAILED'
  | 'STORE_SAVE_FAILED'
  | 'ACCOUNT_NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'INVALID_SESSION_DATA'
  | 'MIGRATION_FAILED'
  | 'AUTH_FAILED'
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'RE_AUTHENTICATION_REQUIRED';

/**
 * 認証操作結果
 */
export interface AuthResult<T = void> {
  success: boolean;
  data?: T;
  error?: {
    type: AuthError;
    message: string;
  };
}

/**
 * セッション更新イベントハンドラー
 * @atproto/api のAtpSessionEventを活用
 */
export type SessionEventHandler = (evt: AtpSessionEvent, sess?: AtpSessionData) => void | Promise<void>;

/**
 * localStorage からの移行用データ
 */
export interface LegacyAuthData {
  authDid?: string;
  authHandle?: string;
  authAccessJwt?: string;
  authDisplayName?: string;
  authAvatar?: string;
  [key: string]: string | undefined;
}