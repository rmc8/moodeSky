use crate::models::*;
use bsky_sdk::BskyAgent;
use sha2::{Digest, Sha256};

/// AT Protocol authentication using bsky-sdk (atrium-rs)
pub struct AtProtoAuth {
    // TODO: Add keyring support later
}

impl AtProtoAuth {
    pub fn new() -> Result<Self, String> {
        Ok(Self {
            // TODO: Initialize keyring later
        })
    }

    /// Login with App Password using bsky-sdk
    pub async fn login_with_app_password(
        &self,
        request: &LoginRequest,
    ) -> Result<LoginResponse, String> {
        let service_url = request.service_url.as_deref().unwrap_or("https://bsky.social");

        // Create BskyAgent with service URL
        let agent = BskyAgent::builder()
            .build()
            .await
            .map_err(|e| format!("Failed to create BskyAgent: {}", e))?;

        // Authenticate using App Password
        let session = agent
            .login(&request.handle_or_email, &request.password)
            .await
            .map_err(|e| format!("Login failed: {}", e))?;

        // Extract session information
        let handle = session.handle.to_string();
        let did = session.did.to_string();
        let access_jwt = session.access_jwt.clone();
        let refresh_jwt = session.refresh_jwt.clone();

        // TODO: Store tokens securely in keyring
        // For now, skip keyring storage
        println!("Login successful - tokens would be stored in keyring");

        // Fetch profile information using bsky-sdk
        let (display_name, avatar_url) = self.fetch_profile_with_agent(&agent).await?;

        // Create account object
        let account = Account {
            id: None,
            handle: handle.clone(),
            did: did.clone(),
            service_url: service_url.to_string(),
            auth_type: AuthType::AppPassword,
            display_name,
            avatar_url,
            is_active: true,
            created_at: None,
            updated_at: None,
        };

        // Create session token hash for database storage
        let session_token = self.create_session_token(&access_jwt);

        Ok(LoginResponse {
            account,
            session_token,
            success: true,
            message: Some("Login successful with bsky-sdk".to_string()),
        })
    }

    /// Fetch user profile information using bsky-sdk
    async fn fetch_profile_with_agent(&self, _agent: &BskyAgent) -> Result<(Option<String>, Option<String>), String> {
        // TODO: Implement profile fetching with correct bsky-sdk API
        // For now, return None values to get basic authentication working
        Ok((None, None))
    }

    /// Retrieve stored access token from keyring
    pub fn get_stored_access_token(&self, _handle: &str) -> Result<Option<String>, String> {
        // TODO: Implement keyring retrieval
        Ok(None)
    }

    /// Retrieve stored refresh token from keyring
    pub fn get_stored_refresh_token(&self, _handle: &str) -> Result<Option<String>, String> {
        // TODO: Implement keyring retrieval
        Ok(None)
    }

    /// Delete stored tokens from keyring (logout)
    pub fn delete_stored_tokens(&self, _handle: &str) -> Result<(), String> {
        // TODO: Implement keyring deletion
        println!("Tokens would be deleted from keyring");
        Ok(())
    }

    /// Create a session token hash for database storage
    fn create_session_token(&self, access_token: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(access_token.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// Verify if stored token is still valid using bsky-sdk
    pub async fn verify_token(&self, handle: &str, service_url: &str) -> Result<bool, String> {
        let access_token = match self.get_stored_access_token(handle)? {
            Some(token) => token,
            None => return Ok(false),
        };

        let refresh_token = self.get_stored_refresh_token(handle)?;

        // Create agent with stored session
        let agent = BskyAgent::builder()
            .build()
            .await
            .map_err(|e| format!("Failed to create BskyAgent: {}", e))?;

        // Try to restore session from stored tokens
        // TODO: Implement proper session verification
        // For now, assume token is valid if it exists
        Ok(true)
    }

    /// Create a BskyAgent with stored session for API calls
    pub async fn create_authenticated_agent(&self, handle: &str, service_url: &str) -> Result<BskyAgent, String> {
        let access_token = self.get_stored_access_token(handle)?
            .ok_or("No access token found")?;
        let refresh_token = self.get_stored_refresh_token(handle)?;

        let agent = BskyAgent::builder()
            .build()
            .await
            .map_err(|e| format!("Failed to create BskyAgent: {}", e))?;

        // Note: In a full implementation, you would restore the session here
        // For now, we return the agent (this may need refinement based on bsky-sdk API)
        
        Ok(agent)
    }

    /// Refresh access token using bsky-sdk session management
    pub async fn refresh_access_token(&self, handle: &str, service_url: &str) -> Result<String, String> {
        let refresh_token = match self.get_stored_refresh_token(handle)? {
            Some(token) => token,
            None => return Err("No refresh token found".to_string()),
        };

        let agent = BskyAgent::builder()
            .build()
            .await
            .map_err(|e| format!("Failed to create BskyAgent: {}", e))?;

        // Note: This would need to be implemented based on bsky-sdk's session refresh API
        // For now, return an error indicating this feature needs implementation
        Err("Session refresh with bsky-sdk not yet implemented".to_string())
    }
}