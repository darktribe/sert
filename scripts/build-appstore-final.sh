#!/bin/bash

set -e

echo "🚀 Building for App Store submission..."

# App Store用証明書の設定
export APPLE_TEAM_ID="UVC7CS2KN7"
export APPLE_CERTIFICATE_ID="3rd Party Mac Developer Application: akihiko ouchi (UVC7CS2KN7)"
export APPLE_INSTALLER_CERTIFICATE_ID="3rd Party Mac Developer Installer: akihiko ouchi (UVC7CS2KN7)"

# 証明書の存在確認
echo "🔍 Checking App Store certificates..."
if ! security find-identity -v -p codesigning | grep -q "3rd Party Mac Developer Application"; then
    echo "❌ App Store certificate not found"
    echo "Available certificates:"
    security find-identity -v -p codesigning
    echo ""
    echo "Please create Mac App Store certificate at:"
    echo "https://developer.apple.com/account/resources/certificates/"
    exit 1
fi

if ! security find-identity -v -p codesigning | grep -q "3rd Party Mac Developer Installer"; then
    echo "❌ Installer certificate not found"
    echo "Available certificates:"
    security find-identity -v -p codesigning
    echo ""
    echo "Please create Mac Installer Distribution certificate at:"
    echo "https://developer.apple.com/account/resources/certificates/"
    exit 1
fi

echo "✅ App Store certificates found"

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

# Create installer package for App Store
echo "📦 Creating App Store installer package..."
productbuild --component "$APP_PATH" /Applications \
    --sign "$APPLE_INSTALLER_CERTIFICATE_ID" \
    "target/aarch64-apple-darwin/release/bundle/Vinsert.pkg"

echo "✅ App Store installer created: target/aarch64-apple-darwin/release/bundle/Vinsert.pkg"

# Verify installer
echo "🔍 Verifying installer package..."
pkgutil --check-signature "target/aarch64-apple-darwin/release/bundle/Vinsert.pkg"

echo "🎉 App Store build complete!"
echo ""
echo "Files ready for App Store submission:"
echo "1. App: $APP_PATH"
echo "2. Installer: target/aarch64-apple-darwin/release/bundle/Vinsert.pkg"
echo ""
echo "Next steps:"
echo "1. Test the app locally"
echo "2. Upload to App Store Connect using Transporter"
echo "3. Submit for review"