/*
 * =====================================================
 * Vinsert Editor - メインエントリーポイント（拡張機能対応版）
 * =====================================================
 */

import { initializeApp } from './js/app-init.js';
import { toggleMenu } from './js/menu-controller.js';
import { newFile, openFile, saveFile, saveAsFile } from './js/file-operations.js';
import { undo, redo } from './js/undo-redo.js';
import { copy, cut, paste, selectAll } from './js/edit-operations.js';
import { showSearchDialog, showReplaceDialog, findNext, findPrevious } from './js/search-replace.js';
import { showFontSettingsDialog, showFontSizeInputDialog, increaseFontSize, decreaseFontSize } from './js/font-settings.js';
import { exitApp } from './js/app-exit.js';
import { createLanguageSwitcher, removeLanguageSwitcher, reinitializeLanguageSwitcher, refreshLanguages } from './js/language-switcher.js';
import { changeLanguage, getCurrentLanguage, getAvailableLanguages } from './js/locales.js';
import { toggleLineHighlight } from './js/line-highlight.js';
import { initializeThemeSystem, showThemeDialog, showLanguageSettingsDialog, getAvailableThemes, getCurrentTheme, applyTheme } from './js/theme-manager.js';
import { toggleTypewriterMode, initTypewriterMode } from './js/typewriter-mode.js';
import { initializeExtensionSystem, showExtensionSettingsDialog } from './js/extension-manager.js';

// グローバル関数をウィンドウオブジェクトに登録
console.log('🔧 Registering global functions...');

// 基本機能
window.toggleMenu = toggleMenu;
window.newFile = newFile;
window.openFile = openFile;
window.saveFile = saveFile;
window.saveAsFile = saveAsFile;
window.undo = undo;
window.redo = redo;
window.copy = copy;
window.cut = cut;
window.paste = paste;
window.selectAll = selectAll;
window.showSearchDialog = showSearchDialog;
window.showReplaceDialog = showReplaceDialog;
window.exitApp = exitApp;
window.toggleLineHighlight = toggleLineHighlight;
window.toggleTypewriterMode = toggleTypewriterMode;

// テーマ機能
window.showThemeDialog = showThemeDialog;
window.showLanguageSettingsDialog = showLanguageSettingsDialog;
window.getAvailableThemes = getAvailableThemes;
window.getCurrentTheme = getCurrentTheme;
window.applyTheme = applyTheme;

// フォント設定機能
window.showFontSettingsDialog = showFontSettingsDialog;
window.showFontSizeInputDialog = showFontSizeInputDialog;
window.increaseFontSize = increaseFontSize;
window.decreaseFontSize = decreaseFontSize;

// 言語切り替え機能
window.createLanguageSwitcher = createLanguageSwitcher;
window.removeLanguageSwitcher = removeLanguageSwitcher;
window.reinitializeLanguageSwitcher = reinitializeLanguageSwitcher;
window.refreshLanguages = refreshLanguages;
window.changeLanguage = changeLanguage;
window.getCurrentLanguage = getCurrentLanguage;
window.getAvailableLanguages = getAvailableLanguages;

// 拡張機能
window.showExtensionSettingsDialog = showExtensionSettingsDialog;

// デバッグ用関数
window.testExtensionSystem = async function() {
    console.log('🧪 Testing extension system...');
    
    try {
        const extensionInitialized = await initializeExtensionSystem();
        console.log('Extension system initialized:', extensionInitialized);
        
        window.showExtensionSettingsDialog();
        console.log('✅ Extension settings dialog opened');
        
    } catch (error) {
        console.error('❌ Extension system test failed:', error);
    }
};

/**
 * ページ読み込み時の初期化処理
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM loaded, starting initialization...');
    
    // アプリケーションの初期化
    await initializeApp();
    
    // 拡張機能システムの初期化
    console.log('🧩 Initializing extension system...');
    try {
        const extensionInitialized = await initializeExtensionSystem();
        if (extensionInitialized) {
            console.log('✅ Extension system initialized successfully');
        } else {
            console.log('⚠️ Extension system running in limited mode');
        }
    } catch (error) {
        console.error('❌ Extension system initialization error:', error);
        console.log('⚠️ Extension features will be disabled');
    }
    
    // タイプライターモードの初期化
    initTypewriterMode();
    
    console.log('🎯 App ready!');
});

// フォールバック初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('📄 DOM loaded via readyState check...');
        await initializeApp();
    });
} else {
    console.log('📄 DOM already loaded, initializing immediately...');
    initializeApp();
}

// グローバル関数の再登録（フォールバック）
setTimeout(() => {
    console.log('🔄 Fallback: Re-registering global functions...');
    
    window.saveFile = saveFile;
    window.newFile = newFile;
    window.openFile = openFile;
    window.saveAsFile = saveAsFile;
    window.showSearchDialog = showSearchDialog;
    window.showReplaceDialog = showReplaceDialog;
    window.showFontSettingsDialog = showFontSettingsDialog;
    window.showFontSizeInputDialog = showFontSizeInputDialog;
    window.increaseFontSize = increaseFontSize;
    window.decreaseFontSize = decreaseFontSize;
    window.refreshLanguages = refreshLanguages;
    window.changeLanguage = changeLanguage;
    window.createLanguageSwitcher = createLanguageSwitcher;
    window.showExtensionSettingsDialog = showExtensionSettingsDialog;
    
    console.log('✅ Fallback registration complete');
}, 1000);