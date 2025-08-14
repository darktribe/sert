#!/bin/bash

echo "🔧 Fixing ICNS file..."

# 512x512@2x.pngが存在することを確認
if [ ! -f "src-tauri/icons/512x512@2x.png" ]; then
    echo "❌ 512x512@2x.png not found!"
    exit 1
fi

# iconsetディレクトリを作成
mkdir -p temp-fix.iconset

# 最小限必要なアイコンを配置
# 512x512@2x.png (1024x1024) が最重要
cp src-tauri/icons/512x512@2x.png temp-fix.iconset/icon_512x512@2x.png

# 他のサイズも可能な限り配置
if [ -f "src-tauri/icons/32x32.png" ]; then
    cp src-tauri/icons/32x32.png temp-fix.iconset/icon_32x32.png
fi

if [ -f "src-tauri/icons/128x128.png" ]; then
    cp src-tauri/icons/128x128.png temp-fix.iconset/icon_128x128.png
fi

if [ -f "src-tauri/icons/128x128@2x.png" ]; then
    cp src-tauri/icons/128x128@2x.png temp-fix.iconset/icon_128x128@2x.png
fi

# ICNSファイルを再生成
iconutil -c icns temp-fix.iconset -o src-tauri/icons/icon.icns

# 確認
echo "✅ ICNS file regenerated. Contents:"
iconutil -l src-tauri/icons/icon.icns

# 清掃
rm -rf temp-fix.iconset