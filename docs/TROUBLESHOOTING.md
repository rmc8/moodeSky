# Troubleshooting Guide

## Application Initialization & State Reset

### Complete App State Reset

**When to use**: Drag & drop errors, state corruption, or persistent bugs that survive code changes.

#### Step 1: Stop Development Server
```bash
# Kill any running Tauri processes
Ctrl+C  # in terminal running pnpm run tauri dev
```

#### Step 2: Clean Rust Build Cache
```bash
cd /path/to/moodeSky/moodeSky/src-tauri
cargo clean
```

#### Step 3: Clear Tauri Application Data
```bash
# macOS: Clear app data storage
rm -rf ~/Library/Application\ Support/com.rmc8.moodesky.app/
rm -rf ~/Library/Caches/com.rmc8.moodesky.app/
rm -rf ~/Library/WebKit/com.rmc8.moodesky.app/

# Alternative: Clear all Tauri stores for development
rm -rf ~/.local/share/com.rmc8.moodesky.app/
```

#### Step 4: Clean Frontend Build Cache
```bash
cd /path/to/moodeSky/moodeSky
rm -rf build/
rm -rf .svelte-kit/
rm -rf node_modules/.vite/
```

#### Step 5: Kill Port Conflicts
```bash
# Free up port 1420 if needed
lsof -ti:1420 | xargs kill -9
```

#### Step 6: Fresh Development Start
```bash
cd /path/to/moodeSky/moodeSky
pnpm run tauri dev
```

### Quick State Reset

When encountering drag & drop state issues without code changes:

```bash
# Kill development server
Ctrl+C

# Clear only Tauri app data
rm -rf ~/Library/Application\ Support/com.rmc8.moodesky.app/

# Restart server
pnpm run tauri dev
```

### Verification Steps

After initialization:
1. ✅ No `each_key_duplicate` errors in console
2. ✅ Drag & drop works without "tab absorption" issues  
3. ✅ Device detection logs show correct mobile/desktop classification
4. ✅ Zone type logs show unique IDs (e.g., `desktop-decktabbar-xyz`, `mobile-mobiletabs-abc`)

### Common Issues After Reset

**Issue**: Development server won't start
- **Solution**: Check port 1420 availability, kill conflicting processes

**Issue**: App appears but no data
- **Expected**: Fresh installation state, create new decks/columns as needed

**Issue**: Still getting duplicate key errors
- **Solution**: Code-level issue, check for duplicate zone configurations

## Drag & Drop Issues

### Symptoms
- `each_key_duplicate` errors
- "Tab absorption" where tabs get stuck or pulled incorrectly
- Multiple placeholder elements visible
- Drag operations affecting wrong elements

### Root Causes
1. **Multiple dnd-zones with same type**: Each zone needs unique type
2. **Duplicate column IDs**: Same column appearing multiple times in array
3. **Device detection issues**: Mobile and desktop zones both active
4. **State corruption**: Old drag state persisting between operations

### Solutions
1. **Check zone type generation**: Look for logs showing `desktop-xyz` vs `mobile-xyz`
2. **Verify column deduplication**: Check for duplicate removal warnings in console
3. **Device classification**: Verify screen width and user agent detection
4. **Force state cleanup**: Use complete reset procedure above

## Development Environment Issues

### Port 1420 Already in Use
```bash
lsof -ti:1420 | xargs kill -9
```

### TypeScript Errors
```bash
pnpm run check
```

### Rust Compilation Issues
```bash
cd src-tauri
cargo check
cargo clippy
```

### Cache Issues
Clear all caches:
```bash
rm -rf build/ .svelte-kit/ node_modules/.vite/
pnpm install
```