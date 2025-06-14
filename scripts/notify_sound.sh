#!/bin/bash

# moodeSky - Cross-platform notification sound script
# Supports macOS and Ubuntu/Linux

# Function to detect OS
detect_os() {
    case "$(uname -s)" in
        Darwin*)    echo "macos" ;;
        Linux*)     echo "linux" ;;
        *)          echo "unknown" ;;
    esac
}

# Function to play notification sound
play_notification_sound() {
    local sound_type="${1:-success}"  # success, error, warning, info
    local os=$(detect_os)
    
    case "$os" in
        "macos")
            play_macos_sound "$sound_type"
            ;;
        "linux")
            play_linux_sound "$sound_type"
            ;;
        *)
            echo "🔕 Unsupported OS for sound notification"
            return 1
            ;;
    esac
}

# macOS sound function
play_macos_sound() {
    local sound_type="$1"
    local sound_file=""
    
    case "$sound_type" in
        "success")
            sound_file="/System/Library/Sounds/Glass.aiff"
            echo "✅ Task completed successfully!"
            ;;
        "error")
            sound_file="/System/Library/Sounds/Basso.aiff"
            echo "❌ Task failed!"
            ;;
        "warning")
            sound_file="/System/Library/Sounds/Funk.aiff"
            echo "⚠️  Warning!"
            ;;
        "info")
            sound_file="/System/Library/Sounds/Ping.aiff"
            echo "ℹ️  Information"
            ;;
        *)
            sound_file="/System/Library/Sounds/Purr.aiff"
            echo "🔔 Notification"
            ;;
    esac
    
    if [ -f "$sound_file" ]; then
        afplay "$sound_file" 2>/dev/null &
    else
        # Fallback to system beep
        osascript -e 'beep' 2>/dev/null &
    fi
}

# Linux/Ubuntu sound function
play_linux_sound() {
    local sound_type="$1"
    local sound_file=""
    
    case "$sound_type" in
        "success")
            # Try different locations for success sounds
            for file in \
                "/usr/share/sounds/freedesktop/stereo/complete.oga" \
                "/usr/share/sounds/alsa/Front_Left.wav" \
                "/usr/share/sounds/ubuntu/stereo/desktop-login.ogg"; do
                if [ -f "$file" ]; then
                    sound_file="$file"
                    break
                fi
            done
            echo "✅ Task completed successfully!"
            ;;
        "error")
            # Try different locations for error sounds
            for file in \
                "/usr/share/sounds/freedesktop/stereo/dialog-error.oga" \
                "/usr/share/sounds/ubuntu/stereo/dialog-error.ogg" \
                "/usr/share/sounds/alsa/Front_Right.wav"; do
                if [ -f "$file" ]; then
                    sound_file="$file"
                    break
                fi
            done
            echo "❌ Task failed!"
            ;;
        "warning")
            # Try different locations for warning sounds
            for file in \
                "/usr/share/sounds/freedesktop/stereo/dialog-warning.oga" \
                "/usr/share/sounds/ubuntu/stereo/dialog-warning.ogg"; do
                if [ -f "$file" ]; then
                    sound_file="$file"
                    break
                fi
            done
            echo "⚠️  Warning!"
            ;;
        "info")
            # Try different locations for info sounds
            for file in \
                "/usr/share/sounds/freedesktop/stereo/dialog-information.oga" \
                "/usr/share/sounds/ubuntu/stereo/dialog-information.ogg"; do
                if [ -f "$file" ]; then
                    sound_file="$file"
                    break
                fi
            done
            echo "ℹ️  Information"
            ;;
        *)
            echo "🔔 Notification"
            ;;
    esac
    
    # Try to play sound with available players
    if [ -n "$sound_file" ] && [ -f "$sound_file" ]; then
        if command -v paplay >/dev/null 2>&1; then
            paplay "$sound_file" 2>/dev/null &
        elif command -v aplay >/dev/null 2>&1; then
            aplay "$sound_file" 2>/dev/null &
        elif command -v play >/dev/null 2>&1; then
            play "$sound_file" 2>/dev/null &
        else
            # Fallback to terminal bell
            echo -e "\a"
        fi
    else
        # Fallback to terminal bell if no sound files found
        echo -e "\a"
    fi
}

# Function to show help
show_help() {
    cat << EOF
🔊 moodeSky Notification Sound Script

Usage: $0 [SOUND_TYPE]

Sound Types:
  success   - Play success sound (default)
  error     - Play error sound
  warning   - Play warning sound
  info      - Play information sound

Examples:
  $0                    # Play default success sound
  $0 success           # Play success sound
  $0 error             # Play error sound
  $0 warning           # Play warning sound
  
Integration Examples:
  flutter test && $0 success || $0 error
  flutter build apk && $0 success
  dart run build_runner build && $0 success
  
OS Support:
  ✅ macOS (using afplay)
  ✅ Ubuntu/Linux (using paplay/aplay)
  
Current OS: $(detect_os)
EOF
}

# Main execution
main() {
    case "${1:-}" in
        "-h"|"--help"|"help")
            show_help
            exit 0
            ;;
        "")
            play_notification_sound "success"
            ;;
        *)
            play_notification_sound "$1"
            ;;
    esac
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi