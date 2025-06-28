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
    console.log('Setting up event listeners...');
    
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
    
    console.log('Event listeners set up successfully');
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
    
    // ドロップ時の処理
    container.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('📁 Drop event detected on container');
        container.classList.remove('drag-over');
        
        // ファイルが含まれているかチェック
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            console.log(`📁 ${files.length} file(s) dropped`);
            
            // 最初のファイルのみ処理（複数ファイルのドロップは最初のファイルを開く）
            const firstFile = files[0];
            console.log('📁 Processing first dropped file:', firstFile.name);
            
            // ファイルパスを取得してTauriのファイルドロップハンドラーに渡す
            // ブラウザ環境では完全なパスは取得できないため、Tauriのfile-droppedイベントを使用
            console.log('📁 Tauri will handle the actual file opening via file-dropped event');
        } else {
            console.log('⚠️ No files found in drop event');
        }
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
        
        console.log('📁 Drop event on editor area');
        
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            console.log('📁 Files dropped directly on editor, delegating to Tauri handler');
            // Tauriのfile-droppedイベントが処理するため、ここでは特別な処理は不要
        }
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
        // イベントリスナーの削除は通常、同じ関数参照が必要ですが、
        // ここでは簡易的にクラスを削除してリセット
        container.classList.remove('drag-over');
    }
    console.log('🗑️ Drop zone events cleanup completed');
}