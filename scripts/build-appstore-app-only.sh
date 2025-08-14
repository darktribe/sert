#!/bin/bash

set -e

echo "🚀 Building for App Store (App only)..."

# App Store用証明書の設定
export APPLE_TEAM_ID="UVC7CS2KN7"
export APPLE_CERTIFICATE_ID="3rd Party Mac Developer Application: akihiko ouchi (UVC7CS2KN7)"

# App Store証明書の存在確認
echo "🔍 Checking App Store certificate..."
if ! security find-identity -v -p codesigning | grep -q "3rd Party Mac Developer Application"; then
    echo "❌ App Store certificate not found"
    exit 1
fi

echo "✅ App Store certificate found: $APPLE_CERTIFICATE_ID"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
cd src-tauri
cargo clean
cd ..
rm -rf src-tauri/target/aarch64-apple-darwin/release/bundle

# Frontend build
echo "🏗️ Building frontend..."
npm run build

# Tauri build for App Store
echo "📦 Building Tauri app for App Store..."
cd src-tauri
cargo tauri build --target aarch64-apple-darwin --bundles app

# Check if build succeeded
APP_PATH="target/aarch64-apple-darwin/release/bundle/macos/Vinsert.app"
if [ ! -d "$APP_PATH" ]; then
    echo "❌ Build failed: App not found at $APP_PATH"
    exit 1
fi

echo "✅ App built successfully at: $APP_PATH"

# Verify App Store signing
echo "🔍 Verifying App Store code signing..."
codesign --verify --deep --strict "$APP_PATH"
echo "✅ Code signing verified"

# Check entitlements
echo "🔍 Checking entitlements..."
codesign -d --entitlements - "$APP_PATH"

# Test app assessment
echo "🔍 Testing app assessment..."
spctl --assess --type execute "$APP_PATH" && echo "✅ App assessment passed" || echo "⚠️ App assessment failed (normal for App Store apps)"

echo "🎉 App Store app build complete!"
echo ""
echo "App ready for App Store submission: $APP_PATH"
echo ""
echo "Note: No installer package created (installer certificate needed)"
echo "You can upload the .app directly to App Store Connect"