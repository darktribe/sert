/*
 * =====================================================
 * Sert Editor - イベントリスナー設定（ドラッグアンドドロップ対応版）
 * =====================================================
 */

import { editor } from './globals.js';
import { handleInput } from './input-handler.js';
import { handleKeydown } from './keyboard-shortcuts.js';
import { syncScroll, updateStatus } from './ui-updater.js';
import { handleCompositionStart, handleCompositionEnd, handleCompositionUpdate } from './ime-handler.js';
import { handleGlobalClick, handleMenuEscape } from './menu-controller.js';

/**
 * エディタのイベントリスナーを設定
 */
export function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // テキスト入力関連
    editor.addEventListener('input', handleInput);
    editor.addEventListener('keydown', handleKeydown);
    
    // スクロール・フォーカス関連
    editor.addEventListener('scroll', syncScroll);
    editor.addEventListener('click', updateStatus);
    editor.addEventListener('keyup', updateStatus);
    
    // IME（日本語入力）関連
    editor.addEventListener('compositionstart', handleCompositionStart);
    editor.addEventListener('compositionend', handleCompositionEnd);
    editor.addEventListener('compositionupdate', handleCompositionUpdate);
    
    // メニュー制御
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', handleMenuEscape);
    
    // ドラッグアンドドロップ関連のイベントリスナーを設定
    setupDropZoneEvents();
    
    console.log('✅ Event listeners set up successfully');
}

/**
 * ドラッグアンドドロップの視覚的フィードバックを設定
 */
export function setupDropZoneEvents() {
    console.log('🗂️ Setting up drag and drop event listeners...');
    
    const container = document.querySelector('.container');
    if (!container) {
        console.error('❌ Container element not found for drag and drop setup');
        return;
    }
    
    // ドラッグエンター時の処理
    container.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('📂 Drag enter detected on container');
        container.classList.add('drag-over');
        
        // ドラッグ効果を設定
        e.dataTransfer.dropEffect = 'copy';
    });
    
    // ドラッグオーバー時の処理
    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 継続的にドラッグオーバー状態を維持
        container.classList.add('drag-over');
        e.dataTransfer.dropEffect = 'copy';
    });
    
    // ドラッグリーブ時の処理
    container.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 子要素への移動でない場合のみクラスを削除
        if (!container.contains(e.relatedTarget)) {
            console.log('📂 Drag leave container');
            container.classList.remove('drag-over');
        }
    });
    
    // ドロップ時の処理 - Tauri 2.5では必要最小限に
    container.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('📁 Drop event detected on container (handled by Tauri)');
        container.classList.remove('drag-over');
        
        // Tauri 2.5では、ファイルドロップはRust側のon_window_eventで処理される
        // ここでは視覚的フィードバックのクリアのみ実行
    });
    
    // エディタ要素自体にもドラッグアンドドロップイベントを設定
    setupEditorDropEvents();
    
    console.log('✅ Drag and drop event listeners set up successfully');
}

/**
 * エディタ要素専用のドラッグアンドドロップイベントを設定
 */
function setupEditorDropEvents() {
    if (!editor) {
        console.error('❌ Editor element not found for drop events setup');
        return;
    }
    
    // エディタ上でのドラッグオーバー
    editor.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    });
    
    // エディタ上でのドロップ
    editor.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('📁 Drop event on editor area (handled by Tauri)');
        
        // Tauri 2.5では、Rust側で処理されるため特別な処理は不要
    });
    
    console.log('✅ Editor drop events set up');
}

/**
 * ドラッグアンドドロップの状態をリセット
 */
export function resetDropZoneState() {
    const container = document.querySelector('.container');
    if (container) {
        container.classList.remove('drag-over');
    }
    console.log('🔄 Drop zone state reset');
}

/**
 * ドラッグアンドドロップイベントリスナーを削除
 */
export function removeDropZoneEvents() {
    const container = document.querySelector('.container');
    if (container) {
        container.classList.remove('drag-over');
    }
    console.log('🗑️ Drop zone events cleanup completed');
}