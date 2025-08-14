#!/bin/bash

set -e

echo "🚀 Building notarized DMG for web distribution..."

# 環境変数設定
export APPLE_TEAM_ID="UVC7CS2KN7"
export APPLE_CERTIFICATE_ID="Developer ID Application: akihiko ouchi (UVC7CS2KN7)"

# 公証用の認証情報（後で設定）
export APPLE_ID="darktribe@gmail.com"  # あなたのApple ID
export APPLE_PASSWORD="prbx-qfyf-vhzj-gfcn"  # App用パスワード

echo "🔍 Checking Developer ID certificate..."
if ! security find-identity -v -p codesigning | grep -q "Developer ID Application"; then
    echo "❌ Developer ID certificate not found"
    security find-identity -v -p codesigning
    exit 1
fi

echo "✅ Developer ID certificate found"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
cd src-tauri
cargo clean
cd ..
rm -rf src-tauri/target/aarch64-apple-darwin/release/bundle

# Frontend build
echo "🏗️ Building frontend..."
npm run build

# Tauri build with Developer ID
echo "📦 Building app with Developer ID..."
cd src-tauri
cargo tauri build --target aarch64-apple-darwin --bundles app

# Check if build succeeded
APP_PATH="../src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Vinsert.app"
if [ ! -d "$APP_PATH" ]; then
    echo "❌ Build failed: App not found"
    exit 1
fi

cd ..
echo "✅ App built successfully"

# Verify code signing
echo "🔍 Verifying code signing..."
codesign --verify --deep --strict "$APP_PATH"
echo "✅ Code signing verified"

# Create DMG directory structure
echo "📦 Preparing DMG contents..."
DMG_DIR="dmg-contents"
rm -rf "$DMG_DIR"
mkdir -p "$DMG_DIR"

# Copy app to DMG directory
cp -R "$APP_PATH" "$DMG_DIR/"

# Create Applications symlink
ln -s /Applications "$DMG_DIR/Applications"

# Create DMG file
echo "💿 Creating DMG file..."
DMG_NAME="Vinsert-1.0.dmg"
DMG_PATH="dist/$DMG_NAME"
mkdir -p dist

# Remove existing DMG
rm -f "$DMG_PATH"

# Create DMG using hdiutil
hdiutil create -volname "Vinsert" \
    -srcfolder "$DMG_DIR" \
    -ov -format UDZO \
    "$DMG_PATH"

echo "✅ DMG created: $DMG_PATH"

# Sign the DMG
echo "🔐 Signing DMG..."
codesign --sign "$APPLE_CERTIFICATE_ID" \
    --timestamp \
    --options runtime \
    "$DMG_PATH"

echo "✅ DMG signed"

# Verify DMG signature
echo "🔍 Verifying DMG signature..."
codesign --verify --deep --strict "$DMG_PATH"
spctl --assess --type open --context context:primary-signature "$DMG_PATH"

echo "✅ DMG signature verified"

# Submit for notarization
echo "📤 Submitting for notarization..."
echo "Note: Make sure APPLE_ID and APPLE_PASSWORD are set correctly"

xcrun notarytool submit "$DMG_PATH" \
    --apple-id "$APPLE_ID" \
    --password "$APPLE_PASSWORD" \
    --team-id "$APPLE_TEAM_ID" \
    --wait

if [ $? -eq 0 ]; then
    echo "✅ Notarization successful"
    
    # Staple the notarization ticket
    echo "📎 Stapling notarization ticket..."
    xcrun stapler staple "$DMG_PATH"
    
    echo "✅ Notarization ticket stapled"
    
    # Final verification
    echo "🔍 Final verification..."
    spctl --assess --type open --context context:primary-signature "$DMG_PATH"
    
    echo "🎉 Notarized DMG ready for distribution!"
    echo "File: $DMG_PATH"
    echo "Size: $(ls -lh "$DMG_PATH" | awk '{print $5}')"
else
    echo "❌ Notarization failed"
    echo "Check your Apple ID credentials and try again"
    exit 1
fi

# Cleanup
rm -rf "$DMG_DIR"

echo ""
echo "🌐 Ready for web distribution!"
echo "You can now upload $DMG_PATH to your website"