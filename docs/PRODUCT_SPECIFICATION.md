# moodeSky Product Specification

## 📱 Application Overview

**moodeSky** is a multi-platform deck-style client application dedicated to AT Protocol (Bluesky).

### 🎯 Core Concept
- **Deck-style UI**: TweetDeck-inspired multiple column simultaneous display
- **Multi-account**: Simultaneous account operation instead of switching
- **Cross-platform**: Consistent UX from mobile to desktop
- **Power user focused**: High-efficiency social media management

## 🌐 Supported Platforms

### Desktop
- **macOS**: Intel (x86_64) / Apple Silicon (aarch64)
- **Windows**: x64 / ARM64
- **Linux**: x86_64 / ARM64

### Mobile (Tauri Mobile Alpha)
- **iOS**: 12.0+ (iPhone/iPad)
- **Android**: API Level 24+ (Android 7.0+)

### Not Supported
- **Web browsers**: Native app exclusive strategy

## 🌍 Internationalization

### Supported Languages
- **Japanese (ja)** - Primary
- **English (en)** - Global
- **Portuguese (pt-BR)** - South American market
- **Korean (ko)** - East Asian market
- **German (de)** - European market

### Localization Features
- Dynamic language switching
- Date, time, and number localization
- Responsive design for text density
- LTR languages only (RTL not supported)

### Implementation Status ✅ Complete
- [x] **Paraglide-JS v2 Integration** - Type-safe translation system
- [x] **Tauri OS Plugin Integration** - Native system language detection
- [x] **Multi-layer Detection System** - Saved settings → OS → Browser → Fallback
- [x] **Tauri Store Plugin Integration** - Language settings persistence
- [x] **Svelte 5 Reactive Store** - Reactive language switching
- [x] **Complete Translation Coverage** - All pages and components

## 🎨 Theme System

### Basic Themes
- **Light Theme**: Bright and clean standard UI
- **Dark Theme**: Eye-friendly dark-based UI

### Extended Themes
- **High Contrast Theme**: Accessibility focused
- **Custom Theme**: User-defined color settings
- **System Sync**: Automatic OS settings follow

### Theme Features
- Real-time switching
- Time-based automatic switching
- Per-column theme settings (future feature)
- Accent color customization

## 👥 Multi-Account Support

### Architecture
- **Simultaneous Session Management**: Parallel processing of multiple accounts
- **Unified Timeline**: Integrated display of posts from all accounts
- **Account-specific Columns**: Individual account timeline display
- **Cross-account Operations**: Interaction between different accounts

### Security
- **Independent Authentication**: Individual session management per account
- **Secure Storage**: Encrypted authentication information storage
- **Permission Isolation**: Data isolation between accounts

## 🔗 External Tool Integration

### Planned Services
- **Notion**: Bookmark and memo management
- **Obsidian**: Knowledge management and notes
- **Zapier/IFTTT**: Workflow automation
- **Discord/Slack**: Notification integration
- **Google Sheets/Airtable**: Data analysis and export

### Integration Methods
- **OAuth Authentication**: Secure API integration
- **Webhooks**: Real-time notifications
- **REST API**: Data synchronization
- **Plugin System**: Third-party extensions

## 🤖 AI Agent Features

### Delivery Methods
- **Paid Subscription**: Monthly billing system
- **Personal API Key**: User's own AI API usage

### Feature Candidates
- **Post Generation Assistance**: Text improvement, summarization, translation
- **Sentiment Analysis**: Post tone analysis
- **Trend Analysis**: Automatic topic detection
- **Auto-categorization**: Automatic post tagging
- **Scheduling Optimization**: Post timing suggestions

### Supported AI APIs
- OpenAI GPT-4/GPT-4o
- Anthropic Claude
- Google Gemini
- Local LLM (future support)

## 🏗 Deck System Specifications

### Deck Configuration
- **Variable Width Columns**: User-defined size adjustment
- **Infinite Scroll**: Efficient large data display
- **Drag & Drop**: Column reordering
- **Column Types**: Home, Notifications, Search, Lists, Hashtags

### Responsive Design
- **Desktop**: 3-5 columns simultaneous display
- **Tablet**: 1-3 column display
- **Smartphone**: 1 column + swipe switching
- **Adaptive Layout**: Automatic adjustment based on screen size

## 🔒 Security & Privacy

### Data Protection
- **End-to-End Encryption**: Local data encryption
- **Zero Knowledge Principle**: No personal data storage on servers
- **Automatic Data Deletion**: Configurable retention periods
- **Anonymous Mode**: Tracking prevention features

### Compliance
- **GDPR Compliance**: EU General Data Protection Regulation
- **CCPA Compliance**: California Consumer Privacy Act
- **Personal Information Protection Act**: Japan's privacy law
- **Data Portability**: Data export functionality

## ⚡ Performance Requirements

### Response Performance
- **App Startup Time**: Within 3 seconds
- **API Response Time**: Within 2 seconds
- **UI Operation Response**: Within 100ms
- **Memory Usage**: Under 100MB when idle

### Scalability
- **Simultaneous Accounts**: Maximum 10 accounts
- **Simultaneous Columns**: Maximum 20 columns
- **Cached Posts**: 5000 posts per account
- **Real-time Connections**: Multiple WebSocket management

## 🎯 Development Roadmap

### Phase 1: Core Features (3-4 months) - **In Progress**
- [x] **AT Protocol Authentication System** - ✅ Complete (Tauri Store Plugin + @atproto/api)
- [x] **Basic UI & Theme System** - ✅ Complete (TailwindCSS v4 + Integrated Theme)
- [x] **Single Account Support** - ✅ Complete (Store Plugin Secure Management)
- [x] **Internationalization System** - ✅ Complete (Paraglide-JS v2 + 5 languages)
- [ ] Basic timeline display - 🚧 Next implementation
- [ ] Post creation/deletion features - 🚧 Next implementation

### Phase 2: Multi-Account & Deck (2-3 months)
- [ ] Multi-account authentication management
- [ ] Deck system implementation
- [ ] Column management features
- [ ] Cross-account operations

### Phase 3: Multi-Account & External Integration (2-3 months)
- [x] **i18n Implementation & Translation** - ✅ Complete (5 languages fully supported)
- [ ] Multi-account authentication management - 🚧 Migration
- [ ] External tool integration API
- [ ] Plugin system
- [ ] Advanced filtering

### Phase 4: AI Agent & Advanced Features (3-4 months)
- [ ] AI agent integration
- [ ] Billing system
- [ ] Advanced analytics features
- [ ] Automation workflows

### Phase 5: Mobile Optimization & Distribution (2-3 months)
- [ ] Complete Tauri Mobile support
- [ ] Mobile UI optimization
- [ ] App store submission & distribution
- [ ] Performance optimization

## 🏆 Differentiation Factors

### Technical Advantages
- **Tauri Utilization**: Web technology + native performance
- **Multi-platform**: Single codebase for all platforms
- **Memory Efficiency**: Lighter than Electron
- **Security**: Rust language safety

### UX/UI Advantages
- **Deck Specialized**: Power user focused design
- **Customizability**: Advanced personalization features
- **Accessibility**: Comprehensive usability
- **Responsive**: Consistent UX across all devices

### Functional Advantages
- **External Integration**: Rich third-party integrations
- **AI Agent**: Next-generation SNS management assistance
- **Privacy Focused**: User data protection
- **Open Source**: Transparency and community

---

**Note**: This specification is extracted from the main development documentation and represents the product vision for moodeSky. For technical implementation details, refer to the main CLAUDE.md file.