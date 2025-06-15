use tauri_plugin_sql::{Migration, MigrationKind};
use tauri::{State, Manager};

mod models;
mod auth;
mod database;

pub use models::*;

use crate::auth::AtProtoAuth;
use crate::models::SessionManager;
use std::sync::{Arc, Mutex};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello from moodeSky with atrium-rs! {}", name)
}

/// Login with App Password using bsky-sdk (Tauri command)
#[tauri::command]
async fn login_app_password(
    request: LoginRequest,
    auth_state: State<'_, AtProtoAuth>,
    session_manager: State<'_, Arc<Mutex<SessionManager>>>,
) -> Result<LoginResponse, String> {
    // Authenticate with AT Protocol using bsky-sdk
    let login_response = auth_state.login_with_app_password(&request).await?;

    // TODO: Add database operations and session management later
    // For now, just return successful authentication

    Ok(login_response)
}

/// Get all active accounts for concurrent session management
#[tauri::command]
async fn get_concurrent_session_state() -> Result<ConcurrentSessionState, String> {
    // TODO: Implement with database integration
    Ok(ConcurrentSessionState {
        active_accounts: vec![],
        total_accounts: 0,
        all_accounts_active: false,
    })
}

/// Verify token validity for an account
#[tauri::command]
async fn verify_account_token(
    handle: String,
    service_url: String,
    auth_state: State<'_, AtProtoAuth>,
) -> Result<bool, String> {
    auth_state.verify_token(&handle, &service_url).await
}

/// Get session statuses for all managed agents
#[tauri::command]
async fn get_session_statuses() -> Result<Vec<AccountSessionStatus>, String> {
    // TODO: Implement with session manager
    Ok(vec![])
}

/// Get active handles from session manager
#[tauri::command]
async fn get_active_handles() -> Result<Vec<String>, String> {
    // TODO: Implement with session manager
    Ok(vec![])
}

/// Logout account (remove from active accounts and delete tokens)
#[tauri::command]
async fn logout_account(
    handle: String,
    auth_state: State<'_, AtProtoAuth>,
) -> Result<(), String> {
    // Remove tokens from keyring
    auth_state.delete_stored_tokens(&handle)?;
    
    // TODO: Add session manager and database operations
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Define database migrations
    let migrations = vec![
        Migration {
            version: 1,
            description: "Initial schema for moodeSky authentication and user data",
            sql: include_str!("../migrations/001_initial_schema.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_keyring::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:moodesky.db", migrations)
                .build(),
        )
        .setup(|app| {
            // Initialize state after plugins are loaded
            let auth = AtProtoAuth::new().expect("Failed to initialize AtProtoAuth");
            let session_manager = Arc::new(Mutex::new(SessionManager::new()));
            
            app.manage(auth);
            app.manage(session_manager);
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            login_app_password,
            get_concurrent_session_state,
            verify_account_token,
            get_session_statuses,
            get_active_handles,
            logout_account
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
