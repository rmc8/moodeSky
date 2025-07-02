#!/bin/bash

# Claude Code Hooks - TypeScript Type Check Script
# 型チェック自動実行スクリプト

set -e

# カラー定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 TypeScript type check starting...${NC}"

# moodeSkyディレクトリに移動
cd /Users/rmc-8.com/VisualStudioCode/App/moodeSky/moodeSky

# 型チェック実行
if pnpm run check 2>&1; then
    echo -e "${GREEN}✅ Type check passed successfully${NC}"
    exit 0
else
    echo -e "${RED}❌ Type check failed${NC}"
    echo -e "${YELLOW}💡 Please fix TypeScript errors before proceeding${NC}"
    exit 1
fi