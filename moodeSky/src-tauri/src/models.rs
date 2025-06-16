use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use bsky_sdk::BskyAgent;

/// Account information for Bluesky/AT Protocol accounts
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: Option<i64>,
    pub handle: String,
    pub did: String,
    pub service_url: String,
    pub auth_type: AuthType,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
    pub is_active: bool,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

/// Authentication type for accounts
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuthType {
    OAuth,
    AppPassword,
}

impl ToString for AuthType {
    fn to_string(&self) -> String {
        match self {
            AuthType::OAuth => "oauth".to_string(),
            AuthType::AppPassword => "app_password".to_string(),
        }
    }
}

impl std::str::FromStr for AuthType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "oauth" => Ok(AuthType::OAuth),
            "app_password" => Ok(AuthType::AppPassword),
            _ => Err(format!("Invalid auth type: {}", s)),
        }
    }
}

/// OAuth session information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthSession {
    pub id: Option<i64>,
    pub account_id: i64,
    pub access_token_hash: String,
    pub refresh_token_hash: Option<String>,
    pub expires_at: Option<DateTime<Utc>>,
    pub scope: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

/// User preferences for an account
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPreferences {
    pub account_id: i64,
    pub theme: Theme,
    pub language: Language,
    pub notifications_enabled: bool,
    pub auto_refresh_interval: i32, // seconds
    pub preferences_json: Option<String>, // JSON blob for additional settings
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

/// Theme preference
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Theme {
    Light,
    Dark,
    System,
}

impl ToString for Theme {
    fn to_string(&self) -> String {
        match self {
            Theme::Light => "light".to_string(),
            Theme::Dark => "dark".to_string(),
            Theme::System => "system".to_string(),
        }
    }
}

impl std::str::FromStr for Theme {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "light" => Ok(Theme::Light),
            "dark" => Ok(Theme::Dark),
            "system" => Ok(Theme::System),
            _ => Err(format!("Invalid theme: {}", s)),
        }
    }
}

impl Default for Theme {
    fn default() -> Self {
        Theme::System
    }
}

/// Language preference
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum Language {
    #[serde(rename = "ja")]
    Japanese,
    #[serde(rename = "en")]
    English,
    #[serde(rename = "pt-BR")]
    PortugueseBrazil,
    #[serde(rename = "ko")]
    Korean,
    #[serde(rename = "de")]
    German,
}

impl ToString for Language {
    fn to_string(&self) -> String {
        match self {
            Language::Japanese => "ja".to_string(),
            Language::English => "en".to_string(),
            Language::PortugueseBrazil => "pt-BR".to_string(),
            Language::Korean => "ko".to_string(),
            Language::German => "de".to_string(),
        }
    }
}

impl std::str::FromStr for Language {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "ja" => Ok(Language::Japanese),
            "en" => Ok(Language::English),
            "pt-BR" => Ok(Language::PortugueseBrazil),
            "ko" => Ok(Language::Korean),
            "de" => Ok(Language::German),
            _ => Err(format!("Invalid language: {}", s)),
        }
    }
}

impl Default for Language {
    fn default() -> Self {
        Language::Japanese
    }
}

/// Login request data for authentication
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub handle_or_email: String,
    pub password: String, // App Password or OAuth flow
    pub service_url: Option<String>, // Optional custom PDS URL
}

/// Login response with account and session information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResponse {
    pub account: Account,
    pub session_token: String, // For OAuth or session management
    pub success: bool,
    pub message: Option<String>,
}

/// Account creation request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAccountRequest {
    pub handle: String,
    pub did: String,
    pub service_url: String,
    pub auth_type: AuthType,
    pub display_name: Option<String>,
    pub avatar_url: Option<String>,
}

/// Multi-account concurrent session state for deck-style interface
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConcurrentSessionState {
    pub active_accounts: Vec<Account>,
    pub total_accounts: usize,
    pub all_accounts_active: bool, // All accounts run simultaneously in deck view
}

/// Individual account session status for concurrent operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountSessionStatus {
    pub account_id: i64,
    pub handle: String,
    pub is_connected: bool,
    pub last_activity: Option<DateTime<Utc>>,
    pub session_health: SessionHealth,
}

/// Session health status for monitoring concurrent sessions
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SessionHealth {
    Healthy,     // Session active and responsive
    Warning,     // Session has issues but functional
    Error,       // Session has critical errors
    Disconnected, // Session is not connected
}

/// Wrapper for BskyAgent to enable concurrent session management
pub struct ManagedAgent {
    pub account_id: i64,
    pub handle: String,
    pub agent: BskyAgent,
    pub last_activity: Option<DateTime<Utc>>,
    pub health: SessionHealth,
}

impl ManagedAgent {
    pub fn new(account_id: i64, handle: String, agent: BskyAgent) -> Self {
        Self {
            account_id,
            handle,
            agent,
            last_activity: Some(Utc::now()),
            health: SessionHealth::Healthy,
        }
    }

    pub fn update_activity(&mut self) {
        self.last_activity = Some(Utc::now());
        self.health = SessionHealth::Healthy;
    }

    pub fn set_health(&mut self, health: SessionHealth) {
        self.health = health;
    }
}

/// Multi-agent session manager for concurrent operations
pub struct SessionManager {
    pub agents: std::collections::HashMap<String, ManagedAgent>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            agents: std::collections::HashMap::new(),
        }
    }

    pub fn add_agent(&mut self, handle: String, account_id: i64, agent: BskyAgent) {
        let managed_agent = ManagedAgent::new(account_id, handle.clone(), agent);
        self.agents.insert(handle, managed_agent);
    }

    pub fn get_agent(&self, handle: &str) -> Option<&ManagedAgent> {
        self.agents.get(handle)
    }

    pub fn get_agent_mut(&mut self, handle: &str) -> Option<&mut ManagedAgent> {
        self.agents.get_mut(handle)
    }

    pub fn remove_agent(&mut self, handle: &str) -> Option<ManagedAgent> {
        self.agents.remove(handle)
    }

    pub fn get_active_handles(&self) -> Vec<String> {
        self.agents
            .iter()
            .filter(|(_, agent)| matches!(agent.health, SessionHealth::Healthy | SessionHealth::Warning))
            .map(|(handle, _)| handle.clone())
            .collect()
    }

    pub fn get_session_statuses(&self) -> Vec<AccountSessionStatus> {
        self.agents
            .values()
            .map(|agent| AccountSessionStatus {
                account_id: agent.account_id,
                handle: agent.handle.clone(),
                is_connected: matches!(agent.health, SessionHealth::Healthy | SessionHealth::Warning),
                last_activity: agent.last_activity,
                session_health: agent.health.clone(),
            })
            .collect()
    }
}