import { writable, type Writable } from 'svelte/store';
import { get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import { goto } from '$app/navigation';
import { databaseStore, type DbAccount, type DbOAuthSession } from './database';

// Tauri コマンドの型定義
interface LoginRequest {
  handle_or_email: string;
  password: string;
  service_url?: string;
}

interface Account {
  id?: number;
  handle: string;
  did: string;
  service_url: string;
  auth_type: string;
  display_name?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  account_id?: number;
}

interface LoginResponse {
  account: Account;
  session_token: string;
  success: boolean;
  message?: string;
}

interface AccountSessionStatus {
  account_id: number;
  handle: string;
  is_connected: boolean;
  last_activity?: string;
  session_health: string;
}

interface AuthResult {
  success: boolean;
  account?: Account;
  error?: string;
}

interface AuthCheckResult {
  authenticated: boolean;
  handle?: string;
  error?: unknown;
}

// 認証状態の管理
export const isAuthenticated: Writable<boolean> = writable(false);
export const currentUser: Writable<Account | null> = writable(null);
export const authLoading: Writable<boolean> = writable(false);
export const authError: Writable<string | null> = writable(null);

/**
 * ログイン機能
 */
export async function login(
  handleOrEmail: string, 
  password: string, 
  serviceUrl: string | null = null
): Promise<AuthResult> {
  authLoading.set(true);
  authError.set(null);

  try {
    const loginRequest: LoginRequest = {
      handle_or_email: handleOrEmail,
      password: password,
      service_url: serviceUrl || 'https://bsky.social'
    };

    const response = await invoke<LoginResponse>('login_app_password', {
      request: loginRequest
    });

    if (response.success) {
      // データベースにアカウント情報を保存
      const dbResult = await databaseStore.upsertAccount({
        handle: response.account.handle,
        did: response.account.did,
        service_url: serviceUrl || 'https://bsky.social',
        auth_type: 'app_password',
        display_name: response.account.display_name,
        avatar_url: response.account.avatar_url,
        is_active: true
      });

      if (dbResult.success && dbResult.data) {
        // セッション情報をデータベースに保存
        const sessionResult = await databaseStore.saveOAuthSession({
          account_id: dbResult.data.id!,
          access_token_hash: response.session_token,
          refresh_token_hash: undefined, // App Passwordの場合はなし
          expires_at: undefined, // App Passwordは期限なし
          scope: undefined
        });

        if (!sessionResult.success) {
          console.warn('セッション保存に失敗:', sessionResult.error);
        }
      }
      
      // ログイン成功
      isAuthenticated.set(true);
      currentUser.set(response.account);
      
      // メイン画面にリダイレクト
      goto('/');
      
      return { success: true, account: response.account };
    } else {
      const errorMsg = response.message || 'ログインに失敗しました';
      authError.set(errorMsg);
      return { success: false, error: errorMsg };
    }
  } catch (error) {
    console.error('Login error:', error);
    const errorMsg = `認証エラー: ${error}`;
    authError.set(errorMsg);
    return { success: false, error: errorMsg };
  } finally {
    authLoading.set(false);
  }
}

/**
 * ログアウト機能
 */
export async function logout(): Promise<AuthResult> {
  authLoading.set(true);
  authError.set(null);

  try {
    // 現在のユーザー情報を取得
    const user = get(currentUser);
    if (user && user.handle) {
      // データベースからアカウント情報を取得
      const accountResult = await databaseStore.getAccountByHandle(user.handle);
      if (accountResult.success && accountResult.data) {
        // セッション情報をデータベースから削除
        await databaseStore.deleteOAuthSession(accountResult.data.id!);
        
        // アカウントを非アクティブ化
        await databaseStore.deactivateAccount(user.handle);
      }
      
      // Tauriのログアウトコマンドを呼び出し
      await invoke<void>('logout_account', { handle: user.handle });
    }

    // 状態をクリア
    isAuthenticated.set(false);
    currentUser.set(null);
    
    // ログイン画面にリダイレクト
    goto('/login');
    
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    const errorMsg = `ログアウトエラー: ${error}`;
    authError.set(errorMsg);
    return { success: false, error: errorMsg };
  } finally {
    authLoading.set(false);
  }
}

/**
 * セッション確認機能
 * アプリ起動時やページ読み込み時に呼び出す
 */
export async function checkAuthStatus(): Promise<AuthCheckResult> {
  authLoading.set(true);
  authError.set(null);

  try {
    // データベースからアクティブなアカウントを取得
    const activeAccountsResult = await databaseStore.getActiveAccounts();
    
    if (activeAccountsResult.success && activeAccountsResult.data && activeAccountsResult.data.length > 0) {
      // 最初のアクティブアカウントを使用（マルチアカウント対応は後で実装）
      const account = activeAccountsResult.data[0];
      
      // セッション情報を確認
      const sessionResult = await databaseStore.getOAuthSession(account.id!);
      
      if (sessionResult.success && sessionResult.data) {
        // Tauriでトークンの有効性を確認
        const isValid = await invoke<boolean>('verify_account_token', {
          handle: account.handle,
          serviceUrl: account.service_url
        });

        if (isValid) {
          // 認証済み状態に設定
          isAuthenticated.set(true);
          currentUser.set({
            handle: account.handle,
            account_id: account.id,
            did: account.did,
            service_url: account.service_url,
            auth_type: account.auth_type,
            is_active: account.is_active,
            display_name: account.display_name,
            avatar_url: account.avatar_url
          });
          return { authenticated: true, handle: account.handle };
        } else {
          // トークンが無効な場合はセッションを削除
          await databaseStore.deleteOAuthSession(account.id!);
          await databaseStore.deactivateAccount(account.handle);
        }
      }
    }

    // 認証されていない状態
    isAuthenticated.set(false);
    currentUser.set(null);
    return { authenticated: false };
    
  } catch (error) {
    console.error('Auth check error:', error);
    // エラー時は未認証として扱う
    isAuthenticated.set(false);
    currentUser.set(null);
    authError.set(`セッション確認エラー: ${error}`);
    return { authenticated: false, error: error };
  } finally {
    authLoading.set(false);
  }
}

/**
 * 認証が必要なページへのアクセス制御
 * 未認証の場合はログイン画面にリダイレクト
 */
export function requireAuth(): Promise<boolean> {
  return new Promise((resolve) => {
    const unsubscribe = isAuthenticated.subscribe((authenticated) => {
      if (!authenticated) {
        goto('/login');
        resolve(false);
      } else {
        resolve(true);
      }
    });
    
    // 初回チェック後はunsubscribe
    unsubscribe();
  });
}

/**
 * エラーメッセージをクリア
 */
export function clearAuthError(): void {
  authError.set(null);
}