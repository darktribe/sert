#!/bin/bash

echo "Building embedded Python with PyOxidizer..."

# PyOxidizerでPythonをビルド
pyoxidizer build --release

# 生成されたファイルをターゲットディレクトリにコピー
if [ -d "build/x86_64-apple-darwin/release/install" ]; then
    cp -r build/x86_64-apple-darwin/release/install/* target/release/
    echo "Embedded Python built successfully!"
else
    echo "PyOxidizer build output not found"
    exit 1
fi

echo "Now run: cargo build --release --features embedded-python"