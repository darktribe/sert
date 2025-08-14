#!/bin/bash

set -e

echo "📦 Creating App Store installer package (direct method)..."

# 証明書設定（実際の証明書名を使用）
export APPLE_TEAM_ID="UVC7CS2KN7"
export APPLE_INSTALLER_CERTIFICATE_ID="3rd Party Mac Developer Installer: akihiko ouchi (UVC7CS2KN7)"

# .app ファイルのパス
APP_PATH="src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Vinsert.app"

# .app ファイルの存在確認
if [ ! -d "$APP_PATH" ]; then
    echo "❌ App not found at $APP_PATH"
    echo "Please run build-appstore-app-only.sh first"
    exit 1
fi

echo "✅ App found at: $APP_PATH"

# Installer証明書の存在確認（フィルターなし）
echo "🔍 Checking installer certificate..."
if ! security find-identity -v | grep -q "3rd Party Mac Developer Installer: akihiko ouchi"; then
    echo "❌ Installer certificate not found"
    security find-identity -v | grep -i "3rd Party"
    exit 1
fi

echo "✅ Installer certificate found: $APPLE_INSTALLER_CERTIFICATE_ID"

# .pkg ファイルを作成
PKG_PATH="src-tauri/target/aarch64-apple-darwin/release/bundle/Vinsert.pkg"

echo "📦 Creating installer package..."
productbuild --component "$APP_PATH" /Applications \
    --sign "$APPLE_INSTALLER_CERTIFICATE_ID" \
    "$PKG_PATH"

if [ ! -f "$PKG_PATH" ]; then
    echo "❌ Failed to create installer package"
    exit 1
fi

echo "✅ Installer package created: $PKG_PATH"

# .pkg ファイルの検証
echo "🔍 Verifying installer package..."
pkgutil --check-signature "$PKG_PATH"

# ファイルサイズ確認
echo "📊 Package info:"
ls -lh "$PKG_PATH"

echo "🎉 App Store installer package ready!"
echo ""
echo "File ready for Transporter upload:"
echo "$(pwd)/$PKG_PATH"
echo ""
echo "Upload steps:"
echo "1. Open Transporter app"
echo "2. Drag and drop: $PKG_PATH"
echo "3. Click 'Deliver'"