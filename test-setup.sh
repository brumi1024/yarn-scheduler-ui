#!/bin/bash

echo "Testing Dashboard Setup..."
echo "========================="

# Check if dependencies are installed
echo "1. Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "✓ Dependencies installed"
else
    echo "✗ Dependencies not found. Run: npm install"
    exit 1
fi

# Check for shadcn/ui components
echo "2. Checking shadcn/ui components..."
if [ -d "app/components/ui" ]; then
    echo "✓ shadcn/ui components found"
else
    echo "✗ shadcn/ui components missing"
    exit 1
fi

# Check for copied files
echo "3. Checking migrated files..."
if [ -d "app/lib/types" ] && [ -d "app/lib/api" ] && [ -d "app/lib/store" ]; then
    echo "✓ Core files migrated"
else
    echo "✗ Core files missing"
    exit 1
fi

# Check for mock data
echo "4. Checking mock data..."
if [ -d "public/mock" ] && [ -f "public/mockServiceWorker.js" ]; then
    echo "✓ Mock data and MSW setup"
else
    echo "✗ Mock data missing"
    exit 1
fi

echo ""
echo "All checks passed! ✅"
echo ""
echo "To start the development server, run:"
echo "  npm run dev"
echo ""
echo "The app will be available at http://localhost:5173"