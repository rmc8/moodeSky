use crate::models::*;
use sqlx::{SqlitePool, Row};

/// Database operations for account management
pub struct DatabaseManager {
    pool: SqlitePool,
}

impl DatabaseManager {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Create a new account in the database
    pub async fn create_account(&self, account: &CreateAccountRequest) -> Result<i64, String> {
        let query = r#"
            INSERT INTO accounts (handle, did, service_url, auth_type, display_name, avatar_url, is_active)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1)
        "#;

        let result = sqlx::query(query)
            .bind(&account.handle)
            .bind(&account.did)
            .bind(&account.service_url)
            .bind(account.auth_type.to_string())
            .bind(&account.display_name)
            .bind(&account.avatar_url)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to create account: {}", e))?;

        Ok(result.last_insert_rowid())
    }

    /// Get account by handle
    pub async fn get_account_by_handle(&self, handle: &str) -> Result<Option<Account>, String> {
        let query = r#"
            SELECT id, handle, did, service_url, auth_type, display_name, avatar_url, is_active, created_at, updated_at
            FROM accounts
            WHERE handle = ?1
        "#;

        let row = sqlx::query(query)
            .bind(handle)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| format!("Failed to get account: {}", e))?;

        if let Some(row) = row {
            let auth_type: String = row.try_get("auth_type")
                .map_err(|e| format!("Failed to parse auth_type: {}", e))?;
            
            Ok(Some(Account {
                id: Some(row.try_get("id").map_err(|e| format!("Failed to parse id: {}", e))?),
                handle: row.try_get("handle").map_err(|e| format!("Failed to parse handle: {}", e))?,
                did: row.try_get("did").map_err(|e| format!("Failed to parse did: {}", e))?,
                service_url: row.try_get("service_url").map_err(|e| format!("Failed to parse service_url: {}", e))?,
                auth_type: auth_type.parse().map_err(|e| format!("Failed to parse auth_type: {}", e))?,
                display_name: row.try_get("display_name").ok(),
                avatar_url: row.try_get("avatar_url").ok(),
                is_active: row.try_get("is_active").map_err(|e| format!("Failed to parse is_active: {}", e))?,
                created_at: row.try_get("created_at").ok(),
                updated_at: row.try_get("updated_at").ok(),
            }))
        } else {
            Ok(None)
        }
    }

    /// Get all active accounts for concurrent operation
    pub async fn get_all_active_accounts(&self) -> Result<Vec<Account>, String> {
        let query = r#"
            SELECT id, handle, did, service_url, auth_type, display_name, avatar_url, is_active, created_at, updated_at
            FROM accounts
            WHERE is_active = 1
            ORDER BY created_at ASC
        "#;

        let rows = sqlx::query(query)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Failed to get active accounts: {}", e))?;

        let mut accounts = Vec::new();
        for row in rows {
            let auth_type: String = row.try_get("auth_type")
                .map_err(|e| format!("Failed to parse auth_type: {}", e))?;
            
            accounts.push(Account {
                id: Some(row.try_get("id").map_err(|e| format!("Failed to parse id: {}", e))?),
                handle: row.try_get("handle").map_err(|e| format!("Failed to parse handle: {}", e))?,
                did: row.try_get("did").map_err(|e| format!("Failed to parse did: {}", e))?,
                service_url: row.try_get("service_url").map_err(|e| format!("Failed to parse service_url: {}", e))?,
                auth_type: auth_type.parse().map_err(|e| format!("Failed to parse auth_type: {}", e))?,
                display_name: row.try_get("display_name").ok(),
                avatar_url: row.try_get("avatar_url").ok(),
                is_active: row.try_get("is_active").map_err(|e| format!("Failed to parse is_active: {}", e))?,
                created_at: row.try_get("created_at").ok(),
                updated_at: row.try_get("updated_at").ok(),
            });
        }

        Ok(accounts)
    }

    /// Create or update OAuth session
    pub async fn upsert_oauth_session(&self, session: &OAuthSession) -> Result<i64, String> {
        let query = r#"
            INSERT INTO oauth_sessions (account_id, access_token_hash, refresh_token_hash, expires_at, scope)
            VALUES (?1, ?2, ?3, ?4, ?5)
            ON CONFLICT(account_id) DO UPDATE SET
                access_token_hash = excluded.access_token_hash,
                refresh_token_hash = excluded.refresh_token_hash,
                expires_at = excluded.expires_at,
                scope = excluded.scope,
                updated_at = CURRENT_TIMESTAMP
        "#;

        let result = sqlx::query(query)
            .bind(session.account_id)
            .bind(&session.access_token_hash)
            .bind(&session.refresh_token_hash)
            .bind(session.expires_at)
            .bind(&session.scope)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to upsert OAuth session: {}", e))?;

        Ok(result.last_insert_rowid())
    }

    /// Get OAuth session by account ID
    pub async fn get_oauth_session(&self, account_id: i64) -> Result<Option<OAuthSession>, String> {
        let query = r#"
            SELECT id, account_id, access_token_hash, refresh_token_hash, expires_at, scope, created_at, updated_at
            FROM oauth_sessions
            WHERE account_id = ?1
        "#;

        let row = sqlx::query(query)
            .bind(account_id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| format!("Failed to get OAuth session: {}", e))?;

        if let Some(row) = row {
            Ok(Some(OAuthSession {
                id: Some(row.try_get("id").map_err(|e| format!("Failed to parse id: {}", e))?),
                account_id: row.try_get("account_id").map_err(|e| format!("Failed to parse account_id: {}", e))?,
                access_token_hash: row.try_get("access_token_hash").map_err(|e| format!("Failed to parse access_token_hash: {}", e))?,
                refresh_token_hash: row.try_get("refresh_token_hash").ok(),
                expires_at: row.try_get("expires_at").ok(),
                scope: row.try_get("scope").ok(),
                created_at: row.try_get("created_at").ok(),
                updated_at: row.try_get("updated_at").ok(),
            }))
        } else {
            Ok(None)
        }
    }

    /// Create or update user preferences
    pub async fn upsert_user_preferences(&self, prefs: &UserPreferences) -> Result<(), String> {
        let preferences_json = prefs.preferences_json.as_deref().unwrap_or("{}");

        let query = r#"
            INSERT INTO user_preferences (account_id, theme, language, notifications_enabled, auto_refresh_interval, preferences_json)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ON CONFLICT(account_id) DO UPDATE SET
                theme = excluded.theme,
                language = excluded.language,
                notifications_enabled = excluded.notifications_enabled,
                auto_refresh_interval = excluded.auto_refresh_interval,
                preferences_json = excluded.preferences_json,
                updated_at = CURRENT_TIMESTAMP
        "#;

        sqlx::query(query)
            .bind(prefs.account_id)
            .bind(prefs.theme.to_string())
            .bind(prefs.language.to_string())
            .bind(prefs.notifications_enabled)
            .bind(prefs.auto_refresh_interval)
            .bind(preferences_json)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to upsert user preferences: {}", e))?;

        Ok(())
    }

    /// Get user preferences by account ID
    pub async fn get_user_preferences(&self, account_id: i64) -> Result<Option<UserPreferences>, String> {
        let query = r#"
            SELECT account_id, theme, language, notifications_enabled, auto_refresh_interval, preferences_json, created_at, updated_at
            FROM user_preferences
            WHERE account_id = ?1
        "#;

        let row = sqlx::query(query)
            .bind(account_id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| format!("Failed to get user preferences: {}", e))?;

        if let Some(row) = row {
            let theme_str: String = row.try_get("theme").map_err(|e| format!("Failed to parse theme: {}", e))?;
            let language_str: String = row.try_get("language").map_err(|e| format!("Failed to parse language: {}", e))?;

            Ok(Some(UserPreferences {
                account_id: row.try_get("account_id").map_err(|e| format!("Failed to parse account_id: {}", e))?,
                theme: theme_str.parse().map_err(|e| format!("Failed to parse theme: {}", e))?,
                language: language_str.parse().map_err(|e| format!("Failed to parse language: {}", e))?,
                notifications_enabled: row.try_get("notifications_enabled").map_err(|e| format!("Failed to parse notifications_enabled: {}", e))?,
                auto_refresh_interval: row.try_get("auto_refresh_interval").map_err(|e| format!("Failed to parse auto_refresh_interval: {}", e))?,
                preferences_json: row.try_get("preferences_json").ok(),
                created_at: row.try_get("created_at").ok(),
                updated_at: row.try_get("updated_at").ok(),
            }))
        } else {
            Ok(None)
        }
    }

    /// Get concurrent session state for deck interface
    pub async fn get_concurrent_session_state(&self) -> Result<ConcurrentSessionState, String> {
        let active_accounts = self.get_all_active_accounts().await?;
        let total_accounts = active_accounts.len();
        let all_accounts_active = total_accounts > 0;

        Ok(ConcurrentSessionState {
            active_accounts,
            total_accounts,
            all_accounts_active,
        })
    }

    /// Deactivate account (soft delete)
    pub async fn deactivate_account(&self, account_id: i64) -> Result<(), String> {
        let query = r#"
            UPDATE accounts
            SET is_active = 0, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?1
        "#;

        sqlx::query(query)
            .bind(account_id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Failed to deactivate account: {}", e))?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    async fn create_test_db() -> (DatabaseManager, TempDir) {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        
        // メモリ内SQLiteデータベースを使用
        let database_url = "sqlite::memory:";
        let pool = SqlitePool::connect(database_url).await.expect("Failed to connect to test database");
        
        // テスト用のテーブル作成（migrations代替）
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                handle TEXT NOT NULL UNIQUE,
                did TEXT NOT NULL UNIQUE,
                service_url TEXT NOT NULL,
                auth_type TEXT NOT NULL,
                display_name TEXT,
                avatar_url TEXT,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        "#).execute(&pool).await.expect("Failed to create accounts table");
        
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS oauth_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                access_token_hash TEXT NOT NULL,
                refresh_token_hash TEXT,
                expires_at DATETIME,
                scope TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (account_id) REFERENCES accounts (id),
                UNIQUE(account_id)
            )
        "#).execute(&pool).await.expect("Failed to create oauth_sessions table");
        
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS user_preferences (
                account_id INTEGER PRIMARY KEY,
                theme TEXT NOT NULL DEFAULT 'system',
                language TEXT NOT NULL DEFAULT 'ja',
                notifications_enabled BOOLEAN NOT NULL DEFAULT 1,
                auto_refresh_interval INTEGER NOT NULL DEFAULT 30,
                preferences_json TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (account_id) REFERENCES accounts (id)
            )
        "#).execute(&pool).await.expect("Failed to create user_preferences table");
        
        (DatabaseManager::new(pool), temp_dir)
    }

    #[tokio::test]
    async fn test_create_and_get_account() {
        let (db, _temp_dir) = create_test_db().await;
        
        let account_req = CreateAccountRequest {
            handle: "test.bsky.social".to_string(),
            did: "did:plc:test123456789".to_string(),
            service_url: "https://bsky.social".to_string(),
            auth_type: crate::models::AuthType::AppPassword,
            display_name: Some("Test User".to_string()),
            avatar_url: Some("https://example.com/avatar.jpg".to_string()),
        };
        
        // アカウント作成
        let account_id = db.create_account(&account_req).await.expect("Failed to create account");
        assert!(account_id > 0);
        
        // アカウント取得
        let retrieved_account = db.get_account_by_handle("test.bsky.social").await
            .expect("Failed to get account")
            .expect("Account not found");
        
        assert_eq!(retrieved_account.handle, "test.bsky.social");
        assert_eq!(retrieved_account.did, "did:plc:test123456789");
        assert_eq!(retrieved_account.service_url, "https://bsky.social");
        assert_eq!(retrieved_account.display_name, Some("Test User".to_string()));
        assert!(retrieved_account.is_active);
    }

    #[tokio::test]
    async fn test_deactivate_account() {
        let (db, _temp_dir) = create_test_db().await;
        
        let account_req = CreateAccountRequest {
            handle: "test.bsky.social".to_string(),
            did: "did:plc:test123456789".to_string(),
            service_url: "https://bsky.social".to_string(),
            auth_type: crate::models::AuthType::AppPassword,
            display_name: None,
            avatar_url: None,
        };
        
        let account_id = db.create_account(&account_req).await.expect("Failed to create account");
        
        // アカウントを無効化
        db.deactivate_account(account_id).await.expect("Failed to deactivate account");
        
        // アカウントが無効化されていることを確認
        let account = db.get_account_by_handle("test.bsky.social").await
            .expect("Failed to get account")
            .expect("Account not found");
        
        assert!(!account.is_active);
    }

    #[tokio::test]
    async fn test_oauth_session_management() {
        let (db, _temp_dir) = create_test_db().await;
        
        let account_req = CreateAccountRequest {
            handle: "test.bsky.social".to_string(),
            did: "did:plc:test123456789".to_string(),
            service_url: "https://bsky.social".to_string(),
            auth_type: crate::models::AuthType::OAuth,
            display_name: None,
            avatar_url: None,
        };
        
        let account_id = db.create_account(&account_req).await.expect("Failed to create account");
        
        let session = OAuthSession {
            id: None,
            account_id,
            access_token_hash: "test_access_token".to_string(),
            refresh_token_hash: Some("test_refresh_token".to_string()),
            expires_at: Some(chrono::Utc::now() + chrono::Duration::hours(1)),
            scope: Some("read write".to_string()),
            created_at: None,
            updated_at: None,
        };
        
        // セッション作成
        let session_id = db.upsert_oauth_session(&session).await.expect("Failed to create session");
        assert!(session_id > 0);
        
        // セッション取得
        let retrieved_session = db.get_oauth_session(account_id).await
            .expect("Failed to get session")
            .expect("Session not found");
        
        assert_eq!(retrieved_session.access_token_hash, "test_access_token");
        assert_eq!(retrieved_session.refresh_token_hash, Some("test_refresh_token".to_string()));
    }

    #[tokio::test]
    async fn test_user_preferences() {
        let (db, _temp_dir) = create_test_db().await;
        
        let account_req = CreateAccountRequest {
            handle: "test.bsky.social".to_string(),
            did: "did:plc:test123456789".to_string(),
            service_url: "https://bsky.social".to_string(),
            auth_type: crate::models::AuthType::AppPassword,
            display_name: None,
            avatar_url: None,
        };
        
        let account_id = db.create_account(&account_req).await.expect("Failed to create account");
        
        let preferences = UserPreferences {
            account_id,
            theme: crate::models::Theme::Dark,
            language: crate::models::Language::Japanese,
            notifications_enabled: true,
            auto_refresh_interval: 60,
            preferences_json: Some(r#"{"custom": "value"}"#.to_string()),
            created_at: Some(chrono::Utc::now()),
            updated_at: Some(chrono::Utc::now()),
        };
        
        // 設定保存
        db.upsert_user_preferences(&preferences).await.expect("Failed to save preferences");
        
        // 設定取得
        let retrieved_prefs = db.get_user_preferences(account_id).await
            .expect("Failed to get preferences")
            .expect("Preferences not found");
        
        assert_eq!(retrieved_prefs.theme, crate::models::Theme::Dark);
        assert_eq!(retrieved_prefs.language, crate::models::Language::Japanese);
        assert_eq!(retrieved_prefs.auto_refresh_interval, 60);
        assert!(retrieved_prefs.notifications_enabled);
    }

    #[tokio::test]
    async fn test_get_all_active_accounts() {
        let (db, _temp_dir) = create_test_db().await;
        
        // 複数のアカウントを作成
        let accounts = vec![
            CreateAccountRequest {
                handle: "user1.bsky.social".to_string(),
                did: "did:plc:user1".to_string(),
                service_url: "https://bsky.social".to_string(),
                auth_type: crate::models::AuthType::AppPassword,
                display_name: Some("User 1".to_string()),
                avatar_url: None,
            },
            CreateAccountRequest {
                handle: "user2.bsky.social".to_string(),
                did: "did:plc:user2".to_string(),
                service_url: "https://bsky.social".to_string(),
                auth_type: crate::models::AuthType::AppPassword,
                display_name: Some("User 2".to_string()),
                avatar_url: None,
            },
        ];
        
        for account in accounts {
            db.create_account(&account).await.expect("Failed to create account");
        }
        
        // アクティブなアカウント一覧を取得
        let active_accounts = db.get_all_active_accounts().await.expect("Failed to get active accounts");
        
        assert_eq!(active_accounts.len(), 2);
        assert!(active_accounts.iter().any(|a| a.handle == "user1.bsky.social"));
        assert!(active_accounts.iter().any(|a| a.handle == "user2.bsky.social"));
    }
}