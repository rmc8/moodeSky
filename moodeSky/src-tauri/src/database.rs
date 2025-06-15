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