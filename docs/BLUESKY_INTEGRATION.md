# Bluesky AT Protocol Integration Guide

## AT Protocol Overview

**AT Protocol (Authenticated Transfer Protocol)** is a decentralized social networking protocol developed by Bluesky.

### Key Concepts
- **DID (Decentralized Identifier)**: User's decentralized identifier
- **Handle**: User-friendly identifier (e.g., @alice.bsky.social)
- **Repository**: User's data storage
- **Lexicon**: API schema definitions
- **XRPC**: AT Protocol's RPC system

## Authentication System

### 1. Authentication Flow
```rust
// src-tauri/src/auth.rs
use atrium_api::client::AtpServiceClient;
use atrium_api::com::atproto::server::create_session;

#[tauri::command]
async fn bluesky_login(
    identifier: String,  // handle or email
    password: String     // password or app password
) -> Result<AuthSession, String> {
    let client = AtpServiceClient::new("https://bsky.social".to_string());
    
    let session = client
        .service
        .com
        .atproto
        .server
        .create_session(create_session::InputData {
            identifier,
            password,
        })
        .await
        .map_err(|e| format!("Authentication error: {}", e))?;
    
    Ok(AuthSession {
        access_jwt: session.access_jwt,
        refresh_jwt: session.refresh_jwt,
        handle: session.handle,
        did: session.did,
    })
}
```

### 2. Session Management
```rust
// src-tauri/src/session.rs
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthSession {
    pub access_jwt: String,
    pub refresh_jwt: String,
    pub handle: String,
    pub did: String,
}

#[tauri::command]
async fn refresh_session(
    session: AuthSession
) -> Result<AuthSession, String> {
    let client = AtpServiceClient::new("https://bsky.social".to_string());
    
    // JWT token refresh
    let refreshed = client
        .service
        .com
        .atproto
        .server
        .refresh_session(session.refresh_jwt)
        .await
        .map_err(|e| format!("Session refresh error: {}", e))?;
    
    Ok(AuthSession {
        access_jwt: refreshed.access_jwt,
        refresh_jwt: refreshed.refresh_jwt,
        handle: session.handle,
        did: session.did,
    })
}

#[tauri::command]
async fn logout(app_handle: AppHandle) -> Result<(), String> {
    // Clear session information
    app_handle.manage(Option::<AuthSession>::None);
    Ok(())
}
```

### 3. Secure Storage
```rust
// src-tauri/src/storage.rs
use keyring::Entry;

const SERVICE_NAME: &str = "moodeSky";
const USERNAME: &str = "bluesky_session";

pub fn save_session(session: &AuthSession) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, USERNAME)
        .map_err(|e| format!("Keyring error: {}", e))?;
    
    let session_json = serde_json::to_string(session)
        .map_err(|e| format!("Serialization error: {}", e))?;
    
    entry.set_password(&session_json)
        .map_err(|e| format!("Password save error: {}", e))?;
    
    Ok(())
}

pub fn load_session() -> Result<Option<AuthSession>, String> {
    let entry = Entry::new(SERVICE_NAME, USERNAME)
        .map_err(|e| format!("Keyring error: {}", e))?;
    
    match entry.get_password() {
        Ok(session_json) => {
            let session: AuthSession = serde_json::from_str(&session_json)
                .map_err(|e| format!("Deserialization error: {}", e))?;
            Ok(Some(session))
        }
        Err(_) => Ok(None), // Session not saved
    }
}
```

## Content Operations

### 1. Timeline Retrieval
```rust
// src-tauri/src/timeline.rs
use atrium_api::app::bsky::feed::{get_timeline, FeedViewPost};

#[tauri::command]
async fn fetch_timeline(
    session: AuthSession,
    cursor: Option<String>
) -> Result<TimelineResponse, String> {
    let client = AtpServiceClient::new("https://bsky.social".to_string());
    client.set_auth_token(session.access_jwt);
    
    let timeline = client
        .app
        .bsky
        .feed
        .get_timeline(get_timeline::ParametersData {
            algorithm: None,
            limit: Some(50),
            cursor,
        })
        .await
        .map_err(|e| format!("Timeline fetch error: {}", e))?;
    
    Ok(TimelineResponse {
        posts: timeline.feed.into_iter().map(|item| Post::from(item.post)).collect(),
        cursor: timeline.cursor,
    })
}

#[derive(Debug, Serialize)]
pub struct TimelineResponse {
    pub posts: Vec<Post>,
    pub cursor: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Post {
    pub uri: String,
    pub cid: String,
    pub author: Author,
    pub text: String,
    pub created_at: String,
    pub reply_count: i32,
    pub repost_count: i32,
    pub like_count: i32,
    pub images: Vec<Image>,
}
```

### 2. Post Creation
```rust
// src-tauri/src/post.rs
use atrium_api::app::bsky::feed::post::{RecordData as PostRecord};
use atrium_api::com::atproto::repo::create_record;

#[tauri::command]
async fn create_post(
    session: AuthSession,
    text: String,
    reply_to: Option<ReplyRef>
) -> Result<PostResult, String> {
    let client = AtpServiceClient::new("https://bsky.social".to_string());
    client.set_auth_token(session.access_jwt);
    
    let post_record = PostRecord {
        text,
        created_at: chrono::Utc::now().to_rfc3339(),
        reply: reply_to.map(|r| r.into()),
        embed: None, // TODO: Image/link embed support
        langs: Some(vec!["ja".to_string()]),
        labels: None,
        tags: None,
        facets: None, // TODO: Mention/hashtag support
    };
    
    let result = client
        .com
        .atproto
        .repo
        .create_record(create_record::InputData {
            repo: session.did.clone(),
            collection: "app.bsky.feed.post".to_string(),
            record: post_record.into(),
            rkey: None,
            swap_commit: None,
            validate: Some(true),
        })
        .await
        .map_err(|e| format!("Post creation error: {}", e))?;
    
    Ok(PostResult {
        uri: result.uri,
        cid: result.cid,
    })
}

#[derive(Debug, Serialize)]
pub struct PostResult {
    pub uri: String,
    pub cid: String,
}
```

### 3. Likes & Reposts
```rust
// src-tauri/src/interactions.rs
use atrium_api::app::bsky::feed::like::{RecordData as LikeRecord};
use atrium_api::app::bsky::feed::repost::{RecordData as RepostRecord};

#[tauri::command]
async fn like_post(
    session: AuthSession,
    post_uri: String,
    post_cid: String
) -> Result<String, String> {
    let client = AtpServiceClient::new("https://bsky.social".to_string());
    client.set_auth_token(session.access_jwt);
    
    let like_record = LikeRecord {
        created_at: chrono::Utc::now().to_rfc3339(),
        subject: StrongRef {
            uri: post_uri,
            cid: post_cid,
        }.into(),
    };
    
    let result = client
        .com
        .atproto
        .repo
        .create_record(create_record::InputData {
            repo: session.did,
            collection: "app.bsky.feed.like".to_string(),
            record: like_record.into(),
            rkey: None,
            swap_commit: None,
            validate: Some(true),
        })
        .await
        .map_err(|e| format!("Like error: {}", e))?;
    
    Ok(result.uri)
}

#[tauri::command]
async fn repost(
    session: AuthSession,
    post_uri: String,
    post_cid: String
) -> Result<String, String> {
    let client = AtpServiceClient::new("https://bsky.social".to_string());
    client.set_auth_token(session.access_jwt);
    
    let repost_record = RepostRecord {
        created_at: chrono::Utc::now().to_rfc3339(),
        subject: StrongRef {
            uri: post_uri,
            cid: post_cid,
        }.into(),
    };
    
    let result = client
        .com
        .atproto
        .repo
        .create_record(create_record::InputData {
            repo: session.did,
            collection: "app.bsky.feed.repost".to_string(),
            record: repost_record.into(),
            rkey: None,
            swap_commit: None,
            validate: Some(true),
        })
        .await
        .map_err(|e| format!("Repost error: {}", e))?;
    
    Ok(result.uri)
}
```

## Notification System

### 1. Notification Retrieval
```rust
// src-tauri/src/notifications.rs
use atrium_api::app::bsky::notification::list_notifications;

#[tauri::command]
async fn fetch_notifications(
    session: AuthSession,
    cursor: Option<String>
) -> Result<NotificationsResponse, String> {
    let client = AtpServiceClient::new("https://bsky.social".to_string());
    client.set_auth_token(session.access_jwt);
    
    let notifications = client
        .app
        .bsky
        .notification
        .list_notifications(list_notifications::ParametersData {
            limit: Some(50),
            cursor,
            seen_at: None,
        })
        .await
        .map_err(|e| format!("Notification fetch error: {}", e))?;
    
    Ok(NotificationsResponse {
        notifications: notifications.notifications.into_iter()
            .map(|n| Notification::from(n))
            .collect(),
        cursor: notifications.cursor,
    })
}

#[derive(Debug, Serialize)]
pub struct Notification {
    pub uri: String,
    pub cid: String,
    pub author: Author,
    pub reason: String, // "like", "repost", "follow", "mention", "reply"
    pub record: serde_json::Value,
    pub is_read: bool,
    pub indexed_at: String,
}
```

### 2. Push Notifications (Mobile)
```rust
// src-tauri/src/push_notifications.rs
#[cfg(mobile)]
use tauri_plugin_notification::NotificationExt;

#[cfg(mobile)]
#[tauri::command]
async fn setup_push_notifications(app: AppHandle) -> Result<(), String> {
    // Push notification setup
    app.notification()
        .permission()
        .request()
        .await
        .map_err(|e| format!("Notification permission error: {}", e))?;
    
    Ok(())
}

#[cfg(mobile)]
#[tauri::command]
async fn show_notification(
    app: AppHandle,
    title: String,
    body: String
) -> Result<(), String> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| format!("Notification display error: {}", e))?;
    
    Ok(())
}
```

## Real-time Updates

### 1. WebSocket Connection
```rust
// src-tauri/src/realtime.rs
use tokio_tungstenite::{connect_async, tungstenite::Message};
use futures_util::{SinkExt, StreamExt};

#[tauri::command]
async fn start_realtime_connection(
    app: AppHandle,
    session: AuthSession
) -> Result<(), String> {
    let ws_url = "wss://bsky.social/xrpc/com.atproto.sync.subscribeRepos";
    
    let (ws_stream, _) = connect_async(ws_url)
        .await
        .map_err(|e| format!("WebSocket connection error: {}", e))?;
    
    let (mut write, mut read) = ws_stream.split();
    
    // WebSocket message receiving loop
    tokio::spawn(async move {
        while let Some(message) = read.next().await {
            match message {
                Ok(Message::Text(text)) => {
                    // Send real-time updates to frontend
                    app.emit_all("realtime-update", text).unwrap();
                }
                Ok(Message::Binary(data)) => {
                    // Binary data processing
                    handle_car_file(&data).await;
                }
                _ => {}
            }
        }
    });
    
    Ok(())
}

async fn handle_car_file(data: &[u8]) {
    // CAR (Content Addressable aRchive) file processing
    // Parse AT Protocol update data
}
```

### 2. Frontend Integration
```typescript
// src/lib/realtime.ts
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export class RealtimeManager {
    private unlistenFn?: () => void;
    
    async start() {
        // Start real-time connection
        await invoke('start_realtime_connection');
        
        // Set up event listener
        this.unlistenFn = await listen('realtime-update', (event) => {
            this.handleRealtimeUpdate(event.payload);
        });
    }
    
    private handleRealtimeUpdate(data: any) {
        // Timeline updates
        // Notification updates
        // UI re-render triggers
    }
    
    async stop() {
        if (this.unlistenFn) {
            this.unlistenFn();
        }
    }
}
```

## Image & Media Processing

### 1. Image Upload
```rust
// src-tauri/src/media.rs
use atrium_api::com::atproto::repo::upload_blob;

#[tauri::command]
async fn upload_image(
    session: AuthSession,
    image_path: String
) -> Result<BlobRef, String> {
    let client = AtpServiceClient::new("https://bsky.social".to_string());
    client.set_auth_token(session.access_jwt);
    
    let image_data = std::fs::read(&image_path)
        .map_err(|e| format!("Image read error: {}", e))?;
    
    let blob = client
        .com
        .atproto
        .repo
        .upload_blob(image_data)
        .await
        .map_err(|e| format!("Image upload error: {}", e))?;
    
    Ok(BlobRef {
        link: blob.blob.r#ref.link,
        mime_type: blob.blob.mime_type,
        size: blob.blob.size,
    })
}

#[derive(Debug, Serialize)]
pub struct BlobRef {
    pub link: String,
    pub mime_type: String,
    pub size: i32,
}
```

### 2. Posts with Images
```rust
// src-tauri/src/post.rs (extended)
use atrium_api::app::bsky::embed::images::{Image as EmbedImage, RecordData as ImagesEmbed};

#[tauri::command]
async fn create_post_with_images(
    session: AuthSession,
    text: String,
    image_refs: Vec<BlobRef>
) -> Result<PostResult, String> {
    let client = AtpServiceClient::new("https://bsky.social".to_string());
    client.set_auth_token(session.access_jwt);
    
    let images_embed = if !image_refs.is_empty() {
        Some(ImagesEmbed {
            images: image_refs.into_iter().map(|img| EmbedImage {
                image: img.into(),
                alt: "".to_string(), // TODO: alt text support
                aspect_ratio: None,  // TODO: automatic aspect ratio detection
            }).collect(),
        }.into())
    } else {
        None
    };
    
    let post_record = PostRecord {
        text,
        created_at: chrono::Utc::now().to_rfc3339(),
        reply: None,
        embed: images_embed,
        langs: Some(vec!["ja".to_string()]),
        labels: None,
        tags: None,
        facets: None,
    };
    
    // Post creation processing...
}
```

## Error Handling

### 1. AT Protocol Errors
```rust
// src-tauri/src/errors.rs
use atrium_api::error::Error as AtriumError;

#[derive(Debug, thiserror::Error)]
pub enum BlueskyError {
    #[error("Authentication error: {0}")]
    AuthError(String),
    
    #[error("Rate limit: {0}")]
    RateLimit(String),
    
    #[error("Network error: {0}")]
    NetworkError(String),
    
    #[error("API error: {0}")]
    ApiError(String),
}

impl From<AtriumError> for BlueskyError {
    fn from(error: AtriumError) -> Self {
        match error {
            AtriumError::AuthRequired => BlueskyError::AuthError("Login required".to_string()),
            AtriumError::RateLimit => BlueskyError::RateLimit("Rate limit reached".to_string()),
            _ => BlueskyError::ApiError(error.to_string()),
        }
    }
}
```

### 2. Frontend Error Handling
```typescript
// src/lib/error-handler.ts
export class ErrorHandler {
    static handle(error: string): string {
        if (error.includes('Authentication error')) {
            return 'Login required. Please log in again.';
        }
        
        if (error.includes('Rate limit')) {
            return 'Too many requests. Please wait and try again.';
        }
        
        if (error.includes('Network error')) {
            return 'Please check your internet connection.';
        }
        
        return 'An error occurred. Please try again.';
    }
}
```

## Configuration & Customization

### 1. User Settings
```rust
// src-tauri/src/settings.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSettings {
    pub theme: Theme,
    pub language: String,
    pub notifications: NotificationSettings,
    pub timeline: TimelineSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Theme {
    Light,
    Dark,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationSettings {
    pub enabled: bool,
    pub sound: bool,
    pub mentions: bool,
    pub reposts: bool,
    pub likes: bool,
    pub follows: bool,
}

#[tauri::command]
async fn save_settings(settings: UserSettings) -> Result<(), String> {
    // Save settings
    Ok(())
}

#[tauri::command]
async fn load_settings() -> Result<UserSettings, String> {
    // Load settings
    Ok(UserSettings::default())
}
```

## Performance Optimization

### 1. Caching Strategy
```rust
// src-tauri/src/cache.rs
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct PostCache {
    posts: Arc<RwLock<HashMap<String, Post>>>,
}

impl PostCache {
    pub fn new() -> Self {
        Self {
            posts: Arc::new(RwLock::new(HashMap::new())),
        }
    }
    
    pub async fn get(&self, uri: &str) -> Option<Post> {
        let posts = self.posts.read().await;
        posts.get(uri).cloned()
    }
    
    pub async fn insert(&self, uri: String, post: Post) {
        let mut posts = self.posts.write().await;
        posts.insert(uri, post);
    }
}
```

### 2. Background Synchronization
```rust
// src-tauri/src/sync.rs
use tokio::time::{interval, Duration};

pub async fn start_background_sync(app: AppHandle) {
    let mut interval = interval(Duration::from_secs(30));
    
    loop {
        interval.tick().await;
        
        // Background data synchronization
        if let Ok(session) = get_current_session(&app).await {
            sync_notifications(&session).await;
            sync_timeline(&session).await;
        }
    }
}
```