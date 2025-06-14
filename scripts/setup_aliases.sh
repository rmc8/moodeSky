#!/bin/bash

# moodeSky - Development aliases setup script
# This script sets up convenient aliases for development with sound notifications

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NOTIFY_SCRIPT="$SCRIPT_DIR/notify_sound.sh"

# Detect shell configuration file
detect_shell_config() {
    if [[ "$SHELL" == *"zsh"* ]]; then
        echo "$HOME/.zshrc"
    elif [[ "$SHELL" == *"bash"* ]]; then
        if [[ -f "$HOME/.bashrc" ]]; then
            echo "$HOME/.bashrc"
        else
            echo "$HOME/.bash_profile"
        fi
    else
        echo "$HOME/.profile"
    fi
}

# moodeSky development aliases
ALIASES=$(cat << 'EOF'

# moodeSky Development Aliases with Sound Notifications
alias moode-notify='SCRIPT_DIR/notify_sound.sh'
alias moode-success='SCRIPT_DIR/notify_sound.sh success'
alias moode-error='SCRIPT_DIR/notify_sound.sh error'
alias moode-warning='SCRIPT_DIR/notify_sound.sh warning'
alias moode-info='SCRIPT_DIR/notify_sound.sh info'

# Flutter commands with notifications
alias flutter-test='flutter test && moode-success || moode-error'
alias flutter-build='flutter build apk && moode-success || moode-error'
alias flutter-build-ios='flutter build ios && moode-success || moode-error'
alias flutter-analyze='flutter analyze && moode-success || moode-warning'
alias flutter-clean='flutter clean && moode-success'

# Dart commands with notifications  
alias dart-build='dart run build_runner build && moode-success || moode-error'
alias dart-build-watch='dart run build_runner watch'
alias dart-format='dart format . && moode-success'

# Combined commands
alias moode-check='dart format . && flutter analyze && flutter test && moode-success || moode-error'
alias moode-build='dart run build_runner build && flutter build apk && moode-success || moode-error'
alias moode-full='flutter clean && flutter pub get && dart run build_runner build && flutter analyze && flutter test && moode-success || moode-error'

# Git commands with notifications
alias git-push='git push && moode-success || moode-error'
alias git-pull='git pull && moode-success || moode-error'

EOF
)

# Replace SCRIPT_DIR placeholder with actual path
ALIASES="${ALIASES//SCRIPT_DIR/$SCRIPT_DIR}"

setup_aliases() {
    local shell_config=$(detect_shell_config)
    
    echo "🚀 Setting up moodeSky development aliases..."
    echo "Shell config file: $shell_config"
    
    # Check if aliases already exist
    if grep -q "moodeSky Development Aliases" "$shell_config" 2>/dev/null; then
        echo "⚠️  moodeSky aliases already exist in $shell_config"
        read -p "Do you want to update them? (y/N): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Remove existing aliases
            sed -i.bak '/# moodeSky Development Aliases/,/^$/d' "$shell_config"
            echo "🗑️  Removed existing aliases"
        else
            echo "❌ Setup cancelled"
            exit 0
        fi
    fi
    
    # Add new aliases
    echo "$ALIASES" >> "$shell_config"
    
    echo "✅ Aliases added to $shell_config"
    echo ""
    echo "🔄 Please restart your terminal or run:"
    echo "   source $shell_config"
    echo ""
    echo "📝 Available aliases:"
    echo "   moode-success       - Play success sound"
    echo "   moode-error         - Play error sound"
    echo "   moode-warning       - Play warning sound"
    echo "   moode-info          - Play info sound"
    echo ""
    echo "   flutter-test        - Run tests with sound notification"
    echo "   flutter-build       - Build APK with sound notification"
    echo "   flutter-analyze     - Analyze code with sound notification"
    echo "   dart-build          - Run build_runner with sound notification"
    echo ""
    echo "   moode-check         - Format + analyze + test"
    echo "   moode-build         - Build runner + build APK"
    echo "   moode-full          - Complete clean build and test"
    echo ""
    echo "🔊 Test the notification sound:"
    echo "   $NOTIFY_SCRIPT success"
}

# Test sound function
test_sound() {
    echo "🔊 Testing notification sounds..."
    echo ""
    
    echo "Testing success sound..."
    "$NOTIFY_SCRIPT" success
    sleep 1
    
    echo "Testing error sound..."
    "$NOTIFY_SCRIPT" error
    sleep 1
    
    echo "Testing warning sound..."
    "$NOTIFY_SCRIPT" warning
    sleep 1
    
    echo "Testing info sound..."
    "$NOTIFY_SCRIPT" info
    
    echo ""
    echo "✅ Sound test completed!"
}

# Show help
show_help() {
    cat << EOF
🔊 moodeSky Development Aliases Setup

Usage: $0 [COMMAND]

Commands:
  setup     - Set up development aliases with sound notifications
  test      - Test all notification sounds
  help      - Show this help message

Examples:
  $0 setup           # Set up aliases in your shell config
  $0 test            # Test all notification sounds

EOF
}

# Main execution
main() {
    case "${1:-setup}" in
        "setup")
            setup_aliases
            ;;
        "test")
            test_sound
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            echo "❌ Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"