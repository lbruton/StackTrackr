#!/bin/bash
# StakTrakr Browserbase Test Runner
# Run comprehensive UI validation tests via Stagehand

set -e

cd "$(dirname "$0")"

# Check for .env file
if [ ! -f .env ]; then
  echo "❌ Error: .env file not found"
  echo "   Copy .env.example to .env and add your API keys"
  exit 1
fi

# Check for required env vars
source .env
if [ -z "$BROWSERBASE_API_KEY" ] || [ -z "$BROWSERBASE_PROJECT_ID" ] || [ -z "$GOOGLE_API_KEY" ]; then
  echo "❌ Error: Missing required environment variables"
  echo "   Required: BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, GOOGLE_API_KEY"
  exit 1
fi

# Install deps if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Parse arguments
TEST_TYPE="${1:-all}"

echo "🚀 Running StakTrakr Browserbase Tests"
echo "   Target: https://staktrakr.pages.dev/"
echo "   Test suite: $TEST_TYPE"
echo ""

case "$TEST_TYPE" in
  basic)
    echo "▶️  Running basic UI flow test..."
    npm run test:basic
    ;;
  goldback)
    echo "▶️  Running Goldback flow test..."
    npm run test:goldback
    ;;
  all)
    echo "▶️  Running all tests..."
    npm run test:all
    ;;
  *)
    echo "❌ Unknown test type: $TEST_TYPE"
    echo "   Usage: ./run-tests.sh [basic|goldback|all]"
    exit 1
    ;;
esac

echo ""
echo "✅ Test run complete!"
echo "   View session recordings at: https://browserbase.com/sessions"
