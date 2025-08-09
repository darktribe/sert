/*
 * =====================================================
 * Vinsert Editor - メインエントリーポイント（エラー修正版）
 * =====================================================
 */

// 基本機能のインポート
import { initializeApp } from './js/app-init.js';
import { toggleMenu } from './js/menu-controller.js';
import { newFile, openFile, saveFile, saveAsFile } from './js/file-operations.js';
import { undo, redo } from './js/undo-redo.js';
import { copy, cut, paste, selectAll } from './js/edit-operations.js';
import { showSearchDialog, showReplaceDialog } from './js/search-replace.js';
import { showFontSettingsDialog, showFontSizeInputDialog, increaseFontSize, decreaseFontSize } from './js/font-settings.js';
import { exitApp } from './js/app-exit.js';
import { toggleLineHighlight } from './js/line-highlight.js';
import { showThemeDialog, showLanguageSettingsDialog } from './js/theme-manager.js';
import { toggleTypewriterMode, initTypewriterMode } from './js/typewriter-mode.js';

// グローバル関数を即座に登録
console.log('🔧 Registering core global functions...');

// メニュー関連
window.toggleMenu = toggleMenu;

// ファイル操作
window.newFile = newFile;
window.openFile = openFile;
window.saveFile = saveFile;
window.saveAsFile = saveAsFile;
window.exitApp = exitApp;

// 編集操作
window.undo = undo;
window.redo = redo;
window.copy = copy;
window.cut = cut;
window.paste = paste;
window.selectAll = selectAll;

// 検索・置換
window.showSearchDialog = showSearchDialog;
window.showReplaceDialog = showReplaceDialog;

// 表示・フォント
window.showFontSettingsDialog = showFontSettingsDialog;
window.showFontSizeInputDialog = showFontSizeInputDialog;
window.increaseFontSize = increaseFontSize;
window.decreaseFontSize = decreaseFontSize;
window.toggleLineHighlight = toggleLineHighlight;
window.toggleTypewriterMode = toggleTypewriterMode;

// テーマ・言語
window.showThemeDialog = showThemeDialog;
window.showLanguageSettingsDialog = showLanguageSettingsDialog;

console.log('✅ Core functions registered');

// 拡張機能の遅延読み込み
async function loadExtensionFunctions() {
    try {
        const { initializeExtensionSystem, showExtensionSettingsDialog, openAppFolder } = await import('./js/extension-manager.js');
        
        window.showExtensionSettingsDialog = showExtensionSettingsDialog;
        window.openAppFolder = openAppFolder;
        
        // 拡張機能システム初期化
        const extensionInitialized = await initializeExtensionSystem();
        if (extensionInitialized) {
            console.log('✅ Extension system initialized successfully');
        } else {
            console.log('⚠️ Extension system running in limited mode');
        }
    } catch (error) {
        console.error('❌ Extension system loading failed:', error);
        // フォールバック関数を設定
        window.showExtensionSettingsDialog = () => alert('拡張機能システムが利用できません');
        window.openAppFolder = () => alert('アプリフォルダ機能が利用できません');
    }
}

/**
 * ページ読み込み時の初期化処理
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM loaded, starting initialization...');
    
    // アプリケーションの初期化
    await initializeApp();
    
    // 拡張機能の遅延初期化
    await loadExtensionFunctions();
    
    // タイプライターモードの初期化
    initTypewriterMode();
    
    console.log('🎯 App ready!');
});

// フォールバック初期化
if (document.readyState !== 'loading') {
    console.log('📄 DOM already loaded, initializing immediately...');
    initializeApp().then(() => {
        loadExtensionFunctions();
    });
}

console.log('📋 Main.js loaded successfully');