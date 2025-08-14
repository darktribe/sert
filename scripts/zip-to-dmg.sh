#!/bin/bash

set -e

echo "📦 既存アプリからDMG作成..."

# 既存のアプリパスを確認
APP_PATH="src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Vinsert.app"

if [ ! -d "$APP_PATH" ]; then
    echo "❌ アプリが見つかりません: $APP_PATH"
    echo "先にアプリをビルドしてください"
    exit 1
fi

# DMG作成
echo "💿 DMG作成中..."
mkdir -p dist
mkdir -p dmg-temp

cp -R "$APP_PATH" dmg-temp/
ln -s /Applications dmg-temp/Applications

hdiutil create -volname "Vinsert" \
    -srcfolder dmg-temp \
    -ov -format UDZO \
    dist/Vinsert-1.0.dmg

rm -rf dmg-temp

echo "✅ DMG作成完了: dist/Vinsert-1.0.dmg"

# DMG署名
echo "🔐 DMG署名中..."
codesign --sign "Developer ID Application: akihiko ouchi (UVC7CS2KN7)" \
    --timestamp \
    --options runtime \
    dist/Vinsert-1.0.dmg

echo "✅ DMG署名完了"

# 公証提出
echo "📤 DMG公証提出中..."
xcrun notarytool submit dist/Vinsert-1.0.dmg \
    --apple-id "darktribe@gmail.com" \
    --password "prbx-qfyf-vhzj-gfcn" \
    --team-id "UVC7CS2KN7" \
    --wait

if [ $? -eq 0 ]; then
    echo "✅ 公証完了"
    
    # 公証チケットをスタプル
    xcrun stapler staple dist/Vinsert-1.0.dmg
    echo "✅ 公証チケットスタプル完了"
    
    echo "🎉 配布用DMGファイル完成!"
    echo "ファイル: dist/Vinsert-1.0.dmg"
    ls -lh dist/Vinsert-1.0.dmg
else
    echo "❌ 公証に失敗しました"
fi