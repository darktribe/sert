/*
 * =====================================================
 * Sert Editor - アプリケーション初期化
 * メインのアプリケーション制御とイベントリスナー設定
 * =====================================================
 */

import { setEditor, setCurrentContent } from './state.js';
import { initializeTauri } from '../utils/tauri.js';
import { updateLineNumbers, updateStatus } from '../ui/status.js';
import { setupMenuEvents } from '../ui/menu.js';
import { setupEditorEvents } from '../features/editor.js';
import { initializeUndoStack } from '../features/undo-redo.js';
import { newFile, openFile, saveFile, saveAsFile, exitApp } from '../features/file-operations.js';
import { undo, redo } from '../features/undo-redo.js';
import { copy, cut, paste, selectAll } from '../features/edit-operations.js';

/**
 * ページ読み込み時の初期化処理
 */
export async function initializeApp() {
    console.log('🚀 Sert Editor initializing...');
    
    // Tauri APIの初期化
    await initializeTauri();
    
    // エディタ要素の取得
    const editorElement = document.getElementById('editor');
    if (!editorElement) {
        console.error('エディタ要素が見つかりません');
        return;
    }
    
    setEditor(editorElement);
    
    // エディタの初期設定
    setCurrentContent(editorElement.value);
    initializeUndoStack();
    updateLineNumbers();
    updateStatus();
    
    // イベントリスナーの設定
    setupEditorEvents();
    setupMenuEvents();
    
    // カーソルを1行目1列目に設定
    editorElement.setSelectionRange(0, 0);
    editorElement.focus();
    
    // グローバル関数の設定（HTMLから呼び出すため）
    setupGlobalFunctions();
    
    console.log('✅ Sert Editor ready!');
}

/**
 * HTMLから呼び出される関数をグローバルに設定
 */
function setupGlobalFunctions() {
    console.log('🔧 Setting up global functions for menu access');
    
    // ファイル操作
    window.newFile = newFile;
    window.openFile = openFile;
    window.saveFile = saveFile;
    window.saveAsFile = saveAsFile;
    window.exitApp = exitApp;
    
    // 編集操作 - キーボードショートカットと完全に同じ関数を使用
    window.undo = undo;
    window.redo = redo;
    window.cut = cut;
    window.copy = copy;
    window.paste = paste;
    window.selectAll = selectAll;
    
    // 診断用のラッパー関数を作成
    const originalPaste = paste;
    window.paste = function() {
        console.log('📋 Menu paste function called');
        return originalPaste();
    };
    
    console.log('✅ Global functions setup complete');
    console.log('📋 window.paste function:', typeof window.paste);
    console.log('📋 original paste function:', typeof originalPaste);
    
    // テスト用の診断関数
    window.testPaste = function() {
        console.log('🧪 Test paste function called');
        return originalPaste();
    };
}