#!/bin/bash
# scripts/build-with-python.sh
# Python.frameworkを含むTauriアプリをビルドするスクリプト

set -e

PYTHON_VERSION="3.11"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PYTHON_RUNTIME_DIR="$PROJECT_ROOT/src-tauri/python-runtime"

echo "🚀 Building Vinsert with embedded Python..."
echo "📁 Project root: $PROJECT_ROOT"

# プロジェクトルートに移動
cd "$PROJECT_ROOT"

# 1. Python runtimeの準備
echo ""
echo "=== Step 1: Preparing Python Runtime ==="
if [ ! -d "$PYTHON_RUNTIME_DIR/$PYTHON_VERSION" ]; then
    echo "🐍 Python runtime not found, preparing..."
    "$SCRIPT_DIR/prepare-python.sh"
else
    echo "✅ Python runtime already exists"
    echo "📊 Size: $(du -sh "$PYTHON_RUNTIME_DIR" | cut -f1)"
fi

# 2. 環境変数の設定
echo ""
echo "=== Step 2: Setting Environment Variables ==="
export PYTHON_FRAMEWORK_PATH="$PYTHON_RUNTIME_DIR"
export PYO3_PYTHON_VERSION="$PYTHON_VERSION"
export PYO3_PYTHON="$PYTHON_RUNTIME_DIR/$PYTHON_VERSION/bin/python$PYTHON_VERSION"

echo "✅ PYTHON_FRAMEWORK_PATH=$PYTHON_FRAMEWORK_PATH"
echo "✅ PYO3_PYTHON_VERSION=$PYO3_PYTHON_VERSION"
echo "✅ PYO3_PYTHON=$PYO3_PYTHON"

# Python実行可能ファイルの確認
if [ ! -f "$PYO3_PYTHON" ]; then
    echo "❌ Python executable not found: $PYO3_PYTHON"
    exit 1
fi

# 3. フロントエンドのビルド
echo ""
echo "=== Step 3: Building Frontend ==="
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi

echo "🔨 Building frontend..."
npm run build

# 4. Tauriアプリのビルド
echo ""
echo "=== Step 4: Building Tauri Application ==="

# ビルドフラグの設定
export RUSTFLAGS="-L $PYTHON_RUNTIME_DIR/$PYTHON_VERSION/lib"

echo "🔨 Building Tauri app with embedded Python..."
npm run tauri build

# 5. ビルド結果の確認
echo ""
echo "=== Step 5: Verifying Build Results ==="

BUILD_DIR="$PROJECT_ROOT/src-tauri/target/release/bundle/macos"
APP_PATH="$BUILD_DIR/Vinsert.app"

if [ -d "$APP_PATH" ]; then
    echo "✅ App bundle created: $APP_PATH"
    
    # アプリサイズ確認
    APP_SIZE=$(du -sh "$APP_PATH" | cut -f1)
    echo "📊 App bundle size: $APP_SIZE"
    
    # Python.frameworkが含まれているか確認
    FRAMEWORK_PATH="$APP_PATH/Contents/Frameworks/Python.framework"
    if [ -d "$FRAMEWORK_PATH" ]; then
        echo "✅ Python.framework included in app bundle"
        PYTHON_SIZE=$(du -sh "$FRAMEWORK_PATH" | cut -f1)
        echo "📊 Python.framework size: $PYTHON_SIZE"
    else
        echo "⚠️ Python.framework not found in app bundle"
        echo "📁 Contents of Frameworks directory:"
        ls -la "$APP_PATH/Contents/Frameworks/" 2>/dev/null || echo "No Frameworks directory found"
    fi
    
    # DMGファイルの確認
    DMG_PATH="$BUILD_DIR/Vinsert_0.1.0_aarch64.dmg"
    if [ -f "$DMG_PATH" ]; then
        echo "✅ DMG created: $DMG_PATH"
        DMG_SIZE=$(du -sh "$DMG_PATH" | cut -f1)
        echo "📊 DMG size: $DMG_SIZE"
    fi
    
    echo ""
    echo "🎉 Build completed successfully!"
    echo ""
    echo "📍 Build outputs:"
    echo "   App bundle: $APP_PATH"
    echo "   DMG: $DMG_PATH"
    echo ""
    echo "🧪 To test the app:"
    echo "   open \"$APP_PATH\""
    echo ""
    echo "📦 To test Python integration:"
    echo "   # Open the app and try using extension features"
    
else
    echo "❌ App bundle not found at: $APP_PATH"
    echo "❌ Build may have failed"
    exit 1
fi