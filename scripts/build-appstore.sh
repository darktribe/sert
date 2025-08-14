#!/bin/bash

set -e

echo "🚀 Building for App Store (Apple Silicon)..."

# Environment variables
export APPLE_TEAM_ID="UVC7CS2KN7"  # 10文字のTeam ID
export APPLE_CERTIFICATE_ID="Developer ID Application: akihiko ouchi (UVC7CS2KN7)"
# export APPLE_INSTALLER_CERTIFICATE_ID="Mac Installer Distribution: akihiko ouchi (UVC7CS2KN7)"
export APPLE_INSTALLER_CERTIFICATE_ID="3rd Party Mac Developer Installer: Akihiko Ouchi ($APPLE_TEAM_ID)"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
cd src-tauri
cargo clean
cd ..
rm -rf src-tauri/target/release/bundle

# Frontend build
echo "🏗️ Building frontend..."
npm run build

# Tauri build for App Store (Apple Silicon)
echo "📦 Building Tauri app for Apple Silicon..."
cd src-tauri
cargo tauri build --target aarch64-apple-darwin --bundles app

# Check if build succeeded
APP_PATH="target/aarch64-apple-darwin/release/bundle/macos/Vinsert.app"
if [ ! -d "$APP_PATH" ]; then
    echo "❌ Build failed: App not found at $APP_PATH"
    exit 1
fi

echo "✅ App built successfully at: $APP_PATH"

# Verify signing
echo "🔍 Verifying code signing..."
codesign --verify --deep --strict "$APP_PATH"
spctl --assess --type execute "$APP_PATH"

# Create installer package
echo "📦 Creating installer package..."
productbuild --component "$APP_PATH" /Applications \
    --sign "$APPLE_INSTALLER_CERTIFICATE_ID" \
    "target/aarch64-apple-darwin/release/bundle/Vinsert.pkg"

echo "✅ Installer package created: target/aarch64-apple-darwin/release/bundle/Vinsert.pkg"

# Verify installer
echo "🔍 Verifying installer package..."
pkgutil --check-signature "target/aarch64-apple-darwin/release/bundle/Vinsert.pkg"

echo "🎉 Build complete! Ready for App Store submission."
echo ""
echo "Next steps:"
echo "1. Test the app: open '$APP_PATH'"
echo "2. Upload to App Store Connect using Transporter app"
echo "3. Submit for review in App Store Connect"