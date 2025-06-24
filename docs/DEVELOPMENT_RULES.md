# moodeSky Development Rules

## Project Overview

**moodeSky** is a multi-platform Bluesky client application built with Tauri.

### Target Platforms
- **Desktop**: macOS, Windows, Linux
- **Mobile**: iOS, Android (using Tauri Mobile Alpha)

### Technology Stack
- **Frontend**: SvelteKit + TypeScript (SPA configuration)
- **Backend**: Rust (Tauri 2.0)
- **Development Support**: dev_rag (RAG tool)

## Development Workflow

### 1. Development Environment Setup

```bash
# After cloning the project
cd moodeSky

# Install dependencies
pnpm install

# Start development server (recommended)
pnpm run tauri dev  # Frontend + Backend

# Frontend-only development
pnpm run dev  # When Tauri features not needed
```

### 2. Development Priority

1. **Desktop Version First** - Mac/Windows/Linux support
2. **Core Feature Implementation** - AT Protocol integration, basic UI/UX
3. **Mobile Support** - Tauri Mobile Alpha integration
4. **Platform Optimization** - Responsive design adjustments

### 3. Quality Management

#### Required Checks
```bash
# TypeScript type checking
pnpm run check

# Rust code checking (in src-tauri/ directory)
cd src-tauri
cargo check
cargo test
```

#### Code Style
- **TypeScript**: Prettier + ESLint (SvelteKit standard)
- **Rust**: rustfmt + clippy
- **Pre-commit**: Type checking and tests are mandatory

## Architecture Guidelines

### 1. Frontend Design

#### Directory Structure
```
src/
├── routes/           # SvelteKit routing
├── lib/              # Shared components and utilities
├── stores/           # Svelte stores (state management)
└── types/            # TypeScript type definitions
```

#### State Management
- Use **Svelte stores**
- **AT Protocol data** processed on Rust side, frontend focuses on rendering
- Adopt **reactive programming** patterns

### 2. Backend Design

#### Tauri Command Design
```rust
#[tauri::command]
async fn bluesky_login(handle: String, password: String) -> Result<AuthSession, String>

#[tauri::command] 
async fn fetch_timeline(session: AuthSession) -> Result<Vec<Post>, String>

#[tauri::command]
async fn create_post(session: AuthSession, text: String) -> Result<PostResult, String>
```

#### Data Layer
- **AT Protocol Client** implementation (Rust)
- **Offline support** consideration (using local DB)
- **Unified error handling**

### 3. Platform Support Strategy

#### Desktop
- **Native menu** integration
- **System notifications** support
- **Window management** optimization

#### Mobile
- **Touch UI** optimization
- **Gesture** support
- **Push notifications** implementation

## AT Protocol Integration

### 1. Authentication Flow
1. **User authentication** (handle + password or App Password)
2. **Session management** (securely stored on Rust side)
3. **API calls** (using atrium-api)

### 2. Implementation Order of Major Features
1. **Login/Logout**
2. **Timeline display**
3. **Post creation/deletion**
4. **Likes/Reposts**
5. **Notification system**
6. **Profile management**

### 3. Data Synchronization
- **Real-time updates** (WebSocket or polling)
- **Offline support** (local cache)
- **Sync error handling**

## Development Support Tools (dev_rag)

### RAG Tool Usage
```bash
cd dev_rag

# Document vectorization
uv run dev-rag vec_tauri      # Tauri documentation
uv run dev-rag vec_bluesky    # Bluesky documentation  
uv run dev-rag vec_sveltekit  # SvelteKit documentation
uv run dev-rag vec_moode      # Local project

# All at once
uv run dev-rag vector_all

# Search
uv run dev-rag search "Tauri mobile iOS setup"
```

### MCP Integration
- **Bluesky MCP**: AT Protocol API integration support
- **Context7**: Library documentation search
- **Tavily**: Latest information research

## Testing Strategy

### 1. Frontend
- **Vitest**: Unit testing
- **Playwright**: E2E testing
- **Svelte Testing Library**: Component testing

### 2. Backend
- **Rust standard testing**: Unit and integration tests
- **AT Protocol**: Using mock server

### 3. Cross-platform
- **CI/CD**: GitHub Actions
- **Automated builds**: All platform support

## Deployment & Distribution

### 1. Build
```bash
# Desktop
pnpm run tauri build

# Specific platform
pnpm run tauri build --target x86_64-apple-darwin  # macOS Intel
pnpm run tauri build --target aarch64-apple-darwin # macOS ARM
```

### 2. Distribution
- **GitHub Releases**: Desktop version distribution
- **App Store**: iOS version submission preparation
- **Google Play**: Android version submission preparation

## Security Considerations

### 1. Authentication Information Management
- **App Passwords** usage recommended
- **Session encryption** storage
- **Sensitive information logging prohibited**

### 2. CSP Configuration
```json
{
  "security": {
    "csp": "default-src 'self'; connect-src 'self' https://bsky.social https://*.bsky.social"
  }
}
```

### 3. Privacy
- **Minimal data collection**
- **Local data encryption**
- **TLS mandatory for communication**

## Performance Optimization

### 1. Frontend
- **Code splitting** (SvelteKit)
- **Image optimization**
- **Virtual scrolling** (for large datasets)

### 2. Backend
- **Asynchronous processing** (tokio)
- **Connection pooling**
- **Caching strategy**

## Future Expansion Plans

### Phase 1: Core Features
- AT Protocol basic functionality implementation
- Desktop version stabilization

### Phase 2: Mobile Support
- Tauri Mobile integration
- Touch UI optimization

### Phase 3: Advanced Features
- Multi-account support
- Custom feeds
- Advanced notification features