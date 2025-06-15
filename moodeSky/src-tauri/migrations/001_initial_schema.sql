-- Migration 001: Initial schema for moodeSky authentication and user data
-- Created for Bluesky/AT Protocol multi-account support

-- Accounts table: Store basic account information
CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    handle TEXT NOT NULL UNIQUE,           -- Bluesky handle (e.g. alice.bsky.social)
    did TEXT NOT NULL UNIQUE,              -- Distributed identifier (did:plc:...)
    service_url TEXT NOT NULL,             -- PDS URL (e.g. https://bsky.social)
    auth_type TEXT NOT NULL CHECK (auth_type IN ('oauth', 'app_password')),
    display_name TEXT,                     -- User display name
    avatar_url TEXT,                       -- Profile avatar URL
    is_active BOOLEAN NOT NULL DEFAULT 1,  -- Whether account is currently active
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- OAuth sessions table: Manage OAuth authentication sessions
CREATE TABLE IF NOT EXISTS oauth_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    access_token_hash TEXT NOT NULL,       -- SHA-256 hash of access token (security)
    refresh_token_hash TEXT,               -- SHA-256 hash of refresh token (optional)
    expires_at DATETIME,                   -- Token expiration time
    scope TEXT,                            -- OAuth scope granted
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- User preferences table: Store per-account preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    account_id INTEGER PRIMARY KEY,
    theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    language TEXT NOT NULL DEFAULT 'ja' CHECK (language IN ('ja', 'en', 'pt-BR', 'ko', 'de')),
    notifications_enabled BOOLEAN NOT NULL DEFAULT 1,
    auto_refresh_interval INTEGER NOT NULL DEFAULT 30, -- seconds
    preferences_json TEXT,                  -- JSON blob for additional settings
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_handle ON accounts(handle);
CREATE INDEX IF NOT EXISTS idx_accounts_did ON accounts(did);
CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_account_id ON oauth_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_expires_at ON oauth_sessions(expires_at);

-- Triggers to automatically update updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_accounts_timestamp 
    AFTER UPDATE ON accounts
    FOR EACH ROW
    BEGIN
        UPDATE accounts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_oauth_sessions_timestamp 
    AFTER UPDATE ON oauth_sessions
    FOR EACH ROW
    BEGIN
        UPDATE oauth_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_user_preferences_timestamp 
    AFTER UPDATE ON user_preferences
    FOR EACH ROW
    BEGIN
        UPDATE user_preferences SET updated_at = CURRENT_TIMESTAMP WHERE account_id = NEW.account_id;
    END;