# CLAUDE.md

**Language Rule: This file is written in English for international accessibility. However, please communicate with users in their preferred language (Japanese for this project's primary users).**

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Information

**Repository Name:** `rmc8/moodeSky`  
**GitHub URL:** https://GitHub.com/rmc8/moodeSky  
**Repository Type:** Public  
**License:** MIT License

### Repository Structure
```
moodeSky/
├── moodeSky/                      # Main Application (SvelteKit + Tauri)
│   ├── src/                       # SvelteKit Frontend
│   │   ├── app.css               # TailwindCSS v4 + Theme System
│   │   ├── app.html              # HTML Template
│   │   ├── lib/                  # Shared Libraries
│   │   │   ├── components/       # Svelte Components
│   │   │   │   ├── AccountCard.svelte
│   │   │   │   ├── Avatar.svelte
│   │   │   │   ├── BottomNavigation.svelte
│   │   │   │   ├── Icon.svelte
│   │   │   │   ├── LanguageSelector*.svelte
│   │   │   │   ├── Navigation.svelte
│   │   │   │   ├── ThemeProvider.svelte
│   │   │   │   └── ThemeToggle.svelte
│   │   │   ├── deck/             # Deck-specific Logic
│   │   │   │   ├── store.svelte.ts
│   │   │   │   └── types.ts
│   │   │   ├── services/         # Service Layer
│   │   │   │   ├── agent.ts      # AT Protocol Agent
│   │   │   │   ├── authStore.ts  # Authentication Management
│   │   │   │   ├── i18nService.ts # Internationalization
│   │   │   │   ├── multiAccountService.ts
│   │   │   │   └── themeStore.ts # Theme Management
│   │   │   ├── stores/           # Svelte 5 Stores (runes)
│   │   │   │   ├── accounts.svelte.ts
│   │   │   │   ├── i18n.svelte.ts
│   │   │   │   └── theme.svelte.ts
│   │   │   ├── types/            # TypeScript Type Definitions
│   │   │   │   ├── agent.ts      # AT Protocol Types
│   │   │   │   ├── auth.ts       # Authentication Types
│   │   │   │   ├── i18n.ts       # Internationalization Types
│   │   │   │   └── theme.ts      # Theme System Types
│   │   │   └── utils/            # Utility Functions
│   │   ├── paraglide/            # Paraglide-JS Generated
│   │   │   ├── messages.js       # Type-safe Translation Functions
│   │   │   └── messages/         # Individual Message Files (500+)
│   │   └── routes/               # SvelteKit Routing
│   │       ├── (root)/           # Root Page Group
│   │       ├── deck/             # Deck Page
│   │       ├── login/            # Login Page
│   │       └── settings/         # Settings Page
│   ├── src-tauri/                # Tauri Rust Backend
│   │   ├── src/
│   │   │   ├── main.rs          # Tauri App Entry Point
│   │   │   └── lib.rs           # Core Logic
│   │   ├── Cargo.toml           # Rust Dependencies
│   │   ├── tauri.conf.json      # Tauri Configuration
│   │   └── gen/                 # Generated Platform Code
│   │       ├── android/         # Android Specific
│   │       └── apple/           # iOS/macOS Specific
│   ├── project.inlang/          # Inlang i18n Configuration
│   ├── package.json            # pnpm Configuration
│   ├── pnpm-lock.yaml          # Dependency Lock File
│   └── svelte.config.js        # SvelteKit SPA Configuration
├── dev_rag/                     # Development Support RAG Tool (Python)
│   ├── main.py                 # CLI Entry Point
│   ├── dev_rag/                # Core Package
│   └── cloned_repos/           # Vectorized Documentation
├── docs/                       # Project Documentation
│   ├── PRODUCT_SPECIFICATION.md
│   └── *.md                    # Development Guidelines
└── README.md                  # Project Overview
```

## Project Overview

**moodeSky** is a multi-platform Bluesky client application using Tauri for cross-platform desktop and mobile support.

### Technology Stack
- **Frontend**: SvelteKit + TypeScript (SPA configuration)
  - **Svelte 5**: Latest Svelte framework with runes
  - **TailwindCSS v4**: Latest utility-first CSS with integrated theme system
- **Backend**: Rust (Tauri 2.0)
- **Database**: SQLite (Tauri SQL Plugin required)
- **State Management**: Tauri Store Plugin + Svelte $state
- **Internationalization**: Paraglide-JS v2 + Tauri OS Plugin (5 languages)
- **AT Protocol**: Bluesky API integration (@atproto/api)

### Supported Platforms
- **Desktop**: macOS, Windows, Linux
- **Mobile**: iOS, Android (Tauri Mobile Alpha)

## Development Commands

### Main Project (moodeSky)
Navigate to `moodeSky/` directory for all commands.

**Package Manager:** This project uses **pnpm** (not npm).
- Install dependencies: `pnpm install`
- Add packages: `pnpm add <package>`

**Development:**
- `pnpm run tauri dev` - **Main development command** (Frontend + Backend)
- `pnpm run dev` - SvelteKit dev server only (when Tauri features not needed)
- `pnpm run check` - TypeScript/Svelte type checking

**Building:**
- `pnpm run build` - Frontend production build
- `pnpm run tauri build` - Desktop app complete build

**Mobile (Tauri Mobile Alpha):**
- `pnpm run tauri android dev` - Android development
- `pnpm run tauri ios dev` - iOS development (macOS only)

**Backend (Rust) - from src-tauri/ directory:**
- `cargo check` - Rust code error checking
- `cargo clippy` - Rust linting
- `cargo test` - Rust test execution

### dev_rag (Development RAG Tool)
Navigate to `dev_rag/` directory:
- `uv sync` - Install dependencies
- `uv run dev-rag vec_tauri` - Vectorize Tauri docs
- `uv run dev-rag search "query"` - Vector search

## Architecture

### Frontend (SvelteKit SPA)
- **Directory**: `moodeSky/src/`
- **Configuration**: SPA using `@sveltejs/adapter-static` (SSR disabled)
- **Communication**: Tauri `invoke()` API for Rust backend integration

### Backend (Rust)
- **Directory**: `moodeSky/src-tauri/src/`
- **Entry Point**: `main.rs` (Tauri app initialization)
- **Core Logic**: `lib.rs` (main functionality)
- **Commands**: `#[tauri::command]` macro for frontend integration

### AT Protocol Integration
- **API**: @atproto/api package
- **Authentication**: Tauri Store Plugin (secure storage)
- **Real-time**: WebSocket connections
- **Caching**: Tauri SQL Plugin (SQLite) + memory cache

## Styling Rules (TailwindCSS v4 + Theme System)

### Core Principles
1. **No custom CSS**: Avoid `<style>` tags, use utility classes only
2. **Unified theme classes**: Use integrated theme classes, NO `dark:` prefixes
3. **Consistency**: Follow design system for unified styling
4. **Accessibility**: WCAG AA compliance (contrast ratio 4.5:1+)

### Available Themes
- **Light Theme**: `data-theme="sky"` (white background, blue accent)
- **Dark Theme**: `data-theme="sunset"` (dark background, orange accent)
- **High Contrast**: `.high-contrast` class

### Essential Theme Classes

**Background:**
```css
.bg-themed     /* Main background (--color-background) */
.bg-card       /* Card background (--color-card) */
.bg-muted      /* Muted background (--color-muted) */
.bg-primary    /* Primary background (--color-primary) */
```

**Text:**
```css
.text-themed   /* Main text (--color-foreground) */
.text-secondary /* Secondary text (--color-text-secondary) */
.text-inactive /* Inactive text (--color-text-inactive) */
.text-primary  /* Primary text (--color-primary) */
```

**Components:**
```css
.button-primary  /* Primary button (auto-optimized) */
.input-themed    /* Form input (themed) */
.card-themed     /* Card container */
```

### ❌ Prohibited Patterns

**NEVER use these legacy patterns:**
```css
/* ❌ FORBIDDEN: Legacy dark: prefixes */
.bg-white.dark:bg-slate-800
.text-gray-900.dark:text-gray-100

/* ❌ CRITICAL: text-muted for text color (visibility issue) */
.text-muted        /* Background color used as text - NEVER USE */
color="muted"      /* In Icon components - NEVER USE */
```

**✅ Correct patterns:**
```css
/* ✅ Use integrated theme classes */
.bg-card.text-themed
.text-secondary    /* For secondary text */
.text-inactive     /* For inactive text */
```

### Visual Accessibility
- All theme combinations meet WCAG AA standards (4.5:1 contrast ratio)
- High contrast theme available for enhanced accessibility
- Test all themes: Sky, Sunset, and High Contrast

## Internationalization (i18n) System

### Implementation Status ✅
- [x] **Paraglide-JS v2**: Type-safe translation system
- [x] **Tauri OS Plugin**: Native system language detection
- [x] **Multi-layer detection**: Saved settings → OS → Browser → Fallback
- [x] **Reactive switching**: Real-time language changes
- [x] **Complete coverage**: All pages and components

### Supported Languages
1. **Japanese (ja)** - Primary language
2. **English (en)** - Global standard, fallback
3. **Portuguese (pt-BR)** - Brazilian market
4. **German (de)** - European market
5. **Korean (ko)** - East Asian market

### Usage Pattern
```typescript
import * as m from '$lib/i18n/paraglide/messages.js';

// Type-safe translation usage
const title = m['login.title']();
const error = m['validation.requiredFields']();
```

### Language Detection Flow
1. **Tauri Store Plugin** → Saved language preference
2. **Tauri OS Plugin** → System language detection
3. **Navigator API** → Browser language
4. **Fallback** → English (en)

### Important: Reactive Arrays with Translations
```typescript
// ❌ Bad: Static array (won't update on language change)
const navItems: NavItem[] = [
  { label: t('navigation.home'), ... }
];

// ✅ Good: Use $derived for reactivity
const navItems = $derived<NavItem[]>([
  { label: t('navigation.home'), ... }
]);
```

## MCP (Model Context Protocol) Usage Rules

### Priority Tools for Development

1. **sequential_thinking** - **Use actively for complex problem-solving**
2. **sveltekit-docs** - SvelteKit-specific questions
3. **svelte-docs** - **Svelte 5** specific features (runes, etc.)
4. **tauri-docs** - **Tauri 2** specific implementation
5. **atproto-docs** - AT Protocol TypeScript library
6. **bluesky** - Real API testing and verification
7. **tavily** - Latest information and general search
8. **context7** - Dynamic library reference ("use context7" declaration)
9. **GitHub** - Project management and collaboration

### Usage Guidelines
- **Always use sequential_thinking** for complex tasks
- **Check existing type definitions** with context7 before creating custom types
- **Test real API** behavior with bluesky tools
- **Consult official docs** with RAG tools before implementation

## Development Workflow

### Core Development Process
1. **Analysis**: Use sequential_thinking for complex planning
2. **Research**: Consult relevant RAG tools (sveltekit-docs, tauri-docs, etc.)
3. **Implementation**: Follow TDD approach when possible
4. **Quality Check**: 
   - `pnpm run check` (TypeScript)
   - `cargo check && cargo clippy` (Rust)
5. **Testing**: Run all tests before commits

### Quality Standards
- **TypeScript**: Zero type errors (`pnpm run check`)
- **Rust**: Zero warnings (`cargo clippy`)
- **Styling**: Use only integrated theme classes
- **Accessibility**: WCAG AA compliance
- **i18n**: All text must use translation functions

### Git Workflow
- **Branch naming**: `feature/issue-123-description`
- **Commits**: Use descriptive messages
- **PR creation**: Include tests and documentation updates

## Emergency Procedures

### App State Reset
**Quick Reset**: `cargo clean` + clear app data (`~/Library/Application Support/com.rmc8.moodesky.app/`)  
**Full Details**: See `docs/TROUBLESHOOTING.md`

### Port Conflicts
```bash
lsof -ti:1420 | xargs kill -9
```

## Key Development Patterns

### 1. Type Definitions (Critical Pattern)
**Always check existing types before creating custom ones:**

```typescript
// ❌ Bad: Creating custom session types
interface MySessionData { accessToken: string; }

// ✅ Good: Use official @atproto/api types
import type { AtpSessionData, AtpSessionEvent } from '@atproto/api';
```

**Process**: use context7 → check @atproto/api → implement with official types

### 2. Tauri Store Plugin Authentication
**Secure authentication management pattern:**
- Use AtpSessionData from @atproto/api
- Implement with Tauri Store Plugin for encrypted storage
- Support multi-account with proper session isolation

### 3. Theme System Implementation
**Integrated theme pattern:**
```typescript
// Theme management with Svelte 5 runes
class ThemeStore {
  currentTheme = $state<'light' | 'dark' | 'high-contrast'>('light');
  
  private applyThemeToDOM(): void {
    const html = document.documentElement;
    switch (this.currentTheme) {
      case 'light': html.setAttribute('data-theme', 'sky'); break;
      case 'dark': html.setAttribute('data-theme', 'sunset'); break;
      case 'high-contrast': html.classList.add('high-contrast'); break;
    }
  }
}
```

### 4. Reactive i18n Pattern
**For arrays containing translations:**
```typescript
// Always use $derived for translation arrays
const navItems = $derived<NavItem[]>([
  { id: 'home', label: t('navigation.home'), path: '/deck' }
]);
```

### 5. AT Protocol Identification Pattern
**Critical Rule: Always use DID for reliable identification**

**Identification Hierarchy (by reliability):**
1. **DID (Decentralized Identifier)**: **IMMUTABLE** - Never changes, highest reliability
2. **Handle**: **VARIABLE** - Can change, lower reliability for persistent identification

```typescript
// ✅ Good: Use DID for persistent identification, caching, and database keys
const cachedProfile = avatarCache.get(account.profile.did);
const accountLookup = accounts.find(acc => acc.profile.did === targetDid);

// ⚠️ Acceptable: Use handle for display and user-facing features only
const displayText = `@${account.profile.handle}`;
const userFriendlyId = account.profile.handle;

// ❌ Bad: Using handle for persistent identification or caching
const cachedProfile = cache.get(account.profile.handle); // Handle can change!
```

**Key Use Cases:**
- **DID**: Database keys, caching, persistent references, account matching
- **Handle**: User display, @mentions, user-friendly URLs, temporary lookups

## Important Files & Configurations

### Critical Files to Monitor
- `src/app.css` - **Theme system core** (handle with care)
- `src/lib/stores/theme.svelte.ts` - Theme state management
- `src/lib/stores/i18n.svelte.ts` - i18n state management
- `src/lib/i18n/locales/*.json` - Translation files
- `tauri.conf.json` - Tauri configuration
- `package.json` - **pnpm management** (never use npm)

### Development Rules
1. **Package manager**: Use pnpm only (never npm)
2. **Theme classes**: Never use `dark:` prefixes
3. **Visibility**: Never use `text-muted` for text color
4. **Types**: Check @atproto/api before custom implementations
5. **i18n**: All UI text must use translation functions
6. **Testing**: Run type checks before commits

### Emergency Fixes
**If visibility issues found:**
1. Stop development immediately
2. Search all files for `text-muted`, `color="muted"`
3. Replace with `text-secondary` or `text-inactive`
4. Test all themes (Sky, Sunset, High Contrast)
5. Update documentation with lessons learned

---

**Development Philosophy**: Prioritize accessibility, maintainability, and cross-platform consistency. Always use official type definitions and follow established patterns for theme management and internationalization.