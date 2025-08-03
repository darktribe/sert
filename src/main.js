/*
 * =====================================================
 * Vinsert Editor - メインエントリーポイント（新機能対応版）
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
import { toggleTypewriterMode, initTypewriterMode } from './js/typewriter-mode.js';


// グローバル関数をウィンドウオブジェクトに登録（HTMLから呼び出せるようにするため）
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

// フォント設定機能（新機能追加）
window.showFontSettingsDialog = showFontSettingsDialog;
window.showFontSizeInputDialog = showFontSizeInputDialog;  // 新機能
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

// グローバル関数の登録確認とデバッグ
console.log('📋 Global functions registered:');
console.log('window.toggleMenu:', typeof window.toggleMenu);
console.log('window.saveFile:', typeof window.saveFile);
console.log('window.saveAsFile:', typeof window.saveAsFile);
console.log('window.newFile:', typeof window.newFile);
console.log('window.openFile:', typeof window.openFile);
console.log('window.undo:', typeof window.undo);
console.log('window.redo:', typeof window.redo);
console.log('window.copy:', typeof window.copy);
console.log('window.cut:', typeof window.cut);
console.log('window.paste:', typeof window.paste);
console.log('window.selectAll:', typeof window.selectAll);
console.log('window.showSearchDialog:', typeof window.showSearchDialog);
console.log('window.showReplaceDialog:', typeof window.showReplaceDialog);
console.log('window.exitApp:', typeof window.exitApp);

// フォント設定関数
console.log('🎨 Font functions:');
console.log('window.showFontSettingsDialog:', typeof window.showFontSettingsDialog);
console.log('window.showFontSizeInputDialog:', typeof window.showFontSizeInputDialog);  // 新機能
console.log('window.increaseFontSize:', typeof window.increaseFontSize);
console.log('window.decreaseFontSize:', typeof window.decreaseFontSize);

// 言語切り替え関数
console.log('🌐 Language functions:');
console.log('window.createLanguageSwitcher:', typeof window.createLanguageSwitcher);
console.log('window.changeLanguage:', typeof window.changeLanguage);
console.log('window.getCurrentLanguage:', typeof window.getCurrentLanguage);
console.log('window.getAvailableLanguages:', typeof window.getAvailableLanguages);

// 新しい言語システムのテスト用デバッグ関数を追加
window.testNewLanguageSystem = async function() {
    console.log('🧪 Testing new language system (fallback mode)...');
    
    const { getLocalesDirectoryPath, getAvailableLanguages, getCurrentLanguage, getSystemInfo } = await import('./js/locales.js');
    
    const systemInfo = getSystemInfo();
    console.log('📁 Locales directory:', getLocalesDirectoryPath());
    console.log('🌐 Available languages:', getAvailableLanguages());
    console.log('🎯 Current language:', getCurrentLanguage());
    console.log('🔍 System info:', systemInfo);
    
    // 言語切り替えテスト
    const languages = getAvailableLanguages();
    for (const lang of languages) {
        console.log(`🌐 Testing switch to ${lang.nativeName} (${lang.code})`);
        try {
            const success = await window.changeLanguage(lang.code);
            console.log(`✅ Switch to ${lang.code}:`, success);
            
            // 少し待機して次の言語へ
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`❌ Failed to switch to ${lang.code}:`, error);
        }
    }
    
    console.log('🧪 Language system test completed');
};

window.refreshLanguageFiles = async function() {
    console.log('🔄 Refreshing language files (fallback system)...');
    
    const { refreshLanguages } = await import('./js/language-switcher.js');
    await refreshLanguages();
    
    console.log('✅ Language files refreshed');
};

// 言語ファイル管理用デバッグ関数
window.showLanguageInfo = async function() {
    const { getLocalesDirectoryPath, getAvailableLanguages, getCurrentLanguage, getSystemInfo } = await import('./js/locales.js');
    
    const systemInfo = getSystemInfo();
    const info = {
        directory: getLocalesDirectoryPath(),
        current: getCurrentLanguage(),
        available: getAvailableLanguages(),
        count: getAvailableLanguages().length,
        systemInfo: systemInfo
    };
    
    console.log('🌐 Language System Info:', info);
    
    const alertText = `Language System Info:
Directory: ${info.directory}
Current: ${info.current}
Available: ${info.count} languages
System: ${info.systemInfo.isExternalSystemEnabled ? 'External' : 'Fallback'}
Language Data: ${info.systemInfo.hasLanguageData ? 'Loaded' : 'Not loaded'}

Languages:
${info.available.map(l => `- ${l.nativeName} (${l.code})`).join('\n')}

Note: Currently using fallback system with built-in language data.
External file system will be implemented in future updates.`;
    
    alert(alertText);
    
    return info;
};

// フォールバックシステム専用テスト関数
window.testFallbackLanguageSystem = function() {
    console.log('🧪 Testing fallback language system...');
    
    const currentLang = window.getCurrentLanguage();
    const availableLanguages = window.getAvailableLanguages();
    
    console.log('Current language:', currentLang);
    console.log('Available languages:', availableLanguages);
    
    // 翻訳テスト
    const testKeys = [
        'menu.file',
        'editor.placeholder',
        'statusBar.line',
        'window.defaultTitle'
    ];
    
    testKeys.forEach(key => {
        try {
            const { t } = require('./js/locales.js');
            const translation = t(key);
            console.log(`Translation test: ${key} -> ${translation}`);
        } catch (error) {
            console.error(`Translation error for ${key}:`, error);
        }
    });
    
    console.log('✅ Fallback system test completed');
};

// 新機能のテスト用デバッグ関数を追加
window.testFontSizeInput = function() {
    console.log('🧪 Testing font size input dialog...');
    console.log('showFontSizeInputDialog function:', window.showFontSizeInputDialog);
    try {
        window.showFontSizeInputDialog();
        console.log('✅ showFontSizeInputDialog test completed');
    } catch (error) {
        console.error('❌ showFontSizeInputDialog test failed:', error);
    }
};

// Tab機能のテスト用デバッグ関数を追加
window.testTabFeature = function() {
    console.log('🧪 Testing Tab feature...');
    console.log('エディタでTabキーを押してみてください。');
    console.log('- Tab: インデント追加');
    console.log('- Shift+Tab: インデント削除');
    console.log('- 複数行選択してShift+Tab: 選択行全体のインデント削除');
    
    const editor = document.getElementById('editor');
    if (editor) {
        editor.focus();
        console.log('✅ エディタにフォーカスを設定しました');
    }
};

// 保存機能のテスト用デバッグ関数を追加
window.testSaveFile = async function() {
    console.log('🧪 Testing saveFile function...');
    console.log('saveFile function:', window.saveFile);
    try {
        await window.saveFile();
        console.log('✅ saveFile test completed');
    } catch (error) {
        console.error('❌ saveFile test failed:', error);
    }
};

// 検索機能のテスト用デバッグ関数を追加
window.testSearchDialog = function() {
    console.log('🧪 Testing search dialog function...');
    console.log('showSearchDialog function:', window.showSearchDialog);
    try {
        window.showSearchDialog();
        console.log('✅ showSearchDialog test completed');
    } catch (error) {
        console.error('❌ showSearchDialog test failed:', error);
    }
};

// フォント設定テスト用デバッグ関数を追加
window.testFontSettings = function() {
    console.log('🧪 Testing font settings...');
    console.log('showFontSettingsDialog function:', window.showFontSettingsDialog);
    try {
        window.showFontSettingsDialog();
        console.log('✅ showFontSettingsDialog test completed');
    } catch (error) {
        console.error('❌ showFontSettingsDialog test failed:', error);
    }
};

/**
 * ページ読み込み時の初期化処理
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM loaded, starting initialization...');
    
    // グローバル関数が正しく登録されているかさらに確認
    console.log('🔍 Final check - window.saveFile:', typeof window.saveFile);
    console.log('🔍 Final check - window.showSearchDialog:', typeof window.showSearchDialog);
    console.log('🔍 Final check - window.showFontSettingsDialog:', typeof window.showFontSettingsDialog);
    console.log('🔍 Final check - window.showFontSizeInputDialog:', typeof window.showFontSizeInputDialog);
    console.log('🔍 Final check - window.changeLanguage:', typeof window.changeLanguage);
    
    await initializeApp();
    // タイプライターモードの初期化
    initTypewriterMode();
    
    console.log('🎯 App ready! Global functions available:');
    console.log('- window.saveFile():', typeof window.saveFile);
    console.log('- window.newFile():', typeof window.newFile);
    console.log('- window.openFile():', typeof window.openFile);
    console.log('- window.showSearchDialog():', typeof window.showSearchDialog);
    console.log('- window.showReplaceDialog():', typeof window.showReplaceDialog);
    console.log('- window.showFontSettingsDialog():', typeof window.showFontSettingsDialog);
    console.log('- window.showFontSizeInputDialog():', typeof window.showFontSizeInputDialog);
    console.log('- window.changeLanguage():', typeof window.changeLanguage);
    console.log('- window.testNewLanguageSystem():', typeof window.testNewLanguageSystem);
    console.log('- window.showLanguageInfo():', typeof window.showLanguageInfo);
    console.log('- window.refreshLanguageFiles():', typeof window.refreshLanguageFiles);
    console.log('- window.testFontSettings():', typeof window.testFontSettings);
    console.log('- window.testFontSizeInput():', typeof window.testFontSizeInput);
    console.log('- window.testTabFeature():', typeof window.testTabFeature);
    console.log('- window.testFallbackLanguageSystem():', typeof window.testFallbackLanguageSystem);
    console.log('');
    console.log('🌐 Language System Status:');
    console.log('  - Currently using: Fallback system (built-in language data)');
    console.log('  - Available languages: Japanese (ja), English (en)');
    console.log('  - External file system: Will be implemented in future updates');
    console.log('  - To test: window.showLanguageInfo()');
    console.log('  - To switch language: Use the select box in the top-right corner');
});

/**
 * 追加の初期化確認（フォールバック）
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('📄 DOM loaded via readyState check...');
        console.log('🔍 Backup check - window.saveFile:', typeof window.saveFile);
        console.log('🔍 Backup check - window.showSearchDialog:', typeof window.showSearchDialog);
        console.log('🔍 Backup check - window.showFontSettingsDialog:', typeof window.showFontSettingsDialog);
        console.log('🔍 Backup check - window.showFontSizeInputDialog:', typeof window.showFontSizeInputDialog);
        console.log('🔍 Backup check - window.changeLanguage:', typeof window.changeLanguage);
        await initializeApp();
    });
} else {
    console.log('📄 DOM already loaded, initializing immediately...');
    console.log('🔍 Immediate check - window.saveFile:', typeof window.saveFile);
    console.log('🔍 Immediate check - window.showSearchDialog:', typeof window.showSearchDialog);
    console.log('🔍 Immediate check - window.showFontSettingsDialog:', typeof window.showFontSettingsDialog);
    console.log('🔍 Immediate check - window.showFontSizeInputDialog:', typeof window.showFontSizeInputDialog);
    console.log('🔍 Immediate check - window.changeLanguage:', typeof window.changeLanguage);
    initializeApp();
}

// さらなるフォールバック: 少し遅延させてグローバル関数を再登録
setTimeout(() => {
    console.log('🔄 Fallback: Re-registering global functions...');
    
    window.saveFile = saveFile;
    window.newFile = newFile;
    window.openFile = openFile;
    window.saveAsFile = saveAsFile;
    window.showSearchDialog = showSearchDialog;
    window.showReplaceDialog = showReplaceDialog;
    window.showFontSettingsDialog = showFontSettingsDialog;
    window.showFontSizeInputDialog = showFontSizeInputDialog;  // 新機能
    window.increaseFontSize = increaseFontSize;
    window.decreaseFontSize = decreaseFontSize;
    window.refreshLanguages = refreshLanguages;
    window.changeLanguage = changeLanguage;
    window.createLanguageSwitcher = createLanguageSwitcher;
    
    console.log('✅ Fallback registration complete - window.saveFile:', typeof window.saveFile);
    console.log('✅ Fallback registration complete - window.showSearchDialog:', typeof window.showSearchDialog);
    console.log('✅ Fallback registration complete - window.showFontSettingsDialog:', typeof window.showFontSettingsDialog);
    console.log('✅ Fallback registration complete - window.showFontSizeInputDialog:', typeof window.showFontSizeInputDialog);
    console.log('✅ Fallback registration complete - window.changeLanguage:', typeof window.changeLanguage);
}, 1000);