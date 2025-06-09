# CLAUDE.md

**Speak in Japanese!**

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MoodeSky is a Bluesky client application built with Flutter for cross-platform support (Android, iOS, Web, Windows, Linux, macOS).

### Core Features
- **Bluesky API Integration**: AT Protocol client using `bluesky.dart`
- **State Management**: Riverpod with code generation
- **AI Agent Features**: Optional LangChain/LangGraph integration
- **Multi-language Support**: Japanese, English, Korean, German, Brazilian Portuguese
- **Theme System**: Dark/light themes with multiple variations
- **Deck-based UI**: Responsive column layout design
- **Multi-account Support**: Simultaneous account management and switching

### Platform Support
- **Mobile**: Android/iOS (portrait, swipe deck switching)
- **Tablet**: Android/iOS tablets (landscape, side-by-side decks)
- **Desktop**: Windows/macOS/Linux (multi-column display)
- **Web**: Browser support with responsive design

### UI/UX Design Philosophy
- **Deck Interface**: TweetDeck-style column layout
- **Responsive Design**: 
  - **Mobile**: 1-column, swipe gestures
  - **Tablet**: 2-3 columns side-by-side
  - **Desktop**: 3-8 column multi-display
- **Adaptive Layout**: Device-optimized displays

### Design Principles
- **Performance**: Minimal widget tree depth, const constructors
- **Efficient API Usage**: Cache strategies, batch requests
- **Visual Excellence**: UI/UX aesthetics priority
- **Platform Optimization**: Follow each platform's UX guidelines

## Development Commands

### Package Management
- `flutter pub get` - Install dependencies
- `flutter pub upgrade` - Upgrade to latest versions
- `flutter pub outdated` - Check outdated dependencies
- `dart run build_runner build` - Generate Riverpod/Drift code
- `dart run build_runner watch` - Watch mode code generation

### Running Application
- `flutter run` - Run on connected device/emulator
- `flutter run -d chrome` - Run on web browser
- `flutter run -d windows` - Run on Windows
- `flutter run -d macos` - Run on macOS

### Code Quality & Analysis
- `flutter analyze` - Run static analysis
- `dart format .` - Format all Dart files
- `dart format --set-exit-if-changed .` - Format with error on changes

### Testing
- `flutter test` - Run all tests
- `flutter test test/widget_test.dart` - Run specific test
- `flutter test --coverage` - Run tests with coverage

### Building
- `flutter build apk` - Build Android APK
- `flutter build ios` - Build iOS app
- `flutter build web` - Build web version
- `flutter build windows` - Build Windows executable
- `flutter build macos` - Build macOS app

## Project Structure

```
lib/
├── main.dart                    # Application entry point
├── core/                        # Core functionality
│   ├── providers/              # Riverpod providers
│   ├── theme/                  # Theme settings (dark/light, variants)
│   ├── l10n/                   # Internationalization files
│   └── constants/              # Constant definitions
├── features/                   # Feature modules
│   ├── auth/                   # Authentication
│   │   ├── multi_account/     # Multi-account management
│   │   ├── models/            # Auth models
│   │   └── providers/         # Auth state management
│   ├── timeline/               # Timeline display
│   ├── post/                   # Posting functionality
│   │   ├── compose/           # Post composition with account switching
│   │   └── multi_account/     # Multi-account posting
│   ├── profile/                # Profile functionality
│   ├── deck/                   # Deck-based UI management
│   │   ├── models/            # Deck models
│   │   ├── providers/         # Deck state management
│   │   ├── widgets/           # Deck UI components
│   │   └── multi_account/     # Multi-account decks
│   └── ai_agent/               # AI agent features (optional)
├── shared/                     # Shared components
│   ├── widgets/                # Reusable widgets
│   │   ├── responsive/        # Responsive layouts
│   │   ├── adaptive/          # Adaptive UI
│   │   └── platform/          # Platform-specific UI
│   ├── models/                 # Data models
│   ├── utils/                  # Utility functions
│   └── responsive/             # Responsive helpers
└── services/                   # External service integration
    ├── bluesky_service.dart    # Bluesky API client
    ├── ai_service.dart         # AI agent service
    ├── cache_service.dart      # Cache management
    └── database/               # Database layer
        ├── database.dart       # Drift database config
        ├── tables/             # Table definitions
        │   ├── accounts.dart   # Multi-account table
        │   ├── posts.dart      # Post cache table
        │   ├── decks.dart      # Deck settings table
        │   └── settings.dart   # Settings table
        └── daos/               # Data Access Objects
            ├── account_dao.dart
            ├── post_dao.dart
            ├── deck_dao.dart
            └── settings_dao.dart
```

## Coding Standards

### Performance Principles
- **Shallow Widget Trees**: Minimize nesting, use const constructors
- **Efficient State Management**: Riverpod code generation, minimal rebuilds
- **API Optimization**: Cache strategies, batch requests
- **Responsive Optimization**: Device-specific performance optimization

### Responsive Design Principles
- **Mobile First**: Smartphone UI as design baseline
- **Progressive Enhancement**: Feature addition based on screen size
- **Platform Optimization**: Material Design (Android) vs Cupertino (iOS)
- **Touch Optimization**: Tablet-optimized touch interactions

### Code Quality
- `flutter_lints` package for code quality enforcement
- Follow Flutter recommended linting rules in `analysis_options.yaml`

## Dependencies

### Main Dependencies
- `bluesky.dart` - Bluesky AT Protocol client
- `flutter_riverpod` - State management
- `riverpod_annotation` - Riverpod code generation
- `intl` / `flutter_localizations` - Internationalization
- `langchain_dart` - AI agent features (optional)
- `http` - HTTP client
- `shared_preferences` - Local storage
- `drift` - SQLite ORM (fast, type-safe, Flutter-optimized)
- `sqlite3_flutter_libs` - SQLite native libraries
- `path_provider` - Application directory paths

### Dev Dependencies
- `build_runner` - Riverpod/Drift code generation
- `riverpod_generator` - Riverpod code generation
- `drift_dev` - Drift database schema generation
- `flutter_lints` - Linting rules
- `flutter_test` - Testing framework

## Testing Approach

- Flutter built-in testing framework
- Widget tests, unit tests, integration tests
- Test files in `test/` directory with `*_test.dart` naming
- Use `ProviderContainer` for Riverpod provider testing

## Internationalization (i18n)

Supported languages:
- Japanese (ja)
- English (en)
- Korean (ko)
- German (de)
- Brazilian Portuguese (pt_BR)

## Theme System

- **Light Themes**: Multiple light theme variations
- **Dark Themes**: Multiple dark theme variations
- Automatic switching based on system settings
- Manual theme selection by user

## Deck System

### Deck Types
- **Home Timeline**: Following users' posts (per account)
- **Notifications**: Likes, reposts, follows, mentions (per account)
- **Search**: Keyword/hashtag search results
- **Lists**: Custom list display (per account)
- **Profile**: Specific user profile/posts
- **Thread**: Post thread display
- **Custom Feed**: Custom algorithm feeds
- **Local Timeline**: Server-specific local posts
- **Hashtag**: Specific hashtag tracking
- **Mentions**: Specific user mention tracking

### Multi-account Support
- **Account Limit**: Unlimited (recommended up to 20 accounts)
- **Deck-Account Association**: Assign specific accounts to each deck
- **Cross-account Decks**: Unified display of multiple account data
- **Post Account Switching**: Account selection during post creation
- **Per-account Settings**: Theme, notification settings per account

### Deck Management
- **Max Decks**: Unlimited (recommended up to 50 decks)
- **Deck Reordering**: Drag & drop reordering
- **Deck Groups**: Categorize decks into groups
- **Favorite Decks**: Bookmark frequently used decks
- **Deck Search**: Quick search/filtering for large deck collections

### Responsive Layout
- **Mobile (< 600dp)**:
  - 1 deck display
  - Horizontal scroll/swipe switching
  - Bottom navigation + deck selection drawer
  - Position indicators
  
- **Tablet (600dp ≤ width < 1200dp)**:
  - 2-3 decks side-by-side
  - Horizontal scroll for additional decks
  - Tab bar deck switching
  - Drag & drop reordering
  
- **Desktop (≥ 1200dp)**:
  - 3-8 deck multi-column display
  - Sidebar deck management/search
  - Free deck resizing/reordering
  - Deck group tabs for efficient switching

## Database Design

### Drift (SQLite ORM) Selection Rationale
- **Performance**: Excellent SQLite performance
- **Type Safety**: Dart type system integrated queries
- **Maintenance**: Actively developed Flutter-specific library
- **Code Generation**: Automatic code generation from schema
- **Cross-platform**: Consistent behavior across all platforms

### Authentication System Design

#### Bluesky OAuth Implementation
- **Current State**: Transitioning from App Passwords to OAuth 2.0 with DPoP
- **OAuth DPoP**: RFC 9449 compliant token binding to client cryptographic keys
- **atproto_oauth**: Dedicated Dart package for AT Protocol OAuth handling
- **Migration Strategy**: Support both OAuth and App Password during transition period

#### Account Table Schema
```dart
// Core AT Protocol identifiers
String did;              // Decentralized Identifier (unique)
String handle;           // User handle @user.bsky.social (unique)
String pdsUrl;           // Personal Data Server URL
String serviceUrl;       // AT Protocol service URL

// OAuth/DPoP authentication
String? accessJwt;       // Access token (JWT)
String? refreshJwt;      // Refresh token (JWT)
String? dpopPublicKey;   // DPoP public key
String? dpopPrivateKey;  // DPoP private key (encrypted)
String? dpopNonce;       // DPoP nonce
String tokenType;        // 'DPoP' or 'Bearer'
String? scope;           // OAuth authorization scope

// Authentication method
String loginMethod;      // 'oauth' or 'app_password'
String? sessionString;   // App password session (legacy)
DateTime? tokenExpiry;   // Token expiration time

// Profile information
String? displayName;     // Display name
String? description;     // Profile description
String? avatar;          // Avatar image URL
String? banner;          // Banner image URL
String? email;           // Email address

// Multi-account management
bool isActive;           // Current active account
DateTime? lastUsed;      // Last usage timestamp
int accountOrder;        // Display order
String? accountLabel;    // User-defined label

// Security and compliance
bool isVerified;         // Account verification status
String accountStatus;    // 'active', 'suspended', 'limited'
DateTime? termsAccepted; // Terms acceptance timestamp
DateTime? privacyAccepted; // Privacy policy acceptance
```

### Key Table Design
- **Accounts**: Multi-account info with OAuth/DPoP support
- **Posts**: Timeline post cache (per account, offline support)
- **Decks**: Deck settings (type, order, account association, display settings)
- **Settings**: App settings (theme, language, AI settings)

### Database Strategy
- **Local First**: Basic functionality available offline
- **Incremental Sync**: Minimal data synchronization
- **Cache Strategy**: Efficient caching of frequently accessed data
- **Multi-account Isolation**: Safe separation/management of account data
- **Deck State Persistence**: Save deck settings/order/filter conditions
- **OAuth Security**: Secure DPoP key storage and token management

## Data Layer Implementation Design

### Architecture Overview
```
UI Layer (Widgets)
    ↓
State Management (Riverpod)
    ↓
Service Layer (BlueskyService)
    ↓
Data Layer (Drift DAOs + Secure Storage)
    ↓
Database (SQLite) + Secure Storage
```

### Core Data Components

#### 1. Database Tables
- **Accounts Table**: OAuth/DPoP authentication, multi-account management
- **Posts Table**: Timeline cache with engagement metrics and deck association
- **Decks Table**: TweetDeck-style column configuration with cross-account support
- **Settings Table**: Global/per-account settings with type-safe storage

#### 2. Data Access Objects (DAOs)
- **AccountDao**: Multi-account CRUD, OAuth session management, token refresh
- **PostDao**: Timeline caching, engagement tracking, deck filtering
- **DeckDao**: Column management, cross-account decks, layout persistence
- **SettingsDao**: Type-safe settings storage with global/account scoping

#### 3. Service Layer
- **BlueskyService**: High-level business logic, authentication orchestration
- **AuthService**: OAuth/DPoP flow handling, token management
- **CacheService**: Efficient data caching and sync strategies
- **AIAgentService**: Optional LangChain integration

#### 4. State Management (Riverpod)
- **AuthProvider**: Authentication state, account switching
- **DeckProvider**: Deck management, layout state
- **PostProvider**: Timeline data, real-time updates
- **SettingsProvider**: Global/account settings management

#### 5. Models & Data Transfer
- **Freezed Models**: Immutable data structures with JSON serialization
- **Type-safe Settings**: Compile-time setting key validation
- **OAuth Models**: DPoP session data, token refresh handling

### Security Implementation
- **DPoP Key Storage**: Encrypted private keys in Flutter Secure Storage
- **Token Management**: Automatic refresh with 5-minute threshold
- **Account Isolation**: Complete data separation per account
- **Secure Preferences**: Critical settings encrypted in secure storage

### Performance Optimizations
- **Lazy Loading**: Database connection and table creation on demand
- **Reactive Updates**: Stream-based UI updates via Riverpod
- **Efficient Caching**: Intelligent post caching with deck-specific strategies
- **Background Sync**: Incremental data synchronization

## Multi-account Features

### Account Management
- **Registration/Auth**: Secure OAuth/App Password authentication
- **Account Switching**: One-tap account switching
- **Simultaneous Login**: Maintain login state for multiple accounts
- **Per-account Data**: Complete separation of posts, notifications, settings

### Posting Features
- **Account Selection**: Account selection UI during post creation
- **Default Account**: Set default posting account per deck
- **Quick Switching**: Account switching during post composition
- **Draft Management**: Per-account draft save/restore

### Notification Management
- **Unified Notifications**: Integrated display of all account notifications
- **Per-account Notifications**: Display notifications for specific accounts only
- **Notification Badges**: Per-account unread notification counts
- **Notification Settings**: Per-account notification settings (sound, vibration, display format)