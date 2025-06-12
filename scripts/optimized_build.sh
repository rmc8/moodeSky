#!/bin/bash

# 🚀 パフォーマンス最適化済みビルドスクリプト
# このスクリプトはMoodeSkyプロジェクトのビルド時間を大幅に短縮します

set -e  # エラー時に停止

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 進捗表示関数
log_info() {
    echo -e "${BLUE}🚀 $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${PURPLE}📋 Step $1: $2${NC}"
}

# 実行時間測定
start_time=$(date +%s)

# ヘルプ表示
show_help() {
    cat << EOF
🚀 MoodeSky 最適化ビルドスクリプト

使用方法:
    $0 [オプション]

オプション:
    --clean         クリーンビルド（キャッシュをクリア）
    --watch         ウォッチモードで実行
    --analyze       静的解析も実行
    --profile       プロファイリング付きビルド
    --parallel N    並列実行数を指定（デフォルト: CPUコア数）
    --fast          高速ビルド（最小限のチェック）
    --help          このヘルプを表示

例:
    $0 --clean --analyze          # クリーンビルド + 静的解析
    $0 --watch                    # ウォッチモード
    $0 --fast --parallel 8        # 高速ビルド（8並列）
EOF
}

# デフォルト設定
CLEAN_BUILD=false
WATCH_MODE=false
RUN_ANALYZE=false
ENABLE_PROFILE=false
FAST_BUILD=false
PARALLEL_JOBS=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "4")

# 引数解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN_BUILD=true
            shift
            ;;
        --watch)
            WATCH_MODE=true
            shift
            ;;
        --analyze)
            RUN_ANALYZE=true
            shift
            ;;
        --profile)
            ENABLE_PROFILE=true
            shift
            ;;
        --parallel)
            PARALLEL_JOBS="$2"
            shift 2
            ;;
        --fast)
            FAST_BUILD=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "不明なオプション: $1"
            show_help
            exit 1
            ;;
    esac
done

# 環境チェック
check_environment() {
    log_step "1" "環境チェック"
    
    # Dartのバージョンチェック
    if ! command -v dart &> /dev/null; then
        log_error "Dartが見つかりません"
        exit 1
    fi
    
    # Flutterのバージョンチェック
    if ! command -v flutter &> /dev/null; then
        log_error "Flutterが見つかりません"
        exit 1
    fi
    
    log_info "Dart: $(dart --version 2>&1 | head -1)"
    log_info "Flutter: $(flutter --version | head -1)"
    log_info "並列実行数: $PARALLEL_JOBS"
    
    log_success "環境チェック完了"
}

# 依存関係の更新
update_dependencies() {
    log_step "2" "依存関係の更新"
    
    if [[ "$FAST_BUILD" == "true" ]]; then
        log_warning "高速ビルドモード: 依存関係更新をスキップ"
        return
    fi
    
    log_info "依存関係を取得中..."
    flutter pub get --no-sound-null-safety || {
        log_error "依存関係の取得に失敗しました"
        exit 1
    }
    
    log_success "依存関係の更新完了"
}

# クリーンビルド
clean_build() {
    if [[ "$CLEAN_BUILD" == "true" ]]; then
        log_step "3" "クリーンビルド"
        
        log_info "キャッシュをクリア中..."
        
        # Flutterキャッシュクリア
        flutter clean
        
        # dart_toolクリア
        rm -rf .dart_tool/build
        
        # 生成ファイルクリア
        find lib -name "*.g.dart" -delete
        find lib -name "*.freezed.dart" -delete
        
        log_success "クリーンビルド完了"
    fi
}

# 最適化されたコード生成
optimized_code_generation() {
    log_step "4" "最適化コード生成"
    
    # build_runnerの設定ファイルを使用
    BUILD_CONFIG="--config=build_optimization.yaml"
    
    if [[ "$WATCH_MODE" == "true" ]]; then
        log_info "ウォッチモードでコード生成を開始..."
        dart run build_runner watch $BUILD_CONFIG \
            --delete-conflicting-outputs \
            --enable-experiment=super-parameters || {
            log_error "ウォッチモードの開始に失敗しました"
            exit 1
        }
    else
        log_info "コード生成を実行中..."
        
        # プロファイリング付きビルド
        if [[ "$ENABLE_PROFILE" == "true" ]]; then
            log_info "プロファイリング付きでビルド中..."
            dart run build_runner build $BUILD_CONFIG \
                --delete-conflicting-outputs \
                --enable-experiment=super-parameters \
                --verbose \
                --performance-tracking || {
                log_error "プロファイリング付きビルドに失敗しました"
                exit 1
            }
        else
            # 通常ビルド
            dart run build_runner build $BUILD_CONFIG \
                --delete-conflicting-outputs \
                --enable-experiment=super-parameters || {
                log_error "コード生成に失敗しました"
                exit 1
            }
        fi
        
        log_success "コード生成完了"
    fi
}

# 静的解析
static_analysis() {
    if [[ "$RUN_ANALYZE" == "true" && "$WATCH_MODE" == "false" ]]; then
        log_step "5" "静的解析"
        
        log_info "静的解析を実行中..."
        flutter analyze --no-fatal-infos || {
            log_warning "静的解析で警告またはエラーが見つかりました"
        }
        
        log_success "静的解析完了"
    fi
}

# コードフォーマット
format_code() {
    if [[ "$FAST_BUILD" == "false" && "$WATCH_MODE" == "false" ]]; then
        log_step "6" "コードフォーマット"
        
        log_info "コードをフォーマット中..."
        dart format . --set-exit-if-changed || {
            log_warning "フォーマットが必要なファイルが見つかりました"
        }
        
        log_success "コードフォーマット完了"
    fi
}

# インポート整理
organize_imports() {
    if [[ "$FAST_BUILD" == "false" && "$WATCH_MODE" == "false" ]]; then
        log_step "7" "インポート整理"
        
        if command -v dart_import_sorter &> /dev/null; then
            log_info "インポートを整理中..."
            dart run import_sorter:main || {
                log_warning "インポート整理で問題が見つかりました"
            }
            
            log_success "インポート整理完了"
        else
            log_warning "import_sorterが見つかりません。スキップします。"
        fi
    fi
}

# ビルド統計表示
show_build_stats() {
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    echo ""
    log_success "🎉 ビルド完了!"
    log_info "実行時間: ${minutes}分${seconds}秒"
    
    # 生成されたファイル数を表示
    local generated_files=$(find lib -name "*.g.dart" -o -name "*.freezed.dart" | wc -l)
    log_info "生成ファイル数: $generated_files"
    
    # ファイルサイズ情報
    if command -v du &> /dev/null; then
        local lib_size=$(du -sh lib 2>/dev/null | cut -f1)
        log_info "libディレクトリサイズ: $lib_size"
    fi
}

# メイン実行
main() {
    log_info "🚀 MoodeSky 最適化ビルドを開始します"
    
    check_environment
    update_dependencies
    clean_build
    optimized_code_generation
    
    if [[ "$WATCH_MODE" == "false" ]]; then
        static_analysis
        format_code
        organize_imports
        show_build_stats
    else
        log_info "ウォッチモードで実行中... Ctrl+Cで終了"
    fi
}

# 割り込み処理
trap 'log_warning "ビルドがキャンセルされました"; exit 1' INT TERM

# スクリプト実行
main "$@"